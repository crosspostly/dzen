// ============================================================================
// Episode Generator Service
// Generates episodes SEQUENTIALLY (one at a time) to avoid API overload
// Each episode = separate Gemini API request with retry logic
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { ContentSanitizer } from "./contentSanitizer";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private readonly RETRY_DELAY = 2000; // 2 seconds between retries
  private readonly MAX_RETRIES = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 1500; // 1.5 seconds between episodes

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
  }

  /**
   * ✅ Generates a SINGLE episode with one API request
   * Never batches multiple episodes into one request
   */
  async generateSingleEpisode(
    episodeOutline: EpisodeOutline
  ): Promise<Episode> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`   📝 Episode #${episodeOutline.id} - Attempt ${attempt}/${this.MAX_RETRIES}...`);

        // Choose prompt style (standard vs expanded)
        const prompt = attempt === 1 
          ? this.buildStandardPrompt(episodeOutline)
          : this.buildExpandedPrompt(episodeOutline);

        const response = await this.geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.95,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2400,
          },
        });

        let content = response.text || "";

        console.log(`   🧹 Sanitizing content...`);
        content = ContentSanitizer.cleanEpisodeContent(content);

        console.log(`   ✔️ Validating content...`);
        const validation = ContentSanitizer.validateEpisodeContent(content);

        if (!validation.valid) {
          console.error(`   ❌ Validation failed:`);
          validation.errors.forEach((e) => console.error(`      ${e}`));
          throw new Error(`Content validation failed: ${validation.errors[0]}`);
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach((w) => console.log(`   ${w}`));
        }

        const episodeTitle = await this.titleGenerator.generateEpisodeTitle(
          episodeOutline.id,
          content,
          episodeOutline.openLoop
        );

        console.log(`   📝 Episode #${episodeOutline.id}: "${episodeTitle}"`);
        console.log(
          `   ✅ Episode #${episodeOutline.id} clean & valid: ${validation.charCount} chars (${validation.wordCount} words)`
        );

        return {
          id: episodeOutline.id,
          title: episodeTitle,
          content,
          charCount: validation.charCount,
          openLoop: episodeOutline.openLoop,
          turnPoints: [episodeOutline.keyTurning],
          emotions: [episodeOutline.internalConflict],
          keyScenes: [],
          characters: [],
          generatedAt: Date.now(),
          stage: "draft",
        };

      } catch (error) {
        lastError = error;
        console.error(`   ❌ Attempt ${attempt} failed:`, (error as Error).message);

        if (attempt < this.MAX_RETRIES) {
          console.log(`   ⏳ Waiting ${this.RETRY_DELAY}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }
      }
    }

    throw new Error(
      `Episode #${episodeOutline.id} failed after ${this.MAX_RETRIES} attempts: ${lastError}`
    );
  }

  /**
   * ✅ Generates episodes SEQUENTIALLY (one at a time)
   * Each episode = separate request + wait before next
   */
  async generateEpisodesSequentially(
    outlines: EpisodeOutline[],
    options: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<Episode[]> {
    const delay = options.delayBetweenRequests || this.DELAY_BETWEEN_REQUESTS;
    const results: Episode[] = [];

    console.log(`\n🔄 Generating ${outlines.length} episodes SEQUENTIALLY...`);

    for (let i = 0; i < outlines.length; i++) {
      const outline = outlines[i];

      try {
        const episode = await this.generateSingleEpisode(outline);
        results.push(episode);

        if (options.onProgress) {
          options.onProgress(i + 1, outlines.length);
        }

        // Wait before next request (be nice to API)
        if (i < outlines.length - 1) {
          console.log(`   ⏳ Waiting ${delay}ms before next episode...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`\n❌ FAILED: Episode #${outline.id}`);
        throw error;
      }
    }

    return results;
  }

  /**
   * 🎬 Build standard prompt in "Сапоги" style - 3000-4000 characters
   */
  private buildStandardPrompt(outline: EpisodeOutline): string {
    return `🎬 НАПИШИ ПОЛНОКРОВНУЮ СЦЕНУ (3000-4000 символов):

ГЕРОИНЯ: ${outline.theme}
КОНФЛИКТ: ${outline.externalConflict}
ЧТО ОНА ЧУВСТВУЕТ: ${outline.internalConflict}
ПЕРЕЛОМНЫЙ МОМЕНТ: ${outline.keyTurning}
НА ЧЕМ ЗАВИСАЕТ ЧИТАТЕЛЬ: ${outline.openLoop}

ПРАВИЛА ПИСЬМА:

1️⃣ ДЕТАЛИ РЕАЛЬНОСТИ (не просто слова):
   - Запахи: "Запах новой кожи ударил в нос"
   - Звуки: "Каждый шаг отдавался хлюпающим звуком"
   - Ощущения: "Сердце билось чаще обычного"
   - Вещи имеют ИСТОРИЮ: "Сапоги, купленные три года назад"

2️⃣ ВНУТРЕННИЙ ГОЛОС ГЕРОИНИ:
   - НЕ "она думала", а "я понимала"
   - Её воспоминания вплетены в действие
   - Её боль видна в деталях, не объяснена

3️⃣ ДИАЛОГ - РЕЗКИЙ И ЖИВОЙ:
   - Короткие реплики
   - Перебивают друг друга
   - Говорят телом: "— Это что? — рывок, взгляд, молчание"

4️⃣ ДЕЙСТВИЕ КАК В КИНО:
   - Не "они ссорились", а сцена: "Он схватил ручки пакета обеими руками..."
   - Читатель ВИДИТ, слышит, чувствует
   - Физика конфликта (тянут за пакет, падает, красные следы)

5️⃣ СИМВОЛЫ В ДЕТАЛЯХ:
   - Дырявые ботинки = её жизнь (протекает, холодно, стыдно)
   - Новые вещи = право на себя
   - Деньги = её труд, её выбор, её власть

6️⃣ РАЗВЯЗКА СЦЕНЫ = ПЕРЕЛОМНЫЙ МОМЕНТ:
   - Не просто конец, а точка невозврата
   - Её решение меняет ВСЁ
   - Читатель чувствует: ДА, ЭТОТ МОМЕНТ всё перевернул

7️⃣ ЯЗЫК:
   - Русский (не английский!)
   - Как рассказ подруге (исповедь, откровенность)
   - Есть юмор, горечь, ирония
   - Длинные предложения (описание) + короткие диалоги (действие)

ПРИМЕР (первые 300 символов):
"Ветер в середине ноября был особенно злым. Он пробирался под мое старое 
пальто, купленное пять лет назад, колол лицо ледяными иголками. Мои ботинки 
окончательно сдались. Левая подошва отклеилась, и каждый шаг по асфальту 
отдавался хлюпающим звуком."

✅ ИТОГО: 3000+ символов ЖИВОГО, болезненного рассказа!
Не берись кратко! Расскажи ПОЛНОСТЬЮ!

Output ONLY episode text (no JSON, no metadata):`;
  }

  /**
   * ⚠️ Build expanded prompt in "Сапоги" style - 3500+ characters
   * Used for retry attempts if first attempt was too short
   */
  private buildExpandedPrompt(outline: EpisodeOutline): string {
    return `⚠️ ВНИМАНИЕ! Предыдущая версия была СЛИШКОМ СКОМКАНА И КОРОТКА!

НАПИШИ РАЗВЁРНУТУЮ, ПОЛНОКРОВНУЮ СЦЕНУ (минимум 3500 символов):

ГЕРОИНЯ: ${outline.theme}
КОНФЛИКТ: ${outline.externalConflict}
ЧТО ОНА ЧУВСТВУЕТ: ${outline.internalConflict}
ПЕРЕЛОМНЫЙ МОМЕНТ: ${outline.keyTurning}
НА ЧЕМ ЗАВИСАЕТ ЧИТАТЕЛЬ: ${outline.openLoop}

ПОКАЗЫВАЙ ЭМОЦИИ ТЕЛОМ:
- "Мое сердце сделало неприятный кульбит"
- "Руки дрожали"
- "На глаза наворачивались слезы"
- "Я чувствовала, как радость начинает растворяться"

ДЕТАЛИ ОБСТАНОВКИ (не пропускай!):
- Запахи: "Запах новой кожи ударил в нос, вызвав легкое головокружение"
- Звуки: "Каждый шаг отдавался хлюпающим звуком и мгновенным холодом"
- Вид: "На ладонях остались красные болезненные следы"
- Ощущения: "Ледяная вода в ботинках, беспощадная и ледяная"

ВНУТРЕННИЙ ГОЛОС ГЕРОИНИ:
- Её размышления: "Два месяца я ела пустую гречку с солью в офисной столовой..."
- Её воспоминания: "За пять лет брака я поняла: в его мире существуют только его потребности"
- Её осознания: "Внутри меня что-то щелкнуло. Просто — щелк, и темнота."

ДИАЛОГ - ТОЛЬКО РЕПЛИКИ, КРАТКИЕ, БОЛЬНО:
— Это что?
— Сапоги, — выдохнула я, крепче прижимая покупку к себе.
— За сколько?
— За пятнадцать.

ДЕЙСТВИЕ СЦЕНЫ (как в кино!):
1. Она видит вещь (желание, надежда)
2. Она покупает (решение, выбор, трата своих денег)
3. Конфликт взрывается (звонок, требование, гнев)
4. Физический конфликт (рывок, боль, унижение)
5. Переломный момент (её решение меняет всё)

ФИНАЛ СЦЕНЫ: Не просто конец, а переломный момент:
"Я стояла и смотрела ему в спину. Холодный ветер больше не кусал лицо, 
ледяная вода в ботинках больше не чувствовалась. Я ничего не чувствовала. 
Внутри меня что-то щелкнуло. Просто — щелк, и темнота."

ПРАВИЛО: Минимум 3500 символов. ПОКАЖИ, НЕ ГОВОРИ!
Не резюмируй! Не кратко! ВСЕ ДЕТАЛИ!

Output ONLY episode text (no JSON, no metadata):`;
  }
}
