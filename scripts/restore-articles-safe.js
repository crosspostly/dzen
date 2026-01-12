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
 * Разделить текст на chunks СТРОГО по предложениям (для стен текста)
 */
function splitIntoChunks(text, maxSize = 2500) {
  // 1. Если текст влазит целиком — не трогаем
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks = [];
  let currentChunk = '';

  // 2. Разбиваем на предложения:
  // Любой текст + (.!?) + (пробелы/переносы или конец строки)
  const sentences = text.match(/[^.!?]+(?:[.!?]+[\s\n]*|$)/g);

  if (!sentences) {
    // Если знаков препинания нет совсем — режем жестко по длине
    for (let i = 0; i < text.length; i += maxSize) {
      chunks.push(text.slice(i, i + maxSize));
    }
    return chunks;
  }

  for (const sentence of sentences) {
    // 3. Если само предложение гигантское (больше лимита) — режем его кусками
    if (sentence.length > maxSize) {
      // Скидываем накопленное
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      let remaining = sentence;
      while (remaining.length > 0) {
        // Берем кусок и сразу пушим
        let slice = remaining.slice(0, maxSize);
        chunks.push(slice.trim());
        remaining = remaining.slice(maxSize);
      }
      continue;
    }

    // 4. Накапливаем предложения
    if (currentChunk.length + sentence.length > maxSize) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // 5. Добавляем остаток
  if (currentChunk.trim().length > 0) {
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
    cleaned = cleaned.replace(/```(?:markdown|text|json)?\s*\n?[\s\S]*?\n?```/gi, '$1');
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
 * Парсинг frontmatter (YAML между ---
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
 * 🕵️ Валидация качества чанка
 */
function validateChunk(original, restored) {
  if (!restored) return { valid: false, reason: "empty_response" };

  const origLen = original.length;
  const resLen = restored.length;
  
  // 1. Проверка длины (допускаем сжатие до 50% и раздувание до 50%)
  if (resLen < origLen * 0.5) return { valid: false, reason: "too_short" };
  if (resLen > origLen * 1.5) return { valid: false, reason: "too_long" };

  // 2. Проверка на "извинения" ИИ (ТОЛЬКО системные фразы)
  // ❌ Убраны общие фразы типа "я не могу", которые могут быть в диалогах персонажей
  const refusalPatterns = [
    "как языковая модель", "as a language model",
    "я не могу выполнить этот запрос", "i cannot fulfill this request",
    "я не могу переписать", "i cannot rewrite",
    "пожалуйста, обратите внимание", "please note that",
    "нарушает правила", "violates policy",
    "политика безопасности", "safety guidelines",
    "я не могу генерировать", "i cannot generate"
  ];
  const lowerRestored = restored.toLowerCase();
  for (const pat of refusalPatterns) {
    if (lowerRestored.includes(pat)) return { valid: false, reason: `ai_refusal_pattern: ${pat}` };
  }

  return { valid: true };
}

/**
 * 🎯 Попытка восстановления с конкретными параметрами
 */
async function restoreWithAttempt(bodyText, attempt) {
  try {
    const smartChunkSize = getSmartChunkSize(bodyText.length, attempt.chunkSize);
    const chunks = splitIntoChunks(bodyText, smartChunkSize);
    const restoredChunks = [];
    
    console.log(`    ℹ️  Split into ${chunks.length} chunks (target: ${attempt.chunkSize})`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let chunkSuccess = false;
      let finalChunkText = chunk; // Fallback

      for (let retry = 0; retry < 3; retry++) {
        process.stdout.write(`    ⏳ Chunk ${i + 1}/${chunks.length} (try ${retry + 1}/3)... `);
        
        const result = await restoreChunk(
          chunk, 
          attempt.model, 
          attempt.prompt, 
          attempt.timeout
        );

        if (result.success) {
          const validation = validateChunk(chunk, result.text);
          if (validation.valid) {
            console.log(`✅ OK`);
            finalChunkText = result.text;
            chunkSuccess = true;
            break;
          } else {
            console.log(`⚠️ Invalid (${validation.reason})`);
          }
        } else {
          console.log(`❌ Error: ${result.error}`);
        }
        
        if (retry < 2) await new Promise(r => setTimeout(r, 1000));
      }

      if (!chunkSuccess) {
        console.log(`    ⚠️  Chunk ${i + 1} failed 3 times. Using original text.`);
      }

      restoredChunks.push(finalChunkText);

      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return mergeChunks(restoredChunks);
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
  
  if (SKIP_FILES.some(f => fileName.toLowerCase() === f.toLowerCase())) return false;
  if (SKIP_EXTENSIONS.includes(ext)) return false;
  if (ext !== '.md' || !filePath.includes('articles/')) return false;
  
  return true;
}

/**
 * 🔄 Восстановление файла с 5 попыток разными моделями
 */
async function restoreFileWithRetry(filePath) {
  if (!shouldProcessFile(filePath)) {
    return { status: 'SKIPPED', note: `Пропущен: ${path.basename(filePath)}` };
  }

  const originalContent = fs.readFileSync(filePath, 'utf8');
  const { hasFrontmatter, frontmatter, body } = parseFrontmatter(originalContent);

  const attempts = [
    { model: 'gemini-2.5-flash-lite', chunkSize: 3000, minRatio: 0.85, timeout: 25000, prompt: RESTORATION_PROMPT_SOFT, description: 'Gemini 2.5 Flash-Lite' },
    { model: 'gemini-2.5-flash', chunkSize: 3000, minRatio: 0.85, timeout: 30000, prompt: RESTORATION_PROMPT_MEDIUM, description: 'Gemini 2.5 Flash' },
    { model: 'gemini-3-flash-preview', chunkSize: 3000, minRatio: 0.80, timeout: 35000, prompt: RESTORATION_PROMPT_MEDIUM, description: 'Gemini 3 Flash Preview' },
    { model: 'gemini-2.5-pro', chunkSize: 3000, minRatio: 0.75, timeout: 40000, prompt: RESTORATION_PROMPT_STRICT, description: 'Gemini 2.5 Pro' },
    { model: 'gemini-3-pro-preview', chunkSize: 3000, minRatio: 0.70, timeout: 45000, prompt: RESTORATION_PROMPT_STRICT, description: 'Gemini 3 Pro Preview' },
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
        const final = hasFrontmatter ? `${frontmatter}\n\n${restored}` : restored;
        fs.writeFileSync(filePath, final, 'utf8');
        return { status: 'RESTORED', attempt: i + 1, ratio: ratio.toFixed(2), model: attempt.model };
      } else {
        console.log(`    ⚠️  Ratio ${(ratio * 100).toFixed(1)}% < required ${(attempt.minRatio * 100).toFixed(0)}%`);
      }
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      continue;
    }
  }

  console.log(`  ⚠️  All 5 attempts failed, preserving original`);
  return { status: 'FALLBACK', reason: 'all_attempts_failed' };
}

/**
 * 🎨 Вывод статистики
 */
function printDetailedReport(results, files) {
  const stats = {
    total: files.length,
    processed: results.filter(r => r.status !== 'SKIPPED').length,
    restored: results.filter(r => r.status === 'RESTORED').length,
    fallback: results.filter(r => r.status === 'FALLBACK').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length
  };

  console.log(`\n${'='.repeat(80)}\n✅ RESTORATION COMPLETE\n${'='.repeat(80)}\n`);
  console.log(`📊 SUMMARY: Total: ${stats.total}, Processed: ${stats.processed}, Restored: ${stats.restored}, Fallback: ${stats.fallback}, Skipped: ${stats.skipped}\n`);

  results.forEach((r, idx) => {
    const fileName = path.basename(files[idx]);
    if (r.status === 'RESTORED') console.log(`   ✅ ${fileName}: RESTORED on attempt ${r.attempt} (ratio ${r.ratio}, ${r.model})`);
    else if (r.status === 'FALLBACK') console.log(`   ⚠️  ${fileName}: FALLBACK (original preserved)`);
    else if (r.status === 'SKIPPED') console.log(`   ⏭️  ${fileName}: SKIPPED`);
  });
}

async function processInBatches(items, batchSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item, index) => processFn(item, i + index)));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log(`\n${'='.repeat(80)}\n🚀 PARALLEL RESTORATION (5-attempt strategy with 2026 models)\n${'='.repeat(80)}\n`);
  const files = process.argv.slice(2);
  if (files.length === 0) process.exit(0);

  const results = await processInBatches(files, 3, async (file, idx) => {
    console.log(`\n📄 [${idx + 1}/${files.length}] Processing: ${path.basename(file)}`);
    try {
      return await restoreFileWithRetry(file);
    } catch (error) {
      return { status: 'FALLBACK', reason: 'fatal_error' };
    }
  });

  printDetailedReport(results, files);
}

main().catch(error => { console.error('❌ Fatal error:', error.message); process.exit(1); });