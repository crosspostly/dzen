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

// ============================================================================
// NEW: Article Archetype Types (TOP Articles System)
// ============================================================================

export type HeroArchetype =
  | "comeback_queen"
  | "gold_digger_trap"
  | "inheritance_reveal"
  | "entrepreneur"
  | "phoenix"
  | "mother_wins"
  | "wisdom_earned";

export type ConflictType =
  | "class_prejudice"
  | "family_greed"
  | "gender_expectations"
  | "infidelity_redemption"
  | "matriarch_rejection"
  | "false_image";

export type TimelineType =
  | "sudden"       // 1-3 months (fast action!)
  | "gradual"      // 6-12 months
  | "cyclical"     // Years of silence → sudden change
  | "revelation";  // Was hidden, now revealed

export type AntagonistReaction =
  | "shame"        // Mother-in-law feels shame
  | "regret"       // Husband regrets
  | "jealousy"     // They are jealous
  | "pleading"     // They beg for help
  | "denial"       // They don't believe → then see evidence
  | "anger";       // They are angry

export type VictoryType =
  | "financial"    // "I'm rich, you're not"
  | "professional" // "I'm more successful"
  | "social"       // "I'm respected"
  | "emotional"    // "I'm happy, you're jealous"
  | "moral"        // "I was right"
  | "multi";       // Combo of all

export interface ArticleGeneratorConfig {
  theme: string;
  angle: string;
  emotion: string;
  audience: string;
  maxChars?: number;
  // NEW: Archetype parameters
  heroArchetype?: HeroArchetype;
  conflictType?: ConflictType;
  timeline?: TimelineType;
  antagonistReaction?: AntagonistReaction;
  victoryType?: VictoryType;
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

