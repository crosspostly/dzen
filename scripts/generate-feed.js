#!/usr/bin/env node

/**
 * 📡 RSS Feed Generator for Yandex Dzen
 * 
 * Генерирует RSS фид из статей в папке articles/
 * с правильными URL'ами для Dzen канала и GitHub изображений
 * 
 * ⚠️ ВАЖНО: Для Яндекс Дзен обязательны:
 * - length в enclosure (размер в байтах) ✅ ЗАДАЧА 1
 * - HTML теги balanced (закрытые) ✅ ЗАДАЧА 2
 * - atom:link в channel ✅ ЗАДАЧА 3
 * - GUID уникальные ✅ ЗАДАЧА 4
 * - pubDate с интервалом 3 часа от текущего времени ✅ ЗАДАЧА 5
 * - lastBuildDate актуальная ✅ ЗАДАЧА 6
 * - category: format-article, index, comment-all (БЕЗ native-draft!) ✅
 * - description в CDATA ✅
 * - media:rating ✅
 * - content:encoded в CDATA ✅
 * - *** markers converted to breaks ✅
 * - GitHub images wrapped in <figure> ✅
 * - pubDate начинается с текущего времени + 3 часа ✅ v2.10
 * - интервал 90 минут между статьями ✅ v2.10
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// ⚙️ КОНФИГУРАЦИЯ
// ══════════════════════════════════════════════════════════════════════════════

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki';  // ✅ ТВОЙ КАНАЛ!
const RSS_URL = 'https://dzen-livid.vercel.app/feed.xml';  // URL фида для atom:link
const DEFAULT_IMAGE_SIZE = 50000;  // 50KB - дефолтный размер для enclosure length

// ✅ v2.10: Constants for scheduling
const INITIAL_OFFSET_HOURS = 3;      // Start from now + 3 hours
const INTERVAL_MINUTES = 90;         // Interval between each article

const STATS = {
  total: 0,
  processed: 0,
  failed: 0,
  skipped: 0
};

// ══════════════════════════════════════════════════════════════════════════════
// 📄 ФУНКЦИИ
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 🧹 ВАЖНО! Заменяет *** маркеры на пустые строки для разделения
 * НЕ удаляет, а ПРЕОБРАЗУЕТ в структурные разделители (пустые строки)
 * Это сохраняет визуальное разделение между сценами/мыслями!
 * 
 * ВАЖНО: *** используются для разделения сцен/мыслей, это структурный элемент!
 * Если просто удалить - текст слипнется в одну простыню.
 * Правильно: преобразовать в пустую строку, чтобы в HTML стало <p></p> разделение.
 * 
 * @param {string} content - контент со звёздочками ***
 * @returns {string} контент со звёздочками преобразованными в разделители
 */
function cleanArticleMarkers(content) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // 1️⃣ Заменяем строки ТОЛЬКО с *** (и пробелами вокруг) на пустые строки
  // Это преобразует *** в разделитель между абзацами
  content = content.replace(/^\s*\*\*\*\s*$/gm, '');
  // ↑ Удаляет МАРКЕР, но оставляет разделение (новая строка после замены)!
  
  // 2️⃣ Очищаем пробелы в начале/конце строк (кроме пустых)
  content = content.split('\n').map(line => line.trim()).join('\n');
  
  // 3️⃣ Очищаем множественные пробелы (но НЕ переносы!)
  content = content.replace(/[ \t]+/g, ' ');
  
  // 4️⃣ ВАЖНО! Нормализуем переносы: оставляем макс 2 подряд (= 1 пустая строка)
  // Это удаляет ЛИШНИЕ переносы, но сохраняет нормальное разделение
  content = content.replace(/\n{3,}/g, '\n\n');
  // Примеры:
  // "Текст 1\n\n\n\nТекст 2" → "Текст 1\n\nТекст 2" (удаляем лишние)
  // "Текст 1\n\nТекст 2" → "Текст 1\n\nТекст 2" (оставляем, это правильно)
  
  return content.trim();
}

