#!/usr/bin/env node

/**
 * 🔧 Article Restoration Script - FIXED VERSION
 * Сохраняет 100% исходного контента, только улучшает структуру
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

/**
 * 🆕 НОВЫЙ ПРОМПТ: Сохраняет ВСЕ содержимое без сокращений
 * Только улучшает структуру и форматирование
 */
const RESTORATION_PROMPT = `Ты — профессиональный редактор. Твоя ЕДИНСТВЕННАЯ задача: улучшить структуру и форматирование текста, СОХРАНИВ ВСЕ СОДЕРЖИМОЕ ПОЛНОСТЬЮ.

✅ ЧТО НУЖНО СОХРАНИТЬ:
✓ Каждую сцену
✓ Каждого персонажа
✓ Каждый диалог
✓ Каждое описание
✓ Все детали сюжета
✓ ВСЮ информацию целиком
✓ 100% исходного текста по объёму

❌ ЧТО ЗАПРЕЩЕНО:
✗ Сокращать текст
✗ Пропускать части
✗ Убирать как "повторение"
✗ Уменьшать количество слов
✗ Убирать описания
✗ Убирать диалоги
✗ Переписывать (только улучшать форматирование)

🎯 ЧТО НУЖНО СДЕЛАТЬ:

1️⃣ СТРУКТУРА:
   - Разбей текст на логические абзацы
   - Каждый абзац = одна сцена или идея
   - Между абзацами пустая строка
   - Каждый абзац на новой строке
   - Минимум 3-4 предложения в абзаце

2️⃣ ФОРМАТИРОВАНИЕ (только техническое):
   - Исправь орфографические ошибки
   - Исправь пунктуацию
   - Убери только случайные двойные пробелы
   - Оставь авторский стиль и тон

3️⃣ СТИЛЬ:
   - Оставь ВСЕ авторские повторы (они намеренные!)
   - Оставь ВСЕ разговорные вставки если они в оригинале
   - Оставь ВСЕ эмоциональные моменты
   - Оставь ВСЕ описания

4️⃣ КОНТРОЛЬ КАЧЕСТВА:
   - Финальный текст должен быть ≈100% от исходного объёма
   - Если текст сокращён более чем на 15%, ЭТО ОШИБКА
   - Все сцены должны быть на месте
   - Все персонажи должны упоминаться
   - Весь диалог должен быть сохранён

⚠️ ВАЖНО:
   - ВЫВЕДИ ТОЛЬКО ГОТОВЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ
   - НЕ ДОБАВЛЯЙ объяснения
   - НАЧНИ СРАЗУ С ПЕРВОГО ПРЕДЛОЖЕНИЯ

ИСХОДНЫЙ ТЕКСТ:`;

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
 * Проверить что текст восстановлен полностью (не сокращён)
 */
function validateRestoration(originalText, restoredText) {
  if (!restoredText || restoredText.trim().length < 100) {
    return { valid: false, reason: 'Text too short' };
  }

  const originalLength = originalText.trim().length;
  const restoredLength = restoredText.trim().length;
  const ratio = restoredLength / originalLength;

  // Критично: текст не должен быть сокращён более чем на 15%
  if (ratio < 0.85) {
    return { 
      valid: false, 
      reason: `❌ SHORTENING DETECTED: ${originalLength} → ${restoredLength} (${(ratio * 100).toFixed(1)}%)` 
    };
  }

  const paragraphs = restoredText.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length < 2) {
    return { valid: false, reason: 'Too few paragraphs' };
  }

  return { valid: true };
}

/**
 * Отправить текст на Gemini для реставрации
 */
async function restoreArticle(articleText) {
  try {
    const prompt = `${RESTORATION_PROMPT}\n\n${articleText}`;

    console.log('🤖 Calling Gemini 2.5 Flash Lite...');
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    const restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const trimmedText = restoredText.trim();

    const validation = validateRestoration(articleText, trimmedText);
    if (!validation.valid) {
      console.log(`⚠️  ${validation.reason}`);
      console.log('🤖 Trying with gemini-2.5-flash...');
      
      const fallbackResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${RESTORATION_PROMPT}\n\n${articleText}`,
        config: { responseMimeType: "text/plain" }
      });
      const fallbackText = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return fallbackText.trim();
    }

    return trimmedText;
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    throw error;
  }
}

/**
 * Обработать один файл
 */
async function restoreArticleFile(filePath) {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const validation = validateFrontmatter(fileContent);

    if (!validation.valid) {
      console.log(`⚠️  ${validation.message}`);
      const fileName = path.basename(filePath, '.md');
      const now = new Date().toISOString().split('T')[0];
      
      const minimalFrontmatter = `---
title: ${fileName.replace(/-/g, ' ')}
date: ${now}
description: Article from auto-restore
---`;

      const restoredBody = await restoreArticle(validation.body);
      const restored = `${minimalFrontmatter}\n\n${restoredBody}`;
      fs.writeFileSync(filePath, restored, 'utf8');
      console.log(`✅ Restored with minimal frontmatter`);
      return true;
    }

    console.log('🔍 Restoring article body...');
    const restoredBody = await restoreArticle(validation.body);

    const bodyValidation = validateRestoration(validation.body, restoredBody);
    if (!bodyValidation.valid) {
      console.log(`❌ FAILED: ${bodyValidation.reason}`);
      return false;
    }

    const restored = `---\n${validation.frontmatter}\n---\n\n${restoredBody}`;
    fs.writeFileSync(filePath, restored, 'utf8');
    console.log(`✅ Successfully restored`);
    return true;

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  🔧 Article Restoration - PRESERVE ALL CONTENT    ║');
  console.log('╚═══════════════════════════════════════════════════╝');
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

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log(`║  ✅ Restored: ${successCount} │ ❌ Failed: ${failCount}`);
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});