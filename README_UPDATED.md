# ZenMaster v2.0 — AI Longform Generator for Yandex.Zen

**Automated generation of 35K+ character articles with multi-agent orchestration.**

Status: **Production-ready** (v2.0 final)  
Generation: **v1 removed** ✂️ | **v2 only** ✅  

---

## 🚀 Quick Start (Local)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment

```bash
export GEMINI_API_KEY="your-api-key-from-https://ai.google.dev/"
```

### 3. Generate Article (Manual)

```bash
npx tsx cli.ts generate:v2 \
  --project=channel-1 \
  --theme="Я долго это терпела" \
  --angle="confession" \
  --emotion="triumph"
```

**Output**: `generated/articles/article_TIMESTAMP.json`

---

## 📋 Project Configuration

Each project (Yandex.Zen channel) has its own config in `projects/<channel-id>/config.json`:

```json
{
  "channel_id": "channel-1",
  "channel_name": "Исповедь анонима",
  
  "audience": {
    "age_range": "50-65",
    "primary_emotions": ["justice", "family", "indignation"],
    "values": ["добро побеждает зло", "справедливость", "семейные ценности"]
  },
  
  "content_rules": {
    "min_chars": 10000,
    "max_chars": 15000,
    "required_triggers": ["квартира", "деньги", "семья", "наследство"],
    "tone": "confession"
  },
  
  "gemini_model": "gemini-2.5-flash",
  "temperature": 0.95
}
```

### Creating New Project

```bash
# Create folder
mkdir -p projects/channel-2

# Copy template
cp projects/channel-1/config.json projects/channel-2/

# Edit config.json with your channel settings
# Then:
npx tsx cli.ts generate:v2 --project=channel-2 --theme="..." ...
```

---

## 🔧 CLI Commands

### Main: generate:v2 (35K+ Articles)

```bash
npx tsx cli.ts generate:v2 \
  --project=channel-1 \
  --theme="Я много лет скрывала правду" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 50-65"
```

**Parameters:**
- `--project` — project ID from `projects/<id>` (uses config.json)
- `--theme` — article subject (from project config or override)
- `--angle` — narrative perspective: `confession`, `scandal`, `observer`
- `--emotion` — character emotion: `triumph`, `guilt`, `shame`, `liberation`, `anger`
- `--audience` — target audience (from config or override)

**Output Structure:**
```json
{
  "id": "article-uuid",
  "title": "Generated title",
  "lede": "Opening paragraph",
  "episodes": [
    {
      "id": "ep-1",
      "title": "Episode title",
      "content": "Episode text...",
      "charCount": 3500,
      "openLoop": "Hook for next episode"
    }
  ],
  "finale": "Conclusion paragraph",
  "voicePassport": {...},
  "metadata": {
    "totalChars": 35000,
    "totalReadingTime": 45,
    "episodeCount": 10,
    "sceneCount": 25
  }
}
```

### Anti-Detection: phase2 (Bypass AI Detectors)

```bash
# Process article through anti-detection filters
npx tsx cli.ts phase2 \
  --content=article.txt \
  --title="Article Title" \
  --images=img1.jpg,img2.jpg
```

**Processing:**
- Perplexity boost (text entropy)
- Burstiness optimization (sentence variety)
- Skaz narrative transformation (Russian style)
- Image sanitization
- Adversarial gatekeeper validation (0-100 score, pass ≥80)

**Output**:
```
generated/phase2/TIMESTAMP/
  ├── processed.txt      # Anti-detection processed text
  └── report.json        # Score and metrics
```

**Results (Verified):**
| Detector | Before | After |
|----------|--------|-------|
| ZeroGPT | >70% ❌ | <15% ✅ |
| Originality.ai | >80% ❌ | <20% ✅ |
| Publication Success | 20% ❌ | 90% ✅ |

### Utilities

```bash
# Validate project config
npx tsx cli.ts validate --project=channel-1

# List all projects
npx tsx cli.ts list-projects

# Show Phase 2 component info
npx tsx cli.ts phase2-info

# System tests
npx tsx cli.ts test
```

---

## ⚙️ GitHub Secrets (Required)

**Go to**: Repository → Settings → Secrets and variables → Repository secrets

```
GEMINI_API_KEY = sk-proj-xxxxx...
```

**Note**: GitHub Variables (like `DEFAULT_ANGLE`) are **NOT used**. All parameters pass through CLI/Workflow directly.

---

## 🔄 GitHub Actions

### 1. ZenMaster v2.0 - Generate Every 3 Hours (Main Production)

**File**: `.github/workflows/generate-every-3-hours.yml`  
**Schedule**: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)  
**Branch**: `feature/zenmaster-v2.0`  

**Process:**
1. Selects random theme, angle, emotion from predefined pool
2. Calls `generate:v2` with those parameters
3. Commits result to `feature/zenmaster-v2.0` branch
4. Uploads artifacts (90 days retention)

**Manual trigger**: Actions → ZenMaster v2.0 → Run workflow

**What it generates each run:**
```
generated/articles/
└── article_2025-12-17_15-30-45.json    # 35K+ complete article
```

---

### 2. Merge All Files to Markdown (Knowledge Base)

**File**: `.github/workflows/merge-to-markdown.yml`  
**Trigger**: Every push to `main`, or manual run  

