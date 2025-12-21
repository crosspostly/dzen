# 🛡️ CODING STANDARDS - CRITICAL REQUIREMENTS

**Last Updated:** Dec 21, 2025  
**Status:** MANDATORY - DO NOT BREAK THESE RULES

---

## 🚨 CRITICAL RULES (NEVER BREAK)

### 1. Google Generative AI Import Standard

**✅ CORRECT (ONLY THIS):**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI({ apiKey: API_KEY });
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const response = await model.generateContent({ contents: [...] });
```

**❌ WRONG (NEVER USE):**
```typescript
// DEPRECATED - DO NOT USE
import { GoogleGenAI } from "@google/genai";  // ❌ OLD PACKAGE
import GoogleGenerativeAI from "@google/generative-ai";  // ❌ NO DEFAULT EXPORT
```

**Why:** Official SDK changed. Old imports cause runtime crashes.

**Files affected:**
- `services/episodeGeneratorService.ts`
- `services/episodeTitleGenerator.ts`
- `services/themeGeneratorService.ts`
- `services/imageGeneratorService.ts`
- `services/imageGeneratorAgent.ts`
- `services/phase2AntiDetectionService.ts`
- `services/multiAgentService.ts`

---

### 2. Package Dependencies Standard

**✅ CORRECT package.json:**
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

**❌ WRONG:**
```json
{
  "dependencies": {
    "@google/genai": "^x.x.x"  // ❌ DEPRECATED
  }
}
```

**Lock file:**
- ✅ Always use `npm ci` (not `npm install`)
- ✅ Commit `package-lock.json` changes
- ✅ Regenerate if conflicts: `rm package-lock.json && npm install`

---

### 3. Character Budget Standard

**✅ CORRECT (19000 chars):**
```typescript
// episodeGeneratorService.ts
private TOTAL_BUDGET = 19000; // ✅ FIXED
private LEDE_BUDGET = 600;
private FINALE_BUDGET = 1200;
```

**❌ WRONG:**
```typescript
private TOTAL_BUDGET = 29000; // ❌ TOO HIGH
private TOTAL_BUDGET = 38500; // ❌ WAY TOO HIGH
```

**Why:** Яндекс.Дзен limits, reader engagement optimal at 19K.

**Config files:**
- `services/episodeGeneratorService.ts` - Line ~85
- `services/multiAgentService.ts` - Default maxChars
- `config/channels.config.ts` - Min/max values
- `CHAR_LIMIT_CONFIG.md` - Documentation

---

### 4. Image Format Standard

**✅ CORRECT (JPEG only):**
```typescript
const mimeType = "image/jpeg"; // ✅ ONLY THIS

// Gemini API config
const imageConfig = {
  aspectRatio: "16:9",
  outputMimeType: "image/jpeg"
};
```

**❌ WRONG:**
```typescript
const mimeType = "image/png";  // ❌ NOT FOR ZEN
const mimeType = "image/webp"; // ❌ NOT SUPPORTED
```

**Why:** Яндекс.Дзен requires JPEG. PNG causes issues.

**Requirements:**
- ✅ Always generate 16:9 aspect ratio
- ✅ Always use JPEG mime type
- ✅ NO TEXT on images (monetization requirement)
- ✅ NO watermarks, captions, overlays

---

### 5. GitHub Actions Workflow Standard

**✅ CORRECT git operations:**
```yaml
- name: Commit and push
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git pull --rebase origin main  # ✅ ALWAYS PULL FIRST
    git add .
    git commit -m "Message" || echo "No changes"
    git push
```

**❌ WRONG:**
```yaml
# Missing pull before push
git add .
git commit -m "Message"
git push  # ❌ FAILS ON CONFLICTS
```

**Why:** Concurrent workflows cause push failures.

---

### 6. Episode Validation Standard

**✅ CORRECT (validate by default):**
```typescript
const episodeValidator = new EpisodeValidatorService({
  minQualityScore: 75,
  enableAutoFix: true,
  enableMLModel: true,
  verbose: true
});
```

**✅ Disable only for testing:**
```typescript
generateEpisodesSequentially(outlines, {
  skipValidation: true  // Only for tests
});
```

**❌ WRONG:**
```typescript
// Never disable validation in production
const validator = null; // ❌ NO PROTECTION
```

---

### 7. Context Continuation Standard

**✅ CORRECT (1200 chars context):**
```typescript
private CONTEXT_LENGTH = 1200; // ✅ OPTIMAL

private buildContext(previousEpisodes: Episode[]): string {
  if (previousEpisodes.length === 0) return "";
  
  const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
  return lastEpisode.content.slice(-this.CONTEXT_LENGTH);
}
```

**❌ WRONG:**
```typescript
private CONTEXT_LENGTH = 800;  // ❌ TOO SHORT
private CONTEXT_LENGTH = 2000; // ❌ TOO LONG
```

**Why:** 1200 chars gives smooth continuity without prompt bloat.

---

### 8. Story Quality Standards

**✅ CORRECT prompt structure:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 EDITORIAL CONTEXT (FOR YOU, NOT IN THE STORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Context about platform, monetization, audience]

⚠️ CRITICAL: Character does NOT know they're writing for publication.
```

**❌ WRONG (4th wall break in story):**
```
"Я пишу это для Яндекс.Дзен..."  // ❌ CHARACTER AWARE OF PLATFORM
"Вы, наверное, думаете..."       // ❌ ADDRESSING READER
"Я хочу поделиться этой историей с вами..."  // ❌ META
```

