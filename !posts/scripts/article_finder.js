const fs = require('fs').promises;
const path = require('path');

/**
 * Article Finder
 * Finds articles with matching cover images in the articles directory
 */

class ArticleFinder {
  constructor(articlesPath = '..\\articles') {
    this.articlesPath = articlesPath;
  }

  /**
   * Find all articles with matching cover images (recursive)
   */
  async findArticlesWithImages() {
    const articles = [];

    try {
      await this.scanDirectoryRecursive(this.articlesPath, articles);
    } catch (error) {
      console.log('❌ Error finding articles:', error.message);
    }

    return articles;
  }

  /**
   * Recursively scan directory for articles
   */
  async scanDirectoryRecursive(dirPath, articles) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectory
          await this.scanDirectoryRecursive(fullPath, articles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const baseName = path.basename(entry.name, '.md');

          // Look for corresponding image files
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
          let imagePath = null;

          for (const ext of imageExtensions) {
            const potentialImagePath = path.join(dirPath, baseName + ext);
            if (await this.fileExists(potentialImagePath)) {
              imagePath = potentialImagePath;
              break;
            }
          }

          if (imagePath) {
            articles.push({
              articlePath: fullPath,
              imagePath,
              directory: path.relative(this.articlesPath, dirPath),
              baseName
            });
            console.log(`📄 Found article with image: ${path.relative(this.articlesPath, fullPath)} -> ${path.basename(imagePath)}`);
          } else {
            console.log(`⚠️  Article without image: ${path.relative(this.articlesPath, fullPath)}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Error scanning directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get article content
   */
  async getArticleContent(articlePath) {
    try {
      const content = await fs.readFile(articlePath, 'utf8');
      return this.parseArticle(content);
    } catch (error) {
      console.log(`❌ Error reading article ${articlePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse article content from markdown
   */
  parseArticle(content) {
    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    let title = 'Без названия';
    let body = content;
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/title:\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/['"]/g, '').trim();
      }
      body = content.slice(frontmatterMatch[0].length);
    } else {
      // If no frontmatter, try to extract first line as title
      const lines = content.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        title = lines[0].replace(/^#+\s*/, '').trim(); // Remove markdown heading markers
        body = lines.slice(1).join('\n');
      }
    }
    
    return { title, content: body };
  }
}

module.exports = ArticleFinder;

// If this script is run directly, find and list articles
if (require.main === module) {
  (async () => {
    const finder = new ArticleFinder();
    const articles = await finder.findArticlesWithImages();
    
    console.log(`\n📊 Summary: Found ${articles.length} articles with matching images`);
    
    for (const article of articles) {
      const parsed = await finder.getArticleContent(article.articlePath);
      if (parsed) {
        console.log(`\n📝 Article: ${parsed.title}`);
        console.log(`📄 Path: ${article.articlePath}`);
        console.log(`🖼️  Image: ${article.imagePath}`);
        console.log(`📏 Content length: ${parsed.content.length} characters`);
      }
    }
  })();
}