/**
 * КОНФИГУРАЦИЯ МОДЕЛЕЙ (Март 2026)
 * IMAGE: gemini-2.5-flash-image — generateContent + Modality.IMAGE
 * НЕ используем Imagen (только predict/Vertex AI)
 */

export const MODELS = {
  TEXT: {
    PRIMARY:  "gemini-3.1-pro-preview",
    STABLE:   "gemini-2.5-pro",
    FLASH:    "gemini-2.5-flash",
    LITE:     "gemini-3.1-flash-lite-preview",
    FALLBACK: "gemini-flash-latest",
  },

  IMAGE: {
    PRIMARY:  "gemini-3-pro-image-preview",   // лучшее качество
    STABLE:   "gemini-2.5-flash-image",        // стабильный
    FAST:     "gemini-2.5-flash-image",        // fallback
  },

  WATERFALL: [
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite-preview"
  ]
};

export const DEFAULT_TEXT_MODEL = MODELS.TEXT.PRIMARY;
export const DEFAULT_IMAGE_MODEL = MODELS.IMAGE.PRIMARY;
