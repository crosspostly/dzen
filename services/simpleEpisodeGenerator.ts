import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";

/**
 * 🎬 Simple Episode Generator v7.0
 * 
 * MAXIMUM SIMPLIFICATION - NO ANTI-DETECTION, NO CLEANUP
 * Just clean, human-like narrative from first person perspective
 * 
 * Key features:
 * - Single clear prompt (no 5000-line instructions)
 * - First person narrative ALWAYS
 * - Direct output ready for publication
 * - No Phase 2 processing
 * - No cleanup gates
 * - Just write it right the first time
 */
export class SimpleEpisodeGenerator {
  private geminiClient: GoogleGenAI;
  private temperature = 0.85; // Balanced creativity
  private useAntiDetection = false; // DISABLED by default

  constructor(apiKey?: string, options?: { useAntiDetection?: boolean }) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.useAntiDetection = options?.useAntiDetection ?? false;
  }

  /**
   * 🎯 Generate single episode with simple, clean prompt
   */
  async generateEpisode(
    outline: EpisodeOutline,
    previousContext?: string,
    charLimit: number = 3000
  ): Promise<Episode> {
    const prompt = this.buildSimplePrompt(outline, previousContext, charLimit);
    
    // Use gemini-2.0-flash (not lite) for better quality
    const model = "gemini-2.0-flash";

    try {
      const content = await this.callGemini({ prompt, model, temperature: this.temperature });
      
      return {
        id: outline.id,
        title: `Эпизод ${outline.id}`,
        content: content.trim(),
        charCount: content.trim().length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: "draft"
      };
    } catch (error) {
      console.error(`❌ Episode #${outline.id} failed:`, error);
      throw error;
    }
  }

  /**
   * 📝 SIMPLE PROMPT - Write clean narrative from first person
   * No complex rules, no anti-detection, just write well
   */
  private buildSimplePrompt(
    outline: EpisodeOutline,
    previousContext: string = "",
    charLimit: number
  ): string {
    return `Напиши художественный рассказ от первого лица для публикации в блоге.

Тема: "${outline.theme}"
Эпизод №${outline.id}

Сюжет:
${outline.externalConflict}
${outline.internalConflict}

Ключевой момент: ${outline.keyTurning}

${previousContext ? `Продолжение предыдущего эпизода:\n${previousContext}\n` : ''}

---

⚠️ ВАЖНЫЕ ТРЕБОВАНИЯ:

1️⃣ ОТ ПЕРВОГО ЛИЦА ВСЕГДА!
   - Пиши "я увидела", "мне показалось", "я думала"
   - Никогда "героиня увидела", "персонаж почувствовал"
   - Это исповедь, дневник, личная история

2️⃣ ЧИСТОВЫЙ СТИЛЬ
   - Без повторов фраз-паразитов ("вот в чём дело", "может быть", "одним словом")
   - Без оборванных фраз в начале предложений ("ну и", "да вот", "вот только")
   - Без метаданных в квадратных скобках [note], [TODO]
   - Без markdown: **жирный**, ##заголовок

3️⃣ ЕСТЕСТВЕННЫЙ ЯЗЫК
   - Разговорный русский, современный
   - Диалоги: 35-40% текста
   - Сенсорные детали: зрение, слух, осязание, запах
   - Короткие и средние предложения (до 15 слов)

4️⃣ СТРУКТУРА ЭПИЗОДА
   - Завязка: погружение в действие
   - События с диалогами
   - Эмоциональные повороты
   - Оставить вопрос для следующего эпизода

5️⃣ ОБЪЁМ: ${charLimit} символов
   - Напиши именно столько, сколько нужно для истории
   - Не растягивай и не обрезай принудительно

---

Начинай сразу с действия или мысли. Никаких вступлений "я расскажу вам...".
Пиши так, будто рассказываешь историю лучшей подруге.

Напиши текст эпизода.`;
  }

  /**
   * 📞 Call Gemini API
   */
  private async callGemini({
    prompt,
    model,
    temperature
  }: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    const response = await this.geminiClient.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8000
      }
    });

    const text = response.response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  }
}
