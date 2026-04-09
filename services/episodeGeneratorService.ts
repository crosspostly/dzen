import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import { calculateSimilarity } from "../utils/levenshtein-distance";
import { qualityGate } from "../utils/quality-gate";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";

/**
 * Episode Generator Service v7.2
 * v7.2: Full 4-model fallback chain for 429/503/UNAVAILABLE/RESOURCE_EXHAUSTED
 *       Episode #undefined guard (outline.id fallback to index+1)
 */

export interface EpisodeGeneratorOptions {
  useAntiDetection?: boolean;
  maxChars?: number;
}

// ============================================================================
// FALLBACK MODEL CHAIN
// ============================================================================
const EPISODE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
];

function isRetryable(message: string): boolean {
  return (
    message.includes('503') ||
    message.includes('overloaded') ||
    message.includes('UNAVAILABLE') ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('Empty response')
  );
}

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private phase2Service: Phase2AntiDetectionService;
  private TOTAL_BUDGET: number;
  private LEDE_BUDGET = 600;
  private FINALE_BUDGET = 1200;
  private MAX_RETRIES = 2;
  private CONTEXT_LENGTH = 1200;
  private temperature = 0.85;
  private topK = 40;
  private useAntiDetection: boolean;

  constructor(apiKey?: string, options?: EpisodeGeneratorOptions) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
    this.phase2Service = new Phase2AntiDetectionService();
    this.TOTAL_BUDGET = options?.maxChars || CHAR_BUDGET;
    this.useAntiDetection = options?.useAntiDetection ?? false;

    if (!this.useAntiDetection) {
      console.log('\uD83D\uDEAB Anti-detection DISABLED - clean generation mode');
    }
  }

  private calculateBudget(episodeCount: number) {
    const remainingBudget = this.TOTAL_BUDGET - this.LEDE_BUDGET - this.FINALE_BUDGET;
    const perEpisodeBudget = Math.floor(remainingBudget / episodeCount);
    return {
      total: this.TOTAL_BUDGET,
      lede: this.LEDE_BUDGET,
      finale: this.FINALE_BUDGET,
      perEpisode: perEpisodeBudget,
      episodeCount,
      remaining: remainingBudget,
    };
  }

  async generateEpisodesSequentially(
    episodeOutlines: EpisodeOutline[],
    options?: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number, charCount: number) => void;
      plotBible?: any;
    }
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const delay = options?.delayBetweenRequests || 1500;
    const MIN_EPISODE_SIZE = 800;

    const budget = this.calculateBudget(episodeOutlines.length);
    console.log(`\n\uD83D\uDCCA BUDGET ALLOCATION [Dynamic Episodes]:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Max episodes planned: ${episodeOutlines.length} \xD7 ${budget.perEpisode} chars each (estimated)`);
    console.log(`   Lede: ${budget.lede} | Finale: ${budget.finale}`);
    console.log(`   (Remaining for episodes: ${budget.remaining} chars)`);
    console.log(`   MIN_EPISODE_SIZE: ${MIN_EPISODE_SIZE} chars\n`);

    let charCountSoFar = 0;
    let remainingPool = budget.remaining;
    let episodeIndex = 0;

    while (remainingPool > MIN_EPISODE_SIZE && episodeIndex < episodeOutlines.length) {
      const outline = episodeOutlines[episodeIndex];
      // FIX: guard against undefined outline.id
      const safeId = outline.id ?? (episodeIndex + 1);
      const episodesLeft = episodeOutlines.length - episodeIndex;
      const charsForThisEpisode = Math.floor(remainingPool / episodesLeft);

      console.log(`\n   \uD83C\uDFAC Episode #${safeId} - Starting generation...`);
      console.log(`      Budget: ${charsForThisEpisode} chars (${remainingPool} remaining)`);

      if (charsForThisEpisode < MIN_EPISODE_SIZE) {
        console.log(`      \uD83D\uDCCA Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping...`);
        break;
      }

      try {
        let episode = await this.generateSingleEpisode(
          { ...outline, id: safeId },
          episodes,
          charsForThisEpisode,
          episodeIndex + 1,
          episodeOutlines.length,
          1,
          options?.plotBible
        );

        // Uniqueness check
        let dupAttempts = 0;
        while (dupAttempts < 3) {
          const isDuplicate = episodes.some(e =>
            calculateSimilarity(e.content, episode.content) > 0.75
          );
          if (!isDuplicate) break;
          console.log(`      \u26A0\uFE0F Episode ${episodeIndex + 1} is a duplicate, regenerating...`);
          episode = await this.generateSingleEpisode(
            { ...outline, id: safeId },
            episodes,
            charsForThisEpisode,
            episodeIndex + 1,
            episodeOutlines.length,
            dupAttempts + 2,
            options?.plotBible
          );
          dupAttempts++;
        }

        const validation = await qualityGate(episode.content, 70, 1500, episode.title);
        if (!validation.isValid) {
          console.log(`      \u26A0\uFE0F Episode ${episodeIndex + 1} quality low:`, validation.issues);
        }

        episodes.push(episode);
        remainingPool -= episode.charCount;
        charCountSoFar += episode.charCount;

        if (episode.charCount > charsForThisEpisode * 1.1) {
          console.log(`      \u26A0\uFE0F  Over budget: ${episode.charCount}/${charsForThisEpisode} chars`);
        } else {
          console.log(`      \u2705 Generated: ${episode.charCount} chars (on budget)`);
        }
        console.log(`      \uD83D\uDCCA Total so far: ${charCountSoFar}/${budget.total}`);

        if (options?.onProgress) {
          options.onProgress(episodeIndex + 1, episodeOutlines.length, charCountSoFar);
        }

        if (remainingPool < MIN_EPISODE_SIZE) {
          console.log(`\n   \uD83D\uDCCA Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping...`);
          break;
        }

        if (episodeIndex < episodeOutlines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        episodeIndex++;
      } catch (error) {
        console.error(`   \u274C Episode #${safeId} failed:`, error);
        console.log(`   \u26A0\uFE0F  Continuing with remaining episodes to avoid blocking generation`);
        episodeIndex++;
      }
    }

    const utilization = ((charCountSoFar / budget.total) * 100).toFixed(1);
    console.log(`\n\uD83D\uDD04 Dynamic episode generation:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Generated: ${episodes.length} episodes`);
    console.log(`   Used: ${charCountSoFar} chars (${utilization}%)`);
    console.log(`   Remaining: ${remainingPool} chars\n`);
    return episodes;
  }

  private loadSharedGuidelines(): string {
    let guidelines = '\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
    guidelines += '\u041E\u0411\u0429\u0418\u0415 \u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u041A\u0410\u0427\u0415\u0421\u0422\u0412\u0410:\n';
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
        console.warn(`\u26A0\uFE0F Could not read shared guideline: ${file}`);
      }
    }
    return guidelines;
  }

  /**
   * Generate single episode with full model fallback chain.
   * No useFallbackModel bool anymore - chain handled in callGemini().
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    plotBible?: any
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(
      outline,
      previousContext,
      charLimit,
      episodeNum,
      totalEpisodes,
      attempt,
      plotBible
    );

    try {
      const response = await this.callGemini({
        prompt,
        temperature: this.temperature,
      });

      let content = response.trim();

      if (content.length < charLimit * 0.7) {
        console.log(`      \u26A0\uFE0F  Too short (${content.length}/${charLimit} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        if (attempt < this.MAX_RETRIES) {
          console.log(`      \uD83D\uDD04 Retrying...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + ' (EXPAND)' },
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            attempt + 1,
            plotBible
          );
        } else {
          console.log(`      \u26A0\uFE0F  Accepting short episode: ${content.length}/${charLimit} chars`);
        }
      } else {
        console.log(`      \u2705 Episode ${episodeNum}: ${content.length} chars (perfect)`);
      }

      if (content.length > charLimit * 1.1) {
        console.log(`      \u2139\uFE0F  Oversized (${content.length}/${charLimit}), pool will adjust`);
      }

      let phase2Result = null;
      if (this.useAntiDetection) {
        console.log(`\n   \uD83D\uDCCB [Phase 2] Processing episode ${episodeNum}...`);
        phase2Result = await this.phase2Service.processEpisodeContent(
          content,
          episodeNum,
          charLimit,
          {
            applyPerplexity: true,
            applyBurstiness: true,
            applySkazNarrative: true,
            verbose: true
          }
        );
        content = phase2Result.processedContent;
      } else {
        console.log(`   \uD83D\uDEAB Skipping Phase 2 (anti-detection disabled)`);
      }

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
        stage: 'draft',
        phase2Metrics: phase2Result ? {
          adversarialScore: phase2Result.adversarialScore,
          breakdown: phase2Result.breakdown,
          modificationStats: phase2Result.modificationStats,
          suggestion: phase2Result.suggestion
        } : undefined
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`      \u274C Generation failed (attempt ${attempt}): ${errorMessage}`);
      console.log(`      \u26A0\uFE0F  Creating fallback episode to continue generation`);

      const fallbackContent = `${outline.hookQuestion}\n\n${outline.externalConflict}. \u042F \u043F\u043E\u043C\u043D\u044E \u044D\u0442\u043E\u0442 \u043C\u043E\u043C\u0435\u043D\u0442 \u0442\u0430\u043A, \u0431\u0443\u0434\u0442\u043E \u043E\u043D \u0431\u044B\u043B \u0432\u0447\u0435\u0440\u0430.\n\n${outline.internalConflict}. \u042D\u0442\u043E \u0447\u0443\u0432\u0441\u0442\u0432\u043E \u043D\u0435 \u043F\u043E\u043A\u0438\u0434\u0430\u043B\u043E \u043C\u0435\u043D\u044F \u0434\u043E\u043B\u0433\u043E\u0435 \u0432\u0440\u0435\u043C\u044F.\n\n${outline.keyTurning}. \u0412 \u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u0432\u0441\u0451 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C.\n\n${outline.openLoop}...`;

      return {
        id: outline.id,
        title: `\u042D\u043F\u0438\u0437\u043E\u0434 ${outline.id}`,
        content: fallbackContent,
        charCount: fallbackContent.length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: 'fallback',
        phase2Metrics: undefined
      };
    }
  }

  private buildPrompt(
    outline: EpisodeOutline,
    previousContext: string,
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    plotBible?: any
  ): string {
    const retryNote = attempt > 1 ? `\n\u26A0\uFE0F  \u041F\u0415\u0420\u0415\u0413\u0415\u041D\u0415\u0420\u0410\u0426\u0418\u042F #${attempt} - \u0443\u043B\u0443\u0447\u0448\u0438 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E\n` : '';
    const minChars = Math.floor(charLimit * 0.75);
    const maxChars = charLimit;
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    let basePrompt = '';
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'stage-1-episodes.md');
      basePrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch (e) {
      basePrompt = '\u041D\u0430\u043F\u0438\u0448\u0438 \u0445\u0443\u0434\u043E\u0436\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u044D\u043F\u0438\u0437\u043E\u0434 \u043E\u0442 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u043B\u0438\u0446\u0430.';
    }

    const guidelines = this.loadSharedGuidelines();

    return `${basePrompt}

${guidelines}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\u0421\u042E\u0416\u0415\u0422 \u042D\u041F\u0418\u0417\u041E\u0414\u0410 #${outline.id}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u0412\u043E\u043F\u0440\u043E\u0441, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043C\u0443\u0447\u0430\u0435\u0442 \u0433\u0435\u0440\u043E\u0438\u043D\u044E: "${outline.hookQuestion}"

\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442: ${outline.externalConflict}
\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442: ${outline.internalConflict}
\u041F\u043E\u0432\u043E\u0440\u043E\u0442\u043D\u044B\u0439 \u043C\u043E\u043C\u0435\u043D\u0442: ${outline.keyTurning}
\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0432\u043E\u043F\u0440\u043E\u0441 \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u044D\u043F\u0438\u0437\u043E\u0434\u0430: "${outline.openLoop}"

${previousContext ? `\u041F\u0420\u041E\u0414\u041E\u041B\u0416\u0415\u041D\u0418\u0415 \u0418\u0421\u0422\u041E\u0420\u0418\u0418:\n${previousContext}\n\n\u041D\u0430\u0447\u0438\u043D\u0430\u0439 \u0421\u0420\u0410\u0417\u0423 \u0441 \u043D\u043E\u0432\u043E\u0433\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438\u043B\u0438 \u0434\u0438\u0430\u043B\u043E\u0433\u0430. \u041D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0439 \u043A\u043E\u043D\u0446\u043E\u0432\u043A\u0443 \u0432\u044B\u0448\u0435.` : '\u041D\u0410\u0427\u0410\u041B\u041E \u0418\u0421\u0422\u041E\u0420\u0418\u0418:'}

${plotBibleSection}

\u0422\u0415\u0425\u041D\u0418\u0427\u0415\u0421\u041A\u0418\u0415 \u0422\u0420\u0415\u0411\u041E\u0412\u0410\u041D\u0418\u042F:
\u041E\u0431\u044A\u0451\u043C: ${minChars}-${maxChars} \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432
${retryNote}
\u0412\u042B\u0412\u041E\u0414: \u0422\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442 \u044D\u043F\u0438\u0437\u043E\u0434\u0430. \u0411\u0435\u0437 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432. \u0411\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0439.
\u041F\u0438\u0448\u0438 \u0442\u0430\u043A, \u0431\u0443\u0434\u0442\u043E \u0440\u0430\u0441\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0448\u044C \u043B\u0443\u0447\u0448\u0435\u0439 \u043F\u043E\u0434\u0440\u0443\u0433\u0435 \u0432 3 \u0447\u0430\u0441\u0430 \u043D\u043E\u0447\u0438.

\u041D\u0430\u043F\u0438\u0448\u0438 \u0441\u0435\u0439\u0447\u0430\u0441.`;
  }

  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return '';
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    if (lastEpisode.content.length <= this.CONTEXT_LENGTH) return lastEpisode.content;
    return lastEpisode.content.slice(-this.CONTEXT_LENGTH);
  }

  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) return '';
    const narrator = plotBible.narrator;
    const sensory = plotBible.sensoryPalette;
    const thematic = plotBible.thematicCore;
    let section = '';
    if (narrator) {
      section += `\n\uD83D\uDCD6 \u0413\u041E\u041B\u041E\u0421 \u0420\u0410\u0421\u0421\u041A\u0410\u0417\u0427\u0418\u041A\u0410 (${narrator.age || '40-50'} \u043B\u0435\u0442, ${narrator.tone || '\u0438\u0441\u043F\u043E\u0432\u0435\u0434\u0430\u043B\u044C\u043D\u044B\u0439'})`;
      if (narrator.voiceHabits?.doubtPattern) section += `\n   \u041F\u0440\u0438 \u0441\u043E\u043C\u043D\u0435\u043D\u0438\u0438: "${narrator.voiceHabits.doubtPattern}"`;
      if (narrator.voiceHabits?.memoryTrigger) section += `\n   \u0422\u0440\u0438\u0433\u0433\u0435\u0440 \u043F\u0430\u043C\u044F\u0442\u0438: "${narrator.voiceHabits.memoryTrigger}"`;
      if (narrator.voiceHabits?.angerPattern) section += `\n   \u041F\u0440\u0438 \u0433\u043D\u0435\u0432\u0435: "${narrator.voiceHabits.angerPattern}"`;
    }
    if (sensory) {
      section += `\n\uD83C\uDFA8 \u0421\u0415\u041D\u0421\u041E\u0420\u041D\u0410\u042F \u041F\u0410\u041B\u0418\u0422\u0420\u0410:`;
      if (sensory.details?.length > 0) section += `\n   \u0417\u0440\u0435\u043D\u0438\u0435: ${sensory.details.slice(0, 3).join(', ')}`;
      if (sensory.smells?.length > 0) section += `\n   \u0417\u0430\u043F\u0430\u0445\u0438: ${sensory.smells.slice(0, 2).join(', ')}`;
      if (sensory.sounds?.length > 0) section += `\n   \u0417\u0432\u0443\u043A\u0438: ${sensory.sounds.slice(0, 2).join(', ')}`;
      if (sensory.textures?.length > 0) section += `\n   \u041E\u0441\u044F\u0437\u0430\u043D\u0438\u0435: ${sensory.textures.slice(0, 2).join(', ')}`;
    }
    if (thematic) {
      section += `\n\uD83C\uDFAF \u0422\u0415\u041C\u0410\u0422\u0418\u0427\u0415\u0421\u041A\u041E\u0415 \u042F\u0414\u0420\u041E:`;
      if (thematic.centralQuestion) section += `\n   \u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0432\u043E\u043F\u0440\u043E\u0441: "${thematic.centralQuestion}"`;
      if (thematic.emotionalArc) section += `\n   \u042D\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u0443\u0433\u0430: ${thematic.emotionalArc}`;
    }
    return section;
  }

  /**
   * Call Gemini with full 4-model fallback chain.
   * Retries on 503 / UNAVAILABLE / 429 / RESOURCE_EXHAUSTED / Empty response.
   */
  private async callGemini(params: {
    prompt: string;
    temperature: number;
  }): Promise<string> {
    const tryModel = async (model: string): Promise<string> => {
      const response = await this.geminiClient.models.generateContent({
        model,
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: this.topK,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') throw new Error('Empty response from Gemini');
      return text;
    };

    for (const model of EPISODE_MODELS) {
      try {
        const result = await tryModel(model);
        return result;
      } catch (error) {
        const msg = (error as Error).message;
        console.error(`\u274C Gemini API error: ${msg}`);
        if (!isRetryable(msg)) throw error;
        console.log(`\uD83D\uDCC1 Trying next model after: ${model}...`);
        // small pause before next model
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('All Gemini models unavailable for episode generation');
  }
}

export default EpisodeGeneratorService;
