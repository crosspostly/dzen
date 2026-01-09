/**
 * Тестовый скрипт для проверки конвертации TXT в MD с front-matter
 */

import * as fs from 'fs';
import * as path from 'path';

// Читаем тестовую статью
const articleContent = fs.readFileSync('./test_article.txt', 'utf-8');

// Разбиваем на строки
const lines = articleContent.split('\n');
const title = lines[0]; // Первая строка - заголовок
const articleBody = lines.slice(1).join('\n').trim(); // Остальное тело статьи

// Генерация front-matter
const dateStr = '2025-12-23'; // Берем из пути или текущей даты
const slug = createSlug(title);

// Генерация интригующего описания (150-200 символов)
const description = generateIntriguingDescription(articleBody);

const imageFileName = `${slug}.jpg`; // Имя изображения без timestamp

const frontMatter = `---
title: "${title}"
date: "${dateStr}"
description: "${description}"
image: "${imageFileName}"
category: "lifestory"
---`;

// Комбинируем front-matter и тело статьи
const markdownContent = frontMatter + '\n\n' + articleBody;

// Сохраняем как .md файл
const outputDir = './test-output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, `${slug}.md`);
fs.writeFileSync(outputPath, markdownContent);

console.log(`✅ Конвертированная статья сохранена: ${outputPath}`);
console.log(`\nСодержимое файла:`);
console.log(markdownContent);

// Создаем тестовое изображение (пустой файл)
const imageOutputPath = path.join(outputDir, imageFileName);
fs.writeFileSync(imageOutputPath, Buffer.from([])); // Пустой буфер для теста
console.log(`\n✅ Тестовое изображение сохранено: ${imageOutputPath}`);

// Функция создания URL-безопасного слага
function createSlug(title: string): string {
  const transliterationMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd',
    'Е': 'e', 'Ё': 'yo', 'Ж': 'zh', 'З': 'z', 'И': 'i',
    'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm', 'Н': 'n',
    'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't',
    'У': 'u', 'Ф': 'f', 'Х': 'h', 'Ц': 'ts', 'Ч': 'ch',
    'Ш': 'sh', 'Щ': 'sch', 'Ъ': '', 'Ы': 'y', 'Ь': '',
    'Э': 'e', 'Ю': 'yu', 'Я': 'ya',
  };

  let slug = title.split('').map(char => transliterationMap[char] || char).join('');
  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  slug = slug.substring(0, 50);

  return slug || 'article';
}

// Функция генерации интригующего описания
function generateIntriguingDescription(content: string): string {
  let description = content.substring(0, 200).trim();
  
  if (description.length < 150 && content.length > 150) {
    description = content.substring(0, 200).trim();
  } else if (description.length > 150) {
    const lastSpaceIndex = description.lastIndexOf(' ');
    if (lastSpaceIndex > 150) {
      description = description.substring(0, lastSpaceIndex).trim();
    }
  }
  
  if (content.length > description.length) {
    description += '...';
  }
  
  description = description.replace(/"/g, "'").replace(/\n/g, " ");
  
  return description;
}