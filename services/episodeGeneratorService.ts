// ============================================================================
// Episode Generator Service
// Generates episodes SEQUENTIALLY (one at a time) to avoid API overload
// Each episode = separate Gemini API request with retry logic
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { ContentSanitizer } from "./contentSanitizer";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private readonly RETRY_DELAY = 2000; // 2 seconds between retries
  private readonly MAX_RETRIES = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 1500; // 1.5 seconds between episodes

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
  }

  /**
   * ✅ Generates a SINGLE episode with one API request
   * Never batches multiple episodes into one request
   */
  async generateSingleEpisode(
    episodeOutline: EpisodeOutline
  ): Promise<Episode> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`   📝 Episode #${episodeOutline.id} - Attempt ${attempt}/${this.MAX_RETRIES}...`);

        const prompt = `Напиши эпизод #${episodeOutline.id} для сериальной статьи Яндекс.Дзен (исповедь). Пиши ТОЛЬКО ПО-РУССКИ.

- Вопрос-крючок: "${episodeOutline.hookQuestion}"
- Внешний конфликт: "${episodeOutline.externalConflict}"
- Внутренний конфликт/эмоция: "${episodeOutline.internalConflict}"
- Поворотный момент: "${episodeOutline.keyTurning}"
- Открытая петля (что тянет дальше): "${episodeOutline.openLoop}"

REQUIREMENTS:
0. Language: RUSSIAN ONLY (no English)
1. Length: 3000-4000 characters (with spaces)
2. Structure: Event → Dialogue/Thought → Turning point → Cliffhanger
3. Pure narrative text (NO headings, NO metadata, NO comments)
4. Show action, not summary
5. At least 1 natural dialogue
6. Tone: Like neighbor telling story over tea

ОТВЕТ: только текст эпизода (без JSON, без форматирования, без пояснений):`;

        const response = await this.geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.95,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2400,
          },
        });

        let content = response.text || "";

        console.log(`   🧹 Sanitizing content...`);
        content = ContentSanitizer.cleanEpisodeContent(content);

        console.log(`   ✔️ Validating content...`);
        const validation = ContentSanitizer.validateEpisodeContent(content);

        if (!validation.valid) {
          console.error(`   ❌ Validation failed:`);
          validation.errors.forEach((e) => console.error(`      ${e}`));
          throw new Error(`Content validation failed: ${validation.errors[0]}`);
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach((w) => console.log(`   ${w}`));
        }

        const episodeTitle = await this.titleGenerator.generateEpisodeTitle(
          episodeOutline.id,
          content,
          episodeOutline.openLoop
        );

        console.log(`   📝 Episode #${episodeOutline.id}: "${episodeTitle}"`);
        console.log(
          `   ✅ Episode #${episodeOutline.id} clean & valid: ${validation.charCount} chars (${validation.wordCount} words)`
        );

        return {
          id: episodeOutline.id,
          title: episodeTitle,
          content,
          charCount: validation.charCount,
          openLoop: episodeOutline.openLoop,
          turnPoints: [episodeOutline.keyTurning],
          emotions: [episodeOutline.internalConflict],
          keyScenes: [],
          characters: [],
          generatedAt: Date.now(),
          stage: "draft",
        };

      } catch (error) {
        lastError = error;
        console.error(`   ❌ Attempt ${attempt} failed:`, (error as Error).message);

        if (attempt < this.MAX_RETRIES) {
          console.log(`   ⏳ Waiting ${this.RETRY_DELAY}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(
      `Episode #${episodeOutline.id} failed after ${this.MAX_RETRIES} attempts: ${lastError}`
    );
  }

  /**
   * ✅ Generates episodes SEQUENTIALLY (one at a time)
   * Each episode = separate request + wait before next
   */
  async generateEpisodesSequentially(
    outlines: EpisodeOutline[],
    options: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<Episode[]> {
    const delay = options.delayBetweenRequests || this.DELAY_BETWEEN_REQUESTS;
    const results: Episode[] = [];

    console.log(`\n🔄 Generating ${outlines.length} episodes SEQUENTIALLY...`);

    for (let i = 0; i < outlines.length; i++) {
      const outline = outlines[i];

      try {
        const episode = await this.generateSingleEpisode(outline);
        results.push(episode);

        if (options.onProgress) {
          options.onProgress(i + 1, outlines.length);
        }

        // Wait before next request (be nice to API)
        if (i < outlines.length - 1) {
          console.log(`   ⏳ Waiting ${delay}ms before next episode...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`\n❌ FAILED: Episode #${outline.id}`);
        throw error;
      }
    }

    return results;
  }
}
