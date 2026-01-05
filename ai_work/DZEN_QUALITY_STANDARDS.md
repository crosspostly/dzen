# 📊 DZEN Quality Standards

**Purpose**: WHAT quality looks like for Dzen content
**Target Audience**: QA engineers, product managers, content strategists
**Version**: 1.0 | **Updated**: January 5, 2026

---

## Table of Contents

1. [Quality Gates](#quality-gates)
2. [Phase 2 Scoring](#phase-2-scoring)
3. [DZEN GURU Rules](#dzen-guru-rules)
4. [Engagement Metrics](#engagement-metrics)
5. [Anti-Detection Metrics](#anti-detection-metrics)
6. [Manual Checklist](#manual-checklist)

---

## 🚪 Quality Gates

### Stage-by-Stage Thresholds

| Stage | Metric | Threshold | Auto-Retry | Fail Action |
|-------|---------|-----------|-------------|-------------|
| **Stage 0** | PlotBible completeness | 100% | No | Manual review |
| **Stage 1** | Episode uniqueness | Levenshtein > 0.75 | Regenerate | Manual review |
| **Stage 1** | Phase 2 Score per episode | >= 70 | 3 attempts | Regenerate episode |
| **Stage 2** | Article length | 15-25K chars | Regenerate | Manual review |
| **Stage 2** | Phase 2 Score (acceptable) | 60-70% | No | Continue (OK) |
| **Stage 3** | Phase 2 Score (target) | >= 85 | 2 attempts | Regenerate Stage 2 |
| **Stage 4** | Perplexity | >= 3.0 | Return to Stage 3 | Manual review |
| **Stage 4** | Burstiness StdDev | >= 6.5 | Return to Stage 3 | Manual review |
| **Stage 4** | Authenticity | >= 75 | Return to Stage 3 | Manual review |
| **Stage 4** | Overall Score | >= 80/100 | Return to Stage 3 | Manual review |
| **Stage 5** | Checklist | 8+ checks | No | Manual review/rewrite |

---

### Gate Flowchart

```
Stage 1: Episode Generation
  ↓
  Phase 2 Score < 70?
    ├─ YES → Auto-restore (max 3 attempts)
    │         ├─ Pass → Save episode
    │         └─ Fail (after 3) → Regenerate episode
    └─ NO → Save episode

Stage 2: Article Assembly
  ↓
  Skip phase 2 check (acceptable 60-70%)

Stage 3: Voice Restoration
  ↓
  Phase 2 Score < 85?
    ├─ YES → Auto-restore (max 2 attempts)
    │         ├─ Pass → Continue to Stage 4
    │         └─ Fail (after 2) → Regenerate Stage 2
    └─ NO → Continue to Stage 4

Stage 4: Anti-Detection
  ↓
  Overall Score < 80?
    ├─ YES → Return to Stage 3
    │         └─ RE-APPLY voice restoration ONLY (not regenerate!)
    └─ NO → Continue to Stage 5

Stage 5: Quality Checklist
  ↓
  Checklist < 8 checks?
    ├─ YES → Manual review / Rewrite
    └─ NO → PUBLISH ✅
```

---

## 🔥 Phase 2 Scoring

### Overview

Phase 2 Score measures "human-ness" of text across 6 dimensions.

### 6 Components

#### 1. Perplexity Score (0-100)

**Definition**: Text unpredictability for AI models

**How to achieve**:
- Unexpected transitions ("And suddenly she realized...")
- Local dialect and slang ("damn", "blin", "okay")
- Personal expressions in parentheses ("(honestly speaking)")
- Self-interruptions ("But first... no, let me tell correctly...")

**Bad examples**:
- Common words: "was", "did", "said"
- Predictable constructions
- Academic style

**Good examples**:
- Rare synonyms: "this situation" instead of "it was"
- Archaic forms (rarely): "iseche", "ekhat"
- Local expressions

**Target**: >= 75/100

---

#### 2. Sentence Variance (0-100)

**Definition**: Sentence length variation

**How to achieve**:
- 1-2 words. Then phrase of 40 words. Then 3 words again.
- Don't let text become monotonous
- Different paragraph sizes (1 line, then 8 lines)

**Bad example**:
```
I came home. Opened door. Went inside. Sat together.
```

**Good example**:
```
Door. Opened. Then I entered room where mother, father and grandma sat.
```

**Target**: >= 70/100

---

#### 3. Colloquialism (0-100)

**Definition**: Conversational expression proportion

**How to achieve**:
- "straight-here-like-this"
- "okay there"
- "scared-to-ask"
- "understand, like..."

**Bad**:
- Formal constructions
- Academic style
- Perfect grammar

**Good**:
- Contractions: "ne zachotela", "kakaya-to", "po-moemu"
- Hesitation: "Well, here...", "Understand...", "Honestly speaking..."
- Self-questions: "Maybe I'm wrong?", "Why was I silent?"

**Target**: >= 75/100

---

#### 4. Emotional Authenticity (0-100)

**Definition**: Emotional depth and authenticity

**How to achieve**:
- Physical sensations: "trembling back", "chest pain"
- Direct addresses: "Imagine: I stand..."
- Grammar violations in emotional moments: "Just... couldn't."
- Repetitions for effect: "Couldn't, couldn't, couldn't."

**Bad**:
- "I was sad" (abstract)
- "it was hard" (not specific)
- No emotional reactions

**Good**:
- "eyes reddened, lump in throat"
- "hands shaking, trembling"
- "knees not holding"
- "tongue trembling, not speaking right"

**Target**: >= 70/100

---

#### 5. Fragmentary (0-100) 🆕 v5.2

**Definition**: Incomplete, fragmented sentences like live speech

**How to achieve**:
- Don't know.
- Don't know at all.
- Sorry.
- Can't...

**Bad**:
- All sentences complete and correct
- No fragments

**Good**:
- "Not good... bad? Under-hearing..."
- "In the middle... there, where..."

**Target**: >= 50/100

---

#### 6. Repetition (0-100) 🆕 v5.2

**Definition**: Natural word/phrase repetition like remembering

**How to achieve**:
- People repeat key words when nervous
- "I couldn't. Just couldn't."
- "Three days. Three days it lasted."

**Bad**:
- No repetitions
- Too different words

**Good**:
- Natural echoes
- Repetitions for emphasis

**Target**: >= 55/100

---

### Overall Score Formula

```
Phase 2 Score = (
  Perplexity × 0.20 +
  Sentence Variance × 0.20 +
  Colloquialism × 0.20 +
  Emotional Authenticity × 0.15 +
  Fragmentary × 0.15 +
  Repetition × 0.10
)
```

### Component Breakdown by Stage

| Component | Stage 1 Threshold | Stage 3 Threshold | Stage 4 Target |
|-----------|-------------------|-------------------|----------------|
| Perplexity | >= 70 | >= 85 | >= 75 |
| Sentence Variance | >= 65 | >= 85 | >= 70 |
| Colloquialism | >= 70 | >= 85 | >= 75 |
| Emotional Authenticity | >= 65 | >= 80 | >= 70 |
| Fragmentary | >= 45 | >= 55 | >= 50 |
| Repetition | >= 50 | >= 60 | >= 55 |
| **Overall Phase 2** | **>= 70** | **>= 85** | **>= 80** |

---

## 🎯 DZEN GURU Rules

### Overview

6 critical rules to make text sound like written by human.

### Rule 1: Dialogue Formatting

**❌ BAD - Quotes**:
```
"Where were you?" she asked.
"At home."
"For long?"
```

**✅ GOOD - Dashes**:
```
— Where were you?
   — At home.
   — For long?
```

**Why**: Real people don't speak in quotes. Dashes feel more natural.

---

### Rule 2: Max 3 Complex Names

**❌ BAD**:
```
Marina, Ivan, Viktor Pavlovich Koltsov, Ekaterina Petrovna, Uncle Nikolay...
```

**✅ GOOD**:
```
Marina, Ivan, Mother-in-law (then just "she", "he")
```

**Why**: More than 3 complex names confuses readers. They can't remember who's who.

---

### Rule 3: Alternating Sentences

**❌ BAD - Monotonous**:
```
I came home. I opened the door. I went inside. I sat at the table. I ate dinner.
(All ~6-8 words, same structure)

```

**✅ GOOD - Varied**:
```
I came home.
The door was unlocked.
Inside, mother and father were already sitting.
— Where were you? — father asked.
(Short, medium, long, dialogue)

```

**Why**: Monotonous text sounds like AI. Varied text sounds human.

---

### Rule 4: NO AI Clichés!

**❌ BANNED Clichés**:
- "bottomless blue eyes"
- "unruly curls"
- "fatal beauty"
- "sun ray broke through"
- "heavy on my heart"
- "it was hard"
- "difficult situation"

**✅ FRESH EXPRESSIONS**:
- "eyes like someone who hasn't slept a week"
- "a storm on her head - she dyed her hair 10 times yesterday"
- "sun stung my eyes, annoyingly"
- "chest squeezed like a fist"
- "couldn't, just couldn't"

**Why**: AI clichés scream "generated by AI". Fresh expressions feel human.

---

### Rule 5: Character Evolution

**❌ BAD - No Evolution**:
```
At start: She was shy and afraid.
At end: She was shy and afraid. (NO CHANGE!)
```

**✅ GOOD - Shows Evolution**:
```
At start: "I couldn't speak. I was afraid of everyone."
At end: "Now I speak to everyone. I'm not afraid anymore."
(SHOW change, don't just say it)

```

**Why**: Readers want to see character grow. No evolution = boring story.

---

### Rule 6: Read Aloud!

**❌ BAD - Unnatural**:
```
She proceeded to the location and proceeded to initiate a conversation.
(Sounds academic, not spoken)

```

**✅ GOOD - Natural**:
```
She went there.
Started talking.
"Hey," she said.
(Sounds like someone speaking)

```

**Why**: If it's hard to pronounce or sounds unnatural, it sounds like AI.

---

### How to Verify Each Rule

| Rule | How to Check | Tools |
|------|--------------|--------|
| 1. Dialogues in dashes | Search for `"` quotes | Manual / Regex |
| 2. Max 3 complex names | Count names with 3+ words | Manual / Script |
| 3. Alternating sentences | Analyze sentence length distribution | Script / AI |
| 4. NO AI clichés | Search for banned phrases | Regex list |
| 5. Character evolution | Compare start vs end | Manual / AI |
| 6. Read aloud | Read entire text | Human |

---

## 📈 Engagement Metrics

### Dzen Platform Metrics

| Metric | Definition | Good | Excellent |
|--------|-----------|-------|-----------|
| **Views** | Article views | >1,000 | >10,000 |
| **Scroll Depth** | % scroll to end | >60% | >75% |
| **Time on Page** | Avg time on article | >2 min | >4 min |
| **Comments** | Number of comments | >20 | >50 |
| **Likes** | Number of likes | >100 | >500 |
| **Shares** | Number of reposts | >10 | >50 |
| **Engagement Rate** | (likes + comments) / views | >3% | >7% |

### Quality Indicators

**Good Quality Signs**:
- Readers tag friends ("@mom, look at this")
- Personal stories in comments
- Emotional reactions (😭, 😡, ❤️)
- Return visitors (readers come back for more)

**Bad Quality Signs**:
- "This is AI!" comments
- Low scroll depth (<40%)
- Many negative comments
- High bounce rate (>60%)

---

## 🤖 Anti-Detection Metrics

### External Services

| Service | Methodology | Target | How to Measure |
|---------|-------------|--------|----------------|
| **ZeroGPT** | NLP analysis | <15% | API / Upload |
| **Originality.ai** | Multi-model | <20% | API / Upload |
| **Copyleaks** | Plagiarism check | <25% | API / Upload |
| **GPTZero** | Perplexity + burstiness | <20% | API / Upload |

### Internal Phase 2 Score

**Correlation with External Services**:

| Phase 2 Score | ZeroGPT | Originality.ai | Pass Probability |
|---------------|----------|-----------------|-------------------|
| 90-100 | 0-10% | 0-15% | 99% |
| 80-89 | 10-20% | 15-25% | 95% |
| 70-79 | 20-35% | 25-40% | 70% |
| 60-69 | 35-50% | 40-55% | 40% |
| <60 | >50% | >55% | 10% |

---

## ✅ Manual Checklist

### Stage 5: 10-Point Checklist

**Run BEFORE publishing**:

#### Structure (5 points)

□ **First sentence hooks?**
   - ✓ Tension, question, surprise
   - ✗ Boring abstract

□ **Turning point at 30%?**
   - Something unexpected changes everything

□ **Climax at 60%?**
   - Peak drama/tension

□ **Resolution at 85%?**
   - Unexpected twist or revelation

□ **Ending CLOSED?**
   - ✓ All questions resolved, justice prevails
   - ✗ Open ending (readers disappointed)

#### Style (5 points)

□ **Dialogues 40-50%?**
   - Not boring

□ **NO AI-clichés?**
   - No "bottomless eyes", "unruly curls"

□ **Character changed by end?**
   - Shown externally or behaviorally

□ **Max 3 complex names?**
   - Readable, not confusing

□ **Reads naturally?**
   - Not "wooden" or robotic

### Scoring

- **8-10 checks** → ✅ PUBLISH
- **6-7 checks** → ⚠️ REWRITE PARTS
- **<6 checks** → ❌ FULL REWRITE

---

## 📊 Quality Dashboard (TODO)

### Metrics to Track

**Over Time**:
- Phase 2 Score trends
- AI-detection comparison (ZeroGPT vs Originality.ai)
- Engagement metrics (views, comments, shares)
- Quality gate pass/fail rates
- Article performance by archetype

**By Archetype**:
- Average Phase 2 Score per archetype
- Engagement rate per archetype
- AI-detection rate per archetype
- Most successful topics

**By Channel**:
- Dzen channel performance
- Audience demographics
- Best posting times

---

## 🎯 Key Takeaways

1. **Stage 3 MUST be BEFORE Stage 4** ⚠️
   - Stage 3 makes text "alive"
   - Stage 4 adds "anti-detection"
   - If Stage 4 before Stage 3 → lose text liveliness

2. **Phase 2 Score is KEY** 🔥
   - 6 components, each weighted
   - Stage 1: >= 70
   - Stage 3: >= 85
   - Stage 4: >= 80

3. **DZEN GURU Rules are NON-NEGOTIABLE**
   - Dialogues in dashes (NOT quotes)
   - Max 3 complex names
   - Alternating sentences
   - NO AI clichés
   - Character evolution
   - Read aloud!

4. **Endings MUST be CLOSED**
   - Open endings kill engagement
   - Readers want resolution

---

## 📚 Related Resources

- **ARTICLE_GENERATION_ALGORITHM.md** - HOW the pipeline works
- **IMPLEMENTATION_ROADMAP.md** - HOW to build it

---

**Version**: 1.0
**Updated**: January 5, 2026
**Support**: crosspostly
