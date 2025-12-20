// ============================================================================
// ZenMaster v2.0 — Multi-Agent Service
// Orchestrates dynamic episode generation for 35K+ longform articles
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;
  private maxChars: number = 38500;
  private episodeCount: number = 12;

  constructor(apiKey?: string, maxChars?: number) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.maxChars = maxChars || 38500;
    
    // Calculate dynamic episode count
    this.episodeCount = this.calculateOptimalEpisodeCount(this.maxChars);
    console.log(`📊 Dynamic episode allocation: ${this.episodeCount} episodes for ${this.maxChars} chars`);
    
    this.initializeAgents(this.episodeCount);
  }

  /**
   * Calculate optimal episode count based on character budget
   * 
   * Budget allocation:
   * - Lede: 750 chars (600-900)
   * - Finale: 1500 chars (1200-1800)
   * - Episodes: remaining chars / 3200 (avg episode length)
   * 
   * Constraints:
   * - Minimum: 6 episodes (18K chars for episodes alone)
   * - Maximum: 15 episodes (48K chars for episodes alone)
   */
  private calculateOptimalEpisodeCount(maxChars: number): number {
    const LEDE_CHARS = 750;
    const FINALE_CHARS = 1500;
    const AVG_EPISODE_CHARS = 3200;
    const MIN_EPISODES = 6;
    const MAX_EPISODES = 15;

    const remainingChars = maxChars - LEDE_CHARS - FINALE_CHARS;
    const optimalCount = Math.floor(remainingChars / AVG_EPISODE_CHARS);
    const episodes = Math.max(MIN_EPISODES, Math.min(MAX_EPISODES, optimalCount));

    console.log(`\n📊 Character Budget Analysis:`);
    console.log(`   Total: ${maxChars} chars`);
    console.log(`   Lede: ${LEDE_CHARS} chars`);
    console.log(`   Finale: ${FINALE_CHARS} chars`);
    console.log(`   Remaining for episodes: ${remainingChars} chars`);
    console.log(`   Optimal episodes: ${episodes} (avg ${Math.round(remainingChars / episodes)} chars each)\n`);

    return episodes;
  }

  /**
   * Main entry point: Generate full longform article with dynamic episodes
   */
  async generateLongFormArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
    maxChars?: number;
    includeImages?: boolean;
  }): Promise<LongFormArticle> {
    const maxChars = params.maxChars || this.maxChars;
    const episodeCount = this.calculateOptimalEpisodeCount(maxChars);

    console.log("\n🎬 [ZenMaster v2.0] Starting dynamic longform generation...");
    console.log(`📌 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    console.log(`🎬 Episodes: ${episodeCount} (dynamic based on ${maxChars} chars)\n`);
    
    // Stage 0: Outline Engineering (dynamic episode count)
    console.log(`📋 Stage 0: Building outline (${episodeCount} episodes) + plotBible...`);
    const outline = await this.generateOutline(params, episodeCount);
    
    // Extract and validate plotBible from outline
    const plotBible = this.extractPlotBible(outline, params);
    console.log("✅ PlotBible ready");
    console.log(`   - Narrator: ${plotBible.narrator.age} y/o ${plotBible.narrator.gender}`);
    console.log(`   - Tone: ${plotBible.narrator.tone}`);
    console.log(`   - Sensory palette: ${plotBible.sensoryPalette.details.slice(0, 3).join(', ')}...`);
    
    // Stage 1: Sequential Episode Generation
    console.log(`🔄 Stage 1: Generating ${episodeCount} episodes sequentially...`);
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
    
    // Assemble article
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      finale,
      voicePassport,
      coverImage: undefined,
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
    console.log(`   - Episodes: ${article.metadata.episodeCount}`);
    console.log(`   - Characters: ${article.metadata.totalChars} (target: ${maxChars})`);
    console.log(`   - Utilization: ${((article.metadata.totalChars / maxChars) * 100).toFixed(1)}%`);
    console.log(`   - Reading time: ${article.metadata.totalReadingTime} min`);
    console.log(`   - Scenes: ${article.metadata.sceneCount}`);
    console.log(`   - Dialogues: ${article.metadata.dialogueCount}`);
    console.log(`   - Cover image: Pending (will be generated in orchestrator)`);
    console.log(``);
    
    return article;
  }

  /**
   * 🎭 EXTRACT & VALIDATE plotBible from outline
   */
  private extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    if (outline.plotBible && 
        outline.plotBible.narrator && 
        outline.plotBible.sensoryPalette && 
        outline.plotBible.thematicCore) {
      console.log("✅ Using plotBible from Gemini generation");
      return outline.plotBible;
    }

    console.warn("⚠️  plotBible incomplete from Gemini, using fallback");
    
    const ageMatch = params.audience.match(/(\d+)-(\d+)/);
    const age = ageMatch ? Math.round((parseInt(ageMatch[1]) + parseInt(ageMatch[2])) / 2) : 45;
    const gender = params.audience.toLowerCase().includes('woman') || params.audience.toLowerCase().includes('women') ? 'female' : 'male';

    return {
      narrator: outline.plotBible?.narrator || {
        age,
        gender: gender as "male" | "female",
        tone: "confessional",
        voiceHabits: {
          apologyPattern: "I know it sounds strange, but...",
          doubtPattern: "But then I realized...",
          memoryTrigger: "I remember when...",
          angerPattern: "And inside me clicked something",
        },
      },
      sensoryPalette: outline.plotBible?.sensoryPalette || {
        details: ["domestic", "intimate", "complex"],
        smells: ["coffee", "old books", "home"],
        sounds: ["silence", "breathing", "clock"],
        textures: ["soft", "worn", "familiar"],
        lightSources: ["window", "lamp", "dawn"],
      },
      characterMap: outline.characterMap || {
        Narrator: {
          role: "protagonist",
          arc: "internal realization",
        },
      },
      thematicCore: outline.plotBible?.thematicCore || {
        centralQuestion: outline.externalTensionArc || "What if I had chosen differently?",
        emotionalArc: params.emotion,
        resolutionStyle: "bittersweet, uncertain",
      },
    };
  }

  /**
   * ROBUST: Parse JSON with minimal assumptions
   */
  private parseJsonSafely(jsonString: string, context: string = 'JSON'): any {
    let cleaned = jsonString
      .replace(/^```(?:json)?\s*\n?/g, '')
      .replace(/\n?```\s*$/g, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      let fixed = cleaned;
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(fixed);
      } catch (e2) {
        try {
          const objMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objMatch) {
            let obj = objMatch[0];
            obj = obj.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(obj);
          }
        } catch (e3) {
          // Nothing worked
        }

        console.error(`\n❌ CRITICAL: Failed to parse ${context}`);
        console.error(`Response length: ${jsonString.length}`);
        console.error(`First 300 chars: ${jsonString.substring(0, 300)}`);
        console.error(`Last 300 chars: ${jsonString.substring(Math.max(0, jsonString.length - 300))}`);
        console.error(`Last error: ${(e2 as Error).message}\n`);
        
        throw new Error(`Failed to parse ${context}: ${(e2 as Error).message}`);
      }
    }
  }

  /**
   * Stage 0: Generate outline structure with dynamic episodes
   */
  private async generateOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }, episodeCount: number): Promise<OutlineStructure> {
    const episodeList = Array.from({ length: episodeCount }, (_, i) => ({
      id: i + 1,
      title: `Часть ${i + 1}: ...`,
    }));

    const episodeJson = episodeList.map(ep => `
    {
      "id": ${ep.id},
      "title": "Часть ${ep.id}: ...",
      "hookQuestion": "...",
      "externalConflict": "...",
      "internalConflict": "...",
      "keyTurning": "...",
      "openLoop": "..."
    }`).join(',');

    const prompt = `You are a story architect for Yandex.Zen longform articles.

TASK: Build ${episodeCount}-episode structure for a 35K-character serialized narrative.
INCLUDING: Complete plotBible data (narrator, sensoryPalette, character map, thematic core).

INPUT:
- Theme: "${params.theme}"
- Angle: ${params.angle} (confession/scandal/observer)
- Emotion: ${params.emotion} (guilt/shame/triumph/anger/relief)
- Audience: ${params.audience}

REQUIREMENTS:
0. All text fields MUST be in Russian (no English)
1. Each episode: hook question + external conflict + internal conflict + turning point + open loop
2. Episodes 1-${Math.ceil(episodeCount / 3)}: Escalating tension
3. Episodes ${Math.ceil(episodeCount / 3) + 1}-${Math.ceil(2 * episodeCount / 3)}: Deepening conflict
4. Episodes ${Math.ceil(2 * episodeCount / 3) + 1}-${episodeCount}: Climax & resolution
5. No cheap happy endings, no stereotypes
6. Generate NARRATOR profile based on audience and theme
7. Generate SENSORY PALETTE (smells, sounds, textures, light sources) that matches theme
8. Generate CHARACTER MAP from narrative
9. Generate THEMATIC CORE (central question, emotional arc, resolution style)

RESPOND WITH ONLY VALID JSON (no markdown, no comments):
\`\`\`json
{
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "audience": "${params.audience}",
  
  "narrator": {
    "age": 45,
    "gender": "female",
    "tone": "confessional",
    "voiceHabits": {
      "apologyPattern": "...",
      "doubtPattern": "...",
      "memoryTrigger": "...",
      "angerPattern": "..."
    }
  },
  
  "sensoryPalette": {
    "details": ["domestic", "intimate", "complex"],
    "smells": ["coffee", "old books", "fabric"],
    "sounds": ["silence", "breathing", "clock ticking"],
    "textures": ["soft", "worn", "familiar"],
    "lightSources": ["window light", "lamp", "dawn"]
  },
  
  "characterMap": {
    "Narrator": { "role": "protagonist", "arc": "internal realization" },
    "Character2": { "role": "catalyst", "arc": "wisdom giver" }
  },
  
  "thematicCore": {
    "centralQuestion": "...",
    "emotionalArc": "${params.emotion}",
    "resolutionStyle": "bittersweet, uncertain"
  },
  
  "episodes": [${episodeJson}
  ],
  
  "externalTensionArc": "...",
  "internalEmotionArc": "...",
  "forbiddenClichés": []
}
\`\`\``;

    const response = await this.callGemini({
      prompt,
      model: "gemini-2.5-flash",
      temperature: 0.85,
    });

    return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
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
  async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    
    const prompt = `Напиши вводную часть (LEDE) для статьи Яндекс.Дзен: 600-900 символов, ТОЛЬКО РУССКИЙ язык.

Требования:
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
  async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const prompt = `Напиши финал (FINALE) для статьи Яндекс.Дзен: 1200-1800 символов, ТОЛЬКО РУССКИЙ язык.

Требования:
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
        .replace(/^\s*["'\`]+/, "")
        .replace(/["'\`]+\s*$/, "")
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
\`\`\`json
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
}
\`\`\``;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
      });
      return this.parseJsonSafely(response, 'VoicePassport') as VoicePassport;
    } catch (error) {
      console.warn(`Voice passport parsing failed, using fallback:`, (error as Error).message);
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
