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
 * Разделить текст на chunks по параграфам (SMART + FORCE SPLIT)
 */
function splitIntoChunks(text, maxSize = 2500) {
  // 1. Сначала бьем по двойным переносам (классические абзацы)
  let paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  // 2. Если абзацев мало (или 1), а текст огромный — возможно это "стена текста" или одиночные переносы
  if (paragraphs.length <= 1 && text.length > maxSize) {
    // Попробуем разбить по одиночным переносам
    const bySingle = text.split('\n').filter(p => p.trim().length > 0);
    if (bySingle.length > 1) {
      paragraphs = bySingle;
    }
  }

  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // 🚨 FORCE SPLIT: Если даже один "абзац" больше максимума (стена текста)
    if (para.length > maxSize) {
      // Сначала сбрасываем то, что накопили
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Бьем "стену" на предложения
      // Ищем предложения: любой текст + знак конца (.!?) + пробел или конец строки
      const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g);
      
      if (!sentences) {
        // Если не удалось разбить на предложения (нет знаков препинания?), просто режем жестко
        let remaining = para;
        while (remaining.length > 0) {
          chunks.push(remaining.slice(0, maxSize).trim());
          remaining = remaining.slice(maxSize);
        }
        continue;
      }

      // Собираем предложения в саб-чанки
      let subChunk = '';
      for (const sent of sentences) {
        if (subChunk.length + sent.length > maxSize && subChunk.length > 0) {
          chunks.push(subChunk.trim());
          subChunk = sent;
        } else {
          subChunk += sent;
        }
      }
      
      // Остаток от разбиения "стены" становится началом следующего накопления
      if (subChunk.length > 0) {
        currentChunk = subChunk;
      }
      continue;
    }

    // Классическая логика накопления абзацев
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
 * 🧹 Очистка текста от мусора ИИ (Stage 2, "Вот ваша статья" и т.д.)
 */
