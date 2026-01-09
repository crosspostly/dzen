#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

const title = args[0];
const inputFile = args[1];
let imageName = args[2] || '';  // Может быть пустым!
const year = args[3] || new Date().getFullYear();
const month = String(args[4] || new Date().getMonth() + 1).padStart(2, '0');
const day = String(args[5] || new Date().getDate()).padStart(2, '0');
const category = args[6] || 'lifestory';

// ✅ ВАЛИДАЦИЯ
if (!title || !inputFile) {
  console.error('❌ ИСПОЛЬЗОВАНИЕ:');
  console.error('   node convert-txt-to-md.cjs "<title>" <input.txt> [imageName] [year] [month] [day] [category]');
  console.error('');
  console.error('❌ ПРИМЕРЫ:');
  console.error('   # С автоматической генерацией imageName:');
  console.error('   node convert-txt-to-md.cjs "Мучительный стыд" article.txt');
  console.error('');
  console.error('   # С явным imageName:');
  console.error('   node convert-txt-to-md.cjs "История успеха" content.txt success-2025');
  console.error('');
  console.error('   # С датой и категорией:');
  console.error('   node convert-txt-to-md.cjs "Новая жизнь" text.txt "" 2025 12 21 lifestory');
  console.error('   (пустая строка "" для imageName = автогенерация)');
  process.exit(1);
}

// 🔑 ФУНКЦИЯ ГЕНЕРАЦИИ imageName
function generateImageName(titleText) {
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  let slug = titleText.toLowerCase();

  // Применяем транслитерацию
  for (let [cyrillic, latin] of Object.entries(translitMap)) {
    slug = slug.replace(new RegExp(cyrillic, 'g'), latin);
  }

  // Очищаем от спец символов
  slug = slug
    .replace(/[^\w\s-]/g, '')     // Удаляем спец символы кроме пробелов и дефисов
    .replace(/\s+/g, '-')         // Пробелы в дефисы
    .replace(/-+/g, '-')          // Множественные дефисы в один
    .replace(/^-+|-+$/g, '')      // Удаляем дефисы в начале/конце
    .slice(0, 50);                // Максимум 50 символов

  return slug || 'article';  // Fallback если всё очистилось
}

// 🔑 КРИТИЧЕСКАЯ ЛОГИКА: Если imageName не указан → генерируем из title
if (!imageName) {
  imageName = generateImageName(title);
  console.log(`\n✨ imageName не указан, генерируем из заголовка: "${imageName}"\n`);
}

// ВАЛИДАЦИЯ категории
const validCategories = ['lifestory', 'article', 'story', 'experience', 'news'];
if (!validCategories.includes(category)) {
  console.warn(`⚠️  ПРЕДУПРЕЖДЕНИЕ: категория "${category}" может быть неправильной`);
  console.warn(`   Рекомендуемые: ${validCategories.join(', ')}\n`);
}

// Читаем файл
if (!fs.existsSync(inputFile)) {
  console.error(`\n❌ ОШИБКА: Файл не найден: ${inputFile}\n`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf-8');

// Генерируем front-matter
const date = `${year}-${month}-${day}`;
const imageUrl = `https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/${year}/${month}/${day}/${imageName}.jpg`;

const frontMatter = `---
title: "${title}"
date: ${date}
description: "Описание будет сгенерировано через Gemini или взято из текста"
image: "${imageUrl}"
category: "${category}"
---

${content}`;

// Выводим результат
console.log('✅ УСПЕШНО СГЕНЕРИРОВАНО:\n');
console.log(frontMatter);

console.log(`\n${'='.repeat(60)}`);
console.log(`📁 ФАЙЛ ДЛЯ СОХРАНЕНИЯ: ${imageName}-${date}.md`);
console.log(`📸 ИЗОБРАЖЕНИЕ: ${imageName}.jpg`);
console.log(`📍 ПУТЬ НА GITHUB: articles/published/${year}/${month}/${day}/`);
console.log(`🏷️  КАТЕГОРИЯ: ${category}`);
console.log(`${'='.repeat(60)}\n`);

console.log('🔗 ПРОВЕРКА URL ИЗОБРАЖЕНИЯ:');
console.log(`${imageUrl}\n`);
