import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

/**
 * 🎬 Episode Generator Service v3.7 (LENGTH FIX)
 * 
 * Generates individual episodes with:
 * - Economic motivation (higher quality = more reader time = more income)
 * - Donna (fast-paced) + Rubina (psychological depth) style
 * - Urban Russian language (NOT village dialect)
 * - Narrative tension and engagement
 * - STRICT LENGTH VALIDATION (max 2500 chars per episode)
 */
export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private MAX_EPISODE_LENGTH = 2500; // Maximum chars per episode
  private MIN_EPISODE_LENGTH = 1500; // Minimum chars per episode (too short = retry)
  private MAX_RETRIES = 3; // Max retry attempts

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
  }

  /**
   * 🎯 Generate episodes sequentially with improved prompts
   */
  async generateEpisodesSequentially(
    episodeOutlines: EpisodeOutline[],
    options?: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number) => void;
    }
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const delay = options?.delayBetweenRequests || 1500;

    for (let i = 0; i < episodeOutlines.length; i++) {
      const outline = episodeOutlines[i];
      
      console.log(`\n   🎬 Episode #${outline.id} - Starting generation...`);
      
      try {
        const episode = await this.generateSingleEpisode(outline, episodes);
        episodes.push(episode);
        
        if (options?.onProgress) {
          options.onProgress(i + 1, episodeOutlines.length);
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

    return episodes;
  }

  /**
   * 🎨 Generate single episode with context from previous episodes
   * WITH PROPER RETRY LOGIC AND STRICT LENGTH VALIDATION
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    attempt: number = 1,
    useFallbackModel: boolean = false
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(outline, previousContext, attempt);
    const model = useFallbackModel ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";

    try {
      const response = await this.callGemini({
        prompt,
        model,
        temperature: 0.9,
      });

      let content = response.trim();
      
      // ✅ STRICT LENGTH VALIDATION
      
      // Check if TOO SHORT
      if (content.length < this.MIN_EPISODE_LENGTH) {
        console.log(`   ⚠️  Too short (${content.length}/${this.MIN_EPISODE_LENGTH} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        
        if (attempt < this.MAX_RETRIES) {
          // Retry with expanded prompt
          console.log(`   🔄 Retrying with expanded prompt...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND THIS SCENE SIGNIFICANTLY)" },
            previousEpisodes,
            attempt + 1,
            useFallbackModel
          );
        } else if (!useFallbackModel) {
          // Try fallback model before giving up
          console.log(`   🔄 Retrying with fallback model (gemini-2.5-flash-lite)...`);
          return this.generateSingleEpisode(
            outline,
            previousEpisodes,
            1, // Reset attempt counter for fallback
            true // Use fallback
          );
        } else {
          // Fallback model also produced short content - this is critical
          console.error(`   ❌ CRITICAL: Episode #${outline.id} too short even with fallback model`);
          console.error(`   📊 Final length: ${content.length} chars (minimum: ${this.MIN_EPISODE_LENGTH})`);
          throw new Error(
            `Episode #${outline.id} generation failed: content too short after ${this.MAX_RETRIES} retries and fallback model. ` +
            `Got ${content.length} chars, need minimum ${this.MIN_EPISODE_LENGTH} chars.`
          );
        }
      }
      
      // Check if TOO LONG - trim to max length
      if (content.length > this.MAX_EPISODE_LENGTH) {
        console.log(`   ⚠️  Too long (${content.length}/${this.MAX_EPISODE_LENGTH} chars), trimming to limit...`);
        content = this.trimToLength(content, this.MAX_EPISODE_LENGTH);
        console.log(`   ✅ Trimmed to: ${content.length} chars`);
      }

      // ✅ CONTENT VALIDATION PASSED
      console.log(`   ✅ Episode ${outline.id}: ${content.length} chars (valid)`);

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
      console.warn(`   ❌ Generation failed (attempt ${attempt}): ${errorMessage}`);
      
      if (attempt < this.MAX_RETRIES && (errorMessage.includes('503') || errorMessage.includes('overloaded'))) {
        console.log(`   🔄 API overloaded, retrying...`);
        // Wait longer before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.generateSingleEpisode(
          outline,
          previousEpisodes,
          attempt + 1,
          useFallbackModel
        );
      }
      
      throw error;
    }
  }

  /**
   * ✂️ Trim text to maximum length while preserving sentence structure
   */
  private trimToLength(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // Trim to max length
    let trimmed = text.substring(0, maxLength);
    
    // Find last sentence end (. ! ?)
    const lastPeriod = Math.max(
      trimmed.lastIndexOf('.'),
      trimmed.lastIndexOf('!'),
      trimmed.lastIndexOf('?')
    );
    
    if (lastPeriod > maxLength * 0.9) {
      // Use last complete sentence if it's close to the end
      trimmed = trimmed.substring(0, lastPeriod + 1);
    }
    
    return trimmed.trim();
  }

  /**
   * 📝 Build the prompt with all style and economic guidance
   * Enhanced for retries to explicitly ask for expansion
   */
  private buildPrompt(outline: EpisodeOutline, previousContext: string, attempt: number = 1): string {
    const retryNote = attempt > 1 ? `\n⚠️  RETRY ATTEMPT #${attempt} - The previous version was too short. WRITE MUCH LONGER AND MORE DETAILED. Expand scenes, add more dialogue, more internal thoughts.\n` : '';

    return `
🎬 EPISODE #${outline.id} - ZenMaster v3.7

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ECONOMIC MOTIVATION (Read Carefully)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This text will be published on Yandex.Zen (CPM: $5-15 per 1000 views).

If this episode:
✅ GRIPS reader → reads for 3-5 minutes → $1+ per reader
❌ BORES reader → switches to another → $0.05 per reader

Difference: 20X INCOME!

Your quality directly impacts:
- Author's payment (+100% for excellent writing)
- Reader happiness (they share it with friends)
- Your reputation (best writers get featured)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 STYLE GUIDE: Donna + Rubina (NOT village dialect!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Audience: Russian women 35-60 from cities (Moscow, SPB, Yekaterinburg, etc.)

✅ LOVE: Donna Latenko (captivating, page-turner) + Rubina (psychological depth)
❌ HATE: Village dialect ("дыбать", "шарить", "пялиться") - this is OFFENSIVE
❌ HATE: Dry explanation of feelings ("я почувствовала грусть") - this is BORING

TONE: Educated, urban Russian woman confessing to a friend at a kitchen table
- "Я же тебе скажу" (conversational)
- "Честное слово" (sincere)
- "Вот тогда и началось" (natural turning point)
- "Может быть, я ошиблась" (doubt, reflection)

STRUCTURE:
┌─────────────────────────────────────────────┐
│ PACE 1: FAST (Donna) - Hook, tension        │
│ ├─ Short sentences                          │
│ ├─ Action, dialogue                         │
│ └─ Grabs attention (2-3 paragraphs)         │
│                                             │
│ PACE 2: DEEP (Rubina) - Psychology         │
│ ├─ Long sentences, internal monologue      │
│ ├─ Details, sensory, emotion               │
│ └─ Holds attention (3-4 paragraphs)        │
│                                             │
│ PACE 3: FAST (Donna) - Confrontation       │
│ ├─ Dialogue, action, movement              │
│ └─ Climax (2-3 paragraphs)                 │
│                                             │
│ PACE 4: DEEP (Rubina) - Reflection         │
│ ├─ What does this mean?                    │
│ ├─ Uncertainty, open question              │
│ └─ Provocation for comments (1-2 para)    │
└─────────────────────────────────────────────┘

EMOTION: Show through ACTION, not EXPLANATION
❌ "Я почувствовала страх и замёрзла"
✅ "Её голос дрожал. Я смотрела на стекло кабинета, и мое отражение выглядело как чужое."

DETAILS: Urban, modern (NOT village!)
✅ Phone notification at 3 AM
✅ Letter in envelope, hidden under book
✅ Cold tea in a cup with "Mom" written on it
✅ Mirror in the hallway where she sees her reflection
❌ "Скрип половицы" (village!)
❌ "Дешёвый табак" (outdated!)
❌ "Советский сервант" (cliché!)

DIALOGUE: Realistic
- Use em-dash: — Ты не понимаешь, — сказала я.
- Include interruptions and unfinished thoughts
- Mix inner thoughts with speech
- Natural Russian (не "сказал", а "сказала" для женского голоса)

PROVOCATION (Last paragraph):
- END with QUESTION or UNCERTAINTY
- Goal: readers argue in comments (comments = algorithm reward)
- Example: "А вы как считаете? Я перегнула палку?"
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
📚 PREVIOUS EPISODE CONTEXT (Last 800 chars - to maintain continuity)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${previousContext}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STRICT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Length: MAXIMUM 2500 characters (optimal for reader engagement: 3-5 min read time)
✅ Minimum: 1500 characters (if less, will be rejected and regenerated)
✅ Language: Russian only, urban educated tone (NOT village dialect!)
✅ Style: Mix Donna fast-paced with Rubina psychological depth
✅ Dialogue: Realistic with pauses and interruptions
✅ Emotions: Shown through action/detail, NOT explained
✅ Details: Modern urban (phone, letter, mirror - NOT village details)
✅ End: Provocation (question that makes reader want to comment)
✅ Structure: Fast → Deep → Fast → Deep pacing

⚠️  IMPORTANT: Do NOT exceed 2500 characters!
If your text is longer, system will trim it.
Better to write 1500-2500 chars of high quality than 5000 chars of padding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY the episode text. No titles, no metadata, no explanations.
Make this count. People's happiness depends on the quality of this writing.
REMEMBER: 1500-2500 characters is IDEAL. Do not exceed 2500!
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
