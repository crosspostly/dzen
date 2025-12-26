#!/usr/bin/env node

/**
 * 📡 RSS Feed Generator for Yandex Dzen
 * 
 * Генерирует RSS фид из статей в папке articles/
 * с правильными URL'ами для Dzen канала и GitHub изображений
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// ⚙️ КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki';  // ✅ ТВОЙ КАНАЛ!

const STATS = {
  total: 0,
  processed: 0,
  failed: 0,
  skipped: 0
};

// ═══════════════════════════════════════════════════════════════
// 📂 ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════

/**
 * Получить все файлы статей из папки articles/
 */
function getArticleFiles(mode) {
  const articlesDir = path.join(process.cwd(), 'articles');
  
  if (!fs.existsSync(articlesDir)) {
    console.error('❌ ERROR: articles/ folder not found!');
    process.exit(1);
  }

  let files = [];

  // FULL mode: все статьи (women-35-60 + published)
  if (mode === 'full') {
    console.log('🔄 FULL mode: collecting all articles...');
    files = getAllMdFiles(articlesDir);
  }
  
  // INCREMENTAL mode: только женщины-35-60 (новые)
  else if (mode === 'incremental') {
    console.log('📧 INCREMENTAL mode: collecting new articles...');
    const womenDir = path.join(articlesDir, 'women-35-60');
    if (fs.existsSync(womenDir)) {
      files = getAllMdFiles(womenDir);
    }
  }
  
  else {
    console.error(`❌ Unknown mode: ${mode}`);
    process.exit(1);
  }

  return files.filter(f => f.endsWith('.md'));
}

/**
 * Рекурсивно получить все .md файлы из папки
 */
