/**
 * AutoFix Orchestrator
 * Переписывает ТОЛЬКО явно AI-текст (>70% confidence)
 * но при этом сохраняет/улучшает интересность
 */

import { UniquenessService } from './uniquenessService';
import { episodeGeneratorService } from './episodeGeneratorService';
import { QualityValidator } from './qualityValidator';
import { LongFormArticle, Episode, EngagementAnalysis } from '../types/ContentArchitecture';
import {
  ProblemAnalysis,
  AutoFixResult,
  EpisodeImprovement,
  ValidationResult
} from '../types/AutoFix';

/**
 * AutoFix Orchestrator v1.0
 * 
 * ЭТАП 1: Анализ проблем - определяем AI confidence и engagement
 * ЭТАП 2: Классификация - LEAVE vs REWRITE (матрица решений)
 * ЭТАП 3: Selective Rewrite - переписываем только AI > 70%
 * ЭТАП 4: Валидация - проверяем улучшения и сохранение engagement
 */
export class AutoFixOrchestrator {
  // ✅ ПРАВИЛЬНО: используем готовые экземпляры сервисов
  constructor(
    private uniquenessService: UniquenessService = new UniquenessService(),
    private episodeGeneratorService: typeof episodeGeneratorService = episodeGeneratorService,
    private qualityValidator: typeof QualityValidator = QualityValidator
  ) {}

  /**
   * ЭТАП 1: Анализ проблем
   * Для каждого эпизода определяем:
   * - AI confidence (от uniquenessService.checkUniqueness)
   * - Engagement score (от uniquenessService.analyzeEngagementScore) ← ИЗ TASK 1!
   */
  private async analyzeProblems(article: LongFormArticle): Promise<ProblemAnalysis[]> {
    const problems: ProblemAnalysis[] = [];
    
    for (const episode of article.episodes) {
      // ИСПОЛЬЗУЕМ методы из UniquenessService
      const aiAnalysis = await this.uniquenessService.checkUniqueness(episode.content, []);
      const aiConfidence = aiAnalysis.analysis.ai_detection; // 0-100

      // ← НОВОЕ: используем готовый метод из Task 1!
      const engagement = this.uniquenessService.analyzeEngagementScore(episode.content);
      
      problems.push({
        episodeId: episode.id,
        aiConfidence,
        engagementScore: engagement.score,
        status: 'LEAVE', // будет переопределено в классификации
        reason: 'UNKNOWN',
        priority: 'LOW'
      });
    }
    
    return problems;
  }

  /**
   * ЭТАП 2: Классификация (матрица решений)
   */
  private classifyProblems(analyses: ProblemAnalysis[]): ProblemAnalysis[] {
    return analyses.map(problem => {
      // ПРАВИЛО 1: Если AI > 70% → ВСЕГДА переписываем
      if (problem.aiConfidence > 70) {
        return {
          ...problem,
          status: 'REWRITE',
          reason: 'AI_DETECTED',
          priority: problem.engagementScore < 45 ? 'CRITICAL' : 'HIGH',
          targetEngagement: Math.max(65, problem.engagementScore + 20)
        };
      }
      
      // ПРАВИЛО 2: Если скучно (<45%) И натурально (<45%) → ОСТАВЛЯЕМ
      if (problem.engagementScore < 45 && problem.aiConfidence < 45) {
        return {
          ...problem,
          status: 'LEAVE',
          reason: 'BORING_BUT_AUTHENTIC',
          priority: 'LOW'
        };
      }
      
      // ПРАВИЛО 3: Всё остальное → ОСТАВЛЯЕМ
      return {
        ...problem,
        status: 'LEAVE',
        reason: 'OK',
        priority: 'LOW'
      };
    });
  }

  /**
   * ЭТАП 3: Selective Rewrite (ТОЛЬКО если AI > 70%)
   */
  private async scheduleForRewrite(
    episode: Episode,
    analysis: ProblemAnalysis
  ): Promise<Episode> {
    console.log(
      `🔴 [AutoFix] Episode #${episode.id}: ` +
      `AI=${analysis.aiConfidence}% engagement=${analysis.engagementScore}% → ПЕРЕПИСЫВАЕМ`
    );
    
    // Собираем информацию о проблемах
    const aiAnalysis = await this.uniquenessService.checkUniqueness(episode.content, []);
    const engagement = this.uniquenessService.analyzeEngagementScore(episode.content);
    
    // Создаём специальный промпт
    const refinementPrompt = this.buildRefinementPrompt(
      episode,
      aiAnalysis,
      engagement,
      analysis.targetEngagement || 65
    );
    
    // ПЕРЕПИСЫВАЕМ эпизод через refineEpisode (новый метод в Task 1)
    const refinedEpisode = await this.episodeGeneratorService.refineEpisode(
      episode,
      refinementPrompt,
      { retryCount: 2 }
    );
    
    return refinedEpisode;
  }

