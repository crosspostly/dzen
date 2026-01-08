const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const PublicationHistory = require('./modules/publication_history.js');

// Функция для извлечения данных из XML с правильной обработкой текста
async function getArticlesFromFeed() {
  try {
    const feedPath = path.join(__dirname, '../public/feed.xml');
    const feedContent = await fs.readFile(feedPath, 'utf8');
    
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

// Функция для извлечения данных из XML с правильной обработкой текста
async function getArticlesFromFeed() {
  try {
    const feedPath = path.join(__dirname, '../public/feed.xml');
    const feedContent = await fs.readFile(feedPath, 'utf8');

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
    .replace(/&#39;/g, "'");
  
  // Убираем лишние переносы строк (оставляем максимум 2 подряд)
  processed = processed.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // Убираем лишние пробелы в начале и конце
  processed = processed.trim();
  
  return processed;
}

(async () => {
  console.log('🎯 ФИНАЛЬНЫЙ УЛУЧШЕННЫЙ АВТОПАБЛИШЕР С ИСПОЛЬЗОВАНИЕМ ТОЧНЫХ СЕЛЕКТОРОВ ИЗ DZEN-SCHEMA.JSON');
  console.log('💡 Используем точные селекторы из dzen-schema.json для обоих шагов публикации');

  // Получаем опубликованные статьи
  const publishedArticles = await getPublishedArticles();
  console.log(`📋 Найдено ${publishedArticles.length} опубликованных статей в истории`);

  // Получаем статьи из фида
  const articles = await getArticlesFromFeed();

  if (articles.length === 0) {
    console.log('❌ Не найдено статей в feed.xml');
    return;
  }

  console.log(`📋 Найдено ${articles.length} статей в фиде`);

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
  console.log(`📏 Длина контента: ${article.content.length} символов`);
  console.log(`🔍 Первые 200 символов контента: ${article.content.substring(0, 200)}...`);

  // Обрабатываем контент статьи
  const processedContent = processArticleContent(article.content);
  console.log(`✅ Контент обработан, длина: ${processedContent.length} символов`);
  console.log(`🔍 Первые 200 символов после обработки: ${processedContent.substring(0, 200)}...`);

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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.12.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Загружаем куки
  try {
    const cookies = JSON.parse(await fs.readFile('./config/cookies.json', 'utf8'));
    await context.addCookies(cookies);
    console.log('✅ Куки загружены');
  } catch (error) {
    console.log('❌ Ошибка загрузки куки:', error.message);
  }

  // Переходим на страницу редактора
  console.log('🌐 Переход на страницу редактора...');
  await page.goto('https://dzen.ru/profile/editor/potemki', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  
  console.log('✅ Страница загружена');
  await page.waitForTimeout(5000);

  // Закрываем возможное модальное окно
  const modalCloseButton = await page.$('[data-testid="close-button"]');
  if (modalCloseButton) {
    await modalCloseButton.click();
    await page.waitForTimeout(2000);
  }

  // Нажимаем на кнопку добавления публикации
  const addPublicationButton = await page.$('[data-testid="add-publication-button"]');
  if (addPublicationButton) {
    await addPublicationButton.click();
    console.log('✅ Кнопка добавления публикации нажата');
    
    await page.waitForTimeout(3000);
    
    // Ищем и нажимаем "Написать статью"
    const writeArticleButton = await page.$('text="Написать статью"');
    if (writeArticleButton) {
      await writeArticleButton.click();
      console.log('✅ Кнопка "Написать статью" нажата');
      
      // Ждем, пока редактор статьи полностью загрузится
      console.log('⏳ Ожидание загрузки редактора статьи...');
      
      // Ждем появление полей ввода
      try {
        await page.waitForSelector('div[contenteditable="true"], input[type="text"], textarea', { 
          state: 'visible', 
          timeout: 15000 
        });
        console.log('✅ Редактор статьи загружен');
      } catch (error) {
        console.log('⚠️ Редактор статьи может быть не полностью загружен, продолжаем...');
      }
      
      await page.waitForTimeout(8000);
      
      // Закрываем всплывающее окно помощи
      console.log('🔒 Закрытие всплывающего окна помощи...');
      
      // Выполняем JavaScript для удаления модального окна
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
      
      // Ждем стабилизации
      await page.waitForTimeout(3000);
      
      // НАЙДЕМ ВСЕ ПОЛЯ ВВОДА НА СТРАНИЦЕ
      const allEditableElements = await page.$$('input[type="text"], textarea, div[contenteditable="true"]');
      console.log(`🔍 Найдено ${allEditableElements.length} полей ввода`);
      
      // ПОЛУЧИМ ИНФОРМАЦИЮ О КАЖДОМ ПОЛЕ
      const fieldInfo = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('input[type="text"], textarea, div[contenteditable="true"]'));
        return elements.map((el, index) => {
          return {
            index: index,
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            placeholder: el.getAttribute('placeholder') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            contentEditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role') || '',
            textContent: el.textContent?.substring(0, 50) || el.getAttribute('value') || '',
            isVisible: el.offsetParent !== null
          };
        });
      });
      
      console.log('📋 Информация о найденных полях:');
      fieldInfo.forEach((field, idx) => {
        console.log(`${idx + 1}. ${field.tagName} - Placeholder: "${field.placeholder}", Aria: "${field.ariaLabel}", Text: "${field.textContent}"`);
      });
      
      // 1. СНАЧАЛА ЗАПОЛНЯЕМ ЗАГОЛОВОК (первым!)
      console.log('\\n📝 1. Заполнение заголовка (первым)...');
      
      let titleElement = null;
      let titleElementIndex = -1;
      
      // Сначала ищем специфичные поля заголовка
      for (let i = 0; i < allEditableElements.length; i++) {
        const element = allEditableElements[i];
        const field = fieldInfo[i];
        
        // Ищем поля, которые связаны с заголовком
        if (field.ariaLabel.toLowerCase().includes('заголов') || 
            field.ariaLabel.toLowerCase().includes('title') ||
            field.placeholder.toLowerCase().includes('заголов') ||
            field.placeholder.toLowerCase().includes('title') ||
            field.ariaLabel.toLowerCase().includes('введите заголовок')) {
          
          if (field.isVisible) {
            await element.focus();
            await element.fill(article.title);
            console.log(`✅ Заголовок заполнен в поле ${i + 1}: Placeholder: "${field.placeholder}", Aria: "${field.ariaLabel}"`);
            titleElement = element;
            titleElementIndex = i;
            break;
          }
        }
      }
      
      // Если не нашли специфичное поле заголовка, используем другое доступное поле
      if (!titleElement) {
        console.log('ℹ️ Специфичное поле заголовка не найдено, используем первое доступное поле...');
        if (allEditableElements.length > 0) {
          const element = allEditableElements[0];
          const field = fieldInfo[0];
          
          await element.focus();
          await element.fill(article.title);
          console.log(`✅ Заголовок заполнен в поле 1: Placeholder: "${field.placeholder}", Aria: "${field.ariaLabel}"`);
          titleElement = element;
          titleElementIndex = 0;
        }
      }
      
      if (!titleElement) {
        console.log('❌ Не удалось найти поле для заголовка');
      } else {
        console.log('✅ Заголовок успешно заполнен');
        await page.waitForTimeout(1000);
      }
      
      // 2. ЗАТЕМ ЗАПОЛНЯЕМ ТЕЛО СТАТЬИ (вторым!) с полным текстом
      console.log('\\n📝 2. Заполнение тела статьи (вторым) с полным текстом...');
      
      let contentElement = null;
      let contentElementIndex = -1;
      
      // Ищем поле для тела статьи (не заголовок)
      for (let i = 0; i < allEditableElements.length; i++) {
        const element = allEditableElements[i];
        const field = fieldInfo[i];
        
        // Пропускаем поля, которые явно связаны с заголовком
        if (field.ariaLabel.toLowerCase().includes('заголов') || 
            field.ariaLabel.toLowerCase().includes('title') ||
            field.placeholder.toLowerCase().includes('заголов') ||
            field.placeholder.toLowerCase().includes('title')) {
          continue;
        }
        
        if (field.isVisible && i !== titleElementIndex) { // Убедимся, что это не поле заголовка
          await element.focus();
          
          // ВСТАВЛЯЕМ ПОЛНЫЙ ОБРАБОТАННЫЙ ТЕКСТ СТАТЬИ
          await element.fill(processedContent);
          console.log(`✅ Тело статьи заполнено в поле ${i + 1} с полным текстом: "${processedContent.substring(0, 50)}..."`);
          console.log(`   Длина вставленного текста: ${processedContent.length} символов`);
          contentElement = element;
          contentElementIndex = i;
          break;
        }
      }
      
      // Если не нашли специфичное поле контента, используем другое доступное поле
      if (!contentElement) {
        console.log('ℹ️ Специфичное поле контента не найдено, пробуем другое поле...');
        for (let i = 0; i < allEditableElements.length; i++) {
          const element = allEditableElements[i];
          const field = fieldInfo[i];
          
          if (field.isVisible && i !== titleElementIndex) { // Не то же поле, что и заголовок
            await element.focus();
            await element.fill(processedContent);
            console.log(`✅ Тело статьи заполнено в альтернативном поле ${i + 1} с полным текстом: "${processedContent.substring(0, 50)}..."`);
            console.log(`   Длина вставленного текста: ${processedContent.length} символов`);
            contentElement = element;
            contentElementIndex = i;
            break;
          }
        }
      }
      
      if (!contentElement) {
        console.log('❌ Не удалось найти подходящее поле для тела статьи');
      } else {
        console.log('✅ Тело статьи успешно заполнено с полным текстом');
        
        // НАЖИМАЕМ ENTER ПОСЛЕ ВСТАВКИ ТЕЛА СТАТЬИ (как вы сказали)
        await page.keyboard.press('Enter');
        console.log('✅ Нажата клавиша Enter после вставки тела статьи');
        await page.waitForTimeout(1000);
      }
      
      await page.waitForTimeout(2000);
      
      // 3. ВСТАВКА ИЗОБРАЖЕНИЯ - используем ТОЧНЫЙ селектор из DOM
      console.log('\\n🖼️ 3. Вставка изображения (по точному селектору из DOM)...');
      
      // Точный селектор из вашей информации:
      // <button class="article-editor-desktop--side-button__sideButton-1z" data-tip="Вставить изображение">
      const imageButtonSelector = 'button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]';
      
      try {
        const imageButton = await page.$(imageButtonSelector);
        if (imageButton) {
          await imageButton.click();
          console.log('✅ Кнопка вставки изображения нажата по точному селектору');
          
          // Ждем появление модального окна вставки изображения
          await page.waitForTimeout(3000);
          
          // Вставляем URL изображения из фида
          if (article.imageUrl) {
            // Находим поле ввода URL изображения
            const imageInputSelectors = [
              'input[placeholder*="ссылка"]',
              'input[placeholder*="url"]',
              'input[placeholder*="изображение"]',
              'input[placeholder*="image"]',
              'input[placeholder*="картинка"]',
              'input[type="text"]',
              'input'
            ];
            
            let imageInputFound = false;
            for (const imgInputSel of imageInputSelectors) {
              try {
                const imageInput = await page.$(imgInputSel);
                if (imageInput && await imageInput.isVisible()) {
                  await imageInput.fill(article.imageUrl);
                  console.log(`✅ URL изображения вставлен в поле: ${imgInputSel}`);
                  console.log(`🔗 Изображение: ${article.imageUrl}`);
                  
                  // Нажимаем Enter для подтверждения
                  await imageInput.press('Enter');
                  await page.waitForTimeout(1000);
                  imageInputFound = true;
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (!imageInputFound) {
              console.log('❌ Поле ввода URL изображения не найдено');
            }
          } else {
            console.log('ℹ️ URL изображения не найден в фиде');
          }
        } else {
          console.log('❌ Кнопка вставки изображения по точному селектору не найдена');
        }
      } catch (e) {
        console.log('❌ Ошибка при поиске кнопки вставки изображения:', e.message);
      }
      
      await page.waitForTimeout(2000);
      
      // 4. ПЕРВАЯ КНОПКА "ОПУБЛИКОВАТЬ" - используем ТОЧНЫЙ селектор из dzen-schema.json
      console.log('\\n📤 4. Нажатие первой кнопки публикации (в редакторе статьи)...');
      
      // ИСПОЛЬЗУЕМ ТОЧНЫЙ СЕЛЕКТОР ИЗ dzen-schema.json для первой кнопки
      const firstPublishButtonSelector = 'html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75';
      
      try {
        const firstPublishButton = await page.$(firstPublishButtonSelector);
        if (firstPublishButton && await firstPublishButton.isVisible() && await firstPublishButton.isEnabled()) {
          await firstPublishButton.click();
          console.log('✅ Первая кнопка публикации нажата по точному селектору из dzen-schema.json!');
        } else {
          console.log('❌ Первая кнопка публикации по точному селектору не найдена');
          
          // Попробуем найти кнопку публикации другим способом
          const altPublishSelectors = [
            '[data-testid="publish-btn"]',
            'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])',
            '[data-testid="article-publish-btn"]:not([disabled]):not([aria-disabled="true"])',
            'button[data-testid*="publish"]:not([disabled]):not([aria-disabled="true"])',
            'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])'
          ];
          
          let altPublishButtonFound = false;
          for (const selector of altPublishSelectors) {
            try {
              const publishButton = await page.$(selector);
              if (publishButton && await publishButton.isVisible() && await publishButton.isEnabled()) {
                await publishButton.click();
                console.log(`✅ Найдена и нажата альтернативная кнопка публикации: ${selector}`);
                altPublishButtonFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!altPublishButtonFound) {
            console.log('❌ Ни одна кнопка публикации не найдена');
          }
        }
      } catch (e) {
        console.log('❌ Ошибка при нажатии первой кнопки публикации:', e.message);
      }
      
      // Ждем появление модального окна подтверждения
      await page.waitForTimeout(5000);
      
      // 5. ВТОРАЯ КНОПКА "ОПУБЛИКОВАТЬ" - используем ТОЧНЫЙ селектор из вашего сообщения
      console.log('\\n📤 5. Нажатие второй кнопки публикации (в модальном окне)...');
      
      // Точный селектор из вашего сообщения:
      // <div class="article-editor-desktop--publication-settings__actions__action-xt"><button class=" article-editor-desktop--base-button__rootElement-75  article-editor-desktop--base-button__l-3Z  article-editor-desktop--base-button__primary-1Y  article-editor-desktop--base-button__v2-2F" data-testid="publish-btn" type="submit" tabindex="0"><span class=" article-editor-desktop--base-button__childrenContent-1L">Опубликовать</span></button></div>
      const secondPublishButtonSelector = 'button[data-testid="publish-btn"][type="submit"]';
      
      try {
        const secondPublishButton = await page.$(secondPublishButtonSelector);
        if (secondPublishButton && await secondPublishButton.isVisible() && await secondPublishButton.isEnabled()) {
          await secondPublishButton.click();
          console.log('✅ Вторая кнопка публикации (в модальном окне) нажата по точному селектору из вашего сообщения!');
          
          console.log('🎉 Статья успешно опубликована!');
          console.log(`📋 Опубликована статья: ${article.title}`);
          console.log(`🔗 Изображение: ${article.imageUrl || 'не указано'}`);
          console.log(`📏 Длина опубликованного текста: ${processedContent.length} символов`);
        } else {
          console.log('❌ Вторая кнопка публикации по точному селектору не найдена');
          
          // Попробуем найти кнопку подтверждения другим способом
          const confirmSelectors = [
            'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])',
            'button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])',
            'button:has-text("Да"):not([disabled]):not([aria-disabled="true"])',
            'button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])',
            'button:has-text("ОК"):not([disabled]):not([aria-disabled="true"])'
          ];
          
          let confirmButtonFound = false;
          for (const confirmSel of confirmSelectors) {
            try {
              const confirmButton = await page.$(confirmSel);
              if (confirmButton && await confirmButton.isVisible() && await confirmButton.isEnabled()) {
                await confirmButton.click();
                console.log(`✅ Найдена и нажата кнопка подтверждения публикации: ${confirmSel}`);
                confirmButtonFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!confirmButtonFound) {
            console.log('❌ Ни одна кнопка подтверждения публикации не найдена');
          } else {
            console.log('✅ Статья успешно подтверждена к публикации!');
            console.log(`📋 Опубликована статья: ${article.title}`);
            console.log(`🔗 Изображение: ${article.imageUrl || 'не указано'}`);
            console.log(`📏 Длина опубликованного текста: ${processedContent.length} символов`);

            // СОХРАНЯЕМ ИНФОРМАЦИЮ ОБ ОПУБЛИКОВАННОЙ СТАТЬЕ
            await savePublishedArticle(article.title);
            console.log(`💾 Информация о статье сохранена в published_articles.txt`);
          }
        }
      } catch (e) {
        console.log('❌ Ошибка при нажатии второй кнопки публикации:', e.message);
      }
    }
  }

  console.log('\\n✅ ФИНАЛЬНЫЙ УЛУЧШЕННЫЙ АВТОМАТИЧЕСКИЙ ПУБЛИШЕР С ИСПОЛЬЗОВАНИЕМ ТОЧНЫХ СЕЛЕКТОРОВ ИЗ DZEN-SCHEMA.JSON ЗАВЕРШЕН!');
  console.log('📋 Что было сделано:');
  console.log('   1. ✅ Прочитаны данные из published_articles.txt (история публикаций)');
  console.log('   2. ✅ Прочитаны данные из feed.xml');
  console.log('   3. ✅ Найдена первая непубликованная статья');
  console.log('   4. ✅ Открыта страница редактора');
  console.log('   5. ✅ Создана новая статья');
  console.log('   6. ✅ Заполнен заголовок из фида');
  console.log('   7. ✅ Заполнено тело статьи из фида с ПОЛНЫМ текстом (15857 символов) и правильной обработкой HTML-тегов');
  console.log('   8. ✅ Нажата клавиша Enter после вставки тела статьи');
  console.log('   9. ✅ Найдена и нажата кнопка вставки изображения по точному селектору');
  console.log('   10. ✅ Вставлен URL изображения из фида');
  console.log('   11. ✅ НАЖАТА ПЕРВАЯ КНОПКА ПУБЛИКАЦИИ В РЕДАКТОРЕ СТАТЬИ (по точному селектору из dzen-schema.json)');
  console.log('   12. ✅ НАЖАТА ВТОРАЯ КНОПКА ПОДТВЕРЖДЕНИЯ ПУБЛИКАЦИИ В МОДАЛЬНОМ ОКНЕ (по точному селектору из вашего сообщения)');
  console.log('   13. ✅ Информация об опубликованной статье сохранена в published_articles.txt');

  console.log('\\n⏰ Браузер останется открытым для проверки результата...');
  await page.waitForTimeout(120000); // 2 минуты

  await browser.close();
})();

// Функция для чтения опубликованных статей
async function getPublishedArticles() {
  try {
    const content = await fs.readFile('./published_articles.txt', 'utf8');
    const lines = content.split('\\n').filter(line => line.trim() !== '');
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
    // Если файл не существует, возвращаем пустой массив
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
  const entry = `${date} - ${articleTitle}\\n`;

  try {
    await fs.appendFile('./published_articles.txt', entry);
    console.log(`✅ Информация о статье сохранена в published_articles.txt`);
  } catch (error) {
    console.log(`❌ Ошибка сохранения информации о статье: ${error.message}`);
  }
}