export interface VisualHook {
  paragraphIndex: number;
  text: string;
  weight: number;
  suggestedObject?: string;
  suggestedEmotion?: string;
  context: string;
}

export interface VisualPlan {
  hooks: VisualHook[];
  articleId: string;
}
