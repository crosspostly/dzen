import { GeminiVideoAgent } from '../ai/gemini_video_agent';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from the ROOT .env file
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`🔌 Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn("⚠️ Error loading .env:", result.error.message);
}

async function main() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
        console.error("❌ API KEY not found in .env");
        process.exit(1);
    }
    
    console.log(`🔑 API Key loaded: ${apiKey.substring(0, 5)}... (${apiKey.length} chars)`);

    const agent = new GeminiVideoAgent(apiKey);

    // 1. Read a sample article (simulating input)
    // We'll try to read one of the generated articles from the main project
    const articlesDir = path.join(__dirname, '../../../articles');
    let articleText = "Муж вернулся домой и увидел на столе странную записку. Его руки задрожали..."; // Fallback
    
    try {
        // Try to find a real .md file
        const findMd = (dir: string): string | null => {
             if (!fs.existsSync(dir)) return null;
             const files = fs.readdirSync(dir);
             for (const f of files) {
                 const full = path.join(dir, f);
                 if (fs.statSync(full).isDirectory()) {
                     const res = findMd(full);
                     if (res) return res;
                 } else if (f.endsWith('.md')) {
                     return full;
                 }
             }
             return null;
        };
        
        const sampleFile = findMd(articlesDir);
        if (sampleFile) {
            console.log(`📄 Reading article: ${sampleFile}`);
            articleText = fs.readFileSync(sampleFile, 'utf-8');
        }
    } catch (e) {
        console.warn("⚠️ Could not read sample article, using default text.");
    }

    console.log("🧠 Generating Video Manifest via Gemini...");
    
    try {
        const manifest = await agent.generateManifest(articleText);
        
        console.log("\n✅ MANIFEST GENERATED:");
        console.log(JSON.stringify(manifest, null, 2));

        // Save to a temp file for the renderer to use later
        const outputPath = path.join(__dirname, '../../manifest.json');
        fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
        console.log(`\n💾 Saved to: ${outputPath}`);

    } catch (error) {
        console.error("❌ Generation failed:", error);
    }
}

main();
