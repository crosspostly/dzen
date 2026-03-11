import { GoogleGenAI, Modality } from "@google/genai";
import { MASCOT_CONFIG } from "../config/mascot.config";
import { MODELS } from "../constants/MODELS_CONFIG";

/**
 * 🎨 ZenMaster v7.0 Image Generator (Mascot & Travel Edition)
 * 
 * Generates authentic smartphone photos from travels.
 * Focus: Food, Rituals, Landscapes, and our mascot "Baton".
 */
export class ImageGeneratorService {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * 🖼️ Generates an authentic travel smartphone photo
   */
  async generateVisual(sceneDescription: string, includeMascot: boolean = true): Promise<string | null> {
    const mascotPrompt = includeMascot ? `\nMASCOT INJECTION: ${MASCOT_CONFIG.image_prompt_injection}` : '';

    const finalPrompt = `
AUTHENTIC travel smartphone photo, taken on a modern smartphone (iPhone 14/15 or Samsung S23/S24).
CONTEXT: Global Travel, Food, Rituals, and Real Life.
Subject: ${sceneDescription}
${mascotPrompt}

REQUIREMENTS:
- 16:9 aspect ratio, horizontal orientation.
- NATURAL LIGHTING ONLY: bright sunlight, sunset glow, or dim indoor ritual lighting. No studio lights.
- TRAVEL REALISM: messy markets, authentic street food, real historical textures, slightly dusty roads.
- AMATEUR COMPOSITION: slightly off-center, looks like a person just "pointed and shot" with a phone.
- HIGH DETAIL: visible textures on food, fabric, and fur.
- COLOR: Natural, vibrant but not "fake" or oversaturated.
- AESTHETIC: "Like a photo from a traveler's Telegram or WhatsApp channel."

MUST AVOID:
- Stock/Glossy professional photography.
- Text, watermarks, or logos.
- Surrealism or AI-distorted anatomy.
- Western "luxury" hotel aesthetics (unless specified).
- Perfect models or professional posing.

STYLE: Realistic, authentic, documentary-style travel photography.
RESULT: 4K detail with smartphone camera characteristics (slight lens flare, natural depth of field).
`;

    try {
      const response = await this.ai.models.generateContent({
        model: MODELS.IMAGE.PRIMARY,
        contents: { 
          parts: [{ text: finalPrompt }] 
        },
        config: {
          responseModalities: [Modality.IMAGE],
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
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

  /**
   * 🔍 Validate travel scene description
   */
  validateDescription(description: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (description.length < 15) warnings.push('Description too short');
    
    const forbidden = /blood|violence|gun|knife|death|surreal/i;
    if (forbidden.test(description)) warnings.push('Forbidden content');

    return { valid: warnings.length === 0, warnings };
  }
}
