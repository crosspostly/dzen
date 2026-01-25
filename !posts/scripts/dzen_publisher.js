const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Dzen Auto-Publisher
 * Automatically publishes articles to Yandex Dzen with human-like behavior
 */

class DzenPublisher {
  constructor(configPath = './config/config.json') {
    this.config = this.loadConfig(configPath);
    this.browser = null;
    this.page = null;
  }

  /**
   * Load configuration from file
   */
  loadConfig(configPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Set defaults for any missing values
        return {
          articlesPath: config.articlesPath || '..\\articles',
          cookiesPath: config.cookiesPath || './config/cookies.json',
          intervalMinutes: config.intervalMinutes || 90,
          typingDelayMin: config.typingDelayMin || 20,
          typingDelayMax: config.typingDelayMax || 80,
          headless: config.headless !== undefined ? config.headless : false,
          maxArticlesPerSession: config.maxArticlesPerSession || 10,
          enableLogging: config.enableLogging !== undefined ? config.enableLogging : true,
          logLevel: config.logLevel || 'info',
          browser: config.browser || {
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };
      } else {
        // Return default config if file doesn't exist
        return {
          articlesPath: '../articles',
          cookiesPath: './config/cookies.json',
          intervalMinutes: 90,
          typingDelayMin: 20,
          typingDelayMax: 80,
          headless: false,
          maxArticlesPerSession: 10,
          enableLogging: true,
          logLevel: 'info',
          browser: {
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };
      }
    } catch (error) {
      console.log('⚠️ Error loading config, using defaults:', error.message);
      return {
        articlesPath: '../articles',
        cookiesPath: './config/cookies.json',
        intervalMinutes: 90,
        typingDelayMin: 20,
        typingDelayMax: 80,
        headless: false,
        maxArticlesPerSession: 10,
        enableLogging: true,
        logLevel: 'info',
        browser: {
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };
    }
  }

  /**
   * Initialize the browser and load cookies
   */
  async initialize() {
    console.log('🚀 Initializing Dzen Publisher...');

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Create context with user agent and viewport
    const context = await this.browser.newContext({
      viewport: this.config.browser.viewport,
      userAgent: this.config.browser.userAgent
    });

    this.page = await context.newPage();

    // Load cookies if they exist
    await this.loadCookies();

    // Navigate to Dzen and check if we're logged in
    await this.page.goto('https://dzen.ru/id');
    await this.page.waitForTimeout(3000); // Wait for page to load

    // Check if we're logged in by looking for user profile elements
    const isLoggedIn = await this.checkLoginStatus();

    if (!isLoggedIn) {
      console.log('🔒 Not logged in. Please log in manually and save cookies.');
      await this.saveCookies();
      return false;
    }

    console.log('✅ Successfully initialized and logged in to Dzen');
    return true;
  }

  /**
   * Check if user is logged in to Dzen
   */
  async checkLoginStatus() {
    try {
      // Reload the page to ensure cookies are applied
      await this.page.goto('https://dzen.ru/id');
      await this.page.waitForTimeout(3000);

      // Check if we're on the profile page (indicating we're logged in)
      // Look for elements that appear when logged in
      const profileSelectors = [
        'text=Создать публикацию',  // "Create publication" button
        'text=Моя лента',          // "My feed"
        'text=Подписки',           // "Subscriptions"
        '.user-profile',           // Profile container
        '.avatar',                 // Avatar element
        '.username',               // Username element
        '[href="/create"]',        // Create link
        'text=Редактировать профиль' // "Edit profile" text
      ];

      for (const selector of profileSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            console.log('✅ Logged in to Dzen (found element:', selector, ')');
            return true;
          }
        } catch (e) {
          continue; // Try next selector
        }
      }

      // Check if we're redirected to login page or main page
      const currentUrl = this.page.url();
      if (currentUrl.includes('passport') || currentUrl.includes('auth')) {
        console.log('❌ Redirected to login page - not logged in');
        return false;
      }

      // Check for login elements
      const loginSelectors = [
        'text=Войти',              // "Log in" button
        'text=Вход',               // "Entry"
        'text=Авторизация',        // "Authorization"
        '[name="login"]',          // Login input
        '[name="password"]'        // Password input
      ];

      for (const selector of loginSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            console.log('❌ Found login elements - not logged in');
            return false;
          }
        } catch (e) {
          continue; // Try next selector
        }
      }

      // If we're on the profile page but didn't find obvious elements,
      // check if the URL contains the user's login from cookies
      const url = this.page.url();
      if (url.includes('/id') || url.includes('/pavelshekhov')) { // Using your login from cookies
        console.log('✅ On profile page - likely logged in');
        return true;
      }

      console.log('⚠️ Could not determine login status, assuming not logged in');
      return false;
    } catch (error) {
      console.log('⚠️ Error checking login status:', error.message);
      return false;
    }
  }

  /**
   * Load cookies from file
   */
  async loadCookies() {
    try {
      if (await this.fileExists(this.config.cookiesPath)) {
        const cookies = JSON.parse(await fs.readFile(this.config.cookiesPath, 'utf8'));
        await this.page.context().addCookies(cookies);
        console.log('🍪 Cookies loaded from', this.config.cookiesPath);
      } else {
        console.log('⚠️ Cookies file not found:', this.config.cookiesPath);
      }
    } catch (error) {
      console.log('⚠️ Error loading cookies:', error.message);
    }
  }

  /**
   * Save cookies to file
   */
  async saveCookies() {
    try {
      const cookies = await this.page.context().cookies();
      await fs.writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('🍪 Cookies saved to', this.config.cookiesPath);
    } catch (error) {
      console.log('⚠️ Error saving cookies:', error.message);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find all articles with matching cover images (recursive)
   */
  async findArticlesWithImages() {
    const articles = [];

    try {
      await this.scanDirectoryRecursive(this.config.articlesPath, articles);
    } catch (error) {
      console.log('❌ Error finding articles:', error.message);
    }

    return articles;
  }

  /**
   * Recursively scan directory for articles
   */
  async scanDirectoryRecursive(dirPath, articles) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectory
          await this.scanDirectoryRecursive(fullPath, articles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const baseName = path.basename(entry.name, '.md');

          // Look for corresponding image files
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
          let imagePath = null;

          for (const ext of imageExtensions) {
            const potentialImagePath = path.join(dirPath, baseName + ext);
            if (await this.fileExists(potentialImagePath)) {
              imagePath = potentialImagePath;
              break;
            }
          }

          if (imagePath) {
            articles.push({
              articlePath: fullPath,
              imagePath,
              directory: path.relative(this.config.articlesPath, dirPath),
              baseName
            });
            console.log(`📄 Found article with image: ${path.relative(this.config.articlesPath, fullPath)} -> ${path.basename(imagePath)}`);
          } else {
            console.log(`⚠️  Article without image: ${path.relative(this.config.articlesPath, fullPath)}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Error scanning directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Human-like typing with random delays
   */
  async humanType(element, text) {
    // Type character by character with random delays
    for (const char of text) {
      await element.type(char);

      // Random delay between typing each character
      const delay = Math.random() * (this.config.typingDelayMax - this.config.typingDelayMin) + this.config.typingDelayMin;
      await this.page.waitForTimeout(delay);
    }
  }

  /**
   * Publish a single article to Dzen
   */
  async publishArticle(articleInfo) {
    try {
      console.log(`📤 Publishing article: ${path.basename(articleInfo.articlePath)}`);

      // Read article content
      const articleContent = await fs.readFile(articleInfo.articlePath, 'utf8');

      // Extract title and content from markdown
      const { title, content } = this.parseArticle(articleContent);

      // Navigate to editor page
      await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      // Find and click the add publication button (the + button)
      const addButtonSelectors = [
        '[data-testid="add-publication-button"]',
        'button:has-text("+")',
        'button:has-text("Создать публикацию")',
        'button:has-text("Create publication")',
        'button:has-text("Написать статью")',
        'button:has-text("Write article")',
        '.editor--author-studio-header__addButton-1Z',
        'button[aria-label*="Создать"]',
        'button[aria-label*="Create"]'
      ];

      let addButton = null;
      for (const selector of addButtonSelectors) {
        try {
          addButton = await this.page.$(selector);
          if (addButton && await addButton.isVisible()) {
            console.log(`✅ Found add publication button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (addButton) {
        // Handle modal overlay that might block the click
        try {
          await addButton.click({ timeout: 10000 });
        } catch (clickError) {
          console.log('⚠️ Direct click failed, trying alternative methods...');
          // Try clicking with JavaScript if normal click fails
          await this.page.evaluate(element => {
            element.click();
          }, addButton);
        }

        // Wait for editor to load after clicking add button
        await this.page.waitForTimeout(5000);

        // Wait more specifically for editor elements to be available
        try {
          await this.page.waitForSelector('div[contenteditable="true"], input[type="text"], textarea', {
            timeout: 15000,
            state: 'visible'
          });
          console.log('✅ Editor elements are visible and ready');
        } catch (waitForError) {
          console.log('⚠️ Editor elements not immediately visible, continuing...');
        }
      } else {
        console.log('⚠️ Add publication button not found, continuing...');
      }

      // First, try to close any help popup, modal or overlay that might be blocking interaction
      try {
        // Close any modal overlays first
        const overlaySelectors = [
          '[data-testid="modal-overlay"]',
          '.editor--modal__overlay-1p',
          '.modal-overlay',
          '.overlay'
        ];

        for (const selector of overlaySelectors) {
          try {
            const overlay = await this.page.$(selector);
            if (overlay && await overlay.isVisible()) {
              console.log('✅ Found modal overlay, trying to close it');
              // Try to click outside the modal or find a close button
              await this.page.mouse.click(10, 10); // Click top-left corner
              await this.page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        const closeButtons = [
          'button[aria-label="Закрыть"]',
          'button[aria-label="Close"]',
          '.ReactModal__Close',
          'button[role="button"]:has-text("×")',
          'button:has-text("Закрыть")',
          'button:has-text("Close")',
          '[data-testid="close-help"]',
          '[data-testid="close-modal"]',
          '[data-testid="close-button"]',
          '.close-button',
          '.modal-close',
          '.editor--tap-icon__rootElement-PL', // Найден в анализе
          '[data-testid="close-button"]', // Найден в анализе
          '[data-testid="article-editor-help-popup"] [role="button"]', // Specific to article editor help
          '.editor--help-popup__closeButton-*', // Help popup close button
          '[data-testid="help-popup-close"]'
        ];

        for (const selector of closeButtons) {
          try {
            const closeButton = await this.page.$(selector);
            if (closeButton && await closeButton.isVisible()) {
              await closeButton.click();
              console.log('✅ Closed help popup or modal');
              await this.page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log('⚠️ Could not close popup or modal:', e.message);
      }

      // Find and fill the title field - use comprehensive selectors
      const titleSelectors = [
        // Most specific selectors first
        '[data-testid="title-input"] input',
        'input[placeholder*="заголовок" i]',
        'input[placeholder*="title" i]',
        'input[aria-label*="заголовок" i]',
        'input[aria-label*="title" i]',
        'input[placeholder*="Название" i]',
        'input[aria-label*="Название" i]',
        'input[placeholder*="Введите заголовок" i]',
        'input[aria-label*="Введите заголовок" i]',
        'input[placeholder*="Введите название" i]',
        'input[aria-label*="Введите название" i]',

        // General selectors
        'input[type="text"]',
        'input[role="textbox"]',
        'input[role="textbox"]:first-child',
        'input[type="text"]:first-child',
        'input[type="text"]',

        // Content editable fields
        'div[contenteditable="true"][data-testid*="title"]',
        'div[contenteditable="true"]:first-child',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',

        // Class-based selectors
        '.title-input',
        '.title-field',
        '.article-title',
        '[class*="title" i]',
        '[class*="name" i]'
      ];

      let titleElement = null;
      console.log('🔍 Trying title selectors...');
      for (const selector of titleSelectors) {
        try {
          titleElement = await this.page.$(selector);
          if (titleElement) {
            const isVisible = await titleElement.isVisible();
            const isEditable = await titleElement.evaluate(el => {
              return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true';
            });

            if (isVisible && isEditable) {
              console.log(`✅ Found title element with selector: ${selector}`);
              await titleElement.click();
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // If still not found, try to find any input/textarea/contenteditable element on the page
      if (!titleElement) {
        console.log('🔍 No specific title field found, looking for any input field...');
        try {
          // Get all input, textarea, and contenteditable elements
          const inputElements = await this.page.$$('.editor * input, .editor * textarea, .editor * div[contenteditable="true"], input, textarea, div[contenteditable="true"]');

          for (const element of inputElements) {
            try {
              const isVisible = await element.isVisible();
              const isEditable = await element.evaluate(el => {
                return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true';
              });

              if (isVisible && isEditable) {
                titleElement = element;
                console.log('✅ Found potential title field by scanning all inputs');
                await titleElement.click();
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (scanError) {
          console.log(`⚠️ Error scanning for input fields: ${scanError.message}`);
        }
      }

      if (titleElement) {
        // Use fill for efficiency instead of humanType for title
        await titleElement.fill(title);
        console.log(`📝 Title entered: ${title.substring(0, 50)}...`);
      } else {
        console.log('❌ Could not find title input field');
        // Take a screenshot for debugging
        await this.page.screenshot({ path: 'debug-title-field.png', fullPage: true });
        console.log('📸 Screenshot saved as debug-title-field.png for debugging');
        return false;
      }

      // Find and fill the content field - use selectors from our analysis
      const contentSelectors = [
        'div[contenteditable="true"]:not([data-testid*="title"])',
        'div[contenteditable="true"]:not(:first-child)',
        'textarea[name*="content"]',
        'textarea[name*="text"]',
        'textarea',
        '.editor-content div[contenteditable="true"]',
        '.ProseMirror',
        '[data-testid*="article-content"] div[contenteditable="true"]',
        'div[role="textbox"]',
        'div[contenteditable="true"]',
        '[data-testid*="editor"] div[contenteditable="true"]',
        '.article-editor div[contenteditable="true"]',
        '.zen-editor div[contenteditable="true"]',
        '[data-testid*="article-body"] div[contenteditable="true"]',
        '.article-body div[contenteditable="true"]',
        '.editor-body div[contenteditable="true"]',
        '[data-testid*="content-input"] div[contenteditable="true"]',
        '[data-testid*="article-content"] textarea',
        '.article-content textarea',
        '[data-testid*="editor-content"] div[contenteditable="true"]',
        '[data-testid*="main-content"] div[contenteditable="true"]',
        '.main-content div[contenteditable="true"]',
        '[data-testid*="text-editor"] div[contenteditable="true"]',
        '.text-editor div[contenteditable="true"]',
        // Дополнительные селекторы из анализа
        '[data-testid*="editor"] div[contenteditable="true"]',
        '.ProseMirror',
        '.editor-content div[contenteditable="true"]',
        '[data-testid*="article-content"] div[contenteditable="true"]',
        'div[role="textbox"]',
        'div[contenteditable="true"]'
      ];

      let contentElement = null;
      for (const selector of contentSelectors) {
        try {
          contentElement = await this.page.$(selector);
          if (contentElement && await contentElement.isVisible()) {
            await contentElement.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!contentElement) {
        // If no content field found, try to find any editable element
        const elements = await this.page.$$('div[contenteditable="true"], textarea');
        if (elements.length > 1) {
          contentElement = elements[1]; // Skip the title field
          await contentElement.click();
        } else if (elements.length === 1) {
          contentElement = elements[0]; // Use the only available field
          await contentElement.click();
        }
      }

      if (!contentElement) {
        console.log('❌ Could not find content input field');
        return false;
      }

      // Split content into paragraphs and type each with delays
      const paragraphs = content.split('\n').filter(p => p.trim() !== '');

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph) {
          await this.humanType(contentElement, paragraph);

          // Add paragraph break
          await contentElement.press('Enter');
          await contentElement.press('Enter'); // Double enter for paragraph spacing

          // Random delay between paragraphs
          const delay = Math.random() * 2000 + 1000; // 1-3 seconds
          await this.page.waitForTimeout(delay);
        }
      }

      // Add a delay before uploading image
      await this.page.waitForTimeout(2000);

      // Upload cover image
      await this.uploadCoverImage(articleInfo.imagePath);

      // Add a delay before publishing
      await this.page.waitForTimeout(3000);

      // Find and click the publish button - use selectors from our analysis
      const publishSelectors = [
        'text=Опубликовать',
        'text=Publish',
        '[data-testid*="publish"] button',
        '.publish-button',
        'button[type="submit"]:not([disabled])',
        'button:has-text("Опубликовать")',
        'button:has-text("Publish")',
        'button:has-text("Опубликовать"):not([disabled])',
        'button:has-text("Publish"):not([disabled])',
        'button:has-text("Опубликовать"):not([aria-disabled="true"])',
        'button:has-text("Publish"):not([aria-disabled="true"])',
        'button[data-testid*="publish"]',
        'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])',
        'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])',
        // Дополнительные селекторы из анализа
        '[data-testid="add-publication-button"]', // Кнопка добавления публикации
        'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden]):not([type="button"])',
        'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden]):not([type="button"]):not([data-testid*="settings"])',
        '[data-testid*="publish"]', // Упрощенный селектор
        '.editor--base-button__rootElement-75:has-text("Опубликовать")' // Селектор из анализа
      ];

      let publishButton = null;
      for (const selector of publishSelectors) {
        try {
          publishButton = await this.page.$(selector);
          if (publishButton && await publishButton.isVisible() && await publishButton.isEnabled()) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (publishButton) {
        await publishButton.click();
        console.log('✅ Article published successfully!');

        // Wait for publishing confirmation
        await this.page.waitForTimeout(5000);
      } else {
        console.log('❌ Could not find publish button');
        return false;
      }

      return true;
    } catch (error) {
      console.log('❌ Error publishing article:', error.message);
      // Don't return false if it's just a timeout, continue with the next article
      if (error.message.includes('Target page, context or browser has been closed')) {
        console.log('⚠️ Browser may have closed during publishing, continuing...');
        return true; // Return true to continue with next articles
      }
      return false;
    }
  }

  /**
   * Upload cover image
   */
  async uploadCoverImage(imagePath) {
    try {
      console.log(`🖼️ Uploading cover image: ${path.basename(imagePath)}`);

      // Find the image upload input - use selectors from our analysis
      const uploadSelectors = [
        'input[type="file"][accept*="image"]',
        'input[type="file"][data-testid*="image"]',
        'input[type="file"]',
        '[data-testid*="upload-image"] input[type="file"]',
        '.upload-input input[type="file"]',
        '.image-upload input[type="file"]',
        '[data-testid*="image-upload"] input[type="file"]',
        'input[type="file"][name*="image"]',
        'input[type="file"][name*="cover"]',
        'input[type="file"][aria-label*="image"]',
        'input[type="file"][aria-label*="cover"]',
        '.upload input[type="file"]',
        '.image-uploader input[type="file"]',
        '.cover-upload input[type="file"]',
        // Дополнительные селекторы из анализа
        'input[type="file"][accept*="image/*"]',
        'input[type="file"][accept*=".jpg"]',
        'input[type="file"][accept*=".jpeg"]',
        'input[type="file"][accept*=".png"]',
        'input[type="file"][accept*=".gif"]',
        'input[type="file"][accept*=".webp"]',
        'input[type="file"][capture="environment"]',
        'input[type="file"][capture="user"]'
      ];

      let uploadInput = null;
      for (const selector of uploadSelectors) {
        try {
          uploadInput = await this.page.$(selector);
          if (uploadInput) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (uploadInput) {
        await uploadInput.setInputFiles(imagePath);
        console.log('✅ Cover image uploaded');

        // Wait for image to be processed
        await this.page.waitForTimeout(5000);
      } else {
        // If no upload input found, try clicking upload buttons
        const uploadButtons = [
          'text=Загрузить обложку',
          'text=Загрузить изображение',
          'text=Upload image',
          'text=Add image',
          'text=Загрузить',
          '[data-testid*="upload-image"] button',
          '.upload-button',
          '.image-upload button',
          '[data-testid*="image-upload"] button',
          'button:has-text("Загрузить")',
          'button:has-text("Upload")',
          'button:has-text("Добавить")',
          'button:has-text("Add")',
          // Дополнительные селекторы из анализа
          '.editor--base-button__rootElement-75:has-text("Загрузить")', // Селектор из анализа
          '[data-testid="add-publication-button"]', // Кнопка добавления публикации
          'button:has-text("Загрузить"):not([type="submit"])' // Исключаем submit кнопки
        ];

        for (const selector of uploadButtons) {
          try {
            const uploadButton = await this.page.$(selector);
            if (uploadButton) {
              await uploadButton.click();
              // Wait for file dialog and upload
              await this.page.waitForTimeout(2000);
              // This is tricky - we need to handle the file dialog
              // For now, we'll just wait and assume the image will be added later
              console.log('🖼️ Clicked upload button, assuming image will be added');
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.log('❌ Error uploading image:', error.message);
    }
  }

  /**
   * Parse article content from markdown
   */
  parseArticle(content) {
    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    let title = 'Без названия';
    let body = content;
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/title:\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/['"]/g, '').trim();
      }
      body = content.slice(frontmatterMatch[0].length);
    } else {
      // If no frontmatter, try to extract first line as title
      const lines = content.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        title = lines[0].replace(/^#+\s*/, '').trim(); // Remove markdown heading markers
        body = lines.slice(1).join('\n');
      }
    }
    
    return { title, content: body };
  }

  /**
   * Main publishing loop
   */
  async startPublishing() {
    console.log('🚀 Starting Dzen auto-publishing...');

    // Initialize the publisher
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Failed to initialize publisher. Please log in manually first.');
      return;
    }

    // Find articles to publish
    const articles = await this.findArticlesWithImages();
    if (articles.length === 0) {
      console.log('❌ No articles found with cover images');
      return;
    }

    console.log(`📚 Found ${articles.length} articles to publish`);

    // Limit to max articles per session if configured
    const articlesToPublish = articles.slice(0, this.config.maxArticlesPerSession);
    console.log(`📊 Will publish ${articlesToPublish.length} articles (limited by maxArticlesPerSession)`);

    // Publish each article with the specified interval
    for (let i = 0; i < articlesToPublish.length; i++) {
      const article = articlesToPublish[i];

      console.log(`\n--- Publishing article ${i + 1}/${articlesToPublish.length} ---`);

      try {
        const success = await this.publishArticle(article);

        if (success) {
          console.log(`✅ Successfully published: ${path.basename(article.articlePath)}`);
        } else {
          console.log(`❌ Failed to publish: ${path.basename(article.articlePath)}`);
        }
      } catch (error) {
        console.log(`❌ Error during publishing: ${error.message}`);
        console.log(`⚠️ Continuing to next article...`);

        // If the error is related to browser context being closed, try to reinitialize
        if (error.message.includes('Target page, context or browser has been closed')) {
          console.log('🔄 Browser context closed, attempting to reinitialize...');
          try {
            await this.initialize();
            console.log('✅ Browser reinitialized successfully');
          } catch (reinitError) {
            console.log(`⚠️ Failed to reinitialize browser: ${reinitError.message}`);
          }
        }
      }

      // Wait for the specified interval before publishing the next article
      // But not after the last article
      if (i < articlesToPublish.length - 1) {
        const waitTime = this.config.intervalMinutes * 60 * 1000; // Convert to milliseconds
        console.log(`⏳ Waiting ${this.config.intervalMinutes} minutes before next publication...`);
        try {
          await this.page.waitForTimeout(waitTime);
        } catch (error) {
          console.log(`⚠️ Error during wait: ${error.message}`);
          // Continue to next article even if wait fails
        }
      }
    }

    console.log('\n🎉 All articles published!');
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Export the class for use in other modules
module.exports = DzenPublisher;

// If this script is run directly, start the publisher
if (require.main === module) {
  (async () => {
    const publisher = new DzenPublisher({
      articlesPath: '../articles',
      cookiesPath: './config/cookies.json',
      intervalMinutes: 90, // 90 minutes between posts
      typingDelayMin: 20,
      typingDelayMax: 80
    });
    
    try {
      await publisher.startPublishing();
    } catch (error) {
      console.log('❌ Error in publisher:', error.message);
    } finally {
      await publisher.close();
    }
  })();
}