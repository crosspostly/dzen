#!/usr/bin/env npx tsx

import { playwrightService } from '../services/playwrightService';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

// 📋 Configuration
const CONFIG = {
  cookiesSource: process.env.CI ? 'ENVIRONMENT' : 'FILE',
  cookiesPath: path.join(process.cwd(), 'config', 'cookies.json'),
  feedPath: path.join(process.cwd(), 'public', 'feed.xml'),
  historyPath: path.join(process.cwd(), '!posts', 'PRODUCTION_READY', 'published_articles.txt'),
  headless: process.env.HEADLESS !== 'false',
  tempImagesDir: path.join(process.cwd(), 'tmp', 'images'),
};

// 📥 Download image from URL to local file
async function downloadImage(url: string, destPath: string): Promise<string | null> {
  try {
    console.log(`📥 Downloading image: ${url}`);
    
    // Create directory if not exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    
    // Download using https
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Image downloaded: ${destPath}`);
          resolve(destPath);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    console.error(`❌ Failed to download image: ${(error as Error).message}`);
    return null;
  }
}

// 📖 Get articles from feed.xml
async function getArticlesFromFeed() {
  try {
    console.log(`📄 Opening feed: ${CONFIG.feedPath}`);
    const feedContent = await fs.readFile(CONFIG.feedPath, 'utf8');
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let match;
    
    while ((match = itemRegex.exec(feedContent)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.+?)\]\]>/) || itemContent.match(/<title>(.+?)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.+?)\]\]>/g, '$1').trim() : 'Without title';
      
      const linkMatch = itemContent.match(/<link>(.+?)<\/link>/);
      const link = linkMatch ? linkMatch[1] : '';
      
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url="(.+?)"[^>]*>/);
      const enclosureMatch = itemContent.match(/<enclosure[^>]*url="(.+?)"[^>]*>/);
      const imageUrl = mediaContentMatch ? mediaContentMatch[1] : (enclosureMatch ? enclosureMatch[1] : '');
      
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]+?)\]\]>/) || itemContent.match(/<content:encoded>([\s\S]+?)<\/content:encoded>/);
      const descriptionMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]+?)\]\]>/) || itemContent.match(/<description>([\s\S]+?)<\/description>/);
      const content = contentMatch ? contentMatch[1] : (descriptionMatch ? descriptionMatch[1] : '');
      
      items.push({ title, link, imageUrl, content });
    }
    
    return items;
  } catch (error) {
    console.error(`❌ Error reading feed: ${(error as Error).message}`);
    return [];
  }
}

// 🏄 Process HTML content
function processArticleContent(content: string) {
  if (!content) return '';
  
  let processed = content
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<br>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  processed = processed.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return processed.trim();
}

async function loadCookies() {
  // 1. Try Local File (Priority as per user request)
  try {
    if (await fs.stat(CONFIG.cookiesPath).catch(() => false)) {
      const fileContent = await fs.readFile(CONFIG.cookiesPath, 'utf8');
      if (fileContent && fileContent.length > 10) {
         console.log('🍪 Using cookies from Local File (config/cookies.json)');
         return fileContent;
      }
    }
  } catch (e) {
    // Continue to env var
  }

  // 2. Try Environment Variable (Fallback)
  const envCookies = process.env.DZEN_COOKIES_JSON;
  if (envCookies && envCookies.length > 10) {
    console.log('🍪 Using cookies from Environment Variable (DZEN_COOKIES_JSON)');
    return envCookies;
  }

  throw new Error('❌ Cookies not found in config/cookies.json file OR DZEN_COOKIES_JSON environment variable!');
}

async function getPublishedArticles() {
  try {
    const content = await fs.readFile(CONFIG.historyPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.*?)(?: - https?:\/\/.+)?$/);
      return match ? { date: match[1], title: match[2].trim() } : null;
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function isArticlePublished(articleTitle: string, publishedArticles: any[]) {
  return publishedArticles.some(pub => pub.title.trim() === articleTitle.trim());
}

async function savePublishedArticle(article: any, url: string) {
  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const entry = `${date} - ${article.title} - ${url}\n`;
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(CONFIG.historyPath), { recursive: true });
    await fs.appendFile(CONFIG.historyPath, entry);
    console.log(`✅ Saved to history: "${article.title.substring(0, 50)}"...`);
  } catch (error) {
    console.error(`❌ Error saving history: ${(error as Error).message}`);
  }
}

// 🔍 Resolve image filename to local path
async function resolveLocalImagePath(fileName: string, searchDir: string): Promise<string> {
  try {
    const baseDir = path.join(process.cwd(), searchDir);
    console.log(`🔍 Searching for local image: "${fileName}" in ${baseDir}`);

    // Method 1: Direct find command
    const findCmd = `find "${baseDir}" -name "${fileName}" 2>/dev/null | head -n 1`;
    const localPath = execSync(findCmd).toString().trim();

    if (localPath) {
      const exists = await fs.stat(localPath).catch(() => null);
      if (exists) {
        console.log(`✅ Found local file: ${localPath}`);
        return localPath;
      }
    }

    // Method 2: Try with common extensions if fileName has no extension
    if (!path.extname(fileName)) {
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      for (const ext of extensions) {
        const findWithExt = `find "${baseDir}" -name "${fileName}${ext}" 2>/dev/null | head -n 1`;
        const pathWithExt = execSync(findWithExt).toString().trim();
        if (pathWithExt && await fs.stat(pathWithExt).catch(() => null)) {
          console.log(`✅ Found local file with extension: ${pathWithExt}`);
          return pathWithExt;
        }
      }
    }

    // Method 3: Fuzzy find - search for partial match
    const baseName = path.basename(fileName, path.extname(fileName));
    const fuzzyFind = `find "${baseDir}" -name "*${baseName}*" 2>/dev/null | head -n 1`;
    const fuzzyPath = execSync(fuzzyFind).toString().trim();
    if (fuzzyPath && await fs.stat(fuzzyPath).catch(() => null)) {
      console.log(`✅ Found local file (fuzzy match): ${fuzzyPath}`);
      return fuzzyPath;
    }

    console.log(`⚠️ Local file not found: ${fileName}`);
    return '';
  } catch (e) {
    console.log(`⚠️ Error resolving local path for ${fileName}: ${(e as Error).message}`);
    return '';
  }
}

// 🚀 Main
async function main() {
  console.log('🤖 ==== AUTO-PUBLISHER (TS) STARTING ====\n');
  
  try {
    const cookiesJson = await loadCookies();
    const publishedArticles = await getPublishedArticles();
    const articles = await getArticlesFromFeed();
    
    if (articles.length === 0) {
      console.log('❌ No articles found in feed.xml');
      process.exit(0);
    }
    
    // Find first unpublished
    let articleToPublish = null;
    for (const article of articles) {
      if (!isArticlePublished(article.title, publishedArticles)) {
        articleToPublish = article;
        break;
      }
    }
    
    if (!articleToPublish) {
      console.log('✅ All articles already published');
      process.exit(0);
    }
    
    console.log(`\n📝 Publishing article: "${articleToPublish.title}"`);
    const processedContent = processArticleContent(articleToPublish.content);

    // Resolve imageUrl to local file (download if URL)
    let finalImageUrl = articleToPublish.imageUrl;

    if (finalImageUrl) {
      console.log(`\n🖼️ Original imageUrl: ${finalImageUrl}`);

      // Strategy 1: GitHub/raw.githubusercontent.com URLs → download to local file
      if (finalImageUrl.includes('raw.githubusercontent.com') || finalImageUrl.includes('github.com')) {
        const fileName = decodeURIComponent(path.basename(finalImageUrl)).trim();
        const localPath = path.join(CONFIG.tempImagesDir, fileName);
        
        // Download image from GitHub
        const downloadedPath = await downloadImage(finalImageUrl, localPath);
        if (downloadedPath) {
          finalImageUrl = downloadedPath;
          console.log(`✅ Using downloaded image: ${finalImageUrl}`);
        } else {
          console.log(`⚠️ Failed to download image, continuing without`);
          finalImageUrl = '';
        }
      }
      // Strategy 2: dzen.ru URLs → extract filename and look in articles/
      else if (finalImageUrl.includes('dzen.ru')) {
        const fileName = decodeURIComponent(path.basename(finalImageUrl)).trim();
        finalImageUrl = await resolveLocalImagePath(fileName, 'articles');
      }
      // Strategy 3: Already a local path → verify it exists
      else if (finalImageUrl.startsWith('/') || finalImageUrl.includes(':\\')) {
        const exists = await fs.stat(finalImageUrl).catch(() => null);
        if (!exists) {
          console.log(`⚠️ Local path does not exist: ${finalImageUrl}`);
          finalImageUrl = '';
        }
      }
      // Strategy 4: External URL → keep as is (for URL dialog method)
      else {
        console.log(`ℹ️ Keeping external URL as-is`);
      }

      console.log(`🖼️ Final imageUrl: ${finalImageUrl || '(none)'}`);
    }

    const result = await playwrightService.publish({
      title: articleToPublish.title,
      content: processedContent,
      imageUrl: finalImageUrl || undefined
    }, {
      cookiesJson,
      headless: CONFIG.headless
    });
    
    if (result.success && result.url) {
      console.log(`\n🎉 SUCCESS! Published at: ${result.url}`);
      await savePublishedArticle(articleToPublish, result.url);
    } else {
      console.error(`\n❌ FAILED: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
