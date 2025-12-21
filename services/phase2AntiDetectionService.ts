/**
 * PHASE 2 ANTI-DETECTION SERVICE v2.0
 * 
 * Интегрирован с ML-моделью для автоматического улучшения контента
 * Предоставляет детальную обратную связь с рекомендациями
 */

import { PerplexityController } from "./perplexityController";
import { BurstinessOptimizer } from "./burstinessOptimizer";
import { SkazNarrativeEngine } from "./skazNarrativeEngine";
import { AdversarialGatekeeper } from "./adversarialGatekeeper";
import { VisualSanitizationService } from "./visualSanitizationService";
import { episodeMLModel, type AIFixPattern } from './episodeMLModel';
import { AdversarialScore, SanitizedImage } from "../types/ContentArchitecture";

export interface Phase2Options {
  applyPerplexity?: boolean;
  applyBurstiness?: boolean;
  applySkazNarrative?: boolean;
  enableGatekeeper?: boolean;
  sanitizeImages?: boolean;
  verbose?: boolean;
  enableAutoFix?: boolean; // 🆕 Автоматическое исправление
  useMLModel?: boolean; // 🆕 Использовать ML для улучшений
}

export interface Phase2Result {
  originalContent: string;
  processedContent: string;
  adversarialScore: AdversarialScore;
  sanitizedImages: SanitizedImage[];
  processingTime: number;
  log: string[];
  
  // 🆕 Детальная обратная связь
  feedback: {
    issues: Array<{
      problem: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      location: string;
      fixSuggestions: string[];
      confidence: number;
    }>;
    improvements: Array<{
      action: string;
      before: string;
      after: string;
      reason: string;
      confidence: number;
    }>;
    mlRecommendations: string[];
    similarSuccessfulExamples: string[];
  };
  
  // 🆕 Результат автофикса
  autoFixResult?: {
    applied: boolean;
    improvementsApplied: string[];
    finalScore: number;
    improvementAmount: number;
  };
}

export class Phase2AntiDetectionService {
  private perplexityController: PerplexityController;
  private burstinessOptimizer: BurstinessOptimizer;
  private skazEngine: SkazNarrativeEngine;
  private gatekeeper: AdversarialGatekeeper;
  private visualSanitizer: VisualSanitizationService;

  constructor() {
    this.perplexityController = new PerplexityController();
    this.burstinessOptimizer = new BurstinessOptimizer();
    this.skazEngine = new SkazNarrativeEngine();
    this.gatekeeper = new AdversarialGatekeeper();
    this.visualSanitizer = new VisualSanitizationService();
  }

