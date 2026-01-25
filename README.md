# 🧘 ZenMaster v7.0 (Stable)

**Automated Content Factory for Yandex.Dzen**
*AI-powered storytelling with visual intelligence.*

> **Status (Jan 2026):** Production Ready.
> Focus on clean narrative, cinematic visuals, and 100% stability.

---

## 🚀 Key Features

### 1. 📝 Simplified Generation Mode
Direct, first-person narrative generation without "garbage" artifacts.
- **Flag:** `--no-anti-detection --no-cleanup`
- **Result:** Clean, natural Russian language ("Я почувствовала...", not "Героиня испытала...").

### 2. 🎨 Visual DNA (Cinematic Covers)
The system "reads" the story before drawing.
- Extracts emotion and plot (e.g., "Betrayal in the kitchen").
- Sets lighting, camera angle, and action.
- **Output:** Cinematic, authentic-looking images (no generic stock photos).

### 3. 🧠 RAG (Style Injection)
Uses real successful Dzen articles to train the AI on the fly.
- Analyzes `parsed_examples.json`.
- Injects "One-Shot Examples" into the prompt.
- **Result:** Viral structure and engaging tone.

### 4. 🛡️ Auto-Restore Strategy
Never lose an article.
- If generation fails, the system retries 5 times.
- Uses different models (Flash -> Pro -> Lite).
- **Success Rate:** 100% (Fallback to original if all else fails).

---

## ⚡ Quick Start

### Generate 1 Article (Clean Mode + Images)
```bash
npx ts-node cli.ts factory --count=1 --no-anti-detection --no-cleanup --images --theme="Я нашла письмо мужа"
```

### Restore Broken Articles
```bash
./scripts/restore-articles-safe.js
```

---

## 📚 Documentation

| Section | Description | Path |
|---------|-------------|------|
| **📖 Guides** | How to use RSS, Setup, Config | [`docs/guides/`](./docs/guides/) |
| **🏗 Architecture** | System design and logic | [`docs/architecture/`](./docs/architecture/) |
| **⚖️ Standards** | Quality matrix and rules | [`docs/standards/`](./docs/standards/) |
| **📊 Reports** | Issue fixes and summaries | [`docs/reports/`](./docs/reports/) |

### Essential Docs
- [**Quick Start Guide**](./docs/guides/QUICK_START.md)
- [**Setup Guide**](./docs/guides/SETUP_GUIDE.md)
- [**RSS Feed Specification**](./docs/project/RSS_FEED_SPEC.md)

---

## 📂 Project Structure

- `services/` - Core logic (Agents, Image Gen, RAG).
- `articles/` - Generated content (Markdown + Images).
- `docs/` - Current documentation.
- `archive/` - Legacy scripts and reports (v4-v6).