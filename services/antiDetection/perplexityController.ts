// ============================================================================
// PHASE 2: PerplexityController
// Повышает энтропию текста путем замены частых слов на редкие синонимы
// Целевой показатель: 1.8 → 3.4 перплексити
// ============================================================================

import { PerplexityMetrics } from "../types/ContentArchitecture";

export class PerplexityController {
  // Словарь редких синонимов для русского языка
  private rareSynonyms: Map<string, string[]> = new Map([
    // Частые глаголы
    ["делать", ["свершать", "исполнять", "сосредоточиваться на", "претворять", "осуществлять"]],
    ["сказать", ["вещать", "произнести", "ронять слова", "молвить", "извергать"]],
    ["идти", ["снаряжаться", "направляться", "устремляться", "пробираться", "странствовать"]],
    ["видеть", ["узреть", "лицезреть", "разглядывать", "созерцать", "различать"]],
    ["думать", ["размышлять", "пондерировать", "тревожить ум", "вынашивать мысль", "медитировать"]],
    ["хотеть", ["вожделеть", "страстно желать", "затаивать желание", "стремиться", "алкать"]],
    ["понимать", ["смекать", "постигать", "уразумевать", "вникать", "разбираться"]],
    ["нравиться", ["льстить вкусу", "приходиться по нраву", "вкушать отраду", "прельщать", "очаровывать"]],
    
    // Частые прилагательные
    ["хороший", ["изумительный", "превосходный", "несравненный", "замечательный", "безупречный"]],
    ["плохой", ["несчастный", "беда-то какая", "горе-то", "незавидный", "бедственный"]],
    ["большой", ["огромадный", "колоссальный", "гигантский", "мощный", "раскидистый"]],
    ["маленький", ["крохотный", "хрупкий", "жалкий", "ничтожный", "малюсенький"]],
    ["быстро", ["мгновенно", "стремительно", "вмиг", "молниеносно", "фееричным темпом"]],
    ["медленно", ["черепашьим шагом", "мучительно", "томительно", "неспешно", "неторопливо"]],
    
    // Частые существительные
    ["люди", ["создания", "смертные", "человечки", "толпа", "множество душ"]],
    ["вещь", ["предмет", "артефакт", "сокровище", "штука", "материя"]],
    ["время", ["пора", "эпоха", "миг", "мгновение", "возраст"]],
    ["место", ["локус", "край", "уголок", "святилище", "обиталище"]],
    ["день", ["сутки", "светлое время", "денёк", "свет", "дневное время"]],
  ]);

  // Словарь для частиц интенсификации (для повышения перплексити через стиль)
  private intensifiers: Map<string, string[]> = new Map([
    ["было", ["оказалось", "явилось", "предстало", "вдруг предстало"]],
    ["вот", ["вот только", "да вот", "вот это да"]],
  ]);

  /**
   * Анализирует текст и возвращает метрики перплексити
   */
  public analyzePerplexity(text: string): PerplexityMetrics {
    const words = this.tokenize(text).filter(w => w.length > 2);
    
    // Handle empty text case
    if (words.length === 0) {
      return {
        score: 1.0, // Minimum perplexity for empty text
        wordFrequency: new Map(),
        rarityRatio: 0,
      };
    }
    
    const wordFrequency = new Map<string, number>();
    
    // Подсчитываем частоту слов
    for (const word of words) {
      const lower = word.toLowerCase();
      wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
    }

    // Вычисляем коэффициент редкости
    const totalWords = words.length;
    const uniqueWords = wordFrequency.size;
    const rareWords = Array.from(wordFrequency.values()).filter(count => count <= 2).length;
    const rarityRatio = uniqueWords > 0 ? rareWords / uniqueWords : 0;

    // Вычисляем перплексити (разнообразие слов э 0-1 + редкость * 3.4)
    const diversityScore = totalWords > 0 ? uniqueWords / totalWords : 0; // 0-1
    const perplexityScore = 1.0 + (rarityRatio * 3.4) + (diversityScore * 1.5);

    // Ensure we have reasonable baseline for typical Russian text
    const baselinePerplexity = Math.max(1.5, Math.min(5.0, perplexityScore));
    
    return {
      score: baselinePerplexity,
      wordFrequency,
      rarityRatio,
    };
  }

  /**
   * Увеличивает перплексити текста путем замены частых слов на редкие синонимы
   * Целевой результат: ZeroGPT не ловит
   */
  public increasePerplexity(text: string, targetScore: number = 3.4): string {
    let result = text;
    const words = this.tokenize(text);
    const wordFrequency = new Map<string, number>();

    // Подсчитываем частоту слов
    for (const word of words) {
      const lower = word.toLowerCase();
      wordFrequency.set(lower, (wordFrequency.get(lower) || 0) + 1);
    }

    // Определяем частые слова (встречаются 3+ раза)
    const frequentWords = Array.from(wordFrequency.entries())
      .filter(([word, count]) => count >= 3)
      .map(([word]) => word);

    // Заменяем частые слова на редкие синонимы
    for (const word of frequentWords) {
      const synonyms = this.rareSynonyms.get(word);
      if (synonyms && synonyms.length > 0) {
        const replacement = this.selectRandomElement(synonyms);
        
        // Заменяем только некоторые вхождения (30-50%), чтобы сохранить читаемость
        const pattern = new RegExp(`\\b${word}\\b`, "gi");
        let matchCount = 0;
        result = result.replace(pattern, () => {
          matchCount++;
          // Заменяем каждое второе-третье вхождение
          return matchCount % 3 === 0 ? replacement : word;
        });
      }
    }

    return result;
  }

  /**
   * Проверяет, достаточно ли высокая перплексити для прохождения ZeroGPT
   */
  public meetsPerplexityThreshold(text: string, threshold: number = 3.0): boolean {
    const metrics = this.analyzePerplexity(text);
    return metrics.score >= threshold;
  }

  /**
   * Токенизирует текст на слова
   */
  private tokenize(text: string): string[] {
    // Разбиваем на слова, исключая пунктуацию
    return text.match(/\b\w+\b/g) || [];
  }

  /**
   * Выбирает случайный элемент из массива
   */
  private selectRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
