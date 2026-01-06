# 🏗️ Architecture (Consolidated)

This file consolidates architecture documentation that previously lived in multiple places.

- Service/system architecture summary source: `docs/ARCHITECTURE.md`
- RSS feed architecture / техническое задание source: `ARCHITECTURE.md` (repo root)

> Note: root-level documents are kept for now; this file is the **single consolidated view** under `docs/`.

---

## 1) Service Architecture

## Service Architecture

### Current Services (v4.0.2)

#### Production Services
- **ContentFactoryOrchestrator**: Main orchestration for mass content generation
- **ContentSanitizer**: Content validation and cleaning (v4.9 with authenticity scoring)
- **ArticleWorkerPool**: Parallel article generation (3 concurrent workers)
- **ImageGeneratorAgent**: Production image generation v4.1+ (with PlotBible, validation, fallback)
- **EpisodeGeneratorService**: Episode generation with quality metrics (v4.5)

#### Legacy Services (Still Active)
- **MultiAgentService (v2.0)**: DEPRECATED - Legacy orchestration, being migrated to ContentFactory
  - Still used by: ArticleWorkerPool (legacy support)
  - Replacement: ContentFactoryOrchestrator
  - Migration timeline: Complete by v4.5 (Dec 23, 2025)

- **ImageGeneratorService (v3.5)**: LEGACY - Used by test scripts only
  - Still used by: test-image-functionality.ts, scripts/generateImagePrompt.ts
  - Production replacement: ImageGeneratorAgent
  - Purpose: Simpler testing interface

#### Planned Services (Phase 2 - v4.5, Dec 22-23)
- **Phase2AntiDetectionService**: Anti-detection system (not yet integrated)
- **AdversarialGatekeeper**: Detection simulation and quality gate (not yet integrated)

#### Planned Services (v5.0+, Early 2026)
- **PlaywrightService**: Browser automation for auto-publishing (not yet integrated)

### Service Status Summary

| Service | Status | Version | Used By | Replacement |
|---------|--------|---------|---------|-------------|
| ContentFactoryOrchestrator | Production | v4.0 | CLI factory command | - |
| ContentSanitizer | Production | v4.9 | ContentFactory | - |
| ImageGeneratorAgent | Production | v4.1 | ContentFactory | - |
| EpisodeGeneratorService | Production | v4.5 | ContentFactory | - |
| MultiAgentService | Deprecated | v2.0 | ArticleWorkerPool | ContentFactoryOrchestrator |
| ImageGeneratorService | Legacy | v3.5 | Test scripts | ImageGeneratorAgent |
| Phase2AntiDetectionService | Planned | v4.5 | Not integrated | - |
| AdversarialGatekeeper | Planned | v4.5 | Not integrated | - |
| PlaywrightService | Planned | v5.0+ | Not integrated | - |

### Migration Path

#### MultiAgentService → ContentFactory
- **Current**: MultiAgentService still generates articles in ArticleWorkerPool
- **Target**: All generation moved to ContentFactoryOrchestrator
- **Timeline**: Migration complete by v4.5 release (Dec 23, 2025)
- **Impact**: No breaking changes expected, internal refactoring only

#### ImageGeneratorService → ImageGeneratorAgent
- **Current**: Test scripts use legacy service
- **Target**: Test scripts updated to use ImageGeneratorAgent
- **Timeline**: Update test scripts after v4.5
- **Impact**: Test-only, no production impact

### Service Documentation

Each service now includes header comments indicating:
- Status (Production/Deprecated/Legacy/Planned)
- Version and timeline
- Usage context
- Replacement service (if deprecated)
- Integration status
- See references to documentation

---

## 2) RSS Feed Architecture for Yandex Dzen (Full Spec)

# 📋 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: RSS Feed для Yandex Dzen

## ✅ ЧТО СОЗДАНО

### 1. **scripts/generate-feed.js** - Правильный генератор RSS
```javascript
// Основные функции:
// ✅ Читает все статьи из articles/women-35-60/
// ✅ Использует https://dzen.ru/potemki как канал
// ✅ Генерирует GitHub RAW URL'ы для картинок
// ✅ Создаёт public/feed.xml с полным HTML контентом
// ✅ Поддерживает FULL и INCREMENTAL режимы
```

