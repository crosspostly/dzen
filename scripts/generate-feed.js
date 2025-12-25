#!/usr/bin/env node

/**
 * 🔥 RSS Feed Generator for Yandex Dzen
 *
 * INPUT:
 *   articles/women-35-60/2025-12-25/article-1.md (markdown + frontmatter)
 *
 * OUTPUT:
 *   articles/articles.rss (RSS 2.0 with <content:encoded> HTML)
 *
 * FEATURES:
 *   - Converts markdown to HTML
 *   - Embeds full article content in <content:encoded>
 *   - RAW GitHub URLs only
 *   - Yandex Dzen compatible
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'crosspostly/dzen';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_DIR = path.join(__dirname, '../articles');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeCdata(html) {
  if (!html) return '';
  return String(html).replace(/]]>/g, ']]]]><![CDATA[>');
}

function markdownToHtml(markdown) {
  const paragraphs = String(markdown)
    .trim()
    .split(/\n\n+/)
    .map((para) => {
      para = para.trim();
      if (!para) return '';

      let out = para;

      out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/__(.*?)__/g, '<u>$1</u>');
      out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
      out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
      out = out.replace(/\n/g, '<br>');

      return `<p>${out}</p>`;
    })
    .filter(Boolean);

  return paragraphs.join('\n');
}

function parseFrontmatter(content) {
  const match = String(content).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
  if (!match) return null;

  const frontmatter = {};
  match[1].split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    value = value.replace(/^["']|["']$/g, '');

    frontmatter[key] = value;
  });

  const bodyMarkdown = match[2] || '';

  return { frontmatter, bodyMarkdown };
}

function deriveRawImageUrl(mdPath, imageValue) {
  if (!imageValue) return '';
  if (String(imageValue).startsWith('http://') || String(imageValue).startsWith('https://')) return String(imageValue);

  const mdDir = path.dirname(mdPath);
  const relativeDir = path.relative(ARTICLES_DIR, mdDir).replace(/\\/g, '/');
  return `${GITHUB_RAW_BASE}/articles/${relativeDir}/${imageValue}`;
}

function generateFeed() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 Generating Yandex Dzen RSS Feed`);
  console.log(`${'='.repeat(60)}\n`);

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.warn(`⚠️  Articles directory not found: ${ARTICLES_DIR}`);
    console.warn(`   Run content generation first (it should create ./articles).`);
    process.exit(1);
  }

  const items = [];

  try {
    const channels = fs.readdirSync(ARTICLES_DIR);

    for (const channel of channels) {
      const channelPath = path.join(ARTICLES_DIR, channel);
      if (!fs.statSync(channelPath).isDirectory()) continue;
      if (channel.startsWith('.') || channel === 'published') continue;

      const dates = fs.readdirSync(channelPath);

      for (const dateStr of dates) {
        const datePath = path.join(channelPath, dateStr);
        if (!fs.statSync(datePath).isDirectory()) continue;

        const files = fs.readdirSync(datePath);

        for (const file of files) {
          if (!file.endsWith('.md')) continue;

          const mdPath = path.join(datePath, file);
          const markdownContent = fs.readFileSync(mdPath, 'utf-8');

          const parsed = parseFrontmatter(markdownContent);
          if (!parsed) {
            console.warn(`⚠️  No frontmatter in: ${channel}/${dateStr}/${file}`);
            continue;
          }

          const { frontmatter, bodyMarkdown } = parsed;

          const imageUrl = deriveRawImageUrl(mdPath, frontmatter.image);
          if (!imageUrl) {
            console.warn(`⚠️  No image URL in: ${channel}/${dateStr}/${file}`);
          }

          const htmlContent = markdownToHtml(bodyMarkdown);

          const fileName = path.basename(file, '.md');

          items.push({
            title: frontmatter.title || fileName,
            description: frontmatter.description || '',
            pubDate: frontmatter.date ? new Date(frontmatter.date).toUTCString() : new Date().toUTCString(),
            guid: `${channel}-${dateStr}-${fileName}`,
            imageUrl,
            category: frontmatter.category || 'lifestory',
            htmlContent,
          });

          console.log(`✅ Found: ${channel}/${dateStr}/${fileName}.md`);
          if (imageUrl) {
            console.log(`   📷 Image: ${imageUrl.substring(0, 70)}...`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning articles: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n📊 Total items: ${items.length}\n`);

  if (items.length === 0) {
    console.log(`⚠️  No articles found in ${ARTICLES_DIR}`);
    return;
  }

  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const rssItems = items
    .map((item) => {
      let itemXml = `
  <item>
    <title>${escapeXml(item.title)}</title>
    <description>${escapeXml(item.description)}</description>
    <pubDate>${item.pubDate}</pubDate>
    <guid>${escapeXml(item.guid)}</guid>`;

      itemXml += `
    <content:encoded><![CDATA[${sanitizeCdata(item.htmlContent)}]]></content:encoded>`;

      if (item.imageUrl) {
        itemXml += `
    <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" />
    <image>
      <url>${escapeXml(item.imageUrl)}</url>
      <title>${escapeXml(item.title)}</title>
    </image>`;
      }

      itemXml += `
    <category>${escapeXml(item.category)}</category>
  </item>`;

      return itemXml;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Dzen Stories</title>
    <link>${GITHUB_RAW_BASE}/articles/</link>
    <description>Истории из жизни - реальные истории от реальных людей</description>
    <language>ru-ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;

  const rssPath = path.join(ARTICLES_DIR, 'articles.rss');
  fs.writeFileSync(rssPath, rss);

  console.log(`✅ RSS generated successfully`);
  console.log(`📁 File: ${rssPath}`);
  console.log(`📄 Items: ${items.length}`);
  console.log(`\n📋 Format: RSS 2.0 with <content:encoded>`);
  console.log(`📲 Compatible with: Yandex Dzen, WordPress, Feedly, etc.\n`);

  console.log(`${'='.repeat(60)}\n`);
}

generateFeed();
