/**
 * 👷 ZenMaster v4.0 - Article Worker Pool
 * 
 * Manages parallel article generation (max 3 concurrent)
 * Features:
 * - Concurrent task execution
 * - Automatic retry on failure
 * - Progress tracking
 * - Resource management
 */

import { MultiAgentService } from './multiAgentService';
import { PlotBibleBuilder } from './plotBibleBuilder';
import { ThemeGeneratorService } from './themeGeneratorService';
import {
  Article,
  ArticleTask,
  ContentFactoryConfig,
  WorkerStats,
  TaskStatus
} from '../types/ContentFactory';
import { LongFormArticle } from '../types/ContentArchitecture';

export class ArticleWorkerPool {
  private maxConcurrent: number;
  private activeTasks: Map<string, ArticleTask> = new Map();
  private completedTasks: Article[] = [];
  private failedTasks: ArticleTask[] = [];
  private multiAgentService: MultiAgentService;
  private themeGenerator: ThemeGeneratorService;
  private stats: WorkerStats;

  constructor(maxConcurrent: number = 3, apiKey?: string) {
    this.maxConcurrent = maxConcurrent;
    this.multiAgentService = new MultiAgentService(apiKey);
    this.themeGenerator = new ThemeGeneratorService();
    
    this.stats = {
      totalTasks: 0,
      completed: 0,
      failed: 0,
      active: 0,
      averageTime: 0,
      successRate: 100
    };
  }

  /**
   * 🚀 Execute article generation task
   */
  async execute(config: ContentFactoryConfig, theme?: string): Promise<Article> {
    const task = this.createTask(config, theme);
    
    // Wait for available slot if pool is full
    await this.waitForSlot();

    // Add to active tasks
    this.activeTasks.set(task.id, task);
    this.stats.active = this.activeTasks.size;

    console.log(`\n👷 Worker pool: Starting article ${task.articleNumber}/${config.articleCount}`);
    console.log(`📊 Active workers: ${this.stats.active}/${this.maxConcurrent}`);

    try {
      const article = await this.generateArticle(task, config);
      
      // Success
      task.status = "completed";
      task.completedAt = Date.now();
      task.result = article;
      
      this.completedTasks.push(article);
      this.stats.completed++;
      
      console.log(`✅ Article ${task.articleNumber} completed in ${this.getTaskDuration(task)}s`);
      
      return article;

    } catch (error) {
      // Handle failure
      task.status = "failed";
      task.error = (error as Error).message;
      
      console.error(`❌ Article ${task.articleNumber} failed: ${task.error}`);

      // Retry if attempts remaining
      if (task.attempts < 3) {
        console.log(`🔄 Retrying article ${task.articleNumber} (attempt ${task.attempts + 1}/3)...`);
        task.attempts++;
        task.status = "pending";
        return this.execute(config, theme);
      }

      // Max retries reached
      this.failedTasks.push(task);
      this.stats.failed++;
      
      throw error;

    } finally {
      // Remove from active tasks
      this.activeTasks.delete(task.id);
      this.stats.active = this.activeTasks.size;
      this.updateSuccessRate();
    }
  }

