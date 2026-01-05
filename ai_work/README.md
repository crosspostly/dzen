# 📖 AI Work Directory - Complete ZenMaster Documentation

**Purpose**: Central hub for AI task briefing, system architecture, and implementation guides

**Last Updated**: January 5, 2026 | **Status**: Production-Ready v7.1

---

## 📂 What's Inside

This directory contains everything needed to understand, implement, and optimize the ZenMaster article generation system.

### 📋 Core Documents

#### 1. **`AI_TASK_BRIEFING.md`** (✨ START HERE FOR IMPLEMENTATION)

**For**: AI/ML Engineers, Full-stack developers
**Size**: 31 KB | **Read Time**: 45 minutes

**Contains**:
- ❌ 5 critical system failures (with code)
- ✅ 5 solution blocks (A-E) with complete implementation
- 📓 All Stage 0, 1, 2, 3 prompts in Russian & English
- 🔧 Quality gate implementation
- 📋 Levenshtein distance function for duplicate detection
- ✅ Full verification checklist

**Use This To**: Implement fixes, understand critical failures, build quality assurance

---

#### 2. **`VOICE_RESTORATION_GUIDE.md`** (🔧 AUTO-RESTORATION FOR EMOTIONAL IMPACT)

**For**: Developers, QA engineers, content strategists
**Size**: 12.7 KB | **Read Time**: 20 minutes

**Contains**:
- 🎭 RAW vs RESTORED article comparison
- 🔄 Restoration process (6 stages)
- 🏠 Section-by-section restoration techniques
- 💚 Implementation with VoiceRestorationService
- 📊 Quality metrics (facts preserved, emotional impact, etc.)
- ⚠️ Common mistakes and how to avoid them

**Use This To**: Understand voice restoration, implement the auto-restorer, optimize emotional impact

---

#### 3. **`CONTENT_QUALITY_MATRIX.md`** (📊 METRICS & TARGETS)

**For**: QA team, product managers, data analysts
**Size**: 7.2 KB | **Read Time**: 15 minutes

**Contains**:
- 🎯 5 core quality dimensions
- 📊 Detailed metrics (scroll depth, time on page, comments, shares)
- 🔱 Phase 2 anti-detection scoring
- ✅ Quality targets by stage
- 💯 Overall quality scoring algorithm

**Use This To**: Define success criteria, validate articles, track quality improvements

---

#### 4. **`SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md`** (📖 FOR YOUR TEAM)

**For**: Product managers, non-technical stakeholders, team leads
**Size**: 5.4 KB | **Read Time**: 10 minutes

**Contains**:
- 🎬 What is ZenMaster? (simple explanation)
- 4️⃣ How it works (4 main stages)
- 🎭 7 article archetypes (explained simply)
- 🔧 13 NPM scripts (what each does)
- 🚀 Scaling strategy (from 1 to 1,000 articles)
- ✅ Pre-launch checklist

**Use This To**: Brief your team, explain system to non-technical people, plan scaling

---

#### 5. **`project_review.md`** (📓 SWOT & ROADMAP)

**For**: Product strategists, project managers, decision makers
**Size**: 13 KB | **Read Time**: 20 minutes

**Contains**:
- 📊 SWOT Analysis (4 quadrants)
- 🔧 15 active services (analysis)
- 📊 13 NPM scripts (explained)
- 📊 13 recommendations (prioritized)
- 📄 28-week implementation roadmap

**Use This To**: Strategic planning, identify bottlenecks, prioritize improvements

---

## 📄 How to Use This Documentation

### If You're a Developer

```
1. Read: AI_TASK_BRIEFING.md (full)
   ↓
2. Read: VOICE_RESTORATION_GUIDE.md (implementation section)
   ↓
3. Implement blocks A-E from briefing
   ↓
4. Integrate VoiceRestorationService
   ↓
5. Test: npm run both --count=5
   ↓
6. Verify: Phase 2 Score ≥ 75 on all articles
```

### If You're a Product Manager

```
1. Read: SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md (full)
   ↓
2. Read: project_review.md (full)
   ↓
3. Share SYSTEM_EXPLAINED with team
   ↓
4. Use CONTENT_QUALITY_MATRIX for KPIs
   ↓
5. Plan scaling based on roadmap
```

### If You're QA/Quality

```
1. Read: CONTENT_QUALITY_MATRIX.md (full)
   ↓
2. Read: VOICE_RESTORATION_GUIDE.md (quality metrics section)
   ↓
3. Read: AI_TASK_BRIEFING.md (Stage 3 & 4 sections)
   ↓
4. Build quality checks based on matrix
   ↓
5. Set up Phase 2 scoring dashboard
```

---

## 🚀 Quick Start (For Developers)

### Installation

```bash
# Clone and install
git clone https://github.com/crosspostly/dzen.git
cd dzen
npm install

# Set environment
export GEMINI_API_KEY="your-key-here"
```

### Test Generation (Both Mode)