### 2. **public/feed.xml.example** - Пример правильного фида
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <link>https://dzen.ru/potemki</link>
    <item>
      <link>https://dzen.ru/potemki</link>
      <content:encoded><![CDATA[
        <p>Полный HTML контент</p>
      ]]></content:encoded>
      <enclosure 
        url="https://raw.githubusercontent.com/crosspostly/dzen/main/articles/..." 
        type="image/jpeg" 
      />
    </item>
  </channel>
</rss>
```

---

## 🚀 КАК РАБОТАЕТ

### Входные данные:
```
articles/women-35-60/2025-12-26/
├── ya-vsyu-zhizn.md    ← markdown контент
└── ya-vsyu-zhizn.jpg   ← изображение (ТОТ ЖЕ названием!)
```

### Выходные данные:
```
public/feed.xml  ← RSS фид для Yandex Dzen
```

### Процесс доставки:
1. **Content Factory** создаёт статьи в `articles/women-35-60/`
2. **GitHub Actions** запускает `scripts/generate-feed.js`
3. **Скрипт генерирует** `public/feed.xml` с правильными URL'ами
4. **Vercel хостирует** RSS на `dzen-livid.vercel.app/feed.xml`
5. **Yandex Dzen импортирует** из Vercel в канал `https://dzen.ru/potemki`

---

## ✨ КЛЮЧЕВЫЕ ИСПРАВЛЕНИЯ PR #112

### ✅ ЧТО БЫЛО НЕПРАВИЛЬНО В СТАРОМ КОДЕ:

```xml
<!-- ❌ БЫЛО - НЕПРАВИЛЬНО -->
<link>https://dzen-livid.vercel.app</link>  ❌ Vercel это не твой канал!
<image>https://dzen-livid.vercel.app/articles/...</image>  ❌ Неправильный домен
```

### ✅ ТЕПЕРЬ ПРАВИЛЬНО (PR #112):

```xml
<!-- ✅ ПРАВИЛЬНО - ТВОЙ РЕАЛЬНЫЙ КАНАЛ -->
<link>https://dzen.ru/potemki</link>  ✅ Твой реальный Dzen канал!
<enclosure url="https://raw.githubusercontent.com/.../articles/...jpg" />  ✅ GitHub RAW
```

### 🎯 Правильная структура RSS:

| Элемент | Где | Значение | Назначение |
|---------|-----|---------|----------|
| `<link>` в `<channel>` | Где находится фид | `https://dzen.ru/potemki` | RSS канал ссылка на твой Dzen |
| `<link>` в `<item>` | Куда идёт читатель | `https://dzen.ru/potemki` | Item ссылка на канал |
| `<content:encoded>` | Полный контент | HTML в CDATA | Весь текст статьи |
| `<enclosure>` | Изображение | GitHub RAW URL | Картинка статьи |

---

## 📊 РЕЖИМЫ РАБОТЫ

### FULL MODE - Все статьи:
```bash
node scripts/generate-feed.js full
```