  // 🆕 v8.0: Archetype configuration
  private heroArchetype?: HeroArchetype;
  private conflictType?: ConflictType;
  private timeline: TimelineType = "sudden";
  private antagonistReaction: AntagonistReaction = "shame";
  private victoryType: VictoryType = "multi";

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
    heroArchetype?: HeroArchetype;
    conflictType?: ConflictType;
    timeline?: TimelineType;
    antagonistReaction?: AntagonistReaction;
    victoryType?: VictoryType;
  }): Promise<LongFormArticle> {
    const maxChars = params.maxChars || this.maxChars;
    const episodeCount = this.calculateOptimalEpisodeCount(maxChars);

    // 🆕 v9.3: Ensure emotion is NEVER undefined
    const safeEmotion = params.emotion || "inspiration";
    
    // 🆕 v9.3: Sanitize input theme just in case
    const safeTheme = this.sanitizeBaton(params.theme);

    console.log("\n🎬 [ZenMaster v9.3] Starting robust generation...");
    console.log(`📏 Theme: "${safeTheme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${safeEmotion}`);
    
    // Stage 0: Outline Engineering
    console.log(`📋 Stage 0: Building outline (${episodeCount} episodes)...`);
    let outline: OutlineStructure;

    try {
      outline = await this.generateOutline({ ...params, theme: safeTheme, emotion: safeEmotion }, episodeCount);
      
      // 🆕 v9.3: CRITICAL SAFETY CHECK - If Stage 0 is trash, STOP.
      if (!outline.episodes || outline.episodes.length < 2) {
        throw new Error("Stage 0 produced invalid/empty outline. Aborting to prevent cascade failure.");
      }
    } catch (error) {
      console.error(`❌ Stage 0 CRITICAL FAILURE:`, (error as Error).message);
      // Wait and re-throw or handle properly
      throw new Error("Cannot proceed without valid Stage 0 Outline.");
    }

    // Extract and validate plotBible from outline
    const plotBible = this.extractPlotBible(outline, { ...params, emotion: safeEmotion });
    console.log("✅ PlotBible ready");

    // Stage 1: Sequential Episode Generation
    console.log(`🔄 Stage 1: Generating ${outline.episodes.length} episodes...`);
    let episodes: Episode[];

    try {
      episodes = await this.generateEpisodesSequentially(outline);
    } catch (error) {
      console.error(`❌ Episodes generation failed:`, error);
      throw error; // No more "fallback" empty content
    }

    if (episodes.length === 0) {
      episodes = this.createMinimalEpisodes(episodeCount);
    }
    
    this.printPhase2Summary(episodes);
    
    // Generate Title early for quality gates
    console.log("🗰 Generating title...");
    let title: string;
    try {
      // Use lede-like info for title if lede not yet ready
      title = await this.generateTitle(outline, episodes[0]?.content.substring(0, 500) || "");
      console.log(`✅ Title: "${title}"`);
    } catch (error) {
      title = outline.theme;
      console.log(`✅ Title (fallback): "${title}"`);
    }

    // Stage 2: Synchronized Article Assembly (Block D)
    console.log("🎯 Stage 2: Synchronized Article Assembly...");
    
    let lede: string;
    let development: string;
    let climax: string;
    let resolution: string;
    let finale: string;

    try {
      console.log("   📝 Generating LEDE...");
      lede = await this.generateLede(outline, episodes[0]);
      const ledeGate = await qualityGate(lede, 70, 600, title + " [LEDE]");
      if (!ledeGate.isValid) console.warn('   ⚠️ LEDE quality low:', ledeGate.issues);
    } catch (error) {
      lede = this.getFallbackLede(outline);
    }

    try {
      console.log("   📝 Generating DEVELOPMENT...");
      // Use episodes 1 to N-4 for development
      const devRange = episodes.slice(1, Math.max(2, episodes.length - 4));
      development = await this.generateDevelopment(outline, devRange);
      const devGate = await qualityGate(development, 70, 1500, title + " [DEV]");
      if (!devGate.isValid) console.warn('   ⚠️ DEVELOPMENT quality low:', devGate.issues);
    } catch (error) {
      development = this.getFallbackDevelopment(outline);
    }

    try {
      console.log("   📝 Generating CLIMAX...");
      // Use last few episodes for climax
      const climaxRange = episodes.slice(Math.max(1, episodes.length - 4), Math.max(1, episodes.length - 1));
      climax = await this.generateClimax(outline, development, climaxRange);
      const climaxGate = await qualityGate(climax, 70, 1200, title + " [CLIMAX]");
      if (!climaxGate.isValid) console.warn('   ⚠️ CLIMAX quality low:', climaxGate.issues);
    } catch (error) {
      climax = this.getFallbackClimax(outline);
    }

    try {
      console.log("   📝 Generating RESOLUTION...");
      resolution = await this.generateResolution(outline, climax);
      const resGate = await qualityGate(resolution, 70, 1000, title + " [RES]");
      if (!resGate.isValid) console.warn('   ⚠️ RESOLUTION quality low:', resGate.issues);
    } catch (error) {
      resolution = this.getFallbackResolution(outline);
    }

    try {
      console.log("   📝 Generating FINALE...");
      finale = await this.generateFinale(outline, episodes[episodes.length - 1]);
      const finaleGate = await qualityGate(finale, 75, 1200, title + " [FINALE]");
      if (!finaleGate.isValid) console.warn('   ⚠️ FINALE quality low:', finaleGate.issues);
    } catch (error) {
      finale = this.getFallbackFinale(outline);
    }
    
    // Generate Voice Passport
    console.log("🎬 Generating voice passport...");
    let voicePassport: VoicePassport;

    try {
      voicePassport = await this.generateVoicePassport(params.audience);
    } catch (error) {
      voicePassport = this.getFallbackVoicePassport();
    }
    
    // Assemble full content - STAGE 2 NO LONGER COPIES, IT REWRITES (Block D)
    let fullContent = [
      lede,
      development,
      climax,
      resolution,
      finale
    ].join('\n\n');

    // 🆕 v9.0: Quality gate after assembly
    const finalValidation = await qualityGate(fullContent, 75, 10000, title);
    if (!finalValidation.isValid) {
      console.log('⚠️ Final article quality low:', finalValidation.issues);
    }
    
    // 🆕 v9.0: Removed rotten Stage 3 Cleanup
    console.log('✅ Stage 3: Cleanup SKIPPED (relying on auto-restore)');
    
    // Create article object
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title: this.sanitizeBaton(title),
      outline,
      episodes,
      lede: this.sanitizeBaton(lede),
      development: this.sanitizeBaton(development),
      climax: this.sanitizeBaton(climax),
      resolution: this.sanitizeBaton(resolution),
      finale: this.sanitizeBaton(finale),
      voicePassport,
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

    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length > 0) {
      const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
      article.adversarialScore = {
        perplexity: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.perplexity, 0) / episodesWithMetrics.length,
        burstiness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.variance, 0) / episodesWithMetrics.length,
        skazRussianness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.colloquialism, 0) / episodesWithMetrics.length,
        contentLength: article.metadata.totalChars,
        noClichés: 100,
        overallScore: avgScore,
        passesAllChecks: avgScore >= 70,
        issues: avgScore < 70 ? ['Overall score below threshold'] : []
      };
    }

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Metrics: ${article.metadata.totalChars} chars, ${article.metadata.episodeCount} episodes`);
    console.log(`   Phase 2 Score: ${article.adversarialScore?.overallScore || 0}/100`);

    // 🆕 STAGE 4: Apply mobile photo authenticity to images
    await this.applyAuthenticityToImages(article);
    if (article.stage4Applied) {
      console.log(`   Stage 4 (Authenticity): ✅ Applied (${article.stage4Stats?.processedCount} images)`);
    }

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
   * 🎯 TASK 1: generateDevelopment() с учётом timeline (v8.0)
   */
  async generateDevelopment(outline: OutlineStructure, devEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const timeline = this.timeline;
    
    // 🆕 v8.0: Timeline-specific instructions
    let timelineInstruction = '';
    
    if (timeline === 'sudden') {
      timelineInstruction = `
