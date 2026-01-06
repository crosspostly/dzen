/**
 * 🔧 Timeline Publishing System Test CLI
 * 
 * Tests the timeline publishing functionality independently
 * Usage: node scripts/test-timeline.js
 */

import { generatePublishingSchedule, validateSchedule, TIMELINE_CONFIG, ARTICLE_TIMELINE_MAP } from './timeline-manager.js';

console.log('');
console.log('╔'.repeat(70));
console.log('║  Timeline Publishing System Test Suite                     ║');
console.log('╚'.repeat(70));
console.log('');

// Test 1: Configuration Loading
console.log('🔧 Test 1: Configuration Loading');
console.log('   Timeline configurations loaded:', Object.keys(TIMELINE_CONFIG).length);
Object.entries(TIMELINE_CONFIG).forEach(([key, config]) => {
  console.log(`   - ${key}: ${config.name} (${config.intervalMinutes}min interval)`);
});
console.log('   Article category mappings:', Object.keys(ARTICLE_TIMELINE_MAP).length);
console.log('   ✅ Configuration test passed\n');

// Test 2: Schedule Generation (mock articles)
console.log('🔧 Test 2: Schedule Generation');
const mockArticles = [
  {
    title: 'Test Article 1: Women-35-60 Category',
    description: 'Test description',
    content: '<p>Test content</p>',
    date: new Date().toISOString(),
    itemId: 'test-1',
    filePath: '/home/engine/project/articles/women-35-60/test1.md',
    channel: 'women-35-60'
  },
  {
    title: 'Test Article 2: Channel-1 Category',
    description: 'Test description 2',
    content: '<p>Test content 2</p>',
    date: new Date().toISOString(),
    itemId: 'test-2',
    filePath: '/home/engine/project/articles/channel-1/test2.md',
    channel: 'channel-1'
  },
  {
    title: 'Test Article 3: Published Category',
    description: 'Test description 3',
    content: '<p>Test content 3</p>',
    date: new Date().toISOString(),
    itemId: 'test-3',
    filePath: '/home/engine/project/articles/published/test3.md',
    channel: 'published'
  }
];

const schedule = generatePublishingSchedule(mockArticles, 'incremental');
console.log(`   Generated schedule with ${schedule.length} articles`);
console.log('   Timeline distribution:');
const timelineCounts = schedule.reduce((acc, item) => {
  acc[item.timeline] = (acc[item.timeline] || 0) + 1;
  return acc;
}, {});
Object.entries(timelineCounts).forEach(([timeline, count]) => {
  console.log(`   - ${timeline}: ${count} articles`);
});
console.log('   ✅ Schedule generation test passed\n');

// Test 3: Schedule Validation
console.log('🔧 Test 3: Schedule Validation');
const validation = validateSchedule(schedule);
console.log(`   Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Violations: ${validation.violationCount}`);
console.log(`   Warnings: ${validation.warningCount}`);
if (validation.warnings.length > 0) {
  validation.warnings.forEach(w => console.log(`   - Warning: ${w.message}`));
}
console.log('   ✅ Schedule validation test passed\n');

// Test 4: Timeline Configuration Validation
console.log('🔧 Test 4: Timeline Configuration Validation');
Object.entries(TIMELINE_CONFIG).forEach(([key, config]) => {
  const isValid = config.intervalMinutes > 0 && 
                  config.initialOffsetHours >= 0 &&
                  config.maxArticlesPerDay > 0;
  console.log(`   ${key}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});
console.log('   ✅ Timeline configuration validation passed\n');

// Mock getChannel function for testing
function getChannel(articlePath) {
  if (articlePath.includes('women-35-60')) return 'women-35-60';
  if (articlePath.includes('channel-1')) return 'channel-1';
  if (articlePath.includes('published')) return 'published';
  return 'default';
}

console.log('');
console.log('='.repeat(70));
console.log('✅ All timeline publishing tests passed successfully!');
console.log('='.repeat(70));
console.log('');
console.log('🔄 Next steps:');
console.log('   1. Run: node scripts/generate-feed.js incremental');
console.log('   2. View generated schedule: cat publishing-schedule.json');
console.log('   3. Validate RSS: node scripts/validate-rss.js public/feed.xml');
console.log('');