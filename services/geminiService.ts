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
      model: 'gemini-flash-latest',
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
      model: 'gemini-3-flash-preview',
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
Возьми этот план и напиши ЗАХВАТЫВАЮЩИЙ крючок (первые 150-250 слов):

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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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

Теперь напиши КУЛЬМИНАЦИЮ - самый острый момент (200-300 слов):

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
      model: 'gemini-3-flash-preview',
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

Напиши РАЗВЯЗКУ (200-300 слов), которая завершает конфликт:

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
      model: 'gemini-3-flash-preview',
      temperature: 0.9,
    });
  }

  /**
   * 🆕 Генерирует SMART описания сцен для изображений
   * Анализирует контент и создаёт релевантные prompt'ы
   */
  private async generateImageScenes(
    theme: string,
    fullContent: string,
    chunks: GenerationChunk[]
  ): Promise<string[]> {
    // Извлекаем ключевые моменты из текста
    const paragraphs = fullContent.split('\n\n').filter(p => p.length > 50);
    
    const hookSection = chunks.find(c => c.section === 'hook')?.content || '';
    const climaxSection = chunks.find(c => c.section === 'climax')?.content || '';
    const resolutionSection = chunks.find(c => c.section === 'resolution')?.content || '';

    try {
      // Запрашиваем у Gemini 3 релевантных描述 сцен на основе контента
      const prompt = `Ты генератор prompt'ов для AI изображений. На основе этой истории создай 3 РАЗНЫХ описания сцен для Midjourney/DALL-E:

Тема: "${theme}"

НАЧАЛО (завязка):
${hookSection.substring(0, 300)}

КУЛЬМИНАЦИЯ:
${climaxSection.substring(0, 300)}

ФИНАЛ:
${resolutionSection.substring(0, 300)}

ТВОЯ ЗАДАЧА:
Для каждой сцены создай детальный prompt в стиле: "Handheld mobile phone photo, amateur lighting, [КОНКРЕТНЫЕ ДЕТАЛИ ИЗ ИСТОРИИ]"

ТРЕБОВАНИЯ:
✓ Сцена 1: Что происходит в НАЧАЛЕ (эмоции, место, предметы)
✓ Сцена 2: Самый ОСТРЫЙ момент (конфликт, диалог, реакция)
✓ Сцена 3: КАК РЕШИЛОСЬ (счастье, правда, справедливость)
✓ Каждый prompt 1-2 строки
✓ Упоминай ПЕРСОНАЖЕЙ и ИХ ЭМОЦИИ из истории
✓ Базовая структура: "Handheld mobile phone photo, amateur lighting, [место], [что происходит], [лица/эмоции], [детали], [освещение/настроение]"
✓ ЗАБУДЬ про "tense confrontation scene" - используй КОНКРЕТНЫЕ детали из текста!

Ответ в формате JSON:
{"scenes": ["scene1", "scene2", "scene3"]}`;

      const response = await this.callGemini({
        prompt,
        model: 'gemini-3-flash-preview',
        temperature: 0.85,
      });

      if (!response || typeof response !== 'string') {
        console.warn('⚠️  generateImageScenes: callGemini returned empty/invalid response');
      } else {
        try {
          const parsed = JSON.parse(response);
          if (Array.isArray(parsed.scenes) && parsed.scenes.length === 3) {
            console.log('✅ Smart image scenes generated');
            return parsed.scenes;
          }
        } catch (e) {
          console.warn(
            '⚠️  Failed to parse image scenes JSON, using fallback. Error:',
            (e as Error).message,
            '\nResponse snippet:',
            response.substring(0, 500)
          );
        }
      }
    } catch (error) {
      console.warn('⚠️  Image scene generation failed:', (error as Error).message);
    }

    // Fallback если что-то пошло не так
    return [
      `Handheld mobile phone photo, amateur lighting, messy russian apartment, dramatic moment. ${paragraphs[0]?.substring(0, 80) || 'Woman in distress'}`,
      `Handheld mobile phone photo, amateur lighting, intense confrontation, raw emotions. ${paragraphs[Math.floor(paragraphs.length / 2)]?.substring(0, 80) || 'Conflict scene'}`,
      `Handheld mobile phone photo, amateur lighting, hopeful moment, warm light, justice served. ${paragraphs[paragraphs.length - 1]?.substring(0, 80) || 'Resolution and peace'}`,
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