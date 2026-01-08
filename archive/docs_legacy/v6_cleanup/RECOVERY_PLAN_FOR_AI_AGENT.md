# 🤖 RECOVERY PLAN FOR AI AGENT - AFTER HARD RESET

**Created:** Dec 21, 2025  
**Target:** AI Agent / Copilot  
**Purpose:** Step-by-step recovery of features lost in hard reset  
**Status:** READY FOR EXECUTION

---

## 📋 OVERVIEW

**Current Situation:**
- ✅ Hard reset completed to commit `588ba6e2` (PR #49)
- ✅ All critical standards documented in `docs/CODING_STANDARDS.md`
- ✅ All features extracted into GitHub Issues (#56-61)
- ✅ Backup branch created: `backup-before-reset-dec21`

**Your Mission:**
Restore features ONE-BY-ONE following this exact sequence.

---

## ⚠️ CRITICAL RULES (NEVER BREAK)

**Before implementing ANY feature:**

1. ✅ Read `docs/CODING_STANDARDS.md` (especially the rule for your feature)
2. ✅ Check the GitHub Issue for detailed requirements
3. ✅ Verify target commit status in current main
4. ✅ Create feature branch with proper naming
5. ✅ Run ALL tests before submitting PR
6. ✅ Get approval before merging to main

**BANNED PATTERNS:**
```typescript
❌ import { GoogleGenAI } from "@google/genai"           // NEVER
❌ TOTAL_BUDGET = 29000                                  // NEVER  
❌ const mimeType = "image/png"                          // NEVER
❌ git push without git pull --rebase                    // NEVER
❌ const validator = null  // Disable validation          // NEVER
```

---

## 🚀 PHASE 1: STABILIZATION (1-2 DAYS)

### Step 1.1: Verify Baseline State

**Check current state:**
```bash
# Verify commit
git log --oneline -5
# Should show: 588ba6e2 feat(episode-generator): upgrade quality metrics...

# Verify character budget
grep -n "TOTAL_BUDGET" src/services/episodeGeneratorService.ts
# Should show: private TOTAL_BUDGET = 19000;

# Verify imports
grep -r "from \"@google/genai" src/
# Should show: NO RESULTS (empty)

grep -r "from \"@google/generative-ai" src/
# Should show: multiple results
```

**Expected Output:**
```
✅ Commit: 588ba6e2
✅ Budget: 19000
✅ @google/genai: NOT FOUND
✅ @google/generative-ai: FOUND
```

**If issues found:** Check `docs/CODING_STANDARDS.md` section "Fixing Broken Code"

---

### Step 1.2: Fix Google AI Imports (If Needed)

**Only if imports are broken:**

```bash
# Search for old imports
grep -r "@google/genai" src/

# If found, fix them:
# 1. Open each file
# 2. Replace: import { GoogleGenAI } → import { GoogleGenerativeAI }
# 3. Replace: @google/genai → @google/generative-ai
# 4. Update class usage: new GoogleGenAI() → new GoogleGenerativeAI()
```

**Files to check:**
- `src/services/episodeGeneratorService.ts`
- `src/services/episodeTitleGenerator.ts`
- `src/services/themeGeneratorService.ts`
- `src/services/imageGeneratorService.ts`
- `src/services/imageGeneratorAgent.ts`
- `src/services/phase2AntiDetectionService.ts`
- `src/services/multiAgentService.ts`

**After fixing:**
```bash
# Commit changes
git add src/
git commit -m "fix: Update Google AI imports to @google/generative-ai"

# Create PR
git push origin fix-google-imports
# Open PR on GitHub
```

---

### Step 1.3: Verify Tests Pass

**Run full test suite:**

```bash
# Install dependencies
npm ci

# Run tests
npm run test

# Expected output:
# ✅ All tests passing
# ✅ No import errors
# ✅ No runtime errors
```

---

### Step 1.4: Build Verification

```bash
# Build TypeScript
npm run build

# Expected output:
# ✅ No TypeScript errors
# ✅ dist/ folder created
# ✅ All files compiled
```

---

## ✅ PHASE 1 CHECKLIST

Before moving to Phase 2, verify:

- [ ] Baseline commit verified: `588ba6e2`
- [ ] Character budget correct: `19000`
- [ ] Google imports fixed (if needed)
- [ ] `npm ci` successful
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] No import warnings
- [ ] All PRs merged to main

**If all ✅:** Proceed to Phase 2

---

## 🔧 PHASE 2: FEATURE RESTORATION (WEEKS 2-4)

### Feature Implementation Order

**DO NOT SKIP STEPS. DO NOT CHANGE ORDER.**

Implement in this sequence:
1. **#61** - Dynamic Episode Count (foundation, day 1)
2. **#57** - ContentSanitizer v4.4 (needed by others, day 2-3)
3. **#59** - Quality Metrics Integration (depends on #57, day 4-5)
4. **#58** - QualityValidator v4.9 (depends on #57, day 6-7)
5. **#60** - Anti-AI Detector (depends on #58, day 8-9)
6. **#56** - Anti-Detection Orchestrator (most complex, day 10-14)

---

## 📋 FEATURE 1: DYNAMIC EPISODE COUNT (#61)

### Issue: #61 - Dynamic Episode Count Based on Character Budget

**Difficulty:** 🟢 EASY  
**Depends On:** Nothing (foundation)  
**Time:** ~4 hours  
**Priority:** 🔥 HIGH (blocks others)

---

### 1.1: Create Feature Branch

```bash
# Create branch from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/dynamic-episode-count
```

---

### 1.2: Review Issue #61

**Read:** [GitHub Issue #61](https://github.com/crosspostly/dzen/issues/61)

**Key Points:**
- Algorithm: Calculate episodes from remaining budget
- Min: 6 episodes, Max: 15 episodes
- Formula: `episodes = Math.max(6, Math.min(15, floor(remaining / 3200)))`
- Test with 19K, 29K, 35K budgets

---

### 1.3: Implementation

**File:** `src/services/episodeGeneratorService.ts`

**Add method (after existing code):**

```typescript
/**
 * Calculate optimal episode count based on character budget
 */
private calculateDynamicEpisodes(maxChars: number): {
  episodeCount: number;
  ledeBudget: number;
  finaleBudget: number;
  perEpisodeBudget: number;
} {
  // Reserve lede and finale
  const ledeBudget = 750;      // 600-900 range
  const finaleBudget = 1500;   // 1200-1800 range
  
  // Calculate remaining for episodes
  const remaining = maxChars - ledeBudget - finaleBudget;
  
  // Assume ~3200 chars per episode (optimal)
  const perEpisodeBudget = 3200;
  
  // Calculate count: min 6, max 15
  const episodeCount = Math.max(6, Math.min(15, Math.floor(remaining / perEpisodeBudget)));
  
  return {
    episodeCount,
    ledeBudget,
    finaleBudget,
    perEpisodeBudget
  };
}
```

---

### 1.4: Add Tests

**File:** `tests/unit/episodeGenerator.dynamic-budget.test.ts` (NEW)

```typescript
import { EpisodeGeneratorService } from '../../src/services';

describe('Dynamic Episode Count', () => {
  let service: EpisodeGeneratorService;

  beforeEach(() => {
    service = new EpisodeGeneratorService();
  });

  it('should calculate 6 episodes for 19K budget', () => {
    const result = service['calculateDynamicEpisodes'](19000);
    expect(result.episodeCount).toBe(6);
  });

  it('should calculate 9 episodes for 29K budget', () => {
    const result = service['calculateDynamicEpisodes'](29000);
    expect(result.episodeCount).toBe(9);
  });

  it('should cap at 15 episodes maximum', () => {
    const result = service['calculateDynamicEpisodes'](100000);
    expect(result.episodeCount).toBeLessThanOrEqual(15);
  });

  it('should have minimum 6 episodes', () => {
    const result = service['calculateDynamicEpisodes'](5000);
    expect(result.episodeCount).toBeGreaterThanOrEqual(6);
  });
});
```

---

### 1.5: Test & Create PR

```bash
# Run tests
npm run test -- episodeGenerator.dynamic-budget

# If passing, commit
git add .
git commit -m "feat: Implement dynamic episode count based on character budget

- Add calculateDynamicEpisodes() method
- Support flexible budgets (19K, 29K, 35K+)
- Min 6, max 15 episodes
- Add comprehensive tests

Closes #61"

# Push and create PR
git push origin feat/dynamic-episode-count
```

---

## 📋 FEATURE 2: CONTENTSANITIZER V4.4 (#57)

### Issue: #57 - ContentSanitizer with Quality Metrics

**Difficulty:** 🟡 MEDIUM  
**Depends On:** Nothing (but #61 should be done first)  
**Time:** ~6 hours  
**Priority:** 🔥 HIGH

---

### 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/contentsanitizer-v4.4
```

---

### 2.2: Implementation

**File:** `src/services/contentSanitizer.ts` (NEW)

```typescript
export class ContentSanitizer {
  /**
   * Remove markdown and extract clean text
   */
  sanitize(content: string): string {
    let text = content
      .replace(/\*\*(.*?)\*\*/g, '$1')      // bold
      .replace(/\*(.*?)\*/g, '$1')           // italic
      .replace(/~~(.*?)~~/g, '$1')           // strikethrough
      .replace(/`(.*?)`/g, '$1')             // code
      .replace(/```[^`]*```/g, '')           // code blocks
      .trim();
    
    return text;
  }

  /**
   * Compute quality metrics
   */
  computeMetrics(content: string): QualityMetrics {
    const sanitized = this.sanitize(content);
    
    return {
      readabilityScore: this.calculateReadability(sanitized),
      dialoguePercentage: this.calculateDialogue(sanitized),
      plotTwistCount: this.detectTwists(sanitized),
      sensoryDensity: this.calculateSensoryDensity(sanitized)
    };
  }

  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = text.split(/\s+/).length / sentences.length;
    
    // Flesch-Kincaid inspired (simplified)
    const score = Math.max(0, Math.min(100, 100 - (avgSentenceLength - 10) * 3));
    return Math.round(score);
  }

  private calculateDialogue(text: string): number {
    const dialogueMatches = text.match(/[""]([^"])*[""])/g) || [];
    const words = text.split(/\s+/).length;
    
    return Math.round((dialogueMatches.length * 100) / (words / 100));
  }

  private detectTwists(text: string): number {
    const keywords = /suddenly|unexpectedly|but then|however|twist|turned out/gi;
    const matches = text.match(keywords) || [];
    return matches.length;
  }

  private calculateSensoryDensity(text: string): number {
    const sensoryWords = /see|hear|smell|taste|feel|watch|listen|bright|dark|soft|loud/gi;
    const matches = text.match(sensoryWords) || [];
    return matches.length;
  }
}

interface QualityMetrics {
  readabilityScore: number;
  dialoguePercentage: number;
  plotTwistCount: number;
  sensoryDensity: number;
}
```

---

### 2.3: Add Tests & Create PR

```bash
# Test
npm run test -- contentSanitizer

# Commit
git add .
git commit -m "feat: Implement ContentSanitizer v4.4 with quality metrics

- Sanitize markdown
- Compute readability score
- Calculate dialogue percentage
- Detect plot twists
- Calculate sensory density

Closes #57"

# Push
git push origin feat/contentsanitizer-v4.4
```

---

## 📋 FEATURE 3: QUALITY METRICS INTEGRATION (#59)

### Issue: #59 - Integrate Quality Metrics into Prompts

**Difficulty:** 🟡 MEDIUM  
**Depends On:** #57  
**Time:** ~5 hours  

---

### 3.1: Create Branch

```bash
git checkout main && git pull
git checkout -b feat/quality-metrics-integration
```

---

### 3.2: Update episodeGeneratorService

**File:** `src/services/episodeGeneratorService.ts`

```typescript
private buildPrompt(episode: number, context: string): string {
  const metrics = `
QUALITY METRICS TARGET:
- Readability: 75+/100
- Dialogue: 35-40%
- Plot Twists: 2+
- Sensory Details: 10+

⚠️ Character does NOT know about publication
⚠️ NO 4th wall breaks
⚠️ Authentic voice
`;

  return `${metrics}\n\nEPISODE ${episode}:\n${context}`;
}
```

---

### 3.3: Test & PR

```bash
npm run test
git add . && git commit -m "feat: Integrate quality metrics into prompts (#59)"
git push origin feat/quality-metrics-integration
```

---

## 📋 FEATURES 4-6: ADVANCED (FOLLOW SAME PATTERN)

### Feature 4: #58 - QualityValidator v4.9
- Time: ~8 hours
- Depends: #57
- After: #59

### Feature 5: #60 - Anti-AI Detector  
- Time: ~8 hours
- Depends: #58
- After: #58

### Feature 6: #56 - Anti-Detection Orchestrator
- Time: ~10 hours
- Depends: #60
- After: #60

---

## 🎯 GENERAL WORKFLOW (FOR ALL FEATURES)

**Repeat this for each feature:**

1. ✅ `git checkout main && git pull`
2. ✅ `git checkout -b feat/<feature-name>`
3. ✅ Read GitHub Issue thoroughly
4. ✅ Check `docs/CODING_STANDARDS.md`
5. ✅ Implement feature
6. ✅ Add tests
7. ✅ `npm run test` - all passing
8. ✅ `npm run build` - no errors
9. ✅ Create PR
10. ✅ Merge to main
11. ✅ Close issue
12. ✅ Next feature

---

## 📊 TIMELINE

```
├─ Phase 1 (1-2 days): Stabilize
├─ Day 1: Feature #61
├─ Days 2-3: Feature #57
├─ Days 4-5: Feature #59
├─ Days 6-7: Feature #58
├─ Days 8-9: Feature #60
└─ Days 10-14: Feature #56

TOTAL: ~2 weeks
```

---

## ✅ SUCCESS CRITERIA

✅ Phase 1: Tests passing, imports correct
✅ Phase 2: All 6 features implemented
✅ Final: Generation works end-to-end

---

**Good luck! 🚀**
