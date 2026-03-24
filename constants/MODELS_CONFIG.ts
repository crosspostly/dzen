/**
 * 🚨 КРИТИЧЕСКАЯ КОНФИГУРАЦИЯ МОДЕЛЕЙ (Актуальность: Март 2026)
 *
 * ВНИМАНИЕ: На дворе март 2026 года.
 * TEXT: Gemini 3.1 (флагман) / Gemini 2.5 (стабильный стандарт)
 * IMAGE: Imagen 3 (GA) — единственная рабочая image generation модель в Google AI SDK
 */

export const MODELS = {
  // 📝 ТЕКСТОВЫЕ МОДЕЛИ
  TEXT: {
    PRIMARY: "gemini-3.1-pro-preview",
    STABLE: "gemini-2.5-pro",
    FLASH: "gemini-2.5-flash",
    LITE: "gemini-3.1-flash-lite-preview",
    FALLBACK: "gemini-flash-latest",
  },

  // 🖼️ ГРАФИЧЕСКИЕ МОДЕЛИ
  // Реальные модели Google AI SDK (март 2026):
  // - imagen-3.0-generate-002 (GA, рекомендуется)
  // - imagen-3.0-fast-generate-001 (быстрый, менее детальный)
  // ВНИМАНИЕ: gemini-*-image-preview НЕ СУЩЕСТВУЕТ в SDK — fetch failed!
  IMAGE: {
    PRIMARY: "imagen-3.0-generate-002",
    STABLE: "imagen-3.0-generate-002",
    FAST: "imagen-3.0-fast-generate-001",
  },

  // 🔄 КАСКАД ПЕРЕКЛЮЧЕНИЯ
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
