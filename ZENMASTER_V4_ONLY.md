# 🚀 ZenMaster v4.0 - ЕДИНСТВЕННАЯ ВЕРСИЯ

## ❌ v2.0 УДАЛЕНА! ЗАБУДЬ О НЕЙ!

```
❌ ZenMaster v2.0 = МУСОР
   - Генерирует JSON, TXT, HTML (ненужные форматы)
   - БЕЗ картинок
   - Неправильные модели
   - ВЫБРОШЕНА!
```

---

## ✅ ТОЛЬКО v4.0 (НОВОЕ И РАБОТАЮЩЕЕ)

### 📝 Модели (ТОЛЬКО ЭТИ)

```
✅ gemini-2.5-flash          (для текста)
✅ gemini-2.5-flash-vision   (для картинок)
```

### 🎮 Запуск

```bash
# ПРАВИЛЬНО (v4.0):
npx tsx cli.ts generate:v4 \
  --count=10 \
  --includeImages=true \
  --quality=premium

# НЕПРАВИЛЬНО (v2.0 - удалена):
# npx tsx cli.ts generate:v2 ← ЭТА КОМАНДА МЕРТВА!
```

### 📁 Выход (ЧИСТЫЙ И ПРАВИЛЬНЫЙ)

```
output/
├─ article-1/
│  ├─ article-1.txt           ✅ (для Дзена, 35K+ символов)
│  ├─ article-1-cover.png     ✨ (1920×1080, реальная фотка)
│  └─ article-1.json          📊 (метаданные только)
├─ article-2/
│  ├─ article-2.txt           ✅
│  ├─ article-2-cover.png     ✨
│  └─ article-2.json          📊
└─ REPORT.md                  📈 (статистика)
```

**БЕЗ МУСОРА:**
- ❌ БЕЗ HTML файлов
- ❌ БЕЗ лишних JSON копий
- ❌ БЕЗ дублирования

---

## ⏱️ Время Генерации

| Количество | Время | Параллель |
|-----------|-------|-----------|
| 1 | ~5 мин | 1 текст |
| 10 | ~50 мин | 3 текста + 1 картинка/мин |
| 100 | ~2 часа | 3 текста + 1 картинка/мин |

**Расчет:**
```
10 статей = 120 эпизодов = 120 картинок
Текст: 10 × 5 мин = 50 мин (параллельно 3)
Картинки: 120 × 1 мин = 120 мин (серийно, но параллельно с текстом)
= 50 мин (максимум)
```

---

## 🎯 Настройки (ВСЕ В ОДНОМ МЕСТЕ)

### GitHub Actions Workflow

`.github/workflows/batch-articles.yml`

```yaml
on:
  workflow_dispatch:
    inputs:
      count:
        description: 'Number of articles'
        default: '10'
        type: choice
        options: ['1', '5', '10', '25', '50', '100']
      includeImages:
        description: 'Generate cover images'
        default: 'true'
      quality:
        description: 'Quality level'
        default: 'premium'
        type: choice
        options: ['standard', 'premium']

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: |
          npx tsx cli.ts generate:v4 \
            --count=${{ github.event.inputs.count }} \
            --includeImages=${{ github.event.inputs.includeImages }} \
            --quality=${{ github.event.inputs.quality }}
```

---

## 🔧 Конфигурация (ДА, ОНА ЕСТЬ!)

### `src/config/generation.ts`

```typescript
export const GENERATION_CONFIG = {
  // ✅ МОДЕЛИ
  models: {
    text: "gemini-2.5-flash",
    images: "gemini-2.5-flash-vision",
  },

  // ✅ ПАРАМЕТРЫ
  articles: {
    parallel: 3,           // 3 статьи одновременно
    timeout: 5 * 60 * 1000, // 5 минут на статью
  },

  images: {
    enabled: true,         // ✅ ВКЛЮЧЕНЫ!
    rate: 1,              // 1 в минуту
    format: "png",
    size: { width: 1920, height: 1080 },
  },

  // ✅ ВЫХОД (БЕЗ МУСОРА!)
  export: {
    formats: ["txt", "json"], // ❌ БЕЗ HTML!
  },

  // ✅ КАЧЕСТВО
  quality: {
    standard: { promptLength: "medium" },
    premium: { promptLength: "long" },
  },
};
```

### Где это менять?

```bash
# Редактировать этот файл:
src/config/generation.ts

# Или через CLI флаги:
npx tsx cli.ts generate:v4 \
  --count=50 \
  --includeImages=true \
  --quality=premium
```

---

## 🚦 Статус

```
✅ v4.0 = ГОТОВОЕ, РАБОТАЮЩЕЕ
❌ v2.0 = УДАЛЕНО, МЕРТВО
```

**Все команды с v2 будут падать!**

```bash
❌ npm generate:v2         ← ERROR (deleted)
❌ generate:batch v2       ← ERROR (deleted)
❌ ZenMaster v2.0          ← ERROR (deleted)

✅ npm generate:v4         ← WORKS
✅ generate:batch v4       ← WORKS
✅ ZenMaster v4.0          ← WORKS
```

---

## 📌 ЗАПОМНИ!

1. **ТОЛЬКО v4.0** - v2.0 удалена
2. **Две модели** - 2.5-flash (текст) и 2.5-flash-vision (картинки)
3. **Картинки ВКЛЮЧЕНЫ** - includeImages: true
4. **Выход чистый** - только TXT и JSON, БЕЗ HTML
5. **Конфиг в одном месте** - src/config/generation.ts
