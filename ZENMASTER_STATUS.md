# 🚀 ZENMASTER V2.0 - STATUS

## ✅ ЧТО ГОТОВО

### Phase 1 (Stage 0-1: Генерация)
- Type definitions ✅
- MultiAgentService ✅
- Workflow (каждые 3 часа) ✅
- **Мулти-канальная система** ✅ (каждый канал = сВОЙ ключ Gemini!)
- **Статус**: Ждёт интеграции

### Phase 2 (Stage 2: Обработка)  
- 5 компонентов реализовано ✅
- CLI команды (phase2, phase2-info) ✅
- Тесты ✅
- **Статус**: PR #3 ОТКРЫТ - ГОТОВ К MERGE

---

## 🎯 КАНАЛЫ (НЕ ОДИН КЛЮЧ!)

| ID | Name | Audience | **Gemini Key** | Schedule |
|----|----|----------|--------|----------|
| `dzen` | Яндекс.Дзен | Women 35-60 | `GEMINI_API_KEY_DZEN` | Каждые 3ч |
| `medium` | Medium | Tech Founders | `GEMINI_API_KEY_MEDIUM` | 3× в день |
| `substack` | Substack | Premium | `GEMINI_API_KEY_SUBSTACK` | 4× в день |
| `habr` | Habr | Tech RU | `GEMINI_API_KEY_HABR` | 3× в день |

🚨 **КАЖДЫЙ канал читает СВОЙ ключ!**

---

## ⚡ GITHUB SECRETS (ПО ОДНОМУ НА КАНАЛ)

`Settings → Secrets and variables → Repository secrets`

```
GEMINI_API_KEY_DZEN = sk-...
GEMINI_API_KEY_MEDIUM = sk-...
GEMINI_API_KEY_SUBSTACK = sk-...
GEMINI_API_KEY_HABR = sk-...
```

⚠️ **РАЗНЫЕ ключи для каждого проекта в Gemini API!**

---

## 📝 КОМАНДЫ

```bash
# Генерировать для разных каналов
npx ts-node cli.ts generate:v2 --channel=dzen
npx ts-node cli.ts generate:v2 --channel=medium

# Обработать (Phase 2)
npx ts-node cli.ts phase2 --channel=dzen --content=article.txt

# Все каналы сразу
npx ts-node cli.ts generate:all
```

---

## 🚀 ПОРЯДОК РАБОты

1. ✅ Настроить **ОТДЕЛЬНЫЕ проекты** в Gemini API Console
2. ✅ Merge PR #3 (resolve cli.ts conflicts)
3. ✅ Добавить **РАЗНЫЕ SECRETS** (не один!)
4. **→ WORKFLOW STARTS**
5. → Статьи генерируются автоматически для КАЖДОГО канала

---

## 📚 ФАЙЛЫ

- `config/channels.config.ts` - Все конфиги (каждый с сВОИМ ключом)
- `CONFIG_SETUP.md` - Как добавить новый канал (КОНКРЕТНО!)
- `PHASE_2_ANTI_DETECTION.md` - Обработка (обход детекторов)

---

**Status**: 🟡 Waiting for: Separate Gemini projects + PR #3 merge + SECRETS
**Next**: Phase 3-4 (humanization + QA)
