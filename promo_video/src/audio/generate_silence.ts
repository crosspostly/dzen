import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

async function generateSilence() {
    const publicDir = path.join(__dirname, '../../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    const outputPath = path.join(publicDir, 'silence.mp3');

    console.log("Audio source missing. Generating 15 seconds of silence as a fallback...");

    return new Promise((resolve, reject) => {
        ffmpeg()
            // FFmpeg virtual audio source 'anullsrc' produces silence
            .input('anullsrc')
            .inputFormat('lavfi')
            .audioCodec('libmp3lame')
            .duration(15) // 15 seconds long
            .on('end', () => {
                console.log(`✅ Silence generated at ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('❌ Failed to generate silence:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

// This allows us to call this script directly
if (require.main === module) {
    generateSilence().catch(console.error);
}

export { generateSilence };
