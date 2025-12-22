// ============================================================================
// ZenMaster v2.0 — Content Architecture Types
// 35K+ Longform Article Structure (9-12 episodes)
// ============================================================================

export interface Episode {
  id: number;                  // 1-12
  title: string;              // "Эпизод 1: ..."
  
  content: string;            // 2400-3200 символов
  charCount: number;
  
  openLoop: string;           // Описание нерешённого вопроса
  turnPoints: string[];       // Что меняется в этом эпизоде
  
  emotions: string[];         // ["гнев", "стыд"]
  keyScenes: string[];        // ["кухня", "звонок", "письмо"]
  characters: {
    name: string;
    role: "protagonist" | "antagonist" | "witness";
    description: string;      // Одна строка
  }[];
  
  generatedAt: number;
  stage: "draft" | "montage" | "humanized";
  
  // 🖼️ ИЗОБРАЖЕНИЯ
  imageBuffer?: Buffer;       // Буфер обработанного изображения
  imagePath?: string;         // Путь к сохраненному файлу
  
  // 🆕 PHASE 2: Per-episode anti-detection metrics
  phase2Metrics?: {
    adversarialScore: number;
    breakdown: {
      perplexity: number;
      variance: number;
      colloquialism: number;
      authenticity: number;
    };
    modificationStats: {
      originalLength: number;
      finalLength: number;
      perplexityIncrease: number;
      sentenceVariance: number;
    };
    suggestion: string;
  };
}

export interface EpisodeOutline {
  id: number;
  title: string;
  hookQuestion: string;
  externalConflict: string;
  internalConflict: string;
  keyTurning: string;
  openLoop: string;
}

export interface OutlineStructure {
  theme: string;
  angle: string;              // confession, scandal, observer
  emotion: string;            // guilt, shame, triumph, anger
  audience: string;           // e.g. "Women 35-60"
  
  episodes: EpisodeOutline[];
  
  externalTensionArc: string;
  internalEmotionArc: string;
  characterMap: {
    [name: string]: {
      role: string;
      arc: string;
    };
  };
  forbiddenClichés: string[];
  
  // 🎭 PLOT BIBLE - Generated in Stage 0 by Gemini
  plotBible?: {
    narrator: {
      age: number;
      gender: "male" | "female";
      tone: string;
      voiceHabits: {
        apologyPattern: string;
        doubtPattern: string;
        memoryTrigger: string;
        angerPattern: string;
      };
    };
    sensoryPalette: {
      details: string[];
      smells: string[];
      sounds: string[];
      textures: string[];
      lightSources: string[];
    };
    characterMap: {
      [name: string]: {
        role: string;
        arc: string;
      };
    };
    thematicCore: {
      centralQuestion: string;
      emotionalArc: string;
      resolutionStyle: string;
    };
  };
}

export interface VoicePassport {
  apologyPattern: string;
  doubtPattern: string;
  memoryTrigger: string;
  characterSketch: string;
  humorStyle: "self-irony" | "bitter" | "kind" | "dark";
  jokeExample: string;
  angerPattern: string;
  paragraphEndings: ("question" | "pause" | "short_phrase" | "exclamation")[];
  examples: string[];
}

export interface LongFormArticle {
  id: string;
  title: string;
  outline: OutlineStructure;
  episodes: Episode[];

  lede: string; // 600-900 символов
  finale: string; // 1200-1800 символов

  voicePassport: VoicePassport;

  metadata: {
    totalChars: number; // 32-40K
    totalReadingTime: number; // в минутах
    episodeCount: number;
    sceneCount: number;
    dialogueCount: number;
  };

  generation?: {
    modelOutline?: string;
    modelEpisodes?: string;
    channelConfig?: string;
    generatedAt?: string;
  };

  // 🖼️ ИЗОБРАЖЕНИЯ
  hasImages?: boolean;        // Флаг наличия изображений
  totalImages?: number;       // Количество изображений
  coverImage?: {              // ✅ Added for v4.0 compatibility
    base64?: string;
    processedBuffer?: Buffer;
    format?: string;
  };
  imageMetadata?: {
    aspectRatio: string;      // "16:9"
    resolution: string;       // "1280x720"
    format: string;           // "JPEG"
    quality: number;          // 0.8
    metadataCleaned: boolean; // true после очистки
  };

  // 🎭 PHASE 2: ANTI-DETECTION DATA
  processedContent?: string;        // Content after Phase2 processing
  adversarialScore?: AdversarialScore; // Anti-detection metrics
  phase2Applied?: boolean;          // Flag indicating Phase2 was applied
}

// ============================================================================
// PHASE 2: ANTI-DETECTION COMPONENTS
// ============================================================================

export interface PerplexityMetrics {
  score: number;                   // 1.0-5.0 (higher = more entropy)
  wordFrequency: Map<string, number>;
  rarityRatio: number;             // 0-1 (higher = more rare words)
}

export interface BurstinessMetrics {
  standardDeviation: number;       // Std dev of sentence lengths
  minLength: number;
  maxLength: number;
  variance: number;
  distribution: "uniform" | "balanced" | "bursty";
}

export interface SkazMetrics {
  particleCount: number;           // Count of Russian particles
  syntaxDislocations: number;      // Non-standard word order instances
  dialectalWords: number;          // Count of non-standard lexicon
  score: number;                   // 0-100
}

export interface AdversarialScore {
  perplexity: number;              // 0-100
  burstiness: number;              // 0-100
  skazRussianness: number;         // 0-100
  contentLength: number;           // 0-100
  noClichés: number;               // 0-100
  overallScore: number;            // 0-100
  passesAllChecks: boolean;        // ≥80 = ready to publish
  issues: string[];                // List of issues found
}

export interface SanitizedImage {
  originalPath: string;
  processedPath: string;
  metadataRemoved: boolean;
  noiseAdded: boolean;
  noiseLevel: number;              // 2-5% (percentage)
  timestamp: number;
}

// ============================================================================
// ENGAGEMENT SCORE ANALYSIS
// ============================================================================

export interface EngagementAnalysis {
  score: number;                   // 0-100 overall engagement score
  factors: {
    hookStrength: number;          // "но", "вдруг", крючки (0-100)
    emotionalIntensity: number;    // эмоциональные слова (0-100)
    specificity: number;           // конкретные детали (0-100)
    dialogueRatio: number;         // % диалогов + действий (0-100)
    brevityVariance: number;       // разнообразие длины предложений (0-100)
  };
  isProblem: boolean;              // true если score < 45
  recommendations: string[];       // предложения если проблема
}
