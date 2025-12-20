/**
 * ANTI AI DETECTOR SERVICE
 * 
 * Детектор с 3 уровнями проверки для каждого эпизода:
 * 1. GREP LEVEL - быстрая проверка по паттернам
 * 2. PARTIAL LEVEL - анализ структуры текста  
 * 3. FULL LEVEL - полная семантическая проверка
 * 
 * Возвращает детальный отчёт о том, что именно нужно исправить
 */

export interface DetectionIssue {
  type: 'pattern' | 'structure' | 'semantics' | 'ai_markers';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  position?: {
    start: number;
    end: number;
    context: string;
  };
  suggestion: string;
  examples?: {
    bad: string;
    good: string;
  };
}

export interface DetectionResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  issues: DetectionIssue[];
  score: number; // 0-100 (higher = more human-like)
  recommendations: string[];
  detectedPatterns: {
    aiPhrases: string[];
    unnaturalPhrases: string[];
    repetitivePatterns: string[];
    clickbaitMarkers: string[];
  };
}

export interface DetectionConfig {
  minScore: number; // Minimum score to pass (default: 70)
  enableGrepCheck: boolean; // Default: true
  enablePartialCheck: boolean; // Default: true
  enableFullCheck: boolean; // Default: true
  strictMode: boolean; // More aggressive detection
}

export class AntiAIDetectorService {
  private config: DetectionConfig;
  
  // AI-фразы и паттерны для GREP проверки
  private readonly AI_PHRASES = [
    'важно отметить', 'следует подчеркнуть', 'необходимо отметить',
    'как известно', 'безусловно', 'несомненно', 'очевидно',
    'следует отметить', 'можно сделать вывод', 'таким образом',
    'в заключение', 'подводя итоги', 'подводя итог',
    'иными словами', 'другими словами', 'другими словами',
    'на самом деле', 'на практике', 'в теории',
    'с одной стороны', 'с другой стороны', 'во-первых', 'во-вторых'
  ];

  private readonly UNNATURAL_PATTERNS = [
    'характерной особенностью является',
    'основной целью является',
    'ключевым аспектом является',
    'необходимо подчеркнуть',
    'следует отметить',
    'немаловажное значение имеет',
    'следует помнить',
    'следует учитывать',
    'необходимо учитывать'
  ];

  private readonly CLICKBAIT_MARKERS = [
    'узнайте правду', 'шокирующая правда', 'невероятный',
    'умопомрачительный', 'потрясающий', 'фантастический',
    'вы не поверите', 'это изменит вашу жизнь',
    'секрет который скрывают', 'правда которую скрывают'
  ];

  constructor(config?: Partial<DetectionConfig>) {
    this.config = {
      minScore: 70,
      enableGrepCheck: true,
      enablePartialCheck: true,
      enableFullCheck: true,
      strictMode: false,
      ...config
    };
  }

  /**
   * Главный метод: проверяет текст всеми 3 уровнями
   */
  async detectAI(text: string): Promise<DetectionResult> {
    console.log('🔍 [AntiAI] Starting 3-level detection...');
    
    const issues: DetectionIssue[] = [];
    const detectedPatterns = {
      aiPhrases: [] as string[],
      unnaturalPhrases: [] as string[],
      repetitivePatterns: [] as string[],
      clickbaitMarkers: [] as string[]
    };

    let totalScore = 100; // Начинаем с максимального балла

    // УРОВЕНЬ 1: GREP проверка (быстрая)
    if (this.config.enableGrepCheck) {
      console.log('   📝 Level 1: GREP pattern check...');
      const grepIssues = this.performGrepCheck(text, detectedPatterns);
      issues.push(...grepIssues);
    }

    // УРОВЕНЬ 2: PARTIAL проверка (структурная)
    if (this.config.enablePartialCheck) {
      console.log('   📊 Level 2: Structural analysis...');
      const structuralIssues = this.performStructuralCheck(text);
      issues.push(...structuralIssues);
    }

    // УРОВЕНЬ 3: FULL проверка (семантическая)
    if (this.config.enableFullCheck) {
      console.log('   🧠 Level 3: Semantic analysis...');
      const semanticIssues = await this.performSemanticCheck(text);
      issues.push(...semanticIssues);
    }

    // Считаем общий балл на основе найденных проблем
    totalScore = this.calculateScore(issues, text.length);
    
    const riskLevel = this.determineRiskLevel(totalScore, issues.length);
    const passed = totalScore >= this.config.minScore;
    const confidence = this.calculateConfidence(issues, text.length);
    
    const recommendations = this.generateRecommendations(issues);

    const result: DetectionResult = {
      passed,
      riskLevel,
      confidence,
      issues: issues.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      score: totalScore,
      recommendations,
      detectedPatterns
    };

    console.log(`   ✅ Detection complete: Score ${totalScore}/100 (${passed ? 'PASSED' : 'FAILED'})`);
    
    return result;
  }

