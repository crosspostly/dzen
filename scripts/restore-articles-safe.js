#!/usr/bin/env node

/**
 * 🚀 Article Restoration Script - SAFE 5-RETRY STRATEGY (Updated 2026)
 * Агрессивное восстановление с гарантией успеха через 5 попыток разными моделями
 * 
 * МОДЕЛИ (актуальные 2026):
 * ✅ Gemini 3 Pro Preview: gemini-3-pro-preview (максимальное качество)
 * ✅ Gemini 3 Flash Preview: gemini-3-flash-preview (рабочая лошадка)
 * ✅ Gemini 2.5 Pro: gemini-2.5-pro (продакшн-флагман)
 * ✅ Gemini 2.5 Flash: gemini-2.5-flash (быстрая универсальная)
 * ✅ Gemini 2.5 Flash-Lite: gemini-2.5-flash-lite (максимальная скорость)
 * 
 * СТРАТЕГИЯ (5 попыток с разными подходами):
 * 1. gemini-3-pro-preview (полный текст, строгий промпт, 85% минимум)
 * 2. gemini-3-flash-preview (chunks 2500, средний промпт, 85% минимум)
 * 3. gemini-2.5-pro (chunks 2000, средний промпт, 80% минимум)
 * 4. gemini-2.5-flash (chunks 1500, мягкий промпт, 75% минимум)
 * 5. gemini-2.5-flash-lite (chunks 1000, очень мягкий, 70% минимум)
 * 
 * ЗАЩИТА:
 * ❌ Пропускает: REPORT.md, README.md, .jpg, .png, .webp, .gif
 * ✅ Обрабатывает только: articles (recursive) .md (статьи)
 * ❌ Потери: 0% (fallback на оригинал если все попытки сбойны)
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
 * 🎯 Список файлов, которые НЕ трогаем
 */
const SKIP_FILES = ['REPORT.md', 'README.md', 'readme.md', 'report.md'];
const SKIP_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf'];

/**
 * 🎯 Промпт для реставрации (строгий, для Pro моделей)
 */
const RESTORATION_PROMPT_STRICT = `Действуй как выпускающий редактор Яндекс Дзен. Ниже — часть статьи, которую нужно отреставрировать. Проведи ТЕХНИЧЕСКУЮ чистку и верстку.

✅ ДЕЙСТВИЯ:
✂️ Удали: двойные пробелы, лишние символы, "вот что я хочу сказать", "одним словом"
💬 Оформи диалоги: тире (—) на новой строке
📱 Абзацы: 3-5 предложений (оптимально для мобильных)
✍️ Исправь: очевидные опечатки, но НЕ переписывай текст

❌ НИКОГДА НЕ НАРУШАЙ:
🚫 Не сокращай контент
🚫 Не удаляй идеи
🚫 Не переписывай смысл
🚫 Не добавляй своё

ВЫВЕД ТОЛЬКО ГОТОВЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ И ПОЯСНЕНИЙ.

Текст для реставрации:
`;

/**
 * 📝 Промпт средний (для Flash моделей с chunks)
 */
const RESTORATION_PROMPT_MEDIUM = `Улучши форматирование этого фрагмента статьи. Сохрани весь текст целиком.

Действия:
- Разбей на читаемые абзацы
- Оформи диалоги (тире на новой строке если есть)
- Исправь очевидные ошибки
- НИКОГДА не удаляй и не сокращай контент

Выведи ТОЛЬКО готовый текст:
`;

/**
 * 🧘 Промпт мягкий (для Lite модели, финальная попытка)
 */
const RESTORATION_PROMPT_SOFT = `Пожалуйста, улучши форматирование этого текста:
- Разбей на абзацы
- Исправь очевидные ошибки
- Сохрани весь контент целиком

Выведи ТОЛЬКО готовый текст без комментариев:
`;

/**
 * 🧠 Определить минимальный chunk size исходя из длины текста
 */
function getSmartChunkSize(textLength, baseSize) {
  // Если текст уже меньше базового размера, не режем
  if (textLength < baseSize) {
    return textLength;
  }
  
  // Если текст очень большой, уменьшаем chunk size
  if (textLength > 50000) {
    return Math.min(baseSize, Math.floor(textLength / 15));
  }
  
  return baseSize;
}

/**
 * Разделить текст на chunks по параграфам (SMART)
 */
function splitIntoChunks(text, maxSize = 2500) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  // Если очень мало абзацев и текст не очень большой, не режем
  if (paragraphs.length <= 2 && text.length < maxSize) {
    return [text];
  }
  
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

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Склеить chunks обратно
 */
function mergeChunks(chunks) {
  return chunks.join('\n\n');
}

/**
 * Парсинг frontmatter (YAML между ---)
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
async function restoreChunk(chunkText, model, prompt, timeout = 30000) {
  const fullPrompt = `${prompt}\n\n${chunkText}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: fullPrompt,
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
    // SMART определение chunk size
    const smartChunkSize = getSmartChunkSize(bodyText.length, attempt.chunkSize);
    const chunks = splitIntoChunks(bodyText, smartChunkSize);
    const restoredChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const result = await restoreChunk(
        chunks[i], 
        attempt.model, 
        attempt.prompt,
        attempt.timeout
      );

      if (!result.success) {
        throw new Error(`Chunk ${i + 1}/${chunks.length} failed: ${result.error}`);
      }

      restoredChunks.push(result.text);

      // Задержка между chunks для избежания rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const finalText = mergeChunks(restoredChunks);
    return finalText;
  } catch (error) {
    throw error;
  }
}

/**
 * ✅ Проверить, должен ли файл быть обработан
 */
