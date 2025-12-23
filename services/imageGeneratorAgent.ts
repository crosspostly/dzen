/**
 * 🎨 ZenMaster v4.1 - Image Generator Agent
 * 
 * Generates authentic mobile phone photos for Zen articles
 * Features:
 * - Scene extraction from episode text
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

/**
 * 🎨 VARIABLE SCENES DATABASE
 * Provides diverse scene descriptions to avoid repetitive images
 */
const SCENE_VARIATIONS = {
  // Разнообразные локации
  locations: [
    "Russian kitchen with old curtains",
    "Small bedroom with Soviet furniture",
    "Living room with window light",
    "Bathroom with morning steam",
    "Balcony with city view",
    "Kitchen table by the window",
    "Cozy corner with soft lighting",
    "Bedroom with patterned bedding",
    "Hallway with coat rack",
    "Kitchen corner near stove"
  ],

  // Разнообразные действия
  actions: [
    "sitting at table, thinking quietly",
    "looking out window, lost in thought",
    "holding a cup of tea, warming hands",
    "reading a letter, emotional expression",
    "looking at phone with worried face",
    "standing near window, deep in thought",
    "sitting on couch, hugging pillow",
    "preparing food in kitchen",
    "watering plants on windowsill",
    "looking at old photo album"
  ],

  // Разнообразное освещение
  lighting: [
    "soft morning light from window",
    "warm afternoon sunlight",
    "soft evening glow",
    "gray overcast day light",
    "warm desk lamp illumination",
    "diffused kitchen light",
    "cool morning shadow",
    "golden hour sunset light",
    "soft bathroom vanity light",
    "natural light from balcony door"
  ],

  // Разнообразные эмоции
  emotions: [
    "thoughtful, slightly melancholic",
    "worried but hopeful",
    "peaceful and reflective",
    "tense with hidden concern",
    "calm acceptance",
    "subtle joy mixed with worry",
    "quiet determination",
    "gentle sadness",
    "warm nostalgia",
    "serene contemplation"
  ],

  // Разнообразные детали интерьера
  interiorDetails: [
    "old floral curtains",
    "worn wooden table",
    "vintage Soviet lamp",
    "family photos on wall",
    "plant on windowsill",
    "colorful kitchen tiles",
    "knitted doilies on furniture",
    "stacked books on shelf",
    "ceramic figurine collection",
    "embroidered towels"
  ]
};

/**
 * Get random element from array with optional seed for consistency
 */
function getRandomElement<T>(arr: T[], seed?: number): T {
  const index = seed !== undefined ? seed % arr.length : Math.floor(Math.random() * arr.length);
  return arr[index];
}

/**
 * Extract keywords from text for intelligent scene matching
 */
