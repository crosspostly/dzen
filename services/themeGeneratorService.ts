/**
 * Theme Generator Service
 * Generates NEW unique themes based on real top articles from GitHub CSV
 * Uses Gemini API to create variations that ensure every run generates different themes
 */

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

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
    const files = ['travel_examples.json', 'parsed_examples.json'];
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
   * Fallback themes if JSON fetch fails (Travel & Food 2026)
   */
  private getFallbackThemes(): string[] {
    return [
      'Почему в горах Кавказа никогда не едят в одиночестве: мой опыт',
      'Обряд чаепития в Марокко: Батон (пес) испугался высоты струи, а я нашел истину',
      'Как приготовить настоящий курт на рынке в Ташкенте за 50 рублей',
      'Тайный смысл утренней молитвы в пекарнях Лиссабона',
      'Что едят долгожители Окинавы: я попробовал их секретный суп',
      'Старая бабушка в Грузии показала мне обряд выпечки хлеба в тоне',
      'Почему японцы извиняются перед едой: наше с псом открытие в Киото',
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
      // Get all available themes (if they are old family drama, we use them as "anti-examples" or just for tone)
      const allThemes = await this.getAvailableThemes();
      
      const exampleSubset = this.getRandomSubset(allThemes, 10);
      const themesExample = exampleSubset.map(t => `- ${t}`).join('\n  ');

      // Build prompt for Gemini (Route & Serial Edition)
      const prompt = `\
You are a "Route Planner & Storyteller" for a serial Travel Blog on Yandex.Dzen.
CHARACTER: A solo traveler and their dog "Baton" (Батон).
STYLE: Real-time travel diary (сериальный блог).

YOUR TASK:
Generate ONE (1) BRAND NEW Title for the NEXT episode of our journey.

GEOGRAPHIC LOGIC:
1.  **CONTINUITY:** If we are in a country, the next 5-7 articles should be about neighboring cities, specific streets, or local rituals in THAT country.
2.  **TRANSITION:** If we have covered a country, generate a "Transition Episode" (airport, long bus ride, border crossing, packing bags).
3.  **SERIALITY:** The title must sound like a continuation of a journey. Use phrases like "Moving further...", "Found a hidden spot in...", "The next stop was...".

EXAMPLES OF PREVIOUS THEMES (for style context):
${themesExample}

CURRENT GOAL:
Stay within the current region (Caucasus, Central Asia, or SE Asia) or plan a logical move.

OUTPUT FORMAT:
A punchy, realistic title. 
Example (Continuity): "Ушли вглубь старого Батуми: сколько стоит ужин там, где нет туристов"
Example (Transition): "Прощай, Грузия: как мы со Батоном проходили границу и сколько нервов это стоило"

GENERATE 1 NEW RUSSIAN SERIAL TITLE:`;

      console.log(`${LOG.BRAIN} Generating new theme with Gemini (using 20 random examples from pool)...`);

      let response;
      try {
        // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
        response = await this.geminiClient.models.generateContent({
          model: "gemini-3.1-flash",
          contents: prompt,
          config: {
            temperature: 1.1, // Higher temperature for variety
            topK: 40,
            topP: 0.95,
          },
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.warn(`${LOG.WARN} Primary model failed (${errorMessage}), trying fallback...`);
        
        // 🔄 ФОЛБЕК: если модель перегружена
        if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
          console.log(`${LOG.LOADING} Trying fallback to gemini-3.1-flash-lite...`);
          
          response = await this.geminiClient.models.generateContent({
            model: "gemini-3.1-flash-lite", // 🔥 ФОЛБЕК МОДЕЛЬ
            contents: prompt,
            config: {
              temperature: 0.95,
              topK: 40,
              topP: 0.95,
            },
          });
          
          console.log(`${LOG.SUCCESS} Fallback successful`);
        } else {
          throw error;
        }
      }

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || typeof text !== 'string') {
        console.warn(
          `${LOG.WARN} generateNewTheme: Gemini returned empty/invalid text:`,
          JSON.stringify(response).substring(0, 500)
        );
        throw new Error("Gemini returned empty/invalid response");
      }

      const theme = text.trim();

      if (!theme || theme.length < 10) {
        throw new Error("Generated theme too short");
      }

      console.log(`${LOG.SUCCESS} New theme generated: "${theme}"`);
      return theme;

    } catch (error) {
      console.error(`${LOG.ERROR} Theme generation failed:`, error);
      // Fallback to random from CSV if Gemini fails
      const themes = await this.getAvailableThemes();
      const random = themes[Math.floor(Math.random() * themes.length)];
      console.log(`${LOG.WARN} Using fallback theme from CSV: "${random}"`);
      return random;
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
