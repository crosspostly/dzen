# 🎯 Quality Metrics in Prompt (Prompt-Led Quality)

This project includes a prompt template that embeds **explicit quality targets** directly into episode generation. The goal is to increase “first attempt” quality and reduce retries.

## Where it lives in code

- **Prompt construction**: `services/episodeGeneratorService.ts`
  - `buildQualityGuidelines(charLimit)`
- **Metrics calculation (including plot twists)**: `services/contentSanitizer.ts`
  - `ContentSanitizer.calculateQualityMetrics()`
  - `ContentSanitizer.calculateTwistCount()`
- **Metrics type**: `types/ContentSanitizer.ts` (`QualityMetrics`, including `twistCount`)

## What the prompt enforces

The generation prompt provides targets + how-to guidance for these metrics:

### 1) Readability score
- **Target**: `75+/100`
- **How**:
  - Short paragraphs (preferably ≤ 300 chars)
  - Short sentences (preferably ≤ 15 words)
  - Sentence length variety

### 2) Dialogue percentage
- **Target**: `35–40%`
- **How**:
  - 6–8 dialogues per episode
  - Each dialogue is 1–3 exchanges
  - Dialogue is mixed with narrative (not “all dialogue”)

### 3) Plot twists
- **Target**: `2+` per episode
- **How**:
  - “I thought X, but it was Y” patterns
  - New information that changes interpretation
  - A character does the opposite of what was expected

### 4) Sensory density
- **Target**: `4+/10` (at least ~10 sensory details)
- **How**:
  - Mix **visual / sound / touch / smell-taste**
  - Add 1–2 sensory details per paragraph

## How to verify

### Quick: run the prompt presence checks

```bash
npx tsx test-v4.5-prompt.ts
```

### Quick: verify twist detection

```bash
npx tsx -e "import { ContentSanitizer } from './services/contentSanitizer';
const m = ContentSanitizer.calculateQualityMetrics('Я думала, что он уйдёт. Но оказалось, он остался.');
console.log(m.twistCount);"
```

## Related docs

- [v4.9 QualityValidator Guide](./V4.9_QUALITY_VALIDATOR_GUIDE.md)
- [Development Roadmap](../ROADMAP.md)
