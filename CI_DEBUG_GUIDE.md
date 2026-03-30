# 🤷 CI Debugging Guide - GitHub Actions

## Problem: "No inputs found in editor"

### Symptoms
```
[2026-03-30T15:29:36.472Z] ✅ Found add button with selector: header button:first-of-type
[2026-03-30T15:29:55.421Z] ⚠️ Write button not found - checking if already in editor...
[2026-03-30T15:30:16.441Z] 📝 Looking for inputs...
[2026-03-30T15:30:16.445Z] Found 0 input elements
❌ FAILED: No inputs found in editor
```

### Root Causes

1. **Different selectors in CI vs Local**
   - Local: `[data-testid="add-publication-button"]` works
   - CI: Only `header button:first-of-type` works

2. **Timing issues in headless CI**
   - Menu takes longer to appear (3s → 5s needed)
   - Editor loads slower (need 15s+ wait)
   - Race conditions with modals

3. **Contenteditable divs not detected**
   - Dzen uses `div[contenteditable="true"]` not `<input>`
   - CI may have different DOM structure

---

## Solutions Applied

### 1. Add Button Selectors (Fixed)
```typescript
// BEFORE (local only)
'[data-testid="add-publication-button"]'

// AFTER (CI + local)
'header button:first-of-type'  // ✅ CI working
'header button:first-child'
'[data-testid="add-publication-button"]'  // Fallback
```

### 2. Wait Times (Increased)
```typescript
// Menu appearance
await this.page.waitForTimeout(3000);  // ❌ Too short for CI
await this.page.waitForTimeout(5000);  // ✅ CI safe

// Editor detection
await this.page.waitForTimeout(15000);  // ✅ CI safe
```

### 3. Write Button Selectors (Expanded)
```typescript
// BEFORE
'text="Написать статью"'

// AFTER (more fallbacks)
'text="Написать статью"'
'text="Статья"'
'[role="menuitem"]:has-text("Статья")'
'[role="button"]:has-text("Статья")'
'button:has-text("Статья")'
'div:has-text("Статья")'
'span:has-text("Статья")'
'*:has-text("Статья")'  // Catch-all
```

### 4. Editor Detection (Second Attempt)
```typescript
// First attempt
editorCheck = await this.page.$('div[contenteditable="true"]');

if (!editorCheck) {
  // Wait longer
  await this.page.waitForTimeout(15000);
  
  // Second attempt
  editorCheck = await this.page.$('div[contenteditable="true"]');
}

if (!editorCheck) {
  // Dump state for debugging
  await this.dumpState('editor_not_found');
  throw new Error('Editor not loaded');
}
```

### 5. Input Detection Debugging (Enhanced)
```typescript
if (allInputs.length === 0) {
  // Scan first 100 elements
  const anyInputs = await this.page.$$('*');
  
  for (let i = 0; i < 100; i++) {
    const tag = await el.evaluate(e => e.tagName);
    const contentEditable = await el.evaluate(e => e.getAttribute('contenteditable'));
    const role = await el.evaluate(e => e.getAttribute('role'));
    
    // Log potential inputs
    if (tag === 'INPUT' || contentEditable === 'true' || role === 'textbox') {
      potentialInputs.push({ tag, contentEditable, role });
    }
  }
  
  this.log(`🔍 Found ${potentialInputs.length} potential inputs`);
}
```

---

## Debugging Steps

### 1. Check State Dumps
```bash
# Download artifacts from failed workflow
# Look for these files:
- step1_editor.html/png      # After navigation
- step2_menu_open.html/png   # After clicking add
- editor_not_found.html/png  # If editor fails
- no_inputs.html/png         # If inputs not found
- error_state.html/png       # Final error state
```

### 2. Analyze HTML Structure
```bash
# Open HTML dump in browser
# Check:
1. Does menu appear after clicking add?
2. Is "Статья" button visible?
3. Does editor load with contenteditable divs?
4. Any blocking modals?
```

