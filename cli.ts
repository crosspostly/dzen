#!/usr/bin/env node

/**
 * Dzen Content Generator CLI
 * Локальный CLI для генерации статей
 */

import { configService } from './services/configService';
import { examplesService } from './services/examplesService';
import { geminiService } from './services/geminiService';
import { uniquenessService } from './services/uniquenessService';
import { Phase2AntiDetectionService } from './services/phase2AntiDetectionService';
import { MultiAgentService } from './services/multiAgentService';
import { ThemeGeneratorService } from './services/themeGeneratorService';
import { ArticleExporter } from './services/articleExporter';
import { getDzenChannelConfig, getAllDzenChannels, getRandomThemeForChannel, validateDzenChannelsConfig } from './config/dzen-channels.config';
import fs from 'fs';
import path from 'path';

// Красивые эмоджи и звуки
const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  LOADING: '📁',
  ROCKET: '🚀',
  BRAIN: '🧠',
  HOOK: '🎪',
  UP: '⬆️',
  BOOM: '💥',
  CLAP: '🎟',
  TIMER: '⏱️',
  SAVE: '💾',
  CHART: '📊',
  SEARCH: '🔍',
};

const args = process.argv.slice(2);

// Handle commands that might be in any position
const allArgs = process.argv.slice(2);

// Find command - can be first or after flags
// DEFAULT: 'both' mode (v7.1+)
const command = allArgs.find(arg => !arg.startsWith('--')) || 'both';

function getArg(name: string, defaultValue?: string): string | undefined {
  const match = allArgs.find(a => a.startsWith(`--${name}=`));
  return match?.split('=')[1] || defaultValue;
}

