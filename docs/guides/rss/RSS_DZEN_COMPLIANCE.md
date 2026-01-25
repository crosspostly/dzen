# RSS Feed Dzen Compliance Update

## Summary
Updated RSS feed generator to comply with Yandex Dzen requirements as documented at:
https://dzen.ru/help/ru/website/rss-modify.html

## Changes Made

### 1. XML Namespaces
Added required namespaces to RSS feed:
```xml
xmlns:content="http://purl.org/rss/1.0/modules/content/"
xmlns:media="http://search.yahoo.com/mrss/"
xmlns:dc="http://purl.org/dc/elements/1.1/"
```

### 2. Channel Information
- **Title**: "Потёмки - Истории из жизни"
- **Link**: https://dzen.ru/potemki
- **Description**: "Личные истории и переживания из жизни"
- **Language**: ru
- **Generator**: ZenMaster RSS Generator v2.1

### 3. Required Item Elements

#### media:rating (Required)
Added content rating for each article:
```xml
<media:rating scheme="urn:simple">nonadult</media:rating>
```

#### category (Required)
Added three categories for each article:
- `format-article` - публикация в формате статьи
- `index` - материал индексируется в поисковых системах
- `comment-all` - комментировать могут все пользователи

#### guid (Required)
Unique identifier for each article using format:
```
{article-slug}::{date}
```

#### link (Required)
Unique article URL:
```
https://dzen.ru/potemki/{article-slug}::{date}
```

#### enclosure (Required)
Image with proper type:
```xml
<enclosure url="https://raw.githubusercontent.com/..." type="image/jpeg"/>
```

### 4. Image URLs
All images use raw GitHub URLs:
```
https://raw.githubusercontent.com/crosspostly/dzen/main/articles/{path}/{filename}.jpg
```

### 5. Content Formatting
Content is now converted from Markdown to proper HTML:
- Paragraphs wrapped in `<p>` tags
- Headings: `## Title` → `<h2>Title</h2>`
- Bold text: `**text**` → `<b>text</b>`
- Italic text: `*text*` → `<i>text</i>`
- Links: `[text](url)` → `<a href="url">text</a>`

### 6. Content Structure
According to Dzen requirements, `content:encoded` supports:
- `<p>` - paragraphs ✅
- `<a>` - links ✅
- `<b>` - bold ✅
- `<i>` - italic ✅
- `<h1>`, `<h2>`, `<h3>`, `<h4>` - headings ✅
- `<blockquote>` - quotes
- `<ul><li>` - bulleted lists
- `<ol><li>` - numbered lists

## Files Modified
- `/scripts/generate-feed.js` - Main RSS feed generator

## Usage
Generate RSS feed:
```bash
npm run feed:incremental  # For new articles only
npm run feed:full         # For all articles
```

Output location: `/public/feed.xml`

## Dzen Feed URL
The feed is available at:
https://dzen-livid.vercel.app/feed.xml

## Verification
To verify the feed meets Dzen requirements:
1. Check all required elements are present (title, guid, pubDate, etc.)
2. Verify media:rating is set to "nonadult"
3. Ensure category tags include format and indexing options
4. Confirm image URLs use raw GitHub links
5. Validate content is in HTML format with proper tags

## Next Steps
1. ✅ RSS feed structure complies with Dzen requirements
2. ✅ Images use raw GitHub URLs
3. ✅ Content is properly formatted in HTML
4. ✅ All required metadata tags are present
5. 🔄 Feed available at https://dzen-livid.vercel.app/feed.xml

## Notes
- Feed generator mode: `incremental` (only new articles) or `full` (all articles)
- Maximum 500 articles per feed submission (Dzen requirement)
- Articles must be from last 2-3 days (Dzen requirement)
- Minimum 10 articles for initial feed submission (Dzen requirement)
- Images minimum width: 700 pixels (Dzen requirement)
