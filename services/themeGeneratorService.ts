/**
 * Theme Generator Service
 * Generates NEW unique themes based on real top articles from GitHub CSV
 * Uses Gemini API to create variations that ensure every run generates different themes
 */

/**
 * 🗺️ ThemeGeneratorService v10.1
 * СТАТУС: Март 2026 года.
 * ПРАВИЛО: Только актуальные модели 3.1+ или 2.5+.
 * FIX v10.1: Full WATERFALL with 503/429 retry backoff (no more single-shot failures).
 */

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { MODELS } from "../constants/MODELS_CONFIG";

const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  LOADING: '📁',
  BRAIN: '🧠',
};

export class ThemeGeneratorService {
  private geminiClient: GoogleGenAI;
  private examplesPath = path.join(process.cwd(), 'parsed_examples.json');
  private cachedThemes: string[] = [];
  private lastFetchTime: number = 0;
  private cacheDuration = 3600000; // 1 hour

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  /**
   * 🔄 Full waterfall call with 503/429 retry backoff
   */
  private async callWithWaterfall(prompt: string): Promise<string> {
    const waterfall = MODELS.WATERFALL;

    for (let i = 0; i < waterfall.length; i++) {
      const model = waterfall[i];
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`${LOG.BRAIN} Trying model ${model} (attempt ${attempt}/${maxRetries})...`);
          const response = await this.geminiClient.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 1.0, topK: 40, topP: 0.95 },
          });
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty response');
          return text;
        } catch (error: any) {
          const msg = error?.message || '';
          const isRetryable = msg.includes('503') || msg.includes('429') ||
                              msg.includes('UNAVAILABLE') || msg.includes('overloaded');

          if (isRetryable && attempt < maxRetries) {
            const delay = attempt * 10000; // 10s, 20s
            console.warn(`${LOG.WARN} ${model} unavailable (503/429), retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Not retryable or exhausted retries — try next model in waterfall
          console.warn(`${LOG.WARN} ${model} failed: ${msg.substring(0, 80)}. Trying next model...`);
          break;
        }
      }
    }

    throw new Error('All models in waterfall exhausted');
  }

  /**
   * Load Themes from both JSON files
   */
  private async loadThemesFromJSON(): Promise<string[]> {
    const files = ['travel_examples.json'];
    let allThemes: string[] = [];

    for (const fileName of files) {
      const filePath = path.join(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        try {
          console.log(`${LOG.LOADING} Loading themes from: ${filePath}`);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            const themes = data
              .map((item: any) => item.title)
              .filter((title: string) => title && title.length > 5);
            allThemes = [...allThemes, ...themes];
          }
        } catch (e) {
          console.warn(`${LOG.WARN} Failed to parse ${fileName}`);
        }
      }
    }

    if (allThemes.length === 0) {
      throw new Error("No themes found in any JSON files");
    }

    console.log(`${LOG.SUCCESS} Loaded ${allThemes.length} total themes for inspiration`);
    return allThemes;
  }

  /**
   * Get themes from cache or load fresh
   */
  private async getAvailableThemes(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedThemes.length > 0 && (now - this.lastFetchTime) < this.cacheDuration) {
      console.log(`${LOG.BRAIN} Using cached themes (${this.cachedThemes.length} items)`);
      return this.cachedThemes;
    }

    try {
      console.log(`${LOG.LOADING} Loading themes from JSON...`);
      const themes = await this.loadThemesFromJSON();
      this.cachedThemes = themes;
      this.lastFetchTime = now;
      return themes;
    } catch (error) {
      console.warn(`${LOG.WARN} Failed to load JSON, using fallback list`);
      return this.getFallbackThemes();
    }
  }

  /**
   * Fallback themes if JSON fetch fails (Pure Travel & Food)
   */
  private getFallbackThemes(): string[] {
    return [
      'Почему в горах Кавказа никогда не едят в одиночестве: мой опыт',
      'Обряд чаепития в Марокко: Батон испугался высоты струи, а я нашел истину',
      'Как прожить в Тбилиси неделю на 10 000 рублей: наш с Батоном отчет',
      'Тайный смысл утренней молитвы в пекарнях Лиссабона',
      'Что едят долгожители Окинавы: я попробовал их секретный суп',
      'Старая бабушка в Грузии показала мне обряд выпечки хлеба в тоне',
      'Почему японцы извиняются перед едой: наше с Батоном открытие в Киото',
      'Ритуал подношения риса духам на Бали: сколько это стоит на самом деле',
      'Вкус детства в другой стране: как я нашёл идеальный чебурек в Стамбуле',
      'Почему в 55 лет я решил бросить всё и поехать изучать обряды еды в Перу',
    ];
  }

  /**
   * Get N random themes from the pool
   */
  private getRandomSubset(themes: string[], count: number): string[] {
    const shuffled = [...themes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * MAIN: Generate NEW unique theme using Gemini (Ethno-Travel Edition)
   */
  async generateNewTheme(): Promise<string> {
    try {
      const journeyStatePath = path.join(process.cwd(), 'journey_state.json');
      const worldLocationsPath = path.join(process.cwd(), 'world_locations.json');
      
      let journeyState = { currentCountry: 'Russia', currentCity: 'Makhachkala', lastEvent: '' };
      if (fs.existsSync(journeyStatePath)) {
        journeyState = JSON.parse(fs.readFileSync(journeyStatePath, 'utf-8'));
      }
      
      let worldLocations = [];
      if (fs.existsSync(worldLocationsPath)) {
        worldLocations = JSON.parse(fs.readFileSync(worldLocationsPath, 'utf-8'));
      }

      const prompt = `\
You are a "Journey Architect" for a serial Travel Blog on Yandex.Dzen.
CHARACTER: A seasoned solo traveler (MALE, 55 years old) and their white dog "Baton" (Батон).
STYLE: Real-time travel diary (сериальный блог), "Сказз" (conversational, honest, sensory).
GENDER RULE: Use MALE GENDER for all Russian verbs (e.g., "заплатил", "пришел", "увидел" instead of "заплатила", "пришла", "увидела").

CURRENT JOURNEY STATE:
- Country: ${journeyState.currentCountry}
- City/Region: ${journeyState.currentCity}
- Last Event: ${journeyState.lastEvent}

YOUR TASK:
Generate ONE (1) BRAND NEW Title for the NEXT episode of our journey.

LOGIC:
1. CONTINUITY (80%): Stay in the current region/country. Move to a neighboring village, a local market, or describe a ritual.
2. TRANSITION (20%): If we've been here long (3+ articles), plan a move to a new country from the allowed list (Russia, Asia, Africa, South America). 
3. SERIALITY: Mention the dog (Baton), prices in local currency, and a specific sensory hook.
4. NO MELODRAMA: No "evil mother-in-laws", "revenge", or "betrayal". Just travel reality and observations.

ALLOWED REGIONS: Russia (Altai, Baikal, etc.), Asia (Vietnam, China, Uzbekistan), Africa (Morocco), South America (Peru). 
EXCLUDE: Europe, USA, Canada.

GENERATE 1 NEW RUSSIAN SERIAL TITLE (Punchy, realistic, masculine, Dzen-optimized):`;

      console.log(`${LOG.BRAIN} Generating serial theme with journey persistence...`);

      const text = await this.callWithWaterfall(prompt);

      // Clean up the theme
      const theme = text.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^\*\*Заголовок:\*\*\s*/i, '')
        .replace(/^Заголовок:\s*/i, '')
        .replace(/\n/g, ' ')
        .replace(/\*\*/g, '')
        .trim();

      if (!theme || theme.length < 10) {
        throw new Error("Generated theme too short");
      }

      journeyState.lastEvent = `Generated article: ${theme}`;
      fs.writeFileSync(journeyStatePath, JSON.stringify(journeyState, null, 2));

      console.log(`${LOG.SUCCESS} New serial theme: "${theme}"`);
      return theme;

    } catch (error) {
      console.error(`${LOG.ERROR} Theme generation failed:`, error);
      // Hard fallback — never crash the whole pipeline
      return "Как мы с Батоном искали ночлег в новом месте: цены и реалии";
    }
  }

  /**
   * Generate multiple themes (for batch/schedule operations)
   */
  async generateMultipleThemes(count: number): Promise<string[]> {
    const themes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const theme = await this.generateNewTheme();
      themes.push(theme);
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return themes;
  }
}
