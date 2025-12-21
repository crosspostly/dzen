// ============================================================================
// ZenMaster v2.0 — Anti-Detection Engine (Phase 2)
// Orchestrates all anti-detection techniques to achieve <15% AI detection
// ============================================================================

import { LongFormArticle } from '../../types/ContentArchitecture';
import {
  AntiDetectionResult,
  AntiDetectionConfig,
  PerplexityMetrics,
  BurstinessMetrics,
} from '../../types/AntiDetection';
import { PerplexityController } from './perplexityController';
import { BurstinessOptimizer } from './burstinessOptimizer';
import { SkazNarrativeEngine } from './skazNarrativeEngine';
import { AdversarialGatekeeper } from './adversarialGatekeeper';
import { VisualSanitizationService } from './visualSanitizationService';

/**
 * Main Anti-Detection Engine
 * Coordinates all bypass techniques
 */
export class AntiDetectionEngine {
  private config: AntiDetectionConfig;
  private perplexityController: PerplexityController;
  private burstinessOptimizer: BurstinessOptimizer;
  private skazEngine: SkazNarrativeEngine;
  private adversarialGatekeeper: AdversarialGatekeeper;
  private visualSanitizer: VisualSanitizationService;
  private metrics: {
    perplexity?: PerplexityMetrics;
    burstiness?: BurstinessMetrics;
    skaz?: any;
  } = {};

  constructor(config?: Partial<AntiDetectionConfig>) {
    this.config = {
      perplexity: {
        enabled: true,
        targetScore: 3.0,
        maxIterations: 3,
        ...config?.perplexity,
      },
      burstiness: {
        enabled: true,
        targetStdDev: 6.5,
        splitThreshold: 25,
        mergeThreshold: 5,
        ...config?.burstiness,
      },
      skaz: {
        enabled: true,
        particleFrequency: 10,
        dialectFrequency: 4,
        syntaxDislocationRate: 0.15,
        ...config?.skaz,
      },
      redTeam: {
        enabled: true,
        minScore: 80,
        ...config?.redTeam,
      },
      visual: {
        enabled: true,
        noiseLevel: 3.5,
        distortionLevel: 0.5,
        ...config?.visual,
      },
    };

    this.perplexityController = new PerplexityController();
    this.burstinessOptimizer = new BurstinessOptimizer();
    this.skazEngine = new SkazNarrativeEngine();
    this.adversarialGatekeeper = new AdversarialGatekeeper();
    this.visualSanitizer = new VisualSanitizationService();
  }

  /**
   * Process article through all anti-detection stages
   */
  async process(article: LongFormArticle): Promise<{
    article: LongFormArticle;
    result: AntiDetectionResult;
  }> {
    console.log('\n🎯 [Anti-Detection] Starting Phase 2 processing...');

    const startTime = Date.now();
    let processedText = this.concatenateArticle(article);
    const modifications = {
      perplexityBoost: false,
      burstinessOptimized: false,
      skazApplied: false,
      visualSanitized: false,
    };

    // Stage 2.1: Perplexity Control
    if (this.config.perplexity.enabled) {
      console.log('   📊 Perplexity boost...');
      processedText = this.perplexityController.increasePerplexity(processedText, this.config.perplexity.targetScore);
      this.metrics.perplexity = this.perplexityController.analyzePerplexity(processedText);
      modifications.perplexityBoost = true;
    }

    // Stage 2.2: Burstiness Optimization
    if (this.config.burstiness.enabled) {
      console.log('   📈 Burstiness optimization...');
      processedText = this.burstinessOptimizer.optimizeBurstiness(processedText, this.config.burstiness.targetStdDev);
      this.metrics.burstiness = this.burstinessOptimizer.analyzeBurstiness(processedText);
      modifications.burstinessOptimized = true;
    }

    // Stage 2.3: Skaz Narrative (CRITICAL)
    if (this.config.skaz.enabled) {
      console.log('   🎭 Skaz narrative application...');
      processedText = this.skazEngine.applySkazTransformations(processedText);
      this.metrics.skaz = this.skazEngine.analyzeSkazMetrics(processedText);
      modifications.skazApplied = true;
    }

    // Stage 2.4: Red Team Validation
    let validationResult = null;
    if (this.config.redTeam.enabled) {
      console.log('   🛡️  Red team validation...');
      const title = article.title || article.episodes[0]?.title || "Untitled";
      validationResult = this.adversarialGatekeeper.assessArticle(title, processedText, article.images);
    }

    // Stage 2.5: Visual Sanitization
    if (this.config.visual.enabled) {
      console.log('   🖼️  Image sanitization...');
      if (article.images && article.images.length > 0) {
        article.images = article.images.map(imagePath => {
          if (typeof imagePath === 'string') {
            return this.visualSanitizer.sanitizeImage(imagePath, this.config.visual.noiseLevel);
          }
          return imagePath;
        });
      }
      modifications.visualSanitized = true;
    }

    const processingTime = Date.now() - startTime;
    console.log(`   ✅ Anti-detection complete (${processingTime}ms)\n`);

    // Reconstruct article with processed text
    const enhancedArticle = this.reconstructArticle(article, processedText);

    // Build final score
    const finalScore = this.calculateFinalScore(validationResult);

    // Create result metrics
    const result: AntiDetectionResult = {
      passed: validationResult ? validationResult.overallScore >= this.config.redTeam.minScore : true,
      confidence: finalScore,
      metrics: {
        perplexity: {
          score: this.metrics.perplexity?.score || 0,
          entropy: this.metrics.perplexity?.rarityRatio || 0,
          targetScore: this.config.perplexity.targetScore,
        },
        burstiness: {
          stdDev: this.metrics.burstiness?.standardDeviation || 0,
          sentenceLengths: this.metrics.burstiness?.sentenceLengths || [],
          variance: this.metrics.burstiness?.variance || 0,
          targetStdDev: this.config.burstiness.targetStdDev,
        },
        skazScore: this.metrics.skaz?.score || 0,
        aiDetectionRisk: this.calculateDetectionRisk(),
      },
      modifications,
      warnings: this.generateWarnings(validationResult),
      recommendations: validationResult ? this.adversarialGatekeeper.getRecommendations(validationResult) : [],
    };

    return {
      article: enhancedArticle,
      result,
    };
  }

