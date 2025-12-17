# 🎯 Dzen Channels Configuration Setup Guide

## Обзор

Данное руководство описывает как настраивать и добавлять новые каналы Дзена в ZenMaster v2.0. Все параметры генерации теперь хранятся в конфигурационных файлах, а не в GitHub Variables.

## 🎯 Преимущества новой системы

✅ **Масштабируемость**: Добавить новый канал = добавить конфиг + workflow
✅ **Независимость**: Каждый канал может иметь разные параметры
✅ **Чистота**: GitHub Variables только для API ключей
✅ **Тестируемость**: Легко тестировать разные каналы

## 📁 Структура файлов

```
config/
├── dzen-channels.config.ts    ← ВСЕ каналы Дзена здесь!
└── channels.config.ts         ← Общие каналы (Medium, Substack, etc)

.github/workflows/
├── generate-every-3-hours.yml          ← Women 35-60 (основной)
├── generate-dzen-young-moms.yml        ← Young Moms (добавить)
├── generate-dzen-men-25-40.yml         ← Men 25-40 (добавить)
└── generate-dzen-teens.yml             ← Teens (добавить)
```

## 🚀 Добавление нового канала Дзена

### Шаг 1: Добавить конфигурацию в `config/dzen-channels.config.ts`

```typescript
/**
 * DZEN YOUNG MOMS CHANNEL
 * Target: Young mothers 25-35, scandal stories, liberation emotion
 */
export const DZEN_YOUNG_MOMS_CONFIG: DzenChannelConfig = {
  id: 'young-moms',
  name: 'Young Moms',
  description: 'Молодые мамы 25-35 лет, скандальные истории',
  
  // Generation Parameters
  defaultAngle: 'scandal',
  defaultEmotion: 'liberation',
  defaultAudience: 'Young Moms 25-35',
  
  // Model Configuration  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  // Output Configuration
  outputDir: './generated/dzen/young-moms/',
  scheduleCron: '0 2,8,14,20 * * *', // every 6 hours
  
  // Themes specific to this channel
  channelThemes: [
    'Как я справилась с послеродовой депрессией',
    'Муж не помогал с ребёнком, и я ушла',
    'Свекровь учила меня воспитывать моего ребёнка',
    // ... добавьте 10-15 тем
  ]
};
```

### Шаг 2: Добавить в registry

```typescript
export const DZEN_CHANNELS_REGISTRY: Record<string, DzenChannelConfig> = {
  'women-35-60': DZEN_WOMEN_35_60_CONFIG,
  'young-moms': DZEN_YOUNG_MOMS_CONFIG,  // ← Добавить сюда
  'men-25-40': DZEN_MEN_25_40_CONFIG,
  'teens': DZEN_TEENS_CONFIG,
};
```

### Шаг 3: Создать workflow файл

Создайте `.github/workflows/generate-dzen-young-moms.yml`:

```yaml
name: Generate Dzen Young Moms Articles

on:
  schedule:
    # Каждые 6 часов: 02:00, 08:00, 14:00, 20:00 UTC
    - cron: '0 2,8,14,20 * * *'
  workflow_dispatch:

jobs:
  generate-young-moms:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: feature/zenmaster-v2.0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate article for Young Moms
        run: |
          npx tsx cli.ts generate:v2 \
            --dzen-channel=young-moms
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Create output directory
        run: mkdir -p generated/dzen/young-moms
      
      - name: Commit and push
        run: |
          git config --local user.email "zenmaster-bot@github.com"
          git config --local user.name "ZenMaster Automated Bot"
          
          git add generated/dzen/young-moms/
          git commit -m "🎬 [AUTO] Generated Young Moms article" || echo "No changes"
          git push origin feature/zenmaster-v2.0
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        if: success()
        with:
          name: generated-young-moms-${{ github.run_id }}
          path: generated/dzen/young-moms/
          retention-days: 90
```

## 📊 Параметры конфигурации

### DzenChannelConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | string | Уникальный ID канала (используется в CLI) |
| `name` | string | Человеко-читаемое название |
| `description` | string | Описание канала |
| `defaultAngle` | 'confession' \| 'scandal' \| 'observer' | Основной угол повествования |
| `defaultEmotion` | 'triumph' \| 'guilt' \| 'shame' \| 'liberation' \| 'anger' | Основная эмоция |
| `defaultAudience` | string | Целевая аудитория |
| `modelOutline` | string | Модель для генерации плана (gemini-2.5-flash) |
| `modelEpisodes` | string | Модель для генерации эпизодов (gemini-2.5-flash) |
| `outputDir` | string | Папка для сохранения статей |
| `scheduleCron` | string | Расписание запуска в GitHub Actions |
| `channelThemes` | string[] | Темы специфичные для канала |

## 🔧 Тестирование канала

### Локальное тестирование

```bash
# Тест конкретного канала
npx ts-node cli.ts generate:v2 --dzen-channel=young-moms --theme="Test theme"

# Просмотр всех каналов
npx ts-node cli.ts list-dzen-channels

# Валидация конфигурации
npx ts-node cli.ts validate-dzen-config

# Тест всех каналов одновременно
npx ts-node cli.ts generate:all-dzen
```

### Проверка валидности

