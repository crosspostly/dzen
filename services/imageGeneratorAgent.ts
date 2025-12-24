/**
 * 🎨 ZenMaster v4.1 - Image Generator Agent
 * 
 * Generates authentic mobile phone photos for Zen articles
 * Features:
 * - SMART scene extraction from article content + title
 * - Theme-based diverse image prompts (NOT generic)
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
      format: "jpeg",  // ← CHANGED from png to jpeg
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
   * NOW WITH SMART THEME-BASED DIVERSE PROMPTS (merged from generateImagePrompt.ts)
   */
  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating COVER image for article: "${request.title}"`);

    try {
      // 🆕 SMART: Build DIVERSE prompt based on article content
      const { prompt, sceneElements } = await this.buildSmartCoverImagePrompt(request);
      console.log(`📝 Cover prompt built (${prompt.length} chars)`);

      // Generate with primary model
      const image = await this.generateWithModel(
        this.primaryModel,
        prompt,
        request.articleId,
        sceneElements  // 🆕 Pass scene elements to metadata
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
   * 🆕 v4.5 REFACTORED: Build DIVERSE cover image prompt from REAL article content
   * Analyzes article content (title + lede) and generates UNIQUE prompts
   * NOT hardcoded scenes - builds from actual story elements!
   * 
   * CRITICAL: Generates DIFFERENT scenes based on what's ACTUALLY in the article
   * NOT generic one-size-fits-all prompts
   * 
   * Returns: { prompt, sceneElements } for metadata storage
   */
  private async buildSmartCoverImagePrompt(request: CoverImageRequest): Promise<{
    prompt: string;
    sceneElements: ReturnType<typeof this.extractSceneElementsFromContent>;
  }> {
    const { title, ledeText, plotBible } = request;

    // Extract key theme from title and lede
    const theme = this.detectArticleTheme(title, ledeText);
    console.log(`🎯 Detected theme: ${theme}`);

    // 🔥 NEW: Extract REAL scene elements from the article itself
    const sceneElements = this.extractSceneElementsFromContent(title, ledeText, theme);
    console.log(`📸 Extracted scene elements:`, sceneElements);

    // Build prompt from REAL content + theme
    const themeSpecificPrompt = this.buildPromptFromRealContent(
      theme,
      sceneElements,
      title,
      ledeText,
      plotBible
    );

    return {
      prompt: themeSpecificPrompt,
      sceneElements  // 🆕 Return scene elements for metadata
    };
  }

  /**
   * 🎯 Extract actual scene elements from article content
   * Analyzes title + lede to find: characters, settings, actions, emotions
   * Returns SPECIFIC details from the actual story
   */
  private extractSceneElementsFromContent(
    title: string,
    ledeText: string,
    theme: string
  ): {
    characters: string[];
    settings: string[];
    actions: string[];
    emotions: string[];
    objects: string[];
    timeContext: string;
  } {
    const content = `${title} ${ledeText}`.toLowerCase();

    // Character extraction
    const characters: string[] = [];
    const characterKeywords: Record<string, string> = {
      'мама': 'mother',
      'мать': 'mother',
      'папа': 'father',
      'отец': 'father',
      'сын': 'son',
      'дочь': 'daughter',
      'ребенок': 'child',
      'дети': 'children',
      'женщина': 'woman',
      'мужчина': 'man',
      'подруга': 'girlfriend/friend',
      'друг': 'friend',
      'любимый': 'beloved',
      'супруг': 'husband',
      'жена': 'wife',
      'коллег': 'colleague',
      'начальн': 'boss',
      'учител': 'teacher',
      'врач': 'doctor',
      'бабушк': 'grandmother',
      'дедушк': 'grandfather',
      'сестр': 'sister',
      'брат': 'brother'
    };

    for (const [keyword, translation] of Object.entries(characterKeywords)) {
      if (content.includes(keyword)) {
        characters.push(translation);
      }
    }

    // Setting extraction
    const settings: string[] = [];
    const settingKeywords: Record<string, string> = {
      'кухн': 'kitchen',
      'спальн': 'bedroom',
      'гостин': 'living room',
      'офис': 'office',
      'работ': 'workplace',
      'улиц': 'street',
      'парк': 'park',
      'окн': 'window',
      'диван': 'couch',
      'кровать': 'bed',
      'стол': 'table',
      'машин': 'car',
      'поезд': 'train',
      'самолет': 'airplane',
      'море': 'sea',
      'горы': 'mountains',
      'город': 'city',
      'дом': 'home',
      'квартир': 'apartment',
      'школ': 'school',
      'больниц': 'hospital',
      'ресторан': 'restaurant',
      'метро': 'metro',
      'вокзал': 'station',
      'лес': 'forest',
      'деревн': 'village',
      'балкон': 'balcony',
      'веранд': 'porch',
      'ванн': 'bathroom',
      'коридор': 'hallway',
      'лестниц': 'stairs'
    };

    for (const [keyword, translation] of Object.entries(settingKeywords)) {
      if (content.includes(keyword)) {
        settings.push(translation);
      }
    }

    // Action extraction
    const actions: string[] = [];
    const actionKeywords: Record<string, string> = {
      'сидел': 'sitting',
      'стоял': 'standing',
      'лежал': 'lying',
      'ходил': 'walking',
      'бежал': 'running',
      'смотрел': 'looking',
      'слушал': 'listening',
      'говорил': 'talking',
      'кричал': 'shouting',
      'плакал': 'crying',
      'смеялся': 'laughing',
      'пел': 'singing',
      'танцевал': 'dancing',
      'готовил': 'cooking',
      'ел': 'eating',
      'пил': 'drinking',
      'читал': 'reading',
      'писал': 'writing',
      'работал': 'working',
      'спал': 'sleeping',
      'целовал': 'kissing',
      'обнимал': 'hugging',
      'держал': 'holding',
      'тискал': 'hugging',
      'ласкал': 'caressing',
      'вздыхал': 'sighing',
      'улыбался': 'smiling',
      'хмурился': 'frowning',
      'дрожал': 'trembling',
      'кричал': 'yelling',
      'молчал': 'silent',
      'прислушивался': 'listening'
    };

    for (const [keyword, translation] of Object.entries(actionKeywords)) {
      if (content.includes(keyword)) {
        actions.push(translation);
      }
    }

    // Emotion extraction
    const emotions: string[] = [];
    const emotionKeywords: Record<string, string> = {
      'люб': 'loving',
      'радост': 'happy',
      'счастлив': 'joyful',
      'благодар': 'grateful',
      'гордост': 'proud',
      'печал': 'sad',
      'грусть': 'melancholy',
      'сожален': 'regretful',
      'стыд': 'ashamed',
      'боял': 'fearful',
      'страх': 'afraid',
      'тревож': 'anxious',
      'гнев': 'angry',
      'злост': 'furious',
      'обид': 'hurt',
      'ревнив': 'jealous',
      'завист': 'envious',
      'спокой': 'calm',
      'мирн': 'peaceful',
      'тих': 'quiet',
      'одинок': 'lonely',
      'потеян': 'lost',
      'нежн': 'tender',
      'интим': 'intimate',
      'волную': 'thrilling',
      'ошеломл': 'shocked',
      'разочаров': 'disappointed',
      'вдохновлен': 'inspired',
      'измучен': 'exhausted',
      'отчаян': 'desperate',
      'вибухаю': 'explosive'
    };

    for (const [keyword, translation] of Object.entries(emotionKeywords)) {
      if (content.includes(keyword)) {
        emotions.push(translation);
      }
    }

    // Object extraction (for details)
    const objects: string[] = [];
    const objectKeywords: Record<string, string> = {
      'чай': 'tea',
      'кофе': 'coffee',
      'цветы': 'flowers',
      'фото': 'photo',
      'книг': 'book',
      'письм': 'letter',
      'телефон': 'phone',
      'часы': 'watch',
      'кольцо': 'ring',
      'украшен': 'jewelry',
      'свеч': 'candle',
      'лампа': 'lamp',
      'подушк': 'pillow',
      'одеял': 'blanket',
      'ткань': 'fabric',
      'игрушк': 'toy',
      'кукол': 'doll',
      'мячик': 'ball',
      'рисун': 'drawing',
      'картин': 'painting',
      'зеркал': 'mirror',
      'часы': 'clock',
      'окно': 'window',
      'дверь': 'door',
      'стул': 'chair',
      'кровать': 'bed',
      'подарок': 'gift',
      'букет': 'bouquet'
    };

    for (const [keyword, translation] of Object.entries(objectKeywords)) {
      if (content.includes(keyword)) {
        objects.push(translation);
      }
    }

    // Time context
    let timeContext = 'day';
    if (content.includes('утр') || content.includes('рассвет')) timeContext = 'morning';
    else if (content.includes('полден') || content.includes('день')) timeContext = 'daytime';
    else if (content.includes('веч') || content.includes('закат')) timeContext = 'evening';
    else if (content.includes('ноч') || content.includes('темн')) timeContext = 'night';

    return {
      characters: [...new Set(characters)], // Remove duplicates
      settings: [...new Set(settings)],
      actions: [...new Set(actions)],
      emotions: [...new Set(emotions)],
      objects: [...new Set(objects)],
      timeContext
    };
  }

  /**
   * 🎯 Build prompt from REAL content elements (NOT hardcoded)
   * Uses actual story details to create unique, specific image descriptions
   */
  private buildPromptFromRealContent(
    theme: string,
    sceneElements: ReturnType<typeof this.extractSceneElementsFromContent>,
    title: string,
    ledeText: string,
    plotBible?: PlotBible
  ): string {
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
    const sensoryPalette = plotBible?.sensoryPalette || { 
      details: ['warm', 'intimate', 'quiet', 'domestic'],
      smells: [],
      sounds: [],
      textures: [],
      lightSources: ['window light']
    };

    // Build subject from actual characters + actions
    let subject = '';
    if (sceneElements.characters.length > 0) {
      subject = `${sceneElements.characters.join(' and ')}`;
      if (sceneElements.actions.length > 0) {
        subject += ` ${sceneElements.actions[0]}`;
      }
    } else {
      subject = `Woman ${narrator.age} years old`;
      if (sceneElements.actions.length > 0) {
        subject += ` ${sceneElements.actions[0]}`;
      }
    }

    // Build setting from actual locations
    let setting = '';
    if (sceneElements.settings.length > 0) {
      setting = sceneElements.settings[0];
      if (sceneElements.settings.length > 1) {
        setting += ` near ${sceneElements.settings[1]}`;
      }
    } else {
      setting = 'domestic interior';
    }

    // Build emotion context
    let emotionContext = '';
    if (sceneElements.emotions.length > 0) {
      emotionContext = sceneElements.emotions.slice(0, 2).join(', ');
    } else {
      emotionContext = this.getThemeEmotion(theme);
    }

    // Build lighting based on time context
    let lightingDescription = '';
    switch (sceneElements.timeContext) {
      case 'morning':
        lightingDescription = 'soft morning light through window, golden and gentle';
        break;
      case 'daytime':
        lightingDescription = 'natural daylight, bright but not harsh';
        break;
      case 'evening':
        lightingDescription = 'warm evening light, golden hour glow';
        break;
      case 'night':
        lightingDescription = 'soft lamp light, subtle shadows, intimate';
        break;
      default:
        lightingDescription = 'natural window light';
    }

    // Build object details
    let objectDetails = '';
    if (sceneElements.objects.length > 0) {
      objectDetails = `\nDetails: ${sceneElements.objects.slice(0, 3).join(', ')} visible in scene.`;
    }

    const sensoryText = sensoryPalette.details && sensoryPalette.details.length > 0 
      ? sensoryPalette.details.slice(0, 5).join(', ')
      : 'warm, intimate, quiet, domestic';

    // Build final prompt from REAL content
    const finalPrompt = `
