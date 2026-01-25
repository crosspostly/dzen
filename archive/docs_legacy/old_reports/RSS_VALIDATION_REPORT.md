# 🧪 RSS Validation Report (Summary)

This is a **compressed** validation checklist/report for the generated RSS feed.

> Full report (root): [`RSS_VALIDATION_REPORT.md`](../../RSS_VALIDATION_REPORT.md)

---

## Feed locations

- Local: `public/feed.xml`
- Public: `https://<vercel-app>/feed.xml` (or your configured public URL)
- Target channel: `https://dzen.ru/potemki`

---

## Checklist

### XML / RSS validity

- RSS parses as valid XML
- required namespaces exist (`content`, `media`, etc.)

### Channel metadata

- `title`, `link`, `description`, `language`
- `lastBuildDate`

### Per-item metadata

- `title`, `description`, `link`, `guid`, `pubDate`
- `content:encoded` present and contains HTML
- `enclosure` points to a valid image URL
- Dzen requirements: `media:rating` and required categories

---

## How to validate quickly

- Count items:
  - `grep -c "<item>" public/feed.xml`
- Ensure `content:encoded` count matches item count
- Ensure URLs don’t contain unintended domains/paths

If the repo includes a validator script, prefer running it locally/CI.
