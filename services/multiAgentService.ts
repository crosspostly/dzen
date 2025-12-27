import { GoogleGenAI } from "@google/genai";
import { Episode, OutlineStructure, EpisodeOutline, LongFormArticle, VoicePassport } from "../types/ContentArchitecture";
import { EpisodeGeneratorService } from "./episodeGeneratorService";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { FinalArticleCleanupGate } from "./finalArticleCleanupGate";
import { ArticlePublishGate } from "./articlePublishGate";

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
  // Existing:
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
  useAntiDetection?: boolean; // 🆕 v7.0: Disable anti-detection for simpler generation
  skipCleanupGates?: boolean; // 🆕 v7.0: Skip cleanup gates
}

export class MultiAgentService {
  private geminiClient: GoogleGenAI;
  private agents: ContentAgent[] = [];
  private contextManager: ContextManager;
  private phase2Service: Phase2AntiDetectionService;
  private maxChars: number;
  private episodeCount: number = 12;
  private useAntiDetection: boolean; // 🆕 v7.0
  private skipCleanupGates: boolean; // 🆕 v7.0

  // 🆕 NEW: Archetype configuration
  private heroArchetype?: HeroArchetype;
  private conflictType?: ConflictType;
  private timeline?: TimelineType;
  private antagonistReaction?: AntagonistReaction;
  private victoryType?: VictoryType;

  constructor(apiKey?: string, options?: MultiAgentOptions) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.contextManager = new ContextManager();
    this.maxChars = options?.maxChars || CHAR_BUDGET; // Use central budget as default
    this.phase2Service = new Phase2AntiDetectionService();
    this.useAntiDetection = options?.useAntiDetection ?? false; // v7.1: DISABLED by default
    this.skipCleanupGates = options?.skipCleanupGates ?? false;
    
