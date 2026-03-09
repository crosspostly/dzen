/**
 * PHASE 2 ANTI-DETECTION SERVICE
 * 
 * Status: Future Implementation (v4.5, Dec 22-23, 2025)
 * Purpose: Anti-detection system to make content appear more human-written
 * Current Status: Not used in v4.0.2, planned for Phase 2
 * 
 * Integration: Will be wired into main pipeline in v4.5
 * Dependencies: ContentSanitizer, qualityValidator
 * 
 * Targets:
 * - ZeroGPT detection: <15%
 * - Originality.ai detection: <20%
 * 
 * See: ZENMASTER_COMPLETE_ROADMAP.md for details
 */

import { GoogleGenAI } from "@google/genai";
import { PerplexityController } from "./perplexityController";
import { BurstinessOptimizer } from "./burstinessOptimizer";
import { SkazNarrativeEngine } from "./skazNarrativeEngine";
import { AdversarialGatekeeper } from "./adversarialGatekeeper";
import { VisualSanitizationService } from "./visualSanitizationService";
import { AdversarialScore, SanitizedImage } from "../types/ContentArchitecture";

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

  /**
   * 🆕 PHASE 2 PER-EPISODE: Process single episode content
   * Returns detailed metrics for per-episode tracking
   * 
   * v5.2 CRITICAL FIX:
   * - Calls Gemini API for adversarial score analysis
   * - Validates JSON parsing with fallback values
   * - Trims by sentences instead of refining (no extra API calls)
   * - Improved suggestion prompts for specific feedback
   */
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
      fragmentary: number;      // 🆕 v5.2: Fragmentary sentences
      repetition: number;        // 🆕 v5.2: Natural repetition
    };
    suggestion: string;
  }> {
    const startTime = Date.now();
    const originalLength = content.length;
    
    // Устанавливаем значения по умолчанию
    const {
      applyPerplexity = true,
      applyBurstiness = true,
      applySkazNarrative = true,
      verbose = true,
    } = options;

    let processedContent = content;
    
    if (verbose) {
      console.log(`\n   🔍 Episode #${episodeNum} Anti-Detection:`);
      console.log(`      Original: ${originalLength} chars`);
    }

    // Этап 1: PerplexityController
    let perplexityScore = 0;
    if (applyPerplexity) {
      const metrics = this.perplexityController.analyzePerplexity(processedContent);
      perplexityScore = metrics.score;
      
      if (!this.perplexityController.meetsPerplexityThreshold(processedContent, 3.0)) {
        processedContent = this.perplexityController.increasePerplexity(processedContent, 3.4);
      }
    }

    // Этап 2: BurstinessOptimizer
    let burstinessScore = 0;
    if (applyBurstiness) {
      const metrics = this.burstinessOptimizer.analyzeBurstiness(processedContent);
      burstinessScore = metrics.standardDeviation;
      
      if (!this.burstinessOptimizer.meetsBurstinessThreshold(processedContent, 6.5)) {
        processedContent = this.burstinessOptimizer.optimizeBurstiness(processedContent, 7.0);
      }
    }

    // Этап 3: SkazNarrativeEngine
    let skazScore = 0;
    if (applySkazNarrative) {
      const metrics = this.skazEngine.analyzeSkazMetrics(processedContent);
      skazScore = metrics.score;
      
      if (!this.skazEngine.meetsSkazThreshold(processedContent, 70)) {
        processedContent = this.skazEngine.applySkazTransformations(processedContent);
      }
    }

    let finalLength = processedContent.length;
    
    // ✅ BUG FIX #2: TRIM BY SENTENCES (instead of refining)
    if (targetLength && finalLength > targetLength * 1.15) {
      if (verbose) {
        console.log(`      ⚠️  Content exceeds target (${finalLength} > ${targetLength}), trimming by sentences...`);
      }
      
      // Split by sentence boundaries
      const sentences = processedContent
        .split(/([.!?]+)/)
        .reduce((acc: string[], part, i, arr) => {
          if (i % 2 === 0) {
            return [...acc, part];
          } else {
            return acc.length > 0 ? [...acc.slice(0, -1), acc[acc.length - 1] + part] : acc;
          }
        }, [])
        .filter((s: string) => s.trim().length > 0);
      
      let trimmed = '';
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const candidate = trimmed ? trimmed + ' ' + sentence : sentence;
        
        // Stop if adding this sentence exceeds 95% of target
        if (candidate.length > targetLength * 0.95) {
          break;
        }
        
        trimmed = candidate;
      }
      
      // Ensure ends with period
      processedContent = trimmed.trim();
      if (!processedContent.endsWith('.') && !processedContent.endsWith('!') && !processedContent.endsWith('?')) {
        processedContent += '.';
      }
      
      finalLength = processedContent.length;
      if (verbose) {
        console.log(`      ✅ Trimmed to ${finalLength} chars (target was ${targetLength})`);
      }
    }
    
    // ✅ BUG FIX #1: CALL GEMINI API FOR ADVERSARIAL SCORE WITH VALIDATION
    const analysisResult = await this.analyzeWithGemini(processedContent);
    
    // Calculate breakdown scores (6 metrics)
    const breakdown = {
      perplexity: analysisResult.perplexity,
      variance: analysisResult.sentenceVariance,
      colloquialism: analysisResult.colloquialism,
      authenticity: analysisResult.emotionalAuthenticity,
      fragmentary: analysisResult.fragmentary,
      repetition: analysisResult.repetition
    };
    
    // Overall adversarial score
    const adversarialScore = analysisResult.score;
    const suggestion = analysisResult.suggestion;
    
    // Calculate metrics for modificationStats
    const perplexityIncrease = ((perplexityScore - 3.0) / 3.0) * 100;
    const sentenceVariance = burstinessScore;
    
    // ✅ STRUCTURED LOGGING WITH VISUAL INDICATORS (6 metrics)
    if (verbose) {
      const scoreEmoji = adversarialScore >= 80 ? '✅' : adversarialScore >= 60 ? '⚠️ ' : '❌';
      const scoreBar = this.getScoreBar(adversarialScore);
      
      console.log(`\n   ${scoreEmoji} Episode #${episodeNum} Phase 2 Analysis Complete:`);
      console.log(`      Score: ${adversarialScore}/100 ${scoreBar}`);
      console.log(``);
      console.log(`      Breakdown (6 metrics):`);
      console.log(`      - Perplexity: ${breakdown.perplexity}/100 ${breakdown.perplexity >= 75 ? '✓' : '⚠️'}`);
      console.log(`      - Sentence Variance: ${breakdown.variance}/100 ${breakdown.variance >= 70 ? '✓' : '⚠️'}`);
      console.log(`      - Colloquialism: ${breakdown.colloquialism}/100 ${breakdown.colloquialism >= 75 ? '✓' : '⚠️'}`);
      console.log(`      - Emotional Authenticity: ${breakdown.authenticity}/100 ${breakdown.authenticity >= 70 ? '✓' : '⚠️'}`);
      console.log(`      - Fragmentary: ${breakdown.fragmentary}/100 ${breakdown.fragmentary >= 50 ? '✓' : '⚠️'}`);
      console.log(`      - Repetition: ${breakdown.repetition}/100 ${breakdown.repetition >= 50 ? '✓' : '⚠️'}`);
      console.log(``);
      console.log(`      💡 Suggestion: ${suggestion}`);
      console.log(``);
      console.log(`      Content: ${originalLength} chars → ${finalLength} chars`);
    }

    return {
      processedContent,
      adversarialScore,
      modificationStats: {
        originalLength,
        finalLength,
        perplexityIncrease,
        sentenceVariance
      },
      breakdown,
      suggestion
    };
  }

  /**
   * ✅ CALL GEMINI API FOR ADVERSARIAL SCORE ANALYSIS
   * With JSON validation and fallback values
   * 🆕 v5.2: Now returns 6 metrics (added fragmentary, repetition)
   */
  private async analyzeWithGemini(content: string): Promise<{
    score: number;
    perplexity: number;
    sentenceVariance: number;
    colloquialism: number;
    emotionalAuthenticity: number;
    fragmentary: number;        // 🆕 v5.2
    repetition: number;          // 🆕 v5.2
    suggestion: string;
  }> {
    // ✅ EXPLICIT NUMERIC TYPE REQUIREMENT IN PROMPT
    const analysisPrompt = `Analyze the following text for AI detection evasion characteristics. 
    Respond with VALID JSON ONLY (no markdown, no explanations, just JSON):

{
  "score": <INTEGER 0-100>,
  "perplexity": <INTEGER 0-100>,
  "sentenceVariance": <INTEGER 0-100>,
  "colloquialism": <INTEGER 0-100>,
  "emotionalAuthenticity": <INTEGER 0-100>,
  "fragmentary": <INTEGER 0-100>,
  "repetition": <INTEGER 0-100>,
  "suggestion": "SPECIFIC, actionable advice based on weakest areas"
}

Guidelines for scoring (6 metrics):
- score: Overall adversarial score (0=obvious AI, 100=completely human)
- perplexity: Word choice entropy and rarity (0=common words, 100=rare/varied vocabulary)
- sentenceVariance: Sentence length variation (0=monotonous, 100=highly varied)
- colloquialism: Use of natural speech patterns (0=formal/academic, 100=very conversational)
- emotionalAuthenticity: Emotional depth and authenticity (0=robotic, 100=deeply human)
- fragmentary: Incomplete thoughts, fragmented sentences like natural speech (0=perfect sentences, 100=lots of fragments)
- repetition: Natural repetition of words/phrases like memory patterns (0=no repetition, 100=natural echo)

For suggestion: Identify the WEAKEST metric and provide SPECIFIC improvements.
Example good suggestions:
- "Paragraph 3 uses 'данная ситуация' which sounds academic. Replace with 'это было совсем...' for more casual tone."
- "Sentences 2-4 are all 18-20 words. Break one into 6-8 words for more varied rhythm."
- "Add an emotional reaction in paragraph 2 - reader needs to feel the character's shock or pain here."
- "All sentences are complete. Add 1-2 fragments like 'Не знаю.' or 'Не могла...' for authenticity."
- "No word repetition. People remembering events naturally repeat key words - add some echoes."

Text to analyze:
${content}`;

    try {
      const response = await this.callGeminiApi(analysisPrompt);
      
      // ✅ PARSE JSON WITH ERROR HANDLING
      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch (parseError) {
        console.error(`❌ JSON parse failed. Response (first 300 chars):`, response.substring(0, 300));
        return this.getDefaultBreakdown();
      }
      
      // ✅ VALIDATE EACH FIELD AS NUMBER (6 metrics)
      const score = this.validateNumber(parsed.score, 'score', 0, 100, 65);
      const perplexity = this.validateNumber(parsed.perplexity, 'perplexity', 0, 100, 70);
      const sentenceVariance = this.validateNumber(parsed.sentenceVariance, 'sentenceVariance', 0, 100, 60);
      const colloquialism = this.validateNumber(parsed.colloquialism, 'colloquialism', 0, 100, 65);
      const emotionalAuthenticity = this.validateNumber(parsed.emotionalAuthenticity, 'emotionalAuthenticity', 0, 100, 60);
      const fragmentary = this.validateNumber(parsed.fragmentary, 'fragmentary', 0, 100, 50);        // 🆕 v5.2
      const repetition = this.validateNumber(parsed.repetition, 'repetition', 0, 100, 55);            // 🆕 v5.2
      const suggestion = typeof parsed.suggestion === 'string' && parsed.suggestion.trim().length > 0 
        ? parsed.suggestion 
        : 'Add more emotional depth and natural conversational tone.';
      
      return {
        score,
        perplexity,
        sentenceVariance,
        colloquialism,
        emotionalAuthenticity,
        fragmentary,
        repetition,
        suggestion
      };
    } catch (error) {
      console.error(`❌ Gemini API error:`, (error as Error).message);
      return this.getDefaultBreakdown();
    }
  }

  /**
   * ✅ VALIDATE NUMBER FIELD (not NaN, within range)
   */
  private validateNumber(
    value: any,
    fieldName: string,
    min: number,
    max: number,
    defaultValue: number
  ): number {
    // Check if it's a valid number
    if (typeof value !== 'number' || isNaN(value)) {
      console.warn(`⚠️  ${fieldName} is not a valid number (got ${typeof value}: ${value}), using default: ${defaultValue}`);
      return defaultValue;
    }
    
    // Clamp to range
    if (value < min || value > max) {
      console.warn(`⚠️  ${fieldName} out of range [${min}-${max}] (got ${value}), clamping...`);
      return Math.max(min, Math.min(max, value));
    }
    
    return value;
  }

  /**
   * ✅ VISUAL PROGRESS BAR
   */
  private getScoreBar(score: number): string {
    const filled = Math.floor(score / 10);
    const empty = 10 - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * ✅ FALLBACK VALUES FOR ERROR CASES
   * 🆕 v5.2: Now includes 6 metrics
   */
  private getDefaultBreakdown(): {
    score: number;
    perplexity: number;
    sentenceVariance: number;
    colloquialism: number;
    emotionalAuthenticity: number;
    fragmentary: number;
    repetition: number;
    suggestion: string;
  } {
    console.warn(`⚠️  Returning default Phase 2 breakdown due to API error`);
    return {
      score: 65,
      perplexity: 70,
      sentenceVariance: 60,
      colloquialism: 65,
      emotionalAuthenticity: 60,
      fragmentary: 50,          // 🆕 v5.2
      repetition: 55,           // 🆕 v5.2
      suggestion: 'Could not analyze due to API error. Default suggestion: Add more dialogue and personal emotional reactions to enhance authenticity.'
    };
  }

  /**
   * ✅ CALL GEMINI API (helper method)
   */
  private async callGeminiApi(prompt: string): Promise<string> {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      console.warn(
        '⚠️  Phase2AntiDetectionService.callGeminiApi: empty/invalid text from Gemini:',
        JSON.stringify(response).substring(0, 500)
      );
      return '';
    }

    return text.trim();
  }

  /**
   * Главный метод: обрабатывает статью через все компоненты Phase 2
   */
  public async processArticle(
    title: string,
    content: string,
    options: Phase2Options = {},
    images: string[] = []
  ): Promise<Phase2Result> {
    const startTime = Date.now();
    const log: string[] = [];

    // Устанавливаем значения по умолчанию
    const {
      applyPerplexity = true,
      applyBurstiness = true,
      applySkazNarrative = true,
      enableGatekeeper = true,
      sanitizeImages = true,
      verbose = true,
    } = options;

    let processedContent = content;
    const sanitizedImages: SanitizedImage[] = [];

    log.push("🚀 PHASE 2 ANTI-DETECTION SERVICE");
    log.push("════════════════════════════════════════");
    log.push("");

    // Этап 1: PerplexityController
    if (applyPerplexity) {
      log.push("📈 STAGE 1: Perplexity Enhancement");
      const metrics = this.perplexityController.analyzePerplexity(processedContent);
      log.push(`   Current perplexity score: ${metrics.score.toFixed(2)}`);
      log.push(`   Rarity ratio: ${(metrics.rarityRatio * 100).toFixed(1)}%`);

      if (!this.perplexityController.meetsPerplexityThreshold(processedContent, 3.0)) {
        processedContent = this.perplexityController.increasePerplexity(processedContent, 3.4);
        log.push(`   ✅ Applied rare synonym substitution`);
      } else {
        log.push(`   ✅ Perplexity already sufficient`);
      }
      log.push("");
    }

    // Этап 2: BurstinessOptimizer
    if (applyBurstiness) {
      log.push("📊 STAGE 2: Burstiness Optimization");
      const metrics = this.burstinessOptimizer.analyzeBurstiness(processedContent);
      log.push(`   Current sentence length StdDev: ${metrics.standardDeviation.toFixed(2)}`);
      log.push(`   Distribution: ${metrics.distribution}`);

      if (!this.burstinessOptimizer.meetsBurstinessThreshold(processedContent, 6.5)) {
        processedContent = this.burstinessOptimizer.optimizeBurstiness(processedContent, 7.0);
        log.push(`   ✅ Applied SPLIT/MERGE sentence transformations`);
      } else {
        log.push(`   ✅ Burstiness already sufficient`);
      }
      log.push("");
    }

    // Этап 3: SkazNarrativeEngine
    if (applySkazNarrative) {
      log.push("🎭 STAGE 3: Skaz Narrative Enhancement");
      const metrics = this.skazEngine.analyzeSkazMetrics(processedContent);
      log.push(`   Particle count: ${metrics.particleCount}`);
      log.push(`   Syntactic dislocations: ${metrics.syntaxDislocations}`);
      log.push(`   Dialectal words: ${metrics.dialectalWords}`);
      log.push(`   Skaz score: ${metrics.score}/100`);

      if (!this.skazEngine.meetsSkazThreshold(processedContent, 70)) {
        processedContent = this.skazEngine.applySkazTransformations(processedContent);
        log.push(`   ✅ Applied Skaz narrative transformations`);
      } else {
        log.push(`   ✅ Skaz narrative already sufficient`);
      }
      log.push("");
    }

    // Этап 4: Sanitize Images
    if (sanitizeImages && images.length > 0) {
      log.push("🖼️  STAGE 4: Visual Sanitization");
      log.push(`   Processing ${images.length} image(s)...`);

      for (const imagePath of images) {
        const result = this.visualSanitizer.sanitizeImage(imagePath);
        sanitizedImages.push(result);
        log.push(`   ✅ Sanitized: ${imagePath}`);
      }
      log.push("");
    }

    // Этап 5: AdversarialGatekeeper
    let adversarialScore: AdversarialScore = {
      perplexity: 0,
      burstiness: 0,
      skazRussianness: 0,
      contentLength: 0,
      noClichés: 0,
      overallScore: 0,
      passesAllChecks: false,
      issues: [],
    };

    if (enableGatekeeper) {
      log.push("🔐 STAGE 5: Adversarial Gatekeeper Assessment");
      adversarialScore = this.gatekeeper.assessArticle(title, processedContent, images);

      log.push(this.gatekeeper.generateReport(adversarialScore));

      const recommendations = this.gatekeeper.getRecommendations(adversarialScore);
      if (recommendations.length > 0 && !(recommendations.length === 1 && recommendations[0].includes("✅"))) {
        log.push("Recommendations:");
        for (const rec of recommendations) {
          log.push(`  • ${rec}`);
        }
      }
      log.push("");
    }

    const processingTime = Date.now() - startTime;

    log.push("════════════════════════════════════════");
    log.push(`✅ Processing completed in ${processingTime}ms`);

    if (verbose) {
      console.log(log.join("\n"));
    }

    return {
      originalContent: content,
      processedContent,
      adversarialScore,
      sanitizedImages,
      processingTime,
      log,
    };
  }

  /**
   * Быстрая проверка: нужна ли обработка?
   */
  public quickCheck(content: string): {
    needsPerplexity: boolean;
    needsBurstiness: boolean;
    needsSkaz: boolean;
  } {
    return {
      needsPerplexity: !this.perplexityController.meetsPerplexityThreshold(content, 3.0),
      needsBurstiness: !this.burstinessOptimizer.meetsBurstinessThreshold(content, 6.5),
      needsSkaz: !this.skazEngine.meetsSkazThreshold(content, 70),
    };
  }

  /**
   * Сводка всех компонентов и их метрик
   */
  public getDetailedMetrics(content: string): {
    perplexity: any;
    burstiness: any;
    skaz: any;
  } {
    return {
      perplexity: this.perplexityController.analyzePerplexity(content),
      burstiness: this.burstinessOptimizer.analyzeBurstiness(content),
      skaz: this.skazEngine.analyzeSkazMetrics(content),
    };
  }

  /**
   * Информационный лог о всех компонентах
   */
  public getComponentsInfo(): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║         PHASE 2 ANTI-DETECTION SYSTEM COMPONENTS              ║
