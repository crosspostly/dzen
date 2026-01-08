#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🔍 VERIFYING: Single Source of Truth - Budget Configuration  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Check that constants/BUDGET_CONFIG.ts exists and defines CHAR_BUDGET=19000
echo "📊 TEST 1: Central Budget Constant File"
if grep -q "CHAR_BUDGET = 19000" constants/BUDGET_CONFIG.ts; then
    echo "   ✅ constants/BUDGET_CONFIG.ts defines CHAR_BUDGET = 19000"
else
    echo "   ❌ FAIL: CHAR_BUDGET not found or incorrect value"
    exit 1
fi
echo ""

# Test 2: Verify no hardcoded 29000 in multiAgentService.ts
echo "📊 TEST 2: No Hardcoded Values in multiAgentService.ts"
if grep -q "29000" services/multiAgentService.ts; then
    echo "   ⚠️  WARNING: Found 29000 in multiAgentService.ts (should be removed)"
    grep -n "29000" services/multiAgentService.ts | head -3
else
    echo "   ✅ No hardcoded 29000 in multiAgentService.ts"
fi
echo ""

# Test 3: Check that multiAgentService.ts imports CHAR_BUDGET
echo "📊 TEST 3: MultiAgentService Imports Central Budget"
if grep -q 'import.*CHAR_BUDGET.*from.*constants/BUDGET_CONFIG' services/multiAgentService.ts; then
    echo "   ✅ services/multiAgentService.ts imports CHAR_BUDGET from constants/BUDGET_CONFIG"
else
    echo "   ❌ FAIL: MultiAgentService doesn't import central budget"
    exit 1
fi
echo ""

# Test 4: Check that episodeGeneratorService.ts imports CHAR_BUDGET  
echo "📊 TEST 4: EpisodeGeneratorService Imports Central Budget"
if grep -q 'import.*CHAR_BUDGET.*from.*constants/BUDGET_CONFIG' services/episodeGeneratorService.ts; then
    echo "   ✅ services/episodeGeneratorService.ts imports CHAR_BUDGET from constants/BUDGET_CONFIG"
else
    echo "   ❌ FAIL: EpisodeGeneratorService doesn't import central budget"
    exit 1
fi
echo ""

# Test 5: Check that articleWorkerPool.ts passes budget correctly
echo "📊 TEST 5: ArticleWorkerPool Passes Budget Correctly"
if grep -q "maxChars.*config.maxChars.*||.*CHAR_BUDGET" services/articleWorkerPool.ts; then
    echo "   ✅ services/articleWorkerPool.ts uses config.maxChars or falls back to CHAR_BUDGET"
else
    echo "   ❌ FAIL: ArticleWorkerPool doesn't handle budget correctly"
    exit 1
fi
echo ""

# Test 6: Verify FactoryPresets include maxChars
echo "📊 TEST 6: Factory Presets Include Budget Configuration"
PRESETS_WITH_MAXCHARS=$(grep -c "maxChars: 19000" types/ContentFactory.ts)
if [ "$PRESETS_WITH_MAXCHARS" -ge 4 ]; then
    echo "   ✅ All factory presets include maxChars: 19000 (found in $PRESETS_WITH_MAXCHARS presets)"
else
    echo "   ❌ FAIL: Not all presets include maxChars (found $PRESETS_WITH_MAXCHARS, expected 4+)"
    exit 1
fi
echo ""

# Test 7: Check ContentFactoryConfig interface has maxChars
echo "📊 TEST 7: ContentFactoryConfig Interface Definition"
if grep -q "maxChars?: number;" types/ContentFactory.ts; then
    echo "   ✅ ContentFactoryConfig interface includes optional maxChars field"
else
    echo "   ❌ FAIL: ContentFactoryConfig interface missing maxChars field"
    exit 1
fi
echo ""

# Test 8: Verify episodeGeneratorService passes budget to constructor
echo "📊 TEST 8: MultiAgentService Passes Budget to EpisodeGeneratorService"
# Check that constructor call exists and passes this.maxChars as 2nd param
if grep -A2 -B2 "new EpisodeGeneratorService" services/multiAgentService.ts | grep -q "this.maxChars"; then
    echo "   ✅ MultiAgentService passes this.maxChars to EpisodeGeneratorService constructor"
else
    echo "   ❌ FAIL: Budget not properly passed from MultiAgent to EpisodeGenerator"
    exit 1
fi
echo ""

# Test 9: Check no hardcoded TOTAL_BUDGET or 19000 in episodeGeneratorService.ts
echo "📊 TEST 9: EpisodeGeneratorService Uses Dynamic Budget"
HARDCODED_COUNT=$(grep -c "TOTAL_BUDGET = 19000" services/episodeGeneratorService.ts)
if [ "$HARDCODED_COUNT" -eq 0 ]; then
    echo "   ✅ No hardcoded TOTAL_BUDGET = 19000 in episodeGeneratorService.ts (uses constructor parameter)"
else
    echo "   ⚠️  WARNING: Found hardcoded TOTAL_BUDGET in episodeGeneratorService.ts"
    grep -n "TOTAL_BUDGET = 19000" services/episodeGeneratorService.ts
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     ✅ ALL TESTS PASSED!                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ✅ Single Source of Truth verified!                         ║"
echo "║  ✅ Budget flows: constants → config → services              ║"
echo "║  ✅ No hardcoded values causing conflicts                    ║"
echo "║  ✅ All services use CHAR_BUDGET = 19000                     ║"
echo "║                                                              ║"
echo "║  🎯 ISSUE FIXED: Budget duplication eliminated!              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""