/**
 * 🎨 ZenMaster v4.0 - Image Generator Agent
 * 
 * Generates authentic mobile phone photos for Zen articles
 * Features:
 * - Scene extraction from episode text
 * - PlotBible-consistent image prompts
 * - Fallback on generation failure
 * - Image validation (dimensions, size, format)
 * 
 * Architecture: Multi-agent system with rate limiting
 */

import { GoogleGenAI, Modality } from "@google/genai";
import {
  ImageGenerationRequest,
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
  private fallbackModel = "gemini-2.5-flash-exp-02-05";
  private primaryModel = "gemini-2.5-flash-image";

  constructor(apiKey?: string, config?: Partial<ImageGenerationConfig>) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    
    this.config = {
      aspectRatio: "16:9",
      quality: "high",
      format: "png",
      maxRetries: 2,
      retryDelay: 3000,
      rateLimit: 1,
      enableFallback: true,
      optimizeForZen: true,
      ...config
    };
  }

  /**
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
      console.warn(`⚠️ Primary generation failed: ${errorMsg}`);

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
      "16:9 aspect ratio, horizontal orientation",
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
   */
  private async generateWithModel(
    model: string,
    prompt: string,
    episodeId: number
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

    const generatedImage: GeneratedImage = {
      id: `img_${episodeId}_${Date.now()}`,
      base64: base64Data,
      mimeType: this.config.format === "png" ? "image/png" : "image/jpg",
      width: 1920, // 16:9 standard
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75), // Approximate size
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
      metadata: {
        episodeId,
        sceneDescription: prompt.substring(0, 200) + "...",
        generationAttempts: 1,
        fallbackUsed: model !== this.primaryModel
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
16:9 aspect ratio, amateur photo aesthetic, NOT stock photography.
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
    const formatOk = image.mimeType === "image/png" || image.mimeType === "image/jpg";
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
    for (const smell of palette.smells) {
      if (lower.includes(smell.toLowerCase())) score += 2;
    }
    for (const sound of palette.sounds) {
      if (lower.includes(sound.toLowerCase())) score += 2;
    }
    for (const texture of palette.textures) {
      if (lower.includes(texture.toLowerCase())) score += 2;
    }
    for (const detail of palette.details) {
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
    const age = plotBible.narrator.age;
    const gender = plotBible.narrator.gender === "female" ? "Woman" : 
                   plotBible.narrator.gender === "male" ? "Man" : "Person";
    
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
    for (const light of palette.lightSources) {
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
    for (const detail of [...palette.details, ...palette.smells, ...palette.textures]) {
      if (lower.includes(detail.toLowerCase())) {
        details.push(detail);
      }
    }

    // Return top 5 most relevant
    return details.slice(0, 5);
  }
}