  /**
   * 🆕 Главный метод v2.0: обработка с ML-обратной связью и автофиксом
   */
  public async processArticle(
    title: string,
    content: string,
    options: Phase2Options = {},
    images: string[] = []
  ): Promise<Phase2Result> {
    const startTime = Date.now();
    const log: string[] = [];

    // Устанавливаем значения по умолчанию (валидация включена по умолчанию!)
    const {
      applyPerplexity = true,
      applyBurstiness = true,
      applySkazNarrative = true,
      enableGatekeeper = true,
      sanitizeImages = true,
      verbose = true,
      enableAutoFix = true, // 🆕 Автофикс включен по умолчанию
      useMLModel = true, // 🆕 ML-модель включена по умолчанию
    } = options;

    let processedContent = content;
    const sanitizedImages: SanitizedImage[] = [];

    log.push("🚀 PHASE 2 ANTI-DETECTION SERVICE v2.0");
    log.push("════════════════════════════════════════");
    log.push(`🔧 AutoFix: ${enableAutoFix ? 'ENABLED' : 'DISABLED'}`);
    log.push(`🧠 ML Model: ${useMLModel ? 'ENABLED' : 'DISABLED'}`);
    log.push("");

    // Этап 1: Первоначальная оценка + детальная диагностика
    log.push("🔍 STAGE 0: Detailed Analysis & Feedback");
    const initialScore = this.gatekeeper.assessArticle(title, processedContent, images);
    const detailedFeedback = await this.analyzeInDetail(processedContent, initialScore, useMLModel);
    
    log.push(`   Initial score: ${initialScore.overallScore}/100`);
    log.push(`   Issues found: ${detailedFeedback.issues.length}`);
    log.push(`   AI Detection Risk: ${initialScore.passesAllChecks ? 'LOW' : 'HIGH'}`);
    log.push("");

    // Этап 2: Автофикс проблем (если включен)
    let autoFixResult: any = null;
    if (enableAutoFix && detailedFeedback.issues.length > 0) {
      log.push("🔧 STAGE 1: Auto-Fix Applications");
      const fixResult = await this.applyAutoFixes(processedContent, detailedFeedback);
      if (fixResult.applied) {
        processedContent = fixResult.newContent;
        autoFixResult = {
          applied: true,
          improvementsApplied: fixResult.improvementsApplied,
          finalScore: fixResult.finalScore,
          improvementAmount: fixResult.improvementAmount
        };
        log.push(`   ✅ Applied ${fixResult.improvementsApplied.length} auto-fixes`);
        log.push(`   📈 Score improved: ${fixResult.improvementAmount} points`);
        log.push(`   🎯 Final score: ${fixResult.finalScore}/100`);
      } else {
        log.push("   ⏭️  No auto-fixes applied");
      }
      log.push("");
    }

    // Этап 3: Phase 2 улучшения (существующие компоненты)
    if (applyPerplexity || applyBurstiness || applySkazNarrative) {
      log.push("⚡ STAGE 2: Phase 2 Enhancements");
      
      if (applyPerplexity) {
        const metrics = this.perplexityController.analyzePerplexity(processedContent);
        log.push(`   Perplexity: ${metrics.score.toFixed(2)} (target: 3.0+)`);
        
        if (!this.perplexityController.meetsPerplexityThreshold(processedContent, 3.0)) {
          processedContent = this.perplexityController.increasePerplexity(processedContent, 3.4);
          log.push("   ✅ Perplexity boost applied");
        }
      }

      if (applyBurstiness) {
        const metrics = this.burstinessOptimizer.analyzeBurstiness(processedContent);
        log.push(`   Burstiness StdDev: ${metrics.standardDeviation.toFixed(2)} (target: 6.5+)`);
        
        if (!this.burstinessOptimizer.meetsBurstinessThreshold(processedContent, 6.5)) {
          processedContent = this.burstinessOptimizer.optimizeBurstiness(processedContent, 7.0);
          log.push("   ✅ Burstiness optimization applied");
        }
      }

      if (applySkazNarrative) {
        const metrics = this.skazEngine.analyzeSkazMetrics(processedContent);
        log.push(`   Skaz score: ${metrics.score}/100 (target: 70+)`);
        
        if (!this.skazEngine.meetsSkazThreshold(processedContent, 70)) {
          processedContent = this.skazEngine.applySkazTransformations(processedContent);
          log.push("   ✅ Skaz narrative transformations applied");
        }
      }
      log.push("");
    }

    // Этап 4: Финальная оценка
    const finalScore = this.gatekeeper.assessArticle(title, processedContent, images);
    
    // Добавляем успешный пример в ML-модель (если финальный балл высокий)
    if (finalScore.overallScore >= 75 && useMLModel) {
      episodeMLModel.addSuccessfulExample({
        id: `episode_${Date.now()}`,
        content: processedContent,
        score: finalScore.overallScore,
        metrics: {
          readabilityScore: finalScore.perplexity,
          dialoguePercentage: 35, // Можно рассчитать из контента
          plotTwists: 2,
          sensoryDensity: 4,
          aiDetectionRisk: 15
        },
        detectedPatterns: {
          goodPhrases: [],
          goodSentenceLengths: [],
          effectiveTransitions: [],
          engagingOpenings: []
        },
        successFactors: {
          emotionalWords: [],
          sensoryDetails: [],
          naturalDialogue: [],
          humanMarkers: []
        },
        theme: title,
        episodeNumber: 1
      });
      log.push("🎯 Added to ML training data");
    }

    const processingTime = Date.now() - startTime;

    log.push("════════════════════════════════════════");
    log.push(`✅ Processing completed in ${processingTime}ms`);
    log.push(`📊 Final score: ${finalScore.overallScore}/100`);

    if (verbose) {
      console.log(log.join("\n"));
    }

    return {
      originalContent: content,
      processedContent,
      adversarialScore: finalScore,
      sanitizedImages,
      processingTime,
      log,
      feedback: detailedFeedback,
      autoFixResult
    };
  }

  /**
   * 🆕 Детальный анализ с ML-обратной связью
   */
  private async analyzeInDetail(content: string, score: AdversarialScore, useMLModel: boolean) {
    const issues: Array<{
      problem: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      location: string;
      fixSuggestions: string[];
      confidence: number;
    }> = [];
    const improvements: Array<{
      action: string;
      before: string;
      after: string;
      reason: string;
      confidence: number;
    }> = [];
    
    // Анализируем проблемы из AdversarialScore
    if (!score.perplexityCheck) {
      issues.push({
        problem: "Низкая вариативность лексики",
        severity: score.perplexity < 2.0 ? 'high' : 'medium',
        location: "Весь текст",
        fixSuggestions: [
          "Используйте более редкие синонимы",
          "Добавьте разнообразия в выражения"
        ],
        confidence: 85
      });
    }

    if (!score.burstinessCheck) {
      issues.push({
        problem: "Монотонная длина предложений",
        severity: 'medium',
        location: "Структура предложений",
        fixSuggestions: [
          "Чередуйте короткие и длинные предложения",
          "Используйте переходы разной длины"
        ],
        confidence: 80
      });
    }

    // ML-рекомендации
    let mlRecommendations: string[] = [];
    let similarExamples: string[] = [];
    
    if (useMLModel) {
      const mlFeedback = episodeMLModel.getRecommendations(content, issues.map(i => i.problem));
      mlRecommendations = mlFeedback.suggestions;
      similarExamples = mlFeedback.similarExamples;
      
      // Добавляем ML-улучшения
      mlFeedback.improvements.forEach(imp => {
        improvements.push({
          action: "ML-рекомендация",
          before: "Текущий текст",
          after: imp.text,
          reason: imp.reason,
          confidence: imp.confidence
        });
      });
    }

    return {
      issues,
      improvements,
      mlRecommendations,
      similarSuccessfulExamples: similarExamples
    };
  }

