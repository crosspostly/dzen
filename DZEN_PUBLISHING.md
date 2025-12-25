# 🚀 Dzen Publishing System

## Overview

The Dzen Publishing System allows you to automatically publish generated articles to Yandex.Dzen using browser automation. This system integrates with GitHub Secrets for secure authentication and provides both dry-run validation and live publishing modes.

## Features

- **Automatic Publishing**: Publish articles to Yandex.Dzen with a single command
- **Browser Automation**: Uses Playwright for reliable browser-based publishing
- **GitHub Secrets Integration**: Securely store Dzen authentication cookies
- **Dry Run Mode**: Validate articles without actually publishing
- **Rate Limiting**: Automatic delays between publications to avoid rate limits
- **Published Directory**: Automatically moves published articles to avoid re-publishing

## Requirements

1. **Dzen Account**: You need a Yandex.Dzen account with publishing permissions
2. **Authentication Cookies**: Export your Dzen authentication cookies as JSON
3. **GitHub Secrets**: Store cookies in GitHub Secrets for CI/CD workflows

## Setup

### 1. Get Dzen Authentication Cookies

1. Log in to your Yandex.Dzen account in Chrome
2. Open Developer Tools (F12) → Application → Cookies
3. Copy all cookies for `zen.yandex.ru` domain
4. Export as JSON format

### 2. Set Environment Variables

For local development, create a `.env` file:

```bash
# Dzen Publishing
DZEN_COOKIES='[{"name":"sessionid","value":"your_session_id","domain":".zen.yandex.ru"},...]'
```

For GitHub Actions, add the `DZEN_COOKIES` secret to your repository settings.

### 3. Install Dependencies

```bash
npm install
```

## Usage

### Basic Publishing

```bash
# Publish articles from today's directory
npm run publish --channel=women-35-60

# Publish from specific directory
npm run publish --dir=./articles/women-35-60/2025-12-25

# Limit number of articles
npm run publish --channel=women-35-60 --max=5
```

### Dry Run (Validation Only)

```bash
# Validate articles without publishing
npm run publish:dry-run --channel=women-35-60

# Dry run with specific directory
npm run publish --dry-run --dir=./articles/women-35-60/2025-12-25
```

### CLI Options

```
--channel=NAME     Channel name (default: women-35-60)
--dir=PATH         Directory with articles (default: ./articles/{channel}/{date})
--dry-run          Validate without publishing
--max=N            Maximum articles to publish (default: 100)
--verbose          Detailed logging
```

## Directory Structure

```
articles/
└── women-35-60/
    ├── 2025-12-25/
    │   ├── article1.md       # Will be published
    │   ├── article1.jpg      # Cover image
    │   ├── article2.md       # Will be published
    │   └── article2.jpg      # Cover image
    │
    └── published/           # Published articles are moved here
        ├── article1.md      # Already published
        └── article1.jpg     # Cover image
```

## Article Format

Articles must be in Markdown format with frontmatter:

```markdown
---
title: "Article Title"
date: "2025-12-25"
description: "Article description for SEO"
image: "article-image.jpg"
category: "lifestory"
---

Article content goes here...
```

## GitHub Actions Integration

Add a workflow file `.github/workflows/dzen-publish.yml`:

```yaml
name: Dzen Publishing

on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'Channel to publish'
        required: true
        default: 'women-35-60'
        type: choice
        options:
          - 'women-35-60'
          - 'young-moms'
          - 'men-25-40'
          - 'teens'
      max_articles:
        description: 'Maximum articles to publish'
        required: false
        default: '10'
        type: string
      dry_run:
        description: 'Dry run (validation only)'
        required: false
        default: 'false'
        type: choice
        options:
          - 'true'
          - 'false'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm install
      
      - name: Publish to Dzen
        run: |
          CHANNEL="${{ inputs.channel }}"
          MAX="${{ inputs.max_articles }}"
          DRY_RUN="${{ inputs.dry_run }}"
          
          CMD="npx tsx cli.ts publish --channel=$CHANNEL --max=$MAX"
          
          if [ "$DRY_RUN" = "true" ]; then
            CMD="$CMD --dry-run"
          fi
          
          eval "$CMD"
        env:
          DZEN_COOKIES: ${{ secrets.DZEN_COOKIES }}
```

## Security

- **Never commit cookies**: Add `.env` to `.gitignore`
- **Use GitHub Secrets**: Store `DZEN_COOKIES` in repository secrets
- **Rate Limiting**: Automatic delays prevent account bans
- **Error Handling**: Graceful failure with detailed error messages

## Troubleshooting

### Cookies Invalid

```
❌ Invalid Dzen cookies - cannot authenticate
```

**Solution**: Update your Dzen cookies and ensure they're valid JSON.

### No Articles Found

```
⚠️  No articles found in directory
```

**Solution**: Check the directory path and ensure articles are in Markdown format.

### Publishing Failed

```
❌ Publishing failed: Selector not found
```

**Solution**: Dzen may have changed their UI. Update selectors in `playwrightService.ts`.

## Architecture

```
DzenPublisherService
├── PlaywrightService (browser automation)
├── Article validation
├── Rate limiting
└── Published directory management
```

## Future Enhancements

- Multi-channel publishing support
- Scheduled publishing
- Article performance tracking
- Automatic retries for failed publications
- Content optimization suggestions

## Support

For issues or questions, please open a GitHub issue.