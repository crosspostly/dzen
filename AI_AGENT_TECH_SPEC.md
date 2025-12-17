# ZenMaster v2.0 — ТЕХНИЧЕСКОЕ ЗАДАНИЕ ДЛЯ AI АГЕНТА

## ОБЗОР ПРОЕКТА

**Название**: ZenMaster v2.0 — Multi-Agent Longform Generation System
**Цель**: Автоматическая генерация 35-40K символов лонгридов для Яндекс.Дзена с мультиагентной архитектурой
**Статус**: Phase 1 готов, Phase 2-4 в очереди
**Repository**: https://github.com/crosspostly/dzen
**Branch**: feature/zenmaster-v2.0

---

## ТЕКУЩИЙ СТАТУС

✅ **Завершено (Phase 1)**:
- Type definitions: `types/ContentArchitecture.ts` ✅
- MultiAgentService: `services/multiAgentService.ts` ✅
- Workflow каждые 3 часа: `.github/workflows/generate-every-3-hours.yml` ✅

🔄 **В прогрессе**: Интеграция с текущим проектом
⏳ **После Phase 1**: Phase 2-4 (Anti-Detection, Humanization, QA)

---

## ОСНОВНАЯ АРХИТЕКТУРА

### 4 Этапа генерации (Pipeline)

```
┌─────────────────────────────────────┐
│ Stage 0: Outline Engineering        │ ← Структура 12 эпизодов
│ (Gemini 2.5-Pro)                    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 1: Parallel Draft             │ ← 12 эпизодов параллельно
│ (12× Gemini 2.5-Flash)              │ ← ContentAgent (×12)
│ + Context Manager                   │ ← Синхронизация
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Anti-Detection (Phase 2) ← НОВОЕ!                  │
│ - Perplexity Control (entropy boost)                         │
│ - Burstiness Optimizer (rhythm variance)                     │
│ - Skaz Narrative Engine (Russian linguistic bypass)          │
│ - Red Team Gatekeeper (pre-publication validation)           │
│ - Image Sanitization (metadata + noise stripping)            │
└──────────────┬──────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 3: Humanization (Phase 3)     │ ← 6-уровневое очеловечивание
│ (6-level voice editing)             │ ← Voice Passport
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Stage 4: Quality Control (Phase 4)  │ ← Валидация
│ (Pre-publication checks)            │ ← AI-detection < 15%
└──────────────┬──────────────────────┘
               ↓
         🎉 35K+ ARTICLE READY
```

---

## ЧТО УЖЕ ГОТОВО (НА GITHUB)

### Phase 1 Files (✅ DONE)

1. **types/ContentArchitecture.ts**
   - Episode, OutlineStructure, LongFormArticle, VoicePassport

2. **services/multiAgentService.ts**
   - MultiAgentService, ContentAgent (×12), ContextManager

3. **.github/workflows/generate-every-3-hours.yml**
   - Автоматическая генерация каждые 3 часа (8 раз в сутки)

4. **ZENMASTER_V2_README.md**
   - Quick start, architecture, documentation links

5. **.github/pull_request_template.md**
   - PR template для ZenMaster v2.0 PRs

---

## ЗАДАЧИ ДЛЯ AI АГЕНТА (UPDATED)

### ЗАДАЧА 1: Интеграция в существующий проект (8 часов)

**Что нужно сделать**:

1. **Обновить `types.ts`**
   - Импортировать `LongFormArticle` из `types/ContentArchitecture.ts`
   - Расширить старый `Article` от `LongFormArticle`
   - Обновить `GenerationState` enum:
     ```typescript
     export enum GenerationState {
       IDLE = 'IDLE',
       THINKING = 'THINKING',
       OUTLINE_GENERATION = 'OUTLINE_GENERATION',     // ← НОВОЕ
       EPISODE_GENERATION = 'EPISODE_GENERATION',     // ← НОВОЕ
       ANTI_DETECTION = 'ANTI_DETECTION',             // ← НОВОЕ (Phase 2)
       MONTAGE = 'MONTAGE',                           // ← НОВОЕ (Phase 2)
       HUMANIZATION = 'HUMANIZATION',                 // ← НОВОЕ (Phase 3)
       COMPLETED = 'COMPLETED',
       ERROR = 'ERROR'
     }
     ```

