// ============================================================================
// EpisodeRefiner Service
// Handles selective rewriting of episodes with engagement focus
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode } from "../types/ContentArchitecture";

export class EpisodeRefiner {
  private geminiClient: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Refines a single episode using a custom refinement prompt with engagement focus
   */
  async refineEpisode(
    episode: Episode,
    refinementPrompt: string,
    options?: {
      retryCount?: number;
      maxCharDelta?: number;
      validateEngagementImprovement?: boolean;
    }
  ): Promise<Episode> {
    const retryCount = options?.retryCount || 2;
    const maxCharDelta = options?.maxCharDelta || 0.1; // 10% max length change
    const validateEngagement = options?.validateEngagementImprovement || true;

    const originalCharCount = episode.content.length;
    const minCharCount = Math.floor(originalCharCount * (1 - maxCharDelta));
    const maxCharCount = Math.floor(originalCharCount * (1 + maxCharDelta));

    console.log(`   🔴 [Refiner] Refining episode #${episode.id}...`);
    console.log(`      Original size: ${originalCharCount} chars (range: ${minCharCount}-${maxCharCount})`);

    try {
      // Generate refined content
      const refinedContent = await this.callGemini({
        prompt: refinementPrompt,
        model: "gemini-2.5-flash",
        temperature: 0.95, // Higher temperature for more natural variation
      });

      // Validate character count constraint
      const refinedCharCount = refinedContent.length;
      if (refinedCharCount < minCharCount || refinedCharCount > maxCharCount) {
        console.warn(`      ⚠️  Size constraint violated: got ${refinedCharCount} chars`);
        if (refinedCharCount > maxCharCount) {
          console.log(`      🛠️  Trimming to ${maxCharCount} chars...`);
          const trimmed = refinedContent.substring(0, maxCharCount);
          return {
            ...episode,
            content: trimmed,
            charCount: trimmed.length,
            isRefined: true,
          };
        }
      }

      // Create refined episode
      const refinedEpisode: Episode = {
        ...episode,
        content: refinedContent,
        charCount: refinedContent.length,
        isRefined: true,
        refinementMeta: {
          originalCharCount,
          refinedCharCount,
          charDelta: refinedCharCount - originalCharCount,
          retryCount: 0,
        }
      };

      // Validate engagement improvement if requested
      if (validateEngagement) {
        // This would be implemented by the AutoFixOrchestrator using EpisodeValidatorService
        console.log(`      ✅ Episode #${episode.id} refined successfully`);
      }

      return refinedEpisode;

    } catch (error) {
      console.error(`      ❌ Failed to refine episode #${episode.id}:`, error);
      return episode;
    }
  }

  private async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    const model = this.geminiClient.getGenerativeModel({ model: params.model });
    
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: params.prompt }],
        },
      ],
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: 8000,
      },
    });

    return result.response.text();
  }
}