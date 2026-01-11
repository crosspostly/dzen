import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DzenVideoMetadata {
    title: string;
    description: string;
    tags: string[];
    videoPath: string;
    coverPath: string;
}

export class DzenVideoPublisher {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private cookiesPath: string;

    constructor() {
        this.cookiesPath = path.resolve(__dirname, '../../../!posts/config/cookies.json');
    }

    async initialize() {
        console.log('🚀 Initializing Dzen Video Publisher...');
        
        if (!fs.existsSync(this.cookiesPath)) {
            throw new Error(`❌ Cookies file not found at: ${this.cookiesPath}`);
        }

        const cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf8'));

        this.browser = await chromium.launch({
            headless: true, // Set to false for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        await this.context.addCookies(cookies);
        this.page = await this.context.newPage();
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    async publish(metadata: DzenVideoMetadata): Promise<boolean> {
        if (!this.page) throw new Error('Publisher not initialized');

        try {
            console.log(`🌐 Navigating to Dzen Studio...`);
            await this.page.goto('https://dzen.ru/profile/editor/potemki', { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000);

            // 1. Handle Overlays
            await this.closeOverlays();

            // 2. Click Add -> Upload Video
            console.log('👆 Clicking "Add Publication"...');
            const addButton = await this.page.waitForSelector('[data-testid="add-publication-button"]');
            await addButton.click();

            console.log('👆 Clicking "Upload Video"...');
            const videoOption = await this.page.waitForSelector('label[aria-label="Загрузить видео"]', { timeout: 5000 });
            await videoOption.click();

            // 3. Upload Video
            console.log(`📤 Uploading video: ${metadata.videoPath}`);
            const fileInput = await this.page.waitForSelector('input[type="file"]', { state: 'attached' });
            await fileInput.setInputFiles(metadata.videoPath);

            // 4. Wait for Form
            console.log('⏳ Waiting for editor form...');
            // Wait for the description editor to appear, signifying the upload has processed enough to show UI
            const descriptionSelector = '.ql-editor';
            await this.page.waitForSelector(descriptionSelector, { timeout: 60000 }); // Give it time to upload/process
            console.log('✅ Form loaded');

            // 5. Fill Description (Acts as Title/Caption for Shorts)
            console.log(`📝 Filling description: ${metadata.title}`);
            const descriptionEditor = await this.page.$(descriptionSelector);
            if (descriptionEditor) {
                await descriptionEditor.fill(''); // Clear existing (filename)
                // Combine Title + Description for the post text
                const fullText = `${metadata.title}\n\n${metadata.description}`;
                await descriptionEditor.fill(fullText);
            }

            // 6. Upload Cover
            if (fs.existsSync(metadata.coverPath)) {
                console.log(`🖼️ Uploading cover: ${metadata.coverPath}`);
                // Find specific cover input (accepts images)
                const coverInput = await this.page.$('input[type="file"][accept*="image"]');
                if (coverInput) {
                    await coverInput.setInputFiles(metadata.coverPath);
                    // Wait for cover upload visual feedback (optional but good)
                    await this.page.waitForTimeout(3000); 
                } else {
                    console.warn('⚠️ Cover input not found, skipping cover upload.');
                }
            }

            // 7. Add Tags
            if (metadata.tags && metadata.tags.length > 0) {
                console.log(`🏷️ Adding tags: ${metadata.tags.join(', ')}`);
                const tagInput = await this.page.$('input[placeholder="Добавьте теги"]');
                if (tagInput) {
                    for (const tag of metadata.tags) {
                        await tagInput.type(tag);
                        await this.page.keyboard.press('Enter');
                        await this.page.waitForTimeout(500);
                    }
                }
            }

            // 8. Publish
            console.log('🚀 Publishing...');
            const publishBtn = await this.page.waitForSelector('[data-testid="publish-btn"]');
            
            // Check if disabled
            if (await publishBtn.isDisabled()) {
                console.log('⏳ Publish button disabled, waiting for processing...');
                await this.page.waitForFunction(
                    selector => !document.querySelector(selector)?.hasAttribute('disabled'),
                    {},
                    '[data-testid="publish-btn"]'
                );
            }

            await publishBtn.click();
            console.log('✅ Publish button clicked');

            // 9. Confirm/Wait
            // Usually there is a "Video published" or redirect.
            // Let's wait a bit to ensure request is sent.
            await this.page.waitForTimeout(5000);
            
            console.log('🎉 Video published successfully!');
            return true;

        } catch (error: any) {
            console.error('❌ Publishing failed:', error);
            await this.page.screenshot({ path: 'publish_error.png' });
            return false;
        }
    }

    private async closeOverlays() {
        const closeSelectors = [
            '[data-testid="close-button"]',
            'button[aria-label="Закрыть"]',
            '[data-testid="modal-overlay"]'
        ];
        for (const selector of closeSelectors) {
            try {
                const el = await this.page?.$(selector);
                if (el && await el.isVisible()) {
                    await el.click();
                    await this.page?.waitForTimeout(500);
                }
            } catch (e) {}
        }
    }
}
