# 🔐 GitHub Secrets Setup: DZEN_COOKIES_BASE64

## Overview

This guide shows how to **securely store your Dzen cookies** in GitHub Secrets for CI/CD automation.

**What you'll do:**
1. Extract cookies from your browser
2. Encode them as Base64
3. Add to GitHub Secrets as `DZEN_COOKIES_BASE64`
4. Workflow automatically decodes and uses them

**Why Base64?**
- ✅ Safe to store in GitHub
- ✅ Prevents accidental exposure in logs
- ✅ Workflow decodes automatically
- ✅ Works cross-platform

## 🔏 Step 1: Export Cookies from Browser

### Option A: Chrome/Edge (Recommended)

1. Open **Dzen** in your browser: https://dzen.ru
2. Open **Developer Tools**: `F12` or `Ctrl+Shift+I`
3. Go to: **Application** tab
4. Left sidebar: **Cookies** > **https://dzen.ru**
5. You should see cookies like:
   - `Session`
   - `sessionid`
   - `PHPSESSID`
   - `Ydanautocomplete`
   - etc.

6. **Right-click** in the cookies table > **Copy all** (or manually select)

### Option B: Manual Copy

1. In DevTools, find these cookies (minimum required):
   ```
   - Session ID (usually "Session" or "sessionid")
   - PHPSESSID
   - Any Yandex auth cookies
   ```

2. Create JSON like this:
   ```json
   [
     {
       "name": "Session",
       "value": "your_session_value",
       "domain": ".dzen.ru",
       "path": "/",
       "expires": -1,
       "httpOnly": true,
       "secure": true,
       "sameSite": "Strict"
     },
     {
       "name": "PHPSESSID",
       "value": "your_php_session_value",
       "domain": ".dzen.ru",
       "path": "/",
       "expires": -1,
       "httpOnly": true,
       "secure": true,
       "sameSite": "Strict"
     }
   ]
   ```

## 📖 Step 2: Prepare Cookie File

### Local Setup (Development)

**For local use on your PC:**

```bash
# 1. Create config directory
mkdir -p !posts/PRODUCTION_READY/config

# 2. Save cookies as JSON
# Windows: Save to C:\path\to\project\!posts\PRODUCTION_READY\config\cookies.json
# Linux/Mac: Save to ./!posts/PRODUCTION_READY/config/cookies.json

# 3. Add to .gitignore (NEVER commit!)
echo "config/cookies.json" >> .gitignore
```

**File content example:**
```json
[
  {
    "name": "Session",
    "value": "abc123xyz...",
    "domain": ".dzen.ru",
    "path": "/",
    "expires": -1,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Strict"
  },
  {
    "name": "PHPSESSID",
    "value": "def456uvw...",
    "domain": ".dzen.ru",
    "path": "/",
    "expires": -1,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Strict"
  }
]
```

## 🔐 Step 3: Encode to Base64

### Option A: PowerShell (Windows)

```powershell
# Read the file and encode
$cookiesPath = "!posts\PRODUCTION_READY\config\cookies.json"
$cookiesContent = Get-Content $cookiesPath -Raw
$encodedCookies = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($cookiesContent))

# Copy to clipboard
$encodedCookies | Set-Clipboard

Write-Host "✅ Encoded cookies copied to clipboard!"
Write-Host "Length: $($encodedCookies.Length) characters"
```

### Option B: Bash (Linux/Mac)

```bash
# Read and encode
cat !posts/PRODUCTION_READY/config/cookies.json | base64 > cookies_base64.txt

# Or directly to clipboard (macOS)
cat !posts/PRODUCTION_READY/config/cookies.json | base64 | pbcopy

# Or directly to clipboard (Linux)
cat !posts/PRODUCTION_READY/config/cookies.json | base64 | xclip -selection clipboard

echo "✅ Encoded cookies copied!"
wc -c cookies_base64.txt
```

### Option C: Online Tool (if not comfortable with CLI)

1. Go to: https://www.base64encode.org/
2. Paste your cookies.json content
3. Click "Encode"
4. Copy the output

**⚠️ WARNING:** Only use for sensitive data if you trust the website!

## 🕷 Step 4: Add to GitHub Secrets

### 1. Go to Your Repository

```
https://github.com/crosspostly/dzen/settings/secrets/actions
```

Or navigate manually:
1. Go to: https://github.com/crosspostly/dzen
2. Click: **Settings** (top right)
3. Left sidebar: **Secrets and variables** > **Actions**

### 2. Create New Secret

1. Click: **"New repository secret"** button
2. **Name:** `DZEN_COOKIES_BASE64` (exactly!)
3. **Value:** Paste your Base64 encoded cookies
4. Click: **"Add secret"**

### 3. Verify

You should see:
```
🔐 DZEN_COOKIES_BASE64
Updated 2 minutes ago
```

## 🔄 How the Workflow Uses It

### In `.github/workflows/auto-publish.yml`:

