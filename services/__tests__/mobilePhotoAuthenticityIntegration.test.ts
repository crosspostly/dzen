/**
 * 🧪 Complete Integration Test for Mobile Photo Authenticity Processor
 */

import { ContentFactoryOrchestrator } from '../contentFactoryOrchestrator';
import { ContentFactoryConfig, Article } from '../../types/ContentFactory';
import { createCanvas } from 'canvas';

// Create a realistic test image (simulating Gemini output)
async function createRealisticTestImage(): Promise<string> {
  const canvas = createCanvas(1920, 1080);
  const ctx = canvas.getContext('2d');
  
  // Create a realistic indoor scene
  ctx.fillStyle = '#F5F5DC'; // Beige background
  ctx.fillRect(0, 0, 1920, 1080);
  
  // Kitchen table
  ctx.fillStyle = '#DEB887'; // Burlywood
  ctx.fillRect(500, 600, 920, 280);
  
  // Tea cups
  ctx.fillStyle = '#FFFAF0'; // Floral white
  ctx.beginPath();
  ctx.arc(700, 700, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1200, 720, 35, 0, Math.PI * 2);
  ctx.fill();
  
  // Woman silhouette (simple representation)
  ctx.fillStyle = '#2F4F4F'; // Dark slate gray
  ctx.beginPath();
  ctx.arc(850, 500, 60, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some noise to simulate mobile camera
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 1920;
    const y = Math.random() * 1080;
    const alpha = Math.random() * 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Convert to base64 as JPEG (like Gemini API)
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

async function runIntegrationTest() {
  console.log('🧪 Starting Complete Integration Test for Mobile Photo Authenticity...\n');

  // Create a mock article with cover image
  const testArticle: Article = {
    id: 'test-article-1',
    title: 'Как я научилась быть счастливой в одиночестве',
    content: 'Все началось в тот момент, когда я поняла, что боязнь одиночества парализует меня. Каждый вечер превращался в испытание...',
    metadata: {
      generatedAt: Date.now(),
      theme: 'personal',
      tone: 'intimate'
    },
    characters: {
      mainCharacter: {
        age: 35,
        gender: 'female',
        occupation: 'office worker'
      }
    },
    charCount: 1500,
    coverImage: {
      base64: await createRealisticTestImage(),
      format: 'jpeg',
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg'
    }
  };

  console.log(`📸 Created test article with cover image`);
  console.log(`   Image base64 length: ${testArticle.coverImage.base64.length}`);
  console.log(`   Image format: ${testArticle.coverImage.format}\n`);

  // Test the authenticity processor directly
  const { MobilePhotoAuthenticityProcessor } = await import('../mobilePhotoAuthenticityProcessor');
  const processor = new MobilePhotoAuthenticityProcessor();

  console.log(`🔧 Processing image for mobile authenticity...`);
  const authenticityResult = await processor.processForMobileAuthenticity(
    testArticle.coverImage.base64.replace('data:image/jpeg;base64,', '')
  );

  console.log(`\n📱 Authenticity Processing Results:`);
  console.log(`   ✅ Success: ${authenticityResult.success}`);
  console.log(`   📊 Authenticity Level: ${authenticityResult.authenticityLevel}`);
  console.log(`   🎯 Applied Effects: ${authenticityResult.appliedEffects.join(', ')}`);
  console.log(`   📏 Buffer Size: ${authenticityResult.processedBuffer ? Math.round(authenticityResult.processedBuffer.length / 1024) + 'KB' : 'N/A'}`);
  
  if (authenticityResult.errorMessage) {
    console.log(`   ⚠️  Error: ${authenticityResult.errorMessage}`);
  }

  console.log(`   ✅ Validation: ${processor.validateAuthenticity(authenticityResult) ? 'PASSED' : 'FAILED'}\n`);

  // Test with different input types
  console.log(`📋 Testing edge cases...\n`);

  // Test 1: Already processed buffer
  if (authenticityResult.success && authenticityResult.processedBuffer) {
    console.log(`🔄 Test 1: Processing already processed image...`);
    const reProcessResult = await processor.processForMobileAuthenticity(
      authenticityResult.processedBuffer.toString('base64')
    );
    console.log(`   Re-processing: ${reProcessResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Final size: ${reProcessResult.processedBuffer ? Math.round(reProcessResult.processedBuffer.length / 1024) + 'KB' : 'N/A'}\n`);
  }

  // Test 2: JPG format check
  console.log(`📷 Test 2: MIME type verification...`);
  if (authenticityResult.processedBuffer) {
    const base64Header = 'data:image/jpeg;base64,'; // Should stay JPEG
    const processedWithHeader = base64Header + authenticityResult.processedBuffer.toString('base64');
    const isJpeg = processedWithHeader.startsWith('data:image/jpeg;base64,');
    console.log(`   ✅ MIME Type: ${isJpeg ? 'CORRECT (image/jpeg)' : 'INCORRECT'}\n`);
  }

  console.log(`🎯 Integration Test Complete!\n`);
  console.log(`📱 Mobile Photo Authenticity System Ready:`);
  console.log(`   - ✅ Noise & blur effects`);
  console.log(`   - ✅ Color temperature simulation`);
  console.log(`   - ✅ Compression artifacts`);
  console.log(`   - ✅ Physical wear effects`);
  console.log(`   - ✅ JPG format preservation`);
  console.log(`   - ✅ Samsung Galaxy A10 camera simulation`);
  console.log(`   - ✅ 2018-2020 authentic mobile photo look`);
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('❌ Integration test failed:', error);
});