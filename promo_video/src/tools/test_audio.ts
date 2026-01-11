import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import fs from 'fs';

async function testAudio(modelName: string, apiVersion: string = 'v1beta') {
    console.log(`Testing model: ${modelName} (API: ${apiVersion})`);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: apiVersion });

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: "Hello, this is a test." }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Kore"
                        }
                    }
                }
            }
        });

        console.log(`✅ Success with ${modelName}!`);
    } catch (e: any) {
        console.log(`❌ Failed with ${modelName}: ${e.message}`);
    }
}

async function run() {
    // Try v1alpha for 2.5-flash (often new features exist there first)
    await testAudio("gemini-2.5-flash", "v1alpha");
    
    // Try standard 2.5-pro
    await testAudio("gemini-2.5-pro");
    
    // Try preview variants
    await testAudio("gemini-2.5-flash-preview");
}

run();