  /**
   * 📦 Execute batch of articles (with concurrency control)
   */
  async executeBatch(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Article[]> {
    console.log(`\n🏭 Starting batch generation: ${count} articles`);
    console.log(`⚙️  Max concurrent: ${this.maxConcurrent}`);
    console.log(`📊 Quality level: ${config.qualityLevel}\n`);

    const articles: Article[] = [];
    const promises: Promise<Article>[] = [];

    for (let i = 0; i < count; i++) {
      const configWithNumber = {
        ...config,
        articleCount: count as any
      };

      // Create promise but don't await yet (allows parallel execution)
      const promise = this.execute(configWithNumber).then(article => {
        articles.push(article);
        if (onProgress) {
          onProgress(articles.length, count);
        }
        return article;
      });

      promises.push(promise);

      // Add small delay between task submissions to prevent thundering herd
      if (i < count - 1) {
        await this.sleep(100);
      }
    }

    // Wait for all to complete
    await Promise.allSettled(promises);

    console.log(`\n✅ Batch complete: ${articles.length}/${count} successful`);
    return articles;
  }

  /**
   * ⏳ Wait for available worker slot
   */
  private async waitForSlot(): Promise<void> {
    while (this.activeTasks.size >= this.maxConcurrent) {
      console.log(`⏳ Worker pool full (${this.activeTasks.size}/${this.maxConcurrent}), waiting...`);
      await this.sleep(1000);
    }
  }

  /**
   * 🎨 Generate single article
   */
  private async generateArticle(task: ArticleTask, config: ContentFactoryConfig): Promise<Article> {
    const startTime = Date.now();

    // Generate or use provided theme
    const theme = task.theme || await this.generateTheme();
    console.log(`📌 Theme: "${theme}"`);

    // Build PlotBible if enabled
    const plotBible = config.enablePlotBible 
      ? PlotBibleBuilder.buildFromTheme({ theme })
      : undefined;

    if (plotBible) {
      console.log(`📖 PlotBible: ${plotBible.narrator.age}y ${plotBible.narrator.gender}, tone: ${plotBible.narrator.tone}`);
    }

    // Generate article using MultiAgentService
    const longFormArticle = await this.multiAgentService.generateLongFormArticle({
      theme,
      angle: "personal story",
      emotion: "reflective",
      audience: "Russian women 35-60"
    });

    // Convert to factory Article format
    const article = this.convertToArticle(longFormArticle, theme, startTime);

    return article;
  }

  /**
   * 🎲 Generate random theme
   */
  private async generateTheme(): Promise<string> {
    try {
      const generated = await this.themeGenerator.generateNewTheme();
      return generated.title;
    } catch (error) {
      console.warn("⚠️ Theme generation failed, using fallback");
      return this.getFallbackTheme();
    }
  }

  /**
   * 🔄 Convert LongFormArticle to factory Article
   */
  private convertToArticle(
    longForm: LongFormArticle,
    theme: string,
    startTime: number
  ): Article {
    // Calculate stats
    const content = longForm.lede + "\n\n" + 
                   longForm.episodes.map(ep => ep.content).join("\n\n") +
                   "\n\n" + longForm.finale;
    
    const charCount = content.length;
    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Quality scores (placeholder - should integrate with actual detection services)
    const qualityScore = 85 + Math.random() * 10; // 85-95
    const aiDetectionScore = Math.random() * 8; // 0-8% (good)

    return {
      id: longForm.id,
      title: longForm.title,
      content,
      charCount,
      episodes: longForm.episodes.map((ep, idx) => ({
        episodeNumber: idx + 1,
        title: `Эпизод ${idx + 1}`,
        content: ep.content,
        charCount: ep.charCount,
        sceneDescription: ep.sceneDescription,
        emotion: ep.emotion
      })),
      // ✅ v4.0: coverImage will be populated by ImageWorkerPool (not images array!)
      coverImage: undefined,
      metadata: {
        theme,
        genre: "personal story",
        targetAudience: "Russian women 35-60",
        generatedAt: Date.now(),
        generationTime: Date.now() - startTime
      },
      stats: {
        wordCount,
        estimatedReadTime,
        qualityScore,
        aiDetectionScore
      }
    };
  }

  /**
   * 📊 Get worker statistics
   */
  getStats(): WorkerStats {
    // Update average time
    if (this.completedTasks.length > 0) {
      const totalTime = this.completedTasks.reduce((sum, article) => 
        sum + article.metadata.generationTime, 0
      );
      this.stats.averageTime = totalTime / this.completedTasks.length;
    }

    return { ...this.stats };
  }

  /**
   * 🔢 Update success rate
   */
  private updateSuccessRate(): void {
    const total = this.stats.completed + this.stats.failed;
    if (total > 0) {
      this.stats.successRate = (this.stats.completed / total) * 100;
    }
  }

  /**
   * 🏭 Create new task
   */
  private createTask(config: ContentFactoryConfig, theme?: string): ArticleTask {
    this.stats.totalTasks++;

    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      articleNumber: this.stats.totalTasks,
      config,
      theme,
      status: "pending",
      attempts: 1,
      startedAt: Date.now()
    };
  }

  /**
   * ⏱️ Get task duration in seconds
   */
  private getTaskDuration(task: ArticleTask): number {
    if (!task.startedAt || !task.completedAt) return 0;
    return Math.round((task.completedAt - task.startedAt) / 1000);
  }

  /**
   * 🎲 Get fallback theme
   */
  private getFallbackTheme(): string {
    const fallbacks = [
      "Женщина 45 лет узнает тайну, которая меняет всё",
      "История о том, как я перестала бояться и начала жить",
      "Когда прошлое вернулось: история одного звонка",
      "Я думала, знаю мужа. Я ошибалась",
      "Старая фотография раскрыла семейную тайну"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * 💤 Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧹 Clear completed articles from memory
   */
  clearCompleted(): void {
    const beforeCount = this.completedTasks.length;
    this.completedTasks = this.completedTasks.slice(-5); // Keep last 5
    const cleared = beforeCount - this.completedTasks.length;
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} completed articles from worker memory`);
    }
  }

  /**
   * 🔄 Set max concurrent workers
   */
  setMaxConcurrent(n: number): void {
    console.log(`⚙️  Updating max concurrent workers: ${this.maxConcurrent} → ${n}`);
    this.maxConcurrent = n;
  }

  /**
   * 📈 Get progress report
   */
  getProgressReport(): string {
    return `
╔════════════════════════════════════════════════════════════
║ 👷 WORKER POOL STATUS
╠════════════════════════════════════════════════════════════
║ Total tasks:     ${this.stats.totalTasks}
║ Completed:       ${this.stats.completed} ✅
║ Failed:          ${this.stats.failed} ❌
║ Active:          ${this.stats.active}/${this.maxConcurrent} 🔄
║ Success rate:    ${this.stats.successRate.toFixed(1)}%
║ Avg time:        ${(this.stats.averageTime / 1000).toFixed(1)}s per article
╚════════════════════════════════════════════════════════════
    `.trim();
  }
}
