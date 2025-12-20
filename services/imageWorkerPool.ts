/**
 * 📝 Image Worker Pool
 * Serial generation of COVER images (1 per article, 1 per minute)
 * NOT episode images - just ONE cover per article!
 */

import { Article, CoverImage } from '../types/ContentFactory';
import { ImageGeneratorAgent } from './imageGeneratorAgent';
import { PlotBibleBuilder } from './plotBibleBuilder';
import { CoverImageRequest } from '../types/ImageGeneration';

export class ImageWorkerPool {
  private apiKey?: string;
  private imageGenerationRate: number; // images per minute
  private isRunning = false;
  private isPaused = false;
  private queue: Array<{article: Article, lede: string}> = [];
  private imageGeneratorAgent: ImageGeneratorAgent;

  constructor(apiKey?: string, imageGenerationRate: number = 1) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
    this.imageGenerationRate = imageGenerationRate;
    this.imageGeneratorAgent = new ImageGeneratorAgent(this.apiKey);
  }

  /**
   * Print processing plan
   */
  printProcessingPlan(articleCount: number): void {
    const totalMinutes = Math.ceil(articleCount / this.imageGenerationRate);
    console.log(`\n📼  Image Generation Plan:`);
    console.log(`   - Articles: ${articleCount}`);
    console.log(`   - Rate: ${this.imageGenerationRate}/minute`);
    console.log(`   - Estimated time: ${totalMinutes} minutes (1 cover per article)`);
    console.log(`   - Total covers: ${articleCount}\n`);
  }

  /**
   * Enqueue articles for image generation
   */
  enqueueArticles(articles: Article[], ledes: string[]): void {
    console.log(`\n📼  Queuing ${articles.length} articles for cover image generation...\n`);
    
    for (let i = 0; i < articles.length; i++) {
      this.queue.push({
        article: articles[i],
        lede: ledes[i],
      });
      console.log(`   ✅ Article ${i + 1} queued for cover image`);
    }
  }

  /**
   * Start processing queue - generate COVER images serially
   */
  async start(): Promise<CoverImage[]> {
    this.isRunning = true;
    this.isPaused = false;

    const generatedImages: CoverImage[] = [];
    const delayPerImage = (1000 * 60) / this.imageGenerationRate; // ms between images

    console.log(`\n📼  Starting cover image generation (${this.imageGenerationRate}/min) with REAL Gemini API...\n`);

    for (let i = 0; i < this.queue.length; i++) {
      if (!this.isRunning) break;

      // Wait if paused
      while (this.isPaused && this.isRunning) {
        await this.sleep(100);
      }

      const {article, lede} = this.queue[i];
      const startTime = Date.now();

      try {
        console.log(`  📼  Cover ${i + 1}/${this.queue.length}: Generating for "${article.title.substring(0, 40)}..."`);

        // 🔥 Generate REAL cover image using ImageGeneratorAgent
        const coverImage = await this.generateCoverImage(article, lede);

        generatedImages.push(coverImage);
        console.log(`     ✅ Generated (${coverImage.size} bytes, ${coverImage.base64.substring(0, 30)}...)`);

        // Rate limiting: wait before next image
        if (i < this.queue.length - 1) {
          const elapsed = Date.now() - startTime;
          const waitTime = Math.max(0, delayPerImage - elapsed);
          if (waitTime > 0) {
            console.log(`     ⏳ Waiting ${(waitTime / 1000).toFixed(1)}s before next image...\n`);
            await this.sleep(waitTime);
          }
        }
      } catch (error) {
        console.error(`     ❌ Failed: ${(error as Error).message}`);
        // Continue with next image (don't abort entire batch)
      }
    }

    this.isRunning = false;
    return generatedImages;
  }

  /**
   * Attach cover images to articles (1:1 mapping)
   */
  attachCoverImagesToArticles(articles: Article[], coverImages: CoverImage[]): void {
    console.log(`\n📼  Attaching cover images to articles...\n`);
    
    for (let i = 0; i < Math.min(articles.length, coverImages.length); i++) {
      articles[i].coverImage = coverImages[i];
      console.log(`   ✅ Cover ${i + 1} attached to Article ${i + 1}`);
    }
  }

  /**
   * 🔥 Generate REAL cover image using ImageGeneratorAgent
   * Builds PlotBible context and calls Gemini Image API
   * 
   * FIXED v4.2: Use PlotBibleBuilder.buildFromTheme() (static method)
   * NOT plotBibleBuilder.build() (instance method that doesn't exist)
   */
  private async generateCoverImage(article: Article, lede: string): Promise<CoverImage> {
    try {
      // 🔥 FIXED: Use STATIC method PlotBibleBuilder.buildFromTheme()
      // NOT instance method plotBibleBuilder.build()
      const plotBible = PlotBibleBuilder.buildFromTheme({
        theme: article.metadata.theme,
        angle: article.metadata.angle,
        emotion: article.metadata.emotion,
        audience: article.metadata.audience,
      });

      // Build cover image request
      const coverImageRequest: CoverImageRequest = {
        title: article.title,
        ledeText: lede,
        articleId: article.id,
        plotBible: plotBible,
      };

      // Generate image using Gemini API
      const generatedImage = await this.imageGeneratorAgent.generateCoverImage(coverImageRequest);

      // Convert to CoverImage format
      return {
        base64: generatedImage.base64,
        size: generatedImage.fileSize,
      };

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.warn(`  📦 Image generation failed (${errorMsg}), using fallback SVG...`);
      
      // Fallback to simple placeholder if API fails
      return this.generatePlaceholderImage(article.title, article.metadata.emotion);
    }
  }

  /**
   * 🚂 Fallback: Generate placeholder image as base64 SVG
   * Only used if Gemini API generation fails
   */
  private generatePlaceholderImage(title: string, emotion: string): CoverImage {
    const emotionColors: Record<string, string> = {
      triumph: '#4CAF50',
      guilt: '#FF9800',
      shame: '#F44336',
      anger: '#D32F2F',
      relief: '#2196F3',
    };

    const bgColor = emotionColors[emotion] || '#9C27B0';

    // Create SVG as fallback
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)"/>
        <text x="600" y="300" font-size="48" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">
          ${this.escapeXml(title.substring(0, 50))}
        </text>
        <text x="600" y="380" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="Arial">
          📄 Яндекс.Дзен
        </text>
        <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.1)"/>
        <circle cx="1100" cy="530" r="80" fill="rgba(255,255,255,0.1)"/>
      </svg>
    `;

    // Convert SVG to base64
    const base64 = Buffer.from(svg).toString('base64');
    return {
      base64: `data:image/svg+xml;base64,${base64}`,
      size: base64.length,
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.isPaused = true;
    console.log('\n⏸️  Image generation paused');
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.isPaused = false;
    console.log('\n▶️  Image generation resumed');
  }

  /**
   * Stop processing
   */
  stop(): void {
    this.isRunning = false;
    console.log('\n⛔ Image generation stopped');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
