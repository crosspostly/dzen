const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Скрипт для анализа структуры страницы Дзен и сбора всех возможных селекторов
 */

class DzenSelectorAnalyzer {
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
  }

  async analyzePage(url) {
    console.log(`🌐 Открытие страницы: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Ждем полной загрузки страницы
    await this.page.waitForTimeout(5000);
    
    console.log('📊 Сбор информации о странице...');
    
    // Собираем все элементы с их атрибутами
    const elementsInfo = await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const info = [];
      
      elements.forEach(el => {
        // Пропускаем системные элементы
        if (el.tagName && 
            !['HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT'].includes(el.tagName)) {
          
          const attrs = {};
          for (let attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          
          // Проверяем, является ли элемент полем ввода
          const isInputField = ['INPUT', 'TEXTAREA', 'DIV'].includes(el.tagName) && 
                              (el.contentEditable === 'true' || 
                               el.tagName === 'INPUT' || 
                               el.tagName === 'TEXTAREA');
          
          // Проверяем, является ли элемент кнопкой
          const isButton = ['BUTTON', 'A'].includes(el.tagName) || 
                          el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type) ||
                          el.getAttribute('role') === 'button' ||
                          el.getAttribute('type') === 'button';
          
          // Проверяем, является ли элемент полем заголовка
          const isTitleField = isInputField && 
                              (el.placeholder && el.placeholder.toLowerCase().includes('заголов') ||
                               el.placeholder && el.placeholder.toLowerCase().includes('title') ||
                               el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('заголов') ||
                               el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('title') ||
                               el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('title') ||
                               el.id && el.id.toLowerCase().includes('title') ||
                               el.id && el.id.toLowerCase().includes('заголов'));
          
          // Проверяем, является ли элемент полем содержимого
          const isContentField = isInputField && 
                                (el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('content') ||
                                 el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('body') ||
                                 el.id && el.id.toLowerCase().includes('content') ||
                                 el.id && el.id.toLowerCase().includes('body') ||
                                 el.classList.contains('ProseMirror') ||
                                 el.classList.contains('editor-content'));
          
          // Проверяем, является ли элемент кнопкой публикации
          const isPublishButton = isButton && 
                                 (el.textContent && el.textContent.toLowerCase().includes('опубликов') ||
                                  el.textContent && el.textContent.toLowerCase().includes('publish') ||
                                  el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('publish'));
          
          // Проверяем, является ли элемент полем загрузки изображений
          const isImageUpload = (el.tagName === 'INPUT' && el.type === 'file') ||
                               el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('upload') ||
                               el.getAttribute('data-testid') && el.getAttribute('data-testid').toLowerCase().includes('image');
          
          info.push({
            tagName: el.tagName.toLowerCase(),
            attributes: attrs,
            textContent: el.textContent ? el.textContent.trim().substring(0, 50) : '',
            isInputField,
            isButton,
            isTitleField,
            isContentField,
            isPublishButton,
            isImageUpload,
            selectors: this.generateSelectors(el)
          });
        }
      });
      
      return info;
    });
    
    return elementsInfo;
  }

  generateSelectors(element) {
    const selectors = [];
    
    // ID селектор
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Data-testid селектор
    if (element.getAttribute('data-testid')) {
      selectors.push(`[data-testid="${element.getAttribute('data-testid')}"]`);
    }
    
    // Class селекторы
    const classes = element.classList;
    if (classes.length > 0) {
      for (let cls of classes) {
        selectors.push(`.${cls}`);
      }
    }
    
    // Tag селектор
    selectors.push(element.tagName.toLowerCase());
    
    // Атрибутные селекторы
    for (let attr of element.attributes) {
      if (['placeholder', 'aria-label', 'title', 'name', 'type'].includes(attr.name)) {
        selectors.push(`[${attr.name}="${attr.value}"]`);
        selectors.push(`[${attr.name}*="${attr.value.substring(0, 20)}"]`); // Частичное совпадение
      }
    }
    
    // Комбинированные селекторы
    if (element.id) {
      selectors.push(`${element.tagName.toLowerCase()}#${element.id}`);
    }
    
    if (element.classList.length > 0) {
      const firstClass = element.classList[0];
      selectors.push(`${element.tagName.toLowerCase()}.${firstClass}`);
    }
    
    return [...new Set(selectors)]; // Уникальные селекторы
  }

  async analyzeDzenEditor() {
    console.log('🔍 Анализ редактора Дзен...');
    
    // Открываем редактор
    await this.page.goto('https://dzen.ru/profile/editor/potemki#article-editor', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(5000);
    
    // Собираем информацию о редакторе
    const editorInfo = await this.analyzePage('https://dzen.ru/profile/editor/potemki#article-editor');
    
    // Фильтруем только нужные типы элементов
    const relevantElements = editorInfo.filter(el => 
      el.isInputField || el.isButton || el.isTitleField || el.isContentField || 
      el.isPublishButton || el.isImageUpload
    );
    
    return {
      allElements: editorInfo,
      relevantElements: relevantElements,
      titleFields: editorInfo.filter(el => el.isTitleField),
      contentFields: editorInfo.filter(el => el.isContentField),
      publishButtons: editorInfo.filter(el => el.isPublishButton),
      imageUploads: editorInfo.filter(el => el.isImageUpload),
      allSelectors: this.extractAllSelectors(editorInfo)
    };
  }

  extractAllSelectors(elements) {
    const allSelectors = new Set();
    
    elements.forEach(el => {
      el.selectors.forEach(selector => {
        allSelectors.add(selector);
      });
    });
    
    return Array.from(allSelectors);
  }

  async saveAnalysis(analysis, filename) {
    console.log(`💾 Сохранение анализа в ${filename}...`);
    
    const analysisReport = {
      timestamp: new Date().toISOString(),
      url: 'https://dzen.ru/profile/editor/potemki#article-editor',
      totalElements: analysis.allElements.length,
      relevantElements: analysis.relevantElements.length,
      titleFields: analysis.titleFields.length,
      contentFields: analysis.contentFields.length,
      publishButtons: analysis.publishButtons.length,
      imageUploads: analysis.imageUploads.length,
      elements: analysis.relevantElements,
      selectors: {
        all: analysis.allSelectors,
        byType: {
          title: analysis.titleFields.map(el => el.selectors).flat(),
          content: analysis.contentFields.map(el => el.selectors).flat(),
          publish: analysis.publishButtons.map(el => el.selectors).flat(),
          upload: analysis.imageUploads.map(el => el.selectors).flat()
        }
      }
    };
    
    await fs.writeFile(filename, JSON.stringify(analysisReport, null, 2), 'utf8');
    console.log(`✅ Анализ сохранен в ${filename}`);
    
    // Также создаем отдельный файл с селекторами для использования в основном скрипте
    const selectorsForScript = {
      titleSelectors: [...new Set(analysis.titleFields.map(el => el.selectors).flat())],
      contentSelectors: [...new Set(analysis.contentFields.map(el => el.selectors).flat())],
      publishSelectors: [...new Set(analysis.publishButtons.map(el => el.selectors).flat())],
      uploadSelectors: [...new Set(analysis.imageUploads.map(el => el.selectors).flat())]
    };
    
    await fs.writeFile('dzen-selectors.json', JSON.stringify(selectorsForScript, null, 2), 'utf8');
    console.log('✅ Селекторы для скрипта сохранены в dzen-selectors.json');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new DzenSelectorAnalyzer();
  
  try {
    await analyzer.initialize();
    const analysis = await analyzer.analyzeDzenEditor();
    await analyzer.saveAnalysis(analysis, 'dzen-analysis.json');
    
    console.log('\n📋 Статистика:');
    console.log(`- Всего элементов: ${analysis.allElements.length}`);
    console.log(`- Релевантных элементов: ${analysis.relevantElements.length}`);
    console.log(`- Поля заголовков: ${analysis.titleFields.length}`);
    console.log(`- Поля содержимого: ${analysis.contentFields.length}`);
    console.log(`- Кнопки публикации: ${analysis.publishButtons.length}`);
    console.log(`- Поля загрузки изображений: ${analysis.imageUploads.length}`);
    console.log(`- Уникальных селекторов: ${analysis.allSelectors.length}`);
    
    console.log('\n🎯 Топ-10 селекторов для полей заголовка:');
    analysis.titleFields.slice(0, 10).forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName} - ${el.textContent || 'без текста'}`);
      console.log(`   Селекторы: ${el.selectors.slice(0, 3).join(', ')}`);
    });
    
    console.log('\n🎯 Топ-10 селекторов для полей содержимого:');
    analysis.contentFields.slice(0, 10).forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName} - ${el.textContent || 'без текста'}`);
      console.log(`   Селекторы: ${el.selectors.slice(0, 3).join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  } finally {
    await analyzer.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DzenSelectorAnalyzer;