const fs = require('fs').promises;

// Модуль для отслеживания опубликованных статей
class PublicationHistory {
  constructor(historyFile = './published_articles.txt') {
    this.historyFile = historyFile;
  }

  // 🔧 Normalize title for comparison - removes invisible chars, HTML entities, etc.
  normalizeTitle(title) {
    if (!title) return '';
    
    return title
      // Remove ANSI escape codes
      .replace(/\x1b\[[0-9;]*m/g, '')
      // Remove other control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Normalize HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      // Normalize different types of quotes
      .replace(/[«»""]/g, '"')
      .replace(/['']/g, "'")
      // Normalize different types of dashes
      .replace(/[—–]/g, '-')
      // Normalize whitespace (replace multiple spaces with single space)
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
      // Lowercase for case-insensitive comparison
      .toLowerCase();
  }

  // Функция для чтения опубликованных статей
  async getPublishedArticles() {
    try {
      const content = await fs.readFile(this.historyFile, 'utf8');
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
      // Если файл не существует, возвращаем пустой массив
      return [];
    }
  }

  // Функция для проверки, была ли статья уже опубликована
  isArticlePublished(articleTitle, publishedArticles) {
    const normalizedTarget = this.normalizeTitle(articleTitle);
    return publishedArticles.some(pub => {
      const normalizedPub = this.normalizeTitle(pub.title);
      return normalizedPub === normalizedTarget;
    });
  }

  // Функция для получения первой непубликованной статьи
  getFirstUnpublishedArticle(articles) {
    console.log('🔍 Checking for unpublished articles:\n');
    
    // 🐛 DEBUG: Show published articles
    console.log('📋 PUBLISHED ARTICLES DEBUG:');
    if (!this.publishedArticles || this.publishedArticles.length === 0) {
      console.log('   (no published articles yet)\n');
    } else {
      this.publishedArticles.forEach((pub, idx) => {
        console.log(`   [${idx + 1}] "${pub.title}"`);
        console.log(`        Length: ${pub.title.length}`);
        console.log(`        Normalized: "${this.normalizeTitle(pub.title)}"`);
        console.log(`        Hex: ${pub.title.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}`);
      });
      console.log();
    }
    
    // 🐛 DEBUG: Show articles from feed
    console.log('📰 ARTICLES FROM FEED DEBUG:');
    articles.forEach((art, idx) => {
      const isPublished = this.isArticlePublished(art.title, this.publishedArticles || []);
      const status = isPublished ? '✋ Already published' : '✅ NEW';
      
      console.log(`   [${idx + 1}/${articles.length}] ${status}`);
      console.log(`        Title: "${art.title}"`);
      console.log(`        Length: ${art.title.length}`);
      console.log(`        Normalized: "${this.normalizeTitle(art.title)}"`);
      console.log(`        Hex: ${art.title.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}`);
      console.log(`        Published: ${isPublished}`);
    });
    console.log();
    
    return articles.find(article => {
      return !this.isArticlePublished(article.title, this.publishedArticles || []);
    });
  }

  // Функция для сохранения информации об опубликованной статье
  async savePublishedArticle(articleTitle) {
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const entry = `${date} - ${articleTitle}\n`;
    
    try {
      await fs.appendFile(this.historyFile, entry);
      console.log(`✅ Информация о статье сохранена в ${this.historyFile}`);
    } catch (error) {
      console.log(`❌ Ошибка сохранения информации о статье: ${error.message}`);
    }
  }
}

module.exports = PublicationHistory;
