/**
 * 🏭 ZenMaster v4.0 - Content Factory Orchestrator
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
import { ArticleWorkerPool } from './articleWorkerPool';
import { ImageWorkerPool } from './imageWorkerPool';
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

    console.log(`\n╔${'═'.repeat(58)}╗`);
    console.log(`║ 🏭 ZenMaster v4.0 - Content Factory`);
    console.log(`╠${'═'.repeat(58)}╣`);
    console.log(`║ 📄 Articles:          ${config.articleCount}`);
    console.log(`║ ⚙️  Parallel workers:  ${config.parallelEpisodes}`);
    console.log(`║ 🖼️  Images:            ${config.includeImages ? 'Yes (1/min)' : 'No'}`);
    console.log(`║ 🎯 Quality level:     ${config.qualityLevel}`);
    console.log(`║ 📤 Output format:     ${config.outputFormat}`);
    console.log(`║ 🛡️  Anti-detection:   ${config.enableAntiDetection ? 'Yes' : 'No'}`);
    console.log(`║ 📖 PlotBible:         ${config.enablePlotBible ? 'Yes' : 'No'}`);
    console.log(`║ 📁 Channel:           ${this.channelName}`);
    console.log(`╚${'═'.repeat(58)}╝\n`);

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

    console.log(`✅ Factory initialized and ready to start\n`);
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
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 STAGE 1: Article Generation (${this.config.articleCount} articles)`);
      console.log(`${'='.repeat(60)}\n`);

      this.articles = await this.generateArticles();

      console.log(`\n✅ Stage 1 complete: ${this.articles.length} articles generated\n`);

      // Stage 2: Generate COVER images (serial, 1 per article!)
      if (this.config.includeImages && this.articles.length > 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🖼️  STAGE 2: COVER Image Generation (${this.articles.length} covers, not ${this.articles.length * 12}!)`);
        console.log(`${'='.repeat(60)}\n`);

        await this.generateCoverImages();

        console.log(`\n✅ Stage 2 complete: Cover images generated and attached (1 per article)\n`);
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

      console.error(`\n❌ Factory failed: ${(error as Error).message}\n`);
      throw error;
    }
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
    }

    return articles;
  }

  /**
   * 🖼️ Generate COVER images using image worker pool
   * ✅ UPDATED v4.0: Generates ONE cover per article (not 12!)
   */
  private async generateCoverImages(): Promise<void> {
    // Extract ledes (first paragraphs) from articles
    const ledes = this.articles.map(article => {
      // Get lede from article (first paragraph after splitting by double newline)
      const paragraphs = article.content.split('\n\n');
      return paragraphs[0] || article.content.substring(0, 500);
    });

    // Enqueue all articles with their ledes
    this.imageWorkerPool.enqueueArticles(this.articles, ledes);

    // Start processing (serial, 1 per minute)
    const coverImages = await this.imageWorkerPool.start();

    // Attach COVER images to articles (1:1 mapping)
    this.imageWorkerPool.attachCoverImagesToArticles(this.articles, coverImages);

    // Update progress
    this.progress.imagesCompleted = coverImages.length;
    this.progress.imagesFailed = this.progress.imagesTotal - coverImages.length;
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
   * 📤 Export articles for Zen
   * ✅ UPDATED v4.0: Save to articles/{channel_name}/{YYYY-MM-DD}/ with flat structure
   * - ONE .txt file (article content)
   * - ONE .png file (cover image)
   * - Same filename for both (only extension differs)
   */
  async exportForZen(outputDir: string = './articles'): Promise<string> {
    console.log(`\n📤 Exporting ${this.articles.length} articles\n`);

    // Create articles/{channel_name}/{YYYY-MM-DD}/ directory
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalDir = path.join(outputDir, this.channelName, dateStr);
    fs.mkdirSync(finalDir, { recursive: true });

    console.log(`📁 Output folder: ${finalDir}\n`);

    const exportedFiles: string[] = [];

    // Export each article with FLAT structure (no article-1/, article-2/ folders)
    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];
      const timestamp = Date.now() + i; // Unique timestamp per article
      const slug = this.createSlug(article.title); // Convert title to URL-safe slug
      
      // Same filename for both .txt and .png!
      const filename = `${slug}-${timestamp}`;
      
      try {
        // Save article as TEXT (for copy-paste to Zen)
        const txtPath = path.join(finalDir, `${filename}.txt`);
        fs.writeFileSync(txtPath, article.content);
        exportedFiles.push(txtPath);
        console.log(`✅ Article ${i + 1}: ${filename}.txt`);

        // Save COVER image (ONE per article!)
        if (article.coverImage) {
          const pngPath = path.join(finalDir, `${filename}.png`);
          
          // Extract base64 from data URL
          const base64Data = article.coverImage.base64
            .replace(/^data:image\/\w+;base64,/, '')
            .replace(/^data:image\/\w+;base64,/, '');
          
          fs.writeFileSync(pngPath, Buffer.from(base64Data, 'base64'));
          exportedFiles.push(pngPath);
          console.log(`   🖼️  Cover: ${filename}.png`);
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

    console.log(`\n✅ Export complete:`);
    console.log(`   📄 Articles: ${this.articles.length}`);
    console.log(`   🖼️  Cover images: ${this.articles.filter(a => a.coverImage).length} (1 per article)`);
    console.log(`   📋 Manifest: ${manifestPath}`);
    console.log(`   📊 Report: ${reportPath}\n`);

    return finalDir;
  }

  /**
   * 🔤 Create URL-safe slug from Russian text
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
    let md = `# ${article.title}\n\n`;
    md += `**Generated:** ${new Date(article.metadata.generatedAt).toLocaleString()}\n`;
    md += `**Theme:** ${article.metadata.theme}\n`;
    md += `**Characters:** ${article.charCount.toLocaleString()}\n`;
    md += `**Read time:** ${article.stats.estimatedReadTime} min\n\n`;
    md += `---\n\n`;
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
        images: files.filter(f => f.includes('.png')),
        report: path.join(outputDir, 'REPORT.md')
      }
    };
  }

  /**
   * 📊 Generate report
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
        qualityDistribution: this.calculateQualityDistribution()
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
   * 📊 Format report as Markdown
   */
  private formatReport(report: FactoryReport): string {
    return `
# 🏭 ZenMaster v4.0 - Factory Report

Generated: ${new Date().toLocaleString()}

## 📊 Summary

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
   * 📈 Calculate metrics
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

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 FACTORY COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📄 Articles: ${this.progress.articlesCompleted}/${this.progress.articlesTotal}`);
    console.log(`🖼️  Images: ${this.progress.imagesCompleted}/${this.progress.imagesTotal}`);
    console.log(`⏱️  Duration: ${(duration / 60).toFixed(1)} minutes`);
    console.log(`✅ Success rate: ${((this.progress.articlesCompleted / this.progress.articlesTotal) * 100).toFixed(1)}%`);
    console.log(`📁 Saved to: articles/${this.channelName}/${new Date().toISOString().split('T')[0]}/`);
    console.log(`${'='.repeat(60)}\n`);
  }
}
