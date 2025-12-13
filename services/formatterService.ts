/**
 * Formatter Service - Оформление текста для Яндекс.Дзен
 * Выделение заголовков, разделителей, автоматическое форматирование
 */

export interface FormattedArticle {
  title: string;
  content: string;          // оформленный вывод
  plainText: string;        // без форматирования
}

export class FormatterService {
  /**
   * Автоматически форматирует текст для Дзена
   */
  formatArticle(title: string, content: string): FormattedArticle {
    // Очистка текста
    let formatted = content.trim();

    // 1. Выделение первых слов в первом абзаце жирным
    formatted = this.boldFirstSentence(formatted);

    // 2. Добавление разделителей между абзацами
    formatted = this.addSeparators(formatted);

    // 3. Выделение ключевых слов
    formatted = this.highlightKeywords(formatted);

    // 4. Добавление кавычек и тире в диалогах
    formatted = this.formatDialogues(formatted);

    // 5. Оформление нумерации
    formatted = this.formatNumbering(formatted);

    // 6. Орматирование вывода абзацев
    formatted = this.formatParagraphs(formatted);

    // 7. Добавление вопроса в конце
    formatted = this.addEndingQuestion(formatted);

    return {
      title: this.formatTitle(title),
      content: formatted,
      plainText: content,
    };
  }

  /**
   * Оформление заголовка
   */
  private formatTitle(title: string): string {
    // При необходимости красивые сымволы
    return title.trim().charAt(0).toUpperCase() + title.trim().slice(1);
  }

  /**
   * Оформление диалогов с тире
   * Трансформирует: - Говорит в – Говорит
   */
  private formatDialogues(text: string): string {
    // Используем долгое тире вместо короткого
    return text.replace(/^\s*-\s+(говор|скаж)/gm, '– $1');
  }

  /**
   * Наполняет порядок номерации
   * 1. -> 1.
   * 2. -> 2.
   */
  private formatNumbering(text: string): string {
    let counter = 1;
    return text.replace(/^\d+\.\s+/gm, () => `${counter++}. `);
  }

  /**
   * Выделяет жирным первые 5-7 слов первого абзаца
   */
  private boldFirstSentence(text: string): string {
    const lines = text.split('\n');
    if (lines.length === 0) return text;

    const firstParagraph = lines[0];
    const words = firstParagraph.split(' ');
    const boldWords = Math.min(7, Math.ceil(words.length * 0.4)); // Первые 40% слов

    // В Яндекс.Дзене для жирного можно использовать **
    const boldedWords = words
      .slice(0, boldWords)
      .map(w => `**${w}**`)
      .join(' ');
    const restWords = words.slice(boldWords).join(' ');

    lines[0] = `${boldedWords} ${restWords}`;
    return lines.join('\n');
  }

  /**
   * Добавляет разделители между абзацами
   * Один ис пяти делится разделителем
   */
  private addSeparators(text: string): string {
    const paragraphs = text.split('\n\n');
    
    // Добавляем разделитель каждые 3-4 абзаца
    const withSeparators = paragraphs.map((para, index) => {
      if (index > 0 && index % 4 === 0) {
        return `---\n${para}`; // Новая строка и разделитель
      }
      return para;
    });

    return withSeparators.join('\n\n');
  }

  /**
   * Оформляет абзацы со специальным выставлением
   */
  private formatParagraphs(text: string): string {
    return text
      .split('\n')
      .map(line => {
        // Не добавляем отступ к пустым строкам
        if (!line.trim()) return line;
        // Оформление с отступом
        return `  ${line}`;
      })
      .join('\n');
  }

  /**
   * Находит и выделяет ключевые слова
   * Ключевые слова выносятся в пронъсые **
   */
  private highlightKeywords(text: string): string {
    // Ключевые слова для выделения
    const keywords = [
      'справедливость',
      'добро',
      'зло',
      'семья',
      'наследство',
      'квартира',
      'деньги',
      'возмездие',
    ];

    let result = text;
    for (const keyword of keywords) {
      // Не выделяем если уже выделено
      const regex = new RegExp(`(?<!\\*\\*)${keyword}(?!\\*\\*)`, 'gi');
      result = result.replace(regex, `**${keyword}**`);
    }

    return result;
  }

  /**
   * Добавляет вопрос в конце для вовлечения рчитателей
   */
  private addEndingQuestion(text: string): string {
    const questions = [
      '\n\nА вы что думаете? Правильно ли чините?',
      '\n\nОт чего бы вы так не сделали? Напишите мне в комментариях.',
      '\n\nКак вы чините эту ситуацию? Пделитесь сними в комментариях.',
      '\n\nКто по вашему мнению неправ в этой истории?',
    ];

    // Выбираем случайный вопрос
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Проверяем не добавлен ли он уже
    if (!text.endsWith('?')) {
      return text + randomQuestion;
    }

    return text;
  }
}

export const formatterService = new FormatterService();
