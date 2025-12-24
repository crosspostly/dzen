# 🧪 Safe PR Testing Workflow

## Overview

This workflow allows you to safely test feature branches before merging to main.

**Key Feature:** You provide a PR URL, the workflow automatically:
1. 📋 Extracts the branch name
2. 🧪 Tests on that feature branch (NOT main)
3. ✅ Validates v6.0 cleanup system
4. 🏃 Generates test articles
5. 💾 Commits results to main (if all tests pass)

---

## Quick Start

### Step 1: Run the Workflow

1. Go to **Actions** tab
2. Select **"Test PR Branch - Safe Testing"**
3. Click **"Run workflow"**

### Step 2: Input Parameters

**Required:**
```
PR URL: https://github.com/crosspostly/dzen/pull/92
```

**Optional (with defaults):**
```
Count: 1 (or 3, 5)
Channel: women-35-60 (or young-moms, men-25-40, teens)
Images: true (or false)
Skip merge: false (set true to test without changing main)
```

### Step 3: Monitor

1. Check **Actions** → **Latest Run**
2. Watch for:
   - 📋 Extract PR Info ✅
   - 🧪 Test Branch ✅
   - 📋 Summary ✅

---

## Features

### 📋 PR URL Parsing

Workflow automatically extracts:
- **PR Number** - from URL (e.g., 92 from pull/92)
- **Branch Name** - via GitHub API
- **PR Title** - for commit message
- **Author** - for tracking

```
Input:   https://github.com/crosspostly/dzen/pull/92
Output:  PR #92 | Branch: feat/article-cleanup-pipeline | Author: user
```

### 🧪 Testing on Feature Branch

1. **Checkout PR branch** (not main)
2. **Install dependencies**
3. **Run all tests:**
   - ✅ Environment validation
   - 🧪 Cleanup system tests
   - 🏃 Article generation
4. **Upload artifacts** (30 days)
5. **Commit to main** (if successful & not in skip mode)

### ✅ v6.0 Cleanup Integration

All tests include v6.0 cleanup system:
```yaml
FINAL_CLEANUP_ENABLED: true
CLEANUP_THRESHOLD: medium
CLEANUP_MODEL: gemini-2.0-flash
CLEANUP_TEMPERATURE: 0.3
CLEANUP_MAX_RETRIES: 2
```

### 💾 Auto-Commit to Main

When tests pass and `skip_merge: false`:

1. Checks out main branch
2. Copies articles/results from feature branch
3. Creates commit with:
   - PR number
   - Branch name
   - PR title
   - Author
   - Test config
4. Pushes to main

---

## Examples

### Example 1: Test PR #92

**Inputs:**
```
PR URL: https://github.com/crosspostly/dzen/pull/92
Count: 1
Channel: women-35-60
Images: true
Skip merge: false
```

**What happens:**
```
🧪 Testing PR #92 (feat/article-cleanup-pipeline)
   📋 Extract: PR #92 | Branch: feat/article-cleanup-pipeline | Author: user
   📥 Checkout: feat/article-cleanup-pipeline
   📦 Install: npm ci
   ✅ Validate environment
   🧪 Run cleanup tests
   🏃 Generate 1 article (women-35-60 channel)
   📤 Upload artifacts (pr-92-test-results)
   💾 Commit to main:
      Title: ✅ Test results from PR #92
      Body: Branch info, config, success status
      Push: origin/main

✅ SUCCESS - Results saved to main!
```

### Example 2: Test Without Changing Main

**Inputs:**
```
PR URL: https://github.com/crosspostly/dzen/pull/93
Count: 3
Channel: young-moms
Images: false
Skip merge: true  <-- Don't commit to main
```

**What happens:**
```
🧪 Testing PR #93
   📥 Checkout: feature-xyz
   🏃 Generate 3 articles
   📤 Upload artifacts: pr-93-test-results
   🔄 Skip main merge (testing mode)

✅ SUCCESS - Artifacts available, main unchanged
```

