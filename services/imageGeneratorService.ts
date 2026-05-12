import { GoogleGenAI, Modality } from "@google/genai";

/**
 * 🎨 ZenMaster v3.5 Image Generator
 * 
 * Generates authentic mobile phone photos that look like real home photos
 * from Russian women (35-60 years old) taken on smartphones
 * 
 * Architecture: https://github.com/crosspostly/dzen/blob/main/docs/IMAGE_ARCHITECTURE.md
 */
export class ImageGeneratorService {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * 🖼️ Generates an authentic mobile phone photo
   * 
   * MUST HAVE:
   * - 16:9 aspect ratio (horizontal)
   * - Domestic realism (recognizable details: old curtains, cups, packs, USSR furniture)
   * - Natural lighting (window light, desk lamp, shadows)
   * - "Live photo" effect (slight digital noise, natural depth of field)
   * - Real-looking people (wrinkles, imperfect hairstyles, simple clothes)
   * 
   * MUST NOT:
   * - Stock/glossy photos
   * - Text/watermarks
   * - Surrealism
   * - Western style (no American kitchens)
   * - Dark/shocking content
   */
  async generateVisual(sceneDescription: string): Promise<string | null> {
    // 🎯 ZenMaster v5.0 Prompt Formula: "Barbaric Elegance"
    // Based on the new provocative strategy: luxury, self-sufficiency, and sharp aesthetic
    const finalPrompt = `
AUTHENTIC cinematic photo, captured on a high-end smartphone (iPhone 15 Pro or similar).
Modern Russian urban luxury aesthetic. 
Subject: ${sceneDescription}

REQUIREMENTS:
- 16:9 aspect ratio, horizontal orientation
- Dramatic, sophisticated lighting (golden hour, soft window light, deep shadows)
- Aesthetic of "Barbaric Elegance": high-quality materials (silk, leather, heavy gold jewelry, expensive textures)
- Character: Stunningly well-groomed Russian woman (34-36 years old), profound and self-assured gaze, "intellectual scalpel" vibe.
- Setting: Expensive modern interior (minimalist, textured walls, designer furniture) or high-end urban environment.
- Amateur-chic framing: feels like a deliberate, high-quality social media post from a powerful woman.
- Sharp focus on the character, slight cinematic depth of field.
- Natural but rich colors (luxury palette: deep blacks, creams, gold, burgundy, cold silk tones).

MUST AVOID:
- Cheap or "neighbor-like" aesthetic.
- Soviet furniture, old curtains, or domestic clutter.
- Stock photography look or overly posed studio look.
- Low-quality smartphone noise or heavy digital artifacts.
- Western generic stock style or "perfect" AI models.
- Watermarks, text, or logos.

STYLE: "Cold, expensive, and intellectual" - authentic luxury life of a self-made woman who has "reached herself" (дошла себя).
RESULT: 8K hyper-realistic detail with a high-end personal brand aesthetic.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [{ text: finalPrompt }] 
        },
        config: {
          responseModalities: [Modality.IMAGE],
          temperature: 0.85,  // Slightly lower for consistency
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      // Extract image from response
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

  /**
   * 🔍 Validate scene description for better image generation
   * 
   * Good descriptions:
   * - "Woman 35-40 in kitchen, making tea, natural morning light from window"
   * - "Two friends talking at table, one crying, holding hands, Soviet interior"
   * - "Young mother with child on couch, sunlight, morning atmosphere"
   * 
   * Bad descriptions:
   * - "woman" (too generic)
   * - "happy people" (unclear context)
   * - "surreal landscape" (wrong domain)
   */
  validateDescription(description: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check length
    if (description.length < 20) {
      warnings.push('Description too short (min 20 chars)');
    }
    if (description.length > 500) {
      warnings.push('Description too long (max 500 chars)');
    }

    // Check for necessary elements
    const hasWho = /woman|man|person|мужчин|женщин|люди/i.test(description);
    const hasWhere = /kitchen|room|couch|table|window|home|кухн|комнат|диван|окн|дом/i.test(description);
    const hasWhat = /sit|stand|talk|cry|make|hold|read|think|сид|стоит|говор|плач|дел|держ|читает/i.test(description);

    if (!hasWho) warnings.push('No person/people mentioned');
    if (!hasWhere) warnings.push('No location/setting mentioned');
    if (!hasWhat) warnings.push('No action/activity mentioned');

    // Check for forbidden content
    const forbidden = /blood|violence|gun|knife|death|surreal|alien|magic|ghost|крови|насил|смерт|сюр|инопл|привид/i;
    if (forbidden.test(description)) {
      warnings.push('Description contains forbidden content');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}
