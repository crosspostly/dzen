const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Улучшенный скрипт для анализа структуры страницы Дзен
 * с правильной навигацией к редактору
 */

class EnhancedDzenAnalyzer {
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

  async navigateToEditorCorrectly() {
    console.log('🌐 Переход к редактору Дзен через правильную навигацию...');
    
    // Переходим на главную страницу профиля
    await this.page.goto('https://dzen.ru/profile', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(3000);
    
    // Ищем и кликаем на кнопку "Создать публикацию"
    const selectorsToTry = [
      'text=Создать публикацию',
      'text=Создать',
      'text=Create publication',
      'text=Create',
      '[data-testid="create-publication"]',
      '[data-testid="add-publication"]',
      '[data-testid="new-publication"]',
      '.create-publication-button',
      '.new-publication-button',
      'button:has-text("Создать")',
      'button:has-text("Create")',
      'a:has-text("Создать публикацию")',
      'a:has-text("Создать")',
      '[href*="/create"]',
      '[href*="editor"]'
    ];
    
    let foundButton = false;
    for (const selector of selectorsToTry) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`✅ Найден элемент: ${selector}`);
          await element.click();
          console.log(`✅ Кликнули на элемент: ${selector}`);
          foundButton = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!foundButton) {
      console.log('❌ Не удалось найти кнопку создания публикации на странице профиля');
      // Попробуем перейти напрямую к созданию
      await this.page.goto('https://dzen.ru/create', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
    }
    
    // Ждем загрузки редактора
    await this.page.waitForTimeout(10000);
    
    // Проверим текущий URL
    console.log(`📍 Текущий URL: ${this.page.url()}`);
  }

  async analyzeEditorStructure() {
    console.log('📊 Анализ структуры редактора...');
    
    // Выполняем анализ на стороне браузера
    const editorAnalysis = await this.page.evaluate(() => {
      const elements = {
        titleFields: [],
        contentFields: [],
        publishButtons: [],
        imageUploads: [],
        allInputs: [],
        allButtons: [],
        allDivs: [],
        modals: [],
        forms: [],
        specificEditorElements: []
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
          className: typeof el.className === 'string' ? el.className : '',
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
        
        // Проверяем, является ли элемент специфичным для редактора
        const isEditorElement = (
          elementInfo.className.toLowerCase().includes('editor') ||
          elementInfo.className.toLowerCase().includes('article') ||
          elementInfo.className.toLowerCase().includes('content') ||
          elementInfo.className.toLowerCase().includes('title') ||
          elementInfo.className.toLowerCase().includes('publish') ||
          elementInfo.className.toLowerCase().includes('upload') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('editor') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('article') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('content') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('title') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('publish') ||
          elementInfo.attributes['data-testid']?.toLowerCase().includes('upload')
        );
        
        if (isEditorElement) {
          elements.specificEditorElements.push(elementInfo);
        }
        
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
            elementInfo.attributes['data-testid']?.toLowerCase().includes('content') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('body') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('article') ||
            elementInfo.id?.toLowerCase().includes('content') ||
            elementInfo.id?.toLowerCase().includes('body') ||
            elementInfo.id?.toLowerCase().includes('article') ||
            elementInfo.className.toLowerCase().includes('content') ||
            elementInfo.className.toLowerCase().includes('body') ||
            elementInfo.className.toLowerCase().includes('article') ||
            elementInfo.className.toLowerCase().includes('editor') ||
            elementInfo.className.toLowerCase().includes('prosemirror') ||
            elementInfo.className.toLowerCase().includes('editable') ||
            elementInfo.className.toLowerCase().includes('text') ||
            elementInfo.className.toLowerCase().includes('paragraph') ||
            elementInfo.className.toLowerCase().includes('draft') ||
            elementInfo.className.toLowerCase().includes('input') ||
            elementInfo.className.toLowerCase().includes('textarea')
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
            elementInfo.textContent.toLowerCase().includes('готово') ||
            elementInfo.textContent.toLowerCase().includes('done') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('publish') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('done') ||
            elementInfo.attributes['data-testid']?.toLowerCase().includes('ready') ||
            elementInfo.id?.toLowerCase().includes('publish') ||
            elementInfo.id?.toLowerCase().includes('done') ||
            elementInfo.className.toLowerCase().includes('publish') ||
            elementInfo.className.toLowerCase().includes('done') ||
            elementInfo.className.toLowerCase().includes('ready') ||
            elementInfo.className.toLowerCase().includes('publish-btn') ||
            elementInfo.className.toLowerCase().includes('submit') ||
            elementInfo.className.toLowerCase().includes('confirm')
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
              elementInfo.className.toLowerCase().includes('overlay') ||
              elementInfo.className.toLowerCase().includes('help') ||
              elementInfo.className.toLowerCase().includes('hint') ||
              elementInfo.className.toLowerCase().includes('tip') ||
              elementInfo.className.toLowerCase().includes('tour') ||
              elementInfo.className.toLowerCase().includes('guide')) {
            elements.modals.push(elementInfo);
          }
        }
        
        // Собираем поля загрузки изображений
        if (tagName === 'input' && el.type === 'file') {
          elements.imageUploads.push(elementInfo);
          
          // Проверяем, предназначено ли поле для изображений
          if (elementInfo.attributes.accept?.toLowerCase().includes('image') ||
              elementInfo.attributes.accept?.includes('.jpg') ||
              elementInfo.attributes.accept?.includes('.jpeg') ||
              elementInfo.attributes.accept?.includes('.png') ||
              elementInfo.attributes.accept?.includes('.gif') ||
              elementInfo.attributes.accept?.includes('.webp') ||
              elementInfo.className.toLowerCase().includes('image') ||
              elementInfo.className.toLowerCase().includes('photo') ||
              elementInfo.className.toLowerCase().includes('cover') ||
              elementInfo.className.toLowerCase().includes('upload')) {
            // Это уже добавлено в imageUploads, но помечаем как специфичное
          }
        }
        
        // Собираем формы
        if (tagName === 'form') {
          elements.forms.push(elementInfo);
        }
      });
      
