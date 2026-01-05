# 💫 IMPLEMENTATION ROADMAP

**Version**: 2.0  
**Last Updated**: January 5, 2026  
**Status**: 🚰 READY FOR SPRINT PLANNING

---

## 🎯 CORE FILES (Minimal 3-File System)

### ✅ CREATED: ARTICLE_GENERATION_ALGORITHM.md
**Purpose**: Complete pipeline definition (Stages 0-5)  
**Contains**:
- 6-stage pipeline with clear inputs/outputs
- Detailed process for each stage
- Auto-restore loops & gate criteria
- Metrics & timeline

**Use by**: Developers implementing stage logic

---

### ✅ CREATED: DZEN_QUALITY_STANDARDS.md
**Purpose**: Quality metrics, gates, and checklist  
**Contains**:
- Stage-specific gate criteria (quantified)
- Phase2 scoring system (4 components)
- 10-point quality checklist
- Troubleshooting guide

**Use by**: QA pipeline, metric verification, human final check

---

### ✅ CREATED: IMPLEMENTATION_ROADMAP.md (this file)
**Purpose**: Execution plan for developers  
**Contains**:
- Code structure (TypeScript files to create/update)
- Phase-by-phase implementation
- Dependencies between components
- Testing strategy

**Use by**: Development team sprint planning

---

## 🕮️ CODE ARCHITECTURE

### File Structure (Minimal)
```
services/
├─ articleGeneration/
│  ├─ stage0-plotBible.ts          [STAGE 0]
│  ├─ stage1-episodes.ts          [STAGE 1]
│  ├─ stage2-assembly.ts          [STAGE 2]
│  ├─ stage3-voiceRestoration.ts  [STAGE 3]
│  ├─ stage4-antiDetection.ts     [STAGE 4]
│  ├─ stage5-qualityCheck.ts      [STAGE 5]
│  └─ contentOrchestrator.ts      [ORCHESTRATOR]
│
├─ quality/
│  ├─ phase2Scorer.ts             [METRICS]
│  ├─ dzenRulesValidator.ts       [VALIDATION]
│  └─ qualityGates.ts             [GATES]
│
├─ phase2/
│  ├─ perplexityController.ts    [PERPLEXITY]
│  ├─ burstinessOptimizer.ts     [BURSTINESS]
│  ├─ authenticEngine.ts         [AUTHENTIC]
│  └─ adversarialGatekeeper.ts    [GATEKEEPER]
└─ utils/
   ├─ levenshteinDistance.ts      [UNIQUENESS]
   └─ textMetrics.ts              [TEXT ANALYSIS]
```

---

## 🔍 PHASE 1: CORE PIPELINE (Week 1)

### Goal
Implement Stages 0-2 + basic metrics

### Tasks

#### 1.1 Stage 0: PlotBible Generation
**File**: `services/articleGeneration/stage0-plotBible.ts`

```typescript
interface PlotBible {
  theme: string;
  archetype: 'Comeback Queen' | 'Gold Digger' | 'Wisdom Earned';
  protagonist: {
    name: string;
    age: number;
    profession: string;
    personality: string;
    flaw: string;
    goal: string;
  };
  antagonist: {
    role: string;
    trigger: string;
    shame_moment: string;
  };
  episodes: string[];  // 6-8 episode descriptions
  timeframe: '1-3 months' | '3-6 months';
  central_question: string;
}

// Main function
export async function generatePlotBible(
  topic: string,
  geminiClient: GeminiAIClient
): Promise<PlotBible> {
  // 1. Call Gemini with prompt
  // 2. Parse JSON response
  // 3. Validate fields (required: theme, archetype, protagonist, antagonist, 6-8 episodes)
  // 4. Return PlotBible object
}
```

**Acceptance Criteria**:
- ✅ Generates valid JSON with all required fields
- ✅ Archetype matches theme
- ✅ Episodes are 6-8 distinct points
- ✅ Central question is emotionally compelling

---

#### 1.2 Stage 1: Episode Generation + Auto-Restore
**File**: `services/articleGeneration/stage1-episodes.ts`

