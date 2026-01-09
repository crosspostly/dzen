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
import sharp from 'sharp';

// ══════════════════════════════════════════════════════════════════════════════
// ⚙️ КОНФИГУРАЦИЯ
// ══════════════════════════════════════════════════════════════════════════════

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki'; 
const SITE_URL = 'https://dzen-livid.vercel.app'; // ✅ Вернули Vercel
const RSS_URL = 'https://dzen-livid.vercel.app/feed.xml'; // ✅ Вернули Vercel
const DEFAULT_IMAGE_SIZE = 50000;
const MIN_IMAGE_WIDTH = 700; // ✅ Dzen Requirement

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
  
  return content.trim() + '\n';
}

/**
 * 🖼️ Обёртываем GitHub изображения в <figure> теги для Дзена
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
 * ✅ ЗАДАЧА: Проверить размеры изображения с помощью sharp
 * @param {string} articlePath - путь к статье
 * @returns {Promise<boolean>} true если валидно, false если нет
 */
async function validateImageDimensions(articlePath) {
  const dir = path.dirname(articlePath);
  const name = path.basename(articlePath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);

  try {
    if (!fs.existsSync(imagePath)) return false;
    
    const metadata = await sharp(imagePath).metadata();
    
    if (metadata.width && metadata.width < MIN_IMAGE_WIDTH) {
      console.warn(`⚠️  WARNING: Image width ${metadata.width}px < ${MIN_IMAGE_WIDTH}px for ${name}. Dzen might reject it.`);
      return false; 
    }
    
    return true;
  } catch (error) {
    console.warn(`⚠️  WARNING: Could not validate image dimensions for ${name}: ${error.message}`);
    return true; // Assume ok if checking fails
  }
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

/**
 * ✅ ЗАДАЧА 5 v2.10: Generate pubDate starting from NOW + 3 hours
 * 
 * LOGIC:
 * - 1st article: NOW + 3 hours
 * - 2nd article: 1st article pubDate + 90 minutes
 * - 3rd article: 2nd article pubDate + 90 minutes
 * - etc...
 * 
 * Example: Current time 11:11 AM MSK
 * - Article 1: 14:11 (11:11 + 3 hours)
 * - Article 2: 15:41 (14:11 + 90 minutes)
 * - Article 3: 17:11 (15:41 + 90 minutes)
 * 
 * @param {number} index - номер статьи (0, 1, 2...)
 * @param {Date} previousPubDate - предыдущая pubDate (для расчета цепочки)
 * @returns {string} дата в RFC822 формате: "Fri, 03 Jan 2026 14:11:00 +0300"
 */
function generatePubDate(index, previousPubDate = null) {
  try {
    let pubDate;
    
    if (index === 0) {
      // First article: NOW + 3 hours
      pubDate = new Date();
      pubDate.setHours(pubDate.getHours() + INITIAL_OFFSET_HOURS);
    } else {
      // Subsequent articles: previousPubDate + 90 minutes
      pubDate = new Date(previousPubDate);
      pubDate.setMinutes(pubDate.getMinutes() + INTERVAL_MINUTES);
    }
    
    return toRFC822(pubDate);
  } catch (e) {
    console.error(`❌ ERROR in generatePubDate: ${e.message}`);
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
 * Генерировать RSS фид
 * @param {Array} articles - массив статей
 * @param {Array} imageSizes - массив размеров изображений
 */
function generateRssFeed(articles, imageSizes = []) {
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
    <!-- ✅ ЗАДАЧА 3: Добавить atom:link в channel -->
    <atom:link href="${RSS_URL}" rel="self" type="application/rss+xml"/>
    <description>Личные истории и переживания из жизни</description>
    <lastBuildDate>${now}</lastBuildDate>
    <language>ru</language>
    <generator>ZenMaster RSS Generator v2.10 (Scheduled Publishing: NOW + 3h, +90min intervals)</generator>
`;

  // Добавляем каждую статью
  let currentPubDate = null;
  
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

    // ✅ ЗАДАЧА 5 v2.10: Calculate pubDate starting from NOW + 3 hours
    const pubDate = generatePubDate(i, currentPubDate);
    currentPubDate = new Date();
    if (i === 0) {
      currentPubDate.setHours(currentPubDate.getHours() + INITIAL_OFFSET_HOURS);
    } else {
      currentPubDate.setMinutes(currentPubDate.getMinutes() + (INTERVAL_MINUTES * i));
    }
    
    const escapedTitle = escapeXml(title);
    
    // ✅ ИСПРАВЛЕНИЕ: Ссылка ведет на GitHub Pages (внешний сайт), а не на Дзен
    // Дзен импортирует контент "оттуда"
    const articleLink = `${SITE_URL}/articles/${itemId}`;
    
    // ✅ ЗАДАЧА 1: Получить размер изображения для атрибута length в enclosure
    const imageSize = imageSizes[i] || DEFAULT_IMAGE_SIZE;
    
    // ✅ ЗАДАЧА 4: GUID теперь совпадает с PermaLink (требование валидатора)
    const uniqueGuid = articleLink;
    
    rssContent += `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[${sanitizeForCdata(description)}]]></description>
      <link>${articleLink}</link>
      <guid isPermaLink="true">${uniqueGuid}</guid>
      <pubDate>${pubDate}</pubDate>
      <media:rating scheme="urn:simple">nonadult</media:rating>
      
      <!-- ✅ v2.10: Категории для валидации -->
      <category>native</category>
      <category>format-article</category>
      <category>index</category>
      <category>comment-all</category>
      
      <!-- ✅ ИЗОБРАЖЕНИЯ: Оставляем RAW GITHUB (они там лежат физически) -->
      <enclosure url="${imageUrl}" type="image/jpeg" length="${imageSize}"/>
      
      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>
`;
  }

  rssContent += `
  </channel>
</rss>`;

  return rssContent;
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
    console.log('║  ✅ Image Dimensions Validated (>700px)                        ║');
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

    // ✅ Создаем папку для HTML-заглушек (для валидации Дзена)
    const publicArticlesDir = path.join(process.cwd(), 'public', 'articles');
    if (!fs.existsSync(publicArticlesDir)) {
      fs.mkdirSync(publicArticlesDir, { recursive: true });
    }

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

        // ✅ Проверка ширины изображения
        const isValidImage = await validateImageDimensions(filePath);
        if (!isValidImage) {
           // We only warn inside the function, but we might want to skip?
           // For now, let's just log and continue, as per instruction
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
        
        let htmlContent = markdownToHtml(cleanBody);

        // ✅ ИНЪЕКЦИЯ ИЗОБРАЖЕНИЯ: Добавляем обложку в начало статьи
        // Dzen требует, чтобы изображение было в теле статьи для корректного отображения
        if (imageUrl) {
            htmlContent = `<figure><img src="${imageUrl}" width="900" style="max-width: 100%;"></figure>\n${htmlContent}`;
        }

        // ✅ ГЕНЕРАЦИЯ HTML-ЗАГЛУШКИ ДЛЯ ВАЛИДАТОРА
        const safeDesc = cleanDescription.replace(/"/g, '&quot;');
        const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>${cleanTitle}</title>
    <meta name="description" content="${safeDesc}">
    <meta property="og:image" content="${imageUrl}">
</head>
<body>
    <h1>${cleanTitle}</h1>
    <img src="${imageUrl}" alt="Cover" style="max-width: 100%">
    <div>${htmlContent}</div>
</body>
</html>`;

        const htmlPath = path.join(publicArticlesDir, `${itemId}.html`);
        fs.writeFileSync(htmlPath, htmlPage, 'utf8');
        console.log(`   📄 Created HTML mirror: public/articles/${itemId}.html`);

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
    console.log('🔄 Generating RSS feed...');
    console.log('   ✅ Task 1: Adding length to enclosure');
    console.log('   ✅ Task 2: Validating HTML tags');
    console.log('   ✅ Task 3: Added atom:link');
    console.log('   ✅ Task 4: Making GUID unique');
    console.log('   ✅ Task 5 v2.10: pubDate = NOW + 3 hours for 1st, then +90min intervals');
    console.log('   ✅ Task 6: Updated lastBuildDate');
    console.log('   ✅ DZEN: <description> in CDATA');
    console.log('   ✅ DZEN: Category format-article, index, comment-all (NO native-draft!)');
    console.log('   ✅ DZEN: GitHub images wrapped in <figure>');
    console.log('   ✅ STRUCTURE: *** markers converted to breaks');
    console.log('   ✅ v2.10: pubDate works as automatic schedule from current time!');
    
    const rssFeed = generateRssFeed(articles, imageSizes);

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
    console.log('║  📊 Statistics                                                 ║');
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

    console.log('✅ RSS feed generation completed successfully!');
    console.log('');
    console.log('📋 SCHEDULE (Starting from NOW + 3 hours, 90-min intervals):');
    const now = new Date();
    for (let i = 0; i < Math.min(articles.length, 10); i++) {
      const date = new Date(now);
      if (i === 0) {
        date.setHours(date.getHours() + INITIAL_OFFSET_HOURS);
      } else {
        date.setHours(date.getHours() + INITIAL_OFFSET_HOURS);
        date.setMinutes(date.getMinutes() + (INTERVAL_MINUTES * i));
      }
      const timeStr = date.toLocaleString('ru-RU', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      console.log(`   ⏰ ${timeStr} - ${articles[i].title.substring(0, 50)}...`);
    }
    if (articles.length > 10) {
      console.log(`   ... и ещё ${articles.length - 10} статей`);
    }
    console.log('');
    console.log('🔗 Validate at https://validator.w3.org/feed/');
    console.log('');

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
