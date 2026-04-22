const { chromium } = require('playwright');
const fs = require('fs').promises;
const PublicationHistory = require('./modules/publication_history.js');

// Функция для извлечения данных из XML с правильной обработкой текста
async function getArticlesFromFeed() {
  try {
    const feedContent = await fs.readFile('./public/feed.xml', 'utf8');
    
    // Извлекаем статьи с помощью регулярных выражений
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let match;
    
    while ((match = itemRegex.exec(feedContent)) !== null) {
      const itemContent = match[1];
      
      // Извлекаем заголовок
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Без заголовка';
      
      // Извлекаем ссылку
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const link = linkMatch ? linkMatch[1] : '';
      
      // Извлекаем изображение из media:content
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url="(.*?)"[^>]*>/);
      const imageUrl = mediaContentMatch ? mediaContentMatch[1] : '';
      
      // Извлекаем дату публикации
      const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const pubDate = dateMatch ? dateMatch[1] : '';
      
      // Извлекаем описание
      const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<description>(.*?)<\/description>/);
      const description = descMatch ? descMatch[1] : '';
      
      // Извлекаем полный контент
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<content:encoded>(.*?)<\/content:encoded>/);
      const content = contentMatch ? contentMatch[1] : description;
      
      items.push({
        title: title,
        description: description,
        link: link,
        pubDate: pubDate,
        imageUrl: imageUrl,
        content: content
      });
    }
    
    return items;
  } catch (error) {
    console.error('❌ Ошибка при чтении или парсинге фида:', error.message);
    return [];
  }
}

// Функция для правильной обработки HTML-тегов в тексте
function processArticleContent(content) {
  if (!content) return '';
  
  // Заменяем HTML-теги на соответствующие переносы строк и форматирование
  let processed = content
    // Заменяем параграфы на двойные переносы строк
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    // Заменяем заголовки на переносы строк
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    // Заменяем div на переносы строк
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    // Заменяем br на переносы строк
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<br>/gi, '\n')
    // Заменяем li на переносы строк с отступом
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    // Удаляем остальные теги, но сохраняем текст
    .replace(/<[^>]*>/g, '')
    // Заменяем HTML сущности
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/'/g, "'");
  
  // Убираем лишние переносы строк (оставляем максимум 2 подряд)
  processed = processed.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // Убираем лишние пробелы в начале и конце
  processed = processed.trim();
  
  return processed;
}

