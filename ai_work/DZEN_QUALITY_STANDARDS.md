# 📄 DZEN QUALITY STANDARDS

**Version**: 3.0  
**Last Updated**: January 5, 2026  
**Purpose**: Define quality metrics, gate criteria, and checklist system

---

## 📦 STAGE GATE CRITERIA

### Stage 1 Output: Episodes (Phase2 >= 70)

#### Per-Episode Metrics
```
✅ Length: 2500-4000 characters
✅ Phase2 Score: >= 70/100
✅ Uniqueness: Levenshtein distance > 0.75 from others
✅ Contains hook: First 3 sentences grab attention
✅ Character consistency: Matches dossier, no contradictions
✅ Dialogue presence: 20-40% of text
```

#### Character Dossier Completeness
```json
{
  "name": "Marina",
  "physical_markers": [
    "Light hazel eyes with gold flecks",
    "Auburn hair with gray streak at temple",
    "Scar on left wrist (barely visible)"
  ],
  "voice_patterns": [
    "Says 'I mean' when thinking",
    "Repeats important words: 'No, no, no'",
    "Uses metaphors about water/waves"
  ],
  "consistent_behaviors": [
    "Morning coffee ritual (never skips)",
    "Fidgets with ring when anxious",
    "Laughs at own jokes (rare)"
  ]
}
```

#### Auto-Restore Rule for Stage 1
```
IF Phase2Score < 70:
  → AUTO-RESTORE (max 3 attempts)
  → Each attempt: enhance emotion, details, tone
  → Check Phase2Score again

IF Phase2Score still < 70 after 3 attempts:
  → REGENERATE EPISODE completely
```

**Gate**: All episodes Phase2 >= 70 before Stage 2

---

### Stage 2 Output: RAW Article (~18K chars)

#### Structure Requirements
```
✅ LEDE (600-900 chars)
   └─ Emotional hook, no explanation
   └─ Establishes central question
   └─ Introduces protagonist & conflict

✅ EPISODE WEAVING (14-16K chars)
   └─ Episodes 1-3: Tension build
   └─ Episodes 4-5: Stakes escalation
   └─ Episodes 6-7: Climax & revelation
   └─ Episodes 8+: Resolution (if complete)

✅ FINALE (800-1200 chars)
   └─ Closed ending (not open)
   └─ Clear outcome stated
   └─ Final reflection for reader
```

#### Quality Checks
```
✅ Total length: 15,000-20,000 chars
✅ Episode flow: No jarring transitions
✅ Tone consistency: Same narrator throughout
✅ Tension arc: Builds toward climax
```

#### AI-Detection Status
```
EXPECTED: 60-70% (ZeroGPT, Originality.ai)
REASON: Raw, unprocessed assembly
ACTION: Don't worry, Stages 3-4 will fix
```

**Gate**: Passed to Stage 3 automatically (no rejection at this stage)

---

### Stage 3 Output: Voice-Restored Article (Phase2 >= 85)

#### DZEN GURU Rules Applied

**Rule 1: Dialogue Formatting**
```
✅ Format:
— Where were you?
— At home.
— For how long?

❌ NOT:
"Where were you?" she asked.
"At home," I replied.
```

**Rule 2: Maximum 3 Complex Names**
```
✅ GOOD: Marina, Ivan, Mother-in-law (or nicknames)
❌ BAD: Marina, Ivan, Viktor Pavlovich, Ekaterina, Mikhail, Svetlana...
→ Solution: Use relationships after first mention
   "Marina told Ivan, and he said... Mother-in-law heard..."
```

**Rule 3: Sentence Variation**
```
✅ Pattern:
Door. Opened. Then I entered the room where mother, father, and grandmother sat.
We looked at each other. No one spoke for five minutes.
Then she smiled.

❌ Avoid:
I entered. They were there. We didn't speak. Silence was heavy.
I felt sad. My heart hurt. Everything was wrong.
```

Metric: StdDev of sentence length >= 6.5

**Rule 4: NO AI Clichés**
```
❌ FORBIDDEN (instant rejection):
- "бездонные голубые глаза" (bottomless blue eyes)
- "длинные плавные ресницы" (long elegant lashes)
- "черные атласные волосы" (black satin hair)
- "я чувствовала боль в груди" (I felt pain in my chest)
- "жизнь никогда не будет прежней" (life will never be same)
- "I had an epiphany", "As a language model", "Allow me to explain"

✅ REPLACEMENT (human, specific):
- "He looked past me, like always" (shows behavior, not describes eye color)
- "I noticed gray in his hair and understood" (shows realization)
- "Tears flowed, I hid my face" (action, not emotion description)
- "Sun was bright at 11am, it was warm" (specific time, sensation)
```

**Rule 5: Character Evolution**
```
✅ Required changes:

 Before: Protagonist has problem/weakness
   → Example: Naive, trusting, dependent

 Middle: Attempts solutions, learns
   → Example: Tries leaving (fails), tries confrontation (fails)

 Turning point: External event forces change
   → Example: Discovers betrayal, loses resources

 After: New behaviors, new perspective
   → Example: Independent, careful, resilient

 Visible proof: Changed action at end
   → Example: Confidently rejects old partner's attempts to reconcile
```

