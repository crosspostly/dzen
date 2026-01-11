import { GeminiVideoAgent } from './ai/gemini_video_agent.js';
import { AudioFactory } from './audio/audio_service.js';
import { AssetManager } from './video/asset_manager.js';
import { VideoRenderer } from './video/renderer.js';
import { VideoManifest } from './types.js';
import fs from 'fs';
import path from 'path';

export class VideoOrchestrator {
    private geminiAgent: GeminiVideoAgent;
    private audioFactory: AudioFactory;
    private assetManager: AssetManager;
    private videoRenderer: VideoRenderer;

    constructor(apiKey: string) {
        this.geminiAgent = new GeminiVideoAgent(apiKey);
        // Switch to Gemini for audio as requested
        this.audioFactory = new AudioFactory('gemini', apiKey);
        this.assetManager = new AssetManager();
        this.videoRenderer = new VideoRenderer();
    }

    /**
     * Main pipeline: Article Text -> Full Video Assets
     */
    async processArticle(articleText: string, outputDir: string) {
        console.log(`🎬 Starting Video Production Pipeline...`);
        
        // 1. Create Manifest (The Script)
        console.log(`\n🧠 Step 1: Generating Manifest (Script & Prompts)...`);
        let manifest: VideoManifest;
        try {
            manifest = await this.geminiAgent.generateManifest(articleText);
            // Ensure output dir exists
            if (!fs.existsSync(outputDir)) {
                 fs.mkdirSync(outputDir, { recursive: true });
            }
            const manifestPath = path.join(outputDir, 'manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log(`✅ Manifest saved to ${manifestPath}`);
        } catch (error) {
            console.error("❌ Step 1 Failed:", error);
            throw error;
        }

        // 2. Generate Audio (Voiceover) - Single Pass Mode
        console.log(`\n🎤 Step 2: Generating Audio (Single Pass)...`);
        // OLD: const audioMap = await this.audioFactory.generateAudioForManifest(manifest, outputDir);
        const fullAudioPath = await this.audioFactory.generateFullAudio(manifest, outputDir);
        console.log(`✅ Full Audio generated: ${fullAudioPath}`);

        // 3. Generate Visuals (Images)
        console.log(`\n🖼️ Step 3: Generating Visuals...`);
        const imageMap = await this.assetManager.prepareVisuals(manifest, outputDir);
        console.log(`✅ Images generated for ${imageMap.size} scenes.`);
        
        // 4. Render Video (Single Audio Mode)
        console.log(`\n🎥 Step 4: Rendering Final Video...`);
        const videoPath = path.join(outputDir, 'final_video.mp4');
        
        // Use the new single-audio renderer
        await this.videoRenderer.renderVideoWithSingleAudio(manifest, outputDir, fullAudioPath, videoPath);

        return {
            manifest,
            audioMap: new Map(), // Empty as we used single audio
            imageMap,
            videoPath,
            outputDir
        };
    }
}
