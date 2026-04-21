import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

export interface ArticleData {
  title: string;
  content: string;
  imageUrl?: string;
}

export interface PublishOptions {
  cookiesJson: string;
  headless?: boolean;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async publish(article: ArticleData, options: PublishOptions): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      this.log(`🤖 Starting PlaywrightService: "${article.title}"`);
      await this.initBrowser(options);
      await this.loadCookies(options.cookiesJson);
      await this.navigateToEditor();
      await this.fillArticle(article);
      const result = await this.submitPublish();
      await this.close();
      return result;
    } catch (error) {
      console.error('❌ PlaywrightService Error:', error);
      if (this.page) await this.dumpState('error_state');
      await this.close();
      return { success: false, error: (error as Error).message };
    }
  }

  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private async dumpState(name: string) {
    if (!this.page) return;
    try {
      await fs.writeFile(path.join(process.cwd(), `${name}.html`), await this.page.content());
      await this.page.screenshot({ path: path.join(process.cwd(), `${name}.png`), fullPage: true });
    } catch (e) {}
  }

  private async initBrowser(options: PublishOptions) {
    this.browser = await chromium.launch({
      headless: options.headless !== false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    this.page = await this.context.newPage();
  }

  private async loadCookies(cookiesJson: string) {
    if (!this.context) return;
    const rawCookies = JSON.parse(cookiesJson);
    const validCookies = rawCookies.map((c: any) => {
      const cookie = { ...c };
      if (cookie.sameSite) {
        const lower = String(cookie.sameSite).toLowerCase();
        if (lower === 'no_restriction' || lower === 'none') cookie.sameSite = 'None';
        else if (lower === 'lax') cookie.sameSite = 'Lax';
        else if (lower === 'strict') cookie.sameSite = 'Strict';
        else delete cookie.sameSite;
      }
      delete cookie.hostOnly; delete cookie.session; delete cookie.storeId; delete cookie.id;
      return cookie;
    });
    await this.context.addCookies(validCookies);
  }

  private async navigateToEditor() {
    if (!this.page) return;
    this.log('🌐 Navigating to Studio...');
    await this.page.goto('https://dzen.ru/profile/editor/new/home', { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(5000);

    // Удаляем баннеры
    await this.page.evaluate(() => {
      document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, [class*="help-popup"], [data-testid*="banner"]').forEach(el => el.remove());
    });

    this.log('🔍 Clicking Add button...');
    await this.page.click('[data-testid="add-publication-button"]');
    await this.page.waitForTimeout(2000);

    this.log('🔍 Clicking Write Article...');
    await this.page.click('text="Написать статью"');
    await this.page.waitForTimeout(10000);
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) return;
    this.log('📝 Filling content...');
    await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 20000 });
    const fields = await this.page.$$('div[contenteditable="true"], input[type="text"]');
    
    // Title
    await fields[0].fill(article.title);
    await this.page.waitForTimeout(1000);

    // Content
    await fields[1].fill(article.content);
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press('Enter');

    // Image
    if (article.imageUrl) {
      this.log('🖼️ Inserting image...');
      const btn = await this.page.$('button[data-tip="Вставить изображение"], [aria-label*="изображение"]');
      if (btn) {
        await btn.click();
        await this.page.waitForTimeout(2000);
        const input = await this.page.$('input[placeholder*="ссылка"], input[type="text"]');
        if (input) {
          await input.fill(article.imageUrl);
          await input.press('Enter');
          await this.page.waitForTimeout(5000);
        }
      }
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.page) return { success: false };
    try {
      this.log('⏳ Publishing...');
      await this.page.click('button:has-text("Опубликовать"), [data-testid="article-publish-btn"]');
      await this.page.waitForTimeout(3000);
      const final = await this.page.waitForSelector('button.editor-article-edit-settings__publish-button, button:has-text("Опубликовать")', { timeout: 10000 });
      await final.click();
      await this.page.waitForTimeout(5000);
      return { success: true, url: 'https://dzen.ru/profile/editor/new/publications' };
    } catch (e) {
      await this.page.keyboard.press('Control+s');
      return { success: false, error: (e as Error).message };
    }
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
