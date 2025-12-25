#!/usr/bin/env node

/**
 * Скрипт генерации RSS-ленты для Яндекс Дзен
 * Читает markdown-файлы из articles/ и создает feed.xml
 * 
 * Структура папок ПОСЛЕ публикации:
 * articles/published/women-35-60/2025-12-25/article.md
 * articles/published/women-35-60/2025-12-25/image.jpg
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Feed } from 'feed';

const BASE_URL = process.env.BASE_URL || 'https://dzen-livid.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';

/**
 * Получить все markdown файлы из папки (ИСКЛЮЧАЯ published и служебные файлы)
 */
function getMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    // Пропускаем служебные элементы
    if (item === 'published' || item === 'REPORT.md' || item === 'manifest.json' || item.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (path.extname(item).toLowerCase() === '.md') {
      if (path.basename(item, path.extname(item)) !== 'REPORT') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Получить все markdown файлы из папки published
 */
function getPublishedMarkdownFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (item === '.gitkeep' || item.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getPublishedMarkdownFiles(fullPath));
    } else if (path.extname(item).toLowerCase() === '.md') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Скопировать файл с созданием необходимых директорий
 */
function copyFile(source, destination) {
  const destDir = path.dirname(destination);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, destination);
}

/**
 * Переместить файл в published (копирование + удаление исходника)
 */
function moveFileToPublished(filePath) {
  try {
    if (filePath.includes('published')) {
      return; // Уже в published
    }

    const relativePath = path.relative('./articles', filePath);
    const publishedPath = path.join('./articles/published', relativePath);
    const publishedDir = path.dirname(publishedPath);

    fs.mkdirSync(publishedDir, { recursive: true });
    copyFile(filePath, publishedPath);
    console.log(`   📁 Скопировано в published: ${relativePath}`);

    // Копируем связанные изображения
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    const filesInDir = fs.existsSync(fileDir) ? fs.readdirSync(fileDir) : [];

    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        
        // Проверяем, соответствует ли имя файла статье
        if (baseName.startsWith(fileName) || fileName.startsWith(baseName) || baseName.includes(fileName)) {
          const imageFile = path.join(fileDir, file);
          const publishedImageFile = path.join(publishedDir, file);

          if (fs.existsSync(imageFile)) {
            copyFile(imageFile, publishedImageFile);
            console.log(`   🖼️  Скопировано изображение: ${file}`);
          }
        }
      }
    }

    // Удаляем исходные файлы
    try {
      fs.unlinkSync(filePath);
      console.log(`   🗑️  Удален исходный файл: ${relativePath}`);
    } catch (err) {
      console.warn(`   ⚠️  Не удалось удалить ${relativePath}: ${err.message}`);
    }

    // Удаляем связанные изображения
    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        if (baseName.startsWith(fileName) || fileName.startsWith(baseName) || baseName.includes(fileName)) {
          const imageFile = path.join(fileDir, file);
          if (fs.existsSync(imageFile)) {
            try {
              fs.unlinkSync(imageFile);
              console.log(`   🗑️  Удалено изображение: ${file}`);
            } catch (err) {
              console.warn(`   ⚠️  Не удалось удалить ${file}: ${err.message}`);
            }
          }
        }
      }
    }

    // Удаляем пустые папки
    let currentDir = fileDir;
    while (currentDir !== './articles' && currentDir !== '.' && fs.existsSync(currentDir)) {
      try {
        const files = fs.readdirSync(currentDir);
        if (files.length === 0) {
          fs.rmdirSync(currentDir);
          console.log(`   🗑️  Удалена пустая папка: ${path.relative('./articles', currentDir)}`);
          currentDir = path.dirname(currentDir);
        } else {
          break;
        }
      } catch (err) {
        break;
      }
    }

  } catch (error) {
    console.error(`❌ Ошибка при перемещении ${filePath}:`, error.message);
  }
}

/**
 * Простое преобразование Markdown в HTML
 */
function markdownToHtml(md) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>')
    .replace(/^<p>/, '')
    .replace(/<p>$/, '');

  html = `<p>${html}</p>`;
  return html;
}

/**
 * Получить MIME тип изображения
 */
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

