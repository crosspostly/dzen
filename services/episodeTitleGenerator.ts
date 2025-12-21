import type { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Генерирует лаконичные русские названия для эпизодов.
 * Примеры: "Горячая правда", "Первая искра возмущения", "Граница перейдена".
 */
export class EpisodeTitleGenerator {
  private geminiClient?: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    if (key) {
      this.geminiClient = new GoogleGenerativeAI({ apiKey: key });
    }
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
    if (!this.geminiClient) {
      return `Эпизод ${episodeNumber}`;
    }

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

ОТВЕТЬ ТОЛЬКО НАЗВАНИЕМ (без JSON, без кавычек, без объяснений):`;

    try {
      // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-2.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
        },
      });

      const title = (response.text || "")
        .trim()
        .replace(/^[\s"'`({\[<]+/, "")
        .replace(/[\s"'`)\}\]\>]+$/, "")
        .replace(/^[-–—]\s*/, "")
        .replace(/\.+$/, "")
        .replace(/\s+/g, " ")
        .substring(0, 60);

      if (!title || title.length < 3) {
        return `Часть ${episodeNumber}`;
      }

      if (!/[а-яёА-ЯЁ]/.test(title) || /\b(Episode|Эпизод)\b/i.test(title)) {
        return `Часть ${episodeNumber}`;
      }

      const words = title.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 5) {
        return `Часть ${episodeNumber}`;
      }

      return title;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`Episode #${episodeNumber} primary model failed (${errorMessage}), trying fallback...`);
      
      // 🔄 ФОЛБЕК: если модель перегружена
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`Trying fallback to gemini-2.5-flash-exp-02-05...`);
        
        try {
          const fallbackModel = this.geminiClient!.getGenerativeModel({ model: "gemini-2.5-flash-exp-02-05" });
          const fallbackResponse = await fallbackModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              topK: 40,
              topP: 0.95,
            },
          });

          const fallbackTitle = (fallbackResponse.text || "")
            .trim()
            .replace(/^[\s"'`({\[<]+/, "")
            .replace(/[\s"'`)\}\]\>]+$/, "")
            .replace(/^[-–—]\s*/, "")
            .replace(/\.+$/, "")
            .replace(/\s+/g, " ")
            .substring(0, 60);

          if (fallbackTitle && fallbackTitle.length >= 3) {
            const words = fallbackTitle.split(/\s+/).filter(Boolean);
            if (words.length >= 2 && words.length <= 5) {
              console.log(`✅ Fallback successful: "${fallbackTitle}"`);
              return fallbackTitle;
            }
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, (fallbackError as Error).message);
        }
      }
      
      console.error(`Episode #${episodeNumber} title generation failed:`, error);
      return `Часть ${episodeNumber}`;
    }
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
