# ZenMaster v2.0 Integration Status

## ✅ Integration Complete

The ZenMaster v2.0 Multi-Agent System has been successfully integrated into the CLI and GitHub Actions workflow.

### 🚀 Key Configurations

1.  **True CLI Command**:
    ```bash
    npx tsx cli.ts generate:v2 --theme="Your Theme" --angle="confession" --emotion="triumph" --audience="Women 35-60"
    ```
    *Note: `npm run generate:v2` is also available as a shortcut.*

2.  **Output Location**:
    - Directory: `generated/zenmaster-v2/`
    - Filename: `article_<timestamp>.json`

3.  **Automation Workflow**:
    - File: `.github/workflows/generate-every-3-hours.yml`
    - Trigger: Schedule (Every 3 hours) or Manual Dispatch
    - Artifacts: Uploaded as `zenmaster-v2-<run_id>`
    - Commits: Automatically pushes generated JSON to `feature/zenmaster-v2.0` (or current branch).

### 🛠️ Verification

- **CLI Logic**: Validated. Defaults to "Я терпела это 20 лет" / "confession" / "triumph" / "Women 35-60" if no args provided.
- **Dependencies**: `tsx`, `@google/genai` are correctly installed.
- **Permissions**: Workflow has `contents: write` permission for pushing changes.

### 🏃 Manual Run Example

```bash
export GEMINI_API_KEY="your_key_here"
npx tsx cli.ts generate:v2 \
  --theme="Я терпела это 20 лет" \
  --angle="confession" \
  --emotion="triumph" \
  --audience="Women 35-60" \
  --verbose
```
