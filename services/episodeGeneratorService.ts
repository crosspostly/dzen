import { GoogleGenAI } from "@google/genai";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { ContentSanitizer } from "./contentSanitizer";

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private readonly INITIAL_RETRY_DELAY = 2000;
  private readonly MAX_RETRIES = 3;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  async generateSingleEpisode(
    episodeOutline: EpisodeOutline
  ): Promise<Episode> {
    console.log(`\n   🎬 Episode #${episodeOutline.id} - Starting generation...`);

    // Attempt 1: Standard prompt
    console.log(`   📝 Attempt 1/4: Standard prompt`);
    let content = await this.generateWithPrompt(
      episodeOutline,
      this.buildStandardPrompt(episodeOutline)
    );

    if (this.isValidLength(content)) {
      return this.buildEpisode(episodeOutline, content);
    }

    console.log(`   ⚠️  Too short (${content.length} chars), trying expanded...`);

    // Attempt 2: Expanded prompt with examples
    console.log(`   📝 Attempt 2/4: Expanded prompt with examples`);
    content = await this.generateWithPrompt(
      episodeOutline,
      this.buildExpandedPrompt(episodeOutline)
    );

    if (this.isValidLength(content)) {
      return this.buildEpisode(episodeOutline, content);
    }

    console.log(`   ⚠️  Still too short (${content.length} chars), trying breakdown...`);

    // Attempt 3: Breakdown by parts
    console.log(`   📝 Attempt 3/4: Breakdown prompt (separate parts)`);
    content = await this.generateWithBreakdown(episodeOutline);

    if (this.isValidLength(content)) {
      return this.buildEpisode(episodeOutline, content);
    }

    console.log(`   ⚠️  Breakdown failed (${content.length} chars), using fallback...`);

    // Attempt 4: Fallback - two parts combined
    console.log(`   📝 Attempt 4/4: Fallback generation (part 1 + part 2)`);
    content = await this.generateFallback(episodeOutline);

    if (!this.isValidLength(content)) {
      throw new Error(
        `Episode #${episodeOutline.id} failed all attempts: max ${content.length} chars`
      );
    }

    return this.buildEpisode(episodeOutline, content);
  }

  private buildStandardPrompt(outline: EpisodeOutline): string {
    return `Write Episode #${outline.id} for serialized Zen longform:

PLOT:
- Opening question: "${outline.hookQuestion}"
- External conflict: "${outline.externalConflict}"
- Internal emotion: "${outline.internalConflict}"
- Turning point: "${outline.keyTurning}"
- Cliffhanger: "${outline.openLoop}"

REQUIREMENTS:
1. Length: EXACTLY 3000-4000 characters
2. Structure: Situation → Dialogue → Crisis → Cliffhanger
3. Pure narrative (no JSON, no metadata)
4. At least 1 natural dialogue
5. Russian language only
6. Show action, not summary

Output ONLY episode text:`;
  }

  private buildExpandedPrompt(outline: EpisodeOutline): string {
    return `Write Episode #${outline.id} for serialized Zen article (3000-4000 chars).

CONTEXT:
- Hook: "${outline.hookQuestion}"
- What happens: "${outline.externalConflict}"
- What they feel: "${outline.internalConflict}"
- The turning point: "${outline.keyTurning}"
- Reader wants more because: "${outline.openLoop}"

DETAILED STRUCTURE:
1. OPENING (200-300 chars): Set the scene with specific detail
   Example: "Утром, когда я открыла шкаф, старый альбом упал на пол..."

2. ESCALATION (800-1200 chars): Develop conflict through action + dialogue
   Example: "— Ты помнишь, что я тогда сказала? — спросила мама. Я молчала."

3. CLIMAX (400-600 chars): The turning point arrives
   Example: "И вдруг я поняла - это не её вина. Это была моя боль."

4. RESOLUTION (400-600 chars): New understanding emerges
   Example: "Я закрыла альбом. Но теперь я видела прошлое по-другому."

5. CLIFFHANGER (200-300 chars): End with open question
   Example: "Сможу ли я простить её? Или сначала себя?"

TONE: Personal, confessional, raw.
LANGUAGE: RUSSIAN ONLY. Use em-dashes (—) for dialogue.

Write the COMPLETE episode text (3000+ characters):`;
  }

  private async generateWithBreakdown(outline: EpisodeOutline): Promise<string> {
    const parts: string[] = [];

    console.log(`      🔨 Generating opening (200-300 chars)...`);
    const opening = await this.generateWithPrompt(
      outline,
      `Write opening for episode (200-300 chars): "${outline.hookQuestion}" in Russian. Raw, personal, confessional style.`
    );
    parts.push(opening);

    await new Promise(r => setTimeout(r, 1500));

    console.log(`      🔨 Generating escalation (800-1200 chars)...`);
    const escalation = await this.generateWithPrompt(
      outline,
      `Continue episode (800-1200 chars): The conflict: "${outline.externalConflict}". Include dialogue with — marks. Russian, personal.`
    );
    parts.push(escalation);

    await new Promise(r => setTimeout(r, 1500));

    console.log(`      🔨 Generating climax (400-600 chars)...`);
    const climax = await this.generateWithPrompt(
      outline,
      `Climax moment (400-600 chars): The turning point "${outline.keyTurning}". Emotional realization. Show, don't tell. Russian.`
    );
    parts.push(climax);

    await new Promise(r => setTimeout(r, 1500));

    console.log(`      🔨 Generating resolution (400-600 chars)...`);
    const resolution = await this.generateWithPrompt(
      outline,
      `Resolution (400-600 chars): After realizing "${outline.keyTurning}". New perspective. Russian, personal, intimate.`
    );
    parts.push(resolution);

    return parts.filter(p => p.length > 0).join("\n\n");
  }

  private async generateFallback(outline: EpisodeOutline): Promise<string> {
    console.log(`      🆘 Generating PART 1 (1800-2200 chars)...`);
    const part1 = await this.generateWithPrompt(
      outline,
      `Generate LONG episode part 1 (1800-2200 chars): Start with "${outline.hookQuestion}". Show the conflict. Include dialogue. Russian, detailed.`
    );

    await new Promise(r => setTimeout(r, 2000));

    console.log(`      🆘 Generating PART 2 (1800-2200 chars)...`);
    const part2 = await this.generateWithPrompt(
      outline,
      `Generate LONG episode part 2 (1800-2200 chars): Turning point "${outline.keyTurning}". End with cliffhanger "${outline.openLoop}". Russian, detailed.`
    );

    const combined = part1 + "\n\n" + part2;

    if (combined.length < 2800) {
      console.log(`      ⚠️  Fallback too short (${combined.length}), trying emergency...`);
      return await this.generateEmergency(outline);
    }

    return combined;
  }

  private async generateEmergency(outline: EpisodeOutline): Promise<string> {
    console.log(`      🚨 EMERGENCY: Raw generation (maximum length)`);

    const prompt = `WRITE VERY LONG STORY (3000+ characters MINIMUM) in Russian:

A woman reflects on: "${outline.hookQuestion}"

What happened: ${outline.externalConflict}

She felt: ${outline.internalConflict}

Then: ${outline.keyTurning}

Now she wonders: ${outline.openLoop}

Just write natural Russian text. No JSON. No metadata. No comments. Just story. Very detailed. 3000+ characters. WRITE LONG.`;

    return await this.generateWithPrompt(outline, prompt);
  }

  private async generateWithPrompt(
    outline: EpisodeOutline,
    prompt: string
  ): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.95,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2500,
        },
      });

      let content = response.text || "";

      content = ContentSanitizer.cleanEpisodeContent(content);

      return content;
    } catch (error) {
      console.error(`   ❌ Gemini call failed:`, (error as Error).message);
      return "";
    }
  }

  private isValidLength(content: string): boolean {
    const cleaned = ContentSanitizer.cleanEpisodeContent(content);
    return cleaned.length >= 2800;
  }

  private buildEpisode(outline: EpisodeOutline, content: string): Episode {
    const cleaned = ContentSanitizer.cleanEpisodeContent(content);
    const validation = ContentSanitizer.validateEpisodeContent(cleaned);

    console.log(
      `   ✅ Episode #${outline.id} complete: ${validation.charCount} chars (${validation.wordCount} words)`
    );

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.log(`   ${w}`));
    }

    return {
      id: outline.id,
      title: `Episode ${outline.id}`,
      content: cleaned,
      charCount: validation.charCount,
      openLoop: outline.openLoop,
      turnPoints: [outline.keyTurning],
      emotions: [outline.internalConflict],
      keyScenes: [],
      characters: [],
      generatedAt: Date.now(),
      stage: "draft",
    };
  }

  async generateEpisodesSequentially(
    outlines: EpisodeOutline[],
    options: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<Episode[]> {
    const delay = options.delayBetweenRequests || 1500;
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

        if (i < outlines.length - 1) {
          console.log(`   ⏳ Waiting ${delay}ms before next episode...\n`);
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