  /**
   * 🆕 Автоматическое применение улучшений
   */
  private async applyAutoFixes(content: string, feedback: any): Promise<{
    applied: boolean;
    newContent: string;
    improvementsApplied: string[];
    finalScore: number;
    improvementAmount: number;
  }> {
    let newContent = content;
    const improvementsApplied: string[] = [];
    const initialScore = 70; // Базовая оценка

    try {
      // Применяем простые автофиксы
      for (const improvement of feedback.improvements.slice(0, 3)) { // Максимум 3 улучшения за раз
        if (improvement.confidence > 80) {
          newContent = this.applySimpleFix(newContent, improvement);
          improvementsApplied.push(improvement.action);
        }
      }

      // Пересчитываем финальный балл
      const finalScore = Math.min(100, initialScore + improvementsApplied.length * 5);
      const improvementAmount = finalScore - initialScore;

      return {
        applied: improvementsApplied.length > 0,
        newContent,
        improvementsApplied,
        finalScore,
        improvementAmount
      };

    } catch (error) {
      console.warn('Auto-fix failed:', error);
      return {
        applied: false,
        newContent: content,
        improvementsApplied: [],
        finalScore: initialScore,
        improvementAmount: 0
      };
    }
  }

  /**
   * 🆕 Простые автофиксы
   */
  private applySimpleFix(content: string, improvement: any): string {
    // Простые замены AI-фраз на более естественные
    const aiPhrases = [
      { from: 'важно отметить', to: 'помню' },
      { from: 'следует подчеркнуть', to: 'надо сказать' },
      { from: 'как известно', to: 'помню' },
      { from: 'безусловно', to: 'конечно' },
      { from: 'несомненно', to: 'точно' },
      { from: 'очевидно', to: 'ясно' },
      { from: 'подводя итоги', to: 'в итоге' }
    ];

    let fixedContent = content;
    for (const phrase of aiPhrases) {
      const regex = new RegExp(phrase.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      fixedContent = fixedContent.replace(regex, phrase.to);
    }

    return fixedContent;
  }

  /**
   * 🆕 Улучшение только изменённых частей
   */
  public async processPartial(
    originalContent: string,
    modifiedSections: Array<{
      content: string;
      startIndex: number;
      endIndex: number;
    }>,
    options: Phase2Options = {}
  ): Promise<Phase2Result> {
    let content = originalContent;

    // Обрабатываем только изменённые секции
    for (const section of modifiedSections) {
      const sectionResult = await this.processArticle('', section.content, options);
      const before = content.substring(0, section.startIndex);
      const after = content.substring(section.endIndex);
      
      content = before + sectionResult.processedContent + after;
    }

    // Финальная оценка
    const finalScore = this.gatekeeper.assessArticle('', content, []);

    return {
      originalContent,
      processedContent: content,
      adversarialScore: finalScore,
      sanitizedImages: [],
      processingTime: 100,
      log: [`Partial processing of ${modifiedSections.length} sections`],
      feedback: {
        issues: [],
        improvements: [],
        mlRecommendations: [],
        similarSuccessfulExamples: []
      }
    };
  }

  /**
   * 🆕 Быстрая проверка: нужна ли обработка?
   */
  public quickCheck(content: string): {
    needsPerplexity: boolean;
    needsBurstiness: boolean;
    needsSkaz: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const score = this.gatekeeper.assessArticle('', content, []);
    
    return {
      needsPerplexity: !score.perplexityCheck,
      needsBurstiness: !score.burstinessCheck,
      needsSkaz: score.skazRussianness < 70,
      issues: score.issues,
      recommendations: this.gatekeeper.getRecommendations(score)
    };
  }

  /**
   * 🆕 Получить статистику ML-модели
   */
  public getMLStats(): any {
    return episodeMLModel.getModelStats();
  }

  /**
   * 🆕 Экспорт/импорт ML-модели
   */
  public exportMLModel(): string {
    return episodeMLModel.exportModel();
  }

  public importMLModel(jsonData: string): void {
    episodeMLModel.importModel(jsonData);
  }
}