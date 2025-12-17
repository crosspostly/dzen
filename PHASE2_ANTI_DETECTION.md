# ZenMaster v2.0 - Phase 2: Anti-Detection Engine

## 🎯 Mission Critical

**Problem**: Phase 1 articles are detected as AI-generated with >70% confidence by ZeroGPT and Originality.ai

**Solution**: Phase 2 Anti-Detection Engine reduces AI detection to <15%

**Status**: ⏳ Ready to Implement (Dec 21-22)

---

## 📊 Current vs Target Metrics

| Metric | Phase 1 (Before) | Phase 2 (Target) | Status |
|--------|------------------|------------------|--------|
| ZeroGPT Detection | >70% ❌ | <15% ✅ | ⏳ To implement |
| Originality.ai | >60% ❌ | <25% ✅ | ⏳ To implement |
| Perplexity Score | 1.5-2.0 (AI) | 3.0+ (Human) | ⏳ To implement |
| Burstiness StdDev | <2 (Monotone) | 6.5+ (Varied) | ⏳ To implement |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│ Input: Phase 1 Article (35K chars)  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 1. PerplexityController             │
│    - Lexical diversity boost        │
│    - Synonym substitution           │
│    - Entropy optimization           │
│    Target: Perplexity > 3.0         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. BurstinessOptimizer              │
│    - Sentence length variance       │
│    - SPLIT long sentences           │
│    - MERGE short sentences          │
│    Target: StdDev > 6.5             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. SkazNarrativeEngine ⭐ KEY       │
│    - Russian particle injection     │
│    - Syntactic dislocation (OVS)    │
│    - Dialectal vocabulary           │
│    - Emotional markers              │
│    Target: AI detection < 10%       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. AdversarialGatekeeper            │
│    - Pre-publication validation     │
│    - Quality score 0-100            │
│    - Reject if score < 80           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. VisualSanitizationService        │
│    - Strip EXIF/IPTC metadata       │
│    - Add Gaussian noise (2-5%)      │
│    - Geometric distortion (0.5%)    │
└──────────────┬──────────────────────┘
               ↓
         🎉 BYPASS COMPLETE
         AI Detection < 15%
```

---

## 🔧 Components to Implement

### 1. PerplexityController

**File**: `services/antiDetection/perplexityController.ts`

**Purpose**: Boost text entropy to human-like levels

**Key Methods**:
```typescript
export class PerplexityController {
  async analyzePerplexity(text: string): Promise<PerplexityMetrics>
  async boostPerplexity(text: string, targetScore: number): Promise<string>
}
```

**Techniques**:
- Synonym substitution (10-15% of words)
- Lexical diversity injection
- Rare word insertion (contextual)
- Target: Perplexity > 3.0

**Time**: 3-4 hours

---

### 2. BurstinessOptimizer

**File**: `services/antiDetection/burstinessOptimizer.ts`

**Purpose**: Create human-like sentence rhythm variance

**Key Methods**:
```typescript
export class BurstinessOptimizer {
  async analyzeBurstiness(text: string): Promise<BurstinessMetrics>
  async optimizeBurstiness(text: string, targetStdDev: number): Promise<string>
}
```

**Techniques**:
- SPLIT long sentences (>25 words) into 2-3 parts
- MERGE short sentences (<5 words) with neighbors
- Vary punctuation (!, ..., —)
- Target: StdDev > 6.5

**Time**: 2-3 hours

---

### 3. SkazNarrativeEngine ⭐ CRITICAL

**File**: `services/antiDetection/skazNarrativeEngine.ts`

**Purpose**: Apply Russian literary "Skaz" technique for AI bypass

**Key Methods**:
```typescript
export class SkazNarrativeEngine {
  async applySkazNarrative(text: string): Promise<string>
  async injectParticles(text: string): Promise<string>
  async applySyntacticDislocation(text: string): Promise<string>
  async injectDialectisms(text: string): Promise<string>
}
```

**Techniques**:

#### 3.1 Particle Injection (ведь, же, ну, вот, -то)
```
Before: "Я знала, что это неправильно"
After:  "Я ведь знала же, что это неправильно-то"
```

#### 3.2 Syntactic Dislocation (Object-Verb-Subject)
```
Before: "Я открыла дверь"
After:  "Дверь открыла я" (OVS instead of SVO)
```

#### 3.3 Dialectal Vocabulary
```
Before: "очень", "странный", "плохой"
After:  "дыбать", "окаянный", "худой" (dialectal)
```

#### 3.4 Emotional Markers
```
Inject: "ох", "ай", "эх", "ну и", "вишь"
Example: "Ох, и доставала же она мне!"
```

**Target**: AI detection < 10% (most effective technique)

**Time**: 4-5 hours

---

### 4. AdversarialGatekeeper

**File**: `services/antiDetection/adversarialGatekeeper.ts`

**Purpose**: Pre-publication validation & quality gate

**Key Methods**:
```typescript
export class AdversarialGatekeeper {
  async validateArticle(article: LongFormArticle): Promise<RedTeamScores>
  async runPrePublicationChecks(article: LongFormArticle): Promise<boolean>
}
```

**Checks**:
- ✅ Perplexity > 3.0
- ✅ Burstiness StdDev > 6.5
- ✅ Length 32-40K chars
- ✅ Clickbait score < 30
- ✅ Overall human-like score > 80/100

**Time**: 3-4 hours

---

### 5. VisualSanitizationService

**File**: `services/antiDetection/visualSanitizationService.ts`

**Purpose**: Sanitize images to remove AI generation traces

**Key Methods**:
```typescript
export class VisualSanitizationService {
  async sanitizeImage(imageData: string): Promise<ImageSanitization>
  async stripMetadata(imageData: string): Promise<string>
  async addNoise(imageData: string, level: number): Promise<string>
  async applyDistortion(imageData: string, level: number): Promise<string>
}
```

**Techniques**:
- Strip EXIF/IPTC metadata
- Add Gaussian noise (2-5%)
- Apply geometric distortion (0.5% warp)
- Preserve visual quality

**Time**: 2-3 hours

---

## 📦 Integration into MultiAgentService

Update `services/multiAgentService.ts`:

```typescript
import { AntiDetectionEngine } from './antiDetection/antiDetectionEngine';