  /**
   * Concatenate all article parts into single text
   */
  private concatenateArticle(article: LongFormArticle): string {
    const parts: string[] = [
      article.lede,
      ...article.episodes.map(ep => ep.content),
      article.finale,
    ].filter(Boolean);
    return parts.join('\n\n');
  }

  /**
   * Reconstruct article from processed text
   */
  private reconstructArticle(
    original: LongFormArticle,
    processedText: string
  ): LongFormArticle {
    // Simple approach: put everything into first episode
    // TODO: Implement proper text splitting back into episodes for production
    const episodes = [...original.episodes];
    if (episodes.length > 0) {
      episodes[0] = { ...episodes[0], content: processedText };
    }
    
    return {
      ...original,
      episodes,
    };
  }

  /**
   * Calculate final confidence score
   */
  private calculateFinalScore(validationResult: any): number {
    if (!validationResult) {
      // If no validation, calculate from individual metrics
      const perplexityScore = this.metrics.perplexity?.score || 0;
      const burstinessStdDev = this.metrics.burstiness?.standardDeviation || 0;
      const skazScore = this.metrics.skaz?.score || 0;
      
      // Weighted calculation
      return Math.round(
        (Math.min(100, perplexityScore * 20) * 0.3) + // 30% perplexity
        (Math.min(100, burstinessStdDev * 10) * 0.3) + // 30% burstiness
        (skazScore * 0.4) // 40% skaz quality
      );
    }
    
    return validationResult.overallScore;
  }

  /**
   * Calculate AI detection risk (inverse of confidence)
   */
  private calculateDetectionRisk(): number {
    const confidence = this.calculateFinalScore(null) / 100;
    return Math.max(5, Math.round((1 - confidence) * 100)); // 5-100%
  }

  /**
   * Generate warnings based on validation
   */
  private generateWarnings(validationResult: any): string[] {
    const warnings: string[] = [];
    
    if (!validationResult) return warnings;
    
    if (!validationResult.passesAllChecks) {
      warnings.push(`Quality score too low: ${validationResult.overallScore}/100 (need 80+)`);
    }
    
    if (validationResult.issues) {
      warnings.push(...validationResult.issues);
    }
    
    return warnings;
  }

  /**
   * 📊 Публичный метод для анализа метрик (используется в тестах)
   * Используется в тестах и для диагностики
   */
  public async analyzeMetrics(text: string): Promise<{
    perplexity: PerplexityMetrics;
    burstiness: BurstinessMetrics;
  }> {
    return this.analyzeText(text);
  }

  /**
   * 🔒 Приватный метод анализа текста (внутренний)
   * Анализирует и возвращает текущие метрики
   */
  private async analyzeText(text: string): Promise<{
    perplexity: PerplexityMetrics;
    burstiness: BurstinessMetrics;
  }> {
    // Store current metrics
    this.metrics.perplexity = this.perplexityController.analyzePerplexity(text);
    this.metrics.burstiness = this.burstinessOptimizer.analyzeBurstiness(text);
    
    return {
      perplexity: this.metrics.perplexity,
      burstiness: this.metrics.burstiness,
    };
  }

  /**
   * Analyze current text metrics (before processing)
   * @deprecated - Use analyzeText() instead
   */
  async analyzeMetrics(text: string): Promise<{
    perplexity: PerplexityMetrics;
    burstiness: BurstinessMetrics;
  }> {
    return this.analyzeText(text);
  }
}

export default AntiDetectionEngine;
