import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_VIDEO_SIZE_MB = 24.5; // Чуть меньше 25 для запаса

async function processAllArticles() {
    const rootDir = path.resolve(__dirname, '../../..');
    const articlesDir = path.join(rootDir, 'articles');

    console.log('🔍 Scanning articles for missing videos...');

    // Рекурсивный поиск всех .md файлов в папке articles
    const findMdFiles = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(findMdFiles(fullPath));
            } else if (file.endsWith('.md') && !file.includes('REPORT')) {
                results.push(fullPath);
            }
        });
        return results;
    };

    const mdFiles = findMdFiles(articlesDir);
    console.log(`📄 Found ${mdFiles.length} total articles.`);

    for (const file of mdFiles) {
        const filename = path.basename(file, path.extname(file));
        const assetDir = path.join(path.dirname(file), 'video_assets_' + filename);
        const videoPath = path.join(assetDir, 'final_video.mp4');

        // Если видео уже есть, пропускаем
        if (fs.existsSync(videoPath)) {
            console.log(`⏭️  Skipping: ${filename} (Video already exists)`);
            continue;
        }

        console.log(`🎬 Generating video for: ${filename}`);
        
        try {
            // Запускаем генерацию (без публикации, только файлы)
            execSync(`npx tsx promo_video/src/cli.ts "${file}"`, { stdio: 'inherit' });

            // Проверка размера
            if (fs.existsSync(videoPath)) {
                const stats = fs.statSync(videoPath);
                const fileSizeMB = stats.size / (1024 * 1024);
                
                if (fileSizeMB > MAX_VIDEO_SIZE_MB) {
                    console.error(`⚠️  Video too large (${fileSizeMB.toFixed(2)} MB). Deleting...`);
                    fs.unlinkSync(videoPath);
                    // Здесь можно было бы добавить сжатие через ffmpeg, но пока просто удаляем
                } else {
                    console.log(`✅ Video generated successfully (${fileSizeMB.toFixed(2)} MB)`);
                }
            }
        } catch (err: any) {
            console.error(`❌ Failed to process ${filename}:`, err.message);
        }
    }
}

processAllArticles().catch(console.error);
