import fs from 'fs/promises';
import path from 'path';

export interface PublishedArticle {
  date: string;
  title: string;
  url: string;
}

export class RelinkingService {
  private historyPath = path.join(process.cwd(), '!posts', 'PRODUCTION_READY', 'published_articles.txt');

  public async getHistory(): Promise<PublishedArticle[]> {
    try {
      const content = await fs.readFile(this.historyPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const parts = line.split(' - ');
        if (parts.length < 3) return null;
        return { date: parts[0], title: parts[1], url: parts[2] };
      }).filter((a): a is PublishedArticle => a !== null);
    } catch (error) {
      return [];
    }
  }

  public async getLinksForArticle(count: number = 2): Promise<PublishedArticle[]> {
    const history = await this.getHistory();
    if (history.length === 0) return [];
    return history.slice(-20).sort(() => 0.5 - Math.random()).slice(0, count);
  }

  public generateRelinkingBlock(links: PublishedArticle[]): string {
    let block = '\n\n---\n\n';
    
    // ✨ Твоя новая подпись (Дзен сам сделает ссылку кликабельной при вставке URL)
    block += 'Подпишись, чтобы мы не потерялись ❤️\nhttps://dzen.ru/potemki\n\n';

    if (links.length > 0) {
      block += '**Читайте также на моем канале:**\n\n';
      links.forEach(link => {
        block += `🔹 ${link.title}\n${link.url}\n\n`;
      });
    }

    return block;
  }
}
