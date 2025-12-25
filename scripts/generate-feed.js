#!/usr/bin/env node

/**
 * Генератор RSS для Яндекс Дзен
 * 
 * Версия: 2.0 - с корректным перемещением статей в published
 * РЕЖИМ: node scripts/generate-feed.js incremental (новые -> published)
 * РЕЖИМ: node scripts/generate-feed.js full (все из published)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Feed } from 'feed';

const BASE_URL = process.env.BASE_URL || 'https://dzen-livid.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';
const MODE = process.argv[2] || 'incremental';

console.log(`\n🚀 Режим: ${MODE === 'full' ? '🔄 ПОЛНАЯ ПЕРЕГЕНЕРАЦИО' : '📥 ИНКРЕМЕНТАЛЬНЫЙ'}`);

/**
 * Получить ВСЕ markdown файлы из папки (рекурсивно)
 */
function getAllMarkdownFiles(dir, excludePublished = false) {
  const files = [];
  
  function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'published' || item === 'REPORT.md' || item === 'manifest.json' || item.startsWith('.')) {
        continue;
      }
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (path.extname(item).toLowerCase() === '.md' && item !== 'REPORT.md') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Получить ВСЕ markdown из published
 */
function getPublishedMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item.startsWith('.')) continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (path.extname(item).toLowerCase() === '.md') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * КЛЮЧЕВАЯ ФУНКЦИЯ: Перемещает статью в published с сохранением труктуры
 * (копирует файлы, ПОТОМ удаляет из исходной папки)
 */
function moveArticleToPublished(filePath, frontmatter) {
  try {
    // Пропускаем если уже в published
    if (filePath.includes('/published/')) return;
    
    // Получаем исходную релативную пать (такая же, как в women-35-60/2025-12-23/)
    const relativePath = path.relative('./articles', filePath); // → women-35-60/2025-12-23/file.md
    const fileName = path.basename(filePath);
    const fileNameNoExt = path.basename(filePath, path.extname(filePath));
    
    // СОХРАНЯЕМ у ПУБЛИКУЕМ: published/women-35-60/2025-12-23/
    const destDirPath = path.join('./articles/published', relativePath.split(path.sep).slice(0, -1).join(path.sep));
    const destFilePath = path.join(destDirPath, fileName);
    
    // Создаём папку published (GIT отследит)
    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
    }
    
    // КОПИРУЕМ markdown файл в published
    const fileContent = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(destFilePath, fileContent, 'utf8');
    console.log(`   ✅ Скопировано в published/${relativePath.split(path.sep).slice(0, -1).join('/')}/${fileName}`);
    
    // КОПИРУЕМ связанные изображения
    const sourceDir = path.dirname(filePath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    if (fs.existsSync(sourceDir)) {
      const sourceFiles = fs.readdirSync(sourceDir);
      
      for (const file of sourceFiles) {
        const fileExt = path.extname(file).toLowerCase();
        if (imageExtensions.includes(fileExt)) {
          const baseName = path.basename(file, fileExt);
          
          // Проверяем, относится ли это изображение к статье
          if (baseName.startsWith(fileNameNoExt) || 
              fileNameNoExt.startsWith(baseName) || 
              baseName.includes(fileNameNoExt) ||
              baseName.length < 20) { // Если имя короткое - скорее всего cover image
            
            const sourceImagePath = path.join(sourceDir, file);
            const destImagePath = path.join(destDirPath, file);
            
            const imageContent = fs.readFileSync(sourceImagePath);
            fs.writeFileSync(destImagePath, imageContent);
            console.log(`   🖼️  Изображение скопировано: ${file}`);
          }
        }
      }
    }
    
    // ===== ЭТАП 2: УДАЛЯЕМ ИЗ ИСХОДНОЙ ПАПКИ (GIT отследит удаление) =====
    try {
      fs.unlinkSync(filePath);
      console.log(`   🗑️  Удалено из источника: ${filePath}`);
    } catch (e) {}
    
    // Удаляем изображения из исходной папки
    if (fs.existsSync(sourceDir)) {
      const sourceFiles = fs.readdirSync(sourceDir);
      for (const file of sourceFiles) {
        const fileExt = path.extname(file).toLowerCase();
        if (imageExtensions.includes(fileExt)) {
          const baseName = path.basename(file, fileExt);
          if (baseName.startsWith(fileNameNoExt) || fileNameNoExt.startsWith(baseName) || baseName.includes(fileNameNoExt)) {
            const sourceImagePath = path.join(sourceDir, file);
            try {
              fs.unlinkSync(sourceImagePath);
            } catch (e) {}
          }
        }
      }
    }
    
    // Очищаем пустые папки
    let currentDir = sourceDir;
    while (currentDir !== './articles' && currentDir !== '.' && fs.existsSync(currentDir)) {
      try {
        const files = fs.readdirSync(currentDir);
        if (files.length === 0) {
          fs.rmdirSync(currentDir);
          currentDir = path.dirname(currentDir);
        } else {
          break;
        }
      } catch (e) { break; }
    }
    
  } catch (error) {
    console.error(`❌ ОШИБКА при перемещении ${filePath}: ${error.message}`);
  }
}

/**
 * Валидация изображения
 */
