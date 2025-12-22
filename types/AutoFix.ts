// ============================================================================
// AutoFix Orchestrator Types
// Handles engagement-oriented rewriting of AI-detected episodes
// ============================================================================

import { LongFormArticle } from "./ContentArchitecture";

export interface ProblemAnalysis {
  episodeId: number;
  aiConfidence: number;
  engagementScore: number;
  
  status: 'LEAVE' | 'REWRITE';
  reason: 'OK' | 'AI_DETECTED' | 'BORING_BUT_AUTHENTIC';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  
  // For AI-FIX:
  aiMarkers?: AIMarker[];
  targetEngagement?: number;
  refinementPrompt?: string;
}

export interface AIMarker {
  sentence: string;
  reason: string;
  confidence: number;
}

export interface RewriteConfig {
  aiConfidence: number;
  engagementScore: number;
  reason: 'AI_DETECTED' | 'BORING_BUT_AUTHENTIC' | 'OK';
  targetEngagement: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ValidationResult {
  accepted: boolean;
  improvement: number;
  reason: string;
  originalMetrics: {
    ai: number;
    engagement: number;
  };
  refinedMetrics: {
    ai: number;
    engagement: number;
  };
}

export interface AutoFixResult {
  articleId: string;
  analysed: number;
  scheduled: number;
  completed: number;
  failed: number;
  improvements: {
    episodeId: number;
    aiReduction: number;
    engagementMaintained: boolean;
  }[];
  duration: number;
  refinedArticle?: LongFormArticle;
}

export interface AutoFixOptions {
  applyAutoFix?: boolean;
  maxCharDelta?: number;
  validateEngagementImprovement?: boolean;
  verbose?: boolean;
}
