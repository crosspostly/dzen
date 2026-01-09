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
  private csvPath = path.join(process.cwd(), 'projects', 'women-35-60', 'top_articles.csv');
  private cachedThemes: string[] = [];
  private lastFetchTime: number = 0;
  private cacheDuration = 3600000; // 1 hour

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Load CSV from local file and extract themes
   */
  private async loadThemesFromCSV(): Promise<string[]> {
    try {
      console.log(`${LOG.LOADING} Loading themes from: ${this.csvPath}`);
      console.log(`${LOG.LOADING} File exists: ${fs.existsSync(this.csvPath)}`);
      
      if (!fs.existsSync(this.csvPath)) {
        throw new Error(`CSV file not found at: ${this.csvPath}`);
      }
      
      const content = fs.readFileSync(this.csvPath, 'utf-8');
      console.log(`${LOG.LOADING} File size: ${content.length} bytes`);
      console.log(`${LOG.LOADING} File lines: ${content.split('\n').length}`);
      
      // Remove BOM if present
      const cleanContent = content.replace(/^\uFEFF/, '');
      const lines = cleanContent.split('\n').slice(1); // Skip header
      
      const themes = lines
        .map(line => {
          // Handle CSV with commas in quoted strings
          // Format: Место,Просмотры,Тема,Статья,Идея
          const parts: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              parts.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          parts.push(current.trim()); // Add last part
          
          if (parts.length >= 3) {
            return parts[2].trim().replace(/^"|"$/g, ''); // Column 3 = Тема (Theme)
          }
          return '';
        })
        .filter(t => t.length > 3) // Theme should have some content
        .filter(t => t !== ''); // Remove empty themes
      
      console.log(`${LOG.SUCCESS} Loaded ${themes.length} themes from local CSV`);
      console.log(`${LOG.LOADING} Sample themes: ${themes.slice(0, 3).join(', ')}`);
      
      return themes;
    } catch (error) {
      console.error(`${LOG.ERROR} Failed to load local CSV:`, error);
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
      console.log(`${LOG.LOADING} Loading themes from local CSV...`);
      const themes = await this.loadThemesFromCSV();
      this.cachedThemes = themes;
      this.lastFetchTime = now;
      console.log(`${LOG.SUCCESS} Loaded ${themes.length} real themes from top_articles.csv`);
      return themes;
    } catch (error) {
      console.warn(`${LOG.WARN} Failed to load local CSV, using fallback list`);
      return this.getFallbackThemes();
    }
  }

  /**
   * Fallback themes if CSV fetch fails
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
   * MAIN: Generate NEW unique theme using Gemini
   */
  async generateNewTheme(): Promise<string> {
    try {
      // Get existing themes for context
      const contextThemes = await this.getAvailableThemes();
      const themesExample = contextThemes.slice(0, 15).join('\n  - ');

      // Build prompt for Gemini
      const prompt = `\
You are a master of viral Russian storytelling for Yandex.Zen. Your audience is women 35-60 who love emotional, dramatic "life stories" (житейские истории).

REAL SUCCESSFUL PATTERNS FROM YOUR DATABASE:
  - ${themesExample}

YOUR TASK:
Generate ONE NEW UNIQUE theme/hook that will get 200,000+ views.

STRICT RULES FOR VIRALITY:
1. FORM: Use either a short, punchy title ("Отказник", "Рогоносец") OR a long quote-based hook ("— Собирай вещи и уходи! — крикнул муж...").
2. DRAMA: Focus on betrayal, secret inheritance, ungrateful children, or social humiliation.
3. REALISM: Mention specific household details (старое пальто, кастрюля борща, сапоги из Ашана, ключи на столе).
4. CONTRAST: Show a sharp turn from victim to victor ("они смеялись, а потом пришел нотариус").
5. PERSPECTIVE: Always first person ("Я...", "Моя...").
6. NO CLICKBAIT BANS: Do not use yellow journalism words like "SHOCK", "YOU WON'T BELIEVE". Use emotional weight instead.

Example of target style:
"«Ты здесь никто, уходи к своей матери», — сказал сын. Я молча оставила ключи от квартиры, которую сама ему купила, и выключила телефон на неделю..."

RESPOND WITH ONLY THE THEME TEXT (no quotes, no explanation):`;

      console.log(`${LOG.BRAIN} Generating new theme with Gemini...`);

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
