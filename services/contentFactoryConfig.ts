/**
 * 🏭 ZenMaster v4.0 - Content Factory Configuration Presets
 * 
 * Pre-configured settings for different use cases
 */

import { ContentFactoryConfig } from '../types/ContentFactory';

/**
 * Factory presets for common scenarios
 */
export const FactoryPresets: Record<string, ContentFactoryConfig> = {
  // Quick test: 1 article, no images (for testing)
  "quick-test": {
    articleCount: 1,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: false, // Faster for testing
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: false, // v7.1: Disabled by default - causes text corruption
    enablePlotBible: true
  },

  // Small batch: 5 articles with premium quality
  "small-batch": {
    articleCount: 5,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "premium",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: false, // v7.1: Disabled
    enablePlotBible: true
  },

  // Medium batch: 25 articles with images
  "medium-batch": {
    articleCount: 25,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: false, // v7.1: Disabled
    enablePlotBible: true
  },

  // Large batch: 100 articles, optimized for speed
  "large-batch": {
    articleCount: 100,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 300000,
    enableAntiDetection: false, // Skip for speed
    enablePlotBible: true
  },

  // High quality: fewer articles, maximum quality
  "high-quality": {
    articleCount: 10,
    parallelEpisodes: 2, // Less parallel for stability
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: "premium",
    outputFormat: "zen",
    timeoutPerArticle: 600000, // 10 min timeout
    enableAntiDetection: false, // v7.1: Disabled - causes text corruption
    enablePlotBible: true
  },

  // Fast mode: maximum speed, minimum quality checks
  "fast-mode": {
    articleCount: 50,
    parallelEpisodes: 3,
    imageGenerationRate: 1,
    includeImages: false, // No images for speed
    qualityLevel: "standard",
    outputFormat: "zen",
    timeoutPerArticle: 180000, // 3 min timeout
    enableAntiDetection: false,
    enablePlotBible: false
  }
};

/**
 * Get preset by name
 */
export function getPreset(name: string): ContentFactoryConfig | null {
  return FactoryPresets[name] || null;
}

/**
 * List all available presets
 */
export function listPresets(): string[] {
  return Object.keys(FactoryPresets);
}

/**
 * Get preset description
 */
export function getPresetDescription(name: string): string {
  const descriptions: Record<string, string> = {
    "quick-test": "1 article, no images - Fast test",
    "small-batch": "5 premium articles with images",
    "medium-batch": "25 standard articles with images",
    "large-batch": "100 articles, optimized for speed",
    "high-quality": "10 articles, maximum quality",
    "fast-mode": "50 articles, no images, fast"
  };
  return descriptions[name] || "Unknown preset";
}

/**
 * Validate config
 */
export function validateConfig(config: ContentFactoryConfig): string[] {
  const errors: string[] = [];

  // Validate article count
  const validCounts = [1, 5, 7, 10, 25, 50, 100];
  if (!validCounts.includes(config.articleCount)) {
    errors.push(`Invalid articleCount: ${config.articleCount}. Must be one of: ${validCounts.join(', ')}`);
  }

  // Validate parallel episodes
  if (config.parallelEpisodes < 1 || config.parallelEpisodes > 5) {
    errors.push(`Invalid parallelEpisodes: ${config.parallelEpisodes}. Must be between 1 and 5`);
  }

  // Validate image generation rate
  if (config.imageGenerationRate < 1 || config.imageGenerationRate > 10) {
    errors.push(`Invalid imageGenerationRate: ${config.imageGenerationRate}. Must be between 1 and 10`);
  }

  // Validate quality level
  if (!['standard', 'premium'].includes(config.qualityLevel)) {
    errors.push(`Invalid qualityLevel: ${config.qualityLevel}. Must be 'standard' or 'premium'`);
  }

  // Validate output format
  if (!['zen', 'medium', 'all'].includes(config.outputFormat)) {
    errors.push(`Invalid outputFormat: ${config.outputFormat}. Must be 'zen', 'medium', or 'all'`);
  }

  return errors;
}