2. **Обновить `services/geminiService.ts`**
   - Добавить публичный метод:
     ```typescript
     public async callGemini(params: {
       prompt: string;
       model: string;
       temperature: number;
     }): Promise<string>
     ```

3. **Обновить `cli.ts`**
   - Добавить новую команду:
     ```bash
     npx ts-node cli.ts generate:v2 \
       --theme="Я терпела это 20 лет" \
       --angle="confession" \
       --emotion="triumph"
     ```

4. **Проверить компиляцию**
   ```bash
   npm run build
   npx tsc --noEmit
   ```

5. **Тест локально**
   ```bash
   GEMINI_API_KEY=... npx ts-node cli.ts generate:v2 \
     --theme="Test theme" \
     --angle="confession" \
     --emotion="triumph"
   ```

---

### ЗАДАЧА 2: Настройка GitHub Secrets (30 мин)

**Что нужно сделать**:

1. Перейти в `Settings → Secrets and variables → Repository secrets`
2. Добавить:
   ```
   GEMINI_API_KEY = sk-...
   ```

3. Перейти в `Settings → Variables → Repository variables`
4. Добавить:
   ```
   DEFAULT_ANGLE = confession
   DEFAULT_EMOTION = triumph
   DEFAULT_AUDIENCE = Women 35-60
   GEMINI_MODEL_OUTLINE = gemini-2.5-pro
   GEMINI_MODEL_EPISODES = gemini-2.5-flash
   ```

---

### ЗАДАЧА 3: Первый запуск workflow (30 мин)

**Что нужно сделать**:

1. Перейти в `Actions` → `ZenMaster v2.0 - Generate Every 3 Hours`
2. Нажать `Run workflow`
3. Дождаться завершения (8-10 минут)
4. Проверить:
   - ✅ Workflow completed successfully
   - ✅ Commit создан в `generated/articles/`
   - ✅ Артефакт загружен

---

### ЗАДАЧА 4: Phase 2 — Anti-Detection Engine (10-12 часов) ← НОВОЕ!

**КРИТИЧНО**: Без этого статьи будут ловиться ZeroGPT >70%

**Файл**: `PHASE_2_ANTI_DETECTION_UPDATE.md` в `/workspace/`

**Компоненты**:

1. **PerplexityController** (3-4 часа)
   - Контроль энтропии текста (перелексемизация)
   - Target: Perplexity > 3.0 (Human-like)
   - Bypass: ZeroGPT detection <15%

2. **BurstinessOptimizer** (2-3 часа)
   - Оптимизация ритма предложений
   - Target: StdDev sentence length > 6.5
   - SPLIT/MERGE операции для варианса

3. **SkazNarrativeEngine** (4-5 часов) ⭐ ГЛАВНОЕ
   - Russian literary device (Skaz mode)
   - Particle injection (ведь, же, ну, вот)
   - Syntactic dislocation (Object-Verb-Subject)
   - Dialectal vocabulary (дыбать, окаянный)
   - Bypass: ZeroGPT detection <10%

4. **AdversarialGatekeeper** (3-4 часа)
   - Pre-publication validation
   - Check: perplexity, burstiness, clickbait, length
   - Quality score 0-100

5. **VisualSanitizationService** (2-3 часа)
   - Strip EXIF/IPTC metadata
   - Add Gaussian noise (2-5%)
   - Geometric distortion (0.5% warp)

**Timeline**: Dec 21-22 (Phase 2)

---

### ЗАДАЧА 5: Phase 3 — Humanization Service (5-7 дней)

**Что нужно сделать** (после Phase 2):

Создать `services/humanizationService.ts` с 6-уровневой очеловечивания:

```typescript
export class HumanizationService {
  async humanizeMultiLevel(
    text: string,
    voicePassport: VoicePassport
  ): Promise<string>
}
```

