# 🔥 RSS Feed Generation for Yandex Dzen

## Overview

This system generates RSS feeds compatible with Yandex Dzen, featuring **full HTML content** in `<content:encoded>` CDATA blocks.

## Key Features

✅ **Full HTML content** in `<content:encoded>` (not article links)  
✅ **RAW GitHub URLs** for images  
✅ **Markdown to HTML conversion** (bold, italic, underline, links)  
✅ **CDATA-wrapped content** for Yandex Dzen compatibility  
✅ **No article links** - just pure content delivery

## Workflow

### Step 1: Generate Articles

```bash
npx ts-node cli.ts both --count=1 --channel=women-35-60 --images
```

**Output:**
```
articles/women-35-60/2025-12-25/
├── article-slug.md (markdown with frontmatter)
└── article-slug.jpg (cover photo)
```

### Step 2: Generate RSS Feed

```bash
node scripts/generate-feed.js
```

**Output:**
```
articles/articles.rss (RSS 2.0 with <content:encoded>)
```

### Step 3: Commit to GitHub

```bash
git add articles/
git commit -m "Add new stories for Yandex Dzen"
git push origin main
```

### Step 4: Add to Yandex Dzen

1. Open Yandex Creator Studio
2. Add RSS feed URL:
   ```
   https://raw.githubusercontent.com/crosspostly/dzen/main/articles/articles.rss
   ```
3. Yandex Dzen will:
   - Parse `<content:encoded>` for full article content
   - Download images from `<enclosure>` URLs
   - Publish articles automatically

## Article Structure

### Markdown File (Example)

```markdown
---
title: "Article Title"
date: "2025-12-25"
description: "Short teaser for the article"
image: "https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/article-slug.jpg"
category: "lifestory"
---

**Bold text**

*Italic text*

__Underlined text__

Normal paragraph with [link](https://example.com).

Another paragraph.
```

### RSS Item (Generated)

```xml
<item>
  <title>Article Title</title>
  <description>Short teaser for the article</description>
  <pubDate>Thu, 25 Dec 2025 00:00:00 GMT</pubDate>
  <guid>women-35-60-2025-12-25-article-slug</guid>
  
  <!-- 🔥 FULL HTML CONTENT -->
  <content:encoded><![CDATA[
    <p><strong>Bold text</strong></p>
    <p><em>Italic text</em></p>
    <p><u>Underlined text</u></p>
    <p>Normal paragraph with <a href="https://example.com">link</a>.</p>
    <p>Another paragraph.</p>
  ]]></content:encoded>
  
  <!-- IMAGE -->
  <enclosure url="https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/article-slug.jpg" type="image/jpeg" />
  <image>
    <url>https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/article-slug.jpg</url>
    <title>Article Title</title>
  </image>
  
  <category>lifestory</category>
</item>
```

## Technical Details

### RSS Structure

- **NO `<link>`** element pointing to article pages
- **YES `<content:encoded>`** with full HTML content
- **YES `<enclosure>`** with image URL
- **YES `<image>`** as alternative image format
- **Namespace**: `xmlns:content="http://purl.org/rss/1.0/modules/content/"`

### Markdown to HTML Conversion

| Markdown | HTML |
|----------|------|
| `**text**` | `<strong>text</strong>` |
| `*text*` | `<em>text</em>` |
| `__text__` | `<u>text</u>` |
| `[text](url)` | `<a href="url">text</a>` |
| Double newline | `</p><p>` (paragraph breaks) |
| Single newline | `<br>` (line breaks) |

### Image URLs

All images use **RAW GitHub URLs**:
```
https://raw.githubusercontent.com/crosspostly/dzen/main/articles/{channel}/{date}/{filename}.jpg
```

**NOT Vercel URLs** - Yandex Dzen needs direct access to image files.

## Environment Variables

```bash
GITHUB_REPOSITORY=crosspostly/dzen  # Default if not set
```

## File Locations

```
articles/                              # Article storage
├── women-35-60/                       # Channel folder
│   └── 2025-12-25/                   # Date folder
│       ├── article-slug.md           # Article with frontmatter
│       ├── article-slug.jpg          # Cover image
│       └── ...
└── articles.rss                       # Generated RSS feed
```

## Yandex Dzen Compatibility

✅ **Compatible with:**
- Yandex Dzen RSS import
- WordPress RSS feeds
- Feedly
- Any RSS reader supporting `<content:encoded>`

❌ **Not compatible with:**
- RSS readers that only support `<description>` (they'll see the short teaser)
- Systems that don't support CDATA in RSS

## Troubleshooting

### No articles found

**Problem:** `⚠️  No articles found in ./articles`

**Solution:** Run article generation first:
```bash
npx ts-node cli.ts both --count=1 --channel=women-35-60 --images
```

### Images not showing

**Problem:** Images not appearing in Yandex Dzen

**Solutions:**
1. Check image URLs are **RAW GitHub URLs** (not Vercel)
2. Ensure images are committed to GitHub
3. Verify images are publicly accessible
4. Check file extensions are `.jpg` (not `.png` or `.webp`)

### Content not appearing

**Problem:** Articles appear in Dzen but content is missing

**Solutions:**
1. Verify `<content:encoded>` contains HTML (not markdown)
2. Check CDATA wrapping is correct
3. Ensure no `]]>` sequences in content (they're auto-escaped)

## Next Steps

- [ ] Set up GitHub Actions to auto-generate RSS on push
- [ ] Add RSS validation in CI/CD
- [ ] Monitor Yandex Dzen import status
- [ ] Add analytics tracking
