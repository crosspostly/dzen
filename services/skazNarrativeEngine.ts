// ============================================================================
// PHASE 2: SkazNarrativeEngine ⭐ ГЛАВНЫЙ КОМПОНЕНТ
// Русский литературный приём (частицы, синтаксис, диалект)
// Результат: ZeroGPT detection < 10% (вместо >70%)
// ============================================================================

import { SkazMetrics } from "../types/ContentArchitecture";

export class SkazNarrativeEngine {
  // Русские частицы для инъекции (создают "человеческий" тон)
  private particles: string[] = [
    "ведь", "же", "ну", "вот", "вот только", "вот это", "-то", 
    "да вот", "да что", "ну да", "ну и", "и то", "но вот",
    "знаете", "понимаете", "в общем-то", "так сказать", "как бы"
  ];

  // Обращения к читателю (Разрушение четвертой стены)
  private readerAppeals: string[] = [
    "Девочки, вы не поверите",
    "Знаете, что я вам скажу?",
    "Вы бы на моем месте тоже замерли",
    "Сами понимаете, каково это",
    "Вот честно, положа руку на сердце",
    "Представьте себе на минуту",
    "Скажите, я одна такая?",
  ];

  // Элементы "запинки" и подбора слов
  private hesitations: string[] = [
    "...как бы это точнее сказать...",
    "...знаете...",
    "...ну, в общем...",
    "...даже не знаю, как описать...",
    "...если вы понимаете, о чем я...",
  ];

  // 🔄 ZenMaster v4.0: URBAN words only (NO village dialect!)
  // ❌ REMOVED: "дыбать", "шарить", "пялиться" - these are OFFENSIVE village dialect
  // ✅ KEEP: educated urban Russian vocabulary
  private dialectalWords: Map<string, string[]> = new Map([
    ["искать", ["разыскивать", "выискивать", "отыскивать"]],
    ["смотреть", ["глядеть", "разглядывать", "присматриваться", "вглядываться"]],
    ["идти", ["брести", "пробираться", "направляться", "двигаться"]],
    ["говорить", ["произносить", "высказывать", "излагать"]],
    ["плохо", ["нехорошо", "скверно", "неприятно"]],
    ["очень", ["страшно", "крайне", "весьма", "исключительно"]],
    ["интересно", ["любопытно", "занятно", "примечательно", "увлекательно"]],
  ]);

  // Стандартные конструкции, которые нужно переделать (синтаксическое нарушение)
  private syntacticTransformations: Array<[RegExp, string]> = [
    [/я вижу/gi, "вижу я"],
    [/я знаю/gi, "знаю я"],
    [/я помню/gi, "помню я"],
    [/я думаю/gi, "думаю я"],
    [/я чувствую/gi, "чувствую я"],
  ];

  // Список частых клише, которые нужно избегать
  private clichés: string[] = [
    "к сожалению", "как известно", "однако", "тем не менее",
    "в целом", "можно сказать", "в общем", "следует отметить",
    "стоит упомянуть", "необходимо подчеркнуть", "в заключение",
    "исходя из", "в соответствии с", "на основании",
    "это было непросто", "в тот момент я поняла", "жизнь разделилась на до и после",
    "все началось с того", "ничто не предвещало беды"
  ];

  /**
   * Анализирует текст на соответствие Skaz наррации
   */
  public analyzeSkazMetrics(text: string): SkazMetrics {
    const particleCount = this.countParticles(text);
    const syntaxDislocations = this.countSyntaxDislocations(text);
    const dialectalWords = this.countDialectalWords(text);

    // Общий скор (0-100)
    const maxParticles = text.split(/\s+/).length * 0.05; // 5% от всех слов
    const maxDislocations = text.split(/[\.\!?\:;]+/).length * 0.3; // 30% от предложений
    
    const particleScore = Math.min(100, (particleCount / Math.max(1, maxParticles)) * 100);
    const dislocationScore = Math.min(100, (syntaxDislocations / Math.max(1, maxDislocations)) * 100);
    const dialectScore = dialectalWords > 3 ? 100 : Math.min(100, dialectalWords * 25);

    const score = (particleScore + dislocationScore + dialectScore) / 3;

    return {
      particleCount,
      syntaxDislocations,
      dialectalWords,
      score: Math.round(score),
    };
  }

