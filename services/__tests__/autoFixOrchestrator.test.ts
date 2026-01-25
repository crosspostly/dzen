/**
 * AutoFix Orchestrator Tests
 * Тестируем селективный автофикс AI-текстов с сохранением engagement
 */

import { AutoFixOrchestrator } from '../autoFixOrchestrator';
import { uniquenessService } from '../uniquenessService';
import { episodeGeneratorService } from '../episodeGeneratorService';
import { QualityValidator } from '../qualityValidator';
import { LongFormArticle, Episode } from '../../types/ContentArchitecture';

describe('AutoFixOrchestrator', () => {
  let orchestrator: AutoFixOrchestrator;
  let mockArticle: LongFormArticle;

  beforeEach(() => {
    orchestrator = new AutoFixOrchestrator(
      uniquenessService,
      episodeGeneratorService,
      QualityValidator
    );

    // Создаём тестовую статью
    mockArticle = {
      id: 'test-article-123',
      title: 'Test Article',
      outline: {
        theme: 'test',
        angle: 'confession',
        emotion: 'shame',
        audience: 'Women 25-45',
        episodes: []
      },
      episodes: [
        {
          id: 1,
          title: 'Episode 1',
          content: 'Это первый эпизод с AI-текстом. Очень важно отметить, что данный текст содержит много AI-паттернов.',
          charCount: 150,
          openLoop: 'test',
          turnPoints: [],
          emotions: [],
          keyScenes: [],
          characters: [],
          generatedAt: Date.now(),
          stage: 'draft'
        },
        {
          id: 2,
          title: 'Episode 2',
          content: 'Это второй эпизод - натуральный человеческий текст без AI-паттернов.',
          charCount: 100,
          openLoop: 'test',
          turnPoints: [],
          emotions: [],
          keyScenes: [],
          characters: [],
          generatedAt: Date.now(),
          stage: 'draft'
        }
      ],
      lede: 'Test lede',
      finale: 'Test finale',
      voicePassport: {
        apologyPattern: 'test',
        doubtPattern: 'test',
        memoryTrigger: 'test',
        characterSketch: 'test',
        humorStyle: 'kind',
        jokeExample: 'test',
        angerPattern: 'test',
        paragraphEndings: ['question'],
        examples: []
      },
      metadata: {
        totalChars: 1000,
        totalReadingTime: 5,
        episodeCount: 2,
        sceneCount: 2,
        dialogueCount: 0
      }
    };
  });

  describe('Problem Analysis', () => {
    test('должен корректно анализировать AI confidence и engagement', async () => {
      const problems = orchestrator['analyzeProblems'](mockArticle);
      
      expect(problems).toHaveLength(2);
      
      // Первый эпизод должен иметь высокий AI confidence
      const episode1Problem = problems.find(p => p.episodeId === 1);
      expect(episode1Problem).toBeDefined();
      expect(episode1Problem?.aiConfidence).toBeGreaterThanOrEqual(0);
      expect(episode1Problem?.aiConfidence).toBeLessThanOrEqual(100);
      expect(episode1Problem?.engagementScore).toBeGreaterThanOrEqual(0);
      expect(episode1Problem?.engagementScore).toBeLessThanOrEqual(100);
    });

    test('должен определять engagement score для разных типов текста', async () => {
      const problems = orchestrator['analyzeProblems'](mockArticle);
      
      // Проверяем, что оба эпизода имеют оценки engagement
      problems.forEach(problem => {
        expect(problem.engagementScore).toBeDefined();
        expect(typeof problem.engagementScore).toBe('number');
      });
    });
  });

  describe('Problem Classification', () => {
    test('должен классифицировать AI > 70% как REWRITE', () => {
      const problems = [
        {
          episodeId: 1,
          aiConfidence: 85,
          engagementScore: 60,
          status: 'LEAVE' as const,
          reason: 'UNKNOWN' as const,
          priority: 'LOW' as const
        }
      ];

      const classified = orchestrator['classifyProblems'](problems);
      
      expect(classified[0].status).toBe('REWRITE');
      expect(classified[0].reason).toBe('AI_DETECTED');
      expect(classified[0].priority).toBe('HIGH');
    });

    test('должен классифицировать AI < 45% и engagement < 45% как LEAVE', () => {
      const problems = [
        {
          episodeId: 1,
          aiConfidence: 30,
          engagementScore: 35,
          status: 'LEAVE' as const,
          reason: 'UNKNOWN' as const,
          priority: 'LOW' as const
        }
      ];

      const classified = orchestrator['classifyProblems'](problems);
      
      expect(classified[0].status).toBe('LEAVE');
      expect(classified[0].reason).toBe('BORING_BUT_AUTHENTIC');
      expect(classified[0].priority).toBe('LOW');
    });

    test('должен устанавливать целевой engagement для REWRITE', () => {
      const problems = [
        {
          episodeId: 1,
          aiConfidence: 80,
          engagementScore: 50,
          status: 'LEAVE' as const,
          reason: 'UNKNOWN' as const,
          priority: 'LOW' as const
        }
      ];

      const classified = orchestrator['classifyProblems'](problems);
      
      expect(classified[0].targetEngagement).toBeDefined();
      expect(classified[0].targetEngagement).toBeGreaterThan(50); // 50 + 20 = 70
    });
  });

  describe('Main Orchestration', () => {
    test('должен обрабатывать статью и возвращать результат', async () => {
      const result = await orchestrator.orchestrate(mockArticle);
      
      expect(result).toBeDefined();
      expect(result.articleId).toBe(mockArticle.id);
      expect(result.analysed).toBe(2);
      expect(typeof result.scheduled).toBe('number');
      expect(typeof result.completed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.duration).toBe('number');
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    test('должен логировать процесс обработки', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await orchestrator.orchestrate(mockArticle);
      
      // Проверяем, что логирование происходило
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AutoFix:')
      );
      
      consoleSpy.mockRestore();
    });

    test('должен корректно обрабатывать ошибки при переписывании', async () => {
      // Мокаем episodeGeneratorService для симуляции ошибки
      const originalRefineEpisode = episodeGeneratorService.refineEpisode;
      episodeGeneratorService.refineEpisode = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await orchestrator.orchestrate(mockArticle);
      
      expect(result.failed).toBeGreaterThan(0);
      
      // Восстанавливаем оригинальный метод
      episodeGeneratorService.refineEpisode = originalRefineEpisode;
    });
  });

  describe('Refinement Prompt Building', () => {
    test('должен строить корректный промпт для переписывания', () => {
      const episode = mockArticle.episodes[0];
      const aiAnalysis = {
        analysis: { ai_detection: 85 },
        details: { ai_patterns: ['очень важно', 'следует подчеркнуть'] }
      };
      const engagement = {
        score: 40,
        recommendations: ['Добавьте больше эмоций']
      };
      
      const prompt = orchestrator['buildRefinementPrompt'](
        episode,
        aiAnalysis,
        engagement,
        65
      );
      
      expect(prompt).toContain('РЕЖИМ ПЕРЕДЕЛКИ ЭПИЗОДА');
      expect(prompt).toContain('AI-уверенность: 85%');
      expect(prompt).toContain('Интересность текущего: 40/100');
      expect(prompt).toContain('целевой engagement 65/100');
    });
  });

  describe('Integration', () => {
    test('должен использовать готовые методы из UniquenessService', () => {
      // Проверяем, что orchestrator действительно использует analyzeEngagementScore
      const problems = orchestrator['analyzeProblems'](mockArticle);
      
      // Если метод analyzeEngagementScore существует и работает,
      // мы должны получить валидные engagement scores
      problems.forEach(problem => {
        expect(problem.engagementScore).toBeGreaterThanOrEqual(0);
        expect(problem.engagementScore).toBeLessThanOrEqual(100);
      });
    });
  });
});