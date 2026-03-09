import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ProjectConfig } from "./configService";
import { ExampleArticle } from "./examplesService";
import { MASCOT_CONFIG } from "../config/mascot.config";

export interface GenerationChunk {
  section: 'plan' | 'hook' | 'development' | 'climax' | 'resolution';
  content: string;
  char_count: number;
}
// ... (rest of the interfaces remain the same)

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
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      console.warn(
        '⚠️  generateFreshThemes: Gemini returned empty/invalid text:',
        JSON.stringify(response).substring(0, 500)
      );
      return ["Ошибка тем"];
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.warn(
        '⚠️  generateFreshThemes: Failed to parse JSON:',
        (error as Error).message,
        '\nRaw text snippet:',
        text.substring(0, 500)
      );
      return ["Ошибка тем"];
    }
  }

  /**
   * Главный метод: генерирует статью 10-12K символов с примерами
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

      // 🆕 Генерируем SMART образы на основе контента
      console.log('🎨 Генерирую описания сцен для изображений...');
      const imageScenes = await this.generateImageScenes(theme, fullContent, chunks);

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
          model_used: config.gemini_model || 'gemini-3-flash-preview',
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
    const examplesContext = examples
      .slice(0, 2)
      .map((ex, i) => `Пример ${i + 1}: "${ex.title}"\n${ex.content.substring(0, 800)}`)
      .join('\n\n');

    const prompt = `
Постройте ДЕТАЛЬНЫЙ план для очередного эпизода нашего путевого дневника: "${theme}"

ЦЕЛЕВАЯ АУДИТОРИЯ: Активные люди 50+, путешественники, любители жизни "как она есть".
ГЛАВНЫЙ ГЕРОЙ: Вы (автор) и ваш верный спутник — пес ${MASCOT_CONFIG.name} (${MASCOT_CONFIG.visual_description}).

МАТРИЦА СЕРИАЛА:
1. Связка (Recall) — откуда мы приехали? Где были вчера? (Например: "Вчера мы еще ели лаваш в Ереване, а сегодня уже...").
2. Логистика — как мы сюда попали (автобус, поезд, такси, Батон в переноске, самолет). Опиши одну бытовую деталь дороги.
3. Погружение — встреча с новым обрядом или едой. Трудности, запахи, звуки.
4. Инсайт — глубокое понимание момента вместе с ${MASCOT_CONFIG.name}.
5. Развязка — честный бюджет, мудрый вывод и ТИЗЕР: "Завтра мы пойдем в..."

Примеры стиля:
${examplesContext}

Вещи, которые ДОЛЖНЫ быть в плане:
- Конкретные детали: названия рынков, валюты, ингредиенты, звуки.
- Сцены с ${MASCOT_CONFIG.name}: его реакция на транспорт и новую среду.
- Честная финансовая деталь.
- Финальный "якорь" из методички.

Выведи структурированный план в виде краткого списка по 2-3 пункта для каждого этапа.
    `;

    const response = await this.callGemini({
      prompt,
      model: 'gemini-3-flash-preview',
      temperature: 0.9,
    });

    return response;
  }

  /**
   * Этап 2: Генерирует захватывающий крючок (первые абзацы путевого дневника)
   */
  private async generateHook(
    plan: string,
    examples: ExampleArticle[]
  ): Promise<string> {
    const exampleHook = examples[0]?.content.split('\n\n')[0] || '';

    const prompt = `
Возьми этот план и напиши ЗАХВАТЫВАЮЩИЙ крючок (первые 150-250 слов) в стиле СЕРИАЛЬНОГО путевого дневника:

${plan}

Пример хорошего захватывающего начала:
"${exampleHook}"

КРИТИЧНЫЕ ТРЕБОВАНИЯ:
✓ СТРОГО: Начни с упоминания предыдущей локации (связка: "Вчера мы были в...").
✓ СТРОГО: Опиши дорогу (автобус, самолет, пешком) и реакцию ${MASCOT_CONFIG.name}.
✓ СТИЛЬ: "Уставший, но счастливый странник". Голос живого человека, не ИИ.
✓ ИСПОЛЬЗУЙ СЕНСОРИКУ: запах дизеля, жара, шум дороги, тяжесть рюкзака.
✓ Никакой литературности! Как рассказывает попутчик за чашкой чая.
✓ Вопрос или интрига в конце первого абзаца.

Напиши только крючок, без предисловий.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-3-flash-preview',
      temperature: 0.95,
    });
  }

  /**
   * Этап 3: Генерирует развитие конфликта/погружения (Travel/Food Edition)
   */
  private async generateDevelopment(
    plan: string,
    hook: string,
    targetLength: number
  ): Promise<string> {
    const prompt = `
Продолжи историю Этно-Странника. Вот что уже написано:

${hook}

---

Напиши ПОГРУЖЕНИЕ (примерно ${Math.round(targetLength / 2)} символов) по плану:

${plan}

ПРАВИЛА развития:
✓ Опиши детали обряда или дегустации: ингредиенты, движения рук, взгляды местных.
✓ Покажи, как ${MASCOT_CONFIG.name} вписывается в этот новый мир.
✓ Конкретика: сколько стоит вход или блюдо, название улицы или храма.
✓ Инсайт: что автор начинает понимать о чужой культуре.
✓ Используй тире для диалогов с местными, НЕ кавычки.

Пиши ЕСТЕСТВЕННО, будто рассказываешь попутчику.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-3-flash-preview',
      temperature: 0.95,
    });
  }

  /**
   * Этап 4: Генерирует кульминацию/инсайт (Travel/Food Edition)
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

Напиши КУЛЬМИНАЦИЮ - момент самого глубокого погружения или инсайта (200-300 слов):

План:
${plan}

КУЛЬМИНАЦИЯ:
✓ Это пик ритуала, вкус самого острого блюда или неожиданный совет местного мудреца.
✓ Главная сцена: диалог, открытие или момент тишины вместе с ${MASCOT_CONFIG.name}.
✓ Используй короткие рубленые предложения для динамики.
✓ Инсайт должен быть понятен аудитории 50+ (о жизни, о вечном, о связи поколений).
✓ НИКАКИХ выводов - только действие и чувства!

Это пик напряжения, момент открытия.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-3-flash-preview',
      temperature: 0.95,
    });
  }

  /**
   * Этап 5: Генерирует развязку с мудрым выводом и честным бюджетом
   */
  private async generateResolution(
    climax: string
  ): Promise<string> {
    const prompt = `
Вот кульминация:
${climax}

---

Напиши РАЗВЯЗКУ (200-300 слов) в стиле Этно-Странника:

ВАЖНО:
✓ МУДРОСТЬ: Философский вывод, понятный читателям 50+ (о семье, о мире, о времени).
✓ ЧЕСТНЫЙ БЮДЖЕТ: Обязательно напиши, сколько это стоило (в рублях или местной валюте).
✓ Последний абзац — "якорь" из методички (простое действие прямо сейчас: выпить чаю, посмотреть на небо, погладить пса).
✓ ВОПРОС ДЛЯ КОММЕНТАРИЕВ: "А вы любите пробовать необычное?" или "Где вы нашли свое место силы?"

Пишите в том же тоне, что весь текст.
    `;

    return await this.callGemini({
      prompt,
      model: 'gemini-3-flash-preview',
      temperature: 0.9,
    });
  }

  /**
   * 🆕 Генерирует SMART описания сцен для изображений (Travel Edition)
   */
  private async generateImageScenes(
    theme: string,
    fullContent: string,
    chunks: GenerationChunk[]
  ): Promise<string[]> {
    const hookSection = chunks.find(c => c.section === 'hook')?.content || '';
    const climaxSection = chunks.find(c => c.section === 'climax')?.content || '';
    const resolutionSection = chunks.find(c => c.section === 'resolution')?.content || '';

    try {
      const prompt = `Создай 3 описания сцен для AI изображений на основе истории:
"${theme}"

МАСКОТ (пес): ${MASCOT_CONFIG.name} (${MASCOT_CONFIG.visual_description}).

ТВОЯ ЗАДАЧА:
Сгенерируй детальный prompt для каждой сцены:
✓ Сцена 1: Завязка путешествия. Пёс ${MASCOT_CONFIG.name} в обстановке места (рынок, улица, храм).
✓ Сцена 2: Кульминация (самый яркий момент обряда или дегустации). Эмоции на лицах и ${MASCOT_CONFIG.name}.
✓ Сцена 3: Спокойный финал (вывод, честный расчет). Уютная обстановка с псом.

СТИЛЬ: "Authentic travel smartphone photo, amateur lighting, 16:9 aspect ratio."
ОБЯЗАТЕЛЬНО: В КАЖДОЙ сцене должен присутствовать пёс ${MASCOT_CONFIG.name} (${MASCOT_CONFIG.visual_description}).

Ответ в формате JSON:
{"scenes": ["scene1", "scene2", "scene3"]}`;

      const response = await this.callGemini({
        prompt,
        model: 'gemini-3-flash-preview',
        temperature: 0.85,
      });

      try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed.scenes)) return parsed.scenes;
      } catch (e) {
        console.warn('⚠️ JSON parse failed for scenes');
      }
    } catch (error) {
      console.warn('⚠️ Image scene generation failed');
    }

    return [
      `Travel smartphone photo, amateur lighting, ${theme}, ${MASCOT_CONFIG.image_prompt_injection} in the start of journey.`,
      `Travel smartphone photo, amateur lighting, peak of ritual/food tasting, ${MASCOT_CONFIG.image_prompt_injection} reacting curiously.`,
      `Travel smartphone photo, amateur lighting, calm resolution, ${MASCOT_CONFIG.image_prompt_injection} resting near the traveler.`
    ];
  }

  /**
   * Генерирует привлекательный заголовок
   */
  private async generateTitle(theme: string, hook: string): Promise<string> {
    const prompt = `
Тема: "${theme}"
Начало статьи: "${hook.substring(0, 200)}..."

Сгенерируй 1 краткий, интригующий заголовок для Дзена (3-7 слов). JSON: {"title": "..."}.  Только JSON.
    `;

    try {
      const response = await this.callGemini({
        prompt,
        model: 'gemini-3-flash-preview',
        temperature: 0.8,
      });
      const parsed = JSON.parse(response);
      return parsed.title || theme;
    } catch {
      return theme;
    }
  }

  /**
   * Проверяет человечность текста на основе ПОЛНОГО контента
   * FIX v4.0.2: Теперь анализирует весь текст, не только первые 2000 символов!
   * 
   * Стратегия: проверяются три срезов (начало, середина, конец) для полного охвата
   */
  async checkHumanity(text: string) {
    // FIX: вместо substring(0, 2000) проверяем ВСЕ части текста
    const slices = this.extractRepresentativeSlices(text);
    
    const prompt = `Оцени ПОЛНЫЙ текст на признаки ИИ. Выдай JSON { "score": 0-100, "tips": ["совет1", "совет2"] }. 

Полный текст для анализа:
${slices}

Критерии оценки:
- Вариативность в стиле и структуре предложений
- Наличие человеческих ошибок и естественных переходов
- Разнообразие используемого словаря
- Эмоциональная составляющая и личные переживания

Выдай ЧЕСТНЫЙ скор 0-100, где:
0-30 = явный AI (однородный стиль, клише, предсказуемость)
30-60 = смешанный контент (есть признаки обоих)
60-100 = человеческий текст (вариативный, живой, эмоциональный)`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText || typeof resultText !== 'string') {
      console.warn(
        '⚠️  checkHumanity: Gemini returned empty/invalid text:',
        JSON.stringify(response).substring(0, 500)
      );
      return { score: 50, tips: ["Не удалось провести анализ"] };
    }

    try {
      return JSON.parse(resultText);
    } catch (error) {
      console.warn(
        '⚠️  checkHumanity: Failed to parse JSON:',
        (error as Error).message,
        '\nRaw text snippet:',
        resultText.substring(0, 500)
      );
      return { score: 50, tips: ["Не удалось провести анализ"] };
    }
  }

  /**
   * Извлекает репрезентативные срезы текста для анализа
   * Охватывает: начало (30%), середину (30%), конец (30%)
   */
  private extractRepresentativeSlices(text: string): string {
    const charThreshold = 2000; // каждый срез
    const totalChars = text.length;

    if (totalChars <= charThreshold * 2) {
      // Если текст короткий, возвращаем весь
      return text;
    }

    const slices: string[] = [];

    // Срез 1: Начало (0-30%)
    slices.push(`[НАЧАЛО ТЕКСТА]\n${text.substring(0, charThreshold)}`);

    // Срез 2: Середина (35-65%)
    const midStart = Math.floor(totalChars * 0.35);
    slices.push(`\n[СЕРЕДИНА ТЕКСТА]\n${text.substring(midStart, midStart + charThreshold)}`);

    // Срез 3: Конец (70-100%)
    const endStart = Math.max(totalChars - charThreshold, 0);
    slices.push(`\n[КОНЕЦ ТЕКСТА]\n${text.substring(endStart)}`);

    return slices.join('\n');
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
      // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          topK: 40,
          topP: 0.95,
        },
      });

      // ✅ Проверка ответа Gemini
      if (!response) {
        console.error('❌ Gemini returned empty response (undefined)');
        throw new Error('Empty response from Gemini API');
      }

      if (!response.candidates || response.candidates.length === 0) {
        console.error('❌ Gemini returned no candidates:', JSON.stringify(response).substring(0, 500));
        throw new Error('No candidates in Gemini response');
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        console.error('❌ Gemini response has no content parts:', JSON.stringify(response).substring(0, 500));
        throw new Error('No content parts in Gemini response');
      }

      const text = candidate.content.parts[0].text;
      if (!text || typeof text !== 'string') {
        console.error('❌ Gemini response text is empty or invalid:', text);
        throw new Error('Text property is empty or invalid in Gemini response');
      }

      return text;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`Ошибка вызова ${model}:`, errorMessage);
      
      // 🔄 ФОЛБЕК: если модель перегружена, используем gemini-2.5-flash-lite
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`🔄 Model overloaded, trying fallback to gemini-2.5-flash-lite...`);

        try {
          const fallbackResponse = await this.ai.models.generateContent({
            model: "gemini-2.5-flash-lite", // 🔥 ФОЛБЕК МОДЕЛЬ
            contents: prompt,
            config: {
              temperature,
              topK: 40,
              topP: 0.95,
            },
          });

          // ✅ Проверка fallback ответа Gemini
          if (!fallbackResponse) {
            console.error('❌ Fallback returned empty response');
            throw new Error('Empty fallback response from Gemini API');
          }

          if (!fallbackResponse.candidates || fallbackResponse.candidates.length === 0) {
            console.error('❌ Fallback returned no candidates');
            throw new Error('No candidates in fallback response');
          }

          const fallbackCandidate = fallbackResponse.candidates[0];
          if (!fallbackCandidate.content || !fallbackCandidate.content.parts || !fallbackCandidate.content.parts[0]) {
            console.error('❌ Fallback response has no content parts');
            throw new Error('No content parts in fallback response');
          }

          const fallbackText = fallbackCandidate.content.parts[0].text;
          if (!fallbackText || typeof fallbackText !== 'string') {
            console.error('❌ Fallback text is empty or invalid');
            throw new Error('Text property is empty or invalid in fallback response');
          }

          console.log(`✅ Fallback successful`);
          return fallbackText;
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, (fallbackError as Error).message);
          throw fallbackError;
        }
      }

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