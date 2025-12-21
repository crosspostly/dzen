import { GoogleGenerativeAI } from "@google/generative-ai";
import { Modality } from "@google/generative-ai";

/**
 * 🎨 ZenMaster v3.5 Image Generator
 * 
 * Generates authentic mobile phone photos that look like real home photos
 * from Russian women (35-60 years old) taken on smartphones
 * 
 * Architecture: https://github.com/crosspostly/dzen/blob/main/docs/IMAGE_ARCHITECTURE.md
 */
export class ImageGeneratorService {
  private ai: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.ai = new GoogleGenerativeAI({ apiKey: key });
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
    // 🎯 ZenMaster v3.5 Prompt Formula
    // Based on proven architecture for authentic Russian domestic photos
    const finalPrompt = `
AUTHENTIC mobile phone photo, taken on mid-range smartphone (iPhone 2018-2020 or Samsung A-series).
Russian interior/domestic context.
Subject: ${sceneDescription}

REQUIREMENTS:
- 16:9 aspect ratio, horizontal orientation
- Natural lighting ONLY (window light, desk lamp, shadows - NO studio light)
- Domestic realism (old curtains, Soviet furniture, tea cups, packs, realistic clutter)
- Amateur framing (not professional composition)
- Depth of field (slight background blur)
- High realism with non-professional aesthetic
- Slight digital noise (like real smartphone camera)
- Authentic Russian woman typology (35-60 years, wrinkles, imperfect hair, simple clothes - halat, sweater, jacket)
- Natural colors (NOT oversaturated)

MUST AVOID:
- Stock photography or glossy/professional look
- Text, watermarks, or logos
- Surrealism or strange proportions
- Western style (no American kitchens with islands)
- Blood, violence, or shocking content
- Perfect models or professional posing
- Studio lighting
- Fancy interior design

STYLE: "Like a photo from a neighbor's WhatsApp" - authentic, slightly imperfect, real life.
RESULT: 4K detail but amateur aesthetic, like real home photo taken 2018-2020.
`;

    try {
      const model = this.ai.getGenerativeModel({ 
        model: 'gemini-2.5-flash-image',
        generationConfig: {
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
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
