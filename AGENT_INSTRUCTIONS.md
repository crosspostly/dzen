# AI Agent Instructions for ZenMaster v2.0

## Overview

This document defines how AI agents (Copilot, Claude, etc.) should interact with ZenMaster v2.0 for article generation.

---

## Task: Generate Longform Article

### CLI Command

```bash
npx tsx cli.ts generate:v2 \
  --project=<CHANNEL_ID> \
  --theme="<ARTICLE_SUBJECT>" \
  --angle="<confession|scandal|observer>" \
  --emotion="<triumph|guilt|shame|liberation|anger>"
```

### Environment

```bash
export GEMINI_API_KEY="your-api-key"
```

### Parameters

| Parameter | Type | Required | Source | Example |
|-----------|------|----------|--------|----------|
| `--project` | string | YES | Config folder name | `channel-1` |
| `--theme` | string | YES | Task input | `"Я 30 лет молчала о семейной тайне"` |
| `--angle` | enum | NO | Config or task | `confession`, `scandal`, `observer` |
| `--emotion` | enum | NO | Config or task | `triumph`, `guilt`, `shame`, `liberation`, `anger` |

### Project Lookup

**Config Location**: `projects/<project-id>/config.json`

**Config contains:**
```json
{
  "channel_name": "Channel Name",
  "audience": {
    "age_range": "50-65",
    "primary_emotions": ["justice", "family"],
    "values": ["family values", "justice"]
  },
  "content_rules": {
    "min_chars": 10000,
    "max_chars": 15000,
    "required_triggers": ["keyword1", "keyword2"],
    "tone": "confession"
  },
  "gemini_model": "gemini-2.5-flash"
}
```

---

## Execution

### Step 1: Load Project Config

```bash
# Verify project exists
test -f "projects/$PROJECT/config.json" || echo "ERROR: Project not found"

# Read config (optional, for logging)
cat "projects/$PROJECT/config.json"
```

### Step 2: Prepare Parameters

**If task specifies all parameters:**
```bash
THEME="Я много лет ждала этого"  # from task
ANGLE="confession"                 # from task or config
EMOTION="triumph"                  # from task or config
```

**If task is incomplete, read config:**
```bash
# Extract from config.json if not provided
ANGLE=$(jq -r '.content_rules.tone' projects/$PROJECT/config.json)
EMOTION="triumph"  # default
```

### Step 3: Generate

```bash
npx tsx cli.ts generate:v2 \
  --project="$PROJECT" \
  --theme="$THEME" \
  --angle="$ANGLE" \
  --emotion="$EMOTION"
```

### Step 4: Verify Output

```bash
# Check if article was created
ls -lah generated/articles/ | tail -1

# Validate JSON structure
jq '.metadata.totalChars' generated/articles/article_*.json
```

---

## Expected Output

### Success ✅

```json
{
  "id": "article-uuid-123",
  "title": "Generated Article Title",
  "lede": "Opening paragraph of article...",
  "episodes": [
    {
      "id": "ep-1",
      "title": "Episode 1 Title",
      "content": "Episode text content...",
      "charCount": 3500,
      "openLoop": "Hook for next episode"
    }
    // ... 10+ episodes total
  ],
  "finale": "Conclusion paragraph...",
  "metadata": {
    "totalChars": 35000,
    "totalReadingTime": 45,
    "episodeCount": 10,
    "sceneCount": 25,
    "dialogueCount": 8
  }
}
```

**File**: `generated/articles/article_2025-12-17_15-30-45.json`

### Error ❌

**Exit code**: `1`  
**Error message** (stderr):
```
ERROR: GEMINI_API_KEY not found
ERROR: Project config not found: projects/unknown-channel/config.json
ERROR: TypeScript compilation failed
```

---

## Task Template (JSON)

Use this format to assign tasks to the agent:

```json
{
  "task_id": "article-gen-001",
  "task_type": "generate_article",
  "status": "pending",
  
  "input": {
    "project": "channel-1",
    "theme": "Я 30 лет молчала об отце",
    "angle": "confession",
    "emotion": "liberation",
    "audience": "Women 50-65"
  },
  
  "requirements": {
    "min_length": 35000,
    "max_length": 50000,
    "required_elements": [
      "family conflict",
      "emotional resolution",
      "life lesson"
    ],
    "must_include_keywords": ["семья", "тайна", "правда"],
    "must_avoid": ["политика", "ChatGPT", "как известно"]
  },
  
  "output": {
    "format": "json",
    "path": "generated/articles/",
    "commit": false,
    "artifact": true
  },
  
  "timeline": {
    "timeout_seconds": 120,
    "retry_count": 1
  },
  
  "metadata": {
    "priority": "normal",
    "channel_id": "channel-1",
    "scheduled_for": "2025-12-17T15:00:00Z",
    "assigned_to": "copilot-agent"
  }
}
```

---

