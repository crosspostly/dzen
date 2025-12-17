// ============================================================================
// ZenMaster v2.0 — Multi-Agent Service
// Orchestrates parallel generation of 12 episodes for 35K+ longform articles
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.initializeAgents(12);
  }

  /**
   * Main entry point: Generate full 35K longform article
   */
  async generateLongFormArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }): Promise<LongFormArticle> {
    console.log("\n🎬 [ZenMaster v2.0] Starting 35K longform generation...");
    console.log(`📌 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}\n`);
    
    // Stage 0: Outline Engineering
    console.log("📋 Stage 0: Building outline (12 episodes)...");
    const outline = await this.generateOutline(params);
    
    // Stage 1: Parallel Episode Generation
    console.log("🔄 Stage 1: Generating 12 episodes in parallel (batch by 3)...");
    const episodes = await this.generateEpisodesInParallel(outline);
    
    // Generate Lede & Finale
    console.log("🎯 Generating lede (600-900) and finale (1200-1800)...");
    const lede = await this.generateLede(outline);
    const finale = await this.generateFinale(outline, episodes);
    
    // Generate Voice Passport
    console.log("🎤 Generating voice passport (7 author habits)...");
    const voicePassport = await this.generateVoicePassport(params.audience);
    
    // Generate Title
    console.log("📰 Generating title (55-90 chars)...");
    const title = await this.generateTitle(outline, lede);
    
    // Assemble article
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      finale,
      voicePassport,
      metadata: {
        totalChars: lede.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale),
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale),
        dialogueCount: this.countDialogues(lede, episodes, finale),
      }
    };

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Metrics:`);
    console.log(`   - Characters: ${article.metadata.totalChars}`);
    console.log(`   - Reading time: ${article.metadata.totalReadingTime} min`);
    console.log(`   - Scenes: ${article.metadata.sceneCount}`);
    console.log(`   - Dialogues: ${article.metadata.dialogueCount}\n`);
    
    return article;
  }

  /**
   * Stage 0: Generate outline structure
   */
  private async generateOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }): Promise<OutlineStructure> {
    const prompt = `You are a story architect for Yandex.Zen longform articles.

TASK: Build 12-episode structure for a 35K-character serialized narrative.

INPUT:
- Theme: "${params.theme}"
- Angle: ${params.angle} (confession/scandal/observer)
- Emotion: ${params.emotion} (guilt/shame/triumph/anger)
- Audience: ${params.audience}

REQUIREMENTS:
1. Each episode: hook question + external conflict + internal conflict + turning point + open loop
2. Episodes 1-4: Escalating tension
3. Episodes 5-8: Deepening conflict
4. Episodes 9-12: Climax & resolution
5. No cheap happy endings, no stereotypes

