import { ContentFactoryOrchestrator } from '../services/contentFactoryOrchestrator';
import { GitSyncService } from '../services/gitSyncService';
import { Article } from '../types/ContentFactory';
import fs from 'fs';
import path from 'path';

/**
 * 🔥 SMOKE PUSH TEST
 * 
 * Быстрая проверка сохранения в GitHub.
 * Генерирует 1 статью-заглушку (без вызова AI) и пробует запушить её.
 * Использует ТЕ ЖЕ сервисы, что и продакшн.
 */
async function runSmokePush() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 ЗАПУСК SMOKE PUSH ТЕСТА (Генерация + GitHub)`);
  console.log(`${'='.repeat(60)}\n`);

  const orchestrator = new ContentFactoryOrchestrator();
  const gitSync = new GitSyncService();
  const channel = '_smoke-test';
  
  // 1. Инициализация (как в продакшне)
  await orchestrator.initialize({
    articleCount: 1,
    parallelEpisodes: 1,
    imageGenerationRate: 1,
    includeImages: true,
    qualityLevel: 'standard',
    outputFormat: 'zen',
    timeoutPerArticle: 60000,
  }, channel);

  // 2. Создание DUMMY статьи (чтобы не тратить токены и время)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dummyTitle = `🚀 Smoke Test Article - ${timestamp}`;
  const dummyLede = "Это тестовое описание для быстрой проверки пуша в GitHub.";
  
  const dummyArticle: Article = {
    id: `smoke-${Date.now()}`,
    title: dummyTitle,
    content: `# ${dummyTitle}\n\n${dummyLede}\n\nЭто тело тестовой статьи. Она была создана автоматически для проверки механизма сохранения в GitHub.\n\n**Дата:** ${new Date().toLocaleString()}\n**Тип:** SMOKE_TEST`,
    charCount: 200,
    metadata: {
      theme: 'Smoke Test',
      generatedAt: Date.now(),
      channel: channel,
    },
    stats: {
      estimatedReadTime: 1,
      qualityScore: 100,
      aiDetectionScore: 0
    },
    // Заглушка изображения (1x1 PNG в base64)
    coverImage: {
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      size: 68,
      mimeType: 'image/png',
      format: 'jpeg'
    }
  };

  // 3. Инъекция статьи в оркестратор (имитация успешной генерации)
  // Используем приватное поле через any для теста
  (orchestrator as any).articles = [dummyArticle];
  (orchestrator as any).progress.articlesCompleted = 1;
  (orchestrator as any).progress.imagesCompleted = 1;

  try {
    // 4. ЭКСПОРТ (Используем ПРОДАКШН логику экспорта)
    console.log(`\n💾 Шаг 1: Экспорт статьи...`);
    const exportPath = await orchestrator.exportForZen('./articles');
    console.log(`✅ Экспортировано в: ${exportPath}`);

    // 5. ПУШ В GITHUB (Используем дубликат логики workflow)
    console.log(`\n🚀 Шаг 2: Пуш в GitHub...`);
    const msg = `🧪 SMOKE PUSH: ${dummyTitle}`;
    const success = await gitSync.sync(msg, ['articles/', 'public/']);

    if (success) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏆 ТЕСТ ПРОЙДЕН: Статья сохранена и отправлена в GitHub!`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`❌ ТЕСТ ПРОВАЛЕН: Ошибка при пуше в GitHub.`);
      console.log(`${'='.repeat(60)}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n💥 Критическая ошибка во время теста:`, error);
    process.exit(1);
  }
}

runSmokePush();
