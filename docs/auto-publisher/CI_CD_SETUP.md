# 🧹 GitHub Actions: CI/CD Auto-Publisher Setup

## Quick Overview

You now have everything set up for **automated publishing every 3 hours**. Here's what was created:

```
PRODUCTION_READY/
├── .github/workflows/
│   ├── auto-publish.yml        📦 Scheduled workflow
│   └── README.md                📜 Configuration guide
├── src/
│   ├── main.js                 📃 Original script
│   └── main.js.ci              📃 CI/CD optimized version
├── CI_CD_SETUP.md           💯 This file
└── ...
```

## 📁 What's Inside

### 1. **auto-publish.yml** - The Workflow

**What it does:**
- Runs every 3 hours automatically (00:00, 03:00, 06:00, ... UTC)
- Can be manually triggered from GitHub Actions tab
- Installs dependencies
- Installs Playwright browsers
- Runs your publisher script
- Saves publishing history to Git

**Schedule:**
```yaml
on:
  schedule:
    - cron: '0 */3 * * *'  # Every 3 hours
```

### 2. **main.js.ci** - CI/CD Optimized Script

**Key differences from main.js:**
- Uses **relative paths** (works in CI/CD)
- Configurable timeouts
- Detects CI/CD environment
- Better error handling
- Auto-saves history

**Configuration:**
```javascript
const CONFIG = {
  feedPath: path.join(__dirname, '../public/feed.xml'),
  cookiesPath: path.join(__dirname, '../config/cookies.json'),
  historyPath: path.join(__dirname, '../published_articles.txt'),
  headless: process.env.HEADLESS !== 'false', // true for CI
  timeout: 60000
};
```

## 🔗 Setup Steps

### Step 1: Use CI/CD Optimized Script

If running in GitHub Actions, rename the script:

```bash
# Option A: Replace main.js with CI version
mv src/main.js src/main.js.backup
mv src/main.js.ci src/main.js

# Option B: Or update .github/workflows/auto-publish.yml to use:
# run: node src/main.js.ci
```

### Step 2: Update Hardcoded Paths in main.js

The original main.js has this hardcoded path:

```javascript
// ❌ BEFORE (hardcoded):
const feedContent = await fs.readFile(
  'C:\\Users\\varsm\\OneDrive\\Desktop\\projects\\dzen\\public\\feed.xml',
  'utf8'
);

// ✅ AFTER (relative):
const feedPath = path.join(__dirname, '../public/feed.xml');
const feedContent = await fs.readFile(feedPath, 'utf8');
```

If you want to keep using main.js:

1. Open `src/main.js`
2. Find all hardcoded paths (search for `C:\`)
3. Replace with relative paths using `path.join(__dirname, ...)`

### Step 3: Set Up Cookies

The workflow needs cookies.json to authenticate with Dzen:

```bash
# 1. Get cookies from your browser
#    Open Dzen in Chrome Dev Tools > Application > Cookies > dzen.ru
#    Export them as JSON

# 2. Save to config/cookies.json
config/
└── cookies.json

# 3. Add to .gitignore (NEVER commit!)
echo 'config/cookies.json' >> .gitignore
```

### Step 4: Verify Feed File

Make sure `public/feed.xml` exists and is accessible:

```bash
ls -la PRODUCTION_READY/public/feed.xml

# Should show something like:
# -rw-r--r-- 1 user group 12345 Jan 04 12:00 feed.xml
```

### Step 5: Test Locally (Optional)

```bash
cd PRODUCTION_READY

# Install dependencies
npm install

# Install Playwright
npx playwright install chromium

# Run once
node src/main.js
```

### Step 6: Enable Actions (if needed)

In GitHub:
1. Go to Settings > Actions > General
2. Enable Actions
3. Allow workflows to have read/write permissions

## 🤎 Testing

### Manual Run

1. Go to: `https://github.com/crosspostly/dzen/actions`
2. Select: "Auto-Publish Articles Every 3 Hours"
3. Click: "Run workflow" button
4. Select branch: `main`
5. Click: "Run workflow"

### Monitor Logs

1. Click on the workflow run
2. Expand "publish" job
3. Scroll through logs:
   - 🧹 AUTO-PUBLISHER CONFIGURATION
   - 📄 Found X articles in feed
   - 📝 Found X published articles
   - 🌐 Browser launch
   - ✅ Success or ❌ Error

### Check Results

```bash
# Should see new entry
cat PRODUCTION_READY/published_articles.txt

# Output:
# 2026-01-04 08:00:00 - Article Title 1
# 2026-01-04 08:00:00 - Article Title 2
```

## 📤 Processing Details

### HTML to Text Conversion

The `processArticleContent()` function handles:

```
<p>Text</p>           → \n\nText
<h1>Title</h1>        → \n\nTitle\n\n
<div>Content</div>    → \nContent\n
<br />                → \n
<li>Item</li>         → \n• Item
&nbsp;                → (space)
&amp;                → &
&lt;                 → <
&gt;                 → >

Multiple newlines    → Max 2 consecutive
```

### Example

**Input (HTML):**
```html
<p>First paragraph</p>
<p>Second paragraph with <strong>bold</strong></p>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
<br />
<p>Final paragraph</p>
```

**Output (Text):**
```
First paragraph

Second paragraph with bold

• Item 1
• Item 2

Final paragraph
```

## 💰 Feed.xml Requirements

Your feed.xml must have this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[Article Title]]></title>
      <link>https://example.com/article</link>
      <pubDate>Sun, 04 Jan 2026 08:00:00 GMT</pubDate>
      <description><![CDATA[Short description]]></description>
      <content:encoded><![CDATA[Full HTML content here]]></content:encoded>
      <media:content url="https://example.com/image.jpg" />
    </item>
  </channel>
