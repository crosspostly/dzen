# CLI Generate V2 Specification

## Overview

ZenMaster v2.0 - Multi-Agent Longform Generation CLI с поддержкой приоритизации тем и конфигурационных систем.

## Command Structure

### Основная команда
```bash
npm run generate:v2 -- [OPTIONS]
```

### Поддерживаемые параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|-------------|----------|
| `--project` | string | Нет | ID проекта из config (по умолчанию: `channel-1`) |
| `--theme` | string | Нет | Кастомная тема (переопределяет все остальные) |
| `--dzen-channel` | string | Нет | ID Dzen канала из dzen-channels.config.ts |
| `--verbose` | flag | Нет | Подробный вывод |

## Приоритизация тем (Theme Priority Order)

```typescript
// Priority hierarchy (from highest to lowest):

1. --theme="Custom theme" (CLI argument) ← HIGHEST PRIORITY
   // Любая кастомная тема из CLI полностью переопределяет конфиги

2. Random из config.required_triggers ← MID PRIORITY  
   // Рандомно выбирается из массива required_triggers в config проекта
   
3. Hardcoded default ← LOWEST PRIORITY
   // Fallback: "Я терпела это 20 лет"
```

### Рандомизация тем

```typescript
function getRandomThemeFromConfig(projectId: string): string {
  const config = configService.loadConfig(projectId);
  const triggers = config.content_rules.required_triggers;
  // Example: ["квартира", "деньги", "семья", "наследство"]
  
  const randomIndex = Math.floor(Math.random() * triggers.length);
  return triggers[randomIndex];
  // Каждый запуск = разная тема! ✅
}
```

## Команды и примеры

### 1. Random theme from config
```bash
# Использует config проекта для рандомизации
npm run generate:v2 -- --project=channel-1
```

### 2. Explicit theme (override config) 
```bash
# CLI аргумент имеет высший приоритет
npm run generate:v2 -- --theme="Моя кастомная тема"
```

### 3. Hybrid (config + CLI override)
```bash
# Если указан --theme, он переопределяет config
npm run generate:v2 -- --project=channel-1 --theme="Override theme"
```

### 4. Dzen Channel (альтернативная система)
```bash
# Использует dzen-channels.config.ts
npm run generate:v2 -- --dzen-channel=women-35-60
```

## Output Format

### Success Output
```
✅ ARTICLE COMPLETE!
📊 Characters: 38,542
⏱️  Reading time: 8 min
📄 Episodes: 12
🎬 Scenes: 9
💬 Dialogues: 7
💾 File saved: ./generated/zenmaster-v2/article_1734458123456.json
```

### Detailed Output
```
🚀 ============================================
🚀 ZenMaster v2.0 - Multi-Agent Generation
🚀 ============================================

🧠 Loading project configuration: channel-1
📝 Theme: "квартира" (random from required_triggers)
🎯 Angle: confession
💫 Emotion: triumph  
👥 Audience: Women 35-60
🤖 Models: gemini-2.5-flash (outline), gemini-2.5-flash (episodes)
📁 Output: ./generated/zenmaster-v2/

🔷 ============================================
🔷 ARTICLE COMPLETE (ZenMaster v2.0)
🔷 ============================================

📄 Title: Как я потеряла квартиру из-за семейных интриг
📊 Size: 38,542 symbols
📖 Reading time: 8 min
📝 Episodes: 12
🎬 Scenes: 9
💬 Dialogues: 7

⏱️ Time:
   - Total: 45.23s

💾 File: ./generated/zenmaster-v2/article_1734458123456.json
```

## Configuration Systems

### 1. Legacy Config System
**Location:** `projects/{projectId}/config.json`
**Structure:**
```json
{
  "content_rules": {
    "required_triggers": [
      "квартира",
      "деньги", 
      "семья",
      "наследство"
    ]
  }
}
```

### 2. Dzen Channels System  
**Location:** `config/dzen-channels.config.ts`
**Structure:**
```typescript
export const DZEN_WOMEN_35_60_CONFIG = {
  id: 'women-35-60',
  channelThemes: [
    'Я терпела это 20 лет',
    'Я много лет не знала правду об отце',
    '...'
  ]
}
```

## Error Handling

### Theme Selection Errors
- Если `required_triggers` пуст → fallback к hardcoded theme
- Если `--theme` пустая строка → fallback к конфигу
- Если проект не найден → список доступных проектов

### API Errors
- Отсутствует `GEMINI_API_KEY` → четкая инструкция по настройке
- Network timeout → retry logic
- Invalid theme → validation с понятными сообщениями

## Migration Notes

### От старой системы (`generate`)
- Сохранена совместимость с `configService.loadConfig()`
- Добавлена поддержка приоритизации тем
- Улучшенная обработка ошибок

### К новой Multi-Agent архитектуре
- Использует `MultiAgentService` вместо `geminiService`
- Поддержка разных моделей для outline и episodes
- Структурированный JSON output с метаданными

## Testing Scenarios

### 1. Theme Priority Test
```bash
# Должна использовать "Custom Theme"
npm run generate:v2 -- --theme="Custom Theme"

# Должна рандомно выбрать из required_triggers  
npm run generate:v2 -- --project=channel-1

# Должна использовать hardcoded theme
npm run generate:v2 --
```

### 2. Config Validation Test
```bash
# Проверить доступные проекты
npm run generate:v2 -- --project=invalid-project

# Проверить доступные Dzen каналы  
npm run generate:v2 -- --dzen-channel=invalid-channel
```

### 3. Hybrid Scenarios Test
```bash
# CLI theme override
npm run generate:v2 -- --project=channel-1 --theme="Override"
# Expected: "Override" тема, не из конфига
```

## Performance Considerations

- **Конфиг лоадинг:** Кэширование между вызовами
- **Рандомизация:** Быстрый Math.random() без heavy computations  
- **API calls:** Оптимизация промптов для скорости
- **File I/O:** Асинхронное сохранение результатов

## Future Enhancements

- **Theme categories:** Группировка тем по категориям
- **A/B testing:** Разные темы для разных аудиторий
- **Seasonal themes:** Временные темы (праздники, события)
- **Analytics integration:** Отслеживание эффективности тем