╚════════════════════════════════════════════════════════════════╝

1️⃣  PERPLEXITY CONTROLLER
    ├─ Purpose: Increase text entropy (1.8 → 3.4)
    ├─ Method: Replace frequent words with rare synonyms
    ├─ Bypass: ZeroGPT AI detector
    └─ Status: ✅ Implemented

2️⃣  BURSTINESS OPTIMIZER
    ├─ Purpose: Vary sentence lengths (StdDev 1.2 → 7.1)
    ├─ Methods: SPLIT long sentences / MERGE short ones
    ├─ Bypass: Originality.ai detection
    └─ Status: ✅ Implemented

3️⃣  SKAZ NARRATIVE ENGINE ⭐ (PRIMARY)
    ├─ Purpose: Apply Russian literary techniques
    ├─ Methods:
    │  ├─ Particle injection (ведь, же, ну)
    │  ├─ Syntactic dislocation (unusual word order)
    │  └─ Dialectal words (окаянный, дыбать)
    ├─ Bypass: ZeroGPT (< 10% detection vs >70%)
    └─ Status: ✅ Implemented

4️⃣  ADVERSARIAL GATEKEEPER
    ├─ Purpose: Validate article before publication
    ├─ Checks:
    │  ├─ Perplexity threshold
    │  ├─ Burstiness variance
    │  ├─ Content length (1500-2500 chars)
    │  ├─ No clickbait/clichés
    │  └─ Skaz score (≥70)
    ├─ Scoring: 0-100 (≥80 = OK to publish)
    └─ Status: ✅ Implemented

5️⃣  VISUAL SANITIZATION SERVICE
    ├─ Purpose: Remove AI image detection markers
    ├─ Methods:
    │  ├─ Strip EXIF/IPTC metadata (exiftool)
    │  └─ Add 2-5% Gaussian noise (ffmpeg)
    ├─ Bypass: SynthID image detection
    └─ Status: ✅ Implemented

═══════════════════════════════════════════════════════════════════

EXPECTED RESULTS (With Phase 2):
  • ZeroGPT detection: < 15% (from >70%)
  • Originality.ai detection: < 20% (from >80%)
  • SynthID image detection: Bypassed (< 5%)
  • Dzen Deep Read (Dochitka): > 70%
  • Comment velocity: High
  • Publication success rate: > 90%

TIMELINE:
  Implementation: Dec 21-22 (12-14 hours total)
  Testing: Dec 22 evening (5+ articles with ZeroGPT)
  Rollout: Dec 23+

═══════════════════════════════════════════════════════════════════
    `.trim();
  }
}
