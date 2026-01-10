#!/usr/bin/env node

/**
 * 🧹 Simple Garbage Cleanup Script
 * Removes AI meta-commentary without calling any APIs.
 */

import fs from 'fs';
import path from 'path';

const SKIP_FILES = ['REPORT.md', 'README.md', 'readme.md', 'report.md'];
const SKIP_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf'];

function cleanGarbage(text) {
  if (!text) return "";
  
  let cleaned = text;

  // Remove markdown code blocks if they wrap everything
  if (cleaned.trim().startsWith('```') && cleaned.trim().endsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?```$/gi, '$1');
  }

  const garbagePatterns = [
    /Вот готовая статья, собранная по всем правилам Stage 2, с соблюдением метрик «Живого голоса» и закрытым финалом\.?/gi,
    /Вот полная версия статьи, собранная по всем правилам Stage 2 и интегрированная с метриками Voice Restoration\.?/gi,
    /собранная по всем правилам Stage 2/gi,
    /интегрированная с метриками Voice Restoration/gi,
    /с соблюдением метрик «Живого голоса»/gi,
    /и закрытым финалом/gi,
    /Этап \d+:?.\*?\n/gi,
    /Stage \d+:?.\*?\n/gi,
    /^(Вот|Конечно|Держите|Certainly|Here is).*?(:|\n)/im,
    /^(Output|Response|Article):?\s*\n?/im,
    /---[\s\S]*?---/ // We'll handle frontmatter separately
  ];

  // We want to keep the frontmatter, so let's be careful.
  // Actually, let's just use the logic from the other script but without LLM.
  return cleaned;
}

function processContent(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  let frontmatter = '';
  let body = '';

  if (match) {
    frontmatter = match[1];
    body = match[2];

    // Clean description in frontmatter
    frontmatter = frontmatter.replace(/(description:\s*")([\s\S]*?)(")/i, (m, p1, p2, p3) => {
      return p1 + manualClean(p2) + p3;
    });
    frontmatter = `---\n${frontmatter}\n---`;
  } else {
    body = content;
  }

  body = manualClean(body);

  return (frontmatter ? frontmatter + '\n\n' : '') + body;
}

function manualClean(text) {
  if (!text) return "";
  let cleaned = text;

  const metaPatterns = [
    /Вот (готовая|полная) (версия )?статья,? собранная по правилам STAGE \d+.*?Voice Restoration\.?/gi,
    /Вот готовая статья, собранная по всем правилам Stage \d+, с соблюдением метрик «Живого голоса» и закрытым финалом\.?/gi,
    /Вот полная версия статьи, собранная по всем правилам Stage \d+ и интегрированная с метриками Voice Restoration\.?/gi,
    /собранная по всем правилам Stage \d+/gi,
    /интегрированная с метриками Voice Restoration/gi,
    /с соблюдением метрик «Живого голоса»/gi,
    /и закрытым финалом/gi,
    /^Вот (полная версия статьи|готовая статья).*?\n/gi,
    /^(Stage|Этап) \d+.*?\n/gi,
    /собранная по правилам STAGE \d+ с учетом всех метрик Voice Restoration\.?/gi
  ];

  for (const p of metaPatterns) {
    cleaned = cleaned.replace(p, '');
  }

  // 🧹 Удаление паразитов (улучшенная логика)
  const parasiteWords = [
    'ну и', 'да вот', 'вот только', 'же', 'ведь', 'да что', 'вот это', 
    'и то', 'но вот', 'но ну', 'хотя', 'и и', 'но но', 'да да', 'ну ну'
  ];
  
  // 1. Удаляем паразитов после знаков препинания: "слово.же", "слово, ведь"
  for (const word of parasiteWords) {
    const regex = new RegExp(`([,.!?;])\\s*${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '$1');
  }

  // 2. Удаляем паразитов в середине предложения: "я же пошла" -> "я пошла" 
  // (Опасно, но в данном контексте оправдано для "ну и", "да вот" и т.д.)
  const midParasites = ['ну и', 'da вот', 'вот только', 'да что', 'вот это'];
  for (const word of midParasites) {
    const regex = new RegExp(`\\s+${word}\\s+`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }

  const complexParasites = [
    { pattern: /—\s*может быть[^,]*?,\s*но[^—]*?—/g, replace: '' },
    { pattern: /—\s*одним словом[^—]*?—/g, replace: '' },
    { pattern: /—\s*не знаю почему[^—]*?—/g, replace: '' },
    { pattern: /—\s*вот в чём дело[^—]*?—/g, replace: '' },
    { pattern: /—\s*вот что я хочу сказать[^—]*?—/g, replace: '' },
    { pattern: /—\s*вот что я хочу сказать\.\.\./g, replace: '' },
    { pattern: /—\s*не знаю почему,\s*но\.\.\./g, replace: '' },
    { pattern: /—\s*не знаю почему/gi, replace: '' }
  ];

  for (const { pattern, replace } of complexParasites) {
    cleaned = cleaned.replace(pattern, replace);
  }

  // 🔧 Исправление пунктуации
  cleaned = cleaned.replace(/\.+\s*[-–]\s*(\w)/g, '. $1');
  cleaned = cleaned.replace(/,\s*([А-ЯЁ])/g, '. $1');
  
  // Чистим двойные точки и прочие артефакты
  cleaned = cleaned.replace(/\.{2,}/g, '...'); 
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned.trim();
}

async function main() {
  const files = process.argv.slice(2);
  let cleanedCount = 0;

  for (const file of files) {
    const fileName = path.basename(file);
    const ext = path.extname(file).toLowerCase();

    if (SKIP_FILES.some(f => fileName.toLowerCase() === f.toLowerCase()) || SKIP_EXTENSIONS.includes(ext)) {
      continue;
    }

    if (!fs.existsSync(file)) continue;

    const original = fs.readFileSync(file, 'utf8');
    const cleaned = processContent(original);

    if (original !== cleaned) {
      fs.writeFileSync(file, cleaned, 'utf8');
      console.log(`✅ Cleaned: ${file}`);
      cleanedCount++;
    }
  }

  console.log(`\n🎉 Done! Cleaned ${cleanedCount} files.`);
}

main();
