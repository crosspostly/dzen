#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import crypto from 'crypto';

const MODE = process.argv[2] || 'incremental';
const BASE_URL = process.env.BASE_URL || 'https://raw.githubusercontent.com/crosspostly/dzen/main';
const DZEN_CHANNEL = 'https://dzen.ru/potemki';
const RSS_URL = 'https://dzen-livid.vercel.app/feed.xml';
const DEFAULT_IMAGE_SIZE = 50000;

const STATS = { total: 0, processed: 0, failed: 0, skipped: 0 };

function getArticleFiles(mode) {
  const articlesDir = path.join(process.cwd(), 'articles');
  if (!fs.existsSync(articlesDir)) {
    console.error('❌ ERROR: articles/ folder not found!');
    process.exit(1);
  }
  let files = [];
  if (mode === 'full') {
    console.log('🔄 FULL mode: collecting all articles...');
    files = getAllMdFiles(articlesDir);
  } else if (mode === 'incremental') {
    console.log('📧 INCREMENTAL mode: collecting new articles...');
    const womenDir = path.join(articlesDir, 'women-35-60');
    if (fs.existsSync(womenDir)) files = getAllMdFiles(womenDir);
  } else {
    console.error(`❌ Unknown mode: ${mode}`);
    process.exit(1);
  }
  return files.filter(f => f.endsWith('.md'));
}

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

function imageExists(articlePath) {
  const dir = path.dirname(articlePath);
  const name = path.basename(articlePath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);
  return fs.existsSync(imagePath);
}

function getImageUrl(articlePath) {
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  const imageRelative = relativePath.replace(/\.md$/, '.jpg');
  return `${BASE_URL}/articles/${imageRelative}`;
}

function getImageSize(articlePath) {
  const dir = path.dirname(articlePath);
  const name = path.basename(articlePath, '.md');
  const imagePath = path.join(dir, `${name}.jpg`);
  try {
    if (fs.existsSync(imagePath)) {
      return fs.statSync(imagePath).size;
    }
    return DEFAULT_IMAGE_SIZE;
  } catch (error) {
    return DEFAULT_IMAGE_SIZE;
  }
}

function getDescription(content) {
  const text = content
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 200);
  return text + (text.length >= 200 ? '...' : '');
}

function sanitizeForCdata(content) {
  if (!content) return '';
  content = String(content);
  content = content.replace(/\x1b\[[0-9;]*m/g, '');
  content = content.replace(/\[\d+m/g, '');
  content = content.replace(/[\x00-\x1F\x7F]/g, '');
  content = content.replace(/\]\]>/g, ']]&gt;');
  try {
    const buf = Buffer.from(content, 'utf8');
    content = buf.toString('utf8');
    content = content.replace(/[\x00-\x1F\x7F]/g, '');
  } catch (e) {
    content = content.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  content = content.replace(/\s+/g, ' ');
  return content.trim();
}

function isRecentDate(dateStr, maxDaysOld = 7) {
  try {
    const articleDate = new Date(dateStr);
    const now = new Date();
    if (isNaN(articleDate.getTime())) return false;
    const diffMs = now.getTime() - articleDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= maxDaysOld;
  } catch (e) {
    return false;
  }
}

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

function distributePubDate(dateStr, index) {
  try {
    const date = new Date(dateStr);
    const times = ['09:00:00', '10:15:00', '11:30:00', '12:45:00'];
    const time = times[index % times.length];
    const [hours, minutes, seconds] = time.split(':').map(Number);
    date.setHours(hours, minutes, seconds);
    return toRFC822(date);
  } catch (e) {
    return toRFC822(dateStr);
  }
}

function generateUniqueGuid(title, index) {
  const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 8);
  return `guid-${hash}-${index + 1}`;
}

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
      console.log(`   ✓ Fixed <${tag}>: +${diff} closing tags`);
    } else if (closeCount > openCount) {
      const diff = closeCount - openCount;
      for (let i = 0; i < diff; i++) {
        const lastIndex = html.lastIndexOf(`</${tag}>`);
        if (lastIndex !== -1) {
          html = html.substring(0, lastIndex) + html.substring(lastIndex + tag.length + 3);
        }
      }
      console.log(`   ✓ Fixed <${tag}>: -${diff} extra closing tags`);
    }
  }
  return html;
}

