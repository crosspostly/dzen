#!/usr/bin/env npx tsx

/**
 * 🎨 Test Image Generation CLI
 * 
 * Minimal workflow to test image generation:
 * 1. Theme
 * 2. Outline + plotBible
 * 3. Cover image
 * 4. Canvas processing
 * 5. Export
 * 
 * Usage:
 *   npx tsx cli-test-image.ts --channel=women-35-60
 */

import * as fs from 'fs';
import * as path from 'path';
import { ThemeGeneratorService } from './services/themeGeneratorService';
import { MultiAgentService } from './services/multiAgentService';
import { imageGeneratorAgent } from './services/imageGeneratorAgent';
import { ImageProcessorService } from './services/imageProcessorService';

interface TestImageOptions {
  channel: string;
}

class TestImageGenerator {
  private apiKey: string;
  private themeService: ThemeGeneratorService;
  private multiAgentService: MultiAgentService;
  private imageProcessor: ImageProcessorService;
  private channelName: string;

  constructor(options: TestImageOptions) {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.themeService = new ThemeGeneratorService(this.apiKey);
    this.multiAgentService = new MultiAgentService(this.apiKey);
    this.imageProcessor = new ImageProcessorService();
    this.channelName = options.channel || 'test-channel';

    if (!this.apiKey) {
      console.error('❌ GEMINI_API_KEY or API_KEY not set!');
      process.exit(1);
    }
  }

