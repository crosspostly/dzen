#!/usr/bin/env node

/**
 * Упрощенный скрипт генерации RSS-ленты для Яндекс Дзен
 * Читает markdown-файлы из content/articles/ и создает feed.xml
 * Не перемещает файлы, только генерирует RSS с правильными URL
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter'; // Для парсинга front-matter
import { Feed } from 'feed'; // Библиотека для генерации RSS

// Получаем корневой URL для изображений
const BASE_URL = process.env.BASE_URL || 'https://dzen.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;

// Функция для получения всех markdown файлов из папки (включая published)
function getMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    // Пропускаем только служебные файлы, но не папку published
    if (item === 'REPORT.md' || item === 'manifest.json') {
      continue;
    }

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (path.extname(item) === '.md' || path.extname(item) === '.markdown') {
      // Также пропускаем файлы с именем REPORT
      if (path.basename(item, path.extname(item)) === 'REPORT') {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

// Функция для преобразования markdown в HTML (упрощенная)
function markdownToHtml(md) {
  // Простая замена основных markdown элементов
  let html = md
    // Заголовки
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Жирный текст
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Курсив
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Параграфы
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>')
    // Убираем лишние теги в начале и конце
    .replace(/^<p>/, '')
    .replace(/<p>$/, '');

  // Оборачиваем в основной параграф
  html = `<p>${html}</p>`;

  return html;
}

// Основная функция генерации RSS
function generateFeed() {
  console.log('Генерация RSS-ленты...');

  // Создаем RSS-ленту
  const feed = new Feed({
    title: 'ZenMaster Articles',
    description: 'AI-generated articles for Yandex Dzen',
    id: SITE_URL,
    link: SITE_URL,
    language: 'ru',
    image: `${SITE_URL}/logo.png`, // Используем SITE_URL вместо BASE_URL
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ZenMaster`,
    updated: new Date(), // Дата последнего обновления ленты
    generator: 'ZenMaster RSS Generator'
  });

  // Получаем все markdown файлы из всех возможных директорий
  const markdownFiles = [
    ...getMarkdownFiles('./articles'),
    ...getMarkdownFiles('./test-output'),
  ];
  console.log(`Найдено ${markdownFiles.length} markdown файлов`);

  // Проходимся по каждому файлу
  for (const filePath of markdownFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);

      const frontmatter = parsed.data;
      const content = parsed.content;

      // Проверяем обязательные поля
      if (!frontmatter.title || !frontmatter.date) {
        console.warn(`⚠️  Пропущен файл ${filePath}: отсутствует title или date`);
        continue;
      }

      // Формируем URL для статьи
      const fileName = path.basename(filePath, path.extname(filePath));

      // Для статьи используем URL Vercel приложения
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : BASE_URL;
      const articleUrl = `${vercelUrl}/articles/${fileName}`;

      // Ищем реальное имя файла изображения, соответствующее значению в frontmatter
      let actualImageFileName = frontmatter.image;
      if (frontmatter.image && !frontmatter.image.startsWith('http')) {
        // Получаем директорию, где должна находиться статья
        const articleDir = path.dirname(filePath);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

        // Ищем файл изображения, соответствующий шаблону
        const filesInDir = fs.readdirSync(articleDir);
        for (const file of filesInDir) {
          const fileExt = path.extname(file).toLowerCase();
          if (imageExtensions.includes(fileExt)) {
            const baseName = path.basename(file, fileExt);
            const expectedBaseName = path.basename(frontmatter.image, path.extname(frontmatter.image));

            // Проверяем, соответствует ли имя файла шаблону: expectedName-timestamp-suffix
            // или просто содержит ожидаемое имя (для случаев с timestamp'ами)
            if (baseName.includes(expectedBaseName)) {
              actualImageFileName = file; // Нашли реальное имя файла с timestamp'ом
              break;
            }
          }
        }
      }

      // Определяем URL изображения
      let imageUrl = '';
      if (frontmatter.image) {
        // Если image - абсолютный URL, используем как есть
        if (frontmatter.image.startsWith('http')) {
          imageUrl = frontmatter.image;
        } else {
          // Используем актуальное имя файла изображения
          const relativePath = path.relative('./articles', filePath);
          const dirPath = path.dirname(relativePath);

          // Формируем URL для изображения на GitHub (а не на GitHub Pages)
          // Пример: https://raw.githubusercontent.com/username/repository/main/articles/path/image.jpg
          const githubRawBaseUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY || 'crosspostly/dzen'}/main`;

          // Путь к изображению в формате articles/директория/файл
          const imagePath = path.join('articles', dirPath, actualImageFileName);
          imageUrl = `${githubRawBaseUrl}/${imagePath}`.replace(/\\/g, '/');
        }
      }

      // Преобразуем дату
      const date = new Date(frontmatter.date);

      // Добавляем статью в ленту
      feed.addItem({
        title: frontmatter.title,
        id: articleUrl,
        link: articleUrl,
        description: frontmatter.description || content.substring(0, 200) + '...',
        content: markdownToHtml(content),
        image: imageUrl, // URL изображения
        date: date,
        category: frontmatter.category ? [{ name: frontmatter.category }] : [],
        enclosure: imageUrl ? {
          url: imageUrl,
          type: getImageMimeType(actualImageFileName),
          size: 0 // Размер будет определен при фактическом размещении
        } : undefined
      });

      console.log(`✅ Добавлена статья: ${frontmatter.title}`);

    } catch (error) {
      console.error(`❌ Ошибка при обработке файла ${filePath}:`, error.message);
    }
  }

  // Записываем RSS-ленту в файл
  const feedXml = feed.rss2();
  fs.writeFileSync('./feed.xml', feedXml, 'utf8');

  console.log(`\n✅ RSS-лента успешно создана: feed.xml`);
  console.log(`📋 Количество статей в ленте: ${feed.items.length}`);
}

// Вспомогательная функция для определения MIME-типа изображения
function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  return mimeTypes[ext] || 'image/jpeg';
}

// Запускаем генерацию
generateFeed();