# Theme Generation Logic (v5.0)

## Overview
The `ThemeGeneratorService` is responsible for creating unique, viral hooks for Dzen articles ("Life Stories" genre). 
Unlike previous versions that relied on a small static list or hardcoded CSV, the new system uses a dynamic "Few-Shot Learning" approach with a large dataset of real examples.

## Key Components

### 1. Data Source: `parsed_examples.json`
- **Origin**: Parsed from `public/examples` (HTML dump of a successful Dzen feed).
- **Size**: ~100 unique article hooks (Titles + Excerpts).
- **Content**: Proven viral hits (100k+ views) focusing on family drama, betrayal, and social justice.

### 2. Randomization Strategy (The "Sliding Window")
To prevent the model from getting stuck in a loop or repeating the same patterns:
1.  The service loads all 100+ themes.
2.  For **each** generation request, it selects **20 RANDOM examples** from the pool.
3.  These 20 examples are fed to Gemini as "Context/Inspiration".
4.  **Result**: The model never sees the exact same combination of examples twice, ensuring variety in the output.

### 3. "Anti-Trope" Prompt Engineering
We discovered that LLMs tend to latch onto specific frequent words (like "Mother-in-law", "Coat", "Keys") if they appear often in examples.
To fix this, the prompt now strictly **FORBIDS** copying the specific actors or objects from the examples.

**The Prompt Logic:**
> "ANALYZE THE VARIETY. Do not just focus on mothers-in-law or inheritance. Look for other patterns: conflicts with neighbors, bosses, siblings, old friends."

> "NO REPETITION. Do not use the exact same characters or objects found in the examples. If examples have a 'coat', you write about a 'watch'. If 'kitchen', you write about a 'summer house'."

### 4. Fallback Mechanism
If the Gemini API fails or returns a duplicate:
1.  Retries with `gemini-2.5-flash-lite`.
2.  Checks against the existing database to ensure the generated title is not a verbatim copy.

## Usage
```typescript
const generator = new ThemeGeneratorService();
const newTheme = await generator.generateNewTheme(); 
// Output: "На корпоративе коллеги смеялись... но когда объявили..."
```

## Maintenance
To add more variety:
1. Update `public/examples` with new HTML content from Dzen.
2. Run `node tools/parse_examples.cjs` to rebuild `parsed_examples.json`.
