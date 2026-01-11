import ffmpeg from 'fluent-ffmpeg';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

// Убедимся, что ffmpeg найден
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

async function createPlaceholderImage(outputPath: string, text: string) {
    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Simple word wrapping
    const words = text.split(' ');
    let line = '';
    let y = height / 2;
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 100 && i > 0) {
            ctx.fillText(line, width / 2, y);
            line = words[i] + ' ';
            y += 100;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, width / 2, y);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`🖼️  Image created: ${outputPath}`);
}

async function main() {
    const audioPath = path.join(__dirname, '../../public/test_drama.mp3');
    const imagePath = path.join(__dirname, '../../public/cover_test.png');
    const outputVideoPath = path.join(__dirname, '../../public/result_video.mp4');

    // 1. Create a dummy image if we don't have one (normally ImageGenerator does this)
    await createPlaceholderImage(imagePath, "ДРАМАТИЧЕСКАЯ ИСТОРИЯ\n(Тестовый Рендер)");

    // 2. Check if audio exists
    if (!fs.existsSync(audioPath)) {
        console.error(`❌ Audio file not found: ${audioPath}`);
        console.log("Please run tts_generator.ts first!");
        process.exit(1);
    }

    console.log("🎬 Starting Video Render...");

    // 3. Render Video
    // Loop the image to match audio duration
    ffmpeg()
        .input(imagePath)
        .loop() // Loop the single image
        .input(audioPath)
        .outputOptions([
            '-c:v libx264', // Codec
            '-t', '30', // Max duration safety (or match audio)
            '-pix_fmt yuv420p', // Compatibility
            '-shortest' // Finish when the shortest input (audio) ends
        ])
        .save(outputVideoPath)
        .on('start', (commandLine) => {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', (err) => {
            console.error('An error occurred: ' + err.message);
        })
        .on('end', () => {
            console.log(`✅ Video rendering finished!`);
            console.log(`📍 Output: ${outputVideoPath}`);
        });
}

main().catch(console.error);