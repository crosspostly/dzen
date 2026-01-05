# 🐛 Known Issues & TODO

**Для**: Разработчики
**Версия**: 1.0 | **Обновлено**: January 5, 2026

---

## 🚨 Критические проблемы

### 1. Stage 3 (Voice Restoration) пропущен в MultiAgentService

**Локация**: `services/multiAgentService.ts`, строка 310-311

**Текущий код**:
```typescript
// 🆕 v9.0: Removed rotten Stage 3 Cleanup
console.log('✅ Stage 3: Cleanup SKIPPED (relying on auto-restore)');
```

**Проблема**:
- Stage 3 (Voice Restoration + DZEN GURU rules) полностью пропущен
- Согласно MASTER_PIPELINE_GUIDE.md, Stage 3 ДОЛЖЕН выполняться ПЕРЕД Stage 4
- Без Stage 3 текст не будет "живым" (диалоги в дефисах, стиль, эволюция персонажа)
- Stage 4 (Anti-Detection) применяется к "мертвому" тексту → потеря эффективности

**Правильный порядок** (из MASTER_PIPELINE_GUIDE.md):
```
Stage 3: Voice Restoration + DZEN GURU (phase2 >= 85)
   ↓
Stage 4: Phase 2 Anti-Detection (Overall Score >= 80)
```

**Решение**:

**Шаг 1**: Добавить вызов VoiceRestorationService
```typescript
import { VoiceRestorationService } from './voiceRestorationService';

// В MultiAgentService constructor
this.voiceRestorationService = new VoiceRestorationService();

// В generateLongFormArticle(), ПОСЛЕ Stage 2, ДО выхода:
// Stage 3: Voice Restoration + DZEN GURU Rules
console.log("🔤 Stage 3: Voice Restoration + DZEN GURU Rules...");

let restoredContent = fullContent;
let stage3Passed = false;
let stage3Attempts = 0;

while (!stage3Passed && stage3Attempts < 2) {
  restoredContent = await this.voiceRestorationService.restoreArticle({
    ...article,
    processedContent: fullContent
  });

  // Проверить Phase 2 Score >= 85
  const phase2Result = await this.phase2Service.processArticle(
    title,
    restoredContent,
    { applyPerplexity: false, applyBurstiness: false } // Только анализ, не трансформация
  );

  if (phase2Result.adversarialScore.overallScore >= 85) {
    stage3Passed = true;
    console.log('✅ Stage 3 PASSED (Phase 2 Score >= 85)');
    fullContent = restoredContent;
  } else {
    console.log('⚠️ Stage 3 failed, auto-restoring...');
    stage3Attempts++;
  }
}

if (!stage3Passed) {
  console.log('❌ Stage 3 failed after 2 attempts, returning to Stage 2');
  // Возвращаемся на Stage 2 (перегенерация статьи)
  return this.generateLongFormArticle(params);
}
```

**Шаг 2**: Удалить старый комментарий
```typescript
// Удалить эти строки:
// // 🆕 v9.0: Removed rotten Stage 3 Cleanup
// console.log('✅ Stage 3: Cleanup SKIPPED (relying on auto-restore)');
```

**Приоритет**: 🚨 КРИТИЧЕСКИЙ
**Время на исправление**: ~2-3 часа

---

### 2. Авто-реставрация не реализована в Stage 1

**Локация**: `services/simpleEpisodeGenerator.ts`, `services/multiAgentService.ts`

**Проблема**:
- В документации описано авто-реставрация в Stage 1 (WHILE phase2 < 70: regenerate)
- Но в коде это не реализовано (или реализовано частично)
- Episodes генерируются без авто-реставрации

**Решение**:

```typescript
// В SimpleEpisodeService или MultiAgentService
// При генерации каждого эпизода:

for (let i = 0; i < episodeCount; i++) {
  let episode = await this.generateSingleEpisode(outline, i);
  let phase2Score = 0;
  let attempts = 0;

  // Авто-реставрация: WHILE phase2 < 70
  while (phase2Score < 70 && attempts < 3) {
    // Применить voice restoration к эпизоду
    episode = await this.autoRestoreEpisode(episode);

    // Пересчитать Phase 2 Score
    const phase2Result = await this.phase2Service.processEpisodeContent(
      episode.content,
      i + 1
    );
    phase2Score = phase2Result.adversarialScore;

    attempts++;
  }

  if (phase2Score >= 70) {
    episodes.push(episode);
  } else {
    // Если после 3 попыток всё еще < 70 -> перегенерировать
    i--; // Повторить этот эпизод
  }
}
```

