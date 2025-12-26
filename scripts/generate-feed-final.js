#!/usr/bin/env node

/**
 * 🔥 ФИНАЛЬНЫЙ RSS Feed Generator
 * БЕЗ зависимостей - работает гарантированно!
 */

const fs = require('fs');
const path = require('path');

// ═════════════════════════════════════════════════════════════════
// ⚙️ КОНФИГ
// ═════════════════════════════════════════════════════════════════

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki';

let stats = { total: 0, processed: 0, failed: 0, skipped: 0 };

// ═════════════════════════════════════════════════════════════════
// 🔧 ФУНКЦИИ БЕЗ ЗАВИСИМОСТЕЙ
// ═════════════════════════════════════════════════════════════════

/**
 * Простой парсер frontmatter (без matter library)
 */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  const attributes = {};
  let body = '';
  let inFrontmatter = false;
  let frontmatterEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i === 0 && lines[i].trim() === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
    if (inFrontmatter) {
      const [key, ...valueParts] = lines[i].split(':');
      if (key) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        attributes[key.trim()] = value;
      }
    }
  }

  if (frontmatterEnd > -1) {
    body = lines.slice(frontmatterEnd + 1).join('\n').trim();
  } else {
    body = content;
  }

  return { attributes, body };
}

/**
 * Получить все .md файлы рекурсивно
 */
function getAllMdFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
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
function imageExists(mdPath) {
  const dir = path.dirname(mdPath);
  const name = path.basename(mdPath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);
  return fs.existsSync(imagePath);
}

/**
 * Построить GitHub RAW URL
 */
function getImageUrl(mdPath) {
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, mdPath);
  const imageRelative = relativePath.replace(/\\/g, '/').replace(/\.md$/, '.jpg');
  return `${BASE_URL}/articles/${imageRelative}`;
}

/**
 * Экранировать XML
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Конвертировать дату в RFC822
 */
function toRFC822(dateStr) {
  try {
    return new Date(dateStr).toUTCString();
  } catch (e) {
    return new Date().toUTCString();
  }
}

/**
 * Получить описание (первые 200 символов)
 */
function getDescription(text) {
  const clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.length > 200 ? clean.substring(0, 200) + '...' : clean;
}

// ═════════════════════════════════════════════════════════════════
// 🚀 MAIN
// ═════════════════════════════════════════════════════════════════

try {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  📡 RSS Feed Generator (NO DEPENDENCIES)             ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Mode: ${MODE}`);
  console.log(`🔗 Channel: ${DZEN_CHANNEL}`);
  console.log(`📦 Base URL: ${BASE_URL}`);
  console.log('');

  // Получить файлы
  const articlesDir = path.join(process.cwd(), 'articles');
  if (!fs.existsSync(articlesDir)) {
    throw new Error('❌ articles/ folder not found!');
  }

  let mdFiles = [];
  if (MODE === 'full') {
    console.log('🔄 FULL mode: collecting all articles...');
    mdFiles = getAllMdFiles(articlesDir);
  } else if (MODE === 'incremental') {
    console.log('📧 INCREMENTAL mode: collecting from women-35-60...');
    const womenDir = path.join(articlesDir, 'women-35-60');
    if (fs.existsSync(womenDir)) {
      mdFiles = getAllMdFiles(womenDir);
    }
  } else {
    throw new Error(`Unknown mode: ${MODE}`);
  }

  stats.total = mdFiles.length;
  if (stats.total === 0) {
    throw new Error('❌ No .md files found!');
  }

  console.log(`📚 Found ${stats.total} articles\n`);

  // Обработать файлы
  const articles = [];
  const processedIds = new Set();

  for (const filePath of mdFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { attributes, body } = parseFrontmatter(content);

      // Проверить обязательные поля
      if (!attributes.title || !attributes.date) {
        console.log(`⏭️  SKIP (no title/date): ${path.basename(filePath)}`);
        stats.skipped++;
        continue;
      }

      // Проверить изображение
      if (!imageExists(filePath)) {
        console.log(`⏭️  SKIP (no image): ${path.basename(filePath)}`);
        stats.skipped++;
        continue;
      }

      // Генерировать ID
      const fileName = path.basename(filePath, '.md');
      const itemId = `${fileName}::${attributes.date}`;

      if (processedIds.has(itemId)) {
        console.log(`⏭️  SKIP (already processed): ${fileName}`);
        stats.skipped++;
        continue;
      }

      // Добавить в массив
      articles.push({
        title: attributes.title,
        description: attributes.description || getDescription(body),
        content: body,
        date: attributes.date,
        imageUrl: getImageUrl(filePath),
        itemId: itemId
      });

      processedIds.add(itemId);
      stats.processed++;

      console.log(`✅ ADDED: ${fileName}`);
    } catch (error) {
      console.error(`❌ ERROR: ${path.basename(filePath)} - ${error.message}`);
      stats.failed++;
    }
  }

  console.log('');
  console.log('🔄 Generating RSS...');

  // Генерировать RSS
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
  rss += '  <channel>\n';
  rss += `    <title>Yandex Dzen</title>\n`;
  rss += `    <link>${DZEN_CHANNEL}</link>\n`;
  rss += `    <description>RSS Feed</description>\n`;
  rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  rss += '    <language>ru</language>\n';

  for (const article of articles) {
    rss += '    <item>\n';
    rss += `      <title><![CDATA[${escapeXml(article.title)}]]></title>\n`;
    rss += `      <description><![CDATA[${escapeXml(article.description)}]]></description>\n`;
    rss += `      <link>${DZEN_CHANNEL}</link>\n`;
    rss += `      <pubDate>${toRFC822(article.date)}</pubDate>\n`;
    rss += `      <guid isPermaLink="false">${DZEN_CHANNEL}/${article.itemId}</guid>\n`;
    rss += '      <content:encoded><![CDATA[\n';
    rss += article.content + '\n';
    rss += '      ]]></content:encoded>\n';
    rss += `      <enclosure url="${article.imageUrl}" type="image/jpeg" />\n`;
    rss += '    </item>\n';
  }

  rss += '  </channel>\n';
  rss += '</rss>\n';

  // Написать файл
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 Created public/ directory');
  }

  const feedPath = path.join(publicDir, 'feed.xml');
  fs.writeFileSync(feedPath, rss, 'utf8');

  const fileSize = fs.statSync(feedPath).size;
  console.log(`✅ Feed generated: ${feedPath}`);
  console.log(`   Size: ${fileSize} bytes`);

  // Статистика
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  📊 STATISTICS                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`📚 Total: ${stats.total}`);
  console.log(`✅ Processed: ${stats.processed}`);
  console.log(`⏭️  Skipped: ${stats.skipped}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log('');

  if (stats.processed === 0) {
    throw new Error('No articles were processed!');
  }

  console.log('✅ SUCCESS! RSS feed ready for Yandex Dzen!\n');

} catch (error) {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
