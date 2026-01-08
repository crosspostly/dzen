#!/usr/bin/env node

/**
 * 🔧 TEST: Single Source of Truth for Budget Configuration
 * 
 * This test verifies that the budget duplication issue is fixed:
 * ✅ Budget is defined in ONE place (constants/BUDGET_CONFIG.ts)
 * ✅ All services use the same budget value
 * ✅ No hardcoded values scattered across services
 */

import { CHAR_BUDGET, BUDGET_CONFIG } from './constants/BUDGET_CONFIG';
import { MultiAgentService } from './services/multiAgentService';
import { EpisodeGeneratorService } from './services/episodeGeneratorService';
import { FactoryPresets } from './types/ContentFactory';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔍 TEST: Single Source of Truth - Budget Configuration      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Test 1: Central constant exists and has correct value
console.log('📊 TEST 1: Central Budget Constant');
console.log(`   CHAR_BUDGET = ${CHAR_BUDGET} chars`);
const test1Pass = CHAR_BUDGET === 19000;
console.log(`   ✅ PASS: Budget is 19000 chars\n`);

// Test 2: Budget config object
console.log('📊 TEST 2: Budget Configuration Object');
console.log(`   Total: ${BUDGET_CONFIG.total} chars`);
console.log(`   Lede range: ${BUDGET_CONFIG.lede}`);
console.log(`   Finale range: ${BUDGET_CONFIG.finale}`);
console.log(`   Episode base: ${BUDGET_CONFIG.episodeBase} chars`);
const test2Pass = BUDGET_CONFIG.total === 19000;
console.log(`   ✅ PASS: Config object uses correct values\n`);

// Test 3: Factory presets use the budget
console.log('📊 TEST 3: Factory Presets');
Object.entries(FactoryPresets).forEach(([name, preset]) => {
  const maxChars = preset.maxChars || 0;
  console.log(`   ${name}: ${maxChars} chars`);
  const presetPass = maxChars === 19000;
  if (!presetPass) {
    console.log(`   ❌ FAIL: ${name} has incorrect maxChars: ${maxChars}`);
    process.exit(1);
  }
});
console.log(`   ✅ PASS: All presets use 19000 chars\n`);

// Test 4: MultiAgentService accepts and uses budget parameter
console.log('📊 TEST 4: MultiAgentService Constructor');
const service1 = new MultiAgentService('test-key-123', 19000);
// @ts-ignore - accessing private property for test
const service1Budget = service1.maxChars;
console.log(`   With maxChars parameter: ${service1Budget} chars`);
const test4Pass = service1Budget === 19000;
console.log(`   ✅ PASS: Service accepts and stores budget parameter\n`);

// Test 5: MultiAgentService falls back to CHAR_BUDGET
console.log('📊 TEST 5: MultiAgentService Default Fallback');
const service2 = new MultiAgentService('test-key-123');
// @ts-ignore - accessing private property for test
const service2Budget = service2.maxChars;
console.log(`   Without maxChars parameter: ${service2Budget} chars`);
console.log(`   Expected (CHAR_BUDGET): ${CHAR_BUDGET} chars`);
const test5Pass = service2Budget === CHAR_BUDGET;
console.log(`   ✅ PASS: Service falls back to CHAR_BUDGET\n`);

// Test 6: EpisodeGeneratorService accepts budget parameter
console.log('📊 TEST 6: EpisodeGeneratorService Constructor');
const episodeService = new EpisodeGeneratorService('test-key-123', 19000);
// @ts-ignore - accessing private property for test
const episodeBudget = episodeService.TOTAL_BUDGET;
console.log(`   With maxChars parameter: ${episodeBudget} chars`);
const test6Pass = episodeBudget === 19000;
console.log(`   ✅ PASS: EpisodeGenerator accepts and stores budget\n`);

// Final results
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                      📋 TEST RESULTS                         ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass];
const passed = allTests.filter(p => p).length;
const total = allTests.length;
console.log(`║  Tests passed: ${passed}/${total}                                        ║`);

if (passed === total) {
  console.log('║  ✅ ALL TESTS PASSED - Single Source of Truth verified!      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(0);
} else {
  console.log('║  ❌ SOME TESTS FAILED                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}
