#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new xml2js.Parser();
const feedPath = path.join(__dirname, 'feed.xml');

// Функция для экстрактинга просмотров из HTML
const getViews = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 5000,
    });

    const $ = cheerio.load(data);

    // Ищем количество просмотров в meta теге или в видимых элементах
    // Опция 1: Мета теги og:image:width или другие
    let views = null;

    // Попытка 1: Паттерн в data-атрибутах
    const viewsText = $('[data-views]').attr('data-views') ||
                      $('[data-stat="views"]').text() ||
                      $('[class*="views"]').text();

    if (viewsText) {
      const match = viewsText.match(/\d+/);
      if (match) {
        views = parseInt(match[0]);
      }
    }

    // Попытка 2: Локальные стораж Дзена (JSON-LD schema)
    const schemaScript = $('script[type="application/ld+json"]').html();
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript);
        // Может быть в schema.aggregateRating.ratingCount
        if (schema.aggregateRating && schema.aggregateRating.ratingCount) {
          views = schema.aggregateRating.ratingCount;
        }
      } catch (e) {
        // Парсковать не удалось
      }
    }

    return views;
  } catch (err) {
    console.warn(`⚠️  Не смог получить просмотры для ${url}: ${err.message}`);
    return null;
  }
};

// Маин функция
const parseFeed = async () => {
  try {
    const data = fs.readFileSync(feedPath, 'utf8');
    const result = await parser.parseStringPromise(data);
    const items = result.rss.channel[0].item || [];

    console.log(`\ud83d\udd0d Найдено ${items.length} статей. Загружаю просмотры...\n`);

    const articles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.title[0];
      const description = item.description[0];
      const link = item.link[0];
      const pubDate = item.pubDate ? item.pubDate[0] : null;
      const guid = item.guid ? item.guid[0]._ : null;

      // Получаем просмотры
      let views = null;
      try {
        views = await getViews(link);
        console.log(`[${i + 1}/${items.length}] ✅ "${title.substring(0, 50)}..." - ${views || 'На наработке'} просмотров`);
      } catch (err) {
        console.log(`[${i + 1}/${items.length}] ⚠️  "${title.substring(0, 50)}..." - ошибка`);
      }

      articles.push({
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
        views: views,
        pubDate: pubDate,
        guid: guid,
      });

      // Задержка для исключения блокирования
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Сортируем по количеству просмотров (серъезные сначала)
    articles.sort((a, b) => (b.views || 0) - (a.views || 0));

    const output = {
      total: articles.length,
      articles: articles,
      metadata: {
        channel_title: result.rss.channel[0].title[0],
        channel_link: result.rss.channel[0].link[0],
        description: result.rss.channel[0].description[0],
        last_updated: result.rss.channel[0].lastBuildDate[0],
        generator: result.rss.channel[0].generator[0],
        parsed_at: new Date().toISOString(),
      },
    };

    const outputPath = path.join(__dirname, 'articles.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n✅ Готово! Парсено ${articles.length} статей`);
    console.log(`📄 Файл: ${outputPath}`);
    console.log(`\n📊 Топ-3 по просмотрам:`);
    articles.slice(0, 3).forEach((a, i) => {
      console.log(`  ${i + 1}. "${a.title.substring(0, 50)}" - ${a.views || 'N/A'} просмотров`);
    });
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
};

parseFeed();