```typescript
interface Episode {
  number: number;
  title: string;
  content: string;  // 2500-4000 chars
  phase2Score: number;
  levenshteinScore: number;
}

interface CharacterDossier {
  name: string;
  physical_markers: string[];
  voice_patterns: string[];
  consistent_behaviors: string[];
}

export async function generateEpisodes(
  plotBible: PlotBible,
  geminiClient: GeminiAIClient,
  phase2Scorer: Phase2Scorer
): Promise<{ episodes: Episode[]; dossier: CharacterDossier }> {
  // For each episode in PlotBible:
  // 1. Generate episode (2500-4000 chars)
  // 2. Calculate Phase2Score
  // 3. If < 70: Auto-restore (max 3 attempts)
  // 4. If still < 70: Regenerate episode completely
  // 5. Save to episodes array
  // 
  // After all episodes:
  // 6. Create character dossier (physical, voice, behaviors)
  // 7. Return episodes[] + dossier
}

// Helper: Auto-restore loop
async function restoreEpisodeQuality(
  episode: Episode,
  maxAttempts: number = 3
): Promise<Episode | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const restored = await enhanceEmotionAndDetails(episode);
    if (restored.phase2Score >= 70) return restored;
  }
  return null;  // Trigger regeneration
}
```

**Acceptance Criteria**:
- ✅ Each episode 2500-4000 chars
- ✅ Phase2 Score >= 70 for all episodes
- ✅ Episodes unique (Levenshtein > 0.75)
- ✅ Character dossier complete & consistent

---

#### 1.3 Stage 2: Article Assembly
**File**: `services/articleGeneration/stage2-assembly.ts`

```typescript
interface RawArticle {
  title: string;
  lede: string;           // 600-900 chars
  episodeWeaving: string; // 14-16K chars
  finale: string;         // 800-1200 chars
  totalLength: number;
}

export async function assembleArticle(
  episodes: Episode[],
  dossier: CharacterDossier,
  plotBible: PlotBible
): Promise<RawArticle> {
  // 1. Generate LEDE:
  //    - Emotional hook (no explanation)
  //    - Establish central question
  //    - Introduce protagonist & conflict
  //
  // 2. Weave episodes (DON'T copy, rewrite):
  //    - Episodes 1-3: Build tension
  //    - Episodes 4-5: Escalate stakes
  //    - Episodes 6-7: Climax & revelation
  //    - Episodes 8+: Resolution (if exists)
  //
  // 3. Generate FINALE:
  //    - Closed ending (resolve all threads)
  //    - Show new character state
  //    - Final reflection
  //
  // 4. Assemble & return
}

// Validation
function validateAssembly(article: RawArticle): boolean {
  return (
    article.lede.length >= 600 && article.lede.length <= 900 &&
    article.totalLength >= 15000 &&
    article.totalLength <= 20000
  );
}
```

**Acceptance Criteria**:
- ✅ LEDE 600-900 chars, emotional hook
- ✅ Total length 15,000-20,000 chars
- ✅ Episodes woven (not copied)
- ✅ Finale is closed, not open

---

#### 1.4 Phase2Scorer Utility
**File**: `services/quality/phase2Scorer.ts`

```typescript
interface Phase2Score {
  perplexity: number;      // 0-100
  burstiness: number;      // 0-100
  authenticity: number;    // 0-100
  noCliche: number;        // 0-100
  overallScore: number;    // 0-100 (weighted)
}

export class Phase2Scorer {
  // Calculate Phase2 score for any text
  scoreText(text: string): Phase2Score {
    return {
      perplexity: this.calculatePerplexity(text),
      burstiness: this.calculateBurstiness(text),
      authenticity: this.estimateAuthenticity(text),
      noCliche: this.checkCliche(text),
      overallScore: this.weighted() // 60%+15%+15%+10%
    };
  }

  private calculatePerplexity(text: string): number {
    // Measure word entropy
    // Count unique words / total words
    // Higher = more varied vocabulary
  }

  private calculateBurstiness(text: string): number {
    // Calculate sentence length StdDev
    // Higher = more varied (not monotonous)
  }

  private estimateAuthenticity(text: string): number {
    // Check for:
    // - Dialogue presence (40-50%)
    // - Concrete details (2+ per page)
    // - Natural particles (ну, блин, ладно)
    // - Fragment sentences
  }

  private checkCliche(text: string): number {
    // Check against FORBIDDEN_PHRASES list
    // If 0 found: 100
    // If 1+ found: 0 (instant fail)
  }
}
```

**Acceptance Criteria**:
- ✅ Scores match test articles
- ✅ Perplexity correlates with word uniqueness
- ✅ Burstiness correlates with sentence variation

---

## 🔍 PHASE 2: VOICE RESTORATION (Week 2)

### Goal
Implement Stage 3 with 6 DZEN GURU rules

### Tasks

#### 2.1 Stage 3: Voice Restoration
**File**: `services/articleGeneration/stage3-voiceRestoration.ts`

