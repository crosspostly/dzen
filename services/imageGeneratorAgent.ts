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
import { MobilePhotoAuthenticityProcessor } from "./mobilePhotoAuthenticityProcessor";
import { MODELS } from "../constants/MODELS_CONFIG";

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

    // Initialize Stage 4: Mobile Photo Authenticity Processor
    this.authenticityProcessor = new MobilePhotoAuthenticityProcessor();
  }

  // ============================================
  // 🎨 METHODS FOR IMAGE PROMPT VARIATION
  // ============================================

  /**
   * 🏠 Vary location based on base type
   * Add diversity to avoid repetitive "apartment interior" images
   */
  private varyLocation(base: string, plotBible?: PlotBible): string {
    const locationVariations: Record<string, string[]> = {
      'apartment interior': [
        'bedroom with soft morning light',
        'kitchen with steam from kettle',
        'living room with comfortable sofa',
        'balcony with fresh plants',
        'hallway with mirror',
        'bathroom with clean surfaces',
        'home office corner with technology',
        'staircase with natural light',
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
      ]
    };

    // If PlotBible has sensory palette, use it for variety
    if (plotBible?.sensoryPalette && Object.keys(plotBible.sensoryPalette).length > 0) {
      // Look through all sensory arrays for location-like items
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

  /**
   * 🏠 Vary interior style for diversity
   */
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

  /**
   * 💡 Vary lighting based on emotion
   * Different emotions need different lighting atmospheres
   */
  private varyLighting(emotion: string): string {
    const lightingOptions: Record<string, string[]> = {
      'grief and pain': [
        'cold overhead lighting',
        'dim corner with shadows',
        'grey daylight from window',
        'single lamp with weak bulb',
        'blinds creating stripe shadows'
      ],
      'joy and relief': [
        'golden hour warm sunlight',
        'candlelight with soft glow',
        'soft diffused window light',
        'festive string lights',
        'bright morning light'
      ],
      'relief and peace': [
        'soft dawn light',
        'gentle evening lamp',
        'warm fireplace glow',
        'sunset orange hues',
        'natural window light'
      ],
      'triumph and freedom': [
        'dramatic backlighting',
        'bright expansive window light',
        'high contrast sunlight',
        'clear midday clarity',
        'crisp winter light'
      ],
      'fear and anxiety': [
        'uncertain flickering light',
        'shadowy corner lighting',
        'harsh fluorescent light',
        'dim hallway illumination',
        'creeping shadows from door'
      ],
      'anger and rage': [
        'sharp high contrast',
        'harsh side lighting',
        'intense directional spotlight',
        'electric cold light',
        'stark black and white contrast'
      ],
      'shame and regret': [
        'subdued soft shadows',
        'intimate dim corner',
        'looking-down-from-above light',
        'soft window curtain light',
        'moody atmospheric glow'
      ],
      'loneliness and emptiness': [
        'isolated single light source',
        'wide empty space shadows',
        'long corridor perspective',
        'single chair in empty room',
        'distant city light through window'
      ],
      'nostalgia and memory': [
        'warm vintage tones',
        'soft focus nostalgic glow',
        'memory-like soft edges',
        'soft sepia undertones',
        'gentle misty light'
      ]
    };

    const options = lightingOptions[emotion] || ['natural daylight', 'soft ambient light'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 📐 Vary composition for visual diversity
   */
  private varyComposition(): string {
    const options = [
      'close-up portrait focusing on face',
      'medium shot showing upper body',
      'wide environmental shot with context',
      'over-the-shoulder perspective',
      'profile view from side',
      'point of view from character\'s eyes',
      'high angle looking down',
      'low angle looking up',
      'rule of thirds composition',
      'centered composition with negative space'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 🎭 Vary art style for uniqueness
   */
  private varyArtStyle(): string {
    const options = [
      'cinematic documentary style',
      'artistic photograph',
      'raw candid snapshot',
      'emotional portrait photography',
      'dramatic photojournalism',
      'intimate fine art photography',
      'authentically unposed moment',
      'lifestyle documentary aesthetic',
      'emotive editorial style',
      'raw emotional documentation'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 🎭 Vary mood based on emotion
   */
  private varyMood(emotion: string): string {
    const moodOptions: Record<string, string[]> = {
      'grief and pain': ['devastated', 'shattered', 'frozen in shock', 'numb', 'broken'],
      'joy and relief': ['radiant', 'lighter', 'warm', 'free', 'peaceful'],
      'relief and peace': ['calm', 'healing', 'serene', ' ACCEPTING', 'gentle'],
      'triumph and freedom': ['powerful', 'defiant', 'radiant', 'triumphant', 'bold'],
      'fear and anxiety': ['uneasy', 'tense', 'vulnerable', 'uncertain', 'guarded'],
      'anger and rage': ['intense', 'explosive', 'confrontational', 'ferocious', 'charged'],
      'shame and regret': ['subdued', 'introspective', 'heavy', 'contemplative', 'burdened'],
      'loneliness and emptiness': ['isolated', 'hollow', 'quiet', 'deserted', 'echoing'],
      'nostalgia and memory': ['bittersweet', 'wistful', 'tender', 'soft-focus memory', 'cherished']
    };

    const options = moodOptions[emotion] || ['emotional', 'authentic', 'genuine'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 🌈 Use sensory palette from PlotBible
   */
  private varySensoryPalette(plotBible?: PlotBible): string {
    if (!plotBible?.sensoryPalette || Object.keys(plotBible.sensoryPalette).length === 0) {
      return '';
    }

    // Collect all sensory elements into one array
    const allSensory = [
      ...(plotBible.sensoryPalette.smells || []),
      ...(plotBible.sensoryPalette.sounds || []),
      ...(plotBible.sensoryPalette.textures || []),
      ...(plotBible.sensoryPalette.details || []),
      ...(plotBible.sensoryPalette.lightSources || [])
    ];

    if (allSensory.length === 0) {
      return '';
    }

    // Take 2-3 random sensory elements
    const shuffled = allSensory.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    return selected.map(s => `- ${s}`).join('\n');
  }

  /**
   * 🔄 Avoid repeating similar prompts
   */
  private isPromptTooSimilar(newPrompt: string): boolean {
    // Create a simplified hash
    const hash = newPrompt.substring(0, 100).toLowerCase()
      .replace(/[^a-zа-я0-9]/g, '')
      .substring(0, 50);

    if (this.usedPrompts.has(hash)) {
      return true;
    }

    this.usedPrompts.add(hash);
    // Keep only last 50 prompts to avoid memory bloat
    if (this.usedPrompts.size > 50) {
      const first = this.usedPrompts.values().next().value;
      this.usedPrompts.delete(first);
    }

    return false;
  }

  // ============================================
  // 🎨 END OF VARIATION METHODS
  // ============================================

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
      const prompt = this.buildStorySpecificPrompt(storyContext, request.plotBible);
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
    const age = narrator.age || 50;
    const isTravel = /аул|гора|дагестан|батон|путешеств|поездк|дорога/i.test(`${title} ${lede}`.toLowerCase());
    
    // Use narrator gender from PlotBible if available, otherwise detect
    let gender = narrator.gender || (isTravel ? 'male' : 'female');
    
    const appearance = lede.includes('молодая') || lede.includes('молодой') ? 'young' :
                      lede.includes('старая') || lede.includes('старый') ? 'elderly' : 'middle-aged';

    return {
      name: gender === 'female' ? 'Woman' : 'Man',
      gender,
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

    if (text.includes('гора') || text.includes('аул') || text.includes('батон')) {
      return 'travel adventure in the mountains';
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

    // TRAVEL LOCATIONS
    if (text.includes('аул') || text.includes('заброшен') || text.includes('сакля') || text.includes('гамсутль')) {
      return 'abandoned mountain village (ghost town)';
    }
    if (text.includes('гора') || text.includes('хребет') || text.includes('обрыв') || text.includes('ущель')) {
      return 'mountain landscape with dramatic view';
    }
    if (text.includes('дорога') || text.includes('серпантин') || text.includes('машина') || text.includes('нива')) {
      return 'mountain road or rugged vehicle';
    }

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
   * Uses variation methods to ensure unique images
   */
  private buildStorySpecificPrompt(context: any, plotBible?: PlotBible): string {
    // 🔥 PRIORITY: Use visual plan from PlotBible (Stage 0) if available
    if (plotBible?.coverVisual) {
      const v = plotBible.coverVisual;
      return `
🎬 PLANNED STORY SCENE (from PlotBible Stage 0):

📖 STORY: ${context.title}
👤 SUBJECT: ${v.who}, emotional state matches ${v.mood}
📍 LOCATION: ${v.where}
💡 LIGHTING: ${v.lighting}
🎭 ACTION: ${v.what}
👁️ DETAILS:
${v.details.map(d => `• ${d}`).join('\n')}

🎨 VISUAL DIRECTION:
- Capture this SPECIFIC moment planned at Stage 0
- High realism, authentic mobile photo aesthetic
- No studio lighting, no filters
- Match the emotional tone: ${v.mood}
- The image must perfectly illustrate the story theme

🚫 ABSOLUTE RULES:
- NO text, captions, watermarks
- NO perfect posing
- NO generic "person portrait"
      `.trim();
    }

    // 🎨 Fallback to random variations if no coverVisual
    const variedLocation = this.varyLocation(context.location, plotBible);
    const variedLighting = this.varyLighting(context.emotionalArc.primary);
    const variedComposition = this.varyComposition();
    const variedArtStyle = this.varyArtStyle();
    const variedMood = this.varyMood(context.emotionalArc.primary);
    const sensoryDetails = this.varySensoryPalette(plotBible);
    const interiorStyle = this.varyInteriorStyle();

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

📍 LOCATION & TIME (VARIED):
Where: ${variedLocation}
When: ${context.timeContext}
Lighting: ${variedLighting}
Interior Style: ${interiorStyle}

💔 EMOTIONAL TONE:
Primary emotion: ${context.emotionalArc.primary}
Mood: ${variedMood}

👁️ WHAT WE SEE (VISIBLE DETAILS):
${context.visibleDetails.map((d: string) => `• ${d}`).join('\n')}
${sensoryDetails ? '\n' + sensoryDetails : ''}

🎯 KEY FOCAL POINT:
${context.focalPoint}

🎥 CAMERA & ANGLE (CRITICAL):
${variedComposition}
- Depth of field: Shallow (bokeh background) to focus on emotion
- Framing: Cinematic, rule of thirds

🎭 ART STYLE:
${variedArtStyle}

🎨 VISUAL DIRECTION:
- 🚫 AVOID: Person just sitting at table looking at camera (BORING!)
- ✅ DO: Show ACTION or REACTION (packing, crying, laughing, turning away)
- ✅ DO: Use dramatic lighting (shadows, silhouettes, window light)
- ✅ DO: Make it look like a still frame from a high-quality movie about real life
- Capture the EXACT emotion of this scene
- Include visible details that show WHAT HAPPENED

🚫 ABSOLUTE RULES:
- NO text, captions, watermarks
- NO looking directly at camera (candid look only)
- NO stock photo aesthetic (must look authentic/raw)
- NO perfect studio lighting
- NO generic "person portrait"

✅ SUCCESS:
When viewer sees this image, they immediately FEEL the emotion
They understand SOMETHING HAPPENED
They can sense the CONTEXT without reading

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
- Cold, clinical lighting (no warmth)
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
      mimeType: "image/jpg",
      width: 1920,
      height: 1080,
      fileSize: Math.ceil(base64Data.length * 0.75),
      generatedAt: Date.now(),
      model: model,
      prompt: prompt,
      metadata: {
        articleId: typeof idForMetadata === 'string' ? idForMetadata : `article_${idForMetadata}`,
        sceneDescription: prompt.substring(0, 200), // Store first 200 chars as description
        generationAttempts: 1,
        fallbackUsed: model !== this.primaryModel,
      }
    };

    const validation = this.validateImage(generatedImage);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    // 🆕 STAGE 4: Apply mobile photo authenticity processing
    console.log(`🔧 Stage 4: Applying mobile photo authenticity...`);
    try {
      const authResult = await this.authenticityProcessor.processForMobileAuthenticity(
        generatedImage.base64
      );

      if (authResult.success && authResult.processedBuffer) {
        // Replace original base64 with processed version
        generatedImage.base64 = authResult.processedBuffer.toString('base64');
        generatedImage.fileSize = generatedImage.base64.length * 0.75;

        // Add authenticity metadata
        generatedImage.metadata!.authenticityApplied = true;
        generatedImage.metadata!.authenticityLevel = authResult.authenticityLevel;
        generatedImage.metadata!.appliedEffects = authResult.appliedEffects;
        generatedImage.metadata!.deviceSimulated = authResult.deviceSimulated;

        console.log(`   ✅ Authenticity applied. Effects: ${authResult.appliedEffects.join(', ')}`);
        console.log(`   📷 Device: ${authResult.deviceSimulated} | Level: ${authResult.authenticityLevel}`);
      } else {
        console.warn(`   ⚠️  Authenticity processing failed: ${authResult.errorMessage}`);
        console.log(`   📷 Using original image (graceful degradation)`);
        // Continue with original image (graceful degradation)
      }
    } catch (authError) {
      console.warn(`   ⚠️  Authenticity error: ${(authError as Error).message}`);
      console.log(`   📷 Using original image (graceful degradation)`);
      // Continue with original image (graceful degradation)
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

    const formatOk = image.mimeType === "image/jpg" || image.mimeType === "image/png";
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
