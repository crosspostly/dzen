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
      this.log(`🤖 Starting PlaywrightService for article: "${article.title}"`);
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
      await this.page.screenshot({ path: path.join(process.cwd(), `${name}.png`), fullPage: true });
      const html = await this.page.content();
      await fs.writeFile(path.join(process.cwd(), `${name}.html`), html);
      this.log(`📸 State dumped to ${name}.html and ${name}.png`);
    } catch (e) {}
  }

  private async initBrowser(options: PublishOptions) {
    this.browser = await chromium.launch({
      headless: options.headless !== false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    this.page = await this.context.newPage();
  }

  private async loadCookies(cookiesJson: string) {
    const rawCookies = JSON.parse(cookiesJson);
    const validCookies = rawCookies.map((c: any) => {
      const cookie = { ...c };
      if (cookie.sameSite) {
        const lower = String(cookie.sameSite).toLowerCase();
        if (lower === 'no_restriction' || lower === 'none') { cookie.sameSite = 'None'; cookie.secure = true; }
        else if (lower === 'lax') cookie.sameSite = 'Lax';
        else if (lower === 'strict') cookie.sameSite = 'Strict';
        else delete cookie.sameSite;
      }
      delete cookie.hostOnly; delete cookie.session; delete cookie.storeId; delete cookie.id;
      return cookie;
    });
    await this.context!.addCookies(validCookies);
  }

  private async closeModals() {
    if (!this.page) return;
    await this.page.evaluate(() => {
      document.querySelectorAll('.ReactModalPortal, [class*="overlay"], [class*="modal"]').forEach(el => {
        if (el.textContent?.includes('Понятно') || el.textContent?.includes('Закрыть') || el.textContent?.includes('Далее') || el.textContent?.includes('Что-то не загрузилось')) {
          el.remove();
        }
      });
      document.body.style.pointerEvents = 'auto';
    }).catch(() => {});
  }

  private async navigateToEditor() {
    this.log('🌐 Opening Dzen Studio...');
    await this.page!.goto('https://dzen.ru/studio/editor/create/article', { waitUntil: 'networkidle' });
    await this.page!.waitForTimeout(10000);
    
    // Check if we are actually in the editor
    const hasEditor = await this.page!.$( 'h1 [contenteditable="true"], [placeholder*="Заголовок"]').catch(() => null);
    if (!hasEditor) {
      this.log('⚠️ Direct URL failed, trying fallback via Studio main page...');
      await this.page!.goto('https://dzen.ru/studio', { waitUntil: 'networkidle' });
      await this.page!.waitForTimeout(5000);
      await this.closeModals();
      const addBtn = await this.page!.waitForSelector('[data-testid="add-publication-button"], .new-publication-button', { timeout: 15000 });
      await addBtn.click({ force: true });
      await this.page!.waitForTimeout(3000);
      await this.page!.click('span:has-text("Статья"), div[role="button"]:has-text("Статья"), [class*="button"]:has-text("Статья")', { force: true });
      await this.page!.waitForTimeout(10000);
    }
    
    await this.closeModals();
  }

  private async fillArticle(article: ArticleData) {
    this.log('📝 Filling article content...');
    await this.closeModals();

    const titleInput = await this.page!.waitForSelector('h1 [contenteditable="true"], [placeholder*="Заголовок"]', { timeout: 20000 });
    await titleInput.focus();
    await this.page!.keyboard.type(article.title, { delay: 20 });
    
    const bodyInput = await this.page!.waitForSelector('.public-DraftEditor-content, [role="textbox"]:not(h1 [role="textbox"])', { timeout: 15000 });
    await bodyInput.focus();
    await this.page!.evaluate((text) => navigator.clipboard.writeText(text), article.content);
    await this.page!.keyboard.press('Control+V');
    await this.page!.waitForTimeout(3000);

    if (article.imageUrl) {
      this.log('🖼️ Handling image...');
      await this.page!.mouse.move(500, 500);
      const imageBtn = await this.page!.waitForSelector('button[data-tip="Вставить изображение"]', { timeout: 10000 }).catch(() => null);
      if (imageBtn) {
        await imageBtn.click({ force: true });
        await this.page!.waitForTimeout(3000);
        
        if (!article.imageUrl.startsWith('http')) {
          this.log(`📤 Uploading local: ${article.imageUrl}`);
          const fileInput = await this.page!.waitForSelector('input[type="file"]', { timeout: 5000 });
          await fileInput.setInputFiles(article.imageUrl);
          await this.page!.waitForTimeout(12000); // Wait longer for image processing
        } else {
          const urlInput = await this.page!.waitForSelector('input[type="text"][placeholder*="Ссылка"]', { timeout: 5000 });
          await urlInput.fill(article.imageUrl);
          await urlInput.press('Enter');
          await this.page!.waitForTimeout(7000);
        }
        await this.closeModals();
      }
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string }> {
    this.log('⏳ Publishing...');
    await this.closeModals();
    
    const pubBtn = await this.page!.waitForSelector('button[data-testid="article-publish-btn"]', { timeout: 20000 });
    await pubBtn.click({ force: true });
    this.log('✅ Publish button clicked');
    await this.page!.waitForTimeout(10000);
    await this.handleCaptcha();

    await this.closeModals();
    const confirmBtn = await this.page!.waitForSelector('button[data-testid="publish-btn"][type="submit"]', { timeout: 30000 });
    await confirmBtn.click({ force: true });
    this.log('✅ Confirmation clicked');
    await this.handleCaptcha(15);
    
    this.log('⏳ Waiting for success...');
    await this.page!.waitForFunction(() => !window.location.href.includes('/editor/'), { timeout: 90000 });
    const url = this.page!.url();
    this.log(`🔗 Published: ${url}`);
    return { success: true, url };
  }

  private async handleCaptcha(attempts = 5) {
    const sel = '#not-robot-captcha-checkbox';
    for (let i = 0; i < attempts; i++) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) { await el.click({ force: true }); return; }
        for (const f of this.page!.frames()) {
          const fe = await f.$(sel);
          if (fe && await fe.isVisible()) { await fe.click({ force: true }); return; }
        }
        await this.page!.waitForTimeout(1000);
      } catch (e) {}
    }
  }

  private async close() { if (this.browser) await this.browser.close(); }
}

export const playwrightService = new PlaywrightService();
