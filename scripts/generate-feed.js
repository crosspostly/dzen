#!/usr/bin/env node

/**
 * Генератор RSS для Яндекс Дзен
 * 
 * Версия: 2.2 - ИСПРАВЛЕННАЯ (правильные ссылки на images)
 * РЕЖИМ: node scripts/generate-feed.js incremental (только новые)
 * РЕЖИМ: node scripts/generate-feed.js full (ВСЕ статьи из всех папок)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Feed } from 'feed';

const BASE_URL = process.env.BASE_URL || 'https://dzen-livid.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';
const MODE = process.argv[2] || 'incremental';

console.log(`\n🚀 Режим: ${MODE === 'full' ? '🔄 ПОЛНАЯ ПЕРЕГЕНЕРАЦИЯ (все статьи)' : '📥 ИНКРЕМЕНТАЛЬНЫЙ (только новые)'}\n`);

/**
 * Получить ВСЕ markdown файлы из папки (рекурсивно)
 */
function getAllMarkdownFiles(dir, excludePublished = false) {
  const files = [];
  
  function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      // Пропускаем папку published только если EXCLUDE_PUBLISHED = true
      if (excludePublished && item === 'published') {
        continue;
      }
      if (item === 'REPORT.md' || item === 'manifest.json' || item.startsWith('.')) {
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

  console.warn(`⚠️  НЕ НАЙДЕНО ИЗОБРАЖЕНИЕ: ${imageName}`);
  return null;
}

function markdownToHtml(md) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.+?)__/gim, '<strong>$1</strong>')
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
  console.log(`🚀 Начинаю генерацию RSS...\n`);

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
    generator: 'ZenMaster RSS Generator v2.2',
    author: { name: "ZenMaster", email: "info@crosspostly.com", link: SITE_URL }
  });

  const processedIds = new Set();
  let stats = { total: 0, skipped: 0, processed: 0, imageErrors: 0 };
  let allFiles = [];

  if (MODE === 'full') {
    // ✅ FULL MODE: ИЩЕМ ВО ВСЕХ ПАПКАХ (и women-35-60, и published)
    console.log(`📡 FULL MODE: Ищу ВСЕ статьи во всех папках...`);
    allFiles = getAllMarkdownFiles('./articles', false); // false = включить published
    console.log(`📡 Найдено ${allFiles.length} статей\n`);
  } else {
    // INCREMENTAL: только новые (исключить published)
    console.log(`📥 INCREMENTAL MODE: Ищу только новые статьи...`);
    allFiles = getAllMarkdownFiles('./articles', true); // true = исключить published
    console.log(`📥 Найдено ${allFiles.length} новых статей\n`);
  }

  stats.total = allFiles.length;

  if (allFiles.length === 0) {
    console.warn(`\n⚠️  ⚠️  ⚠️  НЕ НАЙДЕНО НИ ОДНОЙ СТАТЬИ! ⚠️  ⚠️  ⚠️`);
    console.warn(`\nПроверьте структуру папок:`);
    console.warn(`  articles/`);
    console.warn(`    └─ women-35-60/`);
    console.warn(`        └─ 2025-12-XX/`);
    console.warn(`            └─ название-статьи.md ← ДОЛЖНО БЫТЬ ЗДЕСЬ\n`);
    return;
  }

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

    } catch (error) {
      console.error(`❌ ОШИБКА: ${path.relative('./articles', filePath)} - ${error.message}`);
      stats.skipped++;
    }
  }

  const feedXml = feed.rss2();
  fs.writeFileSync('./public/feed.xml', feedXml, 'utf8');

  console.log(`\n===== СТАТИСТИКА =====${MODE === 'full' ? ' [🔄 FULL]' : ' [📥 INCREMENTAL]'}`);
  console.log(`📊 Всего файлов: ${stats.total}`);
  console.log(`✅ Обработано: ${stats.processed}`);
  console.log(`⚠️  Пропущено: ${stats.skipped}`);
  console.log(`🖼️  Ошибки изображений: ${stats.imageErrors}`);
  console.log(`\n📋 RSS-лента сохранена: public/feed.xml (${feed.items.length} статей)\n`);
}

generateFeed();