# 🔧 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: RSS Feed для Yandex Dzen

## ✅ ЧТО СОЗДАНО

### 1. **scripts/generate-feed.js** - Правильный генератор RSS
// Основные функции:
// ✅ Читает все статьи из articles/women-35-60/
// ✅ Использует https://dzen.ru/potemki как канал
// ✅ Генерирует GitHub RAW URL'ы для картинок
// ✅ Создаёт public/feed.xml с полным HTML контентом
// ✅ Поддерживает FULL и INCREMENTAL режимы

### 2. **public/feed.xml.example** - Пример правильного фида
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

---

## 🚀 КАК РАБОТАЕТ

### Входные данные:
articles/women-35-60/2025-12-26/
├── ya-vsyu-zhizn.md    ← markdown контент
└── ya-vsyu-zhizn.jpg   ← изображение (ТОТ ЖЕ названием!)

### Выходные данные:
public/feed.xml  ← RSS фид для Yandex Dzen

### Процесс доставки:
1. **Content Factory** создаёт статьи в `articles/women-35-60/`
2. **GitHub Actions** запускает `scripts/generate-feed.js`
3. **Скрипт генерирует** `public/feed.xml` с правильными URL'ами
4. **Vercel хостирует** RSS на `dzen-livid.vercel.app/feed.xml`
5. **Yandex Dzen импортирует** из Vercel в канал `https://dzen.ru/potemki`

---

## ✨ КЛЮЧЕВЫЕ УЛУЧШЕНИЯ

### ✅ ЧТО БЫЛО НЕПРАВИЛЬНО:

<!-- БЫЛО -->
<link>https://dzen-livid.vercel.app</link>  ❌ Vercel это не твой канал!
<image>https://dzen-livid.vercel.app/articles/...</image>  ❌

<!-- ТЕПЕРЬ ПРАВИЛЬНО -->
<link>https://dzen.ru/potemki</link>  ✅ Твой реальный Dzen канал
<enclosure url="https://raw.githubusercontent.com/.../articles/...jpg" />  ✅ GitHub RAW

### 🎯 Правильная структура RSS:

| Элемент | Где | Значение | Назначение |
|---------|-----|---------|----------|
| `<link>` в `<channel>` | Где находится фид | `https://dzen.ru/potemki` | RSS канал ссылка |
| `<link>` в `<item>` | Куда идёт читатель | `https://dzen.ru/potemki` | Item ссылка на канал |
| `<content:encoded>` | Полный контент | HTML в CDATA | Весь текст статьи |
| `<enclosure>` | Изображение | GitHub RAW URL | Картинка статьи |

---

## 📊 РЕЖИМЫ РАБОТЫ

### FULL MODE - Все статьи:
node scripts/generate-feed.js full

# Включает:
# - articles/women-35-60/2025-12-25/*
# - articles/women-35-60/2025-12-24/*
# - articles/published/*
#
# Используется:
# - Первый запуск
# - После больших изменений
# - Еженедельная проверка

### INCREMENTAL MODE - Только новые:
node scripts/generate-feed.js incremental

# Включает:
# - articles/women-35-60/2025-12-26/* (НОВЫЕ)
# - articles/women-35-60/2025-12-25/* (НОВЫЕ)
#
# Используется:
# - Каждый день после Content Factory
# - Быстрое обновление
# - Экономия ресурсов

---

## 🔧 ИСПОЛЬЗОВАНИЕ

### Локально (для тестирования):

# Перейти в папку проекта
cd ~/dzen

# FULL mode
BASE_URL=https://raw.githubusercontent.com/crosspostly/dzen/main \
  node scripts/generate-feed.js full

# INCREMENTAL mode
BASE_URL=https://raw.githubusercontent.com/crosspostly/dzen/main \
  node scripts/generate-feed.js incremental

# Проверить результат
cat public/feed.xml | head -20

# Подсчитать статьи
grep -c "<item>" public/feed.xml  # Должно быть > 0

# Проверить что нет vercel
grep "vercel.app" public/feed.xml  # Должно быть ПУСТО!

### Через GitHub Actions:

.github/workflows/manual-feed-generate.yml

Запуск с параметрами:
- `mode: full` - все статьи
- `mode: incremental` - только новые

---

## ⚠️ ВАЖНО: ТРЕБОВАНИЯ К ФАЙЛАМ

### ✅ Обязательная структура:

articles/
└── women-35-60/                 ← НАЗВАНИЕ КАНАЛА
    └── 2025-12-26/              ← ДАТА ПАПКИ
        ├── ya-vsyu-zhizn.md     ← markdown контент
        └── ya-vsyu-zhizn.jpg    ← изображение ТЕ же имя!

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

---

## 🧪 ТЕСТИРОВАНИЕ

### Проверить генерацию локально:

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

### Проверить валидность RSS:

Перейти на: **https://validator.w3.org/feed/**

Загрузить `public/feed.xml` → должно быть **VALID!**

---

## 📝 ПРИМЕРЫ ПРАВИЛЬНЫХ URL'ОВ

