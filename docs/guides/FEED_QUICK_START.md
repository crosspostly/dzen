# 🚀 Feed Quick Start (Summary)

This is a **compressed** quick start for generating/updating the RSS feed.

> Full guide (root): [`FEED_QUICK_START.md`](../../FEED_QUICK_START.md)

---

## What it does

Two-mode RSS generator for published content, including:

- image path checks
- deduplication
- incremental flow that can move new content into `articles/published/`

---

## Commands

### FULL (rebuild from published)

```bash
npm run feed:full
# or
node scripts/generate-feed.js full
```

### INCREMENTAL (new + published)

```bash
npm run feed:incremental
# or
node scripts/generate-feed.js incremental
```

---

## When to use which

- Use **incremental** after running content generation (daily)
- Use **full** after fixes/moves or periodically to ensure consistency

---

## Related docs

- RSS generation details: [`docs/systems/RSS_GENERATION.md`](../systems/RSS_GENERATION.md)
- Dzen compliance: [`docs/systems/RSS_DZEN_COMPLIANCE.md`](../systems/RSS_DZEN_COMPLIANCE.md)
