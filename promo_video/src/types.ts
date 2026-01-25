export interface VideoScene {
    id: number;
    text: string;           // Текст для озвучки (Voiceover)
    screen_text: string;    // Текст на экране (крупно, 3-5 слов)
    image_prompt: string;   // Описание для генерации картинки
    duration_estimate: number; // Примерная длительность в сек
    effect: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
    transition: 'fade' | 'cut' | 'slide';
}

export interface VideoManifest {
    title: string;
    cover_text?: string; // Текст для вступительного кадра (00:00)
    hook: string; // Текст для превью/первой секунды
    music_mood: 'dramatic' | 'happy' | 'tense' | 'calm' | 'dark_suspense_drama';
    voice_gender: 'male' | 'female';
    character_description?: string;
    scenes: VideoScene[];
    total_duration_estimate: number;
}
