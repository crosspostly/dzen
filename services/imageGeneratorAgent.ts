/**
 * 🎨 ZenMaster v4.5 - Image Generator Agent
 *
 * FIXES:
 * - dog.png compressed via sharp before inlineData (was 4.5MB → now ~40KB)
 * - fetch failed error on Gemini API resolved
 * - dog.png is passed as inlineData to Gemini (multimodal)
 * - Background is taken from story context, NOT hardcoded to 'ancient mountain village'
 * - isBatonPresent no longer forced to true via || true
 * - Default visible detail matches actual dog breed
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
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
import { MobilePhotoAuthenticityProcessor } from "./mobilePhotoAuthenticityProcessor";
import { MODELS } from "../constants/MODELS_CONFIG";

// Load and compress dog reference image once at module level
let DOG_REFERENCE_BASE64: string | null = null;
let DOG_REFERENCE_MIME: 'image/jpeg' = 'image/jpeg';

async function loadDogReference(): Promise<void> {
  try {
    const dogPath = path.join(process.cwd(), 'dog.png');
    if (!fs.existsSync(dogPath)) {
      console.warn(`⚠️  dog.png not found at ${dogPath} - will use text description only`);
      return;
    }
    const originalBuffer = fs.readFileSync(dogPath);
    const originalKB = Math.round(originalBuffer.length / 1024);

    // Compress: resize to max 512px, convert to JPEG quality 85
    const compressedBuffer = await sharp(originalBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    DOG_REFERENCE_BASE64 = compressedBuffer.toString('base64');
    const compressedKB = Math.round(compressedBuffer.length / 1024);
    console.log(`🐶 Dog reference loaded & compressed: ${originalKB}KB → ${compressedKB}KB (${dogPath})`);
  } catch (e) {
    console.warn(`⚠️  Failed to load/compress dog.png: ${(e as Error).message}`);
  }
}

// Kick off async load immediately (non-blocking)
loadDogReference();

export class ImageGeneratorAgent {
  private geminiClient: GoogleGenAI;
  private config: ImageGenerationConfig;
  private fallbackModel = MODELS.IMAGE.PRIMARY;
  private primaryModel = MODELS.IMAGE.PRIMARY;
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
  // 🎨 VARIATION METHODS
  // ============================================

  private varyLocation(base: string, plotBible?: PlotBible): string {
    const locationVariations: Record<string, string[]> = {
      'apartment interior': [
        'bedroom with soft morning light',
        'kitchen with steam from kettle',
        'living room with comfortable sofa',
        'balcony with fresh plants',
        'hallway with mirror',
        'home office corner with technology',
        'cozy bedroom with personal details',
        'kitchen table with breakfast setting'
      ],
      'intimate cafe with candlelight': [
        'cozy corner cafe with warm lighting',
        'window seat in quiet coffee shop',
        'outdoor terrace with evening lights',
        'vintage bakery with pastries',
        'modern minimalist coffee place'
      ],
      'bridge over river, evening light': [
        'riverside walkway at sunset',
        'stone bridge with texture',
        'wooden dock by calm water',
        'city bridge with traffic lights',
        'seaside promenade at dusk'
      ],
      'kitchen with table': [
        'bright family kitchen',
        'small kitchen with breakfast prep',
        'spacious kitchen with island',
        'modern kitchen with clean lines',
        'traditional kitchen with warmth'
      ],
      'office building': [
        'corporate office with city view',
        'lawyer\'s office with files',
        'reception area with plants',
        'meeting room with big table',
        'modern desk with workspace'
      ],
      'park bench': [
        'autumn park with fallen leaves',
        'summer bench under trees',
        'winter bench with snow',
        'children\'s playground nearby',
        'quiet path bench with lamp'
      ],
      'street in rain': [
        'wet cobblestone street',
        'neon lights reflection on pavement',
        'busy intersection at rush hour',
        'quiet alley with shop windows',
        'suburban road with houses'
      ],
      'high window overlooking city': [
        'tower window with skyline view',
        'attic window with sunrise',
        'skyscraper glass wall',
        'balcony with panoramic view',
        'rooftop overlooking rooftops'
      ],
      'transit station': [
        'subway platform with train arriving',
        'train station hall with clock',
        'airport terminal with departures',
        'metro station with posters',
        'bus stop with shelter'
      ],
      'artist studio': [
        'creative studio with paints',
        'well-organized workshop',
        'pottery studio with clay',
        'photography studio with lights',
        'craft room with materials'
      ],
      'mountain landscape with dramatic view': [
        'high mountain ridge with valley below',
        'rocky mountain summit at dawn',
        'alpine meadow with peaks behind',
        'cliff edge overlooking gorge',
        'mountain trail with sweeping panorama'
      ],
      'abandoned mountain village (ghost town)': [
        'crumbling stone walls of a ghost village',
        'ancient aul ruins with mountain backdrop',
        'abandoned Caucasian village on steep hillside',
        'deserted mountain settlement with fog',
        'ruined highland village with grassy paths'
      ],
      'mountain road or rugged vehicle': [
        'dusty mountain road with hairpin turns',
        'old Niva 4x4 parked on rocky track',
        'unpaved mountain path with stones',
        'Soviet-era Bukhanka van on dirt road',
        'off-road trail through mountain forest'
      ]
    };

    if (plotBible?.sensoryPalette && Object.keys(plotBible.sensoryPalette).length > 0) {
      const allSensory = [
        ...(plotBible.sensoryPalette.smells || []),
        ...(plotBible.sensoryPalette.details || []),
        ...(plotBible.sensoryPalette.lightSources || [])
      ];
      const sensoryLocation = allSensory.find(p =>
        p.toLowerCase().includes('кухн') || p.toLowerCase().includes('дом') ||
        p.toLowerCase().includes('квартир') || p.toLowerCase().includes('улиц') ||
        p.toLowerCase().includes('комнат') || p.toLowerCase().includes('окон')
      );
      if (sensoryLocation) return sensoryLocation;
    }

    const variations = locationVariations[base] || [base];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  private varyInteriorStyle(): string {
    const styles = [
      'Modern Scandinavian (clean lines, light wood, white walls)',
      'Classic Traditional (warm wood, cozy textures, family details)',
      'Minimalist Contemporary (uncluttered, sleek, neutral tones)',
      'Eclectic Boheme (colorful textiles, plants, personal art)',
      'Soft Industrial (exposed textures, metal accents, warm lighting)',
      'Bright & Airy (large windows, pastel tones, open space)',
      'Cozy Rustic (natural materials, stone, linen, comfort)'
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private varyLighting(emotion: string): string {
    const lightingOptions: Record<string, string[]> = {
      'grief and pain': ['cold overhead lighting', 'dim corner with shadows', 'grey daylight from window', 'single lamp with weak bulb'],
      'joy and relief': ['golden hour warm sunlight', 'candlelight with soft glow', 'soft diffused window light', 'bright morning light'],
      'relief and peace': ['soft dawn light', 'gentle evening lamp', 'warm fireplace glow', 'natural window light'],
      'triumph and freedom': ['dramatic backlighting', 'bright expansive window light', 'high contrast sunlight', 'crisp winter light'],
      'fear and anxiety': ['uncertain flickering light', 'shadowy corner lighting', 'harsh fluorescent light', 'dim hallway illumination'],
      'anger and rage': ['sharp high contrast', 'harsh side lighting', 'intense directional spotlight', 'electric cold light'],
      'shame and regret': ['subdued soft shadows', 'intimate dim corner', 'soft window curtain light', 'moody atmospheric glow'],
      'loneliness and emptiness': ['isolated single light source', 'wide empty space shadows', 'long corridor perspective', 'distant city light through window'],
      'nostalgia and memory': ['warm vintage tones', 'soft focus nostalgic glow', 'soft sepia undertones', 'gentle misty light'],
      'thoughtful': ['diffused natural daylight', 'soft overcast light', 'warm afternoon window light', 'calm even lighting']
    };
    const options = lightingOptions[emotion] || ['natural daylight', 'soft ambient light'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private varyComposition(): string {
    const options = [
      'close-up focusing on dog face and expression',
      'medium shot showing whole dog body',
      'wide environmental shot showing dog in landscape',
      'low angle looking up at dog',
      'high angle looking down at dog',
      'rule of thirds composition with dog off-center',
      'dog in foreground, blurred background'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  private varyArtStyle(): string {
    const options = [
      'authentic smartphone travel photo',
      'candid documentary photography',
      'raw travel snapshot',
      'lifestyle travel photography',
      'real-life adventure photography'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  private varyMood(emotion: string): string {
    const moodOptions: Record<string, string[]> = {
      'grief and pain': ['heavy', 'still', 'somber'],
      'joy and relief': ['playful', 'energetic', 'happy'],
      'relief and peace': ['calm', 'serene', 'peaceful'],
      'triumph and freedom': ['bold', 'triumphant', 'free'],
      'fear and anxiety': ['alert', 'tense', 'cautious'],
      'anger and rage': ['intense', 'charged', 'restless'],
      'shame and regret': ['subdued', 'quiet', 'withdrawn'],
      'loneliness and emptiness': ['solitary', 'still', 'quiet'],
      'nostalgia and memory': ['wistful', 'gentle', 'soft']
    };
    const options = moodOptions[emotion] || ['curious', 'alert', 'adventurous'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private varySensoryPalette(plotBible?: PlotBible): string {
    if (!plotBible?.sensoryPalette || Object.keys(plotBible.sensoryPalette).length === 0) return '';
    const allSensory = [
      ...(plotBible.sensoryPalette.smells || []),
      ...(plotBible.sensoryPalette.sounds || []),
      ...(plotBible.sensoryPalette.textures || []),
      ...(plotBible.sensoryPalette.details || []),
      ...(plotBible.sensoryPalette.lightSources || [])
    ];
    if (allSensory.length === 0) return '';
    const shuffled = allSensory.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(s => `- ${s}`).join('\n');
  }

  private isPromptTooSimilar(newPrompt: string): boolean {
    const hash = newPrompt.substring(0, 100).toLowerCase()
      .replace(/[^a-zа-я0-9]/g, '').substring(0, 50);
    if (this.usedPrompts.has(hash)) return true;
    this.usedPrompts.add(hash);
    if (this.usedPrompts.size > 50) {
      const first = this.usedPrompts.values().next().value;
      this.usedPrompts.delete(first);
    }
    return false;
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
      console.log(`🎬 Prompt built (${prompt.length} chars), dog.png reference: ${DOG_REFERENCE_BASE64 ? 'YES ✅' : 'NO ⚠️'}`);

      const image = await this.generateWithModel(this.primaryModel, prompt, request.articleId);
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

  // ============================================
  // 🔍 STORY CONTEXT EXTRACTION
  // ============================================

  private extractStoryContext(title: string, lede: string, plotBible: PlotBible | undefined) {
    const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
    const protagonist = this.extractProtagonist(title, lede, narrator);
    const mainEvent = this.extractMainEvent(title, lede);
    const location = this.extractLocation(lede);
    const timeContext = this.extractTimeContext(lede);
    const emotionalArc = this.extractEmotionalArc(title, lede);
    const visibleDetails = this.extractVisibleDetails(title, lede);
    const focalPoint = this.extractFocalPoint(title, lede, visibleDetails);
    const presenceContext = this.extractPresenceContext(lede);

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

  private extractProtagonist(title: string, lede: string, narrator: any) {
    const isBatonPresent = /батон|пес|собака|пушист/i.test(`${title} ${lede}`.toLowerCase());
    return {
      name: 'Baton (The Mascot)',
      species: 'Dog',
      description: 'Golden-brown scruffy wire-haired terrier mix, white chest patch, large erect ears, wearing a red bandana.',
      isBaton: isBatonPresent,
      state: this.extractPhysicalState(lede),
      humanInvolved: /я |мне |мой |меня /i.test(`${title} ${lede}`.toLowerCase())
    };
  }

  private extractMainEvent(title: string, lede: string): string {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('развод') || text.includes('муж')) {
      if (text.includes('ненавид') || text.includes('обман') || text.includes('предател')) return 'discovering betrayal and divorce';
      return 'dealing with marriage conflict';
    }
    if (text.includes('сын') || text.includes('ребён')) {
      if (text.includes('помирил') || text.includes('мир')) return 'reconciliation with son';
      if (text.includes('ссора') || text.includes('конфлик')) return 'conflict with child';
      return 'moment with son';
    }
    if (text.includes('смерт') || text.includes('умер')) return 'dealing with loss and grief';
    if (text.includes('преодол') || text.includes('победи')) return 'overcoming a deep fear';
    if (text.includes('гора') || text.includes('аул') || text.includes('батон')) return 'travel adventure in the mountains';
    if (text.includes('первая любовь') || text.includes('встреча') || text.includes('прошлое')) return 'encountering past love';
    if (text.includes('случай') || text.includes('момент') || text.includes('день')) return 'critical moment in life';
    return 'life-changing moment';
  }

  private extractLocation(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('аул') || text.includes('заброшен') || text.includes('сакля') || text.includes('гамсутль')) return 'abandoned mountain village (ghost town)';
    if (text.includes('гора') || text.includes('хребет') || text.includes('обрыв') || text.includes('ущель')) return 'mountain landscape with dramatic view';
    if (text.includes('дорога') || text.includes('серпантин') || text.includes('машина') || text.includes('нива')) return 'mountain road or rugged vehicle';
    if (text.includes('кафе') || text.includes('кофейня') || text.includes('бар')) return 'intimate cafe with candlelight';
    if (text.includes('мост') || text.includes('набережная') || text.includes('вода')) return 'bridge over river, evening light';
    if (text.includes('дома') || text.includes('подъезд') || text.includes('прихожая')) return 'apartment entrance/hallway';
    if (text.includes('кухня')) return 'kitchen with table';
    if (text.includes('офис') || text.includes('адвокат')) return 'office building';
    if (text.includes('парк')) return 'park bench';
    if (text.includes('улица') || text.includes('дождь')) return 'street in rain';
    if (text.includes('окно') || text.includes('высот') || text.includes('этаж')) return 'high window overlooking city';
    if (text.includes('метро') || text.includes('вокзал')) return 'transit station';
    if (text.includes('мастерск') || text.includes('студи')) return 'artist studio';
    return 'apartment interior';
  }

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

  private extractEmotionalArc(title: string, lede: string): { primary: string; secondary: string[] } {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('плач') || text.includes('слёз') || text.includes('горе') || text.includes('ненавид')) return { primary: 'grief and pain', secondary: ['shock', 'betrayal', 'despair'] };
    if (text.includes('радость') || text.includes('улыбка') || text.includes('счастли')) return { primary: 'joy and relief', secondary: ['hope', 'warmth', 'connection'] };
    if (text.includes('облегчение') || text.includes('спокойн') || text.includes('мир')) return { primary: 'relief and peace', secondary: ['quiet happiness', 'acceptance', 'healing'] };
    if (text.includes('страх') || text.includes('трево') || text.includes('ужас')) return { primary: 'fear and anxiety', secondary: ['uncertainty', 'dread', 'vulnerability'] };
    if (text.includes('гнев') || text.includes('злость') || text.includes('ярость')) return { primary: 'anger and rage', secondary: ['indignation', 'determination', 'strength'] };
    if (text.includes('стыд') || text.includes('вина') || text.includes('покаяние')) return { primary: 'shame and regret', secondary: ['introspection', 'vulnerability', 'acceptance'] };
    if (text.includes('триумф') || text.includes('победа') || text.includes('преодол') || text.includes('свобод')) return { primary: 'triumph and freedom', secondary: ['strength', 'determination', 'new beginning'] };
    if (text.includes('одиночество') || text.includes('пустот')) return { primary: 'loneliness and emptiness', secondary: ['melancholy', 'introspection', 'loss'] };
    if (text.includes('прошлое') || text.includes('память')) return { primary: 'nostalgia and memory', secondary: ['longing', 'bittersweet', 'reflection'] };
    return { primary: 'thoughtful', secondary: ['curious', 'present', 'aware'] };
  }

  private extractVisibleDetails(title: string, lede: string): string[] {
    const text = `${title}. ${lede}`.toLowerCase();
    const details: string[] = [];
    if (text.includes('кость') || text.includes('грыз')) details.push('dog gnawing a large bone');
    if (text.includes('вода') || text.includes('пьет')) details.push('dog drinking from a stream or bowl');
    if (text.includes('бежит') || text.includes('бега')) details.push('dog running in open space');
    if (text.includes('спит') || text.includes('дремл')) details.push('dog sleeping in a cozy spot');
    if (text.includes('смотрит') || text.includes('вид')) details.push('dog gazing at the landscape');
    if (text.includes('грязн') || text.includes('пыль')) details.push('dog with dusty paws after trail');
    if (text.includes('машина') || text.includes('буханка')) details.push('dog hanging head out of car window');
    if (text.includes('еда') || text.includes('миска') || text.includes('корм')) details.push('dog waiting near food bowl eagerly');
    return details.length > 0 ? details : ['Baton exploring, sniffing the ground, tail up, alert ears'];
  }

  private extractFocalPoint(title: string, lede: string, visibleDetails: string[]): string {
    const text = `${title}. ${lede}`.toLowerCase();
    if (text.includes('кость')) return 'Baton gnawing on a bone, fully focused';
    if (text.includes('вид') || text.includes('горы')) return 'Baton standing at edge, gazing at the mountain view';
    if (text.includes('машина')) return 'Baton leaning out of a dusty 4x4 car window';
    if (text.includes('еда') || text.includes('кухн')) return 'Baton sitting, ears up, watching the cook';
    if (text.includes('аул') || text.includes('заброшен')) return 'Baton sniffing ancient stone ruins';
    if (text.includes('дорога') || text.includes('тропа')) return 'Baton trotting confidently on mountain trail';
    return visibleDetails[0] || 'Baton in natural pose, in his element';
  }

  private extractPresenceContext(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('один') || text.includes('одна') || text.includes('сама')) return 'alone';
    if (text.includes('муж')) return 'with human companion';
    if (text.includes('сын') || text.includes('дочь') || text.includes('ребён')) return 'with child';
    if (text.includes('подруг') || text.includes('друг')) return 'with friend';
    if (text.includes('мать') || text.includes('мама')) return 'with mother';
    return 'dog alone, human behind camera';
  }

  private extractPhysicalState(lede: string): string {
    const text = lede.toLowerCase();
    if (text.includes('дрож') || text.includes('стояла') || text.includes('замерз')) return 'frozen, trembling, in shock';
    if (text.includes('расслаб') || text.includes('мирн')) return 'relaxed and peaceful';
    if (text.includes('спешн') || text.includes('торопл')) return 'rushing, urgent';
    if (text.includes('устал')) return 'exhausted';
    return 'present and alert';
  }

  // ============================================
  // 🎬 PROMPT BUILDER
  // ============================================

  private buildStorySpecificPrompt(context: any, plotBible?: PlotBible): string {
    const location = this.varyLocation(context.location, plotBible);
    const lighting = this.varyLighting(context.emotionalArc.primary);
    const composition = this.varyComposition();
    const artStyle = this.varyArtStyle();
    const mood = this.varyMood(context.emotionalArc.primary);

    const backgroundDescription = this.locationToBackgroundDescription(context.location, location);

    const referenceNote = DOG_REFERENCE_BASE64
      ? 'REFERENCE IMAGE PROVIDED: Draw THIS EXACT DOG from the reference photo — same breed, same markings, same red bandana. Replicate the exact appearance.'
      : 'BREED: Golden-brown scruffy wire-haired terrier mix, white chest patch, large erect ears, bright red bandana.';

    return `🎬 TRAVEL PHOTO — BATON THE DOG

${referenceNote}

📖 STORY CONTEXT:
Title: ${context.title}
Event: ${context.mainEvent}
Time: ${context.timeContext}

🐶 WHAT BATON IS DOING:
${context.focalPoint}
${context.visibleDetails.slice(0, 2).map((d: string) => `- ${d}`).join('\n')}
Mood: ${mood}

📍 LOCATION (from the story):
Scene: ${location}
Background: ${backgroundDescription}
Lighting: ${lighting}

📸 PHOTO STYLE:
- ${artStyle}
- ${composition}
- 16:9 cinematic format
- Natural authentic smartphone photo (NOT studio, NOT stock)
- Baton is the main subject, NOT humans
- Dog is NOT posing or looking at camera — candid moment

🚫 NEVER:
- No text, watermarks, captions
- No white fluffy dogs (wrong breed)
- No cartoon or illustrated style
- No humans as main subject
- Background must match story location (NOT always mountains/ruins)
`.trim();
  }

  private locationToBackgroundDescription(locationKey: string, variedLocation: string): string {
    const descriptions: Record<string, string> = {
      'abandoned mountain village (ghost town)': 'crumbling stone walls, overgrown paths, ancient Caucasian aul ruins, dramatic mountain peaks behind',
      'mountain landscape with dramatic view': 'sweeping mountain panorama, rocky ridge, alpine vegetation, blue sky with clouds',
      'mountain road or rugged vehicle': 'dusty unpaved mountain road, hairpin turns visible, old 4x4 vehicle nearby, rocky terrain',
      'apartment interior': 'cozy home interior, natural window light, lived-in domestic space',
      'intimate cafe with candlelight': 'warm coffee shop interior, soft light, wooden tables, steam from cups',
      'bridge over river, evening light': 'city river view, stone bridge railing, golden evening light on water',
      'kitchen with table': 'domestic kitchen, cooking smells implied, table with food or dishes',
      'office building': 'professional office space, city view through glass, work environment',
      'park bench': 'tree-lined park, seasonal foliage, pedestrian paths, natural city park',
      'street in rain': 'wet urban street, neon reflections on pavement, grey sky, umbrellas',
      'high window overlooking city': 'city skyline visible through large window, urban panorama, height implied',
      'transit station': 'metro or train station platform, architectural space, movement implied',
      'artist studio': 'creative workspace, art supplies, interesting light, organised chaos',
      'apartment entrance/hallway': 'apartment building corridor, letterboxes, concrete or tiled floor'
    };
    return descriptions[locationKey] || variedLocation;
  }

  // ============================================
  // 🚀 MODEL CALL (with compressed dog.png reference)
  // ============================================

  private async generateWithModel(
    model: string,
    prompt: string,
    idForMetadata: string | number
  ): Promise<GeneratedImage> {
    const startTime = Date.now();

    const parts: any[] = [];

    if (DOG_REFERENCE_BASE64) {
      parts.push({
        inlineData: {
          mimeType: DOG_REFERENCE_MIME,
          data: DOG_REFERENCE_BASE64
        }
      });
    }

    parts.push({ text: prompt });

    const response = await this.geminiClient.models.generateContent({
      model: model,
      contents: { parts },
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
      mimeType: "image/jpg",
      width: 1920,
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75),
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
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
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`🔧 Stage 4: Applying mobile photo authenticity...`);
    try {
      const authResult = await this.authenticityProcessor.processForMobileAuthenticity(generatedImage.base64);
      if (authResult.success && authResult.processedBuffer) {
        generatedImage.base64 = authResult.processedBuffer.toString('base64');
        generatedImage.fileSize = generatedImage.base64.length * 0.75;
        generatedImage.metadata!.authenticityApplied = true;
        generatedImage.metadata!.authenticityLevel = authResult.authenticityLevel;
        generatedImage.metadata!.appliedEffects = authResult.appliedEffects;
        generatedImage.metadata!.deviceSimulated = authResult.deviceSimulated;
        console.log(`   ✅ Authenticity applied. Effects: ${authResult.appliedEffects.join(', ')}`);
      } else {
        console.warn(`   ⚠️  Authenticity processing failed: ${authResult.errorMessage}`);
      }
    } catch (authError) {
      console.warn(`   ⚠️  Authenticity error: ${(authError as Error).message}`);
    }

    console.log(`✅ Image generated in ${Date.now() - startTime}ms (dog ref: ${DOG_REFERENCE_BASE64 ? 'yes' : 'no'})`);
    return generatedImage;
  }

  // ============================================
  // 🔄 FALLBACK
  // ============================================

  private async generateCoverImageFallback(request: CoverImageRequest): Promise<GeneratedImage> {
    console.log(`🔄 Fallback: Generating simplified cover...`);
    const context = this.extractStoryContext(request.title, request.ledeText, request.plotBible);
    const fallbackPrompt = `Travel photo of a golden-brown scruffy wire-haired terrier dog with a red bandana.\nScene: ${context.location}\nMood: ${context.emotionalArc.primary}\nNo text, no watermarks, authentic photo style.`;
    try {
      return await this.generateWithModel(this.fallbackModel, fallbackPrompt, request.articleId);
    } catch (error) {
      console.error(`❌ Fallback failed:`, (error as Error).message);
      throw error;
    }
  }

  // ============================================
  // ✅ VALIDATION
  // ============================================

  validateImage(image: GeneratedImage): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dimensionsOk = image.width === 1920 && image.height === 1080;
    if (!dimensionsOk) errors.push(`Invalid dimensions: ${image.width}x${image.height}`);
    const sizeOk = image.fileSize > 10000 && image.fileSize < 5000000;
    if (!sizeOk) warnings.push(`Unusual file size: ${image.fileSize} bytes`);
    const formatOk = image.mimeType === "image/jpg" || image.mimeType === "image/png";
    if (!formatOk) errors.push(`Invalid format: ${image.mimeType}`);
    if (!image.base64 || image.base64.length < 100) errors.push("Base64 data missing or too short");
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: { dimensionsOk, sizeOk, formatOk, aspectRatioOk: true }
    };
  }
}

export const imageGeneratorAgent = new ImageGeneratorAgent();
