const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// 🤖 Функция для обработки капчи "Я не робот" (включая фреймы) с ожиданием
async function handleCaptcha(page, maxAttempts = 5) {
  const captchaSelector = '#not-robot-captcha-checkbox';
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Сначала ищем на основной странице
      let captchaInput = await page.$(captchaSelector);
      
      // Если нашли инпут, ищем его родителя label
      if (captchaInput) {
        try {
            const label = await captchaInput.evaluateHandle(el => el.closest('label'));
            if (label) {
                console.log('🤖 Обнаружена капча на основной странице! Кликаю по label...');
                await label.click();
            } else {
                await captchaInput.click({ force: true });
            }
            console.log('✅ Чекбокс капчи нажат');
            await page.waitForTimeout(3000);
            return true;
        } catch (e) { console.log('⚠️ Не удалось кликнуть по капче на главной:', e.message); }
      }
      
      // Ищем во всех фреймах
      const frames = page.frames();
      for (const frame of frames) {
        try {
             captchaInput = await frame.$(captchaSelector);
             if (captchaInput) {
                console.log(`🤖 Капча обнаружена во фрейме: ${frame.url().substring(0, 50)}...`);
                await page.waitForTimeout(1000 + Math.random() * 1000);
                
                // Ищем label внутри фрейма
                const label = await frame.$(`label:has(${captchaSelector})`) || captchaInput;
                
                // Кликаем (используем force: true на всякий случай)
                await label.click({ force: true });
                
                console.log('✅ Чекбокс капчи нажат внутри фрейма');
                await page.waitForTimeout(3000);
                return true;
             }
          } catch(e) { /* игнорируем ошибки доступа к элементам фрейма */ }
      }
      
      // Если не нашли, ждем немного перед следующей попыткой
      if (i < maxAttempts - 1) await page.waitForTimeout(1000);
      
    } catch (e) {
      console.log('ℹ️ Ошибка при поиске капчи:', e.message);
    }
  }
  return false;
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
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url=\"(.*?)\"[^>]*>/);
      const imageUrl = mediaContentMatch ? mediaContentMatch[1] : '';

      // Извлекаем дату публикации
      const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const pubDate = dateMatch ? dateMatch[1] : '';

      // Извлекаем описание
      const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/) || itemContent.match(/<description>([\s\S]*?)<\/description>/);
      const description = descMatch ? descMatch[1] : '';

      // Извлекаем полный контент
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]>/) || itemContent.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
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
    return;
  }

  console.log(`📝 Найдена новая статья для публикации: ${article.title.substring(0, 50)}...`);
  
  // Обрабатываем контент статьи
  const processedContent = processArticleContent(article.content);
  console.log(`✅ Контент обработан, длина: ${processedContent.length} символов`);

  // Запускаем браузер (Headless для совместимости с CI, можно менять на false для отладки)
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.12.0.0 Safari/537.36',
    permissions: ['clipboard-read', 'clipboard-write']
  });

  const page = await context.newPage();

  // Загружаем куки
  try {
    const cookiesPath = path.join(__dirname, 'config/cookies.json');
    const cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf8'));
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
      
      await page.waitForTimeout(8000);
      
      // Закрываем всплывающее окно помощи
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, .article-editor-desktop--help-popup__overlay-3q');
        overlays.forEach(overlay => {
          overlay.style.display = 'none';
          overlay.remove();
        });
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(3000);
      
      // НАЙДЕМ ВСЕ ПОЛЯ ВВОДА НА СТРАНИЦЕ
      const allEditableElements = await page.$$('input[type="text"], textarea, div[contenteditable="true"]');
      console.log(`🔍 Найдено ${allEditableElements.length} полей ввода`);
      
      let titleElementIndex = -1;
      
      // 1. ЗАПОЛНЯЕМ ЗАГОЛОВОК (человеческий ввод)
      console.log('\n📝 1. Заполнение заголовка (первым)...');
      
      // Используем первое доступное поле как заголовок
      if (allEditableElements.length > 0) {
          const element = allEditableElements[0];
          titleElementIndex = 0;
          await element.focus();
          // Имитация печати заголовка
          await element.type(article.title, { delay: 100 });
          console.log(`✅ Заголовок напечатан`);
      } else {
          console.log('❌ Поле заголовка не найдено');
      }
      
      await page.waitForTimeout(1000);
      
      // 2. ЗАПОЛНЯЕМ ТЕЛО СТАТЬИ (Copy-Paste)
      console.log('\n📝 2. Заполнение тела статьи (вторым) методом Copy-Paste...');
      
      if (allEditableElements.length > 1) {
          const element = allEditableElements[1];
          await element.focus();
          
          // КОПИРУЕМ ТЕКСТ В БУФЕР ОБМЕНА
          await page.evaluate((text) => navigator.clipboard.writeText(text), processedContent);
          console.log('📋 Текст скопирован в буфер обмена');
          
          await page.waitForTimeout(500 + Math.random() * 1000);
          
          // ВСТАВЛЯЕМ ТЕКСТ ЧЕРЕЗ CTRL+V
          await page.keyboard.press('Control+V');
          
          console.log(`✅ Тело статьи вставлено через Ctrl+V`);
          console.log(`   Длина вставленного текста: ${processedContent.length} символов`);
          
          await page.keyboard.press('Enter');
          
          // ИМИТАЦИЯ ЧТЕНИЯ (СКРОЛЛ)
          console.log('👀 Имитация чтения статьи (скролл)...');
          await page.mouse.wheel(0, 500); 
          await page.waitForTimeout(1000);
          await page.mouse.wheel(0, -500);
      } else {
          console.log('❌ Поле контента не найдено');
      }
      
      await page.waitForTimeout(2000);
      
      // 3. ВСТАВКА ИЗОБРАЖЕНИЯ
      console.log('\n🖼️ 3. Вставка изображения...');
      const imageButtonSelector = 'button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]';
      
      try {
        const imageButton = await page.$(imageButtonSelector);
        if (imageButton) {
          await imageButton.click();
          await page.waitForTimeout(3000);
          
          if (article.imageUrl) {
            const imageInput = await page.$('input[type="text"]');
            if (imageInput) {
                await imageInput.fill(article.imageUrl);
                console.log(`✅ URL изображения вставлен`);
                await imageInput.press('Enter');
                await page.waitForTimeout(1000);
            } else {
                console.log('❌ Поле ввода URL изображения не найдено');
            }
          }
        } else {
          console.log('❌ Кнопка вставки изображения не найдена');
        }
      } catch (e) {
        console.log('❌ Ошибка при вставке изображения:', e.message);
      }
      
      await page.waitForTimeout(2000);
      
      // 4. ПЕРВАЯ КНОПКА "ОПУБЛИКОВАТЬ"
      console.log('\n📤 4. Нажатие первой кнопки публикации...');
      
      const firstPublishButtonSelector = 'button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])';
      
      try {
        const firstPublishButton = await page.$(firstPublishButtonSelector);
        if (firstPublishButton && await firstPublishButton.isVisible()) {
          await firstPublishButton.click();
          console.log('✅ Первая кнопка публикации нажата');
          
          // Проверяем капчу сразу
          await handleCaptcha(page);
        } else {
          console.log('❌ Первая кнопка публикации не найдена');
        }
      } catch (e) {
        console.log('❌ Ошибка при нажатии первой кнопки:', e.message);
      }
      
      await page.waitForTimeout(5000);
      
      // 5. ВТОРАЯ КНОПКА "ОПУБЛИКОВАТЬ"
      console.log('\n📤 5. Нажатие второй кнопки публикации...');
      
      const secondPublishButtonSelector = 'button[data-testid="publish-btn"][type="submit"]';
      
      try {
        const secondPublishButton = await page.$(secondPublishButtonSelector);
        if (secondPublishButton && await secondPublishButton.isVisible()) {
          await secondPublishButton.click();
          console.log('✅ Вторая кнопка публикации нажата');
          
          // Проверяем капчу (с долгим ожиданием)
          await handleCaptcha(page, 15);
          
          // ЖДЕМ СМЕНЫ URL
          console.log('⏳ Ожидание перенаправления на опубликованную статью...');
          try {
            await page.waitForFunction(() => !window.location.href.includes('/editor/'), { timeout: 30000 });
            
            const finalUrl = page.url();
            console.log(`🔗 Переход выполнен. Новый URL: ${finalUrl}`);

            if (finalUrl.includes('/a/') || finalUrl.includes('/media/')) {
              console.log('🎉 Статья УСПЕШНО опубликована и доступна!');
              console.log(`🔗 Ссылка: ${finalUrl}`);
              await savePublishedArticle(article.title, finalUrl);
            } else {
              console.log('⚠️ Переход выполнен, но URL странный. Сохраняю как есть.');
              await savePublishedArticle(article.title, finalUrl);
            }
          } catch (error) {
            console.log('❌ Тайм-аут! URL не изменился. Публикация могла не пройти.');
            await page.screenshot({ path: path.join(__dirname, 'error_publish.png'), fullPage: true });
          }
          
        } else {
          console.log('❌ Вторая кнопка публикации не найдена');
        }
      } catch (e) {
        console.log('❌ Ошибка при нажатии второй кнопки:', e.message);
      }
    }
  }

  console.log('\n✅ ТЕСТОВЫЙ ПУБЛИШЕР ЗАВЕРШЕН');
  await browser.close();
})();

// Функция для чтения опубликованных статей
async function getPublishedArticles() {
  try {
    const historyPath = path.join(__dirname, 'published_articles.txt');
    const content = await fs.readFile(historyPath, 'utf8');
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
async function savePublishedArticle(articleTitle, url = 'нет ссылки') {
  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const entry = `${date} - ${articleTitle} - ${url}\n`;

  try {
    const historyPath = path.join(__dirname, 'published_articles.txt');
    await fs.appendFile(historyPath, entry);
    console.log(`✅ Информация о статье сохранена в published_articles.txt`);
  } catch (error) {
    console.log(`❌ Ошибка сохранения информации о статье: ${error.message}`);
  }
}
