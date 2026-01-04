# 🚀 QUICK START - Автопубликация в Дзен

## ✅ 3 ПРОСТЫХ ШАГА

### 1️⃣ Добавь куки в GitHub Secret

```
https://github.com/crosspostly/dzen/settings/secrets/actions
↓
"New repository secret"
↓
Name: DZEN_COOKIES_JSON
Value: (твой JSON из браузера)
↓
Save
```

### 2️⃣ Тестируй

```
https://github.com/crosspostly/dzen/actions
↓
Найди workflow: "Test Dzen Setup"
↓
"Run workflow" > main > "Run workflow"
↓
Жди 1-2 минуты
```

### 3️⃣ Публикуй!

```
Workflow "Auto-Publish to Dzen Every 3 Hours"
будет запускаться автоматически каждые 3 часа

Или запусти вручную:
"Run workflow" > main > "Run workflow"
```

---

## 📄 ЧТО ДАЛЬШЕ?

### Просмотри логи тестов:
```
https://github.com/crosspostly/dzen/actions/workflows/test-dzen.yml
```

### Просмотри логи публикации:
```
https://github.com/crosspostly/dzen/actions/workflows/auto-publish-dzen.yml
```

### Документация:
- `!posts/PRODUCTION_READY/GITHUB_SECRETS_SETUP.md` - подробно про секреты
- `!posts/PRODUCTION_READY/test-setup.js` - что тестируется
- `!posts/PRODUCTION_READY/src/main.js.ci` - как работает CI/CD

---

## 🔐 GitHub Secret

**Что вставлять в secret:**

Ввести JSON из браузера (DevTools > Application > Cookies > dzen.ru):

```json
[
  {
    "name": "mda2_beacon",
    "value": "1765685032529",
    "domain": ".dzen.ru",
    ...
  },
  ...
]
```

**Весь массив целиком** (от `[` до `]`)

---

## 📊 Что проверяется при тесте?

✅ feed.xml существует
✅ Куки загружаются из secret
✅ JSON правильный формат
✅ История готова
✅ Статьи парсятся
✅ Дедублирование работает
✅ Окружение правильное
✅ Все файлы на месте

---

## 🔌 Структура

```
GitHub Actions:
  Test Dzen Setup (вручную)
    ↓
  Auto-Publish to Dzen (каждые 3 часа)
    ↓
  Читает: DZEN_COOKIES_JSON secret
    ↓
  Запускает: !posts/PRODUCTION_READY/src/main.js
    ↓
  Публикует в Дзен
    ↓
  Обновляет: published_articles.txt
```

---

## ✅ Status

- ✅ GitHub Secret: `DZEN_COOKIES_JSON`
- ✅ Test Workflow: `.github/workflows/test-dzen.yml`
- ✅ Auto-Publish Workflow: `.github/workflows/auto-publish-dzen.yml`
- ✅ Безопасность: Максимальная (env vars, no files)
- ✅ Дедублирование: Включено (3 уровня проверки)
- ✅ Автоматизация: Каждые 3 часа

---

## 🚀 ГОТОВО!

1. Добавь secret
2. Запусти тест
3. Наслаждайся автопубликацией!

**Вопросы?** Смотри документацию в `!posts/PRODUCTION_READY/`

Last updated: 2026-01-04 08:30 UTC
