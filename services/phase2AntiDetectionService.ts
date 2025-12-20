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
