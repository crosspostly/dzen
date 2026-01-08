
import { examplesService } from './services/examplesService';
import path from 'path';

async function testLoading() {
  const jsonPath = path.join(process.cwd(), 'parsed_examples.json');
  console.log(`Loading from: ${jsonPath}`);
  
  const examples = examplesService.loadParsedExamples(jsonPath);
  
  console.log(`Loaded count: ${examples.length}`);
  
  if (examples.length > 0) {
    const top3 = examplesService.selectBestExamples(examples, 3);
    console.log('\n--- TOP 3 EXAMPLES (by views) ---');
    top3.forEach((ex, i) => {
      console.log(`${i+1}. "${ex.title}"`);
      console.log(`   Views: ${ex.metadata?.views?.toLocaleString()}`);
      console.log(`   Excerpt: ${ex.content.substring(0, 100)}...`);
    });
  } else {
    console.error('No examples loaded!');
  }
}

testLoading();
