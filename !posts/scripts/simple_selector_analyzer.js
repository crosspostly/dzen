const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Упрощенный скрипт для анализа структуры страницы Дзен и сбора селекторов
 */

class SimpleDzenAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🔍 Инициализация браузера...');
    this.browser = await chromium.launch({ 
      headless: false // Показываем браузер для анализа
    });
    this.page = await this.browser.newPage();
    
    // Загружаем куки для авторизации
    try {
      const cookies = JSON.parse(await fs.readFile('./config/cookies.json', 'utf8'));
      await this.page.context().addCookies(cookies);
      console.log('🍪 Куки загружены');
    } catch (error) {
      console.log('⚠️ Не удалось загрузить куки:', error.message);
    }
  }

  async analyzePage(url) {
    console.log(`🌐 Открытие страницы: ${url}`);
    
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 60000 // Увеличиваем таймаут
      });
      
      // Ждем полной загрузки страницы
      await this.page.waitForTimeout(10000);
      
      console.log('📊 Сбор информации о странице...');
      
      // Собираем информацию о важных элементах
      const pageStructure = await this.page.evaluate(() => {
        const result = {
          titleFields: [],
          contentFields: [],
          publishButtons: [],
          uploadFields: [],
          allInputs: [],
          allButtons: [],
          allDivs: []
        };
        
        // Собираем все input поля
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          const attrs = {};
          for (let attr of input.attributes) {
            attrs[attr.name] = attr.value;
          }
          
          const fieldInfo = {
            tagName: input.tagName,
            attributes: attrs,
            selectors: []
          };
          
          // Генерируем селекторы
          if (input.id) fieldInfo.selectors.push(`#${input.id}`);
          if (input.getAttribute('data-testid')) fieldInfo.selectors.push(`[data-testid="${input.getAttribute('data-testid')}"]`);
          if (input.getAttribute('name')) fieldInfo.selectors.push(`[name="${input.getAttribute('name')}"]`);
          if (input.getAttribute('placeholder')) fieldInfo.selectors.push(`[placeholder="${input.getAttribute('placeholder')}"]`);
          if (input.getAttribute('aria-label')) fieldInfo.selectors.push(`[aria-label="${input.getAttribute('aria-label')}"]`);
          
          // Определяем тип поля
          if (input.type === 'file') {
            result.uploadFields.push(fieldInfo);
          } else {
            result.allInputs.push(fieldInfo);
          }
          
          // Проверяем, является ли поле заголовком
          const placeholder = input.getAttribute('placeholder') || '';
          const ariaLabel = input.getAttribute('aria-label') || '';
          const id = input.id || '';
          const name = input.getAttribute('name') || '';
          
          if (placeholder.toLowerCase().includes('заголов') || 
              placeholder.toLowerCase().includes('title') ||
              ariaLabel.toLowerCase().includes('заголов') ||
              ariaLabel.toLowerCase().includes('title') ||
              id.toLowerCase().includes('title') ||
              id.toLowerCase().includes('заголов') ||
              name.toLowerCase().includes('title') ||
              name.toLowerCase().includes('заголов')) {
            result.titleFields.push(fieldInfo);
          }
        });
        
        // Собираем все textarea
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          const attrs = {};
          for (let attr of textarea.attributes) {
            attrs[attr.name] = attr.value;
          }
          
          const fieldInfo = {
            tagName: textarea.tagName,
            attributes: attrs,
            selectors: []
          };
          
          // Генерируем селекторы
          if (textarea.id) fieldInfo.selectors.push(`#${textarea.id}`);
          if (textarea.getAttribute('data-testid')) fieldInfo.selectors.push(`[data-testid="${textarea.getAttribute('data-testid')}"]`);
          if (textarea.getAttribute('name')) fieldInfo.selectors.push(`[name="${textarea.getAttribute('name')}"]`);
          if (textarea.getAttribute('placeholder')) fieldInfo.selectors.push(`[placeholder="${textarea.getAttribute('placeholder')}"]`);
          if (textarea.getAttribute('aria-label')) fieldInfo.selectors.push(`[aria-label="${textarea.getAttribute('aria-label')}"]`);
          
          result.allInputs.push(fieldInfo);
          
          // Проверяем, является ли поле содержимым
          const placeholder = textarea.getAttribute('placeholder') || '';
          const ariaLabel = textarea.getAttribute('aria-label') || '';
          const id = textarea.id || '';
          const name = textarea.getAttribute('name') || '';
          
          if (placeholder.toLowerCase().includes('содерж') ||
              placeholder.toLowerCase().includes('content') ||
              placeholder.toLowerCase().includes('text') ||
              ariaLabel.toLowerCase().includes('содерж') ||
              ariaLabel.toLowerCase().includes('content') ||
              ariaLabel.toLowerCase().includes('text') ||
              id.toLowerCase().includes('content') ||
              id.toLowerCase().includes('text') ||
              name.toLowerCase().includes('content') ||
              name.toLowerCase().includes('text')) {
            result.contentFields.push(fieldInfo);
          }
        });
        
        // Собираем все div с contenteditable
        const editableDivs = document.querySelectorAll('div[contenteditable="true"]');
        editableDivs.forEach(div => {
          const attrs = {};
          for (let attr of div.attributes) {
            attrs[attr.name] = attr.value;
          }
          
          const fieldInfo = {
            tagName: div.tagName,
            attributes: attrs,
            selectors: []
          };
          
          // Генерируем селекторы
          if (div.id) fieldInfo.selectors.push(`#${div.id}`);
          if (div.getAttribute('data-testid')) fieldInfo.selectors.push(`[data-testid="${div.getAttribute('data-testid')}"]`);
          if (div.getAttribute('name')) fieldInfo.selectors.push(`[name="${div.getAttribute('name')}"]`);
          if (div.getAttribute('placeholder')) fieldInfo.selectors.push(`[placeholder="${div.getAttribute('placeholder')}"]`);
          if (div.getAttribute('aria-label')) fieldInfo.selectors.push(`[aria-label="${div.getAttribute('aria-label')}"]`);
          
          result.allDivs.push(fieldInfo);
          
          // Проверяем, является ли div полем содержимого
          const placeholder = div.getAttribute('placeholder') || '';
          const ariaLabel = div.getAttribute('aria-label') || '';
          const id = div.id || '';
          const className = div.className || '';
          
          if (placeholder.toLowerCase().includes('содерж') ||
              placeholder.toLowerCase().includes('content') ||
              placeholder.toLowerCase().includes('text') ||
              ariaLabel.toLowerCase().includes('содерж') ||
              ariaLabel.toLowerCase().includes('content') ||
              ariaLabel.toLowerCase().includes('text') ||
              id.toLowerCase().includes('content') ||
              id.toLowerCase().includes('text') ||
              className.toLowerCase().includes('content') ||
              className.toLowerCase().includes('text') ||
              className.toLowerCase().includes('editor') ||
              className.toLowerCase().includes('prosemirror')) {
            result.contentFields.push(fieldInfo);
          }
        });
        
        // Собираем все кнопки
        const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
        buttons.forEach(button => {
          const attrs = {};
          for (let attr of button.attributes) {
            attrs[attr.name] = attr.value;
          }
          
          const textContent = button.textContent ? button.textContent.trim() : '';
          const innerHTML = button.innerHTML ? button.innerHTML.trim() : '';
          
          const buttonInfo = {
            tagName: button.tagName,
            attributes: attrs,
            textContent: textContent,
            innerHTML: innerHTML,
            selectors: []
          };
          
          // Генерируем селекторы
          if (button.id) buttonInfo.selectors.push(`#${button.id}`);
          if (button.getAttribute('data-testid')) buttonInfo.selectors.push(`[data-testid="${button.getAttribute('data-testid')}"]`);
          if (button.getAttribute('name')) buttonInfo.selectors.push(`[name="${button.getAttribute('name')}"]`);
          if (button.getAttribute('aria-label')) buttonInfo.selectors.push(`[aria-label="${button.getAttribute('aria-label')}"]`);
          
          result.allButtons.push(buttonInfo);
          
          // Проверяем, является ли кнопка кнопкой публикации
          const ariaLabel = button.getAttribute('aria-label') || '';
          const id = button.id || '';
          const className = button.className || '';
          
          if (textContent.toLowerCase().includes('опубликов') ||
              textContent.toLowerCase().includes('publish') ||
              ariaLabel.toLowerCase().includes('опубликов') ||
              ariaLabel.toLowerCase().includes('publish') ||
              id.toLowerCase().includes('publish') ||
              className.toLowerCase().includes('publish') ||
              className.toLowerCase().includes('publish')) {
            result.publishButtons.push(buttonInfo);
          }
        });
        
        return result;
      });
      
      return pageStructure;
    } catch (error) {
      console.error('❌ Ошибка при анализе страницы:', error.message);
      return null;
    }
  }

  async analyzeDzenEditor() {
    console.log('🔍 Анализ редактора Дзен...');
    
    // Сначала проверим, можем ли мы открыть основную страницу
    await this.page.goto('https://dzen.ru', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(3000);
    
    // Попробуем перейти к редактору через навигацию
    try {
      // Попробуем найти и перейти к профилю
      await this.page.goto('https://dzen.ru/profile/editor/potemki', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    } catch (error) {
      console.log('⚠️ Не удалось напрямую открыть редактор, пробуем через навигацию...');
      // Попробуем найти ссылку на редактор на странице профиля
      await this.page.goto('https://dzen.ru/profile', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    }
    
    await this.page.waitForTimeout(5000);
    
    // Теперь анализируем текущую страницу
    return await this.analyzePage(this.page.url());
  }

  async saveSelectors(pageStructure) {
    console.log('💾 Сохранение селекторов...');
    
    // Создаем объект с селекторами для использования в основном скрипте
    const selectorsForScript = {
      titleSelectors: [
        ...new Set(pageStructure.titleFields.map(field => field.selectors).flat())
      ],
      contentSelectors: [
        ...new Set(pageStructure.contentFields.map(field => field.selectors).flat())
      ],
      publishSelectors: [
        ...new Set(pageStructure.publishButtons.map(button => button.selectors).flat())
      ],
      uploadSelectors: [
        ...new Set(pageStructure.uploadFields.map(field => field.selectors).flat())
      ],
      allInputs: pageStructure.allInputs,
      allButtons: pageStructure.allButtons,
      allDivs: pageStructure.allDivs
    };
    
    // Добавляем дополнительные селекторы, которые могут быть полезны
    selectorsForScript.titleSelectors.push(
      'input[placeholder*="заголовок"]',
      'input[placeholder*="title"]',
      'input[aria-label*="заголовок"]',
      'input[aria-label*="title"]',
      'input[placeholder*="Заголовок"]',
      'input[aria-label*="Заголовок"]',
      'input[placeholder*="Введите заголовок"]',
      'input[aria-label*="Введите заголовок"]',
      'input[placeholder*="Title"]',
      'input[aria-label*="Title"]',
      'input[placeholder*="Enter title"]',
      'input[aria-label*="Enter title"]',
      'div[contenteditable="true"]:first-child',
      'input[type="text"]:first-child',
      'input[type="text"]',
      'input[name*="title"]',
      'input[role="textbox"]'
    );
    
    selectorsForScript.contentSelectors.push(
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
    );
    
    selectorsForScript.publishSelectors.push(
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
      'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])'
    );
    
    selectorsForScript.uploadSelectors.push(
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
      '.cover-upload input[type="file"]'
    );
    
    // Убираем дубликаты
    selectorsForScript.titleSelectors = [...new Set(selectorsForScript.titleSelectors)];
    selectorsForScript.contentSelectors = [...new Set(selectorsForScript.contentSelectors)];
    selectorsForScript.publishSelectors = [...new Set(selectorsForScript.publishSelectors)];
    selectorsForScript.uploadSelectors = [...new Set(selectorsForScript.uploadSelectors)];
    
    await fs.writeFile('dzen-selectors.json', JSON.stringify(selectorsForScript, null, 2), 'utf8');
    console.log('✅ Селекторы сохранены в dzen-selectors.json');
    
    // Также создаем отчет
    const report = {
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      statistics: {
        titleFields: pageStructure.titleFields.length,
        contentFields: pageStructure.contentFields.length,
        publishButtons: pageStructure.publishButtons.length,
        uploadFields: pageStructure.uploadFields.length,
        allInputs: pageStructure.allInputs.length,
        allButtons: pageStructure.allButtons.length,
        allDivs: pageStructure.allDivs.length
      },
      topTitleSelectors: pageStructure.titleFields.slice(0, 10).map(field => field.selectors).flat().slice(0, 20),
      topContentSelectors: pageStructure.contentFields.slice(0, 10).map(field => field.selectors).flat().slice(0, 20),
      topPublishSelectors: pageStructure.publishButtons.slice(0, 10).map(button => ({
        text: button.textContent,
        selectors: button.selectors
      })),
      topUploadSelectors: pageStructure.uploadFields.slice(0, 10).map(field => field.selectors).flat().slice(0, 20)
    };
    
    await fs.writeFile('dzen-analysis-report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log('✅ Отчет сохранен в dzen-analysis-report.json');
    
    return selectorsForScript;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new SimpleDzenAnalyzer();
  
  try {
    await analyzer.initialize();
    const pageStructure = await analyzer.analyzeDzenEditor();
    
    if (pageStructure) {
      const selectors = await analyzer.saveSelectors(pageStructure);
      
      console.log('\n📋 Статистика:');
      console.log(`- URL: ${analyzer.page.url()}`);
      console.log(`- Поля заголовков: ${pageStructure.titleFields.length}`);
      console.log(`- Поля содержимого: ${pageStructure.contentFields.length}`);
      console.log(`- Кнопки публикации: ${pageStructure.publishButtons.length}`);
      console.log(`- Поля загрузки: ${pageStructure.uploadFields.length}`);
      console.log(`- Всего input полей: ${pageStructure.allInputs.length}`);
      console.log(`- Всего кнопок: ${pageStructure.allButtons.length}`);
      console.log(`- Всего редактируемых div: ${pageStructure.allDivs.length}`);
      
      console.log('\n🎯 Найденные селекторы:');
      console.log(`- Заголовки: ${selectors.titleSelectors.length}`);
      console.log(`- Содержимое: ${selectors.contentSelectors.length}`);
      console.log(`- Публикация: ${selectors.publishSelectors.length}`);
      console.log(`- Загрузка: ${selectors.uploadSelectors.length}`);
      
    } else {
      console.log('❌ Не удалось проанализировать страницу');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await analyzer.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = SimpleDzenAnalyzer;