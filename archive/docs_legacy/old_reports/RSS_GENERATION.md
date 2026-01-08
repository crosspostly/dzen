# 📰 RSS Generation (Summary)

This is a **compressed** guide to the RSS feed generation modes and operational flow.

> Full document (root): [`RSS_GENERATION.md`](../../RSS_GENERATION.md)

---

## Modes

### 🔄 FULL

Rebuild the feed from **all** published articles.

```bash
node scripts/generate-feed.js full
# or
npm run feed:full
```

Use when:
- after path/format fixes
- after major changes
- periodic maintenance

### 📥 INCREMENTAL

Generate from **new** articles + include existing `articles/published/`.

```bash
node scripts/generate-feed.js incremental
# or
npm run feed:incremental
```

Use when:
- new articles were generated
- daily automation runs

---

## Common checks performed

- deduplication (avoid repeated items in the feed)
- image path validation (ensure referenced images exist and URLs are valid)
- final output written to `public/feed.xml`

---

## Running via GitHub Actions

If the repo has a manual workflow:

1. Actions → **Manual Feed Generation**
2. Run workflow
3. Choose `full` or `incremental`
