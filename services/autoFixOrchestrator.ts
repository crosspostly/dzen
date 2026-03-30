/**
 * AutoFix Orchestrator
 * Селективный автофикс AI-текстов с сохранением engagement
 */

import { LongFormArticle, Episode } from '../types/ContentArchitecture';
import { UniquenessService } from './uniquenessService';
import { EpisodeGeneratorService } from './episodeGeneratorService';
import { QualityValidator } from './qualityValidator';

export interface EpisodeProblem {
  episodeId: number;
  aiConfidence: number;
  engagementScore: number;
  status: 'LEAVE' | 'REWRITE';
  reason: 'AI_DETECTED' | 'BORING_BUT_AUTHENTIC' | 'UNKNOWN';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  targetEngagement?: number;
}

export interface AutoFixResult {
  articleId: string;
  analysed: number;
  scheduled: number;
  completed: number;
  failed: number;
  duration: number;
  improvements: string[];
}

export class AutoFixOrchestrator {
  constructor(
    private uniquenessService: UniquenessService,
    private episodeGeneratorService: EpisodeGeneratorService,
    private qualityValidator: typeof QualityValidator
  ) {}

  private async analyzeProblems(article: LongFormArticle): Promise<EpisodeProblem[]> {
    const problems: EpisodeProblem[] = [];

    for (const episode of article.episodes) {
      // Note: checkUniqueness requires examples array, we pass empty array for standalone analysis
      const aiAnalysis = await this.uniquenessService.checkUniqueness(episode.content, []);
      const engagement = this.uniquenessService.analyzeEngagementScore(episode.content);

      problems.push({
        episodeId: episode.id,
        aiConfidence: aiAnalysis.analysis.ai_detection,
        engagementScore: engagement.score,
        status: 'LEAVE',
        reason: 'UNKNOWN',
        priority: 'LOW'
      });
    }

    return problems;
  }

  private classifyProblems(problems: EpisodeProblem[]): EpisodeProblem[] {
    return problems.map(problem => {
      const classified = { ...problem };

      if (problem.aiConfidence > 70) {
        classified.status = 'REWRITE';
        classified.reason = 'AI_DETECTED';
        classified.priority = 'HIGH';
        classified.targetEngagement = Math.min(100, problem.engagementScore + 20);
      } else if (problem.aiConfidence < 45 && problem.engagementScore < 45) {
        classified.status = 'LEAVE';
        classified.reason = 'BORING_BUT_AUTHENTIC';
        classified.priority = 'LOW';
      }

      return classified;
    });
  }

  private buildRefinementPrompt(
    episode: Episode,
    aiAnalysis: any,
    engagement: any,
    targetEngagement: number
  ): string {
    return `
РЕЖИМ ПЕРЕДЕЛКИ ЭПИЗОДА
======================

Эпизод #${episode.id}: ${episode.title}

📊 АНАЛИЗ:
- AI-уверенность: ${aiAnalysis.analysis.ai_detection}%
- Интересность текущего: ${engagement.score}/100
- Целевой engagement: ${targetEngagement}/100

⚠️ AI-ПАТЕРНЫ:
${aiAnalysis.details.ai_patterns?.map((p: string) => `   - ${p}`).join('\n') || '   - Не обнаружено'}

💡 РЕКОМЕНДАЦИИ:
${engagement.recommendations?.map((r: string) => `   - ${r}`).join('\n') || '   - Улучшить вовлеченность'}

📝 ЗАДАНИЕ:
Перепишите этот эпизод, сохраняя сюжет и ключевые моменты, но:
1. Уберите AI-паттерны
2. Добавьте больше эмоций и конкретики
3. Сделайте текст более живым и естественным
4. Достигните целевого engagement ${targetEngagement}/100

Оригинальный текст:
${episode.content}
`.trim();
  }

  async orchestrate(article: LongFormArticle): Promise<AutoFixResult> {
    const startTime = Date.now();
    const improvements: string[] = [];

    console.log(`\n🔧 AutoFix: Starting analysis of "${article.title}"`);

    // Step 1: Analyze problems
    const problems = await this.analyzeProblems(article);
    console.log(`   Analysed ${problems.length} episodes`);

    // Step 2: Classify problems
    const classified = this.classifyProblems(problems);
    const toRewrite = classified.filter(p => p.status === 'REWRITE');

    console.log(`   Found ${toRewrite.length} episodes to rewrite`);

    // Step 3: Rewrite episodes
    let completed = 0;
    let failed = 0;

    for (const problem of toRewrite) {
      const episode = article.episodes.find(e => e.id === problem.episodeId);
      if (!episode) continue;

      try {
        const aiAnalysis = this.uniquenessService.checkUniqueness(episode.content, []);
        const engagement = this.uniquenessService.analyzeEngagementScore(episode.content);

        const prompt = this.buildRefinementPrompt(
          episode,
          aiAnalysis,
          engagement,
          problem.targetEngagement || 60
        );

        const refinedEpisode = await this.episodeGeneratorService.refineEpisode(
          episode,
          article.outline,
          prompt
        );

        article.episodes = article.episodes.map(e =>
          e.id === problem.episodeId ? refinedEpisode : e
        );

        completed++;
        improvements.push(`Episode ${problem.episodeId}: AI ${problem.aiConfidence}% → rewritten`);
        console.log(`   ✅ Episode ${problem.episodeId} rewritten`);
      } catch (error) {
        failed++;
        console.warn(`   ❌ Episode ${problem.episodeId} failed: ${(error as Error).message}`);
      }
    }

    const duration = Date.now() - startTime;

    return {
      articleId: article.id,
      analysed: problems.length,
      scheduled: toRewrite.length,
      completed,
      failed,
      duration,
      improvements
    };
  }
}
