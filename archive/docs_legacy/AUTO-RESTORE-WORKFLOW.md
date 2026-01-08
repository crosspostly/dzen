# 🔧 Auto-Restore Articles Workflow - Complete Analysis

## 📋 Overview

The **Auto-Restore Articles** workflow is an automated editorial system that cleans, formats, and optimizes generated articles in the repository. It runs on a schedule, on-demand, and automatically after new article generation.

**Files Involved:**
- `.github/workflows/auto-restore-articles.yml` - GitHub Actions workflow trigger & orchestration
- `scripts/restore-articles.js` - Core restoration engine (Node.js)

---

## 🎯 When Does It Run?

### 1️⃣ **Daily Schedule (CRON)**
```yaml
schedule:
  - cron: '0 3 * * *'  # ⏰ 3 AM UTC every day
```
**Action:** Scans ALL files in `articles/` and restores them (preventive maintenance)  
**Use Case:** Ensures consistency across entire article library

### 2️⃣ **On Push to main (Article Changes)**
```yaml
push:
  paths:
    - 'articles/**/*.md'
  branches:
    - main
```
**Action:** Automatically triggers when new/modified articles are pushed  
**Use Case:** NEW article from generation → restore → clean version in main

### 3️⃣ **Manual Trigger (workflow_dispatch)**
```yaml
workflow_dispatch:
```
**Action:** Can be manually started from GitHub Actions UI  
**Use Case:** On-demand restoration for specific articles

---

## 🔄 Workflow Execution Flow

### Phase 1: File Detection
```bash
# Compare HEAD~1 to HEAD
git diff --name-only HEAD~1 HEAD -- 'articles/**/*.md'
```
- Detects which article files changed
- If none: workflow exits early (SKIP)
- If found: proceeds to restoration

### Phase 2: Script Execution
```bash
node scripts/restore-articles.js [file1] [file2] ...
```
- Processes each changed file
- Returns exit code (0 = success, 1 = failure)

### Phase 3: Auto-Commit (if changes made)
```bash
git add articles/
git commit -m "🔧 Auto-restore: Fixed formatting"
git push origin main
```
- Only commits if files actually changed
- Uses GitHub Actions bot credentials
- Pushes directly to main

---

## 🚀 Article Generation Integration

### End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. GENERATION PHASE                                          │
│    CLI/Automation generates article → articles/article.md    │
└──────────────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. GIT PUSH PHASE                                            │
│    git push articles/article.md → main                       │
└──────────────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. AUTO-RESTORE TRIGGER (immediate via push event)          │
│    .github/workflows/auto-restore-articles.yml              │
└──────────────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. RESTORATION PHASE (restore-articles.js)                  │
│    ✨ Clean formatting                                       │
│    ✨ Remove AI artifacts                                    │
│    ✨ Optimize for mobile (Yandex Zen)                      │
│    ✨ Preserve metadata & content                            │
└──────────────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5. AUTO-COMMIT PHASE                                         │
│    git commit -m "🔧 Auto-restore: Fixed formatting"        │
│    git push origin main                                      │
└──────────────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 6. DEPLOY PHASE (Vercel/Platform)                           │
│    Publishes clean, ready-to-publish article 🚀             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Timeline
- **Generation:** Seconds (CLI)
- **Push:** Seconds (Git)
- **Auto-Restore:** 30-120 seconds (Gemini API calls)
- **Commit:** Seconds (Git)
- **Deploy:** 1-3 minutes (Vercel)

**Total:** ~2-5 minutes from generation to live 🎯

---

## 🔬 How restore-articles.js Works

### Algorithm: "Simplified Chunked Mode"

The script uses a paragraph-aware chunking strategy:

