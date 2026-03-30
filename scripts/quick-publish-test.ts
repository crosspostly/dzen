#!/usr/bin/env npx tsx
/**
 * 🧪 Quick Publish Test
 * 
 * Быстрый тест публикации одной статьи с изображением
 * 
 * Использование:
 *   node --import tsx scripts/quick-publish-test.ts
 */

import { playwrightService } from '../services/playwrightService';
import fs from 'fs';
import path from 'path';

const TEST_ARTICLE = {
  title: "🧪 Тест публикации - " + new Date().toLocaleString('ru-RU'),
  content: `Это тестовая статья для проверки работы публикатора.

## Что проверяем

1. ✅ Заголовок заполняется
2. ✅ Текст вставляется
3. ✅ Изображение прикрепляется
4. ✅ Публикация работает

## Тестовый контент

Просто проверяем что все селекторы работают правильно.

Конец тестовой статьи.`,
  imageUrl: path.join(process.cwd(), 'test-image.jpg'),
};

// Create test image if not exists
async function createTestImage() {
  const testImagePath = TEST_ARTICLE.imageUrl;
  if (!fs.existsSync(testImagePath)) {
    console.log('🎨 Creating test image...');
    // Create a simple 800x600 blue PNG using canvas
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(0, 0, 800, 600);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST PUBLISH', 400, 250);
    ctx.font = '24px Arial';
    ctx.fillText(new Date().toLocaleString('ru-RU'), 400, 320);

    // Write file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(testImagePath.replace('.jpg', '.png'), buffer);
    TEST_ARTICLE.imageUrl = testImagePath.replace('.jpg', '.png');
    console.log(`✅ Test image created: ${TEST_ARTICLE.imageUrl}`);
  } else {
    console.log(`✅ Using existing image: ${testImagePath}`);
  }
}

async function loadCookies(): Promise<string> {
  const cookiesPath = path.join(process.cwd(), 'config', 'cookies.json');
  
  if (fs.existsSync(cookiesPath)) {
    console.log(`🍪 Loading cookies from ${cookiesPath}`);
    const cookiesData = fs.readFileSync(cookiesPath, 'utf-8');
    if (cookiesData.length > 10) {
      return cookiesData;
    }
  }
  
  const envCookies = process.env.DZEN_COOKIES_JSON;
  if (envCookies && envCookies.length > 10) {
    console.log('🍪 Loading cookies from environment');
    return envCookies;
  }
  
  throw new Error('No cookies found. Please add them to config/cookies.json or DZEN_COOKIES_JSON env var');
}

async function main() {
  console.log('🧪 Starting Quick Publish Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Create test image
    await createTestImage();

    // Load cookies
    const cookies = await loadCookies();
    
    console.log('\n📝 Test Article:');
    console.log(`   Title: ${TEST_ARTICLE.title.substring(0, 50)}...`);
    console.log(`   Content: ${TEST_ARTICLE.content.length} chars`);
    console.log(`   Image: ${TEST_ARTICLE.imageUrl}`);
    
    console.log('\n🚀 Starting publish...\n');
    
    const result = await playwrightService.publish(TEST_ARTICLE, {
      cookiesJson: cookies,
      headless: process.env.HEADLESS !== 'false',
    });
    
    console.log('\n' + '=' .repeat(60));
    
    if (result.success) {
      console.log('✅ SUCCESS! Article published!');
      console.log(`🔗 URL: ${result.url}`);
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
