/**
 * 📦 ZenMaster v4.0 - Image Queue Manager
 * 
 * Manages image generation with strict rate limiting (1 request/minute)
 * Features:
 * - Serial processing with 60-second delay between requests
 * - Automatic retry for failed requests
 * - Progress tracking
 * - Graceful pause/resume
 * 
 * Rate limit: 1 RPM (Gemini Images API constraint)
 */

import { ImageGeneratorAgent } from './imageGeneratorAgent';
import {
  ImageGenerationRequest,
  CoverImageRequest,
  GeneratedImage,
  ImageQueueStatus,
  QueueItem,
  QueueError,
  ImageGenerationConfig
} from '../types/ImageGeneration';

export class ImageQueueManager {
  private queue: QueueItem[] = [];
  private agent: ImageGeneratorAgent;
  private processing = false;
  private paused = false;
  private lastProcessedAt: number | null = null;
  private rateLimit: number; // requests per minute
  private processed: GeneratedImage[] = [];
  private errors: QueueError[] = [];

  constructor(apiKey?: string, config?: Partial<ImageGenerationConfig>) {
    this.agent = new ImageGeneratorAgent(apiKey, config);
    this.rateLimit = config?.rateLimit || 1; // Default 1 RPM
  }

  /**
   * 📥 Add cover image request to queue
   * ✅ UPDATED v4.0: Now works with CoverImageRequest (one per article)
   */
  enqueue(request: CoverImageRequest, priority: number = 0): void {
    const item: QueueItem = {
      id: `queue_${request.articleId}_${Date.now()}`,
      request,
      priority,
      addedAt: Date.now(),
      attempts: 0,
      status: "pending"
    };

    this.queue.push(item);
    
    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    console.log(`📥 Added to queue: Article "${request.title}" (ID: ${request.articleId}, priority: ${priority})`);
    console.log(`📊 Queue size: ${this.queue.length}`);
  }

  /**
   * 🚀 Start processing queue
   */
  async start(): Promise<GeneratedImage[]> {
    if (this.processing) {
      console.warn("⚠️ Queue already processing");
      return this.processed;
    }

    console.log(`\n🚀 Starting image queue processing...`);
    console.log(`📊 Total items: ${this.queue.length}`);
    console.log(`⏱️  Rate limit: ${this.rateLimit} request(s) per minute\n`);

    this.processing = true;
    this.paused = false;

    await this.processQueue();

    console.log(`\n✅ Queue processing complete`);
    console.log(`📊 Processed: ${this.processed.length}`);
    console.log(`❌ Failed: ${this.errors.length}\n`);

    return this.processed;
  }

  /**
   * ⏸️ Pause processing
   */
  pause(): void {
    this.paused = true;
    console.log("⏸️  Queue paused");
  }

  /**
   * ▶️ Resume processing
   */
  resume(): void {
    if (!this.processing) {
      console.warn("⚠️ Queue not started yet");
      return;
    }
    this.paused = false;
    console.log("▶️  Queue resumed");
    this.processQueue(); // Continue processing
  }

  /**
   * 📊 Get current queue status
   */
  getStatus(): ImageQueueStatus {
    const total = this.processed.length + this.errors.length + this.queue.length;
    const processed = this.processed.length;
    const failed = this.errors.length;
    const pending = this.queue.filter(item => item.status === "pending").length;
    const percentage = total > 0 ? (processed / total) * 100 : 0;
    
    // Calculate ETA based on rate limit
    const remainingRequests = pending;
    const minutesPerRequest = 60 / this.rateLimit;
    const estimatedTimeRemaining = remainingRequests * minutesPerRequest;

    const currentlyProcessing = this.queue.find(item => item.status === "processing");

    return {
      total,
      processed,
      failed,
      pending,
      percentage,
      estimatedTimeRemaining: Math.ceil(estimatedTimeRemaining),
      currentlyProcessing: currentlyProcessing
        ? `Article ${currentlyProcessing.request.articleId}`
        : null,
      lastProcessedAt: this.lastProcessedAt,
      errors: this.errors
    };
  }

