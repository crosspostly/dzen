# 🧹 GitHub Actions: Auto-Publisher Configuration

## Overview

This directory contains GitHub Actions workflows for automating Dzen article publishing.

## Workflows

### `auto-publish.yml`

**Purpose:** Automatically publish articles from feed.xml every 3 hours

**Schedule:**
- Runs every 3 hours: `00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC`
- Can be manually triggered via GitHub UI

**What it does:**
1. 📥 Checks out the repository
2. 📦 Sets up Node.js environment
3. 📥 Installs npm dependencies
4. 🎯 Installs Playwright browsers
5. 🧹 Runs the auto-publisher script (`src/main.js`)
6. 📤 Commits and pushes published articles history

**Environment:**
- Runs on: `windows-latest`
- Node.js: 18.x
- Browser: Chromium via Playwright

## Prerequisites

### Required Files

1. **`src/main.js`** - Main publisher script
   - Reads articles from `public/feed.xml`
   - Processes HTML content with `processArticleContent()`
   - Publishes via Playwright browser automation
   - Saves history to `published_articles.txt`

2. **`config/cookies.json`** - Dzen authentication cookies
   - Must be set up manually (sensitive data)
   - Contains session credentials
   - **NEVER commit to public repo**

3. **`public/feed.xml`** - RSS feed with articles
   - Source of articles to publish
   - Must be accessible in GitHub
   - Updates automatically from external source

4. **`published_articles.txt`** - Publishing history
   - Auto-generated on first run
   - Tracks which articles have been published
   - Prevents duplicate publishing

## Configuration

### Schedule

Edit the cron expression in `auto-publish.yml` to change frequency:

```yaml
on:
  schedule:
    - cron: '0 */3 * * *'  # Every 3 hours
```

**Common patterns:**
- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours
- `0 */4 * * *` - Every 4 hours
- `0 */6 * * *` - Every 6 hours
- `0 12 * * *` - Every day at 12:00 UTC

### Secrets

> ⚠️ **IMPORTANT:** Don't commit sensitive data to GitHub

For CI/CD in the future, you'll need:
1. `DZEN_COOKIES` - Authentication cookies (encrypted)
2. `FEED_URL` - External feed source (if applicable)

## Manual Trigger

To run the workflow manually:

1. Go to GitHub Actions tab
2. Select "Auto-Publish Articles Every 3 Hours" workflow
3. Click "Run workflow" button
4. Select branch (usually `main`)
5. Click "Run workflow"

## Monitoring

### View Logs

1. Go to GitHub Actions tab
2. Click on the workflow run
3. Expand the job to see detailed logs

### Check Results

- ✅ **Success:** Check `published_articles.txt` for new entry
- ❌ **Failure:** Review logs for error messages

## Troubleshooting

### Common Issues

#### 1. Cookies Not Found

```
❌ Ошибка загрузки куки: ENOENT: no such file or directory, open './config/cookies.json'
```

**Solution:**
- Manually save cookies file in `config/cookies.json`
- Cookies must include Dzen session authentication

#### 2. Feed File Not Found

```
❌ Ошибка при чтении или парсинге фида: ENOENT: no such file or directory, open 'C:\\Users\\varsm\\...'
```

**Solution:**
- Update hardcoded path in `src/main.js` to use relative path
- Path should be: `./public/feed.xml` (relative to working directory)

#### 3. Playwright Timeout

```
Timeout waiting for element to appear
```

**Solution:**
- Increase timeout values in `src/main.js`
- Check if Dzen website layout has changed
- Update CSS selectors if needed

#### 4. No Articles Published

```
❌ Не найдено новых статей для публикации (все статьи из фида уже были опубликованы)
```

**This is OK!**
- Means all articles have already been published
- Workflow will try again on next schedule

## File Structure

```
PRODUCTION_READY/
├── .github/
│   └── workflows/
│       ├── auto-publish.yml        ✅ Scheduled publishing
│       └── README.md                📜 This file
├── src/
│   └── main.js                     🧹 Publisher script
├── config/
│   └── cookies.json                🔐 Auth cookies (not in git)
├── modules/
│   └── publication_history.js       📖 History tracking
├── public/
│   └── feed.xml                    💰 RSS feed
├── published_articles.txt          📝 History file (auto-generated)
└── package.json                    📦 Dependencies
```

## Performance Tips

1. **Feed Updates:** Keep feed.xml fresh with latest articles
2. **Cookies:** Refresh cookies periodically (expires over time)
3. **Selectors:** Update CSS selectors if Dzen website changes
4. **History:** Archive old entries in `published_articles.txt` periodically

## Security Considerations

⚠️ **NEVER commit:**
- `config/cookies.json` - Contains authentication tokens
- `published_articles.txt` - Can be tracked but not sensitive

✅ **ALWAYS ensure:**
- Cookies are stored securely
- Only trusted code has access to Dzen credentials
- Regular updates to selectors if website changes
- Monitoring of workflow runs for suspicious activity

## Future Enhancements

- [ ] Add GitHub Secrets for cookies (CI/CD mode)
- [ ] Add Slack/Discord notifications on publish
- [ ] Add error recovery and retry logic
- [ ] Add metrics collection (articles published, success rate)
- [ ] Support multiple RSS feeds
- [ ] Add content filtering/validation
- [ ] Add image optimization before publishing

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review this README
3. Check `src/main.js` for detailed error messages
4. Update selectors if Dzen website changed
