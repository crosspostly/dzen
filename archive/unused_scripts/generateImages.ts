#!/usr/bin/env npx tsx

/**
 * 🖼️ Image Generator Script
 * 
 * Генерирует картинки для контента отдельным процессом
 * Использует ImageGeneratorService + ImageProcessorService
 * 
 * Использование:
 *   npx tsx scripts/generateImages.ts "описание сцены"
 *   npx tsx scripts/generateImages.ts "описание сцены" --output=path/to/save
 *   npx tsx scripts/generateImages.ts "описание сцены" --count=5 --delay=2000
 */

import path from 'path';
import fs from 'fs';
import { ImageGeneratorService } from '../services/imageGeneratorService';
import { ImageProcessorService } from '../services/imageProcessorService';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
🖼️  Image Generator Script

Usage:
  npx tsx scripts/generateImages.ts <description> [options]

Options:
  --output, -o <path>      Output directory (default: ./generated/images/)
  --count, -c <number>     Number of images to generate (default: 1)
  --delay, -d <ms>         Delay between generations (default: 3000ms)
  --verbose, -v            Show detailed logs
  --help, -h               Show this help

Examples:
  # Single image
  npx tsx scripts/generateImages.ts "Beautiful landscape with sunset"
  
  # Multiple images
  npx tsx scripts/generateImages.ts "Woman cooking" --count=5 --delay=2000
  
  # Custom output
  npx tsx scripts/generateImages.ts "Office scene" --output=articles/images/
    `);
    process.exit(0);
  }

  // Parse arguments
  const description = args[0];
  let outputDir = './generated/images/';
  let count = 1;
  let delay = 3000;
  let verbose = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--count' || arg === '-c') {
      count = parseInt(args[++i], 10);
    } else if (arg === '--delay' || arg === '-d') {
      delay = parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`
🖼️  Image Generator Script\n`);
  console.log(`📝 Description: "${description}"`);
  console.log(`📁 Output: ${path.resolve(outputDir)}`);
  console.log(`📊 Count: ${count}`);
  console.log(`⏱️  Delay: ${delay}ms`);
  console.log(`\n${'='.repeat(50)}\n`);

  const imageGenerator = new ImageGeneratorService();
  const imageProcessor = new ImageProcessorService();
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= count; i++) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `image_${timestamp}_${i}.jpg`;
    const filepath = path.join(outputDir, filename);

    try {
      if (verbose) console.log(`\n[${i}/${count}] Generating image...`);
      console.log(`[${i}/${count}] 🎨 Generating: ${filename}`);

      // Generate image from Gemini
      const base64Image = await imageGenerator.generateVisual(description);
      
      if (!base64Image) {
        throw new Error('Image generation returned null');
      }

      if (verbose) console.log(`       ✅ Generated (${(base64Image.length / 1024).toFixed(1)} KB base64)`);

      // Process image (resize to 16:9, clean metadata)
      if (verbose) console.log(`       🔄 Processing (16:9 1280x720)...`);
      const processResult = await imageProcessor.processImage(base64Image);

      if (!processResult.success || !processResult.buffer) {
        throw new Error(`Image processing failed: ${processResult.errorMessage || 'Unknown error'}`);
      }

      const processedBuffer = processResult.buffer;

      if (verbose) console.log(`       ✅ Processed (${(processedBuffer.length / 1024).toFixed(1)} KB)`);

      // Save to disk
      fs.writeFileSync(filepath, processedBuffer, 'binary');
      console.log(`       💾 Saved: ${filepath}`);
      console.log(`       📏 Size: ${(processedBuffer.length / 1024).toFixed(1)} KB`);

      successCount++;
    } catch (error) {
      console.error(`       ❌ Error: ${(error as Error).message}`);
      errorCount++;
    }

    // Delay before next generation
    if (i < count) {
      if (verbose) console.log(`       ⏳ Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`
${'='.repeat(50)}`);
  console.log(`\n✅ Generation Complete!\n`);
  console.log(`📊 Statistics:`);
  console.log(`   - Success: ${successCount}/${count}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Duration: ${duration}s`);
  console.log(`   - Output: ${path.resolve(outputDir)}\n`);

  if (successCount > 0) {
    console.log(`🎉 Generated images:`);
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('image_'));
    files.slice(-successCount).forEach(f => {
      const fullPath = path.join(outputDir, f);
      const size = fs.statSync(fullPath).size;
      console.log(`   - ${f} (${(size / 1024).toFixed(1)} KB)`);
    });
  }

  process.exit(errorCount > 0 && successCount === 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
