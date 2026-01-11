import { VideoOrchestrator } from './orchestrator.js';
import { DzenVideoPublisher } from './publisher/dzen_video_publisher.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function main() {
    const args = process.argv.slice(2);
    const inputFile = args[0];
    const shouldPublish = args.includes('--publish');

    if (!inputFile) {
        console.error("Usage: npx tsx promo_video/src/cli.ts <path-to-article.md|txt> [--publish]");
        process.exit(1);
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY or GOOGLE_API_KEY not found in environment variables.");
        process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        process.exit(1);
    }

    console.log(`📖 Reading article from: ${inputFile}`);
    const articleText = fs.readFileSync(inputFile, 'utf-8');

    // Determine output directory and final video name
    const filename = path.basename(inputFile, path.extname(inputFile));
    const articleDir = path.dirname(inputFile);
    
    // Final video will be: path/to/article/slug.mp4
    const finalVideoPath = path.join(articleDir, `${filename}.mp4`);
    
    // Intermediate assets go to a hidden folder to keep things clean
    const assetDir = path.join(articleDir, `.assets_${filename}`);

    console.log(`📂 Asset directory: ${assetDir}`);
    console.log(`📹 Target video: ${finalVideoPath}`);

    const orchestrator = new VideoOrchestrator(apiKey);

    try {
        const result = await orchestrator.processArticle(articleText, assetDir, finalVideoPath);
        
        // --- Auto-Publish to Public Folder for Viewing ---
        const publicVideoDir = path.resolve(__dirname, '../../public/generated_videos');
        if (!fs.existsSync(publicVideoDir)) {
            fs.mkdirSync(publicVideoDir, { recursive: true });
        }

        const publicVideoPath = path.join(publicVideoDir, `${filename}.mp4`);
        
        fs.copyFileSync(finalVideoPath, publicVideoPath);
        const publicUrl = `http://crosspostly.hopto.org:5005/generated_videos/${filename}.mp4`;
        // -------------------------------------------------

        console.log(`
🎉 SUCCESS! Video generated successfully.`);
        console.log(`📹 Local Path: ${finalVideoPath}`);
        console.log(`🌍 Public URL: ${publicUrl}`);
        console.log(`📂 Assets: ${result.outputDir}`);

        // --- Auto-Publish to Dzen ---
        if (shouldPublish) {
            console.log('\n🚀 Starting Auto-Publishing to Dzen...');
            const publisher = new DzenVideoPublisher();
            try {
                await publisher.initialize();
                const coverPath = path.join(assetDir, 'image_1.png'); 
                
                await publisher.publish({
                    title: result.manifest.title,
                    description: `Полная история тут: https://dzen.ru/potemki\n\n${result.manifest.hook}`,
                    tags: ['Истории из жизни', 'Драма', 'Семья', 'Отношения', 'Реальные истории'],
                    videoPath: finalVideoPath,
                    coverPath: coverPath
                });
            } catch (pubError) {
                console.error("❌ Publishing failed:", pubError);
            } finally {
                await publisher.close();
            }
        }
        // ----------------------------

    } catch (error) {
        console.error("\n❌ FATAL ERROR:", error);
        process.exit(1);
    }
}

main().catch(console.error);