function extractKeywords(text: string): { locations: string[], emotions: string[], actions: string[] } {
  const lowerText = text.toLowerCase();

  const locationKeywords = [
    { keywords: ['кухн', 'kitchen', 'стол', 'table'], location: SCENE_VARIATIONS.locations[0] },
    { keywords: ['спальн', 'bedroom', 'кроват', 'кровать', 'bed'], location: SCENE_VARIATIONS.locations[3] },
    { keywords: ['гости́н', 'living room', 'комнат', 'room'], location: SCENE_VARIATIONS.locations[2] },
    { keywords: ['балкон', 'balcony', 'окно', 'window'], location: SCENE_VARIATIONS.locations[4] },
    { keywords: ['ванн', 'bathroom', 'душ', 'shower'], location: SCENE_VARIATIONS.locations[3] },
    { keywords: ['диван', 'couch', 'соф', 'sofa'], location: SCENE_VARIATIONS.locations[6] },
  ];

  const emotionKeywords = [
    { keywords: ['плак', 'слез', 'cry', 'tear'], emotion: SCENE_VARIATIONS.emotions[3] },
    { keywords: ['дума', 'thought', 'размышл', 'вспомин'], emotion: SCENE_VARIATIONS.emotions[3] },
    { keywords: ['радост', 'счаст', 'happy', 'joy'], emotion: SCENE_VARIATIONS.emotions[5] },
    { keywords: ['груст', 'печал', 'sad', 'melanchol'], emotion: SCENE_VARIATIONS.emotions[1] },
    { keywords: ['спокой', 'мир', 'peaceful', 'calm'], emotion: SCENE_VARIATIONS.emotions[2] },
    { keywords: ['тревож', 'волнова', 'worried', 'anxious'], emotion: SCENE_VARIATIONS.emotions[3] },
  ];

  const actionKeywords = [
    { keywords: ['сид', 'sit', 'сел'], action: SCENE_VARIATIONS.actions[0] },
    { keywords: ['смотр', 'смотрящ', 'look', 'watching'], action: SCENE_VARIATIONS.actions[1] },
    { keywords: ['держ', 'держат', 'holding', 'держать'], action: SCENE_VARIATIONS.actions[2] },
    { keywords: ['чита', 'reading', 'читает'], action: SCENE_VARIATIONS.actions[3] },
    { keywords: ['стоя', 'standing', 'стоит'], action: SCENE_VARIATIONS.actions[5] },
    { keywords: ['готов', 'cook', 'еду', 'питани'], action: SCENE_VARIATIONS.actions[7] },
  ];

  const foundLocations = locationKeywords
    .filter(({ keywords }) => keywords.some(kw => lowerText.includes(kw)))
    .map(({ location }) => location);

  const foundEmotions = emotionKeywords
    .filter(({ keywords }) => keywords.some(kw => lowerText.includes(kw)))
    .map(({ emotion }) => emotion);

  const foundActions = actionKeywords
    .filter(({ keywords }) => keywords.some(kw => lowerText.includes(kw)))
    .map(({ action }) => action);

  return {
    locations: foundLocations.length > 0 ? foundLocations : [SCENE_VARIATIONS.locations[0]],
    emotions: foundEmotions.length > 0 ? foundEmotions : [SCENE_VARIATIONS.emotions[0]],
    actions: foundActions.length > 0 ? foundActions : [SCENE_VARIATIONS.actions[0]]
  };
}

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
      format: "jpg",  // ← CHANGED from png to jpg
      maxRetries: 2,
      retryDelay: 3000,
      rateLimit: 1,
      enableFallback: true,
      optimizeForZen: true,
      ...config
    };
  }

  /**
   * 🎯 v4.3 FIXED: Generate ONE cover image from title + lede
   * This is the main entry point for article cover generation
   * NOW WITH STRICT NO-TEXT REQUIREMENTS
   */
  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating COVER image for article: "${request.title}"`);

    try {
      // Build cover image prompt from title + lede (first paragraph)
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
   * 📝 Build cover image prompt from article title + lede
   * v4.3: CRITICAL NO-TEXT requirements for Яндекс.Дзен compliance
   * v4.4: VARIABLE scenes for diverse image generation
   */
  private buildCoverImagePrompt(request: CoverImageRequest): string {
    const { title, ledeText, plotBible } = request;

    // Extract key visual elements from lede (first paragraph)
    const visualElements = this.extractVisualElements(ledeText);

    // SAFE: Use defaults if plotBible or narrator missing
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };

    // 🎨 Get VARIABLE sensory palette based on article context
    const sensoryPalette = plotBible?.sensoryPalette ||
      this.generateVariedSensoryPalette(ledeText, narrator.tone);

    // 🎨 Generate varied interior description
    const interiorDetail = SCENE_VARIATIONS.interiorDetails[
      Math.floor(Math.random() * SCENE_VARIATIONS.interiorDetails.length)
    ];

    // 🎨 Generate varied camera angle
    const cameraAngles = [
      "eye-level, slightly off-center",
      "from corner of room, wide angle",
      "close-up on details, shallow depth",
      "medium shot, natural framing",
      "through doorway perspective",
      "from adjacent room view",
      "slightly elevated, looking down",
      "wide establishing shot",
      "candid smartphone angle",
      "intimate close-up, natural"
    ];
    const cameraAngle = cameraAngles[Math.floor(Math.random() * cameraAngles.length)];

    // 🎨 Generate varied color palette
    const colorPalettes = [
      "warm earthy tones: beige, soft brown, muted orange",
      "cool neutrals: gray, soft blue, pale lavender",
      "cozy pastels: soft pink, cream, light yellow",
      "autumn warmth: burgundy, ochre, deep green",
      "scandinavian light: white, natural wood, pale gray",
      "traditional Russian: dark wood, floral patterns, warm amber",
      "minimal modern: white walls, plants, clean lines",
      "vintage Soviet: chrome, wood, muted greens"
    ];
    const colorPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

    const prompt = `
🔥 CRITICAL: NO TEXT ANYWHERE ON THE IMAGE!

AUTHENTIC mobile phone photo for article cover image.
Title: "${title}"

Scene description: ${visualElements}

NARRATOR CONTEXT:
- Age: ${narrator.age || 40} years old
- Gender: ${narrator.gender === 'male' ? 'Male' : 'Female'}
- Tone: ${narrator.tone || 'confessional'}

