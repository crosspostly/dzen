import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

/**
 * 🎬 Episode Generator Service v3.5
 * 
 * Generates individual episodes with:
 * - Economic motivation (higher quality = more reader time = more income)
 * - Donna (fast-paced) + Rubina (psychological depth) style
 * - Urban Russian language (NOT village dialect)
 * - Narrative tension and engagement
 */
export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;

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
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    attempt: number = 1
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(outline, previousContext);

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.9,
      });

      const content = response.trim();
      
      // Validate length
      if (content.length < 2500) {
        console.log(`   ⚠️  Too short (${content.length} chars), trying expanded...`);
        if (attempt < 3) {
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND THIS SCENE)" },
            previousEpisodes,
            attempt + 1
          );
        }
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
      console.warn(`   ❌ Generation failed (attempt ${attempt}): ${errorMessage}`);
      
      if (attempt < 3 && (errorMessage.includes('503') || errorMessage.includes('overloaded'))) {
        console.log(`   🔄 Retrying with fallback model...`);
        return this.generateSingleEpisodeWithFallback(outline, previousEpisodes, attempt);
      }
      
      throw error;
    }
  }

  /**
   * 🔄 Fallback generation with alternative model
   */
  private async generateSingleEpisodeWithFallback(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    attempt: number
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(outline, previousContext);

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash-lite",
        temperature: 0.9,
      });

      const content = response.trim();
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
      console.error(`   ❌ Fallback also failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 📝 Build the prompt with all style and economic guidance
   */
  private buildPrompt(outline: EpisodeOutline, previousContext: string): string {
    return `
🎬 EPISODE #${outline.id} - ZenMaster v3.5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ECONOMIC MOTIVATION (Read Carefully)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This text will be published on Yandex.Zen (CPM: $5-15 per 1000 views).

If this episode:
✅ GRIPS reader → reads for 5+ minutes → $1+ per reader
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
📋 REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Length: 2500-4000 characters (optimal for CPM: holds reader 3-5 minutes)
✅ Language: Russian only, urban educated tone (NOT village dialect!)
✅ Style: Mix Donna fast-paced with Rubina psychological depth
✅ Dialogue: Realistic with pauses and interruptions
✅ Emotions: Shown through action/detail, NOT explained
✅ Details: Modern urban (phone, letter, mirror - NOT village details)
✅ End: Provocation (question that makes reader want to comment)
✅ Structure: Fast → Deep → Fast → Deep pacing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY the episode text. No titles, no metadata, no explanations.
Make this count. People's happiness depends on the quality of this writing.
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
