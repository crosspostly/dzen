#!/usr/bin/env npx tsx

/**
 * 🔍 Dzen Editor Debugger
 * This script opens the Dzen editor and dumps detailed information about all interactive elements
 * to help identify the correct selectors for automation.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

interface ElementInfo {
  tag: string;
  id: string;
  className: string;
  placeholder: string;
  ariaLabel: string;
  role: string;
  dataTestId: string;
  contentEditable: string;
  type: string;
  text: string;
  isVisible: boolean;
  selector: string;
}

async function main() {
  console.log('🔍 Dzen Editor Debugger Starting...\n');

  const cookiesJson = process.env.DZEN_COOKIES_JSON;
  if (!cookiesJson) {
    console.error('❌ Please set DZEN_COOKIES_JSON environment variable');
    process.exit(1);
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Initialize browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Keep headless:false for debugging
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    page = await context.newPage();

    // Load cookies
    console.log('🍪 Loading cookies...');
    const rawCookies = JSON.parse(cookiesJson);
    const validCookies = rawCookies.map((c: any) => {
      const cookie = { ...c };
      if (cookie.sameSite) {
        const lower = String(cookie.sameSite).toLowerCase();
        if (lower === 'no_restriction' || lower === 'none') {
          cookie.sameSite = 'None';
          cookie.secure = true;
        } else if (lower === 'lax') {
          cookie.sameSite = 'Lax';
        } else if (lower === 'strict') {
          cookie.sameSite = 'Strict';
        } else {
          delete cookie.sameSite;
        }
      }
      delete cookie.hostOnly;
      delete cookie.session;
      delete cookie.storeId;
      delete cookie.id;
      return cookie;
    });
    await context.addCookies(validCookies);

    // Navigate to Dzen
    console.log('📄 Navigating to Dzen...');
    await page.goto('https://dzen.ru/media', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Close modals
    console.log('🧹 Closing modals...');
    await page.evaluate(() => {
      document.querySelectorAll('.ReactModalPortal, [class*="modal"], [class*="popup"]').forEach(el => {
        if (el.textContent?.includes('Понятно') || el.textContent?.includes('Закрыть')) {
          (el as HTMLElement).click();
        }
      });
    });
    await page.waitForTimeout(2000);

    // Click add button
    console.log('🔘 Clicking add button...');
    const addButton = await page.$('header button:first-of-type');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Add button clicked');
    } else {
      console.log('⚠️ Add button not found');
    }

    // Wait for menu
    await page.waitForTimeout(3000);

    // Try to click "Статья"
    console.log('📝 Looking for "Статья" button...');
    const articleButtons = await page.$$('*:has-text("Статья")');
    console.log(`Found ${articleButtons.length} elements with "Статья" text`);
    
    for (let i = 0; i < articleButtons.length && i < 5; i++) {
      const btn = articleButtons[i];
      const info = await getElementInfo(btn, page);
      console.log(`  [${i}] ${info.tag} - ${info.className.substring(0, 100)} - visible: ${info.isVisible}`);
    }

    if (articleButtons.length > 0) {
      await articleButtons[0].click({ force: true });
      console.log('✅ Clicked "Статья" button');
      await page.waitForTimeout(10000);
    }

    // Wait for editor
    await page.waitForTimeout(5000);

    // Dump all interactive elements
    console.log('\n📊 === DUMPING ALL INTERACTIVE ELEMENTS ===\n');
    
    const elements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const interactiveElements: ElementInfo[] = [];
      
      allElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || el.getAttribute('contenteditable') === 'true';
        const isButton = tag === 'button' || el.getAttribute('role') === 'button';
        const hasPlaceholder = el.getAttribute('placeholder');
        const hasAriaLabel = el.getAttribute('aria-label');
        const hasDataTestId = el.getAttribute('data-testid');
        
        if (isInput || isButton || hasPlaceholder || hasAriaLabel || hasDataTestId) {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          
          interactiveElements.push({
            tag,
            id: el.id || '',
            className: el.className || '',
            placeholder: hasPlaceholder || '',
            ariaLabel: hasAriaLabel || '',
            role: el.getAttribute('role') || '',
            dataTestId: hasDataTestId || '',
            contentEditable: el.getAttribute('contenteditable') || '',
            type: (el as HTMLInputElement).type || '',
            text: el.textContent?.substring(0, 50).trim() || '',
            isVisible,
            selector: generateSelector(el)
          });
        }
      });
      
      return interactiveElements;
    });

    console.log(`Found ${elements.length} interactive elements:\n`);
    elements.forEach((el, i) => {
      console.log(`[${i}] ${el.tag}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`);
      console.log(`    Selector: ${el.selector}`);
      console.log(`    placeholder: "${el.placeholder}"`);
      console.log(`    aria-label: "${el.ariaLabel}"`);
      console.log(`    data-testid: "${el.dataTestId}"`);
      console.log(`    contentEditable: "${el.contentEditable}"`);
      console.log(`    role: "${el.role}"`);
      console.log(`    type: "${el.type}"`);
      console.log(`    text: "${el.text}"`);
      console.log(`    visible: ${el.isVisible}`);
      console.log('');
    });

    // Save to file
    const outputPath = path.join(process.cwd(), 'editor-debug.json');
    await fs.writeFile(outputPath, JSON.stringify(elements, null, 2));
    console.log(`\n💾 Saved debug info to: ${outputPath}`);

    // Also save HTML
    const htmlPath = path.join(process.cwd(), 'editor-debug.html');
    const html = await page.content();
    await fs.writeFile(htmlPath, html);
    console.log(`💾 Saved HTML to: ${htmlPath}`);

    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  if (el.className) {
    const classes = (el.className as string).split(' ').filter(c => c).slice(0, 2).join('.');
    if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
  }
  return el.tagName.toLowerCase();
}

async function getElementInfo(el: any, page: Page): Promise<ElementInfo> {
  return await el.evaluate(element => {
    const rect = (element as Element).getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      placeholder: element.getAttribute('placeholder') || '',
      ariaLabel: element.getAttribute('aria-label') || '',
      role: element.getAttribute('role') || '',
      dataTestId: element.getAttribute('data-testid') || '',
      contentEditable: element.getAttribute('contenteditable') || '',
      type: (element as HTMLInputElement).type || '',
      text: element.textContent?.substring(0, 50).trim() || '',
      isVisible: rect.width > 0 && rect.height > 0,
      selector: element.id ? `#${element.id}` : element.tagName.toLowerCase()
    };
  });
}

main();
