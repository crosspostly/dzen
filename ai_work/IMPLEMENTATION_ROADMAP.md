# 🚀 ZenMaster Implementation Roadmap

**Purpose**: HOW to build the ZenMaster system
**Target Audience**: Developers, engineering leads, DevOps
**Version**: 1.0 | **Updated**: January 5, 2026

---

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [File Structure](#file-structure)
4. [Implementation Phases](#implementation-phases)
5. [Critical Issues](#critical-issues)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)

---

## 📊 Current Status

### What Works ✅

**Generation Services**:
- ✅ `services/plotBibleBuilder.ts` - Stage 0: PlotBible generation
- ✅ `services/simpleEpisodeGenerator.ts` - Stage 1: Episodes generation
- ✅ `services/multiAgentService.ts` - Stage 2: Article assembly
- ✅ `services/voiceRestorationService.ts` - Stage 3: Voice restoration
- ✅ `services/phase2AntiDetectionService.ts` - Stage 4: Anti-detection
- ✅ `services/qualityValidator.ts` - Stage 5: Quality validation

**Image Services**:
- ✅ `services/imageGeneratorAgent.ts` - Gemini image generation
- ✅ `services/imageProcessorService.ts` - Canvas post-processing
- ✅ `services/mobilePhotoAuthenticityProcessor.ts` - Mobile authenticity

**Orchestration**:
- ✅ `services/contentFactoryOrchestrator.ts` - Mass generation (1-100 articles)
- ✅ `services/articleWorkerPool.ts` - Parallel article workers
- ✅ `services/imageWorkerPool.ts` - Serial image workers

**Export**:
- ✅ `services/articleExporter.ts` - Export to Markdown, JSON
- ✅ `scripts/generate-feed.js` - RSS generation for Dzen

---

### What's Broken ❌

**🚨 CRITICAL**: Stage 3 (Voice Restoration) skipped in MultiAgentService
- **Location**: `services/multiAgentService.ts`, line 310-311
- **Current code**: `console.log('✅ Stage 3: Cleanup SKIPPED');`
- **Impact**: Text is not "alive", Stage 4 applies to "dead" text
- **Fix**: See Critical Issues section below

**🟠 HIGH**: Auto-restore not fully implemented in Stage 1
- **Location**: `services/simpleEpisodeGenerator.ts`
- **Problem**: Episodes generated without auto-restore
- **Impact**: Episode quality inconsistent

**🟠 HIGH**: Levenshtein uniqueness check not implemented
- **Location**: Should be in `utils/levenshtein-distance.ts`
- **Problem**: Duplicate episodes can be generated
- **Impact**: Content quality issues

**🟠 HIGH**: No rate limiting for Gemini API
- **Location**: `services/geminiService.ts`
- **Problem**: Can get 429 errors during mass generation
- **Impact**: Generation failures

**🟡 MEDIUM**: No unit tests
- **Problem**: High risk of regressions
- **Impact**: Difficult to maintain code

**🟡 MEDIUM**: No monitoring/logging
- **Problem**: Difficult to debug production issues
- **Impact**: Long troubleshooting times

---

## 🏗️ Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ CLI (cli.ts) - Entry Point                                   │
│ Commands: both, factory, validate, feed:*                     │
└────────────┬────────────────────────────────────────────────┘
             │
   ┌─────────┴─────────┐
   │                   │
┌──▼─────────┐   ┌──────▼──────────┐
│ BothMode    │   │ FactoryMode     │
│ (2 articles)│   │ (1-100 articles)│
└──┬─────────┘   └──────┬──────────┘
   │                   │
   └─────────┬─────────┘
             │
   ┌─────────▼──────────────────────────┐
   │ ContentOrchestrator (NEW)         │
   │ - Stage orchestration             │
   │ - Retry logic                    │
   │ - Error handling                  │
   └─────────┬──────────────────────────┘
             │
   ┌─────────┼─────────┬─────────┬────────────┐
   │         │         │         │            │
┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌────▼─────┐ ┌──▼─────┐
│Stage0│ │Stage1│ │Stage2│ │  Stage3  │ │  Stage4 │ │Stage5  │
│Plot  │ │Episode│ │Assemble│ │Voice+GURU│ │Anti-Det │ │Quality │
│Bible │ │+Auto │ │        │ │(MISSING!)│ │         │ │Check   │
└──┬───┘ └──┬───┘ └──┬───┘ └────┬─────┘ └──┬─────┘ └──┬─────┘
   │         │         │          │            │          │
   └─────────┴─────────┴──────────┴────────────┴──────────┘
                         │
               ┌─────────▼─────────┐
               │ Quality Gates     │
               │ (phase2, dzen)   │
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │ Article Exporter  │
               │ (MD, JSON, RSS)   │
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │ Image Generation  │
               │ (Gemini→Canvas    │
               │  →Authenticity)   │
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │ Output            │
               │ articles/*.md     │
               │ public/feed.xml   │
               └───────────────────┘
```

---

## 📁 File Structure

### Target Structure

```
zenmaster/
├── services/
│   ├── orchestration/
│   │   ├── contentOrchestrator.ts          # NEW: Main orchestrator
│   │   ├── stageOrchestrator.ts           # Stage-specific logic
│   │   └── retryLogic.ts                 # Retry patterns
│   │
│   ├── stages/
│   │   ├── stage0-plotBible.ts
│   │   ├── stage1-episodes.ts
│   │   ├── stage2-assembly.ts
│   │   ├── stage3-voiceRestoration.ts
│   │   ├── stage4-antiDetection.ts
│   │   └── stage5-qualityCheck.ts
│   │
│   ├── quality/
│   │   ├── phase2Scorer.ts               # Phase 2 scoring (6 components)
│   │   ├── dzenRulesValidator.ts          # DZEN GURU rules
│   │   ├── qualityGates.ts               # Quality gate logic
│   │   └── levenshtein.ts                # Uniqueness check
│   │
│   ├── image/
│   │   ├── imageGeneratorAgent.ts
│   │   ├── imageProcessorService.ts
│   │   └── mobilePhotoAuthenticityProcessor.ts
│   │
│   └── infrastructure/
│       ├── geminiService.ts
│       ├── rateLimiter.ts                # NEW: API rate limiting
│       └── logger.ts                     # NEW: Structured logging
│
├── utils/
│   ├── levenshtein-distance.ts
│   ├── quality-gate.ts
│   └── rateLimiter.ts
│
├── prompts/
│   ├── stage-0-plan.md
│   ├── stage-1-episodes.md
│   ├── stage-2-assemble.md
│   ├── stage-3-restore.md
│   ├── stage-4-anti-detect.md           # NEW
│   └── dzen-quality-checklist.md
│
├── types/
│   ├── ContentArchitecture.ts
│   ├── ContentFactory.ts
│   ├── Stages.ts                        # NEW: Stage interfaces
│   └── Quality.ts                        # NEW: Quality interfaces
│
├── test/
│   ├── services/
│   │   ├── stage0-plotBible.test.ts
│   │   ├── stage1-episodes.test.ts
│   │   ├── stage3-voiceRestoration.test.ts
│   │   └── phase2AntiDetection.test.ts
│   └── utils/
│       └── levenshtein-distance.test.ts
│
├── scripts/
│   ├── generate-feed.js
│   ├── validate-rss.js
│   └── restore-articles.cjs
│
├── ai_work/
│   ├── README.md
│   ├── ARTICLE_GENERATION_ALGORITHM.md   # Main guide
│   ├── DZEN_QUALITY_STANDARDS.md       # Quality standards
│   └── IMPLEMENTATION_ROADMAP.md        # This file
│
└── cli.ts
```

---

## 🎯 Implementation Phases

### Phase 1: Critical Fixes (Week 1)

**Priority**: 🚨 CRITICAL
**Time Estimate**: 8-12 hours

#### Task 1.1: Fix Stage 3 in MultiAgentService
**Status**: ❌ BLOCKING
**Time**: 2-3 hours
**Assignee**: [TBD]

**Changes**:
```typescript
// File: services/multiAgentService.ts

// AFTER Stage 2 assembly, BEFORE creating article object:
// Stage 3: Voice Restoration + DZEN GURU Rules
console.log("🔤 Stage 3: Voice Restoration + DZEN GURU Rules...");

let restoredContent = fullContent;
let stage3Passed = false;
let stage3Attempts = 0;

while (!stage3Passed && stage3Attempts < 2) {
  restoredContent = await this.voiceRestorationService.restoreArticle({
    ...article,
    processedContent: fullContent
  });

  // Check Phase 2 Score >= 85
  const phase2Result = await this.phase2Service.processArticle(
    title,
    restoredContent,
    { 
      applyPerplexity: false,  // Only analyze, don't transform
      applyBurstiness: false,
      applySkazNarrative: false,
      enableGatekeeper: false
    }
  );

  if (phase2Result.adversarialScore.overallScore >= 85) {
    stage3Passed = true;
    console.log('✅ Stage 3 PASSED (Phase 2 Score >= 85)');
    fullContent = restoredContent;
  } else {
    console.log('⚠️ Stage 3 failed, auto-restoring...');
    stage3Attempts++;
  }
}

if (!stage3Passed) {
  console.log('❌ Stage 3 failed after 2 attempts, returning to Stage 2');
  // Return to Stage 2 (regenerate article)
  return this.generateLongFormArticle(params);
}

// Remove old comment:
// // 🆕 v9.0: Removed rotten Stage 3 Cleanup
// console.log('✅ Stage 3: Cleanup SKIPPED (relying on auto-restore)');
```

**Dependencies**:
- `services/voiceRestorationService.ts` (exists)
- `services/phase2AntiDetectionService.ts` (exists)

**Verification**:
```bash
npm run both --count=1
# Should see: "🔤 Stage 3: Voice Restoration + DZEN GURU Rules..."
# Should NOT see: "Stage 3: Cleanup SKIPPED"
```

---

#### Task 1.2: Implement Auto-Restore in Stage 1
**Status**: 🟠 HIGH
**Time**: 2-4 hours
**Assignee**: [TBD]

**Changes**:
```typescript
// File: services/simpleEpisodeGenerator.ts

async generateEpisode(plotBible, episodeNum: number): Promise<Episode> {
  let episode = await this.generateSingleEpisode(plotBible, episodeNum);
  let phase2Score = 0;
  let attempts = 0;

  // Auto-restore: WHILE phase2 < 70
  while (phase2Score < 70 && attempts < 3) {
    // Apply voice restoration to episode
    episode = await this.autoRestoreEpisode(episode);

    // Recalculate Phase 2 Score
    const phase2Result = await this.phase2Service.processEpisodeContent(
      episode.content,
      episodeNum
    );
    phase2Score = phase2Result.adversarialScore;

    attempts++;
    console.log(`   Episode ${episodeNum} attempt ${attempts}: Phase2 = ${phase2Score}`);
  }

  if (phase2Score >= 70) {
    console.log(`   ✅ Episode ${episodeNum}: Phase2 = ${phase2Score} PASS`);
    return episode;
  } else {
    console.log(`   ❌ Episode ${episodeNum}: Phase2 = ${phase2Score} FAIL, regenerating...`);
    // Regenerate episode
    return this.generateEpisode(plotBible, episodeNum);
  }
}
```

---

#### Task 1.3: Implement Levenshtein Uniqueness Check
**Status**: 🟠 HIGH
**Time**: 1-2 hours
**Assignee**: [TBD]

**Create file**: `utils/levenshtein-distance.ts`
```typescript
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function similarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}
```

**Integrate into episode generation**:
```typescript
import { similarity } from '../utils/levenshtein-distance';

async generateEpisode(plotBible, episodeNum: number, existingEpisodes: Episode[]): Promise<Episode> {
  const newEpisode = await this.generateSingleEpisode(plotBible, episodeNum);

  // Check uniqueness against all existing episodes
  for (const existingEpisode of existingEpisodes) {
    const sim = similarity(newEpisode.content, existingEpisode.content);

    if (sim > 0.75) {
      console.log(`   ⚠️ Episode ${episodeNum} duplicate detected (${Math.round(sim * 100)}%), regenerating...`);
      return this.generateEpisode(plotBible, episodeNum, existingEpisodes);
    }
  }

  return newEpisode;
}
```

---

#### Task 1.4: Implement Rate Limiting
**Status**: 🟠 HIGH
**Time**: 1 hour
**Assignee**: [TBD]

**Create file**: `services/infrastructure/rateLimiter.ts`
```typescript
export class RateLimiter {
  private lastCall: number = 0;
  private minDelay: number; // ms

  constructor(minDelay: number = 1000) { // 1 second by default
    this.minDelay = minDelay;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minDelay) {
      const delay = this.minDelay - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastCall = Date.now();
  }
}
```

**Integrate into geminiService.ts**:
```typescript
import { RateLimiter } from './infrastructure/rateLimiter';

export class GeminiService {
  private rateLimiter = new RateLimiter(1000); // 1 second between requests

  async generateContent(prompt: string): Promise<string> {
    await this.rateLimiter.wait(); // Wait before each request

    const response = await this.client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
```

---

### Phase 2: Testing (Week 2)

**Priority**: 🟡 MEDIUM
**Time Estimate**: 8-12 hours

#### Task 2.1: Unit Tests for Quality Gates
**Time**: 3-4 hours

**Create files**:
- `test/services/stage0-plotBible.test.ts`
- `test/services/stage1-episodes.test.ts`
- `test/services/stage3-voiceRestoration.test.ts`
- `test/services/phase2AntiDetection.test.ts`

**Example test**:
```typescript
import { describe, it, expect } from 'vitest';
import { levenshteinDistance, similarity } from '../../utils/levenshtein-distance';

describe('Levenshtein Distance', () => {
  it('should calculate distance correctly', () => {
    expect(levenshteinDistance('hello', 'helo')).toBe(1);
    expect(levenshteinDistance('test', 'text')).toBe(1);
  });

  it('should calculate similarity correctly', () => {
    expect(similarity('hello world', 'hello world')).toBe(1);
    expect(similarity('hello', 'hel')).toBeGreaterThan(0.5);
  });

  it('should detect duplicates', () => {
    const text1 = "This is a test article about something important.";
    const text2 = "This is a test article about something important."; // Exact duplicate
    const text3 = "This is a test about something important."; // Similar
    
    expect(similarity(text1, text2)).toBe(1);
    expect(similarity(text1, text3)).toBeGreaterThan(0.75);
  });
});
```

---

#### Task 2.2: Integration Tests
**Time**: 2-3 hours

**Create file**: `test/integration/fullPipeline.test.ts`
```typescript
describe('Full Pipeline Integration', () => {
  it('should generate article through all stages', async () => {
    const orchestrator = new ContentOrchestrator();
    const article = await orchestrator.generateArticle({
      theme: "Я терпела свекровь 20 лет",
      angle: "emotional",
      emotion: "dramatic",
      audience: "women-35-60"
    });

    expect(article).toBeDefined();
    expect(article.title).toBeTruthy();
    expect(article.processedContent).toBeTruthy();
    expect(article.metadata.totalChars).toBeGreaterThan(15000);
    expect(article.adversarialScore?.overallScore).toBeGreaterThanOrEqual(80);
  });
});
```

---

### Phase 3: Monitoring & Logging (Week 3)

**Priority**: 🟡 MEDIUM
**Time Estimate**: 4-6 hours

#### Task 3.1: Structured Logging
**Time**: 2-3 hours

**Create file**: `services/infrastructure/logger.ts`
```typescript
import fs from 'fs';
import path from 'path';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class Logger {
  private logFile: string;

  constructor(logDir: string = 'logs') {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logDir, `${date}.log`);
  }

  log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    const logLine = JSON.stringify(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`);
    fs.appendFileSync(this.logFile, logLine + '\n');
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }
}

export const logger = new Logger();
```

**Integrate into services**:
```typescript
import { logger } from '../infrastructure/logger';

export class MultiAgentService {
  async generateLongFormArticle(params: ...) {
    logger.info('Starting article generation', { theme: params.theme });

    try {
      const outline = await this.generateOutline(params);
      logger.info('Outline generated', { episodeCount: outline.episodes.length });
      // ...
    } catch (error) {
      logger.error('Article generation failed', { 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
      throw error;
    }
  }
}
```

---

### Phase 4: CI/CD (Week 4)

**Priority**: 🔩 LOW
**Time Estimate**: 2-4 hours

#### Task 4.1: GitHub Actions for Nightly Restore
**Time**: 1-2 hours

**Create file**: `.github/workflows/nightly-restore.yml`
```yaml
name: Nightly Auto-Restore

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  restore:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run auto-restore
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node scripts/restore-articles.cjs

      - name: Commit changes
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add articles/
          git commit -m "Auto-restore: nightly update [skip ci]" || exit 0
          git push
```

---

## 🚨 Critical Issues

### Issue #1: Stage 3 Skipped in MultiAgentService

**Severity**: 🚨 CRITICAL (BLOCKING)
**Impact**: Text not "alive", AI-detection high
**Fix**: Task 1.1 in Phase 1

**Root Cause**:
- Stage 3 was removed during refactoring
- Comment says "relying on auto-restore" but auto-restore only works in Stage 1

**Solution**: Add Stage 3 call between Stage 2 and Stage 4

---

### Issue #2: Auto-Restore Not Fully Implemented

**Severity**: 🟠 HIGH
**Impact**: Inconsistent quality
**Fix**: Task 1.2 in Phase 1

**Root Cause**:
- Auto-restore described in docs but not fully implemented in code
- Stage 1 generates episodes without auto-restore

**Solution**: Implement auto-restore loop in episode generation

---

### Issue #3: No Uniqueness Check

**Severity**: 🟠 HIGH
**Impact**: Duplicate episodes possible
**Fix**: Task 1.3 in Phase 1

**Root Cause**:
- Levenshtein distance described in docs but not implemented
- No uniqueness validation during generation

**Solution**: Implement Levenshtein check and integrate

---

## 🧪 Testing Strategy

### Test Coverage Goals

| Component | Target Coverage | Priority |
|-----------|------------------|-----------|
| Stage 0 (PlotBible) | 80% | High |
| Stage 1 (Episodes) | 80% | High |
| Stage 3 (Voice Restoration) | 80% | High |
| Stage 4 (Anti-Detection) | 90% | Critical |
| Quality Gates | 100% | Critical |
| Utils (Levenshtein) | 100% | High |

### Test Types

1. **Unit Tests** - Individual functions and services
2. **Integration Tests** - Full pipeline generation
3. **Quality Tests** - Phase 2 score validation
4. **Performance Tests** - Generation time benchmarks

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] All critical issues fixed (Issues #1-3)
- [ ] Unit tests passing (>= 80% coverage)
- [ ] Integration tests passing
- [ ] Rate limiting implemented
- [ ] Logging configured
- [ ] Documentation updated
- [ ] README updated with new file structure

### Deployment Steps

1. **Run full test suite**:
   ```bash
   npm run test:unit
   npm run test:integration
   ```

2. **Generate test articles**:
   ```bash
   npm run both --count=5
   ```

3. **Validate quality**:
   ```bash
   npm run validate
   ```

4. **Generate RSS feed**:
   ```bash
   npm run feed:incremental
   ```

5. **Commit and push**:
   ```bash
   git add .
   git commit -m "fix: implement Stage 3, auto-restore, Levenshtein, rate limiting"
   git push
   ```

---

## 📊 Timeline

| Week | Phase | Tasks | Hours |
|------|-------|--------|-------|
| **Week 1** | Phase 1: Critical Fixes | Tasks 1.1-1.4 | 8-12h |
| **Week 2** | Phase 2: Testing | Tasks 2.1-2.2 | 8-12h |
| **Week 3** | Phase 3: Monitoring | Task 3.1 | 4-6h |
| **Week 4** | Phase 4: CI/CD | Task 4.1 | 2-4h |
| **TOTAL** | | | **22-34h** |

---

## 📚 Related Documentation

- **ARTICLE_GENERATION_ALGORITHM.md** - HOW pipeline works
- **DZEN_QUALITY_STANDARDS.md** - Quality standards and metrics
- **ai_work/TODO_ISSUES.md** - Known issues with solutions

---

**Version**: 1.0
**Updated**: January 5, 2026
**Support**: crosspostly