**Приоритет**: 🟠 ВЫСОКИЙ
**Время на исправление**: ~2-4 часа

---

## 🟠 Высокий приоритет

### 3. Levenshtein distance check не реализован

**Локация**: `services/simpleEpisodeGenerator.ts`, должен быть в `utils/levenshtein-distance.ts`

**Проблема**:
- Дубликаты эпизодов могут генерироваться
- Levenshtein distance check описан в документации, но не реализован

**Решение**:

**Шаг 1**: Создать `utils/levenshtein-distance.ts`
```typescript
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function similarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}
```

**Шаг 2**: Интегрировать в генерацию эпизодов
```typescript
import { similarity } from '../utils/levenshtein-distance';

// После генерации нового эпизода
for (const existingEpisode of episodes) {
  const sim = similarity(newEpisode.content, existingEpisode.content);

  if (sim > 0.75) {
    // Дубликат detected! Перезапустить
    console.log(`⚠️ Duplicate detected (${Math.round(sim * 100)}% similarity), regenerating...`);
    return this.generateEpisode(outline, episodeNum);
  }
}
```

**Приоритет**: 🟠 ВЫСОКИЙ
**Время на исправление**: ~1-2 часа

---

### 4. Нет rate limiting для Gemini API

**Локация**: `services/geminiService.ts`, все сервисы, вызывающие Gemini

**Проблема**:
- При массовой генерации (100+ статей) можно получить 429 errors
- Нет задержек между запросами

**Решение**:

```typescript
// Создать utils/rateLimiter.ts
export class RateLimiter {
  private lastCall: number = 0;
  private minDelay: number; // минимальная задержка в ms

  constructor(minDelay: number = 1000) { // 1 секунда по умолчанию
    this.minDelay = minDelay;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minDelay) {
      const delay = this.minDelay - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastCall = Date.now();
  }
}

// Использование в geminiService.ts
export class GeminiService {
  private rateLimiter = new RateLimiter(1000); // 1 секунда между запросами

  async generateContent(prompt: string): Promise<string> {
    await this.rateLimiter.wait(); // Ждать перед каждым запросом

    const response = await this.client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
```

**Приоритет**: 🟠 ВЫСОКИЙ
**Время на исправление**: ~1 час

---

## 🟡 Средний приоритет

### 5. Нет unit-тестов

**Локация**: Отсутствует директория `test/` с тестами

**Проблема**:
- Нет автоматического тестирования
- Высокий риск регрессий при изменениях

**Решение**:

Создать следующие тесты:
- `test/services/plotBibleBuilder.test.ts`
- `test/services/episodeGenerator.test.ts`
- `test/services/voiceRestorationService.test.ts`
- `test/services/phase2AntiDetectionService.test.ts`
- `test/utils/levenshtein-distance.test.ts`

**Пример теста**:
```typescript
import { levenshteinDistance, similarity } from '../utils/levenshtein-distance';

describe('Levenshtein Distance', () => {
  it('should calculate distance correctly', () => {
    expect(levenshteinDistance('hello', 'helo')).toBe(1);
    expect(levenshteinDistance('test', 'text')).toBe(1);
  });

  it('should calculate similarity correctly', () => {
    expect(similarity('hello world', 'hello world')).toBe(1);
    expect(similarity('hello', 'hel')).toBeGreaterThan(0.5);
  });
});
```

**Приоритет**: 🟡 СРЕДНИЙ
**Время на исправление**: ~8-12 часов

---

### 6. Нет мониторинга и логирования

**Локация**: Отсутствует

**Проблема**:
- Нет централизованного логирования
- Нет метрик для мониторинга
- Сложно отлаживать проблемы в production

**Решение**:

