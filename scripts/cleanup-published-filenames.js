#!/usr/bin/env node

/**
 * 🧹 Cleanup Script for Published Articles
 * Removes timestamp suffixes from filenames in articles/published/
 * 
 * Example:
 *   Before: ya-nenavizhu-ego-1766318654134.md → After: ya-nenavizhu-ego.md
 *   Before: ya-nenavizhu-ego-1766318654134.jpg → After: ya-nenavizhu-ego.jpg
 * 
 * Usage:
 *   node scripts/cleanup-published-filenames.js
 */

import fs from 'fs';
import path from 'path';

const PUBLISHED_DIR = './articles/published';
const TIMESTAMP_PATTERN = /-\d{10,13}(?=\.)\./; // Matches -1766318654134. before extension

function cleanupFilenames() {
  console.log(`
${'='.repeat(60)}`);
  console.log(`🧹 Cleanup Published Filenames`);
  console.log(`${'='.repeat(60)}\n`);

  if (!fs.existsSync(PUBLISHED_DIR)) {
    console.error(`❌ Directory not found: ${PUBLISHED_DIR}`);
    process.exit(1);
  }

  let totalFiles = 0;
  let renamedFiles = 0;
  let errors = 0;

  function traverse(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.match(TIMESTAMP_PATTERN)) {
        // File has timestamp suffix
        totalFiles++;

        // Generate new filename without timestamp
        const ext = path.extname(item);
        const basename = path.basename(item, ext);
        const cleanedBasename = basename.replace(/-\d{10,13}$/, ''); // Remove timestamp
        const newFilename = `${cleanedBasename}${ext}`;
        const newFullPath = path.join(dir, newFilename);

        try {
          fs.renameSync(fullPath, newFullPath);
          console.log(`✅ ${item} → ${newFilename}`);
          renamedFiles++;
        } catch (error) {
          console.error(`❌ Error renaming ${item}: ${error.message}`);
          errors++;
        }
      } else {
        totalFiles++;
      }
    }
  }

  traverse(PUBLISHED_DIR);

  console.log(`
${'='.repeat(60)}`);
  console.log(`📊 Cleanup Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Renamed: ${renamedFiles}`);
  console.log(`⚠️  Skipped (no timestamp): ${totalFiles - renamedFiles}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`${'='.repeat(60)}\n`);

  if (errors === 0) {
    console.log(`🎉 Cleanup successful!\n`);
  } else {
    console.error(`⚠️  Some files had errors during renaming.\n`);
    process.exit(1);
  }
}

cleanupFilenames();