⏱️ TIMELINE: SUDDEN (1-3 months) - FAST ACTION!
❌ DON'T: Write about years of suffering or endless reflection
✅ DO: Show rapid transformation:
   - Decision made in 3-5 days (not months!)
   - First action: loan, business registration, first sale
   - Early results: first clients, first money
   - Building momentum visible

📏 TARGET LENGTH: 3000-4000 chars`;
    } else if (timeline === 'gradual') {
      timelineInstruction = `
⏱️ TIMELINE: GRADUAL (6-12 months)
✅ DO: Show step-by-step growth process:
   - Education/learning phase
   - First attempts (with struggles)
   - Building client base (10→50→100)
   - Visible income growth

📏 TARGET LENGTH: 3500-4500 chars`;
    } else if (timeline === 'cyclical') {
      timelineInstruction = `
⏱️ TIMELINE: CYCLICAL (Years of silence → sudden change)
❌ DON'T: Focus only on past suffering
✅ DO: Show dramatic shift:
   - 30% Past (brief reference to what was)
   - 70% NEW PHASE (transformation visible)
   - The turning point that changed everything

📏 TARGET LENGTH: 3500-4500 chars`;
    } else {
      timelineInstruction = `
⏱️ TIMELINE: REVELATION (Was hidden, now revealed)
✅ DO: Focus on reveal and consequences:
   - The moment of revelation
   - Immediate reactions
   - Shifting dynamics between characters`;
    }

    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SENTENCE VARIETY: Short. Medium. Long. Short.
✅ INCOMPLETE SENTENCES: "Я начала говорить, но..." (2-3 times)
✅ INTERJECTIONS: "Боже, как я была слепа." (2 times)
✅ EMOTIONS AS ACTIONS: ✅ "Руки тряслись." NOT ❌ "I was scared."
✅ START WITH ACTION/DIALOGUE: NOT description`;

    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-2-assemble.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();

    const episodesContent = devEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}

${guidelines}

📄 DEVELOPMENT - middle of story rewrite

ARCHETYPE: ${this.heroArchetype || 'standard'}
TIMELINE: ${timeline}

${plotBibleSection}
${antiDetection}
${timelineInstruction}

🎯 TASK: Rewrite the following episodes into a cohesive DEVELOPMENT section.
Source Episodes:
${episodesContent}

