# 🎯 Dzen Publisher - Quick Start Guide

**Correct Way to Publish Articles to Dzen**

---

## ✅ Prerequisites

### 1. Cookies Setup

**Option A: File (Recommended)**
```bash
# Create config/cookies.json
{
  "dzen": [
    {
      "name": "yandexuid",
      "value": "YOUR_COOKIE_VALUE",
      "domain": ".dzen.ru"
    }
  ]
}
```

**Option B: Environment Variable**
```bash
export DZEN_COOKIES_JSON='[{"name":"yandexuid","value":"..."}]'
```

### 2. Feed Setup

Ensure `public/feed.xml` exists with articles:
```xml
<item>
  <title>Your Article Title</title>
  <content:encoded><![CDATA[<p>Article HTML content</p>]]></content:encoded>
  <media:content url="https://github.com/your-repo/articles/image.jpg"/>
</item>
```

### 3. Images Setup

Place images in `articles/` folder:
```bash
articles/
  └── your-article/
      └── image.jpg
```

---

## 🚀 Publishing Workflow

### Step 1: Test First (Recommended)

```bash
# Run quick test with dummy article
npm run publish:test
```

**Expected output:**
```
✅ Test image created
✅ Found add button
✅ Found write button
✅ Found inputs
✅ Image uploaded
✅ Article published
🔗 URL: https://dzen.ru/a/...
```

### Step 2: Publish Real Article

```bash
# Publish first unpublished article from feed
npm run publish
```

**What happens:**
1. Reads `public/feed.xml`
2. Finds first unpublished article
3. Resolves image paths
4. Publishes to Dzen via Playwright
5. Saves URL to `!posts/PRODUCTION_READY/published_articles.txt`

### Step 3: Verify Publication

```bash
# Check published articles
cat !posts/PRODUCTION_READY/published_articles.txt

# Or open Dzen studio
open https://dzen.ru/studio
```

---

## 🧪 Testing Commands

### Test Selectors
```bash
# Verify Dzen selectors are working
npm run test:selectors
```

**Output:**
```
✅ FOUND: "[data-testid="add-publication-button"]"
   Visible: true
   Tag: BUTTON
   Text: "Добавить публикацию"
```

### Debug Editor
```bash
# Open Dzen editor in browser (visible)
HEADLESS=false npm run publish:debug
```

**Creates:**
- `editor-debug.json` - All interactive elements
- `editor-debug.html` - Full HTML snapshot

### Smoke Test GitHub Push
```bash
# Test GitHub push mechanism
npm run test:smoke-push
```

---

## 🐛 Troubleshooting

### Problem: "No inputs found"

**Solution:**
```bash
# Debug to see what's in editor
HEADLESS=false npm run publish:debug

# Check editor-debug.json for correct selectors
cat editor-debug.json | grep contenteditable
```

**Expected:**
```json
{
  "tag": "div",
  "contentEditable": "true",
  "selector": "div.content-input"
}
```

### Problem: "Button not found"

**Solution:**
```bash
# Test selectors
npm run test:selectors

# Check output for working selectors
# Update services/playwrightService.ts if needed
```

### Problem: "Cookies expired"

**Solution:**
1. Open browser, login to Dzen
2. Export cookies (browser extension)
3. Update `config/cookies.json`
4. Retry: `npm run publish`

### Problem: "Image upload fails"

**Solution:**
```bash
# Check image exists
ls -la articles/your-image.jpg

# Or use URL method (external URLs supported)
# Image will be inserted via URL dialog
```

---

## 📋 Complete Command Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run publish` | Publish from feed | Production |
| `npm run publish:test` | Test with dummy | Before production |
| `npm run publish:debug` | Debug editor | Troubleshooting |
| `npm run test:selectors` | Test buttons | Selector updates |
| `npm run test:smoke-push` | Test GitHub push | CI/CD verification |

---

## 🎯 Best Practices

### 1. Always Test First
```bash
# Before publishing real content
npm run publish:test
```

### 2. Use Headless Mode in CI
```bash
# GitHub Actions (default)
npm run publish

# Local debugging
HEADLESS=false npm run publish
```

### 3. Monitor Logs
```bash
# Key success indicators:
✅ Found add button
✅ Found write button
✅ Found inputs
✅ Image uploaded
✅ Article published
```

### 4. Keep Selectors Updated
```bash
# If Dzen UI changes, run:
npm run test:selectors

# Update selectors in:
# services/playwrightService.ts
```

### 5. Backup Cookies
```bash
# Keep backup of working cookies
cp config/cookies.json config/cookies.json.backup
```

---

## 📊 Success Indicators

### Good Log Output
```
[2026-03-30T15:18:08.877Z] 🤖 Starting PlaywrightService
[2026-03-30T15:18:25.528Z] ✅ Found add button with selector: [data-testid="add-publication-button"]
[2026-03-30T15:18:30.079Z] ✅ Found write button with selector: text="Написать статью"
[2026-03-30T15:18:57.796Z] Found 2 input elements
[2026-03-30T15:19:43.681Z] ✅ Image file uploaded!
[2026-03-30T15:20:02.774Z] ✅ Clicked confirmation button
[2026-03-30T15:20:06.929Z] 🔗 Published at: https://dzen.ru/a/acqURmSfXRH7cmjz
```

### Bad Log Output (Troubleshooting Needed)
```
❌ Add button not found
❌ No inputs found in editor
❌ File input not found
❌ First publish button not found
```

---

## 🔗 Additional Resources

- **Full Documentation:** `scripts/README.md`
- **Selector Cheatsheet:** `scripts/SELECTORS.md`
- **Complete Changelog:** `CHANGELOG_PUBLISHER.md`
- **GitHub Repo:** https://github.com/crosspostly/dzen

---

## ✅ Verification Checklist

Before considering publication successful:

- [ ] Test passed: `npm run publish:test`
- [ ] Cookies valid: `config/cookies.json` exists
- [ ] Feed exists: `public/feed.xml` has articles
- [ ] Images exist: `articles/` folder has images
- [ ] Log shows: `✅ Found add button`
- [ ] Log shows: `✅ Found write button`
- [ ] Log shows: `✅ Found inputs`
- [ ] Log shows: `✅ Image uploaded`
- [ ] Log shows: `✅ Article published`
- [ ] URL saved to: `!posts/PRODUCTION_READY/published_articles.txt`

---

**Last Updated:** 2026-03-30  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