  /**
   * ЭТАП 4: Валидация (переоценка после переписывания)
   */
  private async validateRefinement(
    original: Episode,
    refined: Episode
  ): Promise<ValidationResult> {
    // Переанализируем оба
    const originalAI = await this.uniquenessService.checkUniqueness(original.content, []);
    const refinedAI = await this.uniquenessService.checkUniqueness(refined.content, []);
    
    const originalEngagement = this.uniquenessService.analyzeEngagementScore(original.content);
    const refinedEngagement = this.uniquenessService.analyzeEngagementScore(refined.content);
    
    // Успех если:
    // 1. AI confidence упал на 10+ пунктов
    // 2. Engagement не упал ниже 80% оригинала
    const aiImproved = 
      (originalAI.analysis.ai_detection - refinedAI.analysis.ai_detection) >= 10;
    const engagementStable = 
      refinedEngagement.score >= originalEngagement.score * 0.8;
    
    const accepted = aiImproved && engagementStable;
    const improvement = originalAI.analysis.ai_detection - refinedAI.analysis.ai_detection;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (!aiImproved) {
      issues.push(`AI confidence улучшился только на ${improvement}% (требуется 10%+)`);
    }
    
    if (!engagementStable) {
      issues.push(`Engagement упал ниже 80% от оригинала`);
      recommendations.push('Сохранить больше эмоциональных элементов');
    }
    
    return {
      accepted,
      improvement: {
        aiReduction: improvement,
        engagementChange: refinedEngagement.score - originalEngagement.score,
        overallScore: (improvement + Math.max(0, refinedEngagement.score - originalEngagement.score)) / 2
      },
      issues,
      recommendations
    };
  }

  /**
   * MAIN ENTRY POINT
   */
  public async orchestrate(article: LongFormArticle): Promise<AutoFixResult> {
    const startTime = Date.now();
    const result: AutoFixResult = {
      articleId: article.id,
      analysed: 0,
      scheduled: 0,
      completed: 0,
      failed: 0,
      improvements: [],
      duration: 0
    };

    // ЭТАП 1: Анализируем все эпизоды
    const problems = await this.analyzeProblems(article);
    result.analysed = problems.length;

    // ЭТАП 2: Классифицируем (LEAVE vs REWRITE)
    const classified = this.classifyProblems(problems);
    const toRewrite = classified.filter(p => p.status === 'REWRITE');
    result.scheduled = toRewrite.length;

    console.log(
      `📊 AutoFix: ${result.analysed} эпизодов → ${result.scheduled} нужны переписку`
    );

    // ЭТАП 3: Переписываем только отмеченные
    for (const analysis of toRewrite) {
      try {
        const originalEpisode = article.episodes.find(e => e.id === analysis.episodeId);
        if (!originalEpisode) continue;

        // Переписываем
        const refined = await this.scheduleForRewrite(originalEpisode, analysis);

        // Валидируем результат
        const validation = await this.validateRefinement(originalEpisode, refined);

        if (validation.accepted) {
          // Заменяем в статье
          const idx = article.episodes.findIndex(e => e.id === analysis.episodeId);
          article.episodes[idx] = refined;
          
          result.completed++;
          result.improvements.push({
            episodeId: analysis.episodeId,
            aiReduction: validation.improvement.aiReduction
          });
          
          console.log(`✅ Episode #${analysis.episodeId}: AI улучшился на ${validation.improvement.aiReduction}%`);
        } else {
          result.failed++;
          console.log(`❌ Episode #${analysis.episodeId}: валидация не прошла`);
          validation.issues.forEach(issue => console.log(`   • ${issue}`));
        }
      } catch (error) {
        result.failed++;
        console.error(`❌ Error processing episode:`, error);
      }
    }

    result.duration = Date.now() - startTime;

    console.log(
      `\n📊 AutoFix завершён: ${result.completed} успешно, ${result.failed} ошибок`
    );

    return result;
  }

  /**
   * HELPERS
   */
  private buildRefinementPrompt(
    episode: Episode,
    aiAnalysis: any,
    engagement: EngagementAnalysis,
    targetEngagement: number
  ): string {
    return `
🔴 РЕЖИМ ПЕРЕДЕЛКИ ЭПИЗОДА (потому что выявлен как AI-написанный)

ЭПИЗОД #${episode.id}: "${episode.title}"

⚠️ ПРОБЛЕМА: 
- AI-уверенность: ${aiAnalysis.analysis.ai_detection}%
- Интересность текущего: ${engagement.score}/100

✅ ЧТО НАДО СДЕЛАТЬ:

1. ПЕРЕПИСАТЬ натуральнее (убрать AI маркеры):
${(aiAnalysis.details?.ai_patterns || []).slice(0, 3).map((m: string) => `   • ${m}`).join('\n')}

2. СОХРАНИТЬ структуру (события, диалоги, сюжет)

3. СДЕЛАТЬ ИНТЕРЕСНЫМ (целевой engagement ${targetEngagement}/100):
   ${engagement.recommendations?.slice(0, 2).map(r => `✅ ${r}`).join('\n   ')}

4. ЧЕЛОВЕЧЕСКИЕ маркеры (обязательно!):
   - Разговорные слова: "ну", "типа", "как бы", "кстати"
   - Сомнения: "не знаю почему", "может быть я ошибалась"
   - Неправильная грамматика там где естественно

5. ❌ НЕЛЬЗЯ:
   - Менять основную линию сюжета
   - Опускать важные события
   - Менять размер более чем на 10%

Выведи ТОЛЬКО новый текст эпизода. Никаких комментариев!
`;
  }
}