  /**
   * УРОВЕНЬ 1: Быстрая проверка по паттернам (GREP)
   */
  private performGrepCheck(text: string, patterns: any): DetectionIssue[] {
    const issues: DetectionIssue[] = [];
    const lowerText = text.toLowerCase();

    // Проверяем AI-фразы
    for (const phrase of this.AI_PHRASES) {
      if (lowerText.includes(phrase)) {
        patterns.aiPhrases.push(phrase);
        issues.push({
          type: 'ai_markers',
          severity: 'medium',
          description: `Найдена AI-фраза: "${phrase}"`,
          suggestion: `Замените на более естественные выражения`,
          examples: {
            bad: `"Важно отметить, что..."`,
            good: `"Помню, как..." или "И тут поняла..."`
          }
        });
      }
    }

    // Проверяем неестественные паттерны
    for (const pattern of this.UNNATURAL_PATTERNS) {
      if (lowerText.includes(pattern)) {
        patterns.unnaturalPhrases.push(pattern);
        issues.push({
          type: 'ai_markers',
          severity: 'high',
          description: `Неестественный оборот: "${pattern}"`,
          suggestion: `Используйте более живую речь`,
          examples: {
            bad: `"Характерной особенностью является..."`,
            good: `"Всё дело в том, что..."`
          }
        });
      }
    }

    // Проверяем кликбейт маркеры
    for (const marker of this.CLICKBAIT_MARKERS) {
      if (lowerText.includes(marker)) {
        patterns.clickbaitMarkers.push(marker);
        issues.push({
          type: 'ai_markers',
          severity: 'medium',
          description: `Кликбейт маркер: "${marker}"`,
          suggestion: `Сделайте заголовок более сдержанным`,
          examples: {
            bad: `"Вы не поверите, что произошло дальше!"`,
            good: `"И тут случилось неожиданное..."`
          }
        });
      }
    }

    // Проверяем повторяющиеся слова
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    for (const [word, count] of Object.entries(wordFreq)) {
      if (count >= 8) { // Слово повторяется 8+ раз
        patterns.repetitivePatterns.push(`${word} (${count} раз)`);
        issues.push({
          type: 'ai_markers',
          severity: 'medium',
          description: `Частое повторение слова "${word}" (${count} раз)`,
          suggestion: `Используйте синонимы для разнообразия`,
          examples: {
            bad: `"Очень важно, очень важно, очень важно..."`,
            good: `"Это важно. Критично важно. Жизненно важно..."`
          }
        });
      }
    }

    return issues;
  }

  /**
   * УРОВЕНЬ 2: Структурная проверка
   */
  private performStructuralCheck(text: string): DetectionIssue[] {
    const issues: DetectionIssue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Проверяем длину предложений
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    if (avgLength < 15 || avgLength > 120) {
      issues.push({
        type: 'structure',
        severity: 'medium',
        description: `Средняя длина предложения: ${avgLength.toFixed(1)} символов`,
        suggestion: `Варьируйте длину предложений (8-20 слов оптимально)`,
        examples: {
          bad: `"Это очень длинное предложение с множественными придаточными предложениями и сложной структурой которая затрудняет понимание."`,
          good: `"Я пошла на кухню. Включила чайник. А потом поняла - надо было ещё что-то сделать."`
        }
      });
    }

    // Проверяем структуру абзацев
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const longParagraphs = paragraphs.filter(p => p.length > 800);
    if (longParagraphs.length > 0) {
      issues.push({
        type: 'structure',
        severity: 'medium',
        description: `Найдены слишком длинные абзацы (${longParagraphs.length})`,
        suggestion: `Разбейте длинные абзацы на более короткие`,
        examples: {
          bad: `"Очень длинный абзац который тянется и тянется и содержит много мыслей в одном абзаце что делает текст трудным для восприятия и чтения."`,
          good: `"Очень длинный абзац который тянется и тянется.\n\nА потом она подумала о чём-то другом.\n\nИ решила всё изменить."`
        }
      });
    }

    // Проверяем монотонность
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const variance = this.calculateVariance(sentenceLengths);
    if (variance < 10) {
      issues.push({
        type: 'structure',
        severity: 'low',
        description: `Низкая вариативность длины предложений (дисперсия: ${variance.toFixed(1)})`,
        suggestion: `Добавьте разнообразия в длину предложений`,
        examples: {
          bad: `"Предложение. Другое предложение. Третье предложение. Четвёртое предложение."`,
          good: `"Предложение. Ну а потом случилось кое-что интересное. В общем, всё."`
        }
      });
    }

    return issues;
  }