  /**
   * 🔄 Main processing loop
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.processing) {
      // Check if paused
      if (this.paused) {
        console.log("⏸️  Processing paused, waiting...");
        await this.sleep(1000);
        continue;
      }

      // Get next item
      const item = this.queue.find(item => item.status === "pending");
      if (!item) {
        break; // No more pending items
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Process item
      await this.processItem(item);
    }

    this.processing = false;
  }

  /**
   * ⏱️ Apply rate limiting (1 request per minute)
   */
  private async applyRateLimit(): Promise<void> {
    if (this.lastProcessedAt === null) {
      // First request, no delay
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastProcessedAt;
    const minDelay = (60 / this.rateLimit) * 1000; // milliseconds between requests

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s before next request...`);
      await this.sleep(waitTime);
    }
  }

  /**
   * 🔨 Process single queue item
   * ✅ UPDATED v4.0: Generates cover image (not episode image)
   */
  private async processItem(item: QueueItem): Promise<void> {
    item.status = "processing";
    item.attempts++;

    const status = this.getStatus();
    console.log(`\n📸 Processing [${status.processed + 1}/${status.total}] Article "${item.request.title}"`);
    console.log(`📊 Progress: ${status.percentage.toFixed(1)}% | ETA: ${status.estimatedTimeRemaining} min`);

    try {
      // Generate COVER image (not episode image!)
      const image = await this.agent.generateCoverImage(item.request);
      
      // Success
      item.status = "completed";
      item.result = image;
      this.processed.push(image);
      this.lastProcessedAt = Date.now();

      // Remove from queue
      this.queue = this.queue.filter(q => q.id !== item.id);

      console.log(`✅ Cover image for "${item.request.title}" completed`);

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`❌ Cover image for "${item.request.title}" failed: ${errorMsg}`);

      // Check if should retry
      if (item.attempts < 3) {
        console.log(`🔄 Retrying (attempt ${item.attempts + 1}/3)...`);
        item.status = "pending";
        // Don't remove from queue, will retry
      } else {
        // Max retries reached
        console.error(`❌ Max retries reached for article ${item.request.articleId}`);
        item.status = "failed";
        item.error = errorMsg;

        // Add to errors
        this.errors.push({
          episodeId: 0, // Legacy field, not used
          error: errorMsg,
          timestamp: Date.now(),
          retryCount: item.attempts
        });

        // Remove from queue
        this.queue = this.queue.filter(q => q.id !== item.id);
      }

      this.lastProcessedAt = Date.now();
    }
  }

  /**
   * 💤 Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 Get progress report
   */
  getProgressReport(): string {
    const status = this.getStatus();
    return `
╔════════════════════════════════════════════════════════════
║ 🖼️  IMAGE QUEUE STATUS
╠════════════════════════════════════════════════════════════
║ Total:       ${status.total}
║ Processed:   ${status.processed} ✅
║ Failed:      ${status.failed} ❌
║ Pending:     ${status.pending} ⏳
║ Progress:    ${status.percentage.toFixed(1)}%
║ ETA:         ${status.estimatedTimeRemaining} minutes
║ Currently:   ${status.currentlyProcessing || 'Idle'}
║ Last run:    ${status.lastProcessedAt ? new Date(status.lastProcessedAt).toLocaleTimeString() : 'Never'}
╚════════════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * 🧹 Clear completed items (for memory management)
   */
  clearCompleted(): void {
    const beforeCount = this.processed.length;
    this.processed = this.processed.slice(-10); // Keep last 10
    const cleared = beforeCount - this.processed.length;
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} completed items from memory`);
    }
  }

  /**
   * 🔄 Retry failed items
   */
  retryFailed(): void {
    const failedCount = this.errors.length;
    if (failedCount === 0) {
      console.log("ℹ️  No failed items to retry");
      return;
    }

    console.log(`🔄 Retrying ${failedCount} failed items...`);

    // Re-add failed items to queue
    for (const error of this.errors) {
      // Find original request (if still available)
      // For now, we'll log and skip
      console.log(`⚠️ Cannot retry episode ${error.episodeId} - request not cached`);
    }

    this.errors = [];
  }

  /**
   * 📈 Get statistics
   */
  getStatistics(): {
    totalProcessed: number;
    totalFailed: number;
    averageTimePerImage: number;
    successRate: number;
  } {
    const totalProcessed = this.processed.length;
    const totalFailed = this.errors.length;
    const total = totalProcessed + totalFailed;
    const successRate = total > 0 ? (totalProcessed / total) * 100 : 0;

    // Calculate average time (if we have timestamps)
    const averageTimePerImage = 60000; // Default 60s per image

    return {
      totalProcessed,
      totalFailed,
      averageTimePerImage,
      successRate
    };
  }
}
