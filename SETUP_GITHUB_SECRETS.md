# 🔐 GitHub Secrets Setup for ZenMaster v2.0

## Required Secrets

ZenMaster v2.0 requires one secret to be configured in your GitHub repository.

---

## Step-by-Step Setup

### 1. Navigate to Repository Settings

1. Go to your repository: `https://github.com/crosspostly/dzen`
2. Click on **Settings** tab (top navigation)
3. In the left sidebar, go to **Secrets and variables** → **Actions**

### 2. Add GEMINI_API_KEY Secret

1. Click **New repository secret** button (green button, top right)
2. Fill in the form:
   - **Name**: `GEMINI_API_KEY`
   - **Secret**: Your Google Gemini API key (starts with something like `AIza...`)
3. Click **Add secret**

### 3. Verify Secret is Added

You should see:
```
GEMINI_API_KEY
Updated now by [your-username]
```

---

## Getting Your Gemini API Key

If you don't have a Gemini API key yet:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API key**
4. Select a project or create a new one
5. Copy the generated API key
6. Use this key as the value for `GEMINI_API_KEY` secret

### Important Notes
- Keep your API key secret! Never commit it to the repository
- The key should start with `AIza...`
- Free tier includes 1,500 requests per day (enough for 50+ articles)
- Rate limits: 15 requests per minute

---

## Optional: Repository Variables

You can also set default values (these are NOT secrets, they're public):

### Navigate to Variables
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **Variables** tab (next to Secrets)

### Add Variables (Optional)
- `DEFAULT_ANGLE` = `confession`
- `DEFAULT_EMOTION` = `triumph`
- `DEFAULT_AUDIENCE` = `Women 35-60`
- `GEMINI_MODEL_OUTLINE` = `gemini-2.5-flash`
- `GEMINI_MODEL_EPISODES` = `gemini-2.5-flash`

*Note: These have defaults in code, so they're truly optional*

---

## Testing the Setup

### Method 1: Manual Workflow Run

1. Go to **Actions** tab
2. Select workflow: **ZenMaster v2.0 - Generate Every 3 Hours**
3. Click **Run workflow** (right side)
4. Select branch: `feature/zenmaster-v2-phase1-integration`
5. Click **Run workflow** (green button)
6. Wait 8-10 minutes
7. Check workflow logs for success ✅

### Method 2: Local Testing

```bash
# On your machine
export GEMINI_API_KEY="AIza..."  # Your actual key
npx tsx cli.ts generate:v2 --theme="Test article"
```

---

## Troubleshooting

### "Secret not found" Error

**Symptom**: Workflow fails with "GEMINI_API_KEY not found"

**Solution**:
1. Verify secret is added in Settings → Secrets
2. Secret name must be exactly `GEMINI_API_KEY` (case-sensitive)
3. Re-run the workflow

### "Invalid API key" Error

**Symptom**: Workflow fails with authentication error

**Solution**:
1. Verify the API key is correct (copy-paste from Google AI Studio)
2. Check if key has billing enabled (if using paid tier)
3. Verify key has Gemini API access enabled

### "Quota exceeded" Error

**Symptom**: Workflow fails with "quota exceeded"

**Solution**:
1. Check [Google Cloud Console](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas)
2. Free tier: 1,500 requests/day
3. Each article uses ~15 requests
4. Wait until quota resets (daily) or upgrade to paid tier

---

## Security Best Practices

✅ **DO:**
- Store API key as a GitHub Secret
- Use environment variables locally
- Rotate keys periodically
- Monitor usage in Google Cloud Console

❌ **DON'T:**
- Commit API keys to repository
- Share keys in public channels
- Use personal keys in shared projects
- Leave keys in code or logs

---

## Verification Checklist

Before running first workflow:

- [ ] GEMINI_API_KEY secret added to repository
- [ ] Secret name is exactly `GEMINI_API_KEY` (uppercase)
- [ ] API key is valid (tested in Google AI Studio)
- [ ] Workflow file exists: `.github/workflows/generate-every-3-hours.yml`
- [ ] Branch `feature/zenmaster-v2-phase1-integration` exists
- [ ] Code changes are committed

---

## Automatic Schedule

Once secrets are configured, workflow runs automatically:

**Schedule**: Every 3 hours
- 00:00 UTC (midnight)
- 03:00 UTC (3 AM)
- 06:00 UTC (6 AM)
- 09:00 UTC (9 AM)
- 12:00 UTC (noon)
- 15:00 UTC (3 PM)
- 18:00 UTC (6 PM)
- 21:00 UTC (9 PM)

**Branch**: `feature/zenmaster-v2.0` (as configured in workflow)

---

## Support

If you encounter issues:

1. Check workflow logs in Actions tab
2. Verify secret is correctly set
3. Test locally with your API key
4. Check Google Cloud Console for API status
5. Review troubleshooting section above

---

## Quick Reference

```bash
# Local testing command
export GEMINI_API_KEY="your-key"
npx tsx cli.ts generate:v2 --theme="Test"

# Check if secret works in workflow
# Go to: Actions → ZenMaster v2.0 → Run workflow
```

---

**Next Step**: After adding secrets, go to `PHASE1_COMPLETE.md` for testing instructions.
