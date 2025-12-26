#!/usr/bin/env node

/**
 * 🔧 Article Restoration Script - CHUNKED MODE
 * Выпускающий редактор для Яндекс Дзена
 * 
 * НОВОЕ: Разбиваэм большие статьи на чунки по 3000 символов
 * Отреставриваем каждый часть отдельно
 * Склеиваем обратно в единые части
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY not found!');
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Настройки чанкирования
const CHUNK_SIZE = 3000;  // символов на часть
const CHUNK_OVERLAP = 100; // повторение для контекста

/**
 * 🎯 МОЩНЫЙ ПРОМПТ: ВЫПУСКАЮЩИЙ РЕДАКТОР ЯНДЕКС ДЗЕНА
 */
const RESTORATION_PROMPT = `Действуй как выпускающий редактор платформы Яндекс Дзен. Твоя задача — подготовить эту часть текста к публикации, проведя техническую чистку и верстку.

✅ ЧТО УДАЛИТЬ:
✂️ Эти слова-паразиты: "ну и", "да вот", "же", "потому что", "хотя", "но вот", "ведь", "ну да", "-то", "вот это", "вот что я хочу сказать", "одним словом" и подобные.
✂️ Двойные пробелы между словами
✂️ Слипшиеся слова ("текст.Вот" → "текст. Вот")
✂️ Лишние знаки препинания

✅ КАК РАБОТАТЬ С ОФОРМЛЕНИЕМ:
💬 Оформляй диалоги с новой строки через — (длинное тире)
📱 Каждый абзац — новый параграф, 3–5 предложений
📱 Очень важно: не оканчивай часть середине предложения!

✅ НИКГДА НЕ НАРУШАЙ:
❌ Не сокращай текст
❌ Не удаляй авторские мысли
❌ Не переписывай
❌ Не исправляй авторские повторы (если они намеренные)

Кгда готов - выведи ОТРЕСТАВРИРОВАННЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ.

Начни с этого текста:
`;

/**
 * 🐑 Разбию текст на чанки по границам абзацев
 */
function splitIntoChunks(text, maxSize = CHUNK_SIZE) {
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // Если вы добавляем текущий чанк со следующим абзацем, а очень долго...
    if (currentChunk.length + para.length + 2 > maxSize && currentChunk.length > 0) {
      // Сохрани этот чанк и начни новый
      chunks.push(currentChunk.trim());
      
      // Повтор для контекста (последние 100 символов предыдущего чанка)
      const overlap = currentChunk.slice(-CHUNK_OVERLAP);
      currentChunk = overlap + '\n\n' + para;
    } else {
      // Добавь абзац к текущему чанку
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
    }
  }

  // Не забывай последний чанк
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 🔌 Объедини чанки во вырезаные части и удали перекрытия
 */
function mergeChunks(chunks) {
  if (chunks.length === 0) return '';
  
  let merged = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i];
    // Найди где этот чанк начинается с повторения
    const lastChunk = chunks[i - 1];
    
    // Удали фрагмент оверлапа в последнем чанке
    if (lastChunk.length > CHUNK_OVERLAP) {
      const lastOverlap = lastChunk.slice(-CHUNK_OVERLAP).trim();
      if (currentChunk.startsWith(lastOverlap)) {
        merged += '\n\n' + currentChunk.slice(lastOverlap.length).trimStart();
      } else {
        merged += '\n\n' + currentChunk;
      }
    } else {
      merged += '\n\n' + currentChunk;
    }
  }
  
  return merged;
}

/**
 * Проверить структуру frontmatter
 */
function validateFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      valid: false,
      message: 'Missing frontmatter',
      frontmatter: null,
      body: content
    };
  }

  const frontmatterStr = match[1];
  const body = match[2];

  const hasTitle = /^title:/m.test(frontmatterStr);
  const hasDate = /^date:/m.test(frontmatterStr);
  const hasDescription = /^description:/m.test(frontmatterStr);

  if (!hasTitle || !hasDate || !hasDescription) {
    return {
      valid: false,
      message: 'Missing required frontmatter fields (title, date, description)',
      frontmatter: frontmatterStr,
      body: body
    };
  }

  return {
    valid: true,
    frontmatter: frontmatterStr,
    body: body
  };
}

