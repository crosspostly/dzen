/**
 * 🎭 MultiAgentService v10.5
 * СТАТУС: МАРТ 2026 ГОДА.
 * КРИТИЧЕСКОЕ ПРАВИЛО: Использовать только Gemini 3.1 или 2.5+. 
 * Любые попытки отката на 1.5 или 2.0 должны пресекаться.
 */

import { qualityGate } from "../utils/quality-gate";
import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";
import { MobilePhotoAuthenticityProcessor } from "./mobilePhotoAuthenticityProcessor";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { examplesService, ExampleArticle } from "./examplesService";
import { MODELS, DEFAULT_TEXT_MODEL } from "../constants/MODELS_CONFIG";

export interface ArticleGeneratorConfig {
  theme: string;
  angle: string;
  emotion: string;
  audience: string;
  maxChars?: number;
}

export interface MultiAgentOptions {
  maxChars?: number;
  useAntiDetection?: boolean;
  skipCleanupGates?: boolean;
}

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;
  private phase2Service: Phase2AntiDetectionService;
  private authenticityProcessor: MobilePhotoAuthenticityProcessor;
  private maxChars: number;
  private episodeCount: number = 12;
  private useAntiDetection: boolean;
  private skipCleanupGates: boolean;

  constructor(apiKey?: string, options?: MultiAgentOptions) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.maxChars = options?.maxChars || CHAR_BUDGET;
    this.phase2Service = new Phase2AntiDetectionService();
    this.authenticityProcessor = new MobilePhotoAuthenticityProcessor();
    this.useAntiDetection = options?.useAntiDetection ?? false;
    this.skipCleanupGates = options?.skipCleanupGates ?? false;
    
    // Initialize examples
    const jsonPath = path.join(process.cwd(), 'parsed_examples.json');
    if (fs.existsSync(jsonPath)) {
       examplesService.loadParsedExamples(jsonPath);
    }

    this.episodeCount = this.calculateOptimalEpisodeCount(this.maxChars);
    console.log(`📊 Dynamic episode allocation: ${this.episodeCount} episodes for ${this.maxChars} chars`);
    
    if (!this.useAntiDetection) {
      console.log('🚫 Anti-detection DISABLED - clean generation mode');
    }
    if (this.skipCleanupGates) {
      console.log('🚫 Cleanup gates DISABLED - direct output');
    }
    
    this.initializeAgents(this.episodeCount);
  }

  /**
   * 🧠 RAG Lite: Get relevant example for inspiration (Channel-based logic)
   */
  private getRelevantExample(theme: string, audience: string): ExampleArticle | null {
    // 🆕 v9.4: Robust hard-switch. If it's travel/ethno/nomad, drama is BANNED.
    const isTravelChannel = /travel|nomad|food|ethno|culture/i.test(audience) || 
                            /путешеств|еда|обряд|батон/i.test(theme);
    
    const examplesFile = isTravelChannel ? 'travel_examples.json' : 'parsed_examples.json';
    const jsonPath = path.join(process.cwd(), examplesFile);
    
    if (isTravelChannel) {
      console.log(`🌍 TRAVEL MODE: Loading from ${examplesFile}`);
    }

    const examples = examplesService.loadParsedExamples(jsonPath);
    if (examples.length === 0) return null;

    // 2. Try to find semantic match
    const keywords = theme.toLowerCase().split(' ').filter(w => w.length > 4);
    const match = examples.find(ex => {
       const titleLower = ex.title.toLowerCase();
       return keywords.some(k => titleLower.includes(k));
    });

    if (match) {
       console.log(`🧠 RAG: Found match in ${examplesFile}: "${match.title}"`);
       return match;
    }

    // 3. Fallback: Return top 1
    const top = examplesService.selectBestExamples(examples, 1)[0];
    console.log(`🧠 RAG: Using format anchor from ${examplesFile}: "${top.title}"`);
    return top;
  }

  /**
   * Calculate optimal episode count based on character budget
   */
  private calculateOptimalEpisodeCount(maxChars: number): number {
    const LEDE_CHARS = (BUDGET_ALLOCATIONS.LEDE_BUDGET_MIN + BUDGET_ALLOCATIONS.LEDE_BUDGET_MAX) / 2;
    const FINALE_CHARS = (BUDGET_ALLOCATIONS.FINALE_BUDGET_MIN + BUDGET_ALLOCATIONS.FINALE_BUDGET_MAX) / 2;
    const AVG_EPISODE_CHARS = BUDGET_ALLOCATIONS.AVG_EPISODE_CHARS_BASE;
    const MIN_EPISODES = BUDGET_ALLOCATIONS.MIN_EPISODES;
    const MAX_EPISODES = BUDGET_ALLOCATIONS.MAX_EPISODES;

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
   * 🛡️ THE BATON GUARD: Strictly replaces any mentions of 'Снежок' with 'Батон'
   */
  private sanitizeBaton(text: string): string {
    return text.replace(/Снежок/g, 'Батон')
               .replace(/Снежка/g, 'Батона')
               .replace(/Снежку/g, 'Батону')
               .replace(/Снежком/g, 'Батоном')
               .replace(/Снежке/g, 'Батоне');
  }

  /**
   * Main entry point: Generate full longform article with archetype support
   */
  async generateLongFormArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
    maxChars?: number;
    includeImages?: boolean;
    applyPhase2AntiDetection?: boolean;
  }): Promise<LongFormArticle> {
    const maxChars = params.maxChars || this.maxChars;
    const episodeCount = this.calculateOptimalEpisodeCount(maxChars);

    // 🆕 v10.0: Fixed Travel Identity
    const safeEmotion = params.emotion || "inspiration";
    const safeTheme = this.sanitizeBaton(params.theme);

    console.log("\n🎬 [ZenMaster v10.0] Starting SERIAL TRAVEL generation...");
    console.log(`📏 Theme: "${safeTheme}"`);
    console.log(`🎯 Narrator: 50+, Traveler with dog "Baton"`);
    
    // Stage 0: Outline Engineering
    console.log(`📋 Stage 0: Building travel outline (${episodeCount} episodes)...`);
    let outline: OutlineStructure;

    try {
      outline = await this.generateOutline({ ...params, theme: safeTheme, emotion: safeEmotion }, episodeCount);
      
      if (!outline.episodes || outline.episodes.length < 2) {
        throw new Error("Stage 0 produced invalid/empty outline.");
      }
    } catch (error) {
      console.error(`❌ Stage 0 CRITICAL FAILURE:`, (error as Error).message);
      throw new Error("Cannot proceed without valid Stage 0 Outline.");
    }

    // Extract and validate plotBible from outline
    const plotBible = this.extractPlotBible(outline, { ...params, emotion: safeEmotion });
    console.log("✅ Travel PlotBible ready:");
    console.log(JSON.stringify(plotBible, null, 2));

    // Stage 1: Parallel Episode Generation (FASTER)
    console.log(`🔄 Stage 1: Generating ${outline.episodes.length} episodes IN PARALLEL...`);
    let episodes: Episode[];

    try {
      // Инициализируем агентов
      this.initializeAgents(outline.episodes.length);
      
      const episodePromises = outline.episodes.map((episodeOutline, idx) => 
        this.agents[idx].generateEpisode(episodeOutline, {})
      );
      episodes = await Promise.all(episodePromises);
    } catch (error) {
      console.error(`❌ Parallel episodes generation failed:`, error);
      throw error;
    }

    if (episodes.length === 0) {
      episodes = this.createMinimalEpisodes(episodeCount);
    }
    
    this.printPhase2Summary(episodes);
    
    // Generate Title
    console.log("🗰 Generating title...");
    let title: string = this.sanitizeBaton(outline.theme);

    // Stage 2: Synchronized Article Assembly (OPTIMIZED: NO FULL REWRITE)
    console.log("🎯 Stage 2: Assembling Travel Article (Fast Mode)...");
    
    let lede: string;
    let finale: string;

    try {
      console.log("   📝 Generating LEDE...");
      lede = await this.generateLede(outline, episodes[0]);
    } catch (error) {
      lede = this.getFallbackLede(outline);
    }

    try {
      console.log("   📝 Generating FINALE...");
      finale = await this.generateFinale(outline, episodes[episodes.length - 1]);
    } catch (error) {
      finale = this.getFallbackFinale(outline);
    }
    
    // 🔥 OPTIMIZATION: Use episodes directly instead of rewriting them
    const bodyContent = episodes.slice(1, -1).map(ep => ep.content).join('\n\n');

    // Assemble full content
    let fullContent = [
      lede,
      bodyContent,
      finale
    ].filter(Boolean).join('\n\n');

    // Create article object
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title: this.sanitizeBaton(title),
      outline,
      episodes,
      lede: this.sanitizeBaton(lede),
      development: this.sanitizeBaton(bodyContent), // Now just a collection of episodes
      climax: "", 
      resolution: "",
      finale: this.sanitizeBaton(finale),
      voicePassport: this.getFixedTravelVoicePassport(),
      coverImage: undefined,
      metadata: {
        totalChars: fullContent.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale),
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale),
        dialogueCount: this.countDialogues(lede, episodes, finale),
      },
      processedContent: this.sanitizeBaton(fullContent),
      adversarialScore: undefined,
      phase2Applied: false
    };

    return article;
  }

  /**
   * 🆕 STAGE 4: Apply mobile photo authenticity to article images
   * Processes cover image and any episode images
   */
  private async applyAuthenticityToImages(article: LongFormArticle): Promise<void> {
    console.log(`\n🔧 Stage 4: Applying mobile photo authenticity...`);

    let processedCount = 0;
    let failedCount = 0;

    // Process cover image if present
    if (article.coverImage?.base64) {
      try {
        console.log(`   Processing cover image...`);
        const authResult = await this.authenticityProcessor.processForMobileAuthenticity(
          article.coverImage.base64
        );

        if (authResult.success && authResult.processedBuffer) {
          article.coverImage.base64 = authResult.processedBuffer.toString('base64');
          article.coverImage.authenticityLevel = authResult.authenticityLevel;
          article.coverImage.appliedEffects = authResult.appliedEffects;
          article.coverImage.deviceSimulated = authResult.deviceSimulated;
          processedCount++;
          console.log(`   ✅ Cover image authenticated (${authResult.deviceSimulated})`);
        } else {
          failedCount++;
          console.warn(`   ⚠️  Cover image authentication failed: ${authResult.errorMessage}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`   ❌ Cover image error:`, (error as Error).message);
      }
    }

    // Process episode images if present
    for (const episode of article.episodes) {
      if (episode.imagePath) {
        try {
          console.log(`   Processing episode ${episode.id} image...`);
          const authResult = await this.authenticityProcessor.processForMobileAuthenticity(
            episode.imagePath
          );

          if (authResult.success && authResult.processedBuffer) {
            episode.imagePath = authResult.processedBuffer.toString('base64');
            episode.authenticityLevel = authResult.authenticityLevel;
            episode.appliedEffects = authResult.appliedEffects;
            processedCount++;
            console.log(`   ✅ Episode ${episode.id} authenticated`);
          } else {
            failedCount++;
            console.warn(`   ⚠️  Episode ${episode.id} authentication failed: ${authResult.errorMessage}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`   ❌ Episode ${episode.id} error:`, (error as Error).message);
        }
      }
    }

    console.log(`\n✅ Stage 4 Complete: ${processedCount} images processed, ${failedCount} failed`);

    // Update article metadata
    article.stage4Applied = true;
    article.stage4Stats = { processedCount, failedCount };
  }

  /**
   * 🎭 Build PlotBible section for prompt
   */
  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) {
      return '';
    }
    
    const narrator = plotBible.narrator;
    const sensory = plotBible.sensoryPalette;
    const thematic = plotBible.thematicCore;
    
    let section = '';
    
    if (narrator) {
      section += `\n📖 ГОЛОС РАССКАЗЧИКА (${narrator.age || '40-50'} лет, ${narrator.tone || 'исповедальный'})`;
      if (narrator.voiceHabits) {
        if (narrator.voiceHabits.doubtPattern) {
          section += `\n   При сомнении: "${narrator.voiceHabits.doubtPattern}"`;
        }
        if (narrator.voiceHabits.memoryTrigger) {
          section += `\n   Триггер памяти: "${narrator.voiceHabits.memoryTrigger}"`;
        }
        if (narrator.voiceHabits.angerPattern) {
          section += `\n   При гневе: "${narrator.voiceHabits.angerPattern}"`;
        }
      }
    }
    
    if (sensory) {
      section += `\n🎨 СЕНСОРНАЯ ПАЛИТРА:`;
      if (sensory.details && sensory.details.length > 0) {
        section += `\n   Зрение: ${sensory.details.slice(0, 3).join(', ')}`;
      }
      if (sensory.smells && sensory.smells.length > 0) {
        section += `\n   Запахи: ${sensory.smells.slice(0, 2).join(', ')}`;
      }
      if (sensory.sounds && sensory.sounds.length > 0) {
        section += `\n   Звуки: ${sensory.sounds.slice(0, 2).join(', ')}`;
      }
      if (sensory.textures && sensory.textures.length > 0) {
        section += `\n   Осязание: ${sensory.textures.slice(0, 2).join(', ')}`;
      }
    }
    
    if (thematic) {
      section += `\n🎯 ТЕМАТИЧЕСКОЕ ЯДРО:`;
      if (thematic.centralQuestion) {
        section += `\n   Главный вопрос: "${thematic.centralQuestion}"`;
      }
      if (thematic.emotionalArc) {
        section += `\n   Эмоциональная дуга: ${thematic.emotionalArc}`;
      }
    }
    
    return section;
  }

  /**
   * 📚 Load shared guidelines for prompts
   */
  private loadSharedGuidelines(): string {
    let guidelines = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    guidelines += 'ОБЩИЕ ПРАВИЛА КАЧЕСТВА:\n';
    
    const files = [
      'shared/voice-guidelines.md',
      'shared/anti-detect.md',
      'shared/archetype-rules.md',
      'shared/quality-gates.md'
    ];

    for (const file of files) {
      try {
        const filePath = path.join(process.cwd(), 'prompts', file);
        if (fs.existsSync(filePath)) {
          guidelines += fs.readFileSync(filePath, 'utf-8') + '\n';
        }
      } catch (e) {
        console.warn(`⚠️ Could not read shared guideline: ${file}`);
      }
    }

    return guidelines;
  }

  /**
   * 🎯 TASK 1: generateDevelopment() - Travel reality
   */
  async generateDevelopment(outline: OutlineStructure, devEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SENTENCE VARIETY: Short. Medium. Long. Short.
✅ INCOMPLETE SENTENCES: "Я начала говорить, но..." (2-3 times)
✅ INTERJECTIONS: "Ну да ладно." (2 times)
✅ EMOTIONS AS ACTIONS: ✅ "Руки тряслись." NOT ❌ "I was scared."
✅ START WITH ACTION/DIALOGUE: NOT description`;

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly (TRAVEL)';
    }

    const guidelines = this.loadSharedGuidelines();
    const episodesContent = devEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}

${guidelines}

📄 DEVELOPMENT - middle of story rewrite (Travel Diary)

${plotBibleSection}
${antiDetection}

🎯 TASK: Rewrite the following episodes into a cohesive DEVELOPMENT section.
Source Episodes:
${episodesContent}

REQUIREMENTS:
- Continue from previous episode
- Focus on the journey, road details, and encounters
- Use narrator's conversational voice
- Varied sentence length
- Include 2-3 incomplete sentences
- Include 2 interjections
- Target length: 3500-4500 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.92
    });
  }

  /**
   * 🎯 TASK 2: generateClimax() - Travel culmination
   */
  async generateClimax(outline: OutlineStructure, development: string, climaxEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = development.substring(development.length - 200);

    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SHORT PUNCHY SENTENCES: "Я замерла. Батон рыкнул."
✅ SENSORY OVERLOAD: "Шум воды, запах жареного мяса, пыль."
✅ DIALOGUE: "— Ну что, Батон? — спросила я."
✅ INTERNAL + ACTION MIX: "Я должна это увидеть. Сейчас."`;

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly (TRAVEL)';
    }

    const guidelines = this.loadSharedGuidelines();
    const episodesContent = climaxEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}

