// Independent ESM wrapper for edge-tts
// Import directly from the compiled output to avoid TS loading issues
import { ttsSave } from 'edge-tts/out/index.js';
import fs from 'fs';
import path from 'path';

// Arguments: output_file, text, voice, rate, pitch
const [,, outputFile, text, voice, rate, pitch] = process.argv;

if (!outputFile || !text) {
    console.error("Usage: node tts_wrapper.mjs <output> <text> [voice] [rate] [pitch]");
    process.exit(1);
}

const options = {
    voice: voice || 'ru-RU-SvetlanaNeural',
    rate: rate || '-5%',
    pitch: pitch || '-2Hz'
};

// console.log(`Wrapper: Generating to ${path.basename(outputFile)} with ${options.voice}`);

try {
    // Ensure dir exists
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await ttsSave(text, outputFile, options);
    // console.log("Wrapper: Success");
    process.exit(0);
} catch (e) {
    console.error("Wrapper Error:", e.message);
    process.exit(1);
}
