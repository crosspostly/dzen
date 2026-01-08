/**
 * 🧪 Test v7.0 Simplified Generation Mode
 * 
 * Test the simplified generation with:
 * - No anti-detection
 * - No cleanup gates
 * - First person narrative
 * - Clean, ready-to-publish output
 */

import { MultiAgentService } from './services/multiAgentService';

async function testSimplifiedMode() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   🎭 ZenMaster v7.0 - Simplified Mode Test                     ║
╚════════════════════════════════════════════════════════════════╝

🚀 CONFIGURATION:
   Mode: SIMPLIFIED
   Anti-Detection: DISABLED (no Phase 2)
   Cleanup Gates: DISABLED (direct output)
   First Person: ENFORCED (всегда от первого лица)
`);

  // Create service with simplified options
  const service = new MultiAgentService(undefined, {
    maxChars: 19000,
    useAntiDetection: false,  // 🚫 Disable Phase 2
    skipCleanupGates: true   // 🚫 Skip cleanup gates
  });

  const startTime = Date.now();

  try {
    const article = await service.generateLongFormArticle({
      theme: "Я нашла своё лицо на чужом фото. Теперь я знаю правду",
      angle: "confession",
      emotion: "shock",
      audience: "Women 35-60",
      maxChars: 19000
    });

    const duration = Date.now() - startTime;

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║   ✅ GENERATION COMPLETE                                            ║
╚════════════════════════════════════════════════════════════════╝

📊 METRICS:
   📰 Title: ${article.title}
   📏 Total chars: ${article.metadata.totalChars}
   🎬 Episodes: ${article.metadata.episodeCount}
   ⏱️  Reading time: ${article.metadata.totalReadingTime} min
   ⚡ Generation time: ${(duration / 1000).toFixed(1)}s
   🧹 Phase 2 applied: ${article.phase2Applied ? 'Yes' : 'No (simplified)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 LEDE (${article.lede.length} chars):
${article.lede.substring(0, 500)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EPISODE 1 (${article.episodes[0]?.charCount || 0} chars):
${article.episodes[0]?.content.substring(0, 600) || 'N/A'}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EPISODE 2 (${article.episodes[1]?.charCount || 0} chars):
${article.episodes[1]?.content.substring(0, 600) || 'N/A'}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 FINALE (${article.finale.length} chars):
${article.finale.substring(0, 500)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ FIRST PERSON CHECK:
`);

    // Check for first-person perspective
    const firstPersonIndicators = ['я увидел', 'я увидела', 'мне показалось', 'я думал', 'я думала', 'моя', 'мой', 'мне'];
    const thirdPersonIndicators = ['героиня увидела', 'персонаж почувствовал', 'она сказала', 'он ответил'];
    
    const fullText = article.processedContent.toLowerCase();
    const hasFirstPerson = firstPersonIndicators.some(ind => fullText.includes(ind));
    const hasThirdPerson = thirdPersonIndicators.some(ind => fullText.includes(ind));
    
    console.log(`   ✅ First person found: ${hasFirstPerson}`);
    console.log(`   ❌ Third person found: ${hasThirdPerson}`);
    console.log(`   📊 Perspective: ${hasFirstPerson && !hasThirdPerson ? 'CORRECT (1st person)' : 'CHECK NEEDED'}`);

    // Check for artifacts
    const artifacts = ['[note]', '[TODO]', '[pause]', '**', '##', '```'];
    const hasArtifacts = artifacts.some(art => fullText.includes(art));
    console.log(`   🧹 Artifacts found: ${hasArtifacts ? 'Yes (check text)' : 'No (clean)'}`);

    // Check for repeated phrases
    const parasitePhrases = ['вот в чём дело', 'может быть', 'одним словом'];
    const repeatedCounts = parasitePhrases.filter(phrase => 
      (fullText.match(new RegExp(phrase, 'gi')) || []).length > 3
    );
    console.log(`   🔁 Repeated phrases: ${repeatedCounts.length > 0 ? repeatedCounts.join(', ') : 'None (clean)'}`);

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 ARTICLE OUTPUT (first 3000 chars):
${article.processedContent.substring(0, 3000)}...

[... ${article.processedContent.length - 3000} more chars ...]
`);

    // Save to file
    const fs = require('fs');
    const outputPath = `./test-v7-simplified-${Date.now()}.md`;
    fs.writeFileSync(
      outputPath,
      `# ${article.title}\n\n` + article.processedContent,
      'utf-8'
    );
    console.log(`💾 Saved to: ${outputPath}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed:`, error);
    throw error;
  }
}

// Run test
testSimplifiedMode()
  .then(() => console.log('✅ Test completed successfully\n'))
  .catch(err => console.error('\n❌ Test failed:', err))
  .finally(() => process.exit(0));
