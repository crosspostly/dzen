/**
 * ADVERSARIAL GATEKEEPER
 * 
 * Status: Future Implementation (v4.5, Dec 22-23, 2025)
 * Purpose: Quality gate and detection simulator for anti-detection system
 * Current Status: Not used in v4.0.2, planned for Phase 2
 * 
 * Integration: Works with phase2AntiDetectionService in v4.5
 * Dependencies: phase2AntiDetectionService
 * 
 * Simulates detection tools:
 * - ZeroGPT
 * - Originality.ai
 * - Turnitin
 * - Copyscape
 * 
 * See: ZENMASTER_COMPLETE_ROADMAP.md for details
 */

import { AdversarialScore } from "../types/ContentArchitecture";
import { PerplexityController } from "./perplexityController";
import { BurstinessOptimizer } from "./burstinessOptimizer";
import { SkazNarrativeEngine } from "./skazNarrativeEngine";

export class AdversarialGatekeeper {
  private perplexityController: PerplexityController;
  private burstinessOptimizer: BurstinessOptimizer;
  private skazEngine: SkazNarrativeEngine;

  // Пороги для Dzen
  private minContentLength: number = 10000; // символов
  private maxContentLength: number = 30000; // символов
  private minReadingTime: number = 3; // минут
  private maxReadingTime: number = 20; // минут

  // Clickbait стоп-слова
  private clickbaitKeywords: string[] = [
    "вы не поверите", "невероятно", "шокирующий", "скандальный",
    "умрет", "невероятный", "невероятно", "это изменит вашу жизнь",
    "врачи в шоке", "одна странная уловка", "большие знаменитости ненавидят это",
    "трюк", "лайфхак", "секрет", "финансовые советы",
    "!!!", "???", "****", "СРОЧНО", "СЕЙЧАС", "НЕМЕДЛЕННО"
  ];

  constructor() {
    this.perplexityController = new PerplexityController();
    this.burstinessOptimizer = new BurstinessOptimizer();
    this.skazEngine = new SkazNarrativeEngine();
  }

  /**
   * Основной метод: оценить статью перед публикацией
   */
  public assessArticle(
    title: string,
    content: string,
    images?: string[]
  ): AdversarialScore {
    const issues: string[] = [];

    // 1. Проверяем Perplexity
    const perplexityMetrics = this.perplexityController.analyzePerplexity(content);
    const perplexityScore = Math.min(100, perplexityMetrics.score * 25); // нормализуем 0-5 в 0-100

    // 2. Проверяем Burstiness
    const burstinessMetrics = this.burstinessOptimizer.analyzeBurstiness(content);
    const burstinessScore = this.calculateBurstinessScore(burstinessMetrics.standardDeviation);

    // 3. Проверяем Skaz (русскость)
    const skazMetrics = this.skazEngine.analyzeSkazMetrics(content);
    const skazRussianness = skazMetrics.score;

    // 4. Проверяем длину контента
    const { contentLengthScore, contentIssues } = this.checkContentLength(content);

    // 5. Проверяем на clickbait
    const { noClichésScore, clickbaitIssues } = this.checkClickbait(title, content);

    // Собираем все проблемы
    issues.push(...contentIssues);
    issues.push(...clickbaitIssues);

    // Добавляем специфичные проблемы
    if (perplexityMetrics.score < 2.0) {
      issues.push("❌ Низкая перплексити (слишком предсказуемо для AI детектора)");
    }

    if (burstinessMetrics.standardDeviation < 3.0) {
      issues.push("⚠️ Очень однородная длина предложений (признак AI)");
    }

    if (skazMetrics.score < 50) {
      issues.push("⚠️ Недостаточно русских литературных приёмов");
    }

    if (skazMetrics.particleCount < 3) {
      issues.push("⚠️ Мало русских частиц (добавьте 'ведь', 'же', 'ну')");
    }

    // Вычисляем общий скор
    const overallScore = Math.round(
      (perplexityScore * 0.2) +
      (burstinessScore * 0.25) +
      (skazRussianness * 0.35) +
      (contentLengthScore * 0.1) +
      (noClichésScore * 0.1)
    );

    const passesAllChecks = overallScore >= 80;

    return {
      perplexity: Math.round(perplexityScore),
      burstiness: Math.round(burstinessScore),
      skazRussianness: Math.round(skazRussianness),
      contentLength: Math.round(contentLengthScore),
      noClichés: Math.round(noClichésScore),
      overallScore,
      passesAllChecks,
      issues,
    };
  }

  /**
   * Вычисляем скор для Burstiness (0-100)
   */
  private calculateBurstinessScore(stdDev: number): number {
    // Целевой диапазон: 6-10
    if (stdDev >= 7.0) {
      return 100;
    } else if (stdDev >= 5.0) {
      return 75 + (stdDev - 5.0) * 12.5;
    } else if (stdDev >= 3.0) {
      return 50 + (stdDev - 3.0) * 12.5;
    } else if (stdDev >= 1.5) {
      return 25 + (stdDev - 1.5) * 16.67;
    } else {
      return Math.min(25, stdDev * 16.67);
    }
  }