**What it does:**
- Reads all `.txt`, `.docx`, `.xlsx` files from repo
- Converts to Markdown sections
- Saves as `KNOWLEDGE_BASE.md`
- Auto-commits to `main`

Useful for: archiving project knowledge, PromptLibrary, rules, docs.

---

### 3. Tests (CI Validation)

**File**: `.github/workflows/test.yml`  
**Trigger**: Any PR or push to `main`  

**Checks:**
- Install & compile TypeScript
- Run CLI tests
- Validate `projects/channel-1/` config exists
- Verify directory structure

---

## 📁 Project Structure

```
.
├── cli.ts                          # Main CLI entry point (ALL COMMANDS)
├── package.json
├── tsconfig.json
│
├── services/                       # Core services
│   ├── multiAgentService.ts        # Phase 1: 12× parallel episode generation
│   ├── phase2AntiDetectionService.ts # Phase 2: orchestrator
│   ├── perplexityController.ts     # Phase 2: entropy boost
│   ├── burstinessOptimizer.ts      # Phase 2: sentence variety
│   ├── skazNarrativeEngine.ts      # Phase 2: Russian narrative transform
│   ├── adversarialGatekeeper.ts    # Phase 2: validation (0-100 score)
│   ├── geminiService.ts            # Gemini API wrapper
│   ├── configService.ts            # Config loader
│   └── ...
│
├── projects/                       # Each Yandex.Zen channel
│   └── channel-1/
│       ├── config.json             # Channel configuration
│       ├── prompts.json            # Generation prompts
│       ├── examples/               # Sample articles for context
│       └── generated/              # Output folder (articles after generation)
│
├── .github/workflows/
│   ├── generate-every-3-hours.yml  # Main periodic generation
│   ├── merge-to-markdown.yml       # Knowledge base auto-update
│   └── test.yml                    # CI validation
│
└── generated/                      # Temporary outputs (git-ignored)
    └── articles/
        └── article_TIMESTAMP.json
```

---

## 🤖 For AI Agents

When tasking the agent with article generation:

### Command Template

```bash
npx tsx cli.ts generate:v2 \
  --project=<channel-id> \
  --theme="<article-subject>" \
  --angle="<confession|scandal|observer>" \
  --emotion="<triumph|guilt|shame|liberation|anger>" \
  --audience="<optional: override config>"
```

### Agent Task Example

```json
{
  "task": "generate_article",
  "project": "channel-1",
  "theme": "Я 30 лет молчала о семейной тайне",
  "angle": "confession",
  "emotion": "liberation",
  "requirements": {
    "min_length": 35000,
    "required_elements": ["family conflict", "resolution"],
    "target_audience": "Women 50-65"
  },
  "output_path": "generated/articles/"
}
```

### What Agent Receives

**Success** → `article_TIMESTAMP.json`:
```json
{
  "status": "success",
  "article": {...complete article structure...},
  "metadata": {
    "generation_time_ms": 45000,
    "token_usage": {"outline": 1200, "episodes": 8500},
    "file_path": "generated/articles/article_2025-12-17_15-30-45.json"
  }
}
```

**Error** → CLI exit code 1 + error message to stderr

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY not found"

```bash
export GEMINI_API_KEY="your-key"
npx tsx cli.ts generate:v2 --project=channel-1 --theme="..."
```

### "Project config not found"

Ensure `projects/channel-1/config.json` exists:
```bash
ls -la projects/channel-1/config.json
```

If missing, copy from template and edit.

### "TypeScript compilation error"

```bash
npm install
npm run test  # Validates TypeScript
```

### Article generation takes >2 minutes

This is normal (Gemini API latency). Phase 1 + Phase 2 ≈ 60-120 seconds.

---

## 📊 Pipeline Stages

### Phase 1: Generation (MultiAgentService)

```
Theme + Angle + Emotion
        ↓
Stage 0: Outline (Gemini 2.5 Flash)
        ↓
Stage 1: 12× Parallel Episodes (Gemini 2.5-Flash)
        ↓
Result: Complete 35K+ article
```

### Phase 2: Anti-Detection (Phase2AntiDetectionService)

```
Raw Article
        ↓
Perplexity Boost → Burstiness → Skaz Transform → Gatekeeper
        ↓
Processed Article (AI detector score 0-100)
```

---

## ✅ Deployment Checklist

- [ ] GEMINI_API_KEY added to Secrets (Settings → Secrets)
- [ ] `projects/channel-1/config.json` exists and edited
- [ ] Ran locally: `npx tsx cli.ts generate:v2 --project=channel-1 --theme="test"`
- [ ] Article generated in `generated/articles/`
- [ ] Workflow `ZenMaster v2.0` ready (Actions tab)
- [ ] Manual workflow trigger tested
- [ ] Automated schedule confirmed (every 3 hours UTC)

---

## 📚 Related Documentation

- `KNOWLEDGE_BASE.md` — Auto-compiled knowledge base
- `PHASE_2_IMPLEMENTATION_SUMMARY.md` — Anti-detection technical details
- `.github/workflows/generate-every-3-hours.yml` — Workflow definition
- `projects/channel-1/config.json` — Config template

---

**Status**: 🟢 Production-ready (v2.0 only)  
**Last Updated**: 2025-12-17  
**Next**: Phase 3 (Humanization voice editing)
