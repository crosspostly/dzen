import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

export interface ArticleData {
  title: string;
  content: string;
  imageUrl?: string;
  extraImages?: Array<{url: string, index?: number}>;
}

export interface PublishOptions {
  cookiesJson: string;
  headless?: boolean;
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Main entry point to publish an article
   */
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
      if (this.page) {
        await this.dumpState('error_state');
      }
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
      const html = await this.page.content();
      const screenshot = await this.page.screenshot({ fullPage: true });
      
      await fs.writeFile(path.join(process.cwd(), `${name}.html`), html);
      await fs.writeFile(path.join(process.cwd(), `${name}.png`), screenshot);
      this.log(`📸 State dumped to ${name}.html and ${name}.png`);
    } catch (e) {
      console.error('Failed to dump state:', e);
    }
  }

  private async initBrowser(options: PublishOptions) {
    this.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: options.headless !== false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--window-size=1920,1080']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      isMobile: false,
      hasTouch: false,
      permissions: ['clipboard-read', 'clipboard-write']
    });

    this.page = await this.context.newPage();
  }

  private async loadCookies(cookiesJson: string) {
    if (!this.context) throw new Error('Browser context not initialized');
    try {
      const rawCookies = JSON.parse(cookiesJson);
      const validCookies = rawCookies.map((c: any) => {
        const cookie = { ...c };
        if (cookie.sameSite) {
          const lower = String(cookie.sameSite).toLowerCase();
          if (lower === 'no_restriction' || lower === 'none') {
            cookie.sameSite = 'None';
            cookie.secure = true;
          } else if (lower === 'lax') {
            cookie.sameSite = 'Lax';
          } else if (lower === 'strict') {
            cookie.sameSite = 'Strict';
          } else {
            delete cookie.sameSite;
          }
        }
        delete cookie.hostOnly;
        delete cookie.session;
        delete cookie.storeId;
        delete cookie.id;
        return cookie;
      });

      await this.context.addCookies(validCookies);
      this.log(`✅ Cookies loaded (${validCookies.length} items)`);
    } catch (e) {
      throw new Error(`Failed to load cookies: ${(e as Error).message}`);
    }
  }

  private async navigateToEditor() {
    if (!this.page) throw new Error('Page not initialized');
    
    this.log('🌐 Navigating directly to new article editor...');
    await this.page.goto('https://dzen.ru/profile/editor/new/article', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await this.page.waitForTimeout(5000);

    let url = this.page.url();
    this.log(`📄 Page loaded: "${await this.page.title()}" (${url})`);

    if (url.includes('passport.yandex') || url.includes('login')) {
      await this.dumpState('login_redirect');
      throw new Error('Redirected to login page (cookies expired or invalid)');
    }

    // Закрываем все всплывашки СРАЗУ
    await this.page.keyboard.press('Escape');
    await this.page.evaluate(() => {
      const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, [class*="help-popup"], [class*="overlay"], [class*="curtain"], [data-testid*="banner"]');
      overlays.forEach(el => (el as HTMLElement).remove());
    }).catch(() => {});
    await this.page.waitForTimeout(1000);

    if (!url.includes('/editor/new/article')) {
      this.log('⚠️ Redirected to dashboard, attempting to find Create button...');
      try {
        const addBtn = await this.page.$('[data-testid="add-publication-button"], button[aria-label="Написать"], button[aria-label="Добавить"]');
        if (addBtn) {
          this.log('✅ Found Create button, clicking...');
          await addBtn.click({ force: true });
          await this.page.waitForTimeout(2000);
          
          this.log('🔍 Looking for "Написать статью" option...');
          try {
            await this.page.getByText('Написать статью').first().click({ force: true });
          } catch (innerE) {
            await this.page.locator('text=Написать статью').first().click({ force: true });
          }
          await this.page.waitForTimeout(8000);
          this.log(`🌐 New URL after click: ${this.page.url()}`);
        }
      } catch (e) {
        this.log(`⚠️ Navigation fallback error: ${(e as Error).message}`);
      }
    }

    await this.dumpState('editor_ready');
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) throw new Error('Page not initialized');

    this.log('📝 Looking for inputs...');
    await this.page.waitForSelector('div[contenteditable="true"], input[type="text"]', { timeout: 20000 });
    const inputs = await this.page.$$('div[contenteditable="true"], input[type="text"], textarea');
    
    if (inputs.length < 2) {
      throw new Error(`Only ${inputs.length} inputs found. Probably not in editor.`);
    }

    // 1. Title
    this.log('📝 Typing title...');
    await inputs[0].click();
    await inputs[0].focus();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await inputs[0].type(article.title, { delay: 30 });

    // 2. Content
    this.log('📝 Pasting content...');
    await inputs[1].click();
    await inputs[1].focus();
    
    const parts = article.content.split(/(\[\[(?:IMG|FILE):.+?\]\])/);
    for (const part of parts) {
      if (part.startsWith('[[IMG:')) {
        const url = part.match(/\[\[IMG:(.+?)\]\]/)?.[1];
        if (url) await this.insertImageInEditor(url);
      } else if (part.startsWith('[[FILE:')) {
        const filePath = part.match(/\[\[FILE:(.+?)\]\]/)?.[1];
        if (filePath) await this.uploadImageInEditor(filePath);
      } else if (part.trim()) {
        await this.pasteText(part);
      }
    }
  }

  private async pasteText(text: string) {
    if (!this.page) return;
    
    this.log(`   ⌨️ Inserting text chunk (${text.length} chars)...`);
    
    // Фокусируемся на текущем активном элементе (поле контента)
    await this.page.waitForTimeout(500);
    
    // Вставляем текст напрямую через клавиатуру Playwright
    // Это работает даже там, где нет системного буфера обмена
    await this.page.keyboard.insertText(text);
    
    await this.page.waitForTimeout(1000);
    // Нажимаем Enter только в конце блока текста, чтобы отделить его от картинки
    await this.page.keyboard.press('Enter');
  }

  private async uploadImageInEditor(relativeFilePath: string) {
    if (!this.page) return;
    const absolutePath = path.isAbsolute(relativeFilePath) ? relativeFilePath : path.join(process.cwd(), relativeFilePath);
    this.log(`📤 Uploading file: ${absolutePath}`);
    try {
      const imageBtn = await this.page.$('button[aria-label="Вставить изображение"], button[data-tip="Вставить изображение"]');
      if (imageBtn) {
        const fileChooserPromise = this.page.waitForEvent('filechooser');
        await imageBtn.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(absolutePath);
        await this.page.waitForTimeout(5000);
      }
    } catch (e) {
      this.log(`❌ Upload failed: ${(e as Error).message}`);
    }
  }

  private async insertImageInEditor(url: string) {
    if (!this.page) return;
    this.log(`🖼️ Inserting image: ${url.substring(0, 50)}...`);
    try {
      const imageBtn = await this.page.$('button[aria-label="Вставить изображение"], button[data-tip="Вставить изображение"]');
      if (imageBtn) {
        await imageBtn.click();
        await this.page.waitForTimeout(2000);
        const urlInput = await this.page.waitForSelector('input[placeholder*="ссылка"], input[type="text"]', { timeout: 5000 });
        if (urlInput) {
          await urlInput.fill(url);
          await urlInput.press('Enter');
          await this.page.waitForTimeout(5000);
        }
      }
    } catch (e) {
      this.log(`⚠️ Failed to insert image: ${(e as Error).message}`);
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      this.log('⏳ Step 1: Click initial Publish button...');
      const step1Btn = await this.page.waitForSelector('button:has-text("Опубликовать"), button:has-text("Далее"), [data-testid="article-publish-btn"]', { timeout: 20000 });
      await step1Btn.click();
      await this.page.waitForTimeout(3000);

      this.log('⏳ Step 2: Click final Publish button in settings sidepanel...');
      const step2Btn = await this.page.waitForSelector('button.editor-article-edit-settings__publish-button, button:has-text("Опубликовать"), [data-testid="publish-btn"]', { timeout: 15000 });
      await step2Btn.click();
      
      this.log('✅ Article submitted for publication!');
      await this.page.waitForTimeout(10000); // Wait for redirect or success state

      const finalUrl = this.page.url();
      if (!finalUrl.includes('/editor/')) {
        return { success: true, url: finalUrl };
      }
      
      return { success: true, url: 'https://dzen.ru/profile/editor/new/publications' };

    } catch (e) {
      this.log(`❌ Publication failed: ${(e as Error).message}`);
      this.log('⚠️ Fallback: Trying to save as DRAFT (Ctrl+S)...');
      await this.page.keyboard.press('Control+S');
      await this.page.waitForTimeout(2000);
      await this.dumpState('draft_save_attempt');
      return { success: false, error: (e as Error).message };
    }
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
