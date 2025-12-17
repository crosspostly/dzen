# 🚀 ZENMASTER V2.0 — ТЕХНИЧЕСКОЕ ЗАДАНИЕ ДЛЯ AI АГЕНТА

## ПРОБЛЕМА

**Сейчас**: Параметры генерации хранятся в GitHub Variables
```
GEMINI_MODEL_OUTLINE = gemini-2.5-pro
GEMINI_MODEL_EPISODES = gemini-2.5-flash
DEFAULT_ANGLE = confession
DEFAULT_EMOTION = triumph
DEFAULT_AUDIENCE = Women 35-60
```

**Проблема**: Эти переменные общие! Когда добавишь **новые каналы Дзена** (например, для мужчин 25-40, для молодых мам и т.д.) — они будут конкурировать за одни переменные! 🔥

---

## РЕШЕНИЕ

**Перенести ВСЕ параметры из GitHub Variables в конфиги каналов ДЗЕНА!**

```
config/dzen-channels.config.ts ← ВСЕ каналы Дзена здесь!
├── DZEN_WOMEN_35_60_CONFIG
│   ├── defaultAngle: 'confession'
│   ├── defaultEmotion: 'triumph'
│   ├── defaultAudience: 'Women 35-60'
│   ├── modelOutline: 'gemini-2.5-pro'
│   └── modelEpisodes: 'gemini-2.5-flash'
├── DZEN_YOUNG_MOMS_CONFIG
│   ├── defaultAngle: 'scandal'
│   ├── defaultEmotion: 'liberation'
│   ├── defaultAudience: 'Young Moms 25-35'
│   └── ...
├── DZEN_MEN_25_40_CONFIG
│   ├── defaultAngle: 'observer'
│   ├── defaultEmotion: 'triumph'
│   ├── defaultAudience: 'Men 25-40'
│   └── ...
└── (добавлять новые каналы Дзена по мере надобности)
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
  - name: Generate for Dzen Women 35-60
    run: |
      npx ts-node cli.ts generate:v2 \
        --dzen-channel=women-35-60             # ← канал Дзена, ВСЁ остальное из конфига!
        --theme="Random theme"
```

**Все параметры (angle, emotion, audience, модели) в `config/dzen-channels.config.ts`!**

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
  --dzen-channel=women-35-60 \
  --theme="..."
```

**Логика**:
1. `--dzen-channel=women-35-60` указывает на конфиг этого канала
2. AI агент загружает конфиг: `getDzenChannelConfig('women-35-60')`
3. Все параметры берутся из конфига:
   - `angle` → `config.defaultAngle`
   - `emotion` → `config.defaultEmotion`
   - `audience` → `config.defaultAudience`
   - `modelOutline` → `config.modelOutline`
   - `modelEpisodes` → `config.modelEpisodes`

**Что менять**:
- Парсинг аргументов: добавь `--dzen-channel`
- Удали парсинг: `--angle`, `--emotion`, `--audience`, `--model-outline`, `--model-episodes`
- Перед генерацией: `const config = getDzenChannelConfig(channel)`
- Используй параметры из `config`

---

## ЗАДАЧА 2: Обновить Workflow для Дзена

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
  - name: Generate article for Dzen Women 35-60
    run: |
      npx ts-node cli.ts generate:v2 \
        --dzen-channel=women-35-60 \
        --theme="${{ needs.select-theme.outputs.theme }}"
```

**Что менять**:
- Убрать все `--angle`, `--emotion`, `--audience`, `--model-*` флаги
- Добавить `--dzen-channel=women-35-60`
- Готово! ✅

---

## ЗАДАЧА 3: Создать Workflows для других каналов Дзена (будущее)

**Файлы** (создать ПОСЛЕ Phase 1):
- `.github/workflows/generate-dzen-young-moms.yml` → `--dzen-channel=young-moms`
- `.github/workflows/generate-dzen-men-25-40.yml` → `--dzen-channel=men-25-40`
- `.github/workflows/generate-dzen-teens.yml` → `--dzen-channel=teens`
- и т.д. (каждый новый канал Дзена = новый workflow)

Логика одинаковая:
```yaml
run: |
  npx ts-node cli.ts generate:v2 \
    --dzen-channel=young-moms \
    --theme="..."
```

---

## ЗАДАЧА 4: CLI команда для ВСЕХ каналов Дзена

**Команда**:
```bash
npx ts-node cli.ts generate:all-dzen
```

**Логика**:
1. Получить все каналы Дзена: `getAllDzenChannels()`
2. Для каждого: `const config = getDzenChannelConfig(ch.id)`
3. Запустить генерацию с параметрами из конфига
4. Результаты в `./generated/dzen/{channelId}/`