**Включает:**
- articles/women-35-60/2025-12-25/*
- articles/women-35-60/2025-12-24/*
- articles/published/

**Используется:**
- Первый запуск
- После больших изменений
- Еженедельная проверка

### INCREMENTAL MODE - Только новые:
```bash
node scripts/generate-feed.js incremental
```

**Включает:**
- articles/women-35-60/2025-12-26/* (НОВЫЕ)
- articles/women-35-60/2025-12-25/* (НОВЫЕ)
- **ИСКЛЮЧАЕТ** articles/published/

**Используется:**
- Каждый день после Content Factory
- Быстрое обновление
- Экономия ресурсов API

---

## 🔧 ИСПОЛЬЗОВАНИЕ

### Локально (для тестирования):

```bash
# Перейти в папку проекта
cd ~/dzen

# INCREMENTAL mode (только новые)
BASE_URL=https://raw.githubusercontent.com/crosspostly/dzen/main \
  node scripts/generate-feed.js incremental

# FULL mode (все статьи)
BASE_URL=https://raw.githubusercontent.com/crosspostly/dzen/main \
  node scripts/generate-feed.js full

# Проверить результат
cat public/feed.xml | head -20

# Подсчитать статьи
grep -c "<item>" public/feed.xml  # Должно быть > 0

# Проверить что нет vercel ошибок
grep "vercel.app" public/feed.xml  # Должно быть ПУСТО!

# Проверить что есть поправка канала
grep "dzen.ru/potemki" public/feed.xml  # Должны быть ссылки!
```

### Через GitHub Actions:

```yaml
# .github/workflows/generate-feed.yml

Workflow запускается вручную через:
GitHub → Actions → Generate RSS Feed → Run workflow

Параметры:
- mode: full - все статьи
- mode: incremental - только новые
```

---

## ⚠️ ВАЖНО: ТРЕБОВАНИЯ К ФАЙЛАМ

### ✅ Обязательная структура:

```
articles/
└── women-35-60/                 ← НАЗВАНИЕ КАНАЛА
    └── 2025-12-26/              ← ДАТА ПАПКИ
        ├── ya-vsyu-zhizn.md     ← markdown контент
        └── ya-vsyu-zhizn.jpg    ← изображение ТЕ же имя!
```

### ✅ Требования к markdown (.md):
- Имеет frontmatter с metadata: `title`, `description`, `date`
- Контент это HTML или markdown текст
- Пример создает **Content Factory**

### ✅ Требования к изображениям (.jpg):
- **ТОТ ЖЕ названием** что markdown (без расширения)
- В **ТОЙ ЖЕ папке**
- Пример: `ya-vsyu-zhizn.md` + `ya-vsyu-zhizn.jpg`

### ❌ НИКОГДА:
- ❌ Timestamp в имени: `ya-vsyu-zhizn-1766318654134.jpg`
- ❌ Разные имена: `ya-vsyu-zhizn.md` но `article.jpg`
- ❌ Разные папки: markdown в одной, картинка в другой
- ❌ Неправильные каналы в RSS (только `https://dzen.ru/potemki`)

---

## 🧪 ТЕСТИРОВАНИЕ

### Проверить генерацию локально:

```bash
# Перейти в папку
cd ~/dzen

# Запустить скрипт
node scripts/generate-feed.js incremental

# Проверить результат
cat public/feed.xml | head -20

# Подсчитать статьи
grep -c "<item>" public/feed.xml  # Должно быть > 0

# Проверить URL'ы
grep "raw.githubusercontent.com" public/feed.xml | head -3

# Проверить что нет vercel
grep "vercel.app" public/feed.xml  # Должно быть ПУСТО!

# Проверить content:encoded
grep -c "content:encoded" public/feed.xml  # Должно равняться количеству <item>

# Проверить что канал правильный
grep "dzen.ru/potemki" public/feed.xml | head -3
```

### Проверить валидность RSS:

1. Перейти на: **https://validator.w3.org/feed/**
2. Загрузить `public/feed.xml`
3. Должно быть **VALID!**

---

## 📝 ПРИМЕРЫ ПРАВИЛЬНЫХ URL'ОВ

### ✅ ПРАВИЛЬНО:

```xml
<!-- GitHub RAW URL для картинки -->
<enclosure 
  url="https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" 
  type="image/jpeg" 
/>

<!-- Канал ссылка -->
<link>https://dzen.ru/potemki</link>

<!-- Или в <image> теге -->
<image>
  <url>https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg</url>
</image>
```

### ❌ НЕПРАВИЛЬНО:

```xml
<!-- ❌ Vercel домен (НЕПРАВИЛЬНО!) -->
<enclosure url="https://dzen-livid.vercel.app/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

<!-- ❌ Timestamp в имени файла -->
<enclosure url="https://raw.githubusercontent.com/.../ya-vsyu-zhizn-1766318654134.jpg" />

<!-- ❌ Localhost -->
<enclosure url="file:///articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

<!-- ❌ Relative path -->
<enclosure url="articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

<!-- ❌ Неправильный канал (БЫЛА ОШИБКА В PR!) -->
<link>https://dzen.ru/zenmaster</link>  ← НЕ ПРАВИЛЬНО!
```

---

## ✅ КРИТЕРИИ УСПЕХА

Workflow успешен если:

### Файлы:
- ✅ `public/feed.xml` существует
- ✅ Размер > 500 bytes

### Формат:
- ✅ Valid XML
- ✅ Valid RSS 2.0
- ✅ Есть `<content:encoded>` элементы
- ✅ Есть `xmlns:content` namespace

### Содержимое:
- ✅ ≥ 1 `<item>` элемент
- ✅ Все `<item>` имеют:
  - `<title>` с названием
  - `<description>` с кратким описанием
  - `<content:encoded>` с полным HTML
  - `<enclosure>` с изображением
  - `<pubDate>` в RFC 822 формате

### URL'ы:
- ✅ **`<link>https://dzen.ru/potemki</link>`** (ТВОЙ КАНАЛ!)
- ✅ Используют `https://raw.githubusercontent.com/crosspostly/dzen/main`
- ✅ НЕ содержат `dzen-livid.vercel.app`
- ✅ НЕ содержат timestamp (`-1766318654134`)
- ✅ НЕ содержат `localhost` или `file://`
- ✅ НЕ содержат `zenmaster` (только `potemki`)

### Git:
- ✅ Коммит создан с датой-временем
- ✅ Залит в main ветку

---

## ❌ КРИТЕРИИ ОШИБКИ

Workflow ПАДАЕТ если:

- ❌ Нет `articles/` папки
- ❌ Нет .md файлов в articles/
- ❌ `.md` файл без `title` в frontmatter
- ❌ `.md` файл без `date` в frontmatter
- ❌ `generate-feed.js` вернул ошибку
- ❌ `public/feed.xml` не создан
- ❌ Feed < 500 bytes
- ❌ Invalid XML формат
- ❌ Нет `<item>` элементов
- ❌ Нет `<content:encoded>` элементов
- ❌ URL'ы содержат `vercel.app` вместо GitHub RAW
- ❌ URL'ы содержат `zenmaster` (должен быть `potemki`)
- ❌ URL'ы содержат timestamp в имени
- ❌ Изображение не найдено в папке статьи

---

## 🔄 ПОЛНЫЙ ЦИКЛ ДОЖ-ЦЕНТР

```
┌─────────────────────────────────────────────────────┐
│ ЧАС 1: Content Factory создаёт контент            │
│  articles/women-35-60/2025-12-26/                  │
│  ├─ article-1.md + article-1.jpg                   │
│  └─ article-2.md + article-2.jpg                   │
│                                                     │
│  📤 PUSH → GitHub                                  │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ЧАС 2: GitHub Actions запускает workflow           │
│  .github/workflows/generate-feed.yml               │
│  → Trigger: workflow_dispatch (manual)             │
│  → Mode: incremental                              │
│  → Run: node scripts/generate-feed.js incremental  │
│  → Create: public/feed.xml                         │
│  → Commit: chore(rss): update feed [incremental]   │
│  → Push to main                                    │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ЧАС 3: Vercel синхронизирует из GitHub            │
│  GitHub PUSH → Vercel Deployment                   │
│  URL: https://dzen-livid.vercel.app/feed.xml      │
│                                                     │
│  Файл доступен на:                                 │
│  - /feed.xml (в корне Vercel)                      │
│  - /public/feed.xml (в папке public)              │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ЧАС 4: Yandex Dzen импортирует RSS                │
│  Dzen запрашивает: GET /feed.xml                   │
│  ← Vercel возвращает public/feed.xml               │
│  ← Dzen парсит все <item> элементы                 │
│  ← Dzen скачивает изображения с GitHub RAW         │
│  ← Dzen публикует в канал https://dzen.ru/potemki │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ЧАС 5: Читатель видит результат                  │
│  На https://dzen.ru/potemki видны новые статьи    │
│  - Заголовок: article title                        │
│  - Изображение: загруженное с GitHub               │
│  - Текст: полный HTML контент                      │
│  - Ссылка: на Dzen канал                          │
│                                                     │
│  ✅ ГОТОВО!                                         │
└─────────────────────────────────────────────────────┘
```

---

## 📞 ИТОГОВАЯ ТАБЛИЦА

| Параметр | Значение | Формат | Где |
|----------|----------|--------|-----|
| **Входит** | Статьи | `.md` + `.jpg` | `articles/women-35-60/ДАТА/` |
| **Обрабатывается** | RSS генерация | Node.js скрипт | `scripts/generate-feed.js` |
| **Выходит** | RSS фид | `public/feed.xml` | GitHub + Vercel |
| **Хостится** | HTTP | HTTPS | `dzen-livid.vercel.app/feed.xml` |
| **Формат** | RSS 2.0 | `<content:encoded>` | Yandex Dzen compatible |
| **Контент** | HTML | CDATA | Полный текст статьи |
| **Картинки** | GitHub RAW | HTTPS | `raw.githubusercontent.com/.../articles/...jpg` |
| **Коммиты** | Автоматические | Git | `chore(rss): update feed [mode]` |
| **Режимы** | full / incremental | CLI args | `node scripts/generate-feed.js [mode]` |
| **🎯 КАНАЛ** | **https://dzen.ru/potemki** | **Твой Dzen!** | **ТВОЙ РЕАЛЬНЫЙ КАНАЛ** |
| **Окно** | 7 дней | Фильтр дат | Только свежие статьи |

---

## 🔍 ИСПРАВЛЕНИЯ PR #112 (ДО И ПОСЛЕ)

### ❌ ЧТО БЫЛО НЕПРАВИЛЬНО В PR:
```javascript
// Старый код использовал НЕПРАВИЛЬНЫЙ канал
const feed = new Feed({
  id: 'https://dzen.ru/zenmaster',  // ❌ НЕПРАВИЛЬНО!
  link: 'https://dzen.ru/zenmaster', // ❌ НЕПРАВИЛЬНО!
});
```

### ✅ ДОЛЖНО БЫТЬ:
```javascript
// Правильный код с ТВОИМ КАНАЛОМ
const feed = new Feed({
  id: 'https://dzen.ru/potemki',     // ✅ ПРАВИЛЬНО!
  link: 'https://dzen.ru/potemki',   // ✅ ПРАВИЛЬНО!
});
```

---

## 💡 ПРАКТИЧЕСКИЕ СОВЕТЫ

### Для быстрой отладки:

**Если feed.xml пуст:**
```bash
# Проверить структуру
ls -la articles/women-35-60/

# Проверить markdown файлы
find articles/ -name "*.md" | head -5

# Проверить frontmatter
head -20 articles/women-35-60/2025-12-26/*.md
```

**Если картинки не загружаются:**
```bash
# Проверить что имена совпадают
ls articles/women-35-60/2025-12-26/
# Должно быть: article.md И article.jpg (ОДНО ИМЯ!)

# Проверить валидность URL
curl -I "https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-26/article.jpg"
# Должно вернуть 200 OK
```

**Если Dzen не импортирует:**
```bash
# Проверить RSS валидность
curl "https://dzen-livid.vercel.app/feed.xml" | head -50

# Проверить что есть <item> элементы
curl "https://dzen-livid.vercel.app/feed.xml" | grep -c "<item>"

# Проверить что канал ПРАВИЛЬНЫЙ (potemki, а не zenmaster!)
curl "https://dzen-livid.vercel.app/feed.xml" | grep "dzen.ru"
```

---

## ✨ ИТОГОВАЯ ТАБЛИЦА ИСПРАВЛЕНИЙ

| Компонент | Ошибка | Исправление | Статус |
|-----------|--------|------------|--------|
| **Канал** | zenmaster | **potemki** (ТВОЙ!) | ✅ Критично! |
| **Workflow** | Копировал feed.xml | Генерирует сразу в `public/feed.xml` | ✅ OK |
| **RSS канал** | Vercel URL | `https://dzen.ru/potemki` | ✅ OK |
| **Картинки** | Vercel URLs | GitHub RAW URLs | ✅ OK |
| **Режимы** | Неясная логика | FULL/INCREMENTAL с правильной фильтрацией | ✅ OK |
| **7-день фильтр** | Отсутствовал | Фильтрует по frontmatter.date | ✅ OK |
| **content:encoded** | Может быть неполный | Весь markdown в CDATA HTML | ✅ OK |

---

**✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ!**

Все файлы созданы и пришиты правильно с **ТВОИМ РЕАЛЬНЫМ КАНАЛОМ `https://dzen.ru/potemki`**. 

RSS фид будет генерироваться автоматически и доставляться в Yandex Dzen с правильными ссылками на картинки и полным HTML контентом.

🎯 **ГЛАВНОЕ**: Канал **https://dzen.ru/potemki** (а не zenmaster!)

