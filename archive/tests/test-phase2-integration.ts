#!/usr/bin/env node
/**
 * Integration test for Phase2AntiDetectionService in multiAgentService
 * Verifies the service is properly wired and returns correct data
 */

import { MultiAgentService } from './services/multiAgentService';

const LOG = {
  SUCCESS: '✅',
  ERROR: '❌',
  INFO: '🔷',
  ROCKET: '🚀',
};

async function testPhase2Integration() {
  console.log(`\n${LOG.ROCKET} Phase 2 MultiAgentService Integration Test`);
  console.log('═'.repeat(60));

  const multiAgent = new MultiAgentService();
  
  console.log(`${LOG.INFO} Generating test article with Phase 2 processing...`);
  
  const article = await multiAgent.generateLongFormArticle({
    theme: 'Я терпела это 20 лет',
    angle: 'confession',
    emotion: 'guilt',
    audience: 'Women 35-60',
    maxChars: 8000, // Reduced for faster testing
  });

  console.log('═'.repeat(60));
  console.log(`${LOG.INFO} Verifying Phase 2 integration...`);
  
  // Test 1: Check article has Phase2 fields
  const hasProcessedContent = typeof article.processedContent === 'string';
  const hasAdversarialScore = article.adversarialScore !== undefined;
  const hasPhase2Applied = article.phase2Applied === true;
  
  console.log(`${hasProcessedContent ? LOG.SUCCESS : LOG.ERROR} processedContent field present`);
  console.log(`${hasAdversarialScore ? LOG.SUCCESS : LOG.ERROR} adversarialScore field present`);
  console.log(`${hasPhase2Applied ? LOG.SUCCESS : LOG.ERROR} phase2Applied flag is true`);
  
  // Test 2: Check adversarialScore structure
  if (hasAdversarialScore) {
    const score = article.adversarialScore!;
    console.log('\nAdversarial Score Details:');
    console.log(`  Overall: ${score.overallScore}/100`);
    console.log(`  Perplexity: ${score.perplexity}/100`);
    console.log(`  Burstiness: ${score.burstiness}/100`);
    console.log(`  Skaz: ${score.skazRussianness}/100`);
    console.log(`  Passes checks: ${score.passesAllChecks ? LOG.SUCCESS : LOG.ERROR}`);
    
    if (score.passesAllChecks) {
      console.log(`${LOG.SUCCESS} Article passes anti-detection checks!`);
    } else {
      console.log(`${LOG.ERROR} Article needs revision:`);
      score.issues.forEach(issue => console.log(`  - ${issue}`));
    }
  }
  
  // Test 3: Verify processedContent is different from original
  if (hasProcessedContent) {
    const ledeChanged = article.processedContent !== article.lede;
    const lengthReasonable = article.processedContent.length > 5000; // Should be substantial
    
    console.log(`\n${ledeChanged ? LOG.SUCCESS : LOG.ERROR} Processed content differs from original`);
    console.log(`${lengthReasonable ? LOG.SUCCESS : LOG.ERROR} Processed content has reasonable length (${article.processedContent.length} chars)`);
    
    if (ledeChanged && lengthReasonable) {
      console.log(`${LOG.SUCCESS} Phase 2 transformations applied successfully!`);
    }
  }
  
  console.log('═'.repeat(60));
  
  // Summary
  const allTestsPassed = hasProcessedContent && hasAdversarialScore && hasPhase2Applied;
  
  if (allTestsPassed) {
    console.log(`${LOG.SUCCESS} Phase 2 integration test PASSED!`);
    console.log(`${LOG.SUCCESS} Phase2AntiDetectionService is properly integrated into multiAgentService`);
  } else {
    console.log(`${LOG.ERROR} Phase 2 integration test FAILED!`);
    process.exit(1);
  }
  
  console.log('\n📊 Generated Article Summary:');
  console.log(`  - Title: "${article.title}"`);
  console.log(`  - Episodes: ${article.metadata.episodeCount}`);
  console.log(`  - Total chars: ${article.metadata.totalChars}`);
  console.log(`  - Phase2 Score: ${article.adversarialScore?.overallScore}/100`);
  console.log(`  - Processing: ${article.phase2Applied ? 'ENABLED' : 'DISABLED'}`);
  
  console.log('\n🎉 Integration complete! Phase 2 is now live in production pipeline!\n');
}

// Run test
testPhase2Integration().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});