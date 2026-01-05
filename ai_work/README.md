# 🤖 AI Work Directory - ZenMaster System Overhaul

**Status**: 🔴 CRITICAL - In Development  
**Deadline**: ASAP (Target: 16 hours of work)  
**Owner**: Crosspostly Team  

---

## 📚 Documentation Structure

This directory contains complete analysis, briefings, and guidelines for overhauling the ZenMaster system.

### Files Overview:

| File | Size | Purpose | Audience |
|------|------|---------|----------|
| **AI_TASK_BRIEFING.md** | 31KB | Complete task briefing for AI implementation | 🤖 AI Engineers |
| **project_review.md** | 27KB | Architecture analysis, SWOT, recommendations | 👔 Project Managers |
| **SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md** | 18KB | Simple explanations, how-to guides | 👥 Team Members |
| **CONTENT_QUALITY_MATRIX.md** | 16KB | Quality metrics, benchmarks, targets | 📊 QA & Analytics |

**Total**: 92KB of comprehensive documentation

---

## 🎯 Quick Start

### For AI Engineer:
```
1. Read: AI_TASK_BRIEFING.md (Priority: FIRST)
   ├─ Understand 5 blocks (A-E)
   ├─ Check critical issues
   └─ Implement in order

2. Reference:
   ├─ prompts/stage-*.md (write these)
   ├─ SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md (understand context)
   └─ CONTENT_QUALITY_MATRIX.md (understand quality gates)

3. Execute:
   ├─ Block A: Create /prompts files (4h)
   ├─ Block B: Fix STAGE 0 parsing (2h)
   ├─ Block C: Add episode uniqueness check (3h)
   ├─ Block D: Synchronize STAGE 2 (5h)
   └─ Block E: Remove cleanup, keep auto-restore (2h)
```

### For Project Manager:
```
1. Read: project_review.md
   ├─ SWOT analysis (pages 3-5)
   ├─ Critical issues (pages 6-8)
   └─ Recommendations with timeline (pages 9-12)

2. Timeline:
   ├─ Phase 1: Prompt extraction (Day 1)
   ├─ Phase 2: Quality gates implementation (Day 2-3)
   ├─ Phase 3: Testing & validation (Day 3-4)
   └─ Phase 4: Deployment (Day 4-5)
```

### For Team Member:
```
1. Read: SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md
   ├─ How system works (4-stage pipeline)
   ├─ Why each step matters
   ├─ Common problems & solutions
   └─ New script analysis

2. Reference:
   └─ CONTENT_QUALITY_MATRIX.md for quality targets
```

---

## 🔴 Critical Issues (Priority)

### Issue 1: Parsing Fails → Uses Default Bible
**File**: `src/services/stage-0/generate-plotbible.ts`  
**Impact**: Wrong narrator age, inconsistent articles  
**Fix Time**: 2 hours  
**Solution**: Graceful fallback (take response as-is)

### Issue 2: Cleanup Destroys Quality
**File**: `src/services/stage-3/cleanup.ts`  
**Impact**: Removes needed phrases, kills emotion  
**Fix Time**: 2 hours  
**Solution**: Remove, rely only on auto-restore

### Issue 3: Episodes Are Duplicates
**File**: `src/services/stage-1/generate-episodes.ts`  
**Impact**: 30% of articles have repeated content  
**Fix Time**: 3 hours  
**Solution**: Levenshtein distance check

### Issue 4: No Quality Control Per Stage
**File**: Everywhere  
**Impact**: Bad quality reaches production  
**Fix Time**: 8 hours  
**Solution**: Quality gate after each stage

### Issue 5: Prompts Everywhere (Chaos)
**File**: Multiple files  
**Impact**: 1 change = rewrite 5 files  
**Fix Time**: 4 hours  
**Solution**: Centralized /prompts directory

---

## 📋 What's Inside Each File

### 1. AI_TASK_BRIEFING.md ← **START HERE FOR AI**

**Contains**:
- Architecture (current vs fixed)
- 5 critical errors with code examples
- 5 solution blocks (A-E) with implementation details
- All prompts for STAGE 0, 1, 2, 3
- Quality gate implementation
- Levenshtein distance function
- Success criteria

**Key Sections**:
```
- Current Architecture (problems highlighted)
- Critical Issues 1-5 (with code)
- Solution: 5 Blocks A-E (with full code)
- Block A: Prompts extraction (4h)
- Block B: STAGE 0 fix (2h)
- Block C: Episode uniqueness (3h)
- Block D: STAGE 2 sync (5h)
- Block E: Remove cleanup (2h)
- Verification checklist
```

---

### 2. project_review.md ← **START HERE FOR MANAGERS**

**Contains**:
- Project overview
- 15 services analysis (all active, no dead code)
- 13 npm scripts explanation
- SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)
- Recommendations (13 actionable items)
- 28-week roadmap
- Metrics & KPIs

**Key Sections**:
```
- 4-Stage Architecture Overview
- Service Dependencies Map
- Script Analysis (all 13 npm commands)
- SWOT Analysis
  ├─ Strengths (4 items)
  ├─ Weaknesses (5 items)
  ├─ Opportunities (4 items)
  └─ Threats (2 items)
- 13 Recommendations with priority
- Roadmap: 28 weeks planning
- Metrics & measurement
```

---

### 3. SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md ← **START HERE FOR TEAM**

**Contains**:
- How people give topics (the actual process)
- PlotBible explanation
- Why each stage exists (clear explanations)
- 7 article archetypes with examples
- All 13 npm scripts explained
- Common problems & solutions
- Pro-tips for quality
- Checklist before launch

