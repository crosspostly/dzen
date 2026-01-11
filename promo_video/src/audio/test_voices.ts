
import { ttsSave } from 'edge-tts';
import path from 'path';
import fs from 'fs';

async function main() {
    const text = "Я стояла у окна, сжимая в руке конверт. Двадцать лет молчания. Двадцать лет лжи... Неужели я разрушу всё ради одной минуты истины?";
    
    const outDir = path.join(__dirname, '../../public');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // 1. Svetlana (Female)
    console.log("Generating Svetlana...");
    await ttsSave(text, path.join(outDir, 'sample_svetlana.mp3'), {
        voice: 'ru-RU-SvetlanaNeural',
        rate: '-10%' 
    });

    // 2. Dmitry (Male)
    console.log("Generating Dmitry...");
    await ttsSave(text, path.join(outDir, 'sample_dmitry.mp3'), {
        voice: 'ru-RU-DmitryNeural',
        rate: '-5%'
    });

    console.log("Done!");
}

main().catch(console.error);
