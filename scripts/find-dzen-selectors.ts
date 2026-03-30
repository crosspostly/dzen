/**
 * 🔍 Dzen Studio Selector Finder
 * 
 * Этот скрипт находит актуальные селекторы на странице Dzen Studio
 * и обновляет файл playwrightService.ts
 * 
 * Использование:
 *   node --import tsx scripts/find-dzen-selectors.ts
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const DZEN_STUDIO_URL = 'https://dzen.ru/studio';

// Cookies from user's session
const COOKIES = [
  { domain: '.dzen.ru', path: '/', name: 'dzen_sess_id', value: 'y0__xDM66yABxiOjjogrJ3N0xU5cnWX_mnPO6YOCE7DnyXH_qzFXg' },
  { domain: '.dzen.ru', path: '/', name: 'Session_id', value: '3:1769603486.5.0.1765772128299:f7HkIw:880e.1.2:1|1879782860.5209.2.2:5209.3:1765656481.6:2304965203.7:1767162380|64:11660772.180644.y0iB5I6WtPcGDhkl-yZtpTr26w8' },
  { domain: '.dzen.ru', path: '/', name: 'sessar', value: '1.1615350.CiBysAsCng2yEWLPIw1Kq4-aPHfWLdKetkdbxKwCSKFGPg.fBHL8qUfK-9r2jdVI9vHiILJtcIKHo35uhC3d33rjFw' },
  { domain: '.dzen.ru', path: '/', name: 'sessionid2', value: '3:1769603486.5.0.1765772128299:f7HkIw:880e.1.2:1|1879782860.5209.2.2:5209.3:1765656481.6:2304965203.7:1767162380|64:11660772.180644.fakesign0000000000000000000' },
  { domain: '.dzen.ru', path: '/', name: 'zen_session_id', value: 'G3uKIAMzCBrSGVwgMVZGUoC2rDlLBuAiNEO.1774346344001' },
  { domain: '.dzen.ru', path: '/', name: 'yandex_login', value: 'pavelshekhov' },
  { domain: '.dzen.ru', path: '/', name: 'yandexuid', value: '9069307951762932476' },
  { domain: '.dzen.ru', path: '/', name: 'zencookie', value: '4965632751762932475' },
];

interface SelectorInfo {
  name: string;
  selector: string;
  found: boolean;
  elementInfo?: string;
}

async function findSelectorsOnPage(page: Page): Promise<SelectorInfo[]> {
  const selectorsToTest: Array<{ name: string; selectors: string[] }> = [
    {
      name: 'addPublicationButton',
      selectors: [
        '[data-testid="add-publication-button"]',
        '.new-publication-button',
        'button:has-text("Создать")',
        'button:has-text("Добавить")',
        'button:has-text("Публикация")',
        '.studio-header button:first-child',
        '[class*="addButton"]',
        '[class*="createButton"]',
        '[class*="newPublication"]',
        'a[href*="/edit"]',
        'a[href*="/create"]',
      ]
    },
    {
      name: 'titleInput',
      selectors: [
        'h1[contenteditable="true"]',
        '[placeholder*="Заголовок"]',
        '[placeholder*="Название"]',
        'input[type="text"][aria-label*="Заголовок"]',
        '[data-testid="title-input"]',
        '[data-testid="article-title"]',
        '.title-input',
        '.article-title-input',
      ]
    },
    {
      name: 'contentEditor',
      selectors: [
        '[contenteditable="true"]',
        '[data-testid="content-editor"]',
        '.editor-content',
        '.article-content',
        '[class*="editor"]',
        '[class*="contentEditable"]',
      ]
    },
    {
      name: 'imageUploadButton',
      selectors: [
        '[data-testid="upload-image"]',
        '[data-testid="add-image"]',
        '[placeholder*="Изображение"]',
        'input[type="file"][accept*="image"]',
        '[class*="imageUpload"]',
        '[class*="coverUpload"]',
        'button:has-text("Загрузить")',
        'button:has-text("Добавить фото")',
      ]
    },
    {
      name: 'publishButton',
      selectors: [
        '[data-testid="publish-button"]',
        '[data-testid="publish"]',
        'button:has-text("Опубликовать")',
        'button:has-text("Опубликовать")',
        '.publish-button',
        '.publish-btn',
        '[class*="publishButton"]',
        '[class*="publishBtn"]',
        'button[type="submit"]',
      ]
    },
    {
      name: 'scheduleButton',
      selectors: [
        '[data-testid="schedule-button"]',
        '[data-testid="schedule"]',
        'button:has-text("Отложить")',
        'button:has-text("Запланировать")',
        '.schedule-button',
        '[class*="scheduleButton"]',
      ]
    },
    {
      name: 'tagsInput',
      selectors: [
        'input[placeholder*="Тег"]',
        'input[placeholder*="tag"]',
        '[data-testid="tags-input"]',
        '.tags-input',
        '[class*="tagsInput"]',
      ]
    },
    {
      name: 'descriptionInput',
      selectors: [
        '[placeholder*="Описание"]',
        '[placeholder*="description"]',
        '[data-testid="description-input"]',
        '.description-input',
        'textarea[aria-label*="Описание"]',
      ]
    },
  ];

  const results: SelectorInfo[] = [];

  for (const test of selectorsToTest) {
    let found = false;
    let elementInfo = '';

    for (const selector of test.selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const tagName = await element.evaluate(el => (el as HTMLElement).tagName);
          const className = await element.evaluate(el => (el as HTMLElement).className);
          const textContent = await element.evaluate(el => (el as HTMLElement).innerText?.substring(0, 50));
          const id = await element.evaluate(el => (el as HTMLElement).id);
          const dataTestId = await element.evaluate(el => (el as HTMLElement).getAttribute('data-testid'));
          
          elementInfo = `Tag: ${tagName}, Class: ${className}, ID: ${id}, data-testid: ${dataTestId}, Text: "${textContent}"`;
          found = true;
          console.log(`✅ Found ${test.name}: "${selector}"`);
          console.log(`   ${elementInfo}\n`);
          break;
        }
      } catch (e) {
        // Selector failed, try next
      }
    }

    if (!found) {
      console.log(`❌ NOT FOUND: ${test.name}`);
      console.log(`   Tried: ${test.selectors.join(', ')}\n`);
      elementInfo = 'NOT FOUND';
    }

    results.push({
      name: test.name,
      selector: results.find(r => r.name === test.name && r.found)?.selector || test.selectors[0],
      found,
      elementInfo
    });
  }

  return results;
}

async function findButtonsWithText(page: Page, texts: string[]): Promise<void> {
  console.log('\n🔍 Searching for buttons with specific text...\n');
  
  for (const text of texts) {
    try {
      const button = await page.locator(`button:has-text("${text}")`).first();
      const isVisible = await button.isVisible().catch(() => false);
      
      if (isVisible) {
        const className = await button.evaluate(el => (el as HTMLElement).className);
        const dataTestId = await button.evaluate(el => (el as HTMLElement).getAttribute('data-testid'));
        console.log(`✅ Button "${text}": class="${className}", data-testid="${dataTestId}"`);
      }
    } catch (e) {
      console.log(`❌ Button "${text}": not found`);
    }
  }
}

async function dumpAllInteractiveElements(page: Page): Promise<void> {
  console.log('\n🔍 Dumping all interactive elements...\n');
  
  const elements = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const links = Array.from(document.querySelectorAll('a[href]'));
    const inputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'));
    
    return {
      buttons: buttons.slice(0, 20).map(el => ({
        tag: 'button',
        text: (el as HTMLElement).innerText?.substring(0, 30),
        class: (el as HTMLElement).className,
        id: (el as HTMLElement).id,
        'data-testid': (el as HTMLElement).getAttribute('data-testid'),
      })),
      links: links.slice(0, 20).map(el => ({
        tag: 'a',
        href: el.getAttribute('href'),
        text: (el as HTMLElement).innerText?.substring(0, 30),
        class: (el as HTMLElement).className,
      })),
      inputs: inputs.slice(0, 20).map(el => ({
        tag: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type,
        placeholder: (el as HTMLInputElement).placeholder,
        class: (el as HTMLElement).className,
        'data-testid': (el as HTMLElement).getAttribute('data-testid'),
      })),
    };
  });

  console.log('BUTTONS:', JSON.stringify(elements.buttons, null, 2));
  console.log('\nLINKS:', JSON.stringify(elements.links, null, 2));
  console.log('\nINPUTS:', JSON.stringify(elements.inputs, null, 2));
}

async function updatePlaywrightService(selectors: SelectorInfo[]): Promise<void> {
  const servicePath = path.join(process.cwd(), 'services', 'playwrightService.ts');
  
  if (!fs.existsSync(servicePath)) {
    console.log('❌ playwrightService.ts not found');
    return;
  }

  let content = fs.readFileSync(servicePath, 'utf-8');
  let updated = false;

  for (const selector of selectors) {
    if (selector.found) {
      // Update the selector in the file
      const oldSelectorPattern = new RegExp(`(['"])${selector.name}\\1\\s*:\\s*['"][^'"]+['"]`, 'g');
      const newSelector = `${selector.name}': '${selector.selector}`;
      
      if (oldSelectorPattern.test(content)) {
        content = content.replace(oldSelectorPattern, newSelector);
        updated = true;
        console.log(`✅ Updated selector for ${selector.name}`);
      }
    }
  }

  if (updated) {
    fs.writeFileSync(servicePath, content, 'utf-8');
    console.log('\n✅ playwrightService.ts updated!');
  }
}

async function main(): Promise<void> {
  console.log('🔍 Dzen Studio Selector Finder\n');
  console.log('Starting browser...\n');

  const browser: Browser = await chromium.launch({
    headless: false, // Show browser for debugging
    args: ['--window-size=1920,1080']
  });

  const page: Page = await browser.newPage();
  
  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Set cookies
  console.log('🍪 Setting cookies...\n');
  await page.addCookies(COOKIES);

  try {
    console.log(`🌐 Navigating to ${DZEN_STUDIO_URL}...\n`);
    await page.goto(DZEN_STUDIO_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Take screenshot to see what we're working with
    await page.screenshot({ path: 'dzen-studio-full.png' });
    console.log('📸 Screenshot saved to dzen-studio-full.png\n');

    // Find all selectors
    console.log('🔍 Searching for selectors...\n');
    const selectors = await findSelectorsOnPage(page);

    // Search for buttons with common text
    await findButtonsWithText(page, ['Создать', 'Добавить', 'Опубликовать', 'Загрузить', 'Сохранить']);

    // Dump all interactive elements
    await dumpAllInteractiveElements(page);

    // Update playwright service
    await updatePlaywrightService(selectors);

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'selector-findings.json');
    fs.writeFileSync(resultsPath, JSON.stringify(selectors, null, 2));
    console.log(`\n📄 Results saved to ${resultsPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    
    // Save error state
    await page.screenshot({ path: 'selector-find-error.png' });
    console.log('📸 Error screenshot saved to selector-find-error.png');
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
