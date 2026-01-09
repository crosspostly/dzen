import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs/promises';

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

  /**
   * Main entry point to publish an article
   */
  async publish(article: ArticleData, options: PublishOptions): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log(`🤖 Starting PlaywrightService for article: "${article.title}"`);
      
      await this.initBrowser(options);
      await this.loadCookies(options.cookiesJson);
      
      await this.navigateToEditor();
      await this.fillArticle(article);
      
      const result = await this.submitPublish();
      
      await this.close();
      return result;

    } catch (error) {
      console.error('❌ PlaywrightService Error:', error);
      await this.close();
      return { success: false, error: (error as Error).message };
    }
  }

  private async initBrowser(options: PublishOptions) {
    this.browser = await chromium.launch({
      headless: options.headless !== false, // Default to true
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.12.0.0 Safari/537.36',
      permissions: ['clipboard-read', 'clipboard-write'] // Crucial for copy-paste
    });

    this.page = await this.context.newPage();
  }

  private async loadCookies(cookiesJson: string) {
    if (!this.context) throw new Error('Browser context not initialized');
    try {
      const cookies = JSON.parse(cookiesJson);
      await this.context.addCookies(cookies);
      console.log(`✅ Cookies loaded (${cookies.length} items)`);
    } catch (e) {
      throw new Error(`Failed to load cookies: ${(e as Error).message}`);
    }
  }

  private async navigateToEditor() {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🌐 Navigating to Dzen editor...');
    await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Close modal if present
    const modalButton = await this.page.$('[data-testid="close-button"]');
    if (modalButton) await modalButton.click();

    // Click "Add Publication"
    const addButton = await this.page.$('[data-testid="add-publication-button"]');
    if (addButton) {
      await addButton.click();
      await this.page.waitForTimeout(2000);
      
      // Click "Write Article"
      const writeButton = await this.page.$('text="Написать статью"');
      if (writeButton) {
        await writeButton.click();
        console.log('✅ Editor opened');
        await this.page.waitForTimeout(8000); // Wait for editor load
        
        // Close overlays
        await this.page.evaluate(() => {
          const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, .article-editor-desktop--help-popup__overlay-3q');
          overlays.forEach(el => { (el as HTMLElement).style.display = 'none'; el.remove(); });
        });
        await this.page.keyboard.press('Escape');
      } else {
        throw new Error('"Write Article" button not found');
      }
    } else {
      // Maybe we are already in the menu or on a different page structure
      throw new Error('"Add Publication" button not found');
    }
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) throw new Error('Page not initialized');

    const inputs = await this.page.$$('input[type="text"], textarea, div[contenteditable="true"]');
    
    // 1. Title (Human-like typing)
    if (inputs.length > 0) {
      console.log('📝 Typing title...');
      await inputs[0].focus();
      await inputs[0].type(article.title, { delay: 100 });
    }

    // 2. Content (Copy-Paste)
    if (inputs.length > 1) {
      console.log('📝 Pasting content...');
      await inputs[1].focus();
      await this.page.evaluate((text) => navigator.clipboard.writeText(text), article.content);
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Control+V');
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Enter');
      
      // Scroll simulation
      await this.page.mouse.wheel(0, 500);
      await this.page.waitForTimeout(1000);
      await this.page.mouse.wheel(0, -500);
    }

    // 3. Image
    if (article.imageUrl) {
      console.log('🖼️ Inserting image...');
      
      // Try multiple selectors for the image button
      const imageBtnSelectors = [
        'button[data-tip="Вставить изображение"]',
        'button[aria-label="Вставить изображение"]',
        '.article-editor-desktop--side-button__sideButton-1z', // Legacy class
        'button:has(svg)' // Generic fallback (risky but better than nothing)
      ];

      let imageBtn = null;
      for (const selector of imageBtnSelectors) {
        imageBtn = await this.page.$(selector);
        if (imageBtn && await imageBtn.isVisible()) break;
      }

      if (imageBtn) {
        await imageBtn.click();
        await this.page.waitForTimeout(2000);
        
        // Wait for input to appear
        const urlInput = await this.page.waitForSelector('input[type="text"][placeholder*="ссылка"]', { timeout: 5000 }).catch(() => null) || 
                         await this.page.$('input[type="text"]'); // Fallback

        if (urlInput) {
          await urlInput.fill(article.imageUrl);
          await urlInput.press('Enter');
          await this.page.waitForTimeout(3000); // Wait for image to load
          console.log('✅ Image URL submitted');
        } else {
          console.warn('⚠️ Image input field not found after clicking button');
        }
      } else {
        console.warn('⚠️ Image button not found');
      }
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string }> {
    if (!this.page) throw new Error('Page not initialized');

    // 1. First Publish Button
    const firstBtnSelector = 'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])';
    const firstBtn = await this.page.$(firstBtnSelector);
    
    if (firstBtn && await firstBtn.isVisible()) {
      await firstBtn.click();
      console.log('✅ Clicked first publish button');
      await this.handleCaptcha();
      await this.page.waitForTimeout(3000);
    } else {
      console.log('⚠️ First publish button not found');
    }

    // 2. Second Publish Button (Modal)
    const secondBtnSelector = 'button[data-testid="publish-btn"][type="submit"]';
    const secondBtn = await this.page.$(secondBtnSelector);

    if (secondBtn && await secondBtn.isVisible()) {
      await secondBtn.click();
      console.log('✅ Clicked confirmation button');
      
      // Long polling for captcha
      await this.handleCaptcha(15);

      // Validate via URL redirect
      console.log('⏳ Waiting for redirect...');
      try {
        await this.page.waitForFunction(() => !window.location.href.includes('/editor/'), { timeout: 30000 });
        const finalUrl = this.page.url();
        console.log(`🔗 Published at: ${finalUrl}`);
        return { success: true, url: finalUrl };
      } catch (e) {
        throw new Error('Publication timed out (no redirect)');
      }
    }

    return { success: false };
  }

  private async handleCaptcha(maxAttempts = 5) {
    if (!this.page) return;
    const selector = '#not-robot-captcha-checkbox';

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Main page
        const el = await this.page.$(selector);
        if (el) {
           await this.clickCaptcha(el);
           return;
        }

        // Frames
        for (const frame of this.page.frames()) {
          const frameEl = await frame.$(selector);
          if (frameEl) {
            console.log('🤖 Captcha found in iframe');
            await this.clickCaptcha(frameEl, frame);
            return;
          }
        }
        await this.page.waitForTimeout(1000);
      } catch (e) { /* ignore */ }
    }
  }

  private async clickCaptcha(element: any, frame: any = null) {
    try {
      // Try clicking label parent first
      const label = await element.evaluateHandle((el: HTMLElement) => el.closest('label'));
      if (label) {
        await label.click();
      } else {
        await element.click({ force: true });
      }
      console.log('✅ Captcha clicked');
      await this.page?.waitForTimeout(3000);
    } catch (e) {
      console.log('⚠️ Failed to click captcha');
    }
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