/**
 * 🖼️ Обёртывает GitHub изображения в <figure> теги для Дзена
 * Если в контенте есть ссылки на raw.githubusercontent.com - обёрнут в <figure>
 * @param {string} html - HTML контент
 * @returns {string} HTML с изображениями в <figure>
 */
function wrapGithubImagesInFigure(html) {
  if (!html) return html;
  
  // Ищем img теги с GitHub URL'ами и обёртываем их в figure
  // НО ТОЛЬКО если они не уже в figure!
  html = html.replace(
    /<img\s+src=["']https:\/\/raw\.githubusercontent\.com\/[^"']+["'][^>]*>/g,
    (match) => {
      // Проверяем, не уже ли этот img в figure
      if (match.includes('<figure>')) {
        return match; // Уже обёрнут, не трогаем
      }
      // Обёртываем в figure
      return `<figure>${match}</figure>`;
    }
  );
  
  return html;
}

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
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  const imageRelative = relativePath.replace(/\.md$/, '.jpg');
  const imageUrl = `${BASE_URL}/articles/${imageRelative}`;
  
  return imageUrl;
}

/**
 * ✅ ЗАДАЧА 1: Получить размер файла изображения в байтах
 * Для локальных файлов читаем реальный размер
 * @param {string} articlePath - путь к файлу статьи
 * @returns {number} размер в байтах или DEFAULT_IMAGE_SIZE
 */
function getImageSize(articlePath) {
  const dir = path.dirname(articlePath);
  const name = path.basename(articlePath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);
  
  try {
    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      return stats.size;
    }
    console.warn(`⚠️  WARNING: Image file not found: ${imagePath}, using default size`);
    return DEFAULT_IMAGE_SIZE;
  } catch (error) {
    console.warn(`⚠️  WARNING: Error getting image size: ${error.message}, using default`);
    return DEFAULT_IMAGE_SIZE;
  }
}

/**
 * Получить папку канала из пути (например "women-35-60")
 */
function getChannel(articlePath) {
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  const parts = relativePath.split(path.sep);
  
  return parts[0] || 'unknown';
}

/**
 * Почистить HTML для description (первые 200 символов)
 */
function getDescription(content) {
  const text = content
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 200);
  
  return text + (text.length >= 200 ? '...' : '');
}

/**
 * 🧹 Очистить контент для безопасного CDATA
 * Убирает ANSI коды, управляющие символы, нормализует UTF-8
 */
function sanitizeForCdata(content) {
  if (!content) return '';
  
  content = String(content);
  
  // 1️⃣ Удалить ANSI escape коды (все варианты)
  content = content.replace(/\x1b\[[0-9;]*m/g, '');
  content = content.replace(/\[\d+m/g, '');
  
  // 2️⃣ Удалить все управляющие символы включая null bytes
  content = content.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 3️⃣ Экранировать CDATA delimiters
  content = content.replace(/\]\]>/g, ']]&gt;');
  
  // 4️⃣ Удалить невалидные UTF-8 последовательности и повторно очистить
  try {
    const buf = Buffer.from(content, 'utf8');
    content = buf.toString('utf8');
    content = content.replace(/[\x00-\x1F\x7F]/g, '');
  } catch (e) {
    console.warn('⚠️  WARNING: UTF-8 decoding error, sanitizing...');
    content = content.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  
  // 5️⃣ Нормализовать whitespace
  content = content.replace(/\s+/g, ' ');
  
  return content.trim();
}

/**
 * 📅 Проверить что статья свежая (не старше N дней)
 */
function isRecentDate(dateStr, maxDaysOld = 7) {
  try {
    const articleDate = new Date(dateStr);
    const now = new Date();
    
    if (isNaN(articleDate.getTime())) {
      console.warn(`⚠️  WARNING: Invalid date format: "${dateStr}"`);
      return false;
    }
    
    const diffMs = now.getTime() - articleDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffDays <= maxDaysOld;
  } catch (e) {
    console.warn(`⚠️  ERROR parsing date "${dateStr}": ${e.message}`);
    return false;
  }
}

/**
 * 🧹 Экранировать спецсимволы для XML (но не для CDATA!)
 * & ДОЛЖЕН БЫТЬ ПЕРВЫМ!
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════════
// 📅 TIMELINE PUBLISHING INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

import { getNextPublishingSlot, getTimelineForArticle } from './timeline-manager.js';

/**
 * ✅ TASK #135: Timeline-aware pubDate generation
 * 
 * LOGIC:
 * - Each article category can have its own timeline
 * - Select appropriate timeline based on article path
 * - Generate pubDates sequentially with timeline-specific intervals
 * - Respect publishing windows and constraints
 * 
 * @param {number} index - номер статьи (0, 1, 2...)
 * @param {Array} scheduledArticles - already scheduled articles with pubDates
 * @param {string} articlePath - path to the article file
 * @returns {string} дата в RFC822 формате: "Fri, 03 Jan 2026 14:11:00 +0300"
 */
function generateTimelinePubDate(index, scheduledArticles, articlePath) {
  try {
    const timeline = getTimelineForArticle(articlePath);
    
    // Get next available publishing slot for this timeline
    const nextSlot = getNextPublishingSlot(
      scheduledArticles.filter(art => art.timeline === timeline.key),
      timeline,
      new Date()
    );
    
    console.log(`   ⏰ [${index + 1}] ${timeline.name} @ ${toRFC822(nextSlot)} (${timeline.intervalMinutes}min interval)`);
    
    return toRFC822(nextSlot);
  } catch (e) {
    console.error(`❌ ERROR in generateTimelinePubDate: ${e.message}`);
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + INITIAL_OFFSET_HOURS);
    return toRFC822(fallback);
  }
}