function getFlag(name: string): boolean {
  return allArgs.includes(`--${name}`);
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get theme with priority hierarchy:
 * 1. --theme CLI argument (highest priority)
 * 2. Random from config.required_triggers (mid priority)  
 * 3. Hardcoded default (lowest priority)
 */
function getThemeWithPriority(projectId: string, cliTheme?: string): string {
  // Priority 1: CLI theme (highest priority)
  if (cliTheme && cliTheme.trim()) {
    console.log(`${LOG.INFO} Theme from CLI (highest priority): "${cliTheme}"`);
    return cliTheme.trim();
  }
  
  // Priority 2: Random from config required_triggers
  try {
    const config = configService.loadConfig(projectId);
    const triggers = config.content_rules?.required_triggers;
    
    if (triggers && triggers.length > 0) {
      const randomIndex = Math.floor(Math.random() * triggers.length);
      const selectedTheme = triggers[randomIndex];
      console.log(`${LOG.INFO} Theme from config (RANDOM pick): "${selectedTheme}" [${randomIndex + 1}/${triggers.length}]`);
      return selectedTheme;
    }
  } catch (error) {
    console.log(`${LOG.WARN} Could not load config for project ${projectId}, using default`);
  }
  
  // Priority 3: Hardcoded default (lowest priority)
  const defaultTheme = 'Я терпела это 20 лет';
  console.log(`${LOG.WARN} Using hardcoded default theme: "${defaultTheme}"`);
  return defaultTheme;
}

(async () => {
  try {
    // ============================================================================
    // Handle different CLI commands
    // ============================================================================
    
    if (command === 'factory') {
      // ============================================================================
      // 🏭 ZenMaster v4.0: Content Factory
      // Generate 1-100 articles with parallel processing and image generation
      // ============================================================================
      
      const { ContentFactoryOrchestrator } = await import('./services/contentFactoryOrchestrator');
      const { FactoryPresets } = await import('./types/ContentFactory');
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏭 ZenMaster v4.0 - Content Factory`);
      console.log(`${'='.repeat(60)}\n`);

      // Parse options
      const count = parseInt(getArg('count', '1') || '1');
      const preset = getArg('preset', 'quick-test');
      const channelName = getArg('channel', 'channel-1'); // 🔥 GET CHANNEL NAME!
      const includeImages = getFlag('images');
      const qualityLevel = getArg('quality', 'standard') as 'standard' | 'premium';
      const verbose = getFlag('verbose');
      
      // 🆕 v7.0: Simplified generation options
      const useAntiDetection = getFlag('no-anti-detection') ? false : getFlag('anti-detection') ? true : undefined;
      const skipCleanupGates = getFlag('no-cleanup') ? true : false;

      // Validate count
      const validCounts = [1, 5, 10, 25, 50, 100];
      if (!validCounts.includes(count)) {
        console.error(`${LOG.ERROR} Invalid count: ${count}`);
        console.error(`${LOG.INFO} Valid values: ${validCounts.join(', ')}`);
        process.exit(1);
      }

      // Get config (use preset or custom)
      let config;
      if (preset && FactoryPresets[preset]) {
        config = { 
          ...FactoryPresets[preset],
          articleCount: count as any,
          includeImages: includeImages !== undefined ? includeImages : FactoryPresets[preset].includeImages,
          qualityLevel,
          // 🆕 v7.0: Simplified generation options
          useAntiDetection,
          skipCleanupGates
        };
        console.log(`${LOG.INFO} Using preset: "${preset}"`);
        if (useAntiDetection === false) {
          console.log(`${LOG.INFO} 🚫 Anti-detection DISABLED (simplified mode)`);
        }
        if (skipCleanupGates) {
          console.log(`${LOG.INFO} 🚫 Cleanup gates DISABLED (direct output)`);
        }
      } else {
        config = {
          articleCount: count as any,
          parallelEpisodes: 3,
          imageGenerationRate: 1,
          includeImages: includeImages || false,
          qualityLevel,
          outputFormat: 'zen' as const,
          timeoutPerArticle: 300000,
          enableAntiDetection: true,
          enablePlotBible: true,
          // 🆕 v7.0: Simplified generation options
          useAntiDetection,
          skipCleanupGates
        };
        if (useAntiDetection === false) {
          console.log(`${LOG.INFO} 🚫 Anti-detection DISABLED (simplified mode)`);
        }
        if (skipCleanupGates) {
          console.log(`${LOG.INFO} 🚫 Cleanup gates DISABLED (direct output)`);
        }
      }

      if (verbose) {
        console.log(`${LOG.INFO} Configuration:`, JSON.stringify(config, null, 2));
      }

      // Initialize factory
      const factory = new ContentFactoryOrchestrator();
      await factory.initialize(config, channelName); // 🔥 PASS CHANNEL NAME!

      // Start generation
      const startTime = Date.now();
      const articles = await factory.start();
      const duration = Date.now() - startTime;

      // Export articles
      console.log(`\n${LOG.SAVE} Exporting articles...`);
      const exportPath = await factory.exportForZen('./articles');

      // Print summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ FACTORY COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📄 Articles generated: ${articles.length}`);
      console.log(`⏱️  Total time: ${formatTime(duration)}`);
      console.log(`💾 Output directory: ${exportPath}`);
      console.log(`📊 Average time/article: ${formatTime(duration / articles.length)}`);
      console.log(`${'='.repeat(60)}\n`);

    } else if (command === 'both') {
      // ============================================================================
      // 🎭 BOTH MODE v7.1: Generate RAW + RESTORED article pairs (DEFAULT MODE)
      // Generates 2 articles per request: clean + restored
      // ============================================================================
      
      const { ContentFactoryOrchestrator } = await import('./services/contentFactoryOrchestrator');
      
      console.log(`
${'='.repeat(60)}`);
      console.log(`🎭 ZenMaster v7.1 - BOTH MODE (DEFAULT)`);
      console.log(`Generating RAW + RESTORED article pairs`);
      console.log(`${'='.repeat(60)}\n`);

      // Parse options
      const count = parseInt(getArg('count', '1') || '1');
      const channelName = getArg('channel', 'channel-1');
      const includeImages = getFlag('images');
      const qualityLevel = getArg('quality', 'standard') as 'standard' | 'premium';
      const verbose = getFlag('verbose');

      // Validate count
      const validCounts = [1, 5, 10];
      if (!validCounts.includes(count)) {
        console.error(`${LOG.ERROR} Invalid count for BOTH mode: ${count}`);
        console.error(`${LOG.INFO} Valid values: ${validCounts.join(', ')}`);
        process.exit(1);
      }

      const config = {
        articleCount: count as 1 | 5 | 10,
        parallelEpisodes: 3,
        imageGenerationRate: 1,
        includeImages: includeImages || false,
        qualityLevel,
        outputFormat: 'zen' as const,
        timeoutPerArticle: 300000,
        enableAntiDetection: false, // Clean mode
        enablePlotBible: true
      };

      console.log(`${LOG.INFO} Configuration:`);
      console.log(`   Articles: ${count} pairs (${count * 2} total)`);
      console.log(`   Images: ${includeImages ? 'Yes' : 'No'}`);
      console.log(`   Quality: ${qualityLevel}`);
      console.log(`   Channel: ${channelName}\n`);

      if (verbose) {
        console.log(`${LOG.INFO} Full config:`, JSON.stringify(config, null, 2));
      }

      // Initialize factory
      const factory = new ContentFactoryOrchestrator();
      await factory.initialize(config, channelName);

      // Start BOTH mode
      const startTime = Date.now();
      const pairs = await factory.startBoth();
      const duration = Date.now() - startTime;

      // Export articles (both versions)
      console.log(`\n${LOG.SAVE} Exporting article pairs...`);
      const exportPath = await factory.exportForZen('./articles');

      // Print summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ BOTH MODE COMPLETE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📄 Article pairs: ${pairs.length}`);
      console.log(`📄 Total articles: ${pairs.length * 2}`);
      console.log(`   📄 RAW: ${pairs.length} articles`);
      console.log(`   🔧 RESTORED: ${pairs.length} articles`);
      console.log(`⏱️  Total time: ${formatTime(duration)}`);
      console.log(`💾 Output directory: ${exportPath}`);
      console.log(`${'='.repeat(60)}\n`);

    } else if (command === 'validate') {
      // ============================================================================
      // 🔍 VALIDATE MODE: Check Phase 2 Score of all articles
      // ============================================================================
      
      const { qualityGate } = await import('./utils/quality-gate');
      const fs = await import('fs');
      const path = await import('path');
      const matter = (await import('gray-matter')).default;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 ZenMaster - Article Validation`);
      console.log(`${'='.repeat(60)}\n`);

      const articlesDir = path.join(process.cwd(), 'articles');
      if (!fs.existsSync(articlesDir)) {
        console.error(`❌ Articles directory not found: ${articlesDir}`);
        process.exit(1);
      }

      const findMdFiles = (dir: string): string[] => {
        const results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          file = path.join(dir, file);
          const stat = fs.statSync(file);
          if (stat && stat.isDirectory()) {
            results.push(...findMdFiles(file));
          } else if (file.endsWith('.md')) {
            results.push(file);
          }
        });
        return results;
      };

      const mdFiles = findMdFiles(articlesDir);
      console.log(`${LOG.SEARCH} Found ${mdFiles.length} articles to validate...\n`);

      let passCount = 0;
      let failCount = 0;

      for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const { data, content: text } = matter(content);
        const title = data.title || path.basename(file);

        console.log(`${LOG.INFO} Validating: ${path.relative(process.cwd(), file)}`);
        
        const validation = await qualityGate(text, 75, 1000, title);
        
        if (validation.isValid) {
          console.log(`   ✅ PASS: Score ${validation.phase2Score}/100`);
          passCount++;
        } else {
          console.log(`   ❌ FAIL: Score ${validation.phase2Score}/100`);
          validation.issues.forEach(issue => console.log(`      - ${issue}`));
          failCount++;
        }
        console.log('');
      }

      console.log(`${'='.repeat(60)}`);
      console.log(`📊 SUMMARY:`);
      console.log(`   Total:   ${mdFiles.length}`);
      console.log(`   Pass:    ${passCount} ✅`);
      console.log(`   Fail:    ${failCount} ❌`);
      console.log(`${'='.repeat(60)}\n`);

      if (failCount > 0) {
        process.exit(0); // Exit with 0 even if failed, but show results
      }

    } else {
      console.log(`${LOG.INFO} Dzen Content Generator CLI`);
      console.log(``);
      console.log(`🚀 ZenMaster v7.1 Commands (DEFAULT: both):`);
      console.log(`  both               - 🎭 BOTH MODE: RAW + RESTORED пары статей [DEFAULT v7.1]`);
      console.log(`  factory            - 🏭 Content Factory: 1-100 статей + изображения [v7.0]`);
      console.log(``);
      console.log(`⚙️  Options:`);
      console.log(`  --count=N          - Number of articles (both: 1-10, factory: 1-100)`);
      console.log(`  --channel=NAME     - Channel name for folder (default: channel-1)`);
      console.log(`  --preset=PRESET    - Preset: quick-test, medium-batch, large-batch (factory only)`);
      console.log(`  --images           - Generate cover images`);
      console.log(`  --quality=LEVEL    - Quality: standard or premium`);
      console.log(`  --verbose          - Detailed logging`);
      console.log(``);
      console.log(`🆕 v7.1 Clean Generation (DEFAULT MODE):`);
      console.log(`  Anti-detection DISABLED by default`);
      console.log(`  Clean prompts in Russian for natural text`);
      console.log(`  Default command is 'both' (BOTH MODE)`);
      console.log(``);
      console.log(`🎭 BOTH MODE Examples (DEFAULT):`);
      console.log(`  npx ts-node cli.ts --count=1 --channel=women-35-60 --images`);
      console.log(`  npx ts-node cli.ts both --count=5 --channel=women-35-60`);
      console.log(``);
      console.log(`🏭 Factory Examples:`);
      console.log(`  npx ts-node cli.ts factory --count=1 --channel=channel-1 --images`);
      console.log(`  npx ts-node cli.ts factory --count=5 --preset=medium-batch`);
      console.log(`  npx ts-node cli.ts factory --count=10 --images --quality=premium`);
      console.log(``);
    }

  } catch (error) {
    console.error(`\n${LOG.ERROR} ОШИБКА:`, error);
    if (getFlag('verbose')) {
      console.error(error);
    }
    process.exit(1);
  }
})();