**Rule 6: Oral Delivery Test**
```
READ ALOUD, TRACK:
✓ Where do you naturally pause? (insert punctuation)
✓ Where do you lose breath? (break into sentences)
✓ Where is pronunciation difficult? (simplify words)
✓ Does it flow like human speech? (YES = PASS)

Target: Readable aloud without stumbling
Use case: Article should be narrable for YouTube
```

#### Auto-Restore Loop for Stage 3
```
While Phase2Score < 85:
  → Re-apply DZEN GURU rules
  → Focus on: voice markers, dialogue, character evolution
  → Check Phase2Score again
  → Max 2 attempts

IF Phase2Score still < 85 after 2 attempts:
  → REGENERATE ARTICLE from Stage 2
```

**Gate**: Phase2Score >= 85 before Stage 4

---

### Stage 4 Output: Anti-AI Article (Score >= 80)

#### Component Scores (must all pass)

**Component 1: Perplexity (Weight: 60%)**
```
Target: >= 3.0
Measures: Word entropy (how unpredictable words are)

Passes if:
✅ Common words replaced with rare synonyms (40%+)
✅ Sentence structure inverted (20%+)
✅ Archaic forms used sparingly (5-10%)

Score: (Perplexity / 4.0) * 100
```

**Component 2: Burstiness (Weight: 15%)**
```
Target: StdDev >= 6.5
Measures: Sentence length variation

Passes if:
   Short. Very short. Then a sentence of medium length.
   And finally a very long sentence that spans multiple ideas and
   specific examples with concrete details about what happened next.

Pattern: 1-3 words | 5-8 words | 12-18 words | 25+ words

Score: (StdDev / 10.0) * 100
```

**Component 3: Authenticity (Weight: 15%)**
```
Target: >= 75
Measures: Human-like voice markers

Passes if:
✅ Dialogue realistic (40-50% of text)
✅ Character voice distinct (particles, habits)
✅ Concrete details present (2+ per page)
✅ Emotional authenticity (fragments, repetitions)
✅ No AI patterns detected

Score: Manual assessment (0-100)
```

**Component 4: No Clichés (Weight: 10%)**
```
Target: >= 80
Measures: Absence of banned phrases

Passes if:
✅ Contains 0 forbidden phrases
✅ All descriptions are specific
✅ No "I felt"/"I thought" filler
✅ Unique details present (3+ per page)

Score: (100 if pass, 0 if 1+ detected)
```

#### Final Score Calculation
```
OverallScore = 
  (Perplexity * 0.60) +
  (Burstiness * 0.15) +
  (Authenticity * 0.15) +
  (NoCliche * 0.10)

MUST be >= 80 to pass Gatekeeper
```

#### Gatekeeper Checklist (ALL must pass)
```
✅ Perplexity >= 3.0
✅ Burstiness StdDev >= 6.5
✅ Authenticity Score >= 75
✅ Content length 1500-2500 chars
✅ No forbidden clichés
✅ Dialogues 40-50% of text
✅ Character evolution visible
✅ Final Score >= 80/100
```

**If ANY fails**:
```
→ Return to Stage 3 (not Stage 2)
→ Re-apply voice rules only
→ Reprocess through Stage 4
→ Max 2 attempts total
```

**Gate**: Score >= 80 before Stage 5

---

### Stage 5 Output: Final Approval (Checklist >= 8)

#### 10-Point Quality Checklist

```
☐ 1. First sentence creates TENSION?
     ✓ Hook question or emotional moment
     ✓ Reader can't skip
     Example: "I found out he cheated when I was already pregnant."

☐ 2. Turning point at ~30% of article?
     ✓ Event that changes everything
     Example: "Then I saw his message."

☐ 3. Climax at ~60% of article?
     ✓ Peak confrontation or decision
     Example: "I threw the ring in his face and left."

☐ 4. Reveal/Twist at ~85% of article?
     ✓ Unexpected turn or realization
     Example: "But then I understood - this saved me."

☐ 5. Ending is CLOSED (not open)?
     ✓ All plot threads resolved
     ✓ Character in new stable position
     ✓ Not: "...and I'm still deciding" (open)
     ✓ YES: "I'm happy now and he texted but I said no" (closed)

☐ 6. Reads naturally ALOUD?
     ✓ No stumbling on words
     ✓ Punctuation supports natural pauses
     ✓ Could be narrated for YouTube

☐ 7. NO AI clichés?
     ✓ Check for forbidden phrases
     ✓ Descriptions are specific
     ✓ Examples: "eyes with gold flecks" not "bottomless blue eyes"

☐ 8. Dialogues 40-50% of content?
     ✓ Not pure narration
     ✓ Characters have voice
     ✓ Conversations drive story

☐ 9. Character visibly CHANGED?
     ✓ Different at end than beginning
     ✓ Change is shown through action/behavior
     ✓ Not just stated ("I was different")
     ✓ YES: "I said no to him" (shows strength)

☐ 10. Maximum 3 complex names?
      ✓ Easy to remember
      ✓ Pronunciation clear
      ✓ Rest use relationships
```

