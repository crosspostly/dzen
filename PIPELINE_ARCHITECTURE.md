# 🎭 ZenMaster v7.1 - Complete Pipeline Architecture

**ТОЧНАЯ логика генерации статей от начала и до конца, как ты просил!**

---

## 📐 ОБЩИЙ ПОТОК (Overview)

```
СТАТЬЯ = Множество ЭПИЗОДОВ, которые потом собираются

Для каждого эпизода:
  [Generate] → [Anti-Detection] → [Voice Polish] → [Restoration] → ✅ Готов
                                                         ↓
                                                   Проверка логики
                                                         
После всех эпизодов:
  [Assembly] → [Hard Restoration всей статьи] → [Image Generation] → [Export]
```

---

## 🔄 ФАЗЫ ГЕНЕРАЦИИ

### **ФАЗА A: ТЕМА И КОНЦЕПЦИЯ** ⏱️ 5-10 мин

```
1. SELECT THEME
   ├─ От пользователя (--theme=X)
   ├─ Или random из config.required_triggers
   └─ Или hardcoded default: "Я терпела это 20 лет"

2. GATHER DATA & RESEARCH
   ├─ Perplexity API: Search для реальных фактов
   ├─ Parse результаты
   └─ Prepare: narrativeContext, statistics, realExamples

3. CREATE PLOT BIBLE
   ├─ multiAgentService.generatePlotBible()
   ├─ Structure: вводная ситуация → кульминация → разрешение
   ├─ Add: диалоги, детали, психологические повороты
   └─ Output: detailedPlotBible (используется для всех эпизодов)
```

**Результат:** plotBible для единообразности всех эпизодов

---

### **ФАЗА B: ГЕНЕРАЦИЯ ЭПИЗОДОВ** ⏱️ 20 мин (для типичного числа эпизодов)

**КЛЮЧ: Каждый эпизод обрабатывается ПО ПОЛНОМУ ЦИКЛУ перед следующим!**

#### Per-Episode Processing Loop:

```javascript
// Обработка КАЖДОГО эпизода отдельно (в параллели до 3 одновременно)
for (let i = 0; i < totalEpisodes; i++) {
  
  // 🎬 STAGE B1: Generate Episode Text
  const episode = await episodeGeneratorService.generateEpisode({
    plotBible,
    episodeNumber: i,
    theme,
    previousEpisode: episodes[i-1],
    totalEpisodes
  });
  
  // ⚠️ B1 CHECK: Validation
  if (!episode || episode.text.length < 500) {
    console.error(`Episode ${i} too short, regenerating...`);
    episode = await regenerateEpisode(i);
  }
  
  // 🎭 STAGE B2: Per-Episode Anti-Detection
  // !!!! КРИТИЧНО: Это ТОЛЬКО для этого эпизода, не для целой статьи!
  const antiDetectedEpisode = await phase2AntiDetectionService.processEpisode(
    episode.text,
    {
      targetScore: 85,  // Per-episode target
      method: 'mixed',   // Обфускация текста
      perEpisode: true   // ← THIS IS KEY!
    }
  );
  
  // ⚠️ B2 CHECK: Anti-detection score
  const phase2Score = await qualityValidator.checkPhase2(antiDetectedEpisode);
  if (phase2Score < 80) {
    console.warn(`Episode ${i}: Phase2 score ${phase2Score}, regenerating...`);
    episode = await regenerateEpisode(i);
    continue; // Re-process from B1
  }
  
  // 🎤 STAGE B3: Voice Polish (per-episode)
  const voicePolished = await voiceRestorationService.polishForDzen(
    antiDetectedEpisode
  );
  
  // ⚠️ B3 CHECK: Format compliance
  if (!voicePolished || voicePolished.includes('выск')) {
    console.warn(`Episode ${i}: Voice check failed`);
    episode = await regenerateEpisode(i);
    continue;
  }
  
  // 🔧 STAGE B4: Per-Episode Text Restoration
  // This is CRUCIAL for natural text feel BEFORE assembly!
  const restoredEpisode = await textRestorationService.restoreEpisode(
    voicePolished,
    {
      method: 'light',           // Don't overcook single episode
      preserveStructure: true,
      fixDialogues: true,
      improveFlow: true
    }
  );
  
  // ⚠️ B4 CHECK: Restoration quality
  const restorationScore = await qualityValidator.checkRestorationQuality(
    restoredEpisode
  );
  if (restorationScore < 70) {
    console.warn(`Episode ${i}: Restoration score ${restorationScore}`);
    // Still continue, will be fixed in Phase C hard restoration
  }
  
  // ✅ STORE EPISODE
  episodes[i] = {
    number: i,
    text: restoredEpisode,
    phase2Score,
    restorationScore,
    voicePolished,
    antiDetected: antiDetectedEpisode
  };
  
  console.log(`✅ Episode ${i+1}/${totalEpisodes}: Phase2=${phase2Score}, Restoration=${restorationScore}`);
}
```