/**
 * 🎯 Отправить ОДНО часть (CHUNK) на Gemini
 */
async function restoreChunk(chunkText, chunkIndex, totalChunks) {
  try {
    const prompt = `${RESTORATION_PROMPT}\n\n${chunkText}`;
    
    console.log(`  🤖 Processing chunk ${chunkIndex + 1}/${totalChunks}...`);
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    const restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return restoredText.trim();
  } catch (error) {
    console.error(`❌ Gemini API Error on chunk ${chunkIndex + 1}:`, error.message);
    throw error;
  }
}

/**
 * ✨ Отправить УТЮ статью (РАСПОЛОВАННО НА ЧАСТИ)
 */
async function restoreArticleBody(bodyText) {
  try {
    // Разбиваем на чанки
    const chunks = splitIntoChunks(bodyText);
    console.log(`  📄 Splitting into ${chunks.length} chunk(s) (max 3000 chars each)`);

    // Отправляем каждый чанк
    const restoredChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const restored = await restoreChunk(chunks[i], i, chunks.length);
      restoredChunks.push(restored);
      
      // Задержка между запросами
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Объединяем евованные части
    console.log(`  🔌 Merging ${restoredChunks.length} restored chunks...`);
    const finalText = mergeChunks(restoredChunks);

    // Проверяем что текст не сокращен радикально
    const originalLength = bodyText.trim().length;
    const finalLength = finalText.trim().length;
    const ratio = finalLength / originalLength;

    if (ratio < 0.70) {
      return { 
        success: false, 
        reason: `❌ CRITICAL SHORTENING: ${originalLength} → ${finalLength} (${(ratio * 100).toFixed(1)}%)` 
      };
    }

    console.log(`  ✅ Quality check: ${originalLength} → ${finalLength} (${(ratio * 100).toFixed(1)}%)`);
    return { success: true, text: finalText };

  } catch (error) {
    console.error('❌ Restoration Error:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * 📄 Обработать один файл
 */
async function restoreArticleFile(filePath) {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const validation = validateFrontmatter(fileContent);

    if (!validation.valid) {
      console.log(`⚠️  ${validation.message}`);
      console.log('   (Adding minimal frontmatter)');

      const fileName = path.basename(filePath, '.md');
      const now = new Date().toISOString().split('T')[0];
      
      const minimalFrontmatter = `---
title: ${fileName.replace(/-/g, ' ')}
date: ${now}
description: Article from auto-restore
---`;

      const restoration = await restoreArticleBody(validation.body);
      if (!restoration.success) {
        console.log(`❌ FAILED: ${restoration.reason}`);
        return false;
      }

      const restored = `${minimalFrontmatter}\n\n${restoration.text}`;
      fs.writeFileSync(filePath, restored, 'utf8');
      console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    console.log('🔍 Restoring article body (keeping metadata block)...');
    const restoration = await restoreArticleBody(validation.body);
    
    if (!restoration.success) {
      console.log(`❌ FAILED: ${restoration.reason}`);
      console.log('   Article will NOT be saved. Manual review required.');
      return false;
    }

    // Критичная ЛОГИКА: Чтобы оригинальная ШАПКА нЕ была разрушена
    const restored = `---\n${validation.frontmatter}\n---\n\n${restoration.text}`;

    fs.writeFileSync(filePath, restored, 'utf8');
    console.log(`✅ Successfully restored (metadata preserved)`);
    return true;

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  }
}

/**
 * 🚀 Основная функция
 */
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ✨ Article Restoration - CHUNKED MODE (Handles Large Articles)             ║');
  console.log('║  Strategy: Split → Restore Each Chunk → Merge → Verify               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('⚠️  No files specified');
    process.exit(0);
  }

  console.log(`📋 Files to restore: ${files.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (!file.endsWith('.md') || !file.includes('articles/')) {
      console.log(`⏭️  Skipping: ${file}`);
      continue;
    }

    const success = await restoreArticleFile(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Задержка между файлами
    if (files.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Итоговый отчёт
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ Restored: ${successCount.toString().padEnd(2)} │ ❌ Failed: ${failCount.toString().padEnd(2)} │ 📊 Total: ${files.length.toString().padEnd(2)}`.padEnd(84) + '║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});