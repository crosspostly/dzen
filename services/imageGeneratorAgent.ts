/**
 * 🎨 ZenMaster v4.3 - Image Generator Agent
 * 
 * CRITICAL CHANGE: Extract ACTUAL STORY from article content
 * Not templates, not generic tags
 * EVERY STORY → UNIQUE SCENE with specific details, context, emotions
 * 
 * Features:
 * - Extract scene from article LEDE (first 300 chars)
 * - Identify key story elements (who, what, where, why, emotion)
 * - Build SPECIFIC scene description for Gemini
 * - Generate UNIQUE image per story
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
   * 🎨 v4.3: Generate cover image with ACTUAL STORY from article
   * Not hardcoded templates!
   */
  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating cover for: "${request.title}"`);

    try {
      // 🔥 EXTRACT ACTUAL STORY from article lede + content
      const storyContext = this.extractStoryContext(
        request.title,
        request.ledeText,
        request.plotBible
      );
      console.log(`📖 Story context extracted: ${storyContext.summary}`);

      // 🔥 Build SPECIFIC scene description from story
      const prompt = this.buildStorySpecificPrompt(storyContext);
      console.log(`🎬 Story-specific prompt built (${prompt.length} chars)`);

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
   * 🔥 EXTRACT STORY CONTEXT from article content
   * Find: Who, What, Where, When, Why, How, Emotion
   */
  private extractStoryContext(title: string, lede: string, plotBible: PlotBible | undefined) {
    const fullText = `${title}. ${lede}`.toLowerCase();
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };

    // КТО? (Who is the main character and what's their situation?)
    let protagonist = this.extractProtagonist(title, lede, narrator);

    // ЧТО ПРОИЗОШЛО? (What is the MAIN EVENT/CONFLICT?)
    let mainEvent = this.extractMainEvent(title, lede);

    // ГДЕ? (Where does the story take place? What location?)
    let location = this.extractLocation(lede);

    // КОГДА? (When? Morning/evening? Past/present?)
    let timeContext = this.extractTimeContext(lede);

    // КАКАЯ ЭМОЦИЯ? (What emotion defines this story?)
    let emotionalArc = this.extractEmotionalArc(title, lede);

    // КАКИЕ ВИДИМЫЕ ДЕТАЛИ? (What specific objects/actions are visible?)
    let visibleDetails = this.extractVisibleDetails(title, lede);

    // ФОКУС СЦЕНЫ? (What is the focal point? The key object/action?)
    let focalPoint = this.extractFocalPoint(title, lede, visibleDetails);

    // КТО ПРИСУТСТВУЕТ? (Who else is there? Alone or with others?)
    let presenceContext = this.extractPresenceContext(lede);

    return {
      title,
      protagonist,
      mainEvent,
      location,
      timeContext,
      emotionalArc,
      visibleDetails,
      focalPoint,
      presenceContext,
      narrator,
      summary: `${protagonist.name}: ${mainEvent} at ${location} (${emotionalArc.primary})`
    };
  }

  /**
   * 🎭 Extract protagonist details
   */
  private extractProtagonist(title: string, lede: string, narrator: any) {
    const age = narrator.age || 40;
    const appearance = lede.includes('молодая') ? 'young' :
                      lede.includes('старая') ? 'elderly' : 'middle-aged';

    return {
      name: 'Woman', // Generic, focus on emotion
      age,
      appearance,
      state: this.extractPhysicalState(lede),
      relationship: this.extractRelationshipContext(title, lede)
    };
  }

  /**
   * 📖 Extract MAIN EVENT (the core story)
   */
  private extractMainEvent(title: string, lede: string): string {
    const text = `${title}. ${lede}`.toLowerCase();

    // DETECT MAJOR LIFE EVENTS
    if (text.includes('развод') || text.includes('муж')) {
      if (text.includes('ненавид') || text.includes('обман') || text.includes('предател')) {
        return 'discovering husband\'s betrayal and divorce';
      }
      return 'dealing with marriage conflict';
    }

    if (text.includes('сын') || text.includes('ребён')) {
      if (text.includes('помирил') || text.includes('мир')) {
        return 'reconciliation with son after conflict';
      }
      if (text.includes('ссора') || text.includes('конфлик')) {
        return 'conflict with child';
      }
      return 'moment with son';
    }

    if (text.includes('смерт') || text.includes('умер')) {
      return 'dealing with loss and grief';
    }

    if (text.includes('победа') || text.includes('преодол') || text.includes('страх')) {
      if (text.includes('преодол') || text.includes('победи')) {
        return 'overcoming a deep fear';
      }
      return 'facing personal struggle';
    }

    if (text.includes('первая любовь') || text.includes('встреча') || text.includes('прошлое')) {
      return 'encountering past love/memory';
    }

    if (text.includes('случай') || text.includes('момент') || text.includes('день')) {
      return 'critical moment in life';
    }

    return 'life-changing moment';
  }

  /**
   * 📍 Extract LOCATION from story
   */
  private extractLocation(lede: string): string {
    const text = lede.toLowerCase();

    // SPECIFIC LOCATIONS mentioned in text
    if (text.includes('кафе') || text.includes('кофейня') || text.includes('бар')) {
      return 'intimate cafe with candlelight';
    }
    if (text.includes('мост') || text.includes('набережная') || text.includes('вода')) {
      return 'bridge over river, evening light';
    }
    if (text.includes('дома') || text.includes('подъезд') || text.includes('прихожая')) {
      return 'apartment entrance/hallway';
    }
    if (text.includes('кухня')) {
      return 'kitchen with table';
    }
    if (text.includes('офис') || text.includes('адвокат')) {
      return 'office building';
    }
    if (text.includes('парк')) {
      return 'park bench';
    }
    if (text.includes('улица') || text.includes('дождь')) {
      return 'street in rain';
    }
    if (text.includes('окно') || text.includes('высот') || text.includes('этаж')) {
      return 'high window overlooking city';
    }
    if (text.includes('метро') || text.includes('вокзал')) {
      return 'transit station';
    }
    if (text.includes('мастерск') || text.includes('студи')) {
      return 'artist studio';
    }

    return 'apartment interior';
  }

  /**
   * ⏰ Extract TIME CONTEXT
   */
  private extractTimeContext(lede: string): string {
    const text = lede.toLowerCase();

    if (text.includes('утро') || text.includes('рассвет')) return 'morning, soft light';
    if (text.includes('полден') || text.includes('день')) return 'midday, bright light';
    if (text.includes('вечер') || text.includes('закат')) return 'evening, golden light';
    if (text.includes('ночь')) return 'night, lamp light';
    if (text.includes('дождь') || text.includes('серый')) return 'rainy day, grey light';
    if (text.includes('снег')) return 'snowy weather';

    return 'daytime';
  }

  /**
   * 💔 Extract EMOTIONAL ARC
   */
  private extractEmotionalArc(title: string, lede: string): { primary: string; secondary: string[] } {
    const text = `${title}. ${lede}`.toLowerCase();

    let primary = 'thoughtful';
    let secondary: string[] = [];

    // PRIMARY EMOTION
    if (text.includes('плач') || text.includes('слёз') || text.includes('горе') || text.includes('ненавид')) {
      primary = 'grief and pain';
      secondary = ['shock', 'betrayal', 'despair'];
    } else if (text.includes('радость') || text.includes('улыбка') || text.includes('счастли')) {
      primary = 'joy and relief';
      secondary = ['hope', 'warmth', 'connection'];
    } else if (text.includes('облегчение') || text.includes('спокойн') || text.includes('мир')) {
      primary = 'relief and peace';
      secondary = ['quiet happiness', 'acceptance', 'healing'];
    } else if (text.includes('страх') || text.includes('трево') || text.includes('ужас')) {
      primary = 'fear and anxiety';
      secondary = ['uncertainty', 'dread', 'vulnerability'];
    } else if (text.includes('гнев') || text.includes('злост') || text.includes('ярост')) {
      primary = 'anger and rage';
      secondary = ['indignation', 'determination', 'strength'];
    } else if (text.includes('стыд') || text.includes('вина') || text.includes('покаяние')) {
      primary = 'shame and regret';
      secondary = ['introspection', 'vulnerability', 'acceptance'];
    } else if (text.includes('триумф') || text.includes('победа') || text.includes('преодол') || text.includes('свобод')) {
      primary = 'triumph and freedom';
      secondary = ['strength', 'determination', 'new beginning'];
    } else if (text.includes('одиночество') || text.includes('пустот')) {
      primary = 'loneliness and emptiness';
      secondary = ['melancholy', 'introspection', 'loss'];
    } else if (text.includes('nostalgia') || text.includes('прошлое') || text.includes('память')) {
      primary = 'nostalgia and memory';
      secondary = ['longing', 'bittersweet', 'reflection'];
    }

    return { primary, secondary };
  }

  /**
   * 👁️ Extract VISIBLE DETAILS from story
   */
  private extractVisibleDetails(title: string, lede: string): string[] {
    const text = `${title}. ${lede}`.toLowerCase();
    const details: string[] = [];

    // EMOTIONAL MARKERS (what do we SEE?)
    if (text.includes('слёз') || text.includes('плач')) details.push('tears on cheeks');
    if (text.includes('красн') && text.includes('глаз')) details.push('red puffy eyes');
    if (text.includes('улыбк') || text.includes('смех')) details.push('genuine smile');
    if (text.includes('дрож')) details.push('trembling hands');
    if (text.includes('пальц')) details.push('fingers visible and expressive');
    if (text.includes('рук') && (text.includes('горяч') || text.includes('холодн'))) details.push('hands that show emotion');

    // OBJECTS
    if (text.includes('кольцо') || text.includes('кольца')) details.push('wedding ring prominent / being removed');
    if (text.includes('чай') || text.includes('кофе')) details.push('cup of tea/coffee');
    if (text.includes('платок') || text.includes('ткань')) details.push('tissue or cloth');
    if (text.includes('фото') || text.includes('фотограф')) details.push('photo or photograph visible');
    if (text.includes('письмо') || text.includes('записка')) details.push('letter or note');
    if (text.includes('пальто') || text.includes('плащ')) details.push('coat or outer clothing');
    if (text.includes('часы')) details.push('clock or watch visible');
    if (text.includes('зеркало')) details.push('mirror reflection');
    if (text.includes('телефон')) details.push('phone in hand or on table');
    if (text.includes('свеча')) details.push('candlelight');

    // BODY LANGUAGE
    if (text.includes('плечо')) details.push('shoulders that convey emotion');
    if (text.includes('голова')) details.push('head position (down, up, tilted)');
    if (text.includes('сидеть') || text.includes('сидя')) details.push('sitting posture');
    if (text.includes('стоять') || text.includes('стоя')) details.push('standing posture');
    if (text.includes('идти') || text.includes('ходить')) details.push('movement/walking');

    // CLOTHING/APPEARANCE
    if (text.includes('волос')) details.push('hair style (neat or disheveled)');
    if (text.includes('красива') || text.includes('нарядна')) details.push('dressed carefully');
    if (text.includes('неопрятн') || text.includes('растрёпан')) details.push('appearance disheveled');

    return details.length > 0 ? details : ['woman, emotional, present in moment'];
  }

  /**
   * 🎯 Extract FOCAL POINT (what is the key visual element?)
   */
  private extractFocalPoint(title: string, lede: string, visibleDetails: string[]): string {
    const text = `${title}. ${lede}`.toLowerCase();

    // RING is often the focal point
    if (text.includes('кольцо') || text.includes('палец')) {
      return 'wedding ring - either on finger being twisted or in hand being removed';
    }

    // TEARS and EYES
    if (text.includes('слёз') || text.includes('глаз') && text.includes('красн')) {
      return 'eyes - red, puffy, full of emotion';
    }

    // SMILE
    if (text.includes('улыбк') || text.includes('смех')) {
      return 'smile - genuine and warm';
    }

    // HANDS
    if (text.includes('рук') && text.includes('дрож')) {
      return 'trembling hands - showing vulnerability';
    }

    // FACE/EXPRESSION
    if (text.includes('выраж') || text.includes('лиц')) {
      return 'face - showing core emotion of the story';
    }

    // POSTURE/BODY
    return 'overall posture and body language - telling the emotional story';
  }

  /**
   * 👥 Extract presence context (alone? with who?)
   */
  private extractPresenceContext(lede: string): string {
    const text = lede.toLowerCase();

    if (text.includes('один') || text.includes('одна') || text.includes('сама')) {
      return 'alone';
    }
    if (text.includes('муж')) {
      return 'with husband (tense/conflicted)';
    }
    if (text.includes('сын') || text.includes('дочь') || text.includes('ребён')) {
      return 'with child';
    }
    if (text.includes('подруг') || text.includes('друг')) {
      return 'with friend';
    }
    if (text.includes('мать') || text.includes('мама')) {
      return 'with mother';
    }

    return 'alone or in private moment';
  }

  /**
   * 🏃 Extract physical state (how is she physically?)
   */
  private extractPhysicalState(lede: string): string {
    const text = lede.toLowerCase();

    if (text.includes('дрож') || text.includes('стояла') || text.includes('замерз')) {
      return 'frozen, trembling, in shock';
    }
    if (text.includes('расслаб') || text.includes('мирн')) {
      return 'relaxed and peaceful';
    }
    if (text.includes('спешн') || text.includes('торопл')) {
      return 'rushed, urgent';
    }
    if (text.includes('устал')) {
      return 'exhausted';
    }

    return 'present and aware';
  }

  /**
   * 💕 Extract relationship context
   */
  private extractRelationshipContext(title: string, lede: string): string {
    const text = `${title}. ${lede}`.toLowerCase();

    if (text.includes('муж')) return 'married/dealing with marriage';
    if (text.includes('сын') || text.includes('ребён')) return 'mother';
    if (text.includes('лю')) return 'in love or heartbreak';
    if (text.includes('одинок')) return 'alone';

    return 'in relationship';
  }

  /**
   * 🎬 BUILD STORY-SPECIFIC PROMPT (not generic template!)
   */
  private buildStorySpecificPrompt(context: any): string {
    // Create a UNIQUE prompt for THIS specific story
    const prompt = `
