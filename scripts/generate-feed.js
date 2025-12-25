#!/usr/bin/env node

/**
 * Генератор RSS для Яндекс Дзен
 * 
 * НАПОЛНи: node scripts/generate-feed.js full
 * или:   node scripts/generate-feed.js incremental
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Feed } from 'feed';

const BASE_URL = process.env.BASE_URL || 'https://dzen-livid.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';
const MODE = process.argv[2] || 'incremental'; // 'full' или 'incremental'

console.log(`\n🚀 Режим: ${MODE === 'full' ? '🔄 ПОЛНАЯ ПЕРЕгЕНЕРАЦИО' : '📥 ПОЛНО НОВЫМ'}`);

/**
 * Получить все markdown файлы из нОВЫХ (НЕ в published)
 */
function getNewMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (item === 'published' || item === 'REPORT.md' || item === 'manifest.json' || item.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getNewMarkdownFiles(fullPath));
    } else if (path.extname(item).toLowerCase() === '.md') {
      if (path.basename(item, path.extname(item)) !== 'REPORT') {
        files.push(fullPath);
      }
    }
  }
  return files;
}

/**
 * Получить ВСЕ маркдаун из published (для full режима)
 */
function getAllPublishedMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === '.gitkeep' || item.startsWith('.')) continue;
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
 * Проверить истинность и существование изображения
 */
function validateImagePath(filePath, imageName) {
  if (!imageName) return null;
  if (imageName.startsWith('http')) return imageName; // Уже полный URL

  const articleDir = path.dirname(filePath);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const filesInDir = fs.existsSync(articleDir) ? fs.readdirSync(articleDir) : [];

  // Пытаемся найти точное имя файла (u0441 timestamp)
  for (const file of filesInDir) {
    const fileExt = path.extname(file).toLowerCase();
    if (imageExtensions.includes(fileExt)) {
      const baseName = path.basename(file, fileExt);
      const expectedBaseName = path.basename(imageName, path.extname(imageName));
      
      // Проверяем равнопоносность базовых имен
      if (baseName.includes(expectedBaseName) || baseName === expectedBaseName) {
        return file; // Найден в том же директории
      }
    }
  }

  console.warn(`⚠️  НЕ НАЙДЕНО изображение: ${imageName} для ${path.relative('./articles', filePath)}`);
  return null;
}

function copyFile(source, destination) {
  const destDir = path.dirname(destination);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, destination);
}

function moveFileToPublished(filePath, frontmatter) {
  try {
    if (filePath.includes('published')) return;

    // Используем дату из frontmatter для структуры published папки
    const date = new Date(frontmatter.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const fileName = path.basename(filePath);
    const publishedPath = path.join('./articles/published', year.toString(), month, day, fileName);
    const publishedDir = path.dirname(publishedPath);

    // Убедимся, что директория существует
    fs.mkdirSync(publishedDir, { recursive: true });
    
    // Копируем markdown файл
    copyFile(filePath, publishedPath);
    console.log(`   📁 Перенесено: published/${year}/${month}/${day}/${fileName}`);

    // Копируем связанные изображения
    const fileDir = path.dirname(filePath);
    const fileName_noExt = path.basename(filePath, path.extname(filePath));
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const filesInDir = fs.existsSync(fileDir) ? fs.readdirSync(fileDir) : [];

    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        // Более точное совпадение
        if (baseName.startsWith(fileName_noExt) || fileName_noExt.startsWith(baseName) || baseName.includes(fileName_noExt)) {
          const imageFile = path.join(fileDir, file);
          const publishedImageFile = path.join(publishedDir, file);
          if (fs.existsSync(imageFile)) copyFile(imageFile, publishedImageFile);
        }
      }
    }

    // Удаляем markdown файл после копирования
    try { fs.unlinkSync(filePath); } catch (e) {}

    // Удаляем изображения после копирования
    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        if (baseName.startsWith(fileName_noExt) || fileName_noExt.startsWith(baseName) || baseName.includes(fileName_noExt)) {
          const imageFile = path.join(fileDir, file);
          if (fs.existsSync(imageFile)) {
            try { fs.unlinkSync(imageFile); } catch (e) {}
          }
        }
      }
    }

    // Удаляем пустые директории
    let currentDir = fileDir;
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
    console.error(`❌ Ошибка при перемещении: ${error.message}`);
  }
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
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
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
    generator: 'ZenMaster RSS Generator',
    author: {
      name: "ZenMaster",
      email: "info@crosspostly.com",
      link: SITE_URL
    }
  });

  const processedIds = new Set(); // Для дедупликации
  let stats = { total: 0, skipped: 0, processed: 0, imageErrors: 0 };

  let allFiles = [];

  if (MODE === 'full') {
    // ПОЛНАЯ ПЕРЕГЕНЕРАЦИО: используем ВСЕ из published
    const publishedFiles = getAllPublishedMarkdownFiles('./articles/published');
    console.log(`📡 Найдено ${publishedFiles.length} пропубликованных статей\n`);
    allFiles = publishedFiles;
  } else {
    // ПОЛНО НОВЫМ: новые + старые
    const newFiles = getNewMarkdownFiles('./articles');
    const publishedFiles = getAllPublishedMarkdownFiles('./articles/published');
    console.log(`📥 Новых: ${newFiles.length}, Опубликованных: ${publishedFiles.length}\n`);
    allFiles = [...newFiles, ...publishedFiles];
  }

  stats.total = allFiles.length;

  for (const filePath of allFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      const frontmatter = parsed.data;
      const content = parsed.content;

      if (!frontmatter.title || !frontmatter.date) {
        console.warn(`⚠️  Отсутствует title/date: ${path.relative('./articles', filePath)}`);
        stats.skipped++;
        continue;
      }

      const fileName = path.basename(filePath, path.extname(filePath));
      const vercelUrl = `https://${process.env.VERCEL_URL || 'dzen-livid.vercel.app'}`;
      const articleUrl = `${vercelUrl}/articles/${fileName}`;
      const itemId = `${fileName}::${frontmatter.date}`;

      // ДЕДУПЛИКАЦИОН
      if (processedIds.has(itemId)) {
        console.warn(`⚠️  ДУБЛОКАТ: ${fileName}`);
        stats.skipped++;
        continue;
      }
      processedIds.add(itemId);

      // Проверка изображения
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

      // НОВЫЕ файлы переносим в published (ОТКЛИЧАЕМ full)
      if (MODE === 'incremental' && !filePath.includes('published')) {
        moveFileToPublished(filePath, frontmatter);
      }

    } catch (error) {
      console.error(`❌ ОШИБКА: ${path.relative('./articles', filePath)} - ${error.message}`);
      stats.skipped++;
    }
  }

  const feedXml = feed.rss2();
  fs.writeFileSync('./feed.xml', feedXml, 'utf8');

  console.log(`\n===== СТАТНСТИКА =====${MODE === 'full' ? ' [🔄 FULL]' : ' [📥 INCREMENTAL]'}`);
  console.log(`📊 Всего файлов: ${stats.total}`);
  console.log(`✅ Обработано: ${stats.processed}`);
  console.log(`⚠️  Пропущено: ${stats.skipped}`);
  console.log(`🖼️  Ошибки изображений: ${stats.imageErrors}`);
  console.log(`\n📋 RSS-лента сохранена: feed.xml (${feed.items.length} статей)\n`);
}

generateFeed();