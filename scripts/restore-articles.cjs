#!/usr/bin/env node

/**
 * 🔧 Article Restoration Script
 * Использует Gemini 2.5 Flash Lite для автоматической реставрации статей
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY not found!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Золотой промпт для реставрации
 */
const RESTORATION_PROMPT = `Действуй как профессиональный редактор и корректор. Твоя задача — провести глубокую реставрацию и нормализацию приложенного текста для публикации в блоге.

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:

1. Очистка от «шума»: Удали все технические маркеры, мусорные вставки и артефакты (например: «ну и», «да вот», «же», «вот это», «ну да», «-то», «вот что я хочу сказать» и подобные).

2. Синтаксическая сборка: Восстанови разорванные предложения и абзацы. Исправи ошибки пунктуации и опечатки. Убери случайные повторы слов.

3. Сохранение контента: Строго запрещено менять сюжет, ключевые события или характерную лексику персонажей. Не сокращай объем статьи — верни полный текст.

4. Форматирование: Разбей текст на логические, легко читаемые абзацы. Сделай структуру удобной для чтения с экрана (ритмичный текст).

5. Ограничение вывода: Выведи ТОЛЬКО отреставрированный текст статьи. Не пиши вступлений, комментариев, объяснений и выводов. Результат должен быть сразу готов к копированию и публикации.

ВХОДНЫЕ ДАННЫЕ (СТАТЬЯ):`;

/**
 * Проверить структуру frontmatter
 */
function validateFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      valid: false,
      message: 'Missing frontmatter',
      frontmatter: null,
      body: content
    };
  }

  const frontmatterStr = match[1];
  const body = match[2];

  // Проверяем обязательные поля
  const hasTitle = /^title:/m.test(frontmatterStr);
  const hasDate = /^date:/m.test(frontmatterStr);
  const hasDescription = /^description:/m.test(frontmatterStr);

  if (!hasTitle || !hasDate || !hasDescription) {
    return {
      valid: false,
      message: 'Missing required frontmatter fields (title, date, description)',
      frontmatter: frontmatterStr,
      body: body
    };
  }

  return {
    valid: true,
    frontmatter: frontmatterStr,
    body: body
  };
}

/**
 * Отправить текст на Gemini для реставрации
 */
async function restoreArticle(articleText) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `${RESTORATION_PROMPT}\n\n${articleText}`;

    console.log('🤖 Calling Gemini 2.5 Flash Lite...');
    const result = await model.generateContent(prompt);
    const restoredText = result.response.text();

    return restoredText.trim();
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    throw error;
  }
}

/**
 * Обработать один файл
 */
async function restoreArticleFile(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  try {
    // Читаем файл
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Валидируем структуру
    const validation = validateFrontmatter(fileContent);

    if (!validation.valid) {
      console.log(`⚠️  ${validation.message}`);
      console.log('   (Adding minimal frontmatter)');

      // Если нет frontmatter, создаём минимальный
      const fileName = path.basename(filePath, '.md');
      const now = new Date().toISOString().split('T')[0];
      
      const minimalFrontmatter = `---
title: ${fileName.replace(/-/g, ' ')}
date: ${now}
description: Article from auto-restore
---`;

      const restoredBody = await restoreArticle(validation.body);
      const restored = `${minimalFrontmatter}\n\n${restoredBody}`;

      fs.writeFileSync(filePath, restored, 'utf8');
      console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    // Если frontmatter есть, реставрируем только тело
    console.log('🔍 Restoring article body...');
    const restoredBody = await restoreArticle(validation.body);

    // Собираем обратно
    const restored = `---\n${validation.frontmatter}\n---\n\n${restoredBody}`;

    fs.writeFileSync(filePath, restored, 'utf8');
    console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
    return true;

  } catch (error) {
    console.error(`❌ Error restoring ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  🔧 Article Restoration - Gemini 2.5 Flash Lite   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  // Получаем список файлов из аргументов
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('⚠️  No files specified');
    process.exit(0);
  }

  console.log(`📋 Files to restore: ${files.length}`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // Обрабатываем каждый файл
  for (const file of files) {
    // Пропускаем если это не .md файл в articles/
    if (!file.endsWith('.md') || !file.includes('articles/')) {
      console.log(`⏭️  Skipping: ${file} (not a markdown article)`);
      continue;
    }

    const success = await restoreArticleFile(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Задержка между запросами к API (1 сек)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Итоговый отчёт
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  📊 Restoration Summary                           ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Restored: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${files.length}`);
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