  async run() {
    const startTime = Date.now();

    console.log(`
╔${'═'.repeat(60)}╗`);
    console.log(`║ 🎨 Test Image Generation Pipeline`);
    console.log(`╠${'═'.repeat(60)}╣`);
    console.log(`║ Channel: ${this.channelName}`);
    console.log(`║ Start:   ${new Date().toLocaleTimeString()}`);
    console.log(`╚${'═'.repeat(60)}╝
`);

    try {
      // STEP 1: Generate theme
      console.log(`📝 STEP 1: Generate theme...`);
      const theme = await this.themeService.generateNewTheme();
      console.log(`   ✅ Theme: "${theme}"\n`);

      // STEP 2: Generate outline (with plotBible)
      console.log(`📋 STEP 2: Generate outline + plotBible...`);
      const outline = await this.multiAgentService.generateOutline({
        theme,
        angle: 'confession',
        emotion: 'guilt',
        audience: 'Women 35-60',
      });
      console.log(`   ✅ Outline generated (${outline.episodes.length} episodes)\n`);

      // Extract plotBible
      const plotBible = this.multiAgentService.extractPlotBible(outline, {
        theme,
        emotion: outline.emotion,
        audience: 'Women 35-60',
      });
      console.log(`   ✅ PlotBible extracted:`);
      console.log(`      - Narrator: ${plotBible.narrator.age}y/o ${plotBible.narrator.gender}`);
      console.log(`      - Tone: ${plotBible.narrator.tone}\n`);

      // STEP 3: Generate lede (for image context)
      console.log(`📖 STEP 3: Generate lede (for image context)...`);
      const lede = await this.multiAgentService.generateLede(outline);
      console.log(`   ✅ Lede generated (${lede.length} chars)\n`);

      // STEP 4: Generate cover image
      console.log(`🎨 STEP 4: Generate cover image...`);
      const startImageTime = Date.now();
      
      const generatedImage = await imageGeneratorAgent.generateCoverImage({
        title: theme,
        ledeText: lede,
        plotBible,
        articleId: 'test-article',
      });

      const imageGenTime = Date.now() - startImageTime;
      console.log(`   ✅ Image generated in ${imageGenTime}ms`);
      console.log(`      - Size: ${Math.round(generatedImage.fileSize / 1024)}KB`);
      console.log(`      - Format: ${generatedImage.mimeType}`);
      console.log(`      - Base64 length: ${generatedImage.base64.length}\n`);

      // STEP 5: Canvas post-processing
      console.log(`🎬 STEP 5: Canvas post-processing...`);
      const startProcessTime = Date.now();
      
      let processedBuffer: Buffer | undefined;
      try {
        processedBuffer = await this.imageProcessor.processImage(generatedImage.base64);
        const processTime = Date.now() - startProcessTime;
        console.log(`   ✅ Image processed in ${processTime}ms`);
        console.log(`      - Output format: JPEG`);
        console.log(`      - Output size: ${Math.round(processedBuffer.length / 1024)}KB`);
        console.log(`      - Quality: 0.8 (with natural artifacts)\n`);
      } catch (processError) {
        console.warn(`   ⚠️  Canvas processing failed: ${(processError as Error).message}`);
        console.log(`   ℹ️  Using original PNG instead\n`);
        // Use original base64 without processing
      }

      // STEP 6: Export to repo
      console.log(`💾 STEP 6: Export to repository...`);
      const outputDir = await this.exportImage({
        theme,
        processedBuffer,
        originalBase64: generatedImage.base64,
        plotBible,
        lede,
      });
      console.log(`   ✅ Exported to: ${outputDir}\n`);

      // SUMMARY
      const totalTime = Date.now() - startTime;
      console.log(`╔${'═'.repeat(60)}╗`);
      console.log(`║ ✅ TEST COMPLETE`);
      console.log(`╠${'═'.repeat(60)}╣`);
      console.log(`║ Total time: ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`║ Theme: ${theme}`);
      console.log(`║ Image: ${processedBuffer ? 'JPEG (processed)' : 'PNG (original)'}`);
      console.log(`║ Output: ${outputDir}`);
      console.log(`╚${'═'.repeat(60)}╝\n`);

    } catch (error) {
      console.error(`\n❌ Test failed:`, (error as Error).message);
      console.error((error as Error).stack);
      process.exit(1);
    }
  }

  /**
   * Export image to repo
   */
  private async exportImage(options: {
    theme: string;
    processedBuffer?: Buffer;
    originalBase64: string;
    plotBible: any;
    lede: string;
  }): Promise<string> {
    // Create directory
    const dateStr = new Date().toISOString().split('T')[0];
    const outputDir = path.join('./articles', this.channelName, dateStr, 'test-images');
    fs.mkdirSync(outputDir, { recursive: true });

    // Create slug from theme
    const slug = this.createSlug(options.theme);
    const timestamp = Date.now();
    const filename = `${slug}-${timestamp}`;

    // Save image
    if (options.processedBuffer) {
      // JPEG from Canvas processing
      const jpegPath = path.join(outputDir, `${filename}.jpg`);
      fs.writeFileSync(jpegPath, options.processedBuffer);
      console.log(`      📄 ${filename}.jpg (${Math.round(options.processedBuffer.length / 1024)}KB)`);
    } else {
      // PNG from API
      const base64Data = options.originalBase64.replace(/^data:image\/\w+;base64,/, '');
      const pngPath = path.join(outputDir, `${filename}.png`);
      fs.writeFileSync(pngPath, Buffer.from(base64Data, 'base64'));
      console.log(`      📄 ${filename}.png (original)`);
    }

    // Save metadata
    const metadata = {
      theme: options.theme,
      timestamp,
      narrator: {
        age: options.plotBible.narrator.age,
        gender: options.plotBible.narrator.gender,
        tone: options.plotBible.narrator.tone,
      },
      sensoryPalette: options.plotBible.sensoryPalette,
      lede: options.lede.substring(0, 200) + '...',
    };
    const metadataPath = path.join(outputDir, `${filename}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`      📋 ${filename}-metadata.json`);

    return outputDir;
  }

  /**
   * Create URL-safe slug from Russian text
   */
  private createSlug(title: string): string {
    const transliterationMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
      'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
      'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
      'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
      'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
      'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd',
      'Е': 'e', 'Ё': 'yo', 'Ж': 'zh', 'З': 'z', 'И': 'i',
      'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm', 'Н': 'n',
      'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't',
      'У': 'u', 'Ф': 'f', 'Х': 'h', 'Ц': 'ts', 'Ч': 'ch',
      'Ш': 'sh', 'Щ': 'sch', 'Ъ': '', 'Ы': 'y', 'Ь': '',
      'Э': 'e', 'Ю': 'yu', 'Я': 'ya',
    };

    let slug = title.split('').map(char => transliterationMap[char] || char).join('');
    slug = slug.toLowerCase();
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-|-$/g, '');
    slug = slug.substring(0, 50);

    return slug || 'test-image';
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options: TestImageOptions = {
    channel: 'test-channel',
  };

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith('--channel=')) {
      options.channel = arg.replace('--channel=', '');
    }
  }

  const generator = new TestImageGenerator(options);
  await generator.run();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
