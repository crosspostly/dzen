const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Скрипт для точного анализа редактора статей Дзен
 * по прямому URL: https://dzen.ru/profile/editor/potemki#article-editor
 */

class DzenEditorAnalyzer {
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
    
    // Устанавливаем размер окна
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Загружаем куки для авторизации
    try {
      const cookiesPath = path.join(__dirname, '..', 'config', 'cookies.json');
      const cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf8'));
      await this.page.context().addCookies(cookies);
      console.log('🍪 Куки загружены');
    } catch (error) {
      console.log('⚠️ Не удалось загрузить куки:', error.message);
    }
  }

  async analyzeEditorPage() {
    console.log('🌐 Переход к редактору статей...');
    
    // Переходим прямо к редактору статей
    await this.page.goto('https://dzen.ru/profile/editor/potemki#article-editor', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(10000); // Подождем полной загрузки
    
    console.log('📍 Текущий URL:', this.page.url());
    console.log('🏷️ Заголовок страницы:', await this.page.title());
    
    // Анализируем структуру страницы
    const editorStructure = await this.page.evaluate(() => {
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
        
        // Пропускаем невидимые или слишком маленькие элементы
        if (rect.width < 5 || rect.height < 5) return;
        
        const attrs = {};
        for (let attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        
        const elementInfo = {
          tagName,
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className : '',
          attributes: attrs,
          textContent: el.textContent ? el.textContent.trim().substring(0, 100) : '',
          isVisible: !!(rect.width > 0 && rect.height > 0),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
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
            elementInfo.attributes.placeholder?.toLowerCase().includes('название') ||
            elementInfo.attributes.placeholder?.toLowerCase().includes('name') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('заголов') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('title') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('название') ||
            elementInfo.attributes['aria-label']?.toLowerCase().includes('name') ||
            elementInfo.id?.toLowerCase().includes('title') ||
            elementInfo.id?.toLowerCase().includes('заголов') ||
            elementInfo.id?.toLowerCase().includes('name') ||
            elementInfo.id?.toLowerCase().includes('название') ||
            elementInfo.className.toLowerCase().includes('title') ||
            elementInfo.className.toLowerCase().includes('заголов') ||
            elementInfo.className.toLowerCase().includes('name') ||
            elementInfo.className.toLowerCase().includes('название') ||
            elementInfo.className.toLowerCase().includes('headline') ||
            elementInfo.className.toLowerCase().includes('heading')
          );
          
          if (isTitleField) {
            elements.titleFields.push(elementInfo);
          }
          
          // Проверяем, является ли поле содержимым
          const isContentField = (
            elementInfo.className.toLowerCase().includes('content') ||
            elementInfo.className.toLowerCase().includes('body') ||
            elementInfo.className.toLowerCase().includes('article') ||
            elementInfo.className.toLowerCase().includes('editor') ||
            elementInfo.className.toLowerCase().includes('text') ||
            elementInfo.className.toLowerCase().includes('prosemirror') ||
            elementInfo.className.toLowerCase().includes('editable') ||
            elementInfo.className.toLowerCase().includes('draft') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('content') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('body') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('article') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('editor') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('text') ||
            elementInfo.id?.toLowerCase().includes('content') ||
            elementInfo.id?.toLowerCase().includes('body') ||
            elementInfo.id?.toLowerCase().includes('article') ||
            elementInfo.id?.toLowerCase().includes('editor') ||
            elementInfo.id?.toLowerCase().includes('text')
          );
          
          if (isContentField) {
            elements.contentFields.push(elementInfo);
          }
        }
        
        // Собираем кнопки
        if (tagName === 'button' || 
            el.getAttribute('role') === 'button' || 
            (tagName === 'input' && ['submit', 'button'].includes(el.type))) {
          elements.allButtons.push(elementInfo);
          
          // Проверяем, является ли кнопка публикацией
          const isPublishButton = (
            elementInfo.textContent.toLowerCase().includes('опубликов') ||
            elementInfo.textContent.toLowerCase().includes('publish') ||
            elementInfo.textContent.toLowerCase().includes('готово') ||
            elementInfo.textContent.toLowerCase().includes('done') ||
            elementInfo.textContent.toLowerCase().includes('отправ') ||
            elementInfo.textContent.toLowerCase().includes('send') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('publish') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('done') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('ready') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('send') ||
            elementInfo.id?.toLowerCase().includes('publish') ||
            elementInfo.id?.toLowerCase().includes('done') ||
            elementInfo.id?.toLowerCase().includes('send') ||
            elementInfo.className.toLowerCase().includes('publish') ||
            elementInfo.className.toLowerCase().includes('done') ||
            elementInfo.className.toLowerCase().includes('send') ||
            elementInfo.className.toLowerCase().includes('publish-btn') ||
            elementInfo.className.toLowerCase().includes('submit') ||
            elementInfo.className.toLowerCase().includes('confirm') ||
            elementInfo.className.toLowerCase().includes('post')
          );
          
          if (isPublishButton) {
            elements.publishButtons.push(elementInfo);
          }
        }
        
        // Собираем поля загрузки изображений
        if (tagName === 'input' && el.type === 'file') {
          elements.imageUploads.push(elementInfo);
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
              elementInfo.className.toLowerCase().includes('overlay') ||
              elementInfo.className.toLowerCase().includes('help') ||
              elementInfo.className.toLowerCase().includes('hint') ||
              elementInfo.className.toLowerCase().includes('tip') ||
              elementInfo.className.toLowerCase().includes('tour') ||
              elementInfo.className.toLowerCase().includes('guide')) {
            elements.modals.push(elementInfo);
          }
        }
        
        // Собираем формы
        if (tagName === 'form') {
          elements.forms.push(elementInfo);
        }
      });
      
      return elements;
    });
    
    return editorStructure;
  }

  generatePreciseSelectors(elementInfo) {
    const selectors = [];
    
    // ID селектор
    if (elementInfo.id) {
      selectors.push(`#${elementInfo.id}`);
    }
    
    // Class селекторы (первые 3 класса)
    if (elementInfo.className) {
      const classes = elementInfo.className.split(/\s+/).filter(c => c);
      for (const cls of classes.slice(0, 3)) {
        if (cls) selectors.push(`.${cls}`);
      }
      
      // Комбинированные селекторы
      if (classes.length >= 1) {
        selectors.push(`${elementInfo.tagName}.${classes[0]}`);
      }
      if (classes.length >= 2) {
        selectors.push(`${elementInfo.tagName}.${classes[0]}.${classes[1]}`);
      }
      if (classes.length >= 3) {
        selectors.push(`${elementInfo.tagName}.${classes[0]}.${classes[1]}.${classes[2]}`);
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
      // Частичное совпадение
      const partialPlaceholder = elementInfo.attributes.placeholder.substring(0, Math.min(20, elementInfo.attributes.placeholder.length));
      if (partialPlaceholder) {
        selectors.push(`[placeholder*="${partialPlaceholder}"]`);
      }
    }
    
    // Aria-label селектор
    if (elementInfo.attributes['aria-label']) {
      selectors.push(`[aria-label="${elementInfo.attributes['aria-label']}"]`);
      const partialLabel = elementInfo.attributes['aria-label'].substring(0, Math.min(20, elementInfo.attributes['aria-label'].length));
      if (partialLabel) {
        selectors.push(`[aria-label*="${partialLabel}"]`);
      }
    }
    
    // Role селектор
    if (elementInfo.attributes.role) {
      selectors.push(`[role="${elementInfo.attributes.role}"]`);
    }
    
    // Tag селектор
    selectors.push(elementInfo.tagName);
    
    // Селекторы с несколькими атрибутами
    if (elementInfo.attributes['data-testid'] && elementInfo.className) {
      const firstClass = elementInfo.className.split(/\s+/)[0];
      if (firstClass) {
        selectors.push(`[data-testid="${elementInfo.attributes['data-testid']}"].${firstClass}`);
      }
    }
    
    if (elementInfo.id && elementInfo.className) {
      const firstClass = elementInfo.className.split(/\s+/)[0];
      if (firstClass) {
        selectors.push(`#${elementInfo.id}.${firstClass}`);
      }
    }
    
    // Селекторы по содержимому текста (для кнопок)
    if (elementInfo.textContent && elementInfo.tagName === 'button') {
      selectors.push(`button:has-text("${elementInfo.textContent.substring(0, Math.min(30, elementInfo.textContent.length))}")`);
    }
    
    // Селекторы по содержимому текста (для других элементов)
    if (elementInfo.textContent && elementInfo.tagName !== 'button') {
      const text = elementInfo.textContent.substring(0, Math.min(30, elementInfo.textContent.length)).replace(/"/g, "'");
      if (text) {
        selectors.push(`text="${text}"`);
      }
    }
    
    return [...new Set(selectors)]; // Уникальные селекторы
  }

  async analyzeAndSave() {
    try {
      await this.initialize();
      const structure = await this.analyzeEditorPage();
      
      // Генерируем точные селекторы для каждого элемента
      const enhancedStructure = {
        ...structure,
        titleFields: structure.titleFields.map(field => ({
          ...field,
          selectors: this.generatePreciseSelectors(field)
        })),
        contentFields: structure.contentFields.map(field => ({
          ...field,
          selectors: this.generatePreciseSelectors(field)
        })),
        publishButtons: structure.publishButtons.map(button => ({
          ...button,
          selectors: this.generatePreciseSelectors(button)
        })),
        imageUploads: structure.imageUploads.map(upload => ({
          ...upload,
          selectors: this.generatePreciseSelectors(upload)
        })),
        modals: structure.modals.map(modal => ({
          ...modal,
          selectors: this.generatePreciseSelectors(modal)
        }))
      };
      
      // Создаем отчет с точной информацией
      const report = {
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        navigationPath: 'https://dzen.ru/profile/editor/potemki#article-editor',
        analysis: enhancedStructure,
        bestSelectors: {
          title: this.extractBestSelectors(enhancedStructure.titleFields),
          content: this.extractBestSelectors(enhancedStructure.contentFields),
          publish: this.extractBestSelectors(enhancedStructure.publishButtons),
          upload: this.extractBestSelectors(enhancedStructure.imageUploads),
          modals: this.extractBestSelectors(enhancedStructure.modals)
        },
        elementCounts: {
          titleFields: enhancedStructure.titleFields.length,
          contentFields: enhancedStructure.contentFields.length,
          publishButtons: enhancedStructure.publishButtons.length,
          imageUploads: enhancedStructure.imageUploads.length,
          modals: enhancedStructure.modals.length,
          allInputs: enhancedStructure.allInputs.length,
          allButtons: enhancedStructure.allButtons.length,
          allDivs: enhancedStructure.allDivs.length
        },
        recommendations: this.generateRecommendations(enhancedStructure)
      };
      
      // Сохраняем полный анализ
      await fs.writeFile('dzen-editor-analysis.json', JSON.stringify(report, null, 2), 'utf8');
      console.log('✅ Полный анализ сохранен в dzen-editor-analysis.json');
      
      // Создаем файл с лучшими селекторами для использования в публикаторе
      const selectorsForPublisher = {
        titleSelectors: this.extractBestSelectors(enhancedStructure.titleFields),
        contentSelectors: this.extractBestSelectors(enhancedStructure.contentFields),
        publishSelectors: this.extractBestSelectors(enhancedStructure.publishButtons),
        uploadSelectors: this.extractBestSelectors(enhancedStructure.imageUploads),
        modalSelectors: this.extractBestSelectors(enhancedStructure.modals),
        allSelectors: {
          titles: enhancedStructure.titleFields,
          contents: enhancedStructure.contentFields,
          publishes: enhancedStructure.publishButtons,
          uploads: enhancedStructure.imageUploads,
          modals: enhancedStructure.modals
        },
        directUrl: 'https://dzen.ru/profile/editor/potemki#article-editor',
        navigationInfo: {
          url: 'https://dzen.ru/profile/editor/potemki#article-editor',
          description: 'Прямой URL к редактору статей Дзен',
          note: 'Используйте этот URL для прямого доступа к редактору'
        }
      };
      
      await fs.writeFile('dzen-precise-selectors.json', JSON.stringify(selectorsForPublisher, null, 2), 'utf8');
      console.log('✅ Точные селекторы сохранены в dzen-precise-selectors.json');
      
      // Выводим статистику
      this.printStatistics(report);
      
      return selectorsForPublisher;
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
    
    // Оцениваем селекторы по качеству
    const selectorScores = new Map();
    
    elements.forEach(el => {
      if (el.selectors && Array.isArray(el.selectors)) {
        el.selectors.forEach(selector => {
          let score = 0;
          
          // ID селекторы самые точные
          if (selector.startsWith('#')) score += 100;
          
          // Data-testid селекторы очень хорошие
          if (selector.includes('[data-testid=')) score += 50;
          
          // Селекторы с role или aria-label хорошие
          if (selector.includes('[role=') || selector.includes('[aria-')) score += 30;
          
          // Комбинированные селекторы (тег + класс/ID) хорошие
          if ((selector.includes('.') || selector.includes('#')) && selector.includes('[')) score += 25;
          
          // Селекторы с атрибутами (кроме role/aria) средние
          if (selector.includes('[') && !selector.includes('[role=') && !selector.includes('[aria-')) score += 15;
          
          // Классовые селекторы средние
          if (selector.includes('.')) score += 10;
          
          // Текстовые селекторы менее надежные
          if (selector.includes('text=')) score += 5;
          
          // Простые теговые селекторы наименее надежные
          if (!selector.includes('#') && !selector.includes('.') && !selector.includes('[') && !selector.includes('text=')) score += 1;
          
          const currentScore = selectorScores.get(selector) || 0;
          selectorScores.set(selector, currentScore + score);
        });
      }
    });
    
    // Возвращаем селекторы, отсортированные по оценке
    return Array.from(selectorScores.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([selector]) => selector);
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.modals.length > 0) {
      recommendations.push('🚨 НАЙДЕНЫ МОДАЛЬНЫЕ ОКНА: Обязательно закрывайте их перед взаимодействием с элементами редактора');
    }
    
    if (analysis.titleFields.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕ ЗАГОЛОВКА: Используйте селекторы для поиска div[contenteditable="true"] или input[type="text"]');
    }
    
    if (analysis.contentFields.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕ СОДЕРЖИМОГО: Используйте селекторы для поиска div[contenteditable="true"] или textarea');
    }
    
    if (analysis.publishButtons.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНА КНОПКА ПУБЛИКАЦИИ: Ищите кнопки с текстом "Опубликовать", "Publish", "Готово", "Done"');
    }
    
    if (analysis.imageUploads.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕ ЗАГРУЗКИ ИЗОБРАЖЕНИЯ: Ищите input[type="file"] или кнопки с текстом "Загрузить", "Upload"');
    }
    
    return recommendations;
  }

  printStatistics(report) {
    console.log('\n📋 СТАТИСТИКА АНАЛИЗА:');
    console.log(`- URL: ${report.url}`);
    console.log(`- Найдено полей заголовка: ${report.elementCounts.titleFields}`);
    console.log(`- Найдено полей содержимого: ${report.elementCounts.contentFields}`);
    console.log(`- Найдено кнопок публикации: ${report.elementCounts.publishButtons}`);
    console.log(`- Найдено полей загрузки изображений: ${report.elementCounts.imageUploads}`);
    console.log(`- Найдено модальных окон: ${report.elementCounts.modals}`);
    console.log(`- Всего input полей: ${report.elementCounts.allInputs}`);
    console.log(`- Всего кнопок: ${report.elementCounts.allButtons}`);
    console.log(`- Всего div элементов: ${report.elementCounts.allDivs}`);
    
    if (report.bestSelectors.title.length > 0) {
      console.log('\n🎯 ЛУЧШИЕ СЕЛЕКТОРЫ ДЛЯ ЗАГОЛОВКА:');
      report.bestSelectors.title.slice(0, 5).forEach((sel, i) => {
        console.log(`${i+1}. ${sel}`);
      });
    }
    
    if (report.bestSelectors.content.length > 0) {
      console.log('\n📝 ЛУЧШИЕ СЕЛЕКТОРЫ ДЛЯ СОДЕРЖИМОГО:');
      report.bestSelectors.content.slice(0, 5).forEach((sel, i) => {
        console.log(`${i+1}. ${sel}`);
      });
    }
    
    if (report.bestSelectors.publish.length > 0) {
      console.log('\n📤 ЛУЧШИЕ СЕЛЕКТОРЫ ДЛЯ ПУБЛИКАЦИИ:');
      report.bestSelectors.publish.slice(0, 5).forEach((sel, i) => {
        console.log(`${i+1}. ${sel}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      report.recommendations.forEach(rec => console.log(`• ${rec}`));
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new DzenEditorAnalyzer();
  
  try {
    await analyzer.analyzeAndSave();
    console.log('\n✅ АНАЛИЗ РЕДАКТОРА СТАТЕЙ ЗАВЕРШЕН!');
    console.log('Созданы файлы:');
    console.log('- dzen-editor-analysis.json - полный анализ структуры');
    console.log('- dzen-precise-selectors.json - точные селекторы для публикатора');
  } catch (error) {
    console.error('❌ Ошибка при выполнении анализа:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DzenEditorAnalyzer;