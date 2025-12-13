/**
 * Uniqueness Service - Проверка уникальности текста без платных сервисов
 * Использует TF-IDF, анализ словарного разнообразия и детекцию паттернов ИИ
 */

import natural from 'natural';

export interface UniquenessResult {
  score: number;              // 0-100 %
  analysis: {
    tfidf_similarity: number; // Сравнение с примерами
    ai_detection: number;     // Вероятность что написано ИИ
    word_variety: number;     // Разнообразие словаря
    sentence_variety: number; // Вариативность структуры
  };
  details: {
    top_phrases: string[];    // Повторяющиеся фразы
    ai_patterns: string[];    // Типичные конструкции ИИ
  };
}

const AI_PATTERNS = [
  /очень важно/gi,
  /я хотел бы/gi,
  /как вы знаете/gi,
  /в этой статье/gi,
  /стоит отметить/gi,
  /можно сказать/gi,
  /таким образом/gi,
  /в результате/gi,
  /итак/gi,
  /следует подчеркнуть/gi,
  /как известно/gi,
  /в целом/gi,
  /несомненно/gi,
  /конечно/gi,
  /по сути/gi,
];

const AI_SENTENCE_STARTS = [
  /^В этой статье/i,
  /^Давайте рассмотрим/i,
  /^Важно отметить/i,
  /^Прежде всего/i,
  /^С одной стороны/i,
  /^С другой стороны/i,
  /^Таким образом/i,
  /^Итак/i,
  /^Кроме того/i,
  /^Однако/i,
];

export class UniquenessService {
  /**
   * Проверяет общую уникальность текста
   */
  async checkUniqueness(text: string, examples: string[]): Promise<UniquenessResult> {
    const tfidfSimilarity = this.calculateTFIDF(text, examples);
    const aiDetection = this.detectAIPatterns(text);
    const wordVariety = this.analyzeWordVariety(text);
    const sentenceVariety = this.analyzeSentenceVariety(text);

    // Итоговый скор
    const score = Math.round(
      (tfidfSimilarity * 0.3 + wordVariety * 0.25 + sentenceVariety * 0.25 + (100 - aiDetection) * 0.2)
    );

    return {
      score: Math.max(0, Math.min(100, score)),
      analysis: {
        tfidf_similarity: Math.round(tfidfSimilarity),
        ai_detection: Math.round(aiDetection),
        word_variety: Math.round(wordVariety),
        sentence_variety: Math.round(sentenceVariety),
      },
      details: {
        top_phrases: this.extractTopPhrases(text, 5),
        ai_patterns: this.findAIPatterns(text),
      },
    };
  }

  /**
   * Вычисляет TF-IDF похожесть с примерами
   * Низкая похожесть = хорошо (оригинально)
   */
  private calculateTFIDF(text: string, examples: string[]): number {
    if (examples.length === 0) return 100;

    const textTokens = this.tokenize(text);
    const textTF = this.calculateTF(textTokens);

    let maxSimilarity = 0;

    for (const example of examples) {
      const exampleTokens = this.tokenize(example);
      const exampleTF = this.calculateTF(exampleTokens);

      const similarity = this.cosineSimilarity(textTF, exampleTF);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Преобразуем: высокая похожесть (0.8) = низкий скор, низкая (0.1) = высокий скор
    return Math.round((1 - maxSimilarity) * 100);
  }

  /**
   * Анализирует разнообразие словаря
   * Высокое разнообразие = признак человека
   */
  private analyzeWordVariety(text: string): number {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;

    const uniqueWords = new Set(words);
    const variety = (uniqueWords.size / words.length) * 100;

    // Оптимально 40-60% уникальных слов для человеческого текста
    if (variety > 40 && variety < 70) return 100;
    if (variety >= 70) return 80; // Слишком много разных слов (подозрительно)
    if (variety >= 30) return 90;
    return Math.max(20, variety * 2);
  }

  /**
   * Анализирует разнообразие структуры предложений
   * ИИ часто использует однотипные начала
   */
  private analyzeSentenceVariety(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return 50;

    const starts = sentences
      .slice(0, 20)
      .map(s => s.trim().split(' ')[0].toLowerCase())
      .filter(s => s.length > 0);

    const uniqueStarts = new Set(starts);
    const variety = (uniqueStarts.size / starts.length) * 100;

    // Хороший текст имеет разнообразные начала предложений
    return Math.round(variety);
  }

  /**
   * Детектирует типичные паттерны ИИ-текстов
   */
  private detectAIPatterns(text: string): number {
    let patternCount = 0;
    let totalPatterns = 0;

    // Проверяем паттерны
    for (const pattern of AI_PATTERNS) {
      const matches = (text.match(pattern) || []).length;
      if (matches > 0) patternCount += matches;
      totalPatterns += 1;
    }

    // Проверяем начала предложений
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      for (const start of AI_SENTENCE_STARTS) {
        if (start.test(sentence)) {
          patternCount += 2;
        }
      }
    }

    // Проверяем на перегруженность переходниками
    const transitions = (
      (text.match(/таким образом/gi) || []).length +
      (text.match(/итак/gi) || []).length +
      (text.match(/с другой стороны/gi) || []).length +
      (text.match(/однако/gi) || []).length
    );

    if (transitions > sentences.length / 3) {
      patternCount += 15;
    }

    // Преобразуем в процент (более 30 паттернов = явно ИИ)
    return Math.min(100, (patternCount / 30) * 100);
  }

  /**
   * Находит ИИ-специфичные паттерны в тексте
   */
  private findAIPatterns(text: string): string[] {
    const found: string[] = [];

    for (const pattern of AI_PATTERNS) {
      if (pattern.test(text)) {
        found.push(pattern.source);
      }
    }

    return found.slice(0, 5);
  }

  /**
   * Извлекает топ-N повторяющихся фраз
   */
  private extractTopPhrases(text: string, count: number): string[] {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const phrases = new Map<string, number>();

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).slice(0, 5).join(' ');
      if (words.length > 0) {
        phrases.set(words, (phrases.get(words) || 0) + 1);
      }
    }

    return Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([phrase]) => phrase);
  }

  /**
   * Токенизирует текст
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2 && !this.isStopword(w));
  }

  /**
   * Проверяет, является ли слово стоп-словом
   */
  private isStopword(word: string): boolean {
    const stopwords = new Set([
      'и', 'в', 'на', 'с', 'по', 'для', 'того', 'чтобы', 'это', 'что',
      'как', 'быть', 'из', 'у', 'к', 'а', 'или', 'но', 'если', 'она',
      'он', 'они', 'мы', 'вы', 'то', 'тот', 'такой', 'такая', 'такое',
    ]);
    return stopwords.has(word);
  }

  /**
   * Вычисляет Term Frequency
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    // Нормализуем
    for (const [word, count] of tf.entries()) {
      tf.set(word, count / tokens.length);
    }
    return tf;
  }

  /**
   * Вычисляет косинусное сходство между двумя TF векторами
   */
  private cosineSimilarity(tf1: Map<string, number>, tf2: Map<string, number>): number {
    const allWords = new Set([...tf1.keys(), ...tf2.keys()]);
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const word of allWords) {
      const v1 = tf1.get(word) || 0;
      const v2 = tf2.get(word) || 0;
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }
}

export const uniquenessService = new UniquenessService();
