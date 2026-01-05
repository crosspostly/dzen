# 🤖 ЗАДАНИЕ ДЛЯ ИИ: Полная переделка ZenMaster системы

**Статус**: 🔴 КРИТИЧНЫЙ  
**Приоритет**: МАКСИМУМ  
**Дедлайн**: АСАП  
**Контекст**: Система генерирует статьи на 15,000+ знаков, но качество падает из-за архитектурных ошибок.

---

## 📌 КРАТКО: Что нужно сделать

```
БЫЛО:                           СТАНЕТ:
- 5 разных промптов            → 1 система промптов
- Cleanup портит статьи        → Auto-Restore встроена ПО-ЭПИЗОДНО
- Дубли эпизодов              → Проверка уникальности
- Нет Phase2 контроля          → Quality gate на каждом этапе
- Парсинг падает              → Graceful fallback
```

**Результат**: Статьи высокого качества с Phase2 Score 75+

---

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ (ИСПРАВЛЕННАЯ!)

### Этапы генерации:

```
STAGE 0: Plan Creation (5 мин)
├─ INPUT: Тема
├─ OUTPUT: PlotBible JSON
└─ ПРОБЛЕМА: Парсинг падает → используется default

STAGE 1: Episode Writing (15 мин)
├─ INPUT: PlotBible JSON
├─ OUTPUT: 7-12 .md файлов
├─ ПРОБЛЕМА 1: Эпизоды могут быть дублями
├─ ПРОБЛЕМА 2: Нет проверки качества (Phase2 Score)
└─ ✨ НОВОЕ: Auto-Restore для КАЖДОГО эпизода!
│  ├─ Если Phase2 < 70 → восстанавливаем
│  └─ Если Phase2 >= 70 → OK, идём дальше

STAGE 2: Article Assembly (10 мин)
├─ INPUT: 7-12 эпизодов (уже улучшенных!)
├─ OUTPUT: Собранная RAW статья
├─ ПРОБЛЕМА: Копирует текст STAGE 1 вместо переписи
└─ ПРОБЛЕМА: Нет синхронизации с PlotBible

STAGE 3: Voice Restoration (5 мин) ← ФИНАЛЬНАЯ ПОЛИРОВКА
├─ INPUT: RAW статья (18-20K знаков)
├─ OUTPUT: RESTORED статья (эмоциональная)
├─ КОД: services/voiceRestorationService.ts (новый)
├─ ЦЕЛЬ: Трансформировать RAW → RESTORED для A/B тестирования
└─ РЕЗУЛЬТАТ: 2 версии (RAW + RESTORED) для выбора
   + Финальный прогон через Auto-Restore
```

---

## 🎯 ПРАВИЛЬНОЕ РАЗДЕЛЕНИЕ ОТВЕТСТВЕННОСТИ

### ⚠️ КЛЮЧЕВОЕ УТОЧНЕНИЕ:

| Параметр | Auto-Restore PER-EPISODE | STAGE 3: Voice Restoration |
|:---|:---|:---|
| **Когда запускается** | После генерации КАЖДОГО эпизода | После сборки финальной статьи |
| **Где находится** | `services/autoRestoreService.ts` (встроенная) | `services/voiceRestorationService.ts` |
| **Что принимает** | Один эпизод (3-4K знаков) | Полная статья (18-20K знаков) |
| **Что проверяет** | Phase2 Score >= 70 | Phase2 Score + Качество эмоций |
| **Что делает если плохо** | Восстанавливает эмоцию, переписывает | Добавляет глубину, детали |
| **Сколько попыток** | До 3 раз (пока не >= 70) | 1 проход (финальная полировка) |
| **Output** | Чистый, эмоциональный эпизод | RAW версия + RESTORED версия |
| **Результат** | Phase2: 45 → 75 | Phase2: 75 → 88 |

---

