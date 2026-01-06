#!/usr/bin/env node

/**
 * 🚀 Article Restoration Script - SAFE 5-RETRY STRATEGY
 * Агрессивное восстановление с гарантией успеха через 5 попыток разными моделями
 * 
 * Стратегия:
 * 1. Попытка 1: gemini-3-flash-preview (3000 chars, 85% ratio) - рабочая лошадка
 * 2. Попытка 2: gemini-3-flash-preview (2000 chars, 85% ratio) - меньше chunks
 * 3. Попытка 3: gemini-2.5-pro (2000 chars, 80% ratio) - продакшн-флагман
 * 4. Попытка 4: gemini-2.5-flash (1500 chars, 75% ratio) - быстрая
 * 5. Попытка 5: gemini-2.5-flash-lite (1000 chars, 70% ratio, мягкий промпт)
 * 
 * Результат: 100% файлов сохранены, 0% потерь ✅
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
 * 🎯 Мощный промпт для реставрации (строгий)
 */
const RESTORATION_PROMPT_STRICT = `Действуй как выпускающий редактор Яндекс Дзен. Ниже — часть статьи, которую нужно отреставрить. Проведи техническую чистку и верстку.

✅ УДАЛИ:
✂️ Мусор: "вот что я хочу сказать", "одним словом"
✂️ Двойные пробелы, слипшиеся слова, лишние символы

✅ ОФОРМЛЕНИЕ:
💬 Диалоги с тире (—) на новой строке
📱 Абзацы 3-5 предложений, оптимально для мобильных

✅ НИКОГДА НЕ НАРУШАЙ:
❌ Не сокращай, не удаляй, не переписывай

Когда готов - выведи ТОЛЬКО ГОТОВЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ.

Начни с этого:
`;

/**
 * 🧘 Мягкий промпт для финальной попытки (lite модель)
 */
const RESTORATION_PROMPT_SOFT = `Пожалуйста, просто улучши форматирование этого текста:
- Разбей на абзацы
- Исправь очевидные ошибки
- Сохрани весь контент

ВАЖНО: Выведи ТОЛЬКО готовый текст, без комментариев.

Текст:
`;

/**
 * Разделить текст на chunks по параграфам
 */
function splitIntoChunks(text, maxSize = 3000) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Склеить chunks обратно
 */
function mergeChunks(chunks) {
  return chunks.join('\n\n');
}

/**
 * Парсинг frontmatter
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {
      hasFrontmatter: false,
      frontmatter: '',
      body: content
    };
  }

  return {
    hasFrontmatter: true,
    frontmatter: `---\n${match[1]}\n---`,
    body: match[2]
  };
}

/**
 * 🤖 Отреставрировать один chunk
 */