function validateImagePath(filePath, imageName) {
  if (!imageName) return null;
  if (imageName.startsWith('http')) return imageName;

  const articleDir = path.dirname(filePath);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  if (!fs.existsSync(articleDir)) return null;
  
  const filesInDir = fs.readdirSync(articleDir);
  for (const file of filesInDir) {
    const fileExt = path.extname(file).toLowerCase();
    if (imageExtensions.includes(fileExt)) {
      const baseName = path.basename(file, fileExt);
      const expectedBaseName = path.basename(imageName, path.extname(imageName));
      if (baseName.includes(expectedBaseName) || baseName === expectedBaseName) {
        return file;
      }
    }
  }

  console.warn(`⚠️  НЕ НАЙДЕНО: ${imageName}`);
  return null;
}

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
    .replace(/^<p><br>/, '<p>')
    .replace(/<p><br>/g, '<p>')
    .replace(/^<br>/, '')
    .replace(/^<p>/, '')
    .replace(/<p>$/, '');
  return `<p>${html}</p>`;
}

function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

function getImageUrl(filePath, imageName) {
  if (!imageName) return '';
  if (imageName.startsWith('http')) return imageName;

  const articleDir = path.dirname(filePath);
  let relativeDirPath = path.relative('./articles', articleDir);
  relativeDirPath = relativeDirPath.replace(/\\/g, '/');
  
  const githubRawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;
  return `${githubRawUrl}/articles/${relativeDirPath}/${imageName}`;
}

function generateFeed() {
  console.log(`\n🚀 Начинаю генерацию RSS...\n`);

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
    generator: 'ZenMaster RSS Generator v2.0',
    author: { name: "ZenMaster", email: "info@crosspostly.com", link: SITE_URL }
  });

  const processedIds = new Set();
  let stats = { total: 0, skipped: 0, processed: 0, imageErrors: 0, moved: 0 };
  let allFiles = [];

  if (MODE === 'full') {
    const publishedFiles = getPublishedMarkdownFiles('./articles/published');
    console.log(`📡 Найдено ${publishedFiles.length} статей в published\n`);
    allFiles = publishedFiles;
  } else {
    // INCREMENTAL: новые + все опубликованные
    const newFiles = getAllMarkdownFiles('./articles', true);
    const publishedFiles = getPublishedMarkdownFiles('./articles/published');
    console.log(`📥 Новых: ${newFiles.length}, Опубликованных: ${publishedFiles.length}\n`);
    allFiles = [...newFiles, ...publishedFiles];
  }

  stats.total = allFiles.length;

  for (const filePath of allFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(fileContent);

      if (!frontmatter.title || !frontmatter.date) {
        console.warn(`⚠️  Отсутствует title/date: ${path.relative('./articles', filePath)}`);
        stats.skipped++;
        continue;
      }

      const fileName = path.basename(filePath, path.extname(filePath));
      const vercelUrl = `https://${process.env.VERCEL_URL || 'dzen-livid.vercel.app'}`;
      const articleUrl = `${vercelUrl}/articles/${fileName}`;
      const itemId = `${fileName}::${frontmatter.date}`;

      // ДЕДУПЛИКАЦИЯ
      if (processedIds.has(itemId)) {
        console.warn(`⚠️  ДУБЛОКАТ: ${fileName}`);
        stats.skipped++;
        continue;
      }
      processedIds.add(itemId);

      // ИЗОБРАЖЕНИЕ
      let imageUrl = '';
      let actualImageName = null;
      if (frontmatter.image) {
        actualImageName = validateImagePath(filePath, frontmatter.image);
        if (actualImageName) {
          imageUrl = getImageUrl(filePath, actualImageName);
        } else {
          stats.imageErrors++;
        }
      }

      const date = new Date(frontmatter.date);

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
          type: getImageMimeType(actualImageName || frontmatter.image || ''),
          size: 0
        } : undefined
      });

      console.log(`✅ ${frontmatter.title}`);
      if (imageUrl) console.log(`   🖼️  ${imageUrl}`);
      stats.processed++;

      // ПЕРЕМЕЩАЕМ в published если incremental режим и файл не из published
      if (MODE === 'incremental' && !filePath.includes('/published/')) {
        moveArticleToPublished(filePath, frontmatter);
        stats.moved++;
      }

    } catch (error) {
      console.error(`❌ ОШИБКА: ${path.relative('./articles', filePath)} - ${error.message}`);
      stats.skipped++;
    }
  }

  const feedXml = feed.rss2();
  fs.writeFileSync('./feed.xml', feedXml, 'utf8');

  console.log(`\n===== СТАТИСТИКА =====${MODE === 'full' ? ' [🔄 FULL]' : ' [📥 INCREMENTAL]'}`);
  console.log(`📊 Всего файлов: ${stats.total}`);
  console.log(`✅ Обработано: ${stats.processed}`);
  console.log(`📤 Перемещено: ${stats.moved}`);
  console.log(`⚠️  Пропущено: ${stats.skipped}`);
  console.log(`🖼️  Ошибки изображений: ${stats.imageErrors}`);
  console.log(`\n📋 RSS-лента сохранена: feed.xml (${feed.items.length} статей)\n`);
}

generateFeed();