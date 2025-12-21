/**
 * Integration test for Anti-Detection v2.0
 * Tests all Phase 2 components: Perplexity, Burstiness, Skaz, AdversarialGatekeeper, Visual Sanitization
 */

import { AntiDetectionEngine } from './services/antiDetection/antiDetectionEngine';
import { LongFormArticle } from './types/ContentArchitecture';

// Sample test content (AI-generated, needs anti-detection transformation)
const testArticle: LongFormArticle = {
  title: "Искуственный интеллект изменит вашу жизнь завтра",
  lede: "Искуственный интеллект быстро развивается. Многие думают об этом каждый день. Важно понимать, что будет завтра.",
  episodes: [
    {
      title: "Начало путешествия",
      content: "Я вижу, как мир меняется. Мы видим новые технологии каждый день. Искуственный интеллект делает много вещей. Люди думают, что будет завтра. Это важно для всех нас. Мы должны понимать, что происходит. Это очень важно для нашего будущего. "
    },
    {
      title: "Взгляд в будущее",
      content: "Мы видим много примеров. Машины делают то, что делали люди. Это интересно, но и пугает. Но это нормально чувствовать так."
    }
  ],
  finale: "В мире искуственного интеллекта главное оставаться человеком.",
  images: ["/path/to/image1.jpg", "/path/to/image2.jpg"]
};

async function runAntiDetectionTest() {
  console.log('🔍 Starting Anti-Detection v2.0 Integration Test');
  console.log('='.repeat(60));
  
  // Create engine with visual sanitization disabled for testing
  const engine = new AntiDetectionEngine({
    perplexity: { enabled: true, targetScore: 3.0 },
    burstiness: { enabled: true, targetStdDev: 6.5 },
    skaz: { enabled: true, particleFrequency: 10 },
    redTeam: { enabled: true, minScore: 80 },
    visual: { enabled: false } // Disabled for test
  });

  try {
    console.log('\n📊 Step 1: Analyze initial metrics');
    const initialText = testArticle.lede + ' ' + testArticle.episodes.map(ep => ep.content).join(' ');
    const initialMetrics = await engine.analyzeMetrics(initialText);
    
    console.log('Perplexity:', initialMetrics.perplexity.score.toFixed(2));
    console.log('Burstiness:', initialMetrics.burstiness.standardDeviation.toFixed(2));

    console.log('\n🎯 Step 2: Process through anti-detection pipeline');
    const { article: enhancedArticle, result } = await engine.process(testArticle);
    
    console.log('\n✅ Step 3: Results');
    console.log('Perplexity:', result.metrics.perplexity.score.toFixed(2));
    console.log('Burstiness:', result.metrics.burstiness.stdDev.toFixed(2));
    console.log('Skaz Score:', result.metrics.skazScore);
    console.log('AI Risk:', result.metrics.aiDetectionRisk + '%');
    console.log('Quality Score:', result.confidence + '/100');
    
    const success = result.passed && result.metrics.aiDetectionRisk < 15;
    console.log('\n🎉 Test:', success ? 'PASSED' : 'FAILED');
    
    return success;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

runAntiDetectionTest().then(success => process.exit(success ? 0 : 1));