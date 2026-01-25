const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Скрипт для точного анализа структуры страницы Дзен
 * и получения точных селекторов для элементов
 */

class DzenPageAnalyzer {
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
    
    // Устанавливаем размер окна для лучшего отображения
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Загружаем куки для авторизации
    try {
      const cookies = JSON.parse(await fs.readFile('./config/cookies.json', 'utf8'));
      await this.page.context().addCookies(cookies);
      console.log('🍪 Куки загружены');
    } catch (error) {
      console.log('⚠️ Не удалось загрузить куки:', error.message);
    }
  }

  async navigateToEditor() {
    console.log('🌐 Переход к редактору Дзен...');
    
    // Переходим на страницу профиля
    await this.page.goto('https://dzen.ru/profile', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(3000);
    
    // Ищем и кликаем на кнопку перехода к редактору
    const editorSelectors = [
      'text=Создать публикацию',
      'text=Create publication',
      '[data-testid="add-publication-button"]',
      '.editor--author-studio-header__addButton-1Z',
      'button:has-text("Создать")',
      'button:has-text("Create")'
    ];
    
    let editorButton = null;
    for (const selector of editorSelectors) {
      try {
        editorButton = await this.page.$(selector);
        if (editorButton) {
          console.log(`✅ Найдена кнопка редактора: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (editorButton) {
      await editorButton.click();
      console.log('✅ Кликнули на кнопку редактора');
    } else {
      console.log('❌ Не удалось найти кнопку редактора, пробуем URL');
      await this.page.goto('https://dzen.ru/profile/editor/potemki#article-editor', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    }
    
    // Ждем полной загрузки редактора
    await this.page.waitForTimeout(10000);
  }

  async analyzePageStructure() {
    console.log('📊 Анализ структуры страницы...');
    
    // Выполняем анализ на стороне браузера
    const pageAnalysis = await this.page.evaluate(() => {
      const elements = {
        titleFields: [],
        contentFields: [],
        publishButtons: [],
        imageUploads: [],
        allInputs: [],
        allButtons: [],
        allDivs: [],
        modals: [],
        forms: []
      };
      
      // Собираем все элементы на странице
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const rect = el.getBoundingClientRect();
        
        // Пропускаем элементы вне области просмотра или слишком маленькие
        if (rect.width < 10 || rect.height < 10) return;
        
        const attrs = {};
        for (let attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        
        const elementInfo = {
          tagName,
          id: el.id || null,
          className: el.className || '',
          attributes: attrs,
          textContent: el.textContent ? el.textContent.trim().substring(0, 100) : '',
          isVisible: !!(rect.width > 0 && rect.height > 0),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        };
        
        // Определяем тип элемента
        if (tagName === 'input' || tagName === 'textarea' || el.contentEditable === 'true') {
          elements.allInputs.push(elementInfo);
          
          // Проверяем, является ли поле заголовком
          const isTitleField = (
            elementInfo.textContent.toLowerCase().includes('заголов') ||
            elementInfo.textContent.toLowerCase().includes('title') ||
            elementInfo.attributes.placeholder?.toLowerCase().includes('заголов') ||
            elementInfo.attributes.placeholder?.toLowerCase().includes('title') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('заголов') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('title') ||
            elementInfo.id?.toLowerCase().includes('title') ||
            elementInfo.id?.toLowerCase().includes('заголов') ||
            elementInfo.className.toLowerCase().includes('title') ||
            elementInfo.className.toLowerCase().includes('заголов')
          );
          
          if (isTitleField) {
            elements.titleFields.push(elementInfo);
          }
          
          // Проверяем, является ли поле содержимым
          const isContentField = (
            elementInfo.attributes['data-testid']?.toLowerCase().includes('content') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('body') ||
            elementInfo.id?.toLowerCase().includes('content') ||
            elementInfo.id?.toLowerCase().includes('body') ||
            elementInfo.className.toLowerCase().includes('content') ||
            elementInfo.className.toLowerCase().includes('body') ||
            elementInfo.className.toLowerCase().includes('editor') ||
            elementInfo.className.toLowerCase().includes('prosemirror')
          );
          
          if (isContentField) {
            elements.contentFields.push(elementInfo);
          }
        }
        
        // Собираем кнопки
        if (tagName === 'button' || el.getAttribute('role') === 'button' || tagName === 'input' && ['submit', 'button'].includes(el.type)) {
          elements.allButtons.push(elementInfo);
          
          // Проверяем, является ли кнопка публикации
          const isPublishButton = (
            elementInfo.textContent.toLowerCase().includes('опубликов') ||
            elementInfo.textContent.toLowerCase().includes('publish') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('publish') ||
            elementInfo.id?.toLowerCase().includes('publish') ||
            elementInfo.className.toLowerCase().includes('publish') ||
            elementInfo.className.toLowerCase().includes('publish-btn')
          );
          
          if (isPublishButton) {
            elements.publishButtons.push(elementInfo);
          }
        }
        
        // Собираем div элементы
        if (tagName === 'div') {
          elements.allDivs.push(elementInfo);
          
          // Проверяем, является ли div редактируемым
          if (el.contentEditable === 'true') {
            elements.contentFields.push(elementInfo);
          }
          
          // Проверяем, является ли div модальным окном
          if (elementInfo.className.toLowerCase().includes('modal') ||
              elementInfo.className.toLowerCase().includes('popup') ||
              elementInfo.className.toLowerCase().includes('overlay')) {
            elements.modals.push(elementInfo);
          }
        }
        
        // Собираем поля загрузки изображений
        if (tagName === 'input' && el.type === 'file') {
          elements.imageUploads.push(elementInfo);
        }
        
        // Собираем формы
        if (tagName === 'form') {
          elements.forms.push(elementInfo);
        }
      });
      
      return elements;
    });
    
    return pageAnalysis;
  }

  generateSpecificSelectors(elementInfo) {
    const selectors = [];
    
    // ID селектор
    if (elementInfo.id) {
      selectors.push(`#${elementInfo.id}`);
    }
    
    // Class селекторы
    if (elementInfo.className) {
      const classes = elementInfo.className.split(/\s+/);
      for (const cls of classes) {
        if (cls) selectors.push(`.${cls}`);
      }
    }
    
    // Data-testid селектор
    if (elementInfo.attributes['data-testid']) {
      selectors.push(`[data-testid="${elementInfo.attributes['data-testid']}"]`);
    }
    
    // Name селектор
    if (elementInfo.attributes.name) {
      selectors.push(`[name="${elementInfo.attributes.name}"]`);
    }
    
    // Placeholder селектор
    if (elementInfo.attributes.placeholder) {
      selectors.push(`[placeholder="${elementInfo.attributes.placeholder}"]`);
      selectors.push(`[placeholder*="${elementInfo.attributes.placeholder.substring(0, 20)}"]`);
    }
    
    // Aria-label селектор
    if (elementInfo.attributes['aria-label']) {
      selectors.push(`[aria-label="${elementInfo.attributes['aria-label']}"]`);
      selectors.push(`[aria-label*="${elementInfo.attributes['aria-label'].substring(0, 20)}"]`);
    }
    
    // Tag селектор
    selectors.push(elementInfo.tagName);
    
    // Комбинированные селекторы
    if (elementInfo.id) {
      selectors.push(`${elementInfo.tagName}#${elementInfo.id}`);
    }
    
    if (elementInfo.className) {
      const firstClass = elementInfo.className.split(/\s+/)[0];
      if (firstClass) {
        selectors.push(`${elementInfo.tagName}.${firstClass}`);
      }
    }
    
    // Селекторы с несколькими атрибутами
    if (elementInfo.attributes['data-testid'] && elementInfo.attributes.class) {
      selectors.push(`[data-testid="${elementInfo.attributes['data-testid']}"].${elementInfo.attributes.class.split(/\s+/)[0]}`);
    }
    
    return [...new Set(selectors)]; // Уникальные селекторы
  }

  async analyzeAndSave() {
    try {
      await this.initialize();
      await this.navigateToEditor();
      
      const analysis = await this.analyzePageStructure();
      
      // Генерируем специфические селекторы для каждого элемента
      const enhancedAnalysis = {
        ...analysis,
        titleFields: analysis.titleFields.map(field => ({
          ...field,
          selectors: this.generateSpecificSelectors(field)
        })),
        contentFields: analysis.contentFields.map(field => ({
          ...field,
          selectors: this.generateSpecificSelectors(field)
        })),
        publishButtons: analysis.publishButtons.map(button => ({
          ...button,
          selectors: this.generateSpecificSelectors(button)
        })),
        imageUploads: analysis.imageUploads.map(upload => ({
          ...upload,
          selectors: this.generateSpecificSelectors(upload)
        }))
      };
      
      // Создаем отчет с конкретными селекторами
      const report = {
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        analysis: enhancedAnalysis,
        specificSelectors: {
          title: this.extractBestSelectors(enhancedAnalysis.titleFields),
          content: this.extractBestSelectors(enhancedAnalysis.contentFields),
          publish: this.extractBestSelectors(enhancedAnalysis.publishButtons),
          upload: this.extractBestSelectors(enhancedAnalysis.imageUploads),
          modals: this.extractBestSelectors(enhancedAnalysis.modals)
        }
      };
      
      // Сохраняем полный анализ
      await fs.writeFile('dzen-full-analysis.json', JSON.stringify(report, null, 2), 'utf8');
      console.log('✅ Полный анализ сохранен в dzen-full-analysis.json');
      
      // Создаем файл с лучшими селекторами для использования в основном скрипте
      const bestSelectors = {
        titleSelectors: this.extractBestSelectors(enhancedAnalysis.titleFields),
        contentSelectors: this.extractBestSelectors(enhancedAnalysis.contentFields),
        publishSelectors: this.extractBestSelectors(enhancedAnalysis.publishButtons),
        uploadSelectors: this.extractBestSelectors(enhancedAnalysis.imageUploads),
        modalSelectors: this.extractBestSelectors(enhancedAnalysis.modals),
        allSelectors: {
          title: enhancedAnalysis.titleFields,
          content: enhancedAnalysis.contentFields,
          publish: enhancedAnalysis.publishButtons,
          upload: enhancedAnalysis.imageUploads,
          modals: enhancedAnalysis.modals
        }
      };
      
      await fs.writeFile('dzen-best-selectors.json', JSON.stringify(bestSelectors, null, 2), 'utf8');
      console.log('✅ Лучшие селекторы сохранены в dzen-best-selectors.json');
      
      // Выводим статистику
      this.printStatistics(enhancedAnalysis);
      
      return bestSelectors;
    } catch (error) {
      console.error('❌ Ошибка при анализе:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  extractBestSelectors(elements) {
    if (!elements || elements.length === 0) return [];
    
    const allSelectors = elements.flatMap(el => el.selectors);
    const selectorFrequency = {};
    
    // Подсчитываем частоту селекторов
    allSelectors.forEach(selector => {
      selectorFrequency[selector] = (selectorFrequency[selector] || 0) + 1;
    });
    
    // Возвращаем селекторы, отсортированные по частоте и специфичности
    return Object.entries(selectorFrequency)
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .map(([selector]) => selector);
  }

  printStatistics(analysis) {
    console.log('\n📋 Статистика анализа:');
    console.log(`- URL: ${this.page.url()}`);
    console.log(`- Поля заголовков: ${analysis.titleFields.length}`);
    console.log(`- Поля содержимого: ${analysis.contentFields.length}`);
    console.log(`- Кнопки публикации: ${analysis.publishButtons.length}`);
    console.log(`- Поля загрузки изображений: ${analysis.imageUploads.length}`);
    console.log(`- Модальные окна: ${analysis.modals.length}`);
    console.log(`- Всего input полей: ${analysis.allInputs.length}`);
    console.log(`- Всего кнопок: ${analysis.allButtons.length}`);
    console.log(`- Всего div элементов: ${analysis.allDivs.length}`);
    
    if (analysis.titleFields.length > 0) {
      console.log('\n🎯 Найденные поля заголовков:');
      analysis.titleFields.forEach((field, i) => {
        console.log(`${i+1}. ${field.tagName}#${field.id || 'no-id'} - ${field.textContent.substring(0, 50)}...`);
        console.log(`   Селекторы: ${field.selectors.slice(0, 3).join(', ')}`);
      });
    }
    
    if (analysis.contentFields.length > 0) {
      console.log('\n📝 Найденные поля содержимого:');
      analysis.contentFields.forEach((field, i) => {
        console.log(`${i+1}. ${field.tagName}#${field.id || 'no-id'} - ${field.textContent.substring(0, 50)}...`);
        console.log(`   Селекторы: ${field.selectors.slice(0, 3).join(', ')}`);
      });
    }
    
    if (analysis.publishButtons.length > 0) {
      console.log('\n📤 Найденные кнопки публикации:');
      analysis.publishButtons.forEach((button, i) => {
        console.log(`${i+1}. ${button.tagName}#${button.id || 'no-id'} - "${button.textContent.substring(0, 50)}..."`);
        console.log(`   Селекторы: ${button.selectors.slice(0, 3).join(', ')}`);
      });
    }
    
    if (analysis.modals.length > 0) {
      console.log('\n🚫 Найденные модальные окна (могут блокировать взаимодействие):');
      analysis.modals.forEach((modal, i) => {
        console.log(`${i+1}. ${modal.tagName}#${modal.id || 'no-id'} - ${modal.textContent.substring(0, 50)}...`);
        console.log(`   Селекторы: ${modal.selectors.slice(0, 3).join(', ')}`);
      });
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new DzenPageAnalyzer();
  
  try {
    await analyzer.analyzeAndSave();
    console.log('\n✅ Анализ завершен успешно!');
  } catch (error) {
    console.error('❌ Ошибка при выполнении анализа:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DzenPageAnalyzer;