/**
 * Channel Configuration System
 * Each channel has its own settings, API keys, and generation parameters
 */

export interface ChannelConfig {
  id: string;
  name: string;
  platform: 'yandex-dzen' | 'medium' | 'substack' | 'habr';
  
  // API Keys (channel-specific)
  geminiApiKey: string;
  platformApiKey?: string;
  
  // Generation Settings
  defaultTheme: string;
  defaultAngle: 'confession' | 'scandal' | 'observer';
  defaultEmotion: 'triumph' | 'guilt' | 'shame' | 'liberation';
  defaultAudience: string;
  
  // Model Configuration
  modelOutline: string;
  modelEpisodes: string;
  
  // Generation Parameters
  episodeCount: number;          // 9-12 эпизодов
  minCharacters: number;         // 32K+
  maxCharacters: number;         // 40K
  readingTimeMinutes: number;    // 6-10 минут
  
  // Output
  outputDir: string;             // ./generated/{channelId}/
  publishAutomatically: boolean;
  
  // Workflow Schedule (cron)
  scheduleUtc: string[];         // ['00:00', '03:00', '06:00', ...]
}

/**
 * YANDEX DZEN CHANNEL
 * Women 35-60, Russian-speaking, longform
 */
export const DZEN_CONFIG: ChannelConfig = {
  id: 'dzen-women-35-60',
  name: 'Яндекс.Дзен (Women 35-60)',
  platform: 'yandex-dzen',
  
  geminiApiKey: process.env.GEMINI_API_KEY_DZEN || '',
  
  defaultTheme: 'Я терпела это 20 лет',
  defaultAngle: 'confession',
  defaultEmotion: 'triumph',
  defaultAudience: 'Women 35-60',
  
  modelOutline: process.env.GEMINI_MODEL_OUTLINE || 'gemini-2.5-pro',
  modelEpisodes: process.env.GEMINI_MODEL_EPISODES || 'gemini-2.5-flash',
  
  episodeCount: 12,
  minCharacters: 32000,
  maxCharacters: 40000,
  readingTimeMinutes: 8,
  
  outputDir: './generated/dzen/',
  publishAutomatically: true,
  
  scheduleUtc: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
};

/**
 * MEDIUM CHANNEL
 * Tech entrepreneurs, English
 */
export const MEDIUM_CONFIG: ChannelConfig = {
  id: 'medium-tech-founders',
  name: 'Medium (Tech Founders)',
  platform: 'medium',
  
  geminiApiKey: process.env.GEMINI_API_KEY_MEDIUM || '',
  platformApiKey: process.env.MEDIUM_API_KEY || '',
  
  defaultTheme: 'Building in public',
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Tech Founders 25-45',
  
  modelOutline: process.env.GEMINI_MODEL_OUTLINE || 'gemini-2.5-pro',
  modelEpisodes: process.env.GEMINI_MODEL_EPISODES || 'gemini-2.5-flash',
  
  episodeCount: 10,
  minCharacters: 25000,
  maxCharacters: 35000,
  readingTimeMinutes: 7,
  
  outputDir: './generated/medium/',
  publishAutomatically: false, // Manual review first
  
  scheduleUtc: ['06:00', '12:00', '18:00'],
};

/**
 * SUBSTACK CHANNEL
 * Newsletter, US/EU audience
 */
export const SUBSTACK_CONFIG: ChannelConfig = {
  id: 'substack-newsletter',
  name: 'Substack Newsletter',
  platform: 'substack',
  
  geminiApiKey: process.env.GEMINI_API_KEY_SUBSTACK || '',
  platformApiKey: process.env.SUBSTACK_API_KEY || '',
  
  defaultTheme: 'Personal stories',
  defaultAngle: 'confession',
  defaultEmotion: 'liberation',
  defaultAudience: 'Premium Subscribers 30-50',
  
  modelOutline: process.env.GEMINI_MODEL_OUTLINE || 'gemini-2.5-pro',
  modelEpisodes: process.env.GEMINI_MODEL_EPISODES || 'gemini-2.5-flash',
  
  episodeCount: 11,
  minCharacters: 28000,
  maxCharacters: 38000,
  readingTimeMinutes: 8,
  
  outputDir: './generated/substack/',
  publishAutomatically: true,
  
  scheduleUtc: ['00:00', '06:00', '12:00', '18:00'],
};

/**
 * HABR CHANNEL
 * Russian tech community
 */
export const HABR_CONFIG: ChannelConfig = {
  id: 'habr-tech-stories',
  name: 'Habr (Tech Stories)',
  platform: 'habr',
  
  geminiApiKey: process.env.GEMINI_API_KEY_HABR || '',
  platformApiKey: process.env.HABR_API_KEY || '',
  
  defaultTheme: 'Lessons from tech',
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Tech Professionals RU 25-45',
  
  modelOutline: process.env.GEMINI_MODEL_OUTLINE || 'gemini-2.5-pro',
  modelEpisodes: process.env.GEMINI_MODEL_EPISODES || 'gemini-2.5-flash',
  
  episodeCount: 10,
  minCharacters: 30000,
  maxCharacters: 40000,
  readingTimeMinutes: 9,
  
  outputDir: './generated/habr/',
  publishAutomatically: false,
  
  scheduleUtc: ['09:00', '15:00', '21:00'],
};

/**
 * Channel Registry - Add all channels here
 */
export const CHANNELS_REGISTRY: Record<string, ChannelConfig> = {
  dzen: DZEN_CONFIG,
  medium: MEDIUM_CONFIG,
  substack: SUBSTACK_CONFIG,
  habr: HABR_CONFIG,
};

/**
 * Get channel config by ID
 */
export function getChannelConfig(channelId: string): ChannelConfig {
  const config = CHANNELS_REGISTRY[channelId];
  if (!config) {
    throw new Error(`Channel not found: ${channelId}`);
  }
  
  // Validate API key
  if (!config.geminiApiKey) {
    throw new Error(`Missing GEMINI_API_KEY for channel: ${channelId}`);
  }
  
  return config;
}

/**
 * Get all active channels
 */
export function getAllChannels(): ChannelConfig[] {
  return Object.values(CHANNELS_REGISTRY);
}

/**
 * Get channels by platform
 */
export function getChannelsByPlatform(
  platform: ChannelConfig['platform']
): ChannelConfig[] {
  return getAllChannels().filter(ch => ch.platform === platform);
}
