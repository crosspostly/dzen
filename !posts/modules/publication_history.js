const fs = require('fs').promises;

// Модуль для отслеживания опубликованных статей
class PublicationHistory {
  constructor(historyFile = './published_articles.txt') {
    this.historyFile = historyFile;
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
    return publishedArticles.some(pub => pub.title.trim() === articleTitle.trim());
  }

  // Функция для получения первой непубликованной статьи
  getFirstUnpublishedArticle(articles) {
    return articles.find(article => {
      return !this.isArticlePublished(article.title, this.publishedArticles);
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