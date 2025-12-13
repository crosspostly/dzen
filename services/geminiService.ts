
import { GoogleGenAI, Modality, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateFreshThemes() {
    const prompt = `Сгенерируй 5 ОСТРЫХ, провокационных заголовков для Яндекс.Дзен (CTR++). JSON массив строк.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    try { return JSON.parse(response.text); } catch { return ["Ошибка тем"]; }
  }

  async generateArticleData(params: { theme: string; customHint?: string; }) {
    const { theme, customHint } = params;

    const systemInstruction = `
      ТЫ — ЭЛИТНЫЙ РЕДАКТОР ДЗЕНА. ТВОЯ ЗАДАЧА: СОЗДАТЬ ГЛУБОКИЙ, МНОГОСЛОЙНЫЙ ТЕКСТ.
      
      ЭТАПЫ ТВОЕЙ РАБОТЫ (выполни их последовательно внутри одного ответа):
      1. ПЛАН: Продумай экспозицию, нарастание конфликта, кульминацию и "добивку".
      2. ЧЕРНОВИК: Напиши историю на 15 000 знаков. Используй детали быта (запах старого линолеума, дребезжание ложки).
      3. ШЛИФОВКА ДИАЛОГОВ: Замени все скучные "сказал/ответил" на: "процедил", "усмехнулся", "вспылил", "бросил через плечо", "пролепетала", "отрезал".
      4. УСИЛЕНИЕ ХУКОВ: Сделай первый абзац максимально бьющим в цель.
      
      ПРАВИЛА ЯЗЫКА:
      - Никакой "воды" и ИИ-шных выводов.
      - Персонажи должны иметь свои речевые особенности (бабка ворчит, муж мямлит).
      - Эмоциональные качели: от спокойствия к ярости.
      
      ОТВЕТ В ФОРМАТЕ JSON: 
      { 
        "title": "Заголовок", 
        "content": "Текст с ## заголовками", 
        "imageScenes": ["Scene 1", "Scene 2", "Scene 3"]
      }
    `;

    const prompt = `ТЕМА: ${theme}. ДОПОЛНИТЕЛЬНО: ${customHint || 'Нет'}. 
    Напиши историю, от которой у читателя закипит кровь от несправедливости. Сделай её длинной и детализированной.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 },
        temperature: 0.95,
      },
    });

    try { return JSON.parse(response.text); } catch { return { title: "Ошибка", content: response.text, imageScenes: [] }; }
  }

  async checkHumanity(text: string) {
    const prompt = `Оцени текст на признаки ИИ. Выдай JSON { "score": 0-100, "tips": ["короткий совет"] }. Текст: ${text.substring(0, 2000)}`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    try { return JSON.parse(response.text); } catch { return { score: 50, tips: [] }; }
  }

  async generateVisual(sceneDescription: string) {
    const prompt = `Realistic smartphone photo, amateur lighting, messy russian apartment, raw emotion, pov. Subject: ${sceneDescription}. 16:9.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data 
      ? `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}` 
      : null;
  }
}

export const geminiService = new GeminiService();
