import { VideoManifest, VideoScene } from "../types.js";
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { ImageGeneratorService } from '../../../services/imageGeneratorService.ts';

export class AssetManager {
    private imageGenerator: ImageGeneratorService;

    constructor() {
        this.imageGenerator = new ImageGeneratorService();
    }
    
    async prepareVisuals(manifest: VideoManifest, outputDir: string): Promise<Map<number, string>> {
        const imageMap = new Map<number, string>();
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`🖼️ Preparing visuals for ${manifest.scenes.length} scenes...`);

        // 0. Generate COVER (Scene 0)
        console.log(`   🎨 Generating Cover Image...`);
        const coverPath = path.join(outputDir, 'cover_final.png');
        await this.generateCoverWithText(coverPath, manifest);
        imageMap.set(0, coverPath);

        for (const scene of manifest.scenes) {
            const imageFileName = `image_${scene.id}.png`;
            const textFileName = `text_${scene.id}.png`;
            const imagePath = path.join(outputDir, imageFileName);
            const textPath = path.join(outputDir, textFileName);
            
            // 1. Generate Text Overlay (Always, transparent PNG)
            await this.generateTextOverlay(textPath, scene.screen_text);

            // 2. Generate AI Image (Background)
            console.log(`   🎨 Generating AI image for scene ${scene.id}...`);
            let generated = false;
            
            try {
                // Force 'cinematic' style for video generation
                const imageUrl = await this.imageGenerator.generateVisual(scene.image_prompt, 'cinematic');
                
                if (imageUrl && imageUrl.startsWith('data:image')) {
                    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
                    const buffer = Buffer.from(base64Data, 'base64');
                    fs.writeFileSync(imagePath, buffer);
                    generated = true;
                    console.log(`   ✅ AI Image generated: ${imageFileName}`);
                }
            } catch (e: any) {
                console.warn(`   ⚠️ AI Image generation failed for scene ${scene.id}: ${e.message}`);
            }

            // Fallback to placeholder if AI failed
            if (!generated) {
                console.log(`   ⚠️ Using placeholder for scene ${scene.id}`);
                await this.createPlaceholderImage(imagePath, scene); // Just background
            }
            
            imageMap.set(scene.id, imagePath);
        }

        return imageMap;
    }

    private async generateCoverWithText(outputPath: string, manifest: VideoManifest) {
        const width = 1080;
        const height = 1920;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 1. Get Base Image for cover (use scene 1 prompt or generic)
        console.log(`      - Generating AI background for cover...`);
        const bgDataUrl = await this.imageGenerator.generateVisual(manifest.scenes[0].image_prompt, 'cinematic');
        
        if (bgDataUrl) {
            const bgImg = await loadImage(Buffer.from(bgDataUrl.split(',')[1], 'base64'));
            // Center crop/fill
            const scale = Math.max(width / bgImg.width, height / bgImg.height);
            const x = (width - bgImg.width * scale) / 2;
            const y = (height - bgImg.height * scale) / 2;
            ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Dark Overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);

        // 3. Draw Huge Centered Text with Auto-Scaling
        const text = (manifest.cover_text || manifest.title).toUpperCase();
        let fontSize = 120;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 30;

        // Wrap logic with scaling
        let lines: string[] = [];
        const maxWidth = width - 120; // 60px margin on each side

        const wrapText = (size: number) => {
            ctx.font = `900 ${size}px "Roboto", "Arial Black", sans-serif`;
            const words = text.split(' ');
            const resLines: string[] = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth) {
                    if (!currentLine) { // Single word too long
                        return null; // Trigger font reduction
                    }
                    resLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            resLines.push(currentLine);
            return resLines;
        };

        // Attempt to wrap text, reducing font size if it doesn't fit
        while (fontSize > 60) {
            const result = wrapText(fontSize);
            if (result) {
                lines = result;
                // Final check: check if any line is STILL too long (extra safety)
                const overflow = lines.some(l => ctx.measureText(l).width > maxWidth);
                if (!overflow) break;
            }
            fontSize -= 10;
        }

        ctx.font = `900 ${fontSize}px "Roboto", "Arial Black", sans-serif`;
        let startY = height / 2 - ((lines.length - 1) * (fontSize * 0.6));
        for (const l of lines) {
            ctx.strokeText(l.trim(), width / 2, startY);
            ctx.fillText(l.trim(), width / 2, startY);
            startY += fontSize * 1.2; // Line height
        }

        fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    }

    private async generateTextOverlay(outputPath: string, text: string | undefined) {
        const width = 1080;
        const height = 1920;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Clear canvas (Transparent)
        ctx.clearRect(0, 0, width, height);

        if (!text) {
             const buffer = canvas.toBuffer('image/png');
             fs.writeFileSync(outputPath, buffer);
             return;
        }

        // --- STYLING ---
        // Semi-transparent background box for better readability
        // We calculate text size first to draw the box? 
        // Or just a gradient at the bottom. The gradient is safer for "cinematic" look.
        
        // Gradient
        // const gradient = ctx.createLinearGradient(0, height * 0.65, 0, height * 0.95);
        // gradient.addColorStop(0, 'rgba(0,0,0,0)');
        // gradient.addColorStop(0.3, 'rgba(0,0,0,0.6)');
        // gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        // ctx.fillStyle = gradient;
        // ctx.fillRect(0, height * 0.5, width, height * 0.5);

        // Text Settings
        ctx.fillStyle = '#ffffff';
        // Modern Font Stack: Roboto (if available), Helvetica, or standard Sans-Serif
        // Using "900" weight for maximum boldness
        ctx.font = '900 90px "Roboto", "Helvetica", "Arial", sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Clean Stroke (Outline)
        ctx.lineWidth = 6; // Slightly thinner for elegance
        ctx.strokeStyle = 'black';
        
        // Soft Shadow for depth
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // Wrap text
        const words = text.split(' ');
        let line = '';
        const lines: string[] = [];
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > width - 150 && i > 0) { // Margin
                lines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Render lines
        // Position: Bottom third
        let y = height * 0.75; 
        const lineHeight = 100;
        
        // Adjust Y up if many lines
        y -= (lines.length - 1) * (lineHeight / 2);

        // Optional: Draw a black box behind the specific text area for maximum readability
        // (Replaces the generic gradient for cleaner look)
        // Draw Text
        for (const l of lines) {
            ctx.strokeText(l, width / 2, y);
            ctx.fillText(l, width / 2, y);
            y += lineHeight; 
        }

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
    }

    private async createPlaceholderImage(outputPath: string, scene: VideoScene) {
        const width = 1080;
        const height = 1920;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background (Gradient based on mood/random)
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#2c3e50');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Scene ID watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 400px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(scene.id.toString(), width / 2, height / 2);

        // Prompt Text (Small, for debugging)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        
        // Wrap prompt text
        const words = scene.image_prompt.split(' ');
        let line = '';
        let y = height - 300;
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > width - 100 && i > 0) {
                ctx.fillText(line, width / 2, y);
                line = words[i] + ' ';
                y += 30;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, width / 2, y);

        // Main Screen Text (The Overlay) - Simulated here
        if (scene.screen_text) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 80px sans-serif';
            ctx.shadowColor = "black";
            ctx.shadowBlur = 20;
            ctx.fillText(scene.screen_text, width / 2, height / 3);
        }

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
    }
}
