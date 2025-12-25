#!/usr/bin/env node

/**
 * Скрипт генерации RSS-ленты для Яндекс Дзен
 * Исправлена структура XML и MIME-типы
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Feed } from 'feed';

const BASE_URL = process.env.BASE_URL || 'https://dzen-livid.vercel.app';
const SITE_URL = process.env.SITE_URL || BASE_URL;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';

/**
 * Получить все markdown файлы
 */
function getMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
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

function getPublishedMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (item === '.gitkeep' || item.startsWith('.')) continue;
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

function copyFile(source, destination) {
  const destDir = path.dirname(destination);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, destination);
}

function moveFileToPublished(filePath) {
  try {
    if (filePath.includes('published')) return;

    const relativePath = path.relative('./articles', filePath);
    const publishedPath = path.join('./articles/published', relativePath);
    const publishedDir = path.dirname(publishedPath);

    fs.mkdirSync(publishedDir, { recursive: true });
    copyFile(filePath, publishedPath);

    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const filesInDir = fs.existsSync(fileDir) ? fs.readdirSync(fileDir) : [];

    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        if (baseName.startsWith(fileName) || fileName.startsWith(baseName) || baseName.includes(fileName)) {
          const imageFile = path.join(fileDir, file);
          const publishedImageFile = path.join(publishedDir, file);
          if (fs.existsSync(imageFile)) copyFile(imageFile, publishedImageFile);
        }
      }
    }

    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn(`⚠️ Не удалось удалить ${relativePath}: ${err.message}`);
    }

    for (const file of filesInDir) {
      const fileExt = path.extname(file).toLowerCase();
      if (imageExtensions.includes(fileExt)) {
        const baseName = path.basename(file, fileExt);
        if (baseName.startsWith(fileName) || fileName.startsWith(baseName) || baseName.includes(fileName)) {
          const imageFile = path.join(fileDir, file);
          if (fs.existsSync(imageFile)) {
            try { fs.unlinkSync(imageFile); } catch (e) {}
          }
        }
      }
    }

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
      } catch (err) { break; }
    }
  } catch (error) {
    console.error(`❌ Ошибка перемещения ${filePath}:`, error.message);
  }
}

/**
 * Исправленный конвертер HTML
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
    .replace(/\n/gim, '<br>') // Оставляем переносы внутри параграфов
    .replace(/^<p><br>/, '<p>') // Убираем BR в начале первого параграфа
    .replace(/<p><br>/g, '<p>') // Убираем BR в начале остальных параграфов
    .replace(/^<br>/, '')
    .replace(/^<p>/, '')
    .replace(/<p>$/, '');

  html = `<p>${html}</p>`;
  return html;
}

/**
 * Правильный MIME тип (image/jpg -> image/jpeg)
 */
function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',  // ВАЖНО: исправлено для RSS валидаторов
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
    generator: 'ZenMaster RSS Generator',
    // Добавляем namespaces, которые любит Дзен
    feedLinks: {
      rss: `${SITE_URL}/feed.xml`
    },
    author: {
      name: "ZenMaster",
      email: "info@crosspostly.com",
      link: SITE_URL
    }
  });

  // Добавляем кастомные namespaces вручную через опции (библиотека feed это поддерживает ограниченно,
  // но основные добавляет сама. Главное - content).
  // content:encoded добавляется библиотекой автоматически.

  const markdownFiles = getMarkdownFiles('./articles');
  const publishedFiles = getPublishedMarkdownFiles('./articles/published');
  const allFiles = [...markdownFiles, ...publishedFiles];

  for (const filePath of allFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      const frontmatter = parsed.data;
      const content = parsed.content;

      if (!frontmatter.title || !frontmatter.date) continue;

      const fileName = path.basename(filePath, path.extname(filePath));
      const vercelUrl = `https://${process.env.VERCEL_URL || 'dzen-livid.vercel.app'}`;
      const articleUrl = `${vercelUrl}/articles/${fileName}`;

      let imageUrl = '';
      if (frontmatter.image) {
        imageUrl = getImageUrl(filePath, frontmatter.image);
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
          type: getImageMimeType(frontmatter.image || ''),
          size: 0
        } : undefined
      });

      if (!filePath.includes('published')) {
        moveFileToPublished(filePath);
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки ${filePath}:`, error.message);
    }
  }

  const feedXml = feed.rss2();
  fs.writeFileSync('./feed.xml', feedXml, 'utf8');
  console.log(`\n✅ RSS-лента создана: feed.xml (${feed.items.length} статей)`);
}

generateFeed();
