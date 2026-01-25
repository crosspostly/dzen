/**
 * Основной скрипт для публикации статей в Дзен
 * Использует точные селекторы, найденные в анализе
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

class DzenPublisher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.selectors = null;
  }

  async initialize() {
    console.log('🚀 Инициализация Dzen Publisher...');
    
    // Загружаем точные селекторы
    try {
      this.selectors = JSON.parse(await fs.readFile('./config/dzen-selectors.json', 'utf8'));
      console.log('🎯 Селекторы загружены');
    } catch (error) {
      console.log('⚠️ Не удалось загрузить селекторы, используем стандартные');
      // Используем селекторы из нашего анализа
      this.selectors = {
        titleSelectors: [
          'input[placeholder*="заголов"]',
          'input[placeholder*="title"]',
          'input[aria-label*="заголов"]',
          'input[aria-label*="title"]',
          'input[placeholder*="Название"]',
          'input[aria-label*="Название"]',
          'div[contenteditable="true"]:first-child',
          'input[type="text"]:first-child',
          'input[type="text"]'
        ],
        contentSelectors: [
          '[role="textbox"]',
          '.notranslate',
          '.public-DraftEditor-content',
          'div.notranslate',
          'div.notranslate.public-DraftEditor-content',
          'div[contenteditable="true"]',
          'div[role="textbox"]',
          '.notranslate.public-DraftEditor-content'
        ],
        publishSelectors: [
          '[data-testid="article-publish-btn"]',
          'button:has-text("Опубликовать")',
          '.article-editor-desktop--editor-header__editBtn-44',
          'button[data-testid="article-publish-btn"]',
          'button:has-text("Опубликовать"):not([disabled])',
          'button:has-text("Publish"):not([disabled])'
        ],
        uploadSelectors: [
          'input[type="file"][accept*="image"]',
          'input[type="file"]',
          '[data-testid*="upload"] input[type="file"]',
          '.upload input[type="file"]'
        ],
        modalSelectors: [
          '[aria-label="Закрыть"]',
          '[role="button"]:has-text("×")',
          '.article-editor-desktop--help-popup__helpPopup-Gq [role="button"]',
          '.article-editor-desktop--close-cross__closeCross-35',
          '[data-testid="close-help"]'
        ]
      };
    }
    
    // Запускаем браузер
    this.browser = await chromium.launch({ 
      headless: false 
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Загружаем куки
    try {
      const cookies = JSON.parse(await fs.readFile('./config/cookies.json', 'utf8'));
      await this.page.context().addCookies(cookies);
      console.log('🍪 Куки загружены');
    } catch (error) {
      console.log('⚠️ Не удалось загрузить куки:', error.message);
    }
  }

  async closeModals() {
    console.log('CloseOperation модальных окон...');
    
    for (const selector of this.selectors.modalSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`✅ Найдено модальное окно, закрываем: ${selector}`);
          await element.click();
          await this.page.waitForTimeout(1000);
          break; // Закрываем только первое найденное окно
        }
      } catch (e) {
        continue;
      }
    }
  }

  async publishArticle(articlePath, imagePath) {
    console.log(`📤 Публикация статьи: ${path.basename(articlePath)}`);
    
    try {
      // Переходим к редактору новой статьи
      await this.page.goto('https://dzen.ru/create/article', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(5000);
      
      // Закрываем модальные окна
      await this.closeModals();
      
      // Читаем содержимое статьи
      const content = await fs.readFile(articlePath, 'utf8');
      
      // Парсим заголовок и содержимое
      const { title, body } = this.parseMarkdown(content);
      
      console.log(`📝 Заголовок: ${title}`);
      console.log(`📄 Содержимое: ${body.substring(0, 100)}...`);
      
      // Находим и заполняем поле заголовка
      let titleField = null;
      for (const selector of this.selectors.titleSelectors) {
        try {
          titleField = await this.page.$(selector);
          if (titleField && await titleField.isVisible()) {
            console.log(`✅ Найдено поле заголовка: ${selector}`);
            await titleField.click();
            await titleField.fill(title);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!titleField) {
        console.log('⚠️ Поле заголовка не найдено, пробуем общий подход...');
        // Ищем первое поле ввода или редактируемый div
        const fallbackSelectors = [
          'input[type="text"]',
          'input[placeholder*="title"]',
          'input[placeholder*="заголов"]',
          'div[contenteditable="true"]:first-child',
          'div[role="textbox"]:first-child'
        ];
        
        for (const sel of fallbackSelectors) {
          try {
            titleField = await this.page.$(sel);
            if (titleField && await titleField.isVisible()) {
              await titleField.click();
              await titleField.fill(title);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!titleField) {
        throw new Error('Не удалось найти поле для заголовка');
      }
      
      // Добавляем задержку между заголовком и содержимым
      await this.page.waitForTimeout(2000);
      
      // Находим и заполняем поле содержимого
      let contentField = null;
      for (const selector of this.selectors.contentSelectors) {
        try {
          contentField = await this.page.$(selector);
          if (contentField && await contentField.isVisible()) {
            console.log(`✅ Найдено поле содержимого: ${selector}`);
            await contentField.click();
            
            // Вводим текст с имитацией человеческого поведения
            await this.typeLikeHuman(contentField, body);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!contentField) {
        console.log('⚠️ Поле содержимого не найдено, пробуем общий подход...');
        // Ищем редактируемый div (обычно для содержимого статьи)
        const contentSelectors = [
          'div[contenteditable="true"]',
          'div[role="textbox"]',
          '.public-DraftEditor-content',
          '.notranslate',
          'textarea',
          'div[contenteditable="true"]:not(:first-child)' // Не первое поле (не заголовок)
        ];
        
        for (const sel of contentSelectors) {
          try {
            contentField = await this.page.$(sel);
            if (contentField && await contentField.isVisible()) {
              await contentField.click();
              await this.typeLikeHuman(contentField, body);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!contentField) {
        throw new Error('Не удалось найти поле для содержимого');
      }
      
      // Добавляем задержку перед загрузкой изображения
      await this.page.waitForTimeout(3000);
      
      // Загружаем изображение обложки
      if (imagePath && await this.fileExists(imagePath)) {
        console.log(`🖼️ Загрузка изображения: ${path.basename(imagePath)}`);
        
        // Находим поле загрузки изображения
        let uploadField = null;
        for (const selector of this.selectors.uploadSelectors) {
          try {
            uploadField = await this.page.$(selector);
            if (uploadField) {
              await uploadField.setInputFiles(imagePath);
              console.log('✅ Изображение загружено');
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!uploadField) {
          console.log('⚠️ Поле загрузки изображения не найдено');
        }
      }
      
      // Добавляем задержку перед публикацией
      await this.page.waitForTimeout(3000);
      
      // Закрываем модальные окна перед публикацией
      await this.closeModals();
      
      // Находим и нажимаем кнопку публикации
      let publishButton = null;
      for (const selector of this.selectors.publishSelectors) {
        try {
          publishButton = await this.page.$(selector);
          if (publishButton && await publishButton.isVisible() && await publishButton.isEnabled()) {
            console.log(`✅ Найдена кнопка публикации: ${selector}`);
            await publishButton.click();
            console.log('✅ Статья отправлена на публикацию');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!publishButton) {
        console.log('⚠️ Кнопка публикации не найдена, пробуем общий подход...');
        // Ищем кнопку с текстом "Опубликовать" или "Publish"
        const publishSelectors = [
          'text=Опубликовать',
          'text=Publish',
          'button:has-text("Опубликовать")',
          'button:has-text("Publish")',
          'button:contains("Опубликовать")',
          'button:contains("Publish")',
          '.publish-btn',
          '[data-testid*="publish"]',
          '[data-testid*="create"]',
          '[data-testid*="add"]'
        ];
        
        for (const sel of publishSelectors) {
          try {
            publishButton = await this.page.$(sel);
            if (publishButton && await publishButton.isVisible() && await publishButton.isEnabled()) {
              await publishButton.click();
              console.log('✅ Статья отправлена на публикацию (через общий селектор)');
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!publishButton) {
        throw new Error('Не удалось найти кнопку публикации');
      }
      
      // Ждем завершения публикации
      await this.page.waitForTimeout(5000);
      
      console.log(`✅ Статья успешно опубликована: ${title}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Ошибка публикации статьи: ${error.message}`);
      return false;
    }
  }

  async typeLikeHuman(field, text) {
    // Разбиваем текст на абзацы
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (paragraph) {
        // Вводим текст по символам с задержками
        for (const char of paragraph) {
          await field.type(char, { delay: Math.random() * 100 + 50 }); // 50-150ms задержка
        }
        
        // Добавляем разрыв абзаца
        await field.press('Enter');
        await field.press('Enter');
        
        // Задержка между абзацами
        await this.page.waitForTimeout(Math.random() * 3000 + 2000); // 2-5 секунд
      }
    }
  }

  parseMarkdown(content) {
    // Простой парсер markdown для извлечения заголовка и тела
    const lines = content.split('\n');
    let title = '';
    let body = '';
    let inFrontmatter = false;
    let frontmatter = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          inFrontmatter = false;
          continue;
        }
      }
      
      if (inFrontmatter) {
        frontmatter += line + '\n';
        continue;
      }
      
      if (!title && line.startsWith('# ')) {
        title = line.substring(2).trim();
      } else if (!title && !line.startsWith('#') && line && !title) {
        // Если первый значимый текст не заголовок, используем его как заголовок
        title = line.substring(0, 100); // Первые 100 символов как заголовок
      }
      
      body += lines[i] + '\n';
    }
    
    // Если не нашли заголовок в markdown, ищем в frontmatter
    if (!title && frontmatter) {
      const titleMatch = frontmatter.match(/title:\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/['"]/g, '').trim();
      }
    }
    
    if (!title) {
      title = 'Без названия';
    }
    
    return { title, body: body.trim() };
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Основная функция публикации
async function main() {
  const publisher = new DzenPublisher();
  
  try {
    await publisher.initialize();
    
    // Находим статьи для публикации (папка articles находится в корне проекта)
    const articlesDir = path.join(__dirname, '..', '..', 'articles');
    const articles = [];
    
    const dirs = await fs.readdir(articlesDir, { withFileTypes: true });
    
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const dirPath = path.join(articlesDir, dir.name);
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          if (file.endsWith('.md')) {
            const articlePath = path.join(dirPath, file);
            const baseName = path.basename(file, '.md');
            
            // Ищем соответствующее изображение
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            let imagePath = null;
            
            for (const ext of imageExtensions) {
              const potentialImagePath = path.join(dirPath, baseName + ext);
              if (await publisher.fileExists(potentialImagePath)) {
                imagePath = potentialImagePath;
                break;
              }
            }
            
            if (imagePath) {
              articles.push({ articlePath, imagePath });
              console.log(`📄 Найдена статья с изображением: ${file}`);
            } else {
              console.log(`⚠️ Статья без изображения: ${file}`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Найдено ${articles.length} статей для публикации`);
    
    // Публикуем каждую статью с интервалом
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      console.log(`\n--- Публикация статьи ${i + 1}/${articles.length} ---`);
      
      const success = await publisher.publishArticle(article.articlePath, article.imagePath);
      
      if (success) {
        console.log(`✅ Статья опубликована: ${path.basename(article.articlePath)}`);
      } else {
        console.log(`❌ Ошибка публикации: ${path.basename(article.articlePath)}`);
      }
      
      // Ждем 90 минут перед следующей публикацией (только если не последняя статья)
      if (i < articles.length - 1) {
        console.log('⏳ Ожидание 90 минут перед следующей публикацией...');
        await new Promise(resolve => setTimeout(resolve, 90 * 60 * 1000)); // 90 минут
      }
    }
    
    console.log('\n🎉 Все статьи обработаны!');
    
  } catch (error) {
    console.error('❌ Ошибка в основном процессе:', error);
  } finally {
    await publisher.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DzenPublisher;