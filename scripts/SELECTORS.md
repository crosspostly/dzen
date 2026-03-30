# 🎯 Dzen Selector Cheatsheet

**Last Verified:** 2026-03-30 (Test passed ✅)

## ✅ WORKING Selectors (Production Ready)

### 1. Add Publication Button
```typescript
'[data-testid="add-publication-button"]'  // ✅ PRIMARY - WORKING
```

**Location:** Dzen Studio header  
**Element:** Button  
**Fallback:** `header button:first-of-type`

---

### 2. Write Article Button
```typescript
'text="Написать статью"'  // ✅ PRIMARY - WORKING
```

**Location:** Popup menu after clicking Add  
**Element:** Text selector  
**Fallback:** `'text="Статья"'`

---

### 3. Editor Inputs
```typescript
'div[contenteditable="true"]'  // ✅ PRIMARY - WORKING
```

**Location:** Article editor  
**Elements:** 2 divs found
- First: Title input
- Second: Content editor

**Note:** Dzen uses `contenteditable` divs, not traditional inputs

---

### 4. Image Upload Button (Side Toolbar)
```typescript
'.article-editor-desktop--side-toolbar__sideToolbar-2f button.article-editor-desktop--side-button__sideButton-1z'  // ✅ PRIMARY - WORKING
```

**Location:** Right side toolbar in editor  
**Element:** Button with SVG icon  
**Action:** Opens image upload modal

---

### 5. File Input (Image Upload)
```typescript
'input[type="file"][accept*="image"]'  // ✅ PRIMARY - WORKING
```

**Location:** Image upload modal  
**Element:** Hidden file input  
**Action:** Accepts image files

---

### 6. First Publish Button
```typescript
'button[data-testid="article-publish-btn"]'  // ✅ PRIMARY - WORKING
```

**Location:** Bottom of editor  
**Element:** Button  
**Action:** Opens publish confirmation modal

---

### 7. Second Publish Button (Confirmation)
```typescript
'button[data-testid="publish-btn"][type="submit"]'  // ✅ PRIMARY - WORKING
```

**Location:** Publish confirmation modal  
**Element:** Submit button  
**Action:** Finalizes publication

---

## 📋 Complete Selector Flow

```
1. [data-testid="add-publication-button"]
   ↓
2. text="Написать статью"
   ↓
3. div[contenteditable="true"] (first) → Title
   div[contenteditable="true"] (second) → Content
   ↓
4. .article-editor-desktop--side-toolbar__sideToolbar-2f button.article-editor-desktop--side-button__sideButton-1z
   ↓
5. input[type="file"][accept*="image"]
   ↓
6. button[data-testid="article-publish-btn"]
   ↓
7. button[data-testid="publish-btn"][type="submit"]
   ↓
✅ Published!
```

---

## 🧪 Testing Commands

```bash
# Test all selectors
npm run test:selectors

# Quick publish test
npm run publish:test

# Debug editor (see selectors in action)
HEADLESS=false npm run publish:debug
```

---

## 🔍 Debug Tips

### If selector fails:
1. Run debug script:
   ```bash
   HEADLESS=false DZEN_COOKIES_JSON='...' npm run publish:debug
   ```

2. Check `editor-debug.json` for current DOM structure

3. Look for:
   - `data-testid` attributes
   - `contenteditable` elements
   - Button text in Russian

4. Update selectors in `services/playwrightService.ts`

---

## 📝 Selector Patterns

### Dzen Uses:
- **BEM classes:** `.article-editor-desktop--side-toolbar__sideToolbar-2f`
- **Data attributes:** `[data-testid="..."]`
- **Contenteditable:** `div[contenteditable="true"]` instead of inputs
- **Russian text:** Button labels in Russian

### Best Practices:
1. Prefer `data-testid` when available
2. Use text selectors for Russian UI
3. Look for `contenteditable` not `input`
4. BEM classes are stable (use double dash `--`)

---

## 🆘 Common Issues

### "No inputs found"
**Solution:** Look for `div[contenteditable="true"]` not `input`

### "Button not found"
**Solution:** Check if Russian text matches exactly

### "Modal not appearing"
**Solution:** Wait for animations (add `waitForTimeout(3000)`)

### "File upload fails"
**Solution:** Use `[accept*="image"]` not exact MIME type

---

## 📊 Test Results

| Date | Test | Result | URL |
|------|------|--------|-----|
| 2026-03-30 | quick-publish-test | ✅ PASS | https://dzen.ru/a/acqURmSfXRH7cmjz |

All selectors verified in production test.
