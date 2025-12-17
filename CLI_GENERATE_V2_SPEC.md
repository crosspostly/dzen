# CLI `generate:v2` Specification
## How to properly integrate ZenMaster v2.0 with theme randomization

---

## Current State (V1 - DEPRECATED)

```ts
// Legacy - uses projects/channel-1/ config
const selectedTheme = theme || config.content_rules.required_triggers[0];
// Berries FIRST trigger only, not random!
```

**Problems:**
- Always uses first trigger
- Not random selection
- Tied to V1 `projects/*` structure

---

## New State (V2 - REQUIRED)

### Command Interface

```bash
# Option 1: With --project (loads config + picks random theme)
npx ts-node cli.ts generate:v2 --project=channel-1 --verbose

# Option 2: With explicit parameters (ignore config themes)
npx ts-node cli.ts generate:v2 \
  --theme="Я терпела это 20 лет" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60"

# Option 3: Hybrid (config + override theme)
npx ts-node cli.ts generate:v2 --project=channel-1 --theme="Custom theme" --verbose
```

---

## Implementation Logic

### Step 1: Load Config (if --project provided)

```typescript
const projectId = getArg('project');
let config = null;

if (projectId) {
  config = configService.loadConfig(projectId);
  console.log(`${LOG.SUCCESS} Config loaded for: ${projectId}`);
}
```

### Step 2: Determine Theme Source

```typescript
let theme: string;
const themeArg = getArg('theme');

if (themeArg) {
  // Priority 1: Explicit --theme CLI argument
  theme = themeArg;
  console.log(`${LOG.INFO} Theme from CLI: "${theme}"`);
  
} else if (config?.content_rules?.required_triggers?.length > 0) {
  // Priority 2: Random from config triggers
  const triggers = config.content_rules.required_triggers;
  const randomIndex = Math.floor(Math.random() * triggers.length);
  theme = triggers[randomIndex];
  console.log(`${LOG.INFO} Theme from config (random): "${theme}" [${randomIndex + 1}/${triggers.length}]`);
  
} else {
  // Priority 3: Hardcoded default
  theme = 'Я терпела это 20 лет';
  console.log(`${LOG.WARN} Using default theme (no config or CLI arg)`);
}
```

### Step 3: Build Generation Parameters

```typescript
const generationParams = {
  theme,
  angle: getArg('angle') || config?.content_rules?.tone || 'confession',
  emotion: getArg('emotion') || 'triumph',
  audience: getArg('audience') || config?.audience?.age_range || 'Women 35-60',
  modelOutline: getArg('model-outline') || config?.gemini_model || 'gemini-2.5-pro',
  modelEpisodes: getArg('model-episodes') || 'gemini-2.5-flash',
  temperature: config?.temperature || 0.9,
  outputDir: './generated/zenmaster-v2/',
};
```

### Step 4: Instantiate MultiAgentService

```typescript
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(`${LOG.ERROR} GEMINI_API_KEY not set`);
  process.exit(1);
}

const { MultiAgentService } = await import('./services/multiAgentService');
const service = new MultiAgentService(apiKey);
```

### Step 5: Generate Article

```typescript
const startTime = Date.now();

const article = await service.generateLongFormArticle({
  theme: generationParams.theme,
  angle: generationParams.angle,
  emotion: generationParams.emotion,
  audience: generationParams.audience,
});

const genTime = Date.now() - startTime;
```

### Step 6: Save Result

```typescript
fs.mkdirSync(generationParams.outputDir, { recursive: true });

const outputPath = path.join(
  generationParams.outputDir, 
  `article_${Date.now()}.json`
);

fs.writeFileSync(outputPath, JSON.stringify(article, null, 2));

console.log(`${LOG.SUCCESS} ARTICLE SAVED: ${outputPath}`);
console.log(`${LOG.CHART} Metrics:`);
console.log(`   - Characters: ${article.metadata.totalChars}`);
console.log(`   - Reading time: ${article.metadata.totalReadingTime} min`);
console.log(`   - Episodes: ${article.metadata.episodeCount}`);
console.log(`   - Scenes: ${article.metadata.sceneCount}`);
console.log(`   - Generation time: ${formatTime(genTime)}`);
```