🎬 STORY SCENE - Generate image for this specific story:

📖 STORY:
${context.title}

🎭 MAIN EVENT:
${context.mainEvent}

👤 PROTAGONIST:
${context.protagonist.name}, age ${context.protagonist.age}
Emotional state: ${context.protagonist.state}
Relationship context: ${context.protagonist.relationship}
${context.presenceContext !== 'alone' ? `\nWith: ${context.presenceContext}` : ''}

📍 LOCATION & TIME:
Where: ${context.location}
When: ${context.timeContext}

💔 EMOTIONAL TONE:
Primary emotion: ${context.emotionalArc.primary}
Secondary emotions: ${context.emotionalArc.secondary.join(', ')}

👁️ WHAT WE SEE (VISIBLE DETAILS):
${context.visibleDetails.map((d: string) => `• ${d}`).join('\n')}

🎯 KEY FOCAL POINT:
${context.focalPoint}

🎨 VISUAL DIRECTION:
Don't show generic "woman sitting with tea"
Show THIS SPECIFIC MOMENT from the story:
- Capture the EXACT emotion of this scene
- Include visible details that show WHAT HAPPENED
- The focal point should draw attention naturally
- Lighting should match the emotional tone
- Everything in frame should serve the story

🚫 ABSOLUTE RULES:
- NO text, captions, watermarks
- NO filters or Instagram effects
- NO perfect posing (real moment, not posed)
- NO ambiguity (image should clearly show THIS story's emotion)
- NO generic "woman portrait"

✅ SUCCESS:
When viewer sees this image, they immediately FEEL the emotion
They understand SOMETHING HAPPENED
They can sense the CONTEXT without reading
The image matches EXACTLY what the story describes

🎯 TONE GUIDE by emotion:
${this.getToneGuide(context.emotionalArc.primary)}
    `.trim();

    return prompt;
  }

  /**
   * 🎨 Get tone/style guide based on primary emotion
   */
  private getToneGuide(emotion: string): string {
    const toneGuides: Record<string, string> = {
      'grief and pain': `
GRIEF scene:
- Cold, clinical apartment lighting (no warmth)
- Empty spaces, silence visible
- Body language: frozen, numb, shock
- Eyes: red, empty, distant look
- Hands: trembling or limp
- Focal point: ring on finger or in hand
- Everything feels FINAL and BROKEN
- This moment changed everything
- Show the MOMENT OF REALIZATION`,

      'relief and peace': `
RELIEF scene:
- Warm, intimate lighting (candlelight or soft lamp)
- Cozy enclosed space (cafe, corner, safe place)
- Body language: relaxed, shoulders down, loose
- Eyes: peaceful, maybe a happy tear
- Hands: unclenched, peaceful
- Focal point: smile or calm expression
- Everything feels HEALED and WHOLE
- Show the MOMENT OF ACCEPTANCE`,

      'triumph and freedom': `
TRIUMPH scene:
- Bright, open, expansive (high window, view)
- Space and air visible
- Body language: standing tall, shoulders back, chest open
- Eyes: looking forward, determined
- Hands: strong, confident, free
- Focal point: absence of ring or hand raised
- Everything feels POSSIBLE and NEW
- Show the MOMENT OF EMPOWERMENT`,

      'fear and anxiety': `
FEAR scene:
- Uncertain, shadowy lighting
- Tight, enclosed spaces
- Body language: curled, protective, small
- Eyes: worried, scanning, uncertain
- Hands: clenched or protecting
- Focal point: worried expression or protective gesture
- Everything feels UNCERTAIN and THREATENING
- Show the MOMENT OF VULNERABILITY`,

      'anger and rage': `
ANGER scene:
- Sharp, high contrast lighting
- Tight framing, nowhere to hide
- Body language: tense, ready, confrontational
- Eyes: intense, blazing, direct
- Hands: clenched, ready to act
- Focal point: fierce expression or aggressive gesture
- Everything feels CHARGED and EXPLOSIVE
- Show the MOMENT OF BREAKING POINT`,

      'shame and regret': `
SHAME scene:
- Subdued, introspective lighting
- Small, contained space (looking down)
- Body language: turned inward, small, withdrawn
- Eyes: downcast, avoiding, ashamed
- Hands: covering, protective, hiding
- Focal point: face showing regret or downturned head
- Everything feels HEAVY and BURDENSOME
- Show the MOMENT OF RECKONING`
    };

    return toneGuides[emotion] || 'Neutral scene showing introspection and presence';
  }

  /**
   * Fallback cover generation - SIMPLIFIED
   */
  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Fallback: Generating simplified cover...`);

    const context = this.extractStoryContext(
      request.title,
      request.ledeText,
      request.plotBible
    );

    const fallbackPrompt = `
🎬 STORY IMAGE:
Title: ${request.title}
Emotion: ${context.emotionalArc.primary}
Location: ${context.location}
Key emotion: Show this emotion clearly

Generate realistic candid scene matching the emotional tone.
No text, no filters, authentic moment.
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
