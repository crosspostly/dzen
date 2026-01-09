#!/usr/bin/env npx tsx

import { playwrightService } from '../services/playwrightService';
import fs from 'fs/promises';
import path from 'path';

// 📋 Configuration
const CONFIG = {
  cookiesSource: process.env.CI ? 'ENVIRONMENT' : 'FILE',
  cookiesPath: path.join(process.cwd(), 'config', 'cookies.json'),
  feedPath: path.join(process.cwd(), 'public', 'feed.xml'),
  historyPath: path.join(process.cwd(), '!posts', 'PRODUCTION_READY', 'published_articles.txt'),
  headless: process.env.HEADLESS !== 'false',
};

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
      const imageUrl = mediaContentMatch ? mediaContentMatch[1] : '';
      
      const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[(.+?)\]\]>/) || itemContent.match(/<content:encoded>(.+?)<\/content:encoded>/);
      const descriptionMatch = itemContent.match(/<description><!\[CDATA\[(.+?)\]\]>/) || itemContent.match(/<description>(.+?)<\/description>/);
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
  if (process.env.CI) {
    const cookiesJson = process.env.DZEN_COOKIES_JSON;
    if (!cookiesJson || cookiesJson.length < 10) {
      throw new Error('DZEN_COOKIES_JSON environment variable is empty!');
    }
    return cookiesJson;
  } else {
    return await fs.readFile(CONFIG.cookiesPath, 'utf8');
  }
}

async function getPublishedArticles() {
  try {
    const content = await fs.readFile(CONFIG.historyPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+)/);
      return match ? { date: match[1], title: match[2] } : null;
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
    
    const result = await playwrightService.publish({
      title: articleToPublish.title,
      content: processedContent,
      imageUrl: articleToPublish.imageUrl
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
