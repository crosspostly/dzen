import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("🕵️ Starting selector discovery for Dzen Video Upload...");
    
    // Paths
    const cookiesPath = path.join(__dirname, '../../../config/cookies.json');
    const debugDir = path.join(__dirname, '../../debug');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

    // Load cookies
    if (!fs.existsSync(cookiesPath)) {
        console.error("❌ Cookies not found at " + cookiesPath);
        return;
    }
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

    const browser = await chromium.launch({ headless: false }); // Headless false to see what happens if needed
    const context = await browser.newContext();
    
    // Fix cookie domain if needed (ensure they match dzen.ru)
    const fixedCookies = cookies.map((c: any) => ({
        ...c,
        domain: c.domain.startsWith('.') ? c.domain : '.dzen.ru',
        path: '/',
        sameSite: 'None',
        secure: true
    }));
    
    await context.addCookies(fixedCookies);
    const page = await context.newPage();

    try {
        console.log("Navigating to Dzen Editor...");
        await page.goto('https://dzen.ru/profile/editor', { waitUntil: 'networkidle' });

        // Save screenshot
        await page.screenshot({ path: path.join(debugDir, 'editor_page.png') });
        
        console.log("Looking for 'Create' button...");
        // Common selectors for the "Plus" or "Create" button
        const createButtonSelectors = [
            'button[aria-label="Создать"]',
            'button:has-text("Создать")',
            '[data-testid="create-button"]',
            '.desktop-header-layout__create-button' 
        ];

        let createBtn = null;
        for (const sel of createButtonSelectors) {
            if (await page.isVisible(sel)) {
                console.log(`✅ Found Create Button: ${sel}`);
                createBtn = page.locator(sel);
                break;
            }
        }

        if (createBtn) {
            await createBtn.click();
            await page.waitForTimeout(2000); // Wait for menu
            
            console.log("Looking for 'Video' option...");
            await page.screenshot({ path: path.join(debugDir, 'create_menu.png') });
            
            // Look for Video option
            const videoSelectors = [
                'div:has-text("Видео")',
                'a[href*="/editor/video"]',
                'button:has-text("Видео")'
            ];
            
            for (const sel of videoSelectors) {
                if (await page.isVisible(sel)) {
                    console.log(`✅ Found Video Option: ${sel}`);
                    // Save this selector to a config file
                    fs.writeFileSync(path.join(debugDir, 'video_selectors.json'), JSON.stringify({
                        createButton: await createBtn.evaluate(el => el.className),
                        videoButton: sel
                    }, null, 2));
                    break;
                }
            }
        } else {
            console.log("❌ Create button not found. Dumping HTML...");
            fs.writeFileSync(path.join(debugDir, 'editor.html'), await page.content());
        }

    } catch (e) {
        console.error("Error during navigation:", e);
    } finally {
        await browser.close();
    }
}

main();
