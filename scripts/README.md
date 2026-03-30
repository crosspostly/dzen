# 📦 Dzen Publisher - Scripts Documentation

## 🚀 Quick Start

### Publish Article to Dzen
```bash
# Publish first unpublished article from feed.xml
npm run publish

# Or with headless mode disabled (see browser)
HEADLESS=false npm run publish
```

## 📋 Available Scripts

### 🎯 Publishing Scripts

| Command | Description |
|---------|-------------|
| `npm run publish` | Publish first unpublished article from feed.xml |
| `npm run publish:feed` | Alternative publisher with feed integration |
| `npm run publish:test` | Quick test with dummy article |
| `npm run publish:debug` | Debug Dzen editor (opens browser) |

### 🧪 Test Scripts

| Command | Description |
|---------|-------------|
| `npm run test:selectors` | Test Dzen button selectors (headless) |
| `npm run test:smoke-push` | Test GitHub push mechanism |

### 📰 Feed Scripts

| Command | Description |
|---------|-------------|
| `npm run feed:generate` | Generate incremental feed |
| `npm run feed:full` | Generate full feed |

## 🔧 Configuration

### Cookies Setup

Create `config/cookies.json` with your Dzen cookies:

```json
{
  "dzen": [
    {
      "name": "yandexuid",
      "value": "your_value",
      "domain": ".dzen.ru"
    }
  ]
}
```

Or set environment variable:
```bash
export DZEN_COOKIES_JSON='[{"name":"yandexuid","value":"..."}]'
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS` | `true` | Set to `false` to see browser |
| `DZEN_COOKIES_JSON` | - | Cookies as JSON string |

## 📝 Script Details

### `publish-dzen.ts` (Main Publisher)

**What it does:**
1. Reads `public/feed.xml` for unpublished articles
2. Resolves image paths (GitHub/dzen.ru URLs → local files)
3. Publishes via Playwright
4. Saves to `!posts/PRODUCTION_READY/published_articles.txt`

**Usage:**
```bash
npm run publish
```

**Image Resolution:**
- GitHub URLs → searches `articles/` folder
- dzen.ru URLs → searches `articles/` folder  
- Local paths → verifies existence
- External URLs → keeps as-is for URL insertion

### `quick-publish-test.ts` (Test Publisher)

**What it does:**
- Creates a test article with dummy content
- Generates a test image (800x600 blue PNG)
- Publishes to Dzen
- Good for testing selectors without wasting content

**Usage:**
```bash
npm run publish:test
```

### `debug-dzen-editor.ts` (Editor Debugger)

**What it does:**
1. Opens Dzen editor in browser
2. Dumps all interactive elements to `editor-debug.json`
3. Saves HTML to `editor-debug.html`
4. Keeps browser open for 60 seconds

**Usage:**
```bash
DZEN_COOKIES_JSON='...' npm run publish:debug
```

**Output:**
```json
[
  {
    "tag": "input",
    "placeholder": "Заголовок статьи",
    "aria-label": "Заголовок",
    "data-testid": "title-input",
    "contentEditable": "true",
    "selector": "input.title-input"
  }
]
```

### `test-dzen-selectors.ts` (Selector Tester)

**What it does:**
- Tests 20+ selectors for "Add Publication" button
- Takes screenshot: `dzen-studio-test.png`
- Dumps page structure if no selectors match

**Usage:**
```bash
npm run test:selectors
```

### `smoke-push.ts` (GitHub Push Test)

**What it does:**
1. Generates dummy article (no AI calls)
2. Exports to `articles/_smoke-test/`
3. Pushes to GitHub via GitSyncService
4. Verifies push success

**Usage:**
```bash
npm run test:smoke-push
```

## 🐛 Troubleshooting

### "No inputs found in editor"

**Problem:** Dzen editor UI changed

**Solution:**
1. Run debug script:
   ```bash
   HEADLESS=false DZEN_COOKIES_JSON='...' npm run publish:debug
   ```
2. Check `editor-debug.json` for correct selectors
3. Update `services/playwrightService.ts` with new selectors

### "No inputs found in editor"

**Problem:** Button selectors outdated

**Solution:**
1. Run selector test:
   ```bash
   npm run test:selectors
   ```
2. Check output for working selectors
3. Update `playwrightService.ts` line ~200-250

### Image Not Inserting

**Problem:** File upload or URL insertion failing

**Solution:**
1. Check image path resolution in logs
2. Verify file exists: `ls -la articles/your-image.jpg`
3. Try URL insertion method (external URLs supported)

### Cookies Expired

**Problem:** Authentication fails

**Solution:**
1. Re-export cookies from browser
2. Update `config/cookies.json`
3. Or set new `DZEN_COOKIES_JSON` env var

## 📁 File Structure

```
dzen/
├── scripts/
│   ├── publish-dzen.ts              # Main publisher
│   ├── quick-publish-test.ts        # Test publisher
│   ├── debug-dzen-editor.ts         # Editor debugger
│   ├── test-dzen-selectors.ts       # Selector tester
│   └── smoke-push.ts                # GitHub push test
├── services/
│   └── playwrightService.ts         # Dzen automation
├── config/
│   └── cookies.json                 # Dzen authentication
├── public/
│   └── feed.xml                     # Articles feed
└── articles/                        # Generated articles
```

## 🔍 Debug Mode

For maximum visibility, run with:
```bash
HEADLESS=false npm run publish
```

This will:
- Open browser window
- Show all actions in real-time
- Take screenshots at each step
- Allow manual intervention if needed

## 📊 Logs Explanation

```
[2026-03-30T14:49:38.109Z] 🤖 Starting PlaywrightService
[2026-03-30T14:49:39.515Z] 🌐 Navigating to Dzen editor
[2026-03-30T14:49:52.042Z] ✅ Closed modal via OK button
[2026-03-30T14:50:30.643Z] ✅ Found add button
[2026-03-30T14:51:27.727Z] 📝 Looking for inputs...
[2026-03-30T14:51:27.730Z] Found 0 input elements  ← PROBLEM!
```

**Key symbols:**
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 📝 Action
- 🔍 Search
- 🖼️ Image operation

## 🆘 Getting Help

If scripts fail:
1. Check logs for specific error
2. Run appropriate debug script
3. Compare `editor-debug.json` with current selectors
4. Update `playwrightService.ts` with new selectors
