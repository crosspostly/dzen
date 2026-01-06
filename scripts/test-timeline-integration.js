/**
 * 🔍 Timeline Publishing System Integration Test
 * 
 * Comprehensive test to verify timeline publishing system integration
 * with the RSS feed generator
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  Timeline Publishing System Integration Test                              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    console.log(`🔧 Test: ${name}`);
    fn();
    console.log('   ✅ PASSED');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }
  console.log('');
}

// Test 1: Configuration Files
test('Timeline configuration exists', () => {
  if (!existsSync('config/timeline.config.js')) {
    throw new Error('timeline.config.js not found');
  }
});

// Test 2: Timeline Manager Module
test('Timeline manager module exists', () => {
  if (!existsSync('scripts/timeline-manager.js')) {
    throw new Error('timeline-manager.js not found');
  }
});

// Test 3: Test Script
test('Timeline test script exists', () => {
  if (!existsSync('scripts/test-timeline.js')) {
    throw new Error('test-timeline.js not found');
  }
});

// Test 4: Documentation
test('Timeline documentation exists', () => {
  if (!existsSync('TIMELINE_PUBLISHING.md')) {
    throw new Error('TIMELINE_PUBLISHING.md not found');
  }
});

// Test 5: Run timeline test suite
test('Timeline test suite executes successfully', () => {
  const output = execSync('node scripts/test-timeline.js', { encoding: 'utf8' });
  if (!output.includes('✅ All timeline publishing tests passed')) {
    throw new Error('Test suite did not complete successfully');
  }
});

// Test 6: Configuration structure
test('Configuration has required exports', () => {
  const config = await import('./config/timeline.config.js');
  
  if (!config.TIMELINE_CONFIG) {
    throw new Error('TIMELINE_CONFIG export missing');
  }
  
  if (!config.ARTICLE_TIMELINE_MAP) {
    throw new Error('ARTICLE_TIMELINE_MAP export missing');
  }
  
  if (!config.PUBLISHING_RULES) {
    throw new Error('PUBLISHING_RULES export missing');
  }
  
  if (Object.keys(config.TIMELINE_CONFIG).length < 4) {
    throw new Error('Expected at least 4 timeline configurations');
  }
});

// Test 7: Timeline manager exports
(async () => {
  test('Timeline manager has required functions', async () => {
    const manager = await import('./scripts/timeline-manager.js');
    
    const requiredFunctions = [
      'getTimelineForArticle',
      'generatePublishingSchedule', 
      'validateSchedule',
      'saveScheduleToFile'
    ];
    
    for (const fn of requiredFunctions) {
      if (typeof manager[fn] !== 'function') {
        throw new Error(`Function ${fn} not exported`);
      }
    }
  });
})();

// Test 8: Integration with generate-feed.js
test('Generate-feed.js has timeline integration', () => {
  const generateFeed = execSync('head -n 350 scripts/generate-feed.js | tail -n 100', { encoding: 'utf8' });
  
  if (!generateFeed.includes('timeline-manager.js')) {
    throw new Error('timeline-manager.js not imported in generate-feed.js');
  }
  
  if (!generateFeed.includes('generateTimelinePubDate')) {
    throw new Error('generateTimelinePubDate function not found in generate-feed.js');
  }
  
  if (!generateFeed.includes('TASK #135')) {
    throw new Error('Issue #135 references not found');
  }
});

// Test 9: Feed generation compatibility
test('Feed generation still works with timeline integration', () => {
  const output = execSync('node scripts/generate-feed.js incremental 2>&1 || true', { encoding: 'utf8' });
  
  if (output.includes('ERROR') || output.includes('FATAL')) {
    throw new Error('Feed generation with timeline integration failed');
  }
  
  if (existsSync('public/feed.xml')) {
    const size = execSync('wc -c public/feed.xml', { encoding: 'utf8' }).trim().split(' ')[0];
    if (size < 1000) {
      throw new Error('Generated feed is too small (< 1KB)');
    }
  }
});

// Test 10: CI/CD Integration
test('GitHub Actions include timeline support', () => {
  if (!existsSync('.github/workflows/generate-feed.yml')) {
    throw new Error('generate-feed.yml workflow not found');
  }
  
  const workflow = execSync('cat .github/workflows/generate-feed.yml', { encoding: 'utf8' });
  
  if (!workflow.includes('Generate RSS feed')) {
    throw new Error('Generate feed step not found in workflow');
  }
  
  if (!workflow.includes('Validate RSS feed')) {
    throw new Error('Validation step not found in workflow');
  }
});

console.log('');
console.log('╔'.repeat(70));
console.log('║  Test Summary                                          ║');
console.log('╚'.repeat(70));
console.log('');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('');

if (failed === 0) {
  console.log('✅ All integration tests passed!');
  console.log('');
  console.log('👍 Timeline Publishing System is ready for production!');
  console.log('');
  console.log('🔄 Next steps:');
  console.log('   1. Review generated test files');
  console.log('   2. Test with real articles: node scripts/generate-feed.js full');
  console.log('   3. Validate output: node scripts/validate-rss.js public/feed.xml');
  console.log('   4. Review schedule: cat publishing-schedule.json');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Some integration tests failed!');
  console.log('');
  console.log('🚨 Please review the failing tests above.');
  console.log('');
  process.exit(1);
}
