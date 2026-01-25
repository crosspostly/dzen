/**
 * Channel Configuration System
 * Each channel has its own settings, API keys, and generation parameters
 */

export interface ChannelConfig {
  id: string;
  name: string;
  platform: 'yandex-dzen' | 'medium' | 'substack' | 'habr';
  
  // API Keys (channel-specific - DIFFERENT for each!)
  geminiApiKey: string;        // SEPARATE key for this channel
  platformApiKey?: string;     // Medium/Substack/Habr API
  
  // Generation Settings
  defaultTheme: string;
  defaultAngle: 'confession' | 'scandal' | 'observer';
  defaultEmotion: 'triumph' | 'guilt' | 'shame' | 'liberation';
  defaultAudience: string;
  
  // Model Configuration (can be different per channel)
  modelOutline: string;        // gemini-2.5-flash (or custom)
  modelEpisodes: string;       // gemini-2.5-flash (or custom)
  
  // Generation Parameters
  episodeCount: number;        // 9-12 эпизодов
  minCharacters: number;       // 25K-32K
  maxCharacters: number;       // 35K-40K
  readingTimeMinutes: number;  // 6-10 мин
  
  // Output
  outputDir: string;           // ./generated/{channelId}/
  publishAutomatically: boolean;
  
  // Workflow Schedule (cron)
  scheduleUtc: string[];       // ['00:00', '03:00', '06:00', ...]
}

/**
 * YANDEX DZEN CHANNEL
 * Women 35-60, Russian-speaking, longform
 * USES: GEMINI_API_KEY_DZEN (separate from others!)
 */
export const DZEN_CONFIG: ChannelConfig = {
  id: 'dzen',
  name: 'Яндекс.Дзен (Women 35-60)',
  platform: 'yandex-dzen',
  
  // ⚠️ DIFFERENT KEY for Dzen only!
  geminiApiKey: process.env.GEMINI_API_KEY_DZEN || '',
  
  defaultTheme: 'Я терпела это 20 лет',
  defaultAngle: 'confession',
  defaultEmotion: 'triumph',
  defaultAudience: 'Women 35-60',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  episodeCount: 12,
  minCharacters: 26000,
  maxCharacters: 30000,
  readingTimeMinutes: 6,
  
  outputDir: './generated/dzen/',
  publishAutomatically: true,
  
  scheduleUtc: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
};

/**
 * MEDIUM CHANNEL
 * Tech entrepreneurs, English
 * USES: GEMINI_API_KEY_MEDIUM (different from Dzen!)
 */
export const MEDIUM_CONFIG: ChannelConfig = {
  id: 'medium',
  name: 'Medium (Tech Founders)',
  platform: 'medium',
  
  // ⚠️ DIFFERENT KEY for Medium only!
  geminiApiKey: process.env.GEMINI_API_KEY_MEDIUM || '',
  platformApiKey: process.env.MEDIUM_API_KEY || '',
  
  defaultTheme: 'Building in public',
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Tech Founders 25-45',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  episodeCount: 10,
  minCharacters: 25000,
  maxCharacters: 35000,
  readingTimeMinutes: 7,
  
  outputDir: './generated/medium/',
  publishAutomatically: false,
  
  scheduleUtc: ['06:00', '12:00', '18:00'],
};

/**
 * SUBSTACK CHANNEL
 * Newsletter, US/EU audience
 * USES: GEMINI_API_KEY_SUBSTACK (different from Dzen & Medium!)
 */
export const SUBSTACK_CONFIG: ChannelConfig = {
  id: 'substack',
  name: 'Substack Newsletter',
  platform: 'substack',
  
  // ⚠️ DIFFERENT KEY for Substack only!
  geminiApiKey: process.env.GEMINI_API_KEY_SUBSTACK || '',
  platformApiKey: process.env.SUBSTACK_API_KEY || '',
  
  defaultTheme: 'Personal stories',
  defaultAngle: 'confession',
  defaultEmotion: 'liberation',
  defaultAudience: 'Premium Subscribers 30-50',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
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
 * USES: GEMINI_API_KEY_HABR (different from all others!)
 */
export const HABR_CONFIG: ChannelConfig = {
  id: 'habr',
  name: 'Habr (Tech Stories)',
  platform: 'habr',
  
  // ⚠️ DIFFERENT KEY for Habr only!
  geminiApiKey: process.env.GEMINI_API_KEY_HABR || '',
  platformApiKey: process.env.HABR_API_KEY || '',
  
  defaultTheme: 'Lessons from tech',
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Tech Professionals RU 25-45',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
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
 * Validates that the channel has a valid API key
 */
export function getChannelConfig(channelId: string): ChannelConfig {
  const config = CHANNELS_REGISTRY[channelId];
  if (!config) {
    throw new Error(`❌ Channel not found: ${channelId}`);
  }
  
  // CRITICAL: Validate that THIS channel has ITS OWN API key
  if (!config.geminiApiKey) {
    throw new Error(
      `❌ Missing API key for channel: ${channelId}\n` +
      `\n📌 Add to GitHub Secrets:\n` +
      `   GEMINI_API_KEY_${channelId.toUpperCase()} = sk-...\n` +
      `\n📌 Or set environment variable:\n` +
      `   export GEMINI_API_KEY_${channelId.toUpperCase()}=sk-...`
    );
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

/**
 * Validate all channels have valid API keys
 * Run this before batch generation
 */
export function validateAllChannelKeys(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  getAllChannels().forEach(channel => {
    if (!channel.geminiApiKey) {
      errors.push(
        `${channel.name} (${channel.id}): Missing GEMINI_API_KEY_${channel.id.toUpperCase()}`
      );
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
