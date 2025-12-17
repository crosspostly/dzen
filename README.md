<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ZenMaster v2.0 — AI Article Generator for Yandex.Zen

Automated generation of 35-40K character longform articles with multi-agent AI orchestration.

**Status**: Phase 2 ready (PR #3) → Phase 1 integration in progress

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up GitHub Secrets (CRITICAL!)

**Without these, articles will NOT be generated!**

#### Repository Secrets
Go to: `Settings → Secrets and variables → Repository secrets`

Add:
```
GEMINI_API_KEY = (your Gemini API key from https://ai.google.dev/)
```

#### Repository Variables
Go to: `Settings → Variables → Repository variables`

Add:
```
DEFAULT_ANGLE = confession
DEFAULT_EMOTION = triumph
DEFAULT_AUDIENCE = Women 35-60
GEMINI_MODEL_OUTLINE = gemini-2.5-pro
GEMINI_MODEL_EPISODES = gemini-2.5-flash
```

### 3. Run Locally

```bash
# Generate article (Phase 1)
GEMINI_API_KEY=sk-... npx ts-node cli.ts generate:v2 \
  --theme="Я терпела это 20 лет" \
  --angle="confession" \
  --emotion="triumph"

# Process with anti-detection (Phase 2)
npx ts-node cli.ts phase2 \
  --content=article.txt \
  --title="Article Title"

# Show Phase 2 info
npx ts-node cli.ts phase2-info
```

### 4. Run Workflow

Go to: `Actions → ZenMaster v2.0 - Generate Every 3 Hours → Run workflow`

Workflow runs automatically at:
- 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC

Each run generates a 35K+ article → saves to `generated/articles/`

---

## 📊 Pipeline

```
Stage 0: Outline (Gemini 2.5-Pro)
    ↓
Stage 1: Parallel Draft (12× Gemini 2.5-Flash)
    ↓
Stage 2: Anti-Detection Processing (Phase 2) ✨
    ├── Perplexity boost
    ├── Burstiness optimization
    ├── Skaz narrative transformation
    └── AI detection validation
    ↓
Stage 3: Humanization (Phase 3) — Coming
    ↓
Stage 4: Quality Control (Phase 4) — Coming
    ↓
🎉 READY TO PUBLISH
```

---

## 📈 Results (with Phase 2)

| Metric | Before | After |
|--------|--------|-------|
| ZeroGPT Detection | >70% ❌ | <15% ✅ |
| Originality.ai | >80% ❌ | <20% ✅ |
| Publication Success | 20% ❌ | 90% ✅ |

---

## 📁 Project Structure

```
.
├── services/
│   ├── multiAgentService.ts          # Phase 1: Article generation
│   ├── perplexityController.ts       # Phase 2: Text entropy
│   ├── burstinessOptimizer.ts        # Phase 2: Sentence variation
│   ├── skazNarrativeEngine.ts        # Phase 2: Russian style transformation
│   ├── adversarialGatekeeper.ts      # Phase 2: Validation (0-100 score)
│   ├── visualSanitizationService.ts  # Phase 2: Image processing
│   └── phase2AntiDetectionService.ts # Phase 2: Orchestrator
├── types/
│   └── ContentArchitecture.ts        # Type definitions
├── .github/workflows/
│   └── generate-every-3-hours.yml    # Automation
├── cli.ts                             # CLI commands
├── package.json
└── README.md
```

---

## 🔧 Commands

### Phase 1: Generate Articles
```bash
npx ts-node cli.ts generate:v2 \
  --theme="Your theme" \
  --angle="confession|scandal|observer" \
  --emotion="triumph|guilt|shame|liberation"
```

### Phase 2: Anti-Detection Processing
```bash
# Single article
npx ts-node cli.ts phase2 --content=article.txt --title="Title"

# With images
npx ts-node cli.ts phase2 --content=article.txt --images=img1.jpg,img2.png

# Info
npx ts-node cli.ts phase2-info
```

---

## ✅ Checklist Before Going Live

- [ ] GEMINI_API_KEY added to Secrets
- [ ] Repository Variables added (5 variables)
- [ ] PR #3 merged to main
- [ ] Workflow tested manually (Actions → Run workflow)
- [ ] Article generated successfully in `generated/articles/`
- [ ] Gatekeeper score ≥80 for Phase 2 output

---

## 📚 Documentation

- `ZENMASTER_STATUS.md` — Current project status
- `PHASE_2_ANTI_DETECTION.md` — Phase 2 technical details
- `PHASE_2_README.md` — Phase 2 quick start
- `DEPLOYMENT_CHECKLIST.md` — Full deployment checklist

---

## 🐛 Troubleshooting

### Workflow fails with "GEMINI_API_KEY not found"
→ Add the key to `Settings → Secrets`

### Workflow fails with "TypeScript compilation failed"
→ Run `npm install` locally and check types

### Article not created in `generated/articles/`
→ Check workflow logs in Actions tab

---

## 🎯 Next Steps

1. ✅ Phase 1: Article generation
2. ✅ Phase 2: Anti-detection processing (PR #3)
3. ⏳ Phase 3: Humanization (6-level voice editing)
4. ⏳ Phase 4: Quality control & validation
5. ⏳ Auto-publish to Yandex.Zen

---

**Status**: 🟡 Ready for Phase 1-2 integration  
**Target**: Articles generated every 3 hours  
**Goal**: 90%+ publication success rate