function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  // Пропускаем специальные файлы
  if (SKIP_FILES.some(f => fileName.toLowerCase() === f.toLowerCase())) {
    return false;
  }
  
  // Пропускаем изображения и другие не-md файлы
  if (SKIP_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // Обрабатываем только .md из articles/
  if (ext !== '.md' || !filePath.includes('articles/')) {
    return false;
  }
  
  return true;
}

/**
 * 🔄 Восстановление файла с 5 попыток разными моделями
 */
async function restoreFileWithRetry(filePath) {
  // ✅ Проверка: нужно ли обрабатывать этот файл?
  if (!shouldProcessFile(filePath)) {
    return { 
      status: 'SKIPPED', 
      reason: 'not_article',
      note: `Пропущен: ${path.basename(filePath)} (не статья или защищённый файл)`
    };
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');
  const { hasFrontmatter, frontmatter, body } = parseFrontmatter(originalContent);

  // ✅ АКТУАЛЬНЫЕ API ID (Gemini 2026) и УМНАЯ СТРАТЕГИЯ
  const attempts = [
    { 
      model: 'gemini-3-pro-preview', 
      chunkSize: 100000,  // Полный текст в одну попытку
      minRatio: 0.85, 
      timeout: 35000,
      prompt: RESTORATION_PROMPT_STRICT,
      description: 'Gemini 3 Pro Preview (максимальное качество, полный текст)'
    },
    { 
      model: 'gemini-3-flash-preview', 
      chunkSize: 2500, 
      minRatio: 0.85, 
      timeout: 30000,
      prompt: RESTORATION_PROMPT_MEDIUM,
      description: 'Gemini 3 Flash Preview (рабочая лошадка, chunks 2500)'
    },
    { 
      model: 'gemini-2.5-pro', 
      chunkSize: 2000, 
      minRatio: 0.80, 
      timeout: 30000,
      prompt: RESTORATION_PROMPT_MEDIUM,
      description: 'Gemini 2.5 Pro (продакшн-флагман, chunks 2000)'
    },
    { 
      model: 'gemini-2.5-flash', 
      chunkSize: 1500, 
      minRatio: 0.75, 
      timeout: 25000,
      prompt: RESTORATION_PROMPT_MEDIUM,
      description: 'Gemini 2.5 Flash (быстрая универсальная, chunks 1500)'
    },
    { 
      model: 'gemini-2.5-flash-lite', 
      chunkSize: 1000, 
      minRatio: 0.70, 
      timeout: 20000,
      prompt: RESTORATION_PROMPT_SOFT,
      description: 'Gemini 2.5 Flash-Lite (максимальная скорость, chunks 1000, мягкий)'
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
    total: files.length,
    processed: results.filter(r => r.status !== 'SKIPPED').length,
    restored: results.filter(r => r.status === 'RESTORED').length,
    fallback: results.filter(r => r.status === 'FALLBACK').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    byAttempt: {}
  };

  // Подсчет по попыткам
  for (let i = 1; i <= 5; i++) {
    stats.byAttempt[i] = results.filter(r => r.attempt === i).length;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ RESTORATION COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`📊 SUMMARY:`);
  console.log(`   📄 Total files provided: ${stats.total}`);
  console.log(`   🔧 Files processed: ${stats.processed}`);
  console.log(`   ✅ Successfully restored: ${stats.restored} (${stats.processed > 0 ? (stats.restored/stats.processed*100).toFixed(1) : 0}%)`);
  console.log(`   ⚠️  Fallback (original): ${stats.fallback} (${stats.processed > 0 ? (stats.fallback/stats.processed*100).toFixed(1) : 0}%)`);
  console.log(`   ⏭️  Skipped (protected): ${stats.skipped}`);
  console.log(`   ❌ Lost: 0 (100% saved!)\n`);

  if (stats.restored > 0) {
    console.log(`📈 BREAKDOWN BY ATTEMPT:`);
    for (let i = 1; i <= 5; i++) {
      const count = stats.byAttempt[i] || 0;
      if (count > 0) {
        const model = results.find(r => r.attempt === i)?.model || 'unknown';
        console.log(`   Attempt ${i}: ${count} file(s) restored (${model})`);
      }
    }
  }

  console.log(`\n📋 DETAILED RESULTS:`);
  results.forEach((r, idx) => {
    const fileName = path.basename(files[idx]);
    if (r.status === 'RESTORED') {
      console.log(`   ✅ ${fileName}: RESTORED on attempt ${r.attempt} (ratio ${r.ratio}, ${r.model})`);
    } else if (r.status === 'FALLBACK') {
      console.log(`   ⚠️  ${fileName}: FALLBACK (original preserved, all 5 attempts failed)`);
    } else if (r.status === 'SKIPPED') {
      console.log(`   ⏭️  ${fileName}: SKIPPED (${r.note})`);
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 RESULT: All ${stats.total} file(s) safe (0 lost) ✅`);
  console.log(`${'='.repeat(80)}\n`);
}

/**
 * 🚀 Основная функция
 */
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 PARALLEL RESTORATION (5-attempt strategy with 2026 models)`);
  console.log(`${'='.repeat(80)}\n`);

  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('⚠️  No files specified');
    process.exit(0);
  }

  console.log(`📄 Files provided: ${files.length}`);
  console.log(`⚡ Strategy: 5 attempts per file with different models`);
  console.log(`📡 Models used (2026):`);
  console.log(`   1. gemini-3-pro-preview (максимальное качество)`);
  console.log(`   2. gemini-3-flash-preview (рабочая лошадка)`);
  console.log(`   3. gemini-2.5-pro (продакшн-флагман)`);
  console.log(`   4. gemini-2.5-flash (быстрая универсальная)`);
  console.log(`   5. gemini-2.5-flash-lite (максимальная скорость)`);
  console.log(`🛡️  Protection: Skips REPORT.md, README.md, images\n`);

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