/**
 * ✅ ЗАДАЧА 4: Сделать GUID уникальным
 * Генерируем hash от title и добавляем индекс
 */
function generateUniqueGuid(title, index) {
  const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
  return `guid-${hash}-${index + 1}`;
}

/**
 * ✅ ЗАДАЧА 2: Валидировать и исправить HTML теги
 * Убедиться что все теги закрыты правильно
 */
function validateAndFixHtmlTags(html) {
  const tags = ['p', 'h1', 'h2', 'h3', 'a', 'b', 'i'];
  
  for (const tag of tags) {
    const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');
    
    const openCount = (html.match(openRegex) || []).length;
    const closeCount = (html.match(closeRegex) || []).length;
    
    if (openCount > closeCount) {
      const diff = openCount - closeCount;
      html += `</${tag}>`.repeat(diff);
      console.log(`   ✓ Fixed <${tag}>: added ${diff} closing tag(s)`);
    } else if (closeCount > openCount) {
      const diff = closeCount - openCount;
      for (let i = 0; i < diff; i++) {
        const lastIndex = html.lastIndexOf(`</${tag}>`);
        if (lastIndex !== -1) {
          html = html.substring(0, lastIndex) + html.substring(lastIndex + tag.length + 3);
        }
      }
      console.log(`   ✓ Fixed <${tag}>: removed ${diff} extra closing tag(s)`);
    }
  }
  
  return html;
}

/**
 * Конвертировать дату в RFC822 формат с часовым поясом +0300 (Москва)
 * 
 * RFC822 формат: "Fri, 03 Jan 2026 14:11:00 +0300"
 * Это ВСЕГДА по московскому времени (UTC+3)
 */
