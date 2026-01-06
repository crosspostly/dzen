#!/usr/bin/env node

/**
 * 🧪 Test restore-articles-safe.js logic
 */

import fs from 'fs';

// Импортируем функции из основного скрипта
const testFile = 'test-article-restore.md';

if (!fs.existsSync(testFile)) {
  console.log('❌ Test file not found');
  process.exit(1);
}

// Тестируем парсинг frontmatter
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

// Тестируем разделение на chunks
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

console.log('🧪 Testing restore-articles-safe.js logic\n');

const content = fs.readFileSync(testFile, 'utf8');
console.log('✅ Read test file');

const { hasFrontmatter, frontmatter, body } = parseFrontmatter(content);
console.log(`✅ Parsed frontmatter: ${hasFrontmatter ? 'YES' : 'NO'}`);
console.log(`   Frontmatter length: ${frontmatter.length}`);
console.log(`   Body length: ${body.length}`);

const chunks3000 = splitIntoChunks(body, 3000);
const chunks2000 = splitIntoChunks(body, 2000);
const chunks1500 = splitIntoChunks(body, 1500);
const chunks1000 = splitIntoChunks(body, 1000);

console.log(`\n✅ Split into chunks:`);
console.log(`   3000 chars: ${chunks3000.length} chunk(s)`);
console.log(`   2000 chars: ${chunks2000.length} chunk(s)`);
console.log(`   1500 chars: ${chunks1500.length} chunk(s)`);
console.log(`   1000 chars: ${chunks1000.length} chunk(s)`);

console.log(`\n✅ Attempt strategy:`);
const attempts = [
  { model: 'gemini-3-flash-preview', chunkSize: 3000, minRatio: 0.85, desc: 'рабочая лошадка' },
  { model: 'gemini-3-flash-preview', chunkSize: 2000, minRatio: 0.85, desc: 'меньше chunks' },
  { model: 'gemini-2.5-pro', chunkSize: 2000, minRatio: 0.80, desc: 'продакшн-флагман' },
  { model: 'gemini-2.5-flash', chunkSize: 1500, minRatio: 0.75, desc: 'быстрая' },
  { model: 'gemini-2.5-flash-lite', chunkSize: 1000, minRatio: 0.70, desc: 'максимальная скорость' },
];

attempts.forEach((att, idx) => {
  const chunks = splitIntoChunks(body, att.chunkSize);
  console.log(`   ${idx + 1}. ${att.model} (${att.chunkSize} chars, min ${(att.minRatio*100)}%): ${chunks.length} chunk(s)`);
});

console.log('\n✅ All logic tests passed!\n');
