
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("❌ ОШИБКА: API ключ не найден в .env");
    return;
  }

  const genAI = new GoogleGenAI({ apiKey });

  console.log("🔍 ТЕСТИРОВАНИЕ ОФИЦИАЛЬНЫХ МОДЕЛЕЙ (Март 2026):");
  
  const candidates = [
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-pro-latest",
    "gemini-flash-latest"
  ];

  for (const modelName of candidates) {
    process.stdout.write(`📡 Проверка ${modelName}... `);
    try {
      const result = await genAI.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
      });
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log("✅ РАБОТАЕТ");
      } else {
        console.log("⚠️ ПУСТОЙ ОТВЕТ");
      }
    } catch (error: any) {
      const msg = error.message.toLowerCase();
      if (msg.includes("404") || msg.includes("not found")) {
        console.log("❌ НЕТ (404)");
      } else if (msg.includes("429") || msg.includes("limit")) {
        console.log("⚠️ ЛИМИТ (429)");
      } else {
        console.log(`❌ ОШИБКА: ${error.message.substring(0, 60)}`);
      }
    }
  }
}

checkModels();
