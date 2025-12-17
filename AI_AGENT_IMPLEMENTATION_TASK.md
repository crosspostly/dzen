# AI Agent Implementation Task - ZenMaster v2.0 Theme Priority System

## Task Description
Реализовать систему приоритизации тем для CLI команды `generate:v2` согласно спецификации в `CLI_GENERATE_V2_SPEC.md`.

## Code to Implement

### 1. Enhanced Theme Selection Logic

Добавить в `cli.ts` новую функцию для приоритизации тем:

```typescript
/**
 * Get theme with priority hierarchy:
 * 1. --theme CLI argument (highest priority)
 * 2. Random from config.required_triggers (mid priority)  
 * 3. Hardcoded default (lowest priority)
 */
function getThemeWithPriority(projectId: string, cliTheme?: string): string {
  // Priority 1: CLI theme (highest priority)
  if (cliTheme && cliTheme.trim()) {
    console.log(`${LOG.BRAIN} Using CLI theme (highest priority): "${cliTheme}"`);
    return cliTheme.trim();
  }
  
  // Priority 2: Random from config required_triggers
  try {
    const config = configService.loadConfig(projectId);
    const triggers = config.content_rules?.required_triggers;
    
    if (triggers && triggers.length > 0) {
      const randomIndex = Math.floor(Math.random() * triggers.length);
      const selectedTheme = triggers[randomIndex];
      console.log(`${LOG.BRAIN} Using random theme from config (mid priority): "${selectedTheme}"`);
      return selectedTheme;
    }
  } catch (error) {
    console.log(`${LOG.WARN} Could not load config for project ${projectId}, using default`);
  }
  
  // Priority 3: Hardcoded default (lowest priority)
  const defaultTheme = 'Я терпела это 20 лет';
  console.log(`${LOG.BRAIN} Using hardcoded default theme (lowest priority): "${defaultTheme}"`);
  return defaultTheme;
}
```

### 2. Enhanced Generate V2 Command

Обновить секцию `generate:v2` в `cli.ts` для поддержки новой логики:

```typescript
} else if (command === 'generate:v2') {
  // ============================================================================
  // ZenMaster v2.0 - Multi-Agent Longform Generation (35K+ symbols)
  // SUPPORTS: Project Config (with theme priority) OR Dzen Channel Configuration
  // ============================================================================
  
  const projectId = getArg('project', 'channel-1');
  const dzenChannel = getArg('dzen-channel');
  const theme = getArg('theme');
  const verbose = getFlag('verbose');

  console.log(`\n${LOG.ROCKET} ============================================`);
  console.log(`${LOG.ROCKET} ZenMaster v2.0 - Multi-Agent Generation`);
  console.log(`${LOG.ROCKET} ============================================\n`);

  const startTime = Date.now();

  let generationParams = {
    theme: '',
    angle: 'confession',
    emotion: 'triumph',
    audience: 'Women 35-60',
    modelOutline: 'gemini-2.5-pro',
    modelEpisodes: 'gemini-2.5-flash',
    outputDir: './generated/articles/'
  };

  if (dzenChannel) {
    // Using Dzen Channel Configuration (existing logic)
    console.log(`${LOG.BRAIN} Loading Dzen channel configuration: ${dzenChannel}`);
    const channelConfig = getDzenChannelConfig(dzenChannel);
    
    generationParams.theme = theme || getRandomThemeForChannel(dzenChannel);
    generationParams.angle = channelConfig.defaultAngle;
    generationParams.emotion = channelConfig.defaultEmotion;
    generationParams.audience = channelConfig.defaultAudience;
    generationParams.modelOutline = channelConfig.modelOutline;
    generationParams.modelEpisodes = channelConfig.modelEpisodes;
    generationParams.outputDir = channelConfig.outputDir;

    console.log(`${LOG.SUCCESS} ✅ Using DZEN_${dzenChannel.toUpperCase()}_CONFIG:`);
    console.log(`   📝 Theme: "${generationParams.theme}"`);
    console.log(`   🎯 Angle: ${generationParams.angle}`);
    console.log(`   💫 Emotion: ${generationParams.emotion}`);
    console.log(`   👥 Audience: ${generationParams.audience}`);
    console.log(`   🤖 Models: ${generationParams.modelOutline} (outline), ${generationParams.modelEpisodes} (episodes)`);
    console.log(`   📁 Output: ${generationParams.outputDir}\n`);

  } else {
    // NEW: Using Project Configuration with Theme Priority System
    console.log(`${LOG.BRAIN} Loading project configuration: ${projectId}`);
    
    // NEW: Theme selection with priority hierarchy
    generationParams.theme = getThemeWithPriority(projectId, theme);
    generationParams.angle = getArg('angle', 'confession');
    generationParams.emotion = getArg('emotion', 'triumph');
    generationParams.audience = getArg('audience', 'Women 35-60');
    generationParams.modelOutline = getArg('model-outline', 'gemini-2.5-pro');
    generationParams.modelEpisodes = getArg('model-episodes', 'gemini-2.5-flash');
    generationParams.outputDir = './generated/zenmaster-v2/';

    console.log(`${LOG.SUCCESS} ✅ Using PROJECT_${projectId.toUpperCase()}_CONFIG:`);
    console.log(`   📝 Theme: "${generationParams.theme}"`);
    console.log(`   🎯 Angle: ${generationParams.angle}`);
    console.log(`   💫 Emotion: ${generationParams.emotion}`);
    console.log(`   👥 Audience: ${generationParams.audience}`);
    console.log(`   🤖 Models: ${generationParams.modelOutline} (outline), ${generationParams.modelEpisodes} (episodes)`);
    console.log(`   📁 Output: ${generationParams.outputDir}\n`);
  }

  // Initialize Multi-Agent Service
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не установлен. Используйте: export GEMINI_API_KEY=sk-...');
  }
  
  const multiAgentService = new MultiAgentService(apiKey);

  // Generate 35K+ longform article
  const article = await multiAgentService.generateLongFormArticle({
    theme: generationParams.theme,
    angle: generationParams.angle,
    emotion: generationParams.emotion,
    audience: generationParams.audience,
  });

  const totalTime = Date.now() - startTime;

  // Save result to project-specific directory
  console.log(`\n${LOG.SAVE} Saving result...`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), generationParams.outputDir.replace('./', ''));
  fs.mkdirSync(outDir, { recursive: true });

  const outputPath = path.join(outDir, `article_${timestamp}.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      id: article.id,
      title: article.title,
      lede: article.lede,
      channel: dzenChannel || projectId,
      episodes: article.episodes.map(ep => ({
        id: ep.id,
        title: ep.title,
        content: ep.content,
        charCount: ep.charCount,
        openLoop: ep.openLoop,
      })),
      finale: article.finale,
      voicePassport: article.voicePassport,
      metadata: article.metadata,
      outline: {
        theme: article.outline.theme,
        angle: article.outline.angle,
        emotion: article.outline.emotion,
        audience: article.outline.audience,
      },
      generation: {
        modelOutline: generationParams.modelOutline,
        modelEpisodes: generationParams.modelEpisodes,
        channelConfig: dzenChannel || projectId,
        themePriority: {
          cliTheme: theme || null,
          configTriggers: !theme,
          hardcodedDefault: !theme,
        },
        generatedAt: new Date().toISOString(),
      },
    }, null, 2)
  );

  // Enhanced final results output
  console.log(`\n${LOG.SUCCESS} ============================================`);
  console.log(`${LOG.SUCCESS} ARTICLE COMPLETE!`);
  console.log(`${LOG.SUCCESS} ============================================`);
  console.log(``);
  console.log(`${LOG.SUCCESS} Details:`);
  console.log(`   📄 Title: ${article.title}`);
  console.log(`   📊 Characters: ${article.metadata.totalChars}`);
  console.log(`   ⏱️  Reading time: ${article.metadata.totalReadingTime} min`);
  console.log(`   📄 Episodes: ${article.metadata.episodeCount}`);
  console.log(`   🎬 Scenes: ${article.metadata.sceneCount}`);
  console.log(`   💬 Dialogues: ${article.metadata.dialogueCount}`);
  console.log(``);
  console.log(`${LOG.TIMER} Time:`);
  console.log(`   - Total: ${formatTime(totalTime)}`);
  console.log(``);
  console.log(`${LOG.SAVE} File saved: ${outputPath}`);
  console.log(``);
