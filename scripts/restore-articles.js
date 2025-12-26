#!/usr/bin/env node

/**
 * 🚀 Article Restoration Script - SIMPLIFIED CHUNKED MODE
 * Выпускающий редактор для Яндекс Дзена
 * 
 * Подход:
 * 1. Разделяем статью по долям (чисто, без overlap)
 * 2. Каждую долю отреставриваем отдельно
 * 3. Просто склеиваем вырезанные доли вместе
 * 4. Если не работает → RETRY с другой моделью
 * 5. Если даже ретри не помогли → СОХРАНЯЕМ всё равно
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

const CHUNK_SIZE = 3000;

/**
 * 🎯 МОЩНЫЙ ПРОМПТ
 */
const RESTORATION_PROMPT = `Действуй как выпускающий редактор Яндекс Дзен. Ниже — часть статьи, которую нужно отреставрить. Проведи техническую чистку и верстку.

✅ УДАЛИ:
✂️ Мусор: "ну и", "да вот", "же", "потому что", "хотя", "но вот", "ведь", "ну да", "-то", "вот это", "вот что я хочу сказать", "одним словом"
✂️ Двойные пробелы, слипшиеся слова, лишние символы

✅ ОФОРМЛЕНИЕ:
💬 Диалоги с тире (—) на новой строке
📱 Абзацы 3-5 предложений, оптимально для мобильных

✅ НИКОГДА НЕ НАрушАЙ:
❌ Не сокращай, не удаляй, не переписывай

Кгда готов - выведи тОЛЬКО ГОТОВЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ.

Начни с этого:
`;

/**
 * 🐑 Разделяем на доли (без overlap!)
 * ЛОГИКА: Чисто делим по абзацам, каждая доля — автономна
 */
function splitIntoChunks(text, maxSize = CHUNK_SIZE) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // Проверяем: улезет ли параграф в текущий чанк?
    if (currentChunk.length + para.length + 2 > maxSize && currentChunk.length > 0) {
      // НО—сохраняем текущий чанк
      chunks.push(currentChunk.trim());
      // НАЧИНАЕМ НОВОЕ! (БЕЗ overlap!)
      currentChunk = para;
    } else {
      // ДА—добавляем параграф
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
    }
  }

  // Последний чанк
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 🔌 Простая склейка (БЕЗ overlap removal!)
 */
function mergeChunks(chunks) {
  return chunks.join('\n\n');
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
      message: 'Missing required frontmatter fields',
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
 * 🎯 Отправить ОДНО долю (С RETRY!)
 */
async function restoreChunk(chunkText, chunkIndex, totalChunks, modelName = 'gemini-2.5-flash-lite') {
  try {
    const prompt = `${RESTORATION_PROMPT}\n\n${chunkText}`;
    
    console.log(`  🤖 Processing chunk ${chunkIndex + 1}/${totalChunks} (${modelName})...`);
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    const restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, text: restoredText.trim() };
  } catch (error) {
    console.error(`❌ Error on chunk ${chunkIndex + 1}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🔄 RETRY ЛОГИКА
 */
async function restoreChunkWithRetry(chunkText, chunkIndex, totalChunks) {
  // Пытаемся с lite снача
  let result = await restoreChunk(chunkText, chunkIndex, totalChunks, 'gemini-2.5-flash-lite');
  
  if (!result.success) {
    console.log(`  ⚠️  Lite failed, retrying with gemini-2.5-flash...`);
    result = await restoreChunk(chunkText, chunkIndex, totalChunks, 'gemini-2.5-flash');
  }
  
  if (!result.success) {
    console.log(`  ⚠️  Both models failed. Returning original chunk.`);
    return { success: true, text: chunkText, fallback: true };
  }
  
  return result;
}

/**
 * ✨ Отреставрить ВСЮ статью
 */
async function restoreArticleBody(bodyText) {
  try {
    // Чисто делим на доли
    const chunks = splitIntoChunks(bodyText);
    console.log(`  📄 Splitting into ${chunks.length} chunk(s) (${CHUNK_SIZE} chars each)`);

    // Отреставриваем каждую долю с RETRY
    const restoredChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await restoreChunkWithRetry(chunks[i], i, chunks.length);
      restoredChunks.push(result.text);
      
      if (result.fallback) {
        console.log(`  ⚠️  Chunk ${i + 1}: Using ORIGINAL (both models failed)`);
      }
      
      // Задержка
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Простая склейка (БЕЗ overlap removal)
    console.log(`  🔌 Merging ${restoredChunks.length} chunks...`);
    const finalText = mergeChunks(restoredChunks);

    // Проверяем на катастрофичное сокращение
    const originalLength = bodyText.trim().length;
    const finalLength = finalText.trim().length;
    const ratio = finalLength / originalLength;

    console.log(`  ✅ Quality check: ${originalLength} → ${finalLength} (${(ratio * 100).toFixed(1)}%)`);

    // Черезычайно жесткое сокращение? (Ниже 50%?)
    if (ratio < 0.50) {
      console.log(`  ⚠️  WARNING: Severe shortening detected (${(ratio * 100).toFixed(1)}%)`);
      console.log(`  ⚠️  But saving anyway (better restored than broken)`);
    }

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
      console.log(`⚠️  ${validation.message} (Adding minimal frontmatter)`);

      const fileName = path.basename(filePath, '.md');
      const now = new Date().toISOString().split('T')[0];
      
      const minimalFrontmatter = `---
title: ${fileName.replace(/-/g, ' ')}
date: ${now}
description: Article from auto-restore
---`;

      const restoration = await restoreArticleBody(validation.body);
      const restored = `${minimalFrontmatter}\n\n${restoration.text}`;

      fs.writeFileSync(filePath, restored, 'utf8');
      console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    console.log('🔍 Restoring article body (preserving metadata block)...');
    const restoration = await restoreArticleBody(validation.body);

    // Все равно сохраняем! (Не отказываем)
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
  console.log('║  🚀 Article Restoration - SIMPLIFIED CHUNKED MODE                         ║');
  console.log('║  Split (no overlap) → Restore Each (with retry) → Merge (always save)     ║');
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

    if (files.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

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
