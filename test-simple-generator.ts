/**
 * 🧪 Test Simple Article Generator v7.0
 * 
 * Test the simplified generation system:
 * - No anti-detection
 * - No cleanup gates
 * - Just clean, ready-to-publish articles
 */

import { SimpleArticleGenerator } from './services/simpleArticleGenerator';

async function testSimpleGeneration() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   🎭 Simple Generator v7.0 - Test                             ║
╚════════════════════════════════════════════════════════════════╝
`);

  const generator = new SimpleArticleGenerator(undefined, {
    useAntiDetection: false, // 🚫 NO anti-detection
    includeDevelopment: false,
    includeClimax: false,
    includeResolution: false,
    episodeCount: 10,
    maxChars: 19000
  });

  try {
    const article = await generator.generateArticle({
      theme: "Я нашла своё лицо на чужом фото. Теперь я знаю правду",
      angle: "confession",
      emotion: "shock",
      audience: "Women 35-60"
    });

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║   ✅ GENERATION COMPLETE                                       ║
╚════════════════════════════════════════════════════════════════╝

📰 TITLE: ${article.title}

📊 METRICS:
   - Total chars: ${article.metadata.totalChars}
   - Episodes: ${article.metadata.episodeCount}
   - Reading time: ${article.metadata.totalReadingTime} min
   - Phase 2 applied: ${article.phase2Applied ? 'Yes' : 'No'}

📝 LEDE (${article.lede.length} chars):
${article.lede.substring(0, 300)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EPISODE 1 (${article.episodes[0]?.charCount || 0} chars):
${article.episodes[0]?.content.substring(0, 400) || 'N/A'}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 EPISODE 2 (${article.episodes[1]?.charCount || 0} chars):
${article.episodes[1]?.content.substring(0, 400) || 'N/A'}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 FINALE (${article.finale.length} chars):
${article.finale.substring(0, 300)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━══════════════════

✨ FULL ARTICLE:
${article.processedContent.substring(0, 2000)}...
[... ${article.processedContent.length - 2000} more chars ...]
`);

    // Save to file
    const fs = require('fs');
    const outputPath = `./test-simple-article-${Date.now()}.md`;
    fs.writeFileSync(
      outputPath,
      `# ${article.title}\n\n` + article.processedContent,
      'utf-8'
    );
    console.log(`💾 Saved to: ${outputPath}`);

  } catch (error) {
    console.error(`\n❌ Test failed:`, error);
    throw error;
  }
}

// Run test
testSimpleGeneration()
  .then(() => console.log('\n✅ Test completed successfully'))
  .catch(err => console.error('\n❌ Test failed:', err))
  .finally(() => process.exit(0));
