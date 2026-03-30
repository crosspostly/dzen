#!/usr/bin/env npx tsx
/**
 * 📰 Publish First Article from Feed
 * 
 * Берёт первую неопубликованную статью из feed.xml и публикует в Дзен
 * 
 * Использование:
 *   node --import tsx scripts/publish-first-from-feed.ts
 */

import { playwrightService } from '../services/playwrightService';
import fs from 'fs';
import path from 'path';

async function loadCookies(): Promise<string> {
  const cookiesPath = path.join(process.cwd(), 'config', 'cookies.json');
  
  if (fs.existsSync(cookiesPath)) {
    const cookiesData = fs.readFileSync(cookiesPath, 'utf-8');
    if (cookiesData.length > 10) {
      console.log(`🍪 Using cookies from ${cookiesPath}`);
      return cookiesData;
    }
  }
  
  const envCookies = process.env.DZEN_COOKIES_JSON;
  if (envCookies && envCookies.length > 10) {
    console.log('🍪 Using cookies from environment');
    return envCookies;
  }
  
  throw new Error('No cookies found');
}

async function getFirstArticleFromFeed() {
  const feedPath = path.join(process.cwd(), 'public', 'feed.xml');
  
  if (!fs.existsSync(feedPath)) {
    throw new Error(`feed.xml not found at ${feedPath}`);
  }
  
  console.log(`📄 Reading feed: ${feedPath}`);
  const feedContent = fs.readFileSync(feedPath, 'utf-8');
  
  // Extract first item
  const itemMatch = feedContent.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) {
    throw new Error('No articles found in feed');
  }
  
  const itemContent = itemMatch[1];
  
  // Extract title
  const titleMatch = itemContent.match(/<title><!\[CDATA\[(.+?)\]\]>/) || itemContent.match(/<title>(.+?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.+?)\]\]>/g, '$1').trim() : 'Untitled';
  
  // Extract image URL
  const enclosureMatch = itemContent.match(/<enclosure[^>]*url="(.+?)"[^>]*>/);
  const mediaMatch = itemContent.match(/<media:content[^>]*url="(.+?)"[^>]*>/);
  const imageUrl = enclosureMatch ? enclosureMatch[1] : (mediaMatch ? mediaMatch[1] : null);
  
  // Extract content
  const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]+?)\]\]>/);
  let content = contentMatch ? contentMatch[1] : '';
  
  // Strip HTML for plain text
  content = content
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') // Remove figure/img
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  
  if (!content) {
    const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]+?)\]\]>/);
    content = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.+?)\]\]>/g, '$1').trim() : '';
  }
  
  // Convert GitHub URL to local path if possible
  let localImagePath: string | undefined;
  if (imageUrl && imageUrl.includes('raw.githubusercontent.com')) {
    const urlPath = imageUrl.replace('https://raw.githubusercontent.com/crosspostly/dzen/main/', '');
    const possibleLocalPath = path.join(process.cwd(), urlPath);
    if (fs.existsSync(possibleLocalPath)) {
      localImagePath = possibleLocalPath;
      console.log(`🖼️ Found local image: ${localImagePath}`);
    }
  }
  
  return {
    title,
    content,
    imageUrl: localImagePath || imageUrl || undefined,
  };
}

async function main() {
  console.log('📰 Publish First Article from Feed\n');
  console.log('=' .repeat(60));
  
  try {
    // Load cookies
    const cookies = await loadCookies();
    
    // Get article
    const article = await getFirstArticleFromFeed();
    
    console.log('\n📝 Article to publish:');
    console.log(`   Title: ${article.title.substring(0, 60)}...`);
    console.log(`   Content: ${article.content.length} chars`);
    console.log(`   Image: ${article.imageUrl ? 'Yes' : 'No'}`);
    
    console.log('\n🚀 Starting publish...\n');
    
    const result = await playwrightService.publish(article, {
      cookiesJson: cookies,
      headless: process.env.HEADLESS !== 'false',
    });
    
    console.log('\n' + '=' .repeat(60));
    
    if (result.success) {
      console.log('✅ SUCCESS! Article published!');
      console.log(`🔗 URL: ${result.url}`);
      process.exit(0);
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.error}`);
      console.log('\nCheck error_state.html and error_state.png for details');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Publish failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