/**
 * Получить полный URL изображения с правильной структурой папок
 * 
 * Если файл в: articles/published/women-35-60/2025-12-25/article.md
 * То картинка в: articles/published/women-35-60/2025-12-25/image.jpg
 * И URL должен быть: https://raw.githubusercontent.com/crosspostly/dzen/main/articles/published/women-35-60/2025-12-25/image.jpg
 */
function getImageUrl(filePath, imageName) {
  if (!imageName) return '';
  
  // Если это уже полный URL
  if (imageName.startsWith('http')) {
    return imageName;
  }

  // Получаем папку, где находится статья
  const articleDir = path.dirname(filePath);
  
  // Получаем относительный путь от articles (включая published если статья там)
  let relativeDirPath = path.relative('./articles', articleDir);
  
  // Убедимся, что структура правильная для GitHub Raw URL
  // articles/published/women-35-60/2025-12-25/ -> articles/published/women-35-60/2025-12-25/
  relativeDirPath = relativeDirPath.replace(/\\/g, '/'); // Windows paths
  
  const githubRawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;
  const imageUrl = `${githubRawUrl}/articles/${relativeDirPath}/${imageName}`;
  
  return imageUrl;
}

/**
 * Генерировать RSS-ленту
 */
function generateFeed() {
  console.log('🚀 Генерация RSS-ленты...');

  const feed = new Feed({
    title: 'ZenMaster Articles',
    description: 'AI-generated articles for Yandex Dzen',
    id: SITE_URL,
    link: SITE_URL,
    language: 'ru',
    image: `${SITE_URL}/logo.png`,
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ZenMaster`,
    updated: new Date(),
    generator: 'ZenMaster RSS Generator'
  });

  // Получаем файлы
  const markdownFiles = getMarkdownFiles('./articles');
  console.log(`📝 Найдено ${markdownFiles.length} новых markdown файлов`);

  const publishedFiles = getPublishedMarkdownFiles('./articles/published');
  console.log(`✅ Найдено ${publishedFiles.length} опубликованных статей`);

  const allFiles = [...markdownFiles, ...publishedFiles];

  // Обрабатываем каждый файл
  for (const filePath of allFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      const frontmatter = parsed.data;
      const content = parsed.content;

      if (!frontmatter.title || !frontmatter.date) {
        console.warn(`⚠️  Пропущен ${filePath}: нет title или date`);
        continue;
      }

      const fileName = path.basename(filePath, path.extname(filePath));
      
      // URL статьи на Vercel
      const vercelUrl = `https://${process.env.VERCEL_URL || 'dzen-livid.vercel.app'}`;
      const articleUrl = `${vercelUrl}/articles/${fileName}`;

      // Получаем правильный URL изображения
      let imageUrl = '';
      if (frontmatter.image) {
        imageUrl = getImageUrl(filePath, frontmatter.image);
      }

      // Преобразуем дату
      const date = new Date(frontmatter.date);

      // Добавляем статью
      feed.addItem({
        title: frontmatter.title,
        id: articleUrl,
        link: articleUrl,
        description: frontmatter.description || content.substring(0, 200) + '...',
        content: markdownToHtml(content),
        image: imageUrl,
        date: date,
        category: frontmatter.category ? [{ name: frontmatter.category }] : [],
        enclosure: imageUrl ? {
          url: imageUrl,
          type: getImageMimeType(frontmatter.image || ''),
          size: 0
        } : undefined
      });

      console.log(`✅ Статья: ${frontmatter.title}`);
      console.log(`   Link: ${articleUrl}`);
      if (imageUrl) {
        console.log(`   Image: ${imageUrl}`);
      }

      // Перемещаем новые файлы в published
      if (!filePath.includes('published')) {
        moveFileToPublished(filePath);
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки ${filePath}:`, error.message);
    }
  }

  // Записываем RSS
  const feedXml = feed.rss2();
  fs.writeFileSync('./feed.xml', feedXml, 'utf8');

  console.log(`\n✅ RSS-лента создана: feed.xml`);
  console.log(`📊 Статей в ленте: ${feed.items.length}`);
}

// Запуск
generateFeed();
