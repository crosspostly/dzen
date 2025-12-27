/**
 * 🖼️ ZenMaster v4.0 - Image Generation Types
 * 
 * Multi-agent image generation with rate limiting (1 request/minute)
 * Integrates with PlotBible for consistent visual style across all episodes
 */

import { PlotBible } from './PlotBible';

/**
 * 🎯 ZenMaster v4.0 SIMPLIFIED: Request to generate ONE cover image per article
 * Cover image is generated from article title + first paragraph (lede)
 */
export interface CoverImageRequest {
  articleId: string;
  title: string;
  ledeText: string; // First paragraph of the article
  plotBible: PlotBible;
}

/**
 * @deprecated Use CoverImageRequest instead. One article = one cover image.
 */
export interface ImageGenerationRequest {
  episodeId: number;
  episodeText: string;
  plotBible: PlotBible;
  sceneDescription?: string;
  emotion?: string;
  keyMoment?: string;
}

/**
 * Generated image with full metadata
 */
export interface GeneratedImage {
  id: string;
  base64: string;
  mimeType: "image/png" | "image/jpg";
  width: number;
  height: number;
  fileSize: number;
  generatedAt: number; // Unix timestamp
  model: string; // "gemini-2.5-flash-image"
  prompt: string; // Full prompt used for generation
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  articleId: string; // Article ID this cover belongs to
  sceneDescription: string;
  authenticity_score?: number; // 0-100, higher = more authentic/realistic
  emotion?: string;
  lightingType?: string; // "natural window" | "desk lamp" | "morning sun"
  subjects?: string[]; // ["woman 40s", "kitchen table", "tea cup"]
  generationAttempts?: number; // How many tries before success
  fallbackUsed?: boolean;

  // 🆕 STAGE 4: Mobile Photo Authenticity
  authenticityApplied?: boolean;      // Whether authenticity was applied
  authenticityLevel?: 'low' | 'medium' | 'high';
  appliedEffects?: string[];          // List of effects applied
  deviceSimulated?: string;           // Device model (e.g., "iPhone 15 Pro")

  // @deprecated - use articleId instead
  episodeId?: number;
}

/**
 * Image queue status for rate limiting
 */
export interface ImageQueueStatus {
  total: number;
  processed: number;
  failed: number;
  pending: number;
  percentage: number;
  estimatedTimeRemaining: number; // in minutes
  currentlyProcessing: string | null; // Episode ID or null
  lastProcessedAt: number | null; // Unix timestamp
  errors: QueueError[];
}

export interface QueueError {
  episodeId: number;
  error: string;
  timestamp: number;
  retryCount: number;
}

/**
 * Image generation configuration
 */
export interface ImageGenerationConfig {
  aspectRatio: "16:9" | "4:3" | "1:1";
  quality: "standard" | "high" | "ultra";
  format: "png" | "jpg";
  maxRetries: number;
  retryDelay: number; // milliseconds
  rateLimit: number; // requests per minute (default: 1)
  enableFallback: boolean;
  optimizeForZen: boolean; // Apply Zen-specific optimizations
}

/**
 * Validation result for generated image
 */
export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    dimensionsOk: boolean;
    sizeOk: boolean;
    formatOk: boolean;
    aspectRatioOk: boolean;
  };
}

/**
 * Scene extraction result from episode text
 */
export interface ExtractedScene {
  who: string; // "Woman 40s in kitchen"
  what: string; // "making tea, looking at phone"
  where: string; // "Russian kitchen, morning"
  lighting: string; // "natural window light"
  mood: string; // "tense, worried"
  sensoryDetails: string[]; // ["cold tea", "old curtains", "phone notification"]
  confidence: number; // 0-1, how confident we are in extraction
}

/**
 * Image prompt components for debugging
 */
export interface PromptComponents {
  subject: string;
  setting: string;
  lighting: string;
  style: string;
  requirements: string[];
  avoidances: string[];
  finalPrompt: string;
}

/**
 * Batch image generation request
 */
export interface BatchImageRequest {
  requests: ImageGenerationRequest[];
  config: ImageGenerationConfig;
  parallel: boolean; // If false, process serially with rate limiting
  onProgress?: (status: ImageQueueStatus) => void;
  onComplete?: (images: GeneratedImage[]) => void;
  onError?: (error: QueueError) => void;
}

/**
 * Image storage result
 */
export interface ImageStorageResult {
  articleId: string;
  episodeId: number;
  filePath: string;
  url?: string;
  optimized: boolean;
  originalSize: number;
  finalSize: number;
  compressionRatio: number;
}

/**
 * Queue item for internal use (UPDATED: now uses CoverImageRequest)
 */
export interface QueueItem {
  id: string;
  request: CoverImageRequest; // ✅ Changed from ImageGenerationRequest
  priority: number; // Higher = process first
  addedAt: number;
  attempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  result?: GeneratedImage;
  error?: string;
}