---

## Workflow Map

```
┌───────────────────────────────────────┐
│  Extract PR Info (Parallel)                             │
│  - Parse URL for PR number                               │
│  - Fetch PR details via API                              │
│  - Get branch, title, author                             │
│  Output: pr_number, branch_name, pr_title, author        │
└───────────────────────────────────────┘
         ↓ needs: extract-pr-info
┌───────────────────────────────────────┐
│  Test PR Branch (Sequential)                            │
│  1. Checkout feature branch                              │
│  2. Setup Node.js 20                                     │
│  3. Install dependencies                                 │
│  4. Validate environment (v6.0 vars)                     │
│  5. Run cleanup system tests                             │
│  6. Generate articles                                    │
│  7. Display results                                      │
│  8. Upload artifacts (30 days)                           │
│  9. Commit to main (if skip_merge=false & success)       │
└───────────────────────────────────────┘
         ↓ needs: extract-pr-info, test-pr-branch
┌───────────────────────────────────────┐
│  Summary (Always runs)                                   │
│  - Display PR info                                       │
│  - Show test results                                     │
│  - Show artifacts and main branch status                 │
└───────────────────────────────────────┘
```

---

## Safety Features

### ✅ Protected Main Branch

- Tests run on **feature branch ONLY**
- Main branch **never touched** until tests pass
- Can use `skip_merge: true` to test without any main changes

### ✅ Validation

- Environment checks (all v6.0 vars present)
- Cleanup system tests (7 unit tests)
- Article generation with validation

### ✅ Auto-Merge Safety

- Only commits to main if **all tests pass**
- Commits have detailed info (PR number, branch, author, config)
- Artifacts uploaded before commit

### ✅ Error Handling

- URL parsing validation
- Branch existence check
- Test failure detection
- Clear error messages

---

## Troubleshooting

### Issue: "Invalid PR URL format"

**Problem:** URL not recognized

**Solution:**
Use exact format:
```
https://github.com/crosspostly/dzen/pull/92
```

Not:
- `pull/92` (missing domain)
- `https://github.com/pull/92` (missing org/repo)
- `https://github.com/crosspostly/dzen/issues/92` (use /pull/ not /issues/)

### Issue: "Branch not found"

**Problem:** PR URL is valid but branch doesn't exist

**Solution:**
1. Check PR is not merged/closed
2. Check branch still exists: `git branch -a | grep <branch-name>`
3. Try again after push to branch

### Issue: "Commit to main failed"

**Problem:** Push to main failed

**Possible causes:**
- Merge conflicts (pull latest main first)
- Branch protection rules (check settings)
- No write access

**Solution:**
1. Set `skip_merge: true` to test without pushing
2. Manually merge after reviewing artifacts
3. Check branch protection: Settings → Branches

### Issue: "Test failed but didn't see logs"

**Solution:**
1. Click the failed step in Actions
2. Expand "Run test articles" section
3. Look for error messages
4. Check artifacts for detailed logs

---

## Best Practices

### ✅ For Regular Testing

```
PR URL: https://github.com/crosspostly/dzen/pull/XX
Count: 1
Images: true
Skip merge: false
```

This tests with minimal resources and auto-commits results.

### ✅ For Validation Before Merge

```
PR URL: https://github.com/crosspostly/dzen/pull/XX
Count: 3
Images: true
Skip merge: true
```

This tests more thoroughly without changing main.
Review artifacts before manual merge.

### ✅ For Large Feature Testing

```
PR URL: https://github.com/crosspostly/dzen/pull/XX
Count: 5
Images: true
Skip merge: true
```

This does comprehensive testing.
Good for production-ready features.

---

## Related

- [v6.0 Cleanup System](./v6.0-cleanup-system.md)
- [GitHub Actions Setup](./GITHUB-ACTIONS-SETUP.md)
- [Deployment Checklist](./GITHUB-DEPLOYMENT-CHECKLIST.md)