**Why:** Character authenticity = higher engagement = better monetization.

---

### 9. Quality Metrics Standards

**✅ TARGET METRICS:**
```
Readability Score:   75+/100  (paragraph < 300 chars, sentence < 15 words)
Dialogue Percentage: 35-40%   (6-8 dialogues per episode)
Plot Twists:         2+ minimum (expectation subversion)
Sensory Density:     10+ details (mix: visual, audio, touch, smell)
```

**❌ POOR METRICS:**
```
Readability: <60      (too complex)
Dialogue:    <20%     (too narrative-heavy)
Twists:      0-1      (predictable)
Sensory:     <5       (bland, abstract)
```

---

### 10. File Structure Standard

**✅ CORRECT organization:**
```
services/
├── antiDetection/          # Phase 2 anti-detection components
│   ├── antiDetectionEngine.ts
│   ├── perplexityController.ts
│   ├── burstinessOptimizer.ts
│   ├── skazNarrativeEngine.ts
│   └── adversarialGatekeeper.ts
├── episodeGeneratorService.ts  # Main episode generator
├── episodeValidatorService.ts  # Anti-AI validation
├── contentSanitizer.ts         # Quality metrics
└── multiAgentService.ts        # Orchestrator
```

**❌ WRONG (scattered):**
```
services/adversarialGatekeeper.ts  # ❌ Should be in antiDetection/
services/phase2Service.ts          # ❌ Unclear naming
```

---

## 📋 VERIFICATION CHECKLIST

Before committing ANY changes, verify:

### Imports Check
```bash
☐ All files use: import { GoogleGenerativeAI } from "@google/generative-ai"
☐ No files use: @google/genai (deprecated)
☐ No default imports: import GoogleGenerativeAI from ...
```

### Budget Check
```bash
☐ TOTAL_BUDGET = 19000 (not 29000, not 38500)
☐ LEDE_BUDGET = 600
☐ FINALE_BUDGET = 1200
☐ CHAR_LIMIT_CONFIG.md updated if changed
```

### Image Check
```bash
☐ All images use mimeType: "image/jpeg"
☐ Aspect ratio: "16:9"
☐ NO TEXT requirement documented
☐ Canvas processing uses JPEG output
```

### Workflow Check
```bash
☐ git pull --rebase before push
☐ Proper git config (user.name, user.email)
☐ GITHUB_TOKEN authentication used
☐ Handles "no changes" gracefully
```

### Validation Check
```bash
☐ EpisodeValidatorService enabled by default
☐ skipValidation only in tests
☐ minQualityScore >= 75
☐ enableAutoFix = true
```

---

## 🚫 BANNED PATTERNS

### Never Use These Imports
```typescript
❌ import { GoogleGenAI } from "@google/genai"
❌ import GoogleGenerativeAI from "@google/generative-ai"
❌ const { GoogleGenAI } = require("@google/genai")
```

### Never Use These Phrases in Stories
```typescript
❌ "Я пишу это для..."
❌ "Вы, наверное..."
❌ "Хочу поделиться..."
❌ "Читатели подумают..."
❌ "Эта история для Дзен..."
```

### Never Change These Values Without Approval
```typescript
❌ TOTAL_BUDGET (19000 is FIXED)
❌ CONTEXT_LENGTH (1200 is optimal)
❌ Image mimeType (JPEG only)
❌ Aspect ratio (16:9 fixed)
```

---

## 🔧 FIXING BROKEN CODE

### If imports are broken:
```bash
1. Search all .ts files for "@google/genai"
2. Replace with "@google/generative-ai"
3. Update class name: GoogleGenAI → GoogleGenerativeAI
4. Test all affected services
5. Verify package-lock.json updated
```

### If character budget is wrong:
```bash
1. Check episodeGeneratorService.ts line ~85
2. Verify TOTAL_BUDGET = 19000
3. Check multiAgentService.ts default maxChars
4. Update CHAR_LIMIT_CONFIG.md
5. Test generation with new budget
```

### If images fail:
```bash
1. Verify mimeType = "image/jpeg"
2. Check aspectRatio = "16:9"
3. Confirm outputMimeType in API config
4. Test with real Gemini API call
5. Verify Canvas processing output
```

### If workflows fail:
```bash
1. Add git pull --rebase before push
2. Check git config is set
3. Verify GITHUB_TOKEN permissions
4. Test with concurrent commits
5. Add error handling for "no changes"
```

---

## 📊 BREAKING CHANGE PROTOCOL

If you MUST change any standard:

1. **Create GitHub Issue** - Document why change is needed
2. **Update this file** - Add new standard
3. **Update all affected files** - Search & replace
4. **Update tests** - Verify new behavior
5. **Update documentation** - README, guides, etc
6. **Create migration guide** - How to upgrade
7. **Get approval** - Review by maintainer
8. **Deploy incrementally** - Test in staging first

**Never:**
- ❌ Change standards without issue
- ❌ Deploy breaking changes directly to main
- ❌ Skip documentation updates
- ❌ Ignore test failures

---

## 🎯 SUMMARY

**3 Golden Rules:**

1. **Always use official Google AI SDK** (`@google/generative-ai`)
2. **Always respect 19K character budget** (TOTAL_BUDGET = 19000)
3. **Always generate JPEG images** (no PNG, no text on images)

**Break these rules = Runtime crashes, monetization loss, deployment failures**

---

**Questions?** Check issues or ask maintainer before changing standards.
