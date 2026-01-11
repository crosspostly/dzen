import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🚀 Starting Dzen Video Selector Analyzer...');

    // 1. Load Cookies
    const cookiesPath = path.resolve(__dirname, '../../../!posts/config/cookies.json');
    if (!fs.existsSync(cookiesPath)) {
        console.error('❌ Cookies not found at:', cookiesPath);
        process.exit(1);
    }
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));

    // 2. Launch Browser
    const browser = await chromium.launch({ headless: true }); // Headless for analysis
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await context.addCookies(cookies);
    const page = await context.newPage();

    try {
        // 3. Go to Editor
        const editorUrl = 'https://dzen.ru/profile/editor/potemki';
        console.log(`🌐 Navigating to ${editorUrl}...`);
        await page.goto(editorUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'step1_editor.png' });
        console.log('📸 Screenshot saved: step1_editor.png');

        // --- Handle Overlays ---
        console.log('🧹 Checking for overlays/modals...');
        const closeSelectors = [
            'button[aria-label="Закрыть"]',
            '[data-testid="close-button"]',
            '.editor--help-popup__closeButton-*',
            'button:has-text("Закрыть")',
            'button:has-text("Понятно")',
            '[data-testid="modal-overlay"]' // Try clicking the overlay itself if no close button
        ];

        for (const selector of closeSelectors) {
            try {
                const el = await page.$(selector);
                if (el && await el.isVisible()) {
                    console.log(`   found overlay/close: ${selector}`);
                    await el.click();
                    await page.waitForTimeout(1000);
                }
            } catch (e) {}
        }
        // Force click overlay if it persists
        try {
             await page.click('[data-testid="modal-overlay"]', { force: true, timeout: 2000 });
        } catch (e) {}
        // -----------------------

        // 4. Find "Add" Button
        console.log('🔍 Looking for "Add" button...');
        const addButtonSelectors = [
            '[data-testid="add-publication-button"]',
            'button[aria-label="Создать"]',
            'button:has-text("Создать")',
            '.editor--author-studio-header__addButton-1Z' // Legacy
        ];

        let addButton;
        for (const selector of addButtonSelectors) {
            addButton = await page.$(selector);
            if (addButton && await addButton.isVisible()) {
                console.log(`✅ Found Add Button: ${selector}`);
                await addButton.click();
                break;
            }
        }

        if (!addButton) {
            console.error('❌ Add button not found. Dumping HTML...');
            fs.writeFileSync('dump_editor.html', await page.content());
            return;
        }

        await page.waitForTimeout(2000);
        console.log('📸 Saving menu state...');
        await page.screenshot({ path: 'step2_menu_open.png' });
        fs.writeFileSync('dump_menu.html', await page.content());

        // 5. Find "Upload Video" Option & Check for FileChooser/Navigation
        console.log('🔍 Looking for "Upload Video" option...');
        const videoSelectors = [
            'label[aria-label="Загрузить видео"]',
            '.editor--new-publication-dropdown__button-rl:has-text("Загрузить видео")',
            'div:has-text("Загрузить видео")'
        ];

        let videoOption;
        for (const selector of videoSelectors) {
             videoOption = await page.$(selector);
             if (videoOption && await videoOption.isVisible()) {
                 console.log(`✅ Found Video Option: ${selector}`);
                 
                 try {
                     const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
                     const navigationPromise = page.waitForNavigation({ timeout: 5000 });
                     
                     await videoOption.click();
                     
                     // Race the promises
                     await Promise.race([
                         fileChooserPromise.then(() => console.log('🎉 EVENT: File Chooser opened!')),
                         navigationPromise.then(() => console.log('🎉 EVENT: Navigation occurred!')),
                         page.waitForTimeout(5000).then(() => console.log('ℹ️ No immediate event detected.'))
                     ]);

                 } catch (e) {
                     console.log('ℹ️ Error/Timeout during interaction:', e.message);
                 }
                 break;
             }
        }

        if (!videoOption) {
            console.error('❌ Video option not found. Dumping HTML...');
            fs.writeFileSync('dump_menu.html', await page.content());
            return;
        }

        // 7. Upload Video to see the Form
        const videoPath = path.resolve(__dirname, '../../../articles/women-35-60/2026-01-09/video_assets_mne-stalo-gorko-ya-dvadtsat-let-molchala-no-posle-/final_video.mp4');
        if (fs.existsSync(videoPath)) {
            console.log(`📤 Uploading video: ${videoPath}`);
            const fileInput = await page.$('input[type="file"]');
            await fileInput.setInputFiles(videoPath);
            
            console.log('⏳ Waiting for edit form...');
            // Wait for title input or specific editor element
            try {
                await page.waitForSelector('input[placeholder="Название"], [data-testid="video-title-input"]', { timeout: 20000 });
                console.log('✅ Form appeared!');
            } catch(e) {
                console.log('⚠️ Form element not found within timeout (upload might be slow or selectors different).');
            }

            await page.waitForTimeout(5000); // Wait a bit more for UI to settle
            await page.screenshot({ path: 'step4_upload_form.png' });
            fs.writeFileSync('dump_form.html', await page.content());
        } else {
            console.error('❌ Test video file not found!');
        }

        console.log('🎉 Analysis Complete. Check screenshots and HTML dumps.');

    } catch (e) {
        console.error('❌ Error:', e);
        await page.screenshot({ path: 'error_state.png' });
    } finally {
        await browser.close();
    }
}

main();
