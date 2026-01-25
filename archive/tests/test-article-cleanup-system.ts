#!/usr/bin/env tsx

/**
 * 🧪 UNIT TESTS: Article Cleanup System (v6.0)
 * 
 * Тестирует 3-уровневую систему очистки статей:
 * - Уровень 1: Enhanced Generation Prompts (профилактика)
 * - Уровень 2: FinalArticleCleanupGate (AI очистка)
 * - Уровень 3: ArticlePublishGate (финальная валидация)
 */

import { FinalArticleCleanupGate } from './services/finalArticleCleanupGate';
import { ArticlePublishGate } from './services/articlePublishGate';

console.log('🧪 Article Cleanup System Tests (v6.0)\n');

// ============================================================================
// TEST 1: analyzeForIssues() - Обнаружение артефактов
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: analyzeForIssues() - Detecting Artifacts');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1.1: Clean article (no issues)
const cleanArticle = `
Я помню тот день точно. Холодный апрельский снег падал на асфальт.
Её голос дрожал. Я смотрела на стекло кабинета.

— Откуда ты это знаешь? — спросила я.
— Я не могу сказать.

Мне было холодно. Письмо лежало в руке. Бумага пахла старостью.
Прошло три года. Я до сих пор не знаю, правильно ли поступила.

А вы смогли бы простить без извинений?
`.trim();

const cleanAnalysis = FinalArticleCleanupGate.analyzeForIssues(cleanArticle);
console.log('1.1: Clean Article');
console.log(`   hasIssues: ${cleanAnalysis.hasIssues} (expected: false)`);
console.log(`   severity: ${cleanAnalysis.severity} (expected: low)`);
console.log(`   ✅ PASS: ${!cleanAnalysis.hasIssues || cleanAnalysis.severity === 'low' ? 'YES' : 'NO'}\n`);

// Test 1.2: Repeated phrases (CRITICAL)
const repeatedPhrasesArticle = `
Я помню тот день. — вот в чём дело...
Она говорила правду. — вот в чём дело...
Он молчал. — вот в чём дело...
Мама плакала. — вот в чём дело...
Папа ушёл. — вот в чём дело...
Я узнала. — вот в чём дело...
Это было так. — вот в чём дело...
Правда вышла наружу. — вот в чём дело...
`.trim();

const repeatedAnalysis = FinalArticleCleanupGate.analyzeForIssues(repeatedPhrasesArticle);
console.log('1.2: Repeated Phrases (8 times "— вот в чём дело")');
console.log(`   hasIssues: ${repeatedAnalysis.hasIssues} (expected: true)`);
console.log(`   severity: ${repeatedAnalysis.severity} (expected: critical)`);
console.log(`   repeatedPhrases: ${repeatedAnalysis.metadata?.repeatedPhrases?.length || 0}`);
if (repeatedAnalysis.metadata?.repeatedPhrases) {
  repeatedAnalysis.metadata.repeatedPhrases.forEach(p => {
    console.log(`      - "${p.phrase}": ${p.count} times`);
  });
}
console.log(`   ✅ PASS: ${repeatedAnalysis.hasIssues && repeatedAnalysis.severity === 'critical' ? 'YES' : 'NO'}\n`);

// Test 1.3: Metadata comments (CRITICAL)
const metadataArticle = `
Я помню тот день. [note: add more details here]
Она говорила правду. [comment: check this]
Он молчал. [TODO: expand this scene]
`.trim();

const metadataAnalysis = FinalArticleCleanupGate.analyzeForIssues(metadataArticle);
console.log('1.3: Metadata Comments');
console.log(`   hasIssues: ${metadataAnalysis.hasIssues} (expected: true)`);
console.log(`   severity: ${metadataAnalysis.severity} (expected: critical)`);
console.log(`   metadataComments: ${metadataAnalysis.metadata?.metadataComments || 0}`);
console.log(`   ✅ PASS: ${metadataAnalysis.hasIssues && metadataAnalysis.severity === 'critical' ? 'YES' : 'NO'}\n`);

// Test 1.4: Markdown syntax
const markdownArticle = `
Я помню тот день. **Это было важно.**
Она говорила правду. ## Глава 2
Он молчал. ### Подглава
`.trim();

const markdownAnalysis = FinalArticleCleanupGate.analyzeForIssues(markdownArticle);
console.log('1.4: Markdown Syntax');
console.log(`   hasIssues: ${markdownAnalysis.hasIssues} (expected: true)`);
console.log(`   severity: ${markdownAnalysis.severity} (expected: critical or medium)`);
console.log(`   markdownCount: ${markdownAnalysis.metadata?.markdownCount || 0}`);
console.log(`   ✅ PASS: ${markdownAnalysis.hasIssues ? 'YES' : 'NO'}\n`);

// Test 1.5: Orphaned fragments
const orphanedArticle = `
Я помню тот день. ну и началось всё.
Она говорила правду. да вот так.
Он молчал. вот только я не знала.
Мама плакала. и то странно.
Папа ушёл. да что теперь делать.
Я узнала. ну да конечно.
`.trim();

