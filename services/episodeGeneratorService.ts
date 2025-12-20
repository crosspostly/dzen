import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

/**
 * 🎬 Episode Generator Service v3.8 (DYNAMIC BUDGET)
 * 
 * Generates episodes with STRICT CHARACTER BUDGETING:
 * - Total budget: 35000-38500 chars (35K +10%)
 * - Lede: ~700 chars
 * - Finale: ~1500 chars
 * - Remaining divided equally among episodes
 * - Each episode gets specific char limit in prompt
 * - NO TRIMMING - just strict limits from the start
 */
export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private TOTAL_BUDGET = 38500; // 35000 + 10% (35K + 10% = 38.5K)
  private LEDE_BUDGET = 700;
  private FINALE_BUDGET = 1500;
  private MAX_RETRIES = 3;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
  }

  /**
   * 📊 Calculate budget allocation
   * 
   * Total: 35000-38500
   * - Lede: 700
   * - Finale: 1500
   * - Episodes: remaining / episode_count
   */
  private calculateBudget(episodeCount: number) {
    const remainingBudget = this.TOTAL_BUDGET - this.LEDE_BUDGET - this.FINALE_BUDGET;
    const perEpisodeBudget = Math.floor(remainingBudget / episodeCount);
    
    return {
      total: this.TOTAL_BUDGET,
      lede: this.LEDE_BUDGET,
      finale: this.FINALE_BUDGET,
      perEpisode: perEpisodeBudget,
      episodeCount: episodeCount,
      remaining: remainingBudget,
    };
  }

  /**
   * 🎯 Generate episodes sequentially with BUDGET TRACKING
   */
  async generateEpisodesSequentially(
    episodeOutlines: EpisodeOutline[],
    options?: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number, charCount: number) => void;
    }
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const delay = options?.delayBetweenRequests || 1500;
    
    // Calculate budget allocation
    const budget = this.calculateBudget(episodeOutlines.length);
    console.log(`\n📊 BUDGET ALLOCATION:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Episodes: ${budget.episodeCount} × ${budget.perEpisode} chars each`);
    console.log(`   Lede: ${budget.lede} | Finale: ${budget.finale}`);
    console.log(`   (Remaining for episodes: ${budget.remaining} chars)\n`);
    
    let charCountSoFar = 0;

    for (let i = 0; i < episodeOutlines.length; i++) {
      const outline = episodeOutlines[i];
      const charsRemaining = budget.total - charCountSoFar - budget.finale;
      const charsForThisEpisode = Math.floor(charsRemaining / (episodeOutlines.length - i));
      
      console.log(`\n   🎬 Episode #${outline.id} - Starting generation...`);
      console.log(`      Budget: ${charsForThisEpisode} chars (${charsRemaining} remaining for rest)`);
      
      try {
        const episode = await this.generateSingleEpisode(
          outline, 
          episodes,
          charsForThisEpisode,  // Pass specific budget to this episode
          i + 1,
          episodeOutlines.length
        );
        episodes.push(episode);
        charCountSoFar += episode.charCount;
        
        console.log(`      ✅ Generated: ${episode.charCount} chars (total so far: ${charCountSoFar})`);
        
        if (options?.onProgress) {
          options.onProgress(i + 1, episodeOutlines.length, charCountSoFar);
        }
        
        // Wait before next request
        if (i < episodeOutlines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`   ❌ Episode #${outline.id} failed:`, error);
        throw error;
      }
    }
    
    console.log(`\n✅ All episodes generated! Total chars: ${charCountSoFar}`);
    return episodes;
  }

  /**
   * 🎨 Generate single episode with SPECIFIC CHAR LIMIT
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    useFallbackModel: boolean = false
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(
      outline, 
      previousContext, 
      charLimit,  // Pass char limit to prompt
      episodeNum,
      totalEpisodes,
      attempt
    );
    const model = useFallbackModel ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";

    try {
      const response = await this.callGemini({
        prompt,
        model,
        temperature: 0.9,
      });

      let content = response.trim();
      
      // ✅ STRICT VALIDATION (no trimming!)
      
      // Check if TOO SHORT
      if (content.length < charLimit * 0.8) {
        console.log(`      ⚠️  Too short (${content.length}/${charLimit} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`      🔄 Retrying with expanded prompt...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND THIS SCENE SIGNIFICANTLY)" },
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            attempt + 1,
            useFallbackModel
          );
        } else if (!useFallbackModel) {
          console.log(`      🔄 Retrying with fallback model...`);
          return this.generateSingleEpisode(
            outline,
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            1,
            true
          );
        } else {
          console.error(`      ❌ CRITICAL: Episode #${outline.id} too short even with fallback`);
          throw new Error(
            `Episode #${outline.id} generation failed: content too short (${content.length}/${charLimit}).`
          );
        }
      }
      
      // Check if TOO LONG - REJECT, don't trim!
      if (content.length > charLimit * 1.1) {
        console.log(`      ⚠️  Too long (${content.length}/${charLimit} chars), retrying with stricter limit...`);
        
        if (attempt < this.MAX_RETRIES) {
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict.substring(0, Math.max(50, outline.externalConflict.length - 50)) },
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            attempt + 1,
            useFallbackModel
          );
        } else {
          console.error(`      ❌ Episode #${outline.id} exceeds char limit even after retries`);
          throw new Error(
            `Episode #${outline.id} generation failed: content too long (${content.length}/${charLimit}). Tried ${this.MAX_RETRIES} retries.`
          );
        }
      }

      // ✅ VALIDATION PASSED
      console.log(`      ✅ Episode ${outline.id}: ${content.length} chars (within budget of ${charLimit})`);

      // Generate title
      const episodeTitle = await this.titleGenerator.generateEpisodeTitle(
        outline.id,
        content,
        outline.openLoop
      );

      return {
        id: outline.id,
        title: episodeTitle,
        content,
        charCount: content.length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: "draft",
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`      ❌ Generation failed (attempt ${attempt}): ${errorMessage}`);
      
      if (attempt < this.MAX_RETRIES && (errorMessage.includes('503') || errorMessage.includes('overloaded'))) {
        console.log(`      🔄 API overloaded, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.generateSingleEpisode(
          outline,
          previousEpisodes,
          charLimit,
          episodeNum,
          totalEpisodes,
          attempt + 1,
          useFallbackModel
        );
      }
      
      throw error;
    }
  }

  /**
   * 📝 Build the prompt with SPECIFIC CHAR LIMIT
   */
  private buildPrompt(
    outline: EpisodeOutline, 
    previousContext: string,
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1
  ): string {
    const retryNote = attempt > 1 ? `\n⚠️  RETRY ATTEMPT #${attempt}\n` : '';
    const minChars = Math.floor(charLimit * 0.8);
    const maxChars = charLimit;

    return `
🎬 EPISODE #${outline.id} of ${totalEpisodes} - ZenMaster v3.8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ECONOMIC MOTIVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This episode is part of 35K character budget spread across ${totalEpisodes} episodes.
Your episode: Episode ${episodeNum}/${totalEpisodes}

If this episode:
✅ GRIPS reader → reads full episode → $1+ per reader
❌ BORES reader → switches to another → $0.05 per reader

Difference: 20X INCOME!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 STYLE GUIDE: Donna + Rubina (NOT village dialect!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Audience: Russian women 35-60 from cities

✅ LOVE: Donna Latenko (captivating, page-turner) + Rubina (psychological depth)
❌ HATE: Village dialect ("дыбать", "шарить") - OFFENSIVE
❌ HATE: Dry feelings ("я почувствовала грусть") - BORING

TONE: Educated urban woman confessing to friend at kitchen table
- "Я же тебе скажу" (conversational)
- "Вот тогда и началось" (turning point)
- "Может быть, я ошиблась" (doubt)

STRUCTURE:
┌─────────────────────────────────────────────┐
│ PACE 1: FAST (Donna) - Hook, tension        │
│ PACE 2: DEEP (Rubina) - Psychology         │
│ PACE 3: FAST (Donna) - Confrontation       │
│ PACE 4: DEEP (Rubina) - Reflection         │
└─────────────────────────────────────────────┘

EMOTION: Show through ACTION
✅ "Её голос дрожал. Я смотрела на стекло кабинета."
❌ "Я почувствовала страх и замёрзла"

DETAILS: Urban, modern (NOT village!)
✅ Phone at 3 AM, letter in envelope, cold tea
❌ "Скрип половицы", "дешёвый табак"

DIALOGUE: Realistic
- Em-dash: — Ты не понимаешь, — сказала я.
- Include interruptions
- Natural Russian

PROVOCATION (Last paragraph):
- END with QUESTION
- Example: "А вы как считаете?"
${retryNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 EPISODE OUTLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question (Hook): "${outline.hookQuestion}"

External Conflict: ${outline.externalConflict}

Internal Emotion: ${outline.internalConflict}

Turning Point: ${outline.keyTurning}

Open Loop (Why reader continues): "${outline.openLoop}"

${previousContext ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 PREVIOUS EPISODE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previousContext}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STRICT CHARACTER BUDGET REQUIREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL: This episode has a FIXED CHARACTER BUDGET!

✅ Target length: ${minChars}-${maxChars} characters (with spaces)
✅ MINIMUM: ${minChars} chars (if less, will be REJECTED and regenerated)
✅ MAXIMUM: ${maxChars} chars (if more, will be REJECTED and regenerated)

⚠️  NO TRIMMING! If you exceed budget, episode fails and regenerates.
⚠️  Better to write ${minChars}-${maxChars} of high quality than exceed limit!

✅ Length: Russian only, urban educated tone (NOT village dialect!)
✅ Style: Mix Donna fast-paced with Rubina psychological depth
✅ Dialogue: Realistic with pauses and interruptions
✅ Emotions: Shown through action/detail, NOT explained
✅ Details: Modern urban (phone, letter, mirror - NOT village details)
✅ End: Provocation (question that makes reader want to comment)
✅ Structure: Fast → Deep → Fast → Deep pacing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY the episode text. No titles, no metadata, no explanations.
REMEMBER: ${minChars}-${maxChars} characters EXACTLY.
Make this count. People's happiness depends on this!
`;
  }

  /**
   * 🔗 Build context from previous episodes
   */
  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return "";
    
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    const contextLength = 800;
    
    if (lastEpisode.content.length <= contextLength) {
      return lastEpisode.content;
    }
    
    return lastEpisode.content.slice(-contextLength);
  }

  /**
   * 📞 Call Gemini API with fallback
   */
  private async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text || "";
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`Gemini call failed (${params.model}): ${errorMessage}`);
      throw error;
    }
  }
}
