import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ProjectConfig } from "./configService";
import { ExampleArticle } from "./examplesService";
import { MASCOT_CONFIG } from "../config/mascot.config";
import path from "path";
import { MODELS, DEFAULT_TEXT_MODEL } from "../constants/MODELS_CONFIG";
import { examplesService } from "./examplesService";

export interface GenerationChunk {
  section: 'plan' | 'hook' | 'development' | 'climax' | 'resolution';
  content: string;
  char_count: number;
}

export interface ArticleGenerationResult {
  title: string;
  content: string;
  imageScenes: string[];
  chunks: GenerationChunk[];
  metadata: {
    total_chars: number;
    generation_time_ms: number;
    model_used: string;
  };
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Генерирует свежие темы для вирального контента
   */
  async generateFreshThemes() {
    const prompt = `Сгенерируй 5 ОСТРЫХ, провокационных заголовков для Яндекс.Дзен (CTR++). JSON массив строк.`;
    const response = await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.9
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️  generateFreshThemes: Failed to parse response');
      return ["Ошибка тем"];
    }
  }

  /**
   * Главный метод: генерирует статью 10-12K символов с примерами
   */
  async generateArticleDataChunked(params: {
    theme: string;
    config: ProjectConfig;
    examples: ExampleArticle[];
  }): Promise<ArticleGenerationResult> {
    const startTime = Date.now();
    const { theme, config, examples } = params;
    
    // Sanitize theme
    const safeTheme = this.sanitizeBaton(theme);
    
    const targetChars = config.content_rules.min_chars + 
      Math.floor((config.content_rules.max_chars - config.content_rules.min_chars) / 2);

    console.log(`🎯 Генерирую статью на тему: "${safeTheme}"`);

    try {
      // Этап 1: План структуры
      console.log('📋 Этап 1: Построение плана...');
      const plan = await this.generatePlan(safeTheme, config, examples);

      // Этап 2: Захватывающий крючок (завязка)
      console.log('🪝 Этап 2: Написание крючка...');
      const hook = await this.generateHook(plan, examples);

      // Этап 3: Развитие (основной конфликт)
      console.log('⬆️  Этап 3: Развитие конфликта...');
      const development = await this.generateDevelopment(plan, hook, targetChars * 0.5);

      // Этап 4: Кульминация
      console.log('💥 Этап 4: Кульминация...');
      const climax = await this.generateClimax(plan, development);

      // Этап 5: Развязка
      console.log('🎬 Этап 5: Развязка...');
      const resolution = await this.generateResolution(climax);

      // Собираем всё воедино
      const chunks: GenerationChunk[] = [
        { section: 'hook', content: hook, char_count: hook.length },
        { section: 'development', content: development, char_count: development.length },
        { section: 'climax', content: climax, char_count: climax.length },
        { section: 'resolution', content: resolution, char_count: resolution.length },
      ];

      const fullContent = this.sanitizeBaton(this.concatenateChunks(chunks));
      const finalChars = fullContent.length;

      console.log(`✅ Статья готова: ${finalChars} символов`);

      // 🆕 Генерируем SMART образы на основе контента
      console.log('🎨 Генерирую описания сцен для изображений...');
      const imageScenes = await this.generateImageScenes(safeTheme, fullContent, chunks);

      // Генерируем заголовок на основе первого абзаца
      const title = this.sanitizeBaton(await this.generateTitle(safeTheme, hook));

      return {
        title,
        content: fullContent,
        imageScenes,
        chunks,
        metadata: {
          total_chars: finalChars,
          generation_time_ms: Date.now() - startTime,
          model_used: MODELS.TEXT.PRIMARY,
        },
      };
    } catch (error) {
      console.error('❌ Ошибка при генерации статьи:', error);
      throw error;
    }
  }

  /**
   * Этап 1: Генерирует план структуры истории (Сериальный Путевой Дневник)
   */
  private async generatePlan(
    theme: string,
    config: ProjectConfig,
    examples: ExampleArticle[]
  ): Promise<string> {
    // 🆕 v9.4: Robust hard switch
    const isTravelChannel = /travel|nomad|food|ethno|culture/i.test(JSON.stringify(config.audience)) || 
                            /путешеств|еда|обряд|батон/i.test(theme);
    
    const examplesFile = isTravelChannel ? 'travel_examples.json' : 'parsed_examples.json';
    const jsonPath = path.join(process.cwd(), examplesFile);
    
    console.log(`🧠 GeminiService RAG: Loading examples from ${examplesFile}`);
    const actualExamples = examplesService.loadParsedExamples(jsonPath);
    const topExamples = examplesService.selectBestExamples(actualExamples, 2);

    const examplesContext = topExamples
      .map((ex, i) => `Пример ${i + 1} (ДЛЯ СТРУКТУРЫ): "${ex.title}"\n${ex.content.substring(0, 800)}`)
      .join('\n\n');

    const prompt = `
Постройте ДЕТАЛЬНЫЙ план для очередного эпизода нашего путевого дневника: "${theme}"

ВАЖНО: Примеры ниже даны ТОЛЬКО для понимания формата (наличие связки, Батона, честного бюджета). 
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО копировать локации и события из примеров. 
Ваша задача: написать УНИКАЛЬНУЮ историю про ${theme}, опираясь на свои знания географии и культуры.

ЦЕЛЕВАЯ АУДИТОРИЯ: Активные люди 50+, путешественники, любители жизни "как она есть".
ГЛАВНЫЙ ГЕРОЙ: Вы (автор) и ваш верный спутник — пес ${MASCOT_CONFIG.name} (${MASCOT_CONFIG.visual_description}).

МАТРИЦА СЕРИАЛА:
1. Связка (Recall) — откуда мы приехали? Где были вчера?
2. Логистика — как мы сюда попали (автобус, поезд, такси, Батон в переноске, самолет).
3. Погружение — встреча с новым обрядом или едой.
4. Инсайт — глубокое понимание момента вместе с ${MASCOT_CONFIG.name}.
5. Развязка — честный бюджет, мудрый вывод и ТИЗЕР: "Завтра мы пойдем в..."

Выведи структурированный план в виде краткого списка по 2-3 пункта для каждого этапа.
    `;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.9,
    });
  }

  private async generateHook(plan: string, examples: ExampleArticle[]): Promise<string> {
    const prompt = `Напиши ЗАХВАТЫВАЮЩИЙ крючок путевого дневника по плану:\n${plan}\n\nСтиль: уставший странник, сенсорика, Батон.`;
    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.95,
    });
  }

  private async generateDevelopment(plan: string, hook: string, targetLength: number): Promise<string> {
    const prompt = `Продолжи историю (ПОГРУЖЕНИЕ):\nПлан: ${plan}\nУже есть: ${hook}\n\nОпиши детали обряда/еды, Батона и конкретику.`;
    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.95,
    });
  }

  private async generateClimax(plan: string, development: string): Promise<string> {
    const prompt = `Напиши КУЛЬМИНАЦИЮ (пик инсайта):\nПлан: ${plan}\nПредыдущий текст: ${development.slice(-500)}`;
    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.95,
    });
  }

  private async generateResolution(climax: string): Promise<string> {
    const prompt = `Напиши РАЗВЯЗКУ (мудрость + бюджет + тизер):\nКульминация: ${climax.slice(-500)}`;
    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.9,
    });
  }

  private async generateImageScenes(theme: string, fullContent: string, chunks: GenerationChunk[]): Promise<string[]> {
    const prompt = `Создай 3 описания сцен для AI фото (Батон, путешествие):\nТема: ${theme}\n\nJSON: {"scenes": ["...", "...", "..."]}`;
    const response = await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.85,
    });
    try {
      const parsed = JSON.parse(response);
      return parsed.scenes;
    } catch {
      return ["Travel scene", "Food scene", "Final scene"];
    }
  }

  private async generateTitle(theme: string, hook: string): Promise<string> {
    const prompt = `Краткий заголовок Дзен (3-7 слов) для темы: ${theme}. JSON: {"title": "..."}`;
    const response = await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.8,
    });
    try {
      return JSON.parse(response).title;
    } catch {
      return theme;
    }
  }

  /**
   * 🛡️ THE BATON GUARD: Strictly replaces any mentions of 'Снежок' with 'Батон'
   */
  private sanitizeBaton(text: string): string {
    if (!text) return text;
    return text.replace(/Снежок/g, 'Батон')
               .replace(/Снежка/g, 'Батона')
               .replace(/Снежку/g, 'Батону')
               .replace(/Снежком/g, 'Батоном')
               .replace(/Снежке/g, 'Батоне');
  }

  async checkHumanity(text: string) {
    const slices = this.extractRepresentativeSlices(text);
    const prompt = `Оцени ПОЛНЫЙ текст на признаки ИИ. Выдай JSON { "score": 0-100 }. Текст:\n${slices}`;
    const response = await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.5
    });
    try {
      return JSON.parse(response);
    } catch {
      return { score: 50 };
    }
  }

  private extractRepresentativeSlices(text: string): string {
    return text.substring(0, 2000);
  }

  /**
   * Публичный метод для вызова Gemini с каскадным переключением (Waterfall)
   */
  public async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    const { prompt, temperature } = params;
    
    for (let i = 0; i < MODELS.WATERFALL.length; i++) {
      const currentModel = MODELS.WATERFALL[i];
      
      try {
        const response = await this.ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: { temperature, topK: 40, topP: 0.95 },
        });

        if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Empty response');
        }

        return this.cleanGeminiResponse(response.candidates[0].content.parts[0].text);

      } catch (error) {
        const errorMessage = (error as Error).message;
        const isRetryable = errorMessage.includes('503') || 
                           errorMessage.includes('overloaded') || 
                           errorMessage.includes('429') ||
                           errorMessage.includes('UNAVAILABLE');

        if (isRetryable && i < MODELS.WATERFALL.length - 1) {
          console.log(`🔄 ${currentModel} overloaded, trying next: ${MODELS.WATERFALL[i+1]}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Waterfall failed');
  }

  private cleanGeminiResponse(text: string): string {
    return text.replace(/^```(?:json|markdown|text)?\n?([\s\S]*?)\n?```$/i, '$1').trim();
  }

  private concatenateChunks(chunks: GenerationChunk[]): string {
    return chunks.map(chunk => chunk.content).join('\n\n').trim();
  }
}

export const geminiService = new GeminiService();
