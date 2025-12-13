/**
 * Playwright Service - Публикация на Яндекс.Дзен и парсинг примеров
 * Использует Playwright для браузер-автоматизации
 */

import { Browser, Page } from 'playwright';
import chromium from 'playwright';

export interface PublishOptions {
  title: string;
  content: string;
  isDraft?: boolean;
  tags?: string[];
}

export interface ParsedArticle {
  title: string;
  content: string;
  views: number;
  likes: number;
  date: string;
  engagement_rate: number;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Инициализирует браузер
   */
  async init(): Promise<void> {
    const pw = await import('playwright');
    this.browser = await pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox'],
    });
  }

  /**
   * Закрывает браузер
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Публикует статью на Яндекс.Дзен
   * ПРИМЕЧАНИЕ: Требует куки для авторизации
   */
  async publishArticle(
    credentials: { cookies: string },
    article: PublishOptions
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.browser) {
        await this.init();
      }

      this.page = await this.browser!.newPage();

      // Установка куки авторизации
      const cookies = JSON.parse(credentials.cookies);
      await this.page.context().addCookies(cookies);

      // Переход на Дзен
      await this.page.goto('https://zen.yandex.ru/create', {
        waitUntil: 'networkidle',
      });

      // Заполнение заголовка
      await this.page.fill('[data-testid="article-title"]', article.title);

      // Заполнение контента
      await this.page.fill('[data-testid="article-content"]', article.content);

      // Установка тегов
      if (article.tags && article.tags.length > 0) {
        for (const tag of article.tags) {
          await this.page.fill('[data-testid="tag-input"]', tag);
          await this.page.press('[data-testid="tag-input"]', 'Enter');
        }
      }

      // Выбор режима (черновик или опубликовать)
      if (article.isDraft) {
        await this.page.click('[data-testid="save-draft"]');
      } else {
        await this.page.click('[data-testid="publish"]');
      }

      // Ждём подтверждения
      await this.page.waitForNavigation();

      const url = this.page.url();
      await this.page.close();

      return {
        success: true,
        url,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Парсит популярные статьи с канала
   */
  async parseChannelArticles(
    channelUrl: string,
    limit: number = 10
  ): Promise<ParsedArticle[]> {
    try {
      if (!this.browser) {
        await this.init();
      }

      this.page = await this.browser!.newPage();

      await this.page.goto(channelUrl, {
        waitUntil: 'networkidle',
      });

      // Скролим для загрузки всех статей
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await this.page.waitForTimeout(1000);
      }

      // Парсим статьи
      const articles = await this.page.evaluate(
        (limit) => {
          const articleElements = document.querySelectorAll(
            '[data-testid="article-card"]'
          );
          const parsed: any[] = [];

          for (let i = 0; i < Math.min(limit, articleElements.length); i++) {
            const el = articleElements[i];
            const titleEl = el.querySelector('[data-testid="article-title"]');
            const viewsEl = el.querySelector('[data-testid="views-count"]');
            const likesEl = el.querySelector('[data-testid="likes-count"]');
            const dateEl = el.querySelector('[data-testid="article-date"]');

            if (titleEl) {
              const title = titleEl.textContent || '';
              const views = parseInt(viewsEl?.textContent || '0') || 0;
              const likes = parseInt(likesEl?.textContent || '0') || 0;
              const date = dateEl?.textContent || new Date().toISOString();
              const engagement_rate =
                views > 0 ? (likes / views) * 100 : 0;

              parsed.push({
                title,
                views,
                likes,
                date,
                engagement_rate,
              });
            }
          }

          return parsed;
        },
        [limit]
      );

      // Парсим полный контент каждой статьи
      const result: ParsedArticle[] = [];

      for (const article of articles) {
        try {
          // Переходим на статью
          await this.page.click(`a:has-text("${article.title}")`);
          await this.page.waitForNavigation();

          // Парсим контент
          const content = await this.page.evaluate(() => {
            const contentEl = document.querySelector(
              '[data-testid="article-content"]'
            );
            return contentEl?.textContent || '';
          });

          result.push({
            ...article,
            content,
          });

          // Возвращаемся на канал
          await this.page.goBack();
        } catch (e) {
          // Пропускаем если ошибка
          continue;
        }
      }

      await this.page.close();
      return result;
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
      return [];
    }
  }
}

export const playwrightService = new PlaywrightService();
