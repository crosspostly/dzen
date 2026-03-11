/**
 * Theme Generator Service
 * Generates NEW unique themes based on real top articles from GitHub CSV
 * Uses Gemini API to create variations that ensure every run generates different themes
 */

/**
 * 🗺️ ThemeGeneratorService v10.0
 * СТАТУС: Март 2026 года.
 * ПРАВИЛО: Только актуальные модели 3.1+ или 2.5+. 
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
            
            // If it's travel_examples, give it priority/more weight if needed
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
    
    // Use cache if fresh
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
      'Вкус детства в другой стране: как я нашел идеальный чебурек в Стамбуле',
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
      // 1. Load context
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
CHARACTER: A seasoned solo traveler (50+) and their white dog "Baton" (Батон).
STYLE: Real-time travel diary (сериальный блог), "Сказ" (conversational, honest, sensory).

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
4. NO MELODRAMA: No "evil mother-in-laws" or "revenge". Just travel reality.

ALLOWED REGIONS: Russia (Altai, Baikal, etc.), Asia (Vietnam, China, Uzbekistan), Africa (Morocco), South America (Peru). 
EXCLUDE: Europe, USA, Canada.

GENERATE 1 NEW RUSSIAN SERIAL TITLE (Punchy, realistic, Dzen-optimized):`;

      console.log(`${LOG.BRAIN} Generating serial theme with journey persistence...`);

      let response;
      try {
        response = await this.geminiClient.models.generateContent({
          model: MODELS.TEXT.PRIMARY,
          contents: prompt,
          config: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
          },
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.warn(`${LOG.WARN} Primary model failed, trying fallback...`);
        
        response = await this.geminiClient.models.generateContent({
          model: MODELS.TEXT.STABLE,
          contents: prompt,
          config: {
            temperature: 0.95,
            topK: 40,
            topP: 0.95,
          },
        });
      }

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        throw new Error("Gemini returned empty/invalid response");
      }

      // 🔥 FIX: Clean up the theme (remove markdown, "Заголовок:" prefix, etc)
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

      // Update journey state for next run (simplified logic)
      journeyState.lastEvent = `Generated article: ${theme}`;
      fs.writeFileSync(journeyStatePath, JSON.stringify(journeyState, null, 2));

      console.log(`${LOG.SUCCESS} New serial theme: "${theme}"`);
      return theme;

    } catch (error) {
      console.error(`${LOG.ERROR} Theme generation failed:`, error);
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
      
      // Delay between requests (be nice to API)
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return themes;
  }
}
