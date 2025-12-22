/**
 * 🧪 Tests for Mobile Photo Authenticity Processor
 */

import { MobilePhotoAuthenticityProcessor, AuthenticityResult } from '../mobilePhotoAuthenticityProcessor';
import { createCanvas, loadImage } from 'canvas';

// Create a simple test image
async function createTestImage(): Promise<string> {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');
  
  // Draw a simple scene
  ctx.fillStyle = '#87CEEB'; // Sky blue
  ctx.fillRect(0, 0, 800, 450);
  
  ctx.fillStyle = '#228B22'; // Forest green
  ctx.fillRect(0, 300, 800, 150);
  
  ctx.fillStyle = '#8B4513'; // Saddle brown
  ctx.fillRect(100, 250, 60, 100);
  ctx.fillStyle = '#228B22';
  ctx.beginPath();
  ctx.arc(130, 240, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Convert to base64
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
  return buffer.toString('base64');
}

async function runTests() {
  console.log('🧪 Starting Mobile Photo Authenticity Processor Tests...\n');

  const processor = new MobilePhotoAuthenticityProcessor();

  try {
    // Test 1: Basic functionality
    console.log('📸 Test 1: Basic authenticity processing...');
    const testImage = await createTestImage();
    const result = await processor.processForMobileAuthenticity(testImage);
    
    console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Authenticity Level: ${result.authenticityLevel}`);
    console.log(`   Applied Effects: ${result.appliedEffects.join(', ')}`);
    console.log(`   Buffer Size: ${result.processedBuffer ? Math.round(result.processedBuffer.length / 1024) + 'KB' : 'N/A'}`);
    
    if (result.errorMessage) {
      console.log(`   Error: ${result.errorMessage}`);
    }
    
    const isValid = processor.validateAuthenticity(result);
    console.log(`   Validation: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

    // Test 2: Edge case - empty input
    console.log('📸 Test 2: Edge case - empty input...');
    const emptyResult = await processor.processForMobileAuthenticity('');
    console.log(`   Empty Input Result: ${emptyResult.success ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    // Test 3: Edge case - invalid base64
    console.log('📸 Test 3: Edge case - invalid base64...');
    const invalidResult = await processor.processForMobileAuthenticity('invalid_base64_data');
    console.log(`   Invalid Input Result: ${invalidResult.success ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    console.log('🎯 All tests completed!');

  } catch (error) {
    console.error('❌ Test execution failed:', (error as Error).message);
  }
}

// Run tests
runTests();