${guidelines}

📄 CLIMAX - middle of journey culmination

${plotBibleSection}
${antiDetection}

🎯 TASK: Rewrite the following episodes into a powerful CLIMAX section of the travel story.
Previous Context: "${previousContext}"

Source Episodes:
${episodesContent}

🎬 CLIMAX STRUCTURE:
1. THE MOMENT (sensory hook)
   - Discovery, ritual, or peak view
   - Action/Reaction of narrator and Baton
   - Emotional impact (no "victory", just "insight")

REQUIREMENTS:
- Build from development
- Maximum sensory intensity
- Short, punchy sentences
- Baton reacts to the peak moment
- Target length: 2500-3500 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.88
    });
  }

  /**
   * 🎯 TASK 3: generateResolution() - Day closure
   */
  async generateResolution(outline: OutlineStructure, climax: string): Promise<string> {
    const plotBible = outline.plotBible;
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SLOWER PACE: "Я села на порог. Просто сидела..."
✅ SELF-REFLECTION: "Что я поняла сегодня?"
✅ NO MORALIZING: Realization through experience
✅ ATMOSPHERE: Evening sounds, fatigue, peace.`;

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly (TRAVEL)';
    }

    const guidelines = this.loadSharedGuidelines();

    const prompt = `${basePrompt}

${guidelines}

📄 RESOLUTION - day aftermath (1000-1200 chars)

${plotBibleSection}
${antiDetection}

🎯 TASK: Write RESOLUTION (Journey Day Closure)

STRUCTURE:
- 50% Reflection on the peak moment
- 50% Settling down (finding hotel/campsite, feeding Baton)

REQUIREMENTS:
- After climax intensity, processing what happened
- Calm, satisfied tone
- Specific travel details
- Target length: 1000-1300 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.85
    });
  }

  /**
   * 📊 Print Phase 2 Summary for all episodes
   */
  private printPhase2Summary(episodes: Episode[]): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL ADVERSARIAL METRICS`);
    console.log(`${'='.repeat(60)}\n`);
    
    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length === 0) {
      console.log('   No Phase 2 metrics available\n');
      return;
    }
    
    const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
    console.log(`   Article Avg Score: ${avgScore.toFixed(0)}/100`);
    console.log(`   Episodes with metrics: ${episodesWithMetrics.length}/${episodes.length}`);
    console.log(`   Recommendation: ${avgScore >= 70 ? '✅ PASS' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(``);
  }

  /**
   * 🎭 FIXED: Extract PlotBible with strictly Travel identity
   */
  public extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    console.log("✅ Using FIXED Travel PlotBible");
    
    return {
      narrator: {
        age: 55,
        gender: "female" as "male" | "female",
        tone: "conversational",
        voiceHabits: {
          apologyPattern: "Ну да ладно, я не об этом...",
          doubtPattern: "Честно говоря, я до конца не верила...",
          memoryTrigger: "Сразу вспомнилось, как в прошлом году...",
          angerPattern: "Вот тут меня и прорвало.",
        },
      },
      sensoryPalette: {
        details: ["пыльные дороги", "старые камни", "блики солнца"],
        smells: ["жареное мясо", "мокрая шерсть", "специи"],
        sounds: ["шум мотора", "лай Батона", "тишина гор"],
        textures: ["шершавая стена", "холодный металл", "мягкое ухо"],
        lightSources: ["закат", "тусклая лампа", "костер"],
      },
      characterMap: {
        Narrator: { role: "protagonist", arc: "internal realization" },
        Baton: { role: "companion", arc: "emotional support" }
      },
      thematicCore: {
        centralQuestion: "Что мы найдем за следующим поворотом?",
        emotionalArc: params.emotion,
        resolutionStyle: "bittersweet",
      },
    };
  }

  private getFixedTravelVoicePassport(): VoicePassport {
    return {
      apologyPattern: "Ну да ладно...",
      doubtPattern: "Не знаю, правильно ли это...",
      memoryTrigger: "Вспомнилось вдруг...",
      characterSketch: "Простой человек с добрыми глазами",
      humorStyle: "self-irony",
      jokeExample: "Батон посмотрел на меня как на сумасшедшую",
      angerPattern: "Ну это уже слишком!",
      paragraphEndings: ["pause", "short_phrase"],
      examples: ["Батон, не тяни!", "Такая вот история."]
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
          console.error(`❌ Failed to parse ${context}. Raw string:`, cleaned.substring(0, 500) + '...');
          throw new Error(`Failed to parse ${context}: ${(e2 as Error).message}`);
        }
      }
    }
  }

  /**
   * 🔧 v10.0: Generate outline with TRAVEL structure
   */
  public async generateOutline(params: {
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

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-0-plan.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 0: Travel PlotBible Generation';
    }

    const guidelines = this.loadSharedGuidelines();

    const prompt = `${basePrompt}

${guidelines}

🎭 TRAVEL STORY ARCHITECT - GENERATE SERIAL OUTLINE

TASK: Create ${episodeCount}-episode narrative structure for a travel day.

INPUT:
- Theme: "${params.theme}"
- Angle: ${params.angle}
- Emotion: ${params.emotion}
- Narrator: 50+ traveler with white dog Baton.

🔧 CRITICAL REQUIREMENT:
Generate COMPLETE plotBible with sensory details (smells, sounds, textures).
NO MELODRAMA. NO ANTAGONISTS. Just travel reality.

RESPOND WITH ONLY VALID JSON:
\`\`\`json
{
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "audience": "${params.audience}",
  "plotBible": {
    "narrator": {
      "age": 55,
      "gender": "male/female",
      "tone": "experienced traveler, observant, calm",
      "companion": "Батон (small white fluffy dog)"
    },
    "sensoryPalette": {
      "smells": ["пыль", "бензин", "специи", "жареное мясо"],
      "sounds": ["рынок", "мотор", "ветер", "лай"],
      "textures": ["камни", "ткань", "еда", "шерсть"]
    }
  },
  "characterMap": {
    "Narrator": { "role": "traveler", "arc": "discovery" },
    "Baton": { "role": "companion", "arc": "reacts to everything" }
  },
  "thematicCore": {
    "centralQuestion": "Что нас ждет за поворотом?",
    "emotionalArc": "${params.emotion}",
    "resolutionStyle": "satisfied traveler"
  },
  "episodes": [${episodeJson}
  ],
  "externalTensionArc": "Дорога и открытия",
  "internalEmotionArc": "От усталости к восторгу",
  "forbiddenCliches": ["бездонные глаза", "луч солнца", "захватывающий вид"]
}
\`\`\``;

    const response = await this.callGeminiSmart({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.85,
    });

    try {
      return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
    } catch (e) {
      return this.createFallbackOutline(params, episodeCount);
    }
  }

  /**
   * Stage 1: Sequential episode generation
   */
  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY,
      {
        maxChars: this.maxChars,
        useAntiDetection: this.useAntiDetection
      }
    );

    return await episodeGenerator.generateEpisodesSequentially(
      outline.episodes,
      {
        delayBetweenRequests: 1500,
        onProgress: (current, total) => {
          console.log(`   ✅ Episode ${current}/${total} complete`);
        },
        plotBible: outline.plotBible
      }
    );
  }

  /**
   * ✅ v4.5: Generate opening (lede): 600-900 chars
   */
  async generateLede(outline: OutlineStructure, episode: Episode): Promise<string> {
    const plotBible = outline.plotBible;
    
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly (TRAVEL)';
    }

    const guidelines = this.loadSharedGuidelines();
    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    
    const prompt = `${basePrompt}

${guidelines}

📄 LEDE (600-900 chars) - travel opening hook rewrite

${plotBibleSection}

⚠️ ANTI-DETECTION:
✅ SENTENCE VARIETY: Short. Medium. Short.
✅ INCOMPLETE SENTENCES: "Пыль. Жара. Мы на месте."
✅ INTERJECTIONS: "Ну что ж..."
✅ START WITH: ACTION, DIALOGUE, or ATMOSPHERE

🎯 TASK: Rewrite the following episode into a compelling LEDE for a travel diary.
Source Episode: "${episode.content.substring(0, 1000)}..."

REQUIREMENTS:
- Start with sensory detail or action with Baton
- Use narrator's conversational voice
- Vary sentence length
- End with hook that makes reader scroll
- 600-900 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.95,
    });
  }

  /**
   * ✅ v4.5: Generate closing (finale): 1000-1200 chars
   */
  async generateFinale(outline: OutlineStructure, episode: Episode): Promise<string> {
    const plotBible = outline.plotBible;
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly (TRAVEL)';
    }

    const guidelines = this.loadSharedGuidelines();

    const prompt = `${basePrompt}