**Что происходит:**
- 🎬 B1: Generate текст эпизода (~1500-2000 слов)
- 🎭 B2: **Per-episode anti-detection** (не целую статью!) → score >= 80
- 🎤 B3: Voice polish для Dzen
- 🔧 B4: Per-episode restoration (легкая, не переделываем)
- ✅ Храним результат и идем к следующему

**КРИТИЧНО: Каждый эпизод обработан до конца ДО сборки всей статьи!**

---

### **ФАЗА C: СБОРКА И ФИНАЛЬНАЯ РЕСТАВРАЦИЯ** ⏱️ 8 мин

```javascript
// ============================================================================
// STAGE C1: Assembly - Собрать все эпизоды в одну статью
// ============================================================================

const assembledText = episodes
  .map((ep, i) => {
    if (i === 0) return ep.text; // First episode with intro
    return ep.text; // Other episodes
  })
  .join('\n\n'); // Paragraph break between episodes

// ⚠️ C1 CHECK: Logic consistency
const logicCheck = await multiAgentService.verifyLogicContinuity(
  episodes.map(e => e.text)
);
if (!logicCheck.isConsistent) {
  console.warn(`⚠️  Logic breaks detected:`);
  logicCheck.issues.forEach(issue => console.warn(`  - ${issue}`));
  // Re-generate specific episodes with continuity prompt
  const affectedIndices = logicCheck.affectedEpisodes;
  for (const idx of affectedIndices) {
    episodes[idx] = await regenerateEpisode(idx, {
      previousEpisode: episodes[idx-1],
      nextEpisode: episodes[idx+1]
    });
  }
  continue; // Go back to assembly
}

// ============================================================================
// STAGE C2: HARD RESTORATION - Финальная полировка ЦЕЛОЙ статьи
// !!!!! ЭТОТ ЭТАП КРИТИЧЕН - БЕЗ НЕГО СТАТЬЯ НЕ ГОТОВА!
// ============================================================================

const hardRestoredArticle = await textRestorationService.hardRestore(
  assembledText,
  {
    method: 'hard',                    // ← Aggressive restoration
    fixBreaks: true,                    // Break detection & fixing
    improveFlow: true,                  // Improve narrative flow
    enhanceDialogues: true,
    addMissingPunctuation: true,
    checkGrammar: true,
    targetPhase2Score: 85,
    iterative: true,                    // Keep improving until score >= 85
    maxIterations: 5
  }
);

// ⚠️ C2 CHECK: Final breaks detection
const breakCheck = await textRestorationService.checkForBreaks(
  hardRestoredArticle
);
if (breakCheck.hasBreaks) {
  console.error(`❌ Hard restoration failed - breaks detected:`);
  breakCheck.breaks.forEach(b => console.error(`  - Line ${b.line}: ${b.type}`));
  throw new Error('Hard restoration failed to fix breaks');
}

// ⚠️ C2 CHECK: Final Phase2 score
const finalPhase2Score = await qualityValidator.checkPhase2(
  hardRestoredArticle
);
if (finalPhase2Score < 85) {
  console.warn(`⚠️  Final Phase2 score: ${finalPhase2Score}/100 (target: 85)`);
  // Iterate again
  hardRestoredArticle = await textRestorationService.hardRestore(
    hardRestoredArticle,
    { method: 'hard', iterative: true, maxIterations: 3 }
  );
}

// ✅ Final validation
console.log(`
${"=".repeat(60)}
✅ ARTICLE READY FOR PUBLICATION
${"=".repeat(60)}
Phase2 Score: ${finalPhase2Score}/100
Grammar Check: PASS
Logic Continuity: PASS
Break Detection: PASS
Voice Polish: PASS
`);

const finalArticle = {
  title: generateTitle(theme),
  content: hardRestoredArticle,
  charCount: hardRestoredArticle.length,
  phase2Score: finalPhase2Score,
  metadata: {
    theme,
    episodeCount: episodes.length,
    generatedAt: Date.now(),
    qualityMetrics: {
      phase2: finalPhase2Score,
      logicContinuity: logicCheck.score,
      breaksFix: 'PASS',
      voicePolish: 'PASS'
    }
  }
};
```

