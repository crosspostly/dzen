/**
 * Dzen Channels Configuration
 * All Dzen channels with their own parameters (angle, emotion, audience, models)
 * This replaces GitHub Variables for channel-specific generation parameters
 */

export interface DzenChannelConfig {
  id: string;
  name: string;
  description: string;
  
  // Generation Parameters (from GitHub Variables)
  defaultAngle: 'confession' | 'scandal' | 'observer';
  defaultEmotion: 'triumph' | 'guilt' | 'shame' | 'liberation' | 'anger';
  defaultAudience: string;
  
  // Model Configuration (from GitHub Variables)
  modelOutline: string;     // e.g., gemini-2.5-flash
  modelEpisodes: string;    // e.g., gemini-2.5-flash
  
  // Output Configuration
  outputDir: string;        // ./generated/dzen/{channelId}/
  
  // Workflow Schedule
  scheduleCron: string;     // cron expression for GitHub Actions
  
  // Themes specific to this channel
  channelThemes: string[];  // themes specific to this audience
}

/**
 * DZEN PROVOCATIVE PSYCHOLOGY CHANNEL (formerly Women 35-60)
 * Primary target: Women 28-45, provocative deconstruction of gender myths
 */
export const DZEN_WOMEN_35_60_CONFIG: DzenChannelConfig = {
  id: 'women-35-60',
  name: 'Provocative Psychology',
  description: 'Ниша психологии межполовых отношений. Высокопровокационный авторский канал.',
  
  // Previously from GitHub Variables
  defaultAngle: 'scandal',
  defaultEmotion: 'triumph',
  defaultAudience: 'Women 28-45 (Advocates) & Men 30-55 (Haters)',
  
  // Previously from GitHub Variables  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  outputDir: './generated/dzen/provocative-psychology/',
  scheduleCron: '0 7,12,17,22 * * *',
  
  channelThemes: [
    'Иллюзия первой любви: как я родила троих, чтобы понять, что принц — это просто диагноз',
    'Анатомия бытового паралича: почему ваш муж управляет отделом из 50 человек, но не может найти собственные носки',
    'Конец эпохи просветления: как памперсы, развод и рутина заменили мне поиски смысла на Бали',
    'Радиация «Сексофона»: почему после тяжелого развода и с тремя детьми меня хотят больше, чем в наивные 20 лет',
    'Сказка о добром добытчике: почему финансовая зависимость в браке — это красивый билет в рабство',
    'Истинная Пронежность: почему роскошная женщина больше никогда не будет «удобной и понимающей»',
    'Материнство без мученичества: как прекратить быть бесплатной прислугой для собственных детей',
    'В ловушке социальных таймеров: как общество пытается списать нас в утиль, и почему мы выбираем «Бездаты»',
    'Практическая «Мужеловка»: почему их парализует ваш интеллект, но притягивает ледяное равнодушие',
    'Конец эпохи мальчиков: почему я восхищаюсь мужчинами, но отказываюсь быть для них матерью'
  ]
};

/**
 * DZEN YOUNG MOMS CHANNEL
 * Target: Young mothers 25-35, scandal stories, liberation emotion
 */
export const DZEN_YOUNG_MOMS_CONFIG: DzenChannelConfig = {
  id: 'young-moms',
  name: 'Young Moms',
  description: 'Молодые мамы 25-35 лет, скандальные истории',
  
  defaultAngle: 'scandal',
  defaultEmotion: 'liberation',
  defaultAudience: 'Young Moms 25-35',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  outputDir: './generated/dzen/young-moms/',
  scheduleCron: '0 2,8,14,20 * * *', // every 6 hours
  
  channelThemes: [
    'Как я справилась с послеродовой депрессией',
    'Муж не помогал с ребёнком, и я ушла',
    'Свекровь учила меня воспитывать моего ребёнка',
    'Я кормила грудью в туалете офиса',
    'Деньги кончились, и я пошла работать',
    'Ребёнок кричал всю ночь, а муж спал',
    'Врач сказал, что я плохая мать',
    'Я не хотела детей, но забеременела',
    'Свадьба отменилась, когда узнали о беременности',
    'Я стала мамой в 22, и это изменило всё'
  ]
};

/**
 * DZEN MEN 25-40 CHANNEL
 * Target: Men 25-40, observer perspective, triumph emotion
 */
