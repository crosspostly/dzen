#!/usr/bin/env npx tsx

/**
 * 📸 Image Prompt Generator
 * 
 * Генерирует ПРОМПТЫ для картинок, не создавая сами картинки и текст.
 * 
 * Flow:
 * 1. Выбирает тему (как обычно)
 * 2. Генерирует outline статьи (структура,角度, эмоция)
 * 3. На основе outline генерирует детальные ПРОМПТЫ для 2-3 картинок
 * 4. Выводит промпты в консоль и файл
 * 5. Опционально генерирует реальные картинки (--generate-images)
 * 
 * Использование:
 *   npx tsx scripts/generateImagePrompt.ts
 *   npx tsx scripts/generateImagePrompt.ts --theme="My theme"
 *   npx tsx scripts/generateImagePrompt.ts --generate-images --count=3
 */

import path from 'path';
import fs from 'fs';
import { MultiAgentService } from '../services/multiAgentService';
import { ImageGeneratorService } from '../services/imageGeneratorService';
import { ImageProcessorService } from '../services/imageProcessorService';

const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  PROMPT: '📸',
  BRAIN: '🧠',
  TIMER: '⏱️',
  SAVE: '💾',
};

interface ImagePrompt {
  sceneNumber: number;
  sceneName: string;
  prompt: string;
  detailedPrompt: string;
  visualElements: string[];
  mood: string;
  cameraAngle: string;
}

function getArg(name: string, defaultValue?: string): string | undefined {
  const args = process.argv.slice(2);
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match?.split('=')[1] || defaultValue;
}