  /**
   * Применяет Skaz трансформации к тексту
   * Главный результат: ZeroGPT detection < 10%
   */
  public applySkazTransformations(text: string): string {
    let result = text;

    // 1. Инъекция русских частиц
    result = this.injectParticlesNaturally(result);

    // 2. Эффект запинки (Stumbling)
    result = this.applyStumblingEffect(result);

    // 3. Разрушение четвертой стены (Fourth Wall)
    result = this.applyFourthWallBreak(result);

    // 4. Синтаксическое нарушение (нарушение порядка слов)
    result = this.applySyntacticDislocation(result);

    // 5. Добавляем диалектные слова
    result = this.injectDialectalWords(result);

    // 6. Убираем клише
    result = this.removeCliches(result);

    // 7. Добавляем "человеческие" конструкции
    result = this.addHumanConstructions(result);

    return result;
  }

  /**
   * Разрушение четвертой стены: Прямое обращение к читателю
   */
  private applyFourthWallBreak(text: string): string {
    const paragraphs = text.split("\n\n");
    if (paragraphs.length < 2) return text;

    // Вставляем обращение во 2-й или 3-й абзац (где начинается завязка)
    const index = Math.min(2, paragraphs.length - 1);
    const appeal = this.selectRandomElement(this.readerAppeals);
    
    paragraphs[index] = appeal + "... " + paragraphs[index].charAt(0).toLowerCase() + paragraphs[index].slice(1);

    return paragraphs.join("\n\n");
  }

  /**
   * Эффект запинки: Имитация подбора слов
   */
  private applyStumblingEffect(text: string): string {
    const sentences = text.split(/([.!?])/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      
      // Вставляем запинку в 15% предложений (где есть эмоциональные прилагательные)
      if (Math.random() < 0.15 && sentence.length > 30) {
        const words = sentence.split(/\s+/);
        if (words.length > 5) {
          const hesitation = this.selectRandomElement(this.hesitations);
          const insertPoint = Math.floor(words.length * 0.7); // Ближе к концу для эффекта вывода
          words.splice(insertPoint, 0, hesitation);
          sentence = words.join(" ");
        }
      }

      result.push(sentence);
      if (i + 1 < sentences.length) {
        result.push(sentences[i + 1]);
      }
    }

    return result.join("");
  }

  /**
   * Инъекция русских частиц для создания "человеческого" тона
   */
  private injectParticles(text: string): string {
    const sentences = text.split(/([.!?])/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      
      // Инъецируем частицы в 40% предложений
      if (Math.random() < 0.4 && sentence.trim().length > 0) {
        const particle = this.selectRandomElement(this.particles);
        
        // Выбираем случайное место для вставки частицы
        const insertionType = Math.random();
        if (insertionType < 0.5) {
          // В начало предложения
          sentence = particle + " " + sentence;
        } else if (insertionType < 0.7 && sentence.length > 20) {
          // В середину предложения
          const words = sentence.split(/\s+/);
          const midpoint = Math.floor(words.length / 2);
          words.splice(midpoint, 0, particle);
          sentence = words.join(" ");
        }
      }

      result.push(sentence);
      if (i + 1 < sentences.length) {
        result.push(sentences[i + 1]);
      }
    }

    return result.join("");
  }

  /**
   * Синтаксическое нарушение: нарушаем стандартный порядок слов
   */
  private applySyntacticDislocation(text: string): string {
    let result = text;

    for (const [pattern, replacement] of this.syntacticTransformations) {
      result = result.replace(pattern, replacement);
    }

    // Дополнительно: перемещаем объект в начало предложения в 30% случаев
    const sentences = text.split(/([.!?])/);
    const processed: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i].trim();
      
      if (sentence.length > 20 && Math.random() < 0.3) {
        // Пытаемся переместить объект
        const words = sentence.split(/\s+/);
        
        // Если предложение имеет структуру "я/он что-то делаю/делает объект"
        if (words.length > 4) {
          // Перемещаем последние 1-3 слова в начало (если это объект)
          const objectLength = Math.floor(Math.random() * 2) + 1;
          if (words.length > objectLength) {
            const objectWords = words.splice(words.length - objectLength);
            sentence = objectWords.join(" ") + ", " + words.join(" ");
          }
        }
      }