```typescript
export async function applyVoiceRestorationAndDzenRules(
  rawArticle: RawArticle,
  dossier: CharacterDossier,
  phase2Scorer: Phase2Scorer
): Promise<{ article: RawArticle; score: number }> {
  // Auto-restore loop
  let attempts = 0;
  let article = rawArticle;
  let score = 0;

  while (score < 85 && attempts < 2) {
    // Apply all 6 DZEN GURU rules
    article = apply6DzenRules(article, dossier);

    score = phase2Scorer.scoreText(article.toString()).overallScore;
    attempts++;
  }

  if (score < 85) {
    throw new Error('Stage 3 failed: Phase2 < 85, regenerate from Stage 2');
  }

  return { article, score };
}

// Rule 1: Dialogue formatting
function applyDialogueFormatting(text: string): string {
  // Replace " dialog" " with
  // — Dialog
  // — Response
}

// Rule 2: Maximum 3 complex names
function limitComplexNames(text: string, dossier: CharacterDossier): string {
  // Keep protagonist, antagonist, max 1 other
  // Replace other names with relationships (mother, boss, etc.)
}

// Rule 3: Sentence variation
function optimizeSentenceVariation(text: string): string {
  // Analyze sentence lengths
  // If monotonous (StdDev < 2): break/combine sentences
  // Target: SHORT -> MEDIUM -> LONG pattern
}

// Rule 4: NO AI Clichés
function removeAICliche(text: string): string {
  // Check against FORBIDDEN_PHRASES
  // Replace with specific, lived details
}

// Rule 5: Character evolution
function ensureCharacterEvolution(text: string, dossier: CharacterDossier): boolean {
  // Check:
  // - Character has problem/weakness at start
  // - Character attempts solution
  // - External event forces change
  // - Character behaves differently at end
  // Returns true if all visible
}

// Rule 6: Oral delivery test
function validateOralDelivery(text: string): boolean {
  // Check for:
  // - No excessive punctuation
  // - Paragraph max 300 words
  // - Complex words marked for replacement
  // Returns true if readable aloud
}

const FORBIDDEN_PHRASES = [
  'бездонные голубые глаза',
  'черные атласные волосы',
  'я чувствовала боль в груди',
  'жизнь больше не будет прежней',
  // ... 50+ more
];
```

**Acceptance Criteria**:
- ✅ All 6 rules applied
- ✅ No forbidden phrases present
- ✅ Dialogue formatted as dashes
- ✅ Max 3 complex names
- ✅ Character evolution visible
- ✅ Phase2Score >= 85

---

## 🔍 PHASE 3: ANTI-DETECTION (Week 3)

### Goal
Implement Stage 4 (Phase 2 system) + Gatekeeper

### Tasks

#### 3.1 Stage 4 Implementation
**File**: `services/phase2/stage4-antiDetection.ts`

```typescript
export async function applyPhase2AntiDetection(
  article: RawArticle,
  phase2Scorer: Phase2Scorer
): Promise<{ article: RawArticle; score: number }> {
  // Step 1: Perplexity
  article = applyPerplexityEnhancement(article);

  // Step 2: Burstiness
  article = applyBurstinessOptimization(article);

  // Step 3: Authentic narrative
  article = applyAuthenticNarrative(article);

  // Step 4: Gatekeeper check
  const score = phase2Scorer.scoreText(article.toString());

  if (score.overallScore < 80) {
    throw new Error('Gatekeeper FAIL: Return to Stage 3');
  }

  return { article, score: score.overallScore };
}
```

#### 3.2 Component Files
**File**: `services/phase2/perplexityController.ts`

```typescript
export function increasePerplexity(text: string): string {
  // 1. Replace common words with rare synonyms
  // 2. Invert sentence structure (rare, subtle)
  // 3. Add archaic forms (5-10% of text)
  // Target: Perplexity >= 3.0
}
```

**File**: `services/phase2/burstinessOptimizer.ts`

```typescript
export function optimizeBurstiness(text: string): string {
  // 1. Calculate current sentence lengths
  // 2. If monotonous: break long -> short, combine short -> long
  // 3. Pattern: SHORT -> MEDIUM -> LONG -> SHORT
  // Target: StdDev >= 6.5
}
```

**File**: `services/phase2/authenticEngine.ts`

```typescript
export function makeItHuman(text: string, dossier: CharacterDossier): string {
  // 1. Read aloud: check for rhythm
  // 2. Add emotional authenticity (fragments, repetitions)
  // 3. Apply character-specific speech patterns
  // 4. Add concrete details (2-3 per page)
  // Target: Authenticity >= 75
}
```

**File**: `services/phase2/adversarialGatekeeper.ts`