### 3. Check Selector Matches
```javascript
// In browser console (from HTML dump)
document.querySelector('header button:first-of-type')
document.querySelectorAll('div[contenteditable="true"]')
document.querySelector('*:has-text("Статья")')
```

### 4. Adjust Wait Times
```typescript
// If still failing, increase:
await this.page.waitForTimeout(5000);   // → 8000
await this.page.waitForTimeout(15000);  // → 20000
```

---

## Common CI Issues & Fixes

### Issue 1: Menu doesn't appear
**Symptom:** Write button not found  
**Fix:** Increase wait time after add button click
```typescript
await this.page.waitForTimeout(5000);  // Was 3000
```

### Issue 2: Editor doesn't load
**Symptom:** Editor not detected  
**Fix:** Add second detection attempt
```typescript
if (!editorCheck) {
  await this.page.waitForTimeout(15000);
  editorCheck = await this.page.$('div[contenteditable="true"]');
}
```

### Issue 3: Inputs not found
**Symptom:** Found 0 input elements  
**Fix:** Check for `[contenteditable="true"]` not just `div[contenteditable="true"]`
```typescript
const allInputs = await this.page.$$(
  'div[contenteditable="true"], ' +
  'h1[contenteditable="true"], ' +
  '[contenteditable="true"], ' +  // Generic selector
  'textarea'
);
```

### Issue 4: Modals blocking
**Symptom:** Clicks not working  
**Fix:** Close modals before actions
```typescript
await this.closeModals();
await this.page.waitForTimeout(1000);
```

---

## Testing Changes

### Local Test (Headless Mode)
```bash
# Simulate CI environment
HEADLESS=true npm run publish:test
```

### CI Test (Workflow Dispatch)
```yaml
# In GitHub Actions
# Go to: Actions → Auto-Publish to Dzen → Run workflow
# Select branch: main
# Click "Run workflow"
```

### Check Logs
```bash
# Look for these success indicators:
✅ Found add button with selector: header button:first-of-type
✅ Clicked add button, waiting for menu...
✅ Found write button with selector: text="Написать статью"
✅ Editor verified with selector: div[contenteditable="true"]
Found 2 input elements
```

---

## Best Practices

### 1. Always Use Fallback Selectors
```typescript
const selectors = [
  'data-testid',      // Primary (local)
  'header button',    // Fallback (CI)
  '*:has-text()',     // Catch-all
];
```

### 2. Add Wait Time Buffer
```typescript
// Local: 3000ms
// CI: 5000-8000ms needed
await this.page.waitForTimeout(5000);  // Safe for both
```

### 3. Dump State Frequently
```typescript
await this.dumpState('step1_editor');
await this.dumpState('step2_menu_open');
await this.dumpState('no_inputs');
```

### 4. Log Everything
```typescript
this.log(`✅ Found ${allInputs.length} input elements`);
this.log(`🔍 Potential inputs: ${JSON.stringify(potentialInputs)}`);
```

### 5. Second Attempt Pattern
```typescript
// First attempt
if (!found) {
  await this.page.waitForTimeout(15000);
  // Second attempt
  found = await this.page.$(selector);
}

if (!found) {
  throw new Error('Not found after second attempt');
}
```

---

## Current Status

| Component | Local | CI | Status |
|-----------|-------|----|--------|
| Add Button | ✅ | ✅ | Fixed |
| Write Button | ✅ | ⚠️ | Improved |
| Editor Detection | ✅ | ⚠️ | Improved |
| Input Detection | ✅ | ⚠️ | Debugging |
| Image Upload | ✅ | ✅ | Working |
| Publish | ✅ | ⚠️ | Depends on above |

**Next Steps:**
1. Monitor next CI run
2. Check `editor_not_found.html` if fails
3. Adjust selectors based on HTML dump
4. Consider increasing timeouts further if needed

---

**Last Updated:** 2026-03-30  
**CI Issue:** Editor inputs not found  
**Status:** Fixes applied, monitoring
