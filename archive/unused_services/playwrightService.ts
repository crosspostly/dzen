/**
 * PLAYWRIGHT AUTO-PUBLISHING SERVICE
 * 
 * Status: Future Implementation (v5.0+, Early 2026)
 * Purpose: Browser automation for auto-publishing to Яндex.Дзен
 * Current Status: Not used in v4.0.2, planned for v5.0+
 * 
 * Integration: Will be wired into auto-publish pipeline in v5.0+
 * Dependencies: Playwright library (npm install playwright)
 * Prerequisites: Zen account with API access
 * 
 * Features:
 * - Automated login
 * - Form filling
 * - Content publishing
 * - Status tracking
 * - Error handling
 * 
 * See: ZENMASTER_COMPLETE_ROADMAP.md for details
 */

import { Browser, Page, BrowserContext } from 'playwright';

export interface PublishOptions {
  title: string;
  plainContent: string;  // СЫРОЙ текст!
  formatting?: {
    bold_ranges: Array<{ start: number; end: number; reason: string }>;
    separators_after_line: number[];
    highlighted_keywords: string[];
  };
  isDraft?: boolean;
  tags?: string[];
}

export interface PublishResult {
  success: boolean;
  url?: string;
  status?: 'draft' | 'published';
  error?: string;
  reason?: string;  // Например: 'cookies_expired', 'selectors_changed'
}

export interface CookiesValidityResult {
  valid: boolean;
  reason?: string;  // 'redirected_to_login' | 'fetch_error' | 'valid_session'
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Инициализирует браузер
   */
  async init(): Promise<void> {
    try {
      const pw = await import('playwright');
      this.browser = await pw.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (error) {
      console.error('Ошибка при инициализации Playwright:', error);
      throw error;
    }
  }

  /**
   * Проверяет, валидны ли cookies
   * Пытается загрузить тличный кабинет (требует авторизации)
   */
  async checkCookiesValidity(
    cookiesJson: string
  ): Promise<CookiesValidityResult> {
    try {
      if (!this.browser) {
        await this.init();
      }

      const cookies = JSON.parse(cookiesJson);
      const context = await this.browser!.newContext({
        storageState: { cookies },
      });
      const page = await context.newPage();

      const response = await page.goto('https://zen.yandex.ru/profile', {
        waitUntil: 'networkidle',
      });

      const isLoggedIn = !page.url().includes('/login');
      await context.close();

      if (isLoggedIn) {
        return { valid: true, reason: 'valid_session' };
      } else {
        return {
          valid: false,
          reason: 'redirected_to_login',
        };
      }
    } catch (error) {
      return {
        valid: false,
        reason: `fetch_error: ${String(error)}`,
      };
    }
  }

  /**
   * Публикует статью на Яндекс.Дзен
   * Основные действия:
   * 1. Авторизация через cookies
   * 2. Открытие редактора
   * 3. Заполнение заголовка и контента
   * 4. Применение форматирования (жирный, разделители)
   * 5. Опубликование или сохранение черновика
   */
  async publishArticle(
    credentials: { cookies: string },
    article: PublishOptions
  ): Promise<PublishResult> {
    try {
      if (!this.browser) {
        await this.init();
      }

      // 1. Проверим cookies
      const cookiesCheck = await this.checkCookiesValidity(
        credentials.cookies
      );
      if (!cookiesCheck.valid) {
        return {
          success: false,
          error: 'Cookies expired or invalid',
          reason: cookiesCheck.reason,
        };
      }

      // 2. Креируем контекст с cookies
      const cookies = JSON.parse(credentials.cookies);
      const context = await this.browser!.newContext({
        storageState: { cookies },
      });
      this.page = await context.newPage();

      // 3. Открываем редактор
      await this.page.goto('https://zen.yandex.ru/create', {
        waitUntil: 'networkidle',
      });

      // 4. Зарнуляем данные
      await this.fillArticleData(article);

      // 5. Применяем форматирование
      if (article.formatting) {
        await this.applyFormatting(
          article.plainContent,
          article.formatting
        );
      }

      // 6. Нажимаем опубликовать / сохранить черновик
      const status = article.isDraft ? 'draft' : 'published';
      await this.submit(article.isDraft);

      // 7. Ждём перенаправления
      await this.page.waitForNavigation({ waitUntil: 'networkidle' });

      const finalUrl = this.page.url();
      await context.close();

      return {
        success: true,
        url: finalUrl,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: `Publication failed: ${String(error)}`,
        reason: 'selectors_changed_or_unknown_error',
      };
    }
  }

  /**
   * Заполняет данные в форму
   */
  private async fillArticleData(article: PublishOptions): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // Заголовок (нужно найти реальные селекторы)
    try {
      await this.page.fill('input[placeholder*="title" i]', article.title);
    } catch (e) {
      // Пытаюсь альтернативные селекторы
      await this.page.fill('input[type="text"]', article.title);
    }

    // Контент (нужно найти редактор)
    try {
      const contentField = this.page.locator(
        '[contenteditable="true"], textarea[placeholder*="content" i]'
      );
      await contentField.fill(article.plainContent);
    } catch (e) {
      // Если это WYSIWYG редактор
      const editor = this.page.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.type(article.plainContent);
    }
  }

  /**
   * Подчиняем разделители, жирный текст, выделение
   * это главное нововведение - плейврайт кликает кнопки!
   */
  private async applyFormatting(
    plainContent: string,
    formatting: any
  ): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // TODO: Применить оформление на основе кнопок Dzen
    // для тестирования пюста
  }

  /**
   * Нажимаем кнопку "Опубликовать" или "Черновик"
   */
  private async submit(asDraft: boolean): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    if (asDraft) {
      // Сохранить в черновик
      try {
        await this.page.click('button[aria-label*="draft" i]');
      } catch (e) {
        await this.page.click('button:has-text("\u0427ерновик")');
      }
    } else {
      // Опубликовать
      try {
        await this.page.click('button[aria-label*="publish" i]');
      } catch (e) {
        await this.page.click(
          'button:has-text("\u041eпубликовать")'
        );
      }
    }
  }

  /**
   * Закрывает браузер
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export const playwrightService = new PlaywrightService();
