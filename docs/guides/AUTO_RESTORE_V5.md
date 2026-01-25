# 🔧 Auto-Restore System v5.0 (2026)

## Overview
The Auto-Restore system is a critical CI/CD pipeline that automatically detects new or modified articles, cleans their formatting, fixes typos, and ensures mobile readability using Google Gemini models.

## Key Features v5.0
- **Smart Detection**: Uses `git diff` with `before/after` SHAs to detect ALL changes in a push, not just the last commit.
- **Safety First**: Ignores technical files (`REPORT.md`, images).
- **Concurrency Control**: Processes files in batches of **3** to prevent API rate limits (429 errors).
- **Chunking Strategy**: Splits large texts into chunks of **3000 chars** to prevent model truncation.

## Restoration Strategy (The "Economy" Funnel)
We use a 5-step fallback strategy, starting with the fastest/cheapest models and escalating to powerful ones only if necessary.

1.  **Attempt 1: Gemini 2.5 Flash-Lite**
    -   *Role*: Speed & Efficiency.
    -   *Chunk Size*: 3000 chars.
    -   *Prompt*: Soft formatting correction.
    -   *Success Rate*: ~70% of cases.

2.  **Attempt 2: Gemini 2.5 Flash**
    -   *Role*: Standard correction.
    -   *Chunk Size*: 3000 chars.
    -   *Prompt*: Medium strictness.

3.  **Attempt 3: Gemini 3 Flash Preview**
    -   *Role*: Smart logic handling.
    -   *Chunk Size*: 3000 chars.

4.  **Attempt 4: Gemini 2.5 Pro**
    -   *Role*: Heavy lifting.
    -   *Chunk Size*: 3000 chars.

5.  **Attempt 5: Gemini 3 Pro Preview**
    -   *Role*: Last resort flagship.
    -   *Chunk Size*: 3000 chars.

## How to Trigger
Just push any `.md` file to `articles/` folder in the `main` branch.
The workflow `.github/workflows/auto-restore-articles.yml` will start automatically.

## Troubleshooting
- **No changes on GitHub?** Check the Action logs. If the ratio is ~1.00, the file might not have needed changes.
- **429 Errors?** The batch size is set to 3. If errors persist, check your API quota.
