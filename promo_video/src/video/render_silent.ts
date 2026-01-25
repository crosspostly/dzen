import ffmpeg from 'fluent-ffmpeg';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

async function main() {
    const publicDir = path.join(__dirname, '../../public');
    const imagePath = path.join(publicDir, 'silent_cover.png');
    const videoPath = path.join(publicDir, 'result_silent_video.mp4');

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    console.log("🎨 Generating Cover Image for SILENT video...");
    
    // 1. Создаем картинку
    const width = 1080;
    const height = 1920;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#4b6cb7');
    gradient.addColorStop(1, '#182848');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText("SILENT VIDEO", width / 2, height / 3);
    ctx.font = 'normal 50px sans-serif';
    ctx.fillText("(Audio disabled)", width/2, height/3 + 100);


    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(imagePath, buffer);
    console.log("✅ Cover image saved.");

    // 2. Сборка видео через FFmpeg (БЕЗ ЗВУКА)
    console.log("🎬 Rendering SILENT Video (5 seconds)...");
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imagePath)
            .loop() 
            .duration(5) // Устанавливаем длительность 5 секунд
            .videoCodec('libx264')
            .outputOptions([
                '-pix_fmt yuv420p' // Для совместимости
            ])
            .save(videoPath)
            .on('end', () => {
                console.log(`✅ Silent video rendered successfully: ${videoPath}`);
                resolve(true);
            })
            .on('error', (err) => {
                console.error('❌ Error rendering silent video:', err);
                reject(err);
            });
    });
}

main().catch(console.error);
