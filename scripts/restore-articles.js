#!/usr/bin/env node

/**
 * 🔧 Article Restoration Script - FIXED PROMPT VERSION
 * Использует Gemini 2.5 Flash Lite для автоматической реставрации статей
 * 
 * ИЗМЕНЕНИЯ:
 * - Новый промпт который СОХРАНЯЕТ 100% контента (не сокращает)
 * - Сохранены все полезные валидации из v1
 * - Добавлена проверка что текст не был сокращён более чем на 15%
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
✗ Переписывать (только улучшать форматирование)

🎯 ЧТО НУЖНО СДЕЛАТЬ:

1️⃣ СТРУКТУРА:
   - Раздели текст на логические абзацы
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
   - Если текст сокращён более чем на 15%, это ОШИБКА
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

  // Проверяем обязательные поля
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
 * 🆕 НОВАЯ ВАЛИДАЦИЯ: Проверяет что текст не был сокращён
 */
function validateRestoration(originalText, restoredText) {
  if (!restoredText || restoredText.trim().length < 100) {
    return { valid: false, reason: 'Text too short (< 100 chars)' };
  }

  const originalLength = originalText.trim().length;
  const restoredLength = restoredText.trim().length;
  const ratio = restoredLength / originalLength;

  // 🚨 КРИТИЧНО: текст не должен быть сокращён более чем на 15%
  if (ratio < 0.85) {
    return { 
      valid: false, 
      reason: `❌ SHORTENING DETECTED: ${originalLength} → ${restoredLength} (${(ratio * 100).toFixed(1)}% of original)` 
    };
  }

  // Проверка на минимальное количество абзацев
  const paragraphs = restoredText.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length < 2) {
    return { valid: false, reason: 'Too few paragraphs' };
  }

  return { valid: true };
}

/**
 * Рассчитать схожесть строк (0-1)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Рассчитать расстояние Левенштейна
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 🆕 Функция для проверки что текст не имеет очевидных дублей
 */
function validateNoDuplicateLines(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 50);
  if (lines.length >= 2) {
    for (let i = 0; i < lines.length - 1; i++) {
      const similarity = calculateSimilarity(lines[i], lines[i + 1]);
      if (similarity > 0.85) {
        return { valid: false, reason: 'Obvious line repetition detected' };
      }
    }
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

    // 🆕 Валидация: проверяем что текст не был сокращён
    const lengthValidation = validateRestoration(articleText, trimmedText);
    if (!lengthValidation.valid) {
      console.log(`⚠️  ${lengthValidation.reason}`);
      console.log('🤖 Trying fallback with gemini-2.5-flash...');
      
      const fallbackResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${RESTORATION_PROMPT}\n\n${articleText}`,
        config: { responseMimeType: "text/plain" }
      });
      const fallbackText = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return fallbackText.trim();
    }

    // Проверка на дубли
    const dupeValidation = validateNoDuplicateLines(trimmedText);
    if (!dupeValidation.valid) {
      console.log(`⚠️  ${dupeValidation.reason}`);
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
    // Читаем файл
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Валидируем структуру
    const validation = validateFrontmatter(fileContent);

    if (!validation.valid) {
      console.log(`⚠️  ${validation.message}`);
      console.log('   (Adding minimal frontmatter)');

      // Если нет frontmatter, создаём минимальный
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
      console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    // Если frontmatter есть, реставрируем только тело
    console.log('🔍 Restoring article body...');
    const restoredBody = await restoreArticle(validation.body);

    // Финальная валидация перед записью
    const bodyValidation = validateRestoration(validation.body, restoredBody);
    if (!bodyValidation.valid) {
      console.log(`❌ FAILED: ${bodyValidation.reason}`);
      console.log('   Article will NOT be saved. Manual review required.');
      return false;
    }

    // Собираем обратно
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
  console.log('║  🔧 Article Restoration - PRESERVE ALL CONTENT   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  // Получаем список файлов из аргументов
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('⚠️  No files specified');
    process.exit(0);
  }

  console.log(`📋 Files to restore: ${files.length}\n`);

  let successCount = 0;
  let failCount = 0;

  // Обрабатываем каждый файл
  for (const file of files) {
    // Пропускаем если это не .md файл в articles/
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

    // Задержка между запросами к API (1 сек)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Итоговый отчёт
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