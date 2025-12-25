import { GoogleGenAI } from "@google/genai";
import { LongFormArticle, OutlineStructure, Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { SimpleEpisodeGenerator } from "./simpleEpisodeGenerator";

export interface SimpleGenerationOptions {
  useAntiDetection?: boolean;
  includeDevelopment?: boolean;
  includeClimax?: boolean;
  includeResolution?: boolean;
  episodeCount?: number;
  maxChars?: number;
}

/**
 * 🎭 Simple Article Generator v7.0
 * 
 * MAXIMUM SIMPLIFICATION - No cleanup gates, no anti-detection, no phase 2
 * Just clean, ready-to-publish articles generated in one pass
 * 
 * Process:
 * 1. Generate outline (keep it)
 * 2. Generate episodes with simple prompts
 * 3. Generate lede and finale
 * 4. DONE - No cleanup, no validation gates
 */
export class SimpleArticleGenerator {
  private geminiClient: GoogleGenAI;
  private episodeGenerator: SimpleEpisodeGenerator;
  private defaultOptions: SimpleGenerationOptions = {
    useAntiDetection: false,
    includeDevelopment: false,
    includeClimax: false,
    includeResolution: false,
    episodeCount: 10,
    maxChars: 19000
  };

  constructor(apiKey?: string, options?: SimpleGenerationOptions) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    
    const opts = { ...this.defaultOptions, ...options };
    this.episodeGenerator = new SimpleEpisodeGenerator(key, opts);
  }

  /**
   * 🎯 Generate complete article (simplified)
   */
  async generateArticle(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }): Promise<LongFormArticle> {
    console.log("\n🎭 [Simple Generator v7.0] Starting article generation...");
    console.log(`📏 Theme: "${params.theme}"`);
    console.log(`🎯 Angle: ${params.angle} | Emotion: ${params.emotion}`);
    console.log(`📝 Episodes: ${this.defaultOptions.episodeCount}`);
    console.log(`🧹 Anti-Detection: ${this.defaultOptions.useAntiDetection ? 'Yes' : 'No (simplified)'}\n`);

    // Step 1: Generate outline
    console.log("📋 Step 1: Generating outline...");
    const outline = await this.generateOutline(params);
    console.log(`✅ Outline ready: ${outline.episodes.length} episodes`);

    // Step 2: Generate episodes sequentially
    console.log(`🔄 Step 2: Generating ${outline.episodes.length} episodes...`);
    const episodes: Episode[] = [];
    
    for (let i = 0; i < outline.episodes.length; i++) {
      const episodeOutline = outline.episodes[i];
      const previousContext = i > 0 ? episodes[i - 1].content.substring(-500) : "";
      
      console.log(`   🎬 Episode ${i + 1}/${outline.episodes.length}...`);
      const episode = await this.episodeGenerator.generateEpisode(
        episodeOutline,
        previousContext,
        3000 // char limit per episode
      );
      episodes.push(episode);
      console.log(`      ✅ ${episode.charCount} chars`);
    }

    // Step 3: Generate lede and finale
    console.log("🎯 Step 3: Generating lede and finale...");
    const lede = await this.generateLede(outline);
    const finale = await this.generateFinale(outline, episodes);
    console.log(`✅ Lede: ${lede.length} chars | Finale: ${finale.length} chars`);

    // Step 4: Generate title
    console.log("🗰 Step 4: Generating title...");
    const title = await this.generateTitle(outline, lede);
    console.log(`✅ Title: "${title}"`);

    // Step 5: Assemble full content
    const fullContent = this.assembleContent(lede, episodes, finale);
    
    // Calculate metrics
    const totalChars = fullContent.length;
    const readingTime = Math.ceil(totalChars / 2000); // ~2000 chars per minute

    console.log(`\n✅ ARTICLE COMPLETE`);
    console.log(`📊 Total: ${totalChars} chars`);
    console.log(`⏱️  Reading time: ${readingTime} min`);
    console.log(`🎬 Episodes: ${episodes.length}`);

    const article: LongFormArticle = {
      id: `article_${Date.now()}`,
      title,
      outline,
      episodes,
      lede,
      development: "", // Simplified - not included
      climax: "",       // Simplified - not included
      resolution: "",   // Simplified - not included
      finale,
      voicePassport: this.generateDefaultVoicePassport(),
      coverImage: undefined,
      metadata: {
        totalChars,
        totalReadingTime: readingTime,
        episodeCount: episodes.length,
        sceneCount: episodes.length,
        dialogueCount: episodes.length * 6 // estimate
      },
      processedContent: fullContent,
      adversarialScore: undefined,
      phase2Applied: false
    };

    return article;
  }

  /**
   * 📋 Generate outline (keep the outline generation logic)
   */
  private async generateOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }): Promise<OutlineStructure> {
    const prompt = `Создай структуру художественного рассказа для блога.

Тема: "${params.theme}"
Угол: ${params.angle}
Эмоция: ${params.emotion}
Аудитория: ${params.audience}
Количество эпизодов: ${this.defaultOptions.episodeCount}

Создай структуру из ${this.defaultOptions.episodeCount} эпизодов.

Для каждого эпизода укажи:
1. Хук-вопрос (что привлекает внимание)
2. Внешний конфликт (что происходит)
3. Внутренний конфликт (что чувствует герой)
4. Ключевой поворот (что меняется)
5. Открытый финал (оставь вопрос)

Ответ в формате JSON:
{
  "theme": "...",
  "angle": "...",
  "emotion": "...",
  "audience": "...",
  "episodes": [
    {
      "id": 1,
      "title": "...",
      "hookQuestion": "...",
      "externalConflict": "...",
      "internalConflict": "...",
      "keyTurning": "...",
      "openLoop": "..."
    }
  ],
  "externalTensionArc": "...",
  "internalEmotionArc": "...",
  "forbiddenClichés": []
}`;

    const response = await this.geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.7 }
    });

    const text = response.response.text();
    
    // Parse JSON
    try {
      const data = JSON.parse(text);
      return {
        theme: data.theme || params.theme,
        angle: data.angle || params.angle,
        emotion: data.emotion || params.emotion,
        audience: data.audience || params.audience,
        episodes: data.episodes || [],
        externalTensionArc: data.externalTensionArc || "",
        internalEmotionArc: data.internalEmotionArc || "",
        forbiddenClichés: data.forbiddenClichés || [],
        characterMap: {}
      };
    } catch (error) {
      console.warn("Failed to parse outline JSON, creating fallback structure");
      return this.createFallbackOutline(params);
    }
  }

  /**
   * 📝 Generate lede (introductory paragraph)
   */
  private async generateLede(outline: OutlineStructure): Promise<string> {
    const prompt = `Напиши вступление (600-900 символов) к художественному рассказу.

Тема: "${outline.theme}"
Эмоция: ${outline.emotion}

⚠️ ТРЕБОВАНИЯ:
- ОТ ПЕРВОГО ЛИЦА: "я", "мне", "моя"
- ЧИСТОВИК: без повторов, без фраз-паразитов
- ЗАВОЯЖКА: начни сразу с действия или сильного момента
- ДИАЛОГИ: обязательно включи диалог
- СЕНСОРНЫЕ ДЕТАЛИ: что видит, слышит, чувствует герой

Пример начала:
"Телефон звонил третий раз за час. Я смотрела на экран и не брала трубку. Зачем? Чтобы снова услышать: «Мам, давай деньги»? На улице шел дождь."

Напиши вступление. Никаких объяснений «я расскажу вам историю» - сразу в действие.`;

    const response = await this.geminiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.85 }
    });

    return response.response.text().trim();
  }

  /**
   * 🎭 Generate finale (conclusion)
   */
  private async generateFinale(outline: OutlineStructure, episodes: Episode[]): Promise<string> {
    const lastEpisode = episodes[episodes.length - 1];
    const context = lastEpisode ? lastEpisode.content.substring(-500) : "";

    const prompt = `Напиши финал рассказа (1200-1500 символов).

Тема: "${outline.theme}"
Предыдущий контекст: "${context}"

⚠️ ТРЕБОВАНИЯ:
- ОТ ПЕРВОГО ЛИЦА: "я", "мне", "моя"
- ЧИСТОВИК: без повторов, без фраз-паразитов
- РАЗРЫШЕНИЕ: как всё закончилось
- ОТРАЖЕНИЕ: что понял(а) герой
- НЕ ДОЛЖЕН БЫТЬ ПОУЧИТЕЛЬНЫМ (никаких «во всем этом я поняла, что...»)
- Оставить читателя с эмоцией, вопросом

Пример тона:
"Я сидела на кухне и смотрела, как темнеет за окном. Две недели прошло. Звонил сын? Нет. Но я уже не ждала. И это было самое страшное."

Напиши финал. Никаких поучений, только честное отражение героя.`;

    const response = await this.geminiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.85 }
    });

    return response.response.text().trim();
  }

  /**
   * 🗰 Generate title
   */
  private async generateTitle(outline: OutlineStructure, lede: string): Promise<string> {
    const prompt = `Придумай заголовок (55-90 символов) для художественного рассказа.

Тема: "${outline.theme}"
Вступление: "${lede.substring(0, 200)}..."

⚠️ ТРЕБОВАНИЯ:
- 55-90 символов
- Интригующий, но не кликбейт
- В стиле личной истории
- На русском языке

Напиши только заголовок, без кавычек и объяснений.`;

    const response = await this.geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.8 }
    });

    return response.response.text().trim().replace(/^["']|["']$/g, '');
  }

  /**
   * 🔗 Assemble full content
   */
  private assembleContent(lede: string, episodes: Episode[], finale: string): string {
    const parts: string[] = [];
    
    parts.push(lede);
    parts.push('');
    parts.push('* * *');
    parts.push('');
    
    episodes.forEach((episode, idx) => {
      parts.push(episode.content);
      if (idx < episodes.length - 1) {
        parts.push('');
        parts.push('');
      }
    });
    
    parts.push('');
    parts.push('* * *');
    parts.push('');
    parts.push(finale);
    
    return parts.join('\n');
  }

  /**
   * 📋 Fallback outline if JSON parsing fails
   */
  private createFallbackOutline(params: {
    theme: string;
    angle: string;
    emotion: string;
    audience: string;
  }): OutlineStructure {
    const episodes: EpisodeOutline[] = [];
    
    for (let i = 1; i <= this.defaultOptions.episodeCount!; i++) {
      episodes.push({
        id: i,
        title: `Эпизод ${i}`,
        hookQuestion: "Что изменилось в этот момент?",
        externalConflict: "Герой сталкивается с проблемой",
        internalConflict: "Герой испытывает эмоцию",
        keyTurning: "Что-то меняется",
        openLoop: "Вопрос остается открытым"
      });
    }

    return {
      theme: params.theme,
      angle: params.angle,
      emotion: params.emotion,
      audience: params.audience,
      episodes,
      externalTensionArc: "",
      internalEmotionArc: "",
      forbiddenClichés: [],
      characterMap: {}
    };
  }

  /**
   * 🎭 Default voice passport
   */
  private generateDefaultVoicePassport() {
    return {
      apologyPattern: "Простите, если...",
      doubtPattern: "Я не знаю, правильно ли...",
      memoryTrigger: "Это напоминает мне...",
      characterSketch: "Обычный человек, который пережил что-то важное",
      humorStyle: "self-irony" as const,
      jokeExample: "Ирония в том, что...",
      angerPattern: "Меня бесит, когда...",
      paragraphEndings: ["pause", "short_phrase", "pause"],
      examples: []
    };
  }
}