RESPOND WITH ONLY VALID JSON (no markdown, no comments):
{
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "episodes": [
    {
      "id": 1,
      "title": "Episode 1: ...",
      "hookQuestion": "...",
      "externalConflict": "...",
      "internalConflict": "...",
      "keyTurning": "...",
      "openLoop": "..."
    }
    // ... 11 more episodes
  ],
  "externalTensionArc": "...",
  "internalEmotionArc": "...",
  "characterMap": { "Name": { "role": "protagonist", "arc": "..." } },
  "forbiddenClichés": []
}`;

    const response = await this.callGemini({
      prompt,
      model: "gemini-2.5-pro",
      temperature: 0.85,
    });

    try {
      return JSON.parse(response) as OutlineStructure;
    } catch (e) {
      console.error("Outline parse failed:", e);
      throw new Error("Failed to generate outline");
    }
  }

  /**
   * Stage 1: Parallel episode generation
   */
  private async generateEpisodesInParallel(outline: OutlineStructure): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const batchSize = 3;

    for (let i = 0; i < outline.episodes.length; i += batchSize) {
      const batch = outline.episodes.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}/4 (episodes ${i + 1}-${Math.min(i + batchSize, outline.episodes.length)})...`);
      
      const results = await Promise.all(
        batch.map((ep, idx) => 
          this.agents[idx].generateEpisode(ep, this.contextManager.getSnapshot(ep.id))
        )
      );
      
      episodes.push(...results);
    }

    return episodes;
  }

  /**
   * Generate opening (lede): 600-900 chars
   */
  private async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    
    const prompt = `Write a 600-900 character lede for Zen article:
- Start with PARADOX or INTRIGUE (not explanation)
- Hook: "${firstEpisode.hookQuestion}"
- Tone: Personal, confessional, real (not literary)
- Ending: Pull reader forward

Output ONLY the lede text (no metadata).`;

    return await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.9,
    });
  }

  /**
   * Generate closing (finale): 1200-1800 chars
   */
  private async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const prompt = `Write a 1200-1800 character finale for Zen article:
- Resolve external conflict (justice/triumph/hard truth)
- Leave emotional residue (not neat happiness)
- End with honest question for comments (not preaching)

Theme: "${outline.theme}"
Central emotion: ${outline.emotion}

Example questions: "Would you have done the same?" "Do you think forgiveness is possible?"

Output ONLY the finale text (no metadata).`;

    return await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });
  }

  /**
   * Generate article title: 55-90 chars
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `Create ONE compelling 55-90 character Zen title based on:

Premise: ${lede.substring(0, 150)}...

Formula: [EMOTION] + [I/WE] + [ACTION] + [INTRIGUE]

GOOD: "I tolerated it 20 years... then one phrase changed everything"
BAD: "10 Ways to Improve Relationships"

Respond as JSON: {"title": "Your title"}`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
      });
      const parsed = JSON.parse(response);
      return parsed.title || outline.theme;
    } catch {
      return outline.theme;
    }
  }

  /**
   * Generate voice passport (7 fixed habits)
   */
  private async generateVoicePassport(audience: string): Promise<VoicePassport> {
    const prompt = `Generate Voice Passport for author writing confessions for: ${audience}

7 natural, repeating speech habits (NOT stereotypes):

Respond as JSON:
{
  "apologyPattern": "How author justifies (e.g., 'I know it sounds...')",
  "doubtPattern": "How they express uncertainty",
  "memoryTrigger": "How they recall the past",
  "characterSketch": "How they describe people in 1-2 lines",
  "humorStyle": "self-irony|bitter|kind|dark",
  "jokeExample": "One example of their joke",
  "angerPattern": "How they express anger (not screaming)",
  "paragraphEndings": ["question", "pause", "short_phrase"],
  "examples": ["example1", "example2"]
}`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
      });
      return JSON.parse(response) as VoicePassport;
    } catch {
      return {
        apologyPattern: "I know this sounds strange, but...",
        doubtPattern: "But then I realized...",
        memoryTrigger: "I remember how once...",
        characterSketch: "",
        humorStyle: "self-irony",
        jokeExample: "",
        angerPattern: "And inside me clicked",
        paragraphEndings: ["question", "pause", "short_phrase"],
        examples: [],
      };
    }
  }

  /**
   * Helper: Call Gemini API
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
      console.error(`Gemini call failed (${params.model}):`, error);
      throw error;
    }
  }

  /**
   * Helper: Initialize agents
   */
  private initializeAgents(count: number) {
    for (let i = 0; i < count; i++) {
      this.agents.push(new ContentAgent(this.geminiClient, i));
    }
  }

  /**
   * Helper: Calculate reading time
   */
  private calculateReadingTime(lede: string, episodes: Episode[], finale: string): number {
    const totalChars = lede.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length;
    return Math.ceil((totalChars / 6000) * 10);
  }

  /**
   * Helper: Count scenes
   */
  private countScenes(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    const sceneVerbs = /видела|слышала|сказала|молчала|стояла|сидела|держала|открыла|закрыла/gi;
    const matches = text.match(sceneVerbs) || [];
    return Math.max(8, Math.floor(matches.length / 2));
  }

  /**
   * Helper: Count dialogues
   */
  private countDialogues(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    const dialoguePattern = /— [А-Я]/g;
    return (text.match(dialoguePattern) || []).length;
  }
}

// ============================================================================
// ContentAgent: Generates individual episodes
// ============================================================================

class ContentAgent {
  private id: number;
  private geminiClient: GoogleGenAI;

  constructor(geminiClient: GoogleGenAI, id: number) {
    this.id = id;
    this.geminiClient = geminiClient;
  }

  async generateEpisode(
    outline: EpisodeOutline,
    context: any
  ): Promise<Episode> {
    const prompt = `Write Episode #${outline.id} for serialized Zen longform:

- Question: "${outline.hookQuestion}"
- External conflict: "${outline.externalConflict}"
- Internal emotion: "${outline.internalConflict}"
- Turning point: "${outline.keyTurning}"
- Open loop: "${outline.openLoop}"

REQUIREMENTS:
1. Length: 2400-3200 chars (with spaces)
2. Structure: Event → Dialogue/Thought → Turning point → Cliff-hanger
3. No explanation, no preaching
4. Show action, not summary
5. At least 1 natural dialogue (not monologue)
6. End: Open loop (reader wants to scroll down)
7. Tone: Like neighbor telling story over tea

Output ONLY the episode text. No titles, no metadata.`;

    const content = await this.callGemini({
      prompt,
      temperature: 0.9,
    });

    return {
      id: outline.id,
      title: `Episode ${outline.id}`,
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
  }

  private async callGemini(params: {
    prompt: string;
    temperature: number;
  }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text || "";
    } catch (error) {
      console.error(`Agent #${this.id} failed:`, error);
      throw error;
    }
  }
}

// ============================================================================
// ContextManager: Synchronizes context across agents
// ============================================================================

class ContextManager {
  private snapshots: Map<number, any> = new Map();

  getSnapshot(episodeNumber: number): any {
    return {
      conflictIntensity: episodeNumber * 0.1,
      resolvedSubplots: [],
      activeCharacters: [],
    };
  }
}

export default MultiAgentService;
