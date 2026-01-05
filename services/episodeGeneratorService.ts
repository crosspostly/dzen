import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';
import { calculateSimilarity } from "../utils/levenshtein-distance";
import { qualityGate } from "../utils/quality-gate";
import { Episode, EpisodeOutline } from "../types/ContentArchitecture";
import { EpisodeTitleGenerator } from "./episodeTitleGenerator";
import { CHAR_BUDGET, BUDGET_ALLOCATIONS } from "../constants/BUDGET_CONFIG";
import { Phase2AntiDetectionService } from "./phase2AntiDetectionService";

/**
 * 🎬 Episode Generator Service v7.1 (CLEAN GENERATION)
 *
 * Generates episodes with INTELLIGENT CHARACTER BUDGETING:
 * - Total budget: ${CHAR_BUDGET} chars
 * - Lede: ~600 chars
 * - Finale: ~1200 chars
 * - Remaining divided equally among episodes initially
 * - Each episode gets specific char limit in prompt
 * - NO RETRIES for oversized - just continue with recalculated pool
 *
 * v7.1 CHANGES - CLEAN PROMPT (FIX FOR TEXT CORRUPTION):
 * - ✅ NO platform/revenue meta-commentary - just pure storytelling
 * - ✅ NO anti-detection instructions - write naturally
 * - ✅ Complete sentences ONLY - no fragments or orphaned phrases
 * - ✅ Stronger examples of good writing in Russian
 * - ✅ Clearer structure with emotional depth
 * - ✅ DISABLED by default: anti-detection corrupts text
 */
export interface EpisodeGeneratorOptions {
  useAntiDetection?: boolean; // v7.1: DISABLED by default
  maxChars?: number;
}

export class EpisodeGeneratorService {
  private geminiClient: GoogleGenAI;
  private titleGenerator: EpisodeTitleGenerator;
  private phase2Service: Phase2AntiDetectionService;
  private TOTAL_BUDGET: number; // Use single source of truth
  private LEDE_BUDGET = 600;
  private FINALE_BUDGET = 1200;
  private MAX_RETRIES = 2; // Only for API failures or too-short content
  private CONTEXT_LENGTH = 1200; // Context from previous episode
  private temperature = 0.85; // v7.1: Higher for better creativity
  private topK = 40;
  private useAntiDetection: boolean;

  constructor(apiKey?: string, options?: EpisodeGeneratorOptions) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
    this.titleGenerator = new EpisodeTitleGenerator(key);
    this.phase2Service = new Phase2AntiDetectionService();
    this.TOTAL_BUDGET = options?.maxChars || CHAR_BUDGET;
    this.useAntiDetection = options?.useAntiDetection ?? false; // v7.1: DISABLED by default
    
