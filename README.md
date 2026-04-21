# 🧘 ZenMaster v8.0 (Modernized April 2026)

**Automated Content Factory for Yandex.Dzen**
*Deep Retention storytelling with multi-modal visual intelligence.*

> **Status (April 2026):** Production Ready.
> Focus on 2026 standards: High retention (4500 chars), confessional style, and smart internal visuals.

---

## 🚀 Key Features (v8.0 April 2026 Update)

### 1. Confessional Skaz 2.0
AI-Human Fusion engine that mimics natural speech patterns.
- **Stumbling Effects:** Imitates picking words for 100% human-like feel.
- **4th Wall Breaks:** Direct interaction with the audience to boost comments.
- **Physiology over Adjectives:** Focus on bodily sensations for emotional depth.

### 2. Smart Visual Hooks
The system automatically detects emotional peaks in the text.
- **Multi-Image:** Generates 1 cover + 2 internal photos per article.
- **Context-Aware:** Images illustrate specific objects/scenes mentioned in the paragraph.
- **iPhone 15 Pro Quality:** Authenticity filters for bypassing Dzen's stock-photo detection.

### 3. Retention-First Budget
Optimized for the 2026 Dzen algorithm.
- **4500 chars limit:** Maximum read-through rate and optimized ad revenue.
- **Temporal Anchors:** Injects real-time context (Date, Season, Weather) into the story.
- **Auto-Relinking:** Automatically links to previous successful articles to keep users on your channel.

---

## 🛠 Features (Standard)

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