function getAllMdFiles(dir) {
  let files = [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Рекурсия в подпапки
      files = files.concat(getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Проверить что изображение существует
 */
function imageExists(articlePath) {
  const dir = path.dirname(articlePath);
  const name = path.basename(articlePath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);
  
  return fs.existsSync(imagePath);
}

/**
 * Построить URL изображения на GitHub
 */
function getImageUrl(articlePath) {
  // Пример: /home/user/dzen/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.md
  // Нужно: https://raw.githubusercontent.com/.../articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg
  
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  
  // Заменяем .md на .jpg и строим URL
  const imageRelative = relativePath.replace(/\.md$/, '.jpg');
  const imageUrl = `${BASE_URL}/articles/${imageRelative}`;
  
  return imageUrl;
}

/**
 * Получить папку канала из пути (например "women-35-60")
 */
function getChannel(articlePath) {
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  const parts = relativePath.split(path.sep);
  
  // Первая часть это канал
  return parts[0] || 'unknown';
}

/**
 * Почистить HTML для description (первые 200 символов)
 */
function getDescription(content) {
  // Убираем HTML теги и берём первые 200 символов
  const text = content
    .replace(/<[^>]*>/g, '')           // Удаляем теги
    .replace(/\n+/g, ' ')              // Переносы в пробелы
    .trim()
    .substring(0, 200);
  
  return text + (text.length >= 200 ? '...' : '');
}

/**
 * Экранировать спецсимволы для XML
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Конвертировать дату в RFC822 формат
 */
function toRFC822(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toUTCString();
  } catch (e) {
    return new Date().toUTCString();
  }
}

/**
 * Генерировать RSS фид
 */
function generateRssFeed(articles) {
  const now = new Date().toUTCString();
  
  let rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Yandex Dzen Feed</title>
    <link>${DZEN_CHANNEL}</link>
    <description>Content Feed</description>
    <lastBuildDate>${now}</lastBuildDate>
    <language>ru</language>
    <generator>ZenMaster RSS Generator v2.1</generator>
`;

  // Добавляем каждую статью
  for (const article of articles) {
    const {
      title,
      description,
      content,
      date,
      imageUrl,
      itemId
    } = article;

    const pubDate = toRFC822(date);
    const escapedTitle = escapeXml(title);
    const escapedDescription = escapeXml(description);
    
    rssContent += `
    <item>
      <title><![CDATA[${escapedTitle}]]></title>
      <description><![CDATA[${escapedDescription}]]></description>
      <link>${DZEN_CHANNEL}</link>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${DZEN_CHANNEL}/${itemId}</guid>
      
      <content:encoded><![CDATA[
${content}
      ]]></content:encoded>
      
      <enclosure 
        url="${imageUrl}" 
        type="image/jpeg" 
      />
    </item>
`;
  }

  rssContent += `
  </channel>
</rss>`;

  return rssContent;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 ОСНОВНОЙ ПРОЦЕСС
// ═══════════════════════════════════════════════════════════════

async function main() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  📡 RSS Feed Generator for Yandex Dzen            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📋 Mode: ${MODE}`);
    console.log(`🔗 Dzen Channel: ${DZEN_CHANNEL}`);
    console.log(`📦 Base URL: ${BASE_URL}`);
    console.log('');

    // Получаем список файлов
    const articleFiles = getArticleFiles(MODE);
    STATS.total = articleFiles.length;

    if (STATS.total === 0) {
      console.error('❌ ERROR: No .md files found in articles/');
      process.exit(1);
    }

    console.log(`📚 Found ${STATS.total} article(s)\n`);

    // Обрабатываем каждый файл
    const processedIds = new Set();
    const articles = [];

    for (const filePath of articleFiles) {
      try {
        // Читаем файл
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontmatter, content: body } = matter(fileContent);

        // Проверяем обязательные поля
        if (!frontmatter.title || !frontmatter.date) {
          console.log(`⏭️  SKIP (no title/date): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        // Проверяем что изображение существует
        if (!imageExists(filePath)) {
          console.log(`⏭️  SKIP (no image): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        // Генерируем ID статьи
        const fileName = path.basename(filePath, '.md');
        const itemId = `${fileName}::${frontmatter.date}`;

        // Пропускаем если уже обработали
        if (processedIds.has(itemId)) {
          console.log(`⏭️  SKIP (already processed): ${fileName}`);
          STATS.skipped++;
          continue;
        }

        // Получаем URL изображения
        const imageUrl = getImageUrl(filePath);

        // Получаем описание
        const description = frontmatter.description || getDescription(body);

        // Добавляем в массив
        articles.push({
          title: frontmatter.title,
          description: description,
          content: body,
          date: frontmatter.date,
          imageUrl: imageUrl,
          itemId: itemId
        });

        processedIds.add(itemId);
        STATS.processed++;

        console.log(`✅ ADDED: ${fileName}`);

      } catch (error) {
        console.error(`❌ ERROR processing ${path.relative(process.cwd(), filePath)}: ${error.message}`);
        STATS.failed++;
      }
    }

    // Генерируем RSS
    console.log('');
    console.log('🔄 Generating RSS feed...');
    
    const rssFeed = generateRssFeed(articles);

    // Создаём папку public если нужно
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('📁 Created public/ directory');
    }

    // Пишем файл
    const feedPath = path.join(publicDir, 'feed.xml');
    fs.writeFileSync(feedPath, rssFeed, 'utf8');

    console.log(`✅ RSS feed generated: ${feedPath}`);
    console.log(`   Size: ${fs.statSync(feedPath).size} bytes`);

    // Статистика
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  📊 Statistics                                     ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`📚 Total files: ${STATS.total}`);
    console.log(`✅ Processed: ${STATS.processed}`);
    console.log(`⏭️  Skipped: ${STATS.skipped}`);
    console.log(`❌ Failed: ${STATS.failed}`);
    console.log('');

    // Проверяем что хотя бы что-то обработалось
    if (STATS.processed === 0) {
      console.error('❌ ERROR: No articles were processed!');
      process.exit(1);
    }

    console.log('✅ RSS feed generation completed successfully!');
    console.log('');

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});