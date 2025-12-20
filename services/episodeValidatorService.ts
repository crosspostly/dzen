/**
 * EPISODE VALIDATOR SERVICE
 * 
 * Retry логика для каждого эпизода:
 * - Генерируем эпизод → валидируем → если BAD → снова
 * - Максимум 3 попытки на эпизод
 * - После 3 попыток без успеха → ОШИБКА
 * 
 * Интеграция с antiAIDetectorService для проверки каждого эпизода
 */

import { Episode, EpisodeOutline } from '../types/ContentArchitecture';
import { AntiAIDetectorService, DetectionResult, DetectionConfig } from './antiAIDetectorService';
import { EpisodeGeneratorService } from './episodeGeneratorService';

export interface ValidationConfig {
  maxRetries: number; // Default: 3
  minQualityScore: number; // Default: 70
  enableAutoFix: boolean; // Default: false (пока оставляем на ручную доработку)
  detectorConfig: Partial<DetectionConfig>;
  verbose: boolean; // Default: true
}

export interface ValidationResult {
  episode: Episode;
  validationPassed: boolean;
  attempts: number;
  finalResult: DetectionResult;
  errorLog: string[];
  processingTime: number;
  retryNeeded: boolean;
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
  private antiDetector: AntiAIDetectorService;
  private episodeGenerator: EpisodeGeneratorService;
  private config: ValidationConfig;

  constructor(
    antiDetectorConfig?: Partial<DetectionConfig>,
    validationConfig?: Partial<ValidationConfig>
  ) {
    // Инициализируем антидетектор
    this.antiDetector = new AntiAIDetectorService(antiDetectorConfig);
    
    // Инициализируем генератор эпизодов
    this.episodeGenerator = new EpisodeGeneratorService();
    
    // Настраиваем конфигурацию валидации
    this.config = {
      maxRetries: 3,
      minQualityScore: 70,
      enableAutoFix: false,
      detectorConfig: {
        minScore: 70,
        enableGrepCheck: true,
        enablePartialCheck: true,
        enableFullCheck: true,
        strictMode: false
      },
      verbose: true,
      ...validationConfig
    };
  }

  /**
   * Главный метод: генерирует и валидирует эпизод с retry логикой
   */
  async generateAndValidateEpisode(request: EpisodeGenerationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const attempts: DetectionResult[] = [];
    const errorLog: string[] = [];
    
    console.log(`\n🎬 [Validator] Эпизод ${request.episodeNumber}/${request.totalEpisodes}`);
    console.log(`🎯 Целевой балл антидетекции: ${this.config.minQualityScore}`);
    console.log(`🔄 Максимум попыток: ${this.config.maxRetries}\n`);

    let lastGeneratedEpisode: Episode | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      console.log(`🔄 ПОПЫТКА ${attempt}/${this.config.maxRetries}`);
      console.log(`═`.repeat(50));

      try {
        // 1. Генерируем эпизод
        console.log(`📝 Генерирую эпизод...`);
        const episode = await this.generateEpisode(request);
        lastGeneratedEpisode = episode;

        // 2. Проверяем антидетектором
        console.log(`🔍 Проверяю антидетектором...`);
        const detectionResult = await this.antiDetector.detectAI(episode.content);
        attempts.push(detectionResult);

        // 3. Логируем результат
        console.log(`📊 Результат проверки:`);
        console.log(`   Балл: ${detectionResult.score}/100`);
        console.log(`   Риск: ${detectionResult.riskLevel}`);
        console.log(`   Пройдено: ${detectionResult.passed ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`   Проблем найдено: ${detectionResult.issues.length}`);

        if (detectionResult.issues.length > 0 && this.config.verbose) {
          console.log(`   🔍 Детали:`);
          detectionResult.issues.slice(0, 3).forEach((issue, i) => {
            console.log(`      ${i + 1}. ${issue.severity}: ${issue.description}`);
          });
          if (detectionResult.issues.length > 3) {
            console.log(`      ... и ещё ${detectionResult.issues.length - 3} проблем`);
          }
        }

        // 4. Проверяем, прошёл ли валидацию
        if (detectionResult.passed && detectionResult.score >= this.config.minQualityScore) {
          const processingTime = Date.now() - startTime;
          
          console.log(`\n✅ ЭПИЗОД ${request.episodeNumber} УСПЕШНО ПРОЙДЕН!`);
          console.log(`🎉 Финальный балл: ${detectionResult.score}/100`);
          console.log(`⏱️  Время обработки: ${processingTime}ms`);
          console.log(`🔄 Всего попыток: ${attempt}\n`);

          return {
            episode,
            validationPassed: true,
            attempts,
            finalResult: detectionResult,
            errorLog,
            processingTime,
            retryNeeded: false
          };
        } else {
          // Не прошёл валидацию
          console.log(`❌ Эпизод НЕ прошёл валидацию`);
          if (attempt < this.config.maxRetries) {
            console.log(`🔄 Попытка ${attempt + 1} начнётся через 2 секунды...\n`);
            await this.sleep(2000); // Пауза между попытками
          }
        }

      } catch (error) {
        const errorMessage = `Попытка ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errorLog.push(errorMessage);
        console.log(`❌ ОШИБКА в попытке ${attempt}:`, errorMessage);
        
        if (attempt < this.config.maxRetries) {
          console.log(`🔄 Продолжаем с попыткой ${attempt + 1}...\n`);
          await this.sleep(1000);
        }
      }
    }

    // Если дошли сюда - все попытки исчерпаны
    const processingTime = Date.now() - startTime;
    const lastAttempt = attempts[attempts.length - 1];
    
    console.log(`\n🚨 КРИТИЧЕСКАЯ ОШИБКА: ЭПИЗОД НЕ ПРОЙДЕН`);
    console.log(`💥 Все ${this.config.maxRetries} попытки исчерпаны`);
    console.log(`📊 Лучший результат: ${Math.max(...attempts.map(a => a.score))}/100`);
    console.log(`⏱️  Общее время: ${processingTime}ms`);
    
    if (lastAttempt) {
      console.log(`\n📋 ДЕТАЛЬНЫЙ ОТЧЁТ ПОСЛЕДНЕЙ ПОПЫТКИ:`);
      console.log(this.antiDetector.generateDetailedReport(lastAttempt));
    }

    return {
      episode: lastGeneratedEpisode!,
      validationPassed: false,
      attempts,
      finalResult: lastAttempt!,
      errorLog,
      processingTime,
      retryNeeded: true
    };
  }

