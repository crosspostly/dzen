/**
 * 📖 ZenMaster v4.0 - PlotBible Builder
 */

import { PlotBible, NarratorProfile, SensoryPalette } from '../types/PlotBible';

export class PlotBibleBuilder {

  static buildFromTheme(params: {
    theme: string;
    angle?: string;
    emotion?: string;
    audience?: string;
  }): PlotBible {
    const { theme, angle, emotion, audience } = params;
    const context = this.analyzeTheme(theme);
    const narrator = this.buildNarrator(context, emotion);
    const sensoryPalette = this.buildSensoryPalette(context);
    const protagonist = this.buildProtagonist(context);
    const antagonist = context.hasConflict ? this.buildAntagonist(context) : undefined;
    const timeline = {
      present: "2025 год, декабрь, квартира в городе",
      flashbacks: []
    };
    const coverVisual = this.buildCoverVisual(context, narrator);
    const forbiddenThemes = [
      "убийство", "полиция", "наркотики",
      "сексуальное насилие", "детская смерть", "терроризм"
    ];
    return { narrator, protagonist, antagonist, sensoryPalette, timeline, forbiddenThemes, coverVisual };
  }

  private static buildCoverVisual(context: ThemeContext, narrator: NarratorProfile) {
    const isBetrayal = context.emotionalTone === 'betrayal';
    const isGrief = context.emotionalTone === 'grief';
    const isJoy = context.emotionalTone === 'joy';
    const isAnxiety = context.emotionalTone === 'anxiety';

    const locations = [
      'современная кухня с мягким светом',
      'уютная спальня, кровать не заправлена',
      'гостиная, на диване плед',
      'окно с видом на вечерний город',
      'столик в небольшом кафе'
    ];
    if (context.setting === 'rural') {
      locations.push('веранда загородного дома', 'крыльцо деревянного дома', 'сад с яблонями');
    }
    if (context.setting === 'office') {
      locations.push('рабочий стол в офисе', 'пустой коридор офиса');
    }
    let where = locations[Math.floor(Math.random() * locations.length)];
    if (isBetrayal) {
      const betrayalLocs = ['прихожая с зеркалом', 'спальня с открытым шкафом', 'кухня, пустой стул напротив', 'окно в дождливый день'];
      where = betrayalLocs[Math.floor(Math.random() * betrayalLocs.length)];
    }
    if (isGrief) {
      const griefLocs = ['пустая комната', 'скамейка в парке осенью', 'окно с задернутыми шторами', 'кресло в углу'];
      where = griefLocs[Math.floor(Math.random() * griefLocs.length)];
    }

    let lighting = 'утренний естественный свет';
    if (Math.random() > 0.5) lighting = 'мягкий вечерний свет от торшера';
    if (isBetrayal) lighting = 'контрастный вечерний свет, длинные тени';
    if (isGrief) lighting = 'холодный серый свет из окна (пасмурно)';
    if (isJoy) lighting = 'теплый, заливающий все солнце (золотой час)';
    if (isAnxiety) lighting = 'тусклый свет настольной лампы в темноте';

    const actions = [
      'сидит в раздумьях',
      'смотрю в окно, отвернувшись',
      'держу чашку двумя руками',
      'поправляю волосы, глядя в зеркало',
      'читаю письмо или документ'
    ];
    let what = actions[Math.floor(Math.random() * actions.length)];
    if (isBetrayal) {
      const betrayalActions = ['смотрю на телефон с тревогой', 'собираю вещи в чемодан', 'сижу на полу, обхватив колени', 'стою спиной, плечи опущены'];
      what = betrayalActions[Math.floor(Math.random() * betrayalActions.length)];
    }
    if (isJoy) {
      what = Math.random() > 0.5 ? 'улыбаюсь, глядя вверх' : 'смеюсь, прикрыв рот рукой';
    }

    const details = [
      'кружка на столе',
      narrator.age > 45 ? 'старый фотоальбом' : 'смартфон в руке',
      context.setting === 'rural' ? 'занавески в цветочек' : 'минималистичные жалюзи',
      isBetrayal ? 'небрежно брошенные ключи' : 'аккуратно сложенная салфетка'
    ];

    return {
      who: `золотисто-коричневый (рыжий) жесткошерстный пес Батон, белое пятно на груди, большие стоячие уши, в красной бандане (порода терьер-микс)`,
      where,
      what: context.isTravel ? 'изучает окрестности или занят делом из сюжета' : 'сидит рядом',
      lighting,
      mood: context.emotionalTone,
      details: context.isTravel ? [...details, 'горы на заднем плане', 'путешествие'] : details
    };
  }

