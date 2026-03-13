import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("❌ ОШИБКА: API ключ не найден в .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("🔍 ТЕСТИРОВАНИЕ ОФИЦИАЛЬНЫХ МОДЕЛЕЙ (Март 2026):");
  
  const candidates = [
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-flash-latest"
  ];

  for (const modelName of candidates) {
    process.stdout.write(`📡 Проверка ${modelName}... `);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      const text = result.response.text();
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