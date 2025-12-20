/**
 * 🖼️ ZenMaster v4.0 SIMPLIFIED - Image Worker Pool
 * 
 * Manages serial COVER image generation (1 per article, not 12!)
 * Rate limiting: 1 per minute
 * 
 * ✅ UPDATED: Now generates ONE cover image per article
 */

import { ImageQueueManager } from './imageQueueManager';
import { PlotBibleBuilder } from './plotBibleBuilder';
import {
  CoverImageRequest,
  GeneratedImage,
  ImageQueueStatus
} from '../types/ImageGeneration';
import { Article } from '../types/ContentFactory';

export class ImageWorkerPool {
  private queueManager: ImageQueueManager;
  private rateLimit: number; // requests per minute

  constructor(apiKey?: string, rateLimit: number = 1) {
    this.queueManager = new ImageQueueManager(apiKey, { rateLimit });
    this.rateLimit = rateLimit;
  }

  /**
   * 📥 Enqueue ONE cover image for article
   * ✅ UPDATED v4.0: Generates single cover from title + lede, not 12 episode images!
   */
  enqueueArticle(article: Article, lede: string, priority: number = 0): void {
    console.log(`\n🖼️  Enqueuing COVER image for article: "${article.title}"`);

    // Build PlotBible from article theme
    const plotBible = PlotBibleBuilder.buildFromTheme({
      theme: article.metadata.theme,
      audience: article.metadata.targetAudience
    });

    // Create SINGLE cover image request
    const request: CoverImageRequest = {
      articleId: article.id,
      title: article.title,
      ledeText: lede, // First paragraph
      plotBible
    };

    this.queueManager.enqueue(request, priority);

    console.log(`✅ 1 cover image enqueued (not 12!)`);
  }

  /**
   * 📥 Enqueue cover images for multiple articles
   * ✅ UPDATED v4.0: 1 cover per article (not 12!)
   */
  enqueueArticles(articles: Article[], ledes: string[]): void {
    console.log(`\n🖼️  Enqueuing COVER images for ${articles.length} articles...`);

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const lede = ledes[i] || article.content.substring(0, 500); // Fallback to first 500 chars
      this.enqueueArticle(article, lede, 0);
    }

    const status = this.queueManager.getStatus();
    console.log(`✅ Total COVER images enqueued: ${status.pending} (1 per article!)`);
    console.log(`⏱️  Estimated time: ${status.estimatedTimeRemaining} minutes`);
  }

  /**
   * 🚀 Start processing queue
   */
  async start(): Promise<GeneratedImage[]> {
    return await this.queueManager.start();
  }

  /**
   * ⏸️ Pause processing
   */
  pause(): void {
    this.queueManager.pause();
  }

  /**
   * ▶️ Resume processing
   */
  resume(): void {
    this.queueManager.resume();
  }

  /**
   * 📊 Get queue status
   */
  getStatus(): ImageQueueStatus {
    return this.queueManager.getStatus();
  }

  /**
   * 📈 Get progress report
   */
  getProgressReport(): string {
    return this.queueManager.getProgressReport();
  }

  /**
   * 🔗 Attach generated COVER images back to articles
   * ✅ UPDATED v4.0: Attaches ONE cover image per article
   */
  attachCoverImagesToArticles(articles: Article[], images: GeneratedImage[]): void {
    console.log(`\n🔗 Attaching ${images.length} COVER images to ${articles.length} articles...`);

    // Simple 1:1 mapping - each article gets one cover image
    for (let i = 0; i < articles.length && i < images.length; i++) {
      const article = articles[i];
      const image = images[i];
      
      // Attach as cover image
      article.coverImage = image;
      
      console.log(`✅ Article "${article.title}": cover image attached`);
    }

    console.log(`\n✅ Cover image attachment complete (1 per article)`);
  }

  /**
   * 📊 Get statistics
   */
  getStatistics() {
    return this.queueManager.getStatistics();
  }

  /**
   * 🧹 Clear completed items (memory management)
   */
  clearCompleted(): void {
    this.queueManager.clearCompleted();
  }

  /**
   * 🔄 Retry failed items
   */
  retryFailed(): void {
    this.queueManager.retryFailed();
  }

  /**
   * ⏱️ Calculate processing time estimate
   * ✅ UPDATED v4.0: 1 cover per article (not 12 episode images!)
   */
  getEstimatedTime(articleCount: number): {
    totalImages: number;
    timeInMinutes: number;
    timeFormatted: string;
  } {
    const totalImages = articleCount; // ✅ 1 cover per article!
    const timeInMinutes = totalImages * (60 / this.rateLimit);
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = Math.ceil(timeInMinutes % 60);

    return {
      totalImages,
      timeInMinutes,
      timeFormatted: hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m`
    };
  }

  /**
   * 📋 Print processing plan
   * ✅ UPDATED v4.0: Shows 1 cover per article (not 12!)
   */
  printProcessingPlan(articleCount: number): void {
    const estimate = this.getEstimatedTime(articleCount);

    console.log(`
╔════════════════════════════════════════════════════════════
║ 🖼️  COVER IMAGE PROCESSING PLAN
╠════════════════════════════════════════════════════════════
║ Articles:        ${articleCount}
║ Covers/article:  1 (simplified v4.0!)
║ Total covers:    ${estimate.totalImages}
║ Rate limit:      ${this.rateLimit} cover/minute
║ Estimated time:  ${estimate.timeFormatted}
║ 
║ ✅ SIMPLIFIED: One cover per article from title + lede
║                (not 12 episode images!)
║ 
║ ⚠️  NOTE: Covers will be generated SERIALLY (one at a time)
║           to respect API rate limits.
║           This process will run in background after articles
║           are generated.
╚════════════════════════════════════════════════════════════
    `);
  }
}
