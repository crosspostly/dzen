# 🔥 КРИТИЧНО: ПРАВИЛЬНЫЙ ПОРЯДОК ЭТАПОВ

**Статус**: 🚧 URGENT - Система НЕПРАВИЛЬНО треба реконструктировать!
**Проблема**: Stage 3 и Stage 4 поменяны местами (ПРОВОНО!)
**Ответственный**: cto-new[bot] (PR #131)

---

# ❌ НЕПРАВИЛЬНЫЙ ПОрЯдОК (PR #131):

```
Stage 0: PlotBible
  ↓
Stage 1: Episodes Generation
  ↓
Stage 2: Article Assembly (AI-детекция 60-70%)
  ↓
Stage 3: Voice Restoration (DZEN GURU) → Phase2 >= 85 ✅
  ↓
Stage 4: Phase 2 Anti-Detection ❌ ПРОБЛЕМА!
  |      (Perplexity + Burstiness + Authentic)
  |      ↓
  |      IF Score < 80:
  |        → RETURN TO STAGE 3 ❌ НЕПРАВИЛЬНО!
  |        → Stage 3 регенерирует статью
  |        → ПРОГРЫВАЫМ Все, что сделали в Stage 4! 💥
  |        → ЗНАЧИТ Stage 4 НЕ работает! ❌
  ↓
Stage 5: Quality Checklist
```

### ПОЧЕМУ ЭТО НЕПРАВИЛЬНО:

**Сценарий:**
1. Stage 3 выпулнен: диалоги в дефисах, натуральные ПЕРЕвОДЫ, Phase2 = 85 ✅
2. Stage 4 начинает: применяем Perplexity + Burstiness
3. Gatekeeper проверяет новые стандарты и говорит: Score = 65 (< 80)
4. **НАЧИНАЕТСЯ ПРОБЛЕМА**: Нужно вернуться в Stage 3
5. Stage 3 выпулняется снова: **НО ОНА ПОТОм ИГНОРИРУЕТ Stage 4 реставрации!**
6. Новые диалоги МОГУТ включать стандартные наборы фраз (AI-клише)
7. **РОВНО: Stage 4 и С ПЕрвого пропуска Score < 80, о втором - тем более!** 💥

---

# ✅ ПРАВИЛЬНЫЙ ПОРЯдОК:

```
Stage 0: PlotBible
  ↓
Stage 1: Episodes Generation + AUTO-RESTORE
         (IF Phase2 < 70: regenerate max 3 times)
         OUTPUT: Phase2 >= 70 ✅
  ↓
Stage 2: Article Assembly
         (собираем эпизоды + intro/climax/resolution)
         AI-detection: 60-70% (допустимо)
  ↓
🔤 Stage 3: Voice Restoration + DZEN GURU RULES
         (КОНТРОЛЬНОЕ МЕСТО!)
  |
  |── Диалоги в дефисах
  |── Максимум 3 имени
  |── Чередование SHORT/LONG
  |── NO AI-клише
  |── Персонаж эволюционирует
  |── ОЗВУЧИТЬ ВСЛУХ
  |
  |── IF Phase2 >= 85: CONTINUE ✅
  |── IF Phase2 < 85: AUTO-RESTORE (max 2 times)
  |── IF STILL < 85: REGENERATE Stage 2 (вернуться на этап)
  ↓
🔥 Stage 4: Phase 2 Anti-Detection (ЗАЩИТА ОТ ИИ)
         (НАКОНЕЦ! ВСЕ диалоги УЖЕ ОНАЛИ!)
  |
  |── Step 1: Perplexity Controller
  |         (редкие слова, архаизмы)
  |         Perplexity >= 3.0? ✅
  |
  |── Step 2: Burstiness Optimizer
  |         (вариативность длин)
  |         StdDev >= 6.5? ✅
  |
  |── Step 3: Authentic Narrative Engine
  |         (если Stage 3 выполнен правильно - модуль ЛИШЬ добавляет детали)
  |         Authenticity >= 75? ✅
  |
  |── Step 4: Adversarial Gatekeeper
  |         (ПРОВЕРКА ВСЕХ МЕТРИК)
  |         ✅ Perplexity >= 3.0?
  |         ✅ Burstiness >= 6.5?
  |         ✅ Authenticity >= 75?
  |         ✅ No clichés?
  |         ✅ Dialogs 40-50%?
  |         ✅ Character evolved?
  |         ✅ Content 1500-2500 chars?
  |         ✅ Final Score >= 80/100?
  |
  |── IF ALL ✅: GO TO STAGE 5
  |── IF ANY ❌: 
  |        REWIND TO STAGE 3 (НЕ К Stage 2!)
  |        (Stage 3 пересоберет, но снова на STAGE 4!
  |        НЕ регенерирует статью полностью!)
  ↓
📊 Stage 5: Quality Checklist (10 пунктов)
         (ФИНАЛЬНАЯ ПОвЕрКА ЧЕЛОВЕКом)
  |
  |── First sentence catches attention?
  |── Turning point at 30%?
  |── Climax at 60%?
  |── Reveal at 85%?
  |── Closed ending?
  |── Readable aloud naturally?
  |── No AI clichés?
  |── Dialogs 40-50%?
  |── Character changed?
  |── Max 3 names?
  |
  |── SCORE >= 8/10: PUBLISH ✅
  |── SCORE < 8/10: REWIND TO STAGE 3
  ↓
🚀 PUBLISH TO DZEN
```

---

# 📝 КОУЧИ РЕШАЯ (Pseudo-code):

```javascript
async function generateArticle(topic) {
  // STAGE 0
  const plotBible = await generatePlotBible(topic);
  
  // STAGE 1
  const episodes = [];
  for (let i = 0; i < 7; i++) {
    let episode = await generateEpisode(plotBible);
    let phase2 = calculatePhase2Score(episode);
    let attempts = 0;
    
    while (phase2 < 70 && attempts < 3) {
      episode = await autoRestore(episode); // Stage 1 restoration
      phase2 = calculatePhase2Score(episode);
      attempts++;
    }
    
    if (phase2 >= 70) {
      episodes.push(episode);
    }
  }
  
  // STAGE 2
  let article = await assembleArticle(episodes);
  // AI detection here: ~60-70% (acceptable)
  
  // STAGE 3 (LOOP START)
  let stage3Passed = false;
  let stage3Attempts = 0;
  
  while (!stage3Passed && stage3Attempts < 3) {
    article = await applyDzenGuruRules(article);
    article = await voiceRestoration(article);
    
    let phase2 = calculatePhase2Score(article);
    
    if (phase2 >= 85) {
      stage3Passed = true;
      console.log('✅ Stage 3 PASSED');
    } else {
      console.log('⚠️ Stage 3 failed, restoring...');
      stage3Attempts++;
    }
  }
  
  if (!stage3Passed) {
    console.log('❌ Stage 3 failed, regenerating Article from Stage 2');
    // Regenerate Stage 2
    return generateArticle(topic);
  }
  
  // STAGE 4 (LOOP START) - только если Stage 3 PASSED!
  let stage4Passed = false;
  let stage4Attempts = 0;
  
  while (!stage4Passed && stage4Attempts < 2) {
    // Step 1: Perplexity
    article = perplexityController(article);
    
    // Step 2: Burstiness
    article = burstinessOptimizer(article);
    
    // Step 3: Authentic (ОСТОРОЖНО! не переделать диалоги!)
    article = authenticEngine(article);
    
    // Step 4: Gatekeeper (ПРОВЕРКА)
    const score = gatekeeper.assess(article);
    
    if (score.overallScore >= 80) {
      stage4Passed = true;
      console.log('✅ Stage 4 PASSED');
    } else {
      console.log('⚠️ Stage 4 failed, returning to Stage 3');
      stage4Attempts++;
      // ВАЖНО: НЕ регенерируем Stage 2!
      // Просто возвращаемся к Stage 3
    }
  }
  
  if (!stage4Passed) {
    console.log('❌ Stage 4 failed multiple times');
    return generateArticle(topic);
  }
  
  // STAGE 5
  const checklist = await runQualityChecklist(article);
  
  if (checklist.score >= 8) {
    console.log('✅ PUBLISH!');
    return article;
  } else {
    console.log('⚠️ Checklist failed, returning to Stage 3');
    // Вернуться в Stage 3 (не Stage 2!)
    return generateArticle(topic); // или бесконечный цикл?
  }
}
```

---

# 🚧 ЧТО НУЖНО ИСПРАВИТЬ В PR #131:

| Документ | Проблема | Решение |
|----------|----------|----------|
| `ai_work/AI_TASK_BRIEFING.md` | Stage 3 и 4 поменяны местами | **Переписать порядок** |
| `stage-3-restore.md` | Описывает как КОНЕЧНЫЙ stage | **Сказать что это ПЕРЕД anti-detection** |
| `stage-4-anti-detection.md` | Описывает как ПОСЛЕДНИЙ перед checklist | **Сказать что он ПОСЛЕДНИЙ этап обработки** |
| `stage-5-checklist.md` | Правильный финал | ✅ Оставить как есть |
| `contentFactoryOrchestrator.ts` | (если создан) | **Проверить условия возврата** |

---

# 🌟 ВЫВОД:

**ТЫ АБСОЛЮТНО ПРАВ!**

Порядок КРИТИЧЕН:

1. **Stage 3 = Voice + DZEN GURU = ЖИВОТА РЕЧЬ** 
2. **Stage 4 = Anti-Detection = ЗАЩИТА ОТ ИИ** (применяется только к ЖИВОМУ тексту!)
3. **Stage 5 = Human Checklist = ФИНАЛКА**

Если инвертировать Stage 3 и 4:
- Применяем Anti-Detection к ещё-не-отреставрированному тексту
- Когда вернёмся в Stage 3, потеряем все оптимизации Stage 4
- **ВЕЧНЫЙ ЦИКЛ БЕЗ РЕЗУЛЬТАТА**

**Нужно обновить документацию НЕМЕДЛЕННО!**
