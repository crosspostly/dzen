# ⚡ КОНФИГУРАЦИЯ ПО КАНАЛАМ

## ЧТО УПравляется

**Один канал = один конфиг = сВОЙ КЛЮЧ К ГЕМИНИ**

```
config/channels.config.ts
├── DZEN_CONFIG → GEMINI_API_KEY_DZEN
├── MEDIUM_CONFIG → GEMINI_API_KEY_MEDIUM
├── SUBSTACK_CONFIG → GEMINI_API_KEY_SUBSTACK
└── HABR_CONFIG → GEMINI_API_KEY_HABR
```

🙋 НО ТАК! Каждый канал вытягивает сВОЙ ключ из среды!

---

## 🔐 GITHUB SECRETS (РАЗНЫЕ для каждого)

**ПО ОДНОМУ КЛЮЧУ ДЛЯ КАЖДОГО КАНАЛА:**

`Settings → Secrets and variables → Repository secrets`

```
GEMINI_API_KEY_DZEN = sk-...
GEMINI_API_KEY_MEDIUM = sk-...
GEMINI_API_KEY_SUBSTACK = sk-...
GEMINI_API_KEY_HABR = sk-...
```

⚠️ **Это РАЗНЫЕ ключи!** Каждый для своего проекта в Gemini API.

---

## 💫 КОД: КАК РАБОТАЕТ

### В Коде (снуты):

```typescript
// Dzen вытягивает ключ ВАШНО (читает с диска)
geminiApiKey: process.env.GEMINI_API_KEY_DZEN || ''

// Medium вытягивает ключ сВОЙ (medium-only key)
geminiApiKey: process.env.GEMINI_API_KEY_MEDIUM || ''

// Каждый агент работает с сВОИМ ключом
```

### Команд использования:

```typescript
import { getChannelConfig } from './config/channels.config';

// Канал Dzen автоматически гружит GEMINI_API_KEY_DZEN
const dzenConfig = getChannelConfig('dzen');
console.log(dzenConfig.geminiApiKey); // sk-xyz (from GEMINI_API_KEY_DZEN)

// Канал Medium автоматически гружит GEMINI_API_KEY_MEDIUM
const mediumConfig = getChannelConfig('medium');
console.log(mediumConfig.geminiApiKey); // sk-abc (from GEMINI_API_KEY_MEDIUM)
```

---

## 🏰 КАНАЛЫ (текущие)

| ID | Name | Audience | Ключ из | Schedule |
|----|----|----------|---------|----------|
| `dzen` | Яндекс.Дзен | Women 35-60 | `GEMINI_API_KEY_DZEN` | Каждые 3ч |
| `medium` | Medium | Tech Founders | `GEMINI_API_KEY_MEDIUM` | 3× в день |
| `substack` | Substack | Premium | `GEMINI_API_KEY_SUBSTACK` | 4× в день |
| `habr` | Habr | Tech RU | `GEMINI_API_KEY_HABR` | 3× в день |

---

## 🔇 ДОБАВИТЬ НОВЫЙ КАНАЛ?

### 1. Установи отдельные проекты в Gemini API Console

- Project 1: для Dzen
- Project 2: для Medium
- Project 3: для Substack
- Project 4: для Habr
- Project 5: для твоего нового канала

### 2. Найди API keys

```bash
# Project 1 канала
gcloud auth application-default print-access-token --project=dzen-project

# Project 2 канала
gcloud auth application-default print-access-token --project=medium-project
```

### 3. Добавь в файл

```typescript
// config/channels.config.ts

export const MY_CHANNEL_CONFIG: ChannelConfig = {
  id: 'my-channel',
  name: 'My Channel',
  platform: 'my-platform',
  
  // 🔐 ОТДЕЛЬНЫЙ ключ для этого канала!
  geminiApiKey: process.env.GEMINI_API_KEY_MY_CHANNEL || '',
  
  defaultTheme: 'Your theme',
  defaultAudience: 'Your audience',
  // ... остальное
};

export const CHANNELS_REGISTRY: Record<string, ChannelConfig> = {
  dzen: DZEN_CONFIG,
  medium: MEDIUM_CONFIG,
  substack: SUBSTACK_CONFIG,
  habr: HABR_CONFIG,
  'my-channel': MY_CHANNEL_CONFIG,  // ← НОВЫЙ
};
```

### 4. Добавь Secret

`Settings → Secrets and variables → Add`

```
GEMINI_API_KEY_MY_CHANNEL = sk-...
```

**Done!** 🎉 Новый канал работает с сВОИМ ключом!

---

## ✅ ПО РОСТРОЯННОЙ КОНФИГ

```
GitHub Secrets:
GEMINI_API_KEY_DZEN = sk-...
GEMINI_API_KEY_MEDIUM = sk-...
GEMINI_API_KEY_SUBSTACK = sk-...
GEMINI_API_KEY_HABR = sk-...

        ⬇️
        
 config/channels.config.ts:
DZEN_CONFIG → process.env.GEMINI_API_KEY_DZEN
MEDIUM_CONFIG → process.env.GEMINI_API_KEY_MEDIUM

        ⬇️
        
Каждый канал работает с СОБСТВЕННЫМ ключом!
Каждые stats отделены.
Каждые quota отделены.
```

---

**Status**: ✅ READY
**Each channel**: Has its own Gemini API project
