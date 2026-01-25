/**
 * 🎭 Scene Element Extractor
 * Analyzes article description and extracts structured scene elements
 * Used to generate UNIQUE image prompts for each article
 * 
 * Example:
 * Description: "Мама с ребенком сидели на кухне, пили чай"
 * ↓
 * SceneElements: {
 *   characters: ['mother', 'child'],
 *   settings: ['kitchen'],
 *   actions: ['sitting', 'drinking tea'],
 *   emotions: ['tenderness', 'warmth'],
 *   objects: ['tea cup'],
 *   timeContext: 'day'
 * }
 */

export interface SceneElements {
  characters: string[];
  settings: string[];
  actions: string[];
  emotions: string[];
  objects: string[];
  timeContext: string; // утро, день, вечер, ночь, рассвет
}

export class SceneElementExtractor {
  
  // 🔤 Russian character types dictionary
  private static readonly CHARACTERS_RU = {
    women: ['мама', 'женщина', 'дочка', 'дочь', 'сестра', 'девушка', 'бабушка', 'подруга', 'коллега', 'начальница'],
    men: ['папа', 'мужчина', 'сын', 'брат', 'парень', 'дедушка', 'друг', 'коллега', 'начальник'],
    children: ['ребенок', 'малыш', 'малышка', 'дочка', 'сын', 'ребята', 'дети'],
    elderly: ['бабушка', 'дедушка', 'старик', 'старуха', 'пожилой'],
    roles: ['учитель', 'врач', 'босс', 'муж', 'жена', 'любовник', 'враг', 'незнакомец']
  };

  // 🏠 Settings dictionary
  private static readonly SETTINGS_RU = {
    home: ['кухня', 'спальня', 'гостиная', 'ванная', 'коридор', 'балкон', 'веранда', 'дом'],
    work: ['офис', 'кабинет', 'стол', 'рабочее место', 'совещание', 'переговорная'],
    outdoor: ['парк', 'лес', 'поле', 'пляж', 'улица', 'площадь', 'дорога', 'сад'],
    nature: ['природа', 'деревья', 'цветы', 'лес', 'река', 'озеро', 'гора', 'холм'],
    transport: ['машина', 'поезд', 'автобус', 'метро', 'самолет'],
    public: ['магазин', 'ресторан', 'кино', 'театр', 'библиотека', 'музей']
  };

  // 🎭 Actions dictionary
  private static readonly ACTIONS_RU = {
    body: ['сидит', 'стоит', 'лежит', 'бежит', 'идет', 'гуляет', 'прыгает', 'падает', 'встает'],
    interact: ['смотрит', 'слушает', 'говорит', 'кричит', 'шепчет', 'целует', 'обнимает', 'держит'],
    work: ['работает', 'пишет', 'читает', 'считает', 'готовит', 'моет', 'готовится'],
    emotional: ['плачет', 'смеется', 'улыбается', 'фрахтует', 'дрожит', 'вздыхает']
  };

  // 💭 Emotions dictionary
  private static readonly EMOTIONS_RU = {
    positive: ['любовь', 'радость', 'счастье', 'нежность', 'тепло', 'восторг', 'восхищение', 'благодарность'],
    negative: ['грусть', 'печаль', 'страх', 'тревога', 'гнев', 'отчаяние', 'разочарование', 'ревность'],
    mixed: ['тоска', 'меланхолия', 'смешанные чувства', 'растерянность', 'неуверенность'],
    intense: ['страсть', 'экстаз', 'ужас', 'отвращение', 'презрение', 'спор']
  };

  // 🎁 Objects dictionary
  private static readonly OBJECTS_RU = {
    drink: ['чай', 'кофе', 'вода', 'напиток', 'вино', 'пиво', 'сок'],
    food: ['еда', 'хлеб', 'булка', 'пирог', 'торт', 'конфеты', 'шоколад', 'фрукты'],
    decor: ['цветы', 'роза', 'букет', 'свеча', 'лампа', 'зеркало', 'картина'],
    tech: ['телефон', 'компьютер', 'монитор', 'клавиатура', 'экран'],
    personal: ['кольцо', 'браслет', 'ожерелье', 'часы', 'кольцо', 'письмо', 'фото'],
    fabric: ['одеяло', 'подушка', 'платье', 'рубашка', 'платок', 'шарф'],
  };