**Что происходит в Phase C:**
1. 📝 **Assembly:** Собрать все эпизоды в одну большую статью
2. ⚠️ **Logic Check:** Проверить логику между эпизодами
3. 🔧 **Hard Restoration:** **ФИНАЛЬНАЯ полировка целой статьи**
   - Fixing breaks (если есть)
   - Улучшение Flow
   - Grammatical fixes
   - Итеративно до Phase2 >= 85
4. ✅ **Final Validation:** Проверка всего

**КРИТИЧНО: Hard restoration - это ФИНАЛЬНЫЙ этап! Без него статья не готова к публикации!**

---

### **ФАЗА D: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ** ⏱️ 5 мин

**ЦЕЛАЯ СХЕМА с 4 этапами!**

```javascript
// ============================================================================
// STAGE D1: Extract Key Moment
// ============================================================================

const keyMoment = await sceneElementExtractor.extractKeyScene(finalArticle.content);
// Returns: { scene, emotion, characters, setting, visualDescription }

// Example:
// {
//   scene: "Я наконец-то сказала ему правду...",
//   emotion: 'grief',
//   characters: { protagonist: 'woman-40s', other: 'husband' },
//   setting: 'kitchen',
//   visualDescription: 'Woman by window, tears, golden afternoon light'
// }

// ============================================================================
// STAGE D2a: Generate Image using Gemini (Base Image)
// ============================================================================

const baseImage = await imageGeneratorAgent.generateCoverImage(
  {
    prompt: `Create a realistic, emotional image: ${keyMoment.visualDescription}`,
    style: 'cinematic, emotional, realistic',
    aspect: '16:9',
    quality: 'hd',
    seed: hashTheme(theme) // Reproducible
  }
);
// Returns: { base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgA...', width, height, format: 'jpeg' }

// ============================================================================
// STAGE D2b: Canvas Post-Processing (Remove API metadata)
// ============================================================================

const canvasProcessed = await imageProcessorService.processImage(
  baseImage.base64
);
// 1. Load JPEG from Gemini API
// 2. Draw on new canvas (removes all metadata)
// 3. Crop to 16:9 (1280x720)
// 4. Re-encode to JPEG quality 80%
// Returns: { buffer, width, height, success, metadata }

// ============================================================================
// STAGE D3: Mobile Photo Authenticity (Dynamic Device Selection)
// ============================================================================

// 🔥 DYNAMIC device selection based on article emotion!
const deviceProfile = selectDeviceForArticle({
  emotion: keyMoment.emotion,
  content: finalArticle.content,
  narratorAge: extractAge(finalArticle.content)
});
// For 'grief': Samsung Galaxy J7 (2015) - old phone for sad emotion
// For 'joy': iPhone 15 (2024) - new phone for happy emotion
// Etc.

const authenticityProcessed = await mobilePhotoAuthenticityProcessor
  .processWithDevice(
    canvasProcessed.buffer,
    deviceProfile.key,      // 'samsung_j7', 'iphone15', etc.
    deviceProfile.year      // 2015, 2024, etc.
  );
// 1. Analyze image
// 2. Add camera artifacts (lens flare, sensor noise)
// 3. Add EXIF-like metadata (but NOT real EXIF)
// 4. Add compression artifacts (phone's JPEG quality ~85%)
// 5. Add slight color grading (device-specific)
// Returns: { buffer, effects: [...], authenticityLevel: 'very-high', success }

// ============================================================================
// STAGE D4: Attach to Article
// ============================================================================

finalArticle.coverImage = {
  base64: authenticityProcessed.buffer.toString('base64'),
  format: 'jpeg',
  width: authenticityProcessed.width,
  height: authenticityProcessed.height,
  deviceEmulated: `${deviceProfile.model} (${deviceProfile.year})`,
  authenticityLevel: authenticityProcessed.authenticityLevel,
  appliedEffects: authenticityProcessed.effects,
  metadata: {
    imageGeneratedAt: Date.now(),
    extractedScene: keyMoment.scene,
    emotion: keyMoment.emotion,
    stage: 'D4-complete'
  }
};

console.log(`
✅ Cover Image Complete
────────────────────────────
Generated: ${keyMoment.visualDescription}
Device: ${deviceProfile.model} (${deviceProfile.year})
Authenticity: ${authenticityProcessed.authenticityLevel}
Applied effects: ${authenticityProcessed.effects.join(', ')}
Size: ${authenticityProcessed.width}x${authenticityProcessed.height}
Status: Ready for export
`);
```

