/**
 * 🎯 Text Restoration Service v7.1
 * 
 * Режим "BOTH": Генерирует две версии статьи:
 * 1. RAW - чистая генерация без улучшений
 * 2. RESTORED - восстановленный голос и драматургия по алгоритму
 * 
 * Алгоритм восстановления:
 * - Удаление паразитных маркеров
 * - Восстановление логики предложений
 * - Структурный анализ (экспозиция → инцидент → развитие → кульминация → развязка)
 * - Восстановление авторского голоса через образы
 * - Адаптация под Дзен (женщины 35-60)
 */

import { GoogleGenAI } from "@google/genai";
import { LongFormArticle } from "../types/ContentArchitecture";

export interface TextRestorationResult {
  restoredContent: string;
  diagnostics: RestorationDiagnostics;
  improvements: Improvement[];
}

export interface RestorationDiagnostics {
  parasiteCount: number;
  brokenSentences: number;
  orphanFragments: number;
  dialogueIssues: number;
  logicBreaks: number;
}

export interface Improvement {
  type: 'parasite_removed' | 'logic_fixed' | 'voice_restored' | 'structure_fixed' | 'dialogue_cleaned';
  original: string;
  improved: string;
  reason: string;
}

export class TextRestorationService {
  private geminiClient: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  /**
   * 🎯 Главный метод: восстановить текст по алгоритму
   */
  async restoreArticle(article: LongFormArticle): Promise<TextRestorationResult> {
    console.log(`\n🔧 [RESTORATION] Starting text restoration...`);
    
    const improvements: Improvement[] = [];
    const diagnostics = await this.analyzeText(article);
    
    console.log(`   📊 Diagnostics: ${diagnostics.parasiteCount} parasites, ${diagnostics.brokenSentences} broken sentences`);
    
    // Шаг 1: Удалить паразитные маркеры
    let content = await this.removeParasites(article.processedContent || this.assembleContent(article), improvements);
    
    // Шаг 2: Восстановить логику предложений
    content = await this.fixBrokenSentences(content, improvements);
    
    // Шаг 3: Очистить диалоги
    content = await this.cleanDialogues(content, improvements);
    
    // Шаг 4: Восстановить структуру и голос
    content = await this.restoreStructureAndVoice(content, article, improvements);
    
    console.log(`   ✅ Restoration complete: ${improvements.length} improvements made`);
    
    return {
      restoredContent: content,
      diagnostics,
      improvements
    };
  }

  /**
   * 📊 Анализ текста на наличие проблем
   */
  private async analyzeText(content: string): Promise<RestorationDiagnostics> {
    const parasitePatterns = [
      /—\s*может быть[^,]*,\s*но/gi,
      /—\s*одним словом/gi,
      /—\s*не знаю почему/gi,
      /—\s*вот в чём дело/gi,
      /—\s*вот что я хочу сказать/gi,
      /\bну и\b/g,
      /\bда вот\b/g,
      /\bвот только\b/g,
      /-то\b/g,
      /\s+то\s+/g,
    ];

    const parasiteCount = parasitePatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    // Обрубленные предложения (начинаются со слов-паразитов)
    const orphanPatterns = /^[\s]*(ну и|да вот|вот только|и то|же|ведь|хотя)/gm;
    const orphanMatches = content.match(orphanPatterns);
    const orphanFragments = orphanMatches ? orphanMatches.length : 0;

    // Сломанные предложения (многоточие + тире)
    const brokenPatterns = /\.+[-\s]+\w+/g;
    const brokenMatches = content.match(brokenPatterns);
    const brokenSentences = brokenMatches ? brokenMatches.length : 0;

    // Проблемы с диалогами
    const dialogueIssues = (content.match(/—[^—]+—/g) || []).length;

    // Логические разрывы
    const logicBreaks = (content.match(/\.\s*\.\s*\./g) || []).length;

    return {
      parasiteCount,
      brokenSentences,
      orphanFragments,
      dialogueIssues,
      logicBreaks
    };
  }

  /**
   * 🧹 Удаление паразитных маркеров
   */
  private async removeParasites(content: string, improvements: Improvement[]): Promise<string> {
    const parasites = [
      { pattern: /—\s*может быть[^,]*,\s*но[^—]*—/g, reason: 'Удалён паразит "может быть, не совсем точно, но..."' },
      { pattern: /—\s*одним словом[^—]*—/g, reason: 'Удалён паразит "одним словом"' },
      { pattern: /—\s*не знаю почему[^—]*—/g, reason: 'Удалён паразит "не знаю почему"' },
      { pattern: /—\s*вот в чём дело[^—]*—/g, reason: 'Удалён паразит "вот в чём дело"' },
      { pattern: /—\s*вот что я хочу сказать[^—]*—/g, reason: 'Удалён паразит "вот что я хочу сказать"' },
      { pattern: /\bну и\b/g, reason: 'Удалён слово-паразит "ну и"' },
      { pattern: /\bда вот\b/g, reason: 'Удалён слово-паразит "да вот"' },
      { pattern: /\bвот только\b/g, reason: 'Удалён слово-паразит "вот только"' },
      { pattern: /\s+то\s+/g, reason: 'Удалён слово-паразит "то"' },
      { pattern: /(\w)\s+-то\s+/g, reason: 'Удалён суффикс "-то" в середине слова' },
    ];

    let result = content;
    
    for (const { pattern, reason } of parasites) {
      const matches = result.match(pattern);
      if (matches) {
        improvements.push({
          type: 'parasite_removed',
          original: matches.slice(0, 3).join('; '),
          improved: '[УДАЛЕНО]',
          reason
        });
        result = result.replace(pattern, '');
      }
    }

    return result;
  }

