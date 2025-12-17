# Anti-Detection Services (Phase 2)

This directory contains all anti-detection components for ZenMaster v2.0 Phase 2.

## 🎯 Goal

Reduce AI detection from >70% (Phase 1) to <15% (Phase 2) using five techniques.

## 📁 Structure

```
services/antiDetection/
├── antiDetectionEngine.ts          ✅ Main orchestrator (stub)
├── perplexityController.ts         ⏳ To implement
├── burstinessOptimizer.ts          ⏳ To implement
├── skazNarrativeEngine.ts          ⏳ To implement (CRITICAL)
├── adversarialGatekeeper.ts        ⏳ To implement
├── visualSanitizationService.ts    ⏳ To implement
└── README.md                       ✅ This file
```

## 🔧 Components

### 1. antiDetectionEngine.ts (Main)
- Orchestrates all techniques
- Coordinates processing pipeline
- Returns AntiDetectionResult

### 2. perplexityController.ts
- Boosts text entropy
- Synonym substitution
- Target: Perplexity > 3.0

### 3. burstinessOptimizer.ts
- Sentence length variance
- SPLIT/MERGE operations
- Target: StdDev > 6.5

### 4. skazNarrativeEngine.ts ⭐ CRITICAL
- Russian Skaz technique
- Particle injection (ведь, же, ну, вот)
- Syntactic dislocation (OVS)
- Dialectal vocabulary
- Target: AI detection < 10%

### 5. adversarialGatekeeper.ts
- Pre-publication validation
- Quality gate (score > 80/100)
- Check perplexity, burstiness, length

### 6. visualSanitizationService.ts
- Strip EXIF/IPTC metadata
- Add Gaussian noise (2-5%)
- Geometric distortion (0.5%)

## 🚀 Usage

```typescript
import { AntiDetectionEngine } from './services/antiDetection/antiDetectionEngine';

const engine = new AntiDetectionEngine({
  perplexity: { enabled: true, targetScore: 3.0 },
  burstiness: { enabled: true, targetStdDev: 6.5 },
  skaz: { enabled: true, particleFrequency: 10 },
  redTeam: { enabled: true, minScore: 80 },
  visual: { enabled: true, noiseLevel: 3.5 },
});

const { article, result } = await engine.process(originalArticle);

console.log(`AI Detection Risk: ${result.metrics.aiDetectionRisk}%`);
console.log(`Perplexity: ${result.metrics.perplexity.score}`);
console.log(`Burstiness: ${result.metrics.burstiness.stdDev}`);
```

## 📊 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| AI Detection | >70% | <15% |
| Perplexity | 1.5-2.0 | 3.0+ |
| Burstiness | <2 | 6.5+ |

## 🧪 Testing

```bash
# Test individual components
npx tsx services/antiDetection/__tests__/perplexityController.test.ts
npx tsx services/antiDetection/__tests__/burstinessOptimizer.test.ts
npx tsx services/antiDetection/__tests__/skazNarrativeEngine.test.ts

# Integration test
npx tsx test-anti-detection.ts
```

## 📝 Implementation Order

1. ✅ Create types/AntiDetection.ts
2. ✅ Create antiDetectionEngine.ts (stub)
3. ⏳ Implement perplexityController.ts
4. ⏳ Implement burstinessOptimizer.ts
5. ⏳ Implement skazNarrativeEngine.ts (PRIORITY)
6. ⏳ Implement adversarialGatekeeper.ts
7. ⏳ Implement visualSanitizationService.ts
8. ⏳ Integrate into MultiAgentService
9. ⏳ Test with real detectors

## 🔗 References

- [PHASE2_ANTI_DETECTION.md](../../PHASE2_ANTI_DETECTION.md) - Full specs
- [types/AntiDetection.ts](../../types/AntiDetection.ts) - Type definitions
- [Russian Skaz Technique](https://en.wikipedia.org/wiki/Skaz) - Background

## ⏰ Timeline

**Start**: Dec 21, 2024  
**End**: Dec 22, 2024  
**Duration**: ~20 hours  
**Priority**: 🔥 Critical  

---

**Status**: ⏳ Phase 2 - Ready to Implement  
**Next**: Implement PerplexityController  
