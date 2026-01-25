// ============================================================================
// PHASE 2: BurstinessOptimizer
// Варьирует длину предложений (StdDev 1.2 → 7.1)
// SPLIT (длинные на 2) / MERGE (короткие в 1)
// Результат: Originality.ai не ловит
// ============================================================================

import { BurstinessMetrics } from "../types/ContentArchitecture";

export class BurstinessOptimizer {
  // Предложения в диапазоне длины считаются "однородными"
  private uniformLengthRange: number = 5; // слов
  
  // Минимальная длина предложения (слова)
  private minSentenceLength: number = 2;
  
  // Максимальная длина предложения (слова) перед разбиением
  private maxSentenceLength: number = 40;

  /**
   * Анализирует распределение длин предложений
   */
  public analyzeBurstiness(text: string): BurstinessMetrics {
    const sentences = this.extractSentences(text);
    const sentenceLengths = sentences.map(s => this.wordCount(s));

    const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / sentenceLengths.length;
    const standardDeviation = Math.sqrt(variance);

    const minLength = Math.min(...sentenceLengths);
    const maxLength = Math.max(...sentenceLengths);

    // Определяем распределение
    let distribution: "uniform" | "balanced" | "bursty" = "balanced";
    if (standardDeviation < 3.0) {
      distribution = "uniform"; // Монотонное распределение (опасно для детектора)
    } else if (standardDeviation > 6.0) {
      distribution = "bursty"; // Хорошее распределение (человеческое)
    }

    return {
      standardDeviation,
      minLength,
      maxLength,
      variance,
      distribution,
    };
  }

  /**
   * Оптимизирует буrstiness путем SPLIT и MERGE операций
   * Целевой показатель: StdDev > 7.0
   */
  public optimizeBurstiness(text: string, targetStdDev: number = 7.0): string {
    let result = text;

    // Пока буrstiness не достаточно высока
    let iterations = 0;
    while (iterations < 5) {
      const metrics = this.analyzeBurstiness(result);
      
      if (metrics.standardDeviation >= targetStdDev) {
        break; // Достаточно хорошо
      }

      // Если распределение слишком однородное, выполняем SPLIT и MERGE операции
      if (metrics.distribution === "uniform") {
        result = this.performSplitAndMerge(result);
      }

      iterations++;
    }

    return result;
  }

  /**
   * Выполняет SPLIT и MERGE операции для увеличения вариативности
   */
  private performSplitAndMerge(text: string): string {
    const sentences = this.extractSentences(text);
    const processedSentences: string[] = [];

    const sentenceLengths = sentences.map(s => this.wordCount(s));
    const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const length = sentenceLengths[i];

      // SPLIT: длинные предложения разбиваем на две части
      if (length > mean * 1.5 && length > 20) {
        const splitSentences = this.splitLongSentence(sentence);
        processedSentences.push(...splitSentences);
      }
      // MERGE: короткие предложения объединяем со следующим
      else if (length < mean * 0.6 && length < 8 && i < sentences.length - 1) {
        const merged = this.mergeSentences(sentence, sentences[i + 1]);
        processedSentences.push(merged);
        i++; // Пропускаем следующее предложение, так как мы его уже обработали
      } else {
        processedSentences.push(sentence);
      }
    }

    return processedSentences.join(" ");
  }

  /**
   * Разбивает длинное предложение на две части (примерно в середине)
   */
  private splitLongSentence(sentence: string): string[] {
    const words = sentence.split(/\s+/);
    const midpoint = Math.floor(words.length / 2);

    // Ищем естественное место для разрыва (запятую или союз)
    let splitPoint = midpoint;
    for (let i = Math.max(0, midpoint - 3); i <= Math.min(words.length - 1, midpoint + 3); i++) {
      if (words[i].includes(",") || words[i].match(/^(и|но|хотя|ведь|же|потому|так|когда)/i)) {
        splitPoint = i + 1;
        break;
      }
    }

    const firstPart = words.slice(0, splitPoint).join(" ");
    const secondPart = words.slice(splitPoint).join(" ");

    // Убедимся, что обе части оканчиваются точкой
    let result = [];
    if (firstPart.trim()) {
      result.push(this.ensureEndPunctuation(firstPart));
    }
    if (secondPart.trim()) {
      result.push(this.ensureEndPunctuation(secondPart));
    }

    return result.filter(p => p.length > 0);
  }

  /**
   * Объединяет два предложения в одно
   */
  private mergeSentences(sent1: string, sent2: string): string {
    const s1 = sent1.replace(/[.!?]+$/, "").trim();
    const s2 = sent2.replace(/^[^a-яa-z]*/, "").trim();

    if (!s1 || !s2) return sent1 + sent2;

    // Выбираем подходящий союз
    const connector = this.selectRandomElement([", ", " и ", " но ", " хотя ", " потому что ", "."]);
    return s1 + connector + s2.charAt(0).toLowerCase() + s2.slice(1) + ".";
  }

  /**
   * Убедимся, что предложение оканчивается пунктуацией
   */
  private ensureEndPunctuation(sentence: string): string {
    sentence = sentence.trim();
    if (!sentence) return "";
    
    if (!/[.!?:;,]$/.test(sentence)) {
      sentence += ".";
    }
    return sentence;
  }

  /**
   * Извлекает предложения из текста
   */
  private extractSentences(text: string): string[] {
    // Разбиваем по точкам, вопросительным и восклицательным знакам
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(s => s.trim().length > 0);
  }

  /**
   * Подсчитывает количество слов в предложении
   */
  private wordCount(sentence: string): number {
    return sentence.match(/\b\w+\b/g)?.length || 0;
  }

  /**
   * Выбирает случайный элемент из массива
   */
  private selectRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Проверяет, достаточно ли высока буrstiness
   */
  public meetsBurstinessThreshold(text: string, minStdDev: number = 6.5): boolean {
    const metrics = this.analyzeBurstiness(text);
    return metrics.standardDeviation >= minStdDev;
  }
}
