// ============================================================================
// ZenMaster v2.0 — Anti-Detection Types (Phase 2)
// Target: AI Detection < 15% (ZeroGPT, Originality.ai)
// ============================================================================

/**
 * Perplexity metrics for text naturalness
 */
export interface PerplexityMetrics {
  score: number;                    // Target: > 3.0 (human-like)
  entropy: number;                  // Lexical diversity measure
  targetScore: number;              // Ideal perplexity for bypass
}

/**
 * Burstiness metrics for sentence rhythm variance
 */
export interface BurstinessMetrics {
  stdDev: number;                   // Target: > 6.5
  sentenceLengths: number[];        // All sentence lengths
  variance: number;                 // Variance in sentence structure
  targetStdDev: number;             // Ideal standard deviation
}

/**
 * Skaz narrative elements (Russian literary technique)
 */
export interface SkazElements {
  particles: string[];              // ведь, же, ну, вот, -то
  dialectisms: string[];            // Regional/colloquial words
  syntacticDislocations: number;    // Count of OVS patterns
  emotionalMarkers: string[];       // ох, ай, эх, ну и
}

/**
 * Anti-detection validation result
 */
export interface AntiDetectionResult {
  passed: boolean;
  confidence: number;               // 0-100 (human-likeness)
  
  metrics: {
    perplexity: PerplexityMetrics;
    burstiness: BurstinessMetrics;
    skazScore: number;              // 0-100 (Skaz technique application)
    aiDetectionRisk: number;        // 0-100 (lower is better)
  };
  
  modifications: {
    perplexityBoost: boolean;
    burstinessOptimized: boolean;
    skazApplied: boolean;
    visualSanitized: boolean;
  };
  
  warnings: string[];
  recommendations: string[];
}

/**
 * Red Team validation scores
 */
export interface RedTeamScores {
  overallScore: number;             // 0-100
  perplexityCheck: boolean;
  burstinessCheck: boolean;
  lengthCheck: boolean;
  clickbaitCheck: boolean;
  humanLikeScore: number;           // 0-100
}

/**
 * Image sanitization metadata
 */
export interface ImageSanitization {
  metadataStripped: boolean;        // EXIF/IPTC removed
  noiseAdded: boolean;              // Gaussian noise 2-5%
  geometricDistortion: boolean;     // 0.5% warp applied
  originalSize: number;
  finalSize: number;
}

/**
 * Configuration for Anti-Detection Engine
 */
export interface AntiDetectionConfig {
  perplexity: {
    enabled: boolean;
    targetScore: number;            // Default: 3.0+
    maxIterations: number;          // Default: 3
  };
  
  burstiness: {
    enabled: boolean;
    targetStdDev: number;           // Default: 6.5+
    splitThreshold: number;         // Length to split sentences
    mergeThreshold: number;         // Length to merge sentences
  };
  
  skaz: {
    enabled: boolean;
    particleFrequency: number;      // Per 1000 words (default: 8-12)
    dialectFrequency: number;       // Per 1000 words (default: 3-5)
    syntaxDislocationRate: number;  // Percentage (default: 15%)
  };
  
  redTeam: {
    enabled: boolean;
    minScore: number;               // Default: 80/100
  };
  
  visual: {
    enabled: boolean;
    noiseLevel: number;             // 2-5%
    distortionLevel: number;        // 0.5%
  };
}