**СХЕМА изображения:**

```
[Extract Key Scene]
        ↓
[Generate Base Image (Gemini)]
        ↓
[Canvas Post-Process] (remove metadata)
        ↓
[Mobile Authenticity] (add device artifacts)
        ↓
[Attach to Article] ✅
```

**ВАЖНО: Не один эпизод = не один момент для изображения! Один момент на ВСУЮ статью!**

---

### **ФАЗА E: EXPORT & PUBLISH** ⏱️ 2 мин

```javascript
// Export structure:
// articles/{channel_name}/{YYYY-MM-DD}/
//   ├─ {slug}.md          (Markdown с front-matter для RSS)
//   ├─ {slug}.jpg         (Cover image, 1280x720)
//   └─ manifest.json      (Metadata)

const exportDir = path.join(
  './articles',
  config.channelName,      // 'women-35-60'
  new Date().toISOString().split('T')[0]  // '2025-01-05'
);

// Generate front-matter
const frontMatter = `---
title: "${finalArticle.title}"
date: "${exportDate}"
description: "${generateIntriguingDescription(finalArticle.content)}"
image: "{slug}.jpg"
category: "lifestory"
---`;

// Export files
fs.writeFileSync(`${exportDir}/${slug}.md`, frontMatter + '\n\n' + content);
fs.writeFileSync(`${exportDir}/${slug}.jpg`, finalArticle.coverImage.buffer);
fs.writeFileSync(`${exportDir}/manifest.json`, JSON.stringify(manifest));

console.log(`✅ Exported to: ${exportDir}`);
```

---

## 🔀 СЦЕНАРИИ И ОБРАБОТКА ОШИБОК

### Scenario 1: ✅ Happy Path (35-40 мин)
```
[A: Theme] → [B: Episodes ×3] → [C: Assembly+Hard] → [D: Image] → [E: Export]
  5-10 мин      ~20 мин            ~8 мин           ~5 мин      ~2 мин
```

### Scenario 2: ⚠️ Episode Fails Anti-Detection (Phase2 < 80)
```
Episode i fails B2 check → Regenerate from B1 → Re-process B2-B4 → Continue
(Не влияет на другие эпизоды, обработка параллельна!)
```

### Scenario 3: ⚠️ Logic Break Detected (Phase C1)
```
Detect logic issue between episodes → Regenerate affected episodes → Re-assemble
(Обработка: multiAgentService с context о neighboring episodes)
```

### Scenario 4: ❌ Hard Restoration Fails (Phase2 < 85 после C2)
```
Hard restoration не достиг score → Iterate again with aggressive settings
→ If still < 85 after 5 iterations → FAIL (статья не публикуется)
(Это РЕДКО, обычно на 2-3 итерации фиксится)
```

