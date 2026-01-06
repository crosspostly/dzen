# 🔐 Setup Guide (Summary): DZEN_COOKIES_JSON in GitHub Secrets

This is a **compressed setup guide** for configuring the `DZEN_COOKIES_JSON` GitHub Secret used by Dzen automation workflows.

> Full version (root): [`SETUP_GUIDE.md`](../../SETUP_GUIDE.md)

---

## ✅ What you need

- Access to your **logged-in** аккаунт на https://dzen.ru
- GitHub repository admin access to add **Actions secrets**

---

## 1) Export cookies from the browser

### Option A (recommended): DevTools

1. Open https://dzen.ru and log in
2. Open DevTools (`F12`)
3. **Application** → **Cookies** → `dzen.ru`
4. Copy cookies into JSON format (export/copy as JSON if available)

### Option B: Console snippet

Run in DevTools Console:

```js
copy(JSON.stringify(
  document.cookie.split('; ').map(c => {
    const [name, value] = c.split('=');
    return {
      name: decodeURIComponent(name),
      value: decodeURIComponent(value),
      domain: '.dzen.ru',
      path: '/',
    };
  })
))
```

---

## 2) Add cookies to GitHub Secrets

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `DZEN_COOKIES_JSON`
4. Value: paste the JSON array (`[` … `]`)

---

## 3) Validate

- Secret exists in the list: `DZEN_COOKIES_JSON`
- Value is hidden (you can’t see it back)
- Run the repo test workflow (if present) to confirm authentication works

---

## ⚠️ Common issues

- **Invalid JSON** → validate on https://jsonlint.com/
- **Secret too long** → keep only required cookies / remove extra fields (keep `name` + `value`)
- **Wrong secret name** → must be exactly `DZEN_COOKIES_JSON`

---

## 🔒 Security rules

- Never paste cookies into Issues/PRs
- Never commit cookies into the repo
- Rotate cookies if you suspect compromise