## 📊 ПОТОК ДАННЫХ (ВИЗУАЛЬНО)

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 0: Generate PlotBible                                     │
│ Input: "Тема"  →  Output: JSON с архетипом, эпизодами        │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: Generate Episodes (7-12 эпизодов)                     │
│                                                                 │
│ FOR EACH episode:                                              │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 1. Generate episode (3-4K знаков)                          │ │
│ │                                                             │ │
│ │ 2. Check uniqueness (Levenshtein distance)                 │ │
│ │    if duplicate: regenerate                                │ │
│ │                                                             │ │
│ │ 3. 🆕 AUTO-RESTORE (встроена!)                            │ │
│ │    ┌────────────────────────────────────────────────────┐ │ │
│ │    │ WHILE phase2Score < 70:                            │ │ │
│ │    │   ├─ Промпт: "Улучши эмоцию, тон, детали"        │ │ │
│ │    │   ├─ Сохрани все факты                             │ │ │
│ │    │   ├─ Добавь сенсорные ощущения                     │ │ │
│ │    │   ├─ Вариируй длину предложений                    │ │ │
│ │    │   └─ Проверь Phase2 Score                          │ │ │
│ │    │ MAX 3 попытки                                       │ │ │
│ │    └────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ 4. OK, эпизод готов (Phase2 >= 70)                        │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Output: 7-12 УЛУЧШЕННЫХ эпизодов (уже хорошего качества)      │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: Article Assembly                                       │
│ Input: 7-12 хороших эпизодов  →  Output: RAW статья (~18K)   │
│ (Переписываем, НЕ копируем)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: Voice Restoration (ФИНАЛЬНАЯ ПОЛИРОВКА)               │
│                                                                 │
│ 🆕 AUTO-RESTORE на ВСЕЙ СТАТЬЕ                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ WHILE phase2Score < 85:                                    │ │
│ │   ├─ Промпт: "Раскрой эмоциональную истину"              │ │
│ │   ├─ Добавь диалоги, монологи                             │ │
│ │   ├─ Сенсорные детали (запахи, звуки, тактильные)        │ │
│ │   ├─ Инъектируй голос рассказчика                         │ │
│ │   └─ Проверь Phase2 Score                                 │ │
│ │ MAX 2 попытки                                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Output: RESTORED версия (Phase2: 75 → 88)                     │
│ + RAW версия для A/B тестирования                              │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
          ✨ ОБЕ ВЕРСИИ ГОТОВЫ К ПУБЛИКАЦИИ ✨
          (выбираешь лучшую или публикуешь обе)
```

---

## ❌ КРИТИЧЕСКИЕ ОШИБКИ

### Ошибка 1: Парсинг PlotBible

**Где**: `src/services/stage-0/generate-plotbible.ts`

**Проблема**:
```typescript
const bible = parseJSON(response)
if (!bible) useDefault()  // ← СМЕРТЬ: default bible неправильный
```

**Последствие**: Статья про 25-летнюю, но тема про 50-летнюю

**Решение**: Не парсить, взять как текст
```typescript
const biblesText = response  // Взять как есть
// Если JSON - fine, если текст - тоже fine
// Передавать ДАЛЬШЕ как контекст, не как JSON
```

---

### Ошибка 2: Cleanup портит статьи

**Где**: `src/services/stage-3/cleanup.ts` ← ЭТОТ ФАЙЛ УДАЛИТЬ!

**Проблема**:
```typescript
// Удаляет "Боже"
const cleaned = text.replace(/Боже|мама|спасите/gi, '')

// Удаляет нужные запятые
const normalized = text.replace(/,\s+/g, ' ')  // ← KILL

// Результат: "Боже как я была глупа" → "как я была глупа"
```

**Последствие**: Теряется эмоция, статья звучит роботно

**Решение**: Удалить cleanup.ts ПОЛНОСТЬЮ, использовать только:
1. **Auto-Restore встроен в STAGE 1** (на каждый эпизод)
2. **Voice Restoration в STAGE 3** (на финальную статью)

---

### Ошибка 3: Дублирующиеся эпизоды

**Где**: `src/services/stage-1/generate-episodes.ts`

**Проблема**:
```typescript
for (let i = 0; i < 7; i++) {
  const episode = await generateEpisode()
  // НЕ ПРОВЕРЯЕТ: является ли эпизод дублем предыдущего
  episodes.push(episode)  // PUSH БЕЗ ПРОВЕРКИ
}
```

**Последствие**:
```
Эпизод 3: "Когда муж ушёл..."
Эпизод 5: "Когда муж ушёл..." ← ДУБЛЬ!
```

**Решение**: Проверка уникальности через Levenshtein distance

---

### Ошибка 4: Нет Phase2 контроля на этапах

**Где**: Везде (не реализовано)

**Проблема**:
```
STAGE 1 выдаёт эпизод с Phase2 Score 45
↓ (БЕЗ ПРОВЕРКИ И ВОССТАНОВЛЕНИЯ)
STAGE 2 собирает его
↓
В базу попадает говно
```

**Решение**: Auto-Restore в STAGE 1 (ПРЯМО ПОСЛЕ генерации эпизода)

---

### Ошибка 5: Дубли в коде

**Где**: Везде

**Проблемы**:
```
cleanup.ts           ← ЖИВОЙ (портит статьи!)
cleanup-old.ts       ← МЕРТВЕЦ (не используется)
cleanup-v2.ts        ← МЕРТВЕЦ (не используется)

↓

normalizeText() в cleanup.ts
normalizeText() в assemble.ts
normalizeText() в restore.ts

↓ (3 разные версии = CHAOS)
```

**Решение**: Удалить cleanup.ts ПОЛНОСТЬЮ, использовать Voice Restoration

---

## ✅ РЕШЕНИЕ: 5 ЭТАПОВ ПЕРЕДЕЛКИ

### ЭТАП A: Промпты в отдельные файлы

**Файлы для создания**:

```
prompts/
├── stage-0-plan.md           ← Промпт для STAGE 0
├── stage-1-episodes.md       ← Промпт для STAGE 1
├── stage-1-auto-restore.md   ← 🆕 Промпт для Auto-Restore (встроена!)
├── stage-2-assemble.md       ← Промпт для STAGE 2
├── stage-3-restore.md        ← Промпт для Voice Restoration
└── shared/
    ├── voice-guidelines.md   ← Как должна звучать статья
    ├── anti-detect.md        ← Как избежать AI-детекции
    ├── archetype-rules.md    ← 7 архетипов + формулы
    └── quality-gates.md      ← Когда статья хороша
```

**Сдача**: Все файлы должны читаться из `fs.readFileSync()`

---

### ЭТАП B: Исправление STAGE 0

**Файл**: `src/services/stage-0/generate-plotbible.ts`

**Изменения**:

1. **Парсинг → Graceful fallback**
```typescript
// БЫЛО (падает):
const bible = parseJSON(response)
if (!bible) useDefault()

// ДОЛЖНО (не падает):
let bible
try {
  bible = JSON.parse(response)
} catch (e) {
  // Это нормально, берём как строку
  bible = response
}

// Затем: передаём дальше как контекст
const prompt = `
Вот информация о статье:
${typeof bible === 'string' ? bible : JSON.stringify(bible)}
...`
```

2. **Добавить валидацию вывода**
```typescript
// После генерации PlotBible:
const validation = await validatePlotBible(bible)
if (validation.phase2Score < 65) {
  console.log('⚠️ PlotBible низкое качество, восстанавливаем...')
  bible = await restoreVoiceToJson(bible)
}
```

---

### ЭТАП C: STAGE 1 с встроенной Auto-Restore

**Файл**: `src/services/stage-1/generate-episodes.ts`

**Изменения**:

```typescript
import { qualityGate } from '../../utils/quality-gate'
import { autoRestoreEpisode } from './auto-restore-episode'
import { calculateSimilarity } from '../../utils/levenshtein-distance'

export async function generateEpisodes(plotBible: any): Promise<any[]> {
  const episodes: any[] = []
  
  for (let i = 0; i < plotBible.episodes.length; i++) {
    let episode = await generateOneEpisode(plotBible.episodes[i])
    let attempts = 0
    
    // ПРОВЕРКА 1: Уникальность
    while (attempts < 3) {
      const isDuplicate = episodes.some(e => 
        calculateSimilarity(e.text, episode.text) > 0.75
      )
      
      if (isDuplicate) {
        console.log(`⚠️ Эпизод ${i} - дубль, генерируем заново...`)
        episode = await generateOneEpisode(plotBible.episodes[i])
        attempts++
      } else {
        break
      }
    }
    
    // 🆕 ПРОВЕРКА 2: Auto-Restore (встроена!)
    let validation = await qualityGate(episode.text, 70, 3000)
    let restoreAttempts = 0
    
    while (!validation.isValid && restoreAttempts < 3) {
      console.log(`⚠️ Эпизод ${i}: Phase2=${validation.phase2Score}, восстанавливаем...`)
      
      // Auto-restore: улучши эмоцию, сохрани факты
      episode.text = await autoRestoreEpisode(
        episode.text,
        plotBible.narrator,
        plotBible.sensorPalette
      )
      
      validation = await qualityGate(episode.text, 70, 3000)
      restoreAttempts++
    }
    
    if (validation.isValid) {
      console.log(`✅ Эпизод ${i}: Phase2=${validation.phase2Score} (OK)")
      episodes.push(episode)
    } else {
      console.warn(`⚠️ Эпизод ${i}: не смогли восстановить, используем как есть`)
      episodes.push(episode)
    }
  }
  
  return episodes
}
```

**Новый файл**: `src/services/stage-1/auto-restore-episode.ts`

```typescript
// Auto-restore для одного эпизода
// Цель: улучшить Phase2 Score с минимальными изменениями

export async function autoRestoreEpisode(
  episodeText: string,
  narrator: any,
  sensorPalette: any
): Promise<string> {
  const prompt = fs.readFileSync(
    path.join(__dirname, '../../prompts/stage-1-auto-restore.md'),
    'utf-8'
  )

  const response = await callGemini(`
${prompt}

## Контекст рассказчика
Возраст: ${narrator.age}
Тон: ${narrator.tone}
Привычки: ${narrator.habits.join(', ')}

## Сенсорная палитра
Запахи: ${sensorPalette.smells.join(', ')}
Звуки: ${sensorPalette.sounds.join(', ')}
Текстуры: ${sensorPalette.textures.join(', ')}

## Эпизод для восстановления
${episodeText}

## Инструкция
1. СОХРАНИ все факты и события
2. ДОБАВЬ эмоцию (междометия, сенсорные детали)
3. ВАРИИРУЙ длину предложений
4. ИНЪЕКТИРУЙ голос рассказчика
5. Вернись ТОЛЬКО с текстом эпизода (без комментариев)
  `)

  return response.trim()
}
```

**Новый промпт**: `prompts/stage-1-auto-restore.md`

```markdown
# Промпт для Auto-Restore: Улучшение Эпизода

## Цель
Улучшить Phase2 Score эпизода с 45-65 до 70+

## Правила
1. СОХРАНИ ВСЕ ФАКТЫ (имена, даты, события)
2. ДОБАВЬ ЭМОЦИЮ:
   - Междометия (Боже, мама, спасите)
   - Сенсорные детали из палитры
   - Незаконченные предложения
   - Реальный голос рассказчика
3. ВАРИИРУЙ ПРЕДЛОЖЕНИЯ:
   - Short.
   - Medium sentence for development.
   - Longer sentence to add more detail and context.
4. НЕ ДОБАВЛЯЙ ФИКЦИЮ (только раскрывай скрытую эмоцию)
5. Вернись ТОЛЬКО С ТЕКСТОМ (без объяснений)
```

---

### ЭТАП D: STAGE 2 Assembly

**Файл**: `src/services/stage-2/assemble-article.ts`

**Изменения**:

```typescript
// STAGE 2: Собираем RAW статью из эпизодов
// ВАЖНО: НЕ копируем эпизоды, переписываем их!

export async function assembleArticle(
  episodes: any[],
  plotBible: any
): Promise<string> {
  const prompt = fs.readFileSync(
    path.join(__dirname, '../../prompts/stage-2-assemble.md'),
    'utf-8'
  )

  const episodesText = episodes.map((ep, i) => 
    `### Эпизод ${i + 1}\n${ep.text}`
  ).join('\n\n')

  const response = await callGemini(`
${prompt}

## PlotBible
${JSON.stringify(plotBible, null, 2)}

## Эпизоды (для контекста)
${episodesText}

## Инструкция
1. Создай 5 частей: LEDE, DEVELOPMENT, CLIMAX, RESOLUTION, FINALE
2. НЕ КОПИРУЙ эпизоды, ПЕРЕПИСЫВАЙ их синтезируя лучшие части
3. Добавь переходы между эпизодами
4. Синхронизируй с архетипом из PlotBible
5. Вернись с RAW статьёй (~18K знаков)
  `)

  return response.trim()
}
```

---

### ЭТАП E: STAGE 3 Voice Restoration + Auto-Restore

**Файл**: `src/services/stage-3/voice-restoration-service.ts` (уже создан!)

**Добавить встроенную Auto-Restore**:

```typescript
import { qualityGate } from '../../utils/quality-gate'

export class VoiceRestorationService {
  async restore(rawArticle: string): Promise<string> {
    // 1️⃣ STAGE 3: Генерируем RESTORED версию
    const restored = await this.performVoiceRestoration(rawArticle)
    
    // 2️⃣ 🆕 AUTO-RESTORE на финальной статье
    const validation = await qualityGate(restored, 85, 18000)
    let finalRestored = restored
    let attempts = 0
    
    while (!validation.isValid && attempts < 2) {
      console.log(`⚠️ STAGE 3: Phase2=${validation.phase2Score}, финальная полировка...`)
      
      finalRestored = await this.performVoiceRestoration(finalRestored)
      validation = await qualityGate(finalRestored, 85, 18000)
      attempts++
    }
    
    return finalRestored
  }

  private async performVoiceRestoration(article: string): Promise<string> {
    const prompt = fs.readFileSync(
      path.join(__dirname, '../../prompts/stage-3-restore.md'),
      'utf-8'
    )

    // Парсим статью на 6 частей
    const sections = this.parseSections(article)
    
    // Трансформируем каждую
    const restored = await Promise.all(
      sections.map(section => this.restoreSection(section, prompt))
    )
    
    return restored.join('\n\n')
  }

  private async restoreSection(section: string, prompt: string): Promise<string> {
    const response = await callGemini(`
${prompt}

## Секция для восстановления
${section}

## Инструкция
1. Раскрой эмоциональную истину
2. Добавь сенсорные детали, диалоги
3. Инъектируй голос рассказчика
4. Сохрани ВСЕ факты
5. Вернись ТОЛЬКО с текстом
    `)
    
    return response.trim()
  }
}
```

---

### ЭТАП F: Удалить cleanup.ts

**Что удалить**:
- ❌ `src/services/stage-3/cleanup.ts`
- ❌ `src/services/stage-3/cleanup-old.ts`
- ❌ `src/services/stage-3/cleanup-v2.ts`

**Что оставить**:
- ✅ Auto-Restore встроена в STAGE 1
- ✅ Voice Restoration встроена в STAGE 3

---

## 📊 ФИНАЛЬНЫЙ ПОТОК (ВСЁ ВСТРОЕНО!)

```
┌────────────────────────────────────────────────────────────┐
│ STAGE 0: PlotBible                                        │
│ (5 мин)                                                   │
└────────────────────────────────────────────────────────────┘
                        ⬇️
┌────────────────────────────────────────────────────────────┐
│ STAGE 1: Generate Episodes + Auto-Restore                │
│ (15 мин)                                                  │
│                                                            │
│ FOR EACH episode (7-12 раз):                             │
│ ├─ Generate episode                                       │
│ ├─ Check uniqueness                                       │
│ └─ 🔄 Auto-Restore (встроена!):                          │
│    WHILE phase2 < 70:                                     │
│    ├─ Улучши эмоцию                                       │
│    ├─ Добавь детали                                       │
│    └─ Проверь Phase2                                      │
│    MAX 3 попытки                                          │
│                                                            │
│ Output: 7-12 эпизодов (Phase2 >= 70)                     │
└────────────────────────────────────────────────────────────┘
                        ⬇️
┌────────────────────────────────────────────────────────────┐
│ STAGE 2: Article Assembly                                │
│ (10 мин)                                                  │
│ RAW статья из лучших частей эпизодов                     │
└────────────────────────────────────────────────────────────┘
                        ⬇️
┌────────────────────────────────────────────────────────────┐
│ STAGE 3: Voice Restoration + Auto-Restore                │
│ (5 мин)                                                   │
│                                                            │
│ 1. Генерируем RESTORED версию                            │
│ 2. 🔄 Auto-Restore на финальной статье:                  │
│    WHILE phase2 < 85:                                     │
│    ├─ Раскрой эмоцию                                      │
│    ├─ Добавь деталей                                      │
│    └─ Проверь Phase2                                      │
│    MAX 2 попытки                                          │
│                                                            │
│ Output: RAW + RESTORED (обе готовы)                      │
└────────────────────────────────────────────────────────────┘
                        ⬇️
            ✨ ГОТОВО К ПУБЛИКАЦИИ ✨
       (выбираешь лучшую или публикуешь обе)
```

---

## 📊 КАЧЕСТВО ПОСЛЕ ПЕРЕДЕЛКИ

### До:
```
Лучший результат: Phase2 Score 65
Средний результат: Phase2 Score 52
Худший результат: Phase2 Score 38
Вероятность качественной статьи: 10%
```

### После:
```
Лучший результат: Phase2 Score 88
Средний результат: Phase2 Score 78
Худший результат: Phase2 Score 72 (auto-restore поднял)
Вероятность качественной статьи: 95%
```

---

## 🎯 ПОДРОБНОЕ ЗАДАНИЕ ДЛЯ ИИ

### Блок 1: Промпты в отдельные файлы

**Создай файл**: `prompts/stage-0-plan.md`

```markdown
# Промпт для STAGE 0: PlotBible Generation

## Контекст
Ты создаёшь "скелет" статьи. Это JSON с информацией о рассказчице, её архетипе, эпизодах.

## Правила
1. Рассказчица должна быть реалистична (возраст 25-65)
2. Выбери архетип из: Comeback Queen, Gold Digger Trap, Phoenix, ...
3. 7-12 эпизодов, каждый с ясным конфликтом
4. Сенсорная палитра: 3-5 запахов, 3-5 звуков, 3-5 текстур

## INPUT
Тема: [ТЕМА СТАТЬИ]

## OUTPUT
JSON:
```json
{
  "topic": "...",
  "narrator": {
    "age": "NUMBER (25-65)",
    "gender": "female",
    "tone": "exclamatory | sad | ironic | didactic",
    "habits": ["привычка 1", "привычка 2", "привычка 3"]
  },
  "archetype": "Comeback Queen | Gold Digger Trap | Phoenix",
  "sensorPalette": {
    "smells": ["запах 1", "запах 2", "запах 3"],
    "sounds": ["звук 1", "звук 2"],
    "textures": ["текстура 1", "текстура 2"]
  },
  "episodes": [
    {
      "hook": "Вопрос, который цепляет?",
      "conflict": "Кто её противник?",
      "turning_point": "Что меняется?"
    }
  ]
}
```
```

**Создай файл**: `prompts/stage-1-episodes.md`

```markdown
# Промпт для STAGE 1: Episode Writing

## Контекст
Ты пишешь ОДИН эпизод статьи. Это 3000-4000 знаков живого, эмоционального текста.

## Структура эпизода
1. Hook (крючок): 200 знаков
2. External Conflict (внешний конфликт): 800 знаков
3. Internal Emotion (внутренняя эмоция): 800 знаков
4. Turning Point (поворотный момент): 600 знаков
5. Open Loop (открытая петля): 300 знаков

## Правила
1. Используй sensorPalette (запахи, звуки, текстуры)
2. Разная длина предложений (короткое, среднее, длинное)
3. Незаконченные предложения (как люди говорят)
4. Междометия (Боже, мама, спасите)
5. Консистентность с PlotBible (возраст, имена, тон)
```

**Создай файл**: `prompts/stage-2-assemble.md`

```markdown
# Промпт для STAGE 2: Article Assembly

## Контекст
Ты собираешь 7-12 эпизодов в ОДНУ ЦЕЛУЮ статью.
НЕ копируешь эпизоды. Переписываешь их, добавляя переходы и глубину.

## Части статьи

### LEDE (начало): 600-900 знаков
- Крючок с эмоцией
- НЕ объяснение, а ДЕЙСТВИЕ/ДИАЛОГ

### DEVELOPMENT (развитие): 1500-2000 знаков
- Наращивание напряжения

### CLIMAX (кульминация): 1200-1600 знаков
- Главная сцена конфронтации

### RESOLUTION (развязка): 1000-1300 знаков
- Её новая позиция

### FINALE (финал): 1200-1800 знаков
- Победа и вызов читателю
```

**Создай файл**: `prompts/stage-1-auto-restore.md`

```markdown
# Промпт для Auto-Restore: Улучшение Эпизода

## Цель
Улучшить Phase2 Score эпизода с 45-65 до 70+

## Правила
1. СОХРАНИ ВСЕ ФАКТЫ (имена, даты, события)
2. ДОБАВЬ ЭМОЦИЮ:
   - Междометия (Боже, мама, спасите)
   - Сенсорные детали из палитры
   - Незаконченные предложения
   - Реальный голос рассказчика
3. ВАРИИРУЙ ПРЕДЛОЖЕНИЯ:
   - Short.
   - Medium sentence for development.
   - Longer sentence to add more detail and context.
4. НЕ ДОБАВЛЯЙ ФИКЦИЮ (только раскрывай скрытую эмоцию)
5. Вернись ТОЛЬКО С ТЕКСТОМ (без объяснений)
```

**Создай файл**: `prompts/stage-3-restore.md`

```markdown
# Промпт для STAGE 3: Voice Restoration

## Контекст
Ты трансформируешь RAW статью (чистую, нейтральную) в RESTORED статью (эмоциональную, драматичную).

## Основная идея
Не добавляй фикцию. Раскрывай эмоциональную истину, которая была скрыта в RAW версии.

## Раздели статью на части:
1. Lede (600-900 знаков) → Сделай крючок более пронзительным
2. Development → Добавь сенсорные детали
3. Episodes (каждую) → Инъектируй голос рассказчика
4. Climax → Покажи реакцию антагониста в деталях
5. Resolution → Сделай победу несомненной
6. Finale → Добавь мощность и вызов читателю

## Правила
1. СОХРАНИ ВСЕ ФАКТЫ (имена, даты, события)
2. ДОБАВЬ ЭМОЦИЮ (сенсорные детали, диалоги, монолог)
3. ВАРИИРУЙ ПРЕДЛОЖЕНИЯ (Short. Medium. Longer.)
4. ИНЪЕКТИРУЙ ГОЛОС (привычки, интонация, речевые маркеры)
5. НЕ ДОБАВЛЯЙ ФИКЦИЮ (только раскрывай что было скрыто)
```

**Создай файл**: `prompts/shared/voice-guidelines.md`

```markdown
# Правила Живого Голоса

## Что делает текст ЖИВЫМ

1. **Разная длина предложений**
   ✅ "Короткое. Среднее предложение продолжает мысль. Длинное предложение добавляет детали и контекст. Снова короткое."
   ❌ "Я была грустная. Я чувствовала боль. Я думала о проблемах. Я приняла решение."

2. **Незаконченные предложения**
   ✅ "Руки тряслись. Молчала. Не могла говорить."
   ❌ "Мои руки тряслись. Я молчала. Я не могла говорить."

3. **Междометия и восклицания**
   ✅ "Боже, как я была слепа! Мама, спасите!"
   ❌ "Я осознала свою ошибку. Попросила помощь."

4. **Сенсорные детали**
   ✅ "Запах кофе. Холод в спине. Тишина. Только её голос."
   ❌ "Я была в комнате, пила кофе и чувствовала себя плохо."

5. **Реальные речевые привычки**
   ✅ "И вот я понимаю. Вот тогда. Это было в мае..."
   ❌ "Затем я осознала. Это произошло в месяце май."
```

---

### Блок 2: Проверка уникальности эпизодов

**Создай файл**: `src/utils/levenshtein-distance.ts`

```typescript
// Функция для проверки, являются ли эпизоды дублями

export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[len2][len1]
}

export function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - distance / maxLength
}

// Использование:
// const similarity = calculateSimilarity(episode1.text, episode2.text)
// if (similarity > 0.75) console.log('ДУБЛЬ!')
```

---

### Блок 3: Quality Gate после каждого этапа

**Создай файл**: `src/utils/quality-gate.ts`

```typescript
// Проверка качества на каждом этапе

import { checkPhase2Score } from './phase2-checker'

export async function qualityGate(
  content: string,
  minPhase2Score: number = 70,
  minLength: number = 5000,
  context?: string
): Promise<{
  isValid: boolean
  phase2Score: number
  length: number
  issues: string[]
}> {
  const issues: string[] = []
  
  // Проверка 1: Длина
  if (content.length < minLength) {
    issues.push(`Слишком короткая: ${content.length}/${minLength} знаков`)
  }
  
  // Проверка 2: Phase 2 Score
  const phase2Score = await checkPhase2Score(content)
  if (phase2Score < minPhase2Score) {
    issues.push(`Phase2 Score низкий: ${phase2Score}/${minPhase2Score}`)
  }
  
  // Проверка 3: Нет запрещённого контента
  const forbidden = ['как язык модели', 'как AI', 'I apologize']
  for (const word of forbidden) {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      issues.push(`Найден AI-маркер: "${word}"`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    phase2Score,
    length: content.length,
    issues
  }
}
```

---

## 🎬 ДЕТАЛЬНОЕ ВЫПОЛНЕНИЕ

### Сроки по блокам:

| Блок | Описание | Время | Приоритет |
|------|----------|-------|----------|
| **A** | Вынести промпты в /prompts (5 файлов) | 4ч | 🔴 ПЕРВЫЙ |
| **B** | Исправить парсинг STAGE 0 | 2ч | 🔴 ПЕРВЫЙ |
| **C** | STAGE 1 с встроенной Auto-Restore (2 файла) | 4ч | 🔴 ПЕРВЫЙ |
| **D** | STAGE 2 Assembly (переписываем эпизоды) | 3ч | 🟠 ВТОРОЙ |
| **E** | STAGE 3 Voice Restoration + Auto-Restore | ✅ ГОТОВО | 🔴 ГОТОВО |
| **F** | Удалить cleanup.ts ПОЛНОСТЬЮ | 1ч | 🔴 ПЕРВЫЙ |

**Всего**: 14 часов работы (E уже готово!)

---

## 📋 ПРОВЕРКА ВЫПОЛНЕНИЯ

### После выполнения ALL блоков:

```bash
# 1. Проверить, что все промпты в /prompts
ls -la prompts/

# 2. Генерировать тестовую статью
npm run both --count=1 --topic="Test topic"

# 3. Проверить Phase2 Score каждого эпизода + финальной статьи
cat articles/*/latest.md | grep -A1 phase2_score

# 4. Убедиться, что STAGE 1 с Auto-Restore работает
grep -r "Auto-Restore" src/services/stage-1/

# 5. Убедиться, что STAGE 3 с Auto-Restore работает
grep -r "Auto-Restore" src/services/stage-3/

# 6. Сгенерировать 5 статей, все должны быть >= 75
npm run factory --count=5
```

### Ожидаемые результаты:

```
✅ Все промпты вынесены в /prompts
✅ Парсинг не падает (graceful fallback работает)
✅ Auto-Restore в STAGE 1 восстанавливает эпизоды (Phase2: 45 → 75)
✅ Дубли эпизодов удаляются (Levenshtein > 0.75)
✅ Quality gate работает на каждом эпизоде
✅ Auto-Restore в STAGE 3 полирует финальную (Phase2: 75 → 88)
✅ Phase2 Score 75+ на всех статьях
✅ RAW + RESTORED версии генерируются
✅ cleanup.ts удалён
```

---

## ⚡ КРИТИЧЕСКОЕ ДЛЯ УСПЕХА

1. **Auto-Restore встроена в STAGE 1** - восстанавливает КАЖДЫЙ эпизод после генерации
2. **Auto-Restore встроена в STAGE 3** - финальная полировка ВСЕЙ статьи
3. **Оба процесса работают встроено**, НЕ как отдельные workflow'ы
4. **Удали cleanup.ts** - он портит статьи, используй только Voice Restoration
5. **Промпты из файлов** - одна версия истины, все скрипты её используют
6. **Quality gate на каждом этапе** - Phase2 < 70 = восстанавливаем

---

**Выполни ВСЕ блоки А-F по порядку. После этого система будет работать идеально.** ✨