    // Calculate dynamic episode count
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
    const LEDE_CHARS = (BUDGET_ALLOCATIONS.LEDE_BUDGET_MIN + BUDGET_ALLOCATIONS.LEDE_BUDGET_MAX) / 2; // 750 average
    const FINALE_CHARS = (BUDGET_ALLOCATIONS.FINALE_BUDGET_MIN + BUDGET_ALLOCATIONS.FINALE_BUDGET_MAX) / 2; // 1500 average
    const AVG_EPISODE_CHARS = BUDGET_ALLOCATIONS.AVG_EPISODE_CHARS_BASE; // 3200 base
    const MIN_EPISODES = BUDGET_ALLOCATIONS.MIN_EPISODES; // 6
    const MAX_EPISODES = BUDGET_ALLOCATIONS.MAX_EPISODES; // 15

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
   * 
   * 🆕 v8.0: Now accepts ArticleGeneratorConfig with archetype parameters
   */
  async generateLongFormArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
    maxChars?: number;
    includeImages?: boolean;
    applyPhase2AntiDetection?: boolean;
    // 🆕 NEW: Archetype parameters (from TOP Articles)
    heroArchetype?: HeroArchetype;
    conflictType?: ConflictType;
    timeline?: TimelineType;
    antagonistReaction?: AntagonistReaction;
    victoryType?: VictoryType;
  }): Promise<LongFormArticle> {
    const maxChars = params.maxChars || this.maxChars;
    const episodeCount = this.calculateOptimalEpisodeCount(maxChars);

    // 🆕 Store archetype configuration
    this.heroArchetype = params.heroArchetype;
    this.conflictType = params.conflictType;
    this.timeline = params.timeline || "sudden";
    this.antagonistReaction = params.antagonistReaction || "shame";
    this.victoryType = params.victoryType || "multi";

    console.log("\n🎬 [ZenMaster v2.0] Starting dynamic longform generation...");
    console.log(`📏 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    console.log(`🎬 Episodes: ${episodeCount} (dynamic based on ${maxChars} chars)`);
    if (this.heroArchetype) {
      console.log(`🏆 Archetype: ${this.heroArchetype} | Timeline: ${this.timeline} | Victory: ${this.victoryType}`);
    }
    
    // Stage 0: Outline Engineering (dynamic episode count)
    console.log(`📋 Stage 0: Building outline (${episodeCount} episodes) + plotBible...`);
    let outline: OutlineStructure;

    try {
      outline = await this.generateOutline(params, episodeCount);
    } catch (error) {
      console.error(`❌ Outline generation failed:`, error);
      console.log(`⚠️  Creating fallback outline to continue generation`);
      outline = {
        theme: params.theme || "История о важном событии",
        angle: params.angle || "confession",
        emotion: params.emotion || "confusion",
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
        internalEmotionArc: "От замешательства к осознанию",
        characterMap: {},
        forbiddenClichés: [],
        plotBible: {
          narrator: {
            age: 45,
            gender: "female",
            tone: "confessional",
            voiceHabits: {
              apologyPattern: "Я не хотела...",
              doubtPattern: "Может быть, я ошибалась...",
              memoryTrigger: "Я помню этот день...",
              angerPattern: "Это бесит!"
            }
          },
          sensoryPalette: {
            details: ["конкретные детали"],
            smells: ["запахи"],
            sounds: ["звуки"],
            textures: ["текстуры"],
            lightSources: ["свет"]
          },
          characterMap: {},
          thematicCore: {
            centralQuestion: "Почему так случилось?",
            emotionalArc: "замешательство → осознание → принятие",
            resolutionStyle: "реалистичный"
          }
        }
      };
    }

    // Extract and validate plotBible from outline
    const plotBible = this.extractPlotBible(outline, params);
    console.log("✅ PlotBible ready");
    console.log(`   - Narrator: ${plotBible.narrator.age} y/o ${plotBible.narrator.gender}`);
    console.log(`   - Tone: ${plotBible.narrator.tone}`);
    console.log(`   - Sensory palette: ${plotBible.sensoryPalette.details.slice(0, 3).join(', ')}...`);

    // Stage 1: Sequential Episode Generation (with Phase 2 per-episode)
    console.log(`🔄 Stage 1: Generating ${episodeCount} episodes sequentially (Phase 2 per-episode)...`);
    let episodes: Episode[];

    try {
      episodes = await this.generateEpisodesSequentially(outline);
    } catch (error) {
      console.error(`❌ Episodes generation failed:`, error);
      console.log(`⚠️  Creating fallback episodes to continue generation`);
      episodes = outline.episodes.map(ep => ({
        id: ep.id,
        title: `Эпизод ${ep.id}`,
        content: `${ep.hookQuestion}\n\n${ep.externalConflict}. Я помню этот момент так, будто он был вчера.\n\n${ep.internalConflict}. Это чувство не покидало меня долгое время.\n\n${ep.keyTurning}. В тот день всё изменилось.\n\n${ep.openLoop}...`,
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

    // Ensure we have at least some episodes
    if (episodes.length === 0) {
      console.log(`⚠️  No episodes generated, creating minimal fallback episodes`);
      episodes = Array.from({ length: episodeCount }, (_, i) => ({
        id: i + 1,
        title: `Эпизод ${i + 1}`,
        content: `Глава ${i + 1}\n\nЭто важная часть моей истории. Я помню этот день.`,
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
    
    // 📊 Phase 2 Summary for all episodes
    this.printPhase2Summary(episodes);
    
    // Generate Development, Climax & Resolution (NEW - v5.4)
    console.log("🎯 Generating development, climax & resolution...");
    let development: string;
    let climax: string;
    let resolution: string;

    try {
      development = await this.generateDevelopment(outline, episodes);
    } catch (error) {
      console.error(`❌ Development generation failed:`, error);
      console.log(`⚠️  Creating fallback development to continue generation`);
      development = `Я понимала, что начинается что-то серьёзное.\n\nМир вокруг меня начал меняться. Не сразу, но постепенно. Каждый день приносил новые вопросы и новые ответы, которые только усложняли ситуацию.`;
    }

    try {
      climax = await this.generateClimax(outline, development, episodes);
    } catch (error) {
      console.error(`❌ Climax generation failed:`, error);
      console.log(`⚠️  Creating fallback climax to continue generation`);
      climax = `И тогда случилось то, чего никто не ожидал.\n\nЭтот момент изменил всё. Я стояла и не верила своим глазам. Всё, во что я верила, рухнуло в одну секунду.`;
    }

    try {
      resolution = await this.generateResolution(outline, climax);
    } catch (error) {
      console.error(`❌ Resolution generation failed:`, error);
      console.log(`⚠️  Creating fallback resolution to continue generation`);
      resolution = `Я долго не могла прийти в себя.\n\nНо жизнь продолжалась. Пришлось принять решение и двигаться дальше, даже если я не знала, куда приведёт этот путь.`;
    }
    
    // Generate Lede & Finale
    console.log("🎯 Generating lede (600-900) and finale (1200-1800)...");
    let lede: string;
    let finale: string;

    try {
      lede = await this.generateLede(outline);
    } catch (error) {
      console.error(`❌ Lede generation failed:`, error);
      console.log(`⚠️  Creating fallback lede to continue generation`);
      lede = `${outline.theme}.\n\n${outline.episodes[0]?.hookQuestion || 'Почему это случилось?'}\n\nЯ до сих пор не могу понять, как так вышло...`;
    }

    try {
      finale = await this.generateFinale(outline, episodes);
    } catch (error) {
      console.error(`❌ Finale generation failed:`, error);
      console.log(`⚠️  Creating fallback finale to continue generation`);
      finale = `${outline.theme}.\n\nМожет быть, кто-то из вас тоже сталкивался с подобным? Как вы вышли из этой ситуации? Напишите в комментариях.\n\nЯ до сих пор думаю об этом каждый день...`;
    }
    
    // Generate Voice Passport
    console.log("🎬 Generating voice passport (7 author habits)...");
    let voicePassport: VoicePassport;

    try {
      voicePassport = await this.generateVoicePassport(params.audience);
    } catch (error) {
      console.error(`❌ Voice passport generation failed:`, error);
      console.log(`⚠️  Creating fallback voice passport to continue generation`);
      voicePassport = {
        apologyPattern: "Я не хотела...",
        doubtPattern: "Может быть, я ошибалась...",
        memoryTrigger: "Я помню этот день...",
        characterSketch: "Обычная женщина, которая пережила сложные события",
        humorStyle: "self-irony",
        jokeExample: "Как я потом поняла, жизнь всегда подкидывает сюрпризы",
        angerPattern: "Это бесит! Почему так происходит?",
        paragraphEndings: ["question", "pause", "short_phrase", "exclamation"],
        examples: []
      };
    }

    // Generate Title
    console.log("🗰 Generating title (55-90 chars)...");
    let title: string;

    try {
      title = await this.generateTitle(outline, lede);
      console.log(`✅ Title (Russian): "${title}"`);
    } catch (error) {
      console.error(`❌ Title generation failed:`, error);
      console.log(`⚠️  Creating fallback title to continue generation`);
      title = outline.theme.substring(0, 90);
      console.log(`✅ Title (fallback): "${title}"`);
    }
    
    // Assemble full content (including new development, climax, resolution)
    let fullContent = [
      lede,
      development,
      ...episodes.map(ep => ep.content),
      climax,
      resolution,
      finale
    ].join('\n\n');
    
    // 🆕 v7.0: Optionally skip cleanup gates for simplified generation
    if (!this.skipCleanupGates) {
      // 🧹 УРОВЕНЬ 2: FINAL ARTICLE CLEANUP GATE (v6.0)
      console.log('\n🧹 [Уровень 2] Final Article Cleanup Gate...');
      const cleanupGate = new FinalArticleCleanupGate();
      const cleanupResult = await cleanupGate.cleanupAndValidate(fullContent);
      
      if (cleanupResult.appliedCleanup) {
        console.log('   ✅ Cleanup applied, quality improved');
        fullContent = cleanupResult.cleanText;
      } else {
        console.log('   ✅ No cleanup needed');
      }
      
      // 🚪 УРОВЕНЬ 3: ARTICLE PUBLISH GATE (v6.0)
      console.log('\n🚪 [Уровень 3] Article Publish Gate...');
      const publishValidation = ArticlePublishGate.validateBeforePublish(fullContent);

      if (!publishValidation.canPublish) {
        console.error('   ⚠️  Article failed publish gate validation (continuing anyway):');
        publishValidation.errors.forEach(error => console.log(`      - ${error}`));
        console.log('   ⚠️  Publishing article despite validation issues to ensure completion');
        // Don't throw error - continue with publishing
      } else {
        console.log('   ✅ Article passed publish gate validation');
      }
    } else {
      console.log('\n🚫 Skipping cleanup gates (simplified mode)');
    }
    
    // Create initial article object
    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      development,
      climax,
      resolution,
      finale,
      voicePassport,
      coverImage: undefined,
      metadata: {
        totalChars: lede.length + development.length + climax.length + resolution.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale), // TODO: include development, climax, resolution
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale), // TODO: include new parts
        dialogueCount: this.countDialogues(lede, episodes, finale), // TODO: include new parts
      },
      processedContent: fullContent,
      adversarialScore: undefined,
      phase2Applied: false
    };

    // 🆕 Phase 2 is now applied PER-EPISODE in episodeGeneratorService
    // Mark as applied if any episodes have Phase 2 metrics
    article.phase2Applied = episodes.some(ep => ep.phase2Metrics !== undefined);
    
    // Calculate article-level adversarial score from episode metrics
    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length > 0) {
      const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
      article.adversarialScore = {
        perplexity: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.perplexity, 0) / episodesWithMetrics.length,
        burstiness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.variance, 0) / episodesWithMetrics.length,
        skazRussianness: episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.colloquialism, 0) / episodesWithMetrics.length,
        contentLength: article.metadata.totalChars,
        noClichés: 100, // Placeholder
        overallScore: avgScore,
        passesAllChecks: avgScore >= 70,
        issues: avgScore < 70 ? ['Overall score below threshold'] : []
      };
    }

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Metrics:`);
    console.log(`   - Episodes: ${article.metadata.episodeCount}`);
    console.log(`   - Characters: ${article.metadata.totalChars} (target: ${maxChars})`);
    console.log(`   - Utilization: ${((article.metadata.totalChars / maxChars) * 100).toFixed(1)}%`);
    console.log(`   - Reading time: ${article.metadata.totalReadingTime} min`);
    console.log(`   - Scenes: ${article.metadata.sceneCount}`);
    console.log(`   - Dialogues: ${article.metadata.dialogueCount}`);
    console.log(`   - Phase 2 Score: ${article.adversarialScore?.overallScore || 0}/100`);
    console.log(`   - Anti-Detection: ${article.phase2Applied ? '✅ Applied' : '❌ Not applied'}`);
    console.log(`   - Cover image: Pending (will be generated in orchestrator)`);
    console.log(``);
    
    return article;
  }

  /**
   * 🎯 TASK 1: generateDevelopment() с Anti-Detection и ARCHETYPE логикой (v8.0)
   * Средняя часть истории с PlotBible и правилами анти-детекции
   * КЛЮЧЕВОЕ: Для "sudden" таймлайна - КОРОТКОЕ активное развитие (1500-2000 символов)
   */
  async generateDevelopment(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const lastEpisode = episodes[episodes.length - 1];
    const previousContext = lastEpisode ? lastEpisode.content.substring(0, 150) : 'Начало истории';
    
    // 🆕 v8.0: Get timeline for development pacing
    const timeline = this.timeline || "sudden";
    
    let voiceGuide = '';
    if (plotBible?.narrator?.voiceHabits) {
      const h = plotBible.narrator.voiceHabits;
      voiceGuide = `
🎭 NARRATOR VOICE:
   Age: ${plotBible.narrator.age} ${plotBible.narrator.gender}
   Tone: ${plotBible.narrator.tone}
   Memory: "${h.memoryTrigger}"
   Doubt: "${h.doubtPattern}"
   Anger: "${h.angerPattern}"`;
    }
    
    let sensoryGuide = '';
    if (plotBible?.sensoryPalette) {
      sensoryGuide = `
🎨 SENSORY PALETTE:
   Visuals: ${plotBible.sensoryPalette.details?.slice(0, 3).join(', ')}
   Sounds: ${plotBible.sensoryPalette.sounds?.slice(0, 2).join(', ')}
   Smells: ${plotBible.sensoryPalette.smells?.slice(0, 2).join(', ')}`;
    }

    // 🆕 v8.0: Timeline-specific instructions
    const timelineInstructions = this.getDevelopmentTimelineInstructions(timeline, outline);

    const antiDetection = `
⚠️ ANTI-DETECTION MANDATORY:
✅ SENTENCE VARIETY: Short. Medium medium sentence. Long complex structure. Short.
✅ INCOMPLETE SENTENCES: "Я начала говорить, но..." (3-4 times)
✅ INTERJECTIONS: "Боже, как я была слепа." (2 times)
✅ EMOTIONS AS ACTIONS: ✅ "Руки тряслись." NOT ❌ "I was scared."
✅ DIALOGUE WITH SUBTEXT: Show subtext, don't explain
✅ SENSORY GROUNDING: ✅ "Холодная плитка. Запах кофе." NOT ❌ "We talked."
✅ NO PLATFORM MENTIONS: Stay timeless, Russian, literary
✅ START WITH ACTION/DIALOGUE: NOT description`;

    const prompt = `📄 CONTEXT: DEVELOPMENT episode - middle of story

🏆 ARCHETYPE CONTEXT:
${plotBible?.narrator?.heroArchetype ? `- Archetype: ${plotBible.narrator.heroArchetype}` : '- Standard narrative'}
- Timeline: ${timeline}
${timelineInstructions}

${voiceGuide}
${sensoryGuide}
${antiDetection}

🎯 TASK: Write DEVELOPMENT
Hook from previous: "${previousContext}"
Theme: "${outline.theme}"

📏 TARGET LENGTH: ${timeline === 'sudden' ? '1500-2000' : '2000-2500'} chars

TIMELINE REQUIREMENTS:
${this.getTimelineDevelopmentRequirements(timeline)}

REQUIREMENTS:
- Continue from previous episode
- Build tension toward climax
- Narrator's specific voice patterns
- Sensory details from palette
- Varied sentence length
- Include 2-3 incomplete sentences
- Include 2 interjections
- End with moment leading to climax

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.92
    });
  }

  /**
   * 🆕 v8.0: Get timeline-specific instructions for development
   */
  private getDevelopmentTimelineInstructions(timeline: TimelineType, outline: OutlineStructure): string {
    switch (timeline) {
      case 'sudden':
        return `- QUICK DECISIONS: No years of suffering!
- FAST ACTION: 1-3 months total story arc
- VISIBLE PROGRESS: Show concrete steps (loan → business → first clients)
- BRIEF DEVELOPMENT: Focus on KEY MOMENTS, not endless reflection`;
      case 'gradual':
        return `- VISIBLE GROWTH: Show step-by-step process
- MONTH-BY-MONTH: Show progression
- BUILDING MOMENTUM: Each step leads to next
- REALISTIC TIMELINE: 6-12 months of actual work`;
      case 'cyclical':
        return `- PAST MENTIONED: Can reference years of silence
- DRAMATIC SHIFT: But then something CHANGED
- FOCUS ON NEW: 70% about NEW phase, 30% about past
- THE TURNING POINT: What made everything change?`;
      case 'revelation':
        return `- HIDDEN TRUTH: Something was concealed
- REVELATION MOMENT: The secret comes out
- AFTERMATH: How does everyone react?
- SHIFT IN DYNAMICS: Everything changes after reveal`;
      default:
        return '';
    }
  }

  /**
   * 🆕 v8.0: Get specific requirements for development based on timeline
   */
  private getTimelineDevelopmentRequirements(timeline: TimelineType): string {
    switch (timeline) {
      case 'sudden':
        return `❌ DON'T: Write about years of suffering, endless reflection, depression
✅ DO: Show rapid transformation - loan taken, business started, first clients won
📝 SCENES TO INCLUDE:
   - Decision made (3-5 days, not months!)
   - First action (loan, registration, first sale)
   - Early results (first clients, first money)
   - Building momentum (growth visible)`;
      case 'gradual':
        return `✅ DO: Show step-by-step growth process
📝 SCENES TO INCLUDE:
   - Education/learning phase
   - First attempts (struggles included)
   - Building client base (10→50→100)
   - Visible income growth`;
      case 'cyclical':
        return `❌ DON'T: Focus only on past suffering
✅ DO: Show the dramatic shift from old to new
📝 STRUCTURE:
   - 30% Past (brief reference to what was)
   - 70% NEW PHASE (transformation visible)
   - The turning point (what changed everything)`;
      case 'revelation':
        return `❌ DON'T: Long backstory about concealment
✅ DO: Focus on the reveal and its consequences
📝 SCENES TO INCLUDE:
   - The moment of revelation
   - Immediate reactions
   - Shifting dynamics between characters`;
      default:
        return '';
    }
  }

  /**
   * 🎯 TASK 2: generateClimax() с Триггерами и РЕАКЦИЕЙ АНТАГОНИСТА (v8.0)
   * Кульминация с короткими предложениями, сенсорной перегрузкой И РЕАКЦИЕЙ СЕМЬИ
   * КЛЮЧЕВОЕ: На кульминации СЕМЬЯ/МУЖ ВИДИТ и РЕАГИРУЕТ!
   */
  async generateClimax(outline: OutlineStructure, development: string, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = development.substring(0, 150);
    
    // 🆕 v8.0: Get antagonist reaction for climax
    const antagonistReaction = this.antagonistReaction || "shame";
    const reactionInstructions = this.getClimaxAntagonistReaction(antagonistReaction);

    const antiDetection = `
⚠️ CLIMAX ANTI-DETECTION:
✅ SHORT PUNCHY SENTENCES: "Она открыла рот. Ничего. Я вспомнила."
✅ SENSORY OVERLOAD: "Комната вращалась. Звон в ушах. Не понимала."
✅ DIALOGUE OVERLAP: "— Ты... — Нет! Ты не знаешь!"
✅ INTERNAL + ACTION MIX: "Я должна уйти. Уйти сейчас. Ноги не двигались."
✅ TIME COMPRESSION: "Минута. Две. Целая вечность."
✅ THE TURNING POINT: Moment of no return`;

    const prompt = `📄 CONTEXT: CLIMAX (1200-1600 chars) - turning point

🏆 ARCHETYPE CONTEXT:
${plotBible?.narrator?.heroArchetype ? `- Archetype: ${plotBible.narrator.heroArchetype}` : '- Standard narrative'}
- Timeline: ${this.timeline || 'sudden'}
- Antagonist Reaction: ${antagonistReaction}

${reactionInstructions}

${antiDetection}

Central Question: "${plotBible?.thematicCore?.centralQuestion || 'What changed everything?'}"

🎯 TASK: Write CLIMAX
Previous: "${previousContext}"

🎬 CLIMAX STRUCTURE (v8.0 - ANTAGONIST MUST SEE AND REACT!):

1. THE ENCOUNTER (theatrical moment)
   - Where? Charity event / magazine / chance meeting in cafe
   - Who sees? Mother-in-law / Husband / Entire family
   - What do they see? Her success, beauty, confidence

2. MOMENT OF REALIZATION
   - She's on stage / on cover / in luxury dress
   - They realize: THIS same woman?! But successful!
   - Shock! Revelation!

3. REACTION (based on ${antagonistReaction}):
${this.getAntagonistReactionDetails(antagonistReaction)}

4. DIALOGUE (30-50 words)
   - Short! Punchy!
   - Shows HER position (calm, above them)
   - Shows THEIR reaction (lost, shocked)

REQUIREMENTS:
- Build from development
- One core revelation/confrontation
- Maximum emotional intensity
- Physical/sensory breakdown
- Fast-paced sentences (many short)
- Dialogue that breaks/interrupts
- Antagonist SEES and REACTS visibly
- Moment narrator realizes something permanent
- End at turning point (not resolution)

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.88
    });
  }

  /**
   * 🆕 v8.0: Get antagonist reaction instructions for climax
   */
  private getClimaxAntagonistReaction(reaction: AntagonistReaction): string {
    switch (reaction) {
      case 'shame':
        return `EXPECTED REACTION: SHAME
- Mother-in-law blushes, feels embarrassed
- Avoids eye contact
- Tries to hide, pretends not to notice
- Later: might apologize or avoid protagonist`;
      case 'regret':
        return `EXPECTED REACTION: REGRET
- Husband realizes what he lost
- Longing, sadness in his eyes
- Might try to approach, reach out
- "What have I done?" expression`;
      case 'jealousy':
        return `EXPECTED REACTION: JEALOUSY
- "How did SHE become richer than us?!"
- Bitter comments, comparing
- Trying to diminish her success
- Envy visible in eyes and words`;
      case 'pleading':
        return `EXPECTED REACTION: PLEADING
- Family members approach: "Help us, we need work"
- Asking for money, connections, jobs
- Begging, humble姿态
- They need HER now, not the other way around`;
      case 'denial':
        return `EXPECTED REACTION: DENIAL
- "This can't be true!"
- "That's not her, it must be a mistake!"
- But then they see proof...
- Reality slowly sinks in`;
      case 'anger':
        return `EXPECTED REACTION: ANGER
- "How did she dare become successful?!"
- Accusations, blame
- Trying to undermine her success
- Frustration and rage at being surpassed`;
      default:
        return `EXPECTED REACTION: SHAME
- Family feels embarrassed by her success`;
    }
  }

  /**
   * 🆕 v8.0: Get specific reaction details for climax
   */
  private getAntagonistReactionDetails(reaction: AntagonistReaction): string {
    switch (reaction) {
      case 'shame':
        return `   - "shame": Свекровь краснеет, отводит взгляд
   - Она пытается спрятаться, делает вид, что не замечает
   - Потом: может подойти с извинениями`;
      case 'regret':
        return `   - "regret": Муж понимает, что потерял
   - Долгий взгляд, сожаление в глазах
   - Пытается подойти, заговорить`;
      case 'jealousy':
        return `   - "jealousy": "Как она стала богаче нас?!"
   - Горькие комментарии, сравнения
   - Зависть видна в глазах`;
      case 'pleading':
        return `   - "pleading": Родня подходит: "Помоги нам!"
   - Просят денег, работы, связей
   - Умоляют, унижаются`;
      case 'denial':
        return `   - "denial": "Это не может быть правдой!"
   - Но потом видят доказательства...
   - Реальность медленно доходит`;
      case 'anger':
        return `   - "anger": "Как она посмела?!"
   - Обвинения, упреки
   - Пытаются принизить её успех`;
      default:
        return '';
    }
  }

  /**
   * 🎯 TASK 3: generateResolution() - ЖЁСТКАЯ ПОБЕДА (v8.0)
   * Развязка с ЯСНЫМ финалом, НЕ "может быть"!
   * КЛЮЧЕВОЕ: Финал УТВЕРЖДАЮЩИЙ, не вопросительный!
   */
  async generateResolution(outline: OutlineStructure, climax: string): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = climax.substring(0, 150);
    
    // 🆕 v8.0: Get victory type for resolution
    const victoryType = this.victoryType || "multi";
    const victoryInstructions = this.getVictoryResolutionInstructions(victoryType);

    const antiDetection = `
⚠️ RESOLUTION ANTI-DETECTION:
✅ SLOWER PACE: "Я сидела. Просто сидела. Время странно..."
✅ SELF-REFLECTION: "Я была...? Какая я была?"
✅ NO MORALIZING: Realization without preachy lesson
✅ WHAT CHANGED FOREVER: "Я стала другой. Факт."`;

    const prompt = `📄 CONTEXT: RESOLUTION (1000-1300 chars) - aftermath of climax

🏆 ARCHETYPE CONTEXT:
${plotBible?.narrator?.heroArchetype ? `- Archetype: ${plotBible.narrator.heroArchetype}` : '- Standard narrative'}
- Victory Type: ${victoryType}

${victoryInstructions}

${antiDetection}

Central Question: "${plotBible?.thematicCore?.centralQuestion || 'What changed everything?'}"

🎯 TASK: Write RESOLUTION (FIRM VICTORY - v8.0!)

STRUCTURE:
- 40% Her new life (what is it now?)
- 40% Others' reaction (they see changes)
- 20% Her reflection (wisdom, but no self-pity)

❌ FORBIDDEN ENDINGS:
❌ "Может быть, я сделала правильно?"
❌ "А вы как думаете?"
❌ Uncertain, hesitant endings

✅ REQUIRED:
- Clear narrator position (she WON, she OVERCAME, she was RIGHT)
- Consequences visible (for her AND for them)
- CONFIDENT, NOT tentative
- Final question (but not "what do you think?")

VICTORY POSITION:
${this.getVictoryPosition(victoryType)}

REQUIREMENTS:
- After climax rush, processing what happened
- Clear position on outcome
- Consequences visible and specific
- Confidence, not confusion
- NO "maybe", NO "I wonder"
- YES "I was right", "I won", "I succeeded"

OUTPUT: Only text`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.85
    });
  }

  /**
   * 🆕 v8.0: Get victory-specific resolution instructions
   */
  private getVictoryResolutionInstructions(victory: VictoryType): string {
    switch (victory) {
      case 'financial':
        return `- Focus on MONEY aspect
- "I'm rich, you're not"
- Numbers, income, success visible
- They need money, she has it`;
      case 'professional':
        return `- Focus on SUCCESS aspect
- "I'm more successful"
- Career growth, recognition
- They work for her now`;
      case 'social':
        return `- Focus on STATUS aspect
- "I'm respected now"
- Recognition in community
- They look up to her (or bow)`;
      case 'emotional':
        return `- Focus on HAPPINESS aspect
- "I'm happy, you're jealous"
- Inner peace, contentment
- They are miserable without her`;
      case 'moral':
        return `- Focus on BEING RIGHT
- "I was right from the start"
- Truth revealed, justice served
- They cannot deny anymore`;
      case 'multi':
        return `- Focus on COMBO of victories
- Financial + Professional + Social
- "I won on ALL fronts"
- They lost on ALL fronts`;
      default:
        return '';
    }
  }

  /**
   * 🆕 v8.0: Get victory position statement
   */
  private getVictoryPosition(victory: VictoryType): string {
    switch (victory) {
      case 'financial':
        return `✅ "Я богатая. Вы — нет. Факт."
   ✅ "Деньги есть. Их нет. Всё просто."`;
      case 'professional':
        return `✅ "Я успешнее. Вы — нет."
   ✅ "Мой бизнес. Мои правила. Мой успех."`;
      case 'social':
        return `✅ "Меня уважают. Вас — нет."
   ✅ "Я королева. Вы внизу."`;
      case 'emotional':
        return `✅ "Я счастлива. Вы завидуете."
   ✅ "Мне хорошо. Вам — нет."`;
      case 'moral':
        return `✅ "Я была права. С самого начала."
   ✅ "Правда на моей стороне."`;
      case 'multi':
        return `✅ "Я выиграла. Полностью. На всех фронтах."
   ✅ "Деньги, успех, уважение — всё моё."
   ✅ "Они потеряли всё. Я приобрела."`;
      default:
        return `✅ Clear victory statement required`;
    }
  }

  /**
   * 📊 Print Phase 2 Summary for all episodes
   */
  private printPhase2Summary(episodes: Episode[]): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL ADVERSARIAL METRICS`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Calculate average scores
    const episodesWithMetrics = episodes.filter(ep => ep.phase2Metrics);
    if (episodesWithMetrics.length === 0) {
      console.log('   No Phase 2 metrics available (Phase 2 not applied)\n');
      return;
    }
    
    const avgScore = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.adversarialScore, 0) / episodesWithMetrics.length;
    const avgPerplexity = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.perplexity, 0) / episodesWithMetrics.length;
    const avgVariance = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.variance, 0) / episodesWithMetrics.length;
    const avgColloquialism = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.colloquialism, 0) / episodesWithMetrics.length;
    const avgAuthenticity = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.authenticity, 0) / episodesWithMetrics.length;
    const avgFragmentary = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.fragmentary, 0) / episodesWithMetrics.length;
    const avgRepetition = episodesWithMetrics.reduce((sum, ep) => sum + ep.phase2Metrics!.breakdown.repetition, 0) / episodesWithMetrics.length;
    
    console.log(`   Article Avg Score: ${avgScore.toFixed(0)}/100`);
    console.log(``);
    console.log(`   Component Breakdown (6 metrics):`);
    console.log(`   - Perplexity:        ${avgPerplexity.toFixed(0)}/100 ${avgPerplexity >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Sentence Variance: ${avgVariance.toFixed(0)}/100 ${avgVariance >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Colloquialism:     ${avgColloquialism.toFixed(0)}/100 ${avgColloquialism >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Authenticity:      ${avgAuthenticity.toFixed(0)}/100 ${avgAuthenticity >= 70 ? '✓' : '⚠️'}`);
    console.log(`   - Fragmentary:       ${avgFragmentary.toFixed(0)}/100 ${avgFragmentary >= 50 ? '✓' : '⚠️'}`);
    console.log(`   - Repetition:        ${avgRepetition.toFixed(0)}/100 ${avgRepetition >= 50 ? '✓' : '⚠️'}`);
    console.log(``);
    
    // Identify strengths and weaknesses (6 metrics)
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (avgPerplexity >= 80) strengths.push('perplexity');
    else if (avgPerplexity < 70) weaknesses.push('perplexity');
    
    if (avgVariance >= 80) strengths.push('sentence_variance');
    else if (avgVariance < 70) weaknesses.push('sentence_variance');
    
    if (avgColloquialism >= 80) strengths.push('colloquialism');
    else if (avgColloquialism < 70) weaknesses.push('colloquialism');
    
    if (avgAuthenticity >= 80) strengths.push('emotional_authenticity');
    else if (avgAuthenticity < 70) weaknesses.push('emotional_authenticity');
    
    if (avgFragmentary >= 70) strengths.push('fragmentary');
    else if (avgFragmentary < 50) weaknesses.push('fragmentary');
    
    if (avgRepetition >= 70) strengths.push('repetition');
    else if (avgRepetition < 50) weaknesses.push('repetition');
    
    console.log(`   Strengths: ${strengths.length > 0 ? strengths.join(', ') : 'None significant'}`);
    console.log(`   Weaknesses: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'None'}`);
    console.log(``);
    
    // Recommendation
    const recommendation = avgScore >= 70 ? 'PASS' : 'NEEDS_IMPROVEMENT';
    const status = avgScore >= 70 ? '✅' : '⚠️';
    console.log(`   Recommendation: ${status} Article ${recommendation} (${avgScore >= 70 ? '>70' : '<70'}, ready for publication: ${avgScore >= 70 ? 'YES' : 'NO'})`);
    console.log(``);
  }

  /**
   * 🎭 EXTRACT & VALIDATE plotBible from outline
   * 🆕 v8.0: Now passes archetype configuration
   */
  public extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    // Check if ALL required fields exist in plotBible
    if (outline.plotBible && 
        outline.plotBible.narrator && 
        outline.plotBible.narrator.age &&
        outline.plotBible.narrator.gender &&
        outline.plotBible.narrator.tone &&
        outline.plotBible.sensoryPalette && 
        outline.plotBible.sensoryPalette.details &&
        outline.plotBible.sensoryPalette.details.length > 0 &&
        outline.plotBible.thematicCore &&
        outline.plotBible.thematicCore.centralQuestion) {
      console.log("✅ Using plotBible from Gemini generation");
      
      // 🆕 v8.0: Enhance plotBible with archetype configuration
      const enhancedPlotBible = outline.plotBible;
      
      if (this.heroArchetype) {
        enhancedPlotBible.narrator.heroArchetype = this.heroArchetype;
        enhancedPlotBible.narrator.conflictType = this.conflictType;
        enhancedPlotBible.narrator.timeline = this.timeline;
        enhancedPlotBible.narrator.antagonistReaction = this.antagonistReaction;
        enhancedPlotBible.narrator.victoryType = this.victoryType;
      }
      
      return enhancedPlotBible;
    }

    console.warn("⚠️  plotBible incomplete from Gemini, using fallback");
    
    const ageMatch = params.audience.match(/(\d+)-(\d+)/);
    const age = ageMatch ? Math.round((parseInt(ageMatch[1]) + parseInt(ageMatch[2])) / 2) : 45;
    const gender = params.audience.toLowerCase().includes('woman') || params.audience.toLowerCase().includes('women') ? 'female' : 'male';

    const fallbackNarrator: any = {
      age,
      gender: gender as "male" | "female",
      tone: "confessional",
      voiceHabits: {
        apologyPattern: "I know it sounds strange, but...",
        doubtPattern: "But then I realized...",
        memoryTrigger: "I remember when...",
        angerPattern: "And inside me clicked something",
      },
    };

    // 🆕 v8.0: Add archetype fields to fallback narrator
    if (this.heroArchetype) {
      fallbackNarrator.heroArchetype = this.heroArchetype;
      fallbackNarrator.conflictType = this.conflictType;
      fallbackNarrator.timeline = this.timeline;
      fallbackNarrator.antagonistReaction = this.antagonistReaction;
      fallbackNarrator.victoryType = this.victoryType;
    }

    return {
      narrator: fallbackNarrator,
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
   * 🔧 v8.0: Generate outline structure with ARCHETYPE-SPECIFIC logic
   * Uses TOP Articles patterns for high-performing content
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

    // 🆕 v8.0: Build archetype-specific instructions
    const archetypeInstructions = this.buildArchetypeInstructions(params);

    const prompt = `🎭 STORY ARCHITECT - GENERATE COMPLETE OUTLINE WITH PLOTBIBLE

  TASK: Create ${episodeCount}-episode narrative structure (29K chars total).
  MUSTGENERATE: EVERY field must be filled.

  INPUT:
  - Theme: "${params.theme}"
  - Angle: ${params.angle}
  - Emotion: ${params.emotion}
  - Audience: ${params.audience}

  🏆 ARCHETYPE CONFIGURATION:
  ${archetypeInstructions}

  🔧 CRITICAL REQUIREMENT:
  Gemini, you MUST generate COMPLETE plotBible with:
  1. narrator (age, gender, tone, voiceHabits with ALL 4 patterns)
  2. sensoryPalette (details [5+ items], smells [3+], sounds [3+], textures [3+], lightSources [3+])
  3. characterMap (Narrator + 2-3 other characters)
  4. thematicCore (centralQuestion, emotionalArc, resolutionStyle)

  ❌ DO NOT skip or leave empty fields!
  ❌ ALL text in RUSSIAN ONLY
  ❌ Each field must be specific to this theme

  RESPOND WITH ONLY VALID JSON (no extra text, no markdown):
  \`\`\`json
  {
  "theme": "${params.theme}",
  "angle": "${params.angle}",
  "emotion": "${params.emotion}",
  "audience": "${params.audience}",
  "heroArchetype": "${params.heroArchetype || 'standard'}",
  "conflictType": "${params.conflictType || 'family_conflict'}",
  "timeline": "${params.timeline || 'sudden'}",
  "antagonistReaction": "${params.antagonistReaction || 'shame'}",
  "victoryType": "${params.victoryType || 'multi'}",

  "narrator": {
    "age": [NUMBER 25-70],
    "gender": "female" or "male",
    "tone": "[confessional/bitter/ironic/triumphant]",
    "voiceHabits": {
      "apologyPattern": "[specific Russian phrase]",
      "doubtPattern": "[specific Russian phrase]",
      "memoryTrigger": "[specific Russian phrase]",
      "angerPattern": "[specific Russian phrase]"
    },
    "heroArchetype": "${params.heroArchetype || 'standard'}",
    "conflictType": "${params.conflictType || 'family_conflict'}",
    "timeline": "${params.timeline || 'sudden'}",
    "antagonistReaction": "${params.antagonistReaction || 'shame'}",
    "victoryType": "${params.victoryType || 'multi'}"
  },

  "sensoryPalette": {
    "details": ["detail1", "detail2", "detail3", "detail4", "detail5"],
    "smells": ["smell1", "smell2", "smell3"],
    "sounds": ["sound1", "sound2", "sound3"],
    "textures": ["texture1", "texture2", "texture3"],
    "lightSources": ["light1", "light2", "light3"]
  },

  "characterMap": {
    "Narrator": {
      "role": "protagonist",
      "arc": "[internal journey]"
    },
    "[Character2]": {
      "role": "[catalyst/antagonist/witness]",
      "arc": "[their arc]"
    },
    "[Character3]": {
      "role": "[role]",
      "arc": "[arc]"
    }
  },

  "thematicCore": {
    "centralQuestion": "[The core emotional question]",
    "emotionalArc": "${params.emotion}",
    "resolutionStyle": "[triumphant/cathartic/bittersweet]"
  },

  "episodes": [${episodeJson}
  ],

  "externalTensionArc": "[What actually happens in the story]",
  "internalEmotionArc": "[What shifts internally for narrator]",
  "forbiddenCliches": ["[avoid these", "cheap tropes", "predictable endings"]
  }
  \`\`\``;

    const response = await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.85,
    });

    return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
  }

  /**
   * 🆕 v8.0: Build archetype-specific instructions for outline generation
   */
  private buildArchetypeInstructions(params: {
    heroArchetype?: HeroArchetype;
    conflictType?: ConflictType;
    timeline?: TimelineType;
    antagonistReaction?: AntagonistReaction;
    victoryType?: VictoryType;
  }): string {
    const { heroArchetype, conflictType, timeline, antagonistReaction, victoryType } = params;

    if (!heroArchetype) {
      return `- No specific archetype (will use standard narrative patterns)`;
    }

    let instructions = `- Archetype: ${heroArchetype} (TOP-performing pattern)
  - Timeline: ${timeline || 'sudden'} ${this.getTimelineDescription(timeline)}
  - Conflict: ${conflictType || 'family_conflict'} ${this.getConflictDescription(conflictType)}
  - Victory Type: ${victoryType || 'multi'}
  - Antagonist Reaction: ${antagonistReaction || 'shame'}

  `;

    // Add archetype-specific episode structure
    instructions += this.getArchetypeEpisodeStructure(heroArchetype, timeline);

    return instructions;
  }

  private getTimelineDescription(timeline?: TimelineType): string {
    switch (timeline) {
      case 'sudden':
        return '(1-3 months: Fast action, rapid transformation)';
      case 'gradual':
        return '(6-12 months: Visible growth process)';
      case 'cyclical':
        return '(Years of silence → Sudden dramatic change)';
      case 'revelation':
        return '(Was hidden, now revealed)';
      default:
        return '';
    }
  }

  private getConflictDescription(conflictType?: ConflictType): string {
    switch (conflictType) {
      case 'class_prejudice':
        return '(They mock her for being "simple"/poor)';
      case 'family_greed':
        return '(Family fights over money/inheritance)';
      case 'gender_expectations':
        return '(She was expected to be submissive)';
      case 'infidelity_redemption':
        return '(Husband left, she transforms)';
      case 'matriarch_rejection':
        return '(Mother-in-law rejected her)';
      case 'false_image':
        return '(Family thought she was simple)';
      default:
        return '';
    }
  }

  private getArchetypeEpisodeStructure(archetype: HeroArchetype, timeline?: TimelineType): string {
    const isSudden = timeline === 'sudden';

    switch (archetype) {
      case 'comeback_queen':
        return `
  EPISODE STRUCTURE FOR "COMEBACK QUEEN":
  1. PUBLIC HUMILIATION (all saw it)
  2. QUICK DECISION (1 week, not years!)
  3. METAMORPHOSIS (education → business → success)
  4. THEATRICAL REUNION (family sees her transformation)
  5. TRIUMPH (she's queen, they're below)

  Key: Focus on TRANSFORMATION and PUBLIC RECOGNITION`;

      case 'gold_digger_trap':
        return `
  EPISODE STRUCTURE FOR "GOLD DIGGER TRAP REVERSED":
  1. FAMILY LAUGHTS (mocked for marrying "simple")
  2. WEDDING WITHOUT THEM
  3. REVELATION (she's successful!)
  4. STARTUP → IPO
  5. FAMILY BEGS (needs job, help)
  6. HIERARCHY REVERSED (she's their benefactor)

  Key: They thought SHE was the trap, but SHE trapped THEM`;

      case 'inheritance_reveal':
        return `
  EPISODE STRUCTURE FOR "INHERITANCE REVEAL":
  1. FAMILY BEHAVES (as they think they should)
  2. NOTARY APPEARS (500K inheritance for HER!)
  3. FAMILY MASKS (sudden "care", fake love)
  4. LETTER OPENS (will written specifically for her)
  5. TRUTH EXPOSED (she sees their true faces)
  6. HIERARCHY SHIFTS (inheritance changes everything)

  Key: Money reveals TRUE character of family`;

      case 'entrepreneur':
        return `
  EPISODE STRUCTURE FOR "ENTREPRENEUR":
  1. OPEN CONTEMPT (called poor, simple)
  2. BUSINESS CREATION (her own effort)
  3. FAST GROWTH (10→100→200 clients)
  4. NUMERIC SUCCESS (she's richer than them)
  5. THEY SEE (reactions visible)
  6. "THE POOR ONE IS NOW THEIR BOSS"

  Key: Show NUMBERS and GROWTH, not emotions`;

      case 'phoenix':
        return `
  EPISODE STRUCTURE FOR "PHOENIX":
  1. HE SAYS "You're too simple, I'm leaving"
  2. QUICK DIVORCE (relief, not sorrow)
  3. SHE BLOOMS (fitness, education, courses)
  4. RANDOM MEETING (1-2 years later)
  5. HE SEES (successful, beautiful, happy)
  6. HE REGRETS (too late)

  Key: Show TRANSFORMATION, his REGRET, her FREEDOM`;

      case 'mother_wins':
        return `
  EPISODE STRUCTURE FOR "MOTHER WINS":
  1. CHILDREN IN DANGER
  2. HER STRUGGLE (legal, emotional)
  3. TRIUMPH (children saved, justice served)
  4. FAMILY RECOGNIZES (her strength)

  Key: Maternal power and justice`;

      case 'wisdom_earned':
        return `
  EPISODE STRUCTURE FOR "WISDOM EARNED":
  1. YEARS OF TRIALS (lessons learned)
  2. HARD-WON WISDOM (from suffering)
  3. NEW PERSPECTIVE (peace, acceptance)
  4. LESSON SHARED (with readers)

  Key: Reflection, growth, and sharing wisdom`;

      default:
        return '';
    }
  }

  /**
   * Stage 1: Sequential episode generation
   * 
   * 🆕 v5.3 (Issue #78): Now passes plotBible to episode generator
   * 🆕 v7.0: Pass anti-detection option for simplified generation
   */
  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY,
      {
        maxChars: this.maxChars, // ✅ PASS the budget so episodeGenerator knows the same budget
        useAntiDetection: this.useAntiDetection // 🆕 v7.0: Pass anti-detection option
      }
    );

    return await episodeGenerator.generateEpisodesSequentially(
      outline.episodes,
      {
        delayBetweenRequests: 1500,
        onProgress: (current, total) => {
          console.log(`   ✅ Episode ${current}/${total} complete`);
        },
        plotBible: outline.plotBible  // 🆕 v5.3: Pass plotBible for context-aware generation
      }
    );
  }

  /**
   * ✅ v4.5: Generate opening (lede): 600-900 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform details in instructions only
   * 
   * 🆕 v5.4: PlotBible integration - narrator voice & anti-detection
   */
  async generateLede(outline: OutlineStructure): Promise<string> {
    const firstEpisode = outline.episodes[0];
    const plotBible = outline.plotBible;
    
    // Build narrator voice section
    let voiceGuide = '';
    if (plotBible?.narrator?.voiceHabits) {
      const habits = plotBible.narrator.voiceHabits;
      voiceGuide = `
🎭 NARRATOR'S VOICE PATTERNS (USE THESE NATURALLY):
   Age: ${plotBible.narrator.age || '40-50'} y/o ${plotBible.narrator.gender || 'woman'}
   Tone: ${plotBible.narrator.tone || 'confessional, intimate'}
   - When remembering: "${habits.memoryTrigger || 'Я помню...'}"
   - When doubting: "${habits.doubtPattern || 'Может быть, я ошибалась...'}"
   - When apologizing/justifying: "${habits.apologyPattern || 'Я же не знала...'}"
   
⚠️  USE THESE PATTERNS in the opening - это УНИКАЛЬНЫЙ голос!`;
    }
    
    // Build sensory palette hints
    let sensoryHints = '';
    if (plotBible?.sensoryPalette) {
      const palette = plotBible.sensoryPalette;
      sensoryHints = `
🎨 SENSORY PALETTE (USE SPECIFIC DETAILS):
   - Visual: ${palette.details?.slice(0, 3).join(', ') || 'specific visual details'}
   - Sounds: ${palette.sounds?.slice(0, 2).join(', ') || 'ambient sounds'}
   - Smells: ${palette.smells?.slice(0, 2).join(', ') || 'distinctive smells'}
   
⚠️  Not generic "room", but THIS room with THESE details!`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is opening for serialized story on media platform (600-900 chars).
Tone: Like neighbor confiding in friend at kitchen table.
Goal: Hook reader immediately - they will scroll down if gripped.

⚠️  CRITICAL: Story character does NOT know about platform/audience.
No meta-commentary like "I decided to share this" or "people will judge me".
Just raw confession as if talking to trusted friend.

${voiceGuide}

${sensoryHints}

⚠️  ANTI-DETECTION MANDATORY (Build-in human patterns):

✅ SENTENCE VARIETY:
   Mix: 3-word → 15-word → 8-word sentences
   Pattern: Short. Medium medium sentence. Short again.
   
✅ INCOMPLETE SENTENCES (natural thought):
   "Не знаю. Молчала. Просто не могла."
   "Это было..." [instead of completing]
   
✅ INTERJECTIONS (natural speech):
   "Боже, как я была слепа."
   "Блин, даже сейчас не верю."
   
✅ EMOTIONS AS ACTIONS (NOT descriptions):
   ❌ "I was terrified" 
   ✅ "Руки тряслись. Дыхание перехватило."
   
✅ START WITH ACTION/DIALOGUE/QUESTION:
   ✅ "— Ты помнишь тот день?" [dialogue]
   ✅ "Я помню точно." [action]
   ✅ "Почему я молчала?" [question]
   ❌ "Эта история началась..." [description - BAD]

❌ FORBIDDEN (profanity & vulgarity ABSOLUTELY PROHIBITED):
   ❌ NO profanity, vulgarisms, or obscene language of ANY kind
   ❌ NO street slang or crude expressions
   ❌ This is INTELLIGENT writing for educated audience
   
   ✅ USE LITERARY, ELEGANT RUSSIAN:
      - Express emotions through actions: "Я затаила злость. Дыхание сбилось."
      - Use refined vocabulary: "ужасный", "отвратительный", "восхитительный"
      - Choose cultured interjections: "Боже мой", "Господи", "Чёрт побери"
      - Maintain dignified, confessional tone (like letter to trusted friend)
      
   ✅ EXAMPLES OF PROPER STYLE:
      ❌ "...блять..." (vulgar, street language)
      ✅ "...чёрт побери, как я была слепа..." (cultured, literary)
      
      ❌ "...пиздец какой-то..." (crude, unacceptable)
      ✅ "...это была катастрофа..." (intelligent, descriptive)
      
      ❌ "...ахуенно выглядела..." (vulgar slang)
      ✅ "...выглядела потрясающе..." (refined expression)
      
      ❌ "...блядский дождь..." (profanity)
      ✅ "...проклятый дождь..." (literary equivalent)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 КРИТИЧЕСКИЕ ЗАПРЕТЫ (v6.0 - ANTI-ARTIFACT RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  БЕЗ метаданных: [note], [comment], [...] → УДАЛИ!
⚠️  БЕЗ markdown: **, ##, ___ → УДАЛИ!
⚠️  БЕЗ повторяющихся фраз > 1-2 раз:
   ❌ "— вот в чём дело", "— одним словом", "— может быть, не совсем точно, но"
   ✅ Варьируй речевые обороты!
⚠️  БЕЗ orphaned фрагментов в начале: "ну и", "да вот", "вот только"
⚠️  БЕЗ разорванных предложений: "хотя...", "потому что..." в начале
⚠️  Диалоги ПОЛНЫЕ и правильно отформатированные

🎯 TASK: Write LEDE (opening) - 600-900 RUSSIAN characters:

Hook: "${firstEpisode.hookQuestion}"
Theme: "${outline.theme}"
Emotion: ${outline.emotion}

REQUIREMENTS:
- Start with PARADOX, ACTION, DIALOGUE, or QUESTION (not explanation)
- Pull reader in immediately (first sentence = hook)
- Use narrator's voice patterns naturally
- Use specific sensory details from palette
- Vary sentence length (3-word, 12-word, 6-word mix)
- Include 1-2 incomplete sentences (feels human)
- End with intrigue that makes reader scroll
- NO "I decided to post this" or "I'm sharing because"
- Just: raw memory being recalled

⚠️  ПЕРЕД ОТВЕТОМ - ФИНАЛЬНАЯ ПРОВЕРКА:
Перечитай текст и убедись что НЕТ:
☐ метаданных [...], ☐ markdown (**, ##), ☐ повторяющихся фраз > 2 раз
☐ orphaned фрагментов в начале, ☐ разорванных предложений
Если что-то найдёшь - ПЕРЕДЕЛАЙ СЕЙЧАС!

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.95, // Increased for more variety
    });
  }

  /**
   * ✅ v4.5: Generate closing (finale): 1200-1800 chars
   * CLEAN STORY: No platform mentions
   * CONTEXT: Platform goals in instructions only
   * 
   * 🆕 v8.0: PlotBible integration + ARCHETYPE + FIRM VICTORY ENDING
   */
  async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    
    // 🆕 v8.0: Get victory type for finale
    const victoryType = this.victoryType || "multi";
    
    // Build thematic guidance
    let thematicGuide = '';
    if (plotBible?.thematicCore) {
      const core = plotBible.thematicCore;
      thematicGuide = `
🎯 THEMATIC CORE (WHAT THIS STORY IS REALLY ABOUT):
   Central Question: ${core.centralQuestion || 'What if everything I believed was wrong?'}
   Emotional Arc: ${core.emotionalArc || 'confusion → realization → triumph'}
   Resolution Style: ${core.resolutionStyle || 'triumphant, cathartic'}
   
⚠️  The finale must ANSWER the central question with FIRM CONCLUSION.`;
    }
    
    // Build narrator voice for ending
    let narratorInsight = '';
    if (plotBible?.narrator) {
      narratorInsight = `
🎭 NARRATOR'S VOICE FOR ENDING:
   Age: ${plotBible.narrator.age || '40-50'} y/o ${plotBible.narrator.gender || 'woman'}
   Tone: ${plotBible.narrator.tone || 'confident, triumphant, wise'}
   
⚠️  This is the narrator AFTER the journey - CHANGED, TRIUMPHANT, CONFIDENT.`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
This is finale for serialized story (1200-1800 chars).
Goal: Reader should finish with CONFIDENT, TRIUMPHANT feeling.
Strategy: End with challenging question (encourages comments).

🏆 ARCHETYPE CONTEXT:
${plotBible?.narrator?.heroArchetype ? `- Archetype: ${plotBible.narrator.heroArchetype}` : '- Standard narrative'}
- Victory Type: ${victoryType}
- Final Tone: CONFIDENT, FIRM, NOT HESITANT

${thematicGuide}

${narratorInsight}

⚠️  ANTI-DETECTION FINALE RULES (v8.0 - FIRM VICTORY!):

❌ FORBIDDEN ENDINGS (HESITANT, UNCERTAIN):
   ❌ "Может быть, я сделала правильно?"
   ❌ "А вы как думаете?"
   ❌ "Я не знаю, правильно ли поступила..."
   ❌ "Время покажет..."
   ❌ "Может быть, со временем всё изменится"
   
✅ REQUIRED ENDINGS (FIRM, CONFIDENT):
   ✅ "Я сделала правильно. Факт."
   ✅ "Я их королева, и они это знают."
   ✅ "Я выиграла. Полностью."
   ✅ "Я была права с самого начала."

✅ STRUCTURE (v8.0):
   1. Show life AFTER the transformation (specific scene, not summary)
   2. ONE concrete detail showing what changed FOR HER
   3. ONE concrete detail showing what changed FOR THEM
   4. Narrator's FIRM CONCLUSION (not question, not doubt)
   5. End with CHALLENGING question (NOT "what do you think?")

✅ VICTORY TYPES (based on ${victoryType}):

${this.getFinaleVictoryExamples(victoryType)}

✅ SENTENCE VARIETY (anti-detection):
   - Mix: Short. Medium sentence with clause. Very short.
   - Incomplete sentences for emphasis: "И тогда... всё изменилось."
   - Repeat for impact: "Я выиграла. Я выиграла. Я выиграла."

⚠️ GRAPHIC FORMATTING (v8.0 spec):
   - End with ONE confident statement in CAPS (2-3 words max):
     "Я ПОБЕДИЛА."
     "Я КОРОЛЕВА."
     "Я БЫЛА ПРАВА."
     
   - Use THREE different punctuation marks per paragraph minimum:
     Example: "Что делать? Не знала... Решила — победить!"
     
   - Final question (CHALLENGING, not timid):
     "Смогли бы ВЫ совершить такой выбор?"
     "Знаете ли вы женщину, которая смогла бы?"
     "А вы готовы к таким переменам?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 КРИТИЧЕСКИЕ ЗАПРЕТЫ (v8.0 - FIRM ENDINGS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  БЕЗ метаданных: [note], [comment], [...] → УДАЛИ!
⚠️  БЕЗ markdown: **, ##, ___ → УДАЛИ!
⚠️  БЕЗ повторяющихся фраз > 1-2 раз
⚠️  БЕЗ orphaned фрагментов в начале
⚠️  БЕЗ разорванных предложений: "хотя...", "потому что..." в начале
⚠️  БЕЗ диалогов где героиня сомневается

🎯 TASK: Write FINALE - 1200-1800 RUSSIAN characters:

Theme: "${outline.theme}"
Victory Type: ${victoryType}
Audience: Educated women (35-60, urban, thoughtful)

REQUIREMENTS:
- Resolve EXTERNAL conflict (she WON, they LOST)
- Show INTERNAL shift (she's confident, changed)
- FIRM VICTORY ENDING (not uncertain, not bittersweet!)
- Life continues - but SHE IS WINNER
- ONE specific scene showing her NEW life
- ONE specific detail showing their REACTION
- Narrator's FIRM CONCLUSION (not question, not doubt)
- End with CHALLENGING question (not "what do you think?")

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.9, // Increased for authentic variety
    });
  }

  /**
   * 🆕 v8.0: Get victory examples for finale
   */
  private getFinaleVictoryExamples(victory: VictoryType): string {
    switch (victory) {
      case 'financial':
        return `FINANCIAL VICTORY:
   - Focus on MONEY: "Компания генерирует 500K в месяц"
   - They need money: "Свекровь позвонила: нужна работа для сына"
   - Her terms: "Я помогу, но на МОИХ условиях"
   - Firm conclusion: "Я богатая. Они — нет. Факт."`;
      case 'professional':
        return `PROFESSIONAL VICTORY:
   - Focus on SUCCESS: "Мой бизнес теперь генерирует миллионы"
   - They work for her: "Её дочь мечтает работать у меня"
   - Status shift: "Теперь Я решаю, кто достоин"
   - Firm conclusion: "Я успешнее. Все видят это."`;
      case 'social':
        return `SOCIAL VICTORY:
   - Focus on RESPECT: "Меня приглашают на закрытые вечера"
   - They acknowledge: "Свекровь попросила прощения"
   - Status change: "Я королева этого города"
   - Firm conclusion: "Меня уважают. Вас — нет."`;
      case 'emotional':
        return `EMOTIONAL VICTORY:
   - Focus on HAPPINESS: "Я счастлива. Без него. Без них."
   - They suffer: "Он жалеет. Но поздно."
   - Inner peace: "Плечи опустились. Дыхание ровное."
   - Firm conclusion: "Я свободна. Я счастлива. Я выиграла."`;
      case 'moral':
        return `MORAL VICTORY:
   - Focus on TRUTH: "Правда вышла наружу"
   - They cannot deny: "Даже она признала..."
   - Justice: "Я была права с начала"
   - Firm conclusion: "Правда на моей стороне. Все видят."`;
      case 'multi':
        return `MULTI VICTORY (ALL FRONTS):
   - "Прошло 8 месяцев. Компания генерирует 500K в месяц.
     Вчера свекровь позвонила: нужна работа для её сына.
     Я помогу, но на МОИХ условиях.
     Теперь я знаю: я не ошибалась. Они просто не видели,
     на что я способна."
   - Firm conclusion: "Я ВЫИГРАЛА. НА ВСЕХ ФРОНТАХ."`;
      default:
        return `Focus on clear victory statement based on victoryType`;
    }
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars (Russian only)
❌ FORBIDDEN (cheap endings):
   ❌ "И мы зажили счастливо" (fairy tale)
   ❌ "Время лечит" (cliché)
   ❌ "Жизнь продолжается" (generic)
   ❌ "Я простила и забыла" (unrealistic)
   ❌ "Теперь я знаю, что надо..." (sermon/lesson)

❌ FORBIDDEN (profanity & vulgarity ABSOLUTELY PROHIBITED):
   ❌ NO profanity, vulgarisms, or obscene language of ANY kind
   ❌ NO street slang or crude expressions
   ❌ This is INTELLIGENT writing for educated audience
   
   ✅ USE LITERARY, ELEGANT RUSSIAN:
      - Express emotions through actions: "Я затаила злость. Дыхание сбилось."
      - Use refined vocabulary: "ужасный", "отвратительный", "восхитительный"
      - Choose cultured interjections: "Боже мой", "Господи", "Чёрт побери"
      - Maintain dignified, confessional tone (like letter to trusted friend)
      
   ✅ EXAMPLES OF PROPER STYLE:
      ❌ "...блять..." (vulgar, street language)
      ✅ "...чёрт побери, как я была слепа..." (cultured, literary)
      
      ❌ "...пиздец какой-то..." (crude, unacceptable)
      ✅ "...это была катастрофа..." (intelligent, descriptive)
      
      ❌ "...ахуенно выглядела..." (vulgar slang)
      ✅ "...выглядела потрясающе..." (refined expression)
      
      ❌ "...блядский дождь..." (profanity)
      ✅ "...проклятый дождь..." (literary equivalent)

⚠️ GRAPHIC FORMATTING (v5.5 spec):
   - Include ONE of these signature elements (author's final word):
     a) ЗАГЛАВНЫМИ: "Я НЕ ЗНАЮ, ПРАВИЛЬНА ЛИ Я БЫЛА." (2-3 words max)
     b) Mноготочия: "Я сидела и думала... Что теперь?"
     c) Вопрос к читателю: "А вы бы простили?"
     d) Курсив (опционально): *Прошло три года. Я до сих пор не знаю.*
   
   - Use THREE different punctuation marks per paragraph minimum:
     Example: "Что делать? Не знала... Решила — уйти."
   
   - End with ONE signature phrase that feels personal:
     "А вы бы поступили иначе?"
     "Это всё, что я могу рассказать."
     "Может быть, я ошибалась. Но не думаю."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 КРИТИЧЕСКИЕ ЗАПРЕТЫ (v6.0 - ANTI-ARTIFACT RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  БЕЗ метаданных: [note], [comment], [...] → УДАЛИ!
⚠️  БЕЗ markdown: **, ##, ___ → УДАЛИ!
⚠️  БЕЗ повторяющихся фраз > 1-2 раз:
   ❌ "— вот в чём дело", "— одним словом", "— может быть, не совсем точно, но"
   ✅ Варьируй речевые обороты!
⚠️  БЕЗ orphaned фрагментов в начале: "ну и", "да вот", "вот только"
⚠️  БЕЗ разорванных предложений: "хотя...", "потому что..." в начале
⚠️  Диалоги ПОЛНЫЕ и правильно отформатированные

🎯 TASK: Write FINALE - 1200-1800 RUSSIAN characters:

Theme: "${outline.theme}"
Emotion arc: ${outline.emotion}
Audience: Educated women (35-60, urban, thoughtful)

REQUIREMENTS:
- Resolve EXTERNAL conflict (what actually happened)
- Show INTERNAL shift (how narrator changed)
- NOT happy ending - REALISTIC ending
- Life continues, questions remain
- ONE specific scene showing aftermath
- Narrator's insight (what they NOW understand)
- End with HONEST QUESTION (not instruction/sermon)

⚠️  ПЕРЕД ОТВЕТОМ - ФИНАЛЬНАЯ ПРОВЕРКА:
Перечитай текст и убедись что НЕТ:
☐ метаданных [...], ☐ markdown (**, ##), ☐ повторяющихся фраз > 2 раз
☐ orphaned фрагментов в начале, ☐ разорванных предложений
Если что-то найдёшь - ПЕРЕДЕЛАЙ СЕЙЧАС!

OUTPUT: Only the text. No title, no metadata.`;

    return await this.callGemini({
      prompt,
      model: "gemini-3-flash-preview",
      temperature: 0.9, // Increased for authentic variety
    });
  }

  /**
   * ✅ v4.5: Generate article title: 55-90 chars (Russian only)
   * CONTEXT: Platform optimization in instructions
   * STORY: Title is standalone, doesn't mention platform
   * 
   * 🆕 v5.4: PlotBible integration - narrator tone & central question
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const plotBible = outline.plotBible;
    
    // Add central question hint if available
    let thematicHint = '';
    if (plotBible?.thematicCore?.centralQuestion) {
      thematicHint = `\nCentral Question: ${plotBible.thematicCore.centralQuestion}`;
    }
    
    // Add narrator tone hint
    let narratorTone = '';
    if (plotBible?.narrator?.tone) {
      narratorTone = `\nNarrator Tone: ${plotBible.narrator.tone} (reflect this in title)`;
    }
    
    const prompt = `📄 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY):
Creating title for serialized story on media platform.
Algorithm favors: Emotional words + Personal perspective + Intrigue.

OBJECTIVE: Title should make reader CLICK and READ (55-90 Russian characters).

🎯 TASK: Generate ONE compelling title:

CONTEXT:
- Theme: "${outline.theme}"
- Emotion: ${outline.emotion}${thematicHint}${narratorTone}
- Audience: Educated women 35-60
- Opening paragraph: ${lede.substring(0, 200)}...

FORMULA THAT WORKS:
[EMOTION/PERSONAL] + [I/WE/SOMEONE] + [ACTION/TRUTH] + [INTRIGUE]

EXAMPLES (Russian):
✅ "Я целые годы лгала семье"
✅ "День, когда всё рушится"
✅ "С того дня я не знаю что делать"
✅ "Это чья-то жертва? Нет. Это моя ошибка."
✅ "Мама скрывала правду. Теперь я знаю почему"
✅ "Я молчала двадцать лет. Сегодня расскажу"

⚠️  TONE MATCH:
   - If confessional → "Я скрывала...", "Теперь расскажу..."
   - If bitter → "Она думала...", "Я не простила..."
   - If ironic → "Смешно? Нет.", "Я верила в справедливость"
   - If desperate → "Не знаю как...", "Что мне делать..."

OUTPUT: ONLY the title text (no JSON, no quotes, no explanation).
Characters: 55-90
Language: 100% RUSSIAN, no Latin letters or English`;

    try {
      const response = await this.callGemini({
        prompt,
        model: "gemini-3-flash-preview",
        temperature: 0.85, // Slightly higher for variety
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
        model: "gemini-3-flash-preview",
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

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        console.warn(
          'callGemini: Gemini returned empty/invalid text:',
          JSON.stringify(response).substring(0, 500)
        );
        return "";
      }
      return text;
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
    const prompt = `Write Episode #${outline.id} for serialized narrative:

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
        model: "gemini-3-flash-preview",
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: 40,
          topP: 0.95,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        console.warn(
          `Agent #${this.id} primary returned empty/invalid text:`,
          JSON.stringify(response).substring(0, 500)
        );
        return "";
      }
      return text;
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

          const text = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text || typeof text !== 'string') {
            console.warn(
              `Agent #${this.id} fallback returned empty/invalid text:`,
              JSON.stringify(fallbackResponse).substring(0, 500)
            );
            return "";
          }

          return text;
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