  /**
   * УРОВЕНЬ 3: Семантическая проверка (полная)
   */
  private async performSemanticCheck(text: string): Promise<DetectionIssue[]> {
    const issues: DetectionIssue[] = [];

    // Проверяем эмоциональную составляющую
    const emotionalWords = ['страшно', 'ужасно', 'невероятно', 'потрясающе', 'фантастически'];
    const hasEmotionalContent = emotionalWords.some(word => text.toLowerCase().includes(word));
    
    if (!hasEmotionalContent) {
      issues.push({
        type: 'semantics',
        severity: 'low',
        description: `Недостаточно эмоциональной окраски`,
        suggestion: `Добавьте больше эмоций и чувств`,
        examples: {
          bad: `"Произошло событие. Потом другое событие."`,
          good: `"Мне стало страшно. А потом - невероятное облегчение."`
        }
      });
    }

    // Проверяем конкретность образов
    const hasSensoryDetails = this.hasSensoryDetails(text);
    if (!hasSensoryDetails) {
      issues.push({
        type: 'semantics',
        severity: 'medium',
        description: `Мало конкретных деталей и ощущений`,
        suggestion: `Добавьте больше конкретных деталей (звуки, запахи, ощущения)`,
        examples: {
          bad: `"Было плохо. Потом стало лучше."`,
          good: `"Запахло горелым. Скрипнула дверь. По коже пробежали мурашки."`
        }
      });
    }

    // Проверяем наличие разговорной речи
    const hasDialogue = text.includes('—') || text.includes('- ') || text.includes('"');
    if (!hasDialogue) {
      issues.push({
        type: 'semantics',
        severity: 'low',
        description: `Мало диалогов или прямой речи`,
        suggestion: `Добавьте больше диалогов для живости`,
        examples: {
          bad: `"Она сказала что всё будет хорошо."`,
          good: `"— Всё будет хорошо, — сказала она. — Я обещаю."`
        }
      });
    }

    return issues;
  }

  /**
   * Проверяет наличие сенсорных деталей
   */
  private hasSensoryDetails(text: string): boolean {
    const sensoryWords = [
      'запах', 'аромат', 'звук', 'шум', 'тишина',
      'прикосновение', 'гладкий', 'шершавый', 'мягкий',
      'вкус', 'сладкий', 'горький', 'кислый',
      'яркий', 'тусклый', 'цвет', 'тень'
    ];

    return sensoryWords.some(word => text.toLowerCase().includes(word));
  }

