/**
 * Engagement Score Tests
 * Tests for analyzeEngagementScore() method in UniquenessService
 */

import { UniquenessService } from '../uniquenessService';

describe('UniquenessService - engagementScore', () => {
  let service: UniquenessService;

  beforeEach(() => {
    service = new UniquenessService();
  });

  describe('analyzeEngagementScore()', () => {
    it('should return EngagementAnalysis object with all required fields', () => {
      const text = 'Это простой текст для тестирования.';
      const result = service.analyzeEngagementScore(text);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('isProblem');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.score).toBe('number');
      expect(typeof result.isProblem).toBe('boolean');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should have all 5 factors in the result', () => {
      const text = 'Это простой текст для тестирования.';
      const result = service.analyzeEngagementScore(text);

      expect(result.factors).toHaveProperty('hookStrength');
      expect(result.factors).toHaveProperty('emotionalIntensity');
      expect(result.factors).toHaveProperty('specificity');
      expect(result.factors).toHaveProperty('dialogueRatio');
      expect(result.factors).toHaveProperty('brevityVariance');
    });

    it('should score between 0 and 100', () => {
      const text = 'Это простой текст для тестирования.';
      const result = service.analyzeEngagementScore(text);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have factors between 0 and 100', () => {
      const text = 'Это простой текст для тестирования.';
      const result = service.analyzeEngagementScore(text);

      expect(result.factors.hookStrength).toBeGreaterThanOrEqual(0);
      expect(result.factors.hookStrength).toBeLessThanOrEqual(100);

      expect(result.factors.emotionalIntensity).toBeGreaterThanOrEqual(0);
      expect(result.factors.emotionalIntensity).toBeLessThanOrEqual(100);

      expect(result.factors.specificity).toBeGreaterThanOrEqual(0);
      expect(result.factors.specificity).toBeLessThanOrEqual(100);

      expect(result.factors.dialogueRatio).toBeGreaterThanOrEqual(0);
      expect(result.factors.dialogueRatio).toBeLessThanOrEqual(100);

      expect(result.factors.brevityVariance).toBeGreaterThanOrEqual(0);
      expect(result.factors.brevityVariance).toBeLessThanOrEqual(100);
    });

    it('should detect problems when score < 45', () => {
      const boringText = 'Текст. Текст. Текст. Текст. Текст.';
      const result = service.analyzeEngagementScore(boringText);

      if (result.score < 45) {
        expect(result.isProblem).toBe(true);
      }
    });

    it('should not flag problems when score >= 45', () => {
      const goodText = 'Вдруг он остановился! Но это было ужасно. Помню, как дрожал. Что же произойдёт? ' +
                       'Сердце биралось в груди, слёзы были на глазах. ' +
                       'Он взял мою руку, посмотрел прямо в глаза и сказал что-то невероятное. ' +
                       'Это был момент, когда всё изменилось...';
      const result = service.analyzeEngagementScore(goodText);

      if (result.score >= 45) {
        expect(result.isProblem).toBe(false);
      }
    });
  });

  describe('Hook Strength Factor', () => {
    it('should detect "но" hook', () => {
      const textWithHook = 'Он ушёл, но вернулся. Но потом снова уехал.';
      const result = service.analyzeEngagementScore(textWithHook);

      expect(result.factors.hookStrength).toBeGreaterThan(0);
    });

    it('should detect "вдруг" hook', () => {
      const textWithHook = 'Вдруг дверь открылась. Вдруг всё изменилось.';
      const result = service.analyzeEngagementScore(textWithHook);

      expect(result.factors.hookStrength).toBeGreaterThan(0);
    });

    it('should detect exclamations and questions', () => {
      const textWithHook = 'Что это было! Почему это произошло? Как это возможно!';
      const result = service.analyzeEngagementScore(textWithHook);

      expect(result.factors.hookStrength).toBeGreaterThan(0);
    });

    it('should give low score to text without hooks', () => {
      const textWithoutHook = 'Это текст. Он очень длинный. Никаких крючков здесь. Всё скучно.';
      const result = service.analyzeEngagementScore(textWithoutHook);

      expect(result.factors.hookStrength).toBeLessThan(30);
    });
  });

  describe('Emotional Intensity Factor', () => {
    it('should detect emotional words', () => {
      const emotionalText = 'Я плакал. Это было ужасно. Чувствовал огромную боль. Стыд и вина.';
      const result = service.analyzeEngagementScore(emotionalText);

      expect(result.factors.emotionalIntensity).toBeGreaterThan(0);
    });

    it('should detect memory triggers', () => {
      const memoryText = 'Помню той день. Никогда не забуду эту ночь. Помню каждую деталь.';
      const result = service.analyzeEngagementScore(memoryText);

      expect(result.factors.emotionalIntensity).toBeGreaterThan(0);
    });

    it('should give low score to unemotional text', () => {
      const unemotionalText = 'Вода имеет молекулярную структуру. Кислород необходим для дыхания. ' +
                              'Углерод образует связи. Биология это наука.';
      const result = service.analyzeEngagementScore(unemotionalText);

      expect(result.factors.emotionalIntensity).toBeLessThan(20);
    });
  });

  describe('Specificity Factor', () => {
    it('should detect numbers and specific details', () => {
      const specificText = 'Было 15 часов. Комната № 7. Её звали Мария. Окно было 2 метра высоты.';
      const result = service.analyzeEngagementScore(specificText);

      expect(result.factors.specificity).toBeGreaterThan(0);
    });

    it('should detect direct quotes', () => {
      const quoteText = 'Он сказал: "Я больше не буду". Она ответила: "Это неправда".';
      const result = service.analyzeEngagementScore(quoteText);

      expect(result.factors.specificity).toBeGreaterThan(0);
    });

    it('should detect descriptions and actions', () => {
      const descText = 'Красивый закат освещал комнату. Упал со стула. Вскочил с кровати.';
      const result = service.analyzeEngagementScore(descText);

      expect(result.factors.specificity).toBeGreaterThan(0);
    });

    it('should give low score to generic text', () => {
      const genericText = 'Что-то происходит. Это интересно. Некоторые люди думают. Обычно это работает.';
      const result = service.analyzeEngagementScore(genericText);

      expect(result.factors.specificity).toBeLessThan(30);
    });
  });

  describe('Dialogue Ratio Factor', () => {
    it('should detect dialogues and quotations', () => {
      const dialogueText = 'Она спросила: "Где ты был?" Я ответил: "Я был на работе".';
      const result = service.analyzeEngagementScore(dialogueText);

      expect(result.factors.dialogueRatio).toBeGreaterThan(0);
    });

    it('should detect action verbs', () => {
      const actionText = 'Он вскочил, прибежал к двери, схватил ключ. Посмотрел на меня. ' +
                        'Ответил громко. Спросил что-то странное.';
      const result = service.analyzeEngagementScore(actionText);

      expect(result.factors.dialogueRatio).toBeGreaterThan(0);
    });

    it('should give low score to static, description-heavy text', () => {
      const staticText = 'Дом был большой. Стены были кирпичные. Крыша была старой. ' +
                        'Окна были грязные. Двери были закрыты.';
      const result = service.analyzeEngagementScore(staticText);

      expect(result.factors.dialogueRatio).toBeLessThan(20);
    });
  });

  describe('Brevity Variance Factor', () => {
    it('should reward varied sentence lengths', () => {
      const variedText = 'Он ушёл. Потом вернулся в полночь, мокрый и дрожащий от холода. ' +
                        'Молчал. Долгое молчание. Потом вдруг закричал что-то ужасное. Я не понял.';
      const result = service.analyzeEngagementScore(variedText);

      expect(result.factors.brevityVariance).toBeGreaterThan(30);
    });

    it('should penalize uniform sentence lengths', () => {
      const uniformText = 'Это первое предложение. Это второе предложение. Это третье предложение. ' +
                         'Это четвёртое предложение. Это пятое предложение.';
      const result = service.analyzeEngagementScore(uniformText);

      expect(result.factors.brevityVariance).toBeLessThan(70);
    });

    it('should handle very short text gracefully', () => {
      const shortText = 'Он пришёл.';
      const result = service.analyzeEngagementScore(shortText);

      expect(result.factors.brevityVariance).toBe(50);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations when score < 45', () => {
      const poorText = 'Текст. Еще текст. И еще текст. Это продолжается. Скучно.';
      const result = service.analyzeEngagementScore(poorText);

      if (result.isProblem) {
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should not provide recommendations when score >= 45', () => {
      const goodText = 'Вдруг он остановился! Но это было ужасно. Помню, как дрожал. ' +
                       'Что же произойдёт? Сердце биралось в груди.';
      const result = service.analyzeEngagementScore(goodText);

      if (!result.isProblem) {
        expect(result.recommendations.length).toBe(0);
      }
    });

    it('should suggest hook improvements when hookStrength is low', () => {
      const nohookText = 'Текст без крючков. Просто описание. Никаких поворотов. Очень скучный текст.';
      const result = service.analyzeEngagementScore(nohookText);

      if (result.factors.hookStrength < 40 && result.isProblem) {
        const hasHookRecommendation = result.recommendations.some(r => r.includes('крючков'));
        expect(hasHookRecommendation).toBe(true);
      }
    });

    it('should suggest emotional improvements when emotionalIntensity is low', () => {
      const notEmotionalText = 'Вода состоит из молекул. Физика это наука. Гравитация действует везде. ' +
                              'Законы природы универсальны.';
      const result = service.analyzeEngagementScore(notEmotionalText);

      if (result.factors.emotionalIntensity < 40 && result.isProblem) {
        const hasEmotionalRecommendation = result.recommendations.some(r => r.includes('эмоциональности'));
        expect(hasEmotionalRecommendation).toBe(true);
      }
    });

    it('should suggest specificity improvements when specificity is low', () => {
      const genericText = 'Что-то произошло. Люди говорили. Было интересно. Это менялось.';
      const result = service.analyzeEngagementScore(genericText);

      if (result.factors.specificity < 40 && result.isProblem) {
        const hasSpecificityRecommendation = result.recommendations.some(r => r.includes('конкретных'));
        expect(hasSpecificityRecommendation).toBe(true);
      }
    });

    it('should suggest dialogue improvements when dialogueRatio is low', () => {
      const noDialogueText = 'Дом был большой и красивый. Сад был зелёный. Цветы были красные. ' +
                            'Деревья были высокие. Забор был деревянный.';
      const result = service.analyzeEngagementScore(noDialogueText);

      if (result.factors.dialogueRatio < 30 && result.isProblem) {
        const hasDialogueRecommendation = result.recommendations.some(r => r.includes('диалоги'));
        expect(hasDialogueRecommendation).toBe(true);
      }
    });

    it('should suggest variance improvements when brevityVariance is low', () => {
      const uniformText = 'Это первое. Это второе. Это третье. Это четвёртое. Это пятое. Это шестое. ' +
                         'Это седьмое. Это восьмое.';
      const result = service.analyzeEngagementScore(uniformText);

      if (result.factors.brevityVariance < 40 && result.isProblem) {
        const hasVarianceRecommendation = result.recommendations.some(r => r.includes('длину'));
        expect(hasVarianceRecommendation).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = service.analyzeEngagementScore('');
      expect(result.score).toBe(0);
      expect(result.isProblem).toBe(true);
    });

    it('should handle very long text', () => {
      const longText = 'Это текст. ' + 'Вдруг произошло что-то ужасное! '.repeat(100);
      const result = service.analyzeEngagementScore(longText);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle single sentence', () => {
      const singleSentence = 'Вдруг дверь открылась!';
      const result = service.analyzeEngagementScore(singleSentence);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle text with only punctuation', () => {
      const punctuation = '!!! ??? ... !!!';
      const result = service.analyzeEngagementScore(punctuation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle text with numbers only', () => {
      const numbersOnly = '123 456 789 012 345 678 901';
      const result = service.analyzeEngagementScore(numbersOnly);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('High engagement examples', () => {
    it('should give high score to well-written narrative', () => {
      const goodNarrative = 'Вдруг дверь распахнулась! Я помню этот момент. Сердце остановилось. ' +
                           'Она вскочила, прибежала ко мне и спросила: "Где ты был?" ' +
                           'Я не смог ответить. Было страшно. Рыдал. Слёзы текли по щекам. ' +
                           'Однако потом всё изменилось. Но это другая история. ' +
                           'Никогда не забуду той ночи.';
      const result = service.analyzeEngagementScore(goodNarrative);

      expect(result.score).toBeGreaterThan(50);
    });

    it('should give low score to generic text', () => {
      const genericNarrative = 'Это текст про что-то. Обычно это происходит. Люди часто говорят об этом. ' +
                              'Некоторые считают это важным. Другие думают иначе. В любом случае это интересно.';
      const result = service.analyzeEngagementScore(genericNarrative);

      expect(result.score).toBeLessThan(45);
    });
  });
});
