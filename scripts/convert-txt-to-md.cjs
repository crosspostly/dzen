#!/usr/bin/env node

/**
 * Скрипт конвертации TXT → Markdown с front-matter
 * КРИТИЧНО: imageName обязателен! Каждая статья должна иметь уникальное имя для изображения
 */

const fs = require('fs');
const path = require('path');

// Получаем аргументы из командной строки
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ ОШИБКА: imageName обязателен!');
  console.error('');
  console.error('Использование: node convert-txt-to-md.cjs <title> <content-file> <image-name> [year] [month] [day] [category]');
  console.error('');
  console.error('Параметры:');
  console.error('  title         - Заголовок статьи');
  console.error('  content-file  - Файл с текстом статьи');
  console.error('  image-name    - ОБЯЗАТЕЛЬНО! Уникальное имя для изображения (без расширения)');
  console.error('  year          - Год (по умолчанию текущий)');
  console.error('  month         - Месяц 1-12 (по умолчанию текущий)');
  console.error('  day           - День 1-31 (по умолчанию текущий)');
  console.error('  category      - lifestory|article|story|experience (по умолчанию: lifestory)');
  console.error('');
  console.error('Примеры:');
  console.error('  node scripts/convert-txt-to-md.cjs "Мой стыд" article.txt fear-story');
  console.error('  node scripts/convert-txt-to-md.cjs "История успеха" content.txt success-story 2025 12 21 lifestory');
  process.exit(1);
}

const title = args[0];
const contentFile = args[1];
const imageName = args[2];  // ❌ КРИТИЧНО - ОБЯЗАТЕЛЕН!

const now = new Date();
const year = args[3] || now.getFullYear();
const month = String(args[4] || now.getMonth() + 1).padStart(2, '0');
const day = String(args[5] || now.getDate()).padStart(2, '0');
const category = args[6] || 'lifestory';

// ВАЛИДАЦИЯ imageName
if (!imageName || imageName.trim() === '') {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: imageName не может быть пустым!');
  console.error('   Каждая статья должна иметь уникальное имя для изображения.');
  console.error('   Пример: fear-story, success-story, first-love, и т.д.');
  process.exit(1);
}

// ВАЛИДАЦИЯ категории
const validCategories = ['lifestory', 'article', 'story', 'experience'];
if (!validCategories.includes(category)) {
  console.error(`❌ Неправильная категория: "${category}"`);
  console.error(`   Валидные категории: ${validCategories.join(', ')}`);
  process.exit(1);
}

// Проверяем, существует ли файл с контентом
if (!fs.existsSync(contentFile)) {
  console.error(`❌ Файл не найден: ${contentFile}`);
  process.exit(1);
}

// Читаем контент
const content = fs.readFileSync(contentFile, 'utf8');

// Формируем дату
const date = `${year}-${month}-${day}`;

// Формируем имя файла изображения (обязательно с расширением)
const imageFileName = `${imageName}.jpg`;

// Формируем GitHub raw URL для изображения
// https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/2025/12/21/fear-story.jpg
const dirPath = `${year}/${month}/${day}`;
const imageUrl = `https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/${dirPath}/${imageFileName}`;

// Функция для эскраниирования YAML строк
function escapeYaml(str) {
  if (!str) return '""';
  if (str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return '"' + str + '"';
}

// Генерируем краткое описание из первых 150 символов
const description = content.substring(0, 150).replace(/\n/g, ' ').trim() + '...';

// Создаем front-matter
const frontMatter = `---
title: ${escapeYaml(title)}
date: ${date}
description: ${escapeYaml(description)}
image: "${imageUrl}"
category: "${category}"
---
`;

// Объединяем front-matter с контентом
const markdownContent = frontMatter + content;

// Формируем имя выходного файла
const outputFileName = `${title.replace(/\s+/g, '-').toLowerCase()}-${date}.md`;
const outputPath = path.join(process.cwd(), outputFileName);

// Записываем файл
try {
  fs.writeFileSync(outputPath, markdownContent, 'utf8');
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ УСПЕШНО: Markdown файл создан!');
  console.log('='.repeat(70));
  console.log(`📄 Файл: ${outputFileName}`);
  console.log(`📌 Заголовок: ${title}`);
  console.log(`📅 Дата: ${date}`);
  console.log(`🖼️  Изображение: ${imageFileName}`);
  console.log(`🌐 GitHub RAW URL: ${imageUrl}`);
  console.log(`📂 Категория: ${category}`);
  console.log('');
  console.log('⚡ Инструкции:');
  console.log(`1. Загрузите файл "${outputFileName}" в articles/published/${dirPath}/`);
  console.log(`2. Загрузите изображение "${imageFileName}" в articles/published/${dirPath}/`);
  console.log(`3. Сделайте git push на GitHub`);
  console.log(`4. GitHub Actions автоматически обновит RSS`);
  console.log(`5. Яндекс Дзен парсит RSS и публикует статью`);
  console.log('');
  console.log('⚠️  ВАЖНО:');
  console.log(`   • Изображение ДОЛЖНО быть названо ${imageFileName}`);
  console.log(`   • Путь должен быть: articles/published/${dirPath}/${imageFileName}`);
  console.log(`   • RSS будет ссылаться на: ${imageUrl}`);
  console.log('='.repeat(70) + '\n');
} catch (err) {
  console.error(`❌ Ошибка при создании файла: ${err.message}`);
  process.exit(1);
}