**Шаг 1**: Добавить структурированное логирование
```typescript
// utils/logger.ts
import fs from 'fs';
import path from 'path';

export class Logger {
  private logFile: string;

  constructor(logDir: string = 'logs') {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logDir, `${date}.log`);
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    const logLine = JSON.stringify(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`);
    fs.appendFileSync(this.logFile, logLine + '\n');
  }
}

export const logger = new Logger();
```

**Шаг 2**: Интегрировать в основные сервисы
```typescript
// В MultiAgentService
import { logger } from '../utils/logger';

async generateLongFormArticle(params: ...): Promise<LongFormArticle> {
  logger.log('info', 'Starting article generation', { theme: params.theme });

  try {
    const outline = await this.generateOutline(params);
    logger.log('info', 'Outline generated', { episodeCount: outline.episodes.length });
    // ...
  } catch (error) {
    logger.log('error', 'Article generation failed', { error: (error as Error).message });
    throw error;
  }
}
```

**Приоритет**: 🟡 СРЕДНИЙ
**Время на исправление**: ~4-6 часов

---

### 7. GitHub Actions для nightly auto-restore

**Локация**: `.github/workflows/`

**Проблема**:
- Auto-restore описан как "nightly job", но workflow отсутствует
- Статьи не обновляются автоматически

**Решение**:

Создать `.github/workflows/nightly-restore.yml`:
```yaml
name: Nightly Auto-Restore

on:
  schedule:
    - cron: '0 2 * * *'  # Каждую ночь в 2 AM UTC
  workflow_dispatch:

jobs:
  restore:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run auto-restore
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: node scripts/restore-articles-fixed.js

      - name: Commit changes
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add articles/
          git commit -m "Auto-restore: nightly update [skip ci]" || exit 0
          git push
```

**Приоритет**: 🟡 СРЕДНИЙ
**Время на исправление**: ~1-2 часа

---

## 🔧 Низкий приоритет

### 8. Dashboard для метрик

**Проблема**:
- Нет визуализации метрик
- Сложно отслеживать качество и производительность

**Решение**: Создать dashboard (описано в QUALITY_METRICS.md)

**Приоритет**: 🔩 НИЗКИЙ
**Время на исправление**: ~16-24 часа

---

### 9. A/B testing для контента

**Проблема**:
- Нет возможности тестировать разные версии статей

**Решение**: Добавить A/B testing framework

**Приоритет**: 🔩 НИЗКИЙ
**Время на исправление**: ~12-16 часов

---

## 📊 Приоритеты по времени

| Приоритет | Проблема | Время | Суммарное время |
|-----------|----------|-------|----------------|
| 🚨 КРИТИЧЕСКИЙ | Stage 3 пропущен | 2-3 ч | 2-3 ч |
| 🚨 КРИТИЧЕСКИЙ | Авто-реставрация Stage 1 | 2-4 ч | 4-7 ч |
| 🟠 ВЫСОКИЙ | Levenshtein check | 1-2 ч | 5-9 ч |
| 🟠 ВЫСОКИЙ | Rate limiting | 1 ч | 6-10 ч |
| 🟡 СРЕДНИЙ | Unit-тесты | 8-12 ч | 14-22 ч |
| 🟡 СРЕДНИЙ | Мониторинг и логирование | 4-6 ч | 18-28 ч |
| 🟡 СРЕДНИЙ | Nightly auto-restore GitHub Actions | 1-2 ч | 19-30 ч |
| 🔩 НИЗКИЙ | Dashboard | 16-24 ч | 35-54 ч |
| 🔩 НИЗКИЙ | A/B testing | 12-16 ч | 47-70 ч |

---

## 🎯 Quick Wins (меньше 2 часов)

1. **Rate limiting** - ~1 час
2. **GitHub Actions для nightly restore** - ~1-2 часа
3. **Создание utils/levenshtein-distance.ts** - ~30 минут

---

## 📞 Связанная документация

- **MASTER_PIPELINE_GUIDE.md** - Полное описание пайплайна
- **SYSTEM_OVERVIEW.md** - Архитектура системы
- **QUALITY_METRICS.md** - Метрики качества

---

**Версия**: 1.0
**Последнее обновление**: January 5, 2026
**Поддержка**: crosspostly