```

### 3. Integration Instructions

1. **Добавить функцию `getThemeWithPriority`** в начало файла `cli.ts` после существующих вспомогательных функций.

2. **Заменить секцию `generate:v2`** на новую версию с поддержкой приоритизации тем.

3. **Обновить package.json скрипт** если нужно:
```json
{
  "scripts": {
    "generate:v2": "tsx cli.ts generate:v2"
  }
}
```

### 4. Test Commands

После реализации протестировать:

```bash
# Test 1: CLI theme override (highest priority)
npm run generate:v2 -- --theme="Custom CLI Theme"

# Test 2: Random from config (mid priority)  
npm run generate:v2 -- --project=channel-1

# Test 3: Hardcoded default (lowest priority)
npm run generate:v2 -- 

# Test 4: Dzen channel (existing functionality)
npm run generate:v2 -- --dzen-channel=women-35-60

# Test 5: Hybrid (project + CLI theme override)
npm run generate:v2 -- --project=channel-1 --theme="Override Theme"
```

### 5. Expected Output Examples

**Test 1 Output:**
```
🧠 Using CLI theme (highest priority): "Custom CLI Theme"
```

**Test 2 Output:**
```
🧠 Using random theme from config (mid priority): "квартира"
```

**Test 3 Output:**
```
🧠 Using hardcoded default theme (lowest priority): "Я терпела это 20 лет"
```

### 6. Files to Modify

- ✅ `/home/engine/project/cli.ts` - Main implementation
- ✅ `/home/engine/project/CLI_GENERATE_V2_SPEC.md` - Already created
- ✅ `/home/engine/project/AI_AGENT_IMPLEMENTATION_TASK.md` - This file

### 7. Verification Checklist

- [ ] Функция `getThemeWithPriority` добавлена
- [ ] Секция `generate:v2` обновлена с новой логикой
- [ ] Поддержка всех трех приоритетов работает
- [ ] Конфигурация `projects/channel-1/config.json` загружается корректно
- [ ] Рандомизация из `required_triggers` работает
- [ ] Fallback к hardcoded теме функционирует
- [ ] Выходной JSON содержит `themePriority` метаданные
- [ ] Совместимость с существующим Dzen каналами сохранена

## Implementation Priority

1. **HIGH:** Theme priority logic (`getThemeWithPriority`)
2. **HIGH:** Enhanced `generate:v2` command
3. **MEDIUM:** Output metadata enhancements  
4. **LOW:** Testing and documentation