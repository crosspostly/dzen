/**
 * 🎨 ZenMaster v4.2 - Image Generator Agent
 * 
 * Generates authentic mobile phone photos for Zen articles
 * Features:
 * - SPECIFIC, actionable image prompts (not vague guidance)
 * - Detailed visual instructions from article context
 * - PlotBible-consistent image prompts
 * - Fallback on generation failure
 * - Image validation (dimensions, size, format)
 * - SAFE plotBible handling with defaults
 * 
 * Architecture: Multi-agent system with rate limiting
 */

import { GoogleGenAI, Modality } from "@google/genai";
import {
  ImageGenerationRequest,
  CoverImageRequest,
  GeneratedImage,
  ExtractedScene,
  PromptComponents,
  ImageValidationResult,
  ImageGenerationConfig
} from "../types/ImageGeneration";
import { PlotBible } from "../types/PlotBible";

export class ImageGeneratorAgent {
  private geminiClient: GoogleGenAI;
  private config: ImageGenerationConfig;
  private fallbackModel = "gemini-2.5-flash-lite";
  private primaryModel = "gemini-2.5-flash-image";

  constructor(apiKey?: string, config?: Partial<ImageGenerationConfig>) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    
    this.config = {
      aspectRatio: "16:9",
      quality: "high",
      format: "jpeg",
      maxRetries: 2,
      retryDelay: 3000,
      rateLimit: 1,
      enableFallback: true,
      optimizeForZen: true,
      ...config
    };
  }

  /**
   * 🎯 v4.2: Generate ONE cover image from title + lede + plot context
   * REWRITTEN: Specific, actionable prompts instead of vague guidance
   */
  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating COVER image for article: "${request.title}"`);

    try {
      // Build prompt from lede + plotBible context
      const prompt = this.buildCoverImagePrompt(request);
      console.log(`📝 Cover prompt built (${prompt.length} chars)`);

      // Generate with primary model
      const image = await this.generateWithModel(
        this.primaryModel,
        prompt,
        request.articleId
      );

      console.log(`✅ Cover image generated successfully for article ${request.articleId}`);
      return image;

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.warn(`⚠️  Primary generation failed: ${errorMsg}`);

      // Try fallback if enabled
      if (this.config.enableFallback) {
        console.log(`🔄 Attempting fallback cover generation...`);
        return await this.generateCoverImageFallback(request);
      }

      throw error;
    }
  }

  /**
   * 🎨 BUILD COVER IMAGE PROMPT - v4.2 REWRITE
   * 
   * PRINCIPLE: Specific instructions, not vague requests
   * Use concrete visual details from the article story
   * 
   * Previous (BAD):
   * - "SENSORY PALETTE: warm, intimate, quiet, domestic"
   * - "Amateur framing (NOT professional composition)"
   * - "Depth of field (slight background blur)"
   * 
   * NEW (GOOD):
   * - "Woman sitting at kitchen table, morning sunlight from left window, hands holding warm tea cup"
   * - "Camera positioned 2 meters away, slightly above table height, some blur on background wall"
   * - "Shot on iPhone 11, 2018-2020 era smartphone camera sensor, visible compression artifacts"
   */
  private buildCoverImagePrompt(request: CoverImageRequest): string {
    const { title, ledeText, plotBible } = request;

    // SAFE: Use defaults if plotBible missing
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
    const sensory = plotBible?.sensoryPalette || { 
      details: ['warm', 'intimate', 'quiet', 'domestic'],
      smells: [],
      sounds: [],
      textures: [],
      lightSources: ['window light']
    };

    // Extract KEY VISUAL ELEMENTS from lede
    // These are specific things that should be IN the image
    const visuals = this.extractVisualElements(ledeText, sensory);
    const mainObject = visuals.mainObject || "person in apartment";
    const specificLocation = visuals.location || "kitchen table";
    const lightingCondition = visuals.lighting || "morning sunlight from window";
    const cameraDistance = visuals.distance || "2-3 meters";
    const cameraHeight = visuals.height || "slightly above eye level";

    // Build VERY SPECIFIC prompt
    const finalPrompt = `
🎯 OBJECTIVE: Create a cover photo for Russian lifestyle article titled: "${title}"