  private static analyzeTheme(theme: string): ThemeContext {
    const lower = theme.toLowerCase();

    const isTravel = /аул|гора|дагестан|батон|путешеств|поездк|дорога|чемодан|рюкзак|гав|собака/i.test(theme);

    let gender: 'male' | 'female' | 'neutral' = 'neutral';
    if (isTravel) {
      gender = 'male';
    } else if (/женщин|она|моя|мать|сестра|дочь|жена|подруг/i.test(lower)) {
      gender = 'female';
    } else if (/мужчин|он|мой|отец|брат|сын|муж|друг/i.test(lower)) {
      gender = 'male';
    }

    let ageRange: [number, number] = isTravel ? [50, 60] : [40, 60];
    if (/молод|девушк|парен|20|25|30/i.test(lower)) {
      ageRange = [25, 35];
    } else if (/стар|пожил|60|70/i.test(lower)) {
      ageRange = [55, 70];
    }

    const hasFamily = /семь|муж|жена|дети|ребенок|мать|отец/i.test(lower);
    const hasWork = /работ|коллег|начальник|офис|карьер/i.test(lower);
    const hasFriendship = /друг|подруг|знаком|сосед/i.test(lower);

    let emotionalTone = 'neutral';
    if (/измен|предат|ложь|обман/i.test(lower)) emotionalTone = 'betrayal';
    else if (/потер|смерть|утрат|горе/i.test(lower)) emotionalTone = 'grief';
    else if (/радост|счаст|побед/i.test(lower)) emotionalTone = 'joy';
    else if (/страх|боязн|тревог/i.test(lower)) emotionalTone = 'anxiety';

    const hasConflict = /против|конфликт|ссор|спор|враг|проблем/i.test(lower);

    let setting = 'urban apartment';
    if (/деревн|село|дача/i.test(lower)) setting = 'rural';
    else if (/офис|работ/i.test(lower)) setting = 'office';
    else if (/больниц|клиник/i.test(lower)) setting = 'hospital';

    return { gender, isTravel, ageRange, hasFamily, hasWork, hasFriendship, emotionalTone, hasConflict, setting };
  }

