#!/usr/bin/env node

/**
 * Скрипт конвертации TXT → Markdown с front-matter
 * Используется для создания файлов статей для Яндекс Дзена
 */

const fs = require('fs');
const path = require('path');

// Получаем аргументы из командной строки
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ Использование: node convert-txt-to-md.cjs <title> <content-file> <image-name> [year] [month] [day]');
  process.exit(1);
}

const title = args[0];
const contentFile = args[1];
const imageName = args[2];
const year = args[3] || new Date().getFullYear();
const month = String(args[4] || new Date().getMonth() + 1).padStart(2, '0');
const day = String(args[5] || new Date().getDate()).padStart(2, '0');

// Проверяем, существует ли файл с контентом
if (!fs.existsSync(contentFile)) {
  console.error(`❌ Файл не найден: ${contentFile}`);
  process.exit(1);
}

// Читаем контент
const content = fs.readFileSync(contentFile, 'utf8');

// Формируем дату
const date = `${year}-${month}-${day}`;

// Формируем имя файла изображения
const imageFileName = imageName ? `${imageName}.jpg` : 'cover.jpg';

// Формируем GitHub raw URL для изображения
// https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/2025/12/21/image.jpg
const dirPath = `${year}/${month}/${day}`;
const imageUrl = `https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/${dirPath}/${imageFileName}`;

// Функция для экранирования YAML строк
function escapeYaml(str) {
  if (!str) return '""';
  if (str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return '"' + str + '"';
}

// Создаем front-matter
const frontMatter = `---
title: ${escapeYaml(title)}
date: ${date}
description: ${escapeYaml(content.substring(0, 150).replace(/\n/g, ' '))}
image: "${imageUrl}"
category: "news"
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
  console.log(`✅ Файл успешно создан: ${outputFileName}`);
  console.log(`📝 Заголовок: ${title}`);
  console.log(`🖼️  Изображение URL: ${imageUrl}`);
  console.log(`📋 Front-matter с GitHub raw URL готов!`);
} catch (err) {
  console.error(`❌ Ошибка при создании файла: ${err.message}`);
  process.exit(1);
}
