import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

/**
 * 🎬 Episode Generator Service v4.1 (DYNAMIC POOL-BASED BUDGETING)
 * 
 * Generates episodes with INTELLIGENT CHARACTER BUDGETING:
 * - Total budget: 35000-38500 chars (35K +10%)
 * - Lede: ~700 chars
 * - Finale: ~1500 chars
 * - Remaining divided equally among episodes initially
 * - Each episode gets specific char limit in prompt
 * - If episode exceeds limit: account for actual size, adjust next episode budget
 * - NO RETRIES for oversized - just continue with recalculated pool
 * 
 * v4.1 CHANGES:
 * - Increased context to 1200 chars for better continuity
 * - Added explicit "CONTINUE AFTER" instruction to prevent repetition
 */
export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private TOTAL_BUDGET = 38500; // 35000 + 10% (35K + 10% = 38.5K)
  private LEDE_BUDGET = 700;
  private FINALE_BUDGET = 1500;
  private MAX_RETRIES = 2; // Only for API failures or too-short content
  private CONTEXT_LENGTH = 1200; // v4.1: Increased from 800 to 1200 chars

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
   * 🎯 Generate episodes sequentially with DYNAMIC POOL TRACKING
   * 
   * Key change: If episode exceeds budget, we accept it and adjust
   * remaining pool for next episodes instead of retrying!
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
    let remainingPool = budget.remaining;

    for (let i = 0; i < episodeOutlines.length; i++) {
      const outline = episodeOutlines[i];
      const episodesLeft = episodeOutlines.length - i;
      const charsForThisEpisode = Math.floor(remainingPool / episodesLeft);
      
      console.log(`\n   🎬 Episode #${outline.id} - Starting generation...`);
      console.log(`      Budget: ${charsForThisEpisode} chars (${remainingPool} remaining for rest)`);
      
      try {
        const episode = await this.generateSingleEpisode(
          outline, 
          episodes,
          charsForThisEpisode,  // Pass specific budget to this episode
          i + 1,
          episodeOutlines.length
        );
        episodes.push(episode);
        
        // UPDATE POOL: subtract actual chars from remaining pool
        remainingPool -= episode.charCount;
        charCountSoFar += episode.charCount;
        
        // Warn if significantly over budget
        if (episode.charCount > charsForThisEpisode * 1.1) {
          console.log(`      ⚠️  Over budget: ${episode.charCount}/${charsForThisEpisode} chars`);
          console.log(`      📉 Pool adjusted: remaining ${remainingPool} chars for ${episodesLeft - 1} episodes`);
        } else {
          console.log(`      ✅ Generated: ${episode.charCount} chars (on budget)`);
        }
        console.log(`      📊 Total so far: ${charCountSoFar}/${budget.total}`);
        
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
    
    const utilization = ((charCountSoFar / budget.total) * 100).toFixed(1);
    console.log(`\n✅ All episodes generated!`);
    console.log(`   Total chars: ${charCountSoFar}/${budget.total} (${utilization}% utilization)`);
    return episodes;
  }

  /**
   * 🎨 Generate single episode with SPECIFIC CHAR LIMIT
   * 
   * NO RETRY on oversized! Just generate once, accept, move on.
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
      
      // ✅ VALIDATION: Only check for TOO SHORT
      // If too long: we ACCEPT it and let pool management handle it
      
      // Check if TOO SHORT
      if (content.length < charLimit * 0.7) {
        console.log(`      ⚠️  Too short (${content.length}/${charLimit} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`      🔄 Retrying with expanded prompt...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND SIGNIFICANTLY)" },
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
          console.error(`      ❌ CRITICAL: Episode #${outline.id} too short`);
          throw new Error(
            `Episode #${outline.id} too short (${content.length}/${charLimit}). Tried ${this.MAX_RETRIES} retries.`
          );
        }
      }
      
      // ✅ ACCEPT ANY LENGTH >= 70% of budget
      // If too long: just use it, pool adjusts for next episodes
      if (content.length > charLimit * 1.1) {
        console.log(`      ℹ️  Episode length: ${content.length}/${charLimit} (${((content.length/charLimit)*100).toFixed(0)}%)`);
        console.log(`      ℹ️  Accepting oversized - pool will adjust for remaining episodes`);
      } else {
        console.log(`      ✅ Episode ${episodeNum}: ${content.length} chars (within budget)`);
      }

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
        console.log(`      🔄 API overloaded, retrying in 5s...`);
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
    const minChars = Math.floor(charLimit * 0.7);
    const maxChars = charLimit;

    return `
🎬 EPISODE #${outline.id} of ${totalEpisodes} - ZenMaster v4.1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ECONOMIC MOTIVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This episode is part of 35K character budget spread across ${totalEpisodes} episodes.
Your episode: Episode ${episodeNum}/${totalEpisodes}

If this episode:
✅ GRIPS reader → reads full episode → \$1+ per reader
❌ BORES reader → switches to another → \$0.05 per reader

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
📚 PREVIOUS EPISODE ENDING (CONTEXT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previousContext}

🔥 IMPORTANT: CONTINUE THE STORY AFTER THESE WORDS
✅ DO NOT repeat or rephrase the context above
✅ DO NOT start with "и" or "тогда" as if retelling
✅ START IMMEDIATELY with NEW action, dialogue, or thoughts
✅ Assume reader just finished the context - move forward!` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CHARACTER BUDGET GUIDELINE (NOT STRICT LIMIT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  This episode guideline: ${minChars}-${maxChars} characters (with spaces)

✅ QUALITY FIRST: If you need 3500 chars for great storytelling, write 3500
✅ DON'T ARTIFICIALLY EXPAND: If 3000 chars is natural, write 3000
✅ DON'T ARTIFICIALLY TRIM: If you need 4000 chars, write 4000

The system will adjust remaining episodes based on ACTUAL length.
Better to have 1 great 4000-char episode than 2 mediocre 2000-char episodes!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY the episode text. No titles, no metadata, no explanations.
Make this episode UNFORGETTABLE. Readers' happiness depends on it!
`;
  }

  /**
   * 🔗 Build context from previous episodes (v4.1: Increased to 1200 chars)
   */
  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return "";
    
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    const contextLength = this.CONTEXT_LENGTH; // v4.1: 1200 chars
    
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