      return elements;
    });
    
    return editorAnalysis;
  }

  generateSpecificSelectors(elementInfo) {
    const selectors = [];
    
    // ID селектор
    if (elementInfo.id) {
      selectors.push(`#${elementInfo.id}`);
    }
    
    // Class селекторы (с учетом всех классов)
    if (elementInfo.className) {
      const classes = elementInfo.className.split(/\s+/).filter(c => c);
      for (const cls of classes) {
        if (cls) selectors.push(`.${cls}`);
      }
      
      // Комбинированные классы (первые 3 класса)
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
    
    // Placeholder селектор (с частичным совпадением)
    if (elementInfo.attributes.placeholder) {
      selectors.push(`[placeholder="${elementInfo.attributes.placeholder}"]`);
      selectors.push(`[placeholder*="${elementInfo.attributes.placeholder.substring(0, Math.min(20, elementInfo.attributes.placeholder.length))}"]`);
    }
    
    // Aria-label селектор
    if (elementInfo.attributes['aria-label']) {
      selectors.push(`[aria-label="${elementInfo.attributes['aria-label']}"]`);
      selectors.push(`[aria-label*="${elementInfo.attributes['aria-label'].substring(0, Math.min(20, elementInfo.attributes['aria-label'].length))}"]`);
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
      selectors.push(`button:has-text("${elementInfo.textContent.substring(0, Math.min(20, elementInfo.textContent.length))}")`);
    }
    
    return [...new Set(selectors)]; // Уникальные селекторы
  }

  async analyzeAndSave() {
    try {
      await this.initialize();
      await this.navigateToEditorCorrectly();
      
      const analysis = await this.analyzeEditorStructure();
      
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
        })),
        modals: analysis.modals.map(modal => ({
          ...modal,
          selectors: this.generateSpecificSelectors(modal)
        }))
      };
      
      // Создаем отчет с конкретными селекторами
      const report = {
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        navigationSteps: [
          'Visited https://dzen.ru/profile',
          'Clicked on "Create publication" button',
          'Navigated to editor'
        ],
        analysis: enhancedAnalysis,
        specificSelectors: {
          title: this.extractBestSelectors(enhancedAnalysis.titleFields),
          content: this.extractBestSelectors(enhancedAnalysis.contentFields),
          publish: this.extractBestSelectors(enhancedAnalysis.publishButtons),
          upload: this.extractBestSelectors(enhancedAnalysis.imageUploads),
          modals: this.extractBestSelectors(enhancedAnalysis.modals),
          allEditorElements: this.extractBestSelectors(enhancedAnalysis.specificEditorElements)
        },
        recommendations: this.generateRecommendations(enhancedAnalysis)
      };
      
      // Сохраняем полный анализ
      await fs.writeFile('enhanced-dzen-analysis.json', JSON.stringify(report, null, 2), 'utf8');
      console.log('✅ Улучшенный анализ сохранен в enhanced-dzen-analysis.json');
      
      // Создаем файл с лучшими селекторами для использования в основном скрипте
      const bestSelectors = {
        titleSelectors: this.extractBestSelectors(enhancedAnalysis.titleFields),
        contentSelectors: this.extractBestSelectors(enhancedAnalysis.contentFields),
        publishSelectors: this.extractBestSelectors(enhancedAnalysis.publishButtons),
        uploadSelectors: this.extractBestSelectors(enhancedAnalysis.imageUploads),
        modalSelectors: this.extractBestSelectors(enhancedAnalysis.modals),
        allEditorSelectors: this.extractBestSelectors(enhancedAnalysis.specificEditorElements),
        detailedElements: {
          title: enhancedAnalysis.titleFields,
          content: enhancedAnalysis.contentFields,
          publish: enhancedAnalysis.publishButtons,
          upload: enhancedAnalysis.imageUploads,
          modals: enhancedAnalysis.modals,
          allEditorElements: enhancedAnalysis.specificEditorElements
        }
      };
      
      await fs.writeFile('precise-dzen-selectors.json', JSON.stringify(bestSelectors, null, 2), 'utf8');
      console.log('✅ Точные селекторы сохранены в precise-dzen-selectors.json');
      
      // Выводим статистику
      this.printDetailedStatistics(enhancedAnalysis);
      
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

    // Сортируем элементы по "качеству" селектора
    const scoredSelectors = new Map();

    elements.forEach(el => {
      // Проверяем, что у элемента есть селекторы
      if (el.selectors && Array.isArray(el.selectors)) {
        el.selectors.forEach(selector => {
          // Оцениваем качество селектора
          let score = 0;

          // ID селекторы самые точные
          if (typeof selector === 'string' && selector.startsWith('#')) score += 100;

          // Data-testid селекторы очень хорошие
          if (typeof selector === 'string' && selector.includes('[data-testid=')) score += 50;

          // Селекторы с role или aria-label хорошие
          if (typeof selector === 'string' && (selector.includes('[role=') || selector.includes('[aria-'))) score += 30;

          // Комбинированные селекторы (тег + класс/ID) хорошие
          if (typeof selector === 'string' && (selector.includes('.') || selector.includes('#'))) score += 20;

          // Селекторы с атрибутами (кроме role/aria) средние
          if (typeof selector === 'string' && (selector.includes('[') && !selector.includes('[role=') && !selector.includes('[aria-'))) score += 10;

          // Текстовые селекторы (has-text) менее надежные
          if (typeof selector === 'string' && selector.includes(':has-text')) score += 5;

          // Простые теговые селекторы наименее надежные
          if (typeof selector === 'string' && (!selector.includes('#') && !selector.includes('.') && !selector.includes('[') && !selector.includes(':'))) score += 1;

          const currentScore = scoredSelectors.get(selector) || 0;
          scoredSelectors.set(selector, currentScore + score);
        });
      }
    });

    // Возвращаем селекторы, отсортированные по оценке
    return Array.from(scoredSelectors.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([selector]) => selector);
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.modals.length > 0) {
      recommendations.push('🚨 НАЙДЕНЫ МОДАЛЬНЫЕ ОКНА: Обязательно закрывайте их перед взаимодействием с другими элементами');
    }
    
    if (analysis.titleFields.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕЙ ЗАГОЛОВКА: Попробуйте искать div[contenteditable="true"] или input[type="text"]');
    }
    
    if (analysis.contentFields.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕЙ СОДЕРЖИМОГО: Попробуйте искать div[contenteditable="true"] или textarea');
    }
    
    if (analysis.publishButtons.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО КНОПОК ПУБЛИКАЦИИ: Попробуйте искать кнопки с текстом "Опубликовать", "Publish", "Готово", "Done"');
    }
    
    if (analysis.imageUploads.length === 0) {
      recommendations.push('⚠️ НЕ НАЙДЕНО ПОЛЕЙ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ: Попробуйте искать input[type="file"] или кнопки с текстом "Загрузить", "Upload"');
    }
    
    return recommendations;
  }

  printDetailedStatistics(analysis) {
    console.log('\n📋 ДЕТАЛЬНАЯ СТАТИСТИКА АНАЛИЗА:');
    console.log(`- URL: ${this.page.url()}`);
    console.log(`- Специфичные элементы редактора: ${analysis.specificEditorElements.length}`);
    console.log(`- Поля заголовков: ${analysis.titleFields.length}`);
    console.log(`- Поля содержимого: ${analysis.contentFields.length}`);
    console.log(`- Кнопки публикации: ${analysis.publishButtons.length}`);
    console.log(`- Поля загрузки изображений: ${analysis.imageUploads.length}`);
    console.log(`- Модальные окна: ${analysis.modals.length}`);
    console.log(`- Всего input полей: ${analysis.allInputs.length}`);
    console.log(`- Всего кнопок: ${analysis.allButtons.length}`);
    console.log(`- Всего div элементов: ${analysis.allDivs.length}`);
    
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      console.log('\n💡 РЕКОМЕНДАЦИИ:');
      analysis.recommendations.forEach(rec => console.log(`• ${rec}`));
    }
    
    if (analysis.titleFields.length > 0) {
      console.log('\n🎯 НАЙДЕННЫЕ ПОЛЯ ЗАГОЛОВКОВ:');
      analysis.titleFields.forEach((field, i) => {
        console.log(`${i+1}. ${field.tagName}#${field.id || 'no-id'} - "${field.textContent.substring(0, 50)}..."`);
        console.log(`   Классы: ${field.className.substring(0, 100)}`);
        console.log(`   Селекторы: ${field.selectors.slice(0, 5).join(', ')}`);
      });
    }
    
    if (analysis.contentFields.length > 0) {
      console.log('\n📝 НАЙДЕННЫЕ ПОЛЯ СОДЕРЖИМОГО:');
      analysis.contentFields.forEach((field, i) => {
        console.log(`${i+1}. ${field.tagName}#${field.id || 'no-id'} - "${field.textContent.substring(0, 50)}..."`);
        console.log(`   Классы: ${field.className.substring(0, 100)}`);
        console.log(`   Селекторы: ${field.selectors.slice(0, 5).join(', ')}`);
      });
    }
    
    if (analysis.publishButtons.length > 0) {
      console.log('\n📤 НАЙДЕННЫЕ КНОПКИ ПУБЛИКАЦИИ:');
      analysis.publishButtons.forEach((button, i) => {
        console.log(`${i+1}. ${button.tagName}#${button.id || 'no-id'} - "${button.textContent.substring(0, 50)}..."`);
        console.log(`   Классы: ${button.className.substring(0, 100)}`);
        console.log(`   Селекторы: ${button.selectors.slice(0, 5).join(', ')}`);
      });
    }
    
    if (analysis.modals.length > 0) {
      console.log('\n🚫 НАЙДЕННЫЕ МОДАЛЬНЫЕ ОКНА (могут блокировать взаимодействие):');
      analysis.modals.forEach((modal, i) => {
        console.log(`${i+1}. ${modal.tagName}#${modal.id || 'no-id'} - "${modal.textContent.substring(0, 50)}..."`);
        console.log(`   Классы: ${modal.className.substring(0, 100)}`);
        console.log(`   Селекторы: ${modal.selectors.slice(0, 5).join(', ')}`);
      });
    }
  }
}

// Запуск анализа
async function main() {
  const analyzer = new EnhancedDzenAnalyzer();
  
  try {
    await analyzer.analyzeAndSave();
    console.log('\n✅ УЛУЧШЕННЫЙ АНАЛИЗ ЗАВЕРШЕН УСПЕШНО!');
    console.log('Файлы созданы:');
    console.log('- enhanced-dzen-analysis.json - полный анализ с рекомендациями');
    console.log('- precise-dzen-selectors.json - точные селекторы для использования в скрипте');
  } catch (error) {
    console.error('❌ Ошибка при выполнении анализа:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedDzenAnalyzer;