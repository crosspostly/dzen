import { ttsSave } from 'edge-tts';
import path from 'path';
import fs from 'fs';

async function main() {
    // The dramatic text
    const text = "Я стояла у окна, сжимая в руке конверт. Двадцать лет молчания. Двадцать лет лжи... Неужели я разрушу всё ради одной минуты истины?";
    
    const outputDir = path.join(__dirname, '../../public');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log("🎤 Generating Natural Audio (Edge-TTS Node.js)...");

    // 1. SVETLANA (Female - Default for Drama)
    const fileSvetlana = path.join(outputDir, 'test_drama.mp3'); // Overwrite main test file
    console.log(`- Generating Svetlana to ${fileSvetlana}...`);
    try {
        await ttsSave(text, fileSvetlana, {
            voice: 'ru-RU-SvetlanaNeural',
            rate: '-10%', // Slower for drama
            pitch: '-2Hz' // Slightly deeper
        });
        console.log("✅ Svetlana created.");
    } catch (e: any) {
        console.error("❌ Failed to create Svetlana:", e.message);
    }

    // 2. DMITRY (Male - Alternative)
    const fileDmitry = path.join(outputDir, 'test_drama_male.mp3');
    console.log(`- Generating Dmitry to ${fileDmitry}...`);
    try {
        await ttsSave(text, fileDmitry, {
            voice: 'ru-RU-DmitryNeural',
            rate: '-5%',
            pitch: '+0Hz'
        });
        console.log("✅ Dmitry created.");
    } catch (e: any) {
        console.error("❌ Failed to create Dmitry:", e.message);
    }
}

main().catch(console.error);