```javascript
STEP 1: VALIDATE FRONTMATTER
├─ Check for required fields: title, date, description
├─ If missing: Add minimal frontmatter
└─ Extract body content

STEP 2: SPLIT INTO CHUNKS (no overlap)
├─ Split by paragraph boundaries (\n\n)
├─ Max chunk size: 3000 characters
├─ Goal: Keep related content together
└─ Example:
   Article (8000 chars) → [Chunk 1: 2800] [Chunk 2: 2900] [Chunk 3: 2300]

STEP 3: RESTORE EACH CHUNK (with automatic retry)
├─ For each chunk:
│  ├─ Try Gemini 2.5 Flash Lite (fast, cheap)
│  ├─ If error → Try Gemini 2.5 Flash (slower, more capable)
│  ├─ If both fail → Use original chunk (fallback)
│  └─ Add 500ms delay between chunks
└─ All chunks processed independently

STEP 4: MERGE CHUNKS
├─ Join all restored chunks with \n\n
├─ No overlap removal (already clean from split)
└─ Check quality ratio (restored length vs original)

STEP 5: VALIDATE & SAVE
├─ Reconstruct: ---\nfrontmatter\n---\n\nbody
├─ Write back to file
└─ Always save (even if quality ratio < 50%)
```

---

## 🧹 What Gets Cleaned?

### ✂️ REMOVED (Junk Detection)

```
❌ Filler phrases:
   "вот что я хочу сказать" ("what I want to say")
   "одним словом" ("in short")
   "надо сказать" ("gotta say")
   and similar AI padding

❌ Formatting artifacts:
   Double spaces
   Misaligned words
   Stray symbols
   Extra line breaks
```

### ✅ FORMATTED (Structure Optimization)

```
✓ Dialogue formatting:
  Before: '"Hello," she said'
  After:  — Привет, — сказала она.
           (on new line with em-dash)

✓ Paragraph optimization:
  Target: 3-5 sentences per paragraph
  Goal: Mobile-friendly (Yandex Zen)
  Uses: Short, readable chunks

✓ White space:
  Consistent spacing between elements
  Proper markdown formatting
  Clean punctuation
```

### ❌ NEVER TOUCHED (Content Preservation)

```
🛡️ Protected elements:
  - Frontmatter metadata (title, date, description)
  - Article content/meaning
  - Factual information
  - Story structure
  - Links and references
```

---

## 📊 Quality Assurance

### Ratio Check (Content Preservation)

```javascript
originalLength = 1000 characters
restoredLength = 850 characters
ratio = 850 / 1000 = 0.85 (85% preserved)

if (ratio < 0.50) {
  console.warn("⚠️ Severe shortening detected")
  console.log("But saving anyway (better restored than broken)")
  // ✅ SAVE ANYWAY
}

// Even if something fails, we keep the result
// Philosophy: Restored with minor issues > Broken with no changes
```

### Retry Logic

```
Chunk 1 (2800 chars):
  ├─ Gemini Flash Lite → ✅ Success (50ms)
  └─ Result: Cleaned

Chunk 2 (2900 chars):
  ├─ Gemini Flash Lite → ❌ Timeout
  ├─ Gemini Flash → ✅ Success (150ms)
  └─ Result: Cleaned

Chunk 3 (2300 chars):
  ├─ Gemini Flash Lite → ❌ Error
  ├─ Gemini Flash → ❌ Error
  └─ Result: Original chunk (fallback)

Final: [Chunk1 cleaned] + [Chunk2 cleaned] + [Chunk3 original]
```

---

## ⚡ Key Specifications

