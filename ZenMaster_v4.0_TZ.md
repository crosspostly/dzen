# 🚀 ZENMASTER V4.0 — ТЕХНИЧЕСКОЕ ЗАДАНИЕ

## РЕЗЮМЕ

**Критические изменения:**
1. **1 article = 1 cover image** (вместо 12 фото на эпизоды)
2. **Параллельная генерация статей** (3 одновременно)
3. **PlotBible + Rolling Context + Style Guide**
4. **Сокращение времени:** 5 статей за 10 минут (было 65)

---

## 1️⃣ IMAGE GENERATION

### 1.1 Цель
Создать **одно cover-изображение** для каждой статьи с использованием PlotBible

### 1.2 Входные данные
- `articleTitle`: string
- `articleLedeText`: string  
- `plotBible`: PlotBible

### 1.3 Выходные данные
- `GeneratedImage`: PNG 1920x1080, base64
- Файл: `./output/images/article-{id}-cover.png`

### 1.4 Метод
```typescript
generateCoverImage(articleTitle: string, articleLedeText: string, plotBible: PlotBible): Promise<GeneratedImage>
```

### 1.5 Типы
- `ImageGenerationRequest`
- `GeneratedImage`
- `CoverImageRequest`
- `ImageQueueItem`

### 1.6 Важные детали
- **AUTHENTIC phone photo** в стиле
- **Domestic realism** (русский быт)
- **Fallback**: gemini-2.5-flash-exp-02-05 при 503
- **Rate limit**: 1 RPM (строго)

---

## 2️⃣ CONTENT FACTORY

### 2.1 ГЛАВНОЕ ИЗМЕНЕНИЕ
**1 запрос на статью вместо 12** — одно изображение вместо галереи эпизодов

### 2.2 Основные типы
- `ContentFactoryConfig`
- `FactoryProgress`
- `Article`
- `CoverImageRequest`
- `FactoryPreset`

### 2.3 Методы фабрики
```typescript
initialize(preset: FactoryPreset): Promise<void>
start(articleCount: number): Promise<Article[]>
getProgress(): FactoryProgress
```

### 2.4 Файловая структура
```
output/
├── articles/
│   ├── article-{id}.json
│   └── article-{id}.md
├── images/
│   └── article-{id}-cover.png
├── manifest.json
└── REPORT.md
```

### 2.5 Параллелизация
- **Статьи**: 3 concurrent workers
- **Изображения**: 1 per minute (serial queue)

---

## 3️⃣ QUALITY & PLOTBIBLE

### 3.1 PlotBible Builder
```typescript
buildFromTheme(theme: string): Promise<PlotBible>
```

### 3.2 Rolling Context
- Сохранять **800 chars** предыдущего контекста
- Применять к генерации каждой новой статьи

### 3.3 Style Guide
- **AUTHENTIC Russian narrative** (no village dialect)
- **Urban vocabulary only**
- **Burstiness + Perplexity** в структуре
- **CTA Provocation** в конце каждой статьи

### 3.4 Skaz Narrative Engine  
- Удалены: "дыбать", "шарить", "пялиться"
- 25% инъекция частиц (вместо 40%)
- `removeDialectalStupidity()` — финальная проверка

---

## 5️⃣ PERFORMANCE METRICS

### 5.1 Rate Limits
- **Текст**: 15 RPM per article
- **Изображения**: 1 RPM (total system)

### 5.2 Тайминг
| Действие | До v4.0 | После v4.0 | Улучшение |
|----------|---------|------------|-----------|
| 1 статья | 5 мин | 5 мин | — |
| 5 статей + 5 карт | 65 мин | 10 мин | **6.5x** |
| 100 статей + 100 карт | 2 часа | 35 мин | **3.4x** |

### 5.3 Ресурсы
- **Memory**: <500MB
- **API Calls**: 15 на статью + 1 на изображение
- **Success Rate**: >95%
- **Cache**: макс. 10 статей

---

## 7️⃣ TIMELINE

### Phase 1: Image Generation (неделя 1)
- Оптимизация imageGeneratorAgent
- Реализация imageQueueManager
- Rate limit 1 RPM

### Phase 2: Factory Integration (неделя 1-2)
- `articleWorkerPool` (3 workers)
- `contentFactoryOrchestrator`
- CLI команда `factory`

### Phase 3: Quality & Testing (неделя 2)
- PlotBible интеграция
- Rolling context
- Anti-detection обновления

### Phase 4: Documentation & Cleanup (неделя 2)
- `ZENMASTER_V4_README.md`
- Конфиги presets
- Удаление legacy кода

---

## SUCCESS METRICS

| Критерий | Цель | Измерение |
|----------|------|-----------|
| **Время 5 статей** | <15 мин | Фактическое время |
| **Quality Score** | >8.5/10 | Оценка системой |
| **Anti-detection** | <5% | Тесты проникновения |
| **Memory Usage** | <500MB | Трекинг RAM |
| **Success Rate** | >95% | КомпLETED/TOTAL |

**Total: 175 строк**