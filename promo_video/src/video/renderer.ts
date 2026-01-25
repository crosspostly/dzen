import ffmpeg from 'fluent-ffmpeg';
import { VideoManifest } from '../types.js';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export class VideoRenderer {
    
    async renderVideoWithSingleAudio(manifest: VideoManifest, assetDir: string, fullAudioPath: string, outputFilePath: string): Promise<string> {
        console.log(`🎬 Rendering video with Single Audio Track...`);
        
        const tempDir = path.join(assetDir, 'temp_clips_silent');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const clipPaths: string[] = []; // ✅ Fix: Initialize clipPaths array

        // 1. Get Total Audio Duration
        const totalDuration = await this.getAudioDuration(fullAudioPath);
        console.log(`   ⏱️ Total Audio Duration: ${totalDuration.toFixed(2)}s`);

        // 1.5. Render COVER Clip (1.5s)
        const coverImagePath = path.join(assetDir, 'cover_final.png');
        const emptyTextPath = path.join(assetDir, 'text_empty.png'); // Just for overlay consistency
        const coverClipPath = path.join(tempDir, 'clip_0_cover.mp4');
        
        // Create an empty text overlay for the cover (text is already baked in the image)
        await this.renderEmptyOverlay(emptyTextPath);
        
        console.log(`   - Rendering Cover Clip (1.5s)...`);
        await this.renderSilentClip(coverImagePath, emptyTextPath, coverClipPath, 1.5);
        clipPaths.push(coverClipPath);

        // 2. Calculate Durations per Scene (Proportional to text length)
        const totalTextLength = manifest.scenes.reduce((acc, s) => acc + s.text.length, 0);
        // ... (rest of the logic)
        let accumulatedDuration = 1.5; // Start after cover

        for (let i = 0; i < manifest.scenes.length; i++) {
            const scene = manifest.scenes[i];
            const isLast = i === manifest.scenes.length - 1;
            
            // Proportional duration
            let sceneDuration = (scene.text.length / totalTextLength) * totalDuration;
            
            // Adjust last scene to match exactly totalDuration (fix rounding errors)
            if (isLast) {
                sceneDuration = totalDuration - accumulatedDuration;
            }
            accumulatedDuration += sceneDuration;

            // Enforce min duration (1s) to avoid glitches
            if (sceneDuration < 1.0) sceneDuration = 1.0;

            const imagePath = path.join(assetDir, `image_${scene.id}.png`);
            const textPath = path.join(assetDir, `text_${scene.id}.png`);
            const clipPath = path.join(tempDir, `silent_clip_${scene.id}.mp4`);

            console.log(`   - Rendering Silent Clip ${scene.id} (${sceneDuration.toFixed(2)}s)...`);
            await this.renderSilentClip(imagePath, textPath, clipPath, sceneDuration);
            clipPaths.push(clipPath);
        }

        // 3. Concat Silent Clips
        const silentVideoPath = path.join(tempDir, 'silent_combined.mp4');
        await this.concatClips(clipPaths, silentVideoPath);

        // 4. Merge with Audio
        console.log(`   - Merging with Audio...`);
        return new Promise((resolve, reject) => {
            const isPcm = fullAudioPath.endsWith('.wav');
            const command = ffmpeg();
            
            command.input(silentVideoPath);
            
            if (isPcm) {
                command.input(fullAudioPath).inputOptions(['-f s16le', '-ar 24000', '-ac 1']);
            } else {
                command.input(fullAudioPath);
            }

            command
                .outputOptions(['-c:v copy', '-c:a aac', '-shortest'])
                .save(outputFilePath)
                .on('end', () => resolve(outputFilePath))
                .on('error', (err) => reject(new Error(`Merge failed: ${err.message}`)));
        });
    }

    private async renderEmptyOverlay(outputPath: string) {
        const { createCanvas } = await import('canvas');
        const canvas = createCanvas(1080, 1920);
        fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    }

    private getAudioDuration(audioPath: string): Promise<number> {
        return new Promise((resolve) => {
            if (audioPath.endsWith('.wav')) {
                const stats = fs.statSync(audioPath);
                resolve(stats.size / 48000); // 24kHz * 16bit = 48000 bytes/sec
            } else {
                ffmpeg.ffprobe(audioPath, (err, metadata) => {
                    const d = metadata?.format?.duration;
                    resolve(d ? parseFloat(d) : 10);
                });
            }
        });
    }

    private renderSilentClip(imagePath: string, textPath: string, outputPath: string, duration: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const fps = 25;
            const frames = Math.ceil(duration * fps);
            
            // 1. Safe Crop (9:16) - Prevents stretching if input is 1:1 or 16:9
            const cropFilter = `crop='min(iw,ih*(9/16))':'min(ih,iw/(9/16))':(iw-ow)/2:(ih-oh)/2`;

            // 2. Ken Burns Effect (Super Slow & Cinematic)
            // Zoom from 1.0 to 1.05 over the clip duration (Very subtle)
            const kenBurnsFilter = `zoompan=z='min(zoom+0.00015,1.05)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}`;

            ffmpeg()
                .input(imagePath).loop(duration)
                .input(textPath).loop(duration)
                .complexFilter([
                    // Apply Crop -> Then ZoomPan
                    `[0:v]${cropFilter},${kenBurnsFilter}[bg]`,
                    `[bg][1:v]overlay=0:0`
                ])
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-t', `${duration}`
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    }

    async renderVideo(manifest: VideoManifest, assetDir: string, outputFilePath: string): Promise<string> {
        console.log(`🎬 Rendering final video...`);
        
        const tempDir = path.join(assetDir, 'temp_clips');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const clipPaths: string[] = [];

        // 1. Render individual clips for each scene
        for (const scene of manifest.scenes) {
            const imagePath = path.join(assetDir, `image_${scene.id}.png`);
            const textPath = path.join(assetDir, `text_${scene.id}.png`); // New text layer
            
            // Check for WAV (Gemini) or MP3 (Fallback)
            let audioPath = path.join(assetDir, `scene_${scene.id}.wav`);
            if (!fs.existsSync(audioPath)) {
                 audioPath = path.join(assetDir, `scene_${scene.id}.mp3`);
            }

            const clipPath = path.join(tempDir, `clip_${scene.id}.mp4`);

            if (!fs.existsSync(imagePath) || !fs.existsSync(audioPath)) {
                console.warn(`⚠️ Missing assets for scene ${scene.id}, skipping. Checked: ${audioPath}`);
                continue;
            }

            console.log(`   - Rendering clip ${scene.id}...`);
            // Pass textPath to the clip creator
            await this.createSceneClip(imagePath, textPath, audioPath, clipPath);
            clipPaths.push(clipPath);
        }

        // 2. Concat all clips
        console.log(`   - Concatenating ${clipPaths.length} clips...`);
        await this.concatClips(clipPaths, outputFilePath);

        // Cleanup temp
        // fs.rmSync(tempDir, { recursive: true, force: true });

        console.log(`✅ Video rendered: ${outputFilePath}`);
        return outputFilePath;
    }

    private createSceneClip(imagePath: string, textPath: string, audioPath: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const isPcm = audioPath.endsWith('.wav'); 
            
            // Get audio duration
            if (isPcm) {
                // For raw PCM (s16le, 24kHz, mono), duration = size / (24000 * 2)
                const stats = fs.statSync(audioPath);
                const duration = stats.size / 48000;
                this.runFfmpegClip(imagePath, textPath, audioPath, outputPath, duration, true, resolve, reject);
            } else {
                ffmpeg.ffprobe(audioPath, (err, metadata) => {
                    let duration = 5.0;
                    if (metadata && metadata.format && metadata.format.duration) {
                        const parsed = parseFloat(metadata.format.duration as any);
                        if (!isNaN(parsed) && parsed > 0) duration = parsed;
                    }
                    this.runFfmpegClip(imagePath, textPath, audioPath, outputPath, duration, false, resolve, reject);
                });
            }
        });
    }

    private runFfmpegClip(
        imagePath: string,
        textPath: string, // New input
        audioPath: string, 
        outputPath: string, 
        duration: number, 
        isPcm: boolean,
        resolve: () => void, 
        reject: (err: Error) => void
    ) {
        console.log(`     - Clip duration: ${duration.toFixed(2)}s`);
        
        const fps = 25;
        const frames = Math.ceil(duration * fps);
        
        // 1. Safe Crop (9:16)
        const cropFilter = `crop='min(iw,ih*(9/16))':'min(ih,iw/(9/16))':(iw-ow)/2:(ih-oh)/2`;

        // 2. Ken Burns Effect (Super Slow & Cinematic)
        // Zoom from 1.0 to 1.05 over the clip duration (Very subtle)
        // Reduced speed from 0.0005 to 0.00015 (~3x slower) for stability
        const kenBurnsFilter = `zoompan=z='min(zoom+0.00015,1.05)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}`;

        const command = ffmpeg();

        // Input 0: Background Image
        command.input(imagePath).loop(duration);
        
        // Input 1: Text Overlay (Static PNG)
        command.input(textPath).loop(duration);

        // Input 2: Audio
        if (isPcm) {
            command.input(audioPath).inputOptions([
                '-f s16le',
                '-ar 24000',
                '-ac 1'
            ]);
        } else {
            command.input(audioPath);
        }

        command
            .complexFilter([
                // [0:v] is background. Apply Crop -> ZoomPan -> [bg]
                `[0:v]${cropFilter},${kenBurnsFilter}[bg]`,
                // Overlay [1:v] (Text) on top of [bg] at 0,0
                `[bg][1:v]overlay=0:0`
            ])
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-t', `${duration}`,
                '-shortest'
            ])
            .on('error', (err) => {
                 console.error(`FFmpeg Error Details: ${err.message}`);
                 reject(new Error(`Clip render failed: ${err.message}`));
            })
            .on('end', () => resolve())
            .save(outputPath);
    }

    private concatClips(clipPaths: string[], outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (clipPaths.length === 0) {
                return reject(new Error(`No clips to concatenate`));
            }
            const listPath = path.join(path.dirname(clipPaths[0]), 'files.txt');
            
            // Fix: Use absolute paths to avoid directory context issues
            const fileContent = clipPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
            fs.writeFileSync(listPath, fileContent);

            ffmpeg()
                .input(listPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy']) // Fast stream copy (no re-encoding)
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`Concat failed: ${err.message}`)));
        });
    }
}