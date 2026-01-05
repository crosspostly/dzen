# 🔧 Voice Restoration Guide (v7.1)

**Document Purpose**: Explain how the voice restoration system works and how to optimize it

**Target Audience**: Developers, QA, content strategists

**Date**: January 5, 2026

---

## 🎭 What is Voice Restoration?

**Voice Restoration** is the process of transforming RAW articles (clean, neutral) into RESTORED articles (emotional, dramatic, voice-driven).

**Why we need it**:
- **RAW** = AI-perfect, but sounds generic
- **RESTORED** = Human-like, emotional, engaging
- Publishing both lets users choose based on audience

---

## 📊 RAW vs RESTORED

### RAW Article (Clean Version)

```
I felt sad about what happened.
My mother-in-law said mean things.
I decided to leave and start a business.
The first three months were hard.
But I didn't give up.
Now I make 500K per month.
My mother-in-law asked for a job.
I said yes, but on my terms.
```

**Characteristics**:
- Neutral tone, no emotion
- Clear facts, chronological
- Professional language
- No sensory details
- No internal monologue
- Feels AI-generated

### RESTORED Article (Emotional Version)

```
My hands were shaking when she said it.
"You're just a taxi driver's wife," she whispered, loud enough for everyone to hear.
Twenty people at the family dinner. All silent. All staring at me.

Something broke inside me that night.
Not in a bad way. Like a shell cracking open.
I couldn't sleep. Couldn't think about anything except: What if she's right?

But then another voice—MY voice—answered: "No. She's wrong. And I'll prove it."

First client: Month 2.
Second client: Week 3 of Month 3.
By Month 6: 10 clients, 150K income.
Month 12: 50 clients, 500K per month.

And THEN—the phone call I'd been waiting for.
Mother-in-law. Nervous. Asking if there's a job.

I could have said no.
I could have laughed in her face.
Instead, I hired her. But on MY terms.
And she knows it. Every single day, she knows.
```

**Characteristics**:
- Emotional, dramatic
- Sensory details (shaking hands, silence, voices)
- Internal monologue
- Incomplete sentences for impact
- Personal voice throughout
- Feels human-written

---

## 🔄 Restoration Process

### Stage 1: Parse Article
**Goal**: Break article into sections

```
Lede (600-900 chars)
  ↓ Opens with emotion/action, not explanation

Development (1500+ chars)
  ↓ Builds tension, shows internal conflict

Episodes (6-8 × 3000 chars each)
  ↓ Each has: hook → conflict → emotion → turning point → open loop

Climax (1200+ chars)
  ↓ Antagonist reacts, power shifts

Resolution (1000+ chars)
  ↓ New position established, firm victory

Finale (1200+ chars)
  ↓ Challenges reader, doesn't add new info
```

### Stage 2: Restore Each Section
**Goal**: Transform with emotional depth while keeping facts

#### Lede Restoration

**Goal**: Create an irresistible hook

❌ **Before**:
```
My mother-in-law was mean to me.
I decided to change my life.
This is my story.
```

✅ **After**:
```
She said it at the family dinner.
Twenty people. All quiet. All watching.
"You'll never be good enough for our family."

That moment changed everything.
```

**Techniques**:
- Start with **action** or **dialogue**, not narration
- Pose an **emotional question** (reader wants answer)
- Use **sensory details** (what did you see, hear, feel?)
- Keep **original facts**, enhance **feelings**

---

#### Episode Restoration

**Goal**: Make each scene visceral and memorable

❌ **Before**:
```
I worked hard for three months.
I got my first client.
I felt happy.
My mother-in-law didn't notice.
```

✅ **After**:
```
Three months of nothing. 
Calls that didn't answer. 
Emails that disappeared into the void.

Then—a text message.
"Can we talk about your proposal?"

My hands shook. I couldn't type. Had to call instead.
My voice came out steady (fake steady, but steady).
"Yes. Today? Right now?"

He said yes.

First client. First 5K.
First time my mother-in-law looked at me different.
Not friendly. Not mean. Just... unsure.
```

**Techniques**:
- Add **specific dialogue**
- Show **physical reactions** (trembling, tears, breathing)
- Use **dramatic sentence variety**: "Short. Medium. Longer sentences with details."
- Inject **narrator's personality** and speech patterns
- Include **sensory moments** (smells, sounds, textures)

