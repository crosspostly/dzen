// ============================================================================
// ZenMaster v2.0 — Multi-Agent Service
// Orchestrates parallel generation of 12 episodes for 35K+ longform articles
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { imageGeneratorAgent } from "./imageGeneratorAgent";

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
    includeImages?: boolean;
  }): Promise<LongFormArticle> {
    console.log("\n🎬 [ZenMaster v2.0] Starting 35K longform generation...");
    console.log(`📌 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    if (params.includeImages) {
      console.log(`🖼️  Images: ENABLED\n`);
    } else {
      console.log(`⏭️  Images: DISABLED\n`);
    }
    
    // Stage 0: Outline Engineering
    console.log("📋 Stage 0: Building outline (12 episodes)...");
    const outline = await this.generateOutline(params);
    
    // Stage 1: Sequential Episode Generation
    console.log("🔄 Stage 1: Generating 12 episodes sequentially...");
    const episodes = await this.generateEpisodesSequentially(outline);
    
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
    console.log(`✅ Title (Russian): "${title}"`);
    
    // 🖼️ Generate cover image if requested
    let coverImageBuffer: Buffer | undefined;
    if (params.includeImages) {
      try {
        console.log("🖼️  Generating cover image...");
        coverImageBuffer = await imageGeneratorAgent.generateCoverImage({
          title,
          ledeText: lede,
          theme: params.theme,
          emotion: params.emotion,
        });
        if (coverImageBuffer) {
          console.log(`✅ Cover image generated (${coverImageBuffer.length} bytes)`);
        }
      } catch (error) {
        console.error(`❌ Cover image generation failed:`, (error as Error).message);
      }
    }
    
    // Assemble article
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      finale,
      voicePassport,
      coverImage: coverImageBuffer,
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
    console.log(`   - Dialogues: ${article.metadata.dialogueCount}`);
    if (coverImageBuffer) {
      console.log(`   - Cover image: YES (${coverImageBuffer.length} bytes)`);
    }
    console.log(``);
    
    return article;
  }

  /**
   * IMPROVED: Strip markdown code blocks and handle malformed JSON
   * Fixes issues with truncated or badly formatted API responses
   */
  private stripMarkdownJson(text: string): string {
    // Step 1: Remove markdown code block markers
    let cleaned = text
      .replace(/^```(?:json)?\s*\n?/g, '') // Remove opening ```json
      .replace(/\n?```\s*$/g, '')           // Remove closing ```
      .trim();

    // Step 2: Find the actual JSON object boundaries
    // Look for the first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error('No valid JSON object found in response');
    }

    // Extract only the JSON part
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);

    // Step 3: Fix common issues with malformed JSON
    // Remove control characters and fix broken unicode
    cleaned = cleaned
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
      .replace(/,\s*}/g, '}')           // Remove trailing commas before }
      .replace(/,\s*]/g, ']')           // Remove trailing commas before ]
      .replace(/'/g, '"')               // Replace single quotes with double quotes
      .replace(/\\\//g, '/')           // Fix escaped slashes
      .replace(/([^\\])"([^"]*):([^"]*?)"([^"]*)/g, '$1"$2": $3"$4') // Fix malformed key-value pairs
      .replace(/\n/g, ' ')              // Replace newlines with spaces
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .trim();

    return cleaned;
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
0. All text fields MUST be in Russian (no English)
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
  "audience": "${params.audience}",
  "episodes": [
    {
      "id": 1,
      "title": "Часть 1: ...",
      "hookQuestion": "...",
      "externalConflict": "...",
      "internalConflict": "...",
      "keyTurning": "...",
      "openLoop": "..."
    }
  ],
  "externalTensionArc": "...",
  "internalEmotionArc": "...",
  "characterMap": { "Name": { "role": "protagonist", "arc": "..." } },
  "forbiddenClichés": []
}`;

    const response = await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });

    try {
      const cleanedJson = this.stripMarkdownJson(response);
      const parsed = JSON.parse(cleanedJson);
      return parsed as OutlineStructure;
    } catch (e) {
      console.error("Outline parse failed:", e);
      console.error("Raw response length:", response.length);
      console.error("First 500 chars:", response.substring(0, 500));
      throw new Error(`Failed to parse outline: ${(e as Error).message}`);
    }
  }

  /**
   * Stage 1: Sequential episode generation
   */
  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY
    );

    return await episodeGenerator.generateEpisodesSequentially(
      outline.episodes,
      {
        delayBetweenRequests: 1500,
        onProgress: (current, total) => {
          console.log(`   ✅ Episode ${current}/${total} complete`);
        }
      }
    );
  }

  /**
   * Generate opening (lede): 600-900 chars
   */
  private async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    
    const prompt = `Напиши вводную часть (LEDE) для статьи Яндекс.Дзен: 600-900 символов, ТОЛЬКО РУССКИЙ язык.

ТРЕБОВАНИЯ:
- Начни с ПАРАДОКСА или ИНТРИГИ (не с объяснений)
- Крючок: "${firstEpisode.hookQuestion}"
- Тон: личный, исповедальный, как разговор на кухне
- В конце: подтолкни читать дальше

ОТВЕТ: только текст вводной, без заголовков и метаданных.`;

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
    const prompt = `Напиши финал (FINALE) для статьи Яндекс.Дзен: 1200-1800 символов, ТОЛЬКО РУССКИЙ язык.

ТРЕБОВАНИЯ:
- Разреши внешний конфликт (справедливость / триумф / горькая правда)
- Оставь эмоциональный след (без приторного хэппи-энда)
- Заверши честным вопросом к читателям (без наставлений)

Тема: "${outline.theme}"
Главная эмоция: ${outline.emotion}

Примеры вопросов: "Вы бы смогли так поступить?" "А вы верите в прощение?"

ОТВЕТ: только текст финала, без заголовков и метаданных.`;

    return await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });
  }

  /**
   * Generate article title: 55-90 chars (Russian only)
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `Ты редактор Яндекс.Дзен. Создай ОДИН привлекательный заголовок (55-90 символов, РУССКИЙ ЯЗЫК ТОЛЬКО).

КОНТЕКСТ:
- Тема: "${outline.theme}"
- Начало статьи: ${lede.substring(0, 200)}...
- Жанр: Исповедь
- Эмоция: ${outline.emotion}
- Аудитория: Женщины 35-60 лет

ФОРМУЛА ХОРОШЕГО ЗАГОЛОВКА:
[ЭМОЦИЯ] + [Я/МЫ] + [ДЕЙСТВИЕ] + [ИНТРИГА]

ОТВЕТ: Напиши ТОЛЬКО заголовок (без JSON, без кавычек, без пояснений)`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
      });

      let title = response
        ?.trim()
        .replace(/^\s*["'\'`]+/, "")
        .replace(/["'\'`]+\s*$/, "")
        .replace(/\.$/, "")
        .replace(/\s+/g, " ")
        .substring(0, 100);

      if (!title || !/[а-яёА-ЯЁ]/.test(title) || /[a-zA-Z]/.test(title)) {
        return outline.theme;
      }

      if (title.length < 55 || title.length > 90) {
        console.warn(`Title length ${title.length} not in range (55-90), using fallback`);
        return outline.theme;
      }

      return title;
    } catch (error) {
      console.error("Title generation failed:", error);
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
  "apologyPattern": "How author justifies (e.g, 'I know it sounds...')",
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
      const cleanedJson = this.stripMarkdownJson(response);
      return JSON.parse(cleanedJson) as VoicePassport;
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
   * Helper: Call Gemini API with fallback
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
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`🔄 Model overloaded, trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: params.prompt,
            config: {
              temperature: params.temperature,
              topK: 40,
              topP: 0.95,
            },
          });
          
          console.log(`✅ Fallback successful`);
          return fallbackResponse.text || "";
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed:`, (fallbackError as Error).message);
          throw fallbackError;
        }
      }
      
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
  private titleGenerator: EpisodeTitleGenerator;

  constructor(geminiClient: GoogleGenAI, id: number) {
    this.id = id;
    this.geminiClient = geminiClient;
    this.titleGenerator = new EpisodeTitleGenerator(
      process.env.GEMINI_API_KEY || process.env.API_KEY
    );
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
1. Length: 3000-4000 chars (with spaces)
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
      const errorMessage = (error as Error).message;
      console.warn(`Agent #${this.id} primary model failed: ${errorMessage}`);
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`Agent #${this.id} trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: params.prompt,
            config: {
              temperature: params.temperature,
              topK: 40,
              topP: 0.95,
            },
          });
          
          console.log(`Agent #${this.id} fallback successful`);
          return fallbackResponse.text || "";
        } catch (fallbackError) {
          console.error(`Agent #${this.id} fallback also failed:`, (fallbackError as Error).message);
          throw fallbackError;
        }
      }
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