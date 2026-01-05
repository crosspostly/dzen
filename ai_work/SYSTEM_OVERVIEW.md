# 🏗️ ZenMaster System Architecture

**Для**: Разработчиков, DevOps, инженеров
**Версия**: 1.0 | **Обновлено**: January 5, 2026

---

## 📋 Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Основные сервисы](#основные-сервисы)
3. [Типы и интерфейсы](#типы-и-интерфейсы)
4. [Конфигурация](#конфигурация)
5. [API и интеграции](#api-и-интеграции)
6. [Тестирование](#тестирование)
7. [Развертывание](#развертывание)

---

## 🎨 Архитектура системы

### High-Level диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (cli.ts)                         │
│  Команды: both, factory, validate, feed:*                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │                       │
    ┌────▼─────┐          ┌──────▼──────┐
    │ BothMode │          │ FactoryMode │
    │ (2 стать)│          │ (1-100)    │
    └────┬─────┘          └──────┬──────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────▼───────────┐
         │ MultiAgentService     │
         │ (главный оркестратор)│
         └──────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐    ┌────▼────┐   ┌────▼──────────┐
│ Stage 0│    │ Stage 1 │   │ Stage 2       │
│ Plot   │    │Episode  │   │ Assembly      │
│ Bible  │    │Generate │   │ (5 частей)    │
└───┬────┘    └────┬────┘   └────┬──────────┘
    │              │              │
    └──────────────┼──────────────┘
                   │
         ┌─────────▼─────────┐
         │ Stage 3           │
         │ Voice Restoration │
         │ (авто-реставрация)│
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Stage 4           │
         │ Phase 2 Anti-     │
         │ Detection         │
         │ (Perplexity,      │
         │  Burstiness, etc.)│
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Stage 5           │
         │ Quality Checklist │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Article Exporter  │
         │ (Markdown, RSS)   │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Image Generation  │
         │ (Gemini → Canvas │
         │  → Authenticity)  │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Output            │
         │ articles/*/*.md   │
         │ public/feed.xml   │
         └───────────────────┘
```

### Компоненты

**CLI слой** (`cli.ts`)
- Парсинг аргументов командной строки
- Выбор режима генерации
- Делегирование сервисам

**Оркестраторы**
- `MultiAgentService` - генерация 1-2 статей (both mode)
- `ContentFactoryOrchestrator` - массовая генерация (factory mode)

**Сервисы по этапам** (см. ниже)

**Экспорт**
- `ArticleExporter` - экспорт в Markdown, JSON
- RSS генерация через `scripts/generate-feed.js`

---

## 🔧 Основные сервисы

### 1. MultiAgentService

**Файл**: `services/multiAgentService.ts` (1666 строк)
**Назначение**: Главный оркестратор генерации одной статьи

**Основной метод**:
```typescript
async generateLongFormArticle(params: {
  theme: string;
  angle: string;
  emotion: string;
  audience: string;
  maxChars?: number;
  includeImages?: boolean;
  applyPhase2AntiDetection?: boolean;
  heroArchetype?: HeroArchetype;
  conflictType?: ConflictType;
  timeline?: TimelineType;
  antagonistReaction?: AntagonistReaction;
  victoryType?: VictoryType;
}): Promise<LongFormArticle>
```

**Этапы генерации**:
```typescript
// Stage 0: Outline Engineering
outline = await this.generateOutline(params, episodeCount);

// Stage 1: Sequential Episode Generation
episodes = await this.generateEpisodesSequentially(outline);

// Stage 2: Synchronized Article Assembly
lede = await this.generateLede(outline, episodes[0]);
development = await this.generateDevelopment(outline, devRange);
climax = await this.generateClimax(outline, development, climaxRange);
resolution = await this.generateResolution(outline, climax);
finale = await this.generateFinale(outline, episodes[last]);

// 🆕 Stage 3: SKIPPED (relying on auto-restore)
console.log('✅ Stage 3: Cleanup SKIPPED');

// Stage 4: Mobile Authenticity
await this.applyAuthenticityToImages(article);
```

**⚠️ ВНИМАНИЕ**: Stage 3 (Voice Restoration) пропущен!
Это ПРОБЛЕМА - см. MASTER_PIPELINE_GUIDE.md

---

### 2. ContentFactoryOrchestrator

**Файл**: `services/contentFactoryOrchestrator.ts` (1212 строк)
**Назначение**: Массовая генерация 1-100 статей

**Конфигурация**:
```typescript
interface ContentFactoryConfig {
  articleCount: 1 | 5 | 10 | 25 | 50 | 100;
  parallelEpisodes: number; // Количество воркеров (по умолчанию 3)
  includeImages: boolean;
  imageGenerationRate: number; // 1 в минуту
  qualityLevel: 'standard' | 'premium';
  outputFormat: 'markdown' | 'json' | 'both';
  enableAntiDetection?: boolean;
  skipCleanupGates?: boolean;
  enablePlotBible?: boolean;
}
```

**Рабочий процесс**:
```typescript
// Stage 1: Article Generation (parallel)
articles = await this.generateArticles();

// Stage 2: Cover Image Generation (serial)
await this.generateCoverImages();

// Stage 3: Post-process Images (Canvas)
await this.postProcessCoverImages();

// Stage 4: Mobile Authenticity Processing
await this.applyMobileAuthenticityProcessing();
```

**Worker Pools**:
- `ArticleWorkerPool` - параллельная генерация статей
- `ImageWorkerPool` - последовательная генерация изображений (1 в минуту)

---

### 3. PlotBibleBuilder (Stage 0)

**Файл**: `services/plotBibleBuilder.ts`
**Промпт**: `prompts/stage-0-plan.md`

**Назначение**: Создание "скелета" истории

**Выход**:
```typescript
interface PlotBible {
  topic: string;
  narrator: {
    age: number;
    gender: 'female';
    tone: 'exclamatory' | 'sad' | 'ironic' | 'didactic';
    habits: string[];
  };
  archetype: HeroArchetype;
  sensorPalette: {
    smells: string[];
    sounds: string[];
    textures: string[];
  };
  episodes: EpisodeOutline[];
}
```

---

### 4. SimpleEpisodeGenerator (Stage 1)

**Файл**: `services/simpleEpisodeGenerator.ts`
**Промпт**: `prompts/stage-1-episodes.md`

**Назначение**: Генерация эпизодов 3000-4000 знаков

**Структура эпизода**:
```typescript
interface Episode {
  number: number;
  hook: string; // 200 chars
  externalConflict: string; // 800 chars
  internalEmotion: string; // 800 chars
  turningPoint: string; // 600 chars
  openLoop: string; // 300 chars
  content: string; // 3000-4000 chars total
  phase2Metrics?: {
    adversarialScore: number;
    breakdown: {
      perplexity: number;
      variance: number;
      colloquialism: number;
      authenticity: number;
      fragmentary: number;
      repetition: number;
    };
  };
}
```

**Авто-реставрация встроена** (см. MASTER_PIPELINE_GUIDE.md)

---

### 5. VoiceRestorationService (Stage 3)

**Файл**: `services/voiceRestorationService.ts` (реализован)
**Промпт**: `prompts/stage-3-restore.md`

**Назначение**: Восстановление эмоционального голоса

**Основной метод**:
```typescript
async restoreArticle(article: LongFormArticle): Promise<LongFormArticle> {
  // 1. Parse article into sections
  // 2. Apply voice restoration to each section
  // 3. Reassemble with transitions
  // 4. Validate Phase2 score >= 85
}
```

**⚠️ НЕ ИСПОЛЬЗУЕТСЯ** в текущем коде (MultiAgentService пропускает Stage 3)

---

### 6. Phase2AntiDetectionService (Stage 4)

**Файл**: `services/phase2AntiDetectionService.ts` (656 строк)
**Зависимости**:
- `services/perplexityController.ts`
- `services/burstinessOptimizer.ts`
- `services/skazNarrativeEngine.ts`
- `services/adversarialGatekeeper.ts`

**Назначение**: Снижение AI-детекции

**Основной метод**:
```typescript
async processArticle(
  title: string,
  content: string,
  options: Phase2Options = {},
  images: string[] = []
): Promise<Phase2Result>
```

**Шаги**:
```typescript
// 1. Perplexity Enhancement
if (!meetsPerplexityThreshold(content, 3.0)) {
  content = perplexityController.increasePerplexity(content, 3.4);
}

// 2. Burstiness Optimization
if (!meetsBurstinessThreshold(content, 6.5)) {
  content = burstinessOptimizer.optimizeBurstiness(content, 7.0);
}

// 3. Skaz Narrative Enhancement
if (!meetsSkazThreshold(content, 70)) {
  content = skazEngine.applySkazTransformations(content);
}

// 4. Adversarial Gatekeeper
const score = gatekeeper.assessArticle(title, content);
if (score.overallScore < 80) {
  throw new Error('Gatekeeper FAIL');
}
```

**Per-episode mode** (более детальный):
```typescript
async processEpisodeContent(
  content: string,
  episodeNum: number,
  targetLength?: number,
  options: Phase2Options = {}
): Promise<{
  processedContent: string;
  adversarialScore: number;
  modificationStats: {...};
  breakdown: {
    perplexity: number;
    variance: number;
    colloquialism: number;
    authenticity: number;
    fragmentary: number;
    repetition: number;
  };
  suggestion: string;
}>
```

---

### 7. Image Generator Agent

**Файл**: `services/imageGeneratorAgent.ts`
**API**: Google Gemini

**Назначение**: Генерация обложек

**Метод**:
```typescript
async generateCoverImage(
  title: string,
  lede: string,
  style?: string
): Promise<GeneratedImage>
```

**Выход**:
```typescript
interface GeneratedImage {
  base64: string;
  prompt: string;
  width: number;
  height: number;
  format: 'png' | 'jpg';
}
```

---

### 8. Image Processor Service

**Файл**: `services/imageProcessorService.ts`
**Библиотека**: Canvas

**Операции**:
```typescript
async processImageForDzen(
  base64Image: string
): Promise<{
  processedBase64: string;
  width: number;
  height: number;
  format: 'webp';
  sizeKB: number;
}>
```

**Шаги**:
1. Удаление EXIF метаданных
2. Ресайз до 1200x675px или 1200x1200px
3. Лёгкие фильтры (яркость, контраст)
4. Конвертация в WebP

---

### 9. MobilePhotoAuthenticityProcessor

**Файл**: `services/mobilePhotoAuthenticityProcessor.ts`
**Назначение**: Симуляция мобильных фото

**Метод**:
```typescript
async processForMobileAuthenticity(
  base64Image: string
): Promise<AuthenticityResult>
```

**Эффекты**:
```typescript
interface AuthenticityResult {
  success: boolean;
  processedBuffer: Buffer;
  authenticityLevel: 'low' | 'medium' | 'high';
  appliedEffects: string[];
  deviceSimulated: string;
}
```

**Применяемые эффекты**:
- Удаление метаданных камеры
- Vignette (размытие по краям)
- Лёгкий шум (noise)
- Подстройка цветовой температуры
- Артефакты сжатия

---

### 10. Quality Validator

**Файл**: `services/qualityValidator.ts`
**Назначение**: Валидация качества

**Метод**:
```typescript
async validateArticle(
  article: LongFormArticle,
  thresholds: QualityThresholds
): Promise<ValidationResult>
```

---

## 📦 Типы и интерфейсы

### ContentArchitecture

**Файл**: `types/ContentArchitecture.ts`

**Основные типы**:
```typescript
// Архетипы героев
type HeroArchetype =
  | "comeback_queen"
  | "gold_digger_trap"
  | "inheritance_reveal"
  | "entrepreneur"
  | "phoenix"
  | "mother_wins"
  | "wisdom_earned";

// Типы конфликтов
type ConflictType =
  | "class_prejudice"
  | "family_greed"
  | "gender_expectations"
  | "infidelity_redemption"
  | "matriarch_rejection"
  | "false_image";

// Типы таймлайнов
type TimelineType =
  | "sudden"       // 1-3 months
  | "gradual"      // 6-12 months
  | "cyclical"     // Years
  | "revelation";  // Was hidden

// Реакция антагониста
type AntagonistReaction =
  | "shame"
  | "regret"
  | "jealousy"
  | "pleading"
  | "denial"
  | "anger";

// Тип победы
type VictoryType =
  | "financial"
  | "professional"
  | "social"
  | "emotional"
  | "moral"
  | "multi";

// Длинная статья
interface LongFormArticle {
  id: string;
  title: string;
  outline: OutlineStructure;
  episodes: Episode[];
  lede: string;
  development: string;
  climax: string;
  resolution: string;
  finale: string;
  voicePassport: VoicePassport;
  coverImage?: CoverImage;
  metadata: {
    totalChars: number;
    totalReadingTime: number;
    episodeCount: number;
    sceneCount: number;
    dialogueCount: number;
  };
  processedContent: string;
  adversarialScore?: AdversarialScore;
  phase2Applied: boolean;
}
```

### ContentFactory

**Файл**: `types/ContentFactory.ts`

**Основные типы**:
```typescript
interface ContentFactoryConfig {
  articleCount: 1 | 5 | 10 | 25 | 50 | 100;
  parallelEpisodes: number;
  includeImages: boolean;
  imageGenerationRate: number;
  qualityLevel: 'standard' | 'premium';
  outputFormat: 'markdown' | 'json' | 'both';
  enableAntiDetection?: boolean;
  skipCleanupGates?: boolean;
  enablePlotBible?: boolean;
}

interface FactoryProgress {
  state: "initializing" | "running" | "completed" | "failed";
  articlesTotal: number;
  articlesCompleted: number;
  articlesFailed: number;
  imagesTotal: number;
  imagesCompleted: number;
  imagesFailed: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  currentlyGenerating: string[];
  errors: FactoryError[];
}
```

---

## ⚙️ Конфигурация

### Dzen Channels Config

**Файл**: `config/dzen-channels.config.ts`

```typescript
interface DzenChannelConfig {
  [channelName: string]: {
    name: string;
    description: string;
    triggers: string[];
    tone: string[];
    archetypes: HeroArchetype[];
    content_rules?: {
      required_triggers?: string[];
      forbidden_triggers?: string[];
      target_audience_age?: string;
    };
  };
}
```

**Пример**:
```typescript
const DZEN_CHANNELS: DzenChannelConfig = {
  "women-35-60": {
    name: "Женщины 35-60",
    description: "Семейные драмы, свекрови, брак",
    triggers: ["свадебные драмы", "проблемы с матерью"],
    tone: ["emotional", "dramatic"],
    archetypes: ["comeback_queen", "mother_wins"],
    content_rules: {
      required_triggers: ["свекровь", "мама", "муж"],
      forbidden_triggers: ["политика", "финансы"],
      target_audience_age: "35-60"
    }
  },
  // ...
};
```

### Environment Variables

```bash
# API ключи
GEMINI_API_KEY=your-gemini-key-here
API_KEY=alternative-key-variable

# Конфигурация
MAX_CHARS=20000
EPISODE_COUNT=12
ENABLE_ANTI_DETECTION=true
```

---

## 🔌 API и интеграции

### Внешние API

**Google Gemini API**
- **Промпты**: Все промпты в `prompts/` директории
- **Модель**: `gemini-3-flash-preview`
- **Rate limiting**: Встроен в сервисы

**Dzen API**
- **RSS фид**: Через `scripts/generate-feed.js`
- **Публикация**: Автоматическая через RSS (manual upload)

---

## 🧪 Тестирование

### CLI команды для тестирования

```bash
# Генерация одной статьи
npm run both --count=1 --channel=women-35-60

# Валидация сгенерированных статей
npm run validate

# Тест генерации изображений
npm run factory --count=1 --preset=quick-test --images
```

### Unit тесты (TODO)

Необходимо создать:
- `test/services/plotBibleBuilder.test.ts`
- `test/services/episodeGenerator.test.ts`
- `test/services/phase2AntiDetection.test.ts`
- `test/services/imageProcessor.test.ts`

---

## 🚀 Развертывание

### Локальная разработка

```bash
# Клонирование
git clone https://github.com/crosspostly/dzen.git
cd dzen

# Установка
npm install

# Настройка
export GEMINI_API_KEY="your-key-here"

# Запуск
npm run dev  # Vite dev server
npm run both --count=1  # Генерация статей
```

### CI/CD (GitHub Actions)

**Workflow**: `.github/workflows/generate.yml`

```yaml
name: Generate Articles

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run factory --count=5 --images
      - run: npm run feed:incremental
      - uses: actions/upload-artifact@v3
        with:
          name: articles
          path: articles/
```

---

## 📊 Мониторинг

### Логи

**В консоли** (emoji-логирование):
```
🎬 Stage 0: Building outline (12 episodes)...
🔄 Stage 1: Generating 12 episodes...
   Episode 1/12: phase2=75 ✅
   Episode 2/12: phase2=68 → auto-restore → phase2=82 ✅
📊 Stage 2: Synchronized Article Assembly...
   📝 Generating LEDE...
   📝 Generating DEVELOPMENT...
✅ Stage 3: Cleanup SKIPPED
🔧 Stage 4: Applying mobile photo authenticity...
✅ ARTICLE COMPLETE
```

### Метрики

**После генерации**:
```typescript
console.log(`📊 Metrics: ${article.metadata.totalChars} chars, ${article.metadata.episodeCount} episodes`);
console.log(`   Phase 2 Score: ${article.adversarialScore?.overallScore || 0}/100`);
console.log(`   Perplexity: ${article.adversarialScore?.perplexity || 0}`);
console.log(`   Burstiness: ${article.adversarialScore?.burstiness || 0}`);
```

---

## 🐛 Известные проблемы

### Критические

1. **Stage 3 пропущен в MultiAgentService**
   - Строка 311: `console.log('✅ Stage 3: Cleanup SKIPPED');`
   - Должен быть вызов `voiceRestorationService`
   - См. MASTER_PIPELINE_GUIDE.md для правильного порядка

2. **Auto-restore интегрирован в Stage 1**
   - Но Stage 3 тоже должен иметь auto-restore (phase2 >= 85)
   - Текущая реализация неполная

### Не критические

1. **Нет unit-тестов**
   - Необходимо добавить тесты для основных сервисов

2. **Нет мониторинга**
   - Необходимо добавить логирование в файл/базу данных

3. **Нет rate limiting для Gemini API**
   - Возможны 429 errors при массовой генерации

---

## 🔧 Будущие улучшения

1. **Полная интеграция Stage 3**
   - Добавить вызов `voiceRestorationService` в MultiAgentService
   - Реализовать auto-restore для Stage 3

2. **Levenshtein uniqueness check**
   - Добавить `utils/levenshtein-distance.ts`
   - Интегрировать в Stage 1

3. **GitHub Actions для nightly cleanup**
   - Автоматическая реставрация статей
   - RSS генерация

4. **Dashboard для метрик**
   - Phase 2 scores over time
   - AI-detection metrics
   - Engagement metrics from Dzen

---

**Версия**: 1.0
**Последнее обновление**: January 5, 2026
**Поддержка**: crosspostly
