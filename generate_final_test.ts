import { multiAgentService } from "./services/multiAgentService";
import { imageGeneratorAgent } from "./services/imageGeneratorAgent";
import { textRestorationService } from "./services/textRestorationService";
import { relinkingService } from "./services/relinkingService";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function generateFinalGoldArticle() {
  console.log("🚀 STARTING FINAL GOLD STANDARD GENERATION");
  console.log("👤 PERSONA: Provocative Female Psychologist (35, 3 kids, Hostile Elegance)");

  const theme = "Почему 'хорошие девочки' всегда выбирают тиранов и как выйти из этой мужеловки";
  const channelId = "women-35-60";
  const dateStr = new Date().toISOString().split('T')[0];
  const outputDir = path.join("articles", channelId, dateStr, "GOLD_STANDARD");

  await fs.mkdir(outputDir, { recursive: true });

  try {
    // 1. Generate Outline with PlotBible
    console.log("\n1️⃣  Generating Outline & PlotBible...");
    const outline = await multiAgentService.generateOutline({
      theme,
      angle: "provocative_intellectual",
      emotion: "triumph",
      audience: "Women 35-60, seeking independence",
      heroArchetype: "comeback_queen",
      timeline: "revelation"
    }, 4); // 4 episodes for depth

    // Ensure PlotBible is strictly provocative
    outline.plotBible.narrator = {
      age: 35,
      gender: "female",
      tone: "intellectual_dominance",
      voiceHabits: {
        apologyPattern: "Предупреждаю: это будет больно. Но эффективно.",
        doubtPattern: "Вы можете спорить, но статистика моего кабинета неумолима.",
        memoryTrigger: "Я помню, как сама была в этой мужеловке...",
        angerPattern: "Меня тошнит от этого патриархального абсурда."
      }
    };
    
    // 2. Generate Episodes
    console.log("\n2️⃣  Generating High-Quality Episodes...");
    // Injecting persona into generator
    const episodes = await multiAgentService.generateLongFormArticle({
      theme,
      angle: "provocative",
      emotion: "triumph",
      audience: "Women 35-60",
      includeImages: false
    });

    // 3. Text Restoration (Intellectual Scalpel)
    console.log("\n3️⃣  Applying 'Hostile Elegance' Text Restoration...");
    const restorationResult = await textRestorationService.restoreArticle(episodes);
    let finalContent = restorationResult.restoredContent;

    // 4. Generate UNIQUE AI Images
    console.log("\n4️⃣  Generating Barbaric Elegance AI Visuals...");
    const images: string[] = [];
    
    // Cover Image
    try {
      const cover = await imageGeneratorAgent.generateCoverImage({
        title: theme,
        ledeText: episodes.lede,
        plotBible: outline.plotBible,
        articleId: "gold_cover"
      });
      const coverPath = path.join(outputDir, "cover.jpg");
      await fs.writeFile(coverPath, Buffer.from(cover.base64, 'base64'));
      images.push("cover.jpg");
      console.log("✅ Cover image generated: cover.jpg");
    } catch (e) {
      console.error("❌ Cover image failed:", e.message);
    }

    // Internal Image 1
    try {
      const img1 = await imageGeneratorAgent.generateCoverImage({
        title: "The Intellectual Scalpel",
        ledeText: "Интерьер премиального авто, черная кожа, розовые отсветы. Холодный взгляд в зеркало.",
        plotBible: outline.plotBible,
        articleId: "gold_img1"
      });
      const img1Path = path.join(outputDir, "scene1.jpg");
      await fs.writeFile(img1Path, Buffer.from(img1.base64, 'base64'));
      images.push("scene1.jpg");
      console.log("✅ Internal image 1 generated: scene1.jpg");
    } catch (e) {
      console.error("❌ Internal image 1 failed:", e.message);
    }

    // 5. Final Assembly & Metadata
    console.log("\n5️⃣  Final Assembly...");
    const slug = theme.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '').substring(0, 50);
    const fileName = `${slug}.md`;
    const filePath = path.join(outputDir, fileName);

    const frontmatter = `---
title: "${theme}"
date: "${dateStr}"
description: "Как перестать быть 'удобной' и выйти из системы патриархального абсурда. Метод интеллектуального препарирования."
image: "cover.jpg"
category: "psychology"
version: "GOLD"
persona: "Provocative Psychologist"
---

`;

    await fs.writeFile(filePath, frontmatter + finalContent);
    console.log(`\n✨ SUCCESS! Gold article generated at: ${filePath}`);
    console.log(`📸 Images generated: ${images.length}`);

  } catch (error) {
    console.error("\n💥 FATAL GENERATION ERROR:", error);
  }
}

generateFinalGoldArticle();
