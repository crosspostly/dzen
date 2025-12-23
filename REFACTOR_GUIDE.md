# 📚 Published Articles Refactoring

## Overview

This refactoring moves all **published articles** from `articles/women-35-60/YYYY-MM-DD/` to a new dedicated directory:

```
articles/published/
├── 2025/
│   └── 12/
│       ├── 20/  (Dec 20)
│       ├── 21/  (Dec 21)
│       └── 22/  (Dec 22)
```

## Published Articles Being Moved

### 2025-12-21 (2 articles)
- ✅ `etot-ideal-mamy-byl-lozhyu...` (Этот идеал мамы был ложью)
- ✅ `moya-glavnaya-pravda-v-55...` (Моя главная правда в 55)

### 2025-12-20 (5 articles)
- ✅ `ya-uznala-pravdu-iz-dnevnika...` (Я узнала правду из дневника)
- ✅ `muchitelnyy-styd-20-let...` (Мучительный стыд 20 лет)
- ✅ `ya-derzhala-foto...` (Я держала фото)
- ✅ `ya-30-let-zhila...` (Я 30 лет жила)
- ✅ `ya-sluchayno-otkryla...` (Я случайно открыла)

### 2025-12-22 (3 articles)
- ✅ `ves-gorod-zaviduet...` (Весь город завидует)
- ✅ `ya-godami-skryvala...` (Я годами скрывала)
- ✅ `ya-tridtsat-let-zhila...` (Я 30 лет жила)

**Total: 10 articles + covers/images**

## How to Execute Migration

### Option 1: Using the Shell Script (Recommended)

```bash
# 1. Clone/pull the refactor branch
git checkout refactor/move-published-articles

# 2. Make script executable
chmod +x MOVE_ARTICLES.sh

# 3. Run migration
./MOVE_ARTICLES.sh

# 4. Verify files moved
git status

# 5. Push to branch
git push origin refactor/move-published-articles
```

### Option 2: Manual Git Commands

```bash
# Create directory structure
mkdir -p articles/published/2025/12/{20,21,22}

# Move Dec 21 articles
git mv articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127.txt articles/published/2025/12/21/
git mv articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127-cover.jpg articles/published/2025/12/21/

# ...and so on for other articles...

# Commit all changes
git add articles/published/
git commit -m "refactor: move published articles to articles/published/ directory structure"
```

## After Migration

1. **Create Pull Request**
   - Go to [GitHub PR page](https://github.com/crosspostly/dzen/pulls)
   - Create PR from `refactor/move-published-articles` → `main`
   - Title: "refactor: organize published articles in dedicated directory"
   - Description: List of files moved

2. **Review Changes**
   - Verify all article files are in `articles/published/2025/12/DD/`
   - Check that file counts match:
     - `/20/` should have 5 text + 5 images = 10 files
     - `/21/` should have 2 text + 2 images = 4 files  
     - `/22/` should have 3 text + 2 images = 5 files

3. **Merge to Main**
   - After review, merge PR to main
   - Delete refactor branch

## File Structure Verification

```bash
# List all published articles
tree articles/published/

# Count files
find articles/published -type f | wc -l
# Expected: 19 files (articles + covers)

# Verify women-35-60 still has unpublished
ls articles/women-35-60/
```

## Benefits

✅ **Separation of Concerns**: Published content separate from drafts  
✅ **Better Organization**: Articles organized by publication date  
✅ **Scalability**: Easy to add more published articles  
✅ **Clear Structure**: Pattern `articles/published/YYYY/MM/DD/`  
✅ **Maintainability**: Single source of truth for published articles

## Rollback (if needed)

```bash
# If something goes wrong, revert the branch
git reset --hard HEAD~1

# Or delete branch and start over
git checkout main
git branch -D refactor/move-published-articles
```

---

**Created:** 2025-12-23  
**Branch:** `refactor/move-published-articles`  
**Status:** Ready for execution