```typescript
export class AdversarialGatekeeper {
  assessArticle(article: RawArticle, phase2Score: Phase2Score): number {
    // Verify ALL:
    // ✓ Perplexity >= 3.0
    // ✓ Burstiness >= 6.5
    // ✓ Authenticity >= 75
    // ✓ Content 1500-2500 chars
    // ✓ No clichés
    // ✓ Dialogues 40-50%
    // ✓ Character evolved
    // ✓ Final score >= 80
    //
    // Return: overall score or throw if < 80
  }
}
```

**Acceptance Criteria**:
- ✅ Perplexity >= 3.0
- ✅ Burstiness StdDev >= 6.5
- ✅ Authenticity >= 75
- ✅ Gatekeeper Score >= 80
- ✅ ZeroGPT detection < 15%

---

## 🔍 PHASE 4: QUALITY & ORCHESTRATION (Week 4)

### Goal
Implement Stage 5 + full orchestrator with retry logic

### Tasks

#### 4.1 Stage 5: Quality Checklist
**File**: `services/articleGeneration/stage5-qualityCheck.ts`

```typescript
interface ChecklistResult {
  points: boolean[];  // 10 yes/no
  score: number;      // 0-10
  verdict: 'PUBLISH' | 'CONDITIONAL' | 'REJECT';
}

export async function runQualityChecklist(
  article: RawArticle,
  dossier: CharacterDossier
): Promise<ChecklistResult> {
  const points = [
    checkOpeningHook(article),
    checkTurningPoint(article, 0.3),
    checkClimax(article, 0.6),
    checkReveal(article, 0.85),
    checkClosedEnding(article),
    checkOralDelivery(article),
    checkNoCliche(article),
    checkDialoguePercentage(article),
    checkCharacterEvolution(article, dossier),
    checkMaxThreeNames(article)
  ];

  const score = points.filter(p => p).length;
  const verdict = score >= 8 ? 'PUBLISH' : score >= 6 ? 'CONDITIONAL' : 'REJECT';

  return { points, score, verdict };
}

function checkOpeningHook(article: RawArticle): boolean {
  // First sentence must create tension
  // Question or emotional moment
}

function checkTurningPoint(article: RawArticle, position: number): boolean {
  // At ~position% of article: event that changes everything
}

// ... etc for all 10 points
```

**Acceptance Criteria**:
- ✅ All 10 points evaluatable
- ✅ Score >= 8 = PUBLISH
- ✅ Score 6-7 = CONDITIONAL (return to Stage 3)
- ✅ Score < 6 = REJECT (return to Stage 2)

---

#### 4.2 Content Orchestrator
**File**: `services/articleGeneration/contentOrchestrator.ts`

```typescript
export async function generateCompleteArticle(
  topic: string,
  config: GenerationConfig
): Promise<ArticleGenerationResult> {
  try {
    // STAGE 0
    const plotBible = await stage0.generatePlotBible(topic);

    // STAGE 1
    const { episodes, dossier } = await stage1.generateEpisodes(
      plotBible,
      config.geminiClient,
      phase2Scorer
    );

    // STAGE 2
    let article = await stage2.assembleArticle(episodes, dossier, plotBible);

    // STAGE 3 (with retry)
    for (let stage3Attempt = 0; stage3Attempt < 2; stage3Attempt++) {
      try {
        const { article: restored, score } = await stage3.applyVoiceRestorationAndDzenRules(
          article,
          dossier,
          phase2Scorer
        );
        article = restored;
        break;  // Success, move to Stage 4
      } catch (err) {
        if (stage3Attempt === 1) {
          // Last attempt failed, regenerate from Stage 2
          return generateCompleteArticle(topic, config);
        }
      }
    }

    // STAGE 4 (with retry)
    for (let stage4Attempt = 0; stage4Attempt < 2; stage4Attempt++) {
      try {
        const { article: final, score } = await stage4.applyPhase2AntiDetection(
          article,
          phase2Scorer
        );
        article = final;
        break;  // Success, move to Stage 5
      } catch (err) {
        if (stage4Attempt === 1) {
          // Last attempt failed, return to Stage 3
          stage3Attempt = 0;  // Reset and retry Stage 3
          continue;  // Go back to Stage 3 loop
        }
      }
    }

    // STAGE 5
    const checklist = await stage5.runQualityChecklist(article, dossier);

    if (checklist.verdict === 'PUBLISH') {
      return {
        status: 'SUCCESS',
        article,
        metrics: { checklist, phase2: phase2Scorer.scoreText(article.toString()) },
        timeElapsed: Date.now() - startTime
      };
    } else if (checklist.verdict === 'CONDITIONAL') {
      // Return to Stage 3
      return generateCompleteArticle(topic, config);
    } else {
      // Return to Stage 2
      return generateCompleteArticle(topic, config);
    }
  } catch (err) {
    return {
      status: 'FAILED',
      error: err.message,
      timeElapsed: Date.now() - startTime
    };
  }
}
```

