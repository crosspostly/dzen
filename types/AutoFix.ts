// ============================================================================
// AutoFix Orchestrator Types
// Типы для системы автофикса AI-текстов с сохранением engagement
// ============================================================================

import { Episode } from './ContentArchitecture';

export interface ProblemAnalysis {
  episodeId: number;
  aiConfidence: number;           // 0-100, от uniquenessService.checkUniqueness
  engagementScore: number;        // 0-100, от uniquenessService.analyzeEngagementScore
  status: 'LEAVE' | 'REWRITE';
  reason: 'AI_DETECTED' | 'BORING_BUT_AUTHENTIC' | 'OK' | 'UNKNOWN';
  priority: 'LOW' | 'HIGH' | 'CRITICAL';
  targetEngagement?: number;      // целевой engagement для REWRITE
}

export interface AutoFixResult {
  articleId: string;
  analysed: number;               // количество проанализированных эпизодов
  scheduled: number;              // количество запланированных для переписывания
  completed: number;              // количество успешно переписанных
  failed: number;                 // количество неудачных попыток
  improvements: EpisodeImprovement[];
  duration: number;               // время выполнения в мс
}

export interface EpisodeImprovement {
  episodeId: number;
  aiReduction: number;            // на сколько уменьшился AI confidence
}

export interface RefinementPrompt {
  episodeId: number;
  originalContent: string;
  aiAnalysis: {
    confidence: number;
    markers: string[];
  };
  engagementAnalysis: {
    score: number;
    factors: {
      hookStrength: number;
      emotionalIntensity: number;
      specificity: number;
      dialogueRatio: number;
      brevityVariance: number;
    };
    recommendations: string[];
  };
  targetEngagement: number;
  constraints: RefinementConstraints;
}

export interface RefinementConstraints {
  preserveStructure: boolean;     // сохранить структуру сюжета
  preserveCharacters: boolean;    // сохранить персонажей
  maxSizeChange: number;          // максимальное изменение размера (%)
  humanMarkersRequired: boolean;  // добавить человеческие маркеры
}

export interface RefinementOptions {
  retryCount?: number;            // количество попыток (по умолчанию 2)
  validationThreshold?: {
    aiImprovementMin: number;     // минимальное улучшение AI (по умолчанию 10)
    engagementRetentionMin: number; // минимальное сохранение engagement (0.8 = 80%)
  };
}

export interface ValidationResult {
  accepted: boolean;
  improvement: {
    aiReduction: number;
    engagementChange: number;
    overallScore: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface AutoFixConfiguration {
  aiThresholdHigh: number;        // порог для REWRITE (по умолчанию 70)
  aiThresholdLow: number;         // порог для LEAVE (по умолчанию 45)
  engagementProblemThreshold: number; // порог для проблем с engagement (по умолчанию 45)
  engagementImprovementTarget: number; // целевое улучшение engagement (по умолчанию 20)
  validation: {
    aiImprovementRequired: number;    // минимальное улучшение AI (по умолчанию 10)
    engagementRetentionRequired: number; // минимальное сохранение engagement (0.8 = 80%)
  };
  logging: {
    enabled: boolean;
    level: 'minimal' | 'normal' | 'detailed';
  };
}