---

#### Climax Restoration

**Goal**: Make confrontation unforgettable

❌ **Before**:
```
My mother-in-law saw my success.
She realized I was right.
Power shifted in my favor.
```

✅ **After**:
```
She saw the magazine feature on my desk.

"$500K Monthly Revenue: How She Built An Empire"

Her face went white. Not angry white. Ashamed white.
Her hands trembled as she picked up the magazine.
Read the title twice. Three times.

When she looked at me, tears were in her eyes.
"I was wrong," she whispered.

And I realized—I didn't need her to say it.
I knew. Everyone knew. She knew.

Power doesn't come from words.
It comes from winning.
And I had won.
```

**Techniques**:
- Show **antagonist's reaction** in detail (face, hands, words)
- Describe **narrator's internal experience**
- Use **short, punchy sentences** building to turning point
- Include **dialogue revealing power shift**
- Make **emotional climax crystal clear**

---

#### Resolution Restoration

**Goal**: Establish new position firmly

❌ **Before**:
```
I was now successful.
My mother-in-law needed me.
I hired her on my terms.
She accepted.
```

✅ **After**:
```
She asked for a job two weeks later.
I said yes.
But not because I forgave her.
Because I could AFFORD to be magnanimous.

She works for me now.
I pay her well (not because she earned it).
I give her respect (not because she deserves it).
I show her grace (because I can).

Every single day at the office, she remembers:
She is not my equal.
She is not my superior.
She works FOR me.

And that is the sweetest victory of all.
```

**Techniques**:
- Show **new position firmly** (remove uncertainty: "maybe", "perhaps", "I think")
- Include **consequences for antagonist**
- Add **narrator's emotional state** (pride, power, peace)
- Use **strong, decisive language**
- Provide **specific proof of victory**

---

#### Finale Restoration

**Goal**: Create unforgettable ending

❌ **Before**:
```
I learned that hard work pays off.
Never give up on yourself.
Believe in your dreams.
```

✅ **After**:
```
Would you have hired her?
Would you have given her mercy?
Or would you have let her suffer?

I CHOSE GRACE.
But only because I had WON.

That's the real secret.
It's not about forgiving them.
It's about becoming so successful that forgiveness is a choice,
not a necessity.

What would YOU do?
```

**Techniques**:
- End with **challenge to reader** ("What would YOU do?")
- Include **powerful statement in CAPS** for impact
- Don't **add new information**
- **Reference the journey** taken
- Leave reader with **something to think about**

---

## 🛠️ Implementation

### Using VoiceRestorationService

```typescript
import { VoiceRestorationService } from './services/voiceRestorationService';

const restorer = new VoiceRestorationService(process.env.GEMINI_API_KEY);

// Option 1: Full restoration (sections analyzed deeply)
const restored = await restorer.restore(rawArticle, {
  emotionalIntensity: 'high',
  voiceDepth: 'deep',
  preserveLength: true
});

// Option 2: Quick restore (faster, simpler)
const quickRestored = await restorer.quickRestore(rawArticle);
```

### In "Both" Mode

```typescript
// Generate RAW article (clean version)
const rawArticle = await contentFactory.generateArticle({
  enableAntiDetection: false, // Clean prompts
  // ... other config
});

// Generate RESTORED version
const restorationService = new VoiceRestorationService(apiKey);
const restoredArticle = await restorationService.restore(rawArticle);

// Output both
return {
  raw: rawArticle,
  restored: restoredArticle
};
```

---

## 📊 Quality Metrics

### Restoration Success Criteria

| Metric | Target | How to Verify |
|--------|--------|---------------|
| **Facts Preserved** | 100% | Every date, name, number matches |
| **Emotional Impact** | +50% increase | Phase 2 Score: RAW 65 → RESTORED 85 |
| **Sensory Details** | +200% increase | 6-8 sensory moments per 1000 chars |
| **Sentence Variety** | High | No paragraph has same sentence length |
| **Voice Consistency** | 100% | Narrator personality throughout |
| **Length Deviation** | ±10% | RESTORED chars within ±10% of RAW |

### Before/After Comparison

