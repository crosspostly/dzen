const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Enhanced Dzen Publisher with Full Logging
 */
class DzenPublisher {
  constructor(configPath = './config/config.json') {
    this.config = this.loadConfig(configPath);
    this.browser = null;
    this.page = null;
    this.logFile = `./logs/publisher-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    const logsDir = './logs';
    if (!require('fs').existsSync(logsDir)) {
      require('fs').mkdirSync(logsDir);
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    try {
      require('fs').appendFileSync(this.logFile, logMessage + '\n');
    } catch (e) {
      console.log(`Failed to write to log file: ${e.message}`);
    }
  }

  loadConfig(configPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          articlesPath: config.articlesPath || '../articles',
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
      this.log(`Error loading config, using defaults: ${error.message}`, 'ERROR');
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

  async initialize() {
    this.log('🚀 Initializing Dzen Publisher...');
    try {
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
      await this.page.goto('https://dzen.ru/id', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        this.log('🔒 Not logged in. Please log in manually and save cookies.', 'ERROR');
        await this.saveCookies();
        return false;
      }

      this.log('✅ Successfully initialized and logged in to Dzen');
      return true;
    } catch (error) {
      this.log(`❌ Error initializing publisher: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async checkLoginStatus() {
    try {
      await this.page.goto('https://dzen.ru/id', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      const profileSelectors = [
        'text=Создать публикацию',
        'text=Моя лента',
        'text=Подписки',
        '.user-profile',
        '.avatar',
        '.username',
        '[href="/create"]',
        'text=Редактировать профиль'
      ];

      for (const selector of profileSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            this.log(`✅ Logged in to Dzen (found element: ${selector})`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      const currentUrl = this.page.url();
      if (currentUrl.includes('passport') || currentUrl.includes('auth')) {
        this.log('❌ Redirected to login page - not logged in');
        return false;
      }

      const loginSelectors = [
        'text=Войти',
        'text=Вход',
        'text=Авторизация',
        '[name="login"]',
        '[name="password"]'
      ];

      for (const selector of loginSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            this.log('❌ Found login elements - not logged in');
            return false;
          }
        } catch (e) {
          continue;
        }
      }

      const url = this.page.url();
      if (url.includes('/id') || url.includes('/pavelshekhov')) {
        this.log('✅ On profile page - likely logged in');
        return true;
      }

      this.log('⚠️ Could not determine login status, assuming not logged in');
      return false;
    } catch (error) {
      this.log(`⚠️ Error checking login status: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async loadCookies() {
    try {
      if (await this.fileExists(this.config.cookiesPath)) {
        const cookies = JSON.parse(await fs.readFile(this.config.cookiesPath, 'utf8'));
        await this.page.context().addCookies(cookies);
        this.log(`🍪 Cookies loaded from ${this.config.cookiesPath}`);
      } else {
        this.log(`⚠️ Cookies file not found: ${this.config.cookiesPath}`, 'WARN');
      }
    } catch (error) {
      this.log(`⚠️ Error loading cookies: ${error.message}`, 'ERROR');
    }
  }

  async saveCookies() {
    try {
      const cookies = await this.page.context().cookies();
      await fs.writeFile(this.config.cookiesPath, JSON.stringify(cookies, null, 2));
      this.log(`🍪 Cookies saved to ${this.config.cookiesPath}`);
    } catch (error) {
      this.log(`⚠️ Error saving cookies: ${error.message}`, 'ERROR');
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async findArticlesWithImages() {
    const articles = [];
    try {
      await this.scanDirectoryRecursive(this.config.articlesPath, articles);
    } catch (error) {
      this.log(`❌ Error finding articles: ${error.message}`, 'ERROR');
    }
    return articles;
  }

  async scanDirectoryRecursive(dirPath, articles) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectoryRecursive(fullPath, articles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const baseName = path.basename(entry.name, '.md');

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
            this.log(`📄 Found article with image: ${path.relative(this.config.articlesPath, fullPath)} -> ${path.basename(imagePath)}`);
          } else {
            this.log(`⚠️  Article without image: ${path.relative(this.config.articlesPath, fullPath)}`, 'WARN');
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Error scanning directory ${dirPath}: ${error.message}`, 'ERROR');
    }
  }

  async humanType(element, text) {
    this.log(`📝 Typing text (${text.length} characters) with human-like delays...`);
    for (const char of text) {
      await element.type(char);

      const delay = Math.random() * (this.config.typingDelayMax - this.config.typingDelayMin) + this.config.typingDelayMin;
      await this.page.waitForTimeout(delay);
    }
    this.log('✅ Text typing completed');
  }

  async publishArticle(articleInfo) {
    try {
      this.log(`📤 Publishing article: ${path.basename(articleInfo.articlePath)}`);

      // Read article content
      const articleContent = await fs.readFile(articleInfo.articlePath, 'utf8');

      // Extract title and content from markdown
      const { title, content } = this.parseArticle(articleContent);
      this.log(`📝 Article title: ${title.substring(0, 50)}...`);
      this.log(`📝 Article content length: ${content.length} characters`);

      // Navigate to editor page
      this.log('🌐 Navigating to Dzen editor...');
      await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      // Handle modal overlays that might block interaction
      this.log('🔧 Handling potential modal overlays...');
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
            this.log('✅ Found modal overlay, attempting to close it');
            await this.page.mouse.click(10, 10); // Click top-left corner
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Close any help popups or modals
      const closeButtons = [
        'button[aria-label="Закрыть"]',
        'button[aria-label="Close"]',
        'button[role="button"]:has-text("×")',
        'button:has-text("Закрыть")',
        'button:has-text("Close")',
        '[data-testid="close-help"]',
        '[data-testid="close-modal"]',
        '[data-testid="close-button"]',
        '.close-button',
        '.modal-close',
        '.editor--tap-icon__rootElement-PL',
        '[data-testid="close-button"]',
        '[data-testid="article-editor-help-popup"] [role="button"]'
      ];

      for (const selector of closeButtons) {
        try {
          const closeButton = await this.page.$(selector);
          if (closeButton && await closeButton.isVisible()) {
            await closeButton.click();
            this.log('✅ Closed help popup or modal');
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Find and click the add publication button (the + button)
      this.log('🔍 Finding add publication button...');
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
            this.log(`✅ Found add publication button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (addButton) {
        this.log('🖱️ Clicking add publication button...');
        try {
          await addButton.click({ timeout: 10000 });
          this.log('✅ Successfully clicked add publication button');
        } catch (clickError) {
          this.log(`⚠️ Direct click failed: ${clickError.message}, trying alternative method...`);
          try {
            await this.page.evaluate(element => element.click(), addButton);
            this.log('✅ Successfully clicked via JavaScript evaluation');
          } catch (jsError) {
            this.log(`❌ All click methods failed: ${jsError.message}`, 'ERROR');
            return false;
          }
        }
        
        // Wait for editor to load after clicking add button
        await this.page.waitForTimeout(5000);
      } else {
        this.log('❌ Add publication button not found', 'ERROR');
        return false;
      }

      // Wait for editor to load - with error handling
      try {
        await this.page.waitForSelector('div[contenteditable="true"], textarea, input, [data-testid="title-input"]', { timeout: 15000 });
        this.log('✅ Editor loaded successfully');
      } catch (e) {
        this.log(`⚠️ Editor may have loaded differently: ${e.message}`, 'WARN');
      }

      // Find and fill the title field
      this.log('🔍 Finding title field...');
      const titleSelectors = [
        'input[placeholder*="заголов"]',
        'input[placeholder*="title"]',
        'input[aria-label*="заголов"]',
        'input[aria-label*="title"]',
        'input[placeholder*="Название"]',
        'input[aria-label*="Название"]',
        'div[contenteditable="true"]:first-child',
        'input[type="text"]:first-child',
        'input[type="text"]',
        'input[role="textbox"]:first-child',
        'input[role="textbox"]',
        '[data-testid="title-input"] input',
        'input[placeholder*="Введите"]',
        'input[aria-label*="Введите"]'
      ];

      let titleElement = null;
      for (const selector of titleSelectors) {
        try {
          titleElement = await this.page.$(selector);
          if (titleElement && await titleElement.isVisible()) {
            this.log(`✅ Found title element with selector: ${selector}`);
            await titleElement.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!titleElement) {
        // If no specific title field found, try to find any input field
        const elements = await this.page.$$('input[type="text"], textarea, div[contenteditable="true"]');
        if (elements.length > 0) {
          titleElement = elements[0];
          await titleElement.click();
          this.log('✅ Using first available input as title field');
        }
      }

      if (titleElement) {
        await titleElement.fill(title); // Use fill instead of type for efficiency
        this.log(`📝 Title entered: ${title.substring(0, 50)}...`);
      } else {
        this.log('❌ Could not find title input field', 'ERROR');
        return false;
      }

      // Find and fill the content field
      this.log('🔍 Finding content field...');
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
        '.text-editor div[contenteditable="true"]'
      ];

      let contentElement = null;
      for (const selector of contentSelectors) {
        try {
          contentElement = await this.page.$(selector);
          if (contentElement && await contentElement.isVisible()) {
            this.log(`✅ Found content element with selector: ${selector}`);
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
        this.log('❌ Could not find content input field', 'ERROR');
        return false;
      }

      // Fill content with human-like typing
      this.log('📝 Filling content with human-like typing...');
      await this.humanType(contentElement, content);

      // Add a delay before uploading image
      await this.page.waitForTimeout(2000);

      // Upload cover image
      await this.uploadCoverImage(articleInfo.imagePath);

      // Add a delay before publishing
      await this.page.waitForTimeout(3000);

      // Find and click the publish button
      this.log('🔍 Finding publish button...');
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
        '[data-testid*="publish"]', // Упрощенный селектор
        '.editor--base-button__rootElement-75:has-text("Опубликовать")' // Селектор из анализа
      ];

      let publishButton = null;
      for (const selector of publishSelectors) {
        try {
          publishButton = await this.page.$(selector);
          if (publishButton && await publishButton.isVisible() && await publishButton.isEnabled()) {
            this.log(`✅ Found publish button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (publishButton) {
        this.log('🖱️ Clicking publish button...');
        await publishButton.click();
        this.log('✅ Article published successfully!');

        // Wait for publishing confirmation
        await this.page.waitForTimeout(5000);
      } else {
        this.log('❌ Could not find publish button', 'ERROR');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`❌ Error publishing article: ${error.message}`, 'ERROR');
      if (error.message.includes('Target page, context or browser has been closed')) {
        this.log('⚠️ Browser may have closed during publishing, continuing...', 'WARN');
        return true;
      }
      return false;
    }
  }

  async uploadCoverImage(imagePath) {
    try {
      this.log(`🖼️ Uploading cover image: ${path.basename(imagePath)}`);

      // Find the image upload input
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
            this.log(`✅ Found upload input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (uploadInput) {
        await uploadInput.setInputFiles(imagePath);
        this.log('✅ Cover image uploaded');

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
          '.editor--base-button__rootElement-75:has-text("Загрузить")',
          '[data-testid="add-publication-button"]',
          'button:has-text("Загрузить"):not([type="submit"])'
        ];

        for (const selector of uploadButtons) {
          try {
            const uploadButton = await this.page.$(selector);
            if (uploadButton) {
              this.log(`🖱️ Clicking upload button: ${selector}`);
              await uploadButton.click();
              await this.page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      this.log(`❌ Error uploading image: ${error.message}`, 'ERROR');
    }
  }

  parseArticle(content) {
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
      const lines = content.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        title = lines[0].replace(/^#+\s*/, '').trim();
        body = lines.slice(1).join('\n');
      }
    }

    return { title, content: body };
  }

  async startPublishing() {
    this.log('🚀 Starting Dzen auto-publishing...');

    const initialized = await this.initialize();
    if (!initialized) {
      this.log('❌ Failed to initialize publisher. Please log in manually first.', 'ERROR');
      return;
    }

    const articles = await this.findArticlesWithImages();
    if (articles.length === 0) {
      this.log('❌ No articles found with cover images', 'ERROR');
      return;
    }

    this.log(`📚 Found ${articles.length} articles to publish`);

    const articlesToPublish = articles.slice(0, this.config.maxArticlesPerSession);
    this.log(`📊 Will publish ${articlesToPublish.length} articles (limited by maxArticlesPerSession)`);

    for (let i = 0; i < articlesToPublish.length; i++) {
      const article = articlesToPublish[i];

      this.log(`\n--- Publishing article ${i + 1}/${articlesToPublish.length} ---`);

      try {
        const success = await this.publishArticle(article);

        if (success) {
          this.log(`✅ Successfully published: ${path.basename(article.articlePath)}`);
        } else {
          this.log(`❌ Failed to publish: ${path.basename(article.articlePath)}`, 'ERROR');
        }
      } catch (error) {
        this.log(`❌ Error during publishing: ${error.message}`, 'ERROR');
        this.log(`⚠️ Continuing to next article...`, 'WARN');
      }

      if (i < articlesToPublish.length - 1) {
        const waitTime = this.config.intervalMinutes * 60 * 1000;
        this.log(`⏳ Waiting ${this.config.intervalMinutes} minutes before next publication...`);
        try {
          await this.page.waitForTimeout(waitTime);
        } catch (error) {
          this.log(`⚠️ Error during wait: ${error.message}`, 'WARN');
        }
      }
    }

    this.log('\n🎉 All articles published!');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the publisher if this script is executed directly
if (require.main === module) {
  (async () => {
    const publisher = new DzenPublisher();
    
    try {
      await publisher.startPublishing();
    } catch (error) {
      console.log(`❌ Error in publisher: ${error.message}`);
      console.log(error.stack);
    } finally {
      await publisher.close();
    }
  })();
}

module.exports = DzenPublisher;