${guidelines}

📄 FINALE (1200-1800 chars) - travel day conclusion rewrite

${plotBibleSection}

⚠️ FINALE RULES:

✅ REQUIRED:
   - Summary of the day's lesson/insight
   - Practical details (budget in rubles/local currency)
   - Teaser for tomorrow (where are we going?)
   - Question to reader about travel/life

✅ GRAPHIC FORMATTING:
   - Final statement in CAPS: "ЗАВТРА ЕДЕМ ДАЛЬШЕ."
   - Final question to engagement

🎯 TASK: Rewrite the following episode into a powerful FINALE for a travel diary.
Source Episode: "${episode.content.substring(0, 1500)}..."

REQUIREMENTS:
- Honest, slightly tired but happy tone
- No moralizing
- Clear closure of the day
- 1200-1800 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: MODELS.TEXT.PRIMARY,
      temperature: 0.9,
    });
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `📄 TITLE (55-90 Russian chars)

Theme: "${outline.theme}"
Opening: ${lede.substring(0, 200)}...

FORMULA: [SENSORY HOOK] + [BATON/JOURNEY] + [REALITY]

EXAMPLES:
✅ "Батон испугался высоты, а я нашел лучший кофе в Марокко"
✅ "Как прожить в Тбилиси неделю на 10 000 рублей: честный отчет"
✅ "Ушли вглубь старого Дагестана: сколько стоит ужин в ауле"

OUTPUT: Only the title (no quotes, no JSON)`;

    try {
      const response = await this.callGemini({
        prompt,
        model: MODELS.TEXT.PRIMARY,
        temperature: 0.85,
      });

      let title = response?.trim().replace(/^["'`]+/, "").replace(/["'`]+$/, "").replace(/\.$/, "").substring(0, 100);

      if (!title || !/[а-яёА-ЯЁ]/.test(title)) {
        return outline.theme;
      }

      return title;
    } catch (error) {
      return outline.theme;
    }
  }

  /**
   * Generate voice passport (7 fixed habits)
   */
  private async generateVoicePassport(audience: string): Promise<VoicePassport> {
    const prompt = `Generate Voice Passport for author: ${audience}

Respond as JSON:
\`\`\`json
{
  "apologyPattern": "How author justifies",
  "doubtPattern": "How they express uncertainty",
  "memoryTrigger": "How they recall the past",
  "characterSketch": "How they describe people",
  "humorStyle": "self-irony|bitter|kind|dark",
  "jokeExample": "One example of their joke",
  "angerPattern": "How they express anger",
  "paragraphEndings": ["question", "pause", "short_phrase"],
  "examples": ["example1", "example2"]
}
\`\`\``;

    try {
      const response = await this.callGemini({
        prompt,
        model: MODELS.TEXT.PRIMARY,
        temperature: 0.8,
      });
      return this.parseJsonSafely(response, 'VoicePassport') as VoicePassport;
    } catch (error) {
      return this.getFallbackVoicePassport();
    }
  }

  /**
   * Helper: Clean Gemini response from conversational filler
   */
  private cleanGeminiResponse(text: string): string {
    if (!text) return "";
    
    let cleaned = text;

    // Remove markdown code blocks if they wrap the content
    // e.g. ```markdown \n CONTENT \n ```
    // We use a safe regex that ensures we match start and end
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
       cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
    }

    // Remove common AI preambles (case-insensitive)
    const preambles = [
      /^(Here is|Sure,|Certainly|Okay,|Of course,|Вот|Конечно|Держите).*?(:|\n)/i,
      /^(Output|Response|Article|Stage \d+):?\s*\n?/i,
      /^Here'?s the rewritten.*?:\s*/i,
      /^Here is the article.*?:\s*/i
    ];

    for (const pattern of preambles) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }

  /**
   * Helper: Call Gemini API with SMART Waterfall (For Outline/Planning)
   */
  private async callGeminiSmart(params: { prompt: string; model: string; temperature: number } | string): Promise<string> {
    const prompt = typeof params === 'string' ? params : params.prompt;
    const temperature = typeof params === 'string' ? 0.7 : params.temperature;

    const smartWaterfall = [
      "gemini-3.1-pro-preview", 
      "gemini-2.5-pro",
      "gemini-2.5-flash"
    ];

    for (const currentModel of smartWaterfall) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: { temperature, topK: 40, topP: 0.95 }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.length > 50) return this.cleanGeminiResponse(text);
      } catch (error) {
        console.log(`🔄 Smart model ${currentModel} failed, trying next...`);
      }
    }
    throw new Error('All smart models failed.');
  }

  /**
   * Helper: Call Gemini API with FAST Waterfall (For Episodes/Assembly)
   */
  private async callGemini(params: { prompt: string; model: string; temperature: number } | string): Promise<string> {
    const prompt = typeof params === 'string' ? params : params.prompt;
    const temperature = typeof params === 'string' ? 0.7 : params.temperature;

    const fastWaterfall = [
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ];

    for (const currentModel of fastWaterfall) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: { temperature, topK: 40, topP: 0.95 }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.length > 10) return this.cleanGeminiResponse(text);
      } catch (error) {
        console.log(`🔄 Fast model ${currentModel} failed, trying next...`);
      }
    }
    return this.callGeminiSmart(params); // Last resort: use smart model if fast ones fail
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
    const sceneVerbs = /видела|видел|видел|видело|виделась|виделся|виделись|виделся|виделось|виделась|виделась|виделась|виделась|виделась|виделась|виделась|виделась|виделась|виделась|виделась|виделась/gi;
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

  // ============================================================================
  // FALLBACK METHODS
  // ============================================================================

  private createFallbackOutline(params: any, episodeCount: number): OutlineStructure {
    return {
      theme: params.theme || "История о важном событии",
      angle: params.angle || "confession",
      emotion: params.emotion || "triumph",
      audience: params.audience || "women 35-60",
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        id: i + 1,
        title: `Эпизод ${i + 1}`,
        hookQuestion: `Почему это случилось?`,
        externalConflict: `Конфликт #${i + 1}`,
        internalConflict: `Эмоция #${i + 1}`,
        keyTurning: `Поворот #${i + 1}`,
        openLoop: `Нерешённый вопрос #${i + 1}`
      })),
      externalTensionArc: "Растущее напряжение",
      internalEmotionArc: "От замешательства к триумфу",
      characterMap: {},
      forbiddenClichés: [],
      plotBible: {
        narrator: { age: 45, gender: "female", tone: "confessional", voiceHabits: { apologyPattern: "", doubtPattern: "", memoryTrigger: "", angerPattern: "" } },
        sensoryPalette: { details: [], smells: [], sounds: [], textures: [], lightSources: [] },
        characterMap: {},
        thematicCore: { centralQuestion: "Что изменилось?", emotionalArc: params.emotion, resolutionStyle: "triumphant" }
      }
    };
  }

  private createFallbackEpisodes(episodeOutlines: EpisodeOutline[]): Episode[] {
    return episodeOutlines.map(ep => ({
      id: ep.id,
      title: `Эпизод ${ep.id}`,
      content: `${ep.hookQuestion}\n\n${ep.externalConflict}. Я помню этот момент.\n\n${ep.internalConflict}. Это чувство не покидало меня.\n\n${ep.keyTurning}. В тот день всё изменилось.\n\n${ep.openLoop}...`,
      charCount: 300,
      openLoop: ep.openLoop,
      turnPoints: [ep.keyTurning],
      emotions: [ep.internalConflict],
      keyScenes: [],
      characters: [],
      generatedAt: Date.now(),
      stage: "fallback"
    }));
  }

  private createMinimalEpisodes(count: number): Episode[] {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `Эпизод ${i + 1}`,
      content: `Глава ${i + 1}\n\nЭто важная часть моей истории.`,
      charCount: 100,
      openLoop: "Что будет дальше?",
      turnPoints: ["Событие"],
      emotions: ["Эмоция"],
      keyScenes: [],
      characters: [],
      generatedAt: Date.now(),
      stage: "fallback"
    }));
  }

  private getFallbackDevelopment(outline: OutlineStructure): string {
    return outline.episodes.slice(1, -4).map(ep => ep.hookQuestion || '').join('\n\n');
  }

  private getFallbackClimax(outline: OutlineStructure): string {
    return outline.episodes.slice(-4, -1).map(ep => ep.externalConflict || '').join('\n\n');
  }

  private getFallbackResolution(outline: OutlineStructure): string {
    return "Мы сидели в тишине, переваривая всё, что увидели за сегодня. Батон сопел у моих ног, а я смотрела на закат, понимая: этот день останется со мной навсегда.";
  }

  private getFallbackLede(outline: OutlineStructure): string {
    return outline.episodes[0]?.hookQuestion || `${outline.theme}. Начало нашего пути.`;
  }

  private getFallbackFinale(outline: OutlineStructure): string {
    return outline.episodes[outline.episodes.length - 1]?.openLoop || "Завтра нас ждут новые дороги.";
  }

  private getFallbackVoicePassport(): VoicePassport {
    return {
      apologyPattern: "Я не хотела...",
      doubtPattern: "Может быть, я ошибалась...",
      memoryTrigger: "Я помню этот день...",
      characterSketch: "Обычная женщина",
      humorStyle: "self-irony",
      jokeExample: "Как я потом поняла, жизнь всегда подкидывает сюрпризы",
      angerPattern: "Это бесит!",
      paragraphEndings: ["question", "pause", "short_phrase"],
      examples: []
    };
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
    this.titleGenerator = new EpisodeTitleGenerator(process.env.GEMINI_API_KEY || process.env.API_KEY);
  }

  async generateEpisode(outline: EpisodeOutline, context: any): Promise<Episode> {
    const prompt = `Write Episode #${outline.id} for serialized narrative:
- Question: "${outline.hookQuestion}"
- External conflict: "${outline.externalConflict}"
- Internal emotion: "${outline.internalConflict}"
- Turning point: "${outline.keyTurning}"
- Open loop: "${outline.openLoop}"

REQUIREMENTS:
1. Length: 3000-4000 chars
2. Structure: Event → Dialogue/Thought → Turning point → Cliff-hanger
3. At least 1 natural dialogue
4. End: Open loop (reader scrolls)
5. Tone: Confessional, intimate

Output ONLY the episode text. No titles, no metadata.`;

    const content = await this.callGemini(prompt);
    const episodeTitle = await this.titleGenerator.generateEpisodeTitle(outline.id, content, outline.openLoop);

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

  private async callGemini(prompt: string): Promise<string> {
    const waterfall = [
      "gemini-2.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-1.5-flash"
    ];

    for (const currentModel of waterfall) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: { temperature: 0.7, topK: 40, topP: 0.95 }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.length > 100) {
          return this.cleanResponse(text);
        }
      } catch (error) {
        console.log(`🔄 ContentAgent: ${currentModel} failed, next...`);
      }
    }
    return `Эпизод ${this.id}\n\nОшибка генерации.`;
  }

  private cleanResponse(text: string): string {
    if (!text) return "";
    
    let cleaned = text;
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
       cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
    }

    const preambles = [
      /^(Here is|Sure,|Certainly|Okay,|Of course,|Вот|Конечно|Держите).*?(:|\n)/i,
      /^(Output|Response|Episode \d+):?\s*\n?/i
    ];

    for (const pattern of preambles) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }
}

// ============================================================================
// ContextManager: Placeholder for future context management
// ============================================================================

class ContextManager {
  // Future: Implement context caching and reuse
}
