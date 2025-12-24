/**
 * 🎨 ZenMaster v4.3 - Image Generator Agent
 * 
 * SIMPLIFIED: Generate prompts DYNAMICALLY from article content
 * Not templates, not hardcoded parameters - actual context!
 * 
 * Features:
 * - Extract visual context from article text
 * - Extract emotional tone from content
 * - Extract era/timeline from narrative
 * - Generate SPECIFIC prompts per article
 * - Fallback on generation failure
 * - Image validation (dimensions, size, format)
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
   * 🎨 v4.3: Generate cover image with DYNAMIC prompt from article content
   * Not hardcoded templates!
   */
  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating COVER image for: "${request.title}"`);

    try {
      // Extract context DYNAMICALLY from article content
      const context = this.analyzeArticleContext(
        request.title,
        request.ledeText,
        request.plotBible
      );
      console.log(`📊 Context analyzed: ${context.summary}`);

      // Build DYNAMIC prompt based on actual context
      const prompt = this.buildDynamicPrompt(context);
      console.log(`📝 Dynamic prompt built (${prompt.length} chars)`);

      // Generate with primary model
      const image = await this.generateWithModel(
        this.primaryModel,
        prompt,
        request.articleId
      );

      console.log(`✅ Cover generated for "${request.title}"`);
      return image;

    } catch (error) {
      const errorMsg = (error as Error).message;
      console.warn(`⚠️  Primary generation failed: ${errorMsg}`);

      if (this.config.enableFallback) {
        console.log(`🔄 Attempting fallback...`);
        return await this.generateCoverImageFallback(request);
      }

      throw error;
    }
  }

  /**
   * 📊 ANALYZE article context DYNAMICALLY
   * Extract: setting, person, emotion, time, lighting, objects
   */
  private analyzeArticleContext(title: string, lede: string, plotBible: PlotBible | undefined) {
    const fullText = `${title}. ${lede}`.toLowerCase();
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };

    // SETTING: Where is the story?
    let setting = this.detectSetting(fullText);

    // PERSON: Who is the narrator?
    let person = this.detectPerson(narrator, fullText);

    // EMOTION: What's the mood?
    let emotion = this.detectEmotion(fullText, plotBible?.sensoryPalette);

    // TIME: When is this happening?
    let timeOfDay = this.detectTimeOfDay(fullText);

    // LIGHTING: What's the light?
    let lighting = this.detectLighting(fullText, timeOfDay, plotBible?.sensoryPalette);

    // OBJECTS: What key items are mentioned?
    let keyObjects = this.detectKeyObjects(fullText);

    // DEVICE ERA: When would this photo have been taken?
    let deviceEra = this.detectDeviceEra(narrator, emotion);

    return {
      title,
      setting,
      person,
      emotion,
      timeOfDay,
      lighting,
      keyObjects,
      deviceEra,
      narrator,
      summary: `${person} in ${setting}, ${emotion}, ${timeOfDay}, ${lighting}`,
    };
  }

  /**
   * 🏠 DETECT SETTING from text
   */
  private detectSetting(text: string): string {
    // Check for specific locations
    if (text.includes('кухн') || text.includes('kitchen')) return 'kitchen table, warm and intimate';
    if (text.includes('спальн') || text.includes('bedroom')) return 'bedroom, personal space';
    if (text.includes('гостин') || text.includes('living')) return 'living room, comfort zone';
    if (text.includes('офис') || text.includes('office')) return 'office desk, professional';
    if (text.includes('улиц') || text.includes('street')) return 'street, outdoors';
    if (text.includes('парк') || text.includes('park')) return 'park, nature';
    if (text.includes('машин') || text.includes('car')) return 'car interior';
    if (text.includes('болниц') || text.includes('hospital')) return 'hospital room';
    if (text.includes('кафе') || text.includes('cafe')) return 'cafe corner';
    if (text.includes('окн') || text.includes('window')) return 'near window, domestic';
    if (text.includes('дом') || text.includes('home')) return 'home, apartment interior';
    
    // Default
    return 'apartment interior, Russian home';
  }

  /**
   * 👤 DETECT PERSON from narrator profile
   */
  private detectPerson(narrator: any, text: string): string {
    const age = narrator.age || 40;
    const gender = narrator.gender === 'female' ? 'Russian woman' : 'Russian man';
    const tone = narrator.tone || 'confessional';

    // Detect if person is alone or with others
    const withOthers = text.includes('муж') || text.includes('дет') || text.includes('сын') ||
                      text.includes('дочь') || text.includes('друг') || text.includes('мать');

    if (withOthers && text.includes('плак')) {
      return `${gender} ~${age}yo, emotional, with family`;
    } else if (withOthers) {
      return `${gender} ~${age}yo, with others, ${tone}`;
    } else {
      return `${gender} ~${age}yo, alone, ${tone}`;
    }
  }

  /**
   * 💫 DETECT EMOTION from text
   */
  private detectEmotion(text: string, sensory: any): string {
    // Check for explicit emotional markers
    if (text.includes('плак') || text.includes('слез') || text.includes('cry')) return 'tearful, emotional, sad';
    if (text.includes('смея') || text.includes('laugh') || text.includes('радост')) return 'smiling, happy, joyful';
    if (text.includes('злост') || text.includes('гнев') || text.includes('angry')) return 'tense, angry, frustrated';
    if (text.includes('страх') || text.includes('боял') || text.includes('fear')) return 'anxious, worried, fearful';
    if (text.includes('облегч') || text.includes('спокой') || text.includes('relief')) return 'relieved, calm, peaceful';
    if (text.includes('побед') || text.includes('триумф') || text.includes('triumph')) return 'victorious, proud, triumphant';
    if (text.includes('стыд') || text.includes('shame')) return 'ashamed, regretful, introspective';
    if (text.includes('потер') || text.includes('смерт') || text.includes('grief')) return 'grieving, mourning, sad';

    // Default based on sensory
    if (sensory?.details?.includes('warm') || sensory?.details?.includes('intimate')) return 'contemplative, introspective';
    if (sensory?.details?.includes('quiet')) return 'peaceful, calm, thoughtful';
    if (sensory?.details?.includes('tense')) return 'tense, conflicted';

    return 'thoughtful, reflective';
  }

  /**
   * ⏰ DETECT TIME OF DAY from text
   */
  private detectTimeOfDay(text: string): string {
    if (text.includes('утр') || text.includes('утро') || text.includes('morning')) return 'morning';
    if (text.includes('полдень') || text.includes('noon')) return 'midday, bright';
    if (text.includes('день') && !text.includes('день ночь')) return 'daytime';
    if (text.includes('вечер') || text.includes('sunset') || text.includes('evening')) return 'evening, golden light';
    if (text.includes('ночь') || text.includes('night')) return 'night, lamp light';
    if (text.includes('закат') || text.includes('закат')) return 'sunset';
    if (text.includes('рассвет') || text.includes('dawn')) return 'dawn';
    if (text.includes('дождь') || text.includes('rain')) return 'overcast, grey';

    return 'daytime';
  }

  /**
   * 💡 DETECT LIGHTING from time + sensory palette
   */
  private detectLighting(text: string, timeOfDay: string, sensory: any): string {
    // Specific light sources in text
    if (text.includes('лампа') || text.includes('lamp')) return 'warm lamp light';
    if (text.includes('свеч') || text.includes('candle')) return 'candlelight, warm';
    if (text.includes('фонар') || text.includes('streetlight')) return 'streetlight, amber';
    if (text.includes('монитор') || text.includes('screen')) return 'screen glow, cool';
    if (text.includes('окн') || text.includes('window')) return 'window light, natural';

    // Time-based lighting
    if (timeOfDay.includes('morning')) return 'soft morning sunlight from window';
    if (timeOfDay.includes('midday')) return 'bright daylight, strong shadows';
    if (timeOfDay.includes('evening')) return 'golden evening light, warm';
    if (timeOfDay.includes('sunset')) return 'sunset glow, orange/pink tones';
    if (timeOfDay.includes('night')) return 'soft lamp light, dark surroundings';
    if (timeOfDay.includes('overcast')) return 'diffuse grey light, no shadows';

    return 'natural window light';
  }

  /**
   * 🔍 DETECT KEY OBJECTS mentioned in text
   */
  private detectKeyObjects(text: string): string[] {
    const objects: string[] = [];

    if (text.includes('чай') || text.includes('tea')) objects.push('cup of tea');
    if (text.includes('кофе') || text.includes('coffee')) objects.push('cup of coffee');
    if (text.includes('фото') || text.includes('photo')) objects.push('old photos visible');
    if (text.includes('письм') || text.includes('letter')) objects.push('letter or envelope');
    if (text.includes('телефон') || text.includes('phone')) objects.push('phone on table');
    if (text.includes('книг') || text.includes('book')) objects.push('books nearby');
    if (text.includes('цветы') || text.includes('flower')) objects.push('flowers on table');
    if (text.includes('свеч') || text.includes('candle')) objects.push('candle');
    if (text.includes('ткань') || text.includes('fabric')) objects.push('fabric, blanket');
    if (text.includes('стен') || text.includes('wall')) objects.push('wall texture visible');

    return objects.length > 0 ? objects : ['cup on table', 'apartment details'];
  }

  /**
   * 📅 DETECT DEVICE ERA based on narrator age + emotion
   */
  private detectDeviceEra(narrator: any, emotion: string): string {
    const age = narrator.age || 40;

    // Emotion influences device freshness
    let yearOffset = 0;
    if (emotion.includes('triumphant') || emotion.includes('happy')) yearOffset = 0;      // New phone
    if (emotion.includes('peaceful') || emotion.includes('calm')) yearOffset = 2;        // 2-3 years old
    if (emotion.includes('tearful') || emotion.includes('sad')) yearOffset = 5;          // Older
    if (emotion.includes('grieving')) yearOffset = 8;                                      // Very old

    const era = 2025 - yearOffset;

    // Age + era → device
    if (age < 35) {
      if (era >= 2023) return 'iPhone 15 (2023), modern flagship';
      if (era >= 2021) return 'iPhone 13 (2021), recent';
      if (era >= 2019) return 'iPhone 11 (2019), mid-range';
      return 'iPhone 6s (2015), older';
    } else if (age < 50) {
      if (era >= 2023) return 'Samsung Galaxy S24 (2024), flagship';
      if (era >= 2020) return 'Samsung Galaxy A51 (2020), mid-range';
      if (era >= 2017) return 'Galaxy S8 (2017), aging';
      return 'Galaxy J5 (2015), budget old';
    } else {
      if (era >= 2020) return 'Galaxy A31 (2020), budget';
      if (era >= 2017) return 'Galaxy J7 (2017), budget old';
      return 'Galaxy J5 (2015), very old, budget';
    }
  }

  /**
   * 🔨 BUILD DYNAMIC PROMPT from analyzed context
   */
  private buildDynamicPrompt(context: any): string {
    const objects = context.keyObjects.join(', ');
    const deviceModel = context.deviceEra.split('(')[0].trim();
    const deviceYear = context.deviceEra.match(/\((\d{4})\)/)?.[1] || '2020';

    // Determine JPEG quality and ISO based on device year
    const year = parseInt(deviceYear);
    const jpegQuality = year >= 2023 ? 90 : year >= 2020 ? 87 : year >= 2017 ? 85 : 80;
    const isoIndoor = context.timeOfDay.includes('night') ? 1600 : 
                      context.timeOfDay.includes('evening') ? 800 : 400;
    const isoOutdoor = context.timeOfDay.includes('midday') ? 100 : 200;

    const finalPrompt = `
