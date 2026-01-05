# 🎭 ZenMaster: Algorithm for Article Generation

**Purpose**: Complete guide to HOW the article generation pipeline works
**Target Audience**: Developers, content engineers, AI researchers
**Version**: 1.0 | **Updated**: January 5, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [6-Stage Pipeline](#6-stage-pipeline)
3. [Detailed Stage Breakdown](#detailed-stage-breakdown)
4. [Metric Calculations](#metric-calculations)
5. [Retry Logic](#retry-logic)
6. [Code Structure](#code-structure)

---

## 🎯 System Overview

**ZenMaster** generates emotional, human-sounding stories for Dzen with <15% AI-detection.

### Key Capabilities

- **Episode-based storytelling**: Long stories with character development
- **Voice Restoration**: Emotional depth and natural speech patterns
- **Phase 2 Anti-Detection**: AI-detection reduction from 72% to 12%
- **Mobile-authentic images**: Photos that look like real phone shots
- **Automated publishing**: RSS feed for Dzen

### Story Archetypes (7)

| Archetype | Description | Example Theme |
|-----------|-------------|----------------|
| **Comeback Queen** | Return after failure | "I was the worst daughter-in-law, now successful" |
| **Gold Digger Trap** | Trap for the rich | "Thought I married rich, but he was a scammer" |
| **Phoenix** | Rebirth from ashes | "Bankrupt to millionaire in 3 years" |
| **Entrepreneur** | Path to wealth through business | "Courier to CEO" |
| **Mother Wins** | Mother triumphs | "Won custody battle against all odds" |
| **Wisdom Earned** | Wisdom through pain | "Endured mother-in-law for 20 years" |
| **Inheritance Reveal** | Secret inheritance | "Grandpa left me a secret apartment" |

---

## 🔄 6-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 0: PlotBible Engineering                              │
│ Time: ~5 min                                                │
│ Goal: Create story skeleton with archetypes                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: Episodes Generation + Auto-Restore                  │
│ Time: ~15 min                                               │
│ Goal: Generate 7-12 emotional episodes                      │
│ Validation: Phase2 >= 70 (auto-restore max 3 attempts)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: Article Assembly                                   │
│ Time: ~10 min                                               │
│ Goal: Assemble episodes into article with transitions         │
│ AI-detection: 60-70% (acceptable at this stage)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔤 STAGE 3: Voice Restoration + DZEN GURU Rules             │
│ Time: ~5 min                                                │
│ Goal: Animate text, add natural speech patterns             │
│ Validation: Phase2 >= 85 (auto-restore max 2 attempts)    │
│ Applies: Dialogues, style, character evolution              │
│ IF FAIL: Return to Stage 2 (regenerate)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔥 STAGE 4: Phase 2 Anti-Detection (CRITICAL!)             │
│ Time: ~8 min                                                │
│ Goal: Reduce AI-detection to <15%                           │
│ Steps: Perplexity → Burstiness → Authentic → Gatekeeper       │
│ Validation: Overall Score >= 80/100                          │
│ IF FAIL: Return to Stage 3 (re-apply voice, NOT regenerate)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 📊 STAGE 5: Quality Checklist                               │
│ Time: ~3 min                                                │
│ Goal: Final 10-point checklist                                │
│ Validation: 8+ checks = publish                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         🚀 PUBLISH
```

---

## 📝 Detailed Stage Breakdown

### Stage 0: PlotBible Engineering

**File**: `prompts/stage-0-plan.md` | **Service**: `services/plotBibleBuilder.ts`

**Purpose**: Create story skeleton with narrator, archetypes, and episode outlines.

**Output Structure**:
```json
{
  "topic": "Я терпела свекровь 20 лет",
  "narrator": {
    "age": 45,
    "gender": "female",
    "tone": "exclamatory | sad | ironic | didactic",
    "habits": ["Я не хотела, но...", "Может, я ошибалась..."]
  },
  "archetype": "Comeback Queen",
  "sensorPalette": {
    "smells": ["coffee", "dust", "mother-in-law's perfume"],
    "sounds": ["silence", "ticking clock"],
    "textures": ["rough table", "velvet dress"]
  },
  "episodes": [
    {
      "hook": "Should I have kept silent?",
      "conflict": "Mother-in-law says: 'You're too simple'",
      "turning_point": "I decided to prove her wrong"
    }
  ]
}
```

**Rules**:
- Narrator age: 25-65 (realistic)
- 7-12 episodes with clear conflict
- Sensor palette: 3-5 smells, sounds, textures
- Choose one of 7 archetypes

---

### Stage 1: Episodes Generation

**File**: `prompts/stage-1-episodes.md` | **Service**: `services/simpleEpisodeGenerator.ts`

**Purpose**: Generate 7-12 emotional episodes, each 3000-4000 chars.

**Episode Structure**:
1. **Hook** (200 chars): Question that hooks reader
2. **External Conflict** (800 chars): What happened in reality
3. **Internal Emotion** (800 chars): What I felt
4. **Turning Point** (600 chars): What I decided to do
5. **Open Loop** (300 chars): Unsaid, unfinished thought

**Auto-Restore Logic**:
```typescript
FOR EACH episode:
  1. Generate episode (3000-4000 chars)
  2. Check uniqueness (Levenshtein > 0.75 = regenerate)
  3. Calculate Phase2 score
  4. WHILE phase2 < 70 AND attempts < 3:
        - Improve emotion, details, tone
        - Recalculate Phase2
        - attempts++
  5. IF phase2 >= 70: SAVE
     ELSE: regenerate
```

**Rules**:
- Use sensorPalette from PlotBible
- Varying sentence lengths (short, medium, long)
- Incomplete sentences (like real speech)
- Interjections (Oh my, mom, help)
- Consistency with PlotBible

---

### Stage 2: Article Assembly

**File**: `prompts/stage-2-assemble.md` | **Service**: `services/multiAgentService.ts`

**Purpose**: Assemble episodes into article with transitions.

**Article Parts**:
- **Lede** (600-900 chars): Emotional hook with action, not explanation
- **Development** (1500-2000 chars): Tension building, show progress
- **Climax** (1200-1600 chars): Main confrontation scene
- **Resolution** (1000-1300 chars): New position (firm, no doubts)
- **Finale** (1200-1800 chars): CAPS phrase with victory

**CRITICAL**: REWRITE episodes, DO NOT COPY!

**Ending Rules** (ALL MUST BE CLOSED):
1. **Justice Triumphs**: Villain punished, good rewarded
2. **Bitter-Sweet**: Justice with losses
3. **Epilog with Peace**: Closed ending, shows life after
4. ⛔ NEVER: Open endings (readers disappointed!)

**AI-detection at this stage**: 60-70% (acceptable)

---

### Stage 3: Voice Restoration + DZEN GURU Rules ⭐

**File**: `prompts/stage-3-restore.md` | **Service**: `services/voiceRestorationService.ts`

**Purpose**: Animate text, make it "speak" naturally.

**6 DZEN GURU Rules**:

#### Rule 1: Dialogues in Dashes (NOT quotes!)
```
✅ — Where were you?
   — At home.
   — For long?

❌ "Where were you?" she asked.
   "At home."
```

#### Rule 2: Alternating Sentences
```
Short (5-8 words)
Long (15-20 words)
Question?
Exclamation!
Short again
```

#### Rule 3: Max 3 Complex Names
```
Viktor Pavlovich Koltsov → Viktor
Ivanovich → Ivan
Citizen Petrov → Petr
```

#### Rule 4: NO AI Clichés!
```
❌ "bottomless blue eyes"
❌ "unruly curls"
❌ "fatal beauty"
❌ "sun ray broke through"

✅ "eyes like someone who hasn't slept a week"
✅ "a storm on her head - she dyed her hair 10 times yesterday"
✅ "sun stung my eyes, annoyingly"
```

#### Rule 5: Character Evolution
- Show BEFORE (how they were at start)
- Show AFTER (what changed externally/behaviorally)

#### Rule 6: Read Aloud!
- If you lose breath → REWRITE
- If sounds unnatural → REWRITE
- Add natural pauses: "Well...", "Honestly..."

**Auto-Restore Logic**:
```typescript
WHILE phase2 < 85 AND attempts < 2:
  1. Unfold emotion, dialogues, details
  2. Recalculate Phase2
  3. attempts++

IF phase2 >= 85: CONTINUE to Stage 4
ELSE: REGENERATE Stage 2 (return to previous stage)
```

**AI-detection at this stage**: 50-65%

---

### Stage 4: Phase 2 Anti-Detection 🔥

**File**: `services/phase2AntiDetectionService.ts`

**Purpose**: Reduce AI-detection from 72% to 12%.

**4 Steps**:

#### Step 1: Perplexity Controller
**Goal**: Text entropy 1.8 → 3.4+

**How it works**:
- Replace frequent words with rare synonyms
- Use archaic and obsolete forms (rarely!)
- Change word order in sentences
- Add complex syntactic constructions

**Example**:
```
BEFORE: "it was very bad and I was sad"
AFTER:  "this situation proved extremely unfavorable, melancholy seized me"
```

**Target**: Perplexity >= 3.0

---

#### Step 2: Burstiness Optimizer
**Goal**: Sentence length variation 1.2 → 7.1 StdDev+

**How it works**:
- Make one sentence 1-3 words
- Next 20-30 words
- Vary structure (statement, question, exclamation)
- Alternate: SIMPLE → COMPLEX → SIMPLE

**Example**:
```
BEFORE: "I came home. Opened the door. Went inside. Sat together."
AFTER:  "Door. Opened. Then I entered the room where mother, father and grandma sat."
```

**Target**: StdDev >= 6.5

---

#### Step 3: Authentic Narrative Engine
**Goal**: Sound like REAL human.

**How it works**:

**A) Natural Pauses and Rhythm**:
- Read text aloud SLOWLY
- Where you lose breath = REWRITE
- Complex words → replace with simple
- Max 2-3 complex names

**B) Emotional Authenticity**:
- People repeat key words when nervous
- Use fragments ("Don't know. Don't know at all.")
- Add "well", "damn", "okay", "here" (natural words!)
- Show how people remember (incomplete phrases, repetitions)

**C) Live Character Speech**:
- Dialogues in dashes (not quotes)
- Add "um", "hmm", "damn" in speech
- People don't speak perfectly - they stutter, repeat
- Each character speaks differently (grandma vs youth)

**D) Specific Details** (opposite of AI):
- AI: "beautiful dress" → Human: "dress with ruffles, on buttons"
- AI: "she was sad" → Human: "tears flowed, she hid her face"
- AI: "good day" → Human: "sun shone at 11 AM, was warm"
- Add 2-3 UNIQUE details per page

**E) Verification Method: READ ALOUD AND LISTEN**:
- Does it sound natural?
- Can it be voiced (for YouTube)?
- Where are words difficult to pronounce?
- Where are pauses needed?

**Target**: Authenticity Score >= 75

---

#### Step 4: Adversarial Gatekeeper
**Checks before publishing**:
- ✅ Perplexity >= 3.0?
- ✅ Burstiness StdDev >= 6.5?
- ✅ Authenticity Score >= 75?
- ✅ Content length 1500-2500 chars?
- ✅ No clichés?
- ✅ Dialogues 40-50%?
- ✅ Character changed?
- ✅ Final Score >= 80/100?

**IF Score < 80**: Return to Stage 3 (re-apply voice only, NOT regenerate)

**Result**:
| Metric | Before | After |
|--------|--------|-------|
| ZeroGPT Detection | 72% ❌ | 12% ✅ |
| Originality.ai | 84% ❌ | 18% ✅ |
| Phase2 Score | 65 | 88 |
| Scroll Depth (Dzen) | 40% | 72% |
| Comments | 10 | 45+ |

---

### Stage 5: Quality Checklist

**File**: `prompts/dzen-quality-checklist.md`

**10 Questions for Verification**:

□ First sentence hooks?
□ Turning point at 30%?
□ Climax at 60%?
□ Resolution at 85%?
□ Ending CLOSED?
□ Dialogues 40-50%?
□ NO AI-clichés?
□ Character changed?
□ Max 3 complex names?
□ Reads naturally?

**Scoring**:
- 8-10 checks → ✅ PUBLISH
- 6-7 checks → ⚠️ REWRITE PARTS
- <6 checks → ❌ FULL REWRITE

---

## 📊 Metric Calculations

### Phase 2 Score Formula

**6 Components**:
1. **Perplexity Score** (0-100): Word choice entropy and rarity
2. **Sentence Variance** (0-100): Sentence length variation
3. **Colloquialism** (0-100): Natural speech patterns
4. **Emotional Authenticity** (0-100): Emotional depth and authenticity
5. **Fragmentary** (0-100): Incomplete thoughts like natural speech
6. **Repetition** (0-100): Natural word/phrase repetition like memory patterns

**Weighted Formula**:
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

---

## 🔄 Retry Logic

### Stage 1: Episodes

```
FOR EACH episode:
  Generate episode
  Check uniqueness (Levenshtein > 0.75 = regenerate)
  
  Calculate Phase2
  WHILE phase2 < 70 AND attempts < 3:
    Auto-restore episode
    Recalculate Phase2
    attempts++
  
  IF phase2 >= 70: SAVE episode
  ELSE: regenerate episode
```

### Stage 3: Voice Restoration

```
Calculate Phase2 Score
WHILE phase2 < 85 AND attempts < 2:
  Apply voice restoration
  Recalculate Phase2
  attempts++

IF phase2 >= 85: CONTINUE to Stage 4
ELSE: REGENERATE Stage 2 (return to article assembly)
```

### Stage 4: Anti-Detection

```
Calculate Overall Score
IF Overall Score >= 80: CONTINUE to Stage 5
ELSE: RETURN to Stage 3
  └─ RE-APPLY voice restoration only
  └─ DO NOT regenerate entire article
```

**CRITICAL**: When Stage 4 fails, return to Stage 3 to re-apply voice restoration, NOT to regenerate the entire article.

### Stage 5: Quality Checklist

```
Calculate checklist score
IF checklist >= 8: PUBLISH ✅
ELSE: Manual review / Rewrite parts
```

---

## 💻 Code Structure

### File Organization

```
services/
  ├─ stage0-plotBible.ts          # Stage 0: PlotBible generation
  ├─ stage1-episodes.ts           # Stage 1: Episodes generation
  ├─ stage2-assembly.ts           # Stage 2: Article assembly
  ├─ stage3-voiceRestoration.ts    # Stage 3: Voice restoration
  ├─ stage4-antiDetection.ts       # Stage 4: Phase 2 anti-detection
  ├─ stage5-qualityCheck.ts        # Stage 5: Quality checklist
  └─ contentOrchestrator.ts       # Retry logic, stage orchestration

quality/
  ├─ phase2Scorer.ts              # Phase 2 scoring (6 components)
  ├─ dzenRulesValidator.ts        # DZEN GURU rules validation
  └─ qualityGates.ts              # Quality gate logic
```

---

## 🎯 Key Principles

1. **Stage 3 MUST be BEFORE Stage 4** ⚠️
   - Stage 3 makes text "alive" (dialogues, style, characters)
   - Stage 4 adds "anti-detection" (rare words, variation)
   - If applied Stage 4 before Stage 3 → lose text liveliness

2. **Return Logic**:
   - Stage 4 fail → Return to Stage 3 (re-apply voice, NOT regenerate)
   - Stage 3 fail → Regenerate Stage 2

3. **Auto-Restore**:
   - Stage 1: Max 3 attempts (Phase2 >= 70)
   - Stage 3: Max 2 attempts (Phase2 >= 85)

4. **Quality Gates**:
   - Stage 1: Phase2 >= 70
   - Stage 3: Phase2 >= 85
   - Stage 4: Overall Score >= 80
   - Stage 5: Checklist >= 8/10

---

**Version**: 1.0
**Updated**: January 5, 2026
**Support**: crosspostly