function toRFC822(date) {
  try {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const dayNum = String(date.getDate()).padStart(2, '0');
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // ✅ CRITICAL: Always +0300 (MSK timezone)
    return `${dayName}, ${dayNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0300`;
  } catch (e) {
    console.error(`⚠️  WARNING: toRFC822 error: ${e.message}`);
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} +0300`;
  }
}

/**
 * Конвертировать markdown контент в HTML для Dzen
 */
function markdownToHtml(markdown) {
  let html = markdown;
  
  // Конвертируем заголовки
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Конвертируем жирный текст
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  
  // Конвертируем курсив
  html = html.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  
  // Конвертируем ссылки
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Разбиваем на параграфы (двойные переносы строк)
  const paragraphs = html.split(/\n\n+/);
  
  html = paragraphs
    .map(p => {
      p = p.trim();
      if (p.match(/^<(h[1-6]|ul|ol|blockquote)/)) {
        return p;
      }
      if (!p) {
        return '';
      }
      return `<p>${p}</p>`;
    })
    .filter(p => p)
    .join('\n');

  // ✅ ЗАДАЧА 2: Валидировать HTML теги
  html = validateAndFixHtmlTags(html);

  // 🖼️ Обёртываем GitHub изображения в <figure>
  html = wrapGithubImagesInFigure(html);

  // Очистить контент перед валидацией
  html = sanitizeForCdata(html);

  return html;
}

/**
 * ✅ TASK #135: Timeline-aware RSS feed generation
 * @param {Array} articles - массив статей с timeline metadata
 * @param {Array} imageSizes - массив размеров изображений
 * @returns {string} XML RSS feed
 */
function generateRssFeedWithTimeline(articles, imageSizes = [], articlesMeta = []) {
  // ✅ ЗАДАЧА 6: Обновить lastBuildDate на текущую дату/время
  const now = toRFC822(new Date());
  
  let rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Потёмки - Истории из жизни</title>
    <link>${DZEN_CHANNEL}</link>
    <atom:link href="${RSS_URL}" rel="self" type="application/rss+xml"/>
    <description>Личные истории и переживания из жизни</description>
    <lastBuildDate>${now}</lastBuildDate>
    <language>ru</language>
    <generator>ZenMaster RSS Generator v3.0 (Timeline Publishing System - Issue #135)</generator>
`;

  // Track published articles per timeline for pubDate generation
  const timelineArticles = {};
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const meta = articlesMeta[i] || {};
    const {
      title,
      description,
      content,
      imageUrl,
      itemId,
      filePath
    } = article;

    // ✅ TASK #135: Use timeline-aware pubDate generation
    const pubDate = meta.pubDate || generateTimelinePubDate(i, articles.slice(0, i), filePath || '');
    
    const escapedTitle = escapeXml(title);
    const articleLink = `${DZEN_CHANNEL}/${itemId}`;
    const imageSize = imageSizes[i] || DEFAULT_IMAGE_SIZE;
    const uniqueGuid = generateUniqueGuid(title, i);
    
    // Track timeline info for display
    if (meta.timeline) {
      if (!timelineArticles[meta.timeline]) {
        timelineArticles[meta.timeline] = [];
      }
      timelineArticles[meta.timeline].push({ title, pubDate });
    }
    
    rssContent += `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[${sanitizeForCdata(description)}]]></description>
      <link>${articleLink}</link>
      <guid isPermaLink="false">${uniqueGuid}</guid>
      <pubDate>${pubDate}</pubDate>
      <media:rating scheme="urn:simple">nonadult</media:rating>
      
      <!-- ✅ TASK #135: Timeline publishing categories -->
      <category>format-article</category>
      <category>index</category>
      <category>comment-all</category>
      ${meta.timeline ? `<category>timeline-${meta.timeline}</category>` : ''}
      
      <!-- ✅ Enclosure with length -->
      <enclosure url="${imageUrl}" type="image/jpeg" length="${imageSize}"/>
      <media:content type="image/jpeg" medium="image" width="900" height="300" url="${imageUrl}">
        <media:description type="plain">${sanitizeForCdata(description)}</media:description>
        <media:copyright>© ZenMaster Articles</media:copyright>
      </media:content>
      
      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>
`;
  }

  rssContent += `
  </channel>
</rss>`;

  return { content: rssContent, timelineArticles };
}