const orphanedAnalysis = FinalArticleCleanupGate.analyzeForIssues(orphanedArticle);
console.log('1.5: Orphaned Fragments (6 instances)');
console.log(`   hasIssues: ${orphanedAnalysis.hasIssues} (expected: true)`);
console.log(`   severity: ${orphanedAnalysis.severity} (expected: medium or low)`);
console.log(`   orphanedFragments: ${orphanedAnalysis.metadata?.orphanedFragments || 0}`);
console.log(`   ✅ PASS: ${orphanedAnalysis.hasIssues ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 2: validateClean() - Валидация чистоты текста
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: validateClean() - Text Cleanliness Validation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const cleanText = cleanArticle;
const dirtyText = repeatedPhrasesArticle;

console.log('2.1: Clean Text Validation');
const isClean = FinalArticleCleanupGate.validateClean(cleanText);
console.log(`   isClean: ${isClean} (expected: true)`);
console.log(`   ✅ PASS: ${isClean ? 'YES' : 'NO'}\n`);

console.log('2.2: Dirty Text Validation');
const isDirty = FinalArticleCleanupGate.validateClean(dirtyText);
console.log(`   isClean: ${isDirty} (expected: false)`);
console.log(`   ✅ PASS: ${!isDirty ? 'YES' : 'NO'}\n`);

// ============================================================================
// TEST 3: ArticlePublishGate.validateBeforePublish()
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: ArticlePublishGate - Publish Validation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 3.1: Good quality article (should pass)
const goodArticle = `
Я помню тот день точно. Холодный апрельский снег падал на асфальт.
Её голос дрожал. Я смотрела на стекло кабинета. На улице шёл снег.
Я чувствовала ледяную боль в груди. Письмо было в руке. Бумага пахла старостью.

— Откуда ты это знаешь? — спросила я.
— Я не могу сказать. Но ты должна знать правду.
— Какую правду?
— Она никогда не любила тебя. Это была ложь.

Мне было холодно. Руки тряслись. Я смотрела на неё и не могла поверить.
Всё, что я знала о своей жизни, оказалось фальшивкой. Декорацией.
Я жила в чужом спектакле. Играла роль, которую мне написали.

Прошло три года. Вчера я снова увидела её. Она спросила те же вопросы.
И тогда я поняла: это не закончится никогда. Молчание передаётся по наследству.

Я не получила извинений. Но я получила это: я перестала ждать.
Плечи опустились. Дыхание стало ровным. Впервые за годы.

А вы смогли бы простить без извинений? Я до сих пор не знаю.
`.repeat(3); // Повторяем чтобы было > 8000 символов

console.log('3.1: Good Quality Article');
const goodValidation = ArticlePublishGate.validateBeforePublish(goodArticle);
console.log(`   canPublish: ${goodValidation.canPublish} (expected: true)`);
console.log(`   score: ${goodValidation.score}/100 (expected: >= 70)`);
console.log(`   errors: ${goodValidation.errors.length}`);
console.log(`   warnings: ${goodValidation.warnings.length}`);
console.log(`   ✅ PASS: ${goodValidation.canPublish && goodValidation.score >= 70 ? 'YES' : 'NO'}\n`);

// Test 3.2: Poor quality article (should fail)
const poorArticle = repeatedPhrasesArticle + metadataArticle + markdownArticle;

console.log('3.2: Poor Quality Article (repeated phrases + metadata + markdown)');
const poorValidation = ArticlePublishGate.validateBeforePublish(poorArticle);
console.log(`   canPublish: ${poorValidation.canPublish} (expected: false)`);
console.log(`   score: ${poorValidation.score}/100 (expected: < 70)`);
console.log(`   errors: ${poorValidation.errors.length}`);
if (poorValidation.errors.length > 0) {
  console.log(`   Error examples:`);
  poorValidation.errors.slice(0, 3).forEach((err, i) => {
    console.log(`      ${i + 1}. ${err}`);
  });
}
console.log(`   ✅ PASS: ${!poorValidation.canPublish && poorValidation.score < 70 ? 'YES' : 'NO'}\n`);

// Test 3.3: Too short article (should fail)
const shortArticle = 'Это очень короткая статья. Всего несколько слов.';

console.log('3.3: Too Short Article (< 8000 chars)');
const shortValidation = ArticlePublishGate.validateBeforePublish(shortArticle);
console.log(`   canPublish: ${shortValidation.canPublish} (expected: false)`);
console.log(`   score: ${shortValidation.score}/100`);
console.log(`   errors: ${shortValidation.errors.length}`);
console.log(`   ✅ PASS: ${!shortValidation.canPublish ? 'YES' : 'NO'}\n`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const testResults = {
  '1.1: Clean Article': !cleanAnalysis.hasIssues || cleanAnalysis.severity === 'low',
  '1.2: Repeated Phrases': repeatedAnalysis.hasIssues && repeatedAnalysis.severity === 'critical',
  '1.3: Metadata Comments': metadataAnalysis.hasIssues && metadataAnalysis.severity === 'critical',
  '1.4: Markdown Syntax': markdownAnalysis.hasIssues,
  '1.5: Orphaned Fragments': orphanedAnalysis.hasIssues,
  '2.1: Clean Text Validation': isClean,
  '2.2: Dirty Text Validation': !isDirty,
  '3.1: Good Quality Article': goodValidation.canPublish && goodValidation.score >= 70,
  '3.2: Poor Quality Article': !poorValidation.canPublish && poorValidation.score < 70,
  '3.3: Too Short Article': !shortValidation.canPublish
};

const passedTests = Object.values(testResults).filter(v => v).length;
const totalTests = Object.keys(testResults).length;

console.log(`Tests Passed: ${passedTests}/${totalTests}\n`);

Object.entries(testResults).forEach(([test, passed]) => {
  console.log(`   ${passed ? '✅' : '❌'} ${test}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`RESULT: ${passedTests === totalTests ? '🎉 ALL TESTS PASSED!' : `⚠️  ${totalTests - passedTests} tests failed`}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Exit with appropriate code
process.exit(passedTests === totalTests ? 0 : 1);
