/**
 * 📱 Modern Mobile Photo Authenticity Processor
 * 
 * Makes AI-generated images look like authentic modern smartphone photos
 * (iPhone 14/15, Samsung S23/S24, Pixel 8)
 * 
 * Modern phones have excellent optics:
 * - Minimal noise (AI-based noise reduction)
 * - Sharp, clean focus
 * - Natural color science
 * - Subtle computational photography effects
 * - Professional-grade processing
 */

import { createCanvas, loadImage, Canvas } from 'canvas';
import sharp from 'sharp';

export interface AuthenticityResult {
  success: boolean;
  processedBuffer: Buffer | null;
  authenticityLevel: 'low' | 'medium' | 'high';
  appliedEffects: string[];
  deviceSimulated: string;
  errorMessage?: string;
}

export class MobilePhotoAuthenticityProcessor {
  // Modern flagship devices (2023-2024)
  private readonly DEVICE_PROFILES = {
    iphone15: {
      make: 'Apple',
      model: 'iPhone 15 Pro',
      year: 2023,
      characteristics: {
        saturation: 1.02,        // Slightly vibrant (Apple tuning)
        brightness: 1.0,         // Natural
        contrast: 1.05,          // Slight contrast boost
        warmth: 0.98,            // Slightly warm tone
        sharpness: 'medium',     // Natural sharpness
        noiseFactor: 0.02        // Minimal noise
      }
    },
    samsung_s24: {
      make: 'Samsung',
      model: 'Galaxy S24',
      year: 2024,
      characteristics: {
        saturation: 1.08,        // Samsung loves vibrant colors
        brightness: 1.02,        // Slightly bright
        contrast: 1.08,          // More contrast
        warmth: 0.95,            // Slightly cool tone
        sharpness: 'high',       // Sharp edge detection
        noiseFactor: 0.015       // Very minimal noise
      }
    },
    pixel_8: {
      make: 'Google',
      model: 'Pixel 8 Pro',
      year: 2023,
      characteristics: {
        saturation: 1.04,        // Balanced, natural
        brightness: 0.99,        // Slightly cool white balance
        contrast: 1.04,          // Moderate contrast
        warmth: 0.93,            // Cool tone (Google style)
        sharpness: 'medium',     // Balanced sharpness
        noiseFactor: 0.01        // Almost none (AI denoise)
      }
    }
  };

  private selectedDevice: keyof typeof MobilePhotoAuthenticityProcessor.prototype.DEVICE_PROFILES;

  constructor(device: 'iphone15' | 'samsung_s24' | 'pixel_8' = 'iphone15') {
    this.selectedDevice = device;
  }

  /**
   * Main method: Apply modern smartphone characteristics
   */
  async processForMobileAuthenticity(base64Image: string): Promise<AuthenticityResult> {
    console.log(`📱 Processing as modern smartphone photo...`);

    try {
      let buffer = Buffer.from(base64Image, 'base64');
      const appliedEffects: string[] = [];

      const device = this.DEVICE_PROFILES[this.selectedDevice];
      console.log(`   📷 Device: ${device.model} (${device.year})`);

      // Step 1: Apply device color science
      buffer = await this.applyDeviceColorScience(buffer);
      appliedEffects.push('device_color_science');
      console.log(`   ✅ Applied ${device.model} color tuning`);

      // Step 2: Apply computational photography effects (subtle)
      buffer = await this.applyComputationalPhotography(buffer);
      appliedEffects.push('computational_photography');
      console.log(`   ✅ Applied computational photography`);

      // Step 3: Add minimal, realistic noise (modern phones use AI denoise)
      buffer = await this.addRealisticNoise(buffer);
      appliedEffects.push('realistic_noise_profile');
      console.log(`   ✅ Added realistic noise profile`);

      // Step 4: Apply subtle edge enhancement (modern phones sharpen slightly)
      buffer = await this.applyEdgeEnhancement(buffer);
      appliedEffects.push('edge_enhancement');
      console.log(`   ✅ Applied edge enhancement`);

      // Step 5: Simulate HDR tone mapping (if applicable)
      buffer = await this.applyHDRToneMapping(buffer);
      appliedEffects.push('hdr_tone_mapping');
      console.log(`   ✅ Applied HDR tone mapping`);

      console.log(`   🎯 Modern smartphone processing complete`);

      return {
        success: true,
        processedBuffer: buffer,
        authenticityLevel: 'high',
        appliedEffects,
        deviceSimulated: device.model
      };

    } catch (error) {
      console.error(`   ❌ Processing failed:`, (error as Error).message);
      return {
        success: false,
        processedBuffer: null,
        authenticityLevel: 'low',
        appliedEffects: [],
        deviceSimulated: 'unknown',
        errorMessage: (error as Error).message
      };
    }
  }

