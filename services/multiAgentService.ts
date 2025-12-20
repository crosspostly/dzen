// ============================================================================
// ZenMaster v2.0 — Multi-Agent Service
// Orchestrates parallel generation of 12 episodes for 35K+ longform articles
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { imageGeneratorAgent } from "./imageGeneratorAgent"; // 🖼️ НОВОЕ

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
    includeImages?: boolean; // 🖼️ НОВОЕ: флаг генерации картинок
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
    
    // 🖼️ НОВОЕ: Generate cover image if requested
    let coverImageBuffer: Buffer | undefined;
    if (params.includeImages) {
      try {
        console.log("🖼️  Generating cover image...");
        coverImageBuffer = await imageGeneratorAgent.generateCoverImage({
          title,
          lede,
          theme: params.theme,
          emotion: params.emotion,
        });
        if (coverImageBuffer) {
          console.log(`✅ Cover image generated (${coverImageBuffer.length} bytes)`);
        }
      } catch (error) {
        console.error(`❌ Cover image generation failed:`, (error as Error).message);
        // Continue without image if generation fails
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
      coverImage: coverImageBuffer, // 🖼️ НОВОЕ: добавляем картинку в статью
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
   * Strip markdown code blocks from JSON responses
   */
  private stripMarkdownJson(text: string): string {
    let cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
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
    // ... 11 more episodes
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
      return JSON.parse(cleanedJson) as OutlineStructure;
    } catch (e) {
      console.error("Outline parse failed:", e);
      throw new Error("Failed to generate outline");
    }
  }

  /**
   * Stage 1: Sequential episode generation
   * Each episode = one API request, waiting between requests to avoid overload
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

✅ ОТЛИЧНЫЕ ПРИМЕРЫ:
- "Я терпела это 20 лет, пока одна фраза не изменила всё"
- "После его слов я не могла молчать больше"
- "Седая я поняла, что вся моя жизнь была ложью"
- "Тридцать лет я жила чужой жизнью"
- "В один момент я потеряла всё и обрела себя"

❌ ПЛОХИЕ ПРИМЕРЫ (избегать!):
- "10 способов улучшить отношения" (лайфхак-тон, не подходит)
- "Как жить счастливо?" (обобщённо, скучно)
- "История одной женщины" (неинформативно)
- "Женщина и её проблемы" (размыто)

ТРЕБОВАНИЯ:
1. ТОЛЬКО РУССКИЙ язык
2. 55-90 символов
3. Начинается с Я/Мы (первое лицо)
4. Содержит глагол действия (сказала, потеряла, узнала, услышала и т.д.)
5. Обещает неожиданный twist/откровение
6. Без кавычек, без восклицательных знаков в конце
7. Без слова "история"
8. Без скучных формул типа "как", "10 способов"

ОТВЕТ: Напиши ТОЛЬКО заголовок (без JSON, без кавычек, без пояснений):`;;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-2.5-flash",
        temperature: 0.8,
      });

      let title = response
        ?.trim()
        .replace(/^\s*["'`]+/, "")
        .replace(/["'`]+\s*$/, "")
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
   * Primary: gemini-2.5-flash
   * Fallback: gemini-2.5-flash-lite
   */
  private async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    try {
      // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
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
      
      // 🔄 ФОЛБЕК: если модель перегружена
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`🔄 Model overloaded, trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite", // 🔥 ФОЛБЕК МОДЕЛЬ
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
      // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
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
      
      // 🔄 ФОЛБЕК: если модель перегружена
      if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
        console.log(`Agent #${this.id} trying fallback to gemini-2.5-flash-lite...`);
        
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite", // 🔥 ФОЛБЕК МОДЕЛЬ
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