🔥 CRITICAL: NO TEXT ANYWHERE ON THE IMAGE!

AUTHENTIC mobile phone photo for article cover.
Title: "${title}"

Theme: ${theme}
Narrator: Woman ${narrator.age} years old, ${narrator.tone} voice

=== SCENE FROM ARTICLE ===
Subject: ${subject}
Setting: ${setting}, Russian domestic context
Emotion: ${emotionContext}
${objectDetails}
Time: ${sceneElements.timeContext}
Lighting: ${lightingDescription}

=== VISUAL DIRECTION ===
This is a REAL moment from the story, not staged.
Capture the actual scene described: ${sceneElements.actions.slice(0, 2).join(', ')}
The image should feel like it came from the article's world.

SENSORY PALETTE: ${sensoryText}

REQUIREMENTS:
- Natural lighting ONLY (window light, lamp, shadows, candlelight)
- Domestic realism (Russian interior, lived-in spaces, authentic)
- Amateur framing (NOT professional composition, slightly imperfect)
- Depth of field (slight background blur, smartphone bokeh)
- Slight digital noise (like real smartphone camera from 2018-2022)
- Natural colors (NOT oversaturated, NOT filter-heavy)
- Human emotion visible (real feelings from the story, not fake smile)
- Specific to this story (not generic - show elements: ${sceneElements.objects.slice(0, 2).join(', ') || 'from scene'})

