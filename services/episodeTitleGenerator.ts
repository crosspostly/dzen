import { GoogleGenAI } from "@google/genai";

/**
 * Генерирует лаконичные русские названия для эпизодов.
 * Примеры: "Горячая правда", "Первая искра возмущения", "Граница перейдена".
 */
export class EpisodeTitleGenerator {
  private geminiClient: GoogleGenAI;
  private MAX_RETRIES = 3; // Количество повторных попыток при ошибке

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Генерирует ЛАКОНИЧНЫЙ (2-5 слов) русский заголовок эпизода.
   * @param episodeNumber номер эпизода (1-12)
   * @param content текст эпизода (первые 300 символов используются как контекст)
   * @param openLoop hook/cliffhanger эпизода
   */
  async generateEpisodeTitle(
    episodeNumber: number,
    content: string,
    openLoop: string
  ): Promise<string> {
    const contentPreview = (content || "").substring(0, 300);

    const prompt = `Ты редактор Яндекс.Дзен. Создай ЛАКОНИЧНЫЙ русский заголовок (3-5 СЛОВ!) для эпизода #${episodeNumber}.

КОНТЕКСТ:
- Суть эпизода: "${openLoop}"
- Начало текста: ${contentPreview}...

ТРЕБОВАНИЯ:
1. ✅ ТОЛЬКО 3-5 СЛОВ (не больше, не меньше!)
2. ✅ Эмоциональный, энергичный
3. ✅ БЕЗ слова "Эпизод"
4. ✅ РУССКИЙ язык ТОЛЬКО
5. ✅ Без кавычек
6. ✅ Без точек в конце
7. ✅ Действенное название, не описание

✅ ОТЛИЧНЫЕ ПРИМЕРЫ (3-5 слов):
- "Горячая правда" (2 слова - ОК)
- "Первая искра возмущения" (3 слова - ОК)
- "Граница перейдена" (2 слова - ОК)
- "Молчание рвется наконец" (3 слова - ОК)
- "Вспышка ярости и боли" (4 слова - ОК)
- "Слова меняют всё" (3 слова - ОК)
- "Тишина, которая кричит" (3 слова - ОК)

❌ ПЛОХИЕ ПРИМЕРЫ (избегать!):
- "Это был тот момент когда всё изменилось" (слишком длинно)
- "Episode 1 Part A" (английский, не подходит)
- "Елена говорит с матерью" (слишком описательно)
- "Очень длинное название из семи или восьми слов" (слишком много)

ОТВЕТЬ ТОЛЬКО НАЗВАНИЕМ (без JSON, без кавычек, без объяснений):`;;

    // Попытаемся с retries
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Чередуем модели при повторах для разнообразия
        const model = attempt === 1 
          ? "gemini-3-flash"      // PRIMARY
          : attempt === 2 
          ? "gemini-3-flash"       // FALLBACK 1
          : "gemini-3-flash";            // FALLBACK 2

        console.log(`   📝 Generating title (attempt ${attempt}/${this.MAX_RETRIES}, model: ${model})...`);

        const response = await this.geminiClient.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.85,
            topK: 40,
            topP: 0.95,
          },
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text || typeof text !== 'string') {
          console.warn(
            `   ⚠️  EpisodeTitleGenerator: empty/invalid text from Gemini (model: ${model})`,
            JSON.stringify(response).substring(0, 500)
          );
          if (attempt < this.MAX_RETRIES) continue;
          return `Часть ${episodeNumber}`;
        }

        const title = text
          .trim()
          .replace(/^[\s"'`({\[<]+/, "")
          .replace(/[\s"'`)\}\]>]+$/, "")
          .replace(/^[-–—]\s*/, "")
          .replace(/\.+$/, "")
          .replace(/\s+/g, " ")
          .substring(0, 60);

        if (!title || title.length < 3) {
          console.warn(`   ⚠️  Title too short: "${title}" (${title.length} chars)`);
          if (attempt < this.MAX_RETRIES) continue;
          return `Часть ${episodeNumber}`;
        }

        if (!/[а-яёА-ЯЁ]/.test(title) || /\b(Episode|Эпизод)\b/i.test(title)) {
          console.warn(`   ⚠️  Invalid title format: "${title}"`);
          if (attempt < this.MAX_RETRIES) continue;
          return `Часть ${episodeNumber}`;
        }

        const words = title.split(/\s+/).filter(Boolean);
        if (words.length < 2 || words.length > 5) {
          console.warn(`   ⚠️  Wrong word count (${words.length}): "${title}"`);
          if (attempt < this.MAX_RETRIES) continue;
          return `Часть ${episodeNumber}`;
        }

        console.log(`   ✅ Title generated: "${title}"`);
        return title;

      } catch (error) {
        const errorMessage = (error as Error).message;
        console.warn(`   ❌ Attempt ${attempt} failed: ${errorMessage}`);

        // Если это ошибка API (503, overloaded), может быть стоит retry
        if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
          if (attempt < this.MAX_RETRIES) {
            console.log(`   ⏳ Waiting 2s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }

        // Если это последний retry, используем fallback
        if (attempt === this.MAX_RETRIES) {
          console.error(`   ⚠️  All retries exhausted for episode #${episodeNumber}, using fallback`);
          return `Часть ${episodeNumber}`;
        }
      }
    }

    // Не должно дойти сюда, но на случай:
    return `Часть ${episodeNumber}`;
  }

  /**
   * Генерирует названия для всех эпизодов (последовательно).
   */
  async generateMultipleTitles(
    episodes: Array<{ id: number; content: string; openLoop: string }>
  ): Promise<Map<number, string>> {
    const titles = new Map<number, string>();

    console.log(`\n🎬 Generating laconic Russian titles for ${episodes.length} episodes...`);

    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];

      const title = await this.generateEpisodeTitle(
        episode.id,
        episode.content,
        episode.openLoop
      );

      titles.set(episode.id, title);
      console.log(`   📝 Episode #${episode.id}: "${title}"`);

      if (i < episodes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return titles;
  }
}