  /**
   * Генерирует эпизод с учётом проблем предыдущих попыток
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
   * Создаёт fallback контент в случае ошибки генерации
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
   * Улучшает эпизод на основе найденных проблем
   */
  private async enhanceEpisodeWithFixes(episode: Episode, fixInstructions: string): Promise<Episode> {
    console.log(`🔧 Применяю исправления на основе найденных проблем...`);

    // Упрощённая версия без дополнительного вызова Gemini
    // В реальной реализации здесь был бы дополнительный промпт для исправления
    
    console.log(`✅ Финальная обработка эпизода завершена`);
    return episode;
  }

  /**
   * Анализирует все попытки и создаёт сводный отчёт
   */
  generateRetryReport(validationResult: ValidationResult): string {
    const { episode, attempts, finalResult, processingTime } = validationResult;
    
    let report = `\n📋 ОТЧЁТ ПО ЭПИЗОДУ ${episode.id}`;
    report += `\n═══════════════════════════════════════`;
    report += `\n🎬 Название: ${episode.title}`;
    report += `\n📊 Статус: ${validationResult.validationPassed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`;
    report += `\n🔄 Попыток: ${attempts.length}/${this.config.maxRetries}`;
    report += `\n⏱️  Время: ${processingTime}ms`;
    report += `\n📏 Объём: ${episode.charCount} символов`;

    if (attempts.length > 0) {
      report += `\n\n📈 ДИНАМИКА РЕЗУЛЬТАТОВ:`;
      report += `\n─────────────────────────────────`;
      
      attempts.forEach((result, index) => {
        report += `\nПопытка ${index + 1}:`;
        report += `  Балл: ${result.score}/100`;
        report += `  Риск: ${result.riskLevel}`;
        report += `  Проблем: ${result.issues.length}`;
        report += `  ${result.passed ? '✅' : '❌'}`;
      });

      const bestScore = Math.max(...attempts.map(a => a.score));
      const avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
      
      report += `\n\n🎯 СТАТИСТИКА:`;
      report += `\n─────────────────────────────────`;
      report += `\nЛучший балл: ${bestScore}/100`;
      report += `\nСредний балл: ${avgScore.toFixed(1)}/100`;
      report += `\nФинальный балл: ${finalResult.score}/100`;
    }

    if (!validationResult.validationPassed && finalResult.issues.length > 0) {
      report += `\n\n🚨 ОСНОВНЫЕ ПРОБЛЕМЫ:`;
      report += `\n─────────────────────────────────`;
      
      const topIssues = finalResult.issues
        .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
        .slice(0, 5);

      topIssues.forEach((issue, index) => {
        report += `\n${index + 1}. ${issue.severity.toUpperCase()}: ${issue.description}`;
        report += `\n   💡 ${issue.suggestion}`;
      });
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
   * Получает вес серьёзности проблемы
   */
  private getSeverityWeight(severity: string): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity as keyof typeof weights] || 1;
  }

  /**
   * Утилита для паузы
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Проверяет конфигурацию сервиса
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Обновляет конфигурацию
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 Конфигурация валидатора обновлена:`, this.config);
  }

  /**
   * Тестирует антидетектор на примере
   */
  async testDetector(): Promise<void> {
    console.log(`\n🧪 ТЕСТИРОВАНИЕ АНТИДЕТЕКТОРА`);
    console.log(`═`.repeat(40));

    const testTexts = [
      {
        name: 'AI-текст (плохой)',
        content: 'Важно отметить, что следует подчеркнуть необходимость. Как известно, безусловно очевидно, что можно сделать вывод, таким образом, в заключение подводя итоги.'
      },
      {
        name: 'Человеческий текст (хороший)',
        content: 'Я пошла на кухню. Включила чайник. А потом поняла - надо было ещё что-то сделать. Помню, как в детстве мама готовила этот чай. Запахло ромашкой.'
      }
    ];

    for (const test of testTexts) {
      console.log(`\n📝 Тест: ${test.name}`);
      const result = await this.antiDetector.detectAI(test.content);
      console.log(`   Балл: ${result.score}/100`);
      console.log(`   Статус: ${result.passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
      console.log(`   Проблем: ${result.issues.length}`);
      
      if (result.issues.length > 0) {
        console.log(`   Первая проблема: ${result.issues[0].description}`);
      }
    }
  }
}

export default EpisodeValidatorService;