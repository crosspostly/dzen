const { chromium } = require('playwright');
const fs = require('fs').promises;

// Функция для извлечения данных из XML
async function getArticlesFromFeed() {
  try {
    const feedContent = await fs.readFile('C:\\Users\\varsm\\OneDrive\\Desktop\\projects\\dzen\\public\\feed.xml', 'utf8');
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let match;
    
    while ((match = itemRegex.exec(feedContent)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Без заголовка';
      
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url="(.*?)"[^>]*>/);
      const imageUrl = mediaContentMatch ? mediaContentMatch[1] : '';
      
      const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<description>(.*?)<\/description>/);
      const description = descMatch ? descMatch[1] : '';
      
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[(.*?)\]\]>/) || itemContent.match(/<content:encoded>(.*?)<\/content:encoded>/);
      const content = contentMatch ? contentMatch[1] : description;
      
      items.push({
        title: title,
        description: description,
        imageUrl: imageUrl,
        content: content
      });
    }
    
    return items;
  } catch (error) {
    console.error('❌ Ошибка при чтении feed.xml:', error.message);
    return [];
  }
}

// Функция для обработки HTML-тегов
function processArticleContent(content) {
  if (!content) return '';
  
  let processed = content
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  processed = processed.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  return processed;
}

// Функция для чтения опубликованных статей
async function getPublishedArticles() {
  try {
    const content = await fs.readFile('./published_articles.txt', 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+)/);
      return match ? { date: match[1], title: match[2] } : null;
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Функция для проверки, была ли статья опубликована
function getFirstUnpublishedArticle(articles, publishedArticles) {
  for (const article of articles) {
    if (!publishedArticles.some(pub => pub.title.trim() === article.title.trim())) {
      return article;
    }
  }
  return null;
}

// Функция для сохранения опубликованной статьи
async function savePublishedArticle(articleTitle) {
  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const entry = `${date} - ${articleTitle}\n`;
  try {
    await fs.appendFile('./published_articles.txt', entry);
    console.log(`✅ Статья сохранена в историю`);
  } catch (error) {
    console.log(`❌ Ошибка сохранения: ${error.message}`);
  }
}

(async () => {
  console.log('🤖 AUTO-PUBLISHER ЗАПУЩЕН\n');

  // Получаем опубликованные статьи
  const publishedArticles = await getPublishedArticles();
  console.log(`📋 Найдено ${publishedArticles.length} опубликованных статей`);

  // Получаем статьи из фида
  const articles = await getArticlesFromFeed();
  if (articles.length === 0) {
    console.log('❌ Не найдено статей в feed.xml');
    process.exit(1);
  }
  console.log(`📄 Найдено ${articles.length} статей в фиде\n`);

  // Ищем первую непубликованную статью
  const article = getFirstUnpublishedArticle(articles, publishedArticles);
  if (!article) {
    console.log('✅ Все статьи уже опубликованы');
    process.exit(0);
  }

  console.log(`🔍 Обнаружена новая статья: "${article.title.substring(0, 50)}..."`);
  const processedContent = processArticleContent(article.content);
  console.log(`📝 Длина контента: ${processedContent.length} символов\n`);

  // Запускаем браузер
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
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
    console.log('✅ Cookies добавлены в браузер\n');
  } catch (error) {
    console.log('❌ Ошибка загрузки cookies:', error.message);
  }

  // Переходим на страницу редактора
  console.log('🌐 Переход на страницу редактора...');
  await page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('✅ Страница загружена\n');
  await page.waitForTimeout(5000);

  // Нажимаем кнопку добавления публикации
  const addBtn = await page.$('[data-testid="add-publication-button"]');
  if (addBtn) {
    await addBtn.click();
    console.log('✅ Кнопка "Добавить публикацию" нажата');
    await page.waitForTimeout(3000);
  }

  // Нажимаем кнопку "Написать статью"
  const writeBtn = await page.$('text="Написать статью"');
  if (writeBtn) {
    await writeBtn.click();
    console.log('✅ Кнопка "Написать статью" нажата');
    await page.waitForTimeout(8000);
  }

  // Закрываем модальное окно помощи
  await page.evaluate(() => {
    document.querySelectorAll('.ReactModal__Overlay, .article-editor-desktop--help-popup__overlay-3q').forEach(el => {
      el.style.display = 'none';
      el.remove();
    });
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);

  // Находим поля ввода
  const allInputs = await page.$$('input[type="text"], textarea, div[contenteditable="true"]');
  console.log(`🔍 Найдено ${allInputs.length} полей ввода\n`);

  // 1. ЗАПОЛНЯЕМ ЗАГОЛОВОК (первое поле)
  if (allInputs.length > 0) {
    const titleField = allInputs[0];
    await titleField.focus();
    await titleField.fill(article.title);
    console.log(`✅ Заголовок заполнен: "${article.title.substring(0, 40)}..."`);
    await page.waitForTimeout(500);
  }

  // 2. ЗАПОЛНЯЕМ КОНТЕНТ (второе поле)
  if (allInputs.length > 1) {
    const contentField = allInputs[1];
    await contentField.focus();
    await contentField.fill(processedContent);
    console.log(`✅ Контент заполнен: ${processedContent.length} символов`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }

  // 3. ВСТАВЛЯЕМ ИЗОБРАЖЕНИЕ
  if (article.imageUrl) {
    const imgBtn = await page.$('button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]');
    if (imgBtn) {
      await imgBtn.click();
      console.log('✅ Кнопка "Вставить изображение" нажата');
      await page.waitForTimeout(2000);

      // Находим поле для URL изображения и вставляем
      const imgInputs = await page.$$('input[type="text"]');
      if (imgInputs.length > 0) {
        await imgInputs[0].fill(article.imageUrl);
        await imgInputs[0].press('Enter');
        console.log(`✅ Изображение вставлено: ${article.imageUrl}`);
      }
    }
    await page.waitForTimeout(2000);
  }

  // 4. ПУБЛИКУЕМ СТАТЬЮ - используем селектор из лога
  console.log('\n📤 Публикация статьи...');
  
  // Первая кнопка публикации в редакторе
  const publishBtn = await page.$('button:has-text("Опубликовать"):not([disabled])');
  if (publishBtn) {
    await publishBtn.click();
    console.log('✅ Первая кнопка публикации нажата');
    await page.waitForTimeout(3000);
  }

  // Вторая кнопка (подтверждение в модальном окне)
  const confirmBtn = await page.$('button[data-testid="publish-btn"][type="submit"]');
  if (confirmBtn) {
    await confirmBtn.click();
    console.log('✅ Подтверждение публикации');
    await page.waitForTimeout(2000);
  }

  // Сохраняем в историю
  await savePublishedArticle(article.title);
  
  console.log('\n🎉 Статья успешно опубликована!');
  console.log(`📋 Название: ${article.title}`);
  console.log(`🖼️ Изображение: ${article.imageUrl || 'не добавлено'}`);
  console.log(`📝 Размер текста: ${processedContent.length} символов`);

  await page.waitForTimeout(5000);
  await browser.close();
  process.exit(0);
})();
