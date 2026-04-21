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
      this.log(`🤖 Starting Final Reliable Publisher: "${article.title}"`);
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
    const cookies = JSON.parse(cookiesJson);
    await this.context.addCookies(cookies.map((c: any) => {
      const { hostOnly, session, storeId, id, ...validCookie } = c;
      if (validCookie.sameSite) {
        const s = String(validCookie.sameSite).toLowerCase();
        if (s === 'no_restriction' || s === 'none') validCookie.sameSite = 'None';
        else if (s === 'lax') validCookie.sameSite = 'Lax';
        else if (s === 'strict') validCookie.sameSite = 'Strict';
        else delete validCookie.sameSite;
      }
      return validCookie;
    }));
  }

  private async navigateToEditor() {
    if (!this.page) return;
    this.log('🌐 Navigating to Studio...');
    await this.page.goto('https://dzen.ru/profile/editor/new/home', { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(5000);

    // Закрываем всё лишнее (баннеры, донаты)
    await this.page.evaluate(() => {
      const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, [class*="help-popup"], [data-testid*="banner"], [class*="curtain"]');
      overlays.forEach(el => (el as HTMLElement).remove());
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

    this.log('📝 Filling article content...');
    await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 30000 });
    
    const fields = await this.page.$$('div[contenteditable="true"], [role="textbox"]');
    
    // 1. Заголовок
    this.log('   📝 Title...');
    await fields[0].focus();
    await fields[0].fill(article.title);
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('Enter');

    // 2. Тело статьи (пошаговая вставка для поддержки картинок)
    const blocks = article.content.split(/(\[\[IMG:.+?\]\])/);
    this.log(`   🧩 Split into ${blocks.length} blocks`);

    for (const block of blocks) {
      if (!block.trim()) continue;

      if (block.startsWith('[[IMG:')) {
        const url = block.match(/\[\[IMG:(.+?)\]\]/)?.[1];
        if (url) await this.insertImageViaUrl(url);
      } else {
        this.log(`   ⌨️ Inserting text (${block.length} chars)...`);
        // Используем insertText для сохранения фокуса и поддержки многострочности
        await this.page.keyboard.insertText(block.trim());
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
      }
    }
    
    // 3. Финальная картинка (если есть и не была в блоках)
    if (article.imageUrl && !article.content.includes(article.imageUrl)) {
      await this.insertImageViaUrl(article.imageUrl);
    }
  }

  private async insertImageViaUrl(url: string) {
    if (!this.page) return;
    this.log(`   🖼️ Inserting image: ${url.substring(0, 50)}...`);
    try {
      // Ищем кнопку картинки ровно как в publish.js
      const btn = await this.page.waitForSelector('button[data-tip="Вставить изображение"], [aria-label*="изображение"]', { timeout: 10000 });
      await btn.click();
      await this.page.waitForTimeout(3000);
      
      const input = await this.page.waitForSelector('input[placeholder*="ссылка"], input[type="text"]', { timeout: 5000 });
      await input.fill(url);
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Enter');
      
      this.log('   ✅ Image submitted');
      await this.page.waitForTimeout(8000); // Даем Дзену время подгрузить картинку
    } catch (e) {
      this.log(`   ⚠️ Image failed: ${e.message}`);
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
      await this.page.waitForTimeout(10000);
      
      return { success: true, url: 'https://dzen.ru/profile/editor/new/publications' };
    } catch (e) {
      this.log('❌ Submit failed, saving draft...');
      await this.page.keyboard.press('Control+s');
      return { success: false, error: (e as Error).message };
    }
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
