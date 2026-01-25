/**
 * Examples Service - Управление примерами статей
 * Лоадит и выбирает статьи-эталоны и вшивает в промпт
 */

import fs from 'fs';
import path from 'path';

export interface ExampleArticle {
  title: string;
  content: string;
  metadata?: {
    views: number;
    likes: number;
    date: string;
    engagement_rate: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    quality_score?: number;
  };
}

export class ExamplesService {
  /**
   * Лоадит все примеры из директории
   */
  loadExamples(examplesPath: string): ExampleArticle[] {
    if (!fs.existsSync(examplesPath)) {
      return [];
    }

    const examples: ExampleArticle[] = [];
    const files = fs.readdirSync(examplesPath)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => b.localeCompare(a)); // Новые сначала

    for (const file of files) {
      const filePath = path.join(examplesPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = this.parseMarkdownExample(content);
      
      if (parsed) {
        examples.push(parsed);
      }
    }

    // Загружаем метаданные (если на лице)
    const statsPath = path.join(examplesPath, 'stats.json');
    if (fs.existsSync(statsPath)) {
      try {
        const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        for (const ex of examples) {
          if (stats[ex.title]) {
            ex.metadata = stats[ex.title];
          }
        }
      } catch (e) {
        console.error('Failed to load stats.json');
      }
    }

    return examples;
  }

  /**
   * Загружает примеры из parsed_examples.json (автоматически распарсенные)
   */
  loadParsedExamples(jsonPath: string): ExampleArticle[] {
    if (!fs.existsSync(jsonPath)) {
      console.warn(`Examples JSON not found at: ${jsonPath}`);
      return [];
    }

    try {
      const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const examples: ExampleArticle[] = rawData.map((item: any) => {
        // Parse views: "301,4 тыс читали" -> 301400
        let viewCount = 0;
        if (item.views) {
          const numStr = item.views.replace(/[^\d,]/g, '').replace(',', '.');
          const multiplier = item.views.includes('тыс') ? 1000 : 1;
          viewCount = parseFloat(numStr) * multiplier;
        }

        return {
          title: item.title,
          content: item.excerpt || item.snippet || '', // Use excerpt as content content
          metadata: {
            views: viewCount,
            likes: Math.round(viewCount * 0.05), // Estimate likes
            date: item.date || new Date().toISOString(),
            engagement_rate: 0.1, // Default high engagement
            sentiment: 'neutral',
            quality_score: 90, // Real successful articles get high score
            url: item.link,
            image: item.image
          }
        };
      });

      console.log(`${'✅'} Loaded ${examples.length} parsed examples from JSON`);
      return examples;

    } catch (error) {
      console.error('Failed to load parsed_examples.json:', error);
      return [];
    }
  }

  /**
   * Выбирает лучшие примеры по качеству и просмотрам
   */
  selectBestExamples(articles: ExampleArticle[], count: number): ExampleArticle[] {
    if (articles.length === 0) return [];

    // Сортируем по просмотрам (views) и quality_score
    const sorted = [...articles].sort((a, b) => {
      const viewsA = a.metadata?.views || 0;
      const viewsB = b.metadata?.views || 0;
      return viewsB - viewsA;
    });

    return sorted.slice(0, count);
  }

  /**
   * Парсит Markdown файл с примером
   * Формат: # Титул (
   * Эталонные примеры должны иметь все характеристики хорошей Дзен-статьи
   */
  private parseMarkdownExample(content: string): ExampleArticle | null {
    const lines = content.split('\n');
    let title = '';
    let bodyStart = 0;

    // Парсим титул (первая H1)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
        bodyStart = i + 1;
        break;
      }
    }

    if (!title) return null;

    // Остальное - основное содержание
    const bodyLines = lines.slice(bodyStart).filter(l => l.trim().length > 0);
    const body = bodyLines.join('\n').trim();

    return {
      title,
      content: body,
      metadata: {
        views: 0,
        likes: 0,
        date: new Date().toISOString(),
        engagement_rate: 0,
        sentiment: 'neutral',
        quality_score: 75, // Эталонные ных высокие баллы
      },
    };
  }

  /**
   * Строит промпт для вшивания примеров
   */
  buildExamplesPrompt(examples: ExampleArticle[]): string {
    if (examples.length === 0) {
      return '';
    }

    let prompt = `\n
Вот эталонные статьи (УЗ НЕ копировать, а вдохновляться стилем):\n\n`;

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      prompt += `=== Пример ${i + 1}: "${ex.title}" ===\n`;
      prompt += `${ex.content.substring(0, 1500)}...\n\n`; // Окраение для экономии токенов
    }

    prompt += `\nОсновные карактеристики этих наиболее ээфективных статей:\n`;
    prompt += `- Непредсказуемые повороты сюжета\n`;
    prompt += `- Очень человечные диалоги\n`;
    prompt += `- Просторечия и эмоциальные вспышки\n`;
    prompt += `- Бытовые детали, запахи, звуки\n`;
    prompt += `- Справедливая расредсна в конце\n\n`;

    return prompt;
  }

  /**
   * Сохраняет статистику примеров (views, likes)
   */
  saveExamplesStats(examplesPath: string, examples: ExampleArticle[]): void {
    const stats: Record<string, ExampleArticle['metadata']> = {};
    
    for (const ex of examples) {
      if (ex.metadata) {
        stats[ex.title] = ex.metadata;
      }
    }

    const statsPath = path.join(examplesPath, 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
  }
}

export const examplesService = new ExamplesService();