## Multi-Project Example

### Scenario: Generate for Multiple Channels

```bash
for PROJECT in channel-1 channel-2 channel-3; do
  echo "📝 Generating for $PROJECT..."
  
  THEME="Я много лет держала в себе эту тайну"
  ANGLE="confession"
  EMOTION="triumph"
  
  npx tsx cli.ts generate:v2 \
    --project="$PROJECT" \
    --theme="$THEME" \
    --angle="$ANGLE" \
    --emotion="$EMOTION" \
    && echo "✅ $PROJECT: Success" \
    || echo "❌ $PROJECT: Failed"
done
```

---

## Advanced: Chain Phase 2 (Anti-Detection)

After Phase 1 generation, optionally run Phase 2:

```bash
# Get latest article
ARTICLE=$(find generated/articles -name "*.json" -type f | sort | tail -1)
TEXT_FILE="/tmp/article_text.txt"

# Extract content from JSON
jq -r '.lede + "\n" + (.episodes[].content | join("\n")) + "\n" + .finale' "$ARTICLE" > "$TEXT_FILE"

# Run anti-detection
npx tsx cli.ts phase2 \
  --content="$TEXT_FILE" \
  --title="Generated Article"

# Check gatekeeper score
jq '.adversarialScore.overallScore' generated/phase2/*/report.json
```

**Pass criteria**: Score ≥ 80

---

## Logging & Debugging

### Enable Verbose Output

```bash
# Add to CLI command:
npx tsx cli.ts generate:v2 --verbose ...
```

### Check Logs

```bash
# View last 100 lines of output
npm run generate 2>&1 | tail -100

# Save to file
npx tsx cli.ts generate:v2 ... > /tmp/generation.log 2>&1
cat /tmp/generation.log
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `GEMINI_API_KEY not found` | Secret not set | Add to GitHub Secrets or `export` locally |
| `Project config not found` | Wrong project ID | Check `projects/` folder exists |
| `TypeScript error` | Dependencies not installed | Run `npm install` |
| Timeout (>120 seconds) | Gemini API slow | Retry, check API quota |
| Empty output | API error | Check logs, verify API key active |

---

## Integration Patterns

### Pattern 1: Direct CLI Invocation

```bash
# Simple sync generation
npx tsx cli.ts generate:v2 --project=channel-1 --theme="..." && \
echo "✅ Article generated" || \
echo "❌ Generation failed"
```

### Pattern 2: Background Job (with nohup)

```bash
# Start and don't wait for completion
nohup bash -c 'npx tsx cli.ts generate:v2 --project=channel-1 --theme="..."' > /tmp/gen.log 2>&1 &
echo "Job started, PID: $!"
```

### Pattern 3: GitHub Actions Dispatch

```bash
# Trigger via GitHub API
curl -X POST https://api.github.com/repos/crosspostly/dzen/actions/workflows/generate-every-3-hours-v2.yml/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+raw" \
  -d '{
    "ref": "main",
    "inputs": {
      "theme": "Я молчала 20 лет",
      "angle": "confession",
      "emotion": "triumph"
    }
  }'
```

---

## Success Criteria Checklist

- [ ] Article generated (JSON file created)
- [ ] `metadata.totalChars` ≥ 35000
- [ ] `episodes` array has ≥ 8 items
- [ ] Each episode has non-empty `content` and `charCount`
- [ ] `title`, `lede`, `finale` are populated
- [ ] No TypeScript errors in output
- [ ] Generation time < 120 seconds (typical 60-90s)
- [ ] File saved to `generated/articles/`

---

## Failure Recovery

### If Generation Fails

1. **Check API key**
   ```bash
   echo $GEMINI_API_KEY  # Should not be empty
   ```

2. **Validate project config**
   ```bash
   jq . projects/channel-1/config.json
   ```

3. **Retry with verbose**
   ```bash
   npx tsx cli.ts generate:v2 --verbose --project=channel-1 --theme="test"
   ```

4. **Check Node/npm versions**
   ```bash
   node --version  # Should be 20+
   npm --version   # Should be 10+
   ```

5. **Full reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run test
   ```

---

## Performance Notes

- **Phase 1 (Generation)**: 60–90 seconds typical
  - 10–15s: Outline generation (Gemini 2.5 Flash)
  - 45–75s: 12× parallel episodes (Gemini 2.5 Flash)
  
- **Phase 2 (Anti-Detection)**: 30–60 seconds
  - Perplexity + Burstiness + Skaz + Validation

- **Total**: ~2 minutes for both phases

---

## Contact / Escalation

If generation fails after all troubleshooting:

1. Save logs: `generate.log`
2. Save config: `projects/channel-1/config.json`
3. Save task definition (JSON)
4. Report to: Issue tracker or team channel

---

**Last Updated**: 2025-12-17  
**Version**: v2.0 (v1 removed)  
**Maintained by**: crosspostly
