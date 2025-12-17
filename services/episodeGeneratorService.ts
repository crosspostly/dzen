// ============================================================================
// Episode Generator Service
// Generates episodes SEQUENTIALLY (one at a time) to avoid API overload
// Each episode = separate Gemini API request with retry logic
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private readonly RETRY_DELAY = 2000; // 2 seconds between retries
  private readonly MAX_RETRIES = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 1500; // 1.5 seconds between episodes

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
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

        const prompt = `Write Episode #${episodeOutline.id} for serialized Zen longform:

- Question: "${episodeOutline.hookQuestion}"
- External conflict: "${episodeOutline.externalConflict}"
- Internal emotion: "${episodeOutline.internalConflict}"
- Turning point: "${episodeOutline.keyTurning}"
- Open loop: "${episodeOutline.openLoop}"

REQUIREMENTS:
1. Length: EXACTLY 2400-3200 characters (with spaces)
2. Structure: Event → Dialogue/Thought → Turning point → Cliffhanger
3. Pure narrative text (NO headings, NO metadata, NO comments)
4. Show action, not summary
5. At least 1 natural dialogue
6. Tone: Like neighbor telling story over tea

Output ONLY the episode text (no JSON, no formatting, no explanations):`;

        const response = await this.geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.95,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          },
        });

        let content = response.text || "";

        // Clean markdown wrappers if present
        content = content
          .replace(/^```[\s\S]*?\n/, '')
          .replace(/\n```[\s\S]*?$/, '')
          .trim();

        // Validate length
        if (content.length < 2400) {
          throw new Error(`Content too short: ${content.length} chars (need 2400+)`);
        }

        console.log(`   ✅ Episode #${episodeOutline.id} success: ${content.length} chars`);

        return {
          id: episodeOutline.id,
          title: `Episode ${episodeOutline.id}`,
          content,
          charCount: content.length,
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
