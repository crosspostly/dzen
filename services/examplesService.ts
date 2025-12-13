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
   * Выбирает лучшие примеры по качеству
   */
  selectBestExamples(articles: ExampleArticle[], count: number): ExampleArticle[] {
    if (articles.length === 0) return [];

    // Сортируем по engagement_rate и quality_score
    const sorted = [...articles].sort((a, b) => {
      const scoreA = (a.metadata?.quality_score ?? 0) * 0.5 + (a.metadata?.engagement_rate ?? 0) * 0.5;
      const scoreB = (b.metadata?.quality_score ?? 0) * 0.5 + (b.metadata?.engagement_rate ?? 0) * 0.5;
      return scoreB - scoreA;
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
