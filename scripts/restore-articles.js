#!/usr/bin/env node

/**
 * ✨ Article Restoration Script - DZEN OPTIMIZED
 * Выпускающий редактор для Яндекс Дзена
 * 
 * Логика:
 * 1. Берём ТОЛЬКО ТЕЛО статьи (после ---)
 * 2. Отправляем на Gemini с Дзен-оптимизированным промптом
 * 3. Получаем чистое, отформатированное тело
 * 4. Склеиваем обратно с оригинальной шапкой (metadata)
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
 * 🎯 МОЩНЫЙ ПРОМПТ: ВЫПУСКАЮЩИЙ РЕДАКТОР ЯНДЕКС ДЗЕНА
 * Оптимизирован для мобильных устройств и дочитываемости
 */
const RESTORATION_PROMPT = `Действуй как выпускающий редактор платформы Яндекс Дзен. Твоя задача — подготовить тело статьи к публикации, проведя техническую чистку и верстку для максимальной дочитываемости.

📋 ИНСТРУКЦИИ:

1️⃣ РЕСТАВРАЦИЯ ТЕЛА СТАТЬИ (DE-NOISING & REPAIR):

Удали технический мусор:
✂️ Удали эти слова-паразиты, разрывающие смысл: "ну и", "да вот", "же", "потому что", "хотя", "но вот", "ведь", "ну да", "-то", "вот это", "вот что я хочу сказать", "ну марина", "одним словом", и все подобные вставки.
✂️ Убери двойные пробелы и случайные переводы строк посередине слова.
✂️ Исправь слипшиеся слова (например, "текст.Вот" → "текст. Вот").

Сшей разорванные предложения:
🔗 Если мусорный маркер стоял внутри фразы, соедини её части.
🔗 Исправь регистр: замени заглавную букву на строчную внутри предложения, если она возникла из-за разрыва.
🔗 Убери лишние знаки препинания, возникшие из-за разрыва текста.

2️⃣ ПРИНЦИП 100% VERBATIM - ЗАПРЕЩЕНО:
❌ Сокращать статью
❌ Удалять авторские мысли
❌ Переписывать "своими словами"
❌ Изменять авторский слог
✅ Весь объем и авторский голос должны быть сохранены!

3️⃣ ФОРМАТИРОВАНИЕ ПОД СТАНДАРТЫ ДЗЕНА (мобильный-first):

Диалоги:
💬 Оформляй строго с новой строки через длинное тире (— )
💬 Каждая реплика — новый абзац
💬 Имя говорящего, тире, реплика на новой строке

Абзацы:
📱 Статья должна быть удобной для чтения со смартфона
📱 Разбивай текст на небольшие абзацы (по 3–5 предложений)
📱 Избегай длинных "стен текста"
📱 Каждый абзац = одна мысль или момент
📱 Визуально приятное пространство между абзацами

Пунктуация:
✏️ Проверь и исправь явные ошибки, возникшие при склейке
✏️ Исправь орфографию
✏️ Оставь авторский стиль (разговорный тон, если он был)

4️⃣ ПРОВЕРКА КАЧЕСТВА:
✓ Текст читается как единое целое, а не как набор обрывков
✓ Нет явных технических ошибок
✓ Форматирование готово к вставке в Дзен
✓ Диалоги красиво оформлены
✓ Объем ≈ 100% от исходного

5️⃣ ВЫВОД:
Выведи ТОЛЬКО готовую статью (отреставрированное тело). Никаких приветствий, объяснений и комментариев от нейросети. Результат должен быть сразу готов к вставке в редактор Дзена.

Ловите входной текст:
`;

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
 * 🔍 Проверка: текст не был сокращен более чем на 15%
 */
function validateRestoration(originalText, restoredText) {
  if (!restoredText || restoredText.trim().length < 100) {
    return { valid: false, reason: 'Text too short (< 100 chars)' };
  }

  const originalLength = originalText.trim().length;
  const restoredLength = restoredText.trim().length;
  const ratio = restoredLength / originalLength;

  // 🚨 КРИТИЧНО: текст не должен быть сокращен более чем на 15%
  if (ratio < 0.85) {
    return { 
      valid: false, 
      reason: `❌ SHORTENING DETECTED: ${originalLength} → ${restoredLength} (${(ratio * 100).toFixed(1)}% of original)` 
    };
  }

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
 * Проверка на очевидные технические повторы (баги)
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
 * ✨ Отправить ТЕЛО статьи на Gemini для реставрации
 */
async function restoreArticleBody(bodyText) {
  try {
    const prompt = `${RESTORATION_PROMPT}\n\n${bodyText}`;

    console.log('🤖 Calling Gemini 2.5 Flash Lite (Dzen mode)...');
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    const restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const trimmedText = restoredText.trim();

    // Проверяем что текст не был сокращен
    const lengthValidation = validateRestoration(bodyText, trimmedText);
    if (!lengthValidation.valid) {
      console.log(`⚠️  ${lengthValidation.reason}`);
      console.log('🤖 Trying fallback with gemini-2.5-flash...');
      
      const fallbackResponse = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${RESTORATION_PROMPT}\n\n${bodyText}`,
        config: { responseMimeType: "text/plain" }
      });
      const fallbackText = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return fallbackText.trim();
    }

    // Проверяем на очевидные баги
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
 * 📄 Обработать один файл
 * ЛОГИКА: Шапка → не трогаем, Тело → реставрируем → собираем обратно
 */
async function restoreArticleFile(filePath) {
  console.log(`\n📄 Processing: ${path.basename(filePath)}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const validation = validateFrontmatter(fileContent);

    // Если нет frontmatter, создаём минимальный
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

      // Реставрируем только тело
      const restoredBody = await restoreArticleBody(validation.body);
      const restored = `${minimalFrontmatter}\n\n${restoredBody}`;

      fs.writeFileSync(filePath, restored, 'utf8');
      console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    // Если frontmatter есть: берём только тело, реставрируем его
    console.log('🔍 Restoring article body (keeping metadata block)...');
    const restoredBody = await restoreArticleBody(validation.body);

    // Финальная валидация перед записью
    const bodyValidation = validateRestoration(validation.body, restoredBody);
    if (!bodyValidation.valid) {
      console.log(`❌ FAILED: ${bodyValidation.reason}`);
      console.log('   Article will NOT be saved. Manual review required.');
      return false;
    }

    // 🎯 КРИТИЧЕСКАЯ ЛОГИКА: Собираем обратно
    // Шапка (frontmatter) ПОЛНОСТЬЮ НЕТРОНУТАЯ + новое реставрированное тело
    const restored = `---\n${validation.frontmatter}\n---\n\n${restoredBody}`;

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
  console.log('║  ✨ Article Restoration - YANDEX DZEN OPTIMIZED (Mobile-First Format)       ║');
  console.log('║  Strategy: Preserve Metadata Block | Deep Clean Article Body | Dzen Format   ║');
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

    // Задержка между запросами к API (1 сек)
    await new Promise(resolve => setTimeout(resolve, 1000));
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