REQUIREMENTS:
- Continue from previous episode
- Build tension toward climax
- Varied sentence length
- Include 2-3 incomplete sentences
- Include 2 interjections
- End with moment leading to climax
- Target length: 3500-4500 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash",
      temperature: 0.92
    });
  }

  /**
   * 🎯 TASK 2: generateClimax() с РЕАКЦИЕЙ АНТАГОНИСТА (v8.0)
   */
  async generateClimax(outline: OutlineStructure, development: string, climaxEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = development.substring(development.length - 200);
    const reaction = this.antagonistReaction;

    // 🆕 v8.0: Antagonist reaction guide
    let reactionGuide = '';
    
    if (reaction === 'shame') {
      reactionGuide = `
3. REACTION - SHAME:
   - Mother-in-law sees her transformation
   - She blushes, avoids eye contact
   - Tries to hide, pretends not to notice
   - Later: might approach with apology`;
    } else if (reaction === 'regret') {
      reactionGuide = `
3. REACTION - REGRET:
   - Husband sees what he lost
   - Longing, sadness in his eyes
   - Tries to approach, reach out
   - "What have I done?" expression`;
    } else if (reaction === 'jealousy') {
      reactionGuide = `
3. REACTION - JEALOUSY:
   - "How did SHE become richer than us?!"
   - Bitter comments, comparing
   - Trying to diminish her success
   - Envy visible in eyes and words`;
    } else if (reaction === 'pleading') {
      reactionGuide = `
3. REACTION - PLEADING:
   - Family approaches: "Help us, we need work"
   - Asking for money, connections, jobs
   - Begging, humble姿态
   - They need HER now, not the other way`;
    } else if (reaction === 'denial') {
      reactionGuide = `
3. REACTION - DENIAL:
   - "This can't be true!"
   - "That's not her, it must be a mistake!"
   - But then they see proof...
   - Reality slowly sinks in`;
    } else if (reaction === 'anger') {
      reactionGuide = `
3. REACTION - ANGER:
   - "How did she dare become successful?!"
   - Accusations, blame
   - Trying to undermine her success
   - Frustration and rage at being surpassed`;
    }

    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SHORT PUNCHY SENTENCES: "Она открыла рот. Ничего."
✅ SENSORY OVERLOAD: "Комната вращалась. Звон в ушах."
✅ DIALOGUE OVERLAP: "— Ты... — Нет! Ты не знаешь!"
✅ INTERNAL + ACTION MIX: "Я должна уйти. Уйти сейчас."`;

    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-2-assemble.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();

    const episodesContent = climaxEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}

${guidelines}

📄 CLIMAX - turning point rewrite

ARCHETYPE: ${this.heroArchetype || 'standard'}
ANTAGONIST REACTION: ${reaction}

${plotBibleSection}
${antiDetection}

🎯 TASK: Rewrite the following episodes into a powerful CLIMAX section.
Previous Context: "${previousContext}"

Source Episodes:
${episodesContent}

🎬 CLIMAX STRUCTURE:
1. THE ENCOUNTER (theatrical moment)
   - Where? Charity event / magazine / cafe
   - Who sees? Mother-in-law / Husband / Family
   - What? Her success, beauty, confidence

2. MOMENT OF REALIZATION
   - She's on stage / on cover / in luxury
   - They realize: THIS same woman?! Successful!
   - Shock! Revelation!

${reactionGuide}

4. DIALOGUE (30-50 words, short, punchy!)
   - Shows HER position (calm, above them)
   - Shows THEIR reaction (lost, shocked)

REQUIREMENTS:
- Build from development
- One core revelation/confrontation
- Maximum emotional intensity
- Physical/sensory breakdown
- Fast-paced sentences (many short)
- Antagonist SEES and REACTS visibly
- Target length: 2500-3500 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash",
      temperature: 0.88
    });
  }

  /**
   * 🎯 TASK 3: generateResolution() - ЖЁСТКАЯ ПОБЕДА (v8.0)
   */
  async generateResolution(outline: OutlineStructure, climax: string): Promise<string> {
    const plotBible = outline.plotBible;
    const victory = this.victoryType;

    // 🆕 v8.0: Victory position
    let victoryPosition = '';
    
    if (victory === 'financial') {
      victoryPosition = `✅ "Я богатая. Вы — нет. Факт."`;
    } else if (victory === 'professional') {
      victoryPosition = `✅ "Я успешнее. Вы — нет."`;
    } else if (victory === 'social') {
      victoryPosition = `✅ "Меня уважают. Вас — нет."`;
    } else if (victory === 'emotional') {
      victoryPosition = `✅ "Я счастлива. Вы завидуете."`;
    } else if (victory === 'moral') {
      victoryPosition = `✅ "Я была права с самого начала."`;
    } else {
      victoryPosition = `✅ "Я выиграла. Полностью. На всех фронтах."`;
    }

    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    const antiDetection = `
⚠️ ANTI-DETECTION:
✅ SLOWER PACE: "Я сидела. Просто сидела..."
✅ SELF-REFLECTION: "Я была...? Какая я была?"
✅ NO MORALIZING: Realization without preachy lesson
✅ WHAT CHANGED FOREVER: "Я стала другой. Факт."`;

    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-2-assemble.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();

    const prompt = `${basePrompt}

${guidelines}

📄 RESOLUTION - aftermath of climax (1000-1200 chars)

ARCHETYPE: ${this.heroArchetype || 'standard'}
VICTORY TYPE: ${victory}

${plotBibleSection}
${antiDetection}

🎯 TASK: Write RESOLUTION (FIRM VICTORY - v8.0!)

STRUCTURE:
- 40% Her new life (what is it now?)
- 40% Others' reaction (they see changes)
- 20% Her reflection (wisdom, no self-pity)

❌ FORBIDDEN ENDINGS:
❌ "Может быть, я сделала правильно?"
❌ "А вы как думаете?"
❌ Uncertain, hesitant endings

✅ REQUIRED:
- Clear narrator position (she WON, she OVERCAME)
- Consequences visible (for her AND for them)
- CONFIDENT, NOT tentative

VICTORY POSITION:
${victoryPosition}

REQUIREMENTS:
- After climax rush, processing what happened
- Clear position on outcome
- Consequences visible and specific
- Confidence, not confusion
- NO "maybe", NO "I wonder"

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash",
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
   * 🎭 EXTRACT & VALIDATE plotBible from outline
   */
  /**
   * ROBUST: Extract PlotBible from outline or use fallback
   */
  public extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    // 🆕 v9.0: Graceful fallback for plotBible
    let plotBible = outline.plotBible;
    
    if (plotBible && 
        plotBible.narrator && 
        plotBible.narrator.age &&
        plotBible.narrator.gender &&
        plotBible.narrator.tone &&
        plotBible.sensoryPalette && 
        plotBible.sensoryPalette.details &&
        plotBible.sensoryPalette.details.length > 0) {
      console.log("✅ Using plotBible from Gemini generation");
      return plotBible;
    }

    console.warn("⚠️  plotBible incomplete, using fallback");
    
    const ageMatch = params.audience.match(/(\d+)-(\d+)/);
    const age = ageMatch ? Math.round((parseInt(ageMatch[1]) + parseInt(ageMatch[2])) / 2) : 45;
    const gender = params.audience.toLowerCase().includes('woman') ? 'female' : 'male';

    return {
      narrator: {
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
      sensoryPalette: {
        details: ["domestic", "intimate", "complex"],
        smells: ["coffee", "old books", "home"],
        sounds: ["silence", "breathing", "clock"],
        textures: ["soft", "worn", "familiar"],
        lightSources: ["window", "lamp", "dawn"],
      },
      characterMap: {
        Narrator: { role: "protagonist", arc: "internal realization" },
      },
      thematicCore: {
        centralQuestion: outline.externalTensionArc || "What if I had chosen differently?",
        emotionalArc: params.emotion,
        resolutionStyle: "triumphant",
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
          console.error(`❌ Failed to parse ${context}`);
          throw new Error(`Failed to parse ${context}: ${(e2 as Error).message}`);
        }
      }
    }
  }

  /**
   * 🔧 v8.0: Generate outline with ARCHETYPE-SPECIFIC structure
   */
  public async generateOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
    heroArchetype?: HeroArchetype;
    conflictType?: ConflictType;
    timeline?: TimelineType;
    antagonistReaction?: AntagonistReaction;
    victoryType?: VictoryType;
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

    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-0-plan.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-0-plan.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 0: PlotBible Generation';
    }

    // 🆕 v8.0: Archetype-specific episode structure
    let archetypeStructure = '';
    
    if (params.heroArchetype === 'comeback_queen') {
      archetypeStructure = `
STRUCTURE FOR "COMEBACK QUEEN":
1. PUBLIC HUMILIATION (all saw it)
2. QUICK DECISION (1 week, not years!)
3. METAMORPHOSIS (education → business → success)
4. THEATRICAL REUNION (family sees her transformation)
5. TRIUMPH (she's queen, they're below)
Key: Focus on TRANSFORMATION and PUBLIC RECOGNITION`;
    } else if (params.heroArchetype === 'gold_digger_trap') {
      archetypeStructure = `
STRUCTURE FOR "GOLD DIGGER TRAP REVERSED":
1. FAMILY LAUGHTS (mocked for marrying "simple")
2. WEDDING WITHOUT THEM
3. REVELATION (she's successful!)
4. STARTUP → IPO
5. FAMILY BEGS (needs job, help)
6. HIERARCHY REVERSED (she's their benefactor)
Key: They thought SHE was the trap, but SHE trapped THEM`;
    } else if (params.heroArchetype === 'inheritance_reveal') {
      archetypeStructure = `
STRUCTURE FOR "INHERITANCE REVEAL":
1. FAMILY BEHAVES (as they think they should)
2. NOTARY APPEARS (500K inheritance for HER!)
3. FAMILY MASKS (sudden "care", fake love)
4. LETTER OPENS (will written specifically for her)
5. TRUTH EXPOSED (she sees their true faces)
6. HIERARCHY SHIFTS (inheritance changes everything)
Key: Money reveals TRUE character of family`;
    } else if (params.heroArchetype === 'entrepreneur') {
      archetypeStructure = `
STRUCTURE FOR "ENTREPRENEUR":
1. OPEN CONTEMPT (called poor, simple)
2. BUSINESS CREATION (her own effort)
3. FAST GROWTH (10→100→200 clients)
4. NUMERIC SUCCESS (she's richer than them)
5. THEY SEE (reactions visible)
6. "THE POOR ONE IS NOW THEIR BOSS"
Key: Show NUMBERS and GROWTH, not emotions`;
    } else if (params.heroArchetype === 'phoenix') {
      archetypeStructure = `
STRUCTURE FOR "PHOENIX":
1. HE SAYS "You're too simple, I'm leaving"
2. QUICK DIVORCE (relief, not sorrow)
3. SHE BLOOMS (fitness, education, courses)
4. RANDOM MEETING (1-2 years later)
5. HE SEES (successful, beautiful, happy)
6. HE REGRETS (too late)
Key: Show TRANSFORMATION, his REGRET, her FREEDOM`;
    } else if (params.heroArchetype === 'mother_wins') {
      archetypeStructure = `
STRUCTURE FOR "MOTHER WINS":
1. CHILDREN IN DANGER
2. HER STRUGGLE (legal, emotional)
3. TRIUMPH (children saved, justice served)
4. FAMILY RECOGNIZES (her strength)
Key: Maternal power and justice`;
    } else if (params.heroArchetype === 'wisdom_earned') {
      archetypeStructure = `
STRUCTURE FOR "WISDOM EARNED":
1. YEARS OF TRIALS (lessons learned)
2. HARD-WON WISDOM (from suffering)
3. NEW PERSPECTIVE (peace, acceptance)
4. LESSON SHARED (with readers)
Key: Reflection, growth, and sharing wisdom`;
    }

    const guidelines = this.loadSharedGuidelines();

    // 🧠 RAG: Inject One-Shot Example
    let exampleContext = '';
    const bestExample = this.getRelevantExample(params.theme, params.audience);
    if (bestExample) {
      exampleContext = `
📚 ONE-SHOT EXAMPLE (INSPIRATION - DO NOT COPY):
This is a high-performing article (${bestExample.metadata?.views?.toLocaleString()} views).
Observe the tone, the immediate hook in the lede, and the specific details.

Title: "${bestExample.title}"
Style/Lede (Exceprt): "${bestExample.content.substring(0, 800)}..."
--------------------------------------------------`;
    }

    const prompt = `${basePrompt}

${guidelines}

${exampleContext}

🎭 STORY ARCHITECT - GENERATE COMPLETE OUTLINE

TASK: Create ${episodeCount}-episode narrative structure.

INPUT:
- Theme: "${params.theme}"
- Angle: ${params.angle}
- Emotion: ${params.emotion}
- Audience: ${params.audience}
- Archetype: ${params.heroArchetype || 'standard'}
- Timeline: ${params.timeline || 'sudden'}

${archetypeStructure}

🔧 CRITICAL REQUIREMENT:
Generate COMPLETE plotBible with ALL fields filled.

RESPOND WITH ONLY VALID JSON:
\`\`\`json
{
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "audience": "${params.audience}",
  "plotBible": {
    "narrator": {
      "age": [NUMBER 25-70],
      "gender": "female" or "male",
      "tone": "[confessional/bitter/ironic/triumphant]",
      "voiceHabits": {
        "apologyPattern": "[specific Russian phrase]",
        "doubtPattern": "[specific Russian phrase]",
        "memoryTrigger": "[specific Russian phrase]",
        "angerPattern": "[specific Russian phrase]"
      }
    },
    "sensoryPalette": {
      "details": ["detail1", "detail2", "detail3", "detail4", "detail5"],
      "smells": ["smell1", "smell2", "smell3"],
      "sounds": ["sound1", "sound2", "sound3"],
      "textures": ["texture1", "texture2", "texture3"],
      "lightSources": ["light1", "light2", "light3"]
    }
  },
  "characterMap": {
    "Narrator": { "role": "protagonist", "arc": "[internal journey]" },
    "[Character2]": { "role": "[catalyst/antagonist]", "arc": "[their arc]" },
    "[Character3]": { "role": "[role]", "arc": "[arc]" }
  },
  "thematicCore": {
    "centralQuestion": "[The core emotional question]",
    "emotionalArc": "${params.emotion}",
    "resolutionStyle": "[triumphant/bittersweet]"
  },
  "episodes": [${episodeJson}
  ],
  "externalTensionArc": "[What happens in the story]",
  "internalEmotionArc": "[What shifts for narrator]",
  "forbiddenCliches": ["[avoid these", "cheap tropes"]
}
\`\`\``;

    const response = await this.callGemini({
      prompt,
      model: "gemini-3-flash",
      temperature: 0.85,
    });

    // 🆕 v9.0: Graceful fallback for parsing
    try {
      return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
    } catch (e) {
      console.warn('⚠️ Outline parsing failed, using fallback structure');
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
    
    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-2-assemble.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();
    
    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    
    const prompt = `${basePrompt}

${guidelines}

📄 LEDE (600-900 chars) - opening hook rewrite

${plotBibleSection}

ARCHETYPE: ${this.heroArchetype || 'standard'}

⚠️ ANTI-DETECTION:
✅ SENTENCE VARIETY: Short. Medium. Short.
✅ INCOMPLETE SENTENCES: "Не знала. Молчала."
✅ INTERJECTIONS: "Боже, как я была слепа."
✅ START WITH: ACTION, DIALOGUE, or QUESTION

🎯 TASK: Rewrite the following episode into a compelling LEDE.
Source Episode: "${episode.content.substring(0, 1000)}..."

REQUIREMENTS:
- Start with PARADOX, ACTION, DIALOGUE, or QUESTION
- Use narrator's voice patterns
- Vary sentence length
- End with intrigue (reader scrolls)
- NO "I decided to share" or meta-commentary
- 600-900 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash",
      temperature: 0.95,
    });
  }

  /**
   * ✅ v4.5: Generate closing (finale): 1000-1200 chars
   * 🆕 v8.0: FIRM VICTORY ENDING
   */
  async generateFinale(outline: OutlineStructure, episode: Episode): Promise<string> {
    const plotBible = outline.plotBible;
    const victory = this.victoryType;
    
    let victoryExamples = '';
    
    if (victory === 'financial') {
      victoryExamples = `
FINANCIAL VICTORY:
- Focus on MONEY: "Компания генерирует 500K в месяц"
- They need money: "Свекровь позвонила: нужна работа"
- Firm conclusion: "Я богатая. Они — нет. ФАКТ."`;
    } else if (victory === 'professional') {
      victoryExamples = `
PROFESSIONAL VICTORY:
- Focus on SUCCESS: "Мой бизнес теперь миллионы"
- They work for her: "Её дочь мечтает работать у меня"
- Firm conclusion: "Я успешнее. Все видят."`;
    } else if (victory === 'multi') {
      victoryExamples = `
MULTI VICTORY:
- "Прошло 8 месяцев. Компания генерирует 500K в месяц.
  Вчера свекровь позвонила: нужна работа для её сына.
  Я помогу, но на МОИХ условиях.
  Теперь я знаю: я не ошибалась."
- Firm conclusion: "Я ВЫИГРАЛА. НА ВСЕХ ФРОНТАХ."`;
    } else {
      victoryExamples = `Focus on clear victory based on ${victory}`;
    }

    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    // 🆕 v9.0: Read prompt from file
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read stage-2-assemble.md, using hardcoded prompt');
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();

    const prompt = `${basePrompt}

${guidelines}

📄 FINALE (1000-1200 chars) - firm conclusion rewrite

🏆 ARCHETYPE: ${this.heroArchetype || 'standard'}
VICTORY TYPE: ${victory}

${plotBibleSection}
${victoryExamples}

⚠️ ANTI-DETECTION FINALE RULES (v8.0):

❌ FORBIDDEN ENDINGS:
   ❌ "Может быть, я сделала правильно?"
   ❌ "А вы как думаете?"
   ❌ "Я не знаю, правильно ли поступила..."
   
✅ REQUIRED ENDINGS:
   ✅ "Я сделала правильно. ФАКТ."
   ✅ "Я их королева, и они это знают."
   ✅ "Я выиграла. Полностью."

✅ STRUCTURE:
   1. Show life AFTER transformation (specific scene)
   2. ONE concrete detail showing what changed FOR HER
   3. ONE concrete detail showing what changed FOR THEM
   4. Narrator's FIRM CONCLUSION (not question, not doubt)
   5. End with CHALLENGING question

✅ GRAPHIC FORMATTING:
   - End with CAPS statement: "Я ПОБЕДИЛА."
   - Final question: "Смогли бы ВЫ так?"

🎯 TASK: Rewrite the following episode into a powerful FINALE.
Source Episode: "${episode.content.substring(0, 1500)}..."

REQUIREMENTS:
- Firm, confident tone
- No doubts or moralizing
- Clear victory statement
- End with powerful punchline
- 1200-1800 characters

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash",
      temperature: 0.9,
    });
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `📄 TITLE (55-90 Russian chars)

Theme: "${outline.theme}"
Archetype: ${this.heroArchetype || 'standard'}
Opening: ${lede.substring(0, 200)}...

FORMULA: [EMOTION] + [I/WE] + [ACTION/TRUTH] + [INTRIGUE]

EXAMPLES:
✅ "Я была худшей невесткой до того дня"
✅ "Они смеялись, когда я вышла за водителя"
✅ "Мой муж сказал: ты простая. Потом понял."

OUTPUT: Only the title (no quotes, no JSON)`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-3-flash",
        temperature: 0.85,
      });

      let title = response?.trim().replace(/^["'`]+/, "").replace(/["'`]+$/, "").replace(/\.$/, "").substring(0, 100);

      if (!title || !/[а-яёА-ЯЁ]/.test(title) || /[a-zA-Z]/.test(title)) {
        return outline.theme;
      }

      if (title.length < 55 || title.length > 90) {
        console.warn(`Title length ${title.length} not in range, using fallback`);
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
        model: "gemini-3-flash",
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
   * Helper: Call Gemini API with fallback
   */
  private async callGemini(params: { prompt: string; model: string; temperature: number }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: { temperature: params.temperature, topK: 40, topP: 0.95 },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        return "";
      }
      
      return this.cleanGeminiResponse(text);
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`Gemini call failed: ${errorMessage}`);
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        try {
          const fallbackResponse = await this.geminiClient.models.generateContent({
            model: "gemini-3-flash",
            contents: params.prompt,
            config: { temperature: params.temperature, topK: 40, topP: 0.95 },
          });
          const fallbackText = fallbackResponse.text || "";
          return this.cleanGeminiResponse(fallbackText);
        } catch (fallbackError) {
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
    return `Я понимала, что начинается что-то серьёзное.\n\nМир вокруг меня начал меняться. Не сразу, но постепенно.`;
  }

  private getFallbackClimax(outline: OutlineStructure): string {
    return `И тогда случилось то, чего никто не ожидал.\n\nЭтот момент изменил всё.`;
  }

  private getFallbackResolution(outline: OutlineStructure): string {
    return `Я долго не могла прийти в себя.\n\nНо жизнь продолжалась. Пришлось принять решение.`;
  }

  private getFallbackLede(outline: OutlineStructure): string {
    return `${outline.theme}.\n\n${outline.episodes[0]?.hookQuestion || 'Почему это случилось?'}\n\nЯ до сих пор не могу понять, как так вышло...`;
  }

  private getFallbackFinale(outline: OutlineStructure): string {
    return `${outline.theme}.\n\nПрошло время. Многое изменилось. Я стала другой.\n\nА вы смогли бы так поступить?`;
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
    try {
      const response = await this.geminiClient.models.generateContent({
        model: "gemini-3-flash",
        contents: prompt,
        config: { temperature: 0.9, topK: 40, topP: 0.95 },
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return this.cleanResponse(text);
    } catch (error) {
      console.error(`Episode generation failed:`, error);
      return `Эпизод ${this.id}\n\nЭто важная часть истории.`;
    }
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
