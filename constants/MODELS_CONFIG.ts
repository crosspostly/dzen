/**
 * 🚨 КРИТИЧЕСКАЯ КОНФИГУРАЦИЯ МОДЕЛЕЙ (Актуальность: Март 2026)
 * 
 * ВНИМАНИЕ: На дворе март 2026 года. 
 * ЗАПРЕЩЕНО использовать модели серии 1.0, 1.5 (кроме GA 2.5) или 2.0 (EOL июнь 2026).
 * Использовать ТОЛЬКО серию Gemini 3.1 (флагман) или Gemini 2.5 (стабильный стандарт).
 */

export const MODELS = {
  // 📝 ТЕКСТОВЫЕ МОДЕЛИ (Актуальные на 10.03.2026)
  TEXT: {
    PRIMARY: "gemini-3.1-pro-preview",       // ТОП-1: Лучшая логика и Сказ
    STABLE: "gemini-2.5-pro",                // ТОП-2: Стабильная GA версия
    FLASH: "gemini-2.5-flash",               // Высокая скорость
    LITE: "gemini-3.1-flash-lite-preview",   // Ультра-эффективность (Launch: March 2026)
    FALLBACK: "gemini-flash-latest",         // Авто-ссылка на самую свежую Flash
  },
  
  // 🖼️ ГРАФИЧЕСКИЕ МОДЕЛИ (Nano Banana 2 Series)
  IMAGE: {
    PRIMARY: "gemini-3.1-flash-image-preview", // Новейшая генерация (Feb 2026)
    STABLE: "gemini-2.5-flash-image",          // Стабильный продакшн
  },

  // 🔄 КАСКАД ПЕРЕКЛЮЧЕНИЯ (Waterfall)
  // Иерархия строго от мощных 3.1 к быстрым 2.5. Никакого мусора 1.x!
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