  // ⏰ Time context
  private static readonly TIME_CONTEXT_RU = {
    morning: ['утро', 'рассвет', 'восход', '6', '7', '8', '9', '10'],
    day: ['день', 'полдень', '11', '12', '13', '14', '15', '16', '17'],
    evening: ['вечер', '18', '19', '20', '21', '22'],
    night: ['ночь', 'ночью', 'полночь', '0', '1', '2', '3', '4', '5'],
    sunset: ['закат', 'заката', 'восход', 'восхода']
  };

  /**
   * Extract scene elements from article description
   */
  static extractFromDescription(description: string): SceneElements {
    const lowerDesc = description.toLowerCase();

    return {
      characters: this.extractCharacters(lowerDesc),
      settings: this.extractSettings(lowerDesc),
      actions: this.extractActions(lowerDesc),
      emotions: this.extractEmotions(lowerDesc),
      objects: this.extractObjects(lowerDesc),
      timeContext: this.extractTimeContext(lowerDesc)
    };
  }

  // 👥 Extract character types
  private static extractCharacters(text: string): string[] {
    const found: string[] = [];
    const allCharacters = Object.values(this.CHARACTERS_RU).flat();

    for (const char of allCharacters) {
      if (text.includes(char)) {
        const mapped = this.mapCharacterToEnglish(char);
        if (mapped && !found.includes(mapped)) {
          found.push(mapped);
        }
      }
    }

    if (found.length === 0) {
      if (text.match(/люди|люди|персон/)) found.push('people');
      if (text.match(/я\s|я,|мой|моя/)) found.push('narrator');
    }

    return found.length > 0 ? found : ['person'];
  }

  // 🏠 Extract settings
  private static extractSettings(text: string): string[] {
    const found: string[] = [];
    const allSettings = Object.values(this.SETTINGS_RU).flat();

    for (const setting of allSettings) {
      if (text.includes(setting)) {
        const mapped = this.mapSettingToEnglish(setting);
        if (mapped && !found.includes(mapped)) {
          found.push(mapped);
        }
      }
    }

    if (found.length === 0) {
      if (text.match(/дома|в комнате|квартира/)) found.push('home');
      if (text.match(/улице|на улице/)) found.push('street');
      if (text.match(/снаружи|на открытом/)) found.push('outdoor');
    }

    return found.length > 0 ? found : ['indoor'];
  }

  // 🎬 Extract actions
  private static extractActions(text: string): string[] {
    const found: string[] = [];
    const allActions = Object.values(this.ACTIONS_RU).flat();

    for (const action of allActions) {
      if (text.includes(action)) {
        const mapped = this.mapActionToEnglish(action);
        if (mapped && !found.includes(mapped)) {
          found.push(mapped);
        }
      }
    }

    if (found.length === 0) {
      found.push('present');
      found.push('moment');
    }

    return found.slice(0, 3);
  }

  // 💭 Extract emotions
  private static extractEmotions(text: string): string[] {
    const found: string[] = [];
    const allEmotions = Object.values(this.EMOTIONS_RU).flat();

    for (const emotion of allEmotions) {
      if (text.includes(emotion)) {
        const mapped = this.mapEmotionToEnglish(emotion);
        if (mapped && !found.includes(mapped)) {
          found.push(mapped);
        }
      }
    }

    if (found.length === 0) {
      if (text.match(/был грустно|грусти|грусть/i)) found.push('melancholic');
      if (text.match(/было радост|радость|веселье/i)) found.push('joyful');
      if (text.match(/страшно|страх|ужас/i)) found.push('fearful');
      if (text.match(/любовь|люблю|нежность|тепло/i)) found.push('loving');
    }

    return found.length > 0 ? found : ['contemplative'];
  }

