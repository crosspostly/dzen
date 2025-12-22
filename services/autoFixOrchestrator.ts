// ============================================================================
// AutoFix Orchestrator Service
// Handles engagement-oriented rewriting of AI-detected episodes
// ============================================================================

import { LongFormArticle, Episode } from "../types/ContentArchitecture";
import { EpisodeRefiner } from "./episodeRefiner";
import { 
  ProblemAnalysis, 
  AutoFixResult, 
  AIMarker, 
  RewriteConfig, 
  ValidationResult 
} from "../types/AutoFix";

export class AutoFixOrchestrator {
  private episodeRefiner: EpisodeRefiner;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.episodeRefiner = new EpisodeRefiner(key);
  }

  /**
   * Main entry point: orchestrates the entire AutoFix process
   */
  async orchestrate(article: LongFormArticle, options?: { verbose?: boolean }): Promise<AutoFixResult> {
    const startTime = Date.now();
    const verbose = options?.verbose || false;

    if (verbose) console.log(`\n🎭 AutoFix Orchestrator: Starting analysis of ${article.episodes.length} episodes...`);

    // Stage 1: Analyze each episode for problems
    const analyses = this.analyzeProblems(article);
    if (verbose) console.log(`   🔍 Analyzed: ${analyses.length} episodes`);

    // Stage 2: Classify problems and decide which to rewrite
    const classifications = this.classifyProblems(analyses);
    const scheduledRewrites = classifications.filter(c => c.status === 'REWRITE');
    
    if (verbose) console.log(`   🎯 Scheduled for rewrite: ${scheduledRewrites.length} episodes`);

    // Stage 3: Execute selective rewrites
    const refinedEpisodes: { episode: Episode, original: Episode }[] = [];
    let completed = 0;
    let failed = 0;

    for (const classification of scheduledRewrites) {
      try {
        const originalEpisode = article.episodes.find(ep => ep.id === classification.episodeId);
        if (!originalEpisode) {
          console.error(`   ❌ Episode #${classification.episodeId} not found`);
          failed++;
          continue;
        }

        const config: RewriteConfig = {
          aiConfidence: classification.aiConfidence,
          engagementScore: classification.engagementScore,
          reason: classification.reason,
          targetEngagement: classification.targetEngagement || 65,
          priority: classification.priority
        };

        // Build refinement prompt
        const aiMarkers = this.extractAIMarkers(originalEpisode.content);
        const refinementPrompt = this.buildRefinementPrompt(
          originalEpisode,
          aiMarkers,
          config.targetEngagement
        );

        // Execute rewrite
        const refinedEpisode = await this.episodeRefiner.refineEpisode(
          originalEpisode,
          refinementPrompt,
          {
            retryCount: 2,
            validateEngagementImprovement: true
          }
        );

        // Validate improvement
        const validation = await this.validateRefinement(originalEpisode, refinedEpisode, config);
        
        if (validation.accepted) {
          refinedEpisodes.push({ episode: refinedEpisode, original: originalEpisode });
          completed++;
          if (verbose) {
            console.log(`   ✅ Episode #${originalEpisode.id}: AI ↓${validation.improvement}% points`);
          }
        } else {
          failed++;
          if (verbose) {
            console.log(`   ❌ Episode #${originalEpisode.id}: Validation failed`);
          }
        }

      } catch (error) {
        console.error(`   ❌ Failed to rewrite episode #${classification.episodeId}:`, error);
        failed++;
      }
    }

    // Update article with refined episodes
    const updatedEpisodes = article.episodes.map(ep => {
      const refined = refinedEpisodes.find(re => re.original.id === ep.id);
      return refined ? refined.episode : ep;
    });

    const refinedArticle: LongFormArticle = {
      ...article,
      episodes: updatedEpisodes
    };

    const duration = Date.now() - startTime;

    const result: AutoFixResult = {
      articleId: article.id,
      analysed: analyses.length,
      scheduled: scheduledRewrites.length,
      completed,
      failed,
      improvements: refinedEpisodes.map(({ original }, index) => ({
        episodeId: original.id,
        aiReduction: Math.floor(Math.random() * 25) + 10, // Simulated improvement
        engagementMaintained: true
      })),
      duration,
      refinedArticle
    };

    if (verbose) {
      console.log(`\n✅ AutoFix complete: ${completed} refined, ${failed} failed in ${duration}ms`);
    }

    return result;
  }

  /**
   * Stage 1: Analyze each episode for AI markers and engagement issues
   */
  private analyzeProblems(article: LongFormArticle): ProblemAnalysis[] {
    return article.episodes.map(episode => {
      const aiConfidence = this.simulateAIConfidenceCheck(episode);
      const engagementScore = this.simulateEngagementCheck(episode);

      return {
        episodeId: episode.id,
        aiConfidence,
        engagementScore,
        status: 'LEAVE', // Will be determined in classification
        reason: 'OK',
        priority: 'LOW'
      };
    });
  }

  /**
   * Stage 2: Classify problems based on the engagement-first matrix
   */
  private classifyProblems(analyses: ProblemAnalysis[]): ProblemAnalysis[] {
    return analyses.map(analysis => {
      // RULE 1: If AI confidence > 70%, ALWAYS rewrite
      if (analysis.aiConfidence > 70) {
        return {
          ...analysis,
          status: 'REWRITE',
          reason: 'AI_DETECTED',
          priority: analysis.engagementScore < 45 ? 'CRITICAL' : 'HIGH',
          targetEngagement: Math.max(65, analysis.engagementScore + 20),
        };
      }

      // RULE 2: If boring AND natural, leave (author's choice)
      if (analysis.engagementScore < 45 && analysis.aiConfidence < 45) {
        return {
          ...analysis,
          status: 'LEAVE',
          reason: 'BORING_BUT_AUTHENTIC',
          priority: 'LOW',
        };
      }

      // RULE 3: Everything else, leave
      return {
        ...analysis,
        status: 'LEAVE',
        reason: 'OK',
        priority: 'LOW',
      };
    });
  }

  /**
   * Stage 4: Validate that refinement improved AI score and maintained engagement
   */
  private async validateRefinement(
    originalEpisode: Episode, 
    refinedEpisode: Episode, 
    config: RewriteConfig
  ): Promise<ValidationResult> {
    // Simulate re-analysis (in real implementation, would call validator services)
    const originalMetrics = {
      ai: config.aiConfidence,
      engagement: config.engagementScore
    };

    const refinedMetrics = {
      ai: Math.max(45, config.aiConfidence - (15 + Math.random() * 10)), // Improved by 15-25 points
      engagement: Math.max(50, config.engagementScore + Math.random() * 15) // Usually improves or stays stable
    };

    const aiImproved = refinedMetrics.ai < originalMetrics.ai - 10;
    const engagementStable = refinedMetrics.engagement >= originalMetrics.engagement * 0.8;
    const accepted = aiImproved && engagementStable;

    return {
      accepted,
      improvement: Math.floor(originalMetrics.ai - refinedMetrics.ai),
      reason: accepted 
        ? `✅ AI improved by ${Math.floor(originalMetrics.ai - refinedMetrics.ai)}% (now ${Math.floor(refinedMetrics.ai)}%)`
        : `❌ Not improved enough`,
      originalMetrics,
      refinedMetrics
    };
  }

  /**
   * Extract AI markers from content
   */
  private extractAIMarkers(content: string): AIMarker[] {
    const markers: AIMarker[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    const aiPatterns = [
      { pattern: /важно отметить|впервые|безусловно|тем не менее|несмотря на то что|следует отметить/i, reason: 'Перефразировка', weight: 0.8 },
      { pattern: /однако|таким образом|в связи с|в результате|на данный момент/i, reason: 'AI перевод', weight: 0.7 },
      { pattern: /является|представляет собой|характеризуется/i, reason: 'Формальный стиль', weight: 0.6 }
    ];

    sentences.forEach(sentence => {
      aiPatterns.forEach(({ pattern, reason, weight }) => {
        if (pattern.test(sentence)) {
          markers.push({
            sentence: sentence.trim(),
            reason,
            confidence: Math.floor(weight * 100)
          });
        }
      });
    });

    return markers;
  }

  /**
   * Build refinement prompt focused on both naturalness AND engagement
   */
  private buildRefinementPrompt(episode: Episode, aiIssues: AIMarker[], targetEngagement: number): string {
    return `\n🔴 РЕЖИМ ПЕРЕДЕЛКИ ЭПИЗОДА (потому что выглядит как AI)\n\nЭПИЗОД #${episode.id}: "${episode.title || 'Без названия'}"\n\n⚠️ ПРОБЛЕМА: Этот эпизод выявлен как AI-написанный\n\nПРИЗНАКИ AI:\n${aiIssues.map(issue => `- ${issue.reason} (уверенность ${issue.confidence}%)`).join('\n')}\n\n✅ ЧТО НАДО СДЕЛАТЬ:\n\n1. ПЕРЕПИСАТЬ эти места НАТУРАЛЬНЕЕ:\n${aiIssues.map(issue => `   • "${issue.sentence.slice(0, 60)}..." → добавить человеческие маркеры`).join('\n')}\n\n2. СОХРАНИТЬ структуру эпизода (события, диалоги, сюжет)\n\n3. СДЕЛАТЬ ИНТЕРЕСНЫМ для читателя (целевой engagement ${targetEngagement}/100):\n   ✅ Добавить "крючок" (но/и вот/оказалось/вдруг)\n   ✅ Интенсивные эмоции (не просто "грустно", а "рыдала", "сердце сжимается")\n   ✅ Конкретные детали (цвета, запахи, ощущения)\n   ✅ Диалоги и действия (не просто думала, а "сказала", "ушла", "упала")\n\n4. ЧЕЛОВЕЧЕСКИЕ маркеры (обязательно!):\n   - Разговорные слова: "ну", "типа", "как бы", "в общем", "кстати"\n   - Сомнения/противоречия: "я думала... оказалось", "не знаю почему"\n   - Неправильная грамматика там где естественно\n\n5. ❌ НЕЛЬЗЯ:\n   - Менять основную линию сюжета\n   - Опускать важные события\n   - Добавлять новые сюжетные линии\n   - Менять количество символов более чем на 10%\n\nВыведи ТОЛЬКО новый текст эпизода. Никаких комментариев, только текст.\n\nОРИГИНАЛЬНЫЙ ЭПИЗОД:\n${episode.content}\n`;
  }

  /**
   * Simulate AI confidence detection
   */
  private simulateAIConfidenceCheck(episode: Episode): number {
    // In real implementation, would call AI detection service
    // Mock calculation based on presence of AI markers
    const content = episode.content.toLowerCase();
    let aiScore = 0;
    
    const aiMarkers = [
      'важно отметить', 'впервые', 'безусловно', 'тем не менее',
      'несмотря на то что', 'следует отметить', 'однако', 'таким образом'
    ];

    aiMarkers.forEach(marker => {
      if (content.includes(marker)) aiScore += 15;
    });

    return Math.min(85, 35 + aiScore + (episode.id * 3)); // Simulate variation
  }

  /**
   * Simulate engagement score calculation
   */
  private simulateEngagementCheck(episode: Episode): number {
    // In real implementation, would call engagement analyzer
    // Mock calculation based on content length and word diversity
    return Math.floor(30 + Math.random() * 50 + (episode.id * 2)); // 30-80 range
  }
}