```bash
# Generate 1 pair (RAW + RESTORED)
npm run both --count=1 --channel=test-channel --images

# Generate 5 pairs
npm run both --count=5 --channel=women-35-60

# Generate without images (faster)
npm run both --count=10 --channel=health-tips
```

### Verify Quality

```bash
# Run validation
npm run validate

# Check Phase 2 Score on generated articles
# Should be ≥ 75/100 for publication
```

---

## 📊 Document Map

```
📖 This README (You are here)
    │
    ├─ 📋 AI_TASK_BRIEFING.md (IMPLEMENTATION)
    │  │
    │  ├─ Block A: Phase 0 Outline Engineer Fix
    │  ├─ Block B: Phase 1 Episode Generation Fix  
    │  ├─ Block C: Phase 2 Narrative Assembly Fix
    │  ├─ Block D: Phase 3 Voice Restoration (🔧)
    │  ├─ Block E: Phase 4 Quality Gates & Validation
    │  └─ All Russian/English prompts + verification
    │
    ├─ 🔧 VOICE_RESTORATION_GUIDE.md (AUTO-EMOTIONAL)
    │  │
    │  ├─ RAW vs RESTORED examples
    │  ├─ 6-stage restoration process
    │  ├─ Section-specific techniques
    │  ├─ Quality metrics & verification
    │  └─ Common mistakes & solutions
    │
    ├─ 📊 CONTENT_QUALITY_MATRIX.md (METRICS)
    │  │
    │  ├─ 5 quality dimensions
    │  ├─ Scoring algorithm
    │  ├─ Quality targets by stage
    │  └─ Performance dashboard template
    │
    ├─ 📖 SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md (FOR TEAM)
    │  │
    │  ├─ Simple explanation
    │  ├─ 4 main stages
    │  ├─ 7 archetypes
    │  ├─ NPM scripts
    │  └─ Scaling strategy
    │
    └─ 📓 project_review.md (STRATEGY)
       │
       ├─ SWOT analysis
       ├─ Service analysis
       ├─ Recommendations
       └─ 28-week roadmap
```

---

## 📅 Documentation Versions

| Document | Version | Updated | Status |
|----------|---------|---------|--------|
| AI_TASK_BRIEFING.md | 1.0 | Jan 5, 2026 | ✅ Ready |
| VOICE_RESTORATION_GUIDE.md | 1.0 | Jan 5, 2026 | ✅ Ready |
| CONTENT_QUALITY_MATRIX.md | 1.0 | Jan 5, 2026 | ✅ Ready |
| SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md | 1.0 | Jan 5, 2026 | ✅ Ready |
| project_review.md | 1.0 | Jan 5, 2026 | ✅ Ready |
| README.md | 1.0 | Jan 5, 2026 | ✅ Ready |

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Days 1-3)
- [ ] Read all 5 core documents
- [ ] Set up development environment
- [ ] Deploy VoiceRestorationService
- [ ] Test basic generation (both mode)

### Phase 2: Integration (Days 4-5)
- [ ] Implement blocks A-E from briefing
- [ ] Integrate quality gates
- [ ] Build Phase 2 scoring system
- [ ] Test on 10 articles

### Phase 3: Validation (Days 6-7)
- [ ] Verify facts preservation (100%)
- [ ] Check Phase 2 scores (75+)
- [ ] Validate emotional restoration
- [ ] Compare RAW vs RESTORED metrics

### Phase 4: Production (Days 8-10)
- [ ] Deploy to staging
- [ ] Monitor article generation
- [ ] Collect engagement metrics
- [ ] Optimize based on data

---

## ⚠️ Critical Notes

### 🚀 Voice Restoration (v7.1)
- **NEW**: Automatic article restoration system
- **Service**: `VoiceRestorationService.ts` (11.4 KB)
- **Techniques**: 6-stage process covering all sections
- **Output**: RAW + RESTORED pairs for A/B testing

### 🔧 CLI Command: `npm run both`
- **Default mode** (v7.1)
- Generates 2 articles per request (RAW + RESTORED)
- Faster than factory mode (20-25 min for 1 pair)
- Perfect for testing & small batches

### 🗑️ Quality Control
- Phase 2 Score target: 75+ / 100
- Character count: 15,000-25,000
- Scroll depth estimate: 70%+
- Comments estimate: 30+

---

## 🗑️ Support & Questions

**Technical Questions?**
- Read AI_TASK_BRIEFING.md blocks A-E
- Check VOICE_RESTORATION_GUIDE.md implementation

**Quality Issues?**
- Consult CONTENT_QUALITY_MATRIX.md
- Compare against VOICE_RESTORATION_GUIDE quality metrics

**Strategic Planning?**
- Use project_review.md roadmap
- Reference SYSTEM_EXPLAINED for team briefing

---

## 🔗 External Links

**GitHub Repository**: https://github.com/crosspostly/dzen

**File Locations**:
- Core service: `services/voiceRestorationService.ts`
- CLI entry: `cli.ts` (both & factory commands)
- Config: `config/dzen-channels.config.ts`

---

**Last Updated**: January 5, 2026 | **Maintained By**: crosspostly | **License**: Proprietary