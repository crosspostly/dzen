/**
 * КОНФИГУРАЦИЯ МОДЕЛЕЙ (Март 2026 - v2.5 STABLE ONLY)
 * 
 * ✅ STABLE MODELS (Production Ready):
 * - gemini-2.5-pro: флагман для сложного текста
 * - gemini-2.5-flash: быстрая универсальная
 * - gemini-2.5-flash-lite: максимальная скорость
 * - gemini-2.5-flash-image: генерация изображений
 * 
 * ❌ DEPRECATED (закрыты 9 марта 2026):
 * - gemini-3-pro-preview
 * - gemini-3.0-flash
 * 
 * ⚠️ PREVIEW (не использовать в production):
 * - gemini-3.1-pro-preview
 * - gemini-3.1-flash-lite-preview
 */

export const MODELS = {
  TEXT: {
    PRIMARY:  "gemini-2.5-pro",        // ✅ Стабильный флагман
    STABLE:   "gemini-2.5-pro",        // ✅ Тот же PRIMARY
    FLASH:    "gemini-2.5-flash",      // ✅ Быстрая универсальная
    LITE:     "gemini-2.5-flash-lite", // ✅ Максимальная скорость
    FALLBACK: "gemini-2.5-flash",      // ✅ Fallback на flash
  },

  IMAGE: {
    PRIMARY:  "gemini-2.5-flash-image", // ✅ Стабильная генерация фото
    STABLE:   "gemini-2.5-flash-image", // ✅ Тот же PRIMARY
    FAST:     "gemini-2.5-flash-image", // ✅ Без fallback на preview
  },

  WATERFALL: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ]
};

export const DEFAULT_TEXT_MODEL = MODELS.TEXT.PRIMARY;
export const DEFAULT_IMAGE_MODEL = MODELS.IMAGE.PRIMARY;