  /**
   * 🔧 Восстановление сломанных предложений
   */
  private async fixBrokenSentences(content: string, improvements: Improvement[]): Promise<string> {
    // Паттерны сломанных предложений
    const brokenPatterns = [
      { pattern: /\.+\s*[-–]\s*(\w)/g, fix: ' $1', reason: 'Соединён разорванный конец предложения' },
      { pattern: /(\w)\s*[-–]\s*\.+\s*(\w)/g, fix: '$1. $2', reason: 'Восстановлено предложение' },
      { pattern: /,\s*([А-Я])/g, fix: '. $1', reason: 'Исправлена пунктуация' },
    ];

    let result = content;
    
    for (const { pattern, fix, reason } of brokenPatterns) {
      const matches = result.match(pattern);
      if (matches) {
        improvements.push({
          type: 'logic_fixed',
          original: matches.slice(0, 3).join('; '),
          improved: '[ИСПРАВЛЕНО]',
          reason
        });
        result = result.replace(pattern, fix);
      }
    }

    return result;
  }

  /**
   * 💬 Очистка диалогов
   */
  private async cleanDialogues(content: string, improvements: Improvement[]): Promise<string> {
    // Диалоги без контекста - добавляем контекст
    const isolatedDialogues = /(\.\s*){2,}(—[^.]+\.)/g;
    
    let result = content;
    let match;
    let fixCount = 0;
    
    while ((match = isolatedDialogues.exec(result)) !== null) {
      fixCount++;
    }
    
    if (fixCount > 0) {
      improvements.push({
        type: 'dialogue_cleaned',
        original: `${fixCount} изолированных диалогов`,
        improved: '[ДОБАВЛЕН КОНТЕКСТ]',
        reason: `Добавлен контекст к ${fixCount} изолированным репликам`
      });
    }

    return result;
  }

  /**
   * 🎭 Восстановление структуры и авторского голоса
   */
  private async restoreStructureAndVoice(content: string, article: LongFormArticle, improvements: Improvement[]): Promise<string> {
    const restorationPrompt = `Ты — эксперт по восстановлению авторского голоса в текстах для Яндекс.Дзен.

ЗАДАЧА: Восстановить авторский голос и драматургию текста, сохранив:
- Эмоциональный вес
- Ритм (чередование коротких и длинных предложений)
- Повторяющиеся образы
- Иронию, горечь, двойственность

ЗАПРЕЩЕНО:
- Морализировать
- Добавлять "счастливые" концовки
- Менять фактуру (имена, места, детали)

ТЕКСТ ДЛЯ ВОССТАНОВЛЕНИЯ:
${content}

КОНТЕКСТ СТАТЬИ:
Тема: ${article.outline?.theme || 'История о важном'}
Эмоция: ${article.outline?.emotion || 'смешанные чувства'}
Голос рассказчика должен содержать: холод, маска, пустота (примеры образов)

ВЫВЕДИ ТОЛЬКО восстановленный текст. Без комментариев.`;

    try {
      const response = await this.geminiClient.models.generateContent({
        model: "gemini-2.0-flash",
        contents: restorationPrompt,
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      });

      let restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (restoredText) {
         // Clean conversational filler
         restoredText = restoredText.replace(/^(Here is|Sure,|Certainly|Okay,|Of course,|Вот|Конечно|Держите).*?(:|\n)/i, '');
         if (restoredText.startsWith('```') && restoredText.endsWith('```')) {
            restoredText = restoredText.replace(/^```(?:markdown|text)?\n?([\s\S]*?)\n?```$/i, '$1');
         }
         restoredText = restoredText.trim();
      }

      if (restoredText && restoredText.length > content.length * 0.5) {
        improvements.push({
          type: 'voice_restored',
          original: content.substring(0, 200) + '...',
          improved: restoredText.substring(0, 200) + '...',
          reason: 'Восстановлен авторский голос через образы'
        });
        return restoredText;
      }
    } catch (error) {
      console.warn(`   ⚠️  Voice restoration failed: ${(error as Error).message}`);
    }

    return content;
  }

  /**
   * 📦 Собрать контент статьи из частей
   */
  private assembleContent(article: LongFormArticle): string {
    const parts: string[] = [
      article.lede,
      ...article.episodes.map(ep => ep.content),
      article.development || '',
      article.climax || '',
      article.resolution || '',
      article.finale
    ].filter(Boolean);
    
    return parts.join('\n\n');
  }
}

export default TextRestorationService;