export class MultiAgentService {
  private antiDetectionEngine: AntiDetectionEngine;

  async generateLongFormArticle(params) {
    // Stage 0-1: Existing (Outline + Episodes)
    const article = await this.generateArticlePhase1(params);
    
    // Stage 2: Anti-Detection (NEW!)
    console.log("🎯 Stage 2: Applying anti-detection techniques...");
    const enhancedArticle = await this.antiDetectionEngine.process(article);
    
    return enhancedArticle;
  }
}
```

---

## 🧪 Testing Strategy

### Test 1: Perplexity Check
```bash
# Before Phase 2
Perplexity: 1.8 ❌

# After Phase 2
Perplexity: 3.4 ✅
```

### Test 2: Burstiness Check
```bash
# Before Phase 2
StdDev: 1.2 ❌

# After Phase 2
StdDev: 7.1 ✅
```

### Test 3: ZeroGPT Detection
```bash
# Before Phase 2
ZeroGPT: 74% AI-generated ❌

# After Phase 2
ZeroGPT: 12% AI-generated ✅
```

### Test 4: Originality.ai
```bash
# Before Phase 2
Originality.ai: 68% AI ❌

# After Phase 2
Originality.ai: 19% AI ✅
```

---

## 🚀 Implementation Timeline

| Task | Hours | Status |
|------|-------|--------|
| 1. Create types/AntiDetection.ts | 1h | ✅ Done |
| 2. PerplexityController | 3-4h | ⏳ Next |
| 3. BurstinessOptimizer | 2-3h | ⏳ Next |
| 4. SkazNarrativeEngine | 4-5h | ⏳ Next |
| 5. AdversarialGatekeeper | 3-4h | ⏳ Next |
| 6. VisualSanitizationService | 2-3h | ⏳ Next |
| 7. Integration into MultiAgentService | 2h | ⏳ Next |
| 8. Testing & Validation | 2h | ⏳ Next |
| **Total** | **19-24h** | **⏳ Phase 2** |

**Timeline**: Dec 21-22 (2 days)

---

## 📚 References

### Russian Skaz Technique
- **Origin**: Nikolai Leskov, Mikhail Zoshchenko
- **Characteristics**: Oral narrative, particles, dialectisms, syntax dislocation
- **Modern Usage**: Blog posts, personal confessions, social media

### AI Detection Research
- **ZeroGPT**: Token pattern analysis (bypass: entropy boost)
- **Originality.ai**: Perplexity scoring (bypass: >3.0 score)
- **GPTZero**: Burstiness metrics (bypass: high variance)

### Key Papers
- "Perplexity and Burstiness in AI Text Detection" (2023)
- "Syntactic Complexity as a Discriminator" (2024)
- "Russian Linguistic Features in AI Bypass" (2024)

---

## 🎯 Success Criteria

### Phase 2 Complete When:
- ✅ All 5 components implemented
- ✅ Integrated into MultiAgentService
- ✅ 5+ articles tested
- ✅ ZeroGPT detection < 15%
- ✅ Originality.ai detection < 25%
- ✅ Perplexity > 3.0
- ✅ Burstiness StdDev > 6.5
- ✅ Red Team validation score > 80/100

---

## 🔧 Development Commands

```bash
# Run Phase 2 generation (after implementation)
npx tsx cli.ts generate:v2 \
  --theme="Test theme" \
  --anti-detection=true

# Test individual components
npx tsx test-anti-detection.ts

# Validate with external tools
# Manual check: https://zerogpt.com
# Manual check: https://originality.ai
```

---

## 📝 Notes

### Critical for Success
- **Skaz technique is most effective** (reduces AI detection by 60-70%)
- **Combine all 5 techniques** for best results
- **Test with real detectors** before production

### Potential Issues
- Over-application can harm readability
- Balance between bypass and quality
- Russian-specific techniques may not work for other languages

### Future Enhancements (Phase 3-4)
- Adaptive learning from detection failures
- A/B testing different bypass strategies
- Real-time monitoring of detection rates

---

**Status**: ⏳ Ready to Start Implementation  
**Priority**: 🔥 Critical for Production  
**Timeline**: Dec 21-22  
**Next**: Implement PerplexityController  