  // 🎁 Extract objects
  private static extractObjects(text: string): string[] {
    const found: string[] = [];
    const allObjects = Object.values(this.OBJECTS_RU).flat();

    for (const obj of allObjects) {
      if (text.includes(obj)) {
        const mapped = this.mapObjectToEnglish(obj);
        if (mapped && !found.includes(mapped)) {
          found.push(mapped);
        }
      }
    }

    return found.slice(0, 5);
  }

  // ⏰ Extract time context
  private static extractTimeContext(text: string): string {
    for (const [time, keywords] of Object.entries(this.TIME_CONTEXT_RU)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return this.mapTimeToEnglish(time);
        }
      }
    }

    return 'day';
  }

  // 🔄 Mapping functions (Russian → English)
  
  private static mapCharacterToEnglish(ru: string): string | null {
    const map: Record<string, string> = {
      'мама': 'mother',
      'папа': 'father',
      'женщина': 'woman',
      'мужчина': 'man',
      'дочка': 'daughter',
      'дочь': 'daughter',
      'сын': 'son',
      'брат': 'brother',
      'сестра': 'sister',
      'ребенок': 'child',
      'малыш': 'toddler',
      'девушка': 'girl',
      'парень': 'boy',
      'бабушка': 'grandmother',
      'дедушка': 'grandfather',
      'подруга': 'friend',
      'друг': 'friend',
      'коллега': 'colleague',
      'начальник': 'boss',
    };
    return map[ru] || null;
  }

  private static mapSettingToEnglish(ru: string): string | null {
    const map: Record<string, string> = {
      'кухня': 'kitchen',
      'спальня': 'bedroom',
      'гостиная': 'living room',
      'офис': 'office',
      'кабинет': 'study',
      'парк': 'park',
      'лес': 'forest',
      'пляж': 'beach',
      'улица': 'street',
      'площадь': 'plaza',
      'дом': 'home',
      'школа': 'school',
      'магазин': 'shop',
    };
    return map[ru] || null;
  }

  private static mapActionToEnglish(ru: string): string | null {
    const map: Record<string, string> = {
      'сидит': 'sitting',
      'стоит': 'standing',
      'лежит': 'lying',
      'бежит': 'running',
      'идет': 'walking',
      'смотрит': 'looking',
      'слушает': 'listening',
      'говорит': 'talking',
      'кричит': 'shouting',
      'целует': 'kissing',
      'обнимает': 'embracing',
      'держит': 'holding',
      'плачет': 'crying',
      'смеется': 'laughing',
      'улыбается': 'smiling',
      'работает': 'working',
      'готовит': 'cooking',
      'пишет': 'writing',
    };
    return map[ru] || null;
  }

  private static mapEmotionToEnglish(ru: string): string | null {
    const map: Record<string, string> = {
      'любовь': 'love',
      'радость': 'joy',
      'счастье': 'happiness',
      'нежность': 'tenderness',
      'тепло': 'warmth',
      'грусть': 'sadness',
      'печаль': 'sorrow',
      'страх': 'fear',
      'тревога': 'anxiety',
      'гнев': 'anger',
      'отчаяние': 'despair',
      'ревность': 'jealousy',
      'восторг': 'delight',
      'ужас': 'horror',
    };
    return map[ru] || null;
  }

  private static mapObjectToEnglish(ru: string): string | null {
    const map: Record<string, string> = {
      'чай': 'tea',
      'кофе': 'coffee',
      'цветы': 'flowers',
      'роза': 'rose',
      'букет': 'bouquet',
      'свеча': 'candle',
      'лампа': 'lamp',
      'телефон': 'phone',
      'компьютер': 'computer',
      'монитор': 'monitor',
      'кольцо': 'ring',
      'письмо': 'letter',
      'фото': 'photo',
      'одеяло': 'blanket',
      'подушка': 'pillow',
      'платье': 'dress',
      'хлеб': 'bread',
      'торт': 'cake',
    };
    return map[ru] || null;
  }

  private static mapTimeToEnglish(ru: string): string {
    const map: Record<string, string> = {
      'morning': 'morning',
      'day': 'daytime',
      'evening': 'evening',
      'night': 'night',
      'sunset': 'sunset'
    };
    return map[ru] || 'day';
  }
}
