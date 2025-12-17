# ZenMaster v2.0 - Multi-Agent Longform Generation

> Автоматическая генерация 35-40K символов лонгридов для Яндекс.Дзена

---

## 🚀 Quick Start

```bash
# 1. Set API key
export GEMINI_API_KEY="your-gemini-api-key"

# 2. Generate article
npx tsx cli.ts generate:v2 --theme="Я терпела это 20 лет"

# Or use npm script
npm run generate:v2 -- --theme="Your theme"
```

---

## 📚 Documentation Index

### Phase 1 (Complete)
| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[QUICK_START.md](QUICK_START.md)** | Quick reference & common commands | 2 min |
| **[SETUP_GITHUB_SECRETS.md](SETUP_GITHUB_SECRETS.md)** | Configure GitHub Actions | 3 min |
| **[PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)** | Integration completion status | 2 min |
| **[ZENMASTER_V2_INTEGRATION.md](ZENMASTER_V2_INTEGRATION.md)** | Full integration guide | 10 min |
| **[CHANGELOG_PHASE1.md](CHANGELOG_PHASE1.md)** | Detailed changelog | 5 min |
| **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** | Complete summary | 8 min |

### Phase 2 (Ready to Implement)
| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[PHASE2_ANTI_DETECTION.md](PHASE2_ANTI_DETECTION.md)** | Anti-Detection specifications | 10 min |
| **[PHASE2_STATUS.md](PHASE2_STATUS.md)** | Phase 2 implementation status | 5 min |
| **[services/antiDetection/README.md](services/antiDetection/README.md)** | Component documentation | 3 min |

### General
| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[ZENMASTER_V2_README.md](ZENMASTER_V2_README.md)** | Architecture overview | 15 min |

---

## ✨ What's New in v2.0

### 🎯 Features
- **35K+ character longform** articles (3-4x longer than v1.0)
- **Multi-agent parallel processing** (12 episodes simultaneously)
- **Structured pipeline** (Outline → Draft → Anti-Detection → Humanization → QA)
- **Anti-Detection Engine** (Phase 2) - AI detection < 15% 🔥
- **Automated workflow** (every 3 hours)
- **Voice passport** (7 consistent author habits)

### 📊 Metrics
- **Characters**: 32,000-40,000 ✨
- **Reading time**: 6-10 minutes
- **Episodes**: 9-12
- **Scenes**: 8-10
- **Dialogues**: 6-10
- **Generation time**: 8-10 minutes

### 🔧 Technical
- **Stage 0**: Outline (Gemini 2.5-Pro)
- **Stage 1**: Episodes (12× Gemini 2.5-Flash in parallel)
- **Future**: Montage, Humanization, Quality Control

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│ Stage 0: Outline Engineering        │ ← Gemini 2.5-Pro
│ (Structure 12 episodes)             │   2 minutes
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 1: Parallel Draft             │ ← 12× Gemini 2.5-Flash
│ (12 episodes simultaneously)        │   5-7 minutes
│ + Context Manager                   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 2: Montage (Phase 2)          │ ← Future
│ (Optimize scene transitions)        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 3: Humanization (Phase 3)     │ ← Future
│ (6-level voice editing)             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 4: Quality Control (Phase 4)  │ ← Future
│ (AI detection < 30%)                │
└──────────────┬──────────────────────┘
               ↓
         🎉 35K+ ARTICLE READY
```

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/crosspostly/dzen.git
cd dzen

# Checkout v2.0 branch
git checkout feature/zenmaster-v2-phase1-integration

# Install dependencies
npm install
```

---

## 🔑 Configuration

### Local Development
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### GitHub Actions
1. Go to **Settings → Secrets and variables → Actions**
2. Add secret: `GEMINI_API_KEY`
3. See [SETUP_GITHUB_SECRETS.md](SETUP_GITHUB_SECRETS.md) for details

---

## 💻 Usage

### Basic Generation
```bash
npx tsx cli.ts generate:v2 --theme="Я услышала одну фразу"
```

### Full Parameters
```bash
npx tsx cli.ts generate:v2 \
  --theme="Я терпела это 20 лет" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60"
```

### Parameters

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| `--theme` | Any text | Required | Main story theme |
| `--angle` | confession, scandal, observer | confession | Narrative perspective |
| `--emotion` | triumph, guilt, shame, liberation, anger | triumph | Dominant emotion |
| `--audience` | Any text | Women 35-60 | Target audience |

---

## 🤖 GitHub Actions

### Automatic Schedule
Workflow runs every 3 hours:
- 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC

