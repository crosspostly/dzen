import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // There isn't a direct "list models" on the instance easily without using the model manager in some SDKs, 
        // but let's try a simple generation to see if it works for TEXT at least.
        
        console.log("Testing text generation...");
        const result = await model.generateContent("Hello");
        console.log("Text generation success:", result.response.text());
        
        // If text works, then the model exists.
        // The error "This model only supports text output" confirms the model exists but doesn't do audio.
        
    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();