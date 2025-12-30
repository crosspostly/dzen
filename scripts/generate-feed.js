#!/usr/bin/env node

/**
 * 📡 RSS Feed Generator for Yandex Dzen
 * 
 * Генерирует RSS фид из статей в папке articles/
 * с правильными URL'ами для Dzen канала и GitHub изображений
 * 
 * ⚠️ ВАЖНО: Для Яндекс Дзен обязательны:
 * - length в enclosure (размер в байтах)
 * - category: native-draft
 * - media:rating
 * - content:encoded в CDATA
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// ═══════════════════════════════════════════════════════════════
// ⚙️ КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki';  // ✅ ТВОЙ КАНАЛ!
const RSS_URL = 'https://dzen-livid.vercel.app/feed.xml';  // URL фида для atom:link
const DEFAULT_IMAGE_SIZE = 50000;  // 50KB - дефолтный размер для enclosure length

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
 * Получить размер файла изображения в байтах
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
 * Получить размер изображения по URL (локальный путь или GitHub URL)
 * @param {string} imageUrl - URL изображения
 * @param {string} articlePath - путь к файлу статьи (для локальных файлов)
 * @returns {number} размер в байтах
 */
function getImageSizeFromUrl(imageUrl, articlePath) {
  // Если это GitHub Raw URL - используем размер по умолчанию
  // (нельзя делать HTTP запросы в GitHub Actions)
  if (imageUrl.includes('raw.githubusercontent.com')) {
    return DEFAULT_IMAGE_SIZE;
  }
  
  // Если локальный путь - пробуем получить реальный размер
  if (articlePath && fs.existsSync(articlePath)) {
    return getImageSize(articlePath);
  }
  
  return DEFAULT_IMAGE_SIZE;
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
 * 🧹 Очистить контент для безопасного CDATA
 * Убирает ANSI коды, управляющие символы, нормализует UTF-8
 */
function sanitizeForCdata(content) {
  if (!content) return '';
  
  content = String(content);
  
  // 1️⃣ Удалить ANSI escape коды (все варианты)
  // ESC[...m pattern: \x1b[0m, \x1b[33m, \x1b[1;31m и т.д.
  content = content.replace(/\x1b\[[0-9;]*m/g, '');
  
  // [0m pattern (если Буфер не обработал ESC правильно)
  content = content.replace(/\[\d+m/g, '');
  
  // 2️⃣ Удалить все управляющие символы включая null bytes
  // \x00 = null, \x01-\x1F = control chars, \x7F = DEL
  content = content.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 3️⃣ Экранировать CDATA delimiters
  content = content.replace(/\]\]>/g, ']]&gt;');
  
  // 4️⃣ Удалить невалидные UTF-8 последовательности и повторно очистить
  try {
    const buf = Buffer.from(content, 'utf8');
    content = buf.toString('utf8');
    // Повторная очистка после UTF-8 преобразования
    content = content.replace(/[\x00-\x1F\x7F]/g, '');
  } catch (e) {
    console.warn('⚠️  WARNING: UTF-8 decoding error, sanitizing...');
    content = content.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  
  // 5️⃣ Нормализовать whitespace (пробелы, табы, переносы строк)
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
 * Экранировать спецсимволы для XML
 * & ДОЛЖЕН БЫТЬ ПЕРВЫМ!
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')      // & must be FIRST!
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove all control chars
    .trim();
}

/**
 * Конвертировать дату в RFC822 формат с часовым поясом +0300 (Москва)
 */
function toRFC822(dateStr) {
  try {
    const date = new Date(dateStr);
    // Конвертируем в московское время +0300
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
    
    return `${dayName}, ${dayNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0300`;
  } catch (e) {
    // Fallback с правильным форматом
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
      // Если уже есть HTML-тег в начале, не оборачиваем в <p>
      if (p.match(/^<(h[1-6]|ul|ol|blockquote)/)) {
        return p;
      }
      // Пустые параграфы пропускаем
      if (!p) {
        return '';
      }
      // Оборачиваем в <p>
      return `<p>${p}</p>`;
    })
    .filter(p => p) // Убираем пустые строки
    .join('\n');

  // ⭐ ДОБАВИТЬ ЗДЕСЬ - очистить контент перед валидацией
  html = sanitizeForCdata(html);

  return validateHtml(html);
}

/**
 * Валидация HTML тегов (простая проверка на закрытость)
 */
function validateHtml(html) {
  const tags = ['b', 'i', 'p', 'h1', 'h2', 'h3', 'a'];
  for (const tag of tags) {
    const openCount = (html.match(new RegExp(`<${tag}[^>]*>`, 'g')) || []).length;
    const closeCount = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    
    if (openCount !== closeCount) {
      console.warn(`⚠️ Warning: Unclosed <${tag}> tag detected! (${openCount} open, ${closeCount} closed)`);
    }
  }
  return html;
}

/**
 * Генерировать RSS фид
 * @param {Array} articles - массив статей
 * @param {Array} imageSizes - массив размеров изображений
 */
function generateRssFeed(articles, imageSizes = []) {
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
    <generator>ZenMaster RSS Generator v2.2</generator>
`;

  // Добавляем каждую статью
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
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
    
    // Создаём уникальный URL статьи (без UTM параметров!)
    const articleLink = `${DZEN_CHANNEL}/${itemId}`;
    
    // Получаем размер изображения
    const imageSize = imageSizes[i] || DEFAULT_IMAGE_SIZE;
    
    rssContent += `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[${escapedDescription}]]></description>
      <link>${articleLink}</link>
      <guid isPermaLink="false">${itemId}</guid>
      <pubDate>${pubDate}</pubDate>
      <media:rating scheme="urn:simple">nonadult</media:rating>
      
      <category>native-draft</category>
      
      <enclosure url="${imageUrl}" type="image/jpeg" length="${imageSize}"/>
      <media:content type="image/jpeg" medium="image" width="900" height="300" url="${imageUrl}">
        <media:description type="plain">${escapedDescription}</media:description>
        <media:copyright>© ZenMaster Articles</media:copyright>
      </media:content>
      
      <content:encoded><![CDATA[${sanitizeForCdata(content)}]]></content:encoded>
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
    const imageSizes = [];  // Массив размеров изображений

    for (const filePath of articleFiles) {
      try {
        // Читаем файл
        let fileContent = fs.readFileSync(filePath, 'utf8');
        
        // ⭐ Валидировать кодировку
        try {
          const validUtf8 = Buffer.from(fileContent, 'utf8').toString('utf8');
          fileContent = validUtf8;
        } catch (e) {
          console.warn(`⚠️  WARNING: Invalid UTF-8 in ${path.basename(filePath)}, repairing...`);
          // Попытка latin1 как fallback
          try {
            const latin1Buffer = Buffer.from(fileContent, 'latin1');
            fileContent = latin1Buffer.toString('utf8');
          } catch (e2) {
            fileContent = fileContent.replace(/[\x00-\x1F]/g, ' ');
          }
        }
        
        const { data: frontmatter, content: body } = matter(fileContent);

        // Проверяем обязательные поля
        if (!frontmatter.title || !frontmatter.date) {
          console.log(`⏭️  SKIP (no title/date): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        // ⭐ НОВОЕ: Проверить что статья не старше 7 дней
        if (!isRecentDate(frontmatter.date, 7)) {
          const articleDate = new Date(frontmatter.date);
          const daysAgo = Math.floor((new Date() - articleDate) / (1000 * 60 * 60 * 24));
          console.log(`⏭️  SKIP (${daysAgo} дней назад, > 7): ${path.relative(process.cwd(), filePath)}`);
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
        const dateClean = frontmatter.date.replace(/[^\d]/g, '');
        const itemId = `${fileName}-${dateClean}`;

        // Пропускаем если уже обработали
        if (processedIds.has(itemId)) {
          console.log(`⏭️  SKIP (already processed): ${fileName}`);
          STATS.skipped++;
          continue;
        }

        // Получаем URL изображения
        const imageUrl = getImageUrl(filePath);
        
        // ⭐ Получаем размер изображения для атрибута length в enclosure
        const imageSize = getImageSize(filePath);
        imageSizes.push(imageSize);
        
        // Получаем описание
        const description = frontmatter.description || getDescription(body);

        // Конвертируем markdown в HTML
        const htmlContent = markdownToHtml(body);

        // ⭐ Валидация контента (минимум 300 символов для Дзена)
        if (htmlContent.length < 300) {
          console.warn(`⚠️  WARNING: ${fileName} - content too short (${htmlContent.length} < 300 chars). Skipping.`);
          STATS.skipped++;
          continue;
        }

        // ⭐ Валидация HTML тегов (только разрешенные)
        const allowedTags = ['p', 'a', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'figure', 'figcaption', 'img'];
        const tagsInContent = htmlContent.match(/<(\w+)/g) || [];
        const tagsSet = new Set(tagsInContent.map(t => t.slice(1)));
        const invalidTags = Array.from(tagsSet).filter(tag => 
          !allowedTags.includes(tag) && tag !== '!'
        );

        if (invalidTags.length > 0) {
          console.warn(`⚠️  WARNING: ${fileName} - unsupported tags: ${invalidTags.join(', ')}`);
        }

        // Добавляем в массив (контент уже очищен sanitizeForCdata())
        articles.push({
          title: frontmatter.title,
          description: description,
          content: htmlContent,
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
    
    const rssFeed = generateRssFeed(articles, imageSizes);

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
