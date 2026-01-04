const { chromium } = require('playwright');
const fs = require('fs');

async function checkPublicationsPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Загружаем куки
    const cookies = JSON.parse(fs.readFileSync('./config/cookies.json', 'utf8'));
    await page.context().addCookies(cookies);
    
    // Переходим на страницу публикаций
    await page.goto('https://dzen.ru/profile/publications', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    console.log('📍 URL:', page.url());
    console.log('🏷️ Title:', await page.title());
    
    // Ищем кнопки создания публикации
    const createSelectors = [
      'text=Создать публикацию',
      'text=Создать',
      'text=Написать',
      'text=Добавить',
      'button:has-text("Создать")',
      'button:has-text("Create")',
      'a:has-text("Создать")',
      'a:has-text("Create")',
      '[data-testid*="create"]',
      '[data-testid*="add"]',
      '[data-testid*="new"]',
      '.create-btn',
      '.add-btn',
      '.new-btn',
      'button[data-testid*="create"]',
      'button[data-testid*="add"]'
    ];
    
    console.log('\n🔍 Поиск кнопок создания...');
    let foundButton = false;
    
    for (const selector of createSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          const text = await element.textContent();
          console.log(`✅ Найдена кнопка: ${selector} (текст: "${text}")`);
          
          // Пробуем кликнуть
          await element.click();
          await page.waitForTimeout(3000);
          
          const newUrl = page.url();
          console.log(`📍 URL после клика: ${newUrl}`);
          
          if (newUrl !== 'https://dzen.ru/profile/publications') {
            console.log(`🎉 НАЙДЕН ПРАВИЛЬНЫЙ ПУТЬ: ${newUrl}`);
            foundButton = true;
            break;
          }
          
          // Если URL не изменился, возвращаемся назад
          await page.goBack();
          await page.waitForTimeout(2000);
          await page.goto('https://dzen.ru/profile/publications', { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!foundButton) {
      console.log('\n❌ Кнопки создания не найдены на странице публикаций');
      
      // Проверим другие страницы
      const otherPages = [
        'https://dzen.ru/profile/articles',
        'https://dzen.ru/profile/editor',
        'https://dzen.ru/create'
      ];
      
      for (const url of otherPages) {
        try {
          console.log(`\n🔍 Проверка страницы: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
          await page.waitForTimeout(3000);
          
          const currentUrl = page.url();
          console.log(`📍 URL: ${currentUrl}`);
          
          // Ищем кнопки на этой странице
          for (const selector of createSelectors) {
            try {
              const element = await page.$(selector);
              if (element && await element.isVisible()) {
                const text = await element.textContent();
                console.log(`✅ Найдена кнопка на ${currentUrl}: ${selector} (текст: "${text}")`);
                
                await element.click();
                await page.waitForTimeout(3000);
                
                const finalUrl = page.url();
                if (finalUrl !== currentUrl) {
                  console.log(`🎉 НАЙДЕН ПРАВИЛЬНЫЙ ПУТЬ: ${finalUrl}`);
                  foundButton = true;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          if (foundButton) break;
        } catch (e) {
          console.log(`⚠️ Ошибка при проверке ${url}: ${e.message}`);
          continue;
        }
      }
    }
    
    if (!foundButton) {
      console.log('\n❌ Ни на одной странице не найдена кнопка создания публикации');
      
      // Последняя попытка - проверим исходный URL профиля снова с более широким поиском
      console.log('\n🔍 Последняя попытка на главной странице профиля...');
      await page.goto('https://dzen.ru/profile', { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      
      // Ищем все возможные элементы, которые могут быть кнопкой создания
      const allPossibleElements = await page.evaluate(() => {
        const elements = [];
        const allEls = document.querySelectorAll('button, a, div, span');
        
        allEls.forEach(el => {
          const text = el.textContent?.trim() || '';
          const rect = el.getBoundingClientRect();
          
          // Проверяем, видим ли элемент и имеет ли он текст
          if (rect.width > 0 && rect.height > 0 && text) {
            // Проверяем, содержит ли текст ключевые слова
            const keywords = ['созда', 'create', 'нов', 'new', 'add', 'напис', 'write', 'публикац', 'article', 'post'];
            const hasKeyword = keywords.some(kw => text.toLowerCase().includes(kw));
            
            if (hasKeyword) {
              elements.push({
                tagName: el.tagName,
                text: text,
                className: el.className,
                id: el.id,
                hasClickHandler: !!el.onclick || el.hasAttribute('onclick') || el.hasAttribute('data-testid')
              });
            }
          }
        });
        
        return elements;
      });
      
      console.log('Найденные элементы с ключевыми словами:');
      allPossibleElements.forEach((el, i) => {
        console.log(`${i+1}. ${el.tagName}#${el.id || 'no-id'} "${el.text}" - ${el.className.substring(0, 50)}`);
      });
    }
    
    await page.waitForTimeout(10000); // Показываем результаты
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await browser.close();
  }
}

checkPublicationsPage();