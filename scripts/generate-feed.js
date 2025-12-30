#!/usr/bin/env node

/**
 * RSS Feed Generator для Dzen
 * Генерирует feed.xml на основе статей из /articles/
 * ИСПРАВЛЕНО: удаляет *** маркеры перед конвертацией в RSS
 */

const fs = require('fs');
const path = require('path');
const markdownIt = require('markdown-it');
const xml = require('xml');

const md = new markdownIt({
  html: true,
  linkify: true,
  typographer: true
});

const mode = process.argv[2] || 'incremental';
const articlesDir = path.join(process.cwd(), 'articles');
const outputPath = path.join(process.cwd(), 'public', 'feed.xml');
const feedPath = outputPath; // Существующий feed

// ============================================================================
// КРИТИЧЕСКИЙ FIX: Функция удаления *** маркеров
// ============================================================================
function cleanAsteriskMarkers(text) {
  if (!text) return text;
  
  // Удаляем строки, состоящие ТОЛЬКО из ***
  let cleaned = text.replace(/^\*\*\*\s*$/gm, '');
  
  // Удаляем *** в начале/конце абзацев
  cleaned = cleaned.replace(/\*\*\*/g, '');
  
  // Удаляем лишние пробелы
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned.trim();
}

// Конвертируем markdown в HTML
function convertToHtml(markdown) {
  // ГЛАВНЫЙ FIX: очищаем *** ДО преобразования в HTML
  const cleaned = cleanAsteriskMarkers(markdown);
  
  let html = md.render(cleaned);
  
  // Дополнительная очистка HTML от невалидных тегов
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br\s*\/?>/g, '<br>');
  
  return html;
}

// Получаем список статей
function getArticles() {
  try {
    if (!fs.existsSync(articlesDir)) {
      return [];
    }
    
    return fs.readdirSync(articlesDir)
      .filter(file => file.endsWith('.md') || file.endsWith('.txt'))
      .map(file => {
        const filePath = path.join(articlesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stat = fs.statSync(filePath);
        
        // Парсим заголовок (первая строка)
        const lines = content.split('\n');
        const title = lines[0].replace(/^#+\s*/, '') || 'Без названия';
        const body = lines.slice(1).join('\n');
        
        return {
          id: path.basename(file, path.extname(file)),
          title: title.trim(),
          description: body.substring(0, 200).trim(),
          content: convertToHtml(body),
          pubDate: stat.mtime,
          file: file
        };
      })
      .sort((a, b) => b.pubDate - a.pubDate);
  } catch (error) {
    console.error('❌ Ошибка при чтении статей:', error);
    return [];
  }
}

// Генерируем RSS
function generateRss(articles) {
  const baseUrl = 'https://dzen-livid.vercel.app';
  const now = new Date().toUTCString();
  
  const rssItems = articles.slice(0, 20).map(article => ({
    item: [
      { title: article.title },
      { link: `${baseUrl}/articles/${article.id}` },
      { guid: article.id },
      { pubDate: article.pubDate.toUTCString() },
      { description: { _cdata: article.description } },
      { 'content:encoded': { _cdata: article.content } }
    ]
  }));
  
  const rssObject = {
    rss: [
      { _attr: { version: '2.0', 'xmlns:content': 'http://purl.org/rss/1.0/modules/content/' } },
      {
        channel: [
          { title: 'Dzen Content' },
          { link: 'https://dzen-livid.vercel.app' },
          { description: 'Автоматически генерируемый контент' },
          { language: 'ru' },
          { lastBuildDate: now },
          { ttl: 60 },
          ...rssItems
        ]
      }
    ]
  };
  
  return xml(rssObject, { declaration: true });
}

// ГЛАВНАЯ ЛОГИКА
(async () => {
  try {
    console.log('🔄 Генерирую RSS feed...');
    
    const articles = getArticles();
    console.log(`📄 Найдено статей: ${articles.length}`);
    
    if (articles.length === 0) {
      console.warn('⚠️  Нет статей для генерации RSS');
      return;
    }
    
    const rss = generateRss(articles);
    
    // Убеждаемся, что public/ существует
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Пишем RSS
    fs.writeFileSync(outputPath, rss);
    console.log(`✅ RSS сохранен: ${outputPath}`);
    console.log(`📊 Статей в feed: ${Math.min(articles.length, 20)}`);
    console.log(`🔧 *** маркеры удалены перед конвертацией HTML`);
    
  } catch (error) {
    console.error('❌ Ошибка при генерации RSS:', error);
    process.exit(1);
  }
})();
