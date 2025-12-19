/**
 * 📖 ZenMaster v4.0 - PlotBible Types
 * 
 * PlotBible is the DNA of the narrative - defines characters, voice, world, and constraints.
 * Used across all agents (episode, image, title) for consistency.
 */

export interface PlotBible {
  narrator: NarratorProfile;
  protagonist: CharacterProfile;
  antagonist?: CharacterProfile;
  sensoryPalette: SensoryPalette;
  timeline: TimelineStructure;
  forbiddenThemes: string[];
}

export interface NarratorProfile {
  gender: "male" | "female" | "neutral";
  age: number; // 35-65 typical for Zen
  tone: string; // "intelligent irony" | "bitter humor" | "wise sadness"
  voiceMarkers: string[]; // ["я же тебе скажу", "честное слово", "вот тогда и началось"]
  education?: string; // "высшее" | "среднее" | "самообразование"
  socialStatus?: string; // "middle class" | "working class" | "professional"
}

export interface CharacterProfile {
  name: string;
  age: number;
  traits: string[]; // ["smart", "brave", "confused", "manipulative"]
  motivation: string; // "find truth" | "protect secret" | "survive"
  arc?: string; // "from denial to acceptance" | "from victim to survivor"
  occupation?: string;
  relationships?: Record<string, string>; // {"daughter": "protective", "husband": "distant"}
}

export interface SensoryPalette {
  smells: string[]; // ["cold tea getting old", "fresh coffee smell", "window dust in sunlight"]
  sounds: string[]; // ["phone notification sound", "clock ticking", "door slam"]
  textures: string[]; // ["worn envelope paper", "cold desk surface", "soft blanket"]
  details: string[]; // ["old curtains", "Soviet furniture", "tea cups with flowers"]
  lightSources: string[]; // ["morning sunlight", "desk lamp yellow light", "window reflection"]
}

export interface TimelineStructure {
  present: string; // "2025 год, декабрь, квартира в городе"
  flashbacks: TimelineEvent[];
  futureHints?: string[]; // Foreshadowing elements
}

export interface TimelineEvent {
  when: string; // "5 лет назад" | "в детстве" | "прошлой зимой"
  what: string; // Brief description
  significance: string; // Why this matters to the story
}

/**
 * Scene description optimized for image generation
 */
export interface SceneVisual {
  who: string; // "Woman 40s" | "Two friends at table"
  where: string; // "kitchen" | "living room with window"
  what: string; // "making tea" | "crying, holding hands"
  lighting: string; // "morning sunlight" | "desk lamp yellow light"
  mood: string; // "tense" | "sad" | "revelatory"
  details: string[]; // ["old curtains", "cold tea cup", "phone on table"]
}

/**
 * Voice consistency markers
 */
export interface VoiceConsistency {
  sentencePatterns: string[]; // Typical sentence structures
  vocabularyLevel: "simple" | "medium" | "sophisticated";
  slangUsage: "none" | "occasional" | "frequent";
  metaphorStyle: "direct" | "literary" | "folk";
  paragraphLength: "short" | "medium" | "long";
  emotionalRange: "controlled" | "expressive" | "volatile";
}