// Legacy function for backward compatibility
function generateRssFeed(articles, imageSizes = []) {
  return generateRssFeedWithTimeline(articles, imageSizes).content;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🚀 ОСНОВНОЙ ПРОЦЕСС
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    console.log('');
    console.log('╔═════════════════════════════════════════════════════════════════╗');
    console.log('║  📡 RSS Feed Generator - Dzen Scheduled Publishing (v2.10)      ║');
    console.log('║  ✅ pubDate: NOW + 3 hours, then +90 min intervals             ║');
    console.log('║  ✅ *** Markers Converted to Breaks                            ║');
    console.log('║  ✅ GitHub Images Wrapped in <figure>                          ║');
    console.log('╚═════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📝 Mode: ${MODE}`);
    console.log(`🔗 Dzen Channel: ${DZEN_CHANNEL}`);
    console.log(`📦 Base URL: ${BASE_URL}`);
    console.log('');

    const articleFiles = getArticleFiles(MODE);
    STATS.total = articleFiles.length;

    if (STATS.total === 0) {
      console.error('❌ ERROR: No .md files found in articles/');
      process.exit(1);
    }

    console.log(`📚 Found ${STATS.total} article(s)\n`);

    const processedIds = new Set();
    const articles = [];
    const imageSizes = [];

    for (const filePath of articleFiles) {
      try {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        
        try {
          const validUtf8 = Buffer.from(fileContent, 'utf8').toString('utf8');
          fileContent = validUtf8;
        } catch (e) {
          console.warn(`⚠️  WARNING: Invalid UTF-8 in ${path.basename(filePath)}, repairing...`);
          try {
            const latin1Buffer = Buffer.from(fileContent, 'latin1');
            fileContent = latin1Buffer.toString('utf8');
          } catch (e2) {
            fileContent = fileContent.replace(/[\x00-\x1F]/g, ' ');
          }
        }
        
        const { data: frontmatter, content: body } = matter(fileContent);

        if (!frontmatter.title || !frontmatter.date) {
          console.log(`↩️  SKIP (no title/date): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        if (!isRecentDate(frontmatter.date, 7)) {
          const articleDate = new Date(frontmatter.date);
          const daysAgo = Math.floor((new Date() - articleDate) / (1000 * 60 * 60 * 24));
          console.log(`↩️  SKIP (${daysAgo} дней назад, > 7): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        if (!imageExists(filePath)) {
          console.log(`↩️  SKIP (no image): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        const fileName = path.basename(filePath, '.md');
        const dateClean = frontmatter.date.replace(/[^\d]/g, '');
        const itemId = `${fileName}-${dateClean}`;

        if (processedIds.has(itemId)) {
          console.log(`↩️  SKIP (already processed): ${fileName}`);
          STATS.skipped++;
          continue;
        }

        const imageUrl = getImageUrl(filePath);
        const imageSize = getImageSize(filePath);
        imageSizes.push(imageSize);
        
        // 🧹 ВАЖНО! Преобразуем *** маркеры в разделители (пустые строки)
        let cleanBody = cleanArticleMarkers(body);
        let cleanTitle = cleanArticleMarkers(frontmatter.title);
        let cleanDescription = frontmatter.description ? cleanArticleMarkers(frontmatter.description) : getDescription(cleanBody);
        
        const htmlContent = markdownToHtml(cleanBody);

        if (htmlContent.length < 300) {
          console.warn(`⚠️  WARNING: ${fileName} - content too short (${htmlContent.length} < 300 chars). Skipping.`);
          STATS.skipped++;
          continue;
        }

        const allowedTags = ['p', 'a', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption', 'img'];
        const tagsInContent = htmlContent.match(/<(\w+)/g) || [];
        const tagsSet = new Set(tagsInContent.map(t => t.slice(1)));
        const invalidTags = Array.from(tagsSet).filter(tag => 
          !allowedTags.includes(tag) && tag !== '!'
        );

        if (invalidTags.length > 0) {
          console.warn(`⚠️  WARNING: ${fileName} - unsupported tags: ${invalidTags.join(', ')}`);
        }

        articles.push({
          title: cleanTitle,
          description: cleanDescription,
          content: htmlContent,
          date: frontmatter.date,
          imageUrl: imageUrl,
          itemId: itemId
        });

        processedIds.add(itemId);
        STATS.processed++;

        console.log(`✅ ADDED: ${fileName} (${imageSize} bytes)`);

      } catch (error) {
        console.error(`❌ ERROR processing ${path.relative(process.cwd(), filePath)}: ${error.message}`);
        STATS.failed++;
      }
    }

    console.log('');
    console.log('🔄 Generating RSS feed with timeline publishing...');
    console.log('   ✅ Timeline System: Multiple timelines with configurable intervals');
    console.log('   ✅ Timeline System: Publishing window validation');
    console.log('   ✅ Timeline System: Category-aware scheduling');
    console.log('   ✅ Task 1: Adding length to enclosure');
    console.log('   ✅ Task 2: Validating HTML tags');
    console.log('   ✅ Task 3: Added atom:link');
    console.log('   ✅ Task 4: Making GUID unique');
    console.log('   ✅ Task 5 v3.0: Timeline-aware pubDate generation');
    console.log('   ✅ Task 6: Updated lastBuildDate');
    console.log('   ✅ DZEN: <description> in CDATA');
    console.log('   ✅ DZEN: Category format-article, index, comment-all');
    console.log('   ✅ DZEN: GitHub images wrapped in <figure>');
    console.log('   ✅ STRUCTURE: *** markers converted to breaks');
    console.log('   ✅ v3.0: Timeline publishing system fully integrated!');
    
    // ✅ TASK #135: Generate timeline-aware feed
    import('./timeline-manager.js').then(({ generatePublishingSchedule, validateSchedule, saveScheduleToFile }) => {
      console.log('📋 Generating publishing schedule...');
      
      // Prepare articles with metadata for scheduling
      const articlesWithMeta = articles.map((article, index) => ({
        ...article,
        filePath: articleFiles[index],
        channel: getChannel(articleFiles[index])
      }));
      
      // Generate timeline-aware schedule
      const publishingSchedule = generatePublishingSchedule(articlesWithMeta, MODE);
      
      // Validate schedule
      const validationResult = validateSchedule(publishingSchedule);
      if (!validationResult.isValid) {
        console.warn('⚠️  Schedule validation warnings detected:');
        validationResult.warnings.forEach(w => console.log(`   - ${w.message}`));
      }
      
      // Create articles metadata with pubDates from schedule
      const articlesMeta = publishingSchedule.map(item => ({
        pubDate: item.pubDateRfc822,
        timeline: item.timeline
      }));
      
      // Generate RSS feed with timeline data
      const { content: rssFeed, timelineArticles } = generateRssFeedWithTimeline(articles, imageSizes, articlesMeta);

      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('📁 Created public/ directory');
      }

      const feedPath = path.join(publicDir, 'feed.xml');
      fs.writeFileSync(feedPath, rssFeed, 'utf8');

      console.log(`\n✅ RSS feed generated: ${feedPath}`);
      console.log(`   Size: ${(fs.statSync(feedPath).size / 1024).toFixed(2)} KB`);

      console.log('');
      console.log('╔═════════════════════════════════════════════════════════════════╗');
      console.log('║  📊 Statistics & Timeline Summary                            ║');
      console.log('╚═════════════════════════════════════════════════════════════════╝');
      console.log(`📚 Total files: ${STATS.total}`);
      console.log(`✅ Processed: ${STATS.processed}`);
      console.log(`↩️  Skipped: ${STATS.skipped}`);
      console.log(`❌ Failed: ${STATS.failed}`);
      console.log('');

      if (STATS.processed === 0) {
        console.error('❌ ERROR: No articles were processed!');
        process.exit(1);
      }

      // Display timeline summary
      console.log('📊 Timeline Summary:');
      Object.entries(timelineArticles).forEach(([timeline, items]) => {
        console.log(`   ${timeline}: ${items.length} articles`);
        items.slice(0, 3).forEach(item => {
          console.log(`      ⏰ ${item.pubDate} - ${item.title.substring(0, 45)}...`);
        });
      });
      console.log('');

      console.log('✅ RSS feed generation completed successfully!');
      console.log('✅ Timeline publishing system active!');
      console.log('');
      console.log('🔗 Validate at https://validator.w3.org/feed/');
      console.log('');
      
      // Save detailed schedule
      saveScheduleToFile(publishingSchedule);
    }).catch(error => {
      console.error('❌ ERROR in timeline integration:', error.message);
    });

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
