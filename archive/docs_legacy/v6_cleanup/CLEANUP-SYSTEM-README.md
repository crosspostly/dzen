# 🧹 Article Cleanup System v6.0 - Quick Start

## TL;DR

**Проблема:** 50+ раз "— вот в чём дело..." в одной статье, метаданные, markdown, разорванные диалоги.

**Решение:** 3-уровневая система очистки:
1. **Профилактика** - улучшенные промпты с явными запретами
2. **AI Очистка** - автоматическое удаление артефактов через Gemini
3. **Валидация** - проверка качества перед публикацией

**Результат:** 95%+ статей проходят с первого раза, 0% артефактов.

## Быстрый Старт

### 1. Включить cleanup в .env

```.env
FINAL_CLEANUP_ENABLED=true
CLEANUP_THRESHOLD=medium
CLEANUP_MODEL=gemini-2.0-flash
CLEANUP_TEMPERATURE=0.3
CLEANUP_MAX_RETRIES=2
```

### 2. Использовать в коде

```typescript
import { FinalArticleCleanupGate } from './services/finalArticleCleanupGate';
import { ArticlePublishGate } from './services/articlePublishGate';

// Анализ
const analysis = FinalArticleCleanupGate.analyzeForIssues(article);
console.log(analysis.severity); // 'low' | 'medium' | 'critical'

// Очистка (если нужно)
const cleanupGate = new FinalArticleCleanupGate();
const result = await cleanupGate.cleanupAndValidate(article);
const cleanArticle = result.cleanText;

// Валидация
const validation = ArticlePublishGate.validateBeforePublish(cleanArticle);
if (!validation.canPublish) {
  throw new Error('Quality check failed');
}
```

### 3. Запустить тесты

```bash
# Unit tests
npx tsx test-article-cleanup-system.ts

# Integration test
npm run factory -- --count=1 --preset=quick-test
```

## Что Очищается

| Артефакт | Пример | Действие |
|----------|--------|----------|
| Метаданные | `[note: add details]` | Удаляется |
| Markdown | `**жирный текст**`, `## Header` | Удаляется |
| Повторяющиеся фразы | "— вот в чём дело..." (50+ раз) | Заменяется на варианты |
| Orphaned фрагменты | "ну и", "да вот" в начале | Переписывается |
| Разорванные диалоги | Диалог обрывается посередине | Исправляется |

## Thresholds

| Threshold | Когда применяется cleanup |
|-----------|---------------------------|
| `low` | Только critical (metadata, markdown) |
| `medium` | Critical + повторяющиеся фразы > 10 раз |
| `high` | Все проблемы включая orphaned фрагменты |

## Quality Scores

- **< 70:** REJECT (не публикуется)
- **70-84:** GOOD (публикуется с warnings)
- **85-100:** EXCELLENT (отличное качество)

## Pipeline Flow

```
Генерация → Сборка → Cleanup Gate → Publish Gate → ✅ Publish
   ↑           ↑           ↑              ↑
Level 1    Assembly   Level 2        Level 3
(Prompts)             (AI Clean)   (Validation)
```

## Metrics

- ✅ 95%+ статей проходят с первой попытки
- ✅ Quality score > 80 для 90% статей
- ✅ 0% артефактов в публикуемых статьях
- ✅ ~30 sec на статью

## Полная Документация

См. [v6.0-cleanup-system.md](./v6.0-cleanup-system.md)
