/**
 * 📖 ZenMaster v4.0 - PlotBible Builder
 * 
 * Generates PlotBible (narrative DNA) from theme/parameters
 * Ensures consistency across all content generation agents
 */

import { PlotBible, NarratorProfile, SensoryPalette } from '../types/PlotBible';

export class PlotBibleBuilder {
  /**
   * 🎯 Build PlotBible from theme and parameters
   */
  static buildFromTheme(params: {
    theme: string;
    angle?: string;
    emotion?: string;
    audience?: string;
  }): PlotBible {
    const { theme, angle, emotion, audience } = params;

    // Analyze theme to extract context
    const context = this.analyzeTheme(theme);

    // Build narrator profile
    const narrator = this.buildNarrator(context, emotion);

    // Build sensory palette
    const sensoryPalette = this.buildSensoryPalette(context);

    // Build protagonist (if applicable)
    const protagonist = this.buildProtagonist(context);

    // Build antagonist (if applicable)
    const antagonist = context.hasConflict ? this.buildAntagonist(context) : undefined;

    // Build timeline
    const timeline = {
      present: "2025 год, декабрь, квартира в городе",
      flashbacks: []
    };

    // Build visual plan for cover image 🆕
    const coverVisual = this.buildCoverVisual(context, narrator);

    // Define forbidden themes
    const forbiddenThemes = [
      "убийство",
      "полиция",
      "наркотики",
      "сексуальное насилие",
      "детская смерть",
      "терроризм"
    ];

    return {
      narrator,
      protagonist,
      antagonist,
      sensoryPalette,
      timeline,
      forbiddenThemes,
      coverVisual
    };
  }

  /**
   * 🎨 Build visual plan for the cover image
   * Decided at Stage 0 to ensure narrative-visual consistency
   */
  private static buildCoverVisual(context: ThemeContext, narrator: NarratorProfile) {
    const isBetrayal = context.emotionalTone === 'betrayal';
    const isGrief = context.emotionalTone === 'grief';
    const isJoy = context.emotionalTone === 'joy';

    // Determine location
    let where = 'современная кухня с мягким светом';
    if (context.setting === 'rural') where = 'веранда загородного дома';
    if (context.setting === 'office') where = 'рабочий стол в офисе';
    if (isBetrayal) where = 'прихожая с зеркалом, тусклый свет';

    // Determine lighting
    let lighting = 'утренний естественный свет';
    if (isBetrayal) lighting = 'контрастный вечерний свет от лампы';
    if (isGrief) lighting = 'холодный дневной свет из окна';
    if (isJoy) lighting = 'теплый «золотой час»';

    // Determine details from sensory palette
    const details = [
      'кружка на столе',
      narrator.age > 45 ? 'старый фотоальбом' : 'смартфон в руке',
      context.setting === 'rural' ? 'занавески в цветочек' : 'минималистичные жалюзи'
    ];

    return {
      who: `женщина ${narrator.age} лет`,
      where,
      what: isBetrayal ? 'смотрит на телефон с тревогой' : 'сидит в раздумьях',
      lighting,
      mood: context.emotionalTone,
      details
    };
  }

  /**
   * 🔍 Analyze theme to extract context
   */
  private static analyzeTheme(theme: string): ThemeContext {
    const lower = theme.toLowerCase();

    // Detect gender
    const isFemale = /женщин|она|моя|мать|сестра|дочь|жена|подруг/i.test(theme);
    const isMale = /мужчин|он|мой|отец|брат|сын|муж|друг/i.test(theme);

    // Detect age range
    let ageRange: [number, number] = [40, 60]; // Default
    if (/молод|девушк|парен|20|25|30/i.test(theme)) {
      ageRange = [25, 35];
    } else if (/стар|пожил|60|70/i.test(theme)) {
      ageRange = [55, 70];
    }

    // Detect relationship context
    const hasFamily = /семь|муж|жена|дети|ребенок|мать|отец/i.test(theme);
    const hasWork = /работ|коллег|начальник|офис|карьер/i.test(theme);
    const hasFriendship = /друг|подруг|знаком|сосед/i.test(theme);

    // Detect emotional tone
    let emotionalTone: string = "neutral";
    if (/измен|предат|ложь|обман/i.test(theme)) {
      emotionalTone = "betrayal";
    } else if (/потер|смерть|утрат|горе/i.test(theme)) {
      emotionalTone = "grief";
    } else if (/радост|счаст|побед/i.test(theme)) {
      emotionalTone = "joy";
    } else if (/страх|боязн|тревог/i.test(theme)) {
      emotionalTone = "anxiety";
    }

    // Detect if there's conflict
    const hasConflict = /против|конфликт|ссор|спор|враг|проблем/i.test(theme);

    // Detect setting
    let setting: string = "urban apartment";
    if (/деревн|село|дача/i.test(theme)) {
      setting = "rural";
    } else if (/офис|работ/i.test(theme)) {
      setting = "office";
    } else if (/больниц|клиник/i.test(theme)) {
      setting = "hospital";
    }

    return {
      gender: isFemale ? "female" : isMale ? "male" : "neutral",
      ageRange,
      hasFamily,
      hasWork,
      hasFriendship,
      emotionalTone,
      hasConflict,
      setting
    };
  }

