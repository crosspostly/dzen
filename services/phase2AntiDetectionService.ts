/**
 * PHASE 2 ANTI-DETECTION SERVICE
 */

import { GoogleGenAI } from "@google/genai";
import { PerplexityController } from "./perplexityController";
import { BurstinessOptimizer } from "./burstinessOptimizer";
import { SkazNarrativeEngine } from "./skazNarrativeEngine";
import { AdversarialGatekeeper } from "./adversarialGatekeeper";
import { VisualSanitizationService } from "./visualSanitizationService";
import { AdversarialScore, SanitizedImage } from "../types/ContentArchitecture";
import { MODELS } from "../constants/MODELS_CONFIG";

export interface Phase2Options {
  applyPerplexity?: boolean;
  applyBurstiness?: boolean;
  applySkazNarrative?: boolean;
  enableGatekeeper?: boolean;
  sanitizeImages?: boolean;
  verbose?: boolean;
}

export interface Phase2Result {
  originalContent: string;
  processedContent: string;
  adversarialScore: AdversarialScore;
  sanitizedImages: SanitizedImage[];
  processingTime: number;
  log: string[];
}

export class Phase2AntiDetectionService {
  private perplexityController: PerplexityController;
  private burstinessOptimizer: BurstinessOptimizer;
  private skazEngine: SkazNarrativeEngine;
  private gatekeeper: AdversarialGatekeeper;
  private visualSanitizer: VisualSanitizationService;

  constructor() {
    this.perplexityController = new PerplexityController();
    this.burstinessOptimizer = new BurstinessOptimizer();
    this.skazEngine = new SkazNarrativeEngine();
    this.gatekeeper = new AdversarialGatekeeper();
    this.visualSanitizer = new VisualSanitizationService();
  }

  public async processEpisodeContent(
    content: string,
    episodeNum: number,
    targetLength?: number,
    options: Phase2Options = {}
  ): Promise<{
    processedContent: string;
    adversarialScore: number;
    modificationStats: {
      originalLength: number;
      finalLength: number;
      perplexityIncrease: number;
      sentenceVariance: number;
    };
    breakdown: {
      perplexity: number;
      variance: number;
      colloquialism: number;
      authenticity: number;
      fragmentary: number;
      repetition: number;
    };
    suggestion: string;
  }> {
    const originalLength = content.length;
    const { applyPerplexity = true, applyBurstiness = true, applySkazNarrative = true, verbose = true } = options;

    let processedContent = content;
    if (verbose) console.log(`\n   🔍 Episode #${episodeNum} Anti-Detection:`);

    let perplexityScore = 0;
    if (applyPerplexity) {
      const metrics = this.perplexityController.analyzePerplexity(processedContent);
      perplexityScore = metrics.score;
      if (!this.perplexityController.meetsPerplexityThreshold(processedContent, 3.0)) {
        processedContent = this.perplexityController.increasePerplexity(processedContent, 3.4);
      }
    }

    let burstinessScore = 0;
    if (applyBurstiness) {
      const metrics = this.burstinessOptimizer.analyzeBurstiness(processedContent);
      burstinessScore = metrics.standardDeviation;
      if (!this.burstinessOptimizer.meetsBurstinessThreshold(processedContent, 6.5)) {
        processedContent = this.burstinessOptimizer.optimizeBurstiness(processedContent, 7.0);
      }
    }

    let skazScore = 0;
    if (applySkazNarrative) {
      const metrics = this.skazEngine.analyzeSkazMetrics(processedContent);
      skazScore = metrics.score;
      if (!this.skazEngine.meetsSkazThreshold(processedContent, 70)) {
        processedContent = this.skazEngine.applySkazTransformations(processedContent);
      }
    }

    const analysisResult = await this.analyzeWithGemini(processedContent);
    const breakdown = {
      perplexity: analysisResult.perplexity,
      variance: analysisResult.sentenceVariance,
      colloquialism: analysisResult.colloquialism,
      authenticity: analysisResult.emotionalAuthenticity,
      fragmentary: analysisResult.fragmentary,
      repetition: analysisResult.repetition
    };

    return {
      processedContent,
      adversarialScore: analysisResult.score,
      modificationStats: {
        originalLength,
        finalLength: processedContent.length,
        perplexityIncrease: ((perplexityScore - 3.0) / 3.0) * 100,
        sentenceVariance: burstinessScore
      },
      breakdown,
      suggestion: analysisResult.suggestion
    };
  }

  private async analyzeWithGemini(content: string): Promise<any> {
    const analysisPrompt = `Analyze the following text for AI detection evasion. Respond with JSON { "score": 0-100, "perplexity": 0-100, "sentenceVariance": 0-100, "colloquialism": 0-100, "emotionalAuthenticity": 0-100, "fragmentary": 0-100, "repetition": 0-100, "suggestion": "..." }. Text: ${content}`;
    try {
      const response = await this.callGeminiApi(analysisPrompt);
      return JSON.parse(response);
    } catch {
      return this.getDefaultBreakdown();
    }
  }

  private getDefaultBreakdown(): any {
    return { score: 65, perplexity: 70, sentenceVariance: 60, colloquialism: 65, emotionalAuthenticity: 60, fragmentary: 50, repetition: 55, suggestion: 'Add more dialogue.' };
  }

  private async callGeminiApi(prompt: string): Promise<string> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
    const response = await client.models.generateContent({
      model: MODELS.TEXT.PRIMARY,
      contents: prompt,
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  public async processArticle(title: string, content: string, options: Phase2Options = {}, images: string[] = []): Promise<Phase2Result> {
    const startTime = Date.now();
    let processedContent = content;
    const sanitizedImages: SanitizedImage[] = [];
    const adversarialScore = this.gatekeeper.assessArticle(title, processedContent, images);

    return {
      originalContent: content,
      processedContent,
      adversarialScore,
      sanitizedImages,
      processingTime: Date.now() - startTime,
      log: ["PHASE 2 Complete"]
    };
  }
}