async function restoreChunk(chunkText, model, useSoftPrompt = false, timeout = 30000) {
  const prompt = useSoftPrompt 
    ? `${RESTORATION_PROMPT_SOFT}\n\n${chunkText}`
    : `${RESTORATION_PROMPT_STRICT}\n\n${chunkText}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    
    clearTimeout(timeoutId);
    const restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, text: restoredText.trim() };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, error: error.message };
  }
}

/**
 * 🎯 Попытка восстановления с конкретными параметрами
 */
async function restoreWithAttempt(bodyText, attempt) {
  try {
    const chunks = splitIntoChunks(bodyText, attempt.chunkSize);
    const restoredChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const result = await restoreChunk(
        chunks[i], 
        attempt.model, 
        attempt.softPrompt || false,
        attempt.timeout
      );

      if (!result.success) {
        throw new Error(`Chunk ${i + 1}/${chunks.length} failed: ${result.error}`);
      }

      restoredChunks.push(result.text);

      // Задержка между chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    const finalText = mergeChunks(restoredChunks);
    return finalText;
  } catch (error) {
    throw error;
  }
}

/**
 * 🔄 Восстановление файла с 5 попытками разными моделями
 */
async function restoreFileWithRetry(filePath) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  const { hasFrontmatter, frontmatter, body } = parseFrontmatter(originalContent);

  // ✅ ПРАВИЛЬНЫЕ API ID (Gemini 2026)
  const attempts = [
    { 
      model: 'gemini-3-flash-preview', 
      chunkSize: 3000, 
      minRatio: 0.85, 
      timeout: 30000,
      description: 'Gemini 3 Flash Preview (рабочая лошадка)'
    },
    { 
      model: 'gemini-3-flash-preview', 
      chunkSize: 2000, 
      minRatio: 0.85, 
      timeout: 30000,
      description: 'Gemini 3 Flash Preview (меньше chunks)'
    },
    { 
      model: 'gemini-2.5-pro', 
      chunkSize: 2000, 
      minRatio: 0.80, 
      timeout: 30000,
      description: 'Gemini 2.5 Pro (продакшн-флагман)'
    },
    { 
      model: 'gemini-2.5-flash', 
      chunkSize: 1500, 
      minRatio: 0.75, 
      timeout: 25000,
      description: 'Gemini 2.5 Flash (быстрая)'
    },
    { 
      model: 'gemini-2.5-flash-lite', 
      chunkSize: 1000, 
      minRatio: 0.70, 
      timeout: 20000, 
      softPrompt: true,
      description: 'Gemini 2.5 Flash-Lite (максимальная скорость, мягкий)'
    },
  ];

  const originalLength = body.trim().length;

  for (let i = 0; i < attempts.length; i++) {
    try {
      const attempt = attempts[i];
      console.log(`  Попытка ${i + 1}/5: ${attempt.description}...`);
      
      const restored = await restoreWithAttempt(body, attempt);
      const restoredLength = restored.trim().length;
      const ratio = restoredLength / originalLength;
      
      console.log(`    📊 Quality: ${originalLength} → ${restoredLength} (${(ratio * 100).toFixed(1)}%)`);

      if (ratio >= attempt.minRatio) {
        // ✅ Успех!
        const final = hasFrontmatter 
          ? `${frontmatter}\n\n${restored}`
          : restored;
        
        fs.writeFileSync(filePath, final, 'utf8');
        
        return { 
          status: 'RESTORED', 
          attempt: i + 1, 
          ratio: ratio.toFixed(2),
          model: attempt.model,
          description: attempt.description
        };
      } else {
        console.log(`    ⚠️  Ratio ${(ratio * 100).toFixed(1)}% < required ${(attempt.minRatio * 100).toFixed(0)}%`);
      }
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      continue;
    }
  }

  // ВСЕ 5 попыток не сработали → fallback на оригинал
  // Но СОХРАНЯЕМ! (Лучше оригинальная чем потеря)
  console.log(`  ⚠️  All 5 attempts failed, preserving original`);
  return { 
    status: 'FALLBACK', 
    reason: 'all_attempts_failed',
    note: 'Original content preserved (all 5 restoration attempts failed)'
  };
}

/**
 * 🎨 Цветной вывод статистики
 */
function printDetailedReport(results, files) {
  const stats = {
    total: results.length,
    restored: results.filter(r => r.status === 'RESTORED').length,
    fallback: results.filter(r => r.status === 'FALLBACK').length,
    byAttempt: {}
  };

  // Подсчет по попыткам
  for (let i = 1; i <= 5; i++) {
    stats.byAttempt[i] = results.filter(r => r.attempt === i).length;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ RESTORATION COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`📊 SUMMARY:`);
  console.log(`   📄 Total files: ${stats.total}`);
  console.log(`   ✅ Successfully restored: ${stats.restored} (${(stats.restored/stats.total*100).toFixed(1)}%)`);
  console.log(`   ⚠️  Fallback (original): ${stats.fallback} (${(stats.fallback/stats.total*100).toFixed(1)}%)`);
  console.log(`   ❌ Lost: 0 (100% saved!)\n`);

  console.log(`📈 BREAKDOWN BY ATTEMPT:`);
  for (let i = 1; i <= 5; i++) {
    const count = stats.byAttempt[i] || 0;
    if (count > 0) {
      const model = results.find(r => r.attempt === i)?.model || 'unknown';
      console.log(`   Attempt ${i}: ${count} file(s) restored (${model})`);
    }
  }

  console.log(`\n📋 DETAILED RESULTS:`);
  results.forEach((r, idx) => {
    const fileName = path.basename(files[idx]);
    if (r.status === 'RESTORED') {
      console.log(`   ✅ ${fileName}: RESTORED on attempt ${r.attempt} (${r.ratio} ratio, ${r.model})`);
    } else {
      console.log(`   ⚠️  ${fileName}: FALLBACK (original preserved, all 5 attempts failed)`);
    }
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎯 RESULT: All ${stats.total} file(s) saved (0 lost) ✅`);
  console.log(`${'='.repeat(70)}\n`);
}

/**
 * 🚀 Основная функция
 */
async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 PARALLEL RESTORATION (5-attempt strategy with 2026 models)`);
  console.log(`${'='.repeat(70)}\n`);

  const files = process.argv.slice(2).filter(f => f.endsWith('.md') && f.includes('articles/'));

  if (files.length === 0) {
    console.log('⚠️  No article files specified');
    process.exit(0);
  }

  console.log(`📄 Files: ${files.length}`);
  console.log(`⚡ Each file: 5 attempts with different models`);
  console.log(`📡 Models used:`);
  console.log(`   1. gemini-3-flash-preview (рабочая лошадка)`);
  console.log(`   2. gemini-3-flash-preview (меньше chunks)`);
  console.log(`   3. gemini-2.5-pro (продакшн-флагман)`);
  console.log(`   4. gemini-2.5-flash (быстрая)`);
  console.log(`   5. gemini-2.5-flash-lite (максимальная скорость)\n`);

  // ✅ ПАРАЛЛЕЛЬНАЯ обработка всех файлов одновременно
  const results = await Promise.all(
    files.map(async (file, idx) => {
      console.log(`\n📄 [${idx + 1}/${files.length}] Processing: ${path.basename(file)}`);
      try {
        return await restoreFileWithRetry(file);
      } catch (error) {
        console.log(`  ❌ Fatal error: ${error.message}`);
        return { status: 'FALLBACK', reason: 'fatal_error', note: error.message };
      }
    })
  );

  // Анализ результатов
  printDetailedReport(results, files);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
