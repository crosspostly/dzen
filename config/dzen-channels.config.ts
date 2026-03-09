/**
 * Dzen Channels Configuration
 * Updated 2026: Focus on Food, Travel, Rituals, and Budget with Mascot integration.
 */

export interface DzenChannelConfig {
  id: string;
  name: string;
  description: string;
  
  // Generation Parameters
  defaultAngle: 'observer' | 'expert' | 'confession';
  defaultEmotion: 'triumph' | 'liberation' | 'inspiration' | 'curiosity';
  defaultAudience: string;
  
  // Model Configuration
  modelOutline: string;
  modelEpisodes: string;
  
  // Output Configuration
  outputDir: string;
  
  // Workflow Schedule
  scheduleCron: string;
  
  // Themes specific to this channel
  channelThemes: string[];
}

/**
 * DZEN ETHNO-FOOD & RITUALS (Silver Economy 50+)
 */
export const DZEN_ETHNO_FOOD_RITUALS_CONFIG: DzenChannelConfig = {
  id: 'ethno-food-ritual',
  name: 'Ethno Food & Rituals',
  description: 'Глубокое погружение в культуру еды и древние обряды разных стран.',
  
  defaultAngle: 'observer',
  defaultEmotion: 'inspiration',
  defaultAudience: 'Active 50+, foodies, culture seekers',
  
  modelOutline: 'gemini-3.1-flash',
  modelEpisodes: 'gemini-3.1-flash',
  
  outputDir: './generated/dzen/ethno-food-ritual/',
  scheduleCron: '0 7,12,17,22 * * *',
  
  channelThemes: [
    'Почему в горах Кавказа никогда не едят в одиночестве: мой опыт',
    'Обряд чаепития в Марокко: Батон (пес) испугался высоты струи, а я нашел истину',
    'Как приготовить настоящий курт на рынке в Ташкенте за 50 рублей',
    'Тайный смысл утренней молитвы в пекарнях Лиссабона',
    'Что едят долгожители Окинавы: я попробовал их секретный суп',
    'Старая бабушка в Грузии показала мне обряд выпечки хлеба в тоне',
    'Почему японцы извиняются перед едой: наше с псом открытие в Киото',
    'Ритуал подношения риса духам на Бали: сколько это стоит на самом деле',
    'Вкус детства в другой стране: как я нашел идеальный чебурек в Стамбуле',
    'Почему в 55 лет я решил бросить всё и поехать изучать обряды еды в Перу'
  ]
};

/**
 * DZEN BUDGET TRAVEL SECRETS
 */
export const DZEN_BUDGET_TRAVEL_CONFIG: DzenChannelConfig = {
  id: 'budget-travel',
  name: 'Budget Travel & Real Life',
  description: 'Как увидеть мир, не разорившись. Честные цены и жизнь в дороге.',
  
  defaultAngle: 'expert',
  defaultEmotion: 'liberation',
  defaultAudience: 'Budget travelers, families, digital nomads',
  
  modelOutline: 'gemini-3.1-flash',
  modelEpisodes: 'gemini-3.1-flash',
  
  outputDir: './generated/dzen/budget-travel/',
  scheduleCron: '0 2,8,14,20 * * *',
  
  channelThemes: [
    'Как прожить в Тбилиси неделю на 10 000 рублей: наш с псом отчет',
    'Перелет с собакой за копейки: 3 лайфхака, о которых не знают авиакомпании',
    'Бесплатная еда в монастырях Таиланда: как попасть на обряд и не быть лишним',
    'Рынки Стамбула: где покупать продукты, чтобы сэкономить 50% бюджета',
    'Ночевка в палатке в Исландии: как мы с псом грелись и сколько сэкономили',
    'Аренда жилья у местных в Дагестане: честный отзыв и цены 2026',
    'Как найти dog-friendly кафе в Европе и не переплатить за сервис',
    'Мой бюджет на месяц в Индии: от 500 рублей в день до роскоши',
    '5 вещей в рюкзаке, которые экономят мне тысячи в каждом путешествии',
    'Почему путешествовать в 60 лет дешевле, чем в 20: секреты скидок'
  ]
};

/**
 * DZEN NOMAD TECH & TRADITIONS
 */
export const DZEN_NOMAD_TECH_CONFIG: DzenChannelConfig = {
  id: 'nomad-tech',
  name: 'Nomad: Tech & Traditions',
  description: 'Стык технологий и древних традиций. Гаджеты в диких местах.',
  
  defaultAngle: 'observer',
  defaultEmotion: 'curiosity',
  defaultAudience: 'Techies, travelers, nomads 25-45',
  
  modelOutline: 'gemini-3.1-flash',
  modelEpisodes: 'gemini-3.1-flash',
  
  outputDir: './generated/dzen/nomad-tech/',
  scheduleCron: '0 1,7,13,19 * * *',
  
  channelThemes: [
    'Солнечная панель в горах Памира: заряжаю ноут, пока местные пекут лепешки',
    'Обряды очищения в ИТ-офисах Сеула: как древность помогает кодить',
    'Стрим из юрты в Монголии: как работает Starlink в пустыне Гоби',
    'Дроны над древними храмами Ангкора: как не нарушить покой духов',
    'Биохакинг в джунглях Амазонки: чему меня научил местный шаман и гаджеты',
    'Как я настроил умный дом в фургоне для путешествия с собакой',
    'Топ гаджетов для тревел-блогера 2026: что реально нужно на рынке в Дели',
    'Криптовалюта на рынках Африки: как я платил биткоинами за ужин',
    'Почему я больше не беру камеру в путешествия: только телефон и AI',
    'Обряд посвящения в кочевники: мой опыт в цифровом мире'
  ]
};

/**
 * DZEN CHANNELS REGISTRY
 */
export const DZEN_CHANNELS_REGISTRY: Record<string, DzenChannelConfig> = {
  'ethno-food-ritual': DZEN_ETHNO_FOOD_RITUALS_CONFIG,
  'budget-travel': DZEN_BUDGET_TRAVEL_CONFIG,
  'nomad-tech': DZEN_NOMAD_TECH_CONFIG,
};

export function getDzenChannelConfig(channelId: string): DzenChannelConfig {
  const config = DZEN_CHANNELS_REGISTRY[channelId];
  if (!config) throw new Error(`❌ Dzen channel not found: ${channelId}`);
  return config;
}

export function getAllDzenChannels(): DzenChannelConfig[] {
  return Object.values(DZEN_CHANNELS_REGISTRY);
}

export function getRandomThemeForChannel(channelId: string): string {
  const config = getDzenChannelConfig(channelId);
  const randomIndex = Math.floor(Math.random() * config.channelThemes.length);
  return config.channelThemes[randomIndex];
}