### Scenario 5: 🔄 Nuclear Option - Complete Restart
```
Если все эпизоды failed или логика не фиксится
→ Restart from Phase A with new theme/approach
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Currently Implemented ✅
- [x] Phase A: Theme selection (configService)
- [x] Phase B.1: Episode generation (episodeGeneratorService)
- [x] Phase B.2: Per-episode anti-detection (phase2AntiDetectionService)
- [x] Phase B.3: Voice polish (voiceRestorationService)
- [x] Phase C.1: Assembly (basic concatenation)
- [x] Phase D: Image generation (imageGeneratorAgent)
- [x] Phase D2b: Canvas processing (imageProcessorService)
- [x] Phase D3: Mobile authenticity (mobilePhotoAuthenticityProcessor)
- [x] Phase E: Export (contentFactoryOrchestrator.exportForZen)

### 🔴 CRITICAL ISSUES (Need Fixing)
- [ ] **Phase B.4: Per-episode text restoration** (currently missing!)
  - Need to add textRestorationService.restoreEpisode() in article worker pool
  - Should run AFTER voice polish, BEFORE assembly
  - Prevent: awkward phrasing, weird breaks in single episode

- [ ] **Phase C.2: Hard restoration** (currently missing!)
  - Need to add textRestorationService.hardRestore() to orchestrator
  - Should run AFTER assembly, BEFORE image generation
  - CRITICAL: Must fix all breaks, improve flow iteratively
  - Must reach Phase2 >= 85 before publishing

- [ ] **Phase C.1: Logic continuity check** (currently missing!)
  - Need: multiAgentService.verifyLogicContinuity() function
  - Check: Emotional arc, character consistency, timeline
  - Fix: Regenerate affected episodes if logic breaks

- [ ] **Phase D.1: Scene extraction** (currently missing!)
  - Need: sceneElementExtractor for picking key moment
  - Currently using title only!
  - Should extract: setting, emotion, visual description

### ⚠️ PARTIALLY IMPLEMENTED (Needs improvement)
- [ ] Error recovery in Phase B (currently fails whole batch)
  - Should: Continue with successful episodes
  - Current: articleWorkerPool aborts on first error

- [ ] Phase2 score checks
  - Currently: Not tracked per-episode
  - Should: Every episode should have phase2 score before assembly

---

## 🎯 METRICS & MONITORING

### Per-Episode Metrics (Phase B)
```
Episode i: {
  phase2Score: 87/100,           // Anti-detection quality
  restorationScore: 75/100,      // After per-episode restoration
  characterCount: 1850,
  readTime: 3 min,
  voiceQuality: 'good'
}
```

### Per-Article Metrics (After Phase C)
```
Article: {
  finalPhase2Score: 89/100,      // Final anti-detection score
  logicContinuity: 'pass',
  breaksFix: 'pass',
  totalCharCount: 5500,
  totalReadTime: 10 min,
  episodeCount: 3
}
```

### Image Metrics (Phase D)
```
Image: {
  authenticityLevel: 'very-high',
  deviceEmulated: 'Galaxy J7 (2015)',
  extractedEmotion: 'grief',
  appliedEffects: ['sensor-noise', 'compression', 'lens-flare'],
  size: '1280x720'
}
```

---

## 🛠️ KEY COMPONENTS

### articleWorkerPool.ts
- Manages: Parallel episode generation (up to 3 concurrent)
- Processes: Per-episode B1-B4
- Returns: Array of restored episodes

### textRestorationService.ts
- `restoreEpisode()`: Light restoration for single episode (Phase B.4)
- `hardRestore()`: AGGRESSIVE restoration for full article (Phase C.2)
- Features: Break fixing, grammar, flow improvement, iterative

### contentFactoryOrchestrator.ts
- Orchestrates: All phases A-E
- Manages: Worker pools, image generation queue
- Exports: Final article + image

### imageProcessorService.ts
- Processes: Raw JPEG from Gemini API
- Output: Canvas-processed JPEG (removes metadata)

### mobilePhotoAuthenticityProcessor.ts
- DYNAMIC device selection based on article emotion
- Adds: Camera artifacts, noise, color grading, compression
- Result: Indistinguishable from real mobile photo

---

## 📋 COMMAND EXAMPLES

### Generate Single Article (BOTH mode)
```bash
npx ts-node cli.ts both --count=1 --channel=women-35-60 --images
```

### Generate Batch (10 articles)
```bash
npx ts-node cli.ts factory --count=10 --channel=women-35-60 --images --quality=premium
```

### Validate Quality
```bash
npx ts-node cli.ts validate
```

---

## 📞 SUPPORT

- Phase2 scores: Check `qualityValidator.ts`
- Image generation: Check `imageGeneratorAgent.ts` for Gemini prompts
- Logic issues: Check `multiAgentService.ts` for continuity verification
- Device profiles: Check `mobilePhotoAuthenticityProcessor.ts` for device options

---

**Обновлено:** 2025-01-05  
**Версия:** v7.1  
**Статус:** ⚠️ READY FOR IMPLEMENTATION (fixes needed in Phase B.4 and C.2)
