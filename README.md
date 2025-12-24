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

3. **Safe PR Testing (NEW):**
   - Actions → Test PR Branch - Safe Testing
   - Input: PR URL (e.g., https://github.com/crosspostly/dzen/pull/92)
   - Workflow tests on feature branch, commits results to main
   - See: [docs/TEST-PR-BRANCH-WORKFLOW.md](./docs/TEST-PR-BRANCH-WORKFLOW.md)

4. **Documentation:**
   - [GitHub Actions Setup](./docs/GITHUB-ACTIONS-SETUP.md) - Complete workflow guide
   - [v6.0 Cleanup System](./docs/v6.0-cleanup-system.md) - 3-level quality system
   - [Safe PR Testing](./docs/TEST-PR-BRANCH-WORKFLOW.md) - PR branch testing
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
npm run factory -- --count=1 --images
```

**⚠️ IMPORTANT:** Never commit `.env` file with real API keys!

## 🧪 Workflows

### Content Factory - Production
Generate articles on main branch. Auto-commits results.
```
Actions → Content Factory → Run workflow
```

### Test PR Branch - Safe Testing (NEW)
Test feature branches before merging. Provides PR URL, tests on branch, commits to main if successful.
```
Actions → Test PR Branch - Safe Testing → Run workflow
Input: PR URL (e.g., https://github.com/crosspostly/dzen/pull/92)
```

### Test Environment Setup
Validate GitHub Actions environment and v6.0 cleanup system.
```
Actions → Test Environment Setup → Run workflow
```

## Structure

- `content/articles/` - Generated articles in markdown format with front-matter
- `feed.xml` - Automatically generated RSS feed for Yandex Dzen
- `scripts/generate-feed.js` - Script to generate RSS feed from markdown articles
- `.github/workflows/` - GitHub Actions workflows
- `docs/` - Comprehensive documentation

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

## v6.0 Article Cleanup System

3-level quality system ensures published articles are clean:

1. **Level 1** - Prevention: Enhanced generation prompts
2. **Level 2** - AI Cleanup: Automatic cleanup via Gemini
3. **Level 3** - Validation: Quality gate before publication

Result: 95%+ articles pass on first attempt, 0% artifacts published.

See: [v6.0-cleanup-system.md](./docs/v6.0-cleanup-system.md)

## Yandex Dzen Integration

To connect to Yandex Dzen:
1. Deploy this repository to GitHub Pages
2. Add the feed URL (`https://yourusername.github.io/feed.xml`) to your Yandex Dzen channel settings
3. Yandex Dzen will fetch new articles every hour

## Support

For detailed information:
- **Setup:** [SECRETS-SETUP.md](./docs/SECRETS-SETUP.md)
- **GitHub Actions:** [GITHUB-ACTIONS-SETUP.md](./docs/GITHUB-ACTIONS-SETUP.md)
- **PR Testing:** [TEST-PR-BRANCH-WORKFLOW.md](./docs/TEST-PR-BRANCH-WORKFLOW.md)
- **Cleanup System:** [v6.0-cleanup-system.md](./docs/v6.0-cleanup-system.md)
- **Deployment:** [GITHUB-DEPLOYMENT-CHECKLIST.md](./docs/GITHUB-DEPLOYMENT-CHECKLIST.md)