  /**
   * Проверяем длину контента
   */
  private checkContentLength(content: string): { contentLengthScore: number; contentIssues: string[] } {
    const issues: string[] = [];
    let score = 100;

    const charCount = content.length;
    const wordCount = content.match(/\b\w+\b/g)?.length || 0;
    const readingTime = Math.ceil(wordCount / 200); // примерно 200 слов в минуту

    if (charCount < this.minContentLength) {
      issues.push(`❌ Слишком короткий контент (${charCount} символов, минимум ${this.minContentLength})`);
      score = Math.max(0, score - 30);
    }

    if (charCount > this.maxContentLength) {
      issues.push(`❌ Слишком длинный контент (${charCount} символов, максимум ${this.maxContentLength})`);
      score = Math.max(0, score - 20);
    }

    if (readingTime < this.minReadingTime) {
      issues.push(`⚠️ Время чтения слишком мало (${readingTime} мин, минимум ${this.minReadingTime})`);
      score = Math.max(0, score - 15);
    }

    if (readingTime > this.maxReadingTime) {
      issues.push(`⚠️ Время чтения слишком много (${readingTime} мин, максимум ${this.maxReadingTime})`);
      score = Math.max(0, score - 10);
    }

    return {
      contentLengthScore: score,
      contentIssues: issues,
    };
  }

  /**
   * Проверяем на clickbait и клише
   */
  private checkClickbait(title: string, content: string): { noClichésScore: number; clickbaitIssues: string[] } {
    const issues: string[] = [];
    let score = 100;

    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    const combined = lowerTitle + " " + lowerContent;

    // Проверяем clickbait ключевые слова
    let clickbaitCount = 0;
    for (const keyword of this.clickbaitKeywords) {
      if (combined.includes(keyword)) {
        clickbaitCount++;
      }
    }

    if (clickbaitCount > 3) {
      issues.push(`❌ Обнаружено слишком много clickbait элементов (${clickbaitCount})`);
      score = Math.max(0, score - 40);
    } else if (clickbaitCount > 1) {
      issues.push(`⚠️ Обнаружены элементы clickbait (${clickbaitCount})`);
      score = Math.max(0, score - 15);
    }

    // Проверяем стандартные клише
    const clichés = [
      "к сожалению", "как известно", "однако", "тем не менее",
      "в целом", "можно сказать", "в общем", "следует отметить"
    ];

    let clichéCount = 0;
    for (const cliche of clichés) {
      const matches = combined.match(new RegExp(`\\b${cliche}\\b`, "gi"));
      clichéCount += matches ? matches.length : 0;
    }

    if (clichéCount > 5) {
      issues.push(`⚠️ Слишком много корпоративных клише (${clichéCount})`);
      score = Math.max(0, score - 10);
    }

    return {
      noClichésScore: score,
      clickbaitIssues: issues,
    };
  }

  /**
   * Выводит подробный отчет о статье
   */
  public generateReport(score: AdversarialScore): string {
    const divider = "═".repeat(60);
    const lines: string[] = [
      divider,
      "📊 ADVERSARIAL GATEKEEPER ASSESSMENT REPORT",
      divider,
      "",
      `📈 Overall Score: ${score.overallScore}/100 ${score.passesAllChecks ? "✅" : "❌"}`,
      "",
      "Component Scores:",
      `  • Perplexity (Entropy):        ${score.perplexity}/100`,
      `  • Burstiness (Variation):       ${score.burstiness}/100`,
      `  • Skaz (Russian Literary):      ${score.skazRussianness}/100`,
      `  • Content Length:               ${score.contentLength}/100`,
      `  • No Clichés/Clickbait:         ${score.noClichés}/100`,
      "",
      "Status:",
      score.passesAllChecks 
        ? "✅ READY FOR PUBLICATION (Score ≥ 80)" 
        : "❌ NEEDS REVISION (Score < 80)",
      "",
    ];

    if (score.issues.length > 0) {
      lines.push("Issues Found:");
      for (const issue of score.issues) {
        lines.push(`  ${issue}`);
      }
      lines.push("");
    }

    lines.push(divider);

    return lines.join("\n");
  }

  /**
   * Получить рекомендации по улучшению
   */
  public getRecommendations(score: AdversarialScore): string[] {
    const recommendations: string[] = [];

    if (score.perplexity < 60) {
      recommendations.push("Замените частые слова на редкие синонимы для повышения энтропии");
    }

    if (score.burstiness < 60) {
      recommendations.push("Варьируйте длину предложений: добавьте короткие фразы и длинные конструкции");
    }

    if (score.skazRussianness < 60) {
      recommendations.push("Добавьте русские частицы (ведь, же, ну) и литературные приёмы");
    }

    if (score.contentLength < 60) {
      recommendations.push("Отрегулируйте длину контента до 1500-2500 символов");
    }

    if (score.noClichés < 60) {
      recommendations.push("Удалите корпоративные клише и clickbait элементы");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Контент готов к публикации!");
    }

    return recommendations;
  }
}
