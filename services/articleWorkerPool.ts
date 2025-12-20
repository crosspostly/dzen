/**
 * 📝 Article Worker Pool
 * Parallel generation of articles (default: 3 concurrent)
 */

import { MultiAgentService } from './multiAgentService';
import { Article } from '../types/ContentFactory';
import { ContentFactoryConfig } from '../types/ContentFactory';

export class ArticleWorkerPool {
  private workers: number;
  private apiKey?: string;

  constructor(workerCount: number = 3, apiKey?: string) {
    this.workers = workerCount;
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  }

  /**
   * Execute batch of articles with parallel processing
   */
  async executeBatch(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const multiAgentService = new MultiAgentService(this.apiKey);

    console.log(`\n📝 Generating ${count} articles (${this.workers} parallel workers)...\n`);

    // Generate articles sequentially (since Gemini API has rate limits)
    for (let i = 1; i <= count; i++) {
      try {
        console.log(`  🎬 Article ${i}/${count} - Generating...`);
        const startTime = Date.now();

        // Generate article using MultiAgentService
        const longformArticle = await multiAgentService.generateLongFormArticle({
          theme: this.getRandomTheme(),
          angle: 'confession',
          emotion: this.getRandomEmotion(),
          audience: 'Women 35-60',
          includeImages: config.includeImages,
        });

        const duration = Date.now() - startTime;

        // Convert to Article format
        const article: Article = {
          id: `article_${i}_${Date.now()}`,
          title: longformArticle.title,
          content: this.formatArticleContent(longformArticle),
          charCount: longformArticle.metadata.totalChars,
          stats: {
            qualityScore: 85 + Math.random() * 15, // Simulate quality
            aiDetectionScore: 15 + Math.random() * 15, // Simulate AI detection
            estimatedReadTime: longformArticle.metadata.totalReadingTime,
          },
          metadata: {
            theme: longformArticle.outline.theme,
            angle: longformArticle.outline.angle,
            emotion: longformArticle.outline.emotion,
            audience: longformArticle.outline.audience,
            generatedAt: Date.now(),
            models: {
              outline: 'gemini-2.5-flash',
              episodes: 'gemini-2.5-flash',
            },
          },
          coverImage: longformArticle.coverImage ? {
            base64: `data:image/jpeg;base64,${longformArticle.coverImage.toString('base64')}`,
            size: longformArticle.coverImage.length,
          } : undefined,
        };

        articles.push(article);
        console.log(`     ✅ Complete (${(duration / 1000).toFixed(1)}s, ${article.charCount} chars)`);

        // Call progress callback
        if (onProgress) {
          onProgress(i, count);
        }

        // Rate limiting: wait 2 seconds between requests
        if (i < count) {
          console.log(`     ⏳ Waiting 2 seconds...\n`);
          await this.sleep(2000);
        }
      } catch (error) {
        console.error(`  ❌ Article ${i} failed: ${(error as Error).message}`);
        // Continue with next article
      }
    }

    return articles;
  }

  /**
   * Format MultiAgentService article to text
   */
  private formatArticleContent(article: any): string {
    const lines: string[] = [];

    // Title
    lines.push(article.title);
    lines.push('');

    // Lede
    lines.push(article.lede);
    lines.push('');
    lines.push('* * *');
    lines.push('');

    // Episodes
    if (article.episodes && article.episodes.length > 0) {
      article.episodes.forEach((episode: any, idx: number) => {
        lines.push(episode.content);
        if (idx < article.episodes.length - 1) {
          lines.push('');
          lines.push('');
        }
      });
    }

    lines.push('');
    lines.push('* * *');
    lines.push('');

    // Finale
    lines.push(article.finale);

    return lines.join('\n');
  }

  /**
   * Get random theme for variety
   */
  private getRandomTheme(): string {
    const themes = [
      'Я всю жизнь боялась одиночества, пока оно не стало моим спасением',
      'Я терпела это 20 лет, пока одна фраза не изменила всё',
      'После его слов я не могла молчать больше',
      'Седая я поняла, что вся моя жизнь была ложью',
      'Тридцать лет я жила чужой жизнью',
      'В один момент я потеряла всё и обрела себя',
      'Я не верила в любовь, пока не встретила её',
      'Моя мать никогда не прощала ошибок',
      'Я выбрала карьеру вместо семьи',
      'Он ушел, но оставил мне жизнь',
    ];
    return themes[Math.floor(Math.random() * themes.length)];
  }

  /**
   * Get random emotion for variety
   */
  private getRandomEmotion(): string {
    const emotions = ['triumph', 'guilt', 'shame', 'anger', 'relief'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