---

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### Канал Дзена: Women 35-60
```bash
npx ts-node cli.ts generate:v2 --dzen-channel=women-35-60 --theme="Я терпела это 20 лет"

✅ Используется DZEN_WOMEN_35_60_CONFIG:
  - angle: confession
  - emotion: triumph
  - audience: Women 35-60
  - model: gemini-2.5-pro (outline), gemini-2.5-flash (episodes)
  - output: ./generated/dzen/women-35-60/
```

### Канал Дзена: Young Moms
```bash
npx ts-node cli.ts generate:v2 --dzen-channel=young-moms --theme="Как я справилась"

✅ Используется DZEN_YOUNG_MOMS_CONFIG:
  - angle: scandal
  - emotion: liberation
  - audience: Young Moms 25-35
  - model: gemini-2.5-pro (outline), gemini-2.5-flash (episodes)
  - output: ./generated/dzen/young-moms/
```

### Все каналы Дзена одновременно
```bash
npx ts-node cli.ts generate:all-dzen

✅ Генерирует для всех каналов Дзена
✅ Каждый с СОБСТВЕННЫМИ параметрами
✅ Результаты в ./generated/dzen/women-35-60/, ./generated/dzen/young-moms/, и т.д.
```

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

| Файл | Что менять | Сложность |
|------|-----------|----------|
| `cli.ts` | Парсинг аргументов + использование конфига | ⭐⭐ |
| `.github/workflows/generate-every-3-hours.yml` | Убрать флаги, добавить `--dzen-channel=women-35-60` | ⭐ |
| `services/multiAgentService.ts` | Принять конфиг как параметр (опционально) | ⭐ |

---

## ФАЙЛЫ НА GITHUB (уже готовы)

✅ `config/dzen-channels.config.ts` — все каналы Дзена с параметрами
✅ `CONFIG_DZEN_SETUP.md` — как добавить новый канал Дзена
✅ `ZENMASTER_STATUS.md` — статус проекта

---

## ПРОВЕРКА (CI/CD)

**После изменений**:
```bash
# Компиляция
npm run build

# Типизация
npx tsc --noEmit

# Локальный тест Women 35-60
npx ts-node cli.ts generate:v2 --dzen-channel=women-35-60 --theme="Test"

# Локальный тест Young Moms
npx ts-node cli.ts generate:v2 --dzen-channel=young-moms --theme="Test"

# Тест всех каналов Дзена
npx ts-node cli.ts generate:all-dzen
```

---

## ПРЕИМУЩЕСТВА

✅ **Масштабируемость**: Добавить новый канал Дзена = добавить конфиг + создать workflow
✅ **Чистота**: GitHub Variables только для API ключей
✅ **Независимость**: Каждый канал Дзена может иметь разные angle, emotion, audience, модели
✅ **Переиспользование**: Один CLI команда работает для всех каналов Дзена
✅ **Тестируемость**: Легко тестировать разные каналы локально

---

## ТЕКУЩИЕ КАНАЛЫ ДЗЕНА

| ID | Целевая аудитория | Angle | Emotion | Schedule |
|----|----|-------|---------|----------|
| `women-35-60` | Женщины 35-60 лет | confession | triumph | каждые 3 часа |
| `young-moms` | Молодые мамы 25-35 | scandal | liberation | (будущее) |
| `men-25-40` | Мужчины 25-40 лет | observer | triumph | (будущее) |
| `teens` | Подростки 14-18 | confession | shame | (будущее) |

---

## TIMELINE

| Задача | Время | Статус |
|--------|-------|--------|
| Задача 1: cli.ts | 1-2 часа | ⏳ TODO |
| Задача 2: workflow | 30 мин | ⏳ TODO |
| Задача 3: otros workflows Дзена | 2-3 часа | ⏳ QUEUE (после Phase 1) |
| Задача 4: generate:all-dzen | 1 час | ⏳ QUEUE (после Phase 1) |
| **Total** | **5-7 часов** | 🚀 |

---

## КРИТЕРИЙ УСПЕХА

```bash
# ✅ Command работает для Women 35-60
npx ts-node cli.ts generate:v2 --dzen-channel=women-35-60 --theme="Test"

# ✅ Используются параметры из конфига
echo $config.defaultAngle    # confession
echo $config.defaultEmotion  # triumph
echo $config.defaultAudience # Women 35-60

# ✅ Workflow не использует GitHub Variables для параметров
grep -v "DEFAULT_ANGLE\|DEFAULT_EMOTION\|GEMINI_MODEL" .github/workflows/generate-every-3-hours.yml

# ✅ GitHub Variables содержат только API ключи
GEMINI_API_KEY_DZEN = sk-...
```

---

**Это ТЗ для AI агента. ТОЛЬКО ЯНДЕКС.ДЗЕН! Разные каналы ВНУТРИ Дзена!** 🎯
