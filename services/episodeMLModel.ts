/**
 * ML-МОДЕЛЬ ДЛЯ АНТИДЕТЕКЦИИ ЭПИЗОДОВ
 * 
 * Хранит удачные примеры эпизодов для обучения модели
 * и использует их для улучшения качества генерируемого контента
 */

export interface SuccessfulEpisodeExample {
  id: string;
  content: string;
  score: number; // Финальный балл антидетекции (80-100)
  metrics: {
    readabilityScore: number;
    dialoguePercentage: number;
    plotTwists: number;
    sensoryDensity: number;
    aiDetectionRisk: number;
  };
  detectedPatterns: {
    goodPhrases: string[];
    goodSentenceLengths: number[];
    effectiveTransitions: string[];
    engagingOpenings: string[];
  };
  successFactors: {
    emotionalWords: string[];
    sensoryDetails: string[];
    naturalDialogue: string[];
    humanMarkers: string[];
  };
  generatedAt: number;
  theme: string;
  episodeNumber: number;
}

export interface AIFixPattern {
  problem: string; // что не нравится AI-детектору
  solution: string; // как исправить
  example: {
    before: string;
    after: string;
  };
  category: 'phrase' | 'structure' | 'style' | 'emotion';
  confidence: number; // эффективность паттерна (0-100)
  usageCount: number; // сколько раз использовался успешно
}

export class EpisodeMLModel {
  private successfulExamples: SuccessfulEpisodeExample[] = [];
  private fixPatterns: AIFixPattern[] = [];
  private readonly MAX_EXAMPLES = 100; // Храним последние 100 удачных примеров
  private readonly MIN_SCORE_THRESHOLD = 75; // Минимальный балл для включения в обучение

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Добавляет новый успешный пример
   */
  addSuccessfulExample(example: Omit<SuccessfulEpisodeExample, 'generatedAt'>): void {
    const fullExample: SuccessfulEpisodeExample = {
      ...example,
      generatedAt: Date.now()
    };

    // Если пример имеет высокий балл, добавляем его
    if (fullExample.score >= this.MIN_SCORE_THRESHOLD) {
      this.successfulExamples.unshift(fullExample);
      
      // Ограничиваем размер массива
      if (this.successfulExamples.length > this.MAX_EXAMPLES) {
        this.successfulExamples = this.successfulExamples.slice(0, this.MAX_EXAMPLES);
      }

      // Анализируем и извлекаем успешные паттерны
      this.extractPatterns(fullExample);
      
      this.saveToStorage();
      console.log(`🎯 ML: Добавлен пример с баллом ${fullExample.score}/100 (${this.successfulExamples.length}/${this.MAX_EXAMPLES})`);
    }
  }

  /**
   * Извлекает паттерны из успешного примера
   */
  private extractPatterns(example: SuccessfulEpisodeExample): void {
    const sentences = example.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Находим эффективные переходы
    const transitions = this.extractTransitions(example.content);
    transitions.forEach(transition => {
      if (!this.fixPatterns.find(p => p.example.before === transition.before && p.example.after === transition.after)) {
        this.fixPatterns.push({
          problem: 'Неэффективный переход',
          solution: 'Улучшенный переход',
          example: transition,
          category: 'structure',
          confidence: 85,
          usageCount: 1
        });
      }
    });

    // Находим эмоциональные слова
    const emotionalWords = this.extractEmotionalWords(example.content);
    emotionalWords.forEach(word => {
      if (!this.fixPatterns.find(p => p.example.before.includes(word) && p.problem === 'Скучное эмоциональное выражение')) {
        this.fixPatterns.push({
          problem: 'Скучное эмоциональное выражение',
          solution: 'Яркое эмоциональное выражение',
          example: {
            before: 'Я была грустной',
            after: `Мне стало ${word}`
          },
          category: 'emotion',
          confidence: 90,
          usageCount: 1
        });
      }
    });
  }

  /**
   * Находит переходы между предложениями
   */
  private extractTransitions(content: string): { before: string; after: string }[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const transitions: { before: string; after: string }[] = [];

    for (let i = 0; i < sentences.length - 1; i++) {
      const current = sentences[i].trim();
      const next = sentences[i + 1].trim();
      
      if (current.length > 30 && next.length > 30) {
        transitions.push({
          before: current.substring(0, 50) + '...',
          after: next.substring(0, 50) + '...'
        });
      }
    }

    return transitions.slice(0, 3); // Берем только 3 лучших перехода
  }

  /**
   * Извлекает эмоциональные слова
   */
  private extractEmotionalWords(content: string): string[] {
    const emotionalWords = [
      'грустно', 'тоскливо', 'радостно', 'весело', 'страшно', 'тревожно',
      'невероятно', 'потрясающе', 'шокирующе', 'удивительно', 'восхитительно',
      'болезненно', 'приятно', 'нежно', 'жёстко', 'резко'
    ];

    return emotionalWords.filter(word => content.toLowerCase().includes(word));
  }

