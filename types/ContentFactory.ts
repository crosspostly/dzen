/**
 * 🏭 ZenMaster v4.0 - Content Factory Types
 * 
 * Factory for mass content generation (1-100 articles)
 * Features:
 * - Parallel article generation (3 concurrent)
 * - Serial image generation (1 per minute)
 * - Quality control
 * - Progress tracking
 */

import { GeneratedImage } from './ImageGeneration';
import { LongFormArticle } from './ContentArchitecture';

/**
 * Cover image (ONE per article)
 */
export interface CoverImage {
  base64: string; // Data URL or base64
  size: number; // File size in bytes
  mimeType?: string; // image/png, image/jpeg, etc.
  processedBuffer?: Buffer; // ✅ Processed JPG buffer
  format?: 'png' | 'jpeg'; // Image format
}

/**
 * Factory configuration
 */
export interface ContentFactoryConfig {
  articleCount: 1 | 5 | 10 | 25 | 50 | 100;
  parallelEpisodes: number; // Default 3
  imageGenerationRate: number; // Images per minute, default 1
  includeImages: boolean;
  qualityLevel: "standard" | "premium";
  outputFormat: "zen" | "medium" | "all";
  timeoutPerArticle?: number; // ms, default 300000 (5 min)
  enableAntiDetection?: boolean; // Apply AI detection countermeasures
  enablePlotBible?: boolean; // Use PlotBible for consistency
}

/**
 * Factory progress tracking
 */
export interface FactoryProgress {
  state: FactoryState;
  articlesTotal: number;
  articlesCompleted: number;
  articlesFailed: number;
  imagesTotal: number;
  imagesCompleted: number;
  imagesFailed: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // seconds
  currentlyGenerating: string[]; // Article titles being worked on
  errors: FactoryError[];
  startedAt?: number;
  completedAt?: number;
}

export type FactoryState = 
  | "initializing"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface FactoryError {
  articleId?: string;
  episodeId?: number;
  type: "article" | "image" | "validation" | "system";
  error: string;
  timestamp: number;
  recovered: boolean;
}

/**
 * Complete article with metadata and ONE cover image
 * 🎯 SIMPLIFIED v4.0: 1 article = 1 cover image (not 12!)
 */
export interface Article {
  id: string;
  title: string;
  content: string; // Full article text for Zen
  charCount: number;
  episodes?: ArticleEpisode[]; // Optional
  
  // ✅ UPDATED v4.0: Single cover image
  coverImage?: CoverImage; // ONE cover image from title + lede
  
  metadata: ArticleMetadata;
  stats: ArticleStats;
}

export interface ArticleEpisode {
  episodeNumber: number;
  title: string;
  content: string;
  charCount: number;
  sceneDescription?: string;
  emotion?: string;
  image?: GeneratedImage;
}

export interface ArticleMetadata {
  theme: string;
  angle?: string;
  emotion?: string;
  audience?: string;
  genre?: string;
  targetAudience?: string;
  generatedAt: number;
  generationTime?: number; // ms
  projectId?: string;
  channel?: string;
  models?: {
    outline?: string;
    episodes?: string;
  };
  // 📊 v4.4: Quality metrics
  qualityMetrics?: {
    readabilityScore: number;
    dialoguePercentage: number;
    sensoryDensity: number;
    paragraphCount: number;
    avgParagraphLength: number;
    validationIssues: string[];
    validationWarnings: string[];
  };
}

export interface ArticleStats {
  wordCount?: number;
  estimatedReadTime: number; // minutes
  qualityScore: number; // 0-100
  aiDetectionScore: number; // 0-100 (lower is better)
  burstinessScore?: number; // Sentence length variation
  perplexityScore?: number; // Vocabulary complexity
  uniquenessScore?: number; // Content originality
  // 📊 v4.4: Additional quality metrics
  readabilityScore?: number; // 0-100
  dialoguePercentage?: number; // 0-100
  sensoryDensity?: number; // Details per 1000 chars
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  maxConcurrent: number; // Max parallel workers
  timeout: number; // Per-task timeout
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Worker statistics
 */
export interface WorkerStats {
  totalTasks: number;
  completed: number;
  failed: number;
  active: number;
  averageTime: number; // ms
  successRate: number; // percentage
}

/**
 * Article generation task
 */
export interface ArticleTask {
  id: string;
  articleNumber: number;
  config: ContentFactoryConfig;
  theme?: string; // Optional pre-selected theme
  status: TaskStatus;
  attempts: number;
  startedAt?: number;
  completedAt?: number;
  result?: Article;
  error?: string;
}

export type TaskStatus = 
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Factory output structure
 */
export interface FactoryOutput {
  articles: Article[];
  manifest: FactoryManifest;
  report: FactoryReport;
}

export interface FactoryManifest {
  version: string;
  generatedAt: number;
  config: ContentFactoryConfig;
  articleCount: number;
  totalCharacters: number;
  totalImages: number;
  outputPaths: {
    articles: string[];
    images: string[];
    report: string;
  };
}

export interface FactoryReport {
  summary: {
    totalArticles: number;
    successfulArticles: number;
    failedArticles: number;
    totalImages: number;
    totalCharacters: number;
    totalGenerationTime: number; // seconds
    averageTimePerArticle: number; // seconds
  };
  quality: {
    averageQualityScore: number;
    averageAiDetectionScore: number;
    averageReadTime: number;
    qualityDistribution: QualityBucket[];
    // 📊 v4.4: Additional quality metrics
    averageReadabilityScore?: number;
    averageDialoguePercentage?: number;
    averageSensoryDensity?: number;
  };
  performance: {
    articlesPerHour: number;
    imagesPerHour: number;
    apiCallsTotal: number;
    apiCallsSuccessRate: number;
  };
  errors: FactoryError[];
}

export interface QualityBucket {
  range: string; // "0-20", "20-40", etc.
  count: number;
  percentage: number;
}

/**
 * Export formats
 */
export type ExportFormat = "json" | "markdown" | "html" | "docx";

export interface ExportOptions {
  format: ExportFormat;
  includeImages: boolean;
  includeMetadata: boolean;
  prettyPrint: boolean;
  outputDir: string;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  success: T[];
  failed: Array<{
    item: any;
    error: string;
  }>;
  totalTime: number;
  successRate: number;
}

/**
 * Preset configurations for common use cases
 */
export const FactoryPresets: Record<string, ContentFactoryConfig> = {
  "quick-test": {
    articleCount: 1,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: true,
    enablePlotBible: true
  },
  "small-batch": {
    articleCount: 5,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "premium",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: true,
    enablePlotBible: true
  },
  "medium-batch": {
    articleCount: 25,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: true,
    enablePlotBible: true
  },
  "large-batch": {
    articleCount: 100,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: false, // Faster
    enablePlotBible: true
  }
};
