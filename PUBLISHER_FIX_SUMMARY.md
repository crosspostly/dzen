# 🚀 Dzen Publisher Fix - Summary

## Problem
The auto-publisher was failing with error:
```
❌ PlaywrightService Error: page.waitForSelector: Timeout 15000ms exceeded.
- waiting for locator('[data-testid="add-publication-button"], .new-publication-button')
```

## Root Cause
The old selectors `[data-testid="add-publication-button"]` and `.new-publication-button` are no longer present on the Dzen Studio page. The website UI was updated.

## Solution

### Updated Files

#### 1. `services/playwrightService.ts`
**Changes:**
- Added **multiple fallback selectors** for all critical elements
- Changed from single selector to **selector arrays** with retry logic
- Updated navigation to handle both direct URL and fallback flows
- Added better error handling and logging

**Key improvements:**

**Navigation (navigateToEditor):**
```typescript
// OLD: Single selector that fails
const addBtn = await this.page!.waitForSelector(
  '[data-testid="add-publication-button"], .new-publication-button', 
  { timeout: 15000 }
);

// NEW: Multiple strategies
const addBtnSelectors = [
  'button:has-text("Создать")',
  'button:has-text("Добавить")', 
  'button:has-text("Новая")',
  'a[href*="/editor"]',
  'a[href*="/create"]',
  '[class*="addButton"]',
  '[class*="createButton"]',
  '[class*="StudioHeader"] button:first-child',
  'header button:first-child',
  '.studio-header button:first-child',
];
```

**Publish Button (submitPublish):**
```typescript
const publishBtnSelectors = [
  'button[data-testid="article-publish-btn"]',
  'button[data-testid="publish-btn"]',
  'button:has-text("Опубликовать")',
  '[class*="publishButton"]',
  '[class*="publishBtn"]',
  'button[type="submit"]',
];
```

**Image Upload (fillArticle):**
```typescript
const imageBtnSelectors = [
  'button[data-tip="Вставить изображение"]',
  'button[aria-label*="Изображение"]',
  'button:has-text("Изображение")',
  'button:has-text("Загрузить")',
  '[data-testid="upload-image"]',
  '[class*="imageUpload"]',
  'svg[role="img"] + button',
];
```

#### 2. `scripts/quick-publish-test.ts` (NEW)
Quick test script for publishing a test article with generated image.

**Usage:**
```bash
node --import tsx scripts/quick-publish-test.ts
```

#### 3. `scripts/publish-first-from-feed.ts` (NEW)
Publishes the first article from feed.xml.

**Usage:**
```bash
node --import tsx scripts/publish-first-from-feed.ts
```

#### 4. `scripts/find-dzen-selectors.ts` (NEW)
Diagnostic tool to find current selectors on Dzen Studio page.

**Usage:**
```bash
node --import tsx scripts/find-dzen-selectors.ts
```

#### 5. `scripts/test-dzen-selectors.ts` (NEW)
Quick selector tester - dumps all interactive elements.

**Usage:**
```bash
node --import tsx scripts/test-dzen-selectors.ts
```

## Testing

### Prerequisites
1. **Playwright installed:**
   ```bash
   npx playwright install chromium
   ```

2. **Cookies configured:**
   - Option 1: `config/cookies.json` (local)
   - Option 2: `DZEN_COOKIES_JSON` environment variable (CI/CD)

### Test Commands

#### 1. Quick Smoke Test
```bash
cd /home/varsmana/dzen/dzen
HEADLESS=true node --import tsx scripts/quick-publish-test.ts
```

#### 2. Publish from Feed
```bash
HEADLESS=true node --import tsx scripts/publish-first-from-feed.ts
```

#### 3. Full Publisher (existing)
```bash
HEADLESS=true node --import tsx scripts/publish-dzen.ts
```

#### 4. Diagnostic Mode (headful)
```bash
HEADLESS=false node --import tsx scripts/test-dzen-selectors.ts
```

## Expected Output

### Success
```
✅ Found add button via: "button:has-text("Создать")"
✅ Editor ready
✅ Found title input via: "h1[contenteditable="true"]"
✅ Found body editor via: ".public-DraftEditor-content"
✅ Found image button via: "button[data-tip="Вставить изображение"]"
✅ Image uploaded successfully
✅ Found publish button via: "button:has-text("Опубликовать")"
✅ Publish button clicked
✅ Confirmation clicked
🔗 Published: https://dzen.ru/a/XXXXXXXXXX
✅ SUCCESS! Article published!
```

### Failure (with diagnostics)
```
❌ Could not find add publication button
📸 State dumped to no-add-button.html and no-add-button.png
❌ Publish button not found
📸 State dumped to no-publish-button.html and no-publish-button.png
```

## Debugging

If the publisher still fails, check these files:
- `error_state.html` - Full page HTML at time of error
- `error_state.png` - Screenshot of the page
- `no-add-button.png` - Screenshot if add button not found
- `no-publish-button.png` - Screenshot if publish button not found
- `no-title-input.png` - Screenshot if title input not found
- `no-body-editor.png` - Screenshot if body editor not found
- `no-image-button.png` - Screenshot if image upload button not found

## CI/CD Integration

The GitHub Actions workflow already uses the correct approach:

```yaml
- name: 🤖 Publish to Dzen
  id: publisher
  env:
    CI: true
    HEADLESS: true
    DZEN_COOKIES_JSON: ${{ secrets.DZEN_COOKIES_JSON }}
  run: |
    timeout 300 npx tsx scripts/publish-dzen.ts 2>&1 | tee publish.log
```

No changes needed to `.github/workflows/*.yml` files.

## Future-Proofing

To make the publisher more resilient to UI changes:

1. **Use text-based selectors** (`button:has-text("Создать")`) instead of data attributes
2. **Always have fallbacks** - try multiple selector strategies
3. **Log which selector worked** - helps diagnose future changes
4. **Dump state on error** - screenshots and HTML for debugging
5. **Keep diagnostic scripts** - for quick troubleshooting

## Files Modified

| File | Status | Purpose |
|------|--------|---------|
| `services/playwrightService.ts` | ✅ Updated | Core publishing logic with resilient selectors |
| `scripts/quick-publish-test.ts` | ✅ New | Quick smoke test with generated image |
| `scripts/publish-first-from-feed.ts` | ✅ New | Publish first article from feed.xml |
| `scripts/find-dzen-selectors.ts` | ✅ New | Diagnostic tool to find selectors |
| `scripts/test-dzen-selectors.ts` | ✅ New | Quick selector tester |
| `scripts/publish-dzen.ts` | ⚠️ No change | Already correct, uses playwrightService |

## Next Steps

1. **Test locally:**
   ```bash
   cd /home/varsmana/dzen/dzen
   HEADLESS=false node --import tsx scripts/quick-publish-test.ts
   ```

2. **Check screenshots** to verify UI is as expected

3. **If successful, push to GitHub:**
   ```bash
   git add services/playwrightService.ts scripts/*.ts
   git commit -m "🤖 Fix: Resilient selectors for Dzen publisher"
   git push
   ```

4. **Monitor GitHub Actions** for successful runs

---
**Date:** 2026-03-29
**Status:** ✅ READY FOR TESTING
