const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

/**
 * Скрипт для поиска правильного пути к редактору публикаций Дзен
 */

class DzenNavigationFinder {
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

  async findCorrectNavigationPath() {
    console.log('🌐 Поиск правильного пути к редактору публикаций...');
    
    // Переходим на главную страницу профиля
    await this.page.goto('https://dzen.ru/profile', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    await this.page.waitForTimeout(5000);
    
    console.log('📍 Текущий URL:', this.page.url());
    
    // Ищем элементы, связанные с созданием публикаций
    const possibleSelectors = [
      // Русские варианты
      'text=Создать публикацию',
      'text=Создать',
      'text=Новая публикация',
      'text=Добавить публикацию',
      'text=Написать статью',
      'text=Создать статью',
      'text=Новый пост',
      'text=Добавить пост',
      
      // Английские варианты
      'text=Create publication',
      'text=Create',
      'text=New publication',
      'text=Add publication',
      'text=Write article',
      'text=Create article',
      'text=New post',
      'text=Add post',
      
      // По data-testid
      '[data-testid="create-publication"]',
      '[data-testid="add-publication"]',
      '[data-testid="new-publication"]',
      '[data-testid="create-article"]',
      '[data-testid="add-article"]',
      '[data-testid="create-post"]',
      '[data-testid="add-post"]',
      
      // По классам
      '.create-publication',
      '.new-publication',
      '.add-publication',
      '.create-article',
      '.new-article',
      '.add-article',
      '.create-post',
      '.new-post',
      '.add-post',
      
      // Кнопки с иконками
      'button:has(svg)',
      'button:has-text("Создать")',
      'button:has-text("Create")',
      'a:has-text("Создать")',
      'a:has-text("Create")',
      
      // Общие подозрительные элементы
      'button',
      'a[href*="create"]',
      'a[href*="editor"]',
      'a[href*="new"]',
      'a[href*="add"]',
      'a[href*="write"]'
    ];
    
    console.log('🔍 Поиск элементов создания публикаций...');
    
    const foundElements = [];
    
    for (const selector of possibleSelectors) {
      try {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          for (const element of elements) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              const textContent = await element.textContent();
              const tagName = await element.evaluate(el => el.tagName);
              const classes = await element.evaluate(el => el.className || '');
              const href = await element.evaluate(el => el.href || el.getAttribute('href') || '');
              const dataTestId = await element.evaluate(el => el.getAttribute('data-testid') || '');
              
              foundElements.push({
                selector,
                tagName,
                textContent: textContent?.trim() || '',
                classes,
                href,
                dataTestId,
                isVisible
              });
              
              console.log(`✅ Найден элемент: ${selector} | Текст: "${textContent?.trim()}" | Тег: ${tagName}`);
            }
          }
        }
      } catch (e) {
        // Игнорируем ошибки для недействительных селекторов
        continue;
      }
    }
    
    // Также проверим все ссылки на странице
    console.log('\n🔍 Анализ всех ссылок на странице...');
    const allLinks = await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        className: link.className,
        id: link.id
      })).filter(link => link.href && link.href.includes('dzen.ru')); // Только внутренние ссылки
    });
    
    console.log('Все найденные внутренние ссылки:');
    allLinks.forEach((link, i) => {
      console.log(`${i+1}. ${link.text} -> ${link.href}`);
    });
    
    // Попробуем кликнуть на потенциальные кнопки создания
    console.log('\n🖱️ Попытка кликнуть на найденные элементы...');
    
    for (const element of foundElements) {
      if (element.textContent.toLowerCase().includes('созда') || 
          element.textContent.toLowerCase().includes('create') ||
          element.textContent.toLowerCase().includes('нов') ||
          element.textContent.toLowerCase().includes('add')) {
        
        try {
          console.log(`\nПопытка клика на: ${element.textContent} (${element.selector})`);
          
          // Найдем и кликнем на элемент
          const clickableElement = await this.page.$(element.selector);
          if (clickableElement) {
            await clickableElement.click({ timeout: 5000 });
            
            // Подождем немного и проверим URL
            await this.page.waitForTimeout(3000);
            const newUrl = this.page.url();
            console.log(`📍 Новый URL после клика: ${newUrl}`);
            
            if (newUrl !== 'https://dzen.ru/profile' && !newUrl.includes('error')) {
              console.log(`🎉 НАЙДЕН ПРАВИЛЬНЫЙ ПУТЬ: ${newUrl}`);
              
              // Сохраняем информацию о правильном пути
              const navigationInfo = {
                correctUrl: newUrl,
                clickElement: element,
                timestamp: new Date().toISOString(),
                fromUrl: 'https://dzen.ru/profile'
              };
              
              await fs.writeFile('dzen-navigation-path.json', JSON.stringify(navigationInfo, null, 2), 'utf8');
              console.log('✅ Информация о навигации сохранена в dzen-navigation-path.json');
              
              return navigationInfo;
            }
            
            // Вернемся обратно
            await this.page.goBack();
            await this.page.waitForTimeout(2000);
          }
        } catch (e) {
          console.log(`⚠️ Ошибка при клике: ${e.message}`);
          // Продолжаем с следующим элементом
          try {
            await this.page.goto('https://dzen.ru/profile', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);
          } catch (backErr) {
            console.log(`⚠️ Ошибка при возврате: ${backErr.message}`);
          }
        }
      }
    }
    
    console.log('\n❌ Не удалось найти правильный путь к редактору публикаций');
    
    // Проверим, может быть, нужно сначала перейти в "Публикации" или "Статьи"
    console.log('\n🔍 Проверка альтернативных путей...');
    
    const alternativePaths = [
      'https://dzen.ru/profile/publications',
      'https://dzen.ru/profile/articles',
      'https://dzen.ru/profile/posts',
      'https://dzen.ru/profile/editor',
      'https://dzen.ru/potemki'  // Это может быть ваш канал
    ];
    
    for (const path of alternativePaths) {
      try {
        console.log(`\nПроверка пути: ${path}`);
        await this.page.goto(path, { waitUntil: 'networkidle', timeout: 10000 });
        await this.page.waitForTimeout(3000);
        
        const currentUrl = this.page.url();
        console.log(`📍 URL после перехода: ${currentUrl}`);
        
        if (!currentUrl.includes('error') && currentUrl !== 'https://dzen.ru/profile') {
          console.log(`✅ Альтернативный путь найден: ${currentUrl}`);
          
          // Попробуем найти кнопку создания на этой странице
          const createSelectors = [
            'text=Создать',
            'text=Create',
            'text=Новая',
            'text=New',
            '[data-testid*="create"]',
            '[data-testid*="add"]',
            'button:has-text("Создать")',
            'button:has-text("Create")'
          ];
          
          for (const sel of createSelectors) {
            try {
              const btn = await this.page.$(sel);
              if (btn && await btn.isVisible()) {
                console.log(`✅ Найдена кнопка создания: ${sel}`);
                await btn.click();
                await this.page.waitForTimeout(3000);
                
                const finalUrl = this.page.url();
                if (finalUrl !== currentUrl) {
                  console.log(`🎉 НАЙДЕН ОКОНЧАТЕЛЬНЫЙ ПУТЬ: ${finalUrl}`);
                  
                  const navigationInfo = {
                    correctUrl: finalUrl,
                    intermediateUrl: currentUrl,
                    clickElement: sel,
                    timestamp: new Date().toISOString(),
                    fromUrl: path
                  };
                  
                  await fs.writeFile('dzen-navigation-path.json', JSON.stringify(navigationInfo, null, 2), 'utf8');
                  console.log('✅ Информация о навигации сохранена в dzen-navigation-path.json');
                  
                  return navigationInfo;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        console.log(`⚠️ Ошибка при переходе по ${path}: ${e.message}`);
        continue;
      }
    }
    
    return null;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Запуск поиска
async function main() {
  const finder = new DzenNavigationFinder();
  
  try {
    await finder.initialize();
    const result = await finder.findCorrectNavigationPath();
    
    if (result) {
      console.log('\n✅ ПУТЬ К РЕДАКТОРУ ПУБЛИКАЦИЙ НАЙДЕН:');
      console.log(`- Правильный URL: ${result.correctUrl}`);
      console.log(`- Исходный URL: ${result.fromUrl}`);
      if (result.intermediateUrl) {
        console.log(`- Промежуточный URL: ${result.intermediateUrl}`);
      }
      console.log(`- Элемент для клика: ${result.clickElement?.textContent || result.clickElement}`);
    } else {
      console.log('\n❌ Путь к редактору публикаций не найден');
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске пути:', error);
  } finally {
    await finder.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DzenNavigationFinder;