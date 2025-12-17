# 🚀 ZENMASTER V2.0 — ТЕХНИЧЕСКОЕ ЗАДАНИЕ ДЛЯ AI АГЕНТА

## ПРОБЛЕМА

**Сейчас**: Параметры генерации (angle, emotion, audience, модели) хранятся в GitHub Variables
```
GEMINI_MODEL_OUTLINE = gemini-2.5-pro
GEMINI_MODEL_EPISODES = gemini-2.5-flash
DEFAULT_ANGLE = confession
DEFAULT_EMOTION = triumph
DEFAULT_AUDIENCE = Women 35-60
```

**Проблема**: Это работает только для **ОДНОГО** канала (Яндекс.Дзена). Когда добавишь Medium, Substack, Habr — они будут конкурировать за одни переменные! 🔥

---

## РЕШЕНИЕ

**Перенести ВСЕ параметры из GitHub Variables в конфиги каналов!**

```
config/channels.config.ts ← ВСЕ параметры здесь!
├── DZEN_CONFIG
│   ├── defaultAngle: 'confession'
│   ├── defaultEmotion: 'triumph'
│   ├── defaultAudience: 'Women 35-60'
│   ├── modelOutline: 'gemini-2.5-pro'
│   └── modelEpisodes: 'gemini-2.5-flash'
├── MEDIUM_CONFIG
│   ├── defaultAngle: 'observer'
│   ├── defaultEmotion: 'triumph'
│   ├── defaultAudience: 'Tech Founders'
│   ├── modelOutline: 'gemini-2.5-pro'
│   └── modelEpisodes: 'gemini-2.5-flash'
├── SUBSTACK_CONFIG
│   └── (свои параметры)
└── HABR_CONFIG
    └── (свои параметры)
```

---

## ЗАДАЧА: Обновить Workflow

### ЧТО СЕЙЧАС ДЕЛАЕТ WORKFLOW:

```yaml
# .github/workflows/generate-every-3-hours.yml

steps:
  - name: Generate article
    run: |
      npx ts-node cli.ts generate:v2 \
        --theme="Random theme" \
        --angle="${{ vars.DEFAULT_ANGLE }}"          # ← берёт из Variables
        --emotion="${{ vars.DEFAULT_EMOTION }}"      # ← берёт из Variables
        --audience="${{ vars.DEFAULT_AUDIENCE }}"
        --model-outline="${{ vars.GEMINI_MODEL_OUTLINE }}"
        --model-episodes="${{ vars.GEMINI_MODEL_EPISODES }}"
```

### ЧТО ДОЛЖНО БЫТЬ:

```yaml
# .github/workflows/generate-every-3-hours.yml

steps:
  - name: Generate for Dzen
    run: |
      npx ts-node cli.ts generate:v2 \
        --channel=dzen                    # ← канал, ВСЁ остальное из конфига!
        --theme="Random theme"
```

**Все параметры (angle, emotion, audience, модели) в `config/channels.config.ts`!**

---

## ЗАДАЧА 1: Обновить CLI команду

**Файл**: `cli.ts`

**Было**:
```bash
npx ts-node cli.ts generate:v2 \
  --theme="..." \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60" \
  --model-outline="gemini-2.5-pro" \
  --model-episodes="gemini-2.5-flash"
```

**Должно быть**:
```bash
npx ts-node cli.ts generate:v2 \
  --channel=dzen \
  --theme="..."
```

**Логика**:
1. `--channel=dzen` указывает на `DZEN_CONFIG`
2. AI агент загружает конфиг: `getChannelConfig('dzen')`
3. Все параметры берутся из конфига:
   - `angle` → `config.defaultAngle`
   - `emotion` → `config.defaultEmotion`
   - `audience` → `config.defaultAudience`
   - `modelOutline` → `config.modelOutline`
   - `modelEpisodes` → `config.modelEpisodes`

**Что менять**:
- Парсинг аргументов: добавь `--channel`
- Удали парсинг: `--angle`, `--emotion`, `--audience`, `--model-outline`, `--model-episodes`
- Перед генерацией: `const config = getChannelConfig(channel)`
- Используй параметры из `config`

---

## ЗАДАЧА 2: Обновить Workflow для Dzen

**Файл**: `.github/workflows/generate-every-3-hours.yml`

**Было**:
```yaml
steps:
  - name: Generate article
    run: |
      npx ts-node cli.ts generate:v2 \
        --theme="${{ needs.select-theme.outputs.theme }}" \
        --angle="${{ vars.DEFAULT_ANGLE }}" \
        --emotion="${{ vars.DEFAULT_EMOTION }}" \
        --audience="${{ vars.DEFAULT_AUDIENCE }}" \
        --model-outline="${{ vars.GEMINI_MODEL_OUTLINE }}" \
        --model-episodes="${{ vars.GEMINI_MODEL_EPISODES }}"
```

