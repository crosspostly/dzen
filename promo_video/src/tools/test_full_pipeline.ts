import { VideoOrchestrator } from '../orchestrator';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function main() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("❌ No API KEY");
        process.exit(1);
    }

    const orchestrator = new VideoOrchestrator(apiKey);

    // Mock Article
    const articleText = `
        Когда я открыла дверь, на пороге стояла женщина. Она держала за руку девочку, как две капли воды похожую на моего мужа в детстве.
        "Нам нужно поговорить", - сказала она тихо, но в её голосе звучала сталь.
        Двадцать лет брака. Двое сыновей. Ипотека, дача, общие друзья. Всё это рухнуло в одну секунду.
        Оказалось, у него была вторая семья в соседнем городе. И пока я экономила на себе, чтобы купить ему новую машину, он возил их на море.
        Но самое страшное было не в этом. Самое страшное, что свекровь всё знала. Знала и молчала, принимая от меня подарки на праздники.
    `;

    const outputDir = path.join(__dirname, '../../output_test');

    try {
        await orchestrator.processArticle(articleText, outputDir);
        console.log("\n✅ Pipeline Finished Successfully!");
        console.log(`📂 Output: ${outputDir}`);
    } catch (e) {
        console.error("❌ Pipeline Failed:", e);
    }
}

main();