  /**
   * Вычисляет итоговый балл
   */
  private calculateScore(issues: DetectionIssue[], textLength: number): number {
    let score = 100;

    // Снижаем балл за каждую проблему
    for (const issue of issues) {
      const weight = this.getSeverityWeight(issue.severity);
      score -= weight * 5; // -5, -10, -15, -20 за проблему
    }

    // Бонус за длину текста
    if (textLength >= 2000 && textLength <= 4000) {
      score += 5;
    } else if (textLength < 1000 || textLength > 6000) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Определяет уровень риска
   */
  private determineRiskLevel(score: number, issueCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (issueCount >= 8 || score < 30) return 'critical';
    if (issueCount >= 5 || score < 50) return 'high';
    if (issueCount >= 2 || score < 70) return 'medium';
    return 'low';
  }

  /**
   * Вычисляет уверенность в результате
   */
  private calculateConfidence(issues: DetectionIssue[], textLength: number): number {
    let confidence = 70; // Базовая уверенность

    // Повышаем уверенность для длинных текстов
    if (textLength > 2000) confidence += 10;
    if (textLength > 4000) confidence += 5;

    // Повышаем уверенность если найдены конкретные проблемы
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    confidence += Math.min(20, criticalIssues.length * 5);

    return Math.min(100, confidence);
  }

  /**
   * Получает вес для уровня серьёзности
   */
  private getSeverityWeight(severity: string): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity as keyof typeof weights] || 1;
  }

  /**
   * Вычисляет дисперсию массива чисел
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Генерирует рекомендации для исправления
   */
  private generateRecommendations(issues: DetectionIssue[]): string[] {
    const recommendations: string[] = [];

    const aiMarkers = issues.filter(i => i.type === 'ai_markers').length;
    const structural = issues.filter(i => i.type === 'structure').length;
    const semantic = issues.filter(i => i.type === 'semantics').length;

    if (aiMarkers > 0) {
      recommendations.push(`Удалите AI-маркеры (найдено ${aiMarkers})`);
    }
    if (structural > 0) {
      recommendations.push(`Улучшите структуру текста (${structural} проблем)`);
    }
    if (semantic > 0) {
      recommendations.push(`Добавьте больше деталей и эмоций (${semantic} проблем)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Текст прошёл проверку антидетектора');
    }

    return recommendations;
  }

  /**
   * Создаёт детальный отчёт о проблемах
   */
  generateDetailedReport(result: DetectionResult): string {
    let report = `\n🔍 ДЕТАЛЬНЫЙ ОТЧЁТ АНТИДЕТЕКТОРА\n`;
    report += `═══════════════════════════════════════\n\n`;
    report += `📊 ИТОГОВЫЙ РЕЗУЛЬТАТ:\n`;
    report += `   Балл: ${result.score}/100\n`;
    report += `   Уровень риска: ${result.riskLevel.toUpperCase()}\n`;
    report += `   Статус: ${result.passed ? '✅ ПРОЙДЕНО' : '❌ НЕ ПРОЙДЕНО'}\n`;
    report += `   Уверенность: ${result.confidence}%\n\n`;

    if (result.issues.length > 0) {
      report += `🚨 НАЙДЕННЫЕ ПРОБЛЕМЫ (${result.issues.length}):\n`;
      report += `────────────────────────────────────────\n\n`;

      result.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue.severity.toUpperCase()} - ${issue.description}\n`;
        report += `   💡 Решение: ${issue.suggestion}\n`;
        if (issue.examples) {
          report += `   ❌ Пример плохо: ${issue.examples.bad}\n`;
          report += `   ✅ Пример хорошо: ${issue.examples.good}\n`;
        }
        report += `\n`;
      });
    }

    report += `🎯 РЕКОМЕНДАЦИИ:\n`;
    report += `────────────────────────────────────────\n`;
    result.recommendations.forEach(rec => {
      report += `• ${rec}\n`;
    });

    if (Object.values(result.detectedPatterns).some(arr => arr.length > 0)) {
      report += `\n📝 ОБНАРУЖЕННЫЕ ПАТТЕРНЫ:\n`;
      report += `────────────────────────────────────────\n`;
      if (result.detectedPatterns.aiPhrases.length > 0) {
        report += `AI-фразы: ${result.detectedPatterns.aiPhrases.join(', ')}\n`;
      }
      if (result.detectedPatterns.unnaturalPhrases.length > 0) {
        report += `Неестественные фразы: ${result.detectedPatterns.unnaturalPhrases.join(', ')}\n`;
      }
      if (result.detectedPatterns.repetitivePatterns.length > 0) {
        report += `Повторяющиеся паттерны: ${result.detectedPatterns.repetitivePatterns.join(', ')}\n`;
      }
      if (result.detectedPatterns.clickbaitMarkers.length > 0) {
        report += `Кликбейт маркеры: ${result.detectedPatterns.clickbaitMarkers.join(', ')}\n`;
      }
    }

    report += `\n═══════════════════════════════════════\n`;
    
    return report;
  }
}

export default AntiAIDetectorService;