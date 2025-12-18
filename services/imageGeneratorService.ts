import { GoogleGenAI, Modality } from "@google/genai";

export class ImageGeneratorService {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * 🖼️ Генерирует изображение в стиле "бытовой реализм"
   */
  async generateVisual(sceneDescription: string): Promise<string | null> {
    // КРИТИЧЕСКАЯ ФОРМУЛА ПРОМПТА - НЕ МЕНЯТЬ!
    const finalPrompt = `Amateur lifestyle mobile photo, authentic domestic atmosphere, shot on mid-range smartphone, natural indoor lighting, no filters, messy background, highly realistic. Subject: ${sceneDescription}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [{ text: finalPrompt }] 
        },
        config: {
          responseModalities: [Modality.IMAGE],
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      // Извлекаем изображение из ответа
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              return `data:image/png;base64,${base64Data}`;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Image generation failed:', (error as Error).message);
      return null;
    }
  }
}