export const DZEN_MEN_25_40_CONFIG: DzenChannelConfig = {
  id: 'men-25-40',
  name: 'Men 25-40',
  description: 'Мужчины 25-40 лет, наблюдательский взгляд',
  
  defaultAngle: 'observer',
  defaultEmotion: 'triumph',
  defaultAudience: 'Men 25-40',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  outputDir: './generated/dzen/men-25-40/',
  scheduleCron: '0 1,7,13,19 * * *', // every 6 hours
  
  channelThemes: [
    'Я понял, что женщина меня обманывает',
    'Работа отнимала всю мою жизнь',
    'Я не видел детей месяцами',
    'Друзья изменились, когда я женился',
    'Я работал 80 часов в неделю ради семьи',
    'Первый раз взял отпуск за 5 лет',
    'Меня повысили, но я не обрадовался',
    'Я научился говорить "нет" на работе',
    'Жена попросила меня измениться или уйти',
    'Я понял, что живу не своей жизнью'
  ]
};

/**
 * DZEN TEENS CHANNEL
 * Target: Teens 14-18, confession stories, shame emotion
 */
export const DZEN_TEENS_CONFIG: DzenChannelConfig = {
  id: 'teens',
  name: 'Teens',
  description: 'Подростки 14-18 лет, исповеди с стыдом',
  
  defaultAngle: 'confession',
  defaultEmotion: 'shame',
  defaultAudience: 'Teens 14-18',
  
  modelOutline: 'gemini-2.5-flash',
  modelEpisodes: 'gemini-2.5-flash',
  
  outputDir: './generated/dzen/teens/',
  scheduleCron: '0 4,10,16,22 * * *', // every 6 hours
  
  channelThemes: [
    'Я притворялся болел, чтобы не идти в школу',
    'Родители не понимали меня',
    'Я сбежал из дома в 16',
    'Меня дразнили из-за внешности',
    'Я не знал, кто я такой',
    'Все друзья изменились в старшей школе',
    'Я боялся рассказать родителям правду',
    'Одноклассники унижали меня в интернете',
    'Я был влюблён в учительницу',
    'Меня поймали на воровстве в магазине'
  ]
};

/**
 * DZEN CHANNELS REGISTRY
 * All available Dzen channels
 */
export const DZEN_CHANNELS_REGISTRY: Record<string, DzenChannelConfig> = {
  'women-35-60': DZEN_WOMEN_35_60_CONFIG,
  'young-moms': DZEN_YOUNG_MOMS_CONFIG,
  'men-25-40': DZEN_MEN_25_40_CONFIG,
  'teens': DZEN_TEENS_CONFIG,
};

/**
 * Get Dzen channel configuration by ID
 */
export function getDzenChannelConfig(channelId: string): DzenChannelConfig {
  const config = DZEN_CHANNELS_REGISTRY[channelId];
  if (!config) {
    throw new Error(
      `❌ Dzen channel not found: ${channelId}\n` +
      `Available channels: ${Object.keys(DZEN_CHANNELS_REGISTRY).join(', ')}`
    );
  }
  return config;
}

/**
 * Get all Dzen channels
 */
export function getAllDzenChannels(): DzenChannelConfig[] {
  return Object.values(DZEN_CHANNELS_REGISTRY);
}

/**
 * Get Dzen channels by angle
 */
export function getDzenChannelsByAngle(angle: DzenChannelConfig['defaultAngle']): DzenChannelConfig[] {
  return getAllDzenChannels().filter(ch => ch.defaultAngle === angle);
}

/**
 * Get Dzen channels by emotion
 */
export function getDzenChannelsByEmotion(emotion: DzenChannelConfig['defaultEmotion']): DzenChannelConfig[] {
  return getAllDzenChannels().filter(ch => ch.defaultEmotion === emotion);
}

/**
 * Get random theme for specific channel
 */
export function getRandomThemeForChannel(channelId: string): string {
  const config = getDzenChannelConfig(channelId);
  const randomIndex = Math.floor(Math.random() * config.channelThemes.length);
  return config.channelThemes[randomIndex];
}

/**
 * Validate all Dzen channels have required configuration
 */
export function validateDzenChannelsConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  getAllDzenChannels().forEach(channel => {
    if (!channel.id || !channel.name) {
      errors.push(`${channel.id}: Missing id or name`);
    }
    if (!channel.channelThemes || channel.channelThemes.length === 0) {
      errors.push(`${channel.id}: No themes configured`);
    }
    if (!channel.outputDir) {
      errors.push(`${channel.id}: No output directory configured`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}