### ✅ ПРАВИЛЬНО:

<!-- GitHub RAW URL для картинки -->
<enclosure 
  url="https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" 
  type="image/jpeg" 
/>

<!-- Или в <image> теге -->
<image>
  <url>https://raw.githubusercontent.com/crosspostly/dzen/main/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg</url>
</image>

### ❌ НЕПРАВИЛЬНО:

<!-- Vercel домен -->
<enclosure url="https://dzen-livid.vercel.app/articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

<!-- Timestamp в имени файла -->
<enclosure url="https://raw.githubusercontent.com/.../ya-vsyu-zhizn-1766318654134.jpg" />

<!-- Localhost -->
<enclosure url="file:///articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

<!-- Relative path -->
<enclosure url="articles/women-35-60/2025-12-25/ya-vsyu-zhizn.jpg" />

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

### Содержимое:
- ✅ ≥ 1 `<item>` элемент
- ✅ Все `<item>` имеют:
  - `<title>` с названием
  - `<description>` с кратким описанием
  - `<content:encoded>` с полным HTML
  - `<enclosure>` с изображением

### URL'ы:
- ✅ Используют `https://raw.githubusercontent.com/crosspostly/dzen/main`
- ✅ НЕ содержат `dzen-livid.vercel.app`
- ✅ НЕ содержат timestamp (`-1766318654134`)
- ✅ НЕ содержат `localhost` или `file://`

### Git:
- ✅ Коммит создан с датой-временем
- ✅ Залит в main ветку

---

## ❌ КРИТЕРИИ ОШИБКИ

Workflow ПАДАЕТ если:

- ❌ Нет `articles/` папки
- ❌ Нет .md файлов в articles/
- ❌ `generate-feed.js` вернул ошибку
- ❌ `public/feed.xml` не создан
- ❌ Feed < 500 bytes
- ❌ Invalid XML формат
- ❌ Нет `<item>` элементов
- ❌ URL'ы содержат vercel.app
- ❌ URL'ы содержат timestamp
- ❌ Нет `<content:encoded>` элементов

---

## 🔄 ПОЛНЫЙ ЦИКЛ

┌─────────────────────────────────────────────────────┐
│ ДЕНЬ 1: Content Factory создаёт контент            │
│  articles/women-35-60/2025-12-26/                  │
│  ├─ article-1.md + article-1.jpg                   │
│  └─ article-2.md + article-2.jpg                   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ДЕНЬ 2: GitHub Actions запускает workflow           │
│  node scripts/generate-feed.js incremental          │
│  → Создаёт public/feed.xml                         │
│  → Пушит в main                                    │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ДЕНЬ 3: Vercel хостирует RSS                       │
│  https://dzen-livid.vercel.app/feed.xml            │
│  (автоматически синхронизируется из GitHub)        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ДЕНЬ 4: Yandex Dzen импортирует RSS                │
│  Dzen запрашивает: GET /feed.xml                   │
│  Dzen читает все <item> элементы                   │
│  Dzen скачивает картинки с GitHub RAW              │
│  Dzen публикует в канал                            │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ ДЕНЬ 5: Читатель видит результат                   │
│  На https://dzen.ru/potemki видны новые статьи    │
│  Картинки загружены с GitHub                       │
│  Полный текст доступен                            │
└─────────────────────────────────────────────────────┘

---

## 📞 ИТОГОВАЯ ТАБЛИЦА

| Что | Где | Почему | Формат |
|-----|-----|--------|--------|
| **Входит** | `articles/women-35-60/` | Статьи уже созданы | .md + .jpg |
| **Обрабатывается** | `scripts/generate-feed.js` | Генерирует RSS | Node.js |
| **Выходит** | `public/feed.xml` | Публичный RSS | XML |
| **Хостится** | Vercel + GitHub | Автоматическая синхронизация | HTTP |
| **Формат** | Yandex Dzen RSS 2.0 | Совместимость с Dzen | RSS 2.0 |
| **Контент** | `<content:encoded>` CDATA | Полный HTML контент | HTML |
| **URL'ы** | GitHub RAW | Публичный доступ без auth | HTTPS |
| **Коммиты** | Автоматические | Сохранение в репозитории | Git |

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Убедиться что `scripts/generate-feed.js` работает локально
2. ✅ Проверить что в `articles/women-35-60/` есть `.md` файлы
3. ✅ Запустить скрипт: `node scripts/generate-feed.js incremental`
4. ✅ Проверить `public/feed.xml` создан и содержит статьи
5. ✅ Запустить workflow через GitHub Actions
6. ✅ Убедиться что feed залил на Vercel
7. ✅ Дать Vercel URL в Yandex Dzen для импорта
8. ✅ Подождать синхронизации (обычно 1-2 часа)

---

## ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ!

Все файлы созданы и пришиты правильно. RSS фид будет генерироваться автоматически и доставляться в Yandex Dzen с правильными ссылками на картинки и полным HTML контентом.
