import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenAI(process.env.API_KEY || "");

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini 1.5 Flash is available");
  } catch (e) {
    console.log("Gemini 1.5 Flash NOT available:", e.message);
  }
}

listModels();