(async () => {
  console.log('🎯 ФИНАЛЬНЫЙ АВТОПАБЛИШЕР С МАКСИМУМ ДЕБАГ-ЛОГОВ');
  console.log('💡 Детальное логирование каждого шага поиска селекторов\n');

  // Получаем опубликованные статьи
  const publishedArticles = await getPublishedArticles();
  console.log(`📋 Найдено ${publishedArticles.length} опубликованных статей в истории`);

  // Получаем статьи из фида
  const articles = await getArticlesFromFeed();

  if (articles.length === 0) {
    console.log('❌ Не найдено статей в feed.xml');
    return;
  }

  console.log(`📋 Найдено ${articles.length} статей в фиде\n`);

  // Ищем первую непубликованную статью
  const article = getFirstUnpublishedArticle(articles, publishedArticles);

  if (!article) {
    console.log('❌ Не найдено новых статей для публикации (все статьи из фида уже были опубликованы)');
    console.log('📋 Последние опубликованные статьи:');
    for (let i = Math.max(0, publishedArticles.length - 5); i < publishedArticles.length; i++) {
      console.log(`   - ${publishedArticles[i].title}`);
    }
    return;
  }

  console.log(`📝 Найдена новая статья для публикации: ${article.title.substring(0, 50)}...`);
  console.log(`🖼️ Изображение: ${article.imageUrl || 'не указано'}`);
  console.log(`📏 Длина контента: ${article.content.length} символов\n`);

  // Обрабатываем контент статьи
  const processedContent = processArticleContent(article.content);
  console.log(`✅ Контент обработан: ${processedContent.length} символов\n`);

  // Запускаем браузер
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Загружаем куки
  try {
    const cookies = JSON.parse(await fs.readFile('./config/cookies.json', 'utf8'));
    await context.addCookies(cookies);
    console.log('✅ Куки загружены\n');
  } catch (error) {
    console.log('❌ Ошибка загрузки куки:', error.message, '\n');
  }

  // Переходим на страницу редактора
  console.log('🌐 Переход на страницу редактора...');
  await page.goto('https://dzen.ru/profile/editor/potemki', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  
  console.log('✅ Страница загружена\n');
  await page.waitForTimeout(5000);

  // Закрываем возможное модальное окно
  const modalCloseButton = await page.$('[data-testid="close-button"]');
  if (modalCloseButton) {
    await modalCloseButton.click();
    await page.waitForTimeout(2000);
  }

  // Нажимаем на кнопку добавления публикации
  console.log('🔍 ШАГ 1: Поиск кнопки добавления публикации...');
  const addPublicationButton = await page.$('[data-testid="add-publication-button"]');
  if (addPublicationButton) {
    console.log('   ✅ Найдена кнопка: [data-testid="add-publication-button"]');
    await addPublicationButton.click();
    console.log('   ✅ Кнопка нажата\n');
    
    await page.waitForTimeout(3000);
    
    // Ищем и нажимаем "Написать статью"
    console.log('🔍 ШАГ 2: Поиск кнопки "Написать статью"...');
    const writeArticleButton = await page.$('text="Написать статью"');
    if (writeArticleButton) {
      console.log('   ✅ Найдена кнопка: text="Написать статью"');
      await writeArticleButton.click();
      console.log('   ✅ Кнопка нажата\n');
      
      // Ждем загрузки редактора
      console.log('⏳ ШАГ 3: Ожидание загрузки редактора статьи...');
      
      try {
        await page.waitForSelector('div[contenteditable="true"], input[type="text"], textarea', { 
          state: 'visible', 
          timeout: 15000 
        });
        console.log('   ✅ Редактор загружен\n');
      } catch (error) {
        console.log('   ⚠️ Редактор может быть не полностью загружен, продолжаем...\n');
      }
      
      await page.waitForTimeout(8000);
      
      // Закрываем всплывающие окна
      console.log('🔍 ШАГ 4: Закрытие всплывающих окон...');
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, .article-editor-desktop--help-popup__overlay-3q');
        overlays.forEach(overlay => {
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.pointerEvents = 'none';
          overlay.remove();
        });
      });
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
      console.log('   ✅ Всплывающие окна закрыты\n');
      
      await page.waitForTimeout(3000);
      
      // ДИАГНОСТИКА: Выводим ВСЕ найденные поля
      console.log('📊 ДИАГНОСТИКА: Все найденные поля ввода на странице:\n');
      
      const allEditableElements = await page.$$('input[type="text"], textarea, div[contenteditable="true"]');
      console.log(`   🔹 Всего найдено полей: ${allEditableElements.length}\n`);
      
      const fieldInfo = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('input[type="text"], textarea, div[contenteditable="true"]'));
        return elements.map((el, index) => {
          const rect = el.getBoundingClientRect();
          return {
            index: index,
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            placeholder: el.getAttribute('placeholder') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            ariaPlaceholder: el.getAttribute('aria-placeholder') || '',
            contentEditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role') || '',
            dataTestid: el.getAttribute('data-testid') || '',
            name: el.getAttribute('name') || '',
            textContent: el.textContent?.substring(0, 50) || el.getAttribute('value') || '',
            isVisible: el.offsetParent !== null,
            offsetHeight: el.offsetHeight,
            offsetWidth: el.offsetWidth,
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            computedStyle: {
              display: window.getComputedStyle(el).display,
              visibility: window.getComputedStyle(el).visibility,
              opacity: window.getComputedStyle(el).opacity
            }
          };
        });
      });
      
      fieldInfo.forEach((field, idx) => {
        console.log(`   📌 ПОЛЕ ${idx + 1}:`);
        console.log(`      - Tag: ${field.tagName}`);
        console.log(`      - Placeholder: "${field.placeholder}"`);
        console.log(`      - Aria-label: "${field.ariaLabel}"`);
        console.log(`      - Aria-placeholder: "${field.ariaPlaceholder}"`);
        console.log(`      - Data-testid: "${field.dataTestid}"`);
        console.log(`      - Name: "${field.name}"`);
        console.log(`      - Class: "${field.className}"`);
        console.log(`      - Role: "${field.role}"`);
        console.log(`      - ID: "${field.id}"`);
        console.log(`      - Text: "${field.textContent}"`);
        console.log(`      - Visible: ${field.isVisible} | Display: ${field.computedStyle.display} | Visibility: ${field.computedStyle.visibility} | Opacity: ${field.computedStyle.opacity}`);
        console.log(`      - Position: X=${field.x}, Y=${field.y} | Size: ${field.offsetWidth}x${field.offsetHeight}`);
        console.log();
      });

      // 1. ЗАПОЛНЕНИЕ ЗАГОЛОВКА
      console.log('🔍 ШАГ 5: Заполнение заголовка (поиск подходящего поля)...\n');
      
      let titleElement = null;
      let titleElementIndex = -1;
      
      // Ищем поле заголовка
      for (let i = 0; i < allEditableElements.length; i++) {
        const element = allEditableElements[i];
        const field = fieldInfo[i];
        
        const isTitleField = 
          field.ariaLabel.toLowerCase().includes('заголов') || 
          field.ariaLabel.toLowerCase().includes('title') ||
          field.placeholder.toLowerCase().includes('заголов') ||
          field.placeholder.toLowerCase().includes('title') ||
          field.ariaPlaceholder.toLowerCase().includes('заголов');
        
        if (isTitleField && field.isVisible) {
          console.log(`   ✅ Найдено поле заголовка на позиции ${i + 1}:`);
          console.log(`      - Aria-label: "${field.ariaLabel}"`);
          console.log(`      - Placeholder: "${field.placeholder}"`);
          console.log(`      - Class: "${field.className}"\n`);
          
          await element.focus();
          await element.fill(article.title);
          console.log(`   ✅ Заголовок успешно заполнен: "${article.title}"\n`);
          
          titleElement = element;
          titleElementIndex = i;
          break;
        }
      }
      
      if (!titleElement && allEditableElements.length > 0) {
        console.log(`   ⚠️ Специфичное поле заголовка не найдено, используем первое видимое поле (позиция 1):`);
        const element = allEditableElements[0];
        const field = fieldInfo[0];
        console.log(`      - Aria-label: "${field.ariaLabel}"`);
        console.log(`      - Placeholder: "${field.placeholder}"`);
        console.log(`      - Class: "${field.className}"\n`);
        
        await element.focus();
        await element.fill(article.title);
        console.log(`   ✅ Заголовок заполнен в альтернативном поле: "${article.title}"\n`);
        
        titleElement = element;
        titleElementIndex = 0;
      }
      
      if (!titleElement) {
        console.log('   ❌ Не удалось найти поле для заголовка!\n');
      }

      await page.waitForTimeout(1000);
      
      // 2. ЗАПОЛНЕНИЕ ТЕЛА СТАТЬИ
      console.log('🔍 ШАГ 6: Заполнение тела статьи (поиск подходящего поля)...\n');
      
      let contentElement = null;
      let contentElementIndex = -1;
      
      // Ищем поле для тела статьи (не заголовок)
      for (let i = 0; i < allEditableElements.length; i++) {
        const element = allEditableElements[i];
        const field = fieldInfo[i];
        
        // Пропускаем поле заголовка
        if (i === titleElementIndex) {
          continue;
        }
        
        // Пропускаем явно обозначенные поля заголовка
        const isTitleField = 
          field.ariaLabel.toLowerCase().includes('заголов') || 
          field.placeholder.toLowerCase().includes('заголов');
        
        if (isTitleField) {
          continue;
        }
        
        if (field.isVisible) {
          console.log(`   ✅ Найдено поле тела статьи на позиции ${i + 1}:`);
          console.log(`      - Aria-label: "${field.ariaLabel}"`);
          console.log(`      - Placeholder: "${field.placeholder}"`);
          console.log(`      - Class: "${field.className}"`);
          console.log(`      - Размер: ${field.offsetWidth}x${field.offsetHeight}\n`);
          
          await element.focus();
          await element.fill(processedContent);
          
          console.log(`   ✅ Тело статьи успешно заполнено:`);
          console.log(`      - Длина: ${processedContent.length} символов`);
          console.log(`      - Первые 100 символов: "${processedContent.substring(0, 100)}..."\n`);
          
          contentElement = element;
          contentElementIndex = i;
          break;
        }
      }
      
      if (!contentElement) {
        console.log('   ❌ Не удалось найти поле для тела статьи!\n');
      } else {
        await page.keyboard.press('Enter');
        console.log('   ✅ Нажата клавиша Enter\n');
      }

      await page.waitForTimeout(2000);
      
      // 3. ВСТАВКА ИЗОБРАЖЕНИЯ
      console.log('🔍 ШАГ 7: Вставка изображения (поиск кнопки)...\n');
      
      const imageButtonSelectors = [
        'button[data-tip="Вставить изображение"]',
        'button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]',
        'button[aria-label*="изображение"]',
        'button[title*="изображение"]'
      ];
      
      let imageButtonFound = false;
      
      for (let i = 0; i < imageButtonSelectors.length; i++) {
        const selector = imageButtonSelectors[i];
        console.log(`   🔹 Попытка ${i + 1}: Поиск по селектору: "${selector}"`);
        
        try {
          const imageButton = await page.$(selector);
          if (imageButton && await imageButton.isVisible()) {
            console.log(`      ✅ Найдена кнопка!\n`);
            await imageButton.click();
            console.log(`      ✅ Кнопка нажата\n`);
            imageButtonFound = true;
            break;
          } else {
            console.log(`      ❌ Кнопка не найдена или невидима\n`);
          }
        } catch (e) {
          console.log(`      ❌ Ошибка: ${e.message}\n`);
        }
      }
      
      if (!imageButtonFound) {
        console.log('   ❌ Не удалось найти кнопку вставки изображения!\n');
      } else {
        await page.waitForTimeout(3000);
        
        if (article.imageUrl) {
          console.log('🔍 ШАГ 8: Заполнение URL изображения...\n');
          
          const imageInputSelectors = [
            'input[placeholder*="ссылка"]',
            'input[placeholder*="url"]',
            'input[placeholder*="изображение"]',
            'input[type="text"]'
          ];
          
          let imageInputFound = false;
          
          for (let i = 0; i < imageInputSelectors.length; i++) {
            const selector = imageInputSelectors[i];
            console.log(`   🔹 Попытка ${i + 1}: Поиск по селектору: "${selector}"`);
            
            try {
              const imageInput = await page.$(selector);
              if (imageInput && await imageInput.isVisible()) {
                console.log(`      ✅ Найдено поле ввода!\n`);
                await imageInput.fill(article.imageUrl);
                console.log(`      ✅ URL вставлен: ${article.imageUrl}\n`);
                
                await imageInput.press('Enter');
                await page.waitForTimeout(1000);
                imageInputFound = true;
                break;
              } else {
                console.log(`      ❌ Поле не найдено или невидимо\n`);
              }
            } catch (e) {
              console.log(`      ❌ Ошибка: ${e.message}\n`);
            }
          }
          
          if (!imageInputFound) {
            console.log('   ❌ Не удалось найти поле для URL изображения!\n');
          }
        }
      }
      
      await page.waitForTimeout(2000);
      
      // 4. ПЕРВАЯ КНОПКА ПУБЛИКАЦИИ
      console.log('🔍 ШАГ 9: Поиск ПЕРВОЙ кнопки публикации (в редакторе)...\n');
      
      const firstPublishSelectors = [
        '[data-testid="publish-btn"]',
        'button[data-testid="publish-btn"]',
        'button:has-text("Опубликовать"):not([disabled])',
        'button.article-editor-desktop--editor-header__editBtn-44',
        'button.article-editor-desktop--base-button__primary-1Y'
      ];
      
      let firstPublishFound = false;
      
      for (let i = 0; i < firstPublishSelectors.length; i++) {
        const selector = firstPublishSelectors[i];
        console.log(`   🔹 Попытка ${i + 1}: Селектор: "${selector}"`);
        
        try {
          const buttons = await page.$$(selector);
          console.log(`      - Найдено элементов: ${buttons.length}`);
          
          for (let j = 0; j < buttons.length; j++) {
            const btn = buttons[j];
            const isVisible = await btn.isVisible().catch(() => false);
            const isEnabled = await btn.isEnabled().catch(() => false);
            const text = await btn.textContent().catch(() => '');
            
            console.log(`      - Кнопка ${j + 1}: Видима=${isVisible}, Активна=${isEnabled}, Текст="${text.substring(0, 30)}"`);
            
            if (isVisible && isEnabled && (text.includes('Опубликовать') || text.includes('Публикация'))) {
              console.log(`      ✅ Найдена подходящая кнопка! Нажимаем...\n`);
              await btn.click();
              firstPublishFound = true;
              break;
            }
          }
          
          if (firstPublishFound) break;
        } catch (e) {
          console.log(`      ❌ Ошибка: ${e.message}`);
        }
      }
      
      if (!firstPublishFound) {
        console.log('   ⚠️ Первая кнопка публикации не найдена, может быть модальное окно откроется сразу\n');
      } else {
        console.log('   ✅ Первая кнопка публикации нажата\n');
      }
      
      await page.waitForTimeout(5000);
      
      // 5. ВТОРАЯ КНОПКА (подтверждение)
      console.log('🔍 ШАГ 10: Поиск ВТОРОЙ кнопки публикации (подтверждение в модали)...\n');
      
      const confirmSelectors = [
        'button[data-testid="publish-btn"][type="submit"]',
        'button[type="submit"]:has-text("Опубликовать")',
        'button:has-text("Опубликовать"):not([disabled])',
        'button:has-text("Опубликовать сейчас")',
        'button.article-editor-desktop--base-button__primary-1Y'
      ];
      
      let confirmFound = false;
      
      for (let i = 0; i < confirmSelectors.length; i++) {
        const selector = confirmSelectors[i];
        console.log(`   🔹 Попытка ${i + 1}: Селектор: "${selector}"`);
        
        try {
          const buttons = await page.$$(selector);
          console.log(`      - Найдено элементов: ${buttons.length}`);
          
          // Берем ПОСЛЕДНЮЮ видимую кнопку (обычно она в модальном окне)
          for (let j = buttons.length - 1; j >= 0; j--) {
            const btn = buttons[j];
            const isVisible = await btn.isVisible().catch(() => false);
            const isEnabled = await btn.isEnabled().catch(() => false);
            const text = await btn.textContent().catch(() => '');
            
            console.log(`      - Кнопка ${j + 1}: Видима=${isVisible}, Активна=${isEnabled}, Текст="${text.substring(0, 30)}"`);
            
            if (isVisible && isEnabled) {
              console.log(`      ✅ Найдена подходящая кнопка! Нажимаем...\n`);
              await btn.click();
              confirmFound = true;
              break;
            }
          }
          
          if (confirmFound) break;
        } catch (e) {
          console.log(`      ❌ Ошибка: ${e.message}`);
        }
      }
      
      if (confirmFound) {
        console.log('   ✅ Вторая кнопка публикации нажата');
        console.log('   🎉 Статья успешно опубликована!\n');
        
        // Сохраняем информацию об опубликованной статье
        await savePublishedArticle(article.title);
        console.log(`   💾 Информация о статье сохранена\n`);
      } else {
        console.log('   ❌ Не удалось найти вторую кнопку публикации!\n');
      }
    } else {
      console.log('❌ Кнопка "Написать статью" не найдена');
    }
  } else {
    console.log('❌ Кнопка добавления публикации не найдена');
  }

  console.log('\n✅ АВТОПАБЛИШЕР ЗАВЕРШЕН\n');

  console.log('⏰ Браузер останется открытым для проверки результата...');
  await page.waitForTimeout(120000); // 2 минуты

  await browser.close();
})();

// Функция для чтения опубликованных статей
async function getPublishedArticles() {
  try {
    const content = await fs.readFile('./published_articles.txt', 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const published = [];

    for (const line of lines) {
      const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+)/);
      if (match) {
        published.push({
          date: match[1],
          title: match[2]
        });
      }
    }

    return published;
  } catch (error) {
    return [];
  }
}

// Функция для проверки, была ли статья уже опубликована
function isArticlePublished(articleTitle, publishedArticles) {
  return publishedArticles.some(pub => pub.title.trim() === articleTitle.trim());
}

// Функция для получения первой непубликованной статьи
function getFirstUnpublishedArticle(articles, publishedArticles) {
  for (const article of articles) {
    if (!isArticlePublished(article.title, publishedArticles)) {
      return article;
    }
  }
  return null;
}

// Функция для сохранения информации об опубликованной статье
async function savePublishedArticle(articleTitle) {
  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const entry = `${date} - ${articleTitle}\n`;

  try {
    await fs.appendFile('./published_articles.txt', entry);
    console.log(`✅ Информация о статье сохранена в published_articles.txt`);
  } catch (error) {
    console.log(`❌ Ошибка сохранения информации о статье: ${error.message}`);
  }
}