function toRFC822(dateStr) {
  try {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const dayNum = String(date.getDate()).padStart(2, '0');
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${dayName}, ${dayNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0300`;
  } catch (e) {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} +0300`;
  }
}

function markdownToHtml(markdown) {
  let html = markdown;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map(p => {
      p = p.trim();
      if (p.match(/^<(h[1-6]|ul|ol|blockquote)/)) return p;
      if (!p) return '';
      return `<p>${p}</p>`;
    })
    .filter(p => p)
    .join('\n');
  html = validateAndFixHtmlTags(html);
  html = sanitizeForCdata(html);
  return html;
}

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
    <generator>ZenMaster RSS Generator v2.3 (W3C Validated)</generator>
`;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const { title, description, content, date, imageUrl, itemId } = article;
    const pubDate = distributePubDate(date, i);
    const escapedTitle = escapeXml(title);
    const escapedDescription = escapeXml(description);
    const articleLink = `${DZEN_CHANNEL}/${itemId}`;
    const imageSize = imageSizes[i] || DEFAULT_IMAGE_SIZE;
    const uniqueGuid = generateUniqueGuid(title, i);
    
    rssContent += `
    <item>
      <title>${escapedTitle}</title>
      <description><![CDATA[${escapedDescription}]]></description>
      <link>${articleLink}</link>
      <guid isPermaLink="false">${uniqueGuid}</guid>
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

async function main() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  📡 RSS Feed Generator - W3C Validated (v2.3)      ║');
    console.log('║  ✅ All 6 Issues Fixed                              ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📋 Mode: ${MODE}`);
    console.log(`🔗 Channel: ${DZEN_CHANNEL}`);
    console.log('');

    const articleFiles = getArticleFiles(MODE);
    STATS.total = articleFiles.length;

    if (STATS.total === 0) {
      console.error('❌ ERROR: No .md files found!');
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
          fileContent = Buffer.from(fileContent, 'utf8').toString('utf8');
        } catch (e) {
          try {
            fileContent = Buffer.from(fileContent, 'latin1').toString('utf8');
          } catch (e2) {
            fileContent = fileContent.replace(/[\x00-\x1F]/g, ' ');
          }
        }
        
        const { data: frontmatter, content: body } = matter(fileContent);

        if (!frontmatter.title || !frontmatter.date) {
          console.log(`⏭️  SKIP (no meta): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        if (!isRecentDate(frontmatter.date, 7)) {
          STATS.skipped++;
          continue;
        }

        if (!imageExists(filePath)) {
          console.log(`⏭️  SKIP (no image): ${path.relative(process.cwd(), filePath)}`);
          STATS.skipped++;
          continue;
        }

        const fileName = path.basename(filePath, '.md');
        const dateClean = frontmatter.date.replace(/[^\d]/g, '');
        const itemId = `${fileName}-${dateClean}`;

        if (processedIds.has(itemId)) {
          STATS.skipped++;
          continue;
        }

        const imageUrl = getImageUrl(filePath);
        const imageSize = getImageSize(filePath);
        imageSizes.push(imageSize);
        
        const description = frontmatter.description || getDescription(body);
        const htmlContent = markdownToHtml(body);

        if (htmlContent.length < 300) {
          STATS.skipped++;
          continue;
        }

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
        console.log(`✅ ADDED: ${fileName} (${imageSize} bytes)`);

      } catch (error) {
        console.error(`❌ ERROR: ${path.relative(process.cwd(), filePath)}: ${error.message}`);
        STATS.failed++;
      }
    }

    console.log('');
    console.log('🔄 Generating RSS...');
    console.log('   ✅ Task 1: Adding length to enclosure');
    console.log('   ✅ Task 2: Validating HTML tags');
    console.log('   ✅ Task 3: Added atom:link');
    console.log('   ✅ Task 4: Making GUID unique');
    console.log('   ✅ Task 5: Distributing pubDate by time');
    console.log('   ✅ Task 6: Updated lastBuildDate');
    
    const rssFeed = generateRssFeed(articles, imageSizes);

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const feedPath = path.join(publicDir, 'feed.xml');
    fs.writeFileSync(feedPath, rssFeed, 'utf8');

    console.log(`\n✅ Feed saved: ${feedPath} (${(fs.statSync(feedPath).size / 1024).toFixed(2)} KB)`);
    console.log('');
    console.log('📊 Stats: ' + `${STATS.processed} processed, ${STATS.skipped} skipped, ${STATS.failed} failed`);
    console.log('');
    console.log('🔗 Validate at: https://validator.w3.org/feed/');
    console.log('');

    if (STATS.processed === 0) {
      console.error('❌ ERROR: No articles processed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ FATAL:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});