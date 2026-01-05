# 📖 ZenMaster System Explained for Humans + Script Analysis

**Date**: January 5, 2026 | **Audience**: Non-technical stakeholders, product managers, content strategists

---

## 📤 What is ZenMaster?

ZenMaster is an **AI article factory** that creates thousands of high-quality articles for Яндекс Дзен. 

**Simple example**:
- **Input**: "I suffered for 20 years" + "Comeback Queen" archetype
- **Processing**: AI generates complete article (15,000+ characters)
- **Output**: Ready-to-publish article with images

---

## 🎬 How It Works: 4 Main Stages

### Stage 0: Outline (5 min)
**AI creates story blueprint**
```
Theme: "I was the worst daughter-in-law"
↓
Outline:
Part 1: Mother-in-law mocked me publicly
Part 2: I decided to leave and start business
Part 3: First 3 months - pain
Part 4: Month 6 - first clients
Part 5: Year 1 - earning 500K/month
Part 6: Mother-in-law calls for job
Part 7: I hire her on MY terms
```

### Stage 1: Episodes (15 min)
**AI writes 7-12 scenes, 3,000-4,000 characters each**

Each episode has:
- Hook (question that captures attention)
- External conflict (what happened)
- Internal emotion (what narrator felt)
- Turning point (what changed)
- Open loop (reader wonders what's next)

### Stage 2: Assembly (10 min)
**AI fills gaps between episodes**

| Part | Length | Purpose |
|------|--------|----------|
| Lede | 600-900 | Hook reader |
| Development | 1,500-2,000 | Build tension |
| Climax | 1,200-1,600 | Confrontation |
| Resolution | 1,000-1,300 | Victory |
| Finale | 1,200-1,800 | Powerful ending |

### Stage 3: Quality Check (5 min)
**System validates article**
- Minimum 15,000 characters?
- Correct structure (lede, climax, finale)?
- No prohibited content?

### Stage 4: Images (30 min)
**AI generates cover image, makes it look like real phone photo**

---

## 🎭 7 Article Archetypes

### 1. **Comeback Queen** ★★★★★
**Arc**: Public humiliation → Quiet action → Spectacular success

**Timeline**: 1-3 months (FAST)
**Victory**: Financial + social
**Result**: +25% higher engagement

**Example**: Mocked for marrying taxi driver → Starts business → Makes 500K/month

### 2. **Gold Digger Trap** ★★★★★
**Arc**: Misunderstanding → Truth revealed → Power reversal

**Timeline**: 1-3 months
**Victory**: Financial + power
**Result**: +30% engagement (shock factor)

**Example**: Family thinks she married for money → She's the earner → She's the boss

### 3. **Phoenix** ★★★★★
**Arc**: Abandonment → Healing → Transformation

**Timeline**: 6-12 months
**Victory**: Emotional + professional
**Result**: +20% engagement

**Example**: Husband leaves → She transforms → They meet again, she's successful

### 4-7: Other Types
- **Entrepreneur**: "They didn't believe in me until I had 1M revenue"
- **Inheritance Reveal**: "My father left me money, now family shows their true faces"
- **Mother Wins**: "I fought the system to protect my children"
- **Wisdom Earned**: "20 years of suffering taught me this one lesson"

---

## 🔧 NPM Scripts (Buttons You Click)

### Main Scripts

**`npm run both`** (DEFAULT)
- Creates 2 articles: RAW + RESTORED
- Time: 20-25 minutes
- Use: When you want maximum content

**`npm run factory`** (Batch)
- Creates 1-100 articles
- Time: 1 hour for 10 articles, 24 hours for 100
- Use: Mass generation for multiple channels

**`npm run validate`**
- Checks if your config is correct
- Use: Before running batch mode

**`npm run list-projects`**
- Shows all your Дзен channels

**`npm run feed:generate`**
- Creates RSS feed for distribution

---

## 📊 Quality Metrics Explained

### What Makes an Article "Good"?

| Metric | Target | Why |
|--------|--------|-----|
| **Length** | 15,000-30,000 chars | More = better monetization |
| **Reading Time** | 30-40 minutes | Keeps users engaged |
| **Scroll Depth** | 70%+ | Algorithm loves scroll |
| **Comments** | 50+ | Social proof |
| **Shares** | 30+ | People recommend it |

### Phase 2 Score (AI Detection)

**Score meaning**:
- 70-100: Looks human-written (✅ good)
- 50-70: Might be AI (⚠ risky)
- 0-50: Obviously AI (❌ bad)

**Components**:
- Sentence variety (short, medium, long patterns)
- Natural speech (incomplete sentences, interjections)
- Russian idioms and colloquialisms

---

## 🛠 Pro Tips

### Tip 1: Use "Comeback Queen" First
Fastest results, highest engagement

### Tip 2: Start with "Both" Mode
Get 2 articles from 1 generation

### Tip 3: Batch at Night
Generate 10-25 articles, publish slowly (3-4/day)
Avoids algorithm over-saturation

### Tip 4: Skip Images for Some Archetypes
Images = +30 min per article
Worth it for "Comeback Queen", skip for "Wisdom Earned"

### Tip 5: Always Aim for 15K+ Characters
Shorter articles = worse scroll depth
Longer articles = more money

---

## 🚀 Scaling from 1 to 1,000 Articles

**Week 1-2**: Test 5 articles manually (both mode)
**Week 3-4**: First batch 50 articles (factory mode)
**Month 2-3**: Scale to 200-300 articles
**Month 4-6**: Production mode 1,000+ articles

---

## ✅ Pre-Launch Checklist

- [ ] Install Node.js
- [ ] Set GEMINI_API_KEY
- [ ] Run `npm run validate`
- [ ] Test 1 article (`npm run both --count=1`)
- [ ] Check article quality (15K+ chars)
- [ ] Check image quality (looks real)
- [ ] Publish to Дзен
- [ ] Monitor for 1 week
- [ ] Scale up

---

**Version**: 1.0 | **Last Updated**: January 5, 2026