import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage, Canvas } from 'canvas';
import { MobilePhotoAuthenticityProcessor, AuthenticityResult } from './mobilePhotoAuthenticityProcessor';

export interface ImageProcessResult {
  buffer: Buffer | null;
  success: boolean;
  format: 'jpeg' | 'png' | 'webp' | 'unknown';
  originalSize: number;
  processedSize: number | null;
  width: number | null;
  height: number | null;
  processingStatus: 'CANVAS_OK' | 'CANVAS_FAILED' | 'VALIDATION_FAILED';
  errorMessage: string | null;
  metadata: {
    aspectRatio: number | null;
    cropApplied: boolean;
    filterApplied: boolean;
  };
}

export class ImageProcessorService {
  /**
   * 🎨 Process image with STRICT error handling
   * 
   * Pipeline:
   * 1. Validate base64 format (detect PNG/JPEG/WebP from magic bytes)
   * 2. Load image with Canvas
   * 3. Crop/scale to 16:9 (1280x720)
   * 4. Redraw (clears AI metadata)
   * 5. Export as JPEG 0.8 quality
   * 
   * Returns detailed result object - NEVER throws errors
   * Canvas failures are caught, logged, and marked clearly
   */
  async processImage(dataUrl: string): Promise<ImageProcessResult> {
    const startTime = Date.now();
    const result: ImageProcessResult = {
      buffer: null,
      success: false,
      format: 'unknown',
      originalSize: 0,
      processedSize: null,
      width: null,
      height: null,
      processingStatus: 'VALIDATION_FAILED',
      errorMessage: null,
      metadata: {
        aspectRatio: null,
        cropApplied: false,
        filterApplied: false,
      },
    };

    try {
      // STEP 1: Extract and validate base64
      console.log(`   📋 Validating base64 format...`);
      const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      
      if (!base64Match) {
        result.processingStatus = 'VALIDATION_FAILED';
        result.errorMessage = 'Invalid data URL format (expected: data:image/TYPE;base64,DATA)';
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }

      const mimeType = base64Match[1].toLowerCase();
      const base64Data = base64Match[2];
      
      if (!['png', 'jpeg', 'jpg', 'webp'].includes(mimeType)) {
        result.processingStatus = 'VALIDATION_FAILED';
        result.errorMessage = `Unsupported image format: ${mimeType} (allowed: png, jpeg, jpg, webp)`;
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }

      result.format = (mimeType === 'jpg' ? 'jpeg' : mimeType) as any;
      
      // STEP 2: Decode base64 to buffer
      console.log(`   🔄 Decoding base64...`);
      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(base64Data, 'base64');
        result.originalSize = imageBuffer.length;
        console.log(`      ✅ Size: ${Math.round(imageBuffer.length / 1024)}KB`);
      } catch (decodeError) {
        result.processingStatus = 'VALIDATION_FAILED';
        result.errorMessage = `Failed to decode base64: ${(decodeError as Error).message}`;
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }

      // STEP 3: Validate magic bytes
      console.log(`   🔍 Validating image magic bytes...`);
      const magic = imageBuffer.slice(0, 4).toString('hex').toUpperCase();
      const isValidImage = this.validateImageMagic(magic, result.format);
      
      if (!isValidImage) {
        result.processingStatus = 'VALIDATION_FAILED';
        result.errorMessage = `Invalid image magic bytes (expected: ${this.getMagicBytesDescription(result.format)}, got: ${magic})`;
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }
      console.log(`      ✅ Magic bytes valid (${magic})`);

      // STEP 4: Load image with Canvas
      console.log(`   🎨 Loading image into Canvas...`);
      let img: any;
      try {
        img = await loadImage(imageBuffer);
        console.log(`      ✅ Loaded: ${img.width}x${img.height}px`);
      } catch (loadError) {
        result.processingStatus = 'CANVAS_FAILED';
        result.errorMessage = `Canvas failed to load image: ${(loadError as Error).message}`;
        console.error(`   ❌ ${result.errorMessage}`);
        console.error(`      💡 Hint: Image may be corrupted or unsupported format`);
        return result;
      }

      // STEP 5: Validate image dimensions
      if (img.width <= 0 || img.height <= 0 || img.width > 10000 || img.height > 10000) {
        result.processingStatus = 'CANVAS_FAILED';
        result.errorMessage = `Invalid image dimensions: ${img.width}x${img.height}px (must be 1-10000px each)`;
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }

      // STEP 6: Create target canvas 16:9 (1280x720)
      console.log(`   📐 Creating 16:9 target canvas (1280x720)...`);
      const targetWidth = 1280;
      const targetHeight = 720;
      const targetAspectRatio = targetWidth / targetHeight; // 1.777...
      const sourceAspectRatio = img.width / img.height;

      // Calculate crop region
      let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
      let cropApplied = false;

      if (sourceAspectRatio > targetAspectRatio) {
        // Source wider than 16:9 - crop sides
        srcWidth = img.height * targetAspectRatio;
        srcX = (img.width - srcWidth) / 2;
        cropApplied = true;
      } else if (sourceAspectRatio < targetAspectRatio) {
        // Source taller than 16:9 - crop top/bottom
        srcHeight = img.width / targetAspectRatio;
        srcY = (img.height - srcHeight) / 2;
        cropApplied = true;
      }

      console.log(`      ✅ Crop region: ${srcWidth.toFixed(0)}x${srcHeight.toFixed(0)}px at (${srcX.toFixed(0)}, ${srcY.toFixed(0)})`);

      // STEP 7: Create canvas and draw
      console.log(`   🖌️  Drawing on Canvas...`);
      let canvas: Canvas;
      try {
        canvas = createCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

        // Single draw operation - no filters (they're unreliable in node canvas)
        ctx.drawImage(
          img,
          srcX, srcY, srcWidth, srcHeight,
          0, 0, targetWidth, targetHeight
        );

        console.log(`      ✅ Image drawn successfully`);
      } catch (drawError) {
        result.processingStatus = 'CANVAS_FAILED';
        result.errorMessage = `Canvas drawImage failed: ${(drawError as Error).message}`;
        console.error(`   ❌ ${result.errorMessage}`);
        console.error(`      💡 Hint: Image data may be corrupted or format incompatible`);
        return result;
      }

      // STEP 8: Export to JPEG
      console.log(`   💾 Exporting as JPEG (quality 0.8)...`);
      let jpegBuffer: Buffer;
      try {
        jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
        result.processedSize = jpegBuffer.length;
        result.buffer = jpegBuffer;
        result.success = true;
        result.processingStatus = 'CANVAS_OK';
        result.width = targetWidth;
        result.height = targetHeight;
        result.metadata.aspectRatio = targetAspectRatio;
        result.metadata.cropApplied = cropApplied;
        result.metadata.filterApplied = false;
        
        console.log(`      ✅ JPEG exported (${Math.round(jpegBuffer.length / 1024)}KB)`);
      } catch (exportError) {
        result.processingStatus = 'CANVAS_FAILED';
        result.errorMessage = `Failed to export as JPEG: ${(exportError as Error).message}`;
        console.error(`   ❌ ${result.errorMessage}`);
        return result;
      }

      const duration = Date.now() - startTime;
      console.log(`   ⏱️  Processing completed in ${duration}ms`);
      return result;

    } catch (unknownError) {
      result.processingStatus = 'CANVAS_FAILED';
      result.errorMessage = `Unknown error: ${(unknownError as Error).message}`;
      console.error(`   ❌ Unexpected error during processing:`, unknownError);
      return result;
    }
  }

  /**
   * Validate image magic bytes
   */
  private validateImageMagic(magic: string, format: string): boolean {
    const validators: Record<string, (magic: string) => boolean> = {
      png: (m) => m.startsWith('89504E47'), // 89 50 4E 47 = PNG
      jpeg: (m) => m.startsWith('FFD8FF'), // FF D8 FF = JPEG
      webp: (m) => m.includes('574542'), // WEBP signature
    };

    const validator = validators[format];
    return validator ? validator(magic) : true; // Default to true if format not recognized
  }

  /**
   * Get human-readable magic bytes description
   */
  private getMagicBytesDescription(format: string): string {
    const descriptions: Record<string, string> = {
      png: '89 50 4E 47',
      jpeg: 'FF D8 FF',
      webp: 'WEBP signature',
    };
    return descriptions[format] || 'unknown';
  }

  /**
   * 💾 Save processed image to disk
   */
  async saveImage(
    processedBuffer: Buffer,
    articleTitle: string,
    outputDir: string
  ): Promise<string> {
    const sanitizedTitle = articleTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const imagePath = path.join(outputDir, `${sanitizedTitle}.jpg`);

    fs.writeFileSync(imagePath, processedBuffer, 'binary');

    console.log(`   ✅ Image saved (16:9 1280x720): ${path.basename(imagePath)}`);

    return imagePath;
  }
}
