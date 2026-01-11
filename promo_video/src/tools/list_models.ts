import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const client = new GoogleGenAI({ apiKey });
    
    try {
        console.log("Fetching available models...");
        // Note: The specific method to list models might vary by SDK version, 
        // but typically it's under models.list() or similar.
        // For @google/genai (new SDK), it is client.models.list()
        
        const response = await client.models.list();
        
        console.log(`\nFound models:`);
        for await (const m of response) {
             if (m.name && m.name.includes('gemini')) {
                console.log(`- ${m.name} (${m.displayName})`);
             }
        }

    } catch (e: any) {
        console.error("Error listing models:", e);
    }
}

listModels();
