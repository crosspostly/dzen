/**
 * EPISODE VALIDATOR SERVICE v2.0
 * 
 * НОВЫЙ ПОДХОД: без retry циклов!
 * - Генерируем эпизод → проверяем доработанным антидетектором → автофиксируем → результат
 * - Валидация включена по умолчанию
 * - Автофикс включен по умолчанию
 * - ML-модель включена по умолчанию
 */

import { Episode, EpisodeOutline } from '../types/ContentArchitecture';
import { Phase2AntiDetectionService, type Phase2Options, type Phase2Result } from './phase2AntiDetectionService';
import { EpisodeGeneratorService } from './episodeGeneratorService';

export interface ValidationConfig {
  maxRetries: number; // Default: 1 (только одна попытка с автофиксом)
  minQualityScore: number; // Default: 75 (выше из-за автофикса)
  enableAutoFix: boolean; // Default: true (включен по умолчанию)
  enableMLModel: boolean; // Default: true (включен по умолчанию)
  detectorConfig: Partial<Phase2Options>;
  verbose: boolean; // Default: true
}

export interface ValidationResult {
  episode: Episode;
  validationPassed: boolean;
  attempts: number;
  finalResult: Phase2Result;
  errorLog: string[];
  processingTime: number;
  retryNeeded: boolean;
  improvementApplied: boolean; // 🆕 Был ли применён автофикс
  scoreImprovement: number; // 🆕 На сколько улучшился балл
}

export interface EpisodeGenerationRequest {
  episodeNumber: number;
  totalEpisodes: number;
  plotBible: any; // PlotBible данные
  previousContext: string; // Контекст от предыдущих эпизодов
  remainingBudget: number; // Сколько символов осталось для эпизода
  additionalInstructions?: string; // Дополнительные инструкции
}

export class EpisodeValidatorService {
  private antiDetector: Phase2AntiDetectionService;
  private episodeGenerator: EpisodeGeneratorService;
  private config: ValidationConfig;

  constructor(
    antiDetectorConfig?: Partial<Phase2Options>,
    validationConfig?: Partial<ValidationConfig>
  ) {
    // Инициализируем доработанный Phase2 антидетектор
    this.antiDetector = new Phase2AntiDetectionService();
    
    // Инициализируем генератор эпизодов
    this.episodeGenerator = new EpisodeGeneratorService();
    
    // Настраиваем конфигурацию валидации (валидация включена по умолчанию!)
    this.config = {
      maxRetries: 1, // Только одна попытка с автофиксом
      minQualityScore: 75, // Выше из-за автофикса
      enableAutoFix: true, // Автофикс включен по умолчанию
      enableMLModel: true, // ML-модель включена по умолчанию
      detectorConfig: {
        enableAutoFix: true,
        useMLModel: true,
        enableGatekeeper: true,
        applyPerplexity: true,
        applyBurstiness: true,
        applySkazNarrative: true,
        verbose: true
      },
      verbose: true,
      ...validationConfig
    };
  }

