// Test the validation logic
import { readFileSync } from 'fs';

// Read the original messy article
const content = readFileSync('articles/women-35-60/2025-12-26/mne-do-sih-por-stydno-za-ego-taynu-ya-nashla-to-pi.md', 'utf8');
const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const match = content.match(frontmatterRegex);
const body = match ? match[2] : content;

// Current state - should fail validation
console.log('Original article body:');
console.log('Length:', body.length);
console.log('Paragraphs (double line breaks):', body.split('\n\n').filter(p => p.trim().length > 0).length);

// Check for repetitions
const sentences = body.match(/[^.!?]+[.!?]+/g) || [];
console.log('Sentences:', sentences.length);

// Count unique sentence starts
const uniqueStarts = new Set(sentences.map(s => s.trim().substring(0, 50)));
console.log('Unique sentence starts:', uniqueStarts.size);
console.log('Ratio:', uniqueStarts.size / sentences.length);

// Show some examples of repetition
console.log('\n--- Sentence start examples ---');
sentences.slice(0, 10).forEach((s, i) => {
  console.log(`${i}: ${s.trim().substring(0, 60)}...`);
});