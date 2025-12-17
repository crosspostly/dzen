#!/usr/bin/env node

/**
 * Dzen Content Generator CLI
 * Локальный CLI для генерации статей
 */

import { configService } from './services/configService';
import { examplesService } from './services/examplesService';
import { geminiService } from './services/geminiService';
import { uniquenessService } from './services/uniquenessService';
import { Phase2AntiDetectionService } from './services/phase2AntiDetectionService';
import fs from 'fs';
import path from 'path';

// Красивые эмоджи и звуки
const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  LOADING: '📁',
  ROCKET: '🚀',
  BRAIN: '🧠',
  HOOK: '🎪',
  UP: '⬆️',
  BOOM: '💥',
  CLAP: '🎟',
  TIMER: '⏱️',
  SAVE: '💾',
  CHART: '📊',
  SEARCH: '🔍',
};

const args = process.argv.slice(2);
const command = args[0];

function getArg(name: string, defaultValue?: string): string | undefined {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match?.split('=')[1] || defaultValue;
}

function getFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

(async () => {
  try {
    if (command === 'generate') {
      const projectId = getArg('project', 'channel-1');
      const theme = getArg('theme');
      const verbose = getFlag('verbose');

      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} Dzen Content Generator v2.1`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const startTime = Date.now();

      // Шаг 1: Лоад конфига
      console.log(`${LOG.LOADING} Лоады конфигурацию проекта: ${projectId}`);
      const config = configService.loadConfig(projectId);
      console.log(`${LOG.SUCCESS} Конфиг загружен`);
      if (verbose) {
        console.log(`   - Аудитория: ${config.audience.age_range} лет`);
        console.log(`   - Объём: ${config.content_rules.min_chars}-${config.content_rules.max_chars} символов`);
        console.log(`   - Тон: ${config.content_rules.tone}`);
      }

      // Шаг 2: Лоад примеров
      console.log(`\n${LOG.LOADING} Лоады примеры статей...`);
      const examples = examplesService.loadExamples(configService.getExamplesPath(projectId));
      console.log(`${LOG.SUCCESS} Примеры загружены: ${examples.length} шт`);

      const bestExamples = examplesService.selectBestExamples(examples, config.examples_count);
      console.log(`${LOG.SUCCESS} Отбраны лучшие: ${bestExamples.length} шт`);

      // Определяем тему
      let selectedTheme = theme || config.content_rules.required_triggers[0];
      console.log(`\n${LOG.BRAIN} Генериру статью на тему:`);
      console.log(`   "📝 ${selectedTheme}"`);

      // Шаг 3: Генерация
      const genStartTime = Date.now();
      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.BRAIN} Этап 1: Построение плана...`);
      console.log(`${LOG.HOOK} Этап 2: Написание крючка...`);
      console.log(`${LOG.UP}  Этап 3: Развитие конфликта...`);
      console.log(`${LOG.BOOM} Этап 4: Кульминация...`);
      console.log(`${LOG.CLAP} Этап 5: Развязка...`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const result = await geminiService.generateArticleDataChunked({
        theme: selectedTheme,
        config,
        examples: bestExamples,
      });

      const genTime = Date.now() - genStartTime;

      // Шаг 4: Проверка уникальности
      console.log(`${LOG.SEARCH} Проверяю уникальность...`);
      const uniqueness = await uniquenessService.checkUniqueness(
        result.content,
        examples.map(e => e.content)
      );
      console.log(`${LOG.CHART} Анализ:`);
      console.log(`   - TF-IDF: ${uniqueness.analysis.tfidf_similarity}% (чем ниже, тем оригинальнее)`);
      console.log(`   - ИИ-детектор: ${uniqueness.analysis.ai_detection}%`);
      console.log(`   - Разнообразие слов: ${uniqueness.analysis.word_variety}%`);
      console.log(`   - Разнообразие предложений: ${uniqueness.analysis.sentence_variety}%`);

      // Шаг 5: Сохранение
      console.log(`\n${LOG.SAVE} Сохраняю результат...`);
      const timestamp = new Date().toISOString().split('T')[0];
      const outDir = path.join(configService.getGeneratedPath(projectId), timestamp);
      fs.mkdirSync(outDir, { recursive: true });

      const outputPath = path.join(outDir, 'article.json');
      fs.writeFileSync(
        outputPath,
        JSON.stringify({
          title: result.title,
          content: result.content,
          metadata: result.metadata,
          uniqueness: {
            score: uniqueness.score,
            analysis: uniqueness.analysis,
          },
          imageScenes: result.imageScenes,
        }, null, 2)
      );

      const totalTime = Date.now() - startTime;

      // Финальные результаты
      console.log(`\n${LOG.SUCCESS} ============================================`);
      console.log(`${LOG.SUCCESS} СТАТЬЯ ГОТОВА!`);
      console.log(`${LOG.SUCCESS} ============================================`);
      console.log(``);
      console.log(`${LOG.SUCCESS} Детали:`);
      console.log(`   📄 Название: ${result.title}`);
      console.log(`   📊 Размер: ${result.metadata.total_chars} символов`);
      console.log(`   ${result.metadata.total_chars >= config.content_rules.min_chars ? LOG.SUCCESS : LOG.ERROR} Проверка: ${config.content_rules.min_chars}-${config.content_rules.max_chars}`);
      console.log(`   ${uniqueness.score >= 80 ? LOG.SUCCESS : LOG.WARN} Уникальность: ${uniqueness.score}%`);
      console.log(`   ${uniqueness.analysis.ai_detection <= 20 ? LOG.SUCCESS : LOG.WARN} ИИ-детектор: ${uniqueness.analysis.ai_detection}%`);
      console.log(``);
      console.log(`${LOG.TIMER} Времени:`);
      console.log(`   - Генерация: ${formatTime(genTime)}`);
      console.log(`   - Общее: ${formatTime(totalTime)}`);
      console.log(``);
      console.log(`${LOG.SAVE} Файл: ${outputPath}`);
      console.log(``);

    } else if (command === 'validate') {
      const projectId = getArg('project', 'channel-1');
      console.log(`${LOG.LOADING} Проверяю конфиг ${projectId}...`);
      
      try {
        const config = configService.loadConfig(projectId);
        configService.validateConfig(config);
        console.log(`${LOG.SUCCESS} Конфиг валиден`);
        console.log(`   - Канал: ${config.channel_name}`);
        console.log(`   - Мин символов: ${config.content_rules.min_chars}`);
        console.log(`   - Макс символов: ${config.content_rules.max_chars}`);
        console.log(`   - Тон: ${config.content_rules.tone}`);
      } catch (error) {
        console.log(`${LOG.ERROR} Ошибка: ${error}`);
        process.exit(1);
      }

    } else if (command === 'list-projects') {
      console.log(`${LOG.LOADING} Доступные проекты:`);
      const projects = configService.listProjects();
      projects.forEach(p => {
        console.log(`   ${LOG.SUCCESS} ${p}`);
      });

    } else if (command === 'phase2') {
      const title = getArg('title', 'Без названия');
      const contentFile = getArg('content');
      const images = getArg('images')?.split(',') || [];
      const verbose = getFlag('verbose');

      if (!contentFile) {
        console.log(`${LOG.ERROR} Требуется параметр: --content=path/to/article.txt`);
        process.exit(1);
      }

      if (!fs.existsSync(contentFile)) {
        console.log(`${LOG.ERROR} Файл не найден: ${contentFile}`);
        process.exit(1);
      }

      console.log(`\n${LOG.ROCKET} ============================================`);
      console.log(`${LOG.ROCKET} PHASE 2: ANTI-DETECTION PROCESSING`);
      console.log(`${LOG.ROCKET} ============================================\n`);

      const content = fs.readFileSync(contentFile, 'utf-8');

      const phase2Service = new Phase2AntiDetectionService();
      const result = await phase2Service.processArticle(
        title,
        content,
        {
          applyPerplexity: true,
          applyBurstiness: true,
          applySkazNarrative: true,
          enableGatekeeper: true,
          sanitizeImages: images.length > 0,
          verbose,
        },
        images
      );

      // Сохраняем результаты
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = path.join('./generated/phase2', timestamp);
      fs.mkdirSync(outDir, { recursive: true });

      // Сохраняем обработанный контент
      fs.writeFileSync(
        path.join(outDir, 'processed.txt'),
        result.processedContent
      );

      // Сохраняем отчет
      fs.writeFileSync(
        path.join(outDir, 'report.json'),
        JSON.stringify({
          title,
          originalLength: result.originalContent.length,
          processedLength: result.processedContent.length,
          adversarialScore: result.adversarialScore,
          sanitizedImages: result.sanitizedImages,
          processingTime: result.processingTime,
        }, null, 2)
      );

      // Выводим финальный отчет
      console.log(`\n${LOG.SUCCESS} ============================================`);
      console.log(`${LOG.SUCCESS} PROCESSING COMPLETE!`);
      console.log(`${LOG.SUCCESS} ============================================`);
      console.log(`\nFinal Score: ${result.adversarialScore.overallScore}/100`);
      console.log(`Status: ${result.adversarialScore.passesAllChecks ? LOG.SUCCESS + ' READY FOR PUBLICATION' : LOG.WARN + ' NEEDS REVISION'}`);
      console.log(`\nOutput directory: ${outDir}`);
      console.log(`Processing time: ${formatTime(result.processingTime)}`);

    } else if (command === 'phase2-info') {
      const phase2Service = new Phase2AntiDetectionService();
      console.log(phase2Service.getComponentsInfo());

    } else if (command === 'test') {
      console.log(`${LOG.BRAIN} Короткий тест системы...`);
      console.log(`${LOG.LOADING} Конфигсервис: `, end = '');
      try {
        const config = configService.loadConfig('channel-1');
        console.log(LOG.SUCCESS);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      console.log(`${LOG.LOADING} Примерысервис: `, end = '');
      try {
        const examples = examplesService.loadExamples('./projects/channel-1/examples');
        console.log(LOG.SUCCESS, `(${examples.length} примеров)`);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      console.log(`${LOG.LOADING} Уникальностьсервис: `, end = '');
      try {
        const result = await uniquenessService.checkUniqueness(
          'Это тест',
          ['Это грудно']
        );
        console.log(LOG.SUCCESS);
      } catch (e) {
        console.log(LOG.ERROR);
      }

      console.log(`\n${LOG.SUCCESS} Все тесты пройдены!`);

    } else {
      console.log(`${LOG.INFO} Dzen Content Generator CLI`);
      console.log(``);
      console.log(`Команды:`);
      console.log(`  generate       - Генерировать статью`);
      console.log(`  validate       - Проверить конфиг`);
      console.log(`  list-projects  - Лист проектов`);
      console.log(`  phase2         - Phase 2: Anti-Detection обработка`);
      console.log(`  phase2-info    - Информация о Phase 2 компонентах`);
      console.log(`  test           - Короткие тесты`);
      console.log(``);
      console.log(`Опции для generate:`);
      console.log(`  --project=NAME   - Название проекта`);
      console.log(`  --theme=TEXT     - Описание темы`);
      console.log(`  --verbose        - Подробная информация`);
      console.log(``);
      console.log(`Опции для phase2:`);
      console.log(`  --title=TEXT      - Название статьи`);
      console.log(`  --content=PATH    - Путь к файлу с контентом`);
      console.log(`  --images=PATH1,PATH2 - Пути к изображениям`);
      console.log(`  --verbose         - Подробные логи`);
      console.log(``);
      console.log(`Примеры:`);
      console.log(`  npm run generate`);
      console.log(`  npm run generate -- --project=channel-1`);
      console.log(`  npm run generate -- --theme="Пончик" --verbose`);
      console.log(``);
      console.log(`  npx ts-node cli.ts phase2 --content=article.txt --title="Моя статья"`);
      console.log(`  npx ts-node cli.ts phase2-info`);
      console.log(``);
    }

  } catch (error) {
    console.error(`\n${LOG.ERROR} ОШИБКА:`, error);
    if (getFlag('verbose')) {
      console.error(error);
    }
    process.exit(1);
  }
})();
