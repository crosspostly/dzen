import { VideoManifest } from "../types.js";
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Modality } from "@google/genai";

export interface IAudioProvider {
    generateVoiceover(text: string, outputFile: string, gender: 'male' | 'female', mood?: string): Promise<void>;
}

/**
 * Helper to add RIFF WAV header to raw PCM data from Gemini
 */
function addWavHeader(samples: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Uint8Array {
    const buffer = new ArrayBuffer(44 + samples.length);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length, true);

    const pcmData = new Uint8Array(buffer, 44);
    pcmData.set(samples);

    return new Uint8Array(buffer);
}

export class GeminiNativeTTSProvider implements IAudioProvider {
    private ai: GoogleGenAI;
    private modelName = "gemini-2.5-flash-preview-tts"; 

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    async generateVoiceover(text: string, outputFile: string, gender: 'male' | 'female', mood: string = 'dramatic'): Promise<void> {
        let voiceName = 'Aoede'; // Deep, professional Female (User preference)
        if (gender === 'male') {
            voiceName = 'Charon'; 
        }

        console.log(`   🎙️ Gemini TTS: Generating with voice "${voiceName}"...`);

        try {
            const response = await this.ai.models.generateContent({
                model: this.modelName,
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName }
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("TTS generation failed: No audio data returned");

            const buffer = Buffer.from(base64Audio, 'base64');
            const wavBuffer = addWavHeader(new Uint8Array(buffer), 24000, 1);
            
            fs.writeFileSync(outputFile, Buffer.from(wavBuffer));
            console.log(`   ✅ Audio saved: ${path.basename(outputFile)} (${wavBuffer.length} bytes)`);

        } catch (e: any) {
            console.error(`   ❌ Gemini TTS Failed: ${e.message}`);
            throw e;
        }
    }
}

export class AudioFactory {
    private provider: IAudioProvider;

    constructor(providerType: 'gemini' = 'gemini', apiKey?: string) {
        if (!apiKey) throw new Error("API Key required for Gemini Audio Factory");
        this.provider = new GeminiNativeTTSProvider(apiKey);
    }

    async generateAudioForManifest(manifest: VideoManifest, outputDir: string): Promise<Map<number, string>> {
        const audioMap = new Map<number, string>();
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        console.log(`🎤 Generating audio for ${manifest.scenes.length} scenes...`);

        for (const scene of manifest.scenes) {
            const fileName = `scene_${scene.id}.wav`;
            const filePath = path.join(outputDir, fileName);
            
            console.log(`   - Scene ${scene.id}: "${scene.text.substring(0, 30)}..."`);
            await this.provider.generateVoiceover(
                scene.text, 
                filePath, 
                manifest.voice_gender
            );
            
            audioMap.set(scene.id, filePath);
            await new Promise(r => setTimeout(r, 1000));
        }
        return audioMap;
    }

    async generateFullAudio(manifest: VideoManifest, outputDir: string): Promise<string> {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        
        const fullText = manifest.scenes.map(s => s.text).join(' ');
        const filePath = path.join(outputDir, 'full_audio.wav');
        
        console.log(`🎤 Generating FULL audio (${fullText.length} chars)...`);
        await this.provider.generateVoiceover(
            fullText,
            filePath,
            manifest.voice_gender
        );
        
        return filePath;
    }
}
