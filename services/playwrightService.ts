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
      this.log(`✅ Cookies loaded (${cookies.length} items)`);
    } catch (e) {
      throw new Error(`Failed to load cookies: ${(e as Error).message}`);
    }
  }

  private async navigateToEditor() {
    if (!this.page) throw new Error('Page not initialized');
    
    this.log('🌐 Navigating to Dzen editor...');
    await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    const title = await this.page.title();
    const url = this.page.url();
    this.log(`📄 Page loaded: "${title}" (${url})`);

    // Check for login redirection
    if (url.includes('passport.yandex')) {
      await this.dumpState('login_redirect');
      throw new Error('Redirected to login page (cookies expired?)');
    }

    // Close modal if present
    const modalButton = await this.page.$('[data-testid="close-button"]');
    if (modalButton) {
      this.log('Start modal found, closing...');
      await modalButton.click();
    }

    await this.dumpState('step1_editor');

    // Click "Add Publication"
    const addButtonSelectors = ['[data-testid="add-publication-button"]', 'button[aria-label="Создать"]', '.new-publication-button'];
    let addButton = null;
    
    for (const sel of addButtonSelectors) {
      addButton = await this.page.$(sel);
      if (addButton) {
        this.log(`Found add button with selector: ${sel}`);
        break;
      }
    }

    if (addButton) {
      await addButton.click();
      await this.page.waitForTimeout(2000);
      await this.dumpState('step2_menu_open');
      
      // Click "Write Article"
      // Try multiple selectors
      const writeSelectors = ['text="Написать статью"', 'text="Статья"'];
      let writeButton = null;

      for (const sel of writeSelectors) {
         writeButton = await this.page.$(sel);
         if (writeButton) break;
      }

      if (writeButton) {
        await writeButton.click();
        this.log('✅ "Write Article" clicked, waiting for editor...');
        await this.page.waitForTimeout(8000); // Wait for editor load
        
        await this.dumpState('step3_editor_loaded');

        // Close overlays
        await this.page.evaluate(() => {
          const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, .article-editor-desktop--help-popup__overlay-3q');
          overlays.forEach(el => { (el as HTMLElement).style.display = 'none'; el.remove(); });
        });
        await this.page.keyboard.press('Escape');
      } else {
        await this.dumpState('dump_menu');
        throw new Error('"Write Article" button not found');
      }
    } else {
      // Maybe we are already in the menu or on a different page structure
      await this.dumpState('dump_no_add_btn');
      throw new Error('"Add Publication" button not found');
    }
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) throw new Error('Page not initialized');

    this.log('📝 Looking for inputs...');
    const inputs = await this.page.$$('input[type="text"], textarea, div[contenteditable="true"]');
    this.log(`Found ${inputs.length} input elements`);
    
    if (inputs.length === 0) {
      await this.dumpState('no_inputs');
      throw new Error('No inputs found in editor');
    }

    // 1. Title (Human-like typing)
    if (inputs.length > 0) {
      this.log('📝 Typing title...');
      await inputs[0].focus();
      await inputs[0].type(article.title, { delay: 100 });
    }

    // 2. Content (Copy-Paste)
    if (inputs.length > 1) {
      this.log('📝 Pasting content...');
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
      this.log('🖼️ Inserting image...');
      
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
        if (imageBtn && await imageBtn.isVisible()) {
          this.log(`Found image button: ${selector}`);
          break;
        }
      }

      if (imageBtn) {
        await imageBtn.click();
        await this.page.waitForTimeout(2000);
        await this.dumpState('image_dialog');
        
        // Wait for input to appear
        const urlInput = await this.page.waitForSelector('input[type="text"][placeholder*="ссылка"]', { timeout: 5000 }).catch(() => null) || 
                         await this.page.$('input[type="text"]'); // Fallback

        if (urlInput) {
          await urlInput.fill(article.imageUrl);
          await urlInput.press('Enter');
          await this.page.waitForTimeout(3000); // Wait for image to load
          this.log('✅ Image URL submitted');
        } else {
          this.log('⚠️ Image input field not found after clicking button');
          await this.dumpState('no_image_input');
        }
      } else {
        this.log('⚠️ Image button not found');
        await this.dumpState('no_image_btn');
      }
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string }> {
    if (!this.page) throw new Error('Page not initialized');

    // 1. First Publish Button
    const firstBtnSelector = 'button[data-testid="article-publish-btn"]';
    
    try {
      this.log('⏳ Waiting for publish button to be enabled...');
      // Wait for button to be visible AND enabled (not disabled)
      await this.page.waitForSelector(`${firstBtnSelector}:not([disabled])`, { timeout: 15000 });
      
      const firstBtn = await this.page.$(firstBtnSelector);
      if (firstBtn) {
        await firstBtn.click();
        this.log('✅ Clicked first publish button');
        await this.handleCaptcha();
        await this.page.waitForTimeout(3000);
        await this.dumpState('publish_modal');
      } else {
        throw new Error('Publish button missing after wait');
      }
    } catch (e) {
      this.log(`⚠️ First publish button issue: ${(e as Error).message}`);
      await this.dumpState('no_first_publish_btn');
      
      // Fallback: try finding it by text just in case
      const textBtn = await this.page.$('button:has-text("Опубликовать")');
      if (textBtn) {
         const isDisabled = await textBtn.getAttribute('disabled') !== null;
         this.log(`Fallback button found. Disabled: ${isDisabled}`);
         if (!isDisabled) {
            await textBtn.click();
            await this.page.waitForTimeout(3000);
         }
      }
    }

    // 2. Second Publish Button (Modal)
    const secondBtnSelector = 'button[data-testid="publish-btn"][type="submit"]';
    
    try {
      const secondBtn = await this.page.waitForSelector(secondBtnSelector, { timeout: 10000 });
      if (secondBtn) {
        await secondBtn.click();
        this.log('✅ Clicked confirmation button');
        
        // Long polling for captcha
        await this.handleCaptcha(15);

        // Validate via URL redirect
        this.log('⏳ Waiting for redirect...');
        try {
          await this.page.waitForFunction(() => !window.location.href.includes('/editor/'), { timeout: 45000 });
          const finalUrl = this.page.url();
          this.log(`🔗 Published at: ${finalUrl}`);
          return { success: true, url: finalUrl };
        } catch (e) {
          await this.dumpState('publish_timeout');
          throw new Error('Publication timed out (no redirect)');
        }
      }
    } catch (e) {
      this.log('⚠️ Second publish button (modal) not found');
    }

    await this.dumpState('no_second_publish_btn');
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
            this.log('🤖 Captcha found in iframe');
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
      this.log('✅ Captcha clicked');
      await this.page?.waitForTimeout(3000);
    } catch (e) {
      this.log('⚠️ Failed to click captcha');
    }
  }

  private async close() {
    if (this.browser) await this.browser.close();
  }
}

export const playwrightService = new PlaywrightService();
