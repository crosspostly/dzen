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

    // Build narrator profile - STRICTLY LOCKED TO PERSONA
    const narrator = this.buildNarrator(context, emotion);

    // Build sensory palette - HEAVY LUXURY & NEON
    const sensoryPalette = this.buildSensoryPalette(context);

    // Build protagonist (if applicable)
    const protagonist = this.buildProtagonist(context);

    // Build antagonist (if applicable)
    const antagonist = context.hasConflict ? this.buildAntagonist(context) : undefined;

    // Build timeline
    const timeline = {
      present: "2026 год, крупный нестоличный город, дизайнерский лофт в индустриальном районе",
      flashbacks: ["тяжелый развод", "бытовой ад", "процесс 'дохождения' себя сквозь пеленки"]
    };

    // Build visual plan for cover image 🆕 - HEAVY LUXURY & NEON
    const coverVisual = this.buildCoverVisual(context, narrator);

    // Define forbidden themes
    const forbiddenThemes = [
      "убийство",
      "полиция",
      "наркотики",
      "сексуальное насилие",
      "детская смерть",
      "терроризм",
      "банальная токсичность",
      "прямой мат",
      "истерика"
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
   * HEAVY LUXURY, GOLD, SILK, NEON-PINK
   */
  private static buildCoverVisual(context: ThemeContext, narrator: NarratorProfile) {
    const locations = [
      'элегантная гостиная в лофте, панорамные окна с видом на огни города',
      'дизайнерская кухня, черный мрамор, неоновая подсветка',
      'интерьер премиального авто, черная кожа, розовые отсветы',
      'терасса пентхауса, закат, тяжелое золото декора',
      'минималистичный кабинет, массивный стол, ледяное спокойствие'
    ];
    
    let where = locations[Math.floor(Math.random() * locations.length)];
    let lighting = 'драматический свет, неоново-розовые акценты на черном фоне, глубокие тени';

    const actions = [
      'смотрит прямо в камеру ледяным пронзительным взглядом (Ice Mirror)',
      'пренебрежительно поправляет массивное золотое украшение на запястье',
      'сидит с идеально ровной осанкой в черном шелке',
      'держит бокал воды с лимоном, взгляд как интеллектуальный скальпель',
      'чуть заметная ироничная улыбка превосходства на безупречном лице'
    ];
    
    let what = actions[Math.floor(Math.random() * actions.length)];

    const details = [
      'тяжелое золото на черном шелке',
      'черная натуральная кожа',
      'неоново-розовый акцент в глубине кадра',
      'iPhone 15 Pro на черном мраморе',
      'аромат власти, селективного парфюма и спокойствия'
    ];

    return {
      who: `женщина 35 лет, "зачетная милфа", тяжелый люкс, ледяное спокойствие`,
      where,
      what,
      lighting,
      mood: "Hostile Elegance, Provocative, Intellectual Dominance",
      details
    };
  }

  /**
   * 🔍 Analyze theme to extract context
   */
  private static analyzeTheme(theme: string): ThemeContext {
    const lower = theme.toLowerCase();

    // Gender detection kept for analyzing targets, but narrator is ALWAYS female
    const isFemale = /женщин|она|моя|мать|сестра|дочь|жена|подруг/i.test(theme);
    const isMale = /мужчин|он|мой|отец|брат|сын|муж|друг/i.test(theme);

    let ageRange: [number, number] = [30, 45]; // Relevant for our audience

    const hasFamily = /семь|муж|жена|дети|ребенок|мать|отец/i.test(theme);
    const hasWork = /работ|коллег|начальник|офис|карьер/i.test(theme);
    const hasFriendship = /друг|подруг|знаком|сосед/i.test(theme);

    let emotionalTone: string = "analytical provocation";
    if (/измен|предат|ложь|обман/i.test(theme)) {
      emotionalTone = "betrayal dissection";
    }

    const hasConflict = true; // Always conflict in our strategy

    return {
      gender: isFemale ? "female" : isMale ? "male" : "neutral",
      ageRange,
      hasFamily,
      hasWork,
      hasFriendship,
      emotionalTone,
      hasConflict,
      setting: "urban luxury"
    };
  }

  /**
   * 🗣️ Build narrator profile
   * STRICTLY LOCKED TO PERSONA: 35yo, 3 kids, Hostile Elegance
   */
  private static buildNarrator(context: ThemeContext, emotion?: string): NarratorProfile {
    const age = 35;
    let tone = "Hostile Elegance: intellectual dominance, Socrates irony, clinical precision";

    const voiceMarkers = [
      "Знаете, в чем главная ошибка?",
      "Давайте препарируем эту ситуацию моим интеллектуальным скальпелем",
      "Это был классический случай бытового паралича",
      "Я смотрела на это с ледяным спокойствием",
      "Когда ты наконец дошла себя",
      "Мой интеллектуальный скальпель не дрогнул",
      "Типичная мозгоёлка, которую я препарировала на атомы",
      "Включила сексофон на полную мощность, и он парализован моим равнодушием",
      "Я использую метод ледяного зеркала",
      "Куй в себе стальной стержень, пока они играют в мужеловки"
    ];

    const shuffled = voiceMarkers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    return {
      gender: "female",
      age,
      tone,
      voiceMarkers: selected,
      education: "высшее психологическое, клинический аналитик",
      socialStatus: "Self-forged, successful, 3 children",
      children: 3
    };
  }

  /**
   * 🎨 Build sensory palette
   * SILK, LEATHER, GOLD, NEON
   */
  private static buildSensoryPalette(context: ThemeContext): SensoryPalette {
    return {
      smells: [
        "аромат селективного парфюма (сандал и мускус)",
        "запах дорогой черной кожи",
        "аромат крепкого эспрессо",
        "холодный запах лилий",
        "аромат успеха и шелка"
      ],
      sounds: [
        "тихий щелчок iPhone 15 Pro",
        "шелест тяжелого черного шелка",
        "ледяное молчание как аргумент",
        "звук шагов на мраморном полу",
        "глухой рокот премиального авто"
      ],
      textures: [
        "холодный гладкий шелк",
        "мягкая черная кожа",
        "тяжелое массивное золото на запястье",
        "прохладная поверхность черного мрамора",
        "острота интеллектуального скальпеля"
      ],
      details: [
        "лофт с панорамными окнами",
        "неоново-розовые отсветы на черном",
        "бокал воды с лимоном и льдом",
        "безупречный черный маникюр",
        "вид на вечерний региональный центр"
      ],
      lightSources: [
        "драматический контрастный свет",
        "неоновые розовые акценты",
        "глубокие черные тени",
        "холодное свечение экрана",
        "блики на золотых украшениях"
      ]
    };
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
