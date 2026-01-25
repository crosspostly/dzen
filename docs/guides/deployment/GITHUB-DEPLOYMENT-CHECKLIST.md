# ✅ GitHub Deployment Checklist

## Pre-Deployment

### 1. Repository Setup

- [ ] Repository создан на GitHub
- [ ] Локальный код синхронизирован с remote
- [ ] `.gitignore` содержит `.env*` файлы
- [ ] Нет `.env` файлов в git истории

**Проверка:**
```bash
# Check .gitignore
grep "^\.env" .gitignore

# Check git status
git status

# Check that .env is ignored
git check-ignore .env
# Should output: .env
```

### 2. GitHub Secrets

- [ ] `GEMINI_API_KEY` добавлен в GitHub Secrets
- [ ] API ключ валиден (проверен в Google AI Studio)
- [ ] Квота API достаточна для нагрузки

**Проверка:**
1. Settings → Secrets and variables → Actions
2. Должен быть виден: `GEMINI_API_KEY` ✅
3. Тест: Run workflow "Test Environment Setup"

### 3. GitHub Actions Workflows

- [ ] `.github/workflows/content-factory.yml` содержит v6.0 env vars
- [ ] `.github/workflows/test-image-generation.yml` содержит v6.0 env vars
- [ ] `.github/workflows/test.yml` содержит v6.0 env vars
- [ ] `.github/workflows/test-env-setup.yml` создан

**Проверка:**
```bash
# Check that workflows have v6.0 env vars
grep -r "FINAL_CLEANUP_ENABLED" .github/workflows/
grep -r "CLEANUP_THRESHOLD" .github/workflows/

# Should show 4 files with these variables
```

### 4. Code Quality

- [ ] Build проходит: `npm run build`
- [ ] Unit тесты проходят: `npx tsx test-article-cleanup-system.ts`
- [ ] Imports корректны: `npx tsx test-github-actions-env.ts`

**Проверка:**
```bash
npm install
npm run build
npx tsx test-article-cleanup-system.ts
npx tsx test-github-actions-env.ts
```

## Deployment Steps

### Step 1: Push Code

```bash
# 1. Check current branch
git branch

# 2. Add all files
git add .

# 3. Commit
git commit -m "feat: v6.0 - 3-level article cleanup system + GitHub Actions integration"

# 4. Push
git push origin feat/article-cleanup-pipeline
```

### Step 2: Test Environment Setup

1. Перейдите в **Actions**
2. Выберите **Test Environment Setup**
3. Нажмите **Run workflow**
4. Выберите branch: `feat/article-cleanup-pipeline`
5. **Run workflow**

**Ожидаемый результат:**
```
✅ GEMINI_API_KEY: AIzaSy...
✅ API_KEY: AIzaSy...
ℹ️  FINAL_CLEANUP_ENABLED: true (set)
ℹ️  CLEANUP_THRESHOLD: medium (set)
...
✅ VALIDATION PASSED
✅ FinalArticleCleanupGate imported
✅ ArticlePublishGate imported
✅ MultiAgentService imported
🎉 ALL CHECKS PASSED
```

### Step 3: Test Article Generation

1. Перейдите в **Actions**
2. Выберите **Content Factory - Batch Articles**
3. Нажмите **Run workflow**
4. Настройте:
   - Branch: `feat/article-cleanup-pipeline`
   - Count: `1`
   - Channel: `women-35-60`
   - Images: `true`
5. **Run workflow**

**Ожидаемый результат:**
```
✅ Title (Russian): "..."
✅ ARTICLE COMPLETE
📊 Metrics:
   - Characters: 19240
   - Phase 2 Score: 78/100

🧹 [Уровень 2] Final Article Cleanup Gate...
   ✅ No cleanup needed

🚪 [Уровень 3] Article Publish Gate...
   ✅ Article passed publish gate validation

📤 Push with retry logic
✅ Push successful!
```

### Step 4: Verify Results

**Check Repository:**
- [ ] Новая статья в `articles/women-35-60/{date}/`
- [ ] Файлы: `.txt`, `.md`, `.jpg` (если images=true)
- [ ] Git commit автоматически создан

**Check Artifacts:**
- [ ] Artifacts доступны (90 дней)
- [ ] Содержат сгенерированные статьи

**Check Logs:**
- [ ] Нет ошибок в "Generate articles" step
- [ ] Cleanup система отработала (Уровень 2, 3)
- [ ] Quality score >= 70

## Post-Deployment

### Merge to Main

1. Создайте Pull Request из `feat/article-cleanup-pipeline` в `main`
2. Проверьте что CI/CD проходит
3. Merge PR
4. Verify that main branch works

### Monitor First Production Run

1. После merge в main
2. Run "Content Factory" на main branch
3. Monitor logs for any issues
4. Check that articles are published correctly

### Setup Scheduled Runs (Optional)

Если нужна автоматическая генерация по расписанию:

**Добавьте в `.github/workflows/content-factory.yml`:**
```yaml
on:
  workflow_dispatch:
    # ... existing config ...
  
  schedule:
    # Runs at 12:00 UTC every day
    - cron: '0 12 * * *'
```

**Configure:**
- [ ] Определите расписание (cron expression)
- [ ] Настройте параметры по умолчанию
- [ ] Test scheduled run

## Troubleshooting

### Issue: "API key not found"

**Fix:**
1. Check GitHub Secrets are set correctly
2. Check workflow has `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}`
3. Re-create secret if needed

### Issue: "Cleanup failed"

**Fix:**
1. Check Gemini API quota
2. Reduce `CLEANUP_MAX_RETRIES` to 1
3. Set `CLEANUP_THRESHOLD: low` for less aggressive cleanup

### Issue: "Quality check failed"

**Fix:**
1. Check logs for specific errors
2. Adjust `CLEANUP_THRESHOLD` if too strict
3. Review generated article for issues

### Issue: "Push failed after 3 attempts"

**Fix:**
1. Check for merge conflicts
2. Manually sync branch: `git pull --rebase`
3. Check branch protection rules

## Rollback Plan

If something goes wrong:

```bash
# 1. Checkout main
git checkout main

# 2. Revert to previous working commit
git log --oneline
git revert <commit-hash>

# 3. Push
git push origin main
```

Or restore previous workflow:

1. Actions → Content Factory → History
2. Find last working run
3. Copy workflow from that run
4. Replace current workflow

## Success Criteria

- [x] ✅ Secrets configured correctly
- [x] ✅ Test environment setup passes
- [x] ✅ Test article generation succeeds
- [x] ✅ Cleanup system works (Уровень 2, 3)
- [x] ✅ Quality score >= 70 for generated articles
- [x] ✅ Articles auto-commit to repository
- [x] ✅ No API errors in logs
- [x] ✅ Documentation complete

## Sign-off

**Deployed by:** _____________  
**Date:** _____________  
**Branch:** feat/article-cleanup-pipeline → main  
**Status:** ✅ Production Ready

---

## Quick Links

- [Secrets Setup Guide](./SECRETS-SETUP.md)
- [GitHub Actions Setup](./GITHUB-ACTIONS-SETUP.md)
- [v6.0 Cleanup System Docs](./v6.0-cleanup-system.md)
- [Implementation Summary](../IMPLEMENTATION-SUMMARY.md)
