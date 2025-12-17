import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ProjectConfig } from "./configService";
import { ExampleArticle } from "./examplesService";

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
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    try { return JSON.parse(response.text); } catch { return ["Ошибка тем"]; }
  }

  /**
   * Главный метод: генерирует статью 10-15K символов с примерами
   * Использует многоступенчатый подход (plan → hook → development → climax → resolution)
   */
  async generateArticleDataChunked(params: {
    theme: string;
    config: ProjectConfig;
    examples: ExampleArticle[];
  }): Promise<ArticleGenerationResult> {
    const startTime = Date.now();
    const { theme, config, examples } = params;
    const targetChars = config.content_rules.min_chars + 
      Math.floor((config.content_rules.max_chars - config.content_rules.min_chars) / 2);

    console.log(`🎯 Генерирую статью на тему: "${theme}"`);
    console.log(`📊 Целевой объём: ${targetChars} символов`);
    console.log(`📚 Используемые примеры: ${examples.length}`);

    try {
      // Этап 1: План структуры
      console.log('📋 Этап 1: Построение плана...');
      const plan = await this.generatePlan(theme, config, examples);

      // Этап 2: Захватывающий крючок (завязка)
      console.log('🪝 Этап 2: Написание крючка...');
      const hook = await this.generateHook(plan, examples);

      // Этап 3: Развитие (основной конфликт)
      console.log('⬆️  Этап 3: Развитие конфликта...');
      const development = await this.generateDevelopment(plan, hook, targetChars * 0.5);

      // Этап 4: Кульминация
      console.log('💥 Этап 4: Кульминация...');
      const climax = await this.generateClimax(plan, development);

      // Этап 5: Развязка (справедливое возмездие)
      console.log('🎬 Этап 5: Развязка...');
      const resolution = await this.generateResolution(climax);

      // Собираем всё воедино
      const chunks: GenerationChunk[] = [
        { section: 'hook', content: hook, char_count: hook.length },
        { section: 'development', content: development, char_count: development.length },
        { section: 'climax', content: climax, char_count: climax.length },
        { section: 'resolution', content: resolution, char_count: resolution.length },
      ];

      const fullContent = this.concatenateChunks(chunks);
      const finalChars = fullContent.length;

      console.log(`✅ Статья готова: ${finalChars} символов`);

      // Генерируем образы для статьи
      const imageScenes = this.extractImageScenes(fullContent);

      // Генерируем заголовок на основе первого абзаца
      const title = await this.generateTitle(theme, hook);

      return {
        title,
        content: fullContent,
        imageScenes,
        chunks,
        metadata: {
          total_chars: finalChars,
          generation_time_ms: Date.now() - startTime,
          model_used: config.gemini_model || 'gemini-2.5-pro',
        },
      };
    } catch (error) {
      console.error('❌ Ошибка при генерации статьи:', error);
      throw error;
    }
  }

  /**
   * Этап 1: Генерирует план структуры истории
   */
  private async generatePlan(
    theme: string,
    config: ProjectConfig,
    examples: ExampleArticle[]
  ): Promise<string> {
    const examplesContext = examples
      .slice(0, 2)
      .map((ex, i) => `Пример ${i + 1}: "${ex.title}"\n${ex.content.substring(0, 800)}`)
      .join('\n\n');

    const prompt = `
Постройте ДЕТАЛЬНЫЙ план для драматичной истории о: "${theme}"

Матрица сюжета:
1. Завязка - момент, когда всё меняется
2. Развитие - конфликт нарастает через неожиданные события
3. Кульминация - самый острый момент, когда читатель думает "это конец"
4. Развязка - справедливое возмездие или триумф

Примеры лучших историй (используй в качестве эталона стиля):
${examplesContext}

Вещи, которые ДОЛЖНЫ быть в плане:
- Персонажи (жертва, агрессор, свидетель)
- Конкретные бытовые детали (названия вещей, места, время года)
- Неожиданные повороты на каждом этапе
- Финальное торжество справедливости

Выведи структурированный план в виде краткого списка по 2-3 пункта для каждого этапа.
    `;

    const response = await this.callGemini({
      prompt,
      model: 'gemini-2.5-pro',
      temperature: 0.9,
    });

    return response;
  }

  /**
   * Этап 2: Генерирует захватывающий крючок (первые абзацы)
   */
  private async generateHook(
    plan: string,
    examples: ExampleArticle[]
  ): Promise<string> {
    const exampleHook = examples[0]?.content.split('\n\n')[0] || '';

    const prompt = `
Возьми этот план и напиши ЗАХВАТЫВАЮЩИЙ крючок (первые 200-400 слов):

${plan}

Пример хорошего крючка (на предмет эмоционального напряжения):
"${exampleHook}"

КРИТИЧНЫЕ ТРЕБОВАНИЯ для крючка:
✓ Первое предложение должно БИЙ ТОЧНО В ЦЕЛЬ эмоционально
✓ Используй диалог или действие, НЕ описание
✓ Реальные детали (квартира, кухня, чай, запахи)
✓ Никакой литературности! Как рассказывает соседка
✓ Вопрос или интрига в конце первого абзаца

Напиши только крючок, без предисловий.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-2.5-flash',
      temperature: 0.95,
    });
  }

  /**
   * Этап 3: Генерирует развитие конфликта
   */
  private async generateDevelopment(
    plan: string,
    hook: string,
    targetLength: number
  ): Promise<string> {
    const prompt = `
Продолжи историю. Вот что уже написано:

${hook}

---

Теперь напиши РАЗВИТИЕ конфликта (примерно ${Math.round(targetLength / 2)} символов):

${plan}

ПРА ВИЛА развития:
✓ Каждый абзац должен добавлять НАПРЯЖЕНИЕ
✓ Используй диалоги, показывай реакции персонажей
✓ Перечисляй конкретные события (даты, суммы, имена)
✓ Читатель должен думать: "Как он вообще это вынес!"
✓ Варьируй длину абзацев (короткие + длинные)
✓ Используй тире для диалогов, НЕ кавычки

Пиши ЕСТЕСТВЕННО, будто рассказываешь подруге.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-2.5-pro',
      temperature: 0.95,
    });
  }

  /**
   * Этап 4: Генерирует кульминацию
   */
  private async generateClimax(
    plan: string,
    development: string
  ): Promise<string> {
    const lastParagraphs = development.split('\n\n').slice(-3).join('\n\n');

    const prompt = `
Вот текущее состояние истории (последние абзацы):
${lastParagraphs}

---

Теперь напиши КУЛЬМИНАЦИЮ - самый острый момент (400-600 слов):

План:
${plan}

КУЛЬМИНАЦИЯ:
✓ Это вершина конфликта - персонажи находятся на краю пропасти
✓ Должна быть ОДНА главная сцена с диалогом или откровением
✓ Читатель должен почувствовать: "Боже, что дальше?!"
✓ Используй короткие рубленые предложения для динамики
✓ Персонаж может вспомнить что-то важное, найти доказательство, сказать правду
✓ НИКАКИХ выводов - только действие и диалоги!

Это НЕ финал, это именно КУЛЬМИНАЦИЯ, пик напряжения.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-2.5-pro',
      temperature: 0.95,
    });
  }

  /**
   * Этап 5: Генерирует развязку со справедливым возмездием
   */
  private async generateResolution(
    climax: string
  ): Promise<string> {
    const prompt = `
Вот кульминация:
${climax}

---

Напиши РАЗВЯЗКУ (300-500 слов), которая завершает конфликт:

ВАЖНО:
✓ Справедливость ДОЛЖНА побеждать (либо герой встал на ноги, либо враг наказан)
✓ Развязка может быть счастливой, горькой, но СПРАВЕДЛИВОЙ
✓ Закрытый конец - ВСЕ ТОЧКИ расставлены
✓ Эпилог: "А потом...", "Спустя время...", "Теперь..."
✓ Последний абзац - размышление героя или урок жизни
✓ ВОПРОС ДЛЯ КОММЕНТАРИЕВ в самый конец: "А вы как бы поступили?" или "Вы верите в справедливость?"

Пишите в том же тоне, что весь текст.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-2.5-flash',
      temperature: 0.9,
    });
  }

  /**
   * Генерирует привлекательный заголовок
   */
  private async generateTitle(theme: string, hook: string): Promise<string> {
    const prompt = `
Тема: "${theme}"
Начало статьи: "${hook.substring(0, 200)}..."

Сгенерируй 1 краткий, интригующий заголовок для Дзена (3-7 слов). JSON: {"title": "..."}. Только JSON.
    `;

    try {
      const response = await this.callGemini({
        prompt,
        model: 'gemini-2.5-flash',
        temperature: 0.8,
      });
      const parsed = JSON.parse(response);
      return parsed.title || theme;
    } catch {
      return theme;
    }
  }

  /**
   * Генерирует описания образов для визуальных сцен
   */
  private extractImageScenes(content: string): string[] {
    const scenes: string[] = [];
    
    // Извлекаем ключевые моменты
    const paragraphs = content.split('\n\n');
    
    // Сцена 1: Начало
    scenes.push(`Handheld mobile phone photo, amateur lighting, messy russian apartment. ${paragraphs[0].substring(0, 100)}`);
    
    // Сцена 2: Кульминация
    if (paragraphs.length > 5) {
      const climaxPara = paragraphs[Math.floor(paragraphs.length / 2)];
      scenes.push(`Raw emotion, tense confrontation scene, old furniture. ${climaxPara.substring(0, 100)}`);
    }
    
    // Сцена 3: Финал
    if (paragraphs.length > 0) {
      const finalPara = paragraphs[paragraphs.length - 1];
      scenes.push(`Hope and justice triumph, warm lighting, redemption moment. ${finalPara.substring(0, 100)}`);
    }

    return scenes;
  }

  /**
   * Проверяет человечность текста
   */
  async checkHumanity(text: string) {
    const prompt = `Оцени текст на признаки ИИ. Выдай JSON { "score": 0-100, "tips": ["короткий совет"] }. Текст: ${text.substring(0, 2000)}`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    try { return JSON.parse(response.text); } catch { return { score: 50, tips: [] }; }
  }

  /**
   * Генерирует визуальный контент
   */
  async generateVisual(sceneDescription: string) {
    const prompt = `Realistic smartphone photo, amateur lighting, messy russian apartment, raw emotion, pov. Subject: ${sceneDescription}. 16:9.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data 
      ? `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}` 
      : null;
  }

  /**
   * Публичный метод для вызова Gemini с обработкой ошибок
   * Используется как в этом сервисе, так и в других (например, MultiAgentService)
   */
  public async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    const { prompt, model, temperature } = params;
    
    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text;
    } catch (error) {
      console.error(`Ошибка вызова ${model}:`, error);
      throw error;
    }
  }

  /**
   * Собирает чанки в одну статью
   */
  private concatenateChunks(chunks: GenerationChunk[]): string {
    return chunks
      .map(chunk => chunk.content)
      .join('\n\n')
      .replace(/##\s+/g, '\n\n')
      .trim();
  }
}

export const geminiService = new GeminiService();