  /**
   * 🆕 Главный метод v2.0: генерирует и валидирует эпизод с автофиксом
   * Больше НЕТ retry циклов! Один раз генерируем + автофиксируем = результат
   */
  async generateAndValidateEpisode(request: EpisodeGenerationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const attempts: Phase2Result[] = [];
    const errorLog: string[] = [];
    
    console.log(`\n🎬 [Validator v2.0] Эпизод ${request.episodeNumber}/${request.totalEpisodes}`);
    console.log(`🎯 Целевой балл: ${this.config.minQualityScore} (с автофиксом)`);
    console.log(`🔧 Автофикс: ${this.config.enableAutoFix ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🧠 ML-модель: ${this.config.enableMLModel ? 'ENABLED' : 'DISABLED'}\n`);

    let lastGeneratedEpisode: Episode | null = null;

    // 🆕 НОВЫЙ ПОДХОД: только ОДНА попытка с автофиксом
    console.log(`🔄 ОДНА ПОПЫТКА С АВТОФИКСОМ`);
    console.log(`═`.repeat(50));

    try {
      // 1. Генерируем эпизод
      console.log(`📝 Генерирую эпизод...`);
      const episode = await this.generateEpisode(request);
      lastGeneratedEpisode = episode;

      // 2. Проверяем доработанным антидетектором с автофиксом
      console.log(`🔍 Проверяю с автофиксом...`);
      const detectionResult = await this.antiDetector.processArticle(
        episode.title,
        episode.content,
        {
          enableAutoFix: this.config.enableAutoFix,
          useMLModel: this.config.enableMLModel,
          enableGatekeeper: true,
          verbose: this.config.verbose,
          ...this.config.detectorConfig
        }
      );
      
      attempts.push(detectionResult);

      // 3. Логируем результат с детальной обратной связью
      console.log(`📊 Результат автофикса:`);
      console.log(`   Балл: ${detectionResult.adversarialScore.overallScore}/100`);
      console.log(`   Риск: ${detectionResult.adversarialScore.passesAllChecks ? 'LOW' : 'HIGH'}`);
      console.log(`   Пройдено: ${detectionResult.adversarialScore.overallScore >= this.config.minQualityScore ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`   Проблем найдено: ${detectionResult.feedback.issues.length}`);
      
      // 4. Показываем обратную связь
      if (detectionResult.feedback.issues.length > 0 && this.config.verbose) {
        console.log(`   🔍 Детальная обратная связь:`);
        detectionResult.feedback.issues.slice(0, 3).forEach((issue, i) => {
          console.log(`      ${i + 1}. ${issue.severity.toUpperCase()}: ${issue.problem}`);
          console.log(`         📍 Локация: ${issue.location}`);
          console.log(`         💡 Решение: ${issue.fixSuggestions[0] || 'См. ML-рекомендации'}`);
        });
        if (detectionResult.feedback.issues.length > 3) {
          console.log(`      ... и ещё ${detectionResult.feedback.issues.length - 3} проблем`);
        }
      }

      // 5. Показываем результат автофикса
      if (detectionResult.autoFixResult?.applied) {
        console.log(`   🔧 Автофикс применён:`);
        console.log(`      Улучшений: ${detectionResult.autoFixResult.improvementsApplied.length}`);
        console.log(`      Улучшение балла: +${detectionResult.autoFixResult.improvementAmount} очков`);
        console.log(`      Новый балл: ${detectionResult.autoFixResult.finalScore}/100`);
      }

      // 6. Проверяем результат
      const isPassed = detectionResult.adversarialScore.overallScore >= this.config.minQualityScore;
      const processingTime = Date.now() - startTime;
      
      if (isPassed) {
        console.log(`\n✅ ЭПИЗОД ${request.episodeNumber} УСПЕШНО ПРОЙДЕН!`);
        console.log(`🎉 Финальный балл: ${detectionResult.adversarialScore.overallScore}/100`);
        console.log(`⏱️  Время обработки: ${processingTime}ms`);
        console.log(`🔧 Автофикс: ${detectionResult.autoFixResult?.applied ? 'ПРИМЕНЁН' : 'НЕ НУЖЕН'}\n`);
      } else {
        console.log(`\n⚠️  ЭПИЗОД ${request.episodeNumber} ТРЕБУЕТ ДОРАБОТКИ`);
        console.log(`📊 Текущий балл: ${detectionResult.adversarialScore.overallScore}/${this.config.minQualityScore}`);
        console.log(`💡 Рекомендации: ${detectionResult.feedback.mlRecommendations.join(', ')}`);
        console.log(`🔧 Автофикс применён: ${detectionResult.autoFixResult?.applied ? 'ДА' : 'НЕТ'}\n`);
      }

      return {
        episode: {
          ...episode,
          content: detectionResult.processedContent, // Используем улучшенный контент
          charCount: detectionResult.processedContent.length
        },
        validationPassed: isPassed,
        attempts,
        finalResult: detectionResult,
        errorLog,
        processingTime,
        retryNeeded: false, // Больше нет retry
        improvementApplied: detectionResult.autoFixResult?.applied || false,
        scoreImprovement: detectionResult.autoFixResult?.improvementAmount || 0
      };

    } catch (error) {
      const errorMessage = `Попытка 1: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errorLog.push(errorMessage);
      console.log(`❌ ОШИБКА:`, errorMessage);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`\n🚨 КРИТИЧЕСКАЯ ОШИБКА: ЭПИЗОД НЕ ОБРАБОТАН`);
      console.log(`💥 Генерация или валидация завершилась с ошибкой`);
      console.log(`⏱️  Время до ошибки: ${processingTime}ms`);
      
      return {
        episode: lastGeneratedEpisode!,
        validationPassed: false,
        attempts,
        finalResult: attempts[0] || {} as Phase2Result,
        errorLog,
        processingTime,
        retryNeeded: false,
        improvementApplied: false,
        scoreImprovement: 0
      };
    }
  }

  /**
   * 🆕 Генерирует эпизод (упрощённая версия)
   */
  private async generateEpisode(request: EpisodeGenerationRequest): Promise<Episode> {
    console.log(`📝 Generating episode using EpisodeGeneratorService...`);
    
    // Создаём EpisodeOutline из запроса
    const outline: EpisodeOutline = {
      id: request.episodeNumber,
      title: `Эпизод ${request.episodeNumber}`,
      hookQuestion: request.plotBible?.theme || 'Что произойдёт дальше?',
      externalConflict: request.additionalInstructions || 'Основной конфликт эпизода',
      internalConflict: 'Внутренний конфликт персонажа',
      keyTurning: 'Поворотный момент эпизода',
      openLoop: request.plotBible?.openLoop || 'Неразрешённый вопрос'
    };

    try {
      // Используем EpisodeGeneratorService для генерации
      const episode = await this.episodeGenerator.generateSingleEpisode(
        outline,
        [], // previousEpisodes (пока пустой, контекст передаём отдельно)
        request.remainingBudget,
        request.episodeNumber,
        request.totalEpisodes
      );

      console.log(`✅ Episode generated: ${episode.charCount} chars`);
      return episode;

    } catch (error) {
      console.log(`❌ Episode generation failed:`, error);
      
      // Создаём fallback эпизод в случае ошибки
      const fallbackContent = this.createFallbackContent(request);
      
      return {
        id: request.episodeNumber,
        title: `Эпизод ${request.episodeNumber}`,
        content: fallbackContent,
        charCount: fallbackContent.length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: 'draft'
      };
    }
  }