function cleanGarbage(text) {
  if (!text) return "";
  
  let cleaned = text;

  // Удаляем блоки кода markdown
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```/gi, '$1');
  }

  const garbagePatterns = [
    /Вот готовая статья, собранная по всем правилам Stage 2, с соблюдением метрик «Живого голоса» и закрытым финалом\.?/gi,
    /Вот полная версия статьи, собранная по всем правилам Stage 2 и интегрированная с метриками Voice Restoration\.?/gi,
    /собранная по всем правилам Stage 2/gi,
    /интегрированная с метриками Voice Restoration/gi,
    /с соблюдением метрик «Живого голоса»/gi,
    /и закрытым финалом/gi,
    /Этап \d+:?.*?\n/gi,
    /Stage \d+:?.*?\n/gi,
    /^(Вот|Конечно|Держите|Certainly|Here is).*?(:|\n)/i,
    /^(Output|Response|Article):?\s*\n?/i,
  ];

  for (const pattern of garbagePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
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

  let frontmatter = match[1];
  // Чистим поле description в frontmatter
  frontmatter = frontmatter.replace(/(description:\s*")([\s\S]*?)(")/i, (m, p1, p2, p3) => {
    return p1 + cleanGarbage(p2) + p3;
  });

  return {
    hasFrontmatter: true,
    frontmatter: `---\n${frontmatter}\n---`,
    body: match[2]
  };
}

/**
 * 🤖 Отреставрировать один chunk
 */
async function restoreChunk(chunkText, model, prompt, timeout = 30000) {
  // Предварительная чистка перед отправкой в ИИ
  const cleanedInput = cleanGarbage(chunkText);
  const fullPrompt = `${prompt}\n\n${cleanedInput}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: { responseMimeType: "text/plain" }
    });
    
    clearTimeout(timeoutId);
    let restoredText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Чистка результата
    return { success: true, text: cleanGarbage(restoredText) };
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
  // ЭКОНОМИЧНЫЙ ПОДХОД: Начинаем с быстрых моделей с малыми чанками
  const attempts = [
    { 
      model: 'gemini-2.5-flash-lite', 
      chunkSize: 3000, 
      minRatio: 0.85, // Строгий контроль длины для лайт модели
      timeout: 25000,
      prompt: RESTORATION_PROMPT_SOFT,
      description: 'Gemini 2.5 Flash-Lite (быстрая, чанки 3000)'
    },
    { 
      model: 'gemini-2.5-flash', 
      chunkSize: 3000, 
      minRatio: 0.85, 
      timeout: 30000,
      prompt: RESTORATION_PROMPT_MEDIUM,
      description: 'Gemini 2.5 Flash (стандарт, чанки 3000)'
    },
    { 
      model: 'gemini-3-flash-preview', 
      chunkSize: 3000, 
      minRatio: 0.80, 
      timeout: 35000,
      prompt: RESTORATION_PROMPT_MEDIUM,
      description: 'Gemini 3 Flash Preview (умная, чанки 3000)'
    },
    { 
      model: 'gemini-2.5-pro', 
      chunkSize: 3000, 
      minRatio: 0.75, 
      timeout: 40000,
      prompt: RESTORATION_PROMPT_STRICT,
      description: 'Gemini 2.5 Pro (мощная, чанки 3000)'
    },
    { 
      model: 'gemini-3-pro-preview', 
      chunkSize: 3000, // Даже про версию бьем на чанки для надежности
      minRatio: 0.70, 
      timeout: 45000,
      prompt: RESTORATION_PROMPT_STRICT,
      description: 'Gemini 3 Pro Preview (флагман, чанки 3000)'
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
 * 🚦 Простой семафор для ограничения конкурентности
 */
async function pMap(array, mapper, concurrency) {
  const results = [];
  const queue = [...array];
  let running = 0;
  
  // Вспомогательная функция для запуска следующей задачи
  const runNext = async () => {
    if (queue.length === 0) return;
    
    const item = queue.shift();
    const idx = array.length - queue.length - 1; // Восстанавливаем индекс
    
    running++;
    try {
      const result = await mapper(item, idx);
      results[idx] = result; // Сохраняем результат в правильном порядке (хотя порядок выполнения не гарантирован)
      // В этой простой реализации порядок в results может сбиться, если просто пушить.
      // Но для отчета нам важен мэппинг к файлам.
      // Упростим: просто вернем результаты, а порядок восстановим или будем считать что он не важен для Promise.all
    } finally {
      running--;
      await runNext();
    }
  };

  // Запускаем начальный пул
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, array.length); i++) {
    workers.push(runNext());
  }
  
  await Promise.all(workers);
  
  // Так как наша простая реализация выше имеет недостатки с возвратом значений,
  // используем более надежный паттерн с итератором, если хотим порядок.
  // Но для простоты заменим это на стандартный чанкинг.
  return results;
}

/**
 * 🚦 Надежный и простой Chunking (последовательные батчи)
 * Это проще и надежнее, чем pLimit без библиотек
 */
async function processInBatches(items, batchSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processFn(item, i + index))
    );
    results.push(...batchResults);
  }
  return results;
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
  console.log(`🚦 Concurrency: 3 files at a time (Safe Mode)`);
  console.log(`📡 Models used (2026):`);
  console.log(`   1. gemini-3-pro-preview (максимальное качество)`);
  console.log(`   2. gemini-3-flash-preview (рабочая лошадка)`);
  console.log(`   3. gemini-2.5-pro (продакшн-флагман)`);
  console.log(`   4. gemini-2.5-flash (быстрая универсальная)`);
  console.log(`   5. gemini-2.5-flash-lite (максимальная скорость)`);
  console.log(`🛡️  Protection: Skips REPORT.md, README.md, images\n`);

  // ✅ БАТЧИНГ: Обрабатываем по 3 файла за раз
  const results = await processInBatches(files, 3, async (file, idx) => {
    console.log(`\n📄 [${idx + 1}/${files.length}] Processing: ${path.basename(file)}`);
    try {
      return await restoreFileWithRetry(file);
    } catch (error) {
      console.log(`  ❌ Fatal error: ${error.message}`);
      return { status: 'FALLBACK', reason: 'fatal_error', note: error.message };
    }
  });

  // Анализ результатов
  printDetailedReport(results, files);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
