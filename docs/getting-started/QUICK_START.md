# 🚀 Quick Start (Summary): Auto‑publish to Dzen

This is a **compressed** quick start for enabling Dzen auto‑publishing via GitHub Actions.

> Full version (root): [`QUICK_START.md`](../../QUICK_START.md)

> See also: [`docs/v7.0-quick-start.md`](../v7.0-quick-start.md) for v7.0 generation changes.

---

## ✅ 3 steps

### 1) Add cookies secret

- GitHub repo → **Settings** → **Secrets and variables** → **Actions**
- Add secret:
  - **Name:** `DZEN_COOKIES_JSON`
  - **Value:** JSON exported from browser cookies (`dzen.ru`)

Details: [`docs/getting-started/SETUP_GUIDE.md`](./SETUP_GUIDE.md)

### 2) Run the setup/test workflow

- Go to repo **Actions**
- Run workflow like **“Test Dzen Setup”** (if available)
- Confirm it can read the secret and authenticate

### 3) Enable / run auto‑publish

- Run the scheduled auto‑publish workflow (or manually trigger it)
- Verify it updates publication history (e.g. `published_articles.txt`)

---

## What is usually validated

- `feed.xml` exists and is readable
- cookies JSON parses correctly
- dedupe logic skips already‑published articles
- CI environment is configured correctly

---

## Next links

- Secrets setup (full): [`SETUP_GUIDE.md`](../../SETUP_GUIDE.md)
- Workflows docs (repo docs): [`docs/GITHUB-ACTIONS-SETUP.md`](../GITHUB-ACTIONS-SETUP.md)