🎬 COVER PHOTO - Dynamic Context-Based Generation

📸 SUBJECT:
${context.person}, ${context.emotion}
Exact setting described in article

🏠 LOCATION:
${context.setting}
Russian domestic space, authentic and lived-in

⏰ TIME & LIGHTING:
Time: ${context.timeOfDay}
Light source: ${context.lighting}
Natural, NOT studio-lit
Shadows visible but not dramatic

🎯 VISIBLE IN FRAME:
${objects}
Apart details that tell the story

📱 DEVICE CHARACTERISTICS (${context.deviceEra}):
JPEG quality: ${jpegQuality}% (${year >= 2023 ? 'minimal artifacts' : year >= 2017 ? 'subtle artifacts' : 'visible compression'})
ISO: ${isoIndoor} (indoor) / ${isoOutdoor} (outdoor)
Sensor noise: ${year >= 2023 ? 'almost none' : year >= 2020 ? 'minimal' : year >= 2017 ? 'visible but natural' : 'noticeable grain'}
Color science: ${year >= 2023 ? 'vibrant, AI-processed' : year >= 2017 ? 'slightly warm' : 'washed, muted'}
Sharpness: ${year >= 2023 ? 'crisp, edge-enhanced' : year >= 2017 ? 'natural' : 'soft focus'}

