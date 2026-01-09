/**
 * Тестовый скрипт для проверки формата экспорта в .md с front-matter
 */

import fs from 'fs';
import path from 'path';

// Тестовые данные для статьи
const testArticle = {
  title: "Я всю жизнь боялась одиночества",
  content: `Я всю жизнь боялась одиночества
Это история одной женщины, которая много лет скрывала свою правду от всех.
Она притворялась счастливой, но внутри всё время что-то разрушалось.
Когда всё рухнуло, она поняла, что одиночество – это не приговор.
Это возможность начать всё с чистого листа.
И вот, спустя годы молчания, она решилась рассказать свою историю.
`,
  coverImage: null // В реальном случае это будет объект с изображением
};

// Генерация front-matter и содержимого статьи
function generateMarkdownWithFrontMatter(article: any) {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const slug = createSlug(article.title);
  
  // Генерация интригующего описания
  const contentLines = article.content.split('\n');
  const contentWithoutTitle = contentLines.slice(1).join(' ');
  const description = generateIntriguingDescription(contentWithoutTitle);
  
  const imageFileName = `${slug}.jpg`;
  
  const frontMatter = `---
title: "${article.title}"
date: "${dateStr}"
description: "${description}"
image: "${imageFileName}"
category: "lifestory"
---`;

  // Подготовка тела статьи (без первой строки, которая является заголовком)
  const articleBody = contentLines.slice(1).join('\n').trim();
  
  return frontMatter + '\n\n' + articleBody;
}

// Создание URL-безопасного слага
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

// Генерация интригующего описания
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

// Создание тестового файла
const markdownContent = generateMarkdownWithFrontMatter(testArticle);
const testDir = './test-output';
fs.mkdirSync(testDir, { recursive: true });

const slug = createSlug(testArticle.title);
const testFilePath = path.join(testDir, `${slug}.md`);
fs.writeFileSync(testFilePath, markdownContent);

console.log(`✅ Тестовый файл создан: ${testFilePath}`);
console.log(`\nСодержимое файла:`);
console.log(markdownContent);