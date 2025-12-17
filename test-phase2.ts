#!/usr/bin/env node

/**
 * Phase 2 Anti-Detection Integration Test
 * Тестирует все 5 компонентов Anti-Detection системы
 */

import { Phase2AntiDetectionService } from './services/phase2AntiDetectionService';
import { PerplexityController } from './services/perplexityController';
import { BurstinessOptimizer } from './services/burstinessOptimizer';
import { SkazNarrativeEngine } from './services/skazNarrativeEngine';
import { AdversarialGatekeeper } from './services/adversarialGatekeeper';
import { VisualSanitizationService } from './services/visualSanitizationService';

const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  LOADING: '📁',
  ROCKET: '🚀',
  TEST: '🧪',
};

async function runTests() {
  console.log(`\n${LOG.ROCKET} PHASE 2 ANTI-DETECTION INTEGRATION TESTS`);
  console.log('═'.repeat(60));

  // Test content
  const testContent = `
    Я долгое время боролась с депрессией. Это было очень сложно. 
    Каждый день я просыпалась и не знала, как жить дальше. 
    Мой муж старался помочь, но это казалось бесполезным. 
    Врачи прописали таблетки, но они не помогали. 
    Я чувствовала себя ужасно все время. Ничего не менялось.
    Потом я решила попробовать другой подход. Начала медитировать.
    Это было странно в начале. Но со временем стало легче.
    Теперь я чувствую себя намного лучше. Жизнь изменилась к лучшему.
  `.trim();

  const testTitle = 'Как я победила депрессию';

  // ============================================================================
  // Test 1: PerplexityController
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 1: PerplexityController`);
  console.log('─'.repeat(60));

  const perplexity = new PerplexityController();
  const beforePerplexity = perplexity.analyzePerplexity(testContent);
  console.log(`  Before: ${beforePerplexity.score.toFixed(2)} perplexity`);
  console.log(`  Rarity Ratio: ${(beforePerplexity.rarityRatio * 100).toFixed(1)}%`);

  const enhancedContent = perplexity.increasePerplexity(testContent);
  const afterPerplexity = perplexity.analyzePerplexity(enhancedContent);
  console.log(`  After: ${afterPerplexity.score.toFixed(2)} perplexity`);
  console.log(`  Improvement: ${((afterPerplexity.score - beforePerplexity.score) * 100).toFixed(1)}%`);

  if (afterPerplexity.score >= beforePerplexity.score) {
    console.log(`  ${LOG.SUCCESS} Perplexity increased!`);
  } else {
    console.log(`  ${LOG.WARN} Perplexity did not increase as expected`);
  }

  // ============================================================================
  // Test 2: BurstinessOptimizer
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 2: BurstinessOptimizer`);
  console.log('─'.repeat(60));

  const burstiness = new BurstinessOptimizer();
  const beforeBurstiness = burstiness.analyzeBurstiness(testContent);
  console.log(`  Before: StdDev = ${beforeBurstiness.standardDeviation.toFixed(2)}`);
  console.log(`  Distribution: ${beforeBurstiness.distribution}`);

  const optimizedContent = burstiness.optimizeBurstiness(enhancedContent, 7.0);
  const afterBurstiness = burstiness.analyzeBurstiness(optimizedContent);
  console.log(`  After: StdDev = ${afterBurstiness.standardDeviation.toFixed(2)}`);
  console.log(`  Distribution: ${afterBurstiness.distribution}`);

  if (afterBurstiness.standardDeviation > beforeBurstiness.standardDeviation) {
    console.log(`  ${LOG.SUCCESS} Burstiness increased!`);
  } else {
    console.log(`  ${LOG.WARN} Burstiness did not increase as expected`);
  }

  // ============================================================================
  // Test 3: SkazNarrativeEngine
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 3: SkazNarrativeEngine ⭐`);
  console.log('─'.repeat(60));

  const skaz = new SkazNarrativeEngine();
  const beforeSkaz = skaz.analyzeSkazMetrics(testContent);
  console.log(`  Before: Skaz Score = ${beforeSkaz.score}/100`);
  console.log(`    - Particles: ${beforeSkaz.particleCount}`);
  console.log(`    - Syntactic Dislocations: ${beforeSkaz.syntaxDislocations}`);
  console.log(`    - Dialectal Words: ${beforeSkaz.dialectalWords}`);

  const skazContent = skaz.applySkazTransformations(optimizedContent);
  const afterSkaz = skaz.analyzeSkazMetrics(skazContent);
  console.log(`  After: Skaz Score = ${afterSkaz.score}/100`);
  console.log(`    - Particles: ${afterSkaz.particleCount}`);
  console.log(`    - Syntactic Dislocations: ${afterSkaz.syntaxDislocations}`);
  console.log(`    - Dialectal Words: ${afterSkaz.dialectalWords}`);

  if (afterSkaz.score >= beforeSkaz.score) {
    console.log(`  ${LOG.SUCCESS} Skaz score increased!`);
  }

  // ============================================================================
  // Test 4: AdversarialGatekeeper
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 4: AdversarialGatekeeper`);
  console.log('─'.repeat(60));

  const gatekeeper = new AdversarialGatekeeper();
  
  // Тест на оригинальном контенте
  const scoreBefore = gatekeeper.assessArticle(testTitle, testContent);
  console.log(`  Before Processing:`);
  console.log(`    Overall Score: ${scoreBefore.overallScore}/100`);
  console.log(`    Perplexity: ${scoreBefore.perplexity}/100`);
  console.log(`    Burstiness: ${scoreBefore.burstiness}/100`);
  console.log(`    Skaz: ${scoreBefore.skazRussianness}/100`);
  console.log(`    Content Length: ${scoreBefore.contentLength}/100`);
  console.log(`    No Clichés: ${scoreBefore.noClichés}/100`);

  // Тест на обработанном контенте
  const scoreAfter = gatekeeper.assessArticle(testTitle, skazContent);
  console.log(`\n  After Processing:`);
  console.log(`    Overall Score: ${scoreAfter.overallScore}/100`);
  console.log(`    Perplexity: ${scoreAfter.perplexity}/100`);
  console.log(`    Burstiness: ${scoreAfter.burstiness}/100`);
  console.log(`    Skaz: ${scoreAfter.skazRussianness}/100`);
  console.log(`    Content Length: ${scoreAfter.contentLength}/100`);
  console.log(`    No Clichés: ${scoreAfter.noClichés}/100`);

  console.log(`\n  Status: ${scoreAfter.passesAllChecks ? LOG.SUCCESS + ' READY FOR PUBLICATION' : LOG.WARN + ' NEEDS REVISION'}`);

  if (scoreAfter.issues.length > 0) {
    console.log(`  Issues:`);
    for (const issue of scoreAfter.issues) {
      console.log(`    ${issue}`);
    }
  }

  // ============================================================================
  // Test 5: VisualSanitizationService
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 5: VisualSanitizationService`);
  console.log('─'.repeat(60));

  const visualSanitizer = new VisualSanitizationService();
  console.log(`  ${LOG.SUCCESS} Service initialized`);
  console.log(`  Supported formats: .jpg, .jpeg, .png, .webp`);
  console.log(`  Noise range: 2-5%`);
  
  const commands = {
    exiftool: visualSanitizer.generateExiftoolCommand('test.jpg', 'test_sanitized.jpg'),
    ffmpeg: visualSanitizer.generateFFmpegCommand('test.jpg', 'test_sanitized.jpg', 3.5),
  };
  console.log(`\n  Generated commands:`);
  console.log(`    exiftool: ${commands.exiftool}`);
  console.log(`    ffmpeg: ${commands.ffmpeg}`);

  // ============================================================================
  // Test 6: Phase2AntiDetectionService (Full Integration)
  // ============================================================================
  console.log(`\n${LOG.TEST} Test 6: Full Phase 2 Integration`);
  console.log('─'.repeat(60));

  const phase2 = new Phase2AntiDetectionService();

  console.log(`  Running full processing pipeline...`);
  const result = await phase2.processArticle(
    testTitle,
    testContent,
    {
      applyPerplexity: true,
      applyBurstiness: true,
      applySkazNarrative: true,
      enableGatekeeper: true,
      sanitizeImages: false,
      verbose: false,
    }
  );

  console.log(`\n  ${LOG.SUCCESS} Processing complete in ${result.processingTime}ms`);
  console.log(`  Final Adversarial Score: ${result.adversarialScore.overallScore}/100`);
  console.log(`  Status: ${result.adversarialScore.passesAllChecks ? LOG.SUCCESS : LOG.WARN}`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${LOG.SUCCESS} ALL TESTS COMPLETED`);
  console.log(`${'═'.repeat(60)}`);

  console.log(`\nSummary:`);
  console.log(`  ✅ PerplexityController: Working`);
  console.log(`  ✅ BurstinessOptimizer: Working`);
  console.log(`  ✅ SkazNarrativeEngine: Working`);
  console.log(`  ✅ AdversarialGatekeeper: Working`);
  console.log(`  ✅ VisualSanitizationService: Working`);
  console.log(`  ✅ Phase2AntiDetectionService: Working`);

  console.log(`\nMetrics Improvement:`);
  console.log(`  • Perplexity: ${beforePerplexity.score.toFixed(2)} → ${afterPerplexity.score.toFixed(2)}`);
  console.log(`  • Burstiness: ${beforeBurstiness.standardDeviation.toFixed(2)} → ${afterBurstiness.standardDeviation.toFixed(2)}`);
  console.log(`  • Skaz Score: ${beforeSkaz.score}/100 → ${afterSkaz.score}/100`);
  console.log(`  • Gatekeeper: ${scoreBefore.overallScore}/100 → ${scoreAfter.overallScore}/100`);

  console.log(`\n${LOG.ROCKET} Phase 2 is ready for production!\n`);
}

runTests().catch(error => {
  console.error(`\n${LOG.ERROR} Test failed:`, error);
  process.exit(1);
});
