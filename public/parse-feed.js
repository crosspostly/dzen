#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Парсер для XML
const parser = new xml2js.Parser();

// Путь к feed.xml
const feedPath = path.join(__dirname, 'feed.xml');

// Читаем и парсим RSS
fs.readFile(feedPath, 'utf8', async (err, data) => {
  if (err) {
    console.error('Ошибка чтения feed.xml:', err);
    process.exit(1);
  }

  try {
    const result = await parser.parseStringPromise(data);
    const items = result.rss.channel[0].item || [];

    const articles = items.map((item) => {
      // Извлекаем просмотры из title (если они там есть)
      const title = item.title[0];
      const description = item.description[0];
      const link = item.link[0];
      const pubDate = item.pubDate ? item.pubDate[0] : null;
      const guid = item.guid ? item.guid[0]._ : null;

      // Пытаемся вытащить количество просмотров
      // Может быть в custom field или нужно скрейпить со страницы
      let views = null;

      return {
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
        pubDate: pubDate,
        guid: guid,
        views: views, // Будет null, пока не добавим скрейпинг
      };
    });

    // Создаем финальный JSON
    const output = {
      total: articles.length,
      articles: articles,
      metadata: {
        channel_title: result.rss.channel[0].title[0],
        channel_link: result.rss.channel[0].link[0],
        description: result.rss.channel[0].description[0],
        last_updated: result.rss.channel[0].lastBuildDate[0],
        generator: result.rss.channel[0].generator[0],
      },
      note: 'Для количества просмотров нужен скрейпинг со страницы Дзена (требует puppeteer или axios+cheerio)',
    };

    // Сохраняем в articles.json
    const outputPath = path.join(__dirname, 'articles.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✅ Спарсено ${articles.length} статей`);
    console.log(`📄 Сохранено в ${outputPath}`);
  } catch (parseErr) {
    console.error('Ошибка парсинга XML:', parseErr);
    process.exit(1);
  }
});