  /**
   * 🗣️ Build narrator profile
   */
  private static buildNarrator(context: ThemeContext, emotion?: string): NarratorProfile {
    const age = Math.floor(context.ageRange[0] + Math.random() * (context.ageRange[1] - context.ageRange[0]));

    // Select tone based on emotional context
    let tone: string;
    switch (context.emotionalTone) {
      case "betrayal":
        tone = "bitter irony with hurt";
        break;
      case "grief":
        tone = "quiet sadness with wisdom";
        break;
      case "joy":
        tone = "warm humor with gratitude";
        break;
      case "anxiety":
        tone = "nervous energy with hope";
        break;
      default:
        tone = "intelligent irony with self-awareness";
    }

    // Russian voice markers
    const voiceMarkers = [
      "я же тебе скажу",
      "честное слово",
      "вот тогда и началось",
      "может быть, я ошиблась",
      "ну что вы хотите",
      "как говорится",
      "не знаю даже",
      "представьте себе"
    ];

    // Shuffle and pick 4-5 markers
    const shuffled = voiceMarkers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4 + Math.floor(Math.random() * 2));

    return {
      gender: context.gender,
      age,
      tone,
      voiceMarkers: selected,
      education: age > 45 ? "высшее" : "среднее профессиональное",
      socialStatus: "middle class"
    };
  }

  /**
   * 🎨 Build sensory palette
   */
  private static buildSensoryPalette(context: ThemeContext): SensoryPalette {
    // Base palette for urban apartment setting
    const basePalette = {
      smells: [
        "холодный чай, который постоял",
        "запах свежего кофе",
        "пыль на подоконнике в солнечном свете",
        "запах старых книг",
        "аромат стирального порошка"
      ],
      sounds: [
        "звук уведомления на телефоне",
        "тиканье часов на стене",
        "хлопок двери",
        "шум воды в трубах",
        "голоса соседей за стеной"
      ],
      textures: [
        "потертая бумага конверта",
        "холодная поверхность стола",
        "мягкий плед",
        "шершавая ткань старого дивана",
        "гладкая керамика кружки"
      ],
      details: [
        "старые шторы с выцветшим рисунком",
        "советская мебель",
        "чашки с цветочками",
        "пожелтевшие фотографии на стене",
        "телефон на столе"
      ],
      lightSources: [
        "утренний солнечный свет из окна",
        "желтый свет настольной лампы",
        "отражение в оконном стекле",
        "тусклый свет торшера",
        "голубоватое свечение экрана"
      ]
    };

    // Modify based on context
    if (context.setting === "rural") {
      basePalette.details = [
        "деревянная мебель",
        "вышитые полотенца",
        "самовар на столе",
        "икона в углу",
        "старый ковер"
      ];
      basePalette.smells = [
        "запах дров",
        "свежий хлеб",
        "травяной чай",
        "запах дождя за окном",
        "цветы на подоконнике"
      ];
    } else if (context.setting === "office") {
      basePalette.details = [
        "офисная мебель",
        "компьютер с кучей вкладок",
        "стопки бумаг",
        "кофейная машина",
        "пластиковые стаканчики"
      ];
      basePalette.smells = [
        "запах принтера",
        "кофе из автомата",
        "освежитель воздуха",
        "запах бумаги",
        "чей-то парфюм"
      ];
    }

    return basePalette;
  }

  /**
   * 👤 Build protagonist profile
   */
  private static buildProtagonist(context: ThemeContext) {
    const names = context.gender === "female"
      ? ["Марина", "Ольга", "Елена", "Наталья", "Светлана", "Ирина"]
      : ["Андрей", "Сергей", "Алексей", "Дмитрий", "Владимир", "Михаил"];

    const name = names[Math.floor(Math.random() * names.length)];
    const age = Math.floor(context.ageRange[0] + Math.random() * (context.ageRange[1] - context.ageRange[0]));

    // Traits based on emotional tone
    let traits: string[];
    switch (context.emotionalTone) {
      case "betrayal":
        traits = ["trusting", "hurt", "learning", "resilient"];
        break;
      case "grief":
        traits = ["strong", "mourning", "accepting", "wise"];
        break;
      case "joy":
        traits = ["optimistic", "grateful", "energetic", "open"];
        break;
      case "anxiety":
        traits = ["worried", "caring", "overthinking", "brave"];
        break;
      default:
        traits = ["intelligent", "reflective", "searching", "honest"];
    }

    return {
      name,
      age,
      traits,
      motivation: "find truth and peace",
      arc: "from confusion to clarity",
      occupation: context.hasWork ? "office worker" : "homemaker",
      relationships: context.hasFamily ? { "spouse": "complicated", "children": "protective" } : {}
    };
  }

  /**
   * 😈 Build antagonist profile (if conflict exists)
   */
  private static buildAntagonist(context: ThemeContext) {
    const names = context.gender === "female"
      ? ["Алексей", "Сергей", "Владимир", "Игорь", "Юрий"]
      : ["Людмила", "Валентина", "Татьяна", "Марина", "Инна"];

    const name = names[Math.floor(Math.random() * names.length)];
    const age = Math.floor(context.ageRange[0] + Math.random() * 20);

    return {
      name,
      age,
      traits: ["manipulative", "secretive", "defensive", "hidden motives"],
      motivation: "protect their secrets and position"
    };
  }

  /**
   * 🎲 Generate random PlotBible (for testing)
   */
  static generateRandom(): PlotBible {
    const themes = [
      "Женщина 45 лет узнает о тайне мужа",
      "Мужчина 50 лет встречает старого друга",
      "Женщина 38 лет решает изменить жизнь",
      "Молодая мать справляется с трудностями"
    ];

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return this.buildFromTheme({ theme: randomTheme });
  }
}

/**
 * Internal context type
 */
interface ThemeContext {
  gender: "male" | "female" | "neutral";
  ageRange: [number, number];
  hasFamily: boolean;
  hasWork: boolean;
  hasFriendship: boolean;
  emotionalTone: string;
  hasConflict: boolean;
  setting: string;
}
