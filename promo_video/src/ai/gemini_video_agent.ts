import { GoogleGenAI } from "@google/genai";
import { VideoManifest } from "../types.js";

export class GeminiVideoAgent {
    private client: GoogleGenAI;
    private model: string = "gemini-2.5-flash"; // Updated to 2.5 Flash

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("API Key is required for GeminiVideoAgent");
        this.client = new GoogleGenAI({ apiKey });
    }

    private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                // Check for Quota Exceeded (429) or Service Unavailable (503)
                if (error.status === 429 || error.code === 429 || error.status === 503) {
                    console.warn(`⚠️ Gemini API quota hit (Attempt ${i + 1}/${retries}). Waiting ${delay/1000}s...`);
                    await new Promise(r => setTimeout(r, delay * (i + 1))); // Exponential backoff
                } else {
                    throw error;
                }
            }
        }
        throw new Error(`Failed after ${retries} retries`);
    }

    async generateManifest(articleText: string): Promise<VideoManifest> {
        const prompt = `
Ты - топ-сценарист виральных TikTok/Reels драм.
Твоя задача - превратить скучную статью в 30-секундный ТРИЛЛЕР, от которого невозможно оторваться.

ВХОДНОЙ ТЕКСТ:
"${articleText.substring(0, 4000)}..."

ЦЕЛЬ:
Шокировать зрителя и заставить немедленно открыть полную статью.

ФОРМУЛА ИДЕАЛЬНОГО РОЛИКА (СТРОГО СОБЛЮДАЙ):
1.  **0-5 сек (HOOK):** Ударная фраза. Сразу в лоб. Никаких вступлений. (Пример: "Это смс разрушило мой брак за секунду").
2.  **5-20 сек (КОНФЛИКТ):** Только эмоции. Боль, предательство, шок. Короткие, рубленые фразы.
3.  **20-25 сек (КУЛЬМИНАЦИЯ):** Самый напряженный момент.
4.  **25-30 сек (CTA & CLIFFHANGER):** Оборви историю на пике и ОТПРАВЬ ЧИТАТЬ. (Пример: "Что я увидела дальше? Читайте в полной версии на канале!").

ПРАВИЛА ТЕКСТА (ОЗВУЧКИ):
- МАКСИМУМ 60 СЛОВ на весь ролик.
- Никаких "Однажды я...", "Жили-были...".
- Только активные глаголы.
- ТОЛЬКО прямая речь или внутренний монолог героя.
- БЕЗ ремарок (типа "Голос дрожит"). ТОЛЬКО СЛОВА.
- **ПОСЛЕДНЯЯ ФРАЗА:** Обязательно "Читайте продолжение..." или "Полная история на канале...".

ФОРМАТ ОТВЕТА (JSON):
{
    "title": "Кликбейтный заголовок статьи",
    "cover_text": "ЗАГОЛОВОК ДЛЯ ОБЛОЖКИ (3-4 слова, капсом, ШОК)",
    "hook": "Текст хука",
    "music_mood": "dark_suspense_drama",
    "voice_gender": "female",
    "character_description": "Woman, 40s, teary eyes, messy hair, wearing hoodie",
    "scenes": [
        {
            "id": 1,
            "text": "Я думала, он на работе. Но его машина стояла у подъезда.",
            "screen_text": "ОН БЫЛ ДОМА",
            "image_prompt": "Cinematic vertical 9:16 shot. Woman looking out window, shocked face, reflection in glass. Dramatic lighting.",
            "effect": "zoom_in"
        },
        {
            "id": 6,
            "text": "Я открыла дверь и замерла... Читайте, что было дальше, в статье 'Измена мужа' на канале.",
            "screen_text": "ЧИТАТЬ НА КАНАЛЕ 👇",
            "image_prompt": "Cinematic vertical 9:16 shot. Woman's hand reaching for a door handle, extreme close up, tense atmosphere.",
            "effect": "zoom_out"
        }
    ]
}

ВАЖНО:
- screen_text на РУССКОМ (2-3 слова, КРУПНО, ТРИГГЕРЫ).
- image_prompt на АНГЛИЙСКОМ (Vertical 9:16, Cinematic).
- Хронометраж: СТРОГО до 30 секунд.
- Верни ТОЛЬКО валидный JSON.
`;

        try {
            return await this.callWithRetry(async () => {
                const response = await this.client.models.generateContent({
                    model: this.model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json"
                    }
                });

                let text = response.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response from Gemini");

                // Cleanup Markdown code blocks if present
                text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

                const manifest = JSON.parse(text) as VideoManifest;
                
                // Basic validation
                if (!manifest.scenes || !Array.isArray(manifest.scenes)) {
                    throw new Error("Invalid manifest structure: missing scenes");
                }

                return manifest;
            });

        } catch (error) {
            console.error("❌ Gemini Video Agent Error:", error);
            throw error;
        }
    }

}