🚫 MUST AVOID (CRITICAL for Яндекс.Дзен):
- ANY text, captions, titles, labels, logos, or overlays
- Watermarks or signatures
- ANY visible words or symbols
- Stock photography or glossy look
- Surrealism or strange proportions
- Western style (no American kitchens, no English text)
- Violence, gore, or shocking content
- Overly beautiful models or professional makeup
- Perfect posing or studio lighting
- Fancy interior design or luxury goods
- AI-art artifacts (uncanny valley, weird hands, wrong anatomy)

STYLE: Like photo from friend's WhatsApp or family group chat - authentic, slightly imperfect, REAL LIFE.
RESULT: 4K detail but amateur aesthetic, like real home photo taken by friend on old smartphone.
PURE IMAGE: No text, no captions, no overlays, no logos - JUST THE SCENE.
    `.trim();

    return finalPrompt;
  }

  /**
   * Get default emotion for theme
   */
  private getThemeEmotion(theme: string): string {
    const themeEmotions: Record<string, string> = {
      motherhood: 'tender, loving, protective',
      romance: 'intimate, passionate, affectionate',
      work: 'focused, determined, professional',
      travel: 'adventurous, curious, free',
      loss: 'sorrowful, contemplative, vulnerable',
      victory: 'joyful, triumphant, proud',
      conflict: 'tense, angry, raw',
      healing: 'peaceful, accepting, serene',
      transformation: 'hopeful, renewed, determined',
      domestic: 'quiet, intimate, contemplative'
    };
    return themeEmotions[theme] || 'contemplative';
  }

  /**
   * 🎯 Detect article theme from title and content
   * Returns one of: motherhood, romance, work, travel, loss, victory, conflict, healing, transformation
   */
  private detectArticleTheme(title: string, ledeText: string): string {
    const content = `${title} ${ledeText}`.toLowerCase();

    // Theme keywords mapping
    const themes: Record<string, string[]> = {
      motherhood: ['мама', 'мать', 'ребенок', 'дети', 'сын', 'дочь', 'материнск', 'беременн', 'роды', 'малыш'],
      romance: ['люб', 'любов', 'мужчина', 'женщина', 'влюб', 'пара', 'встреча', 'целов', 'обнима', 'сердц'],
      work: ['работ', 'офис', 'начальн', 'коллег', 'проект', 'встреч', 'договор', 'деньг', 'карьер', 'должност'],
      travel: ['путеш', 'дорог', 'город', 'поезд', 'машин', 'самолет', 'море', 'горы', 'страна', 'чемодан'],
      loss: ['потер', 'смерт', 'уход', 'разост', 'разлук', 'одинок', 'скорб', 'плач', 'грусть', 'скучаю'],
      victory: ['побед', 'успех', 'радост', 'счастл', 'достиг', 'преодол', 'смог', 'удалось', 'исполнил', 'мечта'],
      conflict: ['ссор', 'конфлик', 'спор', 'злост', 'гнев', 'ненав', 'вражд', 'врага', 'боролис', 'военн'],
      healing: ['исцел', 'выздоров', 'спокой', 'мир', 'прощен', 'принял', 'отпустил', 'свобод', 'облегчен', 'светл'],
      transformation: ['измени', 'новы', 'перерожд', 'воскресен', 'превращ', 'эволюц', 'развити', 'выросл', 'стала', 'начал']
    };

    // Count theme keywords
    const themeCounts: Record<string, number> = {};
    for (const [theme, keywords] of Object.entries(themes)) {
      themeCounts[theme] = keywords.filter(kw => content.includes(kw)).length;
    }

    // Return theme with most matches (or 'domestic' if no clear theme)
    const detectedTheme = Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'domestic';

    return detectedTheme;
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
   */
  private extractKeyScene(episodeText: string, plotBible: PlotBible): ExtractedScene {
    // Simple extraction logic (can be enhanced with AI)
    // Look for sensory details, character actions, and emotional moments
    
    const lines = episodeText.split('\n').filter(l => l.trim().length > 0);
    
    // Find paragraph with most sensory words
    let bestParagraph = lines[0] || '';
    let maxSensoryScore = 0;

    for (const line of lines) {
      const score = this.calculateSensoryScore(line, plotBible.sensoryPalette);
      if (score > maxSensoryScore) {
        maxSensoryScore = score;
        bestParagraph = line;
      }
    }

    // Extract components
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
   * 📝 Build authentic mobile phone photo prompt
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
   * 🤖 Generate image with specified model
   * v4.2: Using Gemini API imageConfig for aspect ratio control
   * 🆕 v5.5: Accept sceneElements to store in metadata
   */
  private async generateWithModel(
    model: string,
    prompt: string,
    idForMetadata: string | number,
    sceneElements?: ReturnType<typeof this.extractSceneElementsFromContent> // 🆕 Optional scene data
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

    // 🆕 Build scene description from extracted elements
    let sceneDescription = prompt.substring(0, 200) + "...";
    if (sceneElements) {
      sceneDescription = `Theme: Article | Characters: ${sceneElements.characters.join(', ') || 'unspecified'} | Settings: ${sceneElements.settings.join(', ') || 'unspecified'} | Emotions: ${sceneElements.emotions.join(', ') || 'unspecified'}`;
    }

    const generatedImage: GeneratedImage = {
      id: `img_${idForMetadata}_${Date.now()}`,
      base64: base64Data, // ← CLEAN base64 without data: prefix
      mimeType: "image/jpeg",  // ← ALWAYS JPEG for covers
      width: 1920, // 16:9 standard
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75), // Approximate size
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
      metadata: {
        articleId: typeof idForMetadata === 'string' ? idForMetadata : `article_${idForMetadata}`,
        sceneDescription: sceneDescription, // 🆕 Now includes scene elements
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
    const formatOk = image.mimeType === "image/jpeg" || image.mimeType === "image/jpg";
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
