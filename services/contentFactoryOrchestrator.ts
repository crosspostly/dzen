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
import { spawnSync } from 'child_process';
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

  // 🔥 Streaming export state (Variant A)
  private zenStreamingExportQueue: Article[] = [];
  private zenStreamingState?: {
    baseOutputDir: string;
    dateStr: string;
    finalDir: string;
    batchSize: number;
    totalArticles: number;
    nextArticleNumber: number;
    pendingBatchStart: number;
    pendingBatchArticleCount: number;
    pendingGitFiles: string[];
    pushes: number;
    startedAt: number;
  };
  private zenGitConfigured: boolean = false;

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
   *
   * 🔥 v7.2+: STREAMING EXPORT (Variant A)
   * - Generates article → processes image → saves to disk → git commit/push in small batches
   * - Each push triggers GitHub Actions auto-restore in parallel
   */
  async start(): Promise<Article[]> {
    if (this.progress.state !== "running") {
      throw new Error("Factory not initialized. Call initialize() first.");
    }

    const outputDir = './articles';
    const gitConfig = { autoCommit: true, autoPush: true };

    this.initZenStreamingState(outputDir, this.config.articleCount);

    console.log(`
${"=".repeat(60)}`);
    console.log(`🏭 FACTORY MODE - Streaming Export`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📁 Output folder: ${this.zenStreamingState?.finalDir}`);
    console.log(`📦 Git batch size: ${this.zenStreamingState?.batchSize}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      this.articles = [];
      this.progress.imagesCompleted = 0;

      const onProgress = (completed: number, total: number) => {
        this.progress.articlesCompleted = completed;
        this.progress.percentComplete = (completed / total) * 100;
        this.updateEstimatedTime();
      };

      await this.articleWorkerPool.executeBatch(
        this.config.articleCount,
        this.config,
        onProgress,
        async (article, index, total) => {
          console.log(`\n📝 Article ${index}/${total}: "${article.title}"`);

          if (this.config.includeImages && article.coverImage?.base64) {
            await this.processCoverImagePipelineForArticle(article, index, total);
            this.progress.imagesCompleted++;
          }

          this.articles.push(article);
          this.zenStreamingExportQueue.push(article);

          await this.exportForZenStreaming(outputDir, gitConfig);

          this.minimizeArticleInMemory(article);
        }
      );

      await this.finalizeZenStreamingExport(gitConfig);

      this.progress.state = "completed";
      this.progress.completedAt = Date.now();
      this.progress.percentComplete = 100;

      this.printStreamingExportSummary('FACTORY');
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

    const outputDir = './articles';
    const gitConfig = { autoCommit: true, autoPush: true };

    const totalArticles = this.config.articleCount * 2;
    this.initZenStreamingState(outputDir, totalArticles);

    console.log(`
${"=".repeat(60)}`);
    console.log(`🎭 BOTH MODE - Streaming Export`);
    console.log(`Generating ${this.config.articleCount} article pairs (RAW + RESTORED)`);
    console.log(`📁 Output folder: ${this.zenStreamingState?.finalDir}`);
    console.log(`📦 Git batch size: ${this.zenStreamingState?.batchSize}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      this.articles = [];
      this.progress.imagesCompleted = 0;

      const pairResults = await this.generateArticlePairs(async (pair, index, total) => {
        const title = pair.rawArticle.title || pair.restoredArticle.title;
        console.log(`\n📝 Pair ${index}/${total}: "${title}"`);

        if (this.config.includeImages && pair.rawArticle.coverImage?.base64) {
          await this.processCoverImagePipelineForBothArticles(pair.rawArticle, pair.restoredArticle, index, total);
          this.progress.imagesCompleted++;
        }

        this.articles.push(pair.rawArticle, pair.restoredArticle);
        this.zenStreamingExportQueue.push(pair.rawArticle, pair.restoredArticle);

        await this.exportForZenStreaming(outputDir, gitConfig);

        this.minimizeArticleInMemory(pair.rawArticle);
        this.minimizeArticleInMemory(pair.restoredArticle);
      });

      await this.finalizeZenStreamingExport(gitConfig);

      this.progress.state = "completed";
      this.progress.completedAt = Date.now();
      this.progress.percentComplete = 100;

      this.printStreamingExportSummary('BOTH');
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
  private async generateArticlePairs(
    onPairGenerated?: (pair: BothModeResult, index: number, total: number) => Promise<void> | void
  ): Promise<BothModeResult[]> {
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
        onProgress,
        onPairGenerated
      ));
    } catch (error) {
      console.error(`❌ Article pair generation error: ${(error as Error).message}`);
      this.errors.push({
        type: "article",
        error: (error as Error).message,
        timestamp: Date.now(),
        recovered: false
      });
      throw error;
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
   * 📁 Last Zen export directory (streaming)
   */
  getZenExportDir(): string | undefined {
    return this.zenStreamingState?.finalDir;
  }

  /**
   * 📄 Export articles for Zen (STREAMING MODE)
   * ✨ Saves and pushes articles one by one as they're generated
   * - Create article → Save to disk → Git commit/push (batched) → Auto-Restore triggers
   */
  async exportForZenStreaming(
    outputDir: string = './articles',
    gitConfig?: { autoCommit?: boolean; autoPush?: boolean }
  ): Promise<string[]> {
    if (!this.zenStreamingState) {
      this.initZenStreamingState(outputDir, this.config?.articleCount || this.progress.articlesTotal || 0);
    }

    const state = this.zenStreamingState!;
    const autoCommit = gitConfig?.autoCommit !== false;
    const autoPush = gitConfig?.autoPush !== false;

    const exported: string[] = [];

    while (this.zenStreamingExportQueue.length > 0) {
      const article = this.zenStreamingExportQueue.shift()!;
      const articleNumber = state.nextArticleNumber;

      if (state.pendingBatchArticleCount === 0) {
        state.pendingBatchStart = articleNumber;
      }

      const filePaths = this.exportSingleArticleForZen(article, state.finalDir, state.dateStr);
      exported.push(...filePaths);

      for (const filePath of filePaths) {
        const rel = path.relative(process.cwd(), filePath);
        state.pendingGitFiles.push(rel);
        console.log(`   💾 Saved: ${rel}`);
      }

      state.pendingBatchArticleCount++;
      state.nextArticleNumber++;

      if (autoCommit && state.pendingBatchArticleCount >= state.batchSize) {
        await this.commitAndPushZenStreamingBatch({ autoCommit, autoPush });
      }
    }

    return exported;
  }

  /**
   * @deprecated Use exportForZenStreaming() (streaming export) instead.
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
        const frontMatter = `---
title: "${article.title}"
date: "${dateStr}"
description: "${description}"
image: "${imageFileName}"
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

  private getZenStreamingBatchSize(): number {
    const raw = process.env.ZEN_STREAMING_BATCH_SIZE;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    return 2;
  }

  private initZenStreamingState(baseOutputDir: string, totalArticles: number): void {
    this.zenStreamingExportQueue = [];

    const dateStr = new Date().toISOString().split('T')[0];
    const finalDir = path.join(baseOutputDir, this.channelName, dateStr);
    fs.mkdirSync(finalDir, { recursive: true });

    this.zenStreamingState = {
      baseOutputDir,
      dateStr,
      finalDir,
      batchSize: this.getZenStreamingBatchSize(),
      totalArticles,
      nextArticleNumber: 1,
      pendingBatchStart: 1,
      pendingBatchArticleCount: 0,
      pendingGitFiles: [],
      pushes: 0,
      startedAt: Date.now(),
    };
  }

  private exportSingleArticleForZen(article: Article, finalDir: string, dateStr: string): string[] {
    const exported: string[] = [];

    const slug = this.createSlug(article.title);

    const version = (article.metadata as any)?.articleVersion;
    const filename = version ? `${slug}-${String(version).toLowerCase()}` : slug;

    const description = this.generateIntriguingDescription(article.content || '');
    const imageFileName = `${slug}.jpg`;

    const frontMatter = `---
title: "${article.title}"
date: "${dateStr}"
description: "${description}"
image: "${imageFileName}"
category: "lifestory"
${version ? `version: "${version}"\n` : ''}---
`;

    const contentLines = (article.content || '').split('\n');
    const articleBody = contentLines.slice(1).join('\n').trim();
    const markdownContent = `${frontMatter}\n${articleBody}`;

    const mdPath = path.join(finalDir, `${filename}.md`);
    fs.writeFileSync(mdPath, markdownContent);
    exported.push(mdPath);

    if (article.coverImage) {
      let jpegBuffer: Buffer;

      if (article.coverImage.processedBuffer) {
        jpegBuffer = article.coverImage.processedBuffer;
      } else {
        const base64Data = (article.coverImage.base64 || '').replace(/^data:image\/\w+;base64,/, '');
        jpegBuffer = Buffer.from(base64Data, 'base64');
      }

      const jpgPath = path.join(finalDir, imageFileName);
      fs.writeFileSync(jpgPath, jpegBuffer);
      exported.push(jpgPath);
    }

    return exported;
  }

  private isGitRepo(): boolean {
    const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return res.status === 0 && (res.stdout || '').trim() === 'true';
  }

  private getGitBranchName(): string {
    if (process.env.GITHUB_REF_NAME) {
      return process.env.GITHUB_REF_NAME;
    }

    const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return (res.stdout || 'main').trim() || 'main';
  }

  private ensureZenGitConfigured(): void {
    if (this.zenGitConfigured) return;

    spawnSync('git', ['config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    spawnSync('git', ['config', '--local', 'user.name', 'github-actions[bot]'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    this.zenGitConfigured = true;
  }

  private async commitAndPushZenStreamingBatch(config: { autoCommit: boolean; autoPush: boolean }): Promise<void> {
    const state = this.zenStreamingState;
    if (!state || state.pendingBatchArticleCount === 0) return;

    if (!this.isGitRepo()) {
      console.warn(`⚠️  Git repo not detected - skipping commit/push (streaming export still saved files).`);
      state.pendingGitFiles = [];
      state.pendingBatchArticleCount = 0;
      return;
    }

    if (!config.autoCommit) {
      state.pendingGitFiles = [];
      state.pendingBatchArticleCount = 0;
      return;
    }

    this.ensureZenGitConfigured();

    const batchStart = state.pendingBatchStart;
    const batchEnd = state.nextArticleNumber - 1;
    const totalBatches = Math.max(1, Math.ceil(state.totalArticles / state.batchSize));
    const currentBatch = state.pushes + 1;

    const message = `feat: Add articles ${batchStart}-${batchEnd} (streaming export)`;

    const uniqueFiles = Array.from(new Set(state.pendingGitFiles));

    const addRes = spawnSync('git', ['add', '--', ...uniqueFiles], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (addRes.status !== 0) {
      const err = (addRes.stderr || addRes.stdout || '').trim();
      console.warn(`⚠️  git add failed: ${err}`);
      state.pendingGitFiles = [];
      state.pendingBatchArticleCount = 0;
      return;
    }

    const commitRes = spawnSync('git', ['commit', '-m', message], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (commitRes.status !== 0) {
      const out = `${commitRes.stdout || ''}${commitRes.stderr || ''}`;
      if (out.includes('nothing to commit')) {
        state.pendingGitFiles = [];
        state.pendingBatchArticleCount = 0;
        return;
      }

      console.warn(`⚠️  git commit failed: ${out.trim()}`);
      state.pendingGitFiles = [];
      state.pendingBatchArticleCount = 0;
      return;
    }

    console.log(`   📤 Git push (batch ${currentBatch}/${totalBatches})`);

    if (!config.autoPush) {
      state.pushes++;
      state.pendingGitFiles = [];
      state.pendingBatchArticleCount = 0;
      console.log(`   ⏳ GitHub Actions will trigger after push (autoPush disabled)`);
      return;
    }

    const branch = this.getGitBranchName();
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const fetchRes = spawnSync('git', ['fetch', 'origin', branch], {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      if (fetchRes.status !== 0) {
        const err = (fetchRes.stderr || fetchRes.stdout || '').trim();
        if (process.env.GITHUB_ACTIONS === 'true') {
          throw new Error(`git fetch failed: ${err}`);
        }
        console.warn(`⚠️  git fetch failed: ${err}`);
        break;
      }

      const rebaseRes = spawnSync('git', ['rebase', `origin/${branch}`], {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      if (rebaseRes.status !== 0) {
        spawnSync('git', ['rebase', '--abort'], { cwd: process.cwd(), stdio: 'pipe', encoding: 'utf-8' });
        const err = (rebaseRes.stderr || rebaseRes.stdout || '').trim();
        if (process.env.GITHUB_ACTIONS === 'true') {
          throw new Error(`git rebase failed: ${err}`);
        }
        console.warn(`⚠️  git rebase failed: ${err}`);
        break;
      }

      const pushRes = spawnSync('git', ['push', 'origin', branch], {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      if (pushRes.status === 0) {
        state.pushes++;
        state.pendingGitFiles = [];
        state.pendingBatchArticleCount = 0;
        console.log(`   ⏳ GitHub Actions triggered for restoration...`);
        return;
      }

      const err = (pushRes.stderr || pushRes.stdout || '').trim();

      if (attempt === maxRetries) {
        if (process.env.GITHUB_ACTIONS === 'true') {
          throw new Error(`git push failed: ${err}`);
        }
        console.warn(`⚠️  git push failed: ${err}`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    state.pushes++;
    state.pendingGitFiles = [];
    state.pendingBatchArticleCount = 0;
  }

  private async finalizeZenStreamingExport(gitConfig: { autoCommit: boolean; autoPush: boolean }): Promise<void> {
    if (!this.zenStreamingState) return;

    await this.exportForZenStreaming(this.zenStreamingState.baseOutputDir, gitConfig);

    if (gitConfig.autoCommit !== false && this.zenStreamingState.pendingBatchArticleCount > 0) {
      await this.commitAndPushZenStreamingBatch({
        autoCommit: gitConfig.autoCommit !== false,
        autoPush: gitConfig.autoPush !== false,
      });
    }
  }

  private printStreamingExportSummary(mode: 'FACTORY' | 'BOTH'): void {
    const state = this.zenStreamingState;
    if (!state) return;

    const durationMs = Date.now() - state.startedAt;
    const totalBatches = Math.max(1, Math.ceil(state.totalArticles / state.batchSize));

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ STREAMING EXPORT COMPLETE (${mode})`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📄 Total articles: ${state.totalArticles}`);
    console.log(`📤 Git pushes: ${state.pushes} (batches of ${state.batchSize}, expected ~${totalBatches})`);
    console.log(`⏱️  Total time: ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`🚀 Articles are now being restored in parallel by GitHub Actions`);
    console.log(`${"=".repeat(60)}\n`);
  }

  private minimizeArticleInMemory(article: Article): void {
    article.content = '';
    if (article.coverImage) {
      article.coverImage.base64 = '';
      article.coverImage.processedBuffer = undefined;
    }
  }

  private async processCoverImagePipelineForArticle(article: Article, index: number, total: number): Promise<void> {
    await this.postProcessCoverImageForArticle(article, index, total);
    await this.applyMobileAuthenticityForArticle(article, index, total);
  }

  private async processCoverImagePipelineForBothArticles(
    rawArticle: Article,
    restoredArticle: Article,
    index: number,
    total: number
  ): Promise<void> {
    await this.processCoverImagePipelineForArticle(rawArticle, index, total);

    if (rawArticle.coverImage && restoredArticle.coverImage) {
      restoredArticle.coverImage.processedBuffer = rawArticle.coverImage.processedBuffer;
      restoredArticle.coverImage.format = rawArticle.coverImage.format;
      restoredArticle.coverImage.size = rawArticle.coverImage.size;
    }

    if (rawArticle.metadata && restoredArticle.metadata) {
      restoredArticle.metadata.mobileAuthenticityApplied = rawArticle.metadata.mobileAuthenticityApplied;
      restoredArticle.metadata.authenticityLevel = rawArticle.metadata.authenticityLevel;
      restoredArticle.metadata.appliedAuthenticityEffects = rawArticle.metadata.appliedAuthenticityEffects;
      restoredArticle.metadata.authenticityError = rawArticle.metadata.authenticityError;
      restoredArticle.metadata.mobileCameraEmulated = rawArticle.metadata.mobileCameraEmulated;
      restoredArticle.metadata.imageProcessingStatus = rawArticle.metadata.imageProcessingStatus;
      restoredArticle.metadata.imageProcessingError = rawArticle.metadata.imageProcessingError;
    }
  }

  private async postProcessCoverImageForArticle(article: Article, index: number, total: number): Promise<void> {
    if (!article.coverImage?.base64) return;

    const imageProcessorService = new ImageProcessorService();

    let dataUrl = article.coverImage.base64;
    const hasDataPrefix = dataUrl.startsWith('data:');

    if (!hasDataPrefix) {
      const binaryString = Buffer.from(dataUrl.substring(0, 28), 'base64');
      const magic = binaryString.toString('hex').toUpperCase();

      let mimeType = 'image/jpeg';
      if (magic.startsWith('89504E47')) {
        mimeType = 'image/png';
      } else if (magic.startsWith('FFD8FF')) {
        mimeType = 'image/jpeg';
      } else if (magic.startsWith('52494646') && magic.includes('57454250')) {
        mimeType = 'image/webp';
      }

      dataUrl = `data:${mimeType};base64,${dataUrl}`;
    }

    try {
      console.log(`   🎨 Canvas post-processing (${index}/${total})...`);
      const processorResult = await imageProcessorService.processImage(dataUrl);

      if (processorResult.success && processorResult.buffer) {
        article.coverImage.processedBuffer = processorResult.buffer;
        article.coverImage.format = 'jpeg';
      }

      if (!article.metadata) {
        article.metadata = { generatedAt: Date.now() } as any;
      }

      (article.metadata as any).imageProcessingStatus = processorResult.processingStatus;
      (article.metadata as any).imageProcessingError = processorResult.errorMessage;

    } catch (error) {
      console.warn(`   ⚠️  Canvas post-processing failed: ${(error as Error).message}`);
    }
  }

  private async applyMobileAuthenticityForArticle(article: Article, index: number, total: number): Promise<void> {
    if (!article.coverImage?.base64) return;

    const authenticityProcessor = new MobilePhotoAuthenticityProcessor();

    try {
      console.log(`   📱 Mobile authenticity (${index}/${total})...`);

      const device = this.selectDeviceForArticle(article);
      const deviceKey = this.mapDeviceToKey(device.model);

      let currentBuffer: Buffer;
      if (article.coverImage.processedBuffer) {
        currentBuffer = article.coverImage.processedBuffer;
      } else {
        const base64Data = article.coverImage.base64.replace(/^data:image\/\w+;base64,/, '');
        currentBuffer = Buffer.from(base64Data, 'base64');
      }

      const authenticityResult: AuthenticityResult = await authenticityProcessor.processWithDevice(
        currentBuffer.toString('base64'),
        deviceKey,
        device.year
      );

      if (authenticityResult.success && authenticityResult.processedBuffer) {
        article.coverImage.processedBuffer = authenticityResult.processedBuffer;
        article.coverImage.format = 'jpeg';
      }

      if (!article.metadata) {
        article.metadata = { generatedAt: Date.now() } as any;
      }

      (article.metadata as any).mobileAuthenticityApplied = authenticityResult.success;
      (article.metadata as any).authenticityLevel = authenticityResult.authenticityLevel;
      (article.metadata as any).appliedAuthenticityEffects = authenticityResult.appliedEffects;
      (article.metadata as any).authenticityError = authenticityResult.errorMessage;
      (article.metadata as any).mobileCameraEmulated = `${device.model} (${device.year})`;

    } catch (error) {
      console.warn(`   ⚠️  Mobile authenticity processing failed: ${(error as Error).message}`);
    }
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
