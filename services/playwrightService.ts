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
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.12.0.0 Safari/537.36',
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
    // Прямой переход в редактор, чтобы избежать редиректов на профиль
    await this.page.goto('https://dzen.ru/profile/editor/new/article', { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(10000); // Даем время на загрузку тяжелого редактора

    const url = this.page.url();
    this.log(`📄 Page loaded: "${await this.page.title()}" (${url})`);

    if (url.includes('passport.yandex') || url.includes('login')) {
      await this.dumpState('login_redirect');
      throw new Error('Redirected to login page (cookies expired or invalid)');
    }

    // Закрываем все всплывашки
    await this.page.keyboard.press('Escape');
    await this.page.evaluate(() => {
      const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, [class*="help-popup"], [class*="overlay"]');
      overlays.forEach(el => (el as HTMLElement).remove());
    });

    await this.dumpState('editor_ready');
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) throw new Error('Page not initialized');

    this.log('📝 Looking for inputs...');
    // Ждем появления хотя бы одного поля ввода
    await this.page.waitForSelector('div[contenteditable="true"], input[type="text"]', { timeout: 20000 });
    
    const inputs = await this.page.$$('div[contenteditable="true"], input[type="text"], textarea');
    this.log(`Found ${inputs.length} input elements`);
    
    if (inputs.length < 2) {
      await this.dumpState('not_enough_inputs');
      throw new Error(`Only ${inputs.length} inputs found. Probably not in editor.`);
    }

    // 1. Title
    this.log('📝 Typing title...');
    await inputs[0].click();
    await inputs[0].focus();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await inputs[0].type(article.title, { delay: 50 });
    await this.page.waitForTimeout(1000);

    // 2. Content
    this.log('📝 Pasting content...');
    await inputs[1].click();
    await inputs[1].focus();
    
    // Split content by image markers if they exist
    const contentParts = article.content.split(/\[\[(IMG|FILE):(.+?)\]\]/);
    
    for (let i = 0; i < contentParts.length; i++) {
      const part = contentParts[i];
      if (!part) continue;

      // regex split with groups: [text, type, value, text, type, value...]
      // so we need to adjust the logic
    }
    
    // Перепишем цикл для корректной обработки групп в split
    const parts = article.content.split(/(\[\[(?:IMG|FILE):.+?\]\])/);
    
    for (const part of parts) {
      if (part.startsWith('[[IMG:')) {
        const url = part.match(/\[\[IMG:(.+?)\]\]/)?.[1];
        if (url) await this.insertImageInEditor(url);
      } else if (part.startsWith('[[FILE:')) {
        const filePath = part.match(/\[\[FILE:(.+?)\]\]/)?.[1];
        if (filePath) await this.uploadImageInEditor(filePath);
      } else if (part.trim()) {
        // Text
        await this.pasteText(part);
      }
    }
    
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press('Enter');
    
    // 3. Main Cover Image (Legacy support)
    if (article.imageUrl && !article.content.includes(article.imageUrl)) {
      this.log('🖼️ Inserting main cover image...');
      if (article.imageUrl.startsWith('http')) {
        await this.insertImageInEditor(article.imageUrl);
      } else {
        await this.uploadImageInEditor(article.imageUrl);
      }
    }
  }

  private async pasteText(text: string) {
    if (!this.page) return;
    await this.page.evaluate((t) => {
      const el = document.activeElement as HTMLElement;
      if (el) {
        const dt = new DataTransfer();
        dt.setData('text/plain', t);
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      }
    }, text);
    await this.page.keyboard.press('Control+V');
    await this.page.waitForTimeout(500);
  }

  /**
   * Helper to UPLOAD local image file
   */
  private async uploadImageInEditor(relativeFilePath: string) {
    if (!this.page) return;
    
    const absolutePath = path.isAbsolute(relativeFilePath) 
      ? relativeFilePath 
      : path.join(process.cwd(), relativeFilePath);

    this.log(`📤 Uploading file: ${absolutePath}`);
    try {
      // 1. Click the "Add Image" button to trigger the hidden file input
      const imageBtn = await this.page.$('button[aria-label="Вставить изображение"], button[data-tip="Вставить изображение"]');
      if (imageBtn) {
        // Дзен открывает диалог выбора файла. В Playwright мы ловим событие 'filechooser'
        const fileChooserPromise = this.page.waitForEvent('filechooser');
        await imageBtn.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(absolutePath);
        
        await this.page.waitForTimeout(5000); // Даем время на загрузку
        this.log('✅ File uploaded successfully');
      }
    } catch (e) {
      this.log(`❌ Upload failed: ${(e as Error).message}`);
    }
  }

  /**
   * Helper to insert image by URL into the editor
   */
  private async insertImageInEditor(url: string) {
    if (!this.page) return;
    
    this.log(`🖼️ Inserting image: ${url.substring(0, 50)}...`);
    try {
      const imageBtn = await this.page.$('button[aria-label="Вставить изображение"], button[data-tip="Вставить изображение"], .article-editor-desktop--side-button__sideButton-1z');
      if (imageBtn) {
        await imageBtn.click();
        await this.page.waitForTimeout(2000);
        const urlInput = await this.page.waitForSelector('input[placeholder*="ссылка"], input[type="text"]', { timeout: 5000 });
        if (urlInput) {
          await urlInput.fill(url);
          await urlInput.press('Enter');
          await this.page.waitForTimeout(5000); // Wait for image to load/process
          this.log('✅ Image URL submitted');
        }
      }
    } catch (e) {
      this.log(`⚠️ Failed to insert image: ${(e as Error).message}`);
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string }> {
    if (!this.page) throw new Error('Page not initialized');

    const publishBtnSelector = 'button[data-testid="article-publish-btn"]';
    try {
      this.log('⏳ Waiting for publish button...');
      await this.page.waitForSelector(publishBtnSelector, { timeout: 20000 });
      const btn = await this.page.$(publishBtnSelector);
      if (btn && await btn.isEnabled()) {
        await btn.click();
        this.log('✅ Clicked publish button');
        await this.page.waitForTimeout(3000);
        
        // Final confirmation button in modal
        const confirmBtn = await this.page.waitForSelector('button[data-testid="publish-btn"]', { timeout: 10000 });
        if (confirmBtn) {
          await confirmBtn.click();
          this.log('✅ Clicked final confirmation');
          
          // Wait for redirect
          try {
            await this.page.waitForFunction(() => !window.location.href.includes('/editor/'), { timeout: 40000 });
            const finalUrl = this.page.url();
            this.log(`🔗 Published at: ${finalUrl}`);
            return { success: true, url: finalUrl };
          } catch (e) {
            this.log('⚠️ Publication timeout or captcha');
            await this.dumpState('after_publish_attempt');
          }
        }
      }
    } catch (e) {
      this.log(`❌ Submit error: ${(e as Error).message}`);
    }
    return { success: false };
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
