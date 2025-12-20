/**
 * 🧼 Content Sanitizer Types
 * v4.4: Quality metrics and validation for generated content
 */

export interface ContentSanitizerReport {
  articleId: string;
  wordCount: number;
  paragraphCount: number;
  avgParagraphLength: number;
  dialoguePercentage: number;
  sensoryCount: number;
  qualityScore: number; // 0-100
}

export interface ContentValidationResult {
  valid: boolean;
  charCount: number;
  wordCount: number;
  errors: string[];
  warnings: string[];
}

export interface QualityMetrics {
  readabilityScore: number; // 0-100
  avgParagraphLength: number;
  avgSentenceLength: number;
  dialoguePercentage: number;
  paragraphCount: number;
  paragraphsWithDialogue: number;
  hasComplexSentences: boolean;
  sensoryDensity: number; // детали на 1000 символов
  travelSpeed: "slow" | "medium" | "fast";
  twistCount: number; // v4.5: plot twists
  issues: string[];
}