import { DzenVideoPublisher } from '../publisher/dzen_video_publisher.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const publisher = new DzenVideoPublisher();
    
    // Test Data
    const assetDir = path.resolve(__dirname, '../../../articles/women-35-60/2026-01-09/video_assets_mne-stalo-gorko-ya-dvadtsat-let-molchala-no-posle-');
    const manifestPath = path.join(assetDir, 'manifest.json');
    const videoPath = path.join(assetDir, 'final_video.mp4');
    const coverPath = path.join(assetDir, 'image_1.png');

    if (!fs.existsSync(manifestPath)) {
        console.error('Manifest not found');
        return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    try {
        await publisher.initialize();
        
        await publisher.publish({
            title: manifest.title,
            description: `Полная история тут: https://dzen.ru/potemki\n\n${manifest.hook}`,
            tags: ['Истории из жизни', 'Драма', 'Семья', 'Отношения', 'Реальные истории'],
            videoPath: videoPath,
            coverPath: coverPath
        });

    } catch (e) {
        console.error(e);
    } finally {
        await publisher.close();
    }
}

main();
