# 🧩 Refactor Guide (Summary): Published articles folder structure

This document is a **compressed** guide for reorganizing already published articles into `articles/published/…` to separate them from drafts.

> Full version (root): [`REFACTOR_GUIDE.md`](../../REFACTOR_GUIDE.md)

---

## Goal

Move published articles out of `articles/women-35-60/…` into a stable archive layout:

- Drafts / new content: `articles/women-35-60/`
- Published archive: `articles/published/YYYY/MM/DD/`

---

## Minimal steps

### 1) Create target folders

```bash
mkdir -p articles/published/2025/12/{20,21,22}
```

### 2) Move article files and images

Use `git mv` to keep history:

```bash
git mv articles/women-35-60/2025-12-20/<file>.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/<image>.jpg articles/published/2025/12/20/
```

Repeat for other dates.

### 3) Commit

```bash
git status
git commit -m "refactor: move published articles to articles/published/ directory structure"
```

---

## Verification

- `articles/published/...` contains both the text and the corresponding images
- Draft folder keeps only drafts / not-yet-published content
