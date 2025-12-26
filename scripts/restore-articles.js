#!/usr/bin/env node

/**
 * 🔧 Article Restoration Script
 * Использует Gemini 2.5 Flash Lite для автоматической реставрации статей
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
 * Улучшенный промпт для реставрации с жесткой структуризацией
 */
const RESTORATION_PROMPT = `Ты — главный редактор литературного журнала. Твоя задача: полностью переписать текст, сохранив все сюжетные элементы, но создав идеальную структуру.

ТЕКСТ СЕРЬЕЗНО ПОВРЕЖДЕН. Необходимо:

1. ПОЛНАЯ ПЕРЕРАБОТКА СТРУКТУРЫ:
   - Проанализируй ВЕСЬ текст и выдели единственную, последовательную линию повествования
   - УНИЧТОЖИ все повторы, дубли и пересказы одних и тех же событий
   - Сохрани ТОЛЬКО уникальные детали, без единого повторения

2. СТРУКТУРА ПОВЕСТВОВАНИЯ:
   - Вступление (завязка): что произошло, где и когда
   - Развитие: как персонажи действуют и что открывается
   - Кульминация: главный конфликт или открытие
   - Развязка: последствия и финальное состояние

3. АБЗАЦНАЯ ОРГАНИЗАЦИЯ:
   - Каждый абзац = ОДНА мысль или событие
   - Минимум 3-4 предложения в абзаце
   - Раздели абзацы пустой строкой
   - Логическая связность между абзацами

4. СТИЛЕВАЯ РЕДАКЦИЯ:
   - Удали все разговорные вставки: "ну", "да", "вот", "же", "как бы", "понимаешь"
   - Исправь пунктуацию и орфографию
   - Сделай речь литературной, но живой

5. ОБРАБОТКА ПЕРСОНАЖЕЙ:
   - Главная героиня (вдова, нашла письмо)
   - Андрей (покойный муж)
   - Элен (загадочная женщина из прошлого)
   - Марина (связь с прошлым Андрея)
   - Риэлтор Светлана (второстепенный персонаж)

6. ПРОВЕРКА КАЧЕСТВА:
   - Текст должен быть РАЗНООБРАЗНЫМ (не одинаковые фразы подряд)
   - Короткие и длинные предложения должны чередоваться
   - Должно быть ВИДИМО развитие сюжета

ВАЖНО: ВЫВЕДИ ТОЛЬКО ГОТОВЫЙ ТЕКСТ БЕЗ ВСТУПЛЕНИЙ, КОММЕНТАРИЕВ ИЛИ ОБЪЯСНЕНИЙ!

НАЧНИ СРАЗУ С ТЕКСТА СТАТЬИ.

ВХОДНОЙ ТЕКСТ:`;

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
 * Проверить качество восстановленного текста
 */
function validateRestoration(text) {
  // Проверка 1: Текст не должен быть пустым
  if (!text || text.trim().length < 100) {
    return { valid: false, reason: 'Text too short (< 100 chars)' };
  }

  // Проверка 2: Должны быть абзацы (не одна стена текста)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length < 3) {
    return { valid: false, reason: `Too few paragraphs (${paragraphs.length})` };
  }

  // Проверка 3: Проверка на очевидные повторы
  const lines = text.split('\n').filter(line => line.trim().length > 50);
  if (lines.length >= 2) {
    for (let i = 0; i < lines.length - 1; i++) {
      // Если строка повторяется с толерантностью 80%
      const similarity = calculateSimilarity(lines[i], lines[i + 1]);
      if (similarity > 0.8) {
        return { valid: false, reason: 'Obvious line repetition detected' };
      }
    }
  }

  // Проверка 4: Проверка на повторение целых предложений
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const uniqueSentences = new Set(sentences.map(s => s.trim().substring(0, 50)));
  
  if (sentences.length > 10 && uniqueSentences.size < sentences.length * 0.7) {
    return { valid: false, reason: 'Too many similar sentences (likely repetitions)' };
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

    // Валидация результата
    const validation = validateRestoration(trimmedText);
    if (!validation.valid) {
      console.log(`⚠️  Restoration quality check failed: ${validation.reason}`);
      
      // Попытка с более мощной моделью
      console.log('🤖 Trying fallback with gemini-2.5-flash...');
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
  console.log(`\n📄 Processing: ${filePath}`);

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
    const bodyValidation = validateRestoration(restoredBody);
    if (!bodyValidation.valid) {
      console.log(`❌ Failed final quality check: ${bodyValidation.reason}`);
      console.log('   Article will NOT be saved. Manual review required.');
      return false;
    }

    // Собираем обратно
    const restored = `---\n${validation.frontmatter}\n---\n\n${restoredBody}`;

    fs.writeFileSync(filePath, restored, 'utf8');
    console.log(`✅ Restored: ${path.relative(process.cwd(), filePath)}`);
    return true;

  } catch (error) {
    console.error(`❌ Error restoring ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  🔧 Article Restoration - Gemini 2.5 Flash Lite   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  // Получаем список файлов из аргументов
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('⚠️  No files specified');
    process.exit(0);
  }

  console.log(`📋 Files to restore: ${files.length}`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  // Обрабатываем каждый файл
  for (const file of files) {
    // Пропускаем если это не .md файл в articles/
    if (!file.endsWith('.md') || !file.includes('articles/')) {
      console.log(`⏭️  Skipping: ${file} (not a markdown article)`);
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
  console.log('║  📊 Restoration Summary                           ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Restored: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${files.length}`);
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});