```bash
# Проверить что конфигурация корректна
npx ts-node cli.ts validate-dzen-config

# Проверить доступные каналы
npx ts-node cli.ts list-dzen-channels

# Протестировать конкретный канал без генерации (сухой прогон)
npx ts-node cli.ts generate:v2 --dzen-channel=young-moms --theme="Test" --verbose
```

## 📈 Отслеживание каналов

### Статистика

После каждой генерации в CLI выводится:
- ✅ Успешные каналы
- ❌ Неудачные каналы
- 📊 Время генерации для каждого канала
- 📁 Пути к сохраненным файлам

### Файловая структура

```
generated/
└── dzen/
    ├── women-35-60/
    │   └── article_2024-01-01T12-30-45.json
    ├── young-moms/
    │   └── article_2024-01-01T12-35-12.json
    ├── men-25-40/
    └── teens/
```

## 🚨 Миграция с GitHub Variables

### Старая система (DEPRECATED)

```yaml
# GitHub Variables (БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ)
DEFAULT_ANGLE = confession
DEFAULT_EMOTION = triumph
DEFAULT_AUDIENCE = Women 35-60
GEMINI_MODEL_OUTLINE = gemini-2.5-flash
GEMINI_MODEL_EPISODES = gemini-2.5-flash

# Workflow (старая версия)
npx tsx cli.ts generate:v2 \
  --theme="${{ vars.DEFAULT_THEME }}" \
  --angle="${{ vars.DEFAULT_ANGLE }}" \
  --emotion="${{ vars.DEFAULT_EMOTION }}" \
  --audience="${{ vars.DEFAULT_AUDIENCE }}" \
  --model-outline="${{ vars.GEMINI_MODEL_OUTLINE }}" \
  --model-episodes="${{ vars.GEMINI_MODEL_EPISODES }}"
```

### Новая система (RECOMMENDED)

```typescript
// config/dzen-channels.config.ts
export const DZEN_WOMEN_35_60_CONFIG: DzenChannelConfig = {
  id: 'women-35-60',
  defaultAngle: 'confession',
  defaultEmotion: 'triumph',
  defaultAudience: 'Women 35-60',
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  // ... другие параметры
};
```

```yaml
# Workflow (новая версия)
npx tsx cli.ts generate:v2 \
  --dzen-channel=women-35-60 \
  --theme="${{ needs.select-theme.outputs.theme }}"
```

## 📝 Полный пример добавления канала

### 1. Добавить в `config/dzen-channels.config.ts`

```typescript
/**
 * DZEN MEN 25-40 CHANNEL
 * Target: Men 25-40, observer perspective, triumph emotion
 */
export const DZEN_MEN_25_40_CONFIG: DzenChannelConfig = {
  id: 'men-25-40',
  name: 'Men 25-40',
  description: 'Мужчины 25-40 лет, наблюдательский взгляд',
  
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Men 25-40',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  outputDir: './generated/dzen/men-25-40/',
  scheduleCron: '0 1,7,13,19 * * *', // every 6 hours
  
  channelThemes: [
    'Я понял, что женщина меня обманывает',
    'Работа отнимала всю мою жизнь',
    'Я не видел детей месяцами',
    'Друзья изменились, когда я женился',
    'Я работал 80 часов в неделю ради семьи',
    'Первый раз взял отпуск за 5 лет',
    'Меня повысили, но я не обрадовался',
    'Я научился говорить "нет" на работе',
    'Жена попросила меня измениться или уйти',
    'Я понял, что живу не своей жизнью'
  ]
};
```

### 2. Добавить в registry

```typescript
export const DZEN_CHANNELS_REGISTRY: Record<string, DzenChannelConfig> = {
  'women-35-60': DZEN_WOMEN_35_60_CONFIG,
  'young-moms': DZEN_YOUNG_MOMS_CONFIG,
  'men-25-40': DZEN_MEN_25_40_CONFIG,  // ← Добавить
  'teens': DZEN_TEENS_CONFIG,
};
```

### 3. Протестировать

```bash
# Проверить валидность
npx ts-node cli.ts validate-dzen-config

# Протестировать локально
npx ts-node cli.ts generate:v2 --dzen-channel=men-25-40 --theme="Test"

# Добавить в generate:all-dzen
# (автоматически включится после добавления в registry)
```

## 🔍 Troubleshooting

### Ошибки валидации

```bash
❌ Dzen channel not found: unknown-channel
Available channels: women-35-60, young-moms, men-25-40, teens
```

**Решение**: Проверьте что ID канала добавлен в `DZEN_CHANNELS_REGISTRY`

### Ошибки API ключей

```bash
❌ Missing API key for channel: young-moms
Add to GitHub Secrets:
   GEMINI_API_KEY = sk-...
```

**Решение**: Убедитесь что `GEMINI_API_KEY` установлен в GitHub Secrets

### Ошибки генерации

```bash
❌ young-moms failed: Request timeout
```

**Решение**: Проверьте лимиты API Gemini, увеличьте timeout в workflow

## 🎯 Заключение

Новая система конфигурации каналов Дзена обеспечивает:
- 🎯 **Простое добавление** новых каналов
- 🔧 **Централизованное управление** параметрами
- 📊 **Масштабируемость** для множества каналов
- 🧪 **Легкое тестирование** каждого канала

Добавляйте новые каналы Дзена согласно этому руководству для быстрого и эффективного расширения возможностей ZenMaster v2.0!