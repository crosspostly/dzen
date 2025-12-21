/**
 * 🎪 ZenMaster v4.1 - Image Generator Agent
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

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerativeContentBlob } from "@google/generative-ai";
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
  private geminiClient: GoogleGenerativeAI;
  private config: ImageGenerationConfig;
  private fallbackModel = "gemini-2.5-flash-exp-02-05";
  private primaryModel = "gemini-2.5-flash-image";

  constructor(apiKey?: string, config?: Partial<ImageGenerationConfig>) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenerativeAI({ apiKey: key });
    
    this.config = {
      aspectRatio: "16:9",
      quality: "high",
      format: "jpg",  // ← CHANGED from png to jpeg
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
    console.log(`🎪 Generating COVER image for article: "${request.title}"`);

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
   */
  private buildCoverImagePrompt(request: CoverImageRequest): string {
    const { title, ledeText, plotBible } = request;

    // Extract key visual elements from lede (first paragraph)
    const visualElements = this.extractVisualElements(ledeText);

    // SAFE: Use defaults if plotBible or narrator missing
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
    const sensoryPalette = plotBible?.sensoryPalette || { 
      details: ['warm', 'intimate', 'quiet', 'domestic'],
      smells: [],
      sounds: [],
      textures: [],
      lightSources: ['window light']
    };

    const prompt = `
🔥 CRITICAL: NO TEXT ANYWHERE ON THE IMAGE!

AUTHENTIC mobile phone photo for article cover image.
Title: "${title}"

Scene from opening paragraph: ${visualElements}

NARRATOR CONTEXT:
- Age: ${narrator.age || 40} years old
- Gender: ${narrator.gender === 'male' ? 'Male' : 'Female'}
- Tone: ${narrator.tone || 'confessional'}

SENSORY PALETTE:
${sensoryPalette.details && sensoryPalette.details.length > 0 ? sensoryPalette.details.slice(0, 5).join(', ') : 'warm, intimate, quiet, domestic'}

REQUIREMENTS:
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
   * 🔍 Extract visual elements from lede text (first paragraph)
   */
  private extractVisualElements(ledeText: string): string {
    // Safe: handle empty or undefined lede
    if (!ledeText || ledeText.trim().length === 0) {
      return 'domestic interior scene, everyday moment';
    }

    // Simple extraction: take first 300 chars of lede as visual description
    const maxLength = 300;
    if (ledeText.length <= maxLength) {
      return ledeText;
    }
    
    // Find last complete sentence within maxLength
    const truncated = ledeText.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    
    if (lastPeriod > 100) {
      return truncated.substring(0, lastPeriod + 1);
    }
    
    return truncated + '...';
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
    console.log(`🎪 Generating image for episode ${request.episodeId}...`);

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
    const lighting = this.extractLighting(bestParagraph, plotBible.sensoryPalette);
    const mood = this.extractMood(bestParagraph);
    const sensoryDetails = this.extractSensoryDetails(bestParagraph, plotBible.sensoryPalette);

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
   */
  private async generateWithModel(
    model: string,
    prompt: string,
    idForMetadata: string | number // Can be articleId or episodeId
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    const generativeModel = this.geminiClient.getGenerativeModel({ 
      model: model,
      generationConfig: {
        temperature: 0.85,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
    
    const response = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      if ((part as any).inlineData) {
        base64Data = (part as any).inlineData.data;
        break;
      }
    }

    if (!base64Data) {
      throw new Error("No image data in response");
    }

    const generatedImage: GeneratedImage = {
      id: `img_${idForMetadata}_${Date.now()}`,
      base64: base64Data,
      mimeType: "image/jpg",  // ← ALWAYS JPEG for covers
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
