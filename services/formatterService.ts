/**
 * Formatter Service - Структурированное форматирование для Дзена
 * НЕ использует Markdown (Дзен его не поддерживает)!
 * Вместо этого возвращает JSON с информацией о позициях форматирования.
 * Playwright потом применяет форматирование вручную через клики кнопок.
 */

export interface BoldRange {
  start: number;  // символ с этой позиции
  end: number;    // до этой позиции
  reason: string; // "first_paragraph" | "keyword" | "user_selected"
}

export interface FormattingData {
  bold_ranges: BoldRange[];
  separators_after_line: number[];  // номера строк, после которых вставить разделитель
  highlighted_keywords: string[];   // слова для выделения жирным
}

export interface StructuredArticle {
  title: string;
  plainContent: string;  // СЫРОЙ текст, без любого форматирования!
  formatting: FormattingData;
}

export class FormatterService {
  /**
   * Форматирует статью в структурированный вид для Playwright
   * ВАЖНО: НЕ вставляет Markdown! Возвращает информацию о позициях.
   */
  formatArticleForDzen(title: string, content: string): StructuredArticle {
    const plainContent = content.trim();
    const formatting = this.extractFormattingData(plainContent);

    return {
      title: this.cleanTitle(title),
      plainContent,
      formatting,
    };
  }

  /**
   * Извлекает информацию о форматировании из текста
   */
  private extractFormattingData(content: string): FormattingData {
    const boldRanges = this.calculateBoldRanges(content);
    const separatorsAfterLine = this.calculateSeparatorLines(content);
    const highlightedKeywords = this.getKeywordsToHighlight();

    return {
      bold_ranges: boldRanges,
      separators_after_line: separatorsAfterLine,
      highlighted_keywords: highlightedKeywords,
    };
  }

  /**
   * Вычисляет, какие части текста должны быть жирными
   * Сейчас: первые 5-7 слов первого абзаца
   */
  private calculateBoldRanges(content: string): BoldRange[] {
    const lines = content.split('\n');
    if (lines.length === 0) return [];

    const firstParagraph = lines[0];
    const words = firstParagraph.split(' ');
    const wordsToMakeBold = Math.min(7, Math.ceil(words.length * 0.4));

    let charCount = 0;
    const ranges: BoldRange[] = [];

    for (let i = 0; i < wordsToMakeBold; i++) {
      const word = words[i];
      const start = charCount;
      const end = charCount + word.length;

      ranges.push({
        start,
        end,
        reason: 'first_paragraph',
      });

      charCount = end + 1; // +1 на пробел
    }

    return ranges;
  }

  /**
   * Вычисляет, после каких строк нужно вставлять разделители
   * Каждый 4-й абзац
   */
  private calculateSeparatorLines(content: string): number[] {
    const paragraphs = content.split('\n\n');
    const separators: number[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      if (i > 0 && i % 4 === 0) {
        separators.push(i);
      }
    }

    return separators;
  }

  /**
   * Список ключевых слов, которые нужно выделить жирным
   */
  private getKeywordsToHighlight(): string[] {
    return [
      'справедливость',
      'добро',
      'зло',
      'семья',
      'наследство',
      'квартира',
      'деньги',
      'возмездие',
      'мама',
      'свекровь',
      'сын',
      'дочь',
      'родители',
      'дом',
      'имущество',
      'миллион',
      'подарок',
      'подлость',
      'ложь',
    ];
  }

  /**
   * Очищает заголовок
   */
  private cleanTitle(title: string): string {
    return title.trim().charAt(0).toUpperCase() + title.trim().slice(1);
  }

  /**
   * Преобразует массив диапазонов в набор позиций (для удобства Playwright)
   * Возвращает список { start, end, length } для каждого диапазона
   */
  getBoldSelections(plainContent: string, boldRanges: BoldRange[]) {
    return boldRanges.map(range => ({
      start: range.start,
      end: range.end,
      length: range.end - range.start,
      text: plainContent.substring(range.start, range.end),
    }));
  }

  /**
   * Находит позиции ключевых слов в тексте
   */
  findKeywordPositions(
    plainContent: string,
    keywords: string[]
  ): Array<{ word: string; start: number; end: number }> {
    const positions: Array<{ word: string; start: number; end: number }> = [];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;

      while ((match = regex.exec(plainContent)) !== null) {
        positions.push({
          word: keyword,
          start: match.index,
          end: match.index + keyword.length,
        });
      }
    }

    return positions;
  }
}

export const formatterService = new FormatterService();
