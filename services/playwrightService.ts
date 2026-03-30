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
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.12.0.0 Safari/537.36',
      permissions: ['clipboard-read', 'clipboard-write'] // Crucial for copy-paste
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
    try {
      // Close help popup and any modal overlay
      await this.page.evaluate(() => {
        document.querySelectorAll('.ReactModalPortal, .ReactModal__Overlay, [class*="overlay"], [class*="modal"], [class*="help-popup"]').forEach(el => {
          if (el.textContent?.includes('Понятно') || el.textContent?.includes('Закрыть') || el.textContent?.includes('Далее') || el.textContent?.includes('Что-то не загрузилось') || el.textContent?.includes('Помощь')) {
            el.remove();
          }
        });
        document.body.style.pointerEvents = 'auto';
      }).catch(() => {});

      // Try to close help popup by clicking close button
      try {
        const closeBtn = await this.page.$('[data-testid="close-button"], [class*="close"], .article-editor-desktop--close-cross__closeCross-35');
        if (closeBtn && await closeBtn.isVisible()) {
          await closeBtn.click({ force: true });
          this.log('✅ Closed modal via close button');
          await this.page.waitForTimeout(500);
        }
      } catch (e) {}

      // Try clicking on "Понятно" or "OK" button in help popup
      try {
        const okBtn = await this.page.$('button:has-text("Понятно"), button:has-text("OK"), button:has-text("Далее")');
        if (okBtn && await okBtn.isVisible()) {
          await okBtn.click({ force: true });
          this.log('✅ Closed modal via OK button');
          await this.page.waitForTimeout(500);
        }
      } catch (e) {}

      // Wait a bit for animations
      await this.page.waitForTimeout(1000);
    } catch (e) {}
  }

  private async navigateToEditor() {
    if (!this.page) throw new Error('Page not initialized');
    
    this.log('🌐 Navigating to Dzen editor...');
    
    // Try the OLD working URL from February 2026 first
    await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(10000);

    const title = await this.page.title();
    const url = this.page.url();
    this.log(`📄 Page loaded: "${title}" (${url})`);

    // Check for login redirection
    if (url.includes('passport.yandex') || url.includes('auth')) {
      await this.dumpState('login_redirect');
      throw new Error('Redirected to login page (cookies expired?)');
    }

    // Close modal if present
    try {
      const modalButton = await this.page.$('[data-testid="close-button"]');
      if (modalButton) {
        this.log('ℹ️ Modal found, closing...');
        await modalButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (e) {
      this.log('ℹ️ No modal to close');
    }

    await this.closeModals();
    await this.dumpState('step1_editor');

    // Click "Add Publication" - selectors from test scripts
    const addButtonSelectors = [
      // Data attributes (primary)
      '[data-testid="add-publication-button"]',
      '[data-testid="addPublicationButton"]',
      '[data-testid="create-article"]',
      '[data-testid="new-article"]',
      // Class-based
      '.new-publication-button',
      '.add-publication-button',
      '.create-button',
      '.studio-header__button',
      // Text-based
      'button:has-text("Создать")',
      'button:has-text("Добавить")',
      'button:has-text("Публикация")',
      // First button in header
      '.studio-header button:first-child',
      'header button:first-of-type',
    ];

    let addButton = null;
    for (const sel of addButtonSelectors) {
      try {
        addButton = await this.page.waitForSelector(sel, { timeout: 3000 });
        if (addButton && await addButton.isVisible()) {
          this.log(`✅ Found add button with selector: ${sel}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (!addButton) {
      this.log('❌ Add button not found');
      await this.dumpState('no-add-button');
      throw new Error('Add publication button not found');
    }

    await addButton.click();
    await this.page.waitForTimeout(3000);
    await this.closeModals();
    await this.dumpState('step2_menu_open');

    // Click "Write Article" / "Статья" - enhanced selectors from tests
    const writeSelectors = [
      // Text based (primary)
      'text="Написать статью"',
      'text="Статья"',
      'span:has-text("Статья")',
      'div:has-text("Статья")',
      'button:has-text("Статья")',
      'a:has-text("Статья")',
      // Class based
      '[class*="articleType"]:has-text("Статья")',
      '[class*="article-card"]:has-text("Статья")',
      '[class*="type-card"]:has-text("Статья")',
      '[class*="menu-item"]:has-text("Статья")',
      '[class*="dropdown-item"]:has-text("Статья")',
      // Data attributes
      '[data-testid="article-type"]',
      '[data-testid="write-article"]',
      '[data-testid="create-article"]',
      // Aria labels
      '[aria-label*="Статья"]',
      '[aria-label*="написать"]',
      // Role based
      '[role="menuitem"]:has-text("Статья")',
      '[role="button"]:has-text("Статья")',
      // Fallback: any clickable with "Статья" text
      '*:has-text("Статья")',
    ];

    let writeButton = null;
    for (const sel of writeSelectors) {
      try {
        writeButton = await this.page.waitForSelector(sel, { timeout: 2000 });
        if (writeButton && await writeButton.isVisible()) {
          this.log(`✅ Found write button with selector: ${sel}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (writeButton) {
      await writeButton.click({ force: true });
      this.log('✅ Clicked "Write Article" button');
      await this.page.waitForTimeout(10000);
      await this.closeModals();
    } else {
      this.log('⚠️ Write button not found - checking if already in editor...');
      // Try alternative: maybe menu auto-navigates, just wait
      await this.page.waitForTimeout(5000);
    }

    // Verify we're in editor - enhanced selectors from tests
    const editorCheckSelectors = [
      'h1[contenteditable="true"]',
      '[placeholder*="Заголовок"]',
      '[placeholder*="Название"]',
      '[data-testid="title-input"]',
      '[data-testid="article-title"]',
      '[data-testid="content-editor"]',
      '.title-input',
      '.article-title-input',
    ];

    let editorCheck = null;
    for (const selector of editorCheckSelectors) {
      try {
        editorCheck = await this.page.$(selector);
        if (editorCheck) {
          this.log(`✅ Editor verified with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (!editorCheck) {
      this.log('⚠️ Editor not detected, waiting longer...');
      await this.page.waitForTimeout(15000);
      await this.closeModals();
    }

    this.log('✅ Editor ready');
  }

  private async fillArticle(article: ArticleData) {
    if (!this.page) throw new Error('Page not initialized');

    this.log('📝 Looking for inputs...');
    
    // Enhanced input detection with multiple strategies
    const allInputs = await this.page.$$('input[type="text"], textarea, div[contenteditable="true"], [contenteditable="true"], h1[contenteditable="true"]');
    this.log(`Found ${allInputs.length} input elements`);
    
    // Debug: log all potential input elements
    const allElements = await this.page.$$('*');
    const potentialInputs = [];
    for (const el of allElements) {
      try {
        const tag = await el.evaluate(e => e.tagName);
        const type = await el.evaluate(e => (e as HTMLInputElement).type || '');
        const placeholder = await el.evaluate(e => (e as HTMLElement).getAttribute('placeholder') || '');
        const contentEditable = await el.evaluate(e => e.getAttribute('contenteditable'));
        const role = await el.evaluate(e => e.getAttribute('role'));
        const ariaLabel = await el.evaluate(e => e.getAttribute('aria-label'));
        const dataTestId = await el.evaluate(e => e.getAttribute('data-testid'));
        
        if (tag === 'INPUT' || tag === 'TEXTAREA' || contentEditable === 'true' || 
            placeholder.includes('Заголовок') || placeholder.includes('Название') ||
            role === 'textbox' || ariaLabel?.includes('Заголовок') || dataTestId?.includes('title')) {
          potentialInputs.push({ tag, type, placeholder, contentEditable, role, ariaLabel, dataTestId });
        }
      } catch (e) {}
    }
    
    if (potentialInputs.length > 0) {
      this.log(`🔍 Potential inputs found: ${potentialInputs.map(i => `${i.tag}[${i.placeholder || i.ariaLabel || i.dataTestId || 'no-attr'}]`).join(', ')}`);
    }
    
    if (allInputs.length === 0 && potentialInputs.length === 0) {
      await this.dumpState('no_inputs');
      throw new Error('No inputs found in editor');
    }

    // 1. Title - with enhanced selectors from test scripts
    const titleInputSelectors = [
      'h1[contenteditable="true"]',
      '[placeholder*="Заголовок"]',
      '[placeholder*="Название"]',
      '[data-testid="title-input"]',
      '[data-testid="article-title"]',
      '[data-testid="article-title-input"]',
      '.title-input',
      '.article-title-input',
      'input[type="text"][aria-label*="Заголовок"]',
      'input[type="text"][aria-label*="Название"]',
      '[role="textbox"][aria-label*="Заголовок"]',
      '[role="textbox"][aria-label*="Название"]',
    ];

    let titleInput = null;
    for (const selector of titleInputSelectors) {
      try {
        titleInput = await this.page.$(selector);
        if (titleInput && await titleInput.isVisible()) {
          this.log(`✅ Found title input: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (titleInput) {
      this.log('📝 Typing title...');
      await titleInput.focus();
      await titleInput.type(article.title, { delay: 100 });
    } else {
      // Fallback to first input
      if (allInputs.length > 0) {
        this.log('⚠️ Using first input for title...');
        await allInputs[0].focus();
        await allInputs[0].type(article.title, { delay: 100 });
      }
    }

    // 2. Content (Copy-Paste with clipboard)
    const contentInputSelectors = [
      '[data-testid="content-editor"]',
      '[contenteditable="true"]',
      '.editor-content',
      '.article-content',
      'textarea',
    ];

    let contentInput = null;
    for (const selector of contentInputSelectors) {
      try {
        contentInput = await this.page.$(selector);
        if (contentInput && await contentInput.isVisible()) {
          this.log(`✅ Found content input: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (contentInput) {
      this.log('📝 Pasting content...');
      await contentInput.focus();
      await this.page.evaluate((text) => navigator.clipboard.writeText(text), article.content);
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Control+V');
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('Enter');

      // Scroll simulation
      await this.page.mouse.wheel(0, 500);
      await this.page.waitForTimeout(1000);
      await this.page.mouse.wheel(0, -500);
    } else {
      // Fallback to second input
      if (allInputs.length > 1) {
        this.log('⚠️ Using second input for content...');
        await allInputs[1].focus();
        await this.page.evaluate((text) => navigator.clipboard.writeText(text), article.content);
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Control+V');
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.press('Enter');
        await this.page.mouse.wheel(0, 500);
        await this.page.waitForTimeout(1000);
        await this.page.mouse.wheel(0, -500);
      }
    }

    // 3. Image - вставка изображения через модальное окно
    if (article.imageUrl) {
      this.log('🖼️ Inserting image...');
      this.log(`   Image source: ${article.imageUrl}`);

      // Close any open modals first
      await this.closeModals();
      await this.page.waitForTimeout(1000);

      // 🔘 Кнопка "Вставить изображение" (сбоку редактора) - enhanced selectors from tests
      const sideImageBtnSelectors = [
        // Data attributes (primary from tests)
        '[data-testid="upload-image"]',
        '[data-testid="add-image"]',
        // Main selector from task
        '.article-editor-desktop--side-toolbar__sideToolbar-2f button.article-editor-desktop--side-button__sideButton-1z',
        // Tooltip based
        '[data-tip="Вставить изображение"]',
        // Aria labels
        'button[aria-label*="изображен"]',
        'button[aria-label*="Изображен"]',
        'button[aria-label*="image"]',
        'button[aria-label*="Image"]',
        'button[aria-label*="Добавить фото"]',
        // SVG icon based
        'button svg use[xlink:href="#add_gallery_e477--react"]',
        'button:has(svg use[*|href="#add_gallery"])',
        // Generic side button with icon
        '.article-editor-desktop--side-button__sideButton-1z',
        'button.article-editor-desktop--side-button__sideButton-1z',
        // Text based
        'button:has-text("Загрузить")',
        'button:has-text("Добавить фото")',
      ];

      let sideBtn = null;
      for (const selector of sideImageBtnSelectors) {
        try {
          // Для селекторов с use[xlink:href] нужен особый подход
          if (selector.includes('use[')) {
            const useElements = await this.page.$$('use[*|href*="#add_gallery"]');
            if (useElements.length > 0) {
              sideBtn = await useElements[0].evaluateHandle(el => el.closest('button'));
              if (sideBtn) {
                this.log(`✅ Found side image button via use element: ${selector}`);
                break;
              }
            }
          } else {
            sideBtn = await this.page.$(selector);
            if (sideBtn && await sideBtn.isVisible()) {
              this.log(`✅ Found side image button: ${selector}`);
              break;
            }
          }
        } catch (e) {}
      }

      // Если не нашли по специфичным селекторам - ищем любую боковую кнопку с SVG
      if (!sideBtn) {
        this.log('⚠️ Specific side button not found, trying generic approach...');
        const toolbar = await this.page.$('.article-editor-desktop--side-toolbar__sideToolbar-2f');
        if (toolbar) {
          const buttons = await toolbar.$$('button');
          for (const btn of buttons) {
            const svg = await btn.$('svg');
            if (svg) {
              sideBtn = btn;
              this.log('✅ Found side button with SVG in toolbar');
              break;
            }
          }
        }
      }

      if (sideBtn) {
        // Сначала закрываем все модальные окна которые могут блокировать клик
        this.log('🧹 Closing any blocking modals before image insertion...');
        await this.closeModals();
        
        // Проверяем что модальные окна закрыты
        const blockingModal = await this.page.$('.ReactModal__Overlay--after-open');
        if (blockingModal) {
          this.log('⚠️ Blocking modal still present, trying to close...');
          await this.page.evaluate(() => {
            document.querySelectorAll('.ReactModal__Overlay--after-open').forEach(el => el.remove());
          });
          await this.page.waitForTimeout(1000);
        }
        
        // Сначала кликаем в область контента чтобы установить фокус
        this.log('📍 Focusing content area before image insertion...');
        const contentArea = await this.page.$('[contenteditable="true"]');
        if (contentArea) {
          await contentArea.click();
          await this.page.waitForTimeout(500);
        }
        
        await sideBtn.click({ force: true });
        this.log('✅ Clicked side image button');
        
        // 🕐 Ждём появления модального окна
        this.log('⏳ Waiting for image modal to appear...');
        await this.page.waitForTimeout(3000);
        await this.dumpState('image_modal_open');
        await this.closeModals();
      } else {
        this.log('⚠️ Side image button not found - skipping image insertion');
        await this.dumpState('no_side_image_btn');
      }

      // 📥 Определяем тип источника изображения
      const isLocalFile = article.imageUrl.startsWith('/') || article.imageUrl.startsWith('file://');
      const isHttpUrl = article.imageUrl.startsWith('http://') || article.imageUrl.startsWith('https://');
      
      // Ждём появления модального окна
      await this.page.waitForTimeout(1000);
      
      if (isLocalFile) {
        // 🗂️ Загрузка локального файла через file input
        this.log('📁 Detected local file - using file upload method');
        
        // Ждём появления file input в модальном окне - enhanced selectors from tests
        const fileInputSelectors = [
          // Data attributes from tests
          'input[type="file"][data-testid="upload-image"]',
          'input[type="file"][data-testid="add-image"]',
          // Standard file inputs
          'input[type="file"][accept*="image"]',
          'input[type="file"][accept*="image/*"]',
          'input[type="file"][accept="image/*"]',
          // Class based
          '.article-editor-desktop--image-popup__fileInput-35',
          '.image-upload-input',
          '.file-upload-input',
          // Generic
          'input[type="file"]',
        ];
        
        let fileInput = null;
        for (const selector of fileInputSelectors) {
          try {
            // Пробуем дождаться появления элемента
            fileInput = await this.page.waitForSelector(selector, { timeout: 3000 });
            if (fileInput) {
              this.log(`✅ Found file input after waiting: ${selector}`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        // Если не нашли через waitForSelector, пробуем найти через $
        if (!fileInput) {
          for (const selector of fileInputSelectors) {
            try {
              fileInput = await this.page.$(selector);
              if (fileInput) {
                this.log(`✅ Found file input via $: ${selector}`);
                break;
              }
            } catch (e) {}
          }
        }
        
        if (fileInput) {
          await fileInput.setInputFiles(article.imageUrl);
          this.log('✅ Image file uploaded!');
          
          // Ждём пока изображение загрузится и сохранится
          this.log('⏳ Waiting for image to process and save...');
          await this.page.waitForTimeout(8000);
          
          // Проверяем что изображение появилось в статье
          const imageInArticle = await this.page.$('figure.zen-editor-block-image img');
          if (imageInArticle) {
            this.log('✅ Image appears in article content!');
          } else {
            this.log('⚠️ Image not found in article content');
          }
          
          // Проверяем нет ли ошибки сохранения
          const errorBlock = await this.page.$('.article-editor-desktop--error-block__visible-1s');
          if (errorBlock) {
            this.log('⚠️ Error block detected after image upload!');
            // Пробуем нажать "Сохранить еще раз"
            const retryBtn = await this.page.$('span:has-text("Сохранить еще раз")');
            if (retryBtn) {
              await retryBtn.click();
              this.log('✅ Clicked retry save button');
              await this.page.waitForTimeout(3000);
            }
          }
          
          await this.dumpState('file_uploaded');
        } else {
          this.log('⚠️ File input not found - trying URL input fallback...');
          await this.dumpState('no_file_input');
        }
      }
      
      if (isHttpUrl || !isLocalFile) {
        // 🔗 Вставка URL изображения - enhanced selectors from tests
        const urlInputSelectors = [
          // Data attributes from tests
          'input[type="text"][data-testid="image-url"]',
          'input[type="text"][data-testid="url-input"]',
          // Placeholder based (Russian)
          'input[type="text"][placeholder*="Ссылк"]',
          'input[type="text"][placeholder*="ссылк"]',
          'input[type="text"][placeholder*="URL"]',
          'input[type="text"][placeholder*="url"]',
          'input[type="text"][placeholder*="Вставьте ссылку"]',
          // Class based
          '.article-editor-desktop--image-popup__urlInput-25 input',
          '.image-url-input',
          '.url-input',
          // Generic visible text inputs
          'input[type="text"]:visible',
          'input:not([type]):visible',
          // Aria labels
          'input[aria-label*="URL"]',
          'input[aria-label*="ссылк"]',
        ];

        this.log('🔗 Using URL insertion method');
        let urlInput = null;
        for (const selector of urlInputSelectors) {
          try {
            urlInput = await this.page.waitForSelector(selector, { timeout: 3000 });
            if (urlInput) {
              this.log(`✅ Found URL input after waiting: ${selector}`);
              break;
            }
          } catch (e) {}
        }
        
        // Если не нашли через waitForSelector
        if (!urlInput) {
          for (const selector of urlInputSelectors) {
            try {
              urlInput = await this.page.$(selector);
              if (urlInput && await urlInput.isVisible()) {
                this.log(`✅ Found URL input via $: ${selector}`);
                break;
              }
            } catch (e) {}
          }
        }

        if (urlInput) {
          await urlInput.focus();
          await urlInput.fill(article.imageUrl);
          this.log(`✅ Image URL inserted: ${article.imageUrl}`);
          await this.page.waitForTimeout(1500);

          // Нажимаем Enter для подтверждения
          await this.page.keyboard.press('Enter');
          this.log('✅ Pressed Enter to confirm');
          await this.page.waitForTimeout(2000);
          
          await this.dumpState('url_inserted');
        } else {
          this.log('⚠️ URL input not found - image insertion failed');
          await this.dumpState('no_url_input');
        }
      }
      
      // Закрываем модальное окно если всё ещё открыто
      await this.closeModals();
      await this.page.waitForTimeout(1000);
    }
  }

  private async submitPublish(): Promise<{ success: boolean; url?: string }> {
    if (!this.page) throw new Error('Page not initialized');

    // 1. First Publish Button - with fallback selectors from test scripts
    const firstBtnSelectors = [
      'button[data-testid="article-publish-btn"]',  // Primary
      '[data-testid="publish-button"]',              // Fallback from tests
      '[data-testid="publish"]',                     // Fallback from tests
      'button:has-text("Опубликовать")',             // Text fallback
    ];

    let firstBtn = null;
    for (const selector of firstBtnSelectors) {
      try {
        this.log(`⏳ Trying first publish button: ${selector}`);
        firstBtn = await this.page.waitForSelector(`${selector}:not([disabled])`, { timeout: 5000 });
        if (firstBtn) {
          this.log(`✅ Found first publish button: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (firstBtn) {
      await firstBtn.click();
      this.log('✅ Clicked first publish button');
      await this.handleCaptcha();
      await this.page.waitForTimeout(3000);
      await this.dumpState('publish_modal');
    } else {
      this.log('❌ First publish button not found with any selector');
      await this.dumpState('no_first_publish_btn');
    }

    // 2. Second Publish Button (Modal) - with fallback selectors from test scripts
    const secondBtnSelectors = [
      'button[data-testid="publish-btn"][type="submit"]',  // Primary
      '[data-testid="publish-button"][type="submit"]',     // Fallback from tests
      '[data-testid="publish"][type="submit"]',            // Fallback from tests
      'button[type="submit"]:has-text("Опубликовать")',    // Text fallback
      'button:has-text("Опубликовать")',                   // Generic text fallback
    ];

    let secondBtn = null;
    for (const selector of secondBtnSelectors) {
      try {
        this.log(`⏳ Trying second publish button: ${selector}`);
        secondBtn = await this.page.waitForSelector(selector, { timeout: 5000 });
        if (secondBtn) {
          this.log(`✅ Found second publish button: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

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
    } else {
      this.log('⚠️ Second publish button (modal) not found with any selector');
      await this.dumpState('no_second_publish_btn');
    }

    return { success: false };
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