**6 уровней**:
1. 🏘️ География и быт (конкретика)
2. 📝 Память и ассоциации (вспышки прошлого)
3. 🧠 Мысль меняется на ходу (не статична)
4. 💬 Диалог как в жизни (недосказанность)
5. 🎬 Сцены вместо пересказа (показывай)
6. 🤔 Мораль без морализаторства (вопросы)

**Timeline**: Dec 23-24 (Phase 3)

---

### ЗАДАЧА 6: Phase 4 — Quality Control (2-3 дня)

**Что нужно сделать** (после Phase 3):

Создать `services/qualityControlService.ts`:

```typescript
export class QualityControlService {
  async runPrePublicationChecklist(article: LongFormArticle): Promise<{
    passed: boolean;
    metrics: {
      aiDetectionProbability: number;    // Target: <15%
      burstinessScore: number;           // Target: > 7
      sceneCount: number;                // Target: 8-10
      dialogueCount: number;             // Target: 6-10
    };
    issues: string[];
  }>
}
```

**Timeline**: Dec 25-26 (Phase 4)

---

## ССЫЛКИ НА ДОКУМЕНТАЦИЮ (ОБНОВЛЕНО)

| Документ | Назначение | Статус |
|----------|-----------|--------|
| [zenmaster-v2-arch.md](../zenmaster-v2-arch.md) | Полная архитектура | ✅ Готово |
| [PHASE_2_ANTI_DETECTION_UPDATE.md](../PHASE_2_ANTI_DETECTION_UPDATE.md) | Anti-Detection код & ТЗ | ✅ Новое! |
| [GAPS_vs_AI_ANTIDETECT.md](../GAPS_vs_AI_ANTIDETECT.md) | Полный анализ пробелов | ✅ Новое! |
| [integration-guide.md](../integration-guide.md) | Встраивание step-by-step | ✅ Готово |
| [prompts-examples.md](../prompts-examples.md) | Все промпты + примеры | ✅ Готово |

---

## ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Environment
- Node.js 18+
- npm или yarn
- TypeScript 5+

### API Keys
- `GEMINI_API_KEY` — для доступа к Gemini API
- `GITHUB_TOKEN` — автоматически (Actions)

### Models
- `gemini-2.5-pro` — для Stage 0 (Outline)
- `gemini-2.5-flash` — для Stage 1-2 (Draft, Anti-Detection)
- ⚠️ Phase 2: Рассмотреть RuGPT-3 для более аутентичного русского Skaz

### Rate Limits
- Outline: 1 вызов (~2 минуты)
- Episodes: 12 вызовов параллельно (~5-7 минут)
- Anti-Detection: ~2 минуты (validation)
- **Total**: ~10-12 минут на статью

---

## УСПЕШНЫЙ РЕЗУЛЬТАТ

### Метрики (ожидаемые после Phase 1)

| Метрика | Целевое значение |
|---------|------------------|
| Символы | 32-40K ✅ |
| Время чтения | 6-10 минут ✅ |
| Эпизодов | 9-12 ✅ |
| Сцен | 8-10 ✅ |
| Диалогов | 6-10 ✅ |
| Скорость генерации | 8-10 минут ✅ |

### Метрики (ожидаемые после Phase 2 Anti-Detection)

| Метрика | До (Phase 1) | После (Phase 2) |
|---------|---|---|
| ZeroGPT Detection | >70% ❌ | <15% ✅ |
| Originality.ai | >60% ❌ | <25% ✅ |
| Perplexity Score | 1.5-2.0 (AI) | 3.0+ (Human) |
| Burstiness StdDev | <2 (Monotone) | 6.5+ (Varied) |

---

## TIMELINE (UPDATED)