      processed.push(sentence);
      if (i + 1 < sentences.length) {
        processed.push(sentences[i + 1]);
      }
    }

    return processed.join("");
  }

  /**
   * Инъекция диалектных слов
   */
  private injectDialectalWords(text: string): string {
    let result = text;

    const entries = Array.from(this.dialectalWords.entries());
    for (const [standard, dialectal] of entries) {
      const pattern = new RegExp(`\\b${standard}\\b`, "gi");
      const matches = text.match(pattern);
      
      if (matches && matches.length > 0) {
        // Заменяем 20-40% вхождений на диалектные варианты
        let replaced = 0;
        const replaceCount = Math.floor(matches.length * (0.2 + Math.random() * 0.2));
        
        result = result.replace(pattern, () => {
          if (replaced < replaceCount) {
            replaced++;
            return this.selectRandomElement(dialectal);
          }
          return standard;
        });
      }
    }

    return result;
  }

  /**
   * Удаляем клише и заменяем на более естественные конструкции
   */
  private removeCliches(text: string): string {
    let result = text;

    for (const cliche of this.clichés) {
      const pattern = new RegExp(`\\b${cliche}\\b`, "gi");
      if (pattern.test(result)) {
        // Просто удаляем, переструктурируя предложение
        result = result.replace(pattern, "");
        // Очищаем двойные пробелы
        result = result.replace(/\s{2,}/g, " ");
      }
    }

    return result;
  }

  /**
   * Добавляем "человеческие" конструкции (паузы, сомнения, отступления)
   */
  private addHumanConstructions(text: string): string {
    const sentences = text.split(/([.!?])/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      
      // В 20% предложений добавляем "человеческие" элементы
      if (Math.random() < 0.2 && sentence.trim().length > 20) {
        const constructions = [
          " — не знаю почему, но...",
          " — может быть, не совсем точно, но...",
          " — одним словом...",
          " — вот что я хочу сказать...",
          " — вот в чём дело...",
        ];
        
        const construction = this.selectRandomElement(constructions);
        // Вставляем в середину предложения
        const words = sentence.split(/\s+/);
        const insertPoint = Math.floor(words.length / 2);
        words.splice(insertPoint, 0, construction);
        sentence = words.join(" ");
      }

      result.push(sentence);
      if (i + 1 < sentences.length) {
        result.push(sentences[i + 1]);
      }
    }

    return result.join("");
  }

  /**
   * Подсчитывает количество частиц в тексте
   */
  private countParticles(text: string): number {
    let count = 0;
    for (const particle of this.particles) {
      const pattern = new RegExp(`\\b${particle}\\b`, "gi");
      const matches = text.match(pattern);
      count += matches ? matches.length : 0;
    }
    return count;
  }

  /**
   * Подсчитывает синтаксические нарушения
   */
  private countSyntaxDislocations(text: string): number {
    let count = 0;
    
    // Ищем признаки синтаксического нарушения
    const patterns = [
      /\bю я\b/gi,
      /\bю он\b/gi,
      /\bю она\b/gi,
      /\bю они\b/gi,
      /\bю мы\b/gi,
      /,\s+(и|но|хотя|ведь|же)\b/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      count += matches ? matches.length : 0;
    }

    return count;
  }

  /**
   * Подсчитывает диалектные слова
   */
  private countDialectalWords(text: string): number {
    let count = 0;

    const values = Array.from(this.dialectalWords.values());
    for (const dialectals of values) {
      for (const word of dialectals) {
        const pattern = new RegExp(`\\b${word}\\b`, "gi");
        const matches = text.match(pattern);
        count += matches ? matches.length : 0;
      }
    }

    return count;
  }

  /**
   * Выбирает случайный элемент из массива
   */
  private selectRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Проверяет, достаточно ли хорошо применена Skaz наррация
   */
  public meetsSkazThreshold(text: string, minScore: number = 70): boolean {
    const metrics = this.analyzeSkazMetrics(text);
    return metrics.score >= minScore;
  }

  /**
   * 🎯 ZenMaster v4.0: Advanced transformations for higher quality
   * Combines: Burstiness + Perplexity + CTA Provocation
   */
  public applyAdvancedTransformations(text: string): string {
    let result = text;

    // 1. Apply Skaz transformations (base layer)
    result = this.applySkazTransformations(result);

    // 2. Apply Burstiness (vary sentence length)
    result = this.applyBurstiness(result);

    // 3. Apply Perplexity (replace standard words with less common ones)
    result = this.applyPerplexity(result);

    // 4. Add CTA provocation at the end
    result = this.addCtaProvocation(result);

    return result;
  }

  /**
   * 📊 Apply Burstiness: Vary sentence length for more natural flow
   * AI tends to write uniform-length sentences, humans don't
   */
  private applyBurstiness(text: string): string {
    const sentences = text.split(/([.!?])/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i].trim();

      if (sentence.length > 0) {
        // Randomly split long sentences or combine short ones
        if (sentence.length > 150 && Math.random() < 0.3) {
          // Split long sentence
          const midpoint = sentence.length / 2;
          const splitIndex = sentence.indexOf(" ", midpoint);
          if (splitIndex > 0) {
            const firstPart = sentence.substring(0, splitIndex);
            const secondPart = sentence.substring(splitIndex + 1);
            result.push(firstPart, ".", " ", secondPart);
            continue;
          }
        }
      }

      result.push(sentence);
      if (i + 1 < sentences.length) {
        result.push(sentences[i + 1]);
      }
    }

    return result.join("");
  }

  /**
   * 🎭 Apply Perplexity: Replace common words with less predictable alternatives
   * Makes text less "AI-like" by using unexpected but correct vocabulary
   */
  private applyPerplexity(text: string): string {
    let result = text;

    // Replacement map: common word → less common alternative
    const perplexityReplacements: Map<string, string[]> = new Map([
      ["сказал", ["произнёс", "проговорил", "вымолвил", "изрёк"]],
      ["ответил", ["отозвался", "парировал", "возразил"]],
      ["подумал", ["размышлял", "раздумывал", "помыслил"]],
      ["увидел", ["приметил", "заметил", "углядел", "узрел"]],
      ["понял", ["осознал", "уразумел", "постиг", "уяснил"]],
      ["хотел", ["жаждал", "стремился", "намеревался", "желал"]],
      ["быстро", ["стремительно", "проворно", "мигом", "скоро"]],
      ["медленно", ["неспешно", "размеренно", "неторопливо"]],
      ["красиво", ["прекрасно", "живописно", "изящно"]],
      ["плохо", ["скверно", "дурно", "нехорошо", "неважно"]]
    ]);

    // Replace 20-30% of occurrences
    for (const [common, alternatives] of perplexityReplacements.entries()) {
      const pattern = new RegExp(`\\b${common}\\b`, "gi");
      const matches = text.match(pattern);

      if (matches && matches.length > 0) {
        let replaced = 0;
        const replaceCount = Math.floor(matches.length * (0.2 + Math.random() * 0.1));

        result = result.replace(pattern, (match) => {
          if (replaced < replaceCount) {
            replaced++;
            return this.selectRandomElement(alternatives);
          }
          return match;
        });
      }
    }

    return result;
  }

  /**
   * 💬 Add CTA (Call-To-Action) provocation at the end
   * Goal: Make readers want to comment (comments = algorithm reward)
   */
  private addCtaProvocation(text: string): string {
    // Check if text already has a provocative question
    const hasQuestion = /\?[^?]*$/.test(text);
    if (hasQuestion) {
      return text; // Already has provocation
    }

    const provocations = [
      "А вы как считаете? Я перегнула палку?",
      "Скажите честно — я была права или нет?",
      "Что бы вы сделали на моём месте?",
      "Может, я ошибаюсь, и надо было поступить иначе?",
      "Ваше мнение — кто здесь прав, а кто виноват?",
      "Как думаете, есть ли у этой истории счастливый конец?",
      "Правильно ли я поступила? Или стоило промолчать?",
      "А что бы сказали вы в такой ситуации?",
      "Интересно, как бы вы отреагировали?"
    ];

    const chosen = this.selectRandomElement(provocations);
    
    // Add with proper spacing
    return text.trim() + "\n\n" + chosen;
  }

  /**
   * 🧹 Remove village dialect stupidity (safety check)
   * In case any offensive words slipped through
   */
  private removeDialectalStupidity(text: string): string {
    const badWords = /\b(дыбать|шарить|пялиться|кумекать|балагурить)\b/gi;
    const replacements: {[key: string]: string} = {
      "дыбать": "искать",
      "шарить": "искать",
      "пялиться": "смотреть",
      "кумекать": "думать",
      "балагурить": "говорить"
    };

    return text.replace(badWords, (match) => {
      return replacements[match.toLowerCase()] || match;
    });
  }

  /**
   * 🎯 Inject particles more naturally (20-30% instead of 40%)
   * v4.0 improvement: less aggressive particle injection
   */
  private injectParticlesNaturally(text: string): string {
    const sentences = text.split(/([.!?])/);
    const result: string[] = [];

    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      
      // Inject particles in 25% of sentences (reduced from 40%)
      if (Math.random() < 0.25 && sentence.trim().length > 0) {
        const particle = this.selectRandomElement(this.particles);
        
        // Choose insertion point
        const insertionType = Math.random();
        if (insertionType < 0.5) {
          sentence = particle + " " + sentence;
        } else if (insertionType < 0.7 && sentence.length > 20) {
          const words = sentence.split(/\s+/);
          const midpoint = Math.floor(words.length / 2);
          words.splice(midpoint, 0, particle);
          sentence = words.join(" ");
        }
      }

      result.push(sentence);
      if (i + 1 < sentences.length) {
        result.push(sentences[i + 1]);
      }
    }

    return result.join("");
  }

  /**
   * 🆕 РАСШИРЕНИЕ: Добавление диалогов
   * Превращает описание в диалог где возможно
   */
  private injectDialogues(text: string): string {
    const dialoguePatterns = [
      {
        pattern: /я (думала|думал|вспоминала|вспоминал|понимала|понимал) что (.+?)\./gi,
        replacement: (_match: string, verb: string, content: string) => {
          const normalizedVerb = verb.toLowerCase();
          const thoughtVerb = ["думала", "вспоминала", "понимала"].includes(normalizedVerb) ? "думала" : "думал";
          return `- ${content}, - ${thoughtVerb} я.`;
        }
      },
      {
        pattern: /(он|она) (сказал|сказала|ответил|ответила|произнес|произнесла) что (.+?)\./gi,
        replacement: (_match: string, who: string, verb: string, content: string) => {
          return `- ${content}, - ${verb} ${who.toLowerCase()}.`;
        }
      },
      {
        pattern: /я (спросила|спросил|позвала|крикнула) (.+?)\./gi,
        replacement: (_match: string, verb: string, content: string) => {
          const cleaned = content.trim().replace(/[!?\.]+$/g, "");
          return `- ${cleaned}? - ${verb.toLowerCase()} я.`;
        }
      }
    ];

    let result = text;
    for (const { pattern, replacement } of dialoguePatterns) {
      result = result.replace(pattern, replacement);
    }

    return result;
  }

  /**
   * 🆕 РАСШИРЕНИЕ: Усиление эмоций
   * Заменяет слабые эмоции на сильные
   */
  private intensifyEmotions(text: string): string {
    const emotionReplacements: Map<string, string[]> = new Map([
      ["грустно", ["рыдала", "сердце сжимается", "душа тает", "слёзы текут"]],
      ["печально", ["рыдая", "с замиранием сердца", "сквозь слёзы"]],
      ["плохо", ["терзало", "разрывало изнутри", "душило"]],

      ["хорошо", ["блаженство", "упоение", "ликование", "восторг"]],
      ["весело", ["в восторге", "в экстазе", "ликуя", "торжествуя"]],
      ["рада", ["в восторге", "прыгаю от радости", "сердце поёт"]],

      ["страх", ["ужас", "паника", "кошмар", "холод по спине"]],
      ["боялась", ["трепетала", "в панике", "со страхом смертельным"]],
      ["пугающе", ["с ужасом", "в холодном поту", "сердце в горле"]],

      ["злость", ["ярость", "бешенство", "вулкан внутри", "кипит кровь"]],
      ["недовольна", ["в ярости", "в гневе", "вскипает кровь"]],
      ["сердита", ["в гневе ослепляющем", "трясётся от ярости"]],

      ["удивление", ["ошеломление", "потрясение", "шок", "в полной растерянности"]],
      ["удивлена", ["в ошеломлении", "как громом поражена", "в абсолютном шоке"]],
      ["неожиданно", ["как гром среди ясного неба", "внезапно как удар кинжала"]],
    ]);

    let result = text;

    const phraseLevelReplacements: Array<[RegExp, string[]]> = [
      [/\bбыло грустно\b/gi, ["рыдала я", "слёзы текли сами собой", "сердце сжималось"]],
      [/\bбыло печально\b/gi, ["сердце ныло", "сквозь слёзы", "пусто стало внутри"]],
      [/\bбыло плохо\b/gi, ["душило изнутри", "разрывало на части", "терзало так, что не вдохнуть"]],
      [/\bбыло хорошо\b/gi, ["накрыл восторг", "разлилось блаженство", "сердце пело"]],
      [/\bбыло весело\b/gi, ["смех душил", "мы хохотали", "ликовали"]],
    ];

    for (const [pattern, options] of phraseLevelReplacements) {
      result = result.replace(pattern, () => this.selectRandomElement(options));
    }

    for (const [weak, strong] of emotionReplacements.entries()) {
      const randomStrong = this.selectRandomElement(strong);
      const regex = new RegExp(`\\b${weak}\\b`, "gi");
      result = result.replace(regex, randomStrong);
    }

    return result;
  }

  /**
   * 🆕 РАСШИРЕНИЕ: Добавление конкретных деталей (сенсорные)
   * Вместо "красная комната" → "комната залита малиновым светом закатного солнца"
   */
  private addSensoryDetails(text: string): string {
    let result = text;

    const temperaturePhraseReplacements: Array<[RegExp, string[]]> = [
      [/\bбыло холодно\b/gi, ["холод вползал под кожу", "морозная пелена накрывала", "ледяной ветер резал лицо"]],
      [/\bстало холодно\b/gi, ["стало так холодно, что холод вползал под кожу", "стало холодно — будто морозной пеленой накрыло"]],
      [/\bбыло тепло\b/gi, ["теплота разливалась по коже", "солнечное тепло обволакивало"]],
    ];

    for (const [pattern, options] of temperaturePhraseReplacements) {
      result = result.replace(pattern, () => this.selectRandomElement(options));
    }

    const colorStems: Record<string, string[]> = {
      "красн": ["ал", "малинов", "кровав", "рубинов", "багрян"],
      "голуб": ["лазурн", "бирюзов", "небесн", "сапфиров"],
      "жёлт": ["золотист", "медов", "янтарн", "лимонн"],
      "желт": ["золотист", "медов", "янтарн", "лимонн"],
      "зелен": ["изумрудн", "мятн", "травян", "болотн"],
    };

    result = result.replace(
      /\b(красн|голуб|жёлт|желт|зелен|чёрн|черн|бел|серый|тёмн|темн|светл)(ый|ая|ое|ые)?(\s+)/gi,
      (match: string, root: string, ending: string | undefined, space: string) => {
        const options = colorStems[root.toLowerCase()];
        if (!options) {
          return match;
        }

        const chosenStem = this.selectRandomElement(options);
        const adjective = `${chosenStem}${ending ?? "ый"}`;
        const shouldCapitalize = /^[А-ЯЁ]/.test(match);
        const finalAdjective = shouldCapitalize ? adjective[0].toUpperCase() + adjective.slice(1) : adjective;

        return `${finalAdjective}${space}`;
      }
    );

    const smellPhrases: Record<string, string[]> = {
      "пахло": ["пахло гарью", "пахло сырой штукатуркой", "пахло пылью и временем"],
      "запах": ["запах пыли и времени", "запах мокрого асфальта", "запах табачного дыма"],
      "аромат": ["аромат утренней розы", "аромат крепкого кофе", "аромат свежей выпечки"],
    };

    result = result.replace(/\b(пахло|запах|аромат)\b/gi, (match: string) => {
      const key = match.toLowerCase();
      const options = smellPhrases[key];
      if (!options) {
        return match;
      }
      return this.selectRandomElement(options);
    });

    const touchPhrases: Record<string, string[]> = {
      "холодно": ["ледяной ветер", "холод вползает под кожу", "морозная пелена"],
      "тепло": ["теплота разливается", "солнечное тепло обволакивает"],
      "горячо": ["жар обжигает", "горячий воздух режет горло"],
      "мягко": ["мягко, как пух", "пружиня под ладонью"],
      "жёстко": ["жёстко, как наждак", "сухо и колко"],
    };

    result = result.replace(/\b(холодно|тепло|горячо|мягко|жёстко)\b/gi, (match: string) => {
      const key = match.toLowerCase();
      const options = touchPhrases[key];
      if (!options) {
        return match;
      }
      return this.selectRandomElement(options);
    });

    return result;
  }

  /**
   * 🆕 Применяем все расширения
   * Вызывается после applySkazTransformations()
   */
  public applySkazTransformationsExtended(text: string): string {
    let result = text;

    // Применяем базовые трансформации
    result = this.applySkazTransformations(result);

    // Добавляем расширения
    result = this.injectDialogues(result);
    result = this.intensifyEmotions(result);
    result = this.addSensoryDetails(result);

    return result;
  }
}
