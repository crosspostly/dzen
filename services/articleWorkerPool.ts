/**
 * 📑 Article Worker Pool v7.1
 * Parallel generation of articles (default: 3 concurrent)
 */

import { MultiAgentService } from './multiAgentService';
import { ThemeGeneratorService } from './themeGeneratorService';
import { imageGeneratorAgent } from './imageGeneratorAgent';
import { ContentSanitizer } from './contentSanitizer';
import { TextRestorationService } from './textRestorationService';
import { Article } from '../types/ContentFactory';
import { ContentFactoryConfig } from '../types/ContentFactory';
import { CHAR_BUDGET } from '../constants/BUDGET_CONFIG';
import { PlotBibleBuilder } from './plotBibleBuilder';
import { MODELS } from '../constants/MODELS_CONFIG';

export interface BothModeResult {
  rawArticle: Article;
  restoredArticle: Article;
}

export class ArticleWorkerPool {
  private workers: number;
  private apiKey?: string;
  private themeGeneratorService: ThemeGeneratorService;
  private textRestorationService: TextRestorationService;

  constructor(workerCount: number = 3, apiKey?: string) {
    this.workers = workerCount;
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
    this.themeGeneratorService = new ThemeGeneratorService(this.apiKey);
    this.textRestorationService = new TextRestorationService(this.apiKey);
  }

  async executeBatchBoth(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BothModeResult[]> {
    const results: BothModeResult[] = [];
    const maxChars = config.maxChars || CHAR_BUDGET;
    
    for (let i = 1; i <= count; i++) {
      try {
        const theme = await this.themeGeneratorService.generateNewTheme();
        const multiAgentService = new MultiAgentService(this.apiKey, { maxChars });

        const angle = (config as any).defaultAngle || 'observer';
        const emotion = (config as any).defaultEmotion || this.getRandomEmotion();
        const audience = (config as any).defaultAudience || 'Active 50+';

        const outline = await multiAgentService.generateOutline({
          theme, angle, emotion, audience
        }, 6);
        
        // 🆕 v10.2 ОПТИМИЗАЦИЯ: Генерируем статью ТОЛЬКО ОДИН РАЗ
        const generatedLongform = await multiAgentService.generateLongFormArticle({
          theme, angle, emotion, audience, includeImages: false
        });

        // RESTORED версия создается на основе уже сгенерированной RAW версии
        const restorationResult = await this.textRestorationService.restoreArticle(generatedLongform);
        
        results.push({
          rawArticle: this.createArticle(generatedLongform, generatedLongform.processedContent, undefined, i, 'RAW'),
          restoredArticle: this.createArticle(generatedLongform, restorationResult.restoredContent, undefined, i, 'RESTORED')
        });

        if (onProgress) onProgress(i, count);
        await this.sleep(2000);
      } catch (error) {
        console.error(`❌ Batch Pair ${i} failed:`, error);
      }
    }
    return results;
  }

  async executeBatch(
    count: number,
    config: ContentFactoryConfig,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const maxChars = config.maxChars || CHAR_BUDGET;
    
    for (let i = 1; i <= count; i++) {
      try {
        const theme = await this.themeGeneratorService.generateNewTheme();
        const multiAgentService = new MultiAgentService(this.apiKey, { maxChars });

        const angle = (config as any).defaultAngle || 'observer';
        const emotion = (config as any).defaultEmotion || this.getRandomEmotion();
        const audience = (config as any).defaultAudience || 'Active 50+';

        const longformArticle = await multiAgentService.generateLongFormArticle({
          theme, angle, emotion, audience
        });

        const article = this.createArticle(longformArticle, longformArticle.processedContent, undefined, i, 'RAW');
        articles.push(article);

        if (onProgress) onProgress(i, count);
        await this.sleep(2000);
      } catch (error) {
        console.error(`❌ Article ${i} failed:`, error);
      }
    }
    return articles;
  }

  private createArticle(
    longformArticle: any,
    content: string,
    coverImageBase64: string | undefined,
    index: number,
    version: 'RAW' | 'RESTORED'
  ): Article {
    const metrics = ContentSanitizer.calculateQualityMetrics(content);
    return {
      id: `article_${index}_${Date.now()}`,
      title: longformArticle.title,
      content: content,
      charCount: content.length,
      stats: {
        qualityScore: metrics.readabilityScore,
        aiDetectionScore: 20,
        estimatedReadTime: Math.ceil(content.length / 1000),
        burstinessScore: 80,
        perplexityScore: 80,
        uniquenessScore: 90,
        readabilityScore: metrics.readabilityScore,
        dialoguePercentage: metrics.dialoguePercentage,
        sensoryDensity: metrics.sensoryDensity,
      },
      metadata: {
        theme: longformArticle.outline?.theme || 'Unknown',
        angle: longformArticle.outline?.angle,
        emotion: longformArticle.outline?.emotion,
        audience: longformArticle.outline?.audience,
        generatedAt: Date.now(),
        models: {
          outline: MODELS.TEXT.PRIMARY,
          episodes: MODELS.TEXT.PRIMARY,
        },
        articleVersion: version,
      }
    };
  }

  private getRandomEmotion(): string {
    const emotions = ['inspiration', 'curiosity', 'liberation', 'nostalgia', 'peaceful'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
