# ZenMaster - AI Article Generator for Dzen

This repository generates AI-powered articles for Yandex Dzen with automatic RSS feed generation.

## Structure

- `content/articles/` - Generated articles in markdown format with front-matter
- `feed.xml` - Automatically generated RSS feed for Yandex Dzen
- `scripts/generate-feed.js` - Script to generate RSS feed from markdown articles

## How it works

1. The system generates articles in `content/articles/` directory
2. GitHub Actions automatically runs every hour to generate/update `feed.xml`
3. Yandex Dzen fetches articles from the RSS feed

## Article Format

Articles are generated in markdown format with YAML front-matter:

```markdown
---
title: "Article Title"
date: "2025-01-15"
description: "Intriguing description for Yandex Dzen"
image: "image.jpg"
category: "lifestory"
---
```

## Yandex Dzen Integration

To connect to Yandex Dzen:
1. Deploy this repository to GitHub Pages
2. Add the feed URL (`https://yourusername.github.io/feed.xml`) to your Yandex Dzen channel settings
3. Yandex Dzen will fetch new articles every hour