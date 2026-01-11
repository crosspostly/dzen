# 📘 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: PROMO VIDEO FACTORY

**Версия:** 2.1 (Gemini Native Stable)
**Дата:** 11.01.2026
**Цель:** Автоматическая конвертация статей в видео-формат (Shorts/Reels) с использованием нативных возможностей Gemini.

---

## 1. КОНЦЕПЦИЯ
*   **Формат:** Вертикальные (9:16) видео.
*   **Аудио:** **Gemini 2.5 Flash** (Native TTS via `speechConfig`).
*   **Голоса:** `Kore`, `Charon`, `Puck`, `Aoede`, `Fenrir`.
*   **Визуал:** AI-генерация + Наложение крупного текста (Canvas).

---

## 2. ТЕХНИЧЕСКИЙ СТЕК (CRITICAL)

### 2.1 Audio & TTS (Strict)
*   **SDK:** `@google/genai` (Google GenAI SDK for Node.js).
*   **Model:** `gemini-2.5-flash-preview-tts`.
*   **Method:** `generateContent` with `responseModalities: [Modality.AUDIO]`.
*   **Voice Config:** `speechConfig` -> `prebuiltVoiceConfig`.
*   **Audio Format Handling:**
    *   API возвращает **Raw PCM** (s16le, 24kHz, 1 channel).
    *   **ВАЖНО:** Необходимо вручную добавлять **WAV Header (RIFF)** перед сохранением файла, иначе FFmpeg не распознает формат (ошибка `Invalid data found`).
    *   *Запрещено:* Использовать `edge-tts`, `google-translate` или старые модели.

### 2.2 Visuals
*   **Generation:** Gemini Image Generation (`gemini-2.5-flash` or similar).
*   **Text Overlay:** `canvas` (Node.js).
    *   Белый текст, черный контур/тень.
    *   Расположение: Центр или низ (чтобы не перекрывать лицо).
    *   Шрифт: Читабельный Sans-serif (Impact, Arial Bold).

### 2.3 Rendering
*   **Engine:** `fluent-ffmpeg`.
*   **Animation:** `Ken Burns Effect` (ZoomPan).
    *   Formula: `zoompan=z='min(zoom+0.0015,1.5)':d=duration*25...`
*   **Input:** WAV files (with headers) + PNG images.

---

## 3. ПАЙПЛАЙН (WORKFLOW)

### ЭТАП 1: СЦЕНАРИЙ (GEMINI)
Gemini анализирует статью и отдает JSON-манифест.
*   *Input:* Текст статьи.
*   *Output:* JSON (очищенный от markdown-тегов).

### ЭТАП 2: ГЕНЕРАЦИЯ (PARALLEL)
1.  **Audio:** Текст -> Gemini API -> PCM -> Add WAV Header -> Save `.wav`.
2.  **Visuals:**
    *   Генерация изображения по промпту.
    *   Наложение `screen_text` через Canvas.

### ЭТАП 3: РЕНДЕР
*   Склейка сцен.
*   Эффект `Zoompan`.
*   Экспорт в MP4.

---

## 4. ИНСТРУКЦИЯ ПО ЗАПУСКУ

### Одиночный режим
```bash
npx tsx promo_video/src/cli.ts <path_to_article.md>
```

### Результаты
Видео сохраняется в папку статьи:
`articles/.../video_assets_<slug>/final_video.mp4`

**Доступ к видео (Strict):**
*   Base URL: `http://crosspostly.hopto.org:5005`
*   Path: `public/generated_videos/`
*   Format: `http://crosspostly.hopto.org:5005/generated_videos/<filename>.mp4`

---

## 5. FAQ / TROUBLESHOOTING

**Q: FFmpeg error "Invalid data found" on audio?**
A: Вы забыли добавить WAV-заголовок к ответу Gemini. API отдает сырой PCM. Используйте функцию `addWavHeader`.

**Q: Error "Model only supports text output"?**
A: Вы используете неправильную модель. Нужна `gemini-2.5-flash-preview-tts` (или актуальная версия с поддержкой аудио). Обычная `flash` модель может не поддерживать этот модальный режим в зависимости от версии API.

**Q: JSON Parse Error?**
A: Gemini любит оборачивать JSON в ````json ... ````. Используйте стриппинг (очистку) строки перед парсингом.