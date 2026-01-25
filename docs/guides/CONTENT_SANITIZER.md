# 🧼 ContentSanitizer (Cleaning + Validation + Quality Metrics)

`ContentSanitizer` is the project’s text hygiene and quality-metrics layer.

It is used to:
- Remove common “generation trash” (markdown, code fences, metadata-like lines)
- Compute quality metrics (readability, dialogue %, sensory density, plot twists)
- Provide higher-level validation flows (including authenticity scoring integration)

## Where it lives

- Implementation: `services/contentSanitizer.ts`
- Types: `types/ContentSanitizer.ts`

## Core API

### `ContentSanitizer.cleanEpisodeContent(content: string): string`
Best-effort cleanup:
- Removes markdown formatting (`**bold**`, `*italic*`, headings, lists)
- Strips code fences and inline backticks
- Removes obvious JSON blocks and “metadata-like” lines
- Normalizes line breaks and collapses excessive newlines

### `ContentSanitizer.calculateQualityMetrics(content: string): QualityMetrics`
Computes metrics used for reporting and quality gates.

Key fields (see `types/ContentSanitizer.ts`):
- `readabilityScore` (0–100)
- `dialoguePercentage` (0–100)
- `sensoryDensity` (details per 1000 chars, later mapped to a 0–10 scale in reporting)
- `twistCount` (plot twist count)
- plus paragraph and sentence statistics

### `ContentSanitizer.validateEpisodeContentWithAuthenticity(content: string)`
Runs a richer validation flow used by v4.9:
- Cleans content
- Runs structural validation (length, formatting, etc.)
- Calculates quality metrics
- Computes authenticity score + retry prompt

For usage patterns and scoring rules, see:
- [v4.9 QualityValidator Guide](./V4.9_QUALITY_VALIDATOR_GUIDE.md)

## Reporting

`ContentSanitizer.generateReport(content)` produces a human-readable summary including:
- Readability target
- Dialogue target
- Sensory target
- Plot twist target (`twistCount`)

## Related docs

- [Quality Metrics in Prompt](./QUALITY_METRICS_IN_PROMPT.md)
- [Development Roadmap](../ROADMAP.md)
