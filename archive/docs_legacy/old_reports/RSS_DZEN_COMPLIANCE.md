# ✅ RSS → Yandex Dzen Compliance (Summary)

This is a **compressed** checklist of the RSS elements required for Yandex Dzen compatibility.

> Full document (root): [`RSS_DZEN_COMPLIANCE.md`](../../RSS_DZEN_COMPLIANCE.md)

---

## Required namespaces

Typical namespaces used:

- `content` — `http://purl.org/rss/1.0/modules/content/`
- `media` — `http://search.yahoo.com/mrss/`
- `dc` — `http://purl.org/dc/elements/1.1/`

---

## Per-item required elements (high level)

- `title`
- `description` (often CDATA)
- `pubDate` (RFC822)
- `guid` (unique; typically `isPermaLink="false"`)
- `link`
- `enclosure` (image URL + correct `type`)
- `content:encoded` (full HTML inside CDATA)

### Dzen-specific bits

- `<media:rating scheme="urn:simple">nonadult</media:rating>`
- Correct categories (per your current Dzen submission strategy)

---

## Image URL rule of thumb

Use stable HTTPS URLs (e.g. GitHub raw) instead of local/Vercel paths.
