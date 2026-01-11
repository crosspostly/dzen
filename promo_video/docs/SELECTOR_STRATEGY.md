# 🕵️ Dzen Selector Strategy & Debugging

**Date:** January 11, 2026
**Target:** Dzen Video Studio (`/profile/editor/...`)

This document explains how we reverse-engineered the Dzen video upload interface and built a robust Playwright automation script.

## 1. The Challenge
Dzen's interface is a complex React SPA with:
- **Dynamic Classes:** Classes like `editor--base-button__rootElement-75` change frequently.
- **Portals/Modals:** Menus and upload forms are often rendered outside the main DOM hierarchy.
- **Event Ambiguity:** Clicking "Upload Video" might trigger a native file dialog OR navigate to a new page depending on the A/B test or context.
- **Hidden Inputs:** The actual `<input type="file">` is hidden and triggered by a label.

## 2. Strategy: The "Analyzer" Script
We created `promo_video/src/tools/find_video_selectors.ts` as a reconnaissance drone.

### Workflow:
1.  **Headless Mode = False:** (Optional) To visually see what's happening.
2.  **Screenshot & Dump:** At every step, we saved a PNG and an HTML file.
    *   *Why?* To inspect the DOM state exactly as Playwright sees it, which often differs from Chrome DevTools due to hydration timing.
3.  **Selector Priority:**
    *   **Tier 1 (Best):** Accessibility attributes (`aria-label`, `role`). E.g., `label[aria-label="Загрузить видео"]`.
    *   **Tier 2 (Good):** Stable data attributes (`data-testid`). E.g., `[data-testid="add-publication-button"]`.
    *   **Tier 3 (Okay):** Text content (`:has-text(...)`).
    *   **Tier 4 (Avoid):** CSS classes with hashes.

## 3. Key Technical Solutions

### A. The "Event Race" (Handling Uploads)
We didn't know if clicking "Upload" would open a system file dialog or navigate to a new URL. We solved this by racing promises:

```typescript
const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
const navigationPromise = page.waitForNavigation({ timeout: 5000 });

await videoOption.click();

await Promise.race([
    fileChooserPromise.then(() => console.log('File Chooser!')),
    navigationPromise.then(() => console.log('Navigation!')),
]);
```
*Result:* It turned out to be a **File Chooser** triggered by a label click.

### B. The "Label-Input" Trick
The "Upload Video" button wasn't a `<button>` tag that accepts files. It was a `<label>` wrapping or linked to a hidden `<input>`.
*Solution:* We clicked the visible `label[aria-label="Загрузить видео"]` but waited for the `input[type="file"]` to become attached to the DOM, then used `setInputFiles` directly on the input.

### C. Modal Blocking
Dzen has many popups ("New features!", "Cookies").
*Solution:* A `closeOverlays()` function that aggressively hunts for close buttons (`[data-testid="close-button"]`, `aria-label="Закрыть"`) before attempting interaction.

## 4. Key Selectors Found

| Action | Selector | Type |
|--------|----------|------|
| **Add Button** | `[data-testid="add-publication-button"]` | Stable ID |
| **Upload Option** | `label[aria-label="Загрузить видео"]` | ARIA Label |
| **File Input** | `input[type="file"]` | Native Tag |
| **Description** | `.ql-editor` | Class (Quill Editor) |
| **Cover Upload** | `input[type="file"][accept*="image"]` | Attribute Filter |
| **Publish Button** | `[data-testid="publish-btn"]` | Stable ID |

## 5. How to Debug Future Breaks
If the script fails:
1.  Run `npx tsx promo_video/src/tools/find_video_selectors.ts`.
2.  Check the generated `stepX.png` screenshots in the root folder.
3.  Check `dump_X.html` to find the new selectors.
4.  Update `DzenVideoPublisher.ts` with the new values.
