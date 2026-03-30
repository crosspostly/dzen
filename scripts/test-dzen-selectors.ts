#!/usr/bin/env node
/**
 * 🔍 Quick Dzen Selector Test
 * 
 * Быстрый тест для нахождения кнопки "Добавить публикацию"
 * 
 * Использование:
 *   node --import tsx scripts/test-dzen-selectors.ts
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const DZEN_STUDIO_URL = 'https://dzen.ru/studio';

// Load cookies from config file if exists
let cookies = [];
const cookiesPath = './config/cookies.json';
if (fs.existsSync(cookiesPath)) {
  const cookiesData = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
  cookies = cookiesData.dzen || cookiesData || [];
  console.log(`✅ Loaded ${cookies.length} cookies from ${cookiesPath}`);
} else {
  console.log('⚠️ No cookies found. Please login manually in the browser.');
}

async function testSelectors() {
  console.log('\n🔍 Starting Dzen Selector Test...\n');

  const browser = await chromium.launch({
    headless: true, // Use headless for remote environments
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Set cookies if available
  if (cookies.length > 0) {
    await page.addCookies(cookies);
  }

  try {
    console.log(`🌐 Opening ${DZEN_STUDIO_URL}...\n`);
    await page.goto(DZEN_STUDIO_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for page to stabilize
    await page.waitForTimeout(5000);

    // Screenshot
    await page.screenshot({ path: 'dzen-studio-test.png' });
    console.log('📸 Screenshot: dzen-studio-test.png\n');

    // Test common selectors
    const testSelectors = [
      // Data attributes
      '[data-testid="add-publication-button"]',
      '[data-testid="addPublicationButton"]',
      '[data-testid="create-article"]',
      '[data-testid="new-article"]',
      
      // Class-based
      '.new-publication-button',
      '.add-publication-button',
      '.create-button',
      '.studio-header__button',
      
      // Text-based buttons
      'button:has-text("Создать")',
      'button:has-text("Добавить")',
      'button:has-text("Новая")',
      'button:has-text("Публикация")',
      
      // Links
      'a[href*="/edit"]',
      'a[href*="/create"]',
      'a[href*="/article"]',
      
      // First buttons in header
      '.studio-header button:first-child',
      'header button:first-of-type',
      
      // SVG icons with buttons
      'button svg',
      '[class*="icon"] + button',
    ];

    console.log('📋 Testing selectors...\n');
    
    let found = false;
    for (const selector of testSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          const tagName = await element.evaluate(el => (el as HTMLElement).tagName);
          const className = await element.evaluate(el => (el as HTMLElement).className);
          const textContent = await element.evaluate(el => (el as HTMLElement).innerText?.substring(0, 50));
          const dataTestId = await element.evaluate(el => (el as HTMLElement).getAttribute('data-testid'));
          
          console.log(`✅ FOUND: "${selector}"`);
          console.log(`   Visible: ${isVisible}`);
          console.log(`   Tag: ${tagName}`);
          console.log(`   Class: ${className}`);
          console.log(`   Text: "${textContent}"`);
          console.log(`   data-testid: ${dataTestId}`);
          console.log('');
          
          if (!found && isVisible) {
            found = true;
            // Highlight the element
            await element.evaluate(el => {
              (el as HTMLElement).style.outline = '4px solid red';
              (el as HTMLElement).style.zIndex = '9999';
            });
            await page.waitForTimeout(2000);
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    if (!found) {
      console.log('❌ No matching selectors found!\n');
      
      // Dump page structure
      console.log('📄 Dumping page structure...\n');
      const pageStructure = await page.evaluate(() => {
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        
        return {
          headerHTML: header?.outerHTML.substring(0, 2000),
          buttons: Array.from(document.querySelectorAll('button')).slice(0, 10).map(el => ({
            text: (el as HTMLElement).innerText,
            class: (el as HTMLElement).className,
            'data-testid': (el as HTMLElement).getAttribute('data-testid'),
          })),
          links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(el => ({
            href: el.getAttribute('href'),
            text: (el as HTMLElement).innerText?.substring(0, 50),
          })),
        };
      });
      
      console.log('HEADER HTML (first 2000 chars):');
      console.log(pageStructure.headerHTML);
      console.log('\nBUTTONS:');
      console.log(JSON.stringify(pageStructure.buttons, null, 2));
      console.log('\nLINKS:');
      console.log(JSON.stringify(pageStructure.links, null, 2));
    }

    // Keep browser open for manual inspection
    console.log('\n✅ Test complete. Browser will close in 10 seconds...');
    console.log('   Check the screenshots and console output above.\n');
    
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'dzen-test-error.png' });
    console.log('📸 Error screenshot: dzen-test-error.png');
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.\n');
  }
}

testSelectors().catch(console.error);