  /**
   * Получает рекомендации на основе ML-модели
   */
  getRecommendations(content: string, issues: string[]): {
    suggestions: string[];
    improvements: { text: string; reason: string; confidence: number }[];
    similarExamples: string[];
  } {
    const suggestions: string[] = [];
    const improvements: { text: string; reason: string; confidence: number }[] = [];
    const similarExamples: string[] = [];

    // Ищем похожие примеры
    const themeSimilarity = this.findSimilarExamples(content);
    themeSimilarity.forEach(example => {
      if (example.metrics.aiDetectionRisk < 20) { // Только качественные примеры
        similarExamples.push(example.content.substring(0, 200) + '...');
      }
    });

    // Предлагаем паттерны для улучшения
    issues.forEach(issue => {
      const relevantPattern = this.fixPatterns.find(p => 
        p.problem.toLowerCase().includes(issue.toLowerCase().substring(0, 20))
      );

      if (relevantPattern) {
        suggestions.push(`Используйте паттерн: "${relevantPattern.solution}"`);
        improvements.push({
          text: relevantPattern.example.after,
          reason: relevantPattern.problem,
          confidence: relevantPattern.confidence
        });
      }
    });

    // Добавляем общие рекомендации на основе лучших примеров
    const bestExample = this.successfulExamples[0];
    if (bestExample) {
      suggestions.push(`Средний балл лучших примеров: ${bestExample.score}/100`);
      if (bestExample.metrics.dialoguePercentage > 30) {
        suggestions.push('Добавьте больше диалогов для живости');
      }
      if (bestExample.metrics.sensoryDensity > 3) {
        suggestions.push('Включите больше сенсорных деталей');
      }
    }

    return { suggestions, improvements, similarExamples };
  }

  /**
   * Находит похожие примеры по тематике
   */
  private findSimilarExamples(content: string): SuccessfulEpisodeExample[] {
    if (this.successfulExamples.length === 0) return [];

    const contentWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    return this.successfulExamples
      .map(example => {
        const exampleWords = example.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const commonWords = contentWords.filter(w => exampleWords.includes(w));
        const similarity = commonWords.length / Math.max(contentWords.length, exampleWords.length);
        
        return { example, similarity };
      })
      .filter(item => item.similarity > 0.1) // Минимум 10% общих слов
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.example);
  }

  /**
   * Получает статистику модели
   */
  getModelStats(): {
    totalExamples: number;
    avgScore: number;
    topPatterns: AIFixPattern[];
    successRate: number;
  } {
    const totalExamples = this.successfulExamples.length;
    const avgScore = totalExamples > 0 
      ? this.successfulExamples.reduce((sum, ex) => sum + ex.score, 0) / totalExamples 
      : 0;
    
    const topPatterns = this.fixPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const successRate = totalExamples > 0 
      ? (this.successfulExamples.filter(ex => ex.score >= 85).length / totalExamples) * 100
      : 0;

    return {
      totalExamples,
      avgScore: Math.round(avgScore),
      topPatterns,
      successRate: Math.round(successRate)
    };
  }

  /**
   * Сохраняет модель в localStorage (Node.js compatible)
   */
  private saveToStorage(): void {
    try {
      // В Node.js используем глобальные переменные как storage
      const data = {
        examples: this.successfulExamples.slice(-20), // Сохраняем последние 20
        patterns: this.fixPatterns.slice(-50) // Сохраняем последние 50 паттернов
      };
      
      // Для Node.js сохраняем в globalThis (если доступен)
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).episodeMLData = data;
      }
      
      console.log(`🎯 ML: Модель сохранена (${this.successfulExamples.length} примеров, ${this.fixPatterns.length} паттернов)`);
    } catch (error) {
      console.warn('Не удалось сохранить ML-модель:', error);
    }
  }

  /**
   * Загружает модель из localStorage (Node.js compatible)
   */
  private loadFromStorage(): void {
    try {
      // В Node.js читаем из globalThis
      let data = null;
      if (typeof globalThis !== 'undefined' && (globalThis as any).episodeMLData) {
        data = (globalThis as any).episodeMLData;
      }
      
      if (data) {
        this.successfulExamples = data.examples || [];
        this.fixPatterns = data.patterns || [];
        console.log(`🎯 ML: Загружено ${this.successfulExamples.length} примеров и ${this.fixPatterns.length} паттернов`);
      } else {
        console.log(`🎯 ML: Модель пуста, начинаем с чистого листа`);
      }
    } catch (error) {
      console.warn('Не удалось загрузить ML-модель:', error);
    }
  }

  /**
   * Экспорт модели для репозитория
   */
  exportModel(): string {
    const exportData = {
      successfulExamples: this.successfulExamples.slice(-50),
      fixPatterns: this.fixPatterns.slice(-30),
      modelVersion: '1.0',
      lastUpdated: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Импорт модели из репозитория
   */
  importModel(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.successfulExamples && Array.isArray(data.successfulExamples)) {
        this.successfulExamples = data.successfulExamples;
      }
      if (data.fixPatterns && Array.isArray(data.fixPatterns)) {
        this.fixPatterns = data.fixPatterns;
      }
      console.log(`🎯 ML: Импортировано ${this.successfulExamples.length} примеров`);
    } catch (error) {
      console.error('Ошибка импорта модели:', error);
    }
  }

  /**
   * Очистка модели
   */
  clearModel(): void {
    this.successfulExamples = [];
    this.fixPatterns = [];
    localStorage.removeItem('episodeMLModel');
    console.log('🎯 ML: Модель очищена');
  }
}

// Глобальный экземпляр модели
export const episodeMLModel = new EpisodeMLModel();

export default EpisodeMLModel;