---

## Theme Randomization Algorithm

### Why It Matters

- **Without randomization**: Always picks first trigger → same theme every day
- **With randomization**: Picks random trigger → variety in content

### Implementation

```typescript
function getRandomTheme(triggers: string[]): string {
  if (!triggers || triggers.length === 0) {
    return 'Я терпела это 20 лет';
  }
  const randomIndex = Math.floor(Math.random() * triggers.length);
  return triggers[randomIndex];
}
```

**Example:**

```ts
const triggers = [
  "квартира",
  "деньги",
  "семья",
  "наследство"
];

// Run 1: Random pick → "семья"
// Run 2: Random pick → "квартира"
// Run 3: Random pick → "наследство"
// etc.
```

---

## Expected CLI Output

```
✅ [ZenMaster v2.0] Starting generation...
📋 Config loaded for: channel-1
💡 Theme from config (random): "семья" [3/4]
🌠 Angle: confession | Emotion: triumph | Audience: Women 35-60

📋 Stage 0: Building outline (12 episodes)...
🔄 Stage 1: Generating 12 episodes in parallel...
   Batch 1/4 (episodes 1-3)...
   Batch 2/4 (episodes 4-6)...
   Batch 3/4 (episodes 7-9)...
   Batch 4/4 (episodes 10-12)...
🎯 Generating lede (600-900) and finale (1200-1800)...
🎤 Generating voice passport (7 author habits)...
📰 Generating title (55-90 chars)...

✅ ARTICLE COMPLETE
📊 Metrics:
   - Characters: 38,542
   - Reading time: 8 min
   - Scenes: 9
   - Dialogues: 7
   - Generation time: 8.35s

💾 ARTICLE SAVED: ./generated/zenmaster-v2/article_1734458123456.json
```

---

## GitHub Actions Integration

### Workflow Step

```yaml
- name: Generate longform article (ZenMaster v2.0)
  run: |
    npx ts-node cli.ts generate:v2 \
      --project=channel-1 \
      --verbose
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

### Artifact Upload

```yaml
- name: Upload article
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: zenmaster-v2-${{ github.run_id }}
    path: generated/zenmaster-v2/
    retention-days: 90
```

---

## Config Structure Reference

```json
{
  "content_rules": {
    "required_triggers": [
      "квартира",
      "деньги",
      "семья",
      "наследство"
    ]
  },
  "audience": {
    "age_range": "50-65"
  },
  "gemini_model": "gemini-2.5-pro",
  "temperature": 0.95
}
```

---

## Error Handling

### Missing GEMINI_API_KEY

```
❌ GEMINI_API_KEY is not set
Please export GEMINI_API_KEY=sk-...
Exit code: 1
```

### Invalid Project

```
❌ Config not found: projects/invalid-project/config.json
Run: npm run cli list-projects
Exit code: 1
```

### Empty Triggers

```
⚠️ No triggers in config, using default theme
Theme: "Я терпела это 20 лет"
```

---

## Testing Locally

```bash
# Test 1: With project config (random theme)
export GEMINI_API_KEY=sk-...
npx ts-node cli.ts generate:v2 --project=channel-1 --verbose

# Test 2: With explicit theme
npx ts-node cli.ts generate:v2 --theme="Custom theme" --verbose

# Test 3: List available projects
npx ts-node cli.ts list-projects

# Test 4: Validate config
npx ts-node cli.ts validate --project=channel-1
```

---

## Key Takeaways

✅ **Theme priority order:**
1. Explicit `--theme` CLI argument (highest)
2. Random pick from `config.required_triggers`
3. Hardcoded default (lowest)

✅ **Config loading:**
- Only if `--project` provided
- Maps config fields to generation params
- Allows CLI override at any level

✅ **Output:**
- Saves to `./generated/zenmaster-v2/`
- JSON format with full article data
- Includes metadata & metrics

✅ **Random theme selection:**
- Uses `Math.random()` to pick from triggers array
- Ensures variety across multiple runs
- Logs which trigger was selected
