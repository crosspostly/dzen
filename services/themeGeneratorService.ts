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
   * Load Themes from parsed_examples.json
   */
  private async loadThemesFromJSON(): Promise<string[]> {
    try {
      console.log(`${LOG.LOADING} Loading themes from: ${this.examplesPath}`);
      
      if (!fs.existsSync(this.examplesPath)) {
        console.warn(`${LOG.WARN} Examples file not found at ${this.examplesPath}`);
        throw new Error(`Themes file not found at: ${this.examplesPath}`);
      }
      
      const content = fs.readFileSync(this.examplesPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        throw new Error("Themes file is not an array");
      }
      
      // Extract titles from the parsed_examples structure
      // Structure: { id, title, excerpt, ... }
      const themes = data
        .map((item: any) => item.title)
        .filter((title: string) => title && title.length > 5);
      
      console.log(`${LOG.SUCCESS} Loaded ${themes.length} themes from parsed_examples.json`);
      return themes;
    } catch (error) {
      console.error(`${LOG.ERROR} Failed to load themes:`, error);
      throw error;
    }
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
   * Fallback themes if JSON fetch fails
   */
  private getFallbackThemes(): string[] {
    return [
      'Я терпела это 20 лет и вот что произошло',
      'Одна фраза изменила всё в нашей семье',
      'Я не знала что делать когда узнала правду',
      'После этого дня ничего не было как раньше',
      'Я должна была послушать свою интуицию',
      'Никто не верил мне и я была одна',
      'Это случилось в один день и разрушило всё',
      'Я потеряла всё но получила главное',
      'Когда я сказала нет мир перевернулся',
      'Деньги разрушили нашу семью за месяц',
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
   * MAIN: Generate NEW unique theme using Gemini
   */
  async generateNewTheme(): Promise<string> {
    try {
      // Get all available themes (900+)
      const allThemes = await this.getAvailableThemes();
      
      // Select 20 random themes to use as inspiration/context
      // This ensures we don't just use the first 15 every time
      const exampleSubset = this.getRandomSubset(allThemes, 20);
      const themesExample = exampleSubset.map(t => `- ${t}`).join('\n  ');

      // Build prompt for Gemini
      const prompt = `\
You are a master of viral Russian storytelling for Yandex.Zen. Your audience is women 35-60 who love emotional, dramatic "life stories" (житейские истории).

I have a database of 900+ successful articles. Here are 20 RANDOM EXAMPLES from that database:
  ${themesExample}

YOUR TASK:
Analyze the PATTERNS in these examples (conflict types, emotional hooks, clickbait style).
Generate ONE BRAND NEW unique theme/hook that fits this style but describes a completely different situation.

DO NOT copy any of the examples.
DO NOT use the same specific plot points (if examples are about "mother-in-law", try "sister" or "neighbor").
AVOID clichés like "keys on the table" or "old coat" unless used creatively.

STRICT RULES:
1. FORM: Short, punchy title OR a dramatic dialogue hook.
2. EMOTION: Betrayal, revenge, unexpected wealth, hidden secrets, ungrateful relatives.
3. TWIST: The victim must become the winner, or the villain must be exposed.
4. REALISM: Use grounded Russian realities (dacha, mortgage, pension, savings).

RESPOND WITH ONLY THE THEME TEXT (no quotes, no explanation):`;

      console.log(`${LOG.BRAIN} Generating new theme with Gemini (using 20 random examples from pool)...`);

      let response;
      try {
        // 🎯 ПЕРВАЯ ПОПЫТКА: основная модель
        response = await this.geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.95,
            topK: 40,
            topP: 0.95,
          },
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.warn(`${LOG.WARN} Primary model failed (${errorMessage}), trying fallback...`);
        
        // 🔄 ФОЛБЕК: если модель перегружена
        if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
          console.log(`${LOG.LOADING} Trying fallback to gemini-2.5-flash-lite...`);
          
          response = await this.geminiClient.models.generateContent({
            model: "gemini-2.5-flash-lite", // 🔥 ФОЛБЕК МОДЕЛЬ
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
