# ZenMaster v7.0 - Simplified Generation - Quick Start Guide

## 🎯 One-Line Command for Clean Text

```bash
npx ts-node cli.ts factory --count=1 --no-anti-detection --no-cleanup --theme="Я нашла своё лицо на чужом фото"
```

**That's it!** Your article will be ready to publish.

---

## 📋 What Each Flag Does

### `--no-anti-detection`
- ❌ Disables Phase 2 processing (perplexity, burstiness, skaz)
- ✅ Episodes are clean from the first generation
- ✅ No text corruption from post-processing

### `--no-cleanup`
- ❌ Disables cleanup gates (FinalArticleCleanupGate, ArticlePublishGate)
- ✅ Direct output from AI
- ✅ No "fixing" that introduces errors

### `--theme="Your theme"`
- Specific theme for the article
- Higher priority than config
- Example: `--theme="Я нашла своё лицо на чужом фото. Теперь я знаю правду"`

---

## 🚀 Common Use Cases

### 1. Generate 1 Article (Quick Test)
```bash
npx ts-node cli.ts factory --count=1 --no-anti-detection --no-cleanup --theme="Тема"
```

### 2. Generate with Cover Image
```bash
npx ts-node cli.ts factory --count=1 --no-anti-detection --no-cleanup --images --theme="Тема"
```

### 3. Generate 5 Articles
```bash
npx ts-node cli.ts factory --count=5 --no-anti-detection --no-cleanup
```

### 4. For Specific Channel
```bash
npx ts-node cli.ts factory --count=1 --channel=women-35-60 --no-anti-detection --no-cleanup
```

---

## 📝 Example Output

```
╔════════════════════════════════════════════════════════════════╗
║   🏭 ZenMaster v4.0 - Content Factory                           ║
╚════════════════════════════════════════════════════════════════╝

📑 Generating 1 articles (SIMPLIFIED mode, 3 parallel workers) with 19000 char budget...

📊 Dynamic episode allocation: 10 episodes for 19000 chars
🚫 Anti-detection DISABLED - simplified generation mode
🚫 Cleanup gates DISABLED - direct output

  🎬 Article 1/1 - Generating...
     📑 Theme: Тема
     📋 Generating outline + plotBible...
     ✅ Outline ready with plotBible
        - Narrator: 45 y/o female
        - Tone: confessional, intimate
        - Sensory palette: холодный чай, телефон, зеркало, старое фото...
🔄 Stage 1: Generating 10 episodes sequentially...
   🎬 Episode 1/10 - Starting generation...
      🚫 Skipping Phase 2 (anti-detection disabled)
      ✅ Episode 1: 3124 chars
   🎬 Episode 2/10 - Starting generation...
      🚫 Skipping Phase 2 (anti-detection disabled)
      ✅ Episode 2: 2891 chars
   ...
🎯 Generating lede (600-900) and finale (1200-1800)...
🗰 Generating title (55-90 chars)...

🚫 Skipping cleanup gates (simplified mode)

✅ ARTICLE COMPLETE
📊 Metrics:
   - Episodes: 10
   - Characters: 18745 (target: 19000)
   - Utilization: 98.7%
   - Reading time: 9 min
   - Scenes: 10
   - Dialogues: 60
   - Phase 2 Score: 0/100
   - Anti-Detection: ❌ Not applied
   - Cover image: Pending (will be generated in orchestrator)

     ✅ Complete (142.3s, 18745 chars)
```

---

## 🎭 First Person Perspective

**Always enforced!** The prompts ensure:
- ✅ "я увидела", "мне показалось", "я думала"
- ❌ No "героиня увидела", "персонаж почувствовал"
- ✅ Confessional tone throughout
- ✅ Personal diary style

---

## 🔍 Quality Checks

The simplified mode automatically checks for:
1. ✅ First person perspective (no third-person slips)
2. ✅ No artifacts ([note], [TODO], markdown)
3. ✅ No repeated phrases ("вот в чём дело", etc.)
4. ✅ Proper episode length (1500-3500 chars)

---

## 📂 Output Location

Articles are saved to:
```
./articles/<channel-name>/<YYYY-MM-DD>/<article-title>.md
```

Example:
```
./articles/women-35-60/2025-12-25/ya-nashla-svoe-litso-na-chuzhom-foto.md
```

---

## ⚡️ Performance

**Simplified Mode:**
- Generation time: ~2-3 minutes per article
- API calls: ~10 per article
- Text quality: Clean, direct from AI

**Full Mode:**
- Generation time: ~5-7 minutes per article
- API calls: ~55 per article
- Text quality: Risk of corruption from processing

---

## 🐛 Troubleshooting

### Text is still corrupted?
1. Check theme is clear and specific
2. Try shorter episode count: `--count=5` instead of `--count=10`
3. Verify first person is used in theme

### Article too short?
- Increase episode count in generator (default 10)
- Or use full mode for anti-detection to expand text

### First person lost?
- Check prompt includes "ОТ ПЕРВОГО ЛИЦА"
- Try using SimpleArticleGenerator directly

---

## 📖 Full Documentation

See: `docs/v7.0-simplified-generation.md`

---

**Version**: 7.0  
**Status**: ✅ Production Ready  
**Recommended**: Use simplified mode for clean, natural text