SENSORY PALETTE:
${sensoryPalette.details && sensoryPalette.details.length > 0 ? sensoryPalette.details.slice(0, 5).join(', ') : 'warm, intimate, quiet, domestic'}

VISUAL DETAILS:
- ${interiorDetail}
- Color palette: ${colorPalette}
- Camera angle: ${cameraAngle}

REQUIREMENTS:
- ${cameraAngle}
- Natural lighting ONLY (window light, desk lamp, shadows)
- Domestic realism (Russian interior, everyday life)
- Amateur framing (NOT professional composition)
- Depth of field (slight background blur)
- Slight digital noise (like real smartphone camera)
- Natural colors (NOT oversaturated)

🚫 MUST AVOID (CRITICAL for Яндекс.Дзен):
- ANY text, captions, titles, labels, or overlays
- Watermarks or signatures
- ANY visible words or symbols
- Stock photography or glossy look
- Surrealism or strange proportions
- Western style (no American kitchens)
- Violence or shocking content
- Perfect models or professional posing
- Studio lighting
- Fancy interior design

STYLE: Like a photo from neighbor's WhatsApp - authentic, slightly imperfect, real life.
RESULT: 4K detail but amateur aesthetic, like real home photo taken 2018-2020.
PURE IMAGE: No text, no captions, no overlays - just the scene.
    `.trim();

    return prompt;
  }

  /**
   * 🎨 Generate varied sensory palette based on article content
   */
  private generateVariedSensoryPalette(ledeText: string, tone?: string): { details: string[], smells: string[], sounds: string[], textures: string[], lightSources: string[] } {
    const lowerText = ledeText.toLowerCase();

    // Detect time of day from text
    let timeOfDay = "morning";
    if (lowerText.includes('вечер') || lowerText.includes('evening') || lowerText.includes('ночь') || lowerText.includes('night')) {
      timeOfDay = "evening";
    }

    // Detect season from text
    let season = "spring";
    if (lowerText.includes('зим') || lowerText.includes('winter') || lowerText.includes('снег') || lowerText.includes('cold')) {
      season = "winter";
    } else if (lowerText.includes('осен') || lowerText.includes('autumn') || lowerText.includes('лист')) {
      season = "autumn";
    } else if (lowerText.includes('лет') || lowerText.includes('summer') || lowerText.includes('жара')) {
      season = "summer";
    }

    // Base details based on tone
    let baseDetails = ['warm', 'intimate', 'quiet'];
    if (tone === 'dramatic' || lowerText.includes('проблем') || lowerText.includes('worri')) {
      baseDetails = ['tense', 'quiet', 'waiting', 'uncertain'];
    } else if (tone === 'joyful' || lowerText.includes('счаст') || lowerText.includes('happy')) {
      baseDetails = ['warm', 'bright', 'hopeful', 'peaceful'];
    }

    // Add seasonal variations
    if (season === 'winter') {
      baseDetails.push('cold', 'frost on window');
    } else if (season === 'autumn') {
      baseDetails.push('golden leaves', 'cozy blanket');
    }

    // Add time variations
    if (timeOfDay === 'evening') {
      baseDetails.push('soft lamp light', 'evening shadows');
    }

    return {
      details: [...new Set(baseDetails)].slice(0, 6),
      smells: ['fresh coffee', 'homemade food'],
      sounds: ['quiet', 'soft sounds of home'],
      textures: ['soft fabric', 'warm blanket'],
      lightSources: [timeOfDay === 'evening' ? 'warm lamp light' : 'window light']
    };
  }

  /**
   * 🔍 Extract visual elements from lede text (first paragraph)
   * Now with INTELLIGENT analysis for varied scenes
   */
  private extractVisualElements(ledeText: string): string {
    // Safe: handle empty or undefined lede
    if (!ledeText || ledeText.trim().length === 0) {
      return 'Russian domestic scene, everyday moment';
    }

    // Use intelligent keyword extraction for varied scenes
    const keywords = extractKeywords(ledeText);

    // Build a varied scene description
    const location = keywords.locations[Math.floor(Math.random() * keywords.locations.length)];
    const action = keywords.actions[Math.floor(Math.random() * keywords.actions.length)];
    const emotion = keywords.emotions[Math.floor(Math.random() * keywords.emotions.length)];

    // Get random interior details for variety
    const detail1 = SCENE_VARIATIONS.interiorDetails[Math.floor(Math.random() * SCENE_VARIATIONS.interiorDetails.length)];
    const detail2 = SCENE_VARIATIONS.interiorDetails[Math.floor(Math.random() * SCENE_VARIATIONS.interiorDetails.length)];

    const lighting = SCENE_VARIATIONS.lighting[Math.floor(Math.random() * SCENE_VARIATIONS.lighting.length)];

    // Build rich scene description
    const sceneDescription = `${location}. ${action}. ${emotion}. Details: ${detail1}, ${detail2}. Lighting: ${lighting}`;

    return sceneDescription;
  }

  /**
   * 🔄 Fallback cover generation with simpler prompt
   * v4.3: NO-TEXT requirements
   */
  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Using fallback model for cover: ${this.fallbackModel}`);

    // SAFE: Use defaults if plotBible missing
    const narrator = request.plotBible?.narrator || { age: 40, gender: 'female' };
    const sensoryDetails = request.plotBible?.sensoryPalette?.details || ['warm', 'intimate', 'quiet'];

    const simplifiedPrompt = `
🔥 NO TEXT ON IMAGE - CRITICAL!

Russian woman ${narrator.age || 40} years old in apartment, natural light, realistic photo on smartphone.
Interior: ${sensoryDetails.slice(0, 3).join(', ')}
Domestic scene, everyday moment, warm lighting.

⚠️  ABSOLUTELY NO TEXT, CAPTIONS, WATERMARKS, OR OVERLAYS!
PURE PHOTOGRAPH ONLY.
    `.trim();

    try {
      return await this.generateWithModel(
        this.fallbackModel,
        simplifiedPrompt,
        request.articleId
      );
    } catch (error) {
      console.error(`❌ Fallback also failed:`, (error as Error).message);
      throw new Error(`Both primary and fallback cover generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * @deprecated Use generateCoverImage instead. This generates per-episode images (old v4.0)
   * 🎯 Main entry point: Generate image from episode
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
   * 🔍 Extract key scene from episode text
   * Uses AI to identify the most visual/emotional moment
   * v4.4: Enhanced with VARIABLE scene extraction
   */
  private extractKeyScene(episodeText: string, plotBible: PlotBible): ExtractedScene {
    // Use intelligent keyword extraction
    const keywords = extractKeywords(episodeText);

    // Get varied components from SCENE_VARIATIONS
    const location = keywords.locations[0] || getRandomElement(SCENE_VARIATIONS.locations);
    const action = keywords.actions[0] || getRandomElement(SCENE_VARIATIONS.actions);
    const emotion = keywords.emotions[0] || getRandomElement(SCENE_VARIATIONS.emotions);
    const lighting = getRandomElement(SCENE_VARIATIONS.lighting);

    // Get random interior details
    const detail1 = getRandomElement(SCENE_VARIATIONS.interiorDetails);
    const detail2 = getRandomElement(SCENE_VARIATIONS.interiorDetails);

    // Build who with narrator context
    const who = this.extractWho(episodeText, plotBible);

    return {
      who,
      what: action,
      where: location,
      lighting,
      mood: emotion,
      sensoryDetails: [detail1, detail2],
      confidence: 0.85  // Higher confidence with intelligent extraction
    };
  }

  /**
   * 📝 Build authentic mobile phone photo prompt
   * v4.4: Enhanced with VARIABLE scene components
   */
  private buildImagePrompt(
    scene: ExtractedScene,
    plotBible: PlotBible,
    emotion?: string
  ): PromptComponents {
    const subject = `${scene.who}, ${scene.what}`;
    const setting = `${scene.where}, Russian interior/domestic context`;
    const lighting = scene.lighting || getRandomElement(SCENE_VARIATIONS.lighting);

    // Get varied camera angle
    const cameraAngles = [
      "eye-level, slightly off-center",
      "from corner of room, wide angle",
      "close-up on details, shallow depth",
      "medium shot, natural framing",
      "candid smartphone angle"
    ];
    const cameraAngle = cameraAngles[Math.floor(Math.random() * cameraAngles.length)];

    const style = "AUTHENTIC mobile phone photo, taken on mid-range smartphone (iPhone 2018-2020 or Samsung A-series)";

    const requirements = [
      `Camera: ${cameraAngle}`,
      `Natural lighting: ${lighting}`,
      `Setting: ${setting}`,
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

CAMERA & LIGHTING:
- ${cameraAngle}
- ${lighting}

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
   * 🤖 Generate image with specified model
   * v4.2: Using Gemini API imageConfig for aspect ratio control
   */
  private async generateWithModel(
    model: string,
    prompt: string,
    idForMetadata: string | number // Can be articleId or episodeId
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    const response = await this.geminiClient.models.generateContent({
      model: model,
      contents: { 
        parts: [{ text: prompt }] 
      },
      config: {
        responseModalities: [Modality.IMAGE],
        temperature: 0.95,  // 🔥 Higher for VARIETY - was 0.85
        topK: 50,
        topP: 0.98,  // 🔥 Increased for more diversity
        maxOutputTokens: 1024,
        // 🔥 ASPECT RATIO CONTROL - Using Gemini API imageConfig
        imageConfig: {
          aspectRatio: "16:9" // Landscape format
        } as any
      }
    });

    // Extract image from response
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

    // 🔥 IMPORTANT: base64Data from Gemini is CLEAN (no data: prefix)
    // We'll add the prefix later when needed
    console.log(`   📦 Received base64 image from Gemini API (${base64Data.length} chars)`);

    const generatedImage: GeneratedImage = {
      id: `img_${idForMetadata}_${Date.now()}`,
      base64: base64Data, // ← CLEAN base64 without data: prefix
      mimeType: "image/jpg",  // ← ALWAYS JPG for covers
      width: 1920, // 16:9 standard
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75), // Approximate size
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
      metadata: {
        articleId: typeof idForMetadata === 'string' ? idForMetadata : `article_${idForMetadata}`,
        sceneDescription: prompt.substring(0, 200) + "...",
        generationAttempts: 1,
        fallbackUsed: model !== this.primaryModel,
        // Legacy support
        episodeId: typeof idForMetadata === 'number' ? idForMetadata : undefined
      }
    };

    // Validate image
    const validation = this.validateImage(generatedImage);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`✅ Image generated in ${Date.now() - startTime}ms`);
    return generatedImage;
  }

  /**
   * 🔄 Fallback generation with simpler prompt
   */
  private async generateImageFallback(request: ImageGenerationRequest): Promise<GeneratedImage> {
    console.log(`🔄 Using fallback model: ${this.fallbackModel}`);

    // Simplified prompt for fallback
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
   * ✅ Validate generated image
   */
  validateImage(image: GeneratedImage): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check dimensions
    const dimensionsOk = image.width === 1920 && image.height === 1080;
    if (!dimensionsOk) {
      errors.push(`Invalid dimensions: ${image.width}x${image.height} (expected 1920x1080)`);
    }

    // Check aspect ratio
    const aspectRatio = image.width / image.height;
    const aspectRatioOk = Math.abs(aspectRatio - (16/9)) < 0.01;
    if (!aspectRatioOk) {
      warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)} not exactly 16:9`);
    }

    // Check file size (should be reasonable)
    const sizeOk = image.fileSize > 10000 && image.fileSize < 5000000; // 10KB - 5MB
    if (!sizeOk) {
      warnings.push(`Unusual file size: ${image.fileSize} bytes`);
    }

    // Check format
    const formatOk = image.mimeType === "image/jpg";
    if (!formatOk) {
      errors.push(`Invalid format: ${image.mimeType}`);
    }

    // Check base64
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
  // Helper methods for scene extraction
  // ============================================================================

  private calculateSensoryScore(text: string, palette: PlotBible['sensoryPalette']): number {
    let score = 0;
    const lower = text.toLowerCase();

    // Check for sensory words
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

    // Check for visual verbs
    const visualVerbs = ['смотрел', 'видел', 'увидел', 'заметил', 'разглядывал'];
    for (const verb of visualVerbs) {
      if (lower.includes(verb)) score += 1;
    }

    return score;
  }

  private extractWho(text: string, plotBible: PlotBible): string {
    // Default to narrator profile
    const age = plotBible.narrator?.age || 40;
    const gender = plotBible.narrator?.gender === "male" ? "Man" : "Woman";
    
    return `${gender} ${Math.floor(age / 10) * 10}s`; // "Woman 40s"
  }

  private extractWhat(text: string): string {
    // Look for action verbs
    const actions = ['сидел', 'стоял', 'смотрел', 'держал', 'читал', 'писал', 'говорил'];
    for (const action of actions) {
      if (text.toLowerCase().includes(action)) {
        return action.replace('л', 'ing'); // Simple translation
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
    
    // Check palette light sources first
    for (const light of palette.lightSources || []) {
      if (lower.includes(light.toLowerCase())) {
        return light;
      }
    }

    // Default lighting by time indicators
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

    // Collect matching sensory details
    for (const detail of [...(palette.details || []), ...(palette.smells || []), ...(palette.textures || [])]) {
      if (lower.includes(detail.toLowerCase())) {
        details.push(detail);
      }
    }

    // Return top 5 most relevant
    return details.slice(0, 5);
  }
}

// ============================================================================
// 🔧 SINGLETON EXPORT: Create and export default instance
// ============================================================================

export const imageGeneratorAgent = new ImageGeneratorAgent();