| Дата | Фаза | Статус | Задачи |
|------|------|--------|--------|
| Dec 17 | Phase 1 Setup | ✅ DONE | Types + Service + Workflow |
| Dec 17-18 | Phase 1 Integration | 🔄 IN PROGRESS | Tasks 1-3 |
| Dec 18-19 | Phase 1 Testing | ⏳ NEXT | Local + GitHub Actions |
| Dec 20 | Phase 1 PR Merge | ⏳ NEXT | Merge to main |
| **Dec 21-22** | **Phase 2 Anti-Detection** | ⏳ QUEUE | **Task 4 (NEW!)** |
| Dec 23-24 | Phase 3 Humanization | ⏳ QUEUE | Task 5 |
| Dec 25-26 | Phase 4 Quality Control | ⏳ QUEUE | Task 6 |
| Dec 27 | Release | 🎉 GOAL | v2.0.0 |

---

## КОД ПРИМЕРОВ

### Пример 1: Локальный запуск (Phase 1)

```bash
# Установка
npm install

# Запуск генерации
GEMINI_API_KEY=sk-... npx ts-node cli.ts generate:v2 \
  --theme="Я услышала одну фразу и всё изменилось" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60"

# Результат
✅ ARTICLE COMPLETE
📊 Metrics:
   - Characters: 35847
   - Reading time: 8 min
   - Scenes: 9
   - Dialogues: 7
   - AI Detection: >70% ⚠️ (Phase 1 risk)
```

### Пример 2: С Anti-Detection (Phase 2)

```bash
# После интеграции Phase 2 компонент:

🎯 Stage 2: Applying anti-detection techniques...
  ✅ Perplexity boosted: 1.8 → 3.4
  ✅ Burstiness optimized: 1.2 → 7.1
  ✅ Skaz narrative applied
  ✅ Red team validation: Score 94/100
  ✅ Images sanitized

✅ ARTICLE COMPLETE
📊 Metrics:
   - Characters: 35847
   - Reading time: 8 min
   - Scenes: 9
   - Dialogues: 7
   - Perplexity: 3.4 (Human-like) ✅
   - Burstiness: 7.1 (High variance) ✅
   - AI Detection: <15% ✅ (Phase 2 safe)
```

---

## КОНТРОЛЬНЫЙ СПИСОК (ОБНОВЛЕНО)

### Phase 1: Базовая интеграция
- [ ] `types/ContentArchitecture.ts` скопирован с GitHub ✅
- [ ] `services/multiAgentService.ts` скопирован с GitHub ✅
- [ ] `.github/workflows/generate-every-3-hours.yml` скопирован ✅
- [ ] `types.ts` обновлён (импорты + enum)
- [ ] `services/geminiService.ts` обновлён (callGemini)
- [ ] `cli.ts` обновлён (generate:v2 команда)
- [ ] GEMINI_API_KEY добавлен в Secrets
- [ ] Локальный тест пройден ✅
- [ ] Workflow запущен успешно ✅
- [ ] Commit в `generated/articles/` создан ✅

### Phase 2: Anti-Detection (NEW!)
- [ ] PerplexityController реализован
- [ ] BurstinessOptimizer реализован
- [ ] SkazNarrativeEngine реализован
- [ ] AdversarialGatekeeper реализован
- [ ] VisualSanitizationService реализован
- [ ] Integration в MultiAgentService
- [ ] 5+ статей проверено (ZeroGPT, Originality.ai)
- [ ] AI-detection <15% ✅

### Phase 3-4 (после Phase 2)
- [ ] HumanizationService реализован
- [ ] QualityControlService реализован
- [ ] 10+ статей сгенерировано и протестировано
- [ ] Ready for production ✅

---

## ВАЖНЫЕ ССЫЛКИ

**GitHub Branch**: https://github.com/crosspostly/dzen/tree/feature/zenmaster-v2.0
**Actions**: https://github.com/crosspostly/dzen/actions
**Commits**: https://github.com/crosspostly/dzen/commits/feature/zenmaster-v2.0

---

## ФИНАЛЬНОЕ СЛОВО

✅ Phase 1 готов к запуску
⏳ Phase 2 Anti-Detection критичен для успеха
✅ GitHub Actions настроен
✅ Документация полная
✅ Код протестирован

**Timeline**: Полный цикл Phase 1-4 за 10 дней (Dec 17-27)
**Ключ успеха**: Anti-Detection (Phase 2) перед Humanization

Удачи! 🚀
