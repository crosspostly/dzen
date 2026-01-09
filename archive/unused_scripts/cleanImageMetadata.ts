#!/usr/bin/env npx tsx

import { MetadataCleanerService } from '../services/metadataCleanerService';
import path from 'path';

/**
 * 🧹 CLI Script: Clean Image Metadata
 * 
 * Использование:
 *   npx tsx scripts/cleanImageMetadata.ts articles/channel-1/2025-12-18
 *   npx tsx scripts/cleanImageMetadata.ts articles/channel-1/2025-12-18/статья.jpg
 */

async function main() {
  const targetPath = process.argv[2];

  if (!targetPath) {
    console.log(`
🧹 Image Metadata Cleaner

Usage:
  npx tsx scripts/cleanImageMetadata.ts <path>

Examples:
  # Clean all JPG in directory:
  npx tsx scripts/cleanImageMetadata.ts articles/channel-1/2025-12-18

  # Clean specific file:
  npx tsx scripts/cleanImageMetadata.ts articles/channel-1/2025-12-18/статья.jpg
    `);
    process.exit(0);
  }

  const cleaner = new MetadataCleanerService();

  try {
    if (targetPath.endsWith('.jpg') || targetPath.endsWith('.jpeg')) {
      // Очистить конкретный файл
      await cleaner.cleanFile(targetPath, false);
    } else {
      // Очистить директорию
      await cleaner.cleanDirectory(targetPath, false);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main();