  /**
   * 1️⃣ Apply device color science (brand-specific tuning)
   */
  private async applyDeviceColorScience(buffer: Buffer): Promise<Buffer> {
    try {
      const device = this.DEVICE_PROFILES[this.selectedDevice];
      const chars = device.characteristics;

      return await sharp(buffer)
        .modulate({
          saturation: chars.saturation,
          brightness: chars.brightness,
          hue: Math.round((chars.warmth - 1) * 30) // Convert warmth to hue shift
        })
        .linear(
          1 + (chars.contrast - 1) * 0.5, // Subtle contrast boost
          0
        )
        .jpeg({ quality: 92, progressive: true })
        .toBuffer();

    } catch (error) {
      console.warn(`   ⚠️  Color science failed:`, (error as Error).message);
      return buffer;
    }
  }

  /**
   * 2️⃣ Apply computational photography effects
   * Modern phones use AI-powered processing for:
   * - Smart tone mapping
   * - Scene recognition
   * - Exposure optimization
   * - Color preservation
   */
  private async applyComputationalPhotography(buffer: Buffer): Promise<Buffer> {
    try {
      const device = this.DEVICE_PROFILES[this.selectedDevice];

      // Subtle clarity/structure enhancement (not over-sharpened)
      return await sharp(buffer)
        .enhance()  // Auto-enhance (mild)
        .sharpen({
          sigma: device.characteristics.sharpness === 'high' ? 0.7 : 0.4,
          flat: 0.5,
          jagged: 1
        })
        .jpeg({ quality: 92, progressive: true })
        .toBuffer();

    } catch (error) {
      console.warn(`   ⚠️  Computational photography failed:`, (error as Error).message);
      return buffer;
    }
  }

  /**
   * 3️⃣ Add realistic noise profile
   * Modern phones have very low noise:
   * - iPhone: Near zero noise with advanced denoise
   * - Samsung: Optimized low-light noise reduction
   * - Google: AI-powered denoise
   */
  private async addRealisticNoise(buffer: Buffer): Promise<Buffer> {
    try {
      const device = this.DEVICE_PROFILES[this.selectedDevice];
      const noiseFactor = device.characteristics.noiseFactor;

      // Get image dimensions
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        return buffer;
      }

      // Create very subtle noise overlay (modern phones have almost no visible noise)
      const canvas = createCanvas(metadata.width, metadata.height);
      const ctx = canvas.getContext('2d');

      const imageData = ctx.createImageData(metadata.width, metadata.height);
      const data = imageData.data;

      // Add minimal Gaussian-like noise
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * noiseFactor * 10;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
        // Alpha unchanged
      }

      ctx.putImageData(imageData, 0, 0);
      const noiseBuffer = canvas.toBuffer('image/jpeg', { quality: 92 });

      return noiseBuffer;

    } catch (error) {
      console.warn(`   ⚠️  Noise profile failed:`, (error as Error).message);
      return buffer;
    }
  }

  /**
   * 4️⃣ Apply edge enhancement
   * Modern phones apply smart edge detection:
   * - Preserve natural details
   * - Avoid halo effects
   * - Enhance texture without over-processing
   */
  private async applyEdgeEnhancement(buffer: Buffer): Promise<Buffer> {
    try {
      const device = this.DEVICE_PROFILES[this.selectedDevice];
      const sharpnessLevel = device.characteristics.sharpness;

      if (sharpnessLevel === 'high') {
        // Samsung S24 style: crisp, detailed
        return await sharp(buffer)
          .sharpen({
            sigma: 0.8,
            flat: 1.0,
            jagged: 1.5
          })
          .jpeg({ quality: 92, progressive: true })
          .toBuffer();
      } else {
        // iPhone/Pixel style: natural, balanced
        return await sharp(buffer)
          .sharpen({
            sigma: 0.5,
            flat: 0.8,
            jagged: 0.8
          })
          .jpeg({ quality: 92, progressive: true })
          .toBuffer();
      }

    } catch (error) {
      console.warn(`   ⚠️  Edge enhancement failed:`, (error as Error).message);
      return buffer;
    }
  }

  /**
   * 5️⃣ Apply HDR tone mapping
   * Modern phones apply subtle HDR even in standard photos:
   * - Recover shadow details
   * - Preserve highlight information
   * - Natural tone curve
   */
  private async applyHDRToneMapping(buffer: Buffer): Promise<Buffer> {
    try {
      // Apply subtle tone curve adjustment (simulates HDR tone mapping)
      return await sharp(buffer)
        .normalize()  // Mild normalization
        .modulate({
          brightness: 1.0,
          saturation: 0.98,  // Slight desaturation to avoid oversaturation
          lightness: 0.02    // Tiny lightness adjustment
        })
        .jpeg({ quality: 92, progressive: true })
        .toBuffer();

    } catch (error) {
      console.warn(`   ⚠️  HDR tone mapping failed:`, (error as Error).message);
      return buffer;
    }
  }

  /**
   * Validate authenticity processing
   */
  validateAuthenticity(result: AuthenticityResult): boolean {
    if (!result.success || !result.processedBuffer) {
      return false;
    }

    const sizeInKB = result.processedBuffer.length / 1024;
    const isReasonableSize = sizeInKB > 50 && sizeInKB < 2000; // 50KB - 2MB
    const hasEffects = result.appliedEffects.length >= 4;

    return isReasonableSize && hasEffects;
  }
}
