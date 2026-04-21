#!/usr/bin/env npx tsx

import { playwrightService } from '../services/playwrightService';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  cookiesSource: process.env.CI ? 'ENVIRONMENT' : 'LOCAL_FILE',
  cookiesPath: path.join(process.cwd(), 'config', 'cookies.json'),
  feedPath: path.join(process.cwd(), 'public', 'feed.xml'),
  historyPath: path.join(process.cwd(), '!posts', 'PRODUCTION_READY', 'published_articles.txt'),
  headless: process.env.HEADLESS !== 'false'
};

function processArticleContent(content: string) {
  if (!content) return '';
  
  // 🆕 v2026: Превращаем все IMG в маркеры для пошагового заполнения
  let processed = content.replace(/<img[^>]*src="(.+?)"[^>]*>/gi, '[[IMG:$1]]');

  processed = processed
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]*>(?![^\[]*\]\])/g, '') // Удаляем HTML, но оставляем маркеры [[IMG:...]]
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  processed = processed.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return processed.trim();
}

async function getPublishedArticles() {
  try {
    const data = await fs.readFile(CONFIG.historyPath, 'utf8');
    return data.split('\n').filter(l => l.trim());
  } catch (e) {
    return [];
  }
}

function isArticlePublished(title: string, history: string[]) {
  const cleanTitle = title.toLowerCase().trim();
  return history.some(h => h.toLowerCase().includes(cleanTitle));
}

async function savePublishedArticle(article: any, url: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `${timestamp} - ${article.title} - ${url}\n`;
  await fs.appendFile(CONFIG.historyPath, line);
  console.log(`✅ Saved to history: "${article.title.substring(0, 50)}..."`);
}

async function main() {
  console.log('🤖 ==== AUTO-PUBLISHER (MULTI-IMAGE MODE) STARTING ====');
  
  try {
    let cookiesJson = '';
    if (CONFIG.cookiesSource === 'ENVIRONMENT') {
      cookiesJson = process.env.DZEN_COOKIES_JSON || '';
    } else {
      cookiesJson = await fs.readFile(CONFIG.cookiesPath, 'utf8');
    }

    console.log(`📄 Opening feed: ${CONFIG.feedPath}`);
    const feed = await fs.readFile(CONFIG.feedPath, 'utf8');
    
    const articles: any[] = [];
    const itemMatches = feed.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
      const content = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
      const imageUrl = item.match(/<media:content[^>]*url="(.*?)"[^>]*>/)?.[1];
      
      if (title && content) {
        articles.push({ title, content, imageUrl });
      }
    }

    if (articles.length === 0) {
      console.log('❌ No articles found in feed');
      return;
    }

    const history = await getPublishedArticles();
    let toPublish = articles.find(a => !isArticlePublished(a.title, history));

    if (!toPublish) {
      console.log('✅ All articles from feed are already published');
      return;
    }

    console.log(`📝 Publishing: "${toPublish.title}"`);
    const processedContent = processArticleContent(toPublish.content);

    const result = await playwrightService.publish({
      title: toPublish.title,
      content: processedContent,
      imageUrl: toPublish.imageUrl
    }, {
      cookiesJson,
      headless: CONFIG.headless
    });

    if (result.success) {
      console.log('🎉 SUCCESS!');
      await savePublishedArticle(toPublish, result.url || 'N/A');
    } else {
      console.error(`❌ FAILED: ${result.error}`);
      process.exit(1);
    }

  } catch (e) {
    console.error(`💥 FATAL: ${(e as Error).message}`);
    process.exit(1);
  }
}

main();
