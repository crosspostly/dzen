/**
 * ТЕСТИНГ АНТИДЕТЕКТОР + ВАЛИДАТОР ИНТЕГРАЦИИ
 * 
 * Тестируем полный цикл: генерация эпизода → проверка → retry при необходимости
 */

import { AntiAIDetectorService } from './services/antiAIDetectorService';
import { EpisodeValidatorService } from './services/episodeValidatorService';
import { EpisodeGeneratorService } from './services/episodeGeneratorService';
import { EpisodeOutline } from './types/ContentArchitecture';

async function testAntiAIDetector() {
  console.log('🧪 ТЕСТ 1: ANTI AI DETECTOR SERVICE');
  console.log('═'.repeat(50));
  
  const detector = new AntiAIDetectorService({
    minScore: 70,
    strictMode: false
  });

  // Тестовые тексты
  const testTexts = [
    {
      name: 'AI-текст (плохой)',
      content: 'Важно отметить, что следует подчеркнуть необходимость. Как известно, безусловно очевидно, что можно сделать вывод, таким образом, в заключение подводя итоги.'
    },
    {
      name: 'Человеческий текст (хороший)',
      content: 'Я пошла на кухню. Включила чайник. А потом поняла - надо было ещё что-то сделать. Помню, как в детстве мама готовила этот чай. Запахло ромашкой.'
    },
    {
      name: 'Средний текст',
      content: 'Вчера произошло то, что изменило всё. Я думала, что знаю этого человека, но оказалось - была не права. — Откуда ты это знаешь? — спросила я. Её голос дрожал. На улице шёл снег.'
    }
  ];

  for (const test of testTexts) {
    console.log(`\n📝 Тест: ${test.name}`);
    const result = await detector.detectAI(test.content);
    
    console.log(`   Балл: ${result.score}/100`);
    console.log(`   Статус: ${result.passed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
    console.log(`   Риск: ${result.riskLevel}`);
    console.log(`   Проблем: ${result.issues.length}`);
    
    if (result.issues.length > 0) {
      console.log(`   🔍 Первая проблема: ${result.issues[0].description}`);
    }
  }
}

async function testEpisodeValidator() {
  console.log('\n\n🧪 ТЕСТ 2: EPISODE VALIDATOR SERVICE');
  console.log('═'.repeat(50));
  
  const validator = new EpisodeValidatorService({
    maxRetries: 3,
    minQualityScore: 70,
    verbose: true
  });

  // Тестовый запрос эпизода
  const request = {
    episodeNumber: 1,
    totalEpisodes: 5,
    plotBible: {
      theme: 'Внезапная встреча с прошлым',
      openLoop: 'Что она узнает?'
    },
    previousContext: '',
    remainingBudget: 3000,
    additionalInstructions: undefined
  };

  try {
    console.log('🎬 Генерируем и валидируем эпизод...');
    const result = await validator.generateAndValidateEpisode(request);
    
    console.log(`\n📊 РЕЗУЛЬТАТ ВАЛИДАЦИИ:`);
    console.log(`   Статус: ${result.validationPassed ? '✅ ПРОЙДЕН' : '❌ НЕ ПРОЙДЕН'}`);
    console.log(`   Попыток: ${result.attempts.length}`);
    console.log(`   Балл: ${result.finalResult.score}/100`);
    console.log(`   Длина эпизода: ${result.episode.charCount} символов`);
    
    if (result.validationPassed) {
      console.log(`   ✅ Эпизод успешно прошёл валидацию!`);
    } else {
      console.log(`   ❌ Эпизод не прошёл валидацию`);
      console.log(`   📋 Проблемы:`);
      result.finalResult.issues.slice(0, 3).forEach((issue, i) => {
        console.log(`      ${i + 1}. ${issue.severity}: ${issue.description}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Ошибка валидации:`, error);
  }
}

async function testEpisodeGeneratorIntegration() {
  console.log('\n\n🧪 ТЕСТ 3: EPISODE GENERATOR INTEGRATION');
  console.log('═'.repeat(50));
  
  // Тестируем генератор с валидацией
  const generator = new EpisodeGeneratorService(undefined, true); // enableValidation = true
  
  const testOutline: EpisodeOutline = {
    id: 1,
    title: 'Эпизод 1: Начало истории',
    hookQuestion: 'Что случится дальше?',
    externalConflict: 'Неожиданная встреча',
    internalConflict: 'Страх перед прошлым',
    keyTurning: 'Узнать правду',
    openLoop: 'Какая тайна скрыта?'
  };

  try {
    console.log('🎬 Генерируем эпизод с антидетектором...');
    const episode = await generator.generateSingleEpisode(
      testOutline,
      [], // previousEpisodes
      3000, // charLimit
      1, // episodeNum
      5 // totalEpisodes
    );
    
    console.log(`\n📊 РЕЗУЛЬТАТ ГЕНЕРАЦИИ:`);
    console.log(`   ID: ${episode.id}`);
    console.log(`   Заголовок: ${episode.title}`);
    console.log(`   Длина: ${episode.charCount} символов`);
    console.log(`   Стадия: ${episode.stage}`);
    console.log(`   Содержание (первые 200 символов):`);
    console.log(`   "${episode.content.substring(0, 200)}..."`);
    
  } catch (error) {
    console.log(`❌ Ошибка генерации:`, error);
  }
}

async function testFullWorkflow() {
  console.log('\n\n🧪 ТЕСТ 4: ПОЛНЫЙ WORKFLOW');
  console.log('═'.repeat(50));
  
  console.log('🎬 Генерируем несколько эпизодов с валидацией...');
  
  const generator = new EpisodeGeneratorService(undefined, true);
  const outlines: EpisodeOutline[] = [
    {
      id: 1,
      title: 'Эпизод 1',
      hookQuestion: 'Что случится?',
      externalConflict: 'Начало',
      internalConflict: 'Неопределенность',
      keyTurning: 'Первое открытие',
      openLoop: 'Что дальше?'
    },
    {
      id: 2,
      title: 'Эпизод 2',
      hookQuestion: 'Как развивается?',
      externalConflict: 'Развитие',
      internalConflict: 'Сомнения',
      keyTurning: 'Неожиданный поворот',
      openLoop: 'Что это значит?'
    }
  ];

  try {
    // Быстрая генерация для теста (skipValidation = true)
    console.log('⏭️  Быстрая генерация для теста...');
    const episodes = await generator.generateEpisodesSequentially(
      outlines,
      {
        skipValidation: true, // Для скорости теста
        delayBetweenRequests: 1000
      }
    );
    
    console.log(`\n📊 РЕЗУЛЬТАТ WORKFLOW:`);
    console.log(`   Сгенерировано эпизодов: ${episodes.length}`);
    console.log(`   Общая длина: ${episodes.reduce((sum, ep) => sum + ep.charCount, 0)} символов`);
    
    episodes.forEach(ep => {
      console.log(`   Эпизод ${ep.id}: ${ep.charCount} символов`);
    });
    
  } catch (error) {
    console.log(`❌ Ошибка workflow:`, error);
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ АНТИДЕТЕКТОР + ВАЛИДАТОР');
  console.log('═'.repeat(60));
  
  try {
    await testAntiAIDetector();
    await testEpisodeValidator();
    await testEpisodeGeneratorIntegration();
    await testFullWorkflow();
    
    console.log('\n\n✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.log(`\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТОВ:`, error);
  }
}

// Если файл запускается напрямую
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testAntiAIDetector, testEpisodeValidator, testEpisodeGeneratorIntegration, testFullWorkflow };