function getFlag(name: string): boolean {
  const args = process.argv.slice(2);
  return args.includes(`--${name}`);
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Генерирует ПРОМПТЫ для картинок на основе outline статьи
 * Не генерирует сами картинки или текст статьи!
 */
async function generateImagePrompts(outline: any): Promise<ImagePrompt[]> {
  const prompts: ImagePrompt[] = [];
  
  // Извлекаем информацию из outline для создания visual description
  const theme = outline.theme || '';
  const mainEmotion = outline.emotion || 'neutral';
  const targetAudience = outline.audience || 'general';
  const angle = outline.angle || 'storytelling';
  
  // Scene 1: Opening/Hook - интригующая сцена, которая зацепляет
  prompts.push({
    sceneNumber: 1,
    sceneName: 'Opening Hook',
    prompt: `Amateur lifestyle photography. Scene from the theme: "${theme}". Focus on emotional moment. ${mainEmotion} mood. For audience: ${targetAudience}. High quality, natural lighting.`,
    detailedPrompt: `Amateur lifestyle photography, 16:9 aspect ratio. Opening scene for article about "${theme}". Real people, authentic emotions, candid moment. ${mainEmotion} mood. Target audience: ${targetAudience}. Professional quality but looks authentic and not staged. Natural indoor lighting. Woman or family in realistic home setting.`,
    visualElements: [
      'Real person/people',
      'Emotional expression',
      'Authentic setting',
      'Natural lighting',
      'Candid moment',
      mainEmotion + ' mood'
    ],
    mood: mainEmotion,
    cameraAngle: 'Medium shot, slightly off-center for dynamic composition'
  });
  
  // Scene 2: Climax/Turning Point - напряженный момент
  prompts.push({
    sceneNumber: 2,
    sceneName: 'Turning Point',
    prompt: `Amateur lifestyle photography. Critical moment from the theme: "${theme}". Show tension/conflict/realization. Dramatic mood. Target: ${targetAudience}. Natural lighting, cinematic composition.`,
    detailedPrompt: `Amateur lifestyle photography, 16:9 aspect ratio. Dramatic turning point scene for the article. Real people experiencing crucial moment. ${mainEmotion === 'triumph' ? 'Tension turning to relief' : 'Emotional breakthrough'}. Target audience: ${targetAudience}. Medium shot, focused on faces/expressions. Soft dramatic lighting. Indoor or intimate setting.`,
    visualElements: [
      'Intense emotions',
      'Climactic moment',
      'Realistic expressions',
      'Dramatic lighting',
      'Central conflict resolved',
      'Turning point'
    ],
    mood: 'dramatic, ' + mainEmotion,
    cameraAngle: 'Close-up on expressions, slightly lower angle for emphasis'
  });
  
  // Scene 3: Resolution - заключение с позитивным результатом
  prompts.push({
    sceneNumber: 3,
    sceneName: 'Resolution',
    prompt: `Amateur lifestyle photography. Resolution of the theme: "${theme}". Show outcome/growth/triumph. Positive, uplifting mood. For ${targetAudience}. Warm lighting, hopeful atmosphere.`,
    detailedPrompt: `Amateur lifestyle photography, 16:9 aspect ratio. Final scene showing resolution and positive outcome. Real people looking relieved, happy, or transformed. ${mainEmotion} mood. Target audience: ${targetAudience}. Wide shot showing environment change or character transformation. Warm, natural lighting. Hopeful and uplifting atmosphere.`,
    visualElements: [
      'Positive outcome',
      'Character growth',
      'Warm atmosphere',
      'Resolution achieved',
      'Hopeful mood',
      'Natural joy/relief'
    ],
    mood: 'positive, uplifting, ' + mainEmotion,
    cameraAngle: 'Wide shot, open composition suggesting freedom/resolution'
  });
  
  return prompts;
}

async function main() {
  const args = process.argv.slice(2);
  const showHelp = args.includes('--help') || args.includes('-h') || args.length === 0;
  
  if (showHelp) {
    console.log(`
📸 Image Prompt Generator\n`);
    console.log(`Usage:`);
    console.log(`  npx tsx scripts/generateImagePrompt.ts [options]\n`);
    console.log(`Options:`);
    console.log(`  --theme=TEXT              Custom theme for article`);
    console.log(`  --angle=VALUE             Article angle (confession, advice, etc)`);
    console.log(`  --emotion=VALUE           Primary emotion (triumph, fear, joy, etc)`);
    console.log(`  --audience=TEXT           Target audience (Women 35-60, etc)`);
    console.log(`  --project=NAME            Project name (default: channel-1)`);
    console.log(`  --generate-images         Generate actual images from prompts`);
    console.log(`  --image-count=N           Number of images per prompt (default: 1)`);
    console.log(`  --image-delay=MS          Delay between image generations (default: 3000)`);
    console.log(`  --output=PATH             Output directory`);
    console.log(`  --verbose                 Detailed logs`);
    console.log(`  --help                    Show this help\n`);
    console.log(`Examples:`);
    console.log(`  # Generate only prompts (no images)`);
    console.log(`  npx tsx scripts/generateImagePrompt.ts\n`);
    console.log(`  # Generate prompts with custom theme`);
    console.log(`  npx tsx scripts/generateImagePrompt.ts --theme="My theme" --emotion=triumph\n`);
    console.log(`  # Generate prompts AND images`);
    console.log(`  npx tsx scripts/generateImagePrompt.ts --generate-images --image-count=2\n`);
    process.exit(0);
  }
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error(`${LOG.ERROR} GEMINI_API_KEY not set`);
    process.exit(1);
  }
  
  const theme = getArg('theme');
  const angle = getArg('angle', 'confession');
  const emotion = getArg('emotion', 'triumph');
  const audience = getArg('audience', 'Women 35-60');
  const project = getArg('project', 'channel-1');
  const generateImages = getFlag('generate-images');
  const imageCount = parseInt(getArg('image-count', '1'), 10);
  const imageDelay = parseInt(getArg('image-delay', '3000'), 10);
  const verbose = getFlag('verbose');
  const outputDir = getArg('output', './generated/image-prompts/');
  
  console.log(`\n${LOG.PROMPT} ============================================`);
  console.log(`${LOG.PROMPT} Image Prompt Generator`);
  console.log(`${LOG.PROMPT} ============================================\n`);
  
  const startTime = Date.now();
  
  try {
    // Step 1: Generate outline (without text)
    console.log(`${LOG.BRAIN} Step 1: Generating article outline...`);
    const multiAgentService = new MultiAgentService(apiKey);
    
    // Generate outline with theme
    const articleTheme = theme || `Auto-selected theme for ${audience}`;
    console.log(`   📝 Theme: "${articleTheme}"`);
    console.log(`   🎯 Angle: ${angle}`);
    console.log(`   💫 Emotion: ${emotion}`);
    console.log(`   👥 Audience: ${audience}`);
    
    // Call outline generation (not full article with episodes)
    const outlinePrompt = `
      Create article outline (NOT the full article) based on:
      - Theme: "${articleTheme}"
      - Angle: ${angle}
      - Primary emotion: ${emotion}
      - Target audience: ${audience}
      
      Return JSON with:
      {
        "theme": "...",
        "angle": "${angle}",
        "emotion": "${emotion}",
        "audience": "${audience}",
        "mainIdea": "Core concept (1 sentence)",
        "keyMoments": ["Moment 1", "Moment 2", "Moment 3"],
        "visualCues": ["Visual element for scene 1", "Visual element for scene 2", "Visual element for scene 3"]
      }
    `;
    
    if (verbose) console.log(`\n${LOG.INFO} Generating outline with Gemini API...\n`);
    
    // Use gemini directly to generate outline
    const geminiService = require('../services/geminiService').geminiService;
    const outlineResult = await geminiService.sendMessage(outlinePrompt);
    const outline = JSON.parse(outlineResult);
    
    console.log(`${LOG.SUCCESS} ✅ Outline generated\n`);
    
    if (verbose) {
      console.log(`   Main idea: ${outline.mainIdea}`);
      console.log(`   Key moments: ${outline.keyMoments.join(', ')}`);
      console.log('');
    }
    
    // Step 2: Generate image prompts
    console.log(`${LOG.PROMPT} Step 2: Generating image prompts...`);
    const imagePrompts = await generateImagePrompts(outline);
    console.log(`${LOG.SUCCESS} ✅ Generated ${imagePrompts.length} image prompts\n`);
    
    // Step 3: Display prompts
    console.log(`${LOG.PROMPT} ============================================`);
    console.log(`${LOG.PROMPT} IMAGE PROMPTS`);
    console.log(`${LOG.PROMPT} ============================================\n`);
    
    imagePrompts.forEach(prompt => {
      console.log(`${LOG.PROMPT} Scene ${prompt.sceneNumber}: ${prompt.sceneName}`);
      console.log(`   Mood: ${prompt.mood}`);
      console.log(`   Camera: ${prompt.cameraAngle}`);
      console.log(`   Visual elements: ${prompt.visualElements.join(', ')}`);
      console.log('');
      console.log(`   Quick prompt:`);
      console.log(`   "${prompt.prompt}"`);
      console.log('');
      console.log(`   Detailed prompt:`);
      console.log(`   "${prompt.detailedPrompt}"`);
      console.log('');
    });
    
    // Step 4: Save prompts to file
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const promptsFile = path.join(outputDir, `prompts_${timestamp}.json`);
    
    fs.writeFileSync(promptsFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      theme: articleTheme,
      angle,
      emotion,
      audience,
      outline,
      imagePrompts
    }, null, 2));
    
    console.log(`${LOG.SAVE} Prompts saved: ${promptsFile}\n`);
    
    // Step 5: Optionally generate images
    if (generateImages) {
      console.log(`${LOG.PROMPT} Step 3: Generating images from prompts...\n`);
      
      const imageGenerator = new ImageGeneratorService();
      const imageProcessor = new ImageProcessorService();
      const imagesDir = path.join(outputDir, `images_${timestamp}`);
      
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      let generatedCount = 0;
      
      for (const imgPrompt of imagePrompts) {
        console.log(`${LOG.PROMPT} Scene ${imgPrompt.sceneNumber}: ${imgPrompt.sceneName}`);
        
        for (let i = 1; i <= imageCount; i++) {
          try {
            if (verbose) console.log(`   Generating image ${i}/${imageCount}...`);
            
            const base64Image = await imageGenerator.generateVisual(imgPrompt.detailedPrompt);
            if (!base64Image) throw new Error('Generation returned null');
            
            const processedBuffer = await imageProcessor.processImage(base64Image);
            
            const filename = `scene_${imgPrompt.sceneNumber}_image_${i}.jpg`;
            const filepath = path.join(imagesDir, filename);
            fs.writeFileSync(filepath, processedBuffer, 'binary');
            
            console.log(`   ✅ ${filename} (${(processedBuffer.length / 1024).toFixed(1)} KB)`);
            generatedCount++;
            
            if (i < imageCount) {
              await new Promise(resolve => setTimeout(resolve, imageDelay));
            }
          } catch (error) {
            console.log(`   ❌ Failed: ${(error as Error).message}`);
          }
        }
        console.log('');
      }
      
      console.log(`${LOG.SUCCESS} ✅ Generated ${generatedCount} images`);
      console.log(`${LOG.SAVE} Images saved: ${imagesDir}\n`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`${LOG.SUCCESS} ============================================`);
    console.log(`${LOG.SUCCESS} Complete!`);
    console.log(`${LOG.SUCCESS} ============================================`);
    console.log(``);
    console.log(`📊 Summary:`);
    console.log(`   ✅ Prompts generated: ${imagePrompts.length}`);
    console.log(`   ${generateImages ? '✅' : '⊘'} Images generated: ${generateImages ? imagePrompts.length * imageCount : 'disabled (use --generate-images)'}`);
    console.log(`   📁 Output: ${path.resolve(outputDir)}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log('');
    
  } catch (error) {
    console.error(`\n${LOG.ERROR} Error:`, (error as Error).message);
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