</rss>
```

## 🔐 Security Notes

### ❌ DO NOT COMMIT

```
config/cookies.json    - Contains auth tokens
.env files             - Secrets
Personal data          - Any sensitive info
```

### ✅ SAFE TO COMMIT

```
src/main.js
public/feed.xml
published_articles.txt
.github/workflows/*.yml
```

## 🔗 Troubleshooting

### Issue: "No articles found in feed.xml"

```
❌ Ошибка при чтении оили парсинге фида
```

**Solution:**
1. Check feed.xml exists: `ls PRODUCTION_READY/public/feed.xml`
2. Check it's not empty: `wc -l PRODUCTION_READY/public/feed.xml`
3. Validate XML syntax

### Issue: "Cookies not found"

```
❌ Ошибка загрузки куки: ENOENT
```

**Solution:**
1. Export cookies from Dzen (browser dev tools)
2. Save to: `config/cookies.json`
3. Test locally: `node src/main.js`

### Issue: "Timeout waiting for element"

**Solution:**
1. Dzen website might have changed layout
2. Update CSS selectors in `src/main.js`
3. Check browser dev tools for new selectors

### Issue: "GitHub Actions not running"

**Solution:**
1. Go to: Settings > Actions > General
2. Enable: "Allow all actions and reusable workflows"
3. Set: "Workflow permissions" to "Read and write"

## 🔄 Scheduling Examples

### Every Hour
```yaml
cron: '0 * * * *'  # :00 every hour
```

### Every 4 Hours
```yaml
cron: '0 */4 * * *'  # 00:00, 04:00, 08:00, etc.
```

### Specific Times
```yaml
cron: '0 9,12,18 * * *'  # 09:00, 12:00, 18:00 UTC
```

### Daily at Midnight
```yaml
cron: '0 0 * * *'  # 00:00 UTC every day
```

## 🔏 Next Steps

1. ✅ Replace paths in main.js OR use main.js.ci
2. ✅ Set up config/cookies.json
3. ✅ Test locally first
4. ✅ Push to GitHub
5. ✅ Verify Actions are enabled
6. ✅ Check first automated run
7. 🔄 Monitor subsequent runs

## 📕 Reference

- Workflow file: `.github/workflows/auto-publish.yml`
- Workflow guide: `.github/workflows/README.md`
- Main script: `src/main.js` (or `src/main.js.ci`)
- Config: `config/cookies.json` (not in git)
- Feed: `public/feed.xml`
- History: `published_articles.txt`

---

**Status:** 🚀 Ready for deployment

**Last updated:** 2026-01-04 08:00 UTC