#### Scoring & Action
```
8-10 CHECKMARKS → ✅ PUBLISH
                  Article ready for Dzen
                  Expected: 70%+ scroll depth, 30+ comments

6-7 CHECKMARKS  → ⚠️ CONDITIONAL
                  Return to Stage 3
                  Fix specific issues, reprocess Stages 3-4

<6 CHECKMARKS   → ❌ REJECT
                  Restart from Stage 2
                  Fundamental structural issues
```

---

## 📈 MEASUREMENT DASHBOARD

### Per-Article Metrics

```
Article: "Marina's Comeback"
Generated: 2026-01-05

┌──────────────────────────┐
│ INPUT METRICS                                │
├──────────────────────────┤
│ PlotBible Completeness:  100% ✅            │
│ Archetype Alignment:     95%  ✅            │
└──────────────────────────┘

┌──────────────────────────┐
│ STAGE OUTPUTS                                │
├──────────────────────────┤
│ Stage 1 (Episodes):      7 episodes  ✅      │
│   Phase2 avg:            78/100  ✅           │
│                                                │
│ Stage 2 (Raw Article):   18,240 chars  ✅  │
│   AI Detection:          68% (expected)      │
│                                                │
│ Stage 3 (Voice):         Phase2: 87/100  ✅  │
│   Dzen Rules Applied:    6/6  ✅             │
│                                                │
│ Stage 4 (Anti-AI):       Score: 84/100  ✅  │
│   Perplexity:           3.2/4.0  ✅          │
│   Burstiness:           7.3 StdDev  ✅       │
│   Authenticity:         76/100  ✅           │
│   No Clichés:            100/100  ✅         │
│                                                │
│   ZeroGPT:              14%  ✅ (<15%)        │
│   Originality.ai:       17%  ✅ (<20%)        │
└──────────────────────────┘

┌──────────────────────────┐
│ STAGE 5: CHECKLIST                           │
├──────────────────────────┤
│ ✅ 1. Opening hook:         YES                 │
│ ✅ 2. Turn at 30%:          YES (week 2)         │
│ ✅ 3. Climax at 60%:        YES (confrontation) │
│ ✅ 4. Reveal at 85%:        YES (understanding) │
│ ✅ 5. Closed ending:        YES (new life)      │
│ ✅ 6. Reads naturally:      YES (tested)        │
│ ✅ 7. No clichés:           YES (verified)      │
│ ✅ 8. Dialogues 40-50%:     YES (42%)           │
│ ✅ 9. Character evolved:    YES (dependent→strong) │
│ ✅ 10. Max 3 names:         YES (Marina, Ivan, MIL) │
├──────────────────────────┤
│ CHECKLIST SCORE:        10/10  ✅            │
│ STATUS:                 PUBLISH  ✅            │
└──────────────────────────┘

┌──────────────────────────┐
│ EXPECTED DZEN PERFORMANCE                     │
├──────────────────────────┤
│ Scroll Depth:           72% (estimated)      │
│ Avg Read Time:          8 min (good)         │
│ Comments:               40-50 (expected)     │
│ Likes:                  250-350 (expected)   │
│ Shares:                 30-50 (expected)     │
│ AI-Detection Risk:      LOW (<15%)  ✅       │
└──────────────────────────┘
```

---

## 🚴 TROUBLESHOOTING

### Problem: Phase2Score stuck at 65-75
**Solution:**
- Check for AI clichés (forbidden list)
- Increase sentence variation (mix very short + very long)
- Add more authentic voice markers (particles, repetitions)
- Read aloud for natural flow

### Problem: Authenticity Score < 75
**Solution:**
- Increase dialogue % (aim for 45%)
- Add concrete physical details (not abstract emotions)
- Use character-specific speech patterns
- Test reading aloud - where does it sound robotic?

### Problem: Checklist fails on specific point
**Solution:**
- Return to Stage 3 (not Stage 2)
- Fix only the failed point
- Reprocess Stages 4-5
- Don't rebuild entire article

### Problem: Stage 5 passes but Dzen performance is weak
**Possible issues:**
- Topic not interesting to audience
- Archetype doesn't match audience expectations
- Opening hook isn't compelling enough
- Consider different topic for next article

---

## 🔐 KEY PRINCIPLES

1. **Gate Each Stage**: Don't move forward if criteria not met
2. **Auto-Restore on Failure**: Retry within stage before moving back
3. **No Skipping**: Every stage builds on previous
4. **Human Final Decision**: Stage 5 checklist is human judgment
5. **Measurable Metrics**: Every gate has numbers
6. **Clear Feedback**: Always know why something failed

---

**Status**: ✅ Complete & Ready for Integration  
**Implementation**: Use as QA gates in orchestrator  
**Monitoring**: Track metrics per article for optimization