**Key Sections**:
```
- Input: How users give topics
- Stage 0: Plan (what it creates)
- Stage 1: Episodes (what each episode needs)
- Stage 2: Assembly (how it works)
- Stage 3: Quality check
- Auto-Restore workflow
- 7 Archetypes detailed:
  ├─ Comeback Queen
  ├─ Gold Digger Trap
  ├─ Phoenix
  ├─ Wisdom Earned
  ├─ Betrayal & Revenge
  ├─ Business Triumph
  └─ Love Triangle
- All 13 scripts explained
- Common issues & fixes
- Pro-tips
- Checklists
```

---

### 4. CONTENT_QUALITY_MATRIX.md ← **START HERE FOR QA**

**Contains**:
- 5 quality dimensions (length, scroll depth, comments, anti-detect, archetype)
- Targets for each dimension
- How to measure
- Formula-based scoring (0-100)
- Archetype-specific checklists
- Performance dashboard examples
- Weekly improvement process
- Final QA checklist

**Key Sections**:
```
- Content Length & Depth
  ├─ Targets (10K to 25K chars)
  └─ Optimization strategies
- Engagement Metrics
  ├─ Scroll Depth (target: 70-85%)
  ├─ Time on Page (target: 8-15 min)
  └─ Comments & Shares
- Anti-Detection Quality
  ├─ Phase2 Score (target: 75+)
  ├─ Perplexity, Burstiness, Colloquialism
  └─ Examples
- Narrative Structure Quality
  ├─ Required elements checklist
  └─ Points system (70+ to pass)
- Archetype Alignment
  ├─ Comeback Queen checklist
  ├─ Gold Digger Trap checklist
  └─ Phoenix checklist
- Performance Dashboard
- Scoring Algorithm
- Continuous Improvement Process
- Final Checklist
```

---

## 🎯 Implementation Order

### Phase 1: Preparation (Day 1 - 2 hours)
```
□ Read AI_TASK_BRIEFING.md completely
□ Understand 5 critical issues
□ Create /prompts directory structure
□ Set up git branch for changes
```

### Phase 2: Prompts (Day 1 - 4 hours) - BLOCK A
```
□ prompts/stage-0-plan.md (create)
□ prompts/stage-1-episodes.md (create)
□ prompts/stage-2-assemble.md (create)
□ prompts/stage-3-restore.md (create)
□ prompts/shared/voice-guidelines.md (create)
□ prompts/shared/anti-detect.md (create)
□ prompts/shared/archetype-rules.md (create)
□ prompts/shared/quality-gates.md (create)
```

### Phase 3: STAGE 0 Fix (Day 2 - 2 hours) - BLOCK B
```
□ Update generate-plotbible.ts
□ Remove try-catch that uses default
□ Add graceful fallback
□ Add validation after generation
□ Test with invalid JSON
```

### Phase 4: Episode Uniqueness (Day 2 - 3 hours) - BLOCK C
```
□ Create levenshtein-distance.ts
□ Update generate-episodes.ts
□ Add duplicate check loop
□ Add quality gate after each episode
□ Test with 7-12 episodes
```

### Phase 5: STAGE 2 Sync (Day 3 - 5 hours) - BLOCK D
```
□ Update assemble-article.ts
□ Add PlotBible validation
□ Fix: Don't copy, rewrite each section
□ Add section quality gates
□ Test synchronization
```

### Phase 6: Remove Cleanup (Day 3 - 2 hours) - BLOCK E
```
□ Delete cleanup.ts (or backup)
□ Delete cleanup-old.ts (mertavec)
□ Update STAGE 3 to use restoreVoice only
□ Verify auto-restore runs nightly
□ Test with low-quality articles
```

### Phase 7: Testing (Day 4 - 4 hours)
```
□ Generate 1 test article (full pipeline)
□ Check Phase2 Score >= 70
□ Generate 5 test articles
□ Check ALL Phase2 Scores >= 75
□ Verify no duplicate episodes
□ Verify PlotBible sync
□ Run auto-restore workflow
```

### Phase 8: Documentation (Day 4 - 1 hour)
```
□ Update architecture docs
□ Create migration guide
□ Document new prompt files
□ Add quality gate configuration
```

---

## ✅ Success Criteria

**Before Implementation**:
- Phase2 Score: 65 average (35-95 range)
- Scroll Depth: 68% average
- Duplicate episodes: 30% of articles
- Quality gate failures: 0 (no gate exists)

**After Implementation**:
- Phase2 Score: 80 average (75-88 range) ✅ +23%
- Scroll Depth: 75% average ✅ +10%
- Duplicate episodes: 0% ✅ -100%
- Quality gate passes: 95%+ ✅ New feature
- System reliability: 99%+ ✅ No parsing failures

---

## 🚀 Deployment

1. **Create branch**: `feature/zenmaster-quality-overhaul`
2. **Implement blocks A-E** (in order)
3. **Run tests**: `npm run both --count=5`
4. **Verify metrics**: All Phase2 >= 75
5. **Create PR**: With all documentation
6. **Code review**: (3-4 hours)
7. **Merge to main**: Deploy to production
8. **Monitor**: First week metrics
9. **Auto-restore runs**: Nightly at 3 AM

---

## 📞 Support

**Questions about implementation?**
- See: `AI_TASK_BRIEFING.md` (detailed code examples)

**Questions about why?**
- See: `project_review.md` (SWOT analysis)

**Questions for non-technical team?**
- See: `SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md`

**Questions about quality?**
- See: `CONTENT_QUALITY_MATRIX.md`

---

**Last Updated**: January 5, 2026  
**Version**: 1.0  
**Status**: Ready for AI Implementation

🔴 **CRITICAL: Start with AI_TASK_BRIEFING.md**