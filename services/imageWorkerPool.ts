/**
 * 🖼️ ZenMaster v4.0 - Image Worker Pool
 * 
 * Manages serial image generation with strict rate limiting (1 per minute)
 * Integrates with ArticleWorkerPool for complete article+image production
 */

import { ImageQueueManager } from './imageQueueManager';
import { PlotBibleBuilder } from './plotBibleBuilder';
import {
  ImageGenerationRequest,
  GeneratedImage,
  ImageQueueStatus
} from '../types/ImageGeneration';
import { Article, ArticleEpisode } from '../types/ContentFactory';

export class ImageWorkerPool {
  private queueManager: ImageQueueManager;
  private rateLimit: number; // requests per minute

  constructor(apiKey?: string, rateLimit: number = 1) {
    this.queueManager = new ImageQueueManager(apiKey, { rateLimit });
    this.rateLimit = rateLimit;
  }

  /**
   * 📥 Enqueue images for all episodes in article
   */
  enqueueArticle(article: Article, priority: number = 0): void {
    console.log(`\n🖼️  Enqueuing images for article: "${article.title}"`);
    console.log(`📊 Episodes: ${article.episodes.length}`);

    // Build PlotBible from article theme
    const plotBible = PlotBibleBuilder.buildFromTheme({
      theme: article.metadata.theme,
      audience: article.metadata.targetAudience
    });

    // Enqueue each episode
    for (const episode of article.episodes) {
      const request: ImageGenerationRequest = {
        episodeId: episode.episodeNumber,
        episodeText: episode.content,
        plotBible,
        sceneDescription: episode.sceneDescription,
        emotion: episode.emotion
      };

      this.queueManager.enqueue(request, priority);
    }

    console.log(`✅ ${article.episodes.length} images enqueued`);
  }

  /**
   * 📥 Enqueue images for multiple articles
   */
  enqueueArticles(articles: Article[]): void {
    console.log(`\n🖼️  Enqueuing images for ${articles.length} articles...`);

    for (const article of articles) {
      this.enqueueArticle(article, 0);
    }

    const status = this.queueManager.getStatus();
    console.log(`✅ Total images enqueued: ${status.pending}`);
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
   * 🔗 Attach generated images back to articles
   * Call this after queue processing is complete
   */
  attachImagesToArticles(articles: Article[], images: GeneratedImage[]): void {
    console.log(`\n🔗 Attaching ${images.length} images to ${articles.length} articles...`);

    // Group images by article (assuming episodeId maps to article)
    const imagesPerArticle = Math.floor(images.length / articles.length);

    let imageIndex = 0;
    for (const article of articles) {
      article.images = [];

      for (let i = 0; i < article.episodes.length && imageIndex < images.length; i++) {
        const image = images[imageIndex];
        
        // Attach to article
        article.images.push(image);
        
        // Attach to specific episode
        const episode = article.episodes[i];
        if (episode) {
          episode.image = image;
        }

        imageIndex++;
      }

      console.log(`✅ Article "${article.title}": ${article.images.length} images attached`);
    }

    console.log(`\n✅ Image attachment complete`);
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
   */
  getEstimatedTime(articleCount: number, episodesPerArticle: number = 12): {
    totalImages: number;
    timeInMinutes: number;
    timeFormatted: string;
  } {
    const totalImages = articleCount * episodesPerArticle;
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
   */
  printProcessingPlan(articleCount: number): void {
    const estimate = this.getEstimatedTime(articleCount);

    console.log(`
╔════════════════════════════════════════════════════════════
║ 🖼️  IMAGE PROCESSING PLAN
╠════════════════════════════════════════════════════════════
║ Articles:        ${articleCount}
║ Episodes/article: 12
║ Total images:    ${estimate.totalImages}
║ Rate limit:      ${this.rateLimit} image/minute
║ Estimated time:  ${estimate.timeFormatted}
║ 
║ ⚠️  NOTE: Images will be generated SERIALLY (one at a time)
║           to respect API rate limits.
║           This process will run in background after articles
║           are generated.
╚════════════════════════════════════════════════════════════
    `);
  }
}
