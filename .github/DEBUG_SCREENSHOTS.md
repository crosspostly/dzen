# 🔍 Debug Screenshots Guide

## Problem
GitHub Actions artifacts are **deleted** after workflow completes. You can't see what went wrong!

## Solution
Debug screenshots are now **saved to the repository** at `.github/debug-screenshots/`

---

## 📸 What Gets Saved

| File | When | Purpose |
|------|------|---------|
| `step1_editor.html/png` | After loading editor | See initial state |
| `step2_menu_open.html/png` | After clicking "Add" | Check if menu opened |
| `no_inputs.html/png` | If inputs not found | **KEY FOR DEBUGGING!** |
| `editor_not_found.html/png` | If editor fails | See what loaded instead |
| `error_state.html/png` | Final error | Complete error state |

---

## 🔍 How to View Screenshots

### Option 1: GitHub Web Interface

1. Go to repository: https://github.com/crosspostly/dzen
2. Navigate to: `.github/debug-screenshots/`
3. Click on latest HTML file (e.g., `no_inputs.html`)
4. GitHub will render the HTML - you'll see exactly what the bot saw!

### Option 2: Clone and Open Locally

```bash
# Clone repo
git clone https://github.com/crosspostly/dzen.git
cd dzen

# Open latest screenshot
open .github/debug-screenshots/no_inputs.html  # macOS
xdg-open .github/debug-screenshots/no_inputs.html  # Linux
start .github/debug-screenshots/no_inputs.html  # Windows
```

### Option 3: Raw HTML Download

1. Click on HTML file in GitHub
2. Click "Raw" button
3. Save as `.html` file
4. Open in browser

---

## 🐛 Debugging Workflow

### Step 1: Check CI Failure
```
GitHub → Actions → Auto-Publish → (Failed Run)
```

### Step 2: Find Latest Screenshots
```
Repository → .github/debug-screenshots/ → Latest files
```

### Step 3: Analyze `no_inputs.html`

This is the **most important** file! It shows:
- What the editor looked like when inputs weren't found
- Actual DOM structure
- Any blocking modals or overlays
- Button positions and text

### Step 4: Check Selectors

Open browser console on the HTML file:
```javascript
// Check if add button exists
document.querySelector('header button:first-of-type')

// Check for contenteditable divs
document.querySelectorAll('[contenteditable="true"]')

// Check for "Статья" button
$$('*:has-text("Статья")')

// List all buttons
document.querySelectorAll('button')
```

### Step 5: Fix and Test

Based on findings:
1. Update selectors in `services/playwrightService.ts`
2. Test locally: `npm run publish:test`
3. Commit and push
4. Monitor next CI run

---

## 📊 Example Debug Scenarios

### Scenario 1: Menu Didn't Open
**File:** `step2_menu_open.html`  
**What to look for:**
- Is menu visible?
- Is "Статья" button present?
- Any blocking overlay?

**Fix:** Increase wait time or update menu selectors

### Scenario 2: Editor Didn't Load
**File:** `editor_not_found.html`  
**What to look for:**
- What page actually loaded?
- Any error messages?
- Redirect to login?

**Fix:** Check cookies, authentication

### Scenario 3: No Inputs Found
**File:** `no_inputs.html`  
**What to look for:**
- Is editor in different mode?
- Different input selectors?
- Modal blocking editor?

**Fix:** Update input selectors (most common issue)

### Scenario 4: Image Upload Failed
**File:** `file_uploaded.html` or `image_modal_open.html`  
**What to look for:**
- Did modal open?
- File input visible?
- Error messages?

**Fix:** Check file path or URL insertion method

---

## ⚙️ Configuration

### Skip Screenshots (for speed)
```yaml
# In .github/workflows/auto-publish-dzen.yml
CI_SKIP_SCREENSHOTS: 'true'
```

### Keep Screenshots (for debugging)
```yaml
CI_SKIP_SCREENSHOTS: 'false'  # Default
```

---

## 🗂️ File Structure

```
.github/
  debug-screenshots/
    step1_editor.html
    step1_editor.png
    step2_menu_open.html
    step2_menu_open.png
    no_inputs.html          ← Most important!
    no_inputs.png
    editor_not_found.html
    editor_not_found.png
    error_state.html
    error_state.png
```

---

## 🧹 Cleanup

Screenshots accumulate over time. Clean up old ones:

```bash
# Keep only last 10 screenshots of each type
cd .github/debug-screenshots/
ls -t step1_editor*.html | tail -n +11 | xargs rm
ls -t step2_menu_open*.html | tail -n +11 | xargs rm
ls -t no_inputs*.html | tail -n +11 | xargs rm
# ... etc

git add -A
git commit -m "🧹 Clean up old debug screenshots"
git push
```

---

## 💡 Pro Tips

### 1. Check Timestamp
Each screenshot has timestamp in filename or commit message:
```bash
git log --oneline .github/debug-screenshots/
```

### 2. Compare Runs
Compare successful vs failed runs:
```bash
# Open both in different tabs
# Look for differences in DOM structure
```

### 3. Search for Text
In HTML file, search for:
- "Статья" - menu button text
- "Заголовок" - placeholder text
- "contenteditable" - input indicators

### 4. Check Network Tab
In rendered HTML, press F12:
- Check if resources loaded
- Look for failed requests
- See actual DOM (not just HTML)

---

## 📞 When to Use

| Situation | Check Screenshot |
|-----------|-----------------|
| CI fails with "No inputs" | `no_inputs.html` |
| CI fails with "Button not found" | `step2_menu_open.html` |
| CI times out | `error_state.html` |
| Article not published | Check all files |
| Image missing | `image_modal_open.html` |

---

## 🎯 Quick Reference

```
1. CI failed? → Go to .github/debug-screenshots/
2. Find latest HTML → Click to open
3. Inspect DOM → Find missing elements
4. Update selectors → services/playwrightService.ts
5. Test locally → npm run publish:test
6. Commit & push → Monitor next CI run
```

---

**Last Updated:** 2026-03-30  
**Location:** `.github/debug-screenshots/`  
**Retention:** Indefinite (in git history)
