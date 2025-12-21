/**
 * Integration test for Anti-Detection v2.0
 * Tests all Phase 2 components: Perplexity, Burstiness, Skaz, AdversarialGatekeeper, Visual Sanitization
 */

import { AntiDetectionEngine } from './services/antiDetection/antiDetectionEngine';
import { LongFormArticle } from './types/ContentArchitecture';

// Sample test content (AI-generated text that needs anti-detection transformation)
// Using more repetitive patterns to trigger transformations
const testArticle: LongFormArticle = {
  title: "Искуственный интеллект и будущее",
  lede: "Искуственный интеллект быстро развивается и делает много вещей. Искуственный интеллект делает работу людей. Люди думают об искуственном интеллекте каждый день. Важно понимать, что будет завтра.",
  episodes: [
    {
      title: "Технологическая революция",
      content: "Я вижу, как мир меняется каждый день. Я вижу, как технологии делают мир другим. Мы видим новые технологии постоянно. Мы видим, как все меняется вокруг. Искуственный интеллект делает много вещей, которые люди делали раньше. Искуственный интеллект помогает людям в работе. Он делает то, что делают люди. Он помогает людям каждый день."
    },
    {
      title: "Будущее и опасения",
      content: "Мы видим много примеров вокруг нас. Мы видим, как мир меняется. Машины делают то, что делали люди раньше. Машины помогают людям в работе. Это интересно, но и пугает многих людей. Это нормально чувствовать волнение.",
      
    }
  ],
  finale: "В мире искуственного интеллекта главное оставаться человеком и помнить о важных вещах в жизни. Люди должны помнить, что делает их людьми.",
  images: ["/path/to/image1.jpg", "/path/to/image2.jpg"]
};

async function runAntiDetectionTest() {
  console.log('🔍 Starting Anti-Detection v2.0 Integration Test');
  console.log('='.repeat(60));
  
  // Create engine with visual sanitization disabled for testing
  const engine = new AntiDetectionEngine({
    perplexity: { enabled: true, targetScore: 3.0, maxIterations: 3 },
    burstiness: { enabled: true, targetStdDev: 6.5 },
    skaz: { enabled: true, particleFrequency: 12 },
    redTeam: { enabled: true, minScore: 75 },
    visual: { enabled: false } // Disabled for test
  });

  try {
    console.log('\n📊 Step 1: Analyze initial metrics');
    // Use exact text that will be processed by engine
    const lede = testArticle.lede;
    const episodeContent = testArticle.episodes.map(ep => ep.content).join(' ');
    const finale = testArticle.finale;
    
    // Replicate the engine's concatenateArticle logic exactly
    const initialText = [lede, episodeContent, finale].filter(Boolean).join('\n\n');
    
    // Set minimum threshold for empty/short text
    if (initialText.length < 100) {
      console.log('⚠️  Warning: Text too short for meaningful analysis');
    }
    
    const initialMetrics = await engine.analyzeMetrics(initialText);
    
    console.log('Initial Text Length:', initialText.length, 'chars');
    console.log('Perplexity:', initialMetrics.perplexity.score.toFixed(2));
    console.log('Unique Words:', initialMetrics.perplexity.wordFrequency.size);
    console.log('Burstiness:', initialMetrics.burstiness.standardDeviation.toFixed(2));
    console.log('Sentence Count:', initialMetrics.burstiness.sentenceLengths.length);

    console.log('\n🎯 Step 2: Process through anti-detection pipeline');
    const { article: enhancedArticle, result } = await engine.process(testArticle);
    
    console.log('\n✅ Step 3: Results');
    console.log('Perplexity:', result.metrics.perplexity.score.toFixed(2));
    console.log('Burstiness:', result.metrics.burstiness.stdDev.toFixed(2));
    console.log('Skaz Score:', result.metrics.skazScore);
    console.log('AI Risk:', result.metrics.aiDetectionRisk + '%');
    console.log('Quality Score:', result.confidence + '/100');
    console.log('Modifications:', JSON.stringify(result.modifications, null, 2));
    
    const success = result.passed && result.metrics.aiDetectionRisk < 15;
    const improved = result.metrics.perplexity.score > initialMetrics.perplexity.score;
    
    console.log('\n🎉 Test Result:', success ? '✅ PASSED' : '❌ FAILED');
    console.log('Improvement Detected:', improved ? '✅ YES' : '❌ NO');
    
    if (!success) {
      console.log('\n💡 Debugging Info:');
      if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
      }
      if (result.recommendations.length > 0) {
        console.log('Recommendations:', result.recommendations);
      }
    }
    
    return success && improved;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

runAntiDetectionTest().then(success => process.exit(success ? 0 : 1));