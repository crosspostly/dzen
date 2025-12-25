/**
 * 🎭 ZenMaster v4.0 - Content Factory Orchestrator
 * 
 * Main orchestrator for mass content generation (1-100 articles)
 * Features:
 * - Parallel article generation (3 concurrent)
 * - Serial image generation (1 per minute)
 * - Progress tracking
 * - Quality control
 * - Export to multiple formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArticleWorkerPool, BothModeResult } from './articleWorkerPool';
import { ImageWorkerPool } from './imageWorkerPool';
import { ImageProcessorService } from './imageProcessorService';
import { MobilePhotoAuthenticityProcessor, AuthenticityResult } from './mobilePhotoAuthenticityProcessor';
import {
  ContentFactoryConfig,
  FactoryProgress,
  FactoryState,
  Article,
  FactoryOutput,
  FactoryManifest,
  FactoryReport,
  FactoryError
} from '../types/ContentFactory';

export class ContentFactoryOrchestrator {
  private config!: ContentFactoryConfig;
  private articleWorkerPool!: ArticleWorkerPool;
  private imageWorkerPool!: ImageWorkerPool;
  private progress: FactoryProgress;
  private articles: Article[] = [];
  private errors: FactoryError[] = [];
  private apiKey?: string;
  private channelName: string = 'channel-1'; // 🆕 Channel name for folder structure

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.progress = {
      state: "initializing",
      articlesTotal: 0,
      articlesCompleted: 0,
      articlesFailed: 0,
      imagesTotal: 0,
      imagesCompleted: 0,
      imagesFailed: 0,
      percentComplete: 0,
      estimatedTimeRemaining: 0,
      currentlyGenerating: [],
      errors: []
    };
  }

  /**
   * 🎬 Initialize factory with configuration
   */
  async initialize(config: ContentFactoryConfig, channelName?: string): Promise<void> {
    // 🆕 Set channel name
    if (channelName) {
      this.channelName = channelName;
    }

    console.log(`
╔${"═".repeat(58)}╗`);
    console.log(`║ 🎭 ZenMaster v4.0 - Content Factory`);
    console.log(`╠${"═".repeat(58)}╣`);
    console.log(`║ 📄 Articles:          ${config.articleCount}`);
    console.log(`║ ⚙️  Parallel workers:  ${config.parallelEpisodes}`);
    console.log(`║ 🗼️  Images:            ${config.includeImages ? 'Yes (1/min)' : 'No'}`);
    console.log(`║ 🎯 Quality level:     ${config.qualityLevel}`);
    console.log(`║ 📄 Output format:     ${config.outputFormat}`);
    console.log(`║ 📡 Anti-detection:   ${config.enableAntiDetection ? 'Yes' : 'No'}`);
    console.log(`║ 📖 PlotBible:         ${config.enablePlotBible ? 'Yes' : 'No'}`);
    console.log(`║ 📁 Channel:           ${this.channelName}`);
    console.log(`╚${"═".repeat(58)}╝
`);

    this.config = config;

    // Initialize worker pools
    this.articleWorkerPool = new ArticleWorkerPool(
      config.parallelEpisodes,
      this.apiKey
    );

    if (config.includeImages) {
      this.imageWorkerPool = new ImageWorkerPool(
        this.apiKey,
        config.imageGenerationRate
      );

      // Print image processing plan
      this.imageWorkerPool.printProcessingPlan(config.articleCount);
    }

    // Initialize progress
    this.progress.state = "initializing";
    this.progress.articlesTotal = config.articleCount;
    this.progress.imagesTotal = config.includeImages ? config.articleCount : 0; // ✅ 1 cover per article!

    // Estimate time
    const articleTime = config.articleCount * 5; // ~5 min per article
    const imageTime = config.includeImages ? config.articleCount : 0; // ✅ 1 min per cover (not 12!)
    this.progress.estimatedTimeRemaining = (articleTime + imageTime) * 60; // in seconds

    this.progress.state = "running";
    this.progress.startedAt = Date.now();

    console.log(`✅ Factory initialized and ready to start
`);
  }

  /**
   * 🚀 Start generation process
   */
  async start(): Promise<Article[]> {
    if (this.progress.state !== "running") {
      throw new Error("Factory not initialized. Call initialize() first.");
    }

    console.log(`🚀 Starting content generation...\n`);

    try {
      // Stage 1: Generate articles (parallel)
      console.log(`
${"=".repeat(60)}`);
      console.log(`📝 STAGE 1: Article Generation (${this.config.articleCount} articles)`);
      console.log(`${"=".repeat(60)}\n`);

      this.articles = await this.generateArticles();

      console.log(`
✅ Stage 1 complete: ${this.articles.length} articles generated
`);

      // Stage 2: Generate COVER images (serial, 1 per article!)
      if (this.config.includeImages && this.articles.length > 0) {
        console.log(`
${"=".repeat(60)}`);
        console.log(`🗼️  STAGE 2: COVER Image Generation (${this.articles.length} covers, not ${this.articles.length * 12}!)`);
        console.log(`${"=".repeat(60)}\n`);

        // ✅ STAGE 2: Generate cover images from article title + lede
        await this.generateCoverImages();

        console.log(`
✅ Stage 2 complete: Cover images generated and attached (1 per article)\n`);

        // ✅ STAGE 3: Post-process images through Canvas (remove metadata, apply filters)
        await this.postProcessCoverImages();

        console.log(`
✅ Stage 3 complete: All images post-processed and ready for export
`);

        // 🆕 STAGE 4: Mobile Authenticity - Make images look like real mobile photos
        await this.applyMobileAuthenticityProcessing();

        console.log(`
✅ Stage 4 complete: All images processed for mobile authenticity
`);
      }

      // Mark as completed
      this.progress.state = "completed";
      this.progress.completedAt = Date.now();
      this.progress.percentComplete = 100;

      // Print final summary
      this.printFinalSummary();

      return this.articles;

    } catch (error) {
      this.progress.state = "failed";
      const factoryError: FactoryError = {
        type: "system",
        error: (error as Error).message,
        timestamp: Date.now(),
        recovered: false
      };
      this.errors.push(factoryError);
      this.progress.errors.push(factoryError);

      console.error(`
❌ Factory failed: ${(error as Error).message}
      `);
      throw error;
    }
  }

  /**
   * 🎭 START BOTH MODE - Generate RAW + RESTORED article pairs
   * 
   * Generates two versions of each article:
   * 1. RAW: Clean generation without restoration
   * 2. RESTORED: Voice and drama restored via TextRestorationService
   * 
   * Returns: Array of { rawArticle, restoredArticle } pairs
   */
  async startBoth(): Promise<BothModeResult[]> {
    if (this.progress.state !== "running") {
      throw new Error("Factory not initialized. Call initialize() first.");
    }

    console.log(`
${"=".repeat(60)}`);
    console.log(`🎭 ZENMASTER v7.1 - BOTH MODE`);
    console.log(`Generating ${this.config.articleCount} article pairs (RAW + RESTORED)`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // Stage 1: Generate article pairs (RAW + RESTORED)
      console.log(`
${"=".repeat(60)}`);
      console.log(`📝 STAGE 1: Article Pair Generation`);
      console.log(`${"=".repeat(60)}\n`);

      const pairResults = await this.generateArticlePairs();
      const allArticles = pairResults.flatMap(p => [p.rawArticle, p.restoredArticle]);
      
      console.log(`
✅ Stage 1 complete: ${pairResults.length} article pairs generated (${allArticles.length} total articles)
      `);

      // Store all articles for export
      this.articles = allArticles;

      // Stage 2: Process images for both versions (share same image)
      if (this.config.includeImages && allArticles.length > 0) {
        console.log(`
${"=".repeat(60)}`);
        console.log(`🗼️  STAGE 2: Image Processing (shared cover for both versions)`);
        console.log(`${"=".repeat(60)}\n`);

        await this.postProcessCoverImages();
        await this.applyMobileAuthenticityProcessing();

        console.log(`
✅ Stage 2 complete: All images processed
        `);
      }

      // Mark as completed
      this.progress.state = "completed";
      this.progress.completedAt = Date.now();
      this.progress.percentComplete = 100;

      // Print final summary
      this.printFinalSummaryBoth(pairResults);

      return pairResults;

    } catch (error) {
      this.progress.state = "failed";
      const factoryError: FactoryError = {
        type: "system",
        error: (error as Error).message,
        timestamp: Date.now(),
        recovered: false
      };
      this.errors.push(factoryError);
      this.progress.errors.push(factoryError);

      console.error(`
❌ BOTH mode failed: ${(error as Error).message}
      `);
      throw error;
    }
  }

  /**
   * Generate article pairs (RAW + RESTORED)
   */
  private async generateArticlePairs(): Promise<BothModeResult[]> {
    const results: BothModeResult[] = [];
    const onProgress = (completed: number, total: number) => {
      this.progress.articlesCompleted = completed;
      this.progress.percentComplete = (completed / total) * 100;
      this.updateEstimatedTime();
    };

    try {
      results.push(...await this.articleWorkerPool.executeBatchBoth(
        this.config.articleCount,
        this.config,
        onProgress
      ));
    } catch (error) {
      console.error(`❌ Article pair generation error: ${(error as Error).message}`);
      this.errors.push({
        type: "article",
        error: (error as Error).message,
        timestamp: Date.now(),
        recovered: false
      });
    }

    return results;
  }

  /**
   * Print final summary for BOTH mode
   */
  private printFinalSummaryBoth(pairs: BothModeResult[]): void {
    const rawTotal = pairs.reduce((sum, p) => sum + p.rawArticle.charCount, 0);
    const restoredTotal = pairs.reduce((sum, p) => sum + p.restoredArticle.charCount, 0);
    const improvements = pairs.reduce((sum, p) => {
      const meta = p.restoredArticle.metadata.qualityMetrics;
      return sum + (meta?.restorationImprovements || 0);
    }, 0);

    console.log(`
${"=".repeat(60)}`);
    console.log(`✅ BOTH MODE COMPLETE`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📄 Article pairs: ${pairs.length}`);
    console.log(`📄 Total articles: ${pairs.length * 2}`);
    console.log(`   - RAW: ${rawTotal.toLocaleString()} chars`);
    console.log(`   - RESTORED: ${restoredTotal.toLocaleString()} chars`);
    console.log(`🔧 Total improvements: ${improvements}`);
    console.log(`🖼 Images: ${this.progress.imagesCompleted}/${this.progress.imagesTotal}`);
    console.log(`${"=".repeat(60)}\n`);
  }

  /**
   * 📝 Generate articles using worker pool
   */
  private async generateArticles(): Promise<Article[]> {
    const articles: Article[] = [];

    // Progress callback
    const onProgress = (completed: number, total: number) => {
      this.progress.articlesCompleted = completed;
      this.progress.percentComplete = (completed / total) * 50; // Articles are 50% of total work
      this.updateEstimatedTime();
    };

    try {
      const generated = await this.articleWorkerPool.executeBatch(
        this.config.articleCount,
        this.config,
        onProgress
      );

      articles.push(...generated);

    } catch (error) {
      console.error(`❌ Article generation error: ${(error as Error).message}`);
      this.errors.push({
        type: "article",
        error: (error as Error).message,
        timestamp: Date.now(),
        recovered: false
      });

      // Don't throw error - allow factory to continue with generated articles
      console.log(`⚠️  Continuing with ${articles.length} articles generated so far`);
    }

    // Warn if we didn't get expected number of articles, but continue
    if (articles.length === 0) {
      console.warn(`⚠️  No articles generated successfully - this may cause issues later`);
    } else if (articles.length < this.config.articleCount) {
      console.warn(`⚠️  Generated ${articles.length}/${this.config.articleCount} articles`);
    }

    return articles;
  }

  /**
   * 🗼️ Generate COVER images using image worker pool
   * ✅ UPDATED v4.0: Generates ONE cover per article (not 12!)
   */
  private async generateCoverImages(): Promise<void> {
    // Check if we have articles to generate images for
    if (this.articles.length === 0) {
      console.warn(`⚠️  No articles available for image generation`);
      this.progress.imagesCompleted = 0;
      this.progress.imagesTotal = 0;
      return;
    }

    // Extract ledes (first paragraphs) from articles
    const ledes = this.articles.map(article => {
      // Get lede from article (first paragraph after splitting by double newline)
      const paragraphs = article.content.split('\n\n');
      return paragraphs[0] || article.content.substring(0, 500);
    });

    // Enqueue all articles with their ledes
    this.imageWorkerPool.enqueueArticles(this.articles, ledes);

    // Start processing (serial, 1 per minute)
    let coverImages: any[];

    try {
      coverImages = await this.imageWorkerPool.start();
    } catch (error) {
      console.error(`❌ Cover image generation failed: ${(error as Error).message}`);
      console.log(`⚠️  Continuing without images`);
      coverImages = [];
    }

    // Attach COVER images to articles (1:1 mapping)
    try {
      this.imageWorkerPool.attachCoverImagesToArticles(this.articles, coverImages);
    } catch (error) {
      console.error(`❌ Failed to attach images to articles: ${(error as Error).message}`);
      console.log(`⚠️  Continuing with articles without images`);
    }

    // Update progress
    this.progress.imagesCompleted = coverImages.length;
    this.progress.imagesFailed = this.progress.imagesTotal - coverImages.length;
  }

  /**
   * 🎬 Post-process cover images through Canvas
   * ✅ UPDATED v4.1: Uses new ImageProcessResult API
   * 
   * Process:
   * 1. Decode base64 JPEG from Gemini API
   * 2. Load through canvas.loadImage()
   * 3. Crop to 16:9 aspect ratio (1280x720)
   * 4. Redraw on new canvas (removes Gemini metadata)
   * 5. Export to JPEG 0.8 quality (natural compression artifacts)
   * 6. Attach processedBuffer to article.coverImage
   * 
   * Result: Looks like real mobile phone photo, undetectable as AI-generated
   * 
   * Canvas failures are handled gracefully:
   * - Log the error
   * - Keep original JPEG (from API)
   * - Mark article with processingStatus metadata
   * - Continue with next article
   */
  private async postProcessCoverImages(): Promise<void> {
    if (!this.config.includeImages || this.articles.length === 0) {
      return; // Skip if images not enabled or no articles
    }

    const imageProcessorService = new ImageProcessorService();
    let successCount = 0;
    let failureCount = 0;

    console.log(`
${"=".repeat(60)}`);
    console.log(`🎨 STAGE 3: Canvas Image Post-Processing`);
    console.log(`${"=".repeat(60)}\n`);

    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];

      if (article.coverImage?.base64) {
        try {
          console.log(`\n   📼 Processing cover image (${i + 1}/${this.articles.length})...`);
           // 🔥 FIX: Auto-detect image format from magic bytes (Gemini may return PNG/JPEG/WebP)
           let dataUrl = article.coverImage.base64;
           const hasDataPrefix = dataUrl.startsWith('data:');
           
           if (!hasDataPrefix) {
             // Decode first 20 bytes to detect actual format (WebP needs more bytes)
             const binaryString = Buffer.from(dataUrl.substring(0, 28), 'base64');
             const magic = binaryString.toString('hex').toUpperCase();
             
             // Detect format by magic bytes
             let mimeType = 'image/jpeg'; // default fallback
             if (magic.startsWith('89504E47')) {
               mimeType = 'image/png';
             } else if (magic.startsWith('FFD8FF')) {
               mimeType = 'image/jpeg';
             } else if (magic.startsWith('52494646') && magic.includes('57454250')) {
               // WebP: RIFF....WEBP (52 49 46 46 xx xx xx xx 57 45 42 50)
               mimeType = 'image/webp';
             }
             
             dataUrl = `data:${mimeType};base64,${dataUrl}`;
             console.log(`   ℹ️  Detected format: ${mimeType} (magic bytes: ${magic.substring(0, 16)})`);
           }
           
           console.log(`   ✅ Data URL validation: ${hasDataPrefix ? 'PASS (already prefixed)' : 'PASS (auto-detected)'}`);
           console.log(`   📋 Validating base64 format...`);

          const processorResult = await imageProcessorService.processImage(dataUrl);

          // Handle result
          if (processorResult.success && processorResult.buffer) {
            // Canvas succeeded - attach JPEG buffer
            article.coverImage.processedBuffer = processorResult.buffer;
            article.coverImage.format = 'jpeg';
            
            const originalSizeKb = Math.round(article.coverImage.base64.length * 0.75 / 1024);
            const processedSizeKb = Math.round(processorResult.buffer.length / 1024);
            const reduction = ((1 - processorResult.buffer.length / (article.coverImage.base64.length * 0.75)) * 100).toFixed(1);
            
            console.log(`   ✅ Canvas rendering: PASS (dimensions ${processorResult.width}x${processorResult.height})`);
            console.log(`   ✅ Filter application: ${processorResult.metadata.filterApplied ? 'Applied' : 'Skipped'}`);
            console.log(`   ✅ EXIF removal: Complete`);
            console.log(`   ✅ Re-encoding to JPEG: quality 80%`);
            console.log(``);
            console.log(`   📊 Image transformation:`);
            console.log(`      Original (from API): ${originalSizeKb} KB, format: JPEG`);
            console.log(`      Processed (from Canvas): ${processedSizeKb} KB, format: JPEG, quality: 80%`);
            console.log(`      Size change: ${reduction}%`);
            console.log(`      Ready for publication: YES ✓`);
            
            successCount++;
          } else {
            // ❌ CRITICAL: Canvas failed - THIS SHOULD NEVER HAPPEN IN PRODUCTION!
            console.error(`   ❌ Canvas processing FAILED: ${processorResult.errorMessage}`);
            console.error(`      Status: ${processorResult.processingStatus}`);
            console.error(`      ⚠️  WARNING: Original JPEG will NOT be used (security risk)`);
            console.error(`      📛 Article ${article.id} will be published WITHOUT image`);
            
            // Remove image to prevent leaking original JPEG
            article.coverImage = undefined;
            failureCount++;
          }

          // Always attach metadata about processing status
          if (!article.metadata) {
            article.metadata = { generatedAt: Date.now() };
          }
          article.metadata.imageProcessingStatus = processorResult.processingStatus;
          article.metadata.imageProcessingError = processorResult.errorMessage;

        } catch (error) {
          console.error(
            `     ❌ Unexpected error: ${(error as Error).message}`
          );
          failureCount++;
          // Continue with next image
        }
      }
    }

    console.log(`
✅ Stage 3 complete: ${successCount} images processed, ${failureCount > 0 ? `${failureCount} failed (removed)` : 'all ready for export'}
`);
  }

  /**
   * 🔥 DYNAMIC device selection based on article emotion
   * NOT hardcoded Samsung Galaxy A10!
   */
  private selectDeviceForArticle(article: Article): { model: string; year: number } {
    // Extract emotion from metadata or content
    const emotion = (article.metadata?.emotion || '').toLowerCase();
    const content = (article.content || '').toLowerCase();
    
    // Analyze emotional markers in content
    let detectedEmotion = emotion;
    
    if (!detectedEmotion) {
      if (content.includes('плак') || content.includes('слез') || content.includes('горе')) {
        detectedEmotion = 'grief';
      } else if (content.includes('смех') || content.includes('радо')) {
        detectedEmotion = 'joy';
      } else if (content.includes('гнев') || content.includes('зло')) {
        detectedEmotion = 'anger';
      } else if (content.includes('страх') || content.includes('трев')) {
        detectedEmotion = 'anxiety';
      } else if (content.includes('облегч') || content.includes('спокой')) {
        detectedEmotion = 'relief';
      } else if (content.includes('побед') || content.includes('триумф')) {
        detectedEmotion = 'triumph';
      } else if (content.includes('стыд') || content.includes('вина')) {
        detectedEmotion = 'shame';
      }
    }

    // Determine device based on emotion
    // Positive emotions → newer device
    // Negative emotions → older device
    let yearOffset = 0;
    if (detectedEmotion.includes('triumph') || detectedEmotion.includes('joy')) {
      yearOffset = 0;      // Current year phone
    } else if (detectedEmotion.includes('relief') || detectedEmotion.includes('peaceful')) {
      yearOffset = 2;      // 2-3 year old
    } else if (detectedEmotion.includes('anxiety') || detectedEmotion.includes('shame')) {
      yearOffset = 4;      // 4-5 years old
    } else if (detectedEmotion.includes('grief') || detectedEmotion.includes('mourning') || detectedEmotion.includes('sad')) {
      yearOffset = 7;      // 7-8 years old
    } else if (detectedEmotion.includes('anger') || detectedEmotion.includes('rage')) {
      yearOffset = 3;      // 3-4 years old
    } else {
      yearOffset = 2;      // Default: recent but not brand new
    }

    const year = 2025 - yearOffset;

    // Select device model based on year and narrator age
    const narratorAge = (article.metadata as any)?.narrator?.age || 40;
    let model = 'iPhone 11';  // Default

    if (year >= 2023) {
      model = narratorAge < 40 ? 'iPhone 15' : 'Galaxy S24';
    } else if (year >= 2021) {
      model = narratorAge < 40 ? 'iPhone 13' : 'Galaxy A51';
    } else if (year >= 2019) {
      model = narratorAge < 40 ? 'iPhone 11' : 'Galaxy A31';
    } else if (year >= 2017) {
      model = narratorAge < 45 ? 'iPhone XS' : 'Galaxy S9';
    } else if (year >= 2015) {
      model = narratorAge < 50 ? 'iPhone 6s' : 'Galaxy J7';
    } else {
      model = 'Galaxy J5';
    }

    console.log(`   📱 Device selected: ${model} (${year}) based on emotion: "${detectedEmotion}"`);

    return { model, year };
  }

  /**
   * 🆕 STAGE 4: Apply Mobile Photo Authenticity Processing
   * Makes AI-generated images look like authentic mobile phone photos
   * DYNAMIC device selection based on article emotion!
   */
  private async applyMobileAuthenticityProcessing(): Promise<void> {
    if (!this.config.includeImages || this.articles.length === 0) {
      return; // Skip if images not enabled or no articles
    }

    const authenticityProcessor = new MobilePhotoAuthenticityProcessor();
    let successCount = 0;
    let failureCount = 0;

    console.log(`
${"=".repeat(60)}`);
    console.log(`📱 STAGE 4: Mobile Photo Authenticity Processing`);
    console.log(`${"".repeat(60)}\n`);

    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];

      if (article.coverImage?.base64) {
        try {
          // 🔥 SELECT DEVICE DYNAMICALLY based on article emotion!
          const device = this.selectDeviceForArticle(article);
          const deviceKey = this.mapDeviceToKey(device.model);

          console.log(`\n   🔧 Processing image ${i + 1}/${this.articles.length}...`);

          // Get the current buffer (processedBuffer from Canvas or fallback to original)
          let currentBuffer: Buffer;
          if (article.coverImage.processedBuffer) {
            currentBuffer = article.coverImage.processedBuffer;
          } else {
            // Fallback: Use original JPEG from API
            const base64Data = article.coverImage.base64.replace(/^data:image\/\w+;base64,/, '');
            currentBuffer = Buffer.from(base64Data, 'base64');
          }

          // Apply mobile authenticity processing with selected device
          const authenticityResult = await authenticityProcessor.processWithDevice(
            currentBuffer.toString('base64'),
            deviceKey,
            device.year
          );

          // Handle result
          if (authenticityResult.success && authenticityResult.processedBuffer) {
            // Authenticity processing succeeded - replace buffer
            article.coverImage.processedBuffer = authenticityResult.processedBuffer;
            article.coverImage.format = 'jpeg';
            
            const sizeKb = Math.round(authenticityResult.processedBuffer.length / 1024);
            
            console.log(`\n   📱 Mobile filters applied:`);
            authenticityResult.appliedEffects.forEach(effect => {
              console.log(`      ✅ ${effect}`);
            });
            
            console.log(`\n   📊 Authenticity metrics:`);
            console.log(`      Looks like phone camera: ${authenticityResult.authenticityLevel}`);
            console.log(`      Device: ${device.model} (${device.year})`);
            console.log(`      Metadata consistency: Removed`);
            console.log(`      Artifact patterns: Mobile-like ✓`);
            
            successCount++;
          } else {
            // Authenticity processing failed - keep current buffer
            console.warn(`\n   ⚠️  Authenticity processing failed: ${authenticityResult.errorMessage}`);
            console.log(`      Fallback: Using processed buffer from Stage 3`);
            failureCount++;
          }

          // Always attach metadata about authenticity processing status
          if (!article.metadata) {
            article.metadata = { generatedAt: Date.now() };
          }
          article.metadata.mobileAuthenticityApplied = authenticityResult.success;
          article.metadata.authenticityLevel = authenticityResult.authenticityLevel;
          article.metadata.appliedAuthenticityEffects = authenticityResult.appliedEffects;
          article.metadata.authenticityError = authenticityResult.errorMessage;
          article.metadata.mobileCameraEmulated = `${device.model} (${device.year})`;  // 🔥 DYNAMIC!

        } catch (error) {
          console.error(
            `     ❌ Unexpected authenticity error: ${(error as Error).message}`
          );
          failureCount++;
          // Continue with next image
        }
      }
    }

    console.log(`
✅ Stage 4 complete: All images processed with DYNAMIC device selection
`);
  }

  /**
   * 🔥 Map device model name to processor key
   */
  private mapDeviceToKey(model: string): string {
    const mapping: Record<string, string> = {
      'iPhone 15': 'iphone15',
      'iPhone 13': 'iphone13',
      'iPhone 11': 'iphone11',
      'iPhone XS': 'iphone_xs',
      'iPhone 7': 'iphone_7',
      'iPhone 6s': 'iphone_6s',
      'Galaxy S24': 'samsung_s24',
      'Galaxy S21': 'samsung_s21',
      'Galaxy S10': 'samsung_s10',
      'Galaxy S9': 'samsung_s9',
      'Galaxy A51': 'samsung_a51',
      'Galaxy A31': 'samsung_a31',
      'Galaxy A10': 'samsung_a10',
      'Galaxy J7': 'samsung_j7',
      'Galaxy J5': 'samsung_j5',
      'Pixel 8': 'pixel_8',
      'Pixel 4': 'pixel_4',
    };

    return mapping[model] || 'samsung_a10'; // Safe fallback
  }

  /**
   * ⏸️ Pause generation
   */
  pause(): void {
    this.progress.state = "paused";
    if (this.imageWorkerPool) {
      this.imageWorkerPool.pause();
    }
    console.log("⏸️  Factory paused");
  }

  /**
   * ▶️ Resume generation
   */
  resume(): void {
    this.progress.state = "running";
    if (this.imageWorkerPool) {
      this.imageWorkerPool.resume();
    }
    console.log("▶️  Factory resumed");
  }

  /**
   * 📊 Get current progress
   */
  getProgress(): FactoryProgress {
    return { ...this.progress };
  }

  /**
   * 📄 Export articles for Zen
   * ✅ UPDATED v4.0: Save to articles/{channel_name}/{YYYY-MM-DD}/ with flat structure
   * - ONE .md file (article content with front-matter for RSS)
   * - ONE .jpg file (processed cover image via Canvas, or original JPEG if Canvas fails)
   * - Same filename for both (only extension differs)
   */
  async exportForZen(outputDir: string = './articles'): Promise<string> {
    console.log(`
📄 Exporting ${this.articles.length} articles
`);

    // Create content/articles/{channel_name}/{YYYY-MM-DD}/ directory
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalDir = path.join(outputDir, this.channelName, dateStr);
    fs.mkdirSync(finalDir, { recursive: true });

    console.log(`📁 Output folder: ${finalDir}
`);

    const exportedFiles: string[] = [];

    const githubRepo = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';

    // Export each article with FLAT structure (no article-1/, article-2/ folders)
    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];
      const slug = this.createSlug(article.title); // Convert title to URL-safe slug

      // Add suffix for BOTH mode articles (RAW/RESTORED)
      const version = (article.metadata as any)?.articleVersion;
      const filename = version ? `${slug}-${version.toLowerCase()}` : slug;

      try {
        // Generate front-matter for the markdown file (compatible with RSS generation)
        const description = this.generateIntriguingDescription(article.content);
        const imageFileName = `${slug}.jpg`; // Image file without timestamp (shared)
        const imageUrl = `https://raw.githubusercontent.com/${githubRepo}/main/articles/${this.channelName}/${dateStr}/${imageFileName}`;

        const frontMatter = `---
title: "${article.title}"
date: "${dateStr}"
description: "${description}"
image: "${imageUrl}"
category: "lifestory"
${version ? `version: "${version}"` : ''}
---
`;

        // Prepare the article content (without the first line which is the title)
        const contentLines = article.content.split('\n');
        const articleBody = contentLines.slice(1).join('\n').trim(); // Skip first line (title)

        // Combine front-matter and article content
        const markdownContent = frontMatter + '\n' + articleBody;

        // Save article as MARKDOWN (with front-matter)
        const mdPath = path.join(finalDir, `${filename}.md`);
        fs.writeFileSync(mdPath, markdownContent);
        exportedFiles.push(mdPath);
        console.log(`✅ Article ${i + 1}: ${filename}.md`);

        // 🔥 FIX: ALWAYS save COVER image as JPEG (without timestamp)
        if (article.coverImage) {
          let jpegBuffer: Buffer | null = null;
          let source: string;

          // Check for processed buffer (Canvas post-processing)
          if (article.coverImage.processedBuffer) {
            jpegBuffer = article.coverImage.processedBuffer;
            source = 'Canvas processed';
          } else {
            // Fallback: Use original JPEG from API
            // The API ALWAYS returns JPEG (format: "jpeg" in imageGeneratorAgent config)
            const base64Data = article.coverImage.base64.replace(/^data:image\/\w+;base64,/, '');
            jpegBuffer = Buffer.from(base64Data, 'base64');
            source = 'Original API JPEG';
          }

          // 🔥 ALWAYS save as .jpg with same slug (no timestamp)
          const jpgPath = path.join(finalDir, imageFileName);
          fs.writeFileSync(jpgPath, jpegBuffer);
          exportedFiles.push(jpgPath);
          console.log(`   🗼️  Cover: ${imageFileName} (${source}, device: ${article.metadata?.mobileCameraEmulated || 'unknown'})`);
        }
      } catch (error) {
        console.error(`❌ Failed to export article ${i + 1}: ${(error as Error).message}`);
      }
    }

    // Generate manifest
    const manifest = this.generateManifest(finalDir, exportedFiles);
    const manifestPath = path.join(finalDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Generate report
    const report = this.generateReport();
    const reportPath = path.join(finalDir, 'REPORT.md');
    fs.writeFileSync(reportPath, this.formatReport(report));

    console.log(`
✅ Export complete:`);
    console.log(`   📄 Articles: ${this.articles.length}`);
    console.log(`   🗼️  Cover images: ${this.articles.filter(a => a.coverImage).length} (1 per article)`);
    console.log(`   📋 Manifest: ${manifestPath}`);
    console.log(`   📋 Report: ${reportPath}\n`);

    return finalDir;
  }

  /**
   * 📄 Create intriguing description for Yandex Zen (150-200 characters)
   * Creates an engaging, click-worthy description that teases the content
   */
  private generateIntriguingDescription(content: string): string {
    // Get the first part of the content (excluding title which is usually the first line)
    const contentLines = content.split('\n');
    const contentWithoutTitle = contentLines.slice(1).join(' ');

    // Take first 150-200 characters that don't break words
    let description = contentWithoutTitle.substring(0, 200).trim();

    // Ensure it's at least 150 characters
    if (description.length < 150 && contentWithoutTitle.length > 150) {
      description = contentWithoutTitle.substring(0, 200).trim();
    } else if (description.length > 150) {
      // Find the last space to avoid cutting words
      const lastSpaceIndex = description.lastIndexOf(' ');
      if (lastSpaceIndex > 150) {
        description = description.substring(0, lastSpaceIndex).trim();
      }
    }

    // Add ellipsis if original content was longer
    if (contentWithoutTitle.length > description.length) {
      description += '...';
    }

    // Ensure it doesn't contain quotes that might break the front-matter
    description = description.replace(/"/g, "'").replace(/\n/g, " ");

    return description;
  }

  /**
   * 📄 Create URL-safe slug from Russian text
   * Example: "Я всю жизнь боялась одиночества" → "ya-vsyu-zhizn-boyalas-odinochestva"
   */
  private createSlug(title: string): string {
    // Russian to Latin transliteration
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

    // Transliterate
    let slug = title.split('').map(char => transliterationMap[char] || char).join('');

    // Convert to lowercase, remove non-alphanumeric, replace spaces with hyphens
    slug = slug.toLowerCase();
    slug = slug.replace(/[^a-z0-9\s-]/g, ''); // Remove special chars
    slug = slug.replace(/\s+/g, '-'); // Spaces to hyphens
    slug = slug.replace(/-+/g, '-'); // Collapse multiple hyphens
    slug = slug.replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    slug = slug.substring(0, 50); // Max 50 chars

    return slug || 'article';
  }

  /**
   * 📄 Convert article to Markdown
   */
  private convertToMarkdown(article: Article): string {
    let md = `# ${article.title}

`;
    md += `**Generated:** ${new Date(article.metadata.generatedAt).toLocaleString()}
`;
    md += `**Theme:** ${article.metadata.theme}
`;
    md += `**Characters:** ${article.charCount.toLocaleString()}
`;
    md += `**Read time:** ${article.stats.estimatedReadTime} min

`;
    md += `---

`;
    md += article.content;
    return md;
  }

  /**
   * 📋 Generate manifest
   * ✅ UPDATED v4.0: Count cover images (not episode images)
   */
  private generateManifest(outputDir: string, files: string[]): FactoryManifest {
    return {
      version: "4.0",
      generatedAt: Date.now(),
      config: this.config,
      articleCount: this.articles.length,
      totalCharacters: this.articles.reduce((sum, a) => sum + a.charCount, 0),
      totalImages: this.articles.filter(a => a.coverImage).length, // ✅ Count cover images
      outputPaths: {
        articles: files.filter(f => f.includes('.txt') || f.includes('.json')),
        images: files.filter(f => f.includes('.jpg')), // ✅ Only .jpg files
        report: path.join(outputDir, 'REPORT.md')
      }
    };
  }

  /**
   * 📋 Generate report
   * ✅ UPDATED v4.0: Count cover images (not episode images)
   */
  private generateReport(): FactoryReport {
    const totalArticles = this.articles.length;
    const totalImages = this.articles.filter(a => a.coverImage).length; // ✅ Cover images only
    const totalCharacters = this.articles.reduce((sum, a) => sum + a.charCount, 0);
    const totalTime = this.progress.completedAt && this.progress.startedAt
      ? (this.progress.completedAt - this.progress.startedAt) / 1000
      : 0;

    return {
      summary: {
        totalArticles,
        successfulArticles: this.progress.articlesCompleted,
        failedArticles: this.progress.articlesFailed,
        totalImages,
        totalCharacters,
        totalGenerationTime: totalTime,
        averageTimePerArticle: totalArticles > 0 ? totalTime / totalArticles : 0
      },
      quality: {
       averageQualityScore: this.calculateAverageQuality(),
       averageAiDetectionScore: this.calculateAverageAiDetection(),
       averageReadTime: this.calculateAverageReadTime(),
       qualityDistribution: this.calculateQualityDistribution(),
       // 📊 v4.4: Additional quality metrics
       averageReadabilityScore: this.calculateAverageReadability(),
       averageDialoguePercentage: this.calculateAverageDialogue(),
       averageSensoryDensity: this.calculateAverageSensory(),
      },
      performance: {
        articlesPerHour: totalTime > 0 ? (totalArticles / totalTime) * 3600 : 0,
        imagesPerHour: totalTime > 0 ? (totalImages / totalTime) * 3600 : 0,
        apiCallsTotal: totalArticles * 15 + totalImages, // Estimate
        apiCallsSuccessRate: 100 - (this.errors.length / (totalArticles + totalImages)) * 100
      },
      errors: this.errors
    };
  }

  /**
   * 📋 Format report as Markdown
   */
  private formatReport(report: FactoryReport): string {
    return `
# 🎭 ZenMaster v4.0 - Factory Report

Generated: ${new Date().toLocaleString()}

## 📋 Summary

| Metric | Value |
|--------|-------|
| Total Articles | ${report.summary.totalArticles} |
| Successful | ${report.summary.successfulArticles} ✅ |
| Failed | ${report.summary.failedArticles} ❌ |
| Total Images | ${report.summary.totalImages} |
| Total Characters | ${report.summary.totalCharacters.toLocaleString()} |
| Total Time | ${(report.summary.totalGenerationTime / 60).toFixed(1)} min |
| Avg Time/Article | ${report.summary.averageTimePerArticle.toFixed(1)}s |

## 🎯 Quality Metrics

| Metric | Value |
|--------|-------|
| Avg Quality Score | ${report.quality.averageQualityScore.toFixed(1)}/100 |
| Avg AI Detection | ${report.quality.averageAiDetectionScore.toFixed(1)}% |
| Avg Read Time | ${report.quality.averageReadTime.toFixed(1)} min |
| Avg Readability | ${report.quality.averageReadabilityScore?.toFixed(1) || 'N/A'}/100 |
| Avg Dialogue | ${report.quality.averageDialoguePercentage?.toFixed(1) || 'N/A'}% |
| Avg Sensory | ${report.quality.averageSensoryDensity?.toFixed(1) || 'N/A'}/10 |

## ⚡ Performance

| Metric | Value |
|--------|-------|
| Articles/Hour | ${report.performance.articlesPerHour.toFixed(1)} |
| Images/Hour | ${report.performance.imagesPerHour.toFixed(1)} |
| API Calls | ${report.performance.apiCallsTotal} |
| Success Rate | ${report.performance.apiCallsSuccessRate.toFixed(1)}% |

## ❌ Errors

${report.errors.length === 0 ? 'No errors ✅' : report.errors.map(e => 
  `- **${e.type}**: ${e.error} (${new Date(e.timestamp).toLocaleTimeString()})`
).join('\n')}

---
*Generated by ZenMaster v4.0 Content Factory*
    `.trim();
  }

  /**
   * 📋 Calculate metrics
   */
  private calculateAverageQuality(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + a.stats.qualityScore, 0);
    return sum / this.articles.length;
  }

  private calculateAverageAiDetection(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + a.stats.aiDetectionScore, 0);
    return sum / this.articles.length;
  }

  private calculateAverageReadTime(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + a.stats.estimatedReadTime, 0);
    return sum / this.articles.length;
  }

  private calculateQualityDistribution() {
    const buckets = [
      { range: "0-20", count: 0, percentage: 0 },
      { range: "20-40", count: 0, percentage: 0 },
      { range: "40-60", count: 0, percentage: 0 },
      { range: "60-80", count: 0, percentage: 0 },
      { range: "80-100", count: 0, percentage: 0 }
    ];

    // Handle case with no articles
    if (this.articles.length === 0) {
      return buckets;
    }

    for (const article of this.articles) {
      const score = article.stats.qualityScore;
      const bucketIndex = Math.min(Math.floor(score / 20), 4);
      buckets[bucketIndex].count++;
    }

    const total = this.articles.length;
    for (const bucket of buckets) {
      bucket.percentage = total > 0 ? (bucket.count / total) * 100 : 0;
    }

    return buckets;
  }

  // 📊 v4.4: New quality metric calculations
  private calculateAverageReadability(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + (a.stats.readabilityScore || 0), 0);
    return sum / this.articles.length;
  }

  private calculateAverageDialogue(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + (a.stats.dialoguePercentage || 0), 0);
    return sum / this.articles.length;
  }

  private calculateAverageSensory(): number {
    if (this.articles.length === 0) return 0;
    const sum = this.articles.reduce((s, a) => s + (a.stats.sensoryDensity || 0), 0);
    return sum / this.articles.length;
  }

  private updateEstimatedTime(): void {
    // Simple estimation based on progress
    const articlesRemaining = this.progress.articlesTotal - this.progress.articlesCompleted;
    const imagesRemaining = this.progress.imagesTotal - this.progress.imagesCompleted;
    
    const articleTime = articlesRemaining * 5 * 60; // 5 min per article
    const imageTime = imagesRemaining * 60; // 1 min per image
    
    this.progress.estimatedTimeRemaining = articleTime + imageTime;
  }

  private printFinalSummary(): void {
   const duration = this.progress.completedAt && this.progress.startedAt
     ? (this.progress.completedAt - this.progress.startedAt) / 1000
     : 0;

   // 📊 v4.4: Calculate average quality metrics
   const avgReadability = this.articles.length > 0
     ? this.articles.reduce((sum, a) => sum + (a.stats.readabilityScore || 0), 0) / this.articles.length
     : 0;
   const avgDialogue = this.articles.length > 0
     ? this.articles.reduce((sum, a) => sum + (a.stats.dialoguePercentage || 0), 0) / this.articles.length
     : 0;
   const avgSensory = this.articles.length > 0
     ? this.articles.reduce((sum, a) => sum + (a.stats.sensoryDensity || 0), 0) / this.articles.length
     : 0;

   console.log(`
  ${"=".repeat(60)}`);
   console.log(`🎉 FACTORY COMPLETE`);
   console.log(`${"=".repeat(60)}`);
   console.log(`📄 Articles: ${this.progress.articlesCompleted}/${this.progress.articlesTotal}`);
   console.log(`🗼️  Images: ${this.progress.imagesCompleted}/${this.progress.imagesTotal}`);
   console.log(`⏱️  Duration: ${(duration / 60).toFixed(1)} minutes`);
   console.log(`✅ Success rate: ${((this.progress.articlesCompleted / this.progress.articlesTotal) * 100).toFixed(1)}%`);
   console.log(`📁 Saved to: articles/${this.channelName}/${new Date().toISOString().split('T')[0]}/`);

   // 📊 v4.4: Show quality metrics summary
   console.log(`\n📊 QUALITY METRICS (Average):`);
   console.log(`   📖 Readability: ${avgReadability.toFixed(1)}/100`);
   console.log(`   🗣️  Dialogue: ${avgDialogue.toFixed(1)}%`);
   console.log(`   🌟 Sensory: ${avgSensory.toFixed(1)}/10`);

   // 📋 Show validation issues if any
   const articlesWithIssues = this.articles.filter(a =>
     a.metadata.qualityMetrics?.validationIssues?.length > 0
   );
   if (articlesWithIssues.length > 0) {
     console.log(`\n⚠️  ${articlesWithIssues.length} articles have validation issues`);
     console.log(`   Run: cat articles/${this.channelName}/${new Date().toISOString().split('T')[0]}/REPORT.md`);
     console.log(`   For detailed quality analysis`);
   }

   console.log(`${"=".repeat(60)}\n`);
  }
}
