import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';
import * as path from 'path';
import { calculateSimilarity } from "../utils/levenshtein-distance";
import { qualityGate } from "../utils/quality-gate";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";
import { MODELS } from "../constants/MODELS_CONFIG";

/**
 * 🎬 Episode Generator Service v7.1 (CLEAN GENERATION)
 */
export interface EpisodeGeneratorOptions {
  useAntiDetection?: boolean; 
  maxChars?: number;
}

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenerativeAI;
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
    this.geminiClient = new GoogleGenerativeAI(key);
    this.titleGenerator = new EpisodeTitleGenerator(key);
    this.phase2Service = new Phase2AntiDetectionService();
    this.TOTAL_BUDGET = options?.maxChars || CHAR_BUDGET;
    this.useAntiDetection = options?.useAntiDetection ?? false; 
    
    if (!this.useAntiDetection) {
      console.log('🚫 Anti-detection DISABLED - clean generation mode');
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
      episodeCount: episodeCount,
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
    console.log(`\n📊 BUDGET ALLOCATION:`);
    console.log(`   Total budget: ${budget.total} chars`);
    
    let charCountSoFar = 0;
    let remainingPool = budget.remaining;
    let episodeIndex = 0;

    while (remainingPool > MIN_EPISODE_SIZE && episodeIndex < episodeOutlines.length) {
      const outline = episodeOutlines[episodeIndex];
      const episodesLeft = episodeOutlines.length - episodeIndex;
      const charsForThisEpisode = Math.floor(remainingPool / episodesLeft);
      const currentEpisodeId = outline.id || (episodeIndex + 1);
      
      try {
        let episode = await this.generateSingleEpisode(
          outline, 
          episodes,
          charsForThisEpisode,
          episodeIndex + 1,
          episodeOutlines.length,
          1,
          false,
          options?.plotBible
        );

        let attempts = 0;
        while (attempts < 3) {
          const isDuplicate = episodes.some(e => 
            calculateSimilarity(e.content, episode.content) > 0.75
          );
          
          if (isDuplicate) {
            episode = await this.generateSingleEpisode(
              outline, 
              episodes,
              charsForThisEpisode,
              episodeIndex + 1,
              episodeOutlines.length,
              attempts + 2,
              false,
              options?.plotBible
            );
            attempts++;
          } else {
            break;
          }
        }

        episodes.push(episode);
        remainingPool -= episode.charCount;
        charCountSoFar += episode.charCount;
        
        if (options?.onProgress) {
          options.onProgress(episodeIndex + 1, episodeOutlines.length, charCountSoFar);
        }
        
        if (episodeIndex < episodeOutlines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        episodeIndex++;
      } catch (error) {
        console.error(`   ❌ Episode #${outline.id} failed:`, error);
        episodeIndex++;
      }
    }
    return episodes;
  }

  private loadSharedGuidelines(): string {
    let guidelines = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    guidelines += 'ОБЩИЕ ПРАВИЛА КАЧЕСТВА:\n';
    const files = ['shared/voice-guidelines.md', 'shared/anti-detect.md', 'shared/archetype-rules.md', 'shared/quality-gates.md'];
    for (const file of files) {
      try {
        const filePath = path.join(process.cwd(), 'prompts', file);
        if (fs.existsSync(filePath)) {
          guidelines += fs.readFileSync(filePath, 'utf-8') + '\n';
        }
      } catch (e) {}
    }
    return guidelines;
  }

  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    useFallbackModel: boolean = false,
    plotBible?: any
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(outline, previousContext, charLimit, episodeNum, totalEpisodes, attempt, plotBible);
    const modelName = useFallbackModel ? "gemini-2.5-flash" : "gemini-3.1-pro-preview";

    try {
      const response = await this.callGemini({
        prompt,
        model: modelName,
        temperature: this.temperature,
      });

      let content = response.trim();
      
      let phase2Result = null;
      if (this.useAntiDetection) {
        phase2Result = await this.phase2Service.processEpisodeContent(content, episodeNum, charLimit, {
          applyPerplexity: true,
          applyBurstiness: true,
          applySkazNarrative: true,
          verbose: true
        });
        content = phase2Result.processedContent;
      }

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
        phase2Metrics: phase2Result ? {
          adversarialScore: phase2Result.adversarialScore,
          breakdown: phase2Result.breakdown,
          modificationStats: phase2Result.modificationStats,
          suggestion: phase2Result.suggestion
        } : undefined
      };
    } catch (error) {
      console.error(`      ❌ Generation failed (attempt ${attempt}):`, (error as Error).message);
      const fallbackContent = `${outline.hookQuestion}\n\n${outline.externalConflict}. Я помню этот момент.\n\n${outline.internalConflict}.\n\n${outline.openLoop}...`;
      return {
        id: outline.id, title: `Эпизод ${outline.id}`, content: fallbackContent, charCount: fallbackContent.length,
        openLoop: outline.openLoop, turnPoints: [outline.keyTurning], emotions: [outline.internalConflict],
        keyScenes: [], characters: [], generatedAt: Date.now(), stage: "fallback", phase2Metrics: undefined
      };
    }
  }

  private buildPrompt(outline: EpisodeOutline, previousContext: string, charLimit: number, episodeNum: number, totalEpisodes: number, attempt: number, plotBible: any): string {
    const minChars = Math.floor(charLimit * 0.75);
    const plotBibleSection = this.buildPlotBibleSection(plotBible);
    let basePrompt = '';
    try {
      basePrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'stage-1-episodes.md'), 'utf-8');
    } catch (e) {
      basePrompt = 'Напиши художественный эпизод от первого лица.';
    }
    const guidelines = this.loadSharedGuidelines();
    return `${basePrompt}\n\n${guidelines}\n\nЭПИЗОД #${outline.id}\nВопрос: ${outline.hookQuestion}\n${plotBibleSection}\n\nКОНТЕКСТ:\n${previousContext}\n\nОбъём: ${minChars}-${charLimit} символов.`;
  }

  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return "";
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    return lastEpisode.content.slice(-this.CONTEXT_LENGTH);
  }

  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) return '';
    const narrator = plotBible.narrator;
    return `\n📖 ГОЛОС РАССКАЗЧИКА (${narrator?.age || '40-50'} лет, ${narrator?.tone || 'исповедальный'})`;
  }

  private async callGemini(params: { prompt: string; model: string; temperature: number }): Promise<string> {
    const { prompt, temperature, model } = params;
    const genModel = this.geminiClient.getGenerativeModel({ 
      model: model,
      generationConfig: { temperature, topK: this.topK, topP: 0.95, maxOutputTokens: 8192 }
    });
    const result = await genModel.generateContent(prompt);
    return result.response.text();
  }
}

export default EpisodeGeneratorService;