| Parameter | Value | Purpose |
|-----------|-------|----------|
| **Primary Model** | Gemini 2.5 Flash Lite | Fast, cost-effective cleaning |
| **Fallback Model** | Gemini 2.5 Flash | More capable, slower |
| **Chunk Size** | 3000 characters | Optimal API response time |
| **Split Strategy** | Paragraph-aware | Preserves context |
| **Chunk Delay** | 500ms | Rate limiting |
| **Retry Attempts** | 2 (Lite → Flash) | Resilience |
| **Min Content Ratio** | 50% | Quality threshold |
| **Save on Failure** | YES | Always persist |
| **Schedule** | 3 AM UTC daily | Off-peak cleaning |
| **On-Demand Push Trigger** | articles/** changes | Immediate cleanup |

---

## 🔗 Integration Points

### 1. Generation System
- **Input:** Generated articles in `articles/`
- **Output:** Clean, formatted articles ready for publication

### 2. Publishing Platform
- **Accepts:** Cleaned, optimized articles from main branch
- **Benefit:** Consistent, publication-ready content

### 3. Git Workflow
- **Commit Hook:** Automatic commits for tracking
- **Push Strategy:** Direct to main (trusted process)
- **History:** Clear audit trail with "🔧 Auto-restore" prefix

### 4. API Usage
- **Provider:** Google Gemini API
- **Credentials:** GEMINI_API_KEY (GitHub secret)
- **Cost:** Minimal (Lite model, chunked processing)

---

## 🎬 Usage Examples

### Example 1: New Article Generation

```bash
# Generate new article
node cli.ts generate --topic "Cooking Tips"
# Output: articles/cooking-tips-2026-01-06.md

# Git push
git add articles/cooking-tips-2026-01-06.md
git commit -m "feat: Add cooking tips article"
git push origin main

# ✨ Auto-restore workflow triggers automatically:
# - Detects cooking-tips-2026-01-06.md
# - Restores and cleans
# - Auto-commits: "🔧 Auto-restore: Fixed formatting"
# - Article ready in main ✅
```

### Example 2: Manual Restoration

```bash
# Go to GitHub Actions → auto-restore-articles
# Click "Run workflow"
# ✅ Runs immediately, restores all articles
```

### Example 3: Daily Maintenance

```
3 AM UTC every day:
├─ Workflow starts
├─ Scans all articles/
├─ Restores each one
├─ Auto-commits if changes
└─ Logs to GitHub Actions
```

---

## 💡 Benefits

### For Generation
✅ Generated articles are automatically cleaned  
✅ No manual post-processing needed  
✅ Consistent quality across all articles  

### For Publishing
✅ Ready-to-publish articles (no editing required)  
✅ Optimized for mobile (Yandex Zen format)  
✅ Clean, professional presentation  

### For Maintenance
✅ Automated daily quality checks  
✅ Preserves content while cleaning artifacts  
✅ Audit trail (commit history)  
✅ Self-healing (retry logic, fallbacks)  

---

## ⚠️ Important Notes

1. **Always Saves:** Even if both Gemini calls fail, original content is preserved
2. **Metadata Safe:** Frontmatter never modified
3. **Content Preservation:** Min 50% threshold (warns but saves anyway)
4. **Push Permission:** Commits directly to main (trusted process)
5. **Rate Limiting:** 500ms delays between chunks to avoid API throttling

---

## 🔐 Security & Permissions

```yaml
permissions:
  contents: write  # Can commit to repo
  pull-requests: write  # Can comment on PRs
```

**Secrets Used:**
- `GEMINI_API_KEY` - Google Generative AI access
- `GITHUB_TOKEN` - Git operations (auto-provided)

---

## 📚 Related Documentation

- [Article Generation Pipeline](./v7.0-simplified-generation.md)
- [GitHub Actions Setup](./GITHUB-ACTIONS-SETUP.md)
- [Secrets Configuration](./SECRETS-SETUP.md)
- [Feed Generation](./FEED_GENERATION.md)

---

## 🎯 Summary

The **Auto-Restore Articles Workflow** is a critical component in the content generation pipeline that:

1. **Detects** new/modified articles
2. **Validates** frontmatter structure
3. **Cleans** AI artifacts and formatting issues
4. **Optimizes** for mobile and Yandex Zen
5. **Preserves** all content and metadata
6. **Auto-commits** clean results
7. **Maintains** consistency via daily schedule

**Result:** Generated articles transform from raw output → publication-ready content in 2-5 minutes! 🚀
