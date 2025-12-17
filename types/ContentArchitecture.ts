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
  
  lede: string;                    // 600-900 символов
  finale: string;                  // 1200-1800 символов
  
  voicePassport: VoicePassport;
  
  metadata: {
    totalChars: number;            // 32-40K
    totalReadingTime: number;      // в минутах
    episodeCount: number;
    sceneCount: number;
    dialogueCount: number;
  };
}
