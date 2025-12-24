/**
 * 🚪 ARTICLE PUBLISH GATE (v6.0 - Уровень 3)
 * 
 * Финальная валидация статьи перед публикацией.
 * Проверяет на критические ошибки и выставляет оценку качества.
 * 
 * Проверки:
 * - Критические ошибки (артефакты, метаданные) → REJECT
 * - Warnings (странные повторения) → LOG но не REJECT
 * - Quality score < 70 → REJECT
 * - Quality score >= 80 → PUBLISH
 * 
 * Использование:
 * const validation = ArticlePublishGate.validateBeforePublish(article);
 * if (!validation.canPublish) {
 *   throw new Error('Quality check failed');
 * }
 */

import { FinalArticleCleanupGate } from './finalArticleCleanupGate';

interface PublishValidation {
  canPublish: boolean;
  score: number; // 0-100
  errors: string[]; // Критические ошибки (REJECT)
  warnings: string[]; // Некритичные предупреждения (LOG)
  metrics: {
    length: number;
    hasMetadata: boolean;
    hasMarkdown: boolean;
    repeatedPhrasesCount: number;
    orphanedFragmentsCount: number;
    readability: 'excellent' | 'good' | 'poor';
  };
}

/**
 * 🚦 КРИТЕРИИ ВАЛИДАЦИИ
 */
const VALIDATION_CRITERIA = {
  // Минимальная длина статьи
  MIN_LENGTH: 8000, // 8K символов (очень короткая статья)
  
  // Максимальная длина статьи
  MAX_LENGTH: 50000, // 50K символов (слишком длинная)
  
  // Минимальный quality score для публикации
  MIN_QUALITY_SCORE: 70,
  
  // Отличный quality score
  EXCELLENT_QUALITY_SCORE: 85,
  
  // Максимум повторений одной фразы
  MAX_PHRASE_REPETITIONS: 3,
  
  // Максимум orphaned фрагментов
  MAX_ORPHANED_FRAGMENTS: 8
};

export class ArticlePublishGate {
  /**
   * 🚪 ГЛАВНАЯ ФУНКЦИЯ: Валидация перед публикацией
   * 
   * Возвращает:
   * - canPublish: true/false
   * - score: 0-100
   * - errors: критические ошибки
   * - warnings: некритичные предупреждения
   */
  static validateBeforePublish(article: string): PublishValidation {
    console.log('\n🚪 [ArticlePublishGate] Validating article before publish...');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // 1. Проверка длины
    const length = article.length;
    console.log(`   Length: ${length} chars`);
    
    if (length < VALIDATION_CRITERIA.MIN_LENGTH) {
      errors.push(`Article too short: ${length} chars (min: ${VALIDATION_CRITERIA.MIN_LENGTH})`);
      score -= 40;
    } else if (length > VALIDATION_CRITERIA.MAX_LENGTH) {
      errors.push(`Article too long: ${length} chars (max: ${VALIDATION_CRITERIA.MAX_LENGTH})`);
      score -= 30;
    }

    // 2. Анализ на артефакты (через FinalArticleCleanupGate)
    const analysis = FinalArticleCleanupGate.analyzeForIssues(article);
    
    console.log(`   Analysis: ${analysis.hasIssues ? 'Issues found' : 'Clean'}`);
    console.log(`   Severity: ${analysis.severity.toUpperCase()}`);

    // 3. Критические ошибки (REJECT)
    if (analysis.metadata?.metadataComments && analysis.metadata.metadataComments > 0) {
      errors.push(`Metadata/comments found: ${analysis.metadata.metadataComments} instances`);
      score -= 30;
    }

    if (analysis.metadata?.markdownCount && analysis.metadata.markdownCount > 2) {
      errors.push(`Markdown syntax found: ${analysis.metadata.markdownCount} instances`);
      score -= 20;
    }

    // 4. Повторяющиеся фразы (WARNING или ERROR)
    if (analysis.metadata?.repeatedPhrases && analysis.metadata.repeatedPhrases.length > 0) {
      analysis.metadata.repeatedPhrases.forEach(p => {
        if (p.count > VALIDATION_CRITERIA.MAX_PHRASE_REPETITIONS) {
          errors.push(`Phrase "${p.phrase}" repeated ${p.count} times (max: ${VALIDATION_CRITERIA.MAX_PHRASE_REPETITIONS})`);
          score -= (p.count - VALIDATION_CRITERIA.MAX_PHRASE_REPETITIONS) * 5;
        } else {
          warnings.push(`Phrase "${p.phrase}" repeated ${p.count} times`);
          score -= 3;
        }
      });
    }

    // 5. Orphaned фрагменты (WARNING)
    if (analysis.metadata?.orphanedFragments && analysis.metadata.orphanedFragments > VALIDATION_CRITERIA.MAX_ORPHANED_FRAGMENTS) {
      warnings.push(`Too many orphaned fragments: ${analysis.metadata.orphanedFragments} (max: ${VALIDATION_CRITERIA.MAX_ORPHANED_FRAGMENTS})`);
      score -= Math.floor((analysis.metadata.orphanedFragments - VALIDATION_CRITERIA.MAX_ORPHANED_FRAGMENTS) / 2);
    }

    // 6. Severity штрафы
    if (analysis.severity === 'critical') {
      errors.push('Article severity: CRITICAL - requires cleanup');
      score -= 30;
    } else if (analysis.severity === 'medium') {
      warnings.push('Article severity: MEDIUM - consider cleanup');
      score -= 10;
    }

    // 7. Readability оценка (упрощенная)
    const readability = this.assessReadability(article);
    console.log(`   Readability: ${readability.toUpperCase()}`);
    
    if (readability === 'poor') {
      warnings.push('Poor readability detected');
      score -= 10;
    }

    // 8. Финальный score (0-100)
    score = Math.max(0, Math.min(100, score));
    
    // 9. Определение canPublish
    const canPublish = errors.length === 0 && score >= VALIDATION_CRITERIA.MIN_QUALITY_SCORE;

    // 10. Логирование результата
    console.log(`\n   📊 VALIDATION RESULT:`);
    console.log(`      Score: ${score}/100`);
    console.log(`      Can Publish: ${canPublish ? '✅ YES' : '❌ NO'}`);
    console.log(`      Errors: ${errors.length}`);
    console.log(`      Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log(`\n   ❌ ERRORS:`);
      errors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n   ⚠️  WARNINGS:`);
      warnings.forEach((warn, i) => console.log(`      ${i + 1}. ${warn}`));
    }