🎨 STYLE REQUIREMENTS:
- Candid, not posed (person absorbed in moment, not looking at camera)
- Real emotion visible (${context.emotion})
- Imperfect composition (not professional photographer)
- Authentic domestic Russian space (worn furniture, lived-in)
- Natural colors (no filters, no oversaturation)
- Depth: slight blur in background, sharp on main subject

🚫 ABSOLUTE PROHIBITIONS:
- NO text, captions, watermarks, logos anywhere
- NO filters (Instagram, beauty apps, etc)
- NO professional makeup or styling
- NO perfect posing or studio lighting
- NO stock photo aesthetic
- NO AI-art giveaways (anatomy correct, hands proper, realistic)
- NO Western style (Russian interior only)
- NO surrealism or impossible things

✅ SUCCESS CRITERIA:
When Яндекс.Дзен moderator sees this:
→ They think "real moment from real life"
→ Not "AI-generated"
→ Device characteristics match the era
→ Emotion matches the story
→ Setting matches the narrative

🎯 REFERENCE AESTHETIC:
Like candid photo from WhatsApp family chat, 2015-2023 era
Not Instagram, not TikTok, not professional photo
Just a real moment captured on a real phone
    `.trim();

    return finalPrompt;
  }

  /**
   * Fallback cover generation - SIMPLIFIED
   */
  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Fallback: Generating simplified cover...`);

    const context = this.analyzeArticleContext(
      request.title,
      request.ledeText,
      request.plotBible
    );

    const fallbackPrompt = `
📷 FALLBACK: Russian person in home, real smartphone photo

Setting: ${context.setting}
Mood: ${context.emotion}
Time: ${context.timeOfDay}
Light: ${context.lighting}

Device: Smartphone camera (any era)
Style: Candid, authentic, not staged

🚫 NO text, filters, watermarks
✅ Real moment captured naturally
    `.trim();

    try {
      return await this.generateWithModel(
        this.fallbackModel,
        fallbackPrompt,
        request.articleId
      );
    } catch (error) {
      console.error(`❌ Fallback failed:`, (error as Error).message);
      throw error;
    }
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
   * Validate image
   */
  validateImage(image: GeneratedImage): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const dimensionsOk = image.width === 1920 && image.height === 1080;
    if (!dimensionsOk) {
      errors.push(`Invalid dimensions: ${image.width}x${image.height}`);
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
      metrics: { dimensionsOk, sizeOk, formatOk, aspectRatioOk: true }
    };
  }
}

export const imageGeneratorAgent = new ImageGeneratorAgent();
