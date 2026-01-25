# 🔧 GitHub Actions Setup - v6.0

## Настройка GitHub Secrets

### Обязательные секреты

Перейдите в **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Описание | Где получить |
|-------------|----------|--------------|
| `GEMINI_API_KEY` | API ключ для Google Gemini | https://aistudio.google.com/app/apikey |

### Проверка настройки

```bash
# В GitHub Actions секреты доступны через:
${{ secrets.GEMINI_API_KEY }}
```

## Переменные окружения v6.0

### Автоматически настроены в workflows

Все workflow файлы уже содержат настройки для системы очистки статей (v6.0):

```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  API_KEY: ${{ secrets.GEMINI_API_KEY }}
  # v6.0: Article Cleanup System
  FINAL_CLEANUP_ENABLED: true
  CLEANUP_THRESHOLD: medium
  CLEANUP_MODEL: gemini-2.0-flash
  CLEANUP_TEMPERATURE: 0.3
  CLEANUP_MAX_RETRIES: 2
```

### Настроенные workflows

✅ **content-factory.yml** - генерация статей  
✅ **test-image-generation.yml** - тестирование изображений  
✅ **test.yml** - unit тесты  

## Workflows

### 1. Content Factory (Генерация статей)

**Путь:** `.github/workflows/content-factory.yml`

**Использование:**
1. Перейдите в **Actions** → **Content Factory - Batch Articles**
2. Нажмите **Run workflow**
3. Выберите параметры:
   - `count`: количество статей (1, 5, 10, 25, 50, 100)
   - `channel`: тема канала (women-35-60, young-moms, men-25-40, teens)
   - `images`: генерировать обложки (true/false)

**Что происходит:**
```
1. Checkout кода
2. Установка Node.js 20
3. npm install
4. Генерация статей (с cleanup системой v6.0)
5. Подсчет результатов
6. Upload artifacts
7. Commit и push в репозиторий
```

**Результат:**
- Статьи сохраняются в `articles/{channel}/{date}/`
- Артефакты доступны 90 дней
- Автоматический коммит в текущую ветку

### 2. Test Image Generation (Тест изображений)

**Путь:** `.github/workflows/test-image-generation.yml`

**Использование:**
1. Перейдите в **Actions** → **Test Image Generation**
2. Нажмите **Run workflow**
3. Выберите `channel` (по умолчанию: women-35-60)

**Результат:**
- Тестовые изображения в `articles/{channel}/`
- Артефакты доступны 7 дней
- Автоматический коммит в main

### 3. Tests (Unit тесты)

**Путь:** `.github/workflows/test.yml`

**Триггеры:**
- Push в `main` или `feature/**`
- Pull Request в `main`
- Ручной запуск (workflow_dispatch)

**Что происходит:**
```
1. Checkout кода
2. Установка Node.js 20
3. npm ci
4. npm test (с cleanup системой v6.0)
5. npm run build (опционально)
```

## Локальная разработка

### Setup

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/your-repo/zenmaster.git
cd zenmaster
```

2. **Создайте .env файл:**
```bash
cp .env.example .env
```

3. **Добавьте ваш API ключ:**
```bash
# .env
GEMINI_API_KEY=your_actual_api_key_here
API_KEY=your_actual_api_key_here

# Cleanup настройки (опционально, есть дефолты)
FINAL_CLEANUP_ENABLED=true
CLEANUP_THRESHOLD=medium
CLEANUP_MODEL=gemini-2.0-flash
CLEANUP_TEMPERATURE=0.3
CLEANUP_MAX_RETRIES=2
```

4. **Установите зависимости:**
```bash
npm install
```

5. **Запустите тесты:**
```bash
# Unit тесты cleanup системы
npx tsx test-article-cleanup-system.ts

# Все тесты
npm test

# Генерация 1 статьи
npm run factory -- --count=1
```

### ⚠️ ВАЖНО

**НЕ коммитьте .env файл с реальными ключами!**

`.gitignore` уже содержит `.env`, но на всякий случай проверьте:

```bash
# Проверить что .env в gitignore
grep "^\.env$" .gitignore

# Если нет, добавьте:
echo ".env" >> .gitignore
```

## Проверка работы v6.0

### Локально

```bash
# Test cleanup system
npx tsx test-article-cleanup-system.ts

# Generate 1 article with cleanup
npm run factory -- --count=1 --images
```

**Ожидаемый вывод:**
```
🧹 [Уровень 2] Final Article Cleanup Gate...
   Issues found: 0
   Severity: LOW
   ✅ No cleanup needed

🚪 [Уровень 3] Article Publish Gate...
   📊 VALIDATION RESULT:
      Score: 85/100
      Can Publish: ✅ YES
      Errors: 0
      Warnings: 0
   ✅ GOOD QUALITY. Ready to publish.
```

### В GitHub Actions

1. **Запустите workflow:**
   - Actions → Content Factory → Run workflow

2. **Проверьте логи:**
   ```
   Generate articles
   ↓
   🧹 [Уровень 2] Final Article Cleanup Gate...
   ↓
   🚪 [Уровень 3] Article Publish Gate...
   ↓
   ✅ Article passed publish gate validation
   ```

3. **Проверьте результаты:**
   - Artifacts: `articles-{channel}-{run_id}`
   - Commits: автоматический commit с датой и каналом

## Troubleshooting

### Ошибка: "API key not found"

**Проблема:** Секрет `GEMINI_API_KEY` не настроен в GitHub

**Решение:**
1. Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `GEMINI_API_KEY`
4. Value: ваш API ключ
5. Add secret

### Ошибка: "Cleanup failed"

**Проблема:** Cleanup система не может подключиться к Gemini

**Решение:**
1. Проверьте что `GEMINI_API_KEY` валиден
2. Проверьте quota в Google AI Studio
3. Проверьте логи:
   ```yaml
   # В workflow добавьте debug
   - name: Debug env
     run: |
       echo "GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
   ```

### Ошибка: "Quality check failed"

**Проблема:** Статья не прошла publish gate

**Решение:**
1. Проверьте логи валидации:
   ```
   ❌ ERRORS:
   1. Article too short: 2694 chars (min: 8000)
   ```
2. Настройте threshold в workflow:
   ```yaml
   CLEANUP_THRESHOLD: low  # Более мягкая проверка
   ```

## Мониторинг

### Metrics

В логах каждого run вы увидите:

```
📊 ARTICLE COMPLETE
📊 Metrics:
   - Episodes: 6
   - Characters: 12000 (target: 12000)
   - Utilization: 101.3%
   - Reading time: 32 min
   - Scenes: 18
   - Dialogues: 24
   - Phase 2 Score: 78/100
   - Anti-Detection: ✅ Applied
   - Cover image: ✅ Generated

🧹 [Уровень 2] Final Article Cleanup Gate...
   Issues found: 2
   Severity: MEDIUM
   🔄 Applying AI cleanup...
   ✅ Cleanup successful
      Issues before: 2
      Issues after: 0

🚪 [Уровень 3] Article Publish Gate...
   📊 VALIDATION RESULT:
      Score: 85/100
      Can Publish: ✅ YES
```

### Success Rate

**Целевые метрики v6.0:**
- ✅ 95%+ статей проходят publish gate с первой попытки
- ✅ Quality score > 80 для 90% статей
- ✅ 0% артефактов в публикуемых статьях

## Дополнительные ресурсы

- [v6.0 Cleanup System - Full Docs](./v6.0-cleanup-system.md)
- [Quick Start Guide](./CLEANUP-SYSTEM-README.md)
- [Implementation Summary](../IMPLEMENTATION-SUMMARY.md)
