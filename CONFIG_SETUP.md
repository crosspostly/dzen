# ⚡ КОНФИГУРАЦИЯ ПО КАНАЛАМ

## НА ЧТО УПравляется

**Один канал = один конфиг = свои ключи + параметры**

```
config/channels.config.ts
├── DZEN_CONFIG (Women 35-60)
├── MEDIUM_CONFIG (Tech Founders)
├── SUBSTACK_CONFIG (Newsletter)
└── HABR_CONFIG (Tech Stories RU)
```

---

## 🔐 GITHUB SECRETS (одна запись за ВСЕ каналы)

**ДО** (неудобно):
```
GEMINI_API_KEY = ...
DEFAULT_ANGLE = confession
```

**СЕЙЧАС** (правильно):
```
GEMINI_API_KEY_DZEN = sk-...
GEMINI_API_KEY_MEDIUM = sk-...
GEMINI_API_KEY_SUBSTACK = sk-...
GEMINI_API_KEY_HABR = sk-...
```

---

## 💫 КОД: КАК ИСПОЛЬЗОВАТЬ

### Способ 1: По ID канала

```typescript
import { getChannelConfig } from './config/channels.config';

const config = getChannelConfig('dzen');
console.log(config.defaultTheme);      // "Я терпела это 20 лет"
console.log(config.defaultAudience);   // "Women 35-60"
```

### Способ 2: Все каналы сразу

```typescript
import { getAllChannels } from './config/channels.config';

const allChannels = getAllChannels();
allChannels.forEach(ch => {
  console.log(`${ch.name}: ${ch.scheduleUtc}`);
});
```

### Способ 3: По платформе

```typescript
import { getChannelsByPlatform } from './config/channels.config';

const zenChannels = getChannelsByPlatform('yandex-dzen');
// → DZEN_CONFIG
```

---

## 📄 СТРУКТУРА КОНФИГА

```typescript
interface ChannelConfig {
  // Идентификатор
  id: string;
  name: string;
  platform: 'yandex-dzen' | 'medium' | 'substack' | 'habr';
  
  // API Ключи (РАЗНЫЕ для каждого канала)
  geminiApiKey: string;
  platformApiKey?: string;  // Medium, Substack, Habr
  
  // Генерация
  defaultTheme: string;
  defaultAngle: 'confession' | 'scandal' | 'observer';
  defaultEmotion: 'triumph' | 'guilt' | 'shame' | 'liberation';
  defaultAudience: string;
  
  // Модели
  modelOutline: string;      // gemini-2.5-pro
  modelEpisodes: string;     // gemini-2.5-flash
  
  // Параметры
  episodeCount: number;      // 9-12
  minCharacters: number;     // 25K-32K
  maxCharacters: number;     // 35K-40K
  readingTimeMinutes: number;
  
  // Выход
  outputDir: string;         // ./generated/{channelId}/
  publishAutomatically: boolean;
  
  // Schedule (UTC)
  scheduleUtc: string[];
}
```

---

## 🔇 НОВЫЙ КАНАЛ? 

### 1. Добавь конфиг в `channels.config.ts`

```typescript
export const NEW_CHANNEL_CONFIG: ChannelConfig = {
  id: 'my-channel',
  name: 'My Channel',
  platform: 'some-platform',
  
  geminiApiKey: process.env.GEMINI_API_KEY_MY_CHANNEL || '',
  
  defaultTheme: 'Your theme',
  defaultAngle: 'confession',
  defaultEmotion: 'triumph',
  defaultAudience: 'Your audience',
  
  modelOutline: 'gemini-2.5-pro',
  modelEpisodes: 'gemini-2.5-flash',
  
  episodeCount: 10,
  minCharacters: 28000,
  maxCharacters: 38000,
  readingTimeMinutes: 8,
  
  outputDir: './generated/my-channel/',
  publishAutomatically: true,
  
  scheduleUtc: ['00:00', '06:00', '12:00', '18:00'],
};
```

### 2. Добавь в реестр

```typescript
export const CHANNELS_REGISTRY: Record<string, ChannelConfig> = {
  dzen: DZEN_CONFIG,
  medium: MEDIUM_CONFIG,
  substack: SUBSTACK_CONFIG,
  habr: HABR_CONFIG,
  'my-channel': NEW_CHANNEL_CONFIG,  // ← НОВОЕ
};
```

### 3. Добавь GitHub Secret

```
GEMINI_API_KEY_MY_CHANNEL = sk-...
```

**Done!** 🎉

---

## 🏰 ТЕКУЩИЕ КАНАЛЫ

| ID | Name | Platform | Audience | Schedule |
|----|----|----------|----------|----------|
| `dzen` | Яндекс.Дзен | yandex-dzen | Women 35-60 | Каждые 3 часа |
| `medium` | Medium | medium | Tech Founders 25-45 | 3× в день |
| `substack` | Substack | substack | Premium 30-50 | 4× в день |
| `habr` | Habr | habr | Tech RU 25-45 | 3× в день |

---

## 🔐 GITHUB SECRETS TEMPLATE

```bash
# Дзен
GEMINI_API_KEY_DZEN=sk-ant-...

# Medium
GEMINI_API_KEY_MEDIUM=sk-ant-...
MEDIUM_API_KEY=...

# Substack
GEMINI_API_KEY_SUBSTACK=sk-ant-...
SUBSTACK_API_KEY=...

# Habr
GEMINI_API_KEY_HABR=sk-ant-...
HABR_API_KEY=...

# Shared
GEMINI_MODEL_OUTLINE=gemini-2.5-pro
GEMINI_MODEL_EPISODES=gemini-2.5-flash
```

---

## 🚀 CLI ИСПОЛЬЗОВАНИЕ

### Генерировать для Дзена
```bash
npx ts-node cli.ts generate:v2 --channel=dzen
```

### Обработать через Phase 2
```bash
npx ts-node cli.ts phase2 --channel=dzen --content=article.txt
```

### Все каналы сразу
```bash
npx ts-node cli.ts generate:all
```

---

**Status**: ✅ READY
**Next**: Update CLI to use channel config