### Manual Trigger
1. Go to **Actions** tab
2. Select **ZenMaster v2.0 - Generate Every 3 Hours**
3. Click **Run workflow**
4. Wait 8-10 minutes

---

## 📁 Output

Articles saved to:
```
generated/articles/article_YYYY-MM-DDTHH-MM-SS.json
```

### Structure
```json
{
  "id": "article_123...",
  "title": "Я терпела это 20 лет...",
  "lede": "600-900 chars opening...",
  "episodes": [
    {
      "id": 1,
      "title": "Episode 1",
      "content": "2400-3200 chars...",
      "charCount": 2800,
      "openLoop": "What happens next?"
    },
    // ... 11 more episodes
  ],
  "finale": "1200-1800 chars closing...",
  "voicePassport": { /* author voice patterns */ },
  "metadata": {
    "totalChars": 35847,
    "totalReadingTime": 8,
    "episodeCount": 12,
    "sceneCount": 9,
    "dialogueCount": 7
  }
}
```

---

## 🧪 Testing

### Integration Tests
```bash
npx tsx test-integration.ts
```

### Type Checking
```bash
npx tsc --noEmit
```

### Local Generation Test
```bash
export GEMINI_API_KEY="your-key"
npx tsx cli.ts generate:v2 --theme="Test" --verbose
```

---

## 🎯 Roadmap

### ✅ Phase 1: Core Generation (COMPLETE)
- [x] Type definitions
- [x] Multi-agent service
- [x] CLI command
- [x] GitHub Actions workflow
- [x] Documentation
- [x] Integration tests

### ⏳ Phase 2: Montage (PLANNED)
- [ ] Detect middle sag (episodes 4-7)
- [ ] Strengthen open loops
- [ ] Optimize scene transitions

### ⏳ Phase 3: Humanization (PLANNED)
- [ ] 6-level voice editing
- [ ] Geography & daily life specificity
- [ ] Memory & associations
- [ ] Dynamic thinking patterns
- [ ] Natural dialogues
- [ ] Show, don't tell
- [ ] Non-preachy morals

### ⏳ Phase 4: Quality Control (PLANNED)
- [ ] Pre-publication checklist
- [ ] AI detection < 30%
- [ ] Burstiness score > 7
- [ ] Scene count validation
- [ ] Dialogue count validation

---

## 🐛 Known Issues

### Non-Critical (Pre-existing)
- `App.tsx:60` - Missing method (doesn't affect v2.0)
- `services/playwrightService.ts` - Missing dependency (doesn't affect v2.0)

These errors don't impact ZenMaster v2.0 functionality.

---

## 🆚 v1.0 vs v2.0

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Characters | 10-15K | 32-40K |
| Episodes | 1 continuous | 9-12 episodic |
| Generation | Single-threaded | Multi-agent parallel |
| Voice | Inconsistent | Voice passport (7 habits) |
| Structure | Hook-Dev-Climax-Res | Outline → 12 Episodes |
| Generation Time | 3-5 min | 8-10 min |
| Reading Time | 2-4 min | 6-10 min |

---

## 📞 Support

### Documentation
- Quick questions: See [QUICK_START.md](QUICK_START.md)
- Setup help: See [SETUP_GITHUB_SECRETS.md](SETUP_GITHUB_SECRETS.md)
- Integration details: See [ZENMASTER_V2_INTEGRATION.md](ZENMASTER_V2_INTEGRATION.md)

### Troubleshooting
- Check workflow logs in Actions tab
- Run integration tests: `npx tsx test-integration.ts`
- Verify TypeScript: `npx tsc --noEmit`

---

## 🤝 Contributing

This is Phase 1. Future contributions welcome for:
- Phase 2: Montage Service
- Phase 3: Humanization Service
- Phase 4: Quality Control Service

---

## 📄 License

See repository license file.

---

## 🙏 Credits

- Architecture: ZenMaster v2.0 Specification
- Integration: December 2024
- Model: Google Gemini 2.5 (Pro & Flash)

---

## 📈 Status

**Current Version**: 2.0.0-phase1  
**Status**: ✅ Complete & Ready for Testing  
**Branch**: `feature/zenmaster-v2-phase1-integration`  
**Last Updated**: December 17, 2024  

---

## 🎉 Get Started Now

1. **[Setup API Key](SETUP_GITHUB_SECRETS.md)** (3 minutes)
2. **[Read Quick Start](QUICK_START.md)** (2 minutes)
3. **Generate Your First Article** (10 minutes)

```bash
export GEMINI_API_KEY="your-key"
npx tsx cli.ts generate:v2 --theme="Я терпела это 20 лет"
```

---

**Happy Generating! 🚀**