**Acceptance Criteria**:
- ✅ Orchestrator follows retry logic exactly
- ✅ All stages called in correct order
- ✅ Return to Stage 3 on Stage 4 fail
- ✅ Return to Stage 2 on Stage 3 fail
- ✅ Complete in ~45 minutes average

---

## 🧪 TESTING STRATEGY

### Unit Tests (Phase 1-4)
```typescript
// Test for each stage:
describe('Stage 0: PlotBible', () => {
  it('should generate valid JSON', () => { ... });
  it('should have 6-8 episodes', () => { ... });
  it('should have clear central question', () => { ... });
});
```

### Integration Tests (Phase 4+)
```typescript
// Test full pipeline:
describe('Complete Article Generation', () => {
  it('should generate article in < 50 minutes', () => { ... });
  it('should pass Stage 5 checklist', () => { ... });
  it('should have Phase2 Score >= 80', () => { ... });
  it('should have ZeroGPT detection < 15%', () => { ... });
});
```

### Manual QA (After each phase)
- Read articles aloud
- Check for AI clichés
- Verify character consistency
- Validate gate metrics

---

## 📋 DEPENDENCIES & RISKS

### External Dependencies
```
├─ Gemini API (content generation)
├─ Phase2Scorer (metrics)
└─ ZeroGPT / Originality.ai (validation)
```

### Risk Mitigation
| Risk | Mitigation |
|------|------------|
| Gemini API rate limits | Implement retry with exponential backoff |
| Low Phase2 score | Auto-restore loops with max attempts |
| Infinite retry loops | Set absolute max retries (3 total) |
| Memory issues on large articles | Process in chunks |

---

## 📃 DOCUMENTATION

### For Developers
- ✅ ARTICLE_GENERATION_ALGORITHM.md (how it works)
- ✅ DZEN_QUALITY_STANDARDS.md (what quality looks like)
- This IMPLEMENTATION_ROADMAP.md (how to build it)

### For QA
- Gate criteria per stage
- Expected metrics before/after each stage
- Troubleshooting guide

### For Content Team
- Architecture diagram (visual)
- Timeline expectations (45 min per article)
- Performance benchmarks (70%+ scroll depth, 40+ comments)

---

## 📅 TIMELINE

```
Week 1 (Phase 1): Stages 0-2
├─ Monday:   Stage 0 (PlotBible) + tests
├─ Tuesday:  Stage 1 (Episodes + Dossier) + tests
├─ Wednesday: Stage 2 (Assembly) + Phase2Scorer
├─ Thursday:  Integration testing
└─ Friday:   Buffer & documentation

Week 2 (Phase 2): Stage 3
├─ Monday:   Stage 3 (Voice Restoration) + 6 DZEN Rules
├─ Tuesday:  Auto-restore loop + testing
├─ Wednesday: Integration testing
└─ Thursday-Friday: Buffer & refinement

Week 3 (Phase 3): Stage 4
├─ Monday:   Perplexity + Burstiness components
├─ Tuesday:  Authentic Engine + Gatekeeper
├─ Wednesday: Integration testing
└─ Thursday-Friday: Buffer & refinement

Week 4 (Phase 4): Stage 5 + Orchestrator
├─ Monday:   Stage 5 (Quality Checklist)
├─ Tuesday:  Content Orchestrator + retry logic
├─ Wednesday: Full pipeline testing
├─ Thursday:  Load testing & optimization
└─ Friday:   Final validation & deployment
```

---

## ✅ SUCCESS CRITERIA

### Functional
- ✅ Generate complete article in 45 minutes
- ✅ Pass all gate criteria (metrics-based)
- ✅ ZeroGPT detection < 15%
- ✅ 10-point checklist >= 8
- ✅ Auto-restore on failures
- ✅ Retry logic working correctly

### Technical
- ✅ All code modular & testable
- ✅ Clear error messages
- ✅ Metrics logged per stage
- ✅ Performance < 50 minutes

### Quality
- ✅ Generated articles publishable on Dzen
- ✅ 70%+ scroll depth (target)
- ✅ 40+ comments (target)
- ✅ No AI detection issues

---

**Next Step**: Start Week 1 Phase 1 with Stage 0 implementation  
**Review**: Weekly progress check-ins + metric validation  
**Deploy**: End of Week 4 to production