  /**
   * 🆕 Создаёт fallback контент в случае ошибки
   */
  private createFallbackContent(request: EpisodeGenerationRequest): string {
    return `
Эпизод ${request.episodeNumber}

Всё произошло неожиданно. Я думала, что знаю, что будет дальше, но оказалось - была не права.

— Что случилось? — спросила я.
— Не знаю, — ответила она. — Просто... всё изменилось.

Я посмотрела в окно. На улице шёл дождь. Холодные капли стучали по стеклу.

"Иногда жизнь поворачивается так, как мы не ожидаем," - подумала я.

И тут случилось то, что изменило всё.
    `.trim();
  }

  /**
   * 🆕 Анализирует все попытки и создаёт сводный отчёт
   */
  generateRetryReport(validationResult: ValidationResult): string {
    const { episode, attempts, finalResult, processingTime } = validationResult;
    
    let report = `\n📋 ОТЧЁТ ПО ЭПИЗОДУ ${episode.id}`;
    report += `\n═══════════════════════════════════════`;
    report += `\n🎬 Название: ${episode.title}`;
    report += `\n📊 Статус: ${validationResult.validationPassed ? '✅ ПРОЙДЕН' : '⚠️  ТРЕБУЕТ ДОРАБОТКИ'}`;
    report += `\n🔄 Попыток: ${attempts.length} (1 попытка + автофикс)`;
    report += `\n⏱️  Время: ${processingTime}ms`;
    report += `\n📏 Объём: ${episode.charCount} символов`;
    report += `\n🔧 Автофикс: ${validationResult.improvementApplied ? 'ПРИМЕНЁН' : 'НЕ ПРИМЕНЯЛСЯ'}`;
    report += `\n📈 Улучшение: ${validationResult.scoreImprovement > 0 ? '+' : ''}${validationResult.scoreImprovement} очков`;

    if (attempts.length > 0) {
      const result = attempts[0];
      report += `\n\n📊 РЕЗУЛЬТАТ АНТИДЕТЕКЦИИ:`;
      report += `\n─────────────────────────────────`;
      report += `\nОбщий балл: ${result.adversarialScore.overallScore}/100`;
      report += `\nРиск: ${result.adversarialScore.passesAllChecks ? 'Низкий' : 'Высокий'}`;
      report += `\nПроблем: ${result.feedback.issues.length}`;
      
      if (result.autoFixResult?.applied) {
        report += `\n\n🔧 АВТОФИКС:`;
        report += `\n─────────────────────────────────`;
        report += `\nПрименено улучшений: ${result.autoFixResult.improvementsApplied.length}`;
        report += `\nУлучшение балла: +${result.autoFixResult.improvementAmount}`;
      }
    }

    if (!validationResult.validationPassed && finalResult.feedback.issues.length > 0) {
      report += `\n\n🚨 ОСНОВНЫЕ ПРОБЛЕМЫ:`;
      report += `\n─────────────────────────────────`;
      
      const topIssues = finalResult.feedback.issues.slice(0, 5);
      topIssues.forEach((issue, index) => {
        report += `\n${index + 1}. ${issue.severity.toUpperCase()}: ${issue.problem}`;
        report += `\n   💡 ${issue.fixSuggestions[0] || 'См. ML-рекомендации'}`;
      });
      
      if (finalResult.feedback.mlRecommendations.length > 0) {
        report += `\n\n🧠 ML-РЕКОМЕНДАЦИИ:`;
        report += `\n─────────────────────────────────`;
        finalResult.feedback.mlRecommendations.forEach(rec => {
          report += `\n• ${rec}`;
        });
      }
    }

    if (validationResult.errorLog.length > 0) {
      report += `\n\n❌ ОШИБКИ:`;
      report += `\n─────────────────────────────────`;
      validationResult.errorLog.forEach(error => {
        report += `\n• ${error}`;
      });
    }

    report += `\n\n═══════════════════════════════════════\n`;
    
    return report;
  }

  /**
   * 🆕 Получает статистику ML-модели
   */
  getMLStats(): any {
    return this.antiDetector.getMLStats();
  }

  /**
   * 🆕 Экспорт/импорт ML-модели для репозитория
   */
  exportMLModel(): string {
    return this.antiDetector.exportMLModel();
  }

  importMLModel(jsonData: string): void {
    this.antiDetector.importMLModel(jsonData);
  }

  /**
   * 🆕 Быстрая проверка контента
   */
  quickCheck(content: string): any {
    return this.antiDetector.quickCheck(content);
  }
}

export default EpisodeValidatorService;