# ZenMaster - AI Article Generator for Dzen

This repository generates AI-powered articles for Yandex Dzen with automatic RSS feed generation.

## 🚀 Quick Start

### GitHub Actions (Production)

1. **Setup Secrets:**
   - Go to: Settings → Secrets and variables → Actions
   - Add: `GEMINI_API_KEY` (get from https://aistudio.google.com/app/apikey)
   - See: [docs/SECRETS-SETUP.md](./docs/SECRETS-SETUP.md)

2. **Generate Articles:**
   - Actions → Content Factory → Run workflow
   - Choose: count, channel, images
   - Articles auto-commit to repository

3. **Documentation:**
    - [GitHub Actions Setup](./docs/GITHUB-ACTIONS-SETUP.md) - Complete workflow guide
    - [v7.0 Simplified Mode](./docs/v7.0-simplified-generation.md) - Clean text, no corruption
    - [v7.0 Quick Start](./docs/v7.0-quick-start.md) - One-command clean generation
    - [v6.0 Cleanup System](./docs/v6.0-cleanup-system.md) - 3-level quality system
    - [Quick Start Guide](./docs/CLEANUP-SYSTEM-README.md) - TL;DR

### Local Development

```bash
# 1. Clone
git clone https://github.com/your-repo/zenmaster.git
cd zenmaster

# 2. Install
npm install

# 3. Setup .env (DON'T commit this file!)
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Test
npx tsx test-article-cleanup-system.ts

# 5. Generate
# Standard mode (full processing)
npm run factory -- --count=1 --images

# Simplified mode (clean text, no corruption)
npm run factory -- --count=1 --no-anti-detection --no-cleanup --theme="Your theme"
```

**⚡️ TIP:** Use `--no-anti-detection --no-cleanup` for cleaner, faster generation with better text quality.

**⚠️ IMPORTANT:** Never commit `.env` file with real API keys!

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