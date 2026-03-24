/**
 * 🎨 ZenMaster v5.0 - Image Generator Agent
 * API: generateContent + Modality.IMAGE (gemini-2.5-flash-image / gemini-3-pro-image-preview)
 * НЕ используем Imagen (predict/Vertex AI)
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { GoogleGenAI, Modality } from "@google/genai";
import {
  CoverImageRequest,
  GeneratedImage,
  ImageValidationResult,
  ImageGenerationConfig
} from "../types/ImageGeneration";
import { PlotBible } from "../types/PlotBible";
import { MobilePhotoAuthenticityProcessor } from "./mobilePhotoAuthenticityProcessor";
import { MODELS } from "../constants/MODELS_CONFIG";

let DOG_REFERENCE_BASE64: string | null = null;
const DOG_REFERENCE_MIME = 'image/jpeg';

async function loadDogReference(): Promise<void> {
  try {
    const dogPath = path.join(process.cwd(), 'dog.png');
    if (!fs.existsSync(dogPath)) {
      console.warn(`⚠️  dog.png not found at ${dogPath}`);
      return;
    }
    const originalBuffer = fs.readFileSync(dogPath);
    const compressedBuffer = await sharp(originalBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    DOG_REFERENCE_BASE64 = compressedBuffer.toString('base64');
    console.log(`🐶 Dog reference loaded: ${Math.round(originalBuffer.length/1024)}KB → ${Math.round(compressedBuffer.length/1024)}KB`);
  } catch (e) {
    console.warn(`⚠️  Failed to load dog.png: ${(e as Error).message}`);
  }
}

loadDogReference();

export class ImageGeneratorAgent {
  private geminiClient: GoogleGenAI;
  private config: ImageGenerationConfig;
  private primaryModel = MODELS.IMAGE.PRIMARY;
  private fallbackModel = MODELS.IMAGE.STABLE;
  private usedPrompts: Set<string> = new Set();
  private authenticityProcessor: MobilePhotoAuthenticityProcessor;

  constructor(apiKey?: string, config?: Partial<ImageGenerationConfig>) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.config = {
      aspectRatio: "16:9",
      quality: "high",
      format: "jpg",
      maxRetries: 2,
      retryDelay: 3000,
      rateLimit: 1,
      enableFallback: true,
      optimizeForZen: true,
      ...config
    };
    this.authenticityProcessor = new MobilePhotoAuthenticityProcessor();
  }

  // ============================================
  // 🎨 MAIN GENERATION
  // ============================================

  async generateCoverImage(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🎨 Generating cover for: "${request.title}"`);
    try {
      const storyContext = this.extractStoryContext(request.title, request.ledeText, request.plotBible);
      console.log(`📖 Story context: ${storyContext.summary}`);
      const prompt = this.buildStorySpecificPrompt(storyContext, request.plotBible);
      console.log(`🎬 Prompt built (${prompt.length} chars), dog.png: ${DOG_REFERENCE_BASE64 ? 'YES ✅' : 'NO ⚠️'}`);
      return await this.generateWithGemini(this.primaryModel, prompt, request.articleId);
    } catch (error) {
      console.warn(`⚠️  Primary failed: ${(error as Error).message}`);
      if (this.config.enableFallback) {
        return await this.generateCoverImageFallback(request);
      }
      throw error;
    }
  }

  // ============================================
  // 🚀 GEMINI generateContent + Modality.IMAGE
  // ============================================

  private async generateWithGemini(
    model: string,
    prompt: string,
    idForMetadata: string | number
  ): Promise<GeneratedImage> {
    const startTime = Date.now();
    console.log(`🚀 Calling Gemini Image API: model=${model}`);

    const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];

    // Добавляем dog.png если есть
    if (DOG_REFERENCE_BASE64) {
      contents[0].parts.push({
        inlineData: { mimeType: DOG_REFERENCE_MIME, data: DOG_REFERENCE_BASE64 }
      });
    }

    const response = await this.geminiClient.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        temperature: 0.85,
      }
    });

    // Извлекаем base64 из ответа
    let base64Data: string | null = null;
    let mimeType = 'image/jpeg';

    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts || [])) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/jpeg';
          break;
        }
      }
      if (base64Data) break;
    }

    if (!base64Data || base64Data.length < 100) {
      throw new Error('No image data in Gemini response');
    }

    const generatedImage: GeneratedImage = {
      id: `img_${idForMetadata}_${Date.now()}`,
      base64: base64Data,
      mimeType,
      width: 1920,
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75),
      generatedAt: Date.now(),
      model,
      prompt,
      metadata: {
        articleId: typeof idForMetadata === 'string' ? idForMetadata : `article_${idForMetadata}`,
        sceneDescription: prompt.substring(0, 200),
        generationAttempts: 1,
        fallbackUsed: model !== this.primaryModel,
        dogReferenceUsed: !!DOG_REFERENCE_BASE64
      }
    };

    const validation = this.validateImage(generatedImage);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Mobile authenticity
    try {
      const authResult = await this.authenticityProcessor.processForMobileAuthenticity(generatedImage.base64);
      if (authResult.success && authResult.processedBuffer) {
        generatedImage.base64 = authResult.processedBuffer.toString('base64');
        generatedImage.fileSize = Math.ceil(generatedImage.base64.length * 0.75);
        generatedImage.metadata!.authenticityApplied = true;
        generatedImage.metadata!.authenticityLevel = authResult.authenticityLevel;
        generatedImage.metadata!.appliedEffects = authResult.appliedEffects;
        generatedImage.metadata!.deviceSimulated = authResult.deviceSimulated;
        console.log(`   ✅ Authenticity applied: ${authResult.appliedEffects.join(', ')}`);
      }
    } catch (authError) {
      console.warn(`   ⚠️  Authenticity error: ${(authError as Error).message}`);
    }

    console.log(`✅ Image generated in ${Date.now() - startTime}ms`);
    return generatedImage;
  }

  // ============================================
  // 🔄 FALLBACK
  // ============================================

  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Fallback: model=${this.fallbackModel}`);
    const context = this.extractStoryContext(request.title, request.ledeText, request.plotBible);
    const fallbackPrompt = `Travel photo of a golden-brown scruffy wire-haired terrier with red bandana. Scene: ${context.location}. Mood: ${context.emotionalArc.primary}. No text, no watermarks, 16:9.`;
    try {
      return await this.generateWithGemini(this.fallbackModel, fallbackPrompt, request.articleId);
    } catch (error) {
      console.error(`❌ Fallback failed:`, (error as Error).message);
      throw error;
    }
  }

  // ============================================
  // 🔍 STORY CONTEXT
  // ============================================

  private extractStoryContext(title: string, lede: string, plotBible?: PlotBible) {
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
    const protagonist = this.extractProtagonist(title, lede, narrator);
    const mainEvent = this.extractMainEvent(title, lede);
    const location = this.extractLocation(lede);
    const timeContext = this.extractTimeContext(lede);
    const emotionalArc = this.extractEmotionalArc(title, lede);
    const visibleDetails = this.extractVisibleDetails(title, lede);
    const focalPoint = this.extractFocalPoint(title, lede, visibleDetails);
    return {
      title, protagonist, mainEvent, location, timeContext,
      emotionalArc, visibleDetails, focalPoint, narrator,
      summary: `${protagonist.name}: ${mainEvent} at ${location} (${emotionalArc.primary})`
    };
  }

  private extractProtagonist(title: string, lede: string, narrator: any) {
    const isBatonPresent = /батон|пес|собака|пушист/i.test(`${title} ${lede}`.toLowerCase());
    return {
      name: 'Baton (The Mascot)',
      species: 'Dog',
      description: 'Golden-brown scruffy wire-haired terrier mix, white chest patch, large erect ears, red bandana.',
      isBaton: isBatonPresent,
      state: this.extractPhysicalState(lede),
      humanInvolved: /я |мне |мой |меня /i.test(`${title} ${lede}`.toLowerCase())
    };
  }

  private extractMainEvent(title: string, lede: string): string {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('развод') || text.includes('муж')) return 'dealing with marriage conflict';
    if (text.includes('сын') || text.includes('ребё')) return 'moment with son';
    if (text.includes('смерт') || text.includes('умер')) return 'dealing with loss and grief';
    if (text.includes('гора') || text.includes('аул') || text.includes('батон')) return 'travel adventure in the mountains';
    return 'life-changing moment';
  }

  private extractLocation(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('аул') || text.includes('заброшен') || text.includes('сакля')) return 'abandoned mountain village (ghost town)';
    if (text.includes('гора') || text.includes('хребет') || text.includes('ущел')) return 'mountain landscape with dramatic view';
    if (text.includes('дорога') || text.includes('машина') || text.includes('нива')) return 'mountain road or rugged vehicle';
    if (text.includes('кафе') || text.includes('кофейня')) return 'intimate cafe with candlelight';
    if (text.includes('кухня')) return 'kitchen with table';
    if (text.includes('парк')) return 'park bench';
    return 'apartment interior';
  }

  private extractTimeContext(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('утро') || text.includes('рассвет')) return 'morning';
    if (text.includes('вечер') || text.includes('закат')) return 'evening, golden light';
    if (text.includes('ночь')) return 'night';
    return 'daytime';
  }

  private extractEmotionalArc(title: string, lede: string): { primary: string; secondary: string[] } {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('плач') || text.includes('горе')) return { primary: 'grief and pain', secondary: ['shock', 'despair'] };
    if (text.includes('радост') || text.includes('счастли')) return { primary: 'joy and relief', secondary: ['warmth', 'connection'] };
    if (text.includes('страх') || text.includes('трево')) return { primary: 'fear and anxiety', secondary: ['uncertainty'] };
    if (text.includes('триумф') || text.includes('победа')) return { primary: 'triumph and freedom', secondary: ['strength'] };
    return { primary: 'thoughtful', secondary: ['curious', 'present'] };
  }

  private extractVisibleDetails(title: string, lede: string): string[] {
    const text = `${title}. ${lede}`.toLowerCase();
    const details: string[] = [];
    if (text.includes('бежит') || text.includes('бега')) details.push('dog running in open space');
    if (text.includes('спит') || text.includes('дремл')) details.push('dog sleeping in cozy spot');
    if (text.includes('машина') || text.includes('буханка')) details.push('dog hanging head out of car window');
    return details.length > 0 ? details : ['Baton exploring, sniffing the ground, tail up, alert ears'];
  }

  private extractFocalPoint(title: string, lede: string, visibleDetails: string[]): string {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('вид') || text.includes('горы')) return 'Baton standing at edge, gazing at mountain view';
    if (text.includes('машина')) return 'Baton leaning out of dusty 4x4 car window';
    if (text.includes('аул') || text.includes('заброшен')) return 'Baton sniffing ancient stone ruins';
    return visibleDetails[0] || 'Baton in natural pose, in his element';
  }

  private extractPhysicalState(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('дрож') || text.includes('замерз')) return 'frozen, trembling';
    if (text.includes('расслаб')) return 'relaxed';
    if (text.includes('устал')) return 'exhausted';
    return 'present and alert';
  }

  private extractPresenceContext(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('один') || text.includes('одна') || text.includes('сама')) return 'alone';
    return 'dog alone, human behind camera';
  }

  // ============================================
  // 🎬 PROMPT BUILDER
  // ============================================

  private buildStorySpecificPrompt(context: any, plotBible?: PlotBible): string {
    const location = context.location;
    const mood = context.emotionalArc.primary;
    const dogDesc = DOG_REFERENCE_BASE64
      ? 'Golden-brown scruffy wire-haired terrier mix, white chest patch, large erect ears, red bandana (see reference image).'
      : 'BREED: Golden-brown scruffy wire-haired terrier mix, white chest patch, large erect ears, bright red bandana.';

    return `Candid authentic travel smartphone photo of a dog in Russia.
Dog: ${dogDesc}
Scene: ${location}.
Action: ${context.focalPoint}.
Mood: ${mood}. Time: ${context.timeContext}.
Aspect ratio 16:9. No text, no watermarks, no cartoon, no studio lighting.
Real travel photo style.`.trim();
  }

  // ============================================
  // ✅ VALIDATION
  // ============================================

  validateImage(image: GeneratedImage): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const formatOk = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(image.mimeType);
    if (!formatOk) errors.push(`Invalid format: ${image.mimeType}`);
    if (!image.base64 || image.base64.length < 100) errors.push('Base64 data missing or too short');
    const sizeOk = image.fileSize > 1000 && image.fileSize < 10000000;
    if (!sizeOk) warnings.push(`Unusual file size: ${image.fileSize}`);
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: { dimensionsOk: true, sizeOk, formatOk, aspectRatioOk: true }
    };
  }
}

export const imageGeneratorAgent = new ImageGeneratorAgent();
