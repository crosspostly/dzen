# 📺 Rutube Integration Guide (Video Publishing)

> **Status:** Draft / Planned
> **Dependency:** Requires `promo_video` output.

## 🎯 Цель
Автоматическая загрузка созданных `promo_video/output_test/final_video.mp4` на канал Rutube для получения дополнительного охвата.

## 🛠 Техническое решение

Rutube не имеет простого публичного API для загрузки видео. Мы используем **Browser Automation (Playwright)**.

### 1. Архитектура Загрузчика
*   **Инструмент:** Playwright (тот же, что и для Дзена).
*   **Авторизация:** Через Cookies (`rutube_cookies.json`).
*   **Входной файл:** `public/promo_teaser.mp4` (или из `promo_video/output_test/`).

### 2. Подготовка Cookies (Ручная операция)
Rutube сессии живут недолго. Их нужно обновлять раз в 2-4 недели.

**Инструкция по получению кук:**
1.  Откройте браузер в режиме инкогнито.
2.  Установите расширение "EditThisCookie" или откройте DevTools -> Application -> Cookies.
3.  Залогиньтесь в Rutube Studio (`studio.rutube.ru`).
4.  Скопируйте все куки в формате JSON.
5.  Сохраните в файл: `config/rutube_cookies.json`.

> ⚠️ **ВАЖНО:** Если скрипт падает на логине, куки протухли. Обновите их!

### 3. Сценарий автоматизации (Draft)

```javascript
// Pseudo-code for Rutube Uploader
async function uploadToRutube(videoPath, meta) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // 1. Load Cookies
  await context.addCookies(JSON.parse(fs.readFileSync('config/rutube_cookies.json')));
  
  const page = await context.newPage();
  
  // 2. Go to Upload Page
  await page.goto('https://studio.rutube.ru/videos/upload');
  
  // 3. File Input
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Загрузить")')
  ]);
  await fileChooser.setFiles(videoPath);
  
  // 4. Fill Meta (Title, Desc)
  await page.fill('input[placeholder="Название"]', meta.title);
  await page.fill('textarea[placeholder="Описание"]', meta.description);
  
  // 5. Publish
  await page.click('button:has-text("Опубликовать")');
}
```

## 🔗 Связь с Promo Video Factory

1.  Запускается `test_full_pipeline.ts` -> генерирует видео.
2.  Запускается `rutube_uploader.ts` (нужно создать).
3.  Видео появляется на канале.

## 🛑 Известные проблемы
*   **IP Blocks:** Rutube может блокировать IP дата-центров (GitHub Actions). Решение: использовать proxy или домашний сервер.
*   **Captcha:** Возможно появление капчи при частых загрузках.
