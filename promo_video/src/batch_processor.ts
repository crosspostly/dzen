import fs from 'fs';
import path from 'path';
import { VideoOrchestrator } from './orchestrator.js';
import dotenv from 'dotenv';

dotenv.config();

async function batchProcess(dirPath: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY not found in .env");
        process.exit(1);
    }

    const orchestrator = new VideoOrchestrator(apiKey);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

    console.log(`🚀 Found ${files.length} articles in ${dirPath}. Starting batch processing...`);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const articleText = fs.readFileSync(filePath, 'utf-8');
        
        // Slug for output dir
        const slug = file.replace('.md', '');
        const outputDir = path.join(dirPath, `video_assets_${slug}`);

        if (fs.existsSync(path.join(outputDir, 'final_video.mp4'))) {
            console.log(`⏩ Skipping ${file} (Video already exists)`);
            continue;
        }

        console.log(`
---------------------------------------------------
`);
        console.log(`📄 Processing: ${file}`);
        try {
            await orchestrator.processArticle(articleText, outputDir);
            console.log(`✅ Finished: ${file}`);
        } catch (e: any) {
            console.error(`❌ Failed: ${file} - ${e.message}`);
        }
    }
}

const targetDir = process.argv[2] || 'articles/women-35-60/2026-01-10';
batchProcess(targetDir);
