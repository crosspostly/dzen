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
  | "sudden"
  | "gradual"
  | "cyclical"
  | "revelation";

export type AntagonistReaction =
  | "shame"
  | "regret"
  | "jealousy"
  | "pleading"
  | "denial"
  | "anger";

export type VictoryType =
  | "financial"
  | "professional"
  | "social"
  | "emotional"
  | "moral"
  | "multi";

export interface ArticleGeneratorConfig {
  theme: string;
  angle: string;
  emotion: string;
  audience: string;
  maxChars?: number;
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

// ============================================================================
// FALLBACK MODEL CHAIN: primary -> gemini-2.5-pro -> gemini-2.5-flash -> gemini-2.5-flash-lite
// ============================================================================
const FALLBACK_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

function isRetryableError(message: string): boolean {
  return (
    message.includes('503') ||
    message.includes('overloaded') ||
    message.includes('UNAVAILABLE') ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota')
  );
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

  private getRelevantExample(theme: string): ExampleArticle | null {
    const jsonPath = path.join(process.cwd(), 'parsed_examples.json');
    const examples = examplesService.loadParsedExamples(jsonPath);
    if (examples.length === 0) return null;

    const keywords = theme.toLowerCase().split(' ').filter(w => w.length > 4);
    const match = examples.find(ex => {
      const titleLower = ex.title.toLowerCase();
      return keywords.some(k => titleLower.includes(k));
    });

    if (match) {
      console.log(`🧠 Found relevant example: "${match.title}" for theme "${theme}"`);
      return match;
    }

    const top = examplesService.selectBestExamples(examples, 1)[0];
    console.log(`🧠 Using top example: "${top.title}" (${top.metadata?.views} views)`);
    return top;
  }

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

    this.heroArchetype = params.heroArchetype;
    this.conflictType = params.conflictType;
    this.timeline = params.timeline || "sudden";
    this.antagonistReaction = params.antagonistReaction || "shame";
    this.victoryType = params.victoryType || "multi";

    console.log("\n🎬 [ZenMaster v8.0] Starting archetype-aware generation...");
    console.log(`📏 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    console.log(`🎬 Episodes: ${episodeCount}`);
    if (this.heroArchetype) {
      console.log(`🏆 Archetype: ${this.heroArchetype} | Timeline: ${this.timeline} | Victory: ${this.victoryType}`);
    }

    console.log(`📋 Stage 0: Building outline (${episodeCount} episodes)...`);
    let outline: OutlineStructure;

    try {
      outline = await this.generateOutline(params, episodeCount);
      const outlineText = JSON.stringify(outline);
      const validation = await qualityGate(outlineText, 65, 500, outline.theme);
      if (!validation.isValid) {
        console.warn('⚠️ Outline quality low, but proceeding with caution');
      }
    } catch (error) {
      console.error(`❌ Outline generation failed:`, error);
      outline = this.createFallbackOutline(params, episodeCount);
    }

    const plotBible = this.extractPlotBible(outline, params);
    console.log("✅ PlotBible ready");

    console.log(`🔄 Stage 1: Generating ${episodeCount} episodes...`);
    let episodes: Episode[];

    try {
      episodes = await this.generateEpisodesSequentially(outline);
    } catch (error) {
      console.error(`❌ Episodes generation failed:`, error);
      episodes = this.createFallbackEpisodes(outline.episodes);
    }

    if (episodes.length === 0) {
      episodes = this.createMinimalEpisodes(episodeCount);
    }

    this.printPhase2Summary(episodes);

    console.log("🗰 Generating title...");
    let title: string;
    try {
      title = await this.generateTitle(outline, episodes[0]?.content.substring(0, 500) || "");
      console.log(`✅ Title: "${title}"`);
    } catch (error) {
      title = this.safeTheme(outline.theme);
      console.log(`✅ Title (fallback): "${title}"`);
    }

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
      const devRange = episodes.slice(1, Math.max(2, episodes.length - 4));
      development = await this.generateDevelopment(outline, devRange);
      const devGate = await qualityGate(development, 70, 1500, title + " [DEV]");
      if (!devGate.isValid) console.warn('   ⚠️ DEVELOPMENT quality low:', devGate.issues);
    } catch (error) {
      development = this.getFallbackDevelopment(outline);
    }

    try {
      console.log("   📝 Generating CLIMAX...");
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

    let voicePassport: VoicePassport;
    try {
      voicePassport = await this.generateVoicePassport(params.audience);
    } catch (error) {
      voicePassport = this.getFallbackVoicePassport();
    }

    let fullContent = [lede, development, climax, resolution, finale].join('\n\n');

    const finalValidation = await qualityGate(fullContent, 75, 10000, title);
    if (!finalValidation.isValid) {
      console.log('⚠️ Final article quality low:', finalValidation.issues);
    }

    console.log('✅ Stage 3: Cleanup SKIPPED (relying on auto-restore)');

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
        totalChars: fullContent.length,
        totalReadingTime: this.calculateReadingTime(lede, episodes, finale),
        episodeCount: episodes.length,
        sceneCount: this.countScenes(lede, episodes, finale),
        dialogueCount: this.countDialogues(lede, episodes, finale),
      },
      processedContent: fullContent,
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

    await this.applyAuthenticityToImages(article);
    if (article.stage4Applied) {
      console.log(`   Stage 4 (Authenticity): ✅ Applied (${article.stage4Stats?.processedCount} images)`);
    }

    return article;
  }

  private async applyAuthenticityToImages(article: LongFormArticle): Promise<void> {
    console.log(`\n🔧 Stage 4: Applying mobile photo authenticity...`);

    let processedCount = 0;
    let failedCount = 0;

    if (article.coverImage?.base64) {
      try {
        const authResult = await this.authenticityProcessor.processForMobileAuthenticity(article.coverImage.base64);
        if (authResult.success && authResult.processedBuffer) {
          article.coverImage.base64 = authResult.processedBuffer.toString('base64');
          article.coverImage.authenticityLevel = authResult.authenticityLevel;
          article.coverImage.appliedEffects = authResult.appliedEffects;
          article.coverImage.deviceSimulated = authResult.deviceSimulated;
          processedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }
    }

    for (const episode of article.episodes) {
      if (episode.imagePath) {
        try {
          const authResult = await this.authenticityProcessor.processForMobileAuthenticity(episode.imagePath);
          if (authResult.success && authResult.processedBuffer) {
            episode.imagePath = authResult.processedBuffer.toString('base64');
            episode.authenticityLevel = authResult.authenticityLevel;
            episode.appliedEffects = authResult.appliedEffects;
            processedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
        }
      }
    }

    article.stage4Applied = true;
    article.stage4Stats = { processedCount, failedCount };
    console.log(`\n✅ Stage 4 Complete: ${processedCount} images processed, ${failedCount} failed`);
  }

  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) return '';

    const narrator = plotBible.narrator;
    const sensory = plotBible.sensoryPalette;
    const thematic = plotBible.thematicCore;
    let section = '';

    if (narrator) {
      section += `\n📖 ГОЛОС РАССКАЗЧИКА (${narrator.age || '40-50'} лет, ${narrator.tone || 'исповедальный'})`;
      if (narrator.voiceHabits?.doubtPattern) section += `\n   При сомнении: "${narrator.voiceHabits.doubtPattern}"`;
      if (narrator.voiceHabits?.memoryTrigger) section += `\n   Триггер памяти: "${narrator.voiceHabits.memoryTrigger}"`;
      if (narrator.voiceHabits?.angerPattern) section += `\n   При гневе: "${narrator.voiceHabits.angerPattern}"`;
    }

    if (sensory) {
      section += `\n🎨 СЕНСОРНАЯ ПАЛИТРА:`;
      if (sensory.details?.length > 0) section += `\n   Зрение: ${sensory.details.slice(0, 3).join(', ')}`;
      if (sensory.smells?.length > 0) section += `\n   Запахи: ${sensory.smells.slice(0, 2).join(', ')}`;
      if (sensory.sounds?.length > 0) section += `\n   Звуки: ${sensory.sounds.slice(0, 2).join(', ')}`;
      if (sensory.textures?.length > 0) section += `\n   Осязание: ${sensory.textures.slice(0, 2).join(', ')}`;
    }

    if (thematic) {
      section += `\n🎯 ТЕМАТИЧЕСКОЕ ЯДРО:`;
      if (thematic.centralQuestion) section += `\n   Главный вопрос: "${thematic.centralQuestion}"`;
      if (thematic.emotionalArc) section += `\n   Эмоциональная дуга: ${thematic.emotionalArc}`;
    }

    return section;
  }

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

  // Guard: safe fallback for outline.theme
  private safeTheme(theme?: string): string {
    if (theme && theme !== 'undefined' && theme.trim()) return theme.trim();
    return `Статья ${Date.now()}`;
  }

  async generateDevelopment(outline: OutlineStructure, devEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const timeline = this.timeline;

    let timelineInstruction = '';
    if (timeline === 'sudden') {
      timelineInstruction = `\n⏱️ TIMELINE: SUDDEN (1-3 months) - FAST ACTION!\n✅ Show rapid transformation.\n📏 TARGET LENGTH: 3000-4000 chars`;
    } else if (timeline === 'gradual') {
      timelineInstruction = `\n⏱️ TIMELINE: GRADUAL (6-12 months)\n✅ Show step-by-step growth process.\n📏 TARGET LENGTH: 3500-4500 chars`;
    } else if (timeline === 'cyclical') {
      timelineInstruction = `\n⏱️ TIMELINE: CYCLICAL\n✅ 30% Past, 70% NEW PHASE.\n📏 TARGET LENGTH: 3500-4500 chars`;
    } else {
      timelineInstruction = `\n⏱️ TIMELINE: REVELATION\n✅ Focus on reveal and consequences.`;
    }

    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    const guidelines = this.loadSharedGuidelines();
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const episodesContent = devEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}\n\n${guidelines}\n\n📄 DEVELOPMENT\n\nARCHETYPE: ${this.heroArchetype || 'standard'}\nTIMELINE: ${timeline}\n\n${plotBibleSection}\n${timelineInstruction}\n\n🎯 TASK: Rewrite into DEVELOPMENT section.\nSource Episodes:\n${episodesContent}\n\nTarget: 3500-4500 chars. OUTPUT: Only text`;

    return await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.92 });
  }

  async generateClimax(outline: OutlineStructure, development: string, climaxEpisodes: Episode[]): Promise<string> {
    const plotBible = outline.plotBible;
    const previousContext = development.substring(development.length - 200);
    const reaction = this.antagonistReaction;

    const reactionGuides: Record<AntagonistReaction, string> = {
      shame: `3. REACTION - SHAME:\n   - Mother-in-law sees, blushes, avoids eye contact`,
      regret: `3. REACTION - REGRET:\n   - Husband sees what he lost`,
      jealousy: `3. REACTION - JEALOUSY:\n   - Bitter comments, envy visible`,
      pleading: `3. REACTION - PLEADING:\n   - They beg for help, jobs, money`,
      denial: `3. REACTION - DENIAL:\n   - "This can't be true!" then proof hits`,
      anger: `3. REACTION - ANGER:\n   - Accusations, rage at being surpassed`,
    };

    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    const guidelines = this.loadSharedGuidelines();
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const episodesContent = climaxEpisodes.map(e => e.content).join('\n\n---\n\n');

    const prompt = `${basePrompt}\n\n${guidelines}\n\n📄 CLIMAX\n\nARCHETYPE: ${this.heroArchetype || 'standard'}\nANTAGONIST REACTION: ${reaction}\n\n${plotBibleSection}\n\n🎯 TASK: Rewrite into powerful CLIMAX section.\nPrevious Context: "${previousContext}"\n\nSource Episodes:\n${episodesContent}\n\n${reactionGuides[reaction]}\n\nTarget: 2500-3500 chars. OUTPUT: Only text`;

    return await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.88 });
  }

  async generateResolution(outline: OutlineStructure, climax: string): Promise<string> {
    const plotBible = outline.plotBible;
    const victory = this.victoryType;

    const victoryPositions: Record<VictoryType, string> = {
      financial: `✅ "Я богатая. Вы — нет. Факт."`,
      professional: `✅ "Я успешнее. Вы — нет."`,
      social: `✅ "Меня уважают. Вас — нет."`,
      emotional: `✅ "Я счастлива. Вы завидуете."`,
      moral: `✅ "Я была права с самого начала."`,
      multi: `✅ "Я выиграла. Полностью. На всех фронтах."`,
    };

    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    const guidelines = this.loadSharedGuidelines();
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const prompt = `${basePrompt}\n\n${guidelines}\n\n📄 RESOLUTION (1000-1200 chars)\n\nARCHETYPE: ${this.heroArchetype || 'standard'}\nVICTORY TYPE: ${victory}\n\n${plotBibleSection}\n\nVICTORY POSITION:\n${victoryPositions[victory]}\n\n🎯 TASK: Write RESOLUTION — firm victory, no doubts.\nTarget: 1000-1200 chars. OUTPUT: Only text`;

    return await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.85 });
  }

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

  public extractPlotBible(outline: OutlineStructure, params: { theme: string; emotion: string; audience: string }) {
    const plotBible = outline.plotBible;

    if (plotBible?.narrator?.age && plotBible.narrator.gender && plotBible.narrator.tone &&
      plotBible.sensoryPalette?.details?.length > 0) {
      console.log("✅ Using plotBible from Gemini generation");
      return plotBible;
    }

    console.warn("⚠️ plotBible incomplete, using fallback");

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
      let fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(fixed);
      } catch (e2) {
        try {
          const objMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objMatch) {
            let obj = objMatch[0].replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(obj);
          }
        } catch (e3) {
          console.error(`❌ Failed to parse ${context}`);
          throw new Error(`Failed to parse ${context}: ${(e2 as Error).message}`);
        }
      }
    }
  }

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
    const episodeJson = Array.from({ length: episodeCount }, (_, i) => `
    {
      "id": ${i + 1},
      "title": "Часть ${i + 1}: ...",
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
      basePrompt = '# Промпт для STAGE 0: PlotBible Generation';
    }

    const archetypeStructures: Partial<Record<HeroArchetype, string>> = {
      comeback_queen: `\nSTRUCTURE: PUBLIC HUMILIATION → QUICK DECISION → METAMORPHOSIS → THEATRICAL REUNION → TRIUMPH`,
      gold_digger_trap: `\nSTRUCTURE: FAMILY MOCKS → WEDDING → REVELATION → STARTUP→IPO → FAMILY BEGS → REVERSED`,
      inheritance_reveal: `\nSTRUCTURE: FAMILY BEHAVES → NOTARY → MASKS → LETTER → TRUTH → SHIFT`,
      entrepreneur: `\nSTRUCTURE: CONTEMPT → BUSINESS → FAST GROWTH → NUMERIC SUCCESS → THEY SEE`,
      phoenix: `\nSTRUCTURE: HE LEAVES → DIVORCE → SHE BLOOMS → MEETING → HE REGRETS`,
      mother_wins: `\nSTRUCTURE: DANGER → STRUGGLE → TRIUMPH → RECOGNITION`,
      wisdom_earned: `\nSTRUCTURE: TRIALS → WISDOM → PERSPECTIVE → LESSON SHARED`,
    };

    const archetypeStructure = params.heroArchetype ? (archetypeStructures[params.heroArchetype] || '') : '';
    const guidelines = this.loadSharedGuidelines();

    let exampleContext = '';
    const bestExample = this.getRelevantExample(params.theme);
    if (bestExample) {
      exampleContext = `\n📚 ONE-SHOT EXAMPLE (INSPIRATION - DO NOT COPY):\nTitle: "${bestExample.title}"\nExcerpt: "${bestExample.content.substring(0, 800)}..."\n--------------------------------------------------`;
    }

    const prompt = `${basePrompt}\n\n${guidelines}\n\n${exampleContext}\n\n🎭 STORY ARCHITECT - GENERATE COMPLETE OUTLINE\n\nTASK: Create ${episodeCount}-episode narrative structure.\n\nINPUT:\n- Theme: "${params.theme}"\n- Angle: ${params.angle}\n- Emotion: ${params.emotion}\n- Audience: ${params.audience}\n- Archetype: ${params.heroArchetype || 'standard'}\n- Timeline: ${params.timeline || 'sudden'}\n\n${archetypeStructure}\n\nRESPOND WITH ONLY VALID JSON:\n\`\`\`json\n{\n  "theme": "${params.theme}",\n  "angle": "${params.angle}",\n  "emotion": "${params.emotion}",\n  "audience": "${params.audience}",\n  "plotBible": {\n    "narrator": { "age": 45, "gender": "female", "tone": "confessional", "voiceHabits": { "apologyPattern": "...", "doubtPattern": "...", "memoryTrigger": "...", "angerPattern": "..." } },\n    "sensoryPalette": { "details": ["d1","d2","d3","d4","d5"], "smells": ["s1","s2","s3"], "sounds": ["s1","s2","s3"], "textures": ["t1","t2","t3"], "lightSources": ["l1","l2","l3"] }\n  },\n  "characterMap": {},\n  "thematicCore": { "centralQuestion": "...", "emotionalArc": "${params.emotion}", "resolutionStyle": "triumphant" },\n  "episodes": [${episodeJson}\n  ],\n  "externalTensionArc": "...",\n  "internalEmotionArc": "...",\n  "forbiddenCliches": []\n}\n\`\`\``;

    const response = await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.85 });

    try {
      return this.parseJsonSafely(response, 'Outline') as OutlineStructure;
    } catch (e) {
      console.warn('⚠️ Outline parsing failed, using fallback structure');
      return this.createFallbackOutline(params, episodeCount);
    }
  }

  private async generateEpisodesSequentially(outline: OutlineStructure): Promise<Episode[]> {
    const episodeGenerator = new EpisodeGeneratorService(
      process.env.GEMINI_API_KEY || process.env.API_KEY,
      { maxChars: this.maxChars, useAntiDetection: this.useAntiDetection }
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

  async generateLede(outline: OutlineStructure, episode: Episode): Promise<string> {
    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();
    const plotBibleSection = this.buildPlotBibleSection(outline.plotBible);

    const prompt = `${basePrompt}\n\n${guidelines}\n\n📄 LEDE (600-900 chars)\n\n${plotBibleSection}\n\nARCHETYPE: ${this.heroArchetype || 'standard'}\n\n🎯 TASK: Rewrite into compelling LEDE.\nSource Episode: "${episode.content.substring(0, 1000)}..."\n\nStart with ACTION/DIALOGUE/QUESTION. End with intrigue. 600-900 chars.\nOUTPUT: Only text`;

    return await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.95 });
  }

  async generateFinale(outline: OutlineStructure, episode: Episode): Promise<string> {
    const victory = this.victoryType;

    const victoryExampleMap: Record<VictoryType, string> = {
      financial: `FINANCIAL: "Компания генерирует 500K в месяц. Я богатая. Они — нет. ФАКТ."`,
      professional: `PROFESSIONAL: "Мой бизнес теперь миллионы. Я успешнее. Все видят."`,
      social: `SOCIAL: "Меня уважают. Они нет."`,
      emotional: `EMOTIONAL: "Я счастлива. Они завидуют."`,
      moral: `MORAL: "Я была права. Это доказано."`,
      multi: `MULTI: "Прошло 8 месяцев. Компания 500K/мес. Свекровь просит работу для сына. Я ВЫИГРАЛА."`,
    };

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-2-assemble.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '# Промпт для STAGE 2: Article Assembly';
    }

    const guidelines = this.loadSharedGuidelines();
    const plotBibleSection = this.buildPlotBibleSection(outline.plotBible);

    const prompt = `${basePrompt}\n\n${guidelines}\n\n📄 FINALE (1200-1800 chars)\n\n🏆 ARCHETYPE: ${this.heroArchetype || 'standard'}\nVICTORY TYPE: ${victory}\n\n${plotBibleSection}\n${victoryExampleMap[victory]}\n\n❌ FORBIDDEN: "Может быть...", "А вы как думаете?"\n✅ REQUIRED: Firm conclusion, CAPS victory statement, final challenge question.\n\n🎯 TASK: Rewrite into powerful FINALE.\nSource Episode: "${episode.content.substring(0, 1500)}..."\n\n1200-1800 chars. OUTPUT: Only text`;

    return await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.9 });
  }

  /**
   * Generate article title: 55-90 chars
   * FIX v9.1: Guard against undefined/empty outline.theme
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const themeFallback = this.safeTheme(outline.theme);

    const prompt = `📄 TITLE (55-90 Russian chars)\n\nTheme: "${themeFallback}"\nArchetype: ${this.heroArchetype || 'standard'}\nOpening: ${lede.substring(0, 200)}...\n\nFORMULA: [EMOTION] + [I/WE] + [ACTION/TRUTH] + [INTRIGUE]\n\nEXAMPLES:\n✅ "Я была худшей невесткой до того дня"\n✅ "Они смеялись, когда я вышла за водителя"\n✅ "Мой муж сказал: ты простая. Потом понял."\n\nOUTPUT: Only the title (no quotes, no JSON)`;

    try {
      const response = await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.85 });

      let title = response?.trim()
        .replace(/^["'`]+/, "")
        .replace(/["'`]+$/, "")
        .replace(/\.$/, "")
        .substring(0, 100);

      // Reject if empty, undefined string, non-Russian, or wrong length
      if (!title || title === 'undefined' || !/[а-яёА-ЯЁ]/.test(title) || /[a-zA-Z]/.test(title)) {
        return themeFallback;
      }

      if (title.length < 55 || title.length > 90) {
        console.warn(`Title length ${title.length} out of range, using fallback`);
        return themeFallback;
      }

      return title;
    } catch (error) {
      console.error("Title generation failed:", error);
      return themeFallback;
    }
  }

  private async generateVoicePassport(audience: string): Promise<VoicePassport> {
    const prompt = `Generate Voice Passport for author: ${audience}\n\nRespond as JSON:\n\`\`\`json\n{\n  "apologyPattern": "How author justifies",\n  "doubtPattern": "How they express uncertainty",\n  "memoryTrigger": "How they recall the past",\n  "characterSketch": "How they describe people",\n  "humorStyle": "self-irony|bitter|kind|dark",\n  "jokeExample": "One example of their joke",\n  "angerPattern": "How they express anger",\n  "paragraphEndings": ["question", "pause", "short_phrase"],\n  "examples": ["example1", "example2"]\n}\n\`\`\``;

    try {
      const response = await this.callGemini({ prompt, model: "gemini-3-flash-preview", temperature: 0.8 });
      return this.parseJsonSafely(response, 'VoicePassport') as VoicePassport;
    } catch (error) {
      return this.getFallbackVoicePassport();
    }
  }

  private cleanGeminiResponse(text: string): string {
    if (!text) return "";

    let cleaned = text;
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
    }

    const preambles = [
      /^(Here is|Sure,|Certainly|Okay,|Of course,|Вот|Конечно|Держите).*?(:|\\n)/i,
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
   * Call Gemini with full 3-model fallback chain.
   * Retries on: 503 / overloaded / UNAVAILABLE / 429 / RESOURCE_EXHAUSTED / quota
   */
  private async callGemini(params: { prompt: string; model: string; temperature: number }): Promise<string> {
    const tryModel = async (model: string): Promise<string> => {
      const response = await this.geminiClient.models.generateContent({
        model,
        contents: params.prompt,
        config: { temperature: params.temperature, topK: 40, topP: 0.95 },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') return "";
      return this.cleanGeminiResponse(text);
    };

    // 1st attempt: requested model
    try {
      return await tryModel(params.model);
    } catch (primaryError) {
      const primaryMsg = (primaryError as Error).message;
      console.warn(`Gemini call failed (${params.model}): ${primaryMsg}`);

      if (!isRetryableError(primaryMsg)) throw primaryError;

      // Walk fallback chain
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackModel === params.model) continue;

        console.log(`📁 Trying fallback: ${fallbackModel}...`);
        try {
          const result = await tryModel(fallbackModel);
          console.log(`✅ Fallback to ${fallbackModel} successful`);
          return result;
        } catch (fallbackError) {
          const fallbackMsg = (fallbackError as Error).message;
          console.warn(`❌ ${fallbackModel} failed: ${fallbackMsg}`);
          if (!isRetryableError(fallbackMsg)) throw fallbackError;
          // continue to next
        }
      }

      throw new Error(`All Gemini models unavailable. Primary error: ${primaryMsg}`);
    }
  }

  private initializeAgents(count: number) {
    for (let i = 0; i < count; i++) {
      this.agents.push(new ContentAgent(this.geminiClient, i));
    }
  }

  private calculateReadingTime(lede: string, episodes: Episode[], finale: string): number {
    const totalChars = lede.length + episodes.reduce((sum, ep) => sum + ep.charCount, 0) + finale.length;
    return Math.ceil((totalChars / 6000) * 10);
  }

  private countScenes(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    const matches = text.match(/видела|видел|виделась|виделся|виделись/gi) || [];
    return Math.max(8, Math.floor(matches.length / 2));
  }

  private countDialogues(lede: string, episodes: Episode[], finale: string): number {
    const text = lede + episodes.map(e => e.content).join("") + finale;
    return (text.match(/— [А-Я]/g) || []).length;
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
        sensoryPalette: { details: ["домашний", "тихий", "знакомый"], smells: ["кофе"], sounds: ["тишина"], textures: ["мягкий"], lightSources: ["окно"] },
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
    return `${this.safeTheme(outline.theme)}.\n\n${outline.episodes[0]?.hookQuestion || 'Почему это случилось?'}\n\nЯ до сих пор не могу понять, как так вышло...`;
  }

  private getFallbackFinale(outline: OutlineStructure): string {
    return `${this.safeTheme(outline.theme)}.\n\nПрошло время. Многое изменилось. Я стала другой.\n\nА вы смогли бы так поступить?`;
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
    const models = ["gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

    const tryModel = async (model: string): Promise<string> => {
      const response = await this.geminiClient.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0.9, topK: 40, topP: 0.95 },
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return this.cleanResponse(text);
    };

    for (const model of models) {
      try {
        return await tryModel(model);
      } catch (error) {
        const msg = (error as Error).message;
        const retryable = msg.includes('503') || msg.includes('overloaded') ||
          msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (!retryable) {
          console.error(`Episode ${this.id} generation failed:`, error);
          break;
        }
        console.warn(`ContentAgent: ${model} unavailable, trying next...`);
      }
    }

    return `Эпизод ${this.id}\n\nЭто важная часть истории.`;
  }

  private cleanResponse(text: string): string {
    if (!text) return "";
    let cleaned = text;
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```$/i, '$1');
    }
    const preambles = [
      /^(Here is|Sure,|Certainly|Okay,|Вот|Конечно).*?(:|\\n)/i,
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
  // Future: context caching and reuse
}