📸 MAIN SUBJECT:
${this.buildSubjectDescription(narrator, mainObject)}

🏠 LOCATION & COMPOSITION:
- Setting: ${specificLocation} (Russian interior, authentic lived-in space, NOT staged)
- Camera positioning: ${cameraDistance} from subject, ${cameraHeight}
- Frame: ${this.selectFramingType(visuals.mood)}
- Visible in frame: ${visuals.framingDetails.join(', ')}

💡 LIGHTING:
- Light source: ${lightingCondition}
- Quality: Natural, soft, NOT harsh or studio-lit
- Shadows: Visible but not dramatic, creates depth
- Color temperature: Warm (golden/amber tone) - like afternoon light through curtains
- No backlighting or complex multi-source lighting

📱 CAMERA & IMAGE CHARACTERISTICS:
- Device: Smartphone camera (iPhone 11 or Samsung Galaxy A10-A20, 2018-2020 era)
- Sensor size: 1/1.6" (typical smartphone)
- Lens: Standard 26-28mm equivalent focal length
- Shutter speed: 1/125s-1/250s (sharp, no motion blur)
- ISO: 400-800 (visible noise is GOOD - proves it's real photo)
- White balance: Slightly warm, matches light source
- Compression: JPEG quality 80-85%, visible blocking artifacts on edges (authentic smartphone compression)

🎨 VISUAL STYLE:
- Colors: Natural, NOT saturated or filtered. Slight yellow/warm cast from lighting
- Contrast: Medium (real phone photos aren't ultra-high contrast)
- Depth of field: f/2.0-f/2.8 equivalent (slight blur in background, sharp on subject)
- Background blur: Out-of-focus apartment elements (wall, furniture, blurred)
- Details: Sharp on person/main subject, progressively blurry behind

❤️ EMOTIONAL TONE:
Mood: ${visuals.mood}
Expression: ${this.getEmotionExpression(visuals.mood)}
Atmosphere: Authentic moment captured, NOT posed. Real feelings visible. Vulnerable.

🚫 ABSOLUTE PROHIBITIONS:
- ❌ NO TEXT, CAPTIONS, WATERMARKS, LOGOS anywhere on image
- ❌ NO FILTER OVERLAY (no Instagram filters, no face beautification, no color grading)
- ❌ NO PROFESSIONAL MAKEUP or styling (should look like morning/everyday makeup)
- ❌ NO PERFECT POSING (avoid looking at camera, or look naturally)
- ❌ NO STOCK PHOTO AESTHETIC (no perfect lighting, no glossy surfaces, no fake props)
- ❌ NO AI-ART ARTIFACTS (proper hands with 5 fingers, correct proportions, realistic anatomy)
- ❌ NO WESTERN STYLE (no American kitchens, no English text, no Western fashion)
- ❌ NO SURREALISM (everything must be physically plausible)
- ❌ NO VIOLENCE, GORE, SHOCKING CONTENT

✅ WHAT MAKES IT PASS Яндекс.Дзен MODERATION:
- Looks like real phone photo from 2018-2022
- Visible smartphone camera sensors marks (noise, compression)
- Natural domestic Russian setting
- Real human emotion without exaggeration
- No AI-art giveaways (anatomy correct, hands proper, proportions real)
- No text overlays or captions

📌 INSPIRATION REFERENCE:
Think like: candid photo from family WhatsApp group chat
NOT like: professional portrait, stock photo, filtered Instagram post, TikTok video frame

🔥 CRITICAL SUCCESS METRIC:
When Яндекс.Дзен moderator sees this image, they should think "this is a real person's real moment from their real life" - NOT "this is AI-generated".
    `.trim();

    return finalPrompt;
  }

  /**
   * Extract specific visual elements from article text
   */
  private extractVisualElements(ledeText: string, sensory: any) {
    const lower = ledeText.toLowerCase();
    
    // Detect main subject
    let mainObject = "person in apartment";
    if (lower.includes('сидел') || lower.includes('стоял') || lower.includes('лежал')) {
      const action = lower.includes('сидел') ? 'sitting' : lower.includes('стоял') ? 'standing' : 'lying';
      mainObject = `woman ${action}, ${lower.includes('плак') || lower.includes('слез') ? 'emotional' : 'contemplative'}`;
    }

    // Detect location
    let location = "apartment interior";
    if (lower.includes('кухн')) location = "kitchen table";
    if (lower.includes('спальн')) location = "bedroom, near bed";
    if (lower.includes('гостин')) location = "living room, on couch";
    if (lower.includes('окн')) location = "near window, looking outside";
    if (lower.includes('балкон')) location = "balcony";

    // Detect lighting
    let lighting = "morning sunlight through window";
    if (lower.includes('веч') || lower.includes('закат')) lighting = "evening golden light from window";
    if (lower.includes('ноч')) lighting = "warm lamp light, dark outside";
    if (lower.includes('дождь')) lighting = "grey overcast daylight, rain outside";

    // Detect mood
    let mood = "thoughtful";
    if (lower.includes('плак') || lower.includes('слез')) mood = "sad, tearful";
    if (lower.includes('радост') || lower.includes('счаст')) mood = "happy, peaceful";
    if (lower.includes('гнев') || lower.includes('злост')) mood = "tense, angry";
    if (lower.includes('страх') || lower.includes('боял')) mood = "anxious, worried";
    if (lower.includes('облегчен') || lower.includes('спокой')) mood = "relieved, calm";

    // Detect framing details
    const framingDetails = [];
    if (lower.includes('чай') || lower.includes('кофе')) framingDetails.push("cup of tea/coffee in frame");
    if (lower.includes('фото') || lower.includes('снимок')) framingDetails.push("old photos visible");
    if (lower.includes('книг')) framingDetails.push("books on table");
    if (lower.includes('окн')) framingDetails.push("window and outside visible");
    if (lower.includes('стен')) framingDetails.push("wall texture visible");

    return {
      mainObject,
      location,
      lighting,
      mood,
      distance: "2-3 meters",
      height: "slightly above eye level",
      framingDetails: framingDetails.length > 0 ? framingDetails : ["apartment interior", "natural elements"]
    };
  }

  /**
   * Build subject description from narrator profile
   */
  private buildSubjectDescription(narrator: any, mainObject: string): string {
    const genderDesc = narrator.gender === 'female' ? 'Woman' : 'Man';
    const ageRange = `${narrator.age - 5}-${narrator.age + 5} years old`;
    
    return `
- Person: Russian ${genderDesc} aged ${ageRange}
- Appearance: Natural, everyday look - NO heavy makeup, NO perfect styling
- Clothing: Comfortable home clothes (sweater, t-shirt, or casual dress)
- Expression: ${narrator.tone === 'confessional' ? 'Vulnerable, honest expression - real emotion visible' : 'Calm, thoughtful, introspective'}
- Hands: Visible in frame (holding cup, or resting on table)
- Activity: ${mainObject}`;
  }

  /**
   * Select framing based on mood
   */
  private selectFramingType(mood: string): string {
    if (mood.includes('sad') || mood.includes('tearful')) {
      return "Medium close-up (from shoulders up), soft focus, intimate";
    } else if (mood.includes('happy') || mood.includes('peaceful')) {
      return "Wide shot showing environment context, light and airy";
    } else if (mood.includes('anxious') || mood.includes('tense')) {
      return "Medium shot, slight diagonal composition, creates dynamic tension";
    } else {
      return "Medium shot, centered or rule-of-thirds composition, natural and balanced";
    }
  }

  /**
   * Get specific emotion expression description
   */
  private getEmotionExpression(mood: string): string {
    const expressions: Record<string, string> = {
      'sad': "Eyes looking down or away, slight frown, visible tears or puffy eyes",
      'happy': "Soft smile or peaceful expression, relaxed shoulders, open posture",
      'anxious': "Uncertain expression, hands near face, tense shoulders",
      'angry': "Firm jaw, direct gaze, tense body",
      'relieved': "Deep breath visible, shoulders relaxed, gentle smile",
      'thoughtful': "Looking away or at something specific, hand on chin or hands clasped",
    };

    for (const [key, value] of Object.entries(expressions)) {
      if (mood.includes(key)) return value;
    }

    return "Natural, neutral expression - person absorbed in their thoughts";
  }

  /**
   * Fallback cover generation - SIMPLIFIED BUT SPECIFIC
   */
  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Using fallback model: ${this.fallbackModel}`);

    const narrator = request.plotBible?.narrator || { age: 40, gender: 'female' };
    const genderDesc = narrator.gender === 'female' ? 'Woman' : 'Man';

    const fallbackPrompt = `
📸 FALLBACK: Russian ${genderDesc} ${narrator.age} years old in apartment, real smartphone photo aesthetic

🏠 COMPOSITION:
- Location: Kitchen or living room (Russian apartment interior)
- Subject: Person sitting or standing naturally, comfortable clothing
- Distance: 2-3 meters away, camera at chest/eye level
- Lighting: Warm natural light from window, soft shadows

📱 PHOTO CHARACTERISTICS:
- Device: 2018-2020 smartphone camera (iPhone 11 or Samsung Galaxy A)
- Quality: JPEG compression artifacts visible (realistic noise, quality ~80%)
- Colors: Warm natural tones, NOT filtered or oversaturated
- Depth: Slightly blurred background, sharp on person

❌ CRITICAL - DO NOT:
- NO text, captions, watermarks anywhere
- NO filters or Instagram effects
- NO stock photo look
- NO AI-art artifacts (proper hands, real anatomy)
- NO professional styling or makeup
- NO surrealism or impossible things

✅ GOAL:
Photo looks like it was taken by a friend on their old phone - authentic, real, everyday moment.
    `.trim();

    try {
      return await this.generateWithModel(
        this.fallbackModel,
        fallbackPrompt,
        request.articleId
      );
    } catch (error) {
      console.error(`❌ Fallback also failed:`, (error as Error).message);
      throw new Error(`Both primary and fallback cover generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * @deprecated Use generateCoverImage instead. This generates per-episode images (old v4.0)
   * Main entry point: Generate image from episode
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating image for episode ${request.episodeId}...`);

    try {
      // Extract key scene from text
      const scene = this.extractKeyScene(request.episodeText, request.plotBible);
      console.log(`📸 Scene extracted: ${scene.who} - ${scene.what}`);

      // Build image prompt
      const promptComponents = this.buildImagePrompt(scene, request.plotBible, request.emotion);
      console.log(`📝 Prompt built (${promptComponents.finalPrompt.length} chars)`);

      // Generate with primary model
      const image = await this.generateWithModel(
        this.primaryModel,
        promptComponents.finalPrompt,
        request.episodeId
      );

      console.log(`✅ Image generated successfully for episode ${request.episodeId}`);
      return image;

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.warn(`⚠️  Primary generation failed: ${errorMsg}`);

      // Try fallback if enabled
      if (this.config.enableFallback) {
        console.log(`🔄 Attempting fallback generation...`);
        return await this.generateImageFallback(request);
      }

      throw error;
    }
  }

  /**
   * Extract key scene from episode text
   */
  private extractKeyScene(episodeText: string, plotBible: PlotBible): ExtractedScene {
    const lines = episodeText.split('\n').filter(l => l.trim().length > 0);
    
    let bestParagraph = lines[0] || '';
    let maxSensoryScore = 0;

    for (const line of lines) {
      const score = this.calculateSensoryScore(line, plotBible.sensoryPalette);
      if (score > maxSensoryScore) {
        maxSensoryScore = score;
        bestParagraph = line;
      }
    }

    const who = this.extractWho(bestParagraph, plotBible);
    const what = this.extractWhat(bestParagraph);
    const where = this.extractWhere(bestParagraph, plotBible);
    const lighting = this.extractLighting(bestParagraph, plotBible);
    const mood = this.extractMood(bestParagraph);
    const sensoryDetails = this.extractSensoryDetails(bestParagraph, plotBible);

    return {
      who,
      what,
      where,
      lighting,
      mood,
      sensoryDetails,
      confidence: maxSensoryScore > 0 ? Math.min(maxSensoryScore / 10, 1) : 0.5
    };
  }

  /**
   * Build prompt from scene
   */
  private buildImagePrompt(
    scene: ExtractedScene,
    plotBible: PlotBible,
    emotion?: string
  ): PromptComponents {
    const subject = `${scene.who}, ${scene.what}`;
    const setting = `${scene.where}, Russian interior/domestic context`;
    const lighting = scene.lighting;
    const style = "AUTHENTIC mobile phone photo, taken on mid-range smartphone (iPhone 2018-2020 or Samsung A-series)";
    
    const requirements = [
      `Natural lighting: ${lighting}`,
      `Domestic realism: ${plotBible.sensoryPalette.details.join(', ')}`,
      "Amateur framing (not professional composition)",
      "Depth of field (slight background blur)",
      "Slight digital noise (like real smartphone camera)",
      `Narrator context: ${plotBible.narrator.age} years old, ${plotBible.narrator.tone}`,
      emotion ? `Emotion: ${emotion}` : `Mood: ${scene.mood}`,
      "Natural colors (NOT oversaturated)"
    ];

    const avoidances = [
      "Stock photography or glossy look",
      "Text, watermarks, or logos",
      "Surrealism or strange proportions",
      "Western style (no American kitchens)",
      "Violence or shocking content",
      "Perfect models or professional posing",
      "Studio lighting",
      "Fancy interior design"
    ];

    const finalPrompt = `
${style}
Subject: ${subject}
Setting: ${setting}

REQUIREMENTS:
${requirements.map(r => `- ${r}`).join('\n')}

SENSORY DETAILS TO INCLUDE:
${scene.sensoryDetails.map(d => `- ${d}`).join('\n')}

MUST AVOID:
${avoidances.map(a => `- ${a}`).join('\n')}

🔥 CRITICAL: NO TEXT ON IMAGE!
STYLE: Like a photo from neighbor's WhatsApp - authentic, slightly imperfect, real life.
RESULT: 4K detail but amateur aesthetic, like real home photo taken 2018-2020.
`.trim();

    return {
      subject,
      setting,
      lighting,
      style,
      requirements,
      avoidances,
      finalPrompt
    };
  }

  /**
   * Generate image with specified model
   */
  private async generateWithModel(
    model: string,
    prompt: string,
    idForMetadata: string | number
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    const response = await this.geminiClient.models.generateContent({
      model: model,
      contents: { 
        parts: [{ text: prompt }] 
      },
      config: {
        responseModalities: [Modality.IMAGE],
        temperature: 0.85,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        imageConfig: {
          aspectRatio: "16:9"
        } as any
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates in response");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error("No content parts in response");
    }

    let base64Data: string | null = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data;
        break;
      }
    }

    if (!base64Data) {
      throw new Error("No image data in response");
    }

    console.log(`   📦 Received base64 image from Gemini API (${base64Data.length} chars)`);

    const generatedImage: GeneratedImage = {
      id: `img_${idForMetadata}_${Date.now()}`,
      base64: base64Data,
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75),
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
      metadata: {
        articleId: typeof idForMetadata === 'string' ? idForMetadata : `article_${idForMetadata}`,
        generationAttempts: 1,
        fallbackUsed: model !== this.primaryModel,
        episodeId: typeof idForMetadata === 'number' ? idForMetadata : undefined
      }
    };

    const validation = this.validateImage(generatedImage);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`✅ Image generated in ${Date.now() - startTime}ms`);
    return generatedImage;
  }

  /**
   * Fallback generation
   */
  private async generateImageFallback(request: ImageGenerationRequest): Promise<GeneratedImage> {
    console.log(`🔄 Using fallback model: ${this.fallbackModel}`);

    const simplifiedPrompt = `
Russian woman ${request.plotBible.narrator.age} years old in apartment, natural light, realistic photo on smartphone.
Emotion: ${request.emotion || request.plotBible.narrator.tone}
Interior: ${request.plotBible.sensoryPalette.details.slice(0, 3).join(', ')}
Amateur photo aesthetic, NOT stock photography.
🔥 NO TEXT ON IMAGE!
    `.trim();

    try {
      return await this.generateWithModel(
        this.fallbackModel,
        simplifiedPrompt,
        request.episodeId
      );
    } catch (error) {
      console.error(`❌ Fallback also failed:`, (error as Error).message);
      throw new Error(`Both primary and fallback generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate image
   */
  validateImage(image: GeneratedImage): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const dimensionsOk = image.width === 1920 && image.height === 1080;
    if (!dimensionsOk) {
      errors.push(`Invalid dimensions: ${image.width}x${image.height} (expected 1920x1080)`);
    }

    const aspectRatio = image.width / image.height;
    const aspectRatioOk = Math.abs(aspectRatio - (16/9)) < 0.01;
    if (!aspectRatioOk) {
      warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)} not exactly 16:9`);
    }

    const sizeOk = image.fileSize > 10000 && image.fileSize < 5000000;
    if (!sizeOk) {
      warnings.push(`Unusual file size: ${image.fileSize} bytes`);
    }

    const formatOk = image.mimeType === "image/jpeg" || image.mimeType === "image/jpg";
    if (!formatOk) {
      errors.push(`Invalid format: ${image.mimeType}`);
    }

    if (!image.base64 || image.base64.length < 100) {
      errors.push("Base64 data missing or too short");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        dimensionsOk,
        sizeOk,
        formatOk,
        aspectRatioOk
      }
    };
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  private calculateSensoryScore(text: string, palette: PlotBible['sensoryPalette']): number {
    let score = 0;
    const lower = text.toLowerCase();

    for (const smell of palette.smells || []) {
      if (lower.includes(smell.toLowerCase())) score += 2;
    }
    for (const sound of palette.sounds || []) {
      if (lower.includes(sound.toLowerCase())) score += 2;
    }
    for (const texture of palette.textures || []) {
      if (lower.includes(texture.toLowerCase())) score += 2;
    }
    for (const detail of palette.details || []) {
      if (lower.includes(detail.toLowerCase())) score += 1;
    }

    const visualVerbs = ['смотрел', 'видел', 'увидел', 'заметил', 'разглядывал'];
    for (const verb of visualVerbs) {
      if (lower.includes(verb)) score += 1;
    }

    return score;
  }

  private extractWho(text: string, plotBible: PlotBible): string {
    const age = plotBible.narrator?.age || 40;
    const gender = plotBible.narrator?.gender === "male" ? "Man" : "Woman";
    return `${gender} ${Math.floor(age / 10) * 10}s`;
  }

  private extractWhat(text: string): string {
    const actions = ['сидел', 'стоял', 'смотрел', 'держал', 'читал', 'писал', 'говорил'];
    for (const action of actions) {
      if (text.toLowerCase().includes(action)) {
        return action.replace('л', 'ing');
      }
    }
    return "in domestic scene";
  }

  private extractWhere(text: string, plotBible: PlotBible): string {
    const locations = ['кухн', 'комнат', 'окн', 'стол', 'диван', 'кровать'];
    for (const loc of locations) {
      if (text.toLowerCase().includes(loc)) {
        const locationMap: Record<string, string> = {
          'кухн': 'kitchen',
          'комнат': 'room',
          'окн': 'near window',
          'стол': 'at table',
          'диван': 'on couch',
          'кровать': 'on bed'
        };
        return locationMap[loc] || 'room';
      }
    }
    return "Russian apartment interior";
  }

  private extractLighting(text: string, palette: PlotBible['sensoryPalette']): string {
    const lower = text.toLowerCase();
    
    for (const light of palette.lightSources || []) {
      if (lower.includes(light.toLowerCase())) {
        return light;
      }
    }

    if (lower.includes('утр') || lower.includes('morning')) return "morning sunlight from window";
    if (lower.includes('веч') || lower.includes('evening')) return "desk lamp warm light";
    if (lower.includes('ноч') || lower.includes('night')) return "dim lamp light";
    
    return "natural window light";
  }

  private extractMood(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.includes('плак') || lower.includes('слез')) return "sad, emotional";
    if (lower.includes('смея') || lower.includes('радост')) return "happy, light";
    if (lower.includes('злост') || lower.includes('гнев')) return "angry, tense";
    if (lower.includes('страх') || lower.includes('боял')) return "anxious, fearful";
    if (lower.includes('спокой') || lower.includes('тих')) return "calm, peaceful";
    
    return "contemplative, thoughtful";
  }

  private extractSensoryDetails(text: string, palette: PlotBible['sensoryPalette']): string[] {
    const details: string[] = [];
    const lower = text.toLowerCase();

    for (const detail of [...(palette.details || []), ...(palette.smells || []), ...(palette.textures || [])]) {
      if (lower.includes(detail.toLowerCase())) {
        details.push(detail);
      }
    }

    return details.slice(0, 5);
  }
}

export const imageGeneratorAgent = new ImageGeneratorAgent();
