import { LongFormArticle } from './types/ContentArchitecture';

export interface Article {
  id: string;
  title: string;
  content: string;
  images: string[];
  createdAt: number;
  rubric: string;
  themes: string[];
  triggers: string[];
  style: string;
}

export enum GenerationState {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  WRITING = 'WRITING',
  STORYBOARDING = 'STORYBOARDING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  POST_PROCESSING = 'POST_PROCESSING',
  OUTLINE_GENERATION = 'OUTLINE_GENERATION',
  EPISODE_GENERATION = 'EPISODE_GENERATION',
  ANTI_DETECTION = 'ANTI_DETECTION',
  MONTAGE = 'MONTAGE',
  HUMANIZATION = 'HUMANIZATION',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type { LongFormArticle }

export interface RubricData {
  name: string;
  triggers: string[];
  entities: string[];
}

export const ZEN_STYLES = [
  { id: 'confession', name: 'Исповедь (от 1-го лица)', icon: '🗣️' },
  { id: 'scandal', name: 'Скандальная история', icon: '🔥' },
  { id: 'observer', name: 'Рассказ очевидца', icon: '👀' },
  { id: 'expert', name: 'Поучительная притча', icon: '🎓' }
];