    if (!this.useAntiDetection) {
      console.log('🚫 Anti-detection DISABLED - clean generation mode');
    }
  }

  /**
   * 📊 Calculate budget allocation
   */
  private calculateBudget(episodeCount: number) {
    const remainingBudget = this.TOTAL_BUDGET - this.LEDE_BUDGET - this.FINALE_BUDGET;
    const perEpisodeBudget = Math.floor(remainingBudget / episodeCount);
    
    return {
      total: this.TOTAL_BUDGET,
      lede: this.LEDE_BUDGET,
      finale: this.FINALE_BUDGET,
      perEpisode: perEpisodeBudget,
      episodeCount: episodeCount,
      remaining: remainingBudget,
    };
  }

  /**
   * 🎯 Generate episodes sequentially with DYNAMIC EPISODE COUNT
   */
  async generateEpisodesSequentially(
    episodeOutlines: EpisodeOutline[],
    options?: {
      delayBetweenRequests?: number;
      onProgress?: (current: number, total: number, charCount: number) => void;
      plotBible?: any;
    }
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    const delay = options?.delayBetweenRequests || 1500;
    const MIN_EPISODE_SIZE = 1500;
    
    const budget = this.calculateBudget(episodeOutlines.length);
    console.log(`\n📊 BUDGET ALLOCATION [Dynamic Episodes]:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Max episodes planned: ${episodeOutlines.length} × ${budget.perEpisode} chars each (estimated)`);
    console.log(`   Lede: ${budget.lede} | Finale: ${budget.finale}`);
    console.log(`   (Remaining for episodes: ${budget.remaining} chars)`);
    console.log(`   MIN_EPISODE_SIZE: ${MIN_EPISODE_SIZE} chars\n`);
    
    let charCountSoFar = 0;
    let remainingPool = budget.remaining;
    let episodeIndex = 0;

    while (remainingPool > MIN_EPISODE_SIZE && episodeIndex < episodeOutlines.length) {
      const outline = episodeOutlines[episodeIndex];
      const episodesLeft = episodeOutlines.length - episodeIndex;
      const charsForThisEpisode = Math.floor(remainingPool / episodesLeft);
      
      console.log(`\n   🎬 Episode #${outline.id} - Starting generation...`);
      console.log(`      Budget: ${charsForThisEpisode} chars (${remainingPool} remaining)`);
      
      if (charsForThisEpisode < MIN_EPISODE_SIZE) {
        console.log(`      📊 Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping...`);
        break;
      }
      
      try {
        let episode = await this.generateSingleEpisode(
          outline, 
          episodes,
          charsForThisEpisode,
          episodeIndex + 1,
          episodeOutlines.length,
          1,
          false,
          options?.plotBible
        );

        // 🆕 v9.0: Uniqueness check
        let attempts = 0;
        while (attempts < 3) {
          const isDuplicate = episodes.some(e => 
            calculateSimilarity(e.content, episode.content) > 0.75
          );
          
          if (isDuplicate) {
            console.log(`      ⚠️ Episode ${episodeIndex + 1} is a duplicate, regenerating...`);
            episode = await this.generateSingleEpisode(
              outline, 
              episodes,
              charsForThisEpisode,
              episodeIndex + 1,
              episodeOutlines.length,
              attempts + 2,
              false,
              options?.plotBible
            );
            attempts++;
          } else {
            break;
          }
        }

        // 🆕 v9.0: Quality gate
        const validation = await qualityGate(episode.content, 70, 1500, episode.title);
        if (!validation.isValid) {
          console.log(`      ⚠️ Episode ${episodeIndex + 1} quality low:`, validation.issues);
          // Optional: we could retry here too, but let's stick to the briefing's logic
        }

        episodes.push(episode);
        
        remainingPool -= episode.charCount;
        charCountSoFar += episode.charCount;
        
        if (episode.charCount > charsForThisEpisode * 1.1) {
          console.log(`      ⚠️  Over budget: ${episode.charCount}/${charsForThisEpisode} chars`);
        } else {
          console.log(`      ✅ Generated: ${episode.charCount} chars (on budget)`);
        }
        console.log(`      📊 Total so far: ${charCountSoFar}/${budget.total}`);
        
        if (options?.onProgress) {
          options.onProgress(episodeIndex + 1, episodeOutlines.length, charCountSoFar);
        }
        
        if (remainingPool < MIN_EPISODE_SIZE) {
          console.log(`\n   📊 Remaining budget ${remainingPool} < MIN (${MIN_EPISODE_SIZE}), stopping...`);
          break;
        }
        
        if (episodeIndex < episodeOutlines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        episodeIndex++;
      } catch (error) {
        console.error(`   ❌ Episode #${outline.id} failed:`, error);
        console.log(`   ⚠️  Continuing with remaining episodes to avoid blocking generation`);
      }
    }
    
    const utilization = ((charCountSoFar / budget.total) * 100).toFixed(1);
    console.log(`\n🔄 Dynamic episode generation:`);
    console.log(`   Total budget: ${budget.total} chars`);
    console.log(`   Generated: ${episodes.length} episodes`);
    console.log(`   Used: ${charCountSoFar} chars (${utilization}%)`);
    console.log(`   Remaining: ${remainingPool} chars\n`);
    return episodes;
  }

  /**
   * 🎨 Generate single episode with SPECIFIC CHAR LIMIT
   */
  private async generateSingleEpisode(
    outline: EpisodeOutline,
    previousEpisodes: Episode[],
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    useFallbackModel: boolean = false,
    plotBible?: any
  ): Promise<Episode> {
    const previousContext = this.buildContext(previousEpisodes);
    const prompt = this.buildPrompt(
      outline, 
      previousContext, 
      charLimit,
      episodeNum,
      totalEpisodes,
      attempt,
      plotBible
    );
    const model = useFallbackModel ? "gemini-2.5-flash-lite" : "gemini-2.0-flash";

    try {
      const response = await this.callGemini({
        prompt,
        model,
        temperature: this.temperature,
      });

      let content = response.trim();
      
      // VALIDATION: Only check for TOO SHORT
      if (content.length < charLimit * 0.7) {
        console.log(`      ⚠️  Too short (${content.length}/${charLimit} chars), attempt ${attempt}/${this.MAX_RETRIES}`);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`      🔄 Retrying...`);
          return this.generateSingleEpisode(
            { ...outline, externalConflict: outline.externalConflict + " (EXPAND)" },
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            attempt + 1,
            useFallbackModel,
            plotBible
          );
        } else if (!useFallbackModel) {
          console.log(`      🔄 Trying fallback model...`);
          return this.generateSingleEpisode(
            outline,
            previousEpisodes,
            charLimit,
            episodeNum,
            totalEpisodes,
            1,
            true,
            plotBible
          );
        } else {
          console.log(`      ⚠️  Accepting short episode: ${content.length}/${charLimit} chars`);
          console.log(`      ⚠️  Continuing with short content to avoid blocking generation`);
        }
      }
      
      if (content.length > charLimit * 1.1) {
        console.log(`      ℹ️  Episode length: ${content.length}/${charLimit} (oversized)`);
        console.log(`      ℹ️  Pool will adjust for remaining episodes`);
      } else {
        console.log(`      ✅ Episode ${episodeNum}: ${content.length} chars (perfect)`);
      }

      // v7.1: Skip Phase 2 if anti-detection is disabled
      let phase2Result = null;
      if (this.useAntiDetection) {
        console.log(`\n   📋 [Phase 2] Processing episode ${episodeNum}...`);
        phase2Result = await this.phase2Service.processEpisodeContent(
          content,
          episodeNum,
          charLimit,
          {
            applyPerplexity: true,
            applyBurstiness: true,
            applySkazNarrative: true,
            verbose: true
          }
        );
        content = phase2Result.processedContent;
      } else {
        console.log(`   🚫 Skipping Phase 2 (anti-detection disabled)`);
      }

      // Generate title
      const episodeTitle = await this.titleGenerator.generateEpisodeTitle(
        outline.id,
        content,
        outline.openLoop
      );

      return {
        id: outline.id,
        title: episodeTitle,
        content,
        charCount: content.length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: "draft",
        phase2Metrics: phase2Result ? {
          adversarialScore: phase2Result.adversarialScore,
          breakdown: phase2Result.breakdown,
          modificationStats: phase2Result.modificationStats,
          suggestion: phase2Result.suggestion
        } : undefined
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.warn(`      ❌ Generation failed (attempt ${attempt}): ${errorMessage}`);

      if (attempt < this.MAX_RETRIES && (errorMessage.includes('503') || errorMessage.includes('overloaded'))) {
        console.log(`      🔄 API overloaded, retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.generateSingleEpisode(
          outline,
          previousEpisodes,
          charLimit,
          episodeNum,
          totalEpisodes,
          attempt + 1,
          useFallbackModel,
          plotBible
        );
      }

      // CREATE FALLBACK EPISODE instead of throwing error
      console.log(`      ⚠️  Creating fallback episode to continue generation`);
      const fallbackContent = `${outline.hookQuestion}

${outline.externalConflict}. Я помню этот момент так, будто он был вчера.

${outline.internalConflict}. Это чувство не покидало меня долгое время.

${outline.keyTurning}. В тот день всё изменилось.

${outline.openLoop}...`;

      return {
        id: outline.id,
        title: `Эпизод ${outline.id}`,
        content: fallbackContent,
        charCount: fallbackContent.length,
        openLoop: outline.openLoop,
        turnPoints: [outline.keyTurning],
        emotions: [outline.internalConflict],
        keyScenes: [],
        characters: [],
        generatedAt: Date.now(),
        stage: "fallback",
        phase2Metrics: undefined
      };
    }
  }

  /**
   * 📝 Build the CLEAN PROMPT (v7.1)
   * 
   * Key changes from v6.0:
   * - NO platform/revenue meta-commentary - just pure storytelling
   * - NO anti-detection instructions - write naturally
   * - Complete sentences ONLY - no fragments or orphaned phrases
   * - Stronger examples of good writing
   * - Clearer structure with emotional depth
   */
  private buildPrompt(
    outline: EpisodeOutline, 
    previousContext: string,
    charLimit: number,
    episodeNum: number,
    totalEpisodes: number,
    attempt: number = 1,
    plotBible?: any
  ): string {
    const retryNote = attempt > 1 ? `\n⚠️  ПЕРЕГЕНЕРАЦИЯ #${attempt} - улучши качество\n` : '';
    const minChars = Math.floor(charLimit * 0.75);
    const maxChars = charLimit;
    
    const plotBibleSection = this.buildPlotBibleSection(plotBible);

    return `Напиши художественный эпизод от первого лица.

${plotBibleSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
СЮЖЕТ ЭПИЗОДА #${outline.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Вопрос, который мучает героиню: "${outline.hookQuestion}"

Внешний конфликт: ${outline.externalConflict}
Внутренний конфликт: ${outline.internalConflict}
Поворотный момент: ${outline.keyTurning}
Открытый вопрос для следующего эпизода: "${outline.openLoop}"

${previousContext ? `ПРОДОЛЖЕНИЕ ИСТОРИИ:
${previousContext}

Начинай СРАЗУ с нового действия или диалога. Не повторяй концовку выше.
Не начинай с "И тогда" или "После этого".` : 'НАЧАЛО ИСТОРИИ:'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
СТРУКТУРА (6 частей)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ЗАВЯЗКА (3-4 предложения)
   Первые слова должны ЗАХВАТЫВАТЬ. Вопрос, шок, интрига.
   НЕЛЬЗЯ: "Я хочу рассказать...", "Это случилось когда...", "В тот день я..."
   МОЖНО: "Почему я молчала десять лет?", "Она посмотрела на меня и я всё поняла.", "Только вчера я узнала правду."

2. КОНТЕКСТ (4-5 предложений)
   Где? Когда? Кто? Конкретные детали. Имена. Места.
   Начинаются диалоги.

3. РАЗВИТИЕ 1 (4-5 предложений)
   Сюжет движется вперёд. Диалоги. Сенсорные детали.
   Что видит? Слышит? Чувствует?

4. РАЗВИТИЕ 2 (4-5 предложений)
   Напряжение нарастает. Эмоции обостряются.
   Минимум 2-3 сенсорные детали (зрение, слух, осязание, запах).

5. КУЛЬМИНАЦИЯ (3-4 предложения)
   Неожиданный поворот. Эмоциональный пик.
   КОРОТКИЕ предложения для силы. Тизер на следующий эпизод.

6. РАЗВЯЗКА (4-5 предложений)
   Как героиня справилась? Размышление.
   Оставь интризу - вопрос для читателя.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
КАЧЕСТВО ПИСЬМА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ПРЕДЛОЖЕНИЯ
   - Разная длина: короткие (5-8 слов) и средние (10-14 слов)
   - НИКАКИХ обрубленных фраз на середине
   - НИКАКИХ "ну и", "да вот", "вот только" в начале предложений
   - Полные, завершённые мысли

✅ ДИАЛОГИ (35-40% текста)
   - 6-8 обменов репликами
   - Формат: "— Вопрос? — спросила я."
   - Естественные, живые
   - Чередуются с повествованием (не блоками)

✅ СЕНСОРНЫЕ ДЕТАЛИ (10+ на эпизод)
   - Зрение: "солнце било в окно", "морщинки вокруг глаз"
   - Слух: "голос дрожал", "хлопнула дверь"
   - Осязание: "холодные пальцы", "тряслись руки"
   - Запах: "пахло йодом", "духи Angel"
   - Вкус: "привкус железа", "горький кофе"

✅ ЭМОЦИИ
   - Показывай действиями, НЕ объясняй
   - ПЛОХО: "Я была напугана"
   - ХОРОШО: "Руки тряслись. Я не могла выговорить ни слова."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ЗАПРЕЩЕНО
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Метаданные: [note], [TODO], [pause], ***
❌ Markdown: **жирный**, ##заголовок, \`код\`
❌ Фразы-паразиты (НИ РАЗУ):
   "— может быть, не совсем точно, но..."
   "— одним словом..."
   "— не знаю почему, но..."
   "— вот в чём дело..."
   "— вот что я хочу сказать..."
❌ Обрубки в начале: "ну и", "да вот", "вот только", "-то"
❌ Мат и грубая лексика
❌ Диалог через несколько абзацев без контекста

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ПРИМЕР ХОРОШЕГО ТОНА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Её голос дрожал. Я смотрела на стекло кабинета. На улице шёл снег. Холодный апрельский снег.
 — Откуда ты это знаешь? — спросила я.
 — Я не могу сказать, — ответила она.
 Письмо было в моих руках. Бумага пахла старостью. Я чувствовала ледяную боль в груди."

ПРИМЕР НАЧАЛА (ЗАХВАТЫВАЕТ):
"Почему я была такая слепая? Пять лет прошло, а я каждое утро спрашиваю себя."
"Она открыла рот. Я увидела в её глазах страх. Настоящий страх."
"Только вчера вечером я поняла, что всё это время он врал."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Объём: ${minChars}-${maxChars} символов
Абзацы: 4-8 строк каждый
Диалоги: 6-8 обменов
Сенсорные детали: 10+

${retryNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ВЫВОД: Только текст эпизода. Без заголовков. Без пояснений.
Пиши так, будто рассказываешь лучшей подруге в 3 часа ночи.

Напиши сейчас.`;
  }

  /**
   * 🔗 Build context from previous episodes
   */
  private buildContext(previousEpisodes: Episode[]): string {
    if (previousEpisodes.length === 0) return "";
    
    const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
    const contextLength = this.CONTEXT_LENGTH;
    
    if (lastEpisode.content.length <= contextLength) {
      return lastEpisode.content;
    }
    
    return lastEpisode.content.slice(-contextLength);
  }

  /**
   * 🎭 Build PlotBible section for prompt (v5.3)
   */
  private buildPlotBibleSection(plotBible?: any): string {
    if (!plotBible) {
      return '';
    }
    
    const narrator = plotBible.narrator;
    const sensory = plotBible.sensoryPalette;
    const thematic = plotBible.thematicCore;
    
    let section = '';
    
    if (narrator) {
      section += `\n📖 ГОЛОС РАССКАЗЧИКА (${narrator.age || '40-50'} лет, ${narrator.tone || 'исповедальный'})`;
      if (narrator.voiceHabits) {
        if (narrator.voiceHabits.doubtPattern) {
          section += `\n   При сомнении: "${narrator.voiceHabits.doubtPattern}"`;
        }
        if (narrator.voiceHabits.memoryTrigger) {
          section += `\n   Триггер памяти: "${narrator.voiceHabits.memoryTrigger}"`;
        }
        if (narrator.voiceHabits.angerPattern) {
          section += `\n   При гневе: "${narrator.voiceHabits.angerPattern}"`;
        }
      }
    }
    
    if (sensory) {
      section += `\n🎨 СЕНСОРНАЯ ПАЛИТРА:`;
      if (sensory.details && sensory.details.length > 0) {
        section += `\n   Зрение: ${sensory.details.slice(0, 3).join(', ')}`;
      }
      if (sensory.smells && sensory.smells.length > 0) {
        section += `\n   Запахи: ${sensory.smells.slice(0, 2).join(', ')}`;
      }
      if (sensory.sounds && sensory.sounds.length > 0) {
        section += `\n   Звуки: ${sensory.sounds.slice(0, 2).join(', ')}`;
      }
      if (sensory.textures && sensory.textures.length > 0) {
        section += `\n   Осязание: ${sensory.textures.slice(0, 2).join(', ')}`;
      }
    }
    
    if (thematic) {
      section += `\n🎯 ТЕМАТИЧЕСКОЕ ЯДРО:`;
      if (thematic.centralQuestion) {
        section += `\n   Главный вопрос: "${thematic.centralQuestion}"`;
      }
      if (thematic.emotionalArc) {
        section += `\n   Эмоциональная дуга: ${thematic.emotionalArc}`;
      }
    }
    
    return section;
  }

  /**
   * 📞 Call Gemini API
   */
  private async callGemini(params: {
    prompt: string;
    model: string;
    temperature: number;
  }): Promise<string> {
    try {
      const response = await this.geminiClient.models.generateContent({
        model: params.model,
        contents: params.prompt,
        config: {
          temperature: params.temperature,
          topK: this.topK,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`❌ Gemini API error: ${errorMessage}`);
      
      // Handle specific API errors
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        throw new Error(`API overloaded: ${errorMessage}`);
      }
      
      throw error;
    }
  }
}

export default EpisodeGeneratorService;