**Должно быть**:
```yaml
steps:
  - name: Generate article for Dzen
    run: |
      npx ts-node cli.ts generate:v2 \
        --channel=dzen \
        --theme="${{ needs.select-theme.outputs.theme }}"
```

**Что менять**:
- Убрать все `--angle`, `--emotion`, `--audience`, `--model-*` флаги
- Добавить `--channel=dzen`
- Готово! ✅

---

## ЗАДАЧА 3: Создать Workflow для других каналов (будущее)

**Файлы** (создать ПОСЛЕ Phase 1):
- `.github/workflows/generate-medium-3x-daily.yml` → `--channel=medium`
- `.github/workflows/generate-substack-4x-daily.yml` → `--channel=substack`
- `.github/workflows/generate-habr-3x-daily.yml` → `--channel=habr`

Логика одинаковая:
```yaml
run: |
  npx ts-node cli.ts generate:v2 \
    --channel=medium \
    --theme="..."
```

---

## ЗАДАЧА 4: CLI команда для ВСЕХ каналов

**Команда**:
```bash
npx ts-node cli.ts generate:all
```

**Логика**:
1. Получить все каналы: `getAllChannels()`
2. Для каждого: `const config = getChannelConfig(ch.id)`
3. Запустить генерацию с параметрами из конфига
4. Результаты в `./generated/{channelId}/`

---

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### Дзен (текущий канал)
```bash
npx ts-node cli.ts generate:v2 --channel=dzen --theme="Я терпела это 20 лет"

✅ Используется DZEN_CONFIG:
  - angle: confession
  - emotion: triumph
  - audience: Women 35-60
  - model: gemini-2.5-pro (outline), gemini-2.5-flash (episodes)
```

### Medium (будущее)
```bash
npx ts-node cli.ts generate:v2 --channel=medium --theme="Building in public"

✅ Используется MEDIUM_CONFIG:
  - angle: observer
  - emotion: triumph
  - audience: Tech Founders
  - model: gemini-2.5-pro (outline), gemini-2.5-flash (episodes)
```

### Все каналы одновременно
```bash
npx ts-node cli.ts generate:all

✅ Генерирует для dzen, medium, substack, habr
✅ Каждый с СОБСТВЕННЫМИ параметрами
✅ Результаты в ./generated/dzen/, ./generated/medium/, и т.д.
```

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Что менять | Сложность |
|------|-----------|----------|
| `cli.ts` | Парсинг аргументов + использование конфига | ⭐⭐ |
| `.github/workflows/generate-every-3-hours.yml` | Убрать флаги, добавить `--channel=dzen` | ⭐ |
| `services/multiAgentService.ts` | Принять конфиг как параметр (опционально) | ⭐ |

---

## ФАЙЛЫ НА GITHUB (уже готовы)

✅ `config/channels.config.ts` — все конфиги с параметрами
✅ `CONFIG_SETUP.md` — как добавить новый канал
✅ `ZENMASTER_STATUS.md` — статус проекта

---

## ПРОВЕРКА (CI/CD)

**После изменений**:
```bash
# Компиляция
npm run build

# Типизация
npx tsc --noEmit

# Локальный тест Dzen
npx ts-node cli.ts generate:v2 --channel=dzen --theme="Test"

# Тест всех каналов
npx ts-node cli.ts generate:all
```

---

## ПРЕИМУЩЕСТВА

✅ **Масштабируемость**: Добавить новый канал = добавить конфиг + создать workflow
✅ **Чистота**: GitHub Variables только для API ключей
✅ **Независимость**: Каждый канал может иметь разные angle, emotion, audience, модели
✅ **Переиспользование**: Один CLI команда работает для всех каналов
✅ **Тестируемость**: Легко тестировать разные конфиги локально

---

## TIMELINE

| Задача | Время | Статус |
|--------|-------|--------|
| Задача 1: cli.ts | 1-2 часа | ⏳ TODO |
| Задача 2: workflow | 30 мин | ⏳ TODO |
| Задача 3: otros workflows | 2-3 часа | ⏳ QUEUE (после Phase 1) |
| Задача 4: generate:all | 1 час | ⏳ QUEUE (после Phase 1) |
| **Total** | **5-7 часов** | 🚀 |

---

## КРИТЕРИЙ УСПЕХА

```bash
# ✅ Command работает
npx ts-node cli.ts generate:v2 --channel=dzen --theme="Test"

# ✅ Используются параметры из DZEN_CONFIG
echo $config.defaultAngle    # confession
echo $config.defaultEmotion  # triumph
echo $config.defaultAudience # Women 35-60

# ✅ Workflow не использует GitHub Variables для параметров
grep -v "DEFAULT_ANGLE\|DEFAULT_EMOTION\|GEMINI_MODEL" .github/workflows/generate-every-3-hours.yml

# ✅ GitHub Variables содержат только API ключи
GEMINI_API_KEY_DZEN = sk-...
MEDIUM_API_KEY = ...
```

---

**Это ТЗ для AI агента. Код трогать НЕ буду. Только описал что делать.** 🎯