    if (canPublish) {
      if (score >= VALIDATION_CRITERIA.EXCELLENT_QUALITY_SCORE) {
        console.log(`\n   🎉 EXCELLENT QUALITY! Ready to publish.`);
      } else {
        console.log(`\n   ✅ GOOD QUALITY. Ready to publish.`);
      }
    } else {
      console.log(`\n   🚫 QUALITY CHECK FAILED. Article needs cleanup.`);
    }

    return {
      canPublish,
      score,
      errors,
      warnings,
      metrics: {
        length,
        hasMetadata: (analysis.metadata?.metadataComments || 0) > 0,
        hasMarkdown: (analysis.metadata?.markdownCount || 0) > 0,
        repeatedPhrasesCount: analysis.metadata?.repeatedPhrases?.length || 0,
        orphanedFragmentsCount: analysis.metadata?.orphanedFragments || 0,
        readability
      }
    };
  }

  /**
   * 📖 Оценка читабельности (упрощенная)
   * 
   * Проверяет:
   * - Средняя длина предложений
   * - Средняя длина параграфов
   * - Наличие диалогов
   */
  private static assessReadability(article: string): 'excellent' | 'good' | 'poor' {
    // Разбиваем на предложения
    const sentences = article.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    // Разбиваем на параграфы
    const paragraphs = article.split(/\n\n+/).filter(p => p.trim().length > 50);
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
    
    // Проверка на диалоги
    const hasDialogues = article.includes('—') && article.match(/—/g)!.length > 5;
    
    // Оценка
    let score = 0;
    
    // Предложения: 100-200 символов идеально
    if (avgSentenceLength >= 100 && avgSentenceLength <= 200) {
      score += 3;
    } else if (avgSentenceLength < 80 || avgSentenceLength > 250) {
      score += 1;
    } else {
      score += 2;
    }
    
    // Параграфы: 300-600 символов идеально
    if (avgParagraphLength >= 300 && avgParagraphLength <= 600) {
      score += 3;
    } else if (avgParagraphLength < 200 || avgParagraphLength > 800) {
      score += 1;
    } else {
      score += 2;
    }
    
    // Диалоги: хорошо если есть
    if (hasDialogues) {
      score += 2;
    }
    
    // Маппинг score → readability
    if (score >= 7) {
      return 'excellent';
    } else if (score >= 5) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * 🎯 Быстрая проверка: может ли статья быть опубликована
   */
  static canPublish(article: string): boolean {
    const validation = this.validateBeforePublish(article);
    return validation.canPublish;
  }

  /**
   * 📊 Получить только score
   */
  static getQualityScore(article: string): number {
    const validation = this.validateBeforePublish(article);
    return validation.score;
  }
}

// Export для использования в других модулях
export { PublishValidation, VALIDATION_CRITERIA };
