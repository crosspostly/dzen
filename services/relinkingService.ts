import fs from 'fs/promises';
import path from 'path';

export interface PublishedArticle {
  date: string;
  title: string;
  url: string;
}

export class RelinkingService {
  private historyPath = path.join(process.cwd(), '!posts', 'PRODUCTION_READY', 'published_articles.txt');

  /**
   * Читает историю публикаций и возвращает массив объектов
   */
  public async getHistory(): Promise<PublishedArticle[]> {
    try {
      const content = await fs.readFile(this.historyPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map(line => {
        // Формат: 2026-04-21 12:00:00 - Заголовок - URL
        const parts = line.split(' - ');
        if (parts.length < 3) return null;
        
        return {
          date: parts[0],
          title: parts[1],
          url: parts[2]
        };
      }).filter((a): a is PublishedArticle => a !== null);
    } catch (error) {
      console.warn('⚠️ RelinkingService: Не удалось прочитать историю публикаций');
      return [];
    }
  }

  /**
   * Выбирает подходящие статьи для перелинковки
   */
  public async getLinksForArticle(count: number = 2): Promise<PublishedArticle[]> {
    const history = await this.getHistory();
    if (history.length === 0) return [];

    // Берем последние 20 статей, чтобы ссылки были актуальными
    const recent = history.slice(-20);
    
    // Перемешиваем и выбираем нужное количество
    return recent
      .sort(() => 0.5 - Math.random())
      .slice(0, count);
  }

  /**
   * Генерирует блок перелинковки в стиле "исповедального сторителлинга"
   */
  public generateRelinkingBlock(links: PublishedArticle[]): string {
    if (links.length === 0) return '';

    let block = '\n\n---\n\n**Читайте также на моем канале:**\n\n';
    
    links.forEach(link => {
      // Можно в будущем добавить сюда Gemini для генерации уникальных подводок
      block += `🔹 [${link.title}](${link.url})\n\n`;
    });

    return block;
  }
}
