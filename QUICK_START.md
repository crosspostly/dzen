# ZenMaster v2.0 - Quick Start Guide

## Installation

```bash
npm install
```

## Setup

### 1. Set API Key
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

Or create a `.env` file:
```
GEMINI_API_KEY=your-gemini-api-key-here
```

## Usage

### Generate 35K+ Longform Article

```bash
# Basic usage (uses defaults)
npx tsx cli.ts generate:v2 --theme="Я терпела это 20 лет"

# Full parameters
npx tsx cli.ts generate:v2 \
  --theme="Я терпела это 20 лет" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60"
```

### Using npm script

```bash
npm run generate:v2 -- --theme="Your theme here"
```

## Parameters

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| `--theme` | Any text | Required | Main story theme |
| `--angle` | confession, scandal, observer | confession | Narrative perspective |
| `--emotion` | triumph, guilt, shame, liberation, anger | triumph | Dominant emotion |
| `--audience` | Any text | Women 35-60 | Target audience |

## Output

Articles are saved to:
```
generated/articles/article_YYYY-MM-DDTHH-MM-SS.json
```

## Expected Results

- **Characters**: 32,000 - 40,000
- **Reading time**: 6-10 minutes
- **Episodes**: 9-12
- **Generation time**: 8-10 minutes

## GitHub Actions

The workflow runs automatically every 3 hours on the `feature/zenmaster-v2.0` branch.

To run manually:
1. Go to **Actions** tab
2. Select **ZenMaster v2.0 - Generate Every 3 Hours**
3. Click **Run workflow**

## Troubleshooting

### "GEMINI_API_KEY not found"
Make sure you've exported the environment variable:
```bash
export GEMINI_API_KEY="your-key"
```

### "Cannot find module"
Run `npm install` first.

### TypeScript errors
These are expected in App.tsx and playwrightService.ts - they don't affect v2.0 generation.

## Examples

### Confession story about life change
```bash
npx tsx cli.ts generate:v2 \
  --theme="Я услышала одну фразу и всё изменилось" \
  --angle="confession" \
  --emotion="triumph"
```

### Scandal story with guilt
```bash
npx tsx cli.ts generate:v2 \
  --theme="Соседка рассказала мне тайну" \
  --angle="scandal" \
  --emotion="guilt"
```

### Observer story with liberation
```bash
npx tsx cli.ts generate:v2 \
  --theme="Я видела, как она ушла" \
  --angle="observer" \
  --emotion="liberation"
```

## Commands Overview

```bash
# Show help
npx tsx cli.ts

# Generate v1 article (10-15K)
npx tsx cli.ts generate --project=channel-1

# Generate v2 longform (35K+)
npx tsx cli.ts generate:v2 --theme="Your theme"

# Validate config
npx tsx cli.ts validate

# List projects
npx tsx cli.ts list-projects

# Run tests
npx tsx cli.ts test
```

## Next Steps

After Phase 1 is tested and stable:
- **Phase 2**: Montage (scene optimization)
- **Phase 3**: Humanization (6-level voice editing)
- **Phase 4**: Quality Control (AI detection < 30%)

---

For full documentation, see:
- `ZENMASTER_V2_INTEGRATION.md` - Integration details
- `ZENMASTER_V2_README.md` - Architecture overview