  private static buildNarrator(context: ThemeContext, emotion?: string): NarratorProfile {
    const age = Math.floor(context.ageRange[0] + Math.random() * (context.ageRange[1] - context.ageRange[0]));
    let tone: string;
    switch (context.emotionalTone) {
      case 'betrayal': tone = 'bitter irony with hurt'; break;
      case 'grief': tone = 'quiet sadness with wisdom'; break;
      case 'joy': tone = 'warm humor with gratitude'; break;
      case 'anxiety': tone = 'nervous energy with hope'; break;
      default: tone = 'intelligent irony with self-awareness';
    }
    let voiceMarkers = ['я же тебе скажу', 'честное слово', 'вот тогда и началось', 'как говорится', 'представьте себе'];
    if (context.isTravel) {
      voiceMarkers = ['Батон первым почуял', 'Дорога — она такая', 'Тут я понял: приехали', 'Местные говорят', 'Вид — закачаешься', 'Батон навострил уши', 'За 500 рублей договорились'];
    }
    const shuffled = voiceMarkers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4 + Math.floor(Math.random() * 2));
    return {
      gender: context.gender,
      age,
      tone: context.isTravel ? 'conversational and honest' : tone,
      voiceMarkers: selected,
      education: 'высшее',
      socialStatus: context.isTravel ? 'traveler' : 'middle class'
    };
  }

  private static buildSensoryPalette(context: ThemeContext): SensoryPalette {
    if (context.isTravel) {
      return {
        smells: ['запах горного чабреца', 'аромат свежего хлеба из тандыра', 'пыль проселочной дороги', 'запах мокрой шерсти Батона', 'дым от дровяной печи'],
        sounds: ['шум горной реки', 'лай Батона на коров', 'скрип старой калитки', 'ветер в ущелье', 'шум мотора УАЗа'],
        textures: ['шершавый камень сакли', 'холодный металл фляги', 'мягкое ухо Батона', 'колючая шерсть папахи', 'липкая горная глина'],
        details: ['заброшенный аул на скале', 'пасущиеся овцы вдали', 'старая Нива у забора', 'вид на Гамсутль', 'хвостик Батона'],
        lightSources: ['заходящее солнце над хребтом', 'тусклая лампочка в сакле', 'блики на капоте', 'костер в ночи', 'яркий свет в горах']
      };
    }
    const basePalette = {
      smells: ['холодный чай, который постоял', 'запах свежего кофе', 'пыль на подоконнике в солнечном свете', 'запах старых книг', 'аромат стирального порошка'],
      sounds: ['звук уведомления на телефоне', 'тиканье часов на стене', 'хлопок двери', 'шум воды в трубах', 'голоса соседей за стеной'],
      textures: ['потертая бумага конверта', 'холодная поверхность стола', 'мягкий плед', 'шершавая ткань старого дивана', 'гладкая керамика кружки'],
      details: ['старые шторы с выцветшим рисунком', 'советская мебель', 'чашки с цветочками', 'пожелтевшие фотографии на стене', 'телефон на столе'],
      lightSources: ['утренний солнечный свет из окна', 'желтый свет настольной лампы', 'отражение в оконном стекле', 'тусклый свет торшера', 'голубоватое свечение экрана']
    };
    if (context.setting === 'rural') {
      basePalette.details = ['деревянная мебель', 'вышитые полотенца', 'самовар на столе', 'икона в углу', 'старый ковер'];
      basePalette.smells = ['запах дров', 'свежий хлеб', 'травяной чай', 'запах дождя за окном', 'цветы на подоконнике'];
    } else if (context.setting === 'office') {
      basePalette.details = ['офисная мебель', 'компьютер с кучей вкладок', 'стопки бумаг', 'кофейная машина', 'пластиковые стаканчики'];
      basePalette.smells = ['запах принтера', 'кофе из автомата', 'освежитель воздуха', 'запах бумаги', 'чей-то парфюм'];
    }
    return basePalette;
  }

  private static buildProtagonist(context: ThemeContext) {
    const names = context.gender === 'female'
      ? ['Марина', 'Ольга', 'Елена', 'Наталья', 'Светлана', 'Ирина']
      : ['Андрей', 'Сергей', 'Алексей', 'Дмитрий', 'Владимир', 'Михаил'];
    const name = names[Math.floor(Math.random() * names.length)];
    const age = Math.floor(context.ageRange[0] + Math.random() * (context.ageRange[1] - context.ageRange[0]));
    let traits: string[];
    switch (context.emotionalTone) {
      case 'betrayal': traits = ['trusting', 'hurt', 'learning', 'resilient']; break;
      case 'grief': traits = ['strong', 'mourning', 'accepting', 'wise']; break;
      case 'joy': traits = ['optimistic', 'grateful', 'energetic', 'open']; break;
      case 'anxiety': traits = ['worried', 'caring', 'overthinking', 'brave']; break;
      default: traits = ['intelligent', 'reflective', 'searching', 'honest'];
    }
    return {
      name, age, traits,
      motivation: 'find truth and peace',
      arc: 'from confusion to clarity',
      occupation: context.hasWork ? 'office worker' : 'homemaker',
      relationships: context.hasFamily ? { spouse: 'complicated', children: 'protective' } : {}
    };
  }

  private static buildAntagonist(context: ThemeContext) {
    const names = context.gender === 'female'
      ? ['Алексей', 'Сергей', 'Владимир', 'Игорь', 'Юрий']
      : ['Людмила', 'Валентина', 'Татьяна', 'Марина', 'Инна'];
    const name = names[Math.floor(Math.random() * names.length)];
    const age = Math.floor(context.ageRange[0] + Math.random() * 20);
    return {
      name, age,
      traits: ['manipulative', 'secretive', 'defensive', 'hidden motives'],
      motivation: 'protect their secrets and position'
    };
  }

  static generateRandom(): PlotBible {
    const themes = [
      'Женщина 45 лет узнает о тайне мужа',
      'Мужчина 50 лет встречает старого друга',
      'Женщина 38 лет решает изменить жизнь',
      'Молодая мать справляется с трудностями'
    ];
    return this.buildFromTheme({ theme: themes[Math.floor(Math.random() * themes.length)] });
  }
}

interface ThemeContext {
  gender: 'male' | 'female' | 'neutral';
  isTravel: boolean;
  ageRange: [number, number];
  hasFamily: boolean;
  hasWork: boolean;
  hasFriendship: boolean;
  emotionalTone: string;
  hasConflict: boolean;
  setting: string;
}
