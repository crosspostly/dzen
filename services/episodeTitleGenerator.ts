import { GoogleGenAI } from "@google/genai";
import { MODELS } from "../constants/MODELS_CONFIG";

/**
 * Генерирует лаконичные русские названия для эпизодов.
 */
export class EpisodeTitleGenerator {
  private geminiClient: GoogleGenAI;
  private MAX_RETRIES = 3; 

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

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

ОТВЕТЬ ТОЛЬКО НАЗВАНИЕМ (без JSON, без кавычек, без объяснений):`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const modelName = (attempt === 1) 
          ? (MODELS.TEXT.LITE || "gemini-3.1-flash-lite-preview")
          : (MODELS.TEXT.FLASH || "gemini-2.5-flash");

        console.log(`   📝 Generating title (attempt ${attempt}/${this.MAX_RETRIES}, model: ${modelName})...`);

        const response = await this.geminiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { temperature: 0.7, topK: 40, topP: 0.95 }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text || typeof text !== 'string') {
          if (attempt < this.MAX_RETRIES) continue;
          return `Часть ${episodeNumber}`;
        }

        const title = text.trim().replace(/^["']+/, "").replace(/["']+$/, "").substring(0, 60);
        console.log(`   ✅ Title generated: "${title}"`);
        return title;

      } catch (error) {
        console.warn(`   ❌ Attempt ${attempt} failed:`, (error as Error).message);
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return `Часть ${episodeNumber}`;
      }
    }
    return `Часть ${episodeNumber}`;
  }

  async generateMultipleTitles(
    episodes: Array<{ id: number; content: string; openLoop: string }>
  ): Promise<Map<number, string>> {
    const titles = new Map<number, string>();
    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      const title = await this.generateEpisodeTitle(episode.id, episode.content, episode.openLoop);
      titles.set(episode.id, title);
      if (i < episodes.length - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return titles;
  }
}