```
METRIC                 RAW         RESTORED    IMPROVEMENT
─────────────────────────────────────────────────────────
Phase 2 Score          68/100      84/100      +16 points ✅
Sentence Variety       Medium      High        +45% ✅
Sensory Details        2/article   15/article  +650% ✅
Internal Monologue     0%          35%         +35% ✅
Estimated Comments     12          38          +217% ✅
Estimated Shares       5           18          +260% ✅
Scroll Depth           55%         78%         +23% ✅
```

---

## 🚀 Best Practices

### 1. Use Archetype Context

When restoring, consider the archetype:

```typescript
const restorationConfig = {
  'comeback-queen': {
    emotionalIntensity: 'very-high',
    voiceDepth: 'deep',
    focusOn: 'VISIBLE shame of antagonist, SPEED of victory'
  },
  'gold-digger-trap': {
    emotionalIntensity: 'high',
    voiceDepth: 'medium',
    focusOn: 'INTELLIGENCE and POWER REVERSAL'
  },
  'phoenix': {
    emotionalIntensity: 'very-high',
    voiceDepth: 'deep',
    focusOn: 'TRANSFORMATION and EMOTIONAL HEALING'
  }
};
```

### 2. Test on Sample Sections First

Don't restore full 20K char article immediately:

1. Test lede (600 chars) → Check quality
2. Test one episode (3000 chars) → Verify facts preserved
3. Test climax (1200 chars) → Confirm emotional escalation
4. **THEN** restore full article

### 3. A/B Test Output

**Strategy**: 
- Publish both RAW and RESTORED to different channels
- Monitor: scroll depth, comments, shares
- Identify which audience prefers which version
- Optimize future restoration based on data

### 4. Batch Restoration

```typescript
// Restore 10 articles in parallel
const articles = await Promise.all(
  rawArticles.map(raw => restorer.restore(raw))
);
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Adding Fiction

**Problem**: Restorer invents events that didn't happen

```
ORIGINAL: "I worked hard for 6 months"
WRONG:    "I worked 18-hour days for 6 months, 
          sleeping in my car on weekends..."
          ↑ This is made-up detail!
```

**Solution**: Use phrase in system prompt: "You're not adding fiction. You're revealing emotional truth."

### ❌ Mistake 2: Changing Character Names

**Problem**: Restorer renames "mother-in-law" to "Anna"

**Solution**: Explicitly in prompt: "Do NOT change any names, keep all character references exactly as original"

### ❌ Mistake 3: Losing Facts

**Problem**: Original mentions "month 6: 150K income" but restored says "month 8: 120K"

**Solution**: Add verification step:

```typescript
function verifyFactsPreserved(raw: string, restored: string): boolean {
  // Extract numbers from both
  const rawNumbers = raw.match(/\d+/g) || [];
  const restoredNumbers = restored.match(/\d+/g) || [];
  
  // All raw numbers must appear in restored
  return rawNumbers.every(num => restoredNumbers.includes(num));
}
```

### ❌ Mistake 4: Making It Too Long

**Problem**: RESTORED ends up 5000+ chars longer than RAW

**Solution**: Use `preserveLength: true` in config, verify ±10% rule

---

## 📈 Optimization Checklist

- [ ] VoiceRestorationService created and tested
- [ ] QuickRestore works for speed testing
- [ ] Full restoration pipeline verified
- [ ] Facts preservation validated (100% match)
- [ ] Phase 2 Score improved (RAW → RESTORED +15+ points)
- [ ] Sensory details injected (6-8 per section)
- [ ] Sentence variety high (3+ different lengths per paragraph)
- [ ] Narrator voice consistent throughout
- [ ] Length within ±10% of original
- [ ] Both versions publishable independently
- [ ] CLI command `npm run both` works
- [ ] Export both RAW and RESTORED to folders
- [ ] Documentation complete

---

## 🔗 Related Documents

- 📋 **AI_TASK_BRIEFING.md** - Full technical implementation
- 📊 **CONTENT_QUALITY_MATRIX.md** - Quality metrics and targets
- 📚 **SYSTEM_EXPLAINED_HUMAN_FRIENDLY.md** - Non-technical overview
- 📖 **project_review.md** - SWOT analysis and recommendations

---

**Last Updated**: January 5, 2026 | **Version**: 1.0 | **Status**: Ready for Implementation