```yaml
- name: 🔐 Load cookies from GitHub Secrets
  run: |
    # Decode Base64 secret
    $cookiesBase64 = "${{ secrets.DZEN_COOKIES_BASE64 }}"
    $cookiesJson = [System.Text.Encoding]::UTF8.GetString(
      [System.Convert]::FromBase64String($cookiesBase64)
    )
    
    # Save to config/cookies.json
    Set-Content -Path 'config/cookies.json' -Value $cookiesJson
    Write-Host "✅ Cookies loaded from GitHub Secrets"
```

**Flow:**
```
1. GitHub Secrets stores: Base64(cookies.json)
   ↓
2. Workflow decodes: Base64 → JSON
   ↓
3. Saves to: config/cookies.json
   ↓
4. Script uses: config/cookies.json
   ↓
5. Browser authenticates: Dzen
```

## ⚠️ Important Notes

### Keeping Both Working

**Option A - Recommended:**
```
Local PC Development:
└── config/cookies.json (in .gitignore)

GitHub Actions:
└── DZEN_COOKIES_BASE64 secret
    ↓ (decodes to)
    config/cookies.json (during workflow)
```

**This way:**
- ✅ Local: Use `config/cookies.json` directly
- ✅ GitHub: Use `DZEN_COOKIES_BASE64` secret
- ✅ Both work independently
- ✅ No conflicts

### Security Best Practices

1. **Never commit cookies.json**
   ```bash
   echo "config/cookies.json" >> .gitignore
   git rm --cached config/cookies.json  # if already committed
   ```

2. **Rotate cookies periodically**
   - Dzen sessions expire
   - Update secret when needed: Settings > Secrets > Edit

3. **Limit secret access**
   - Only used in auto-publish workflow
   - Only accessed by Actions
   - Not visible in logs

4. **Monitor usage**
   - Check workflow runs: Actions tab
   - Review logs for errors
   - Alert on failures

## 🔍 Testing the Setup

### Test 1: Local

```bash
cd !posts/PRODUCTION_READY

# Make sure cookies.json exists
ls config/cookies.json

# Test script locally
node src/main.js
```

### Test 2: GitHub Actions (Manual Run)

1. Go to: https://github.com/crosspostly/dzen/actions
2. Select: "Auto-Publish Articles Every 3 Hours"
3. Click: "Run workflow"
4. Watch logs for:
   ```
   ✅ Cookies loaded from GitHub Secrets (DZEN_COOKIES_BASE64)
   📖 Found X previously published articles
   📄 Found X articles in feed
   ```

## 🔎 Troubleshooting

### Secret not found error:

```
⚠️  WARNING: DZEN_COOKIES_BASE64 secret not found!
📖 Please add it to your repository secrets
```

**Solution:**
1. Check name is exactly: `DZEN_COOKIES_BASE64`
2. Verify it's in the right repo
3. Wait a minute for GitHub to sync
4. Try manual run again

### Cookies file is empty:

```
❌ Cookies file not found!
```

**Solution:**
1. Check Base64 string is valid
2. Check JSON format is correct
3. Test decoding locally:
   ```powershell
   [System.Text.Encoding]::UTF8.GetString(
     [System.Convert]::FromBase64String("YOUR_BASE64_HERE")
   )
   ```

### Authentication fails:

```
❌ Error loading cookies: Invalid format
```

**Solution:**
1. Cookies expired? Update them
2. JSON format wrong? Validate on jsonlint.com
3. Base64 encoding corrupted? Re-encode
4. Test locally first before pushing

## 📄 Reference

### Secret Name: `DZEN_COOKIES_BASE64`

```
Where used:
  - .github/workflows/auto-publish.yml
    Line: ${{ secrets.DZEN_COOKIES_BASE64 }}

What it contains:
  - Base64 encoded cookies.json

How long valid:
  - Until Dzen session expires (usually weeks)
  - Update when authentication fails
```

### File Structure

```
Local Development:
!posts/PRODUCTION_READY/
├── config/
│   └── cookies.json           ← Not committed (in .gitignore)
└── src/
    └── main.js                ← Uses cookies.json

CI/CD (GitHub Actions):
DZEN_COOKIES_BASE64 secret
  ↓ (decoded by workflow)
config/cookies.json (temporary)
  ↓ (used by script)
Browser authentication
```

## ✅ Checklist

- [ ] Exported cookies from Dzen
- [ ] Saved to `config/cookies.json` locally
- [ ] Added `config/cookies.json` to `.gitignore`
- [ ] Encoded cookies as Base64
- [ ] Created GitHub Secret `DZEN_COOKIES_BASE64`
- [ ] Verified secret is in Settings > Secrets
- [ ] Tested workflow manually
- [ ] Checked logs for success
- [ ] Confirmed article was published

## 📕 Next Steps

1. ✅ Set up secret (this guide)
2. ✅ Enable GitHub Actions (Settings > Actions)
3. ✅ Test manual workflow run
4. ✅ Wait for scheduled runs (every 3 hours)
5. ✅ Monitor published articles

---

**Security:** 🔐 Your cookies are encrypted by GitHub
**Expiration:** ⏳ Update secret when Dzen session expires
**Monitoring:** 💰 Check Actions tab for runs

Last updated: 2026-01-04 08:10 UTC
