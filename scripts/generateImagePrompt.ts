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
 * 🎨 VARIABLE SCENES DATABASE
 * Provides diverse scene descriptions to avoid repetitive images
 */
const SCENE_VARIATIONS = {
  // Scene 1: Problem/Conflict specific visual elements
  scene1Elements: [
    'Person looking worried/confused',
    'Tense atmosphere',
    'Closed body language',
    'Uncomfortable setting',
    'Hidden emotions visible',
    'Dark/moody lighting',
    'Isolated figure',
    'Unresolved tension',
    'Inner struggle on face',
    'Unanswered questions in eyes'
  ],

  // Scene 2: Climax/Action specific visual elements
  scene2Elements: [
    'Dynamic action/movement',
    'Intense emotional peak',
    'Dramatic lighting contrast',
    'Action-focused composition',
    'Tension at breaking point',
    'Decisive moment frozen',
    'Energy and movement',
    'Confrontation or realization',
    'Peak emotional expression',
    'Dramatic gesture or action'
  ],

  // Scene 3: Resolution/Transformation specific visual elements
  scene3Elements: [
    'Calm peaceful expression',
    'Open body language',
    'Warm golden lighting',
    'Transformed environment',
    'Hope and acceptance',
    'Growth and strength visible',
    'New beginning atmosphere',
    'Released tension',
    'Smile of relief',
    'New perspective visible'
  ],

  // Diverse locations
  locations: [
    'Kitchen with morning light',
    'Living room with soft shadows',
    'Bedroom with evening glow',
    'Balcony overlooking city',
    'Bathroom with privacy',
    'Hallway with closed doors',
    'Couch in cozy corner',
    'Window seat with view',
    'Table by the window',
    'Quiet corner with books'
  ],

  // Diverse camera angles
  angles: [
    'Eye-level medium shot',
    'Close-up on face',
    'Wide establishing shot',
    'Over-the-shoulder view',
    'Low angle looking up',
    'High angle looking down',
    'Through doorway',
    'Reflexion in mirror',
    'Candid from corner',
    'Intimate close-up'
  ]
};

/**
 * Get random element from array
 */
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 🎯 GENERATE COVER IMAGE PROMPT - ONE universal function
 * Creates the BEST single cover image prompt based on article content
 */
function generateCoverPrompt(params: {
  title: string;
  ledeText: string;
  theme: string;
  emotion: string;
  audience: string;
}): {
  sceneNumber: number;
  sceneName: string;
  prompt: string;
  detailedPrompt: string;
  visualElements: string[];
  mood: string;
  cameraAngle: string;
} {
  const { title, ledeText, theme, emotion, audience } = params;

  // Smart analysis of article content
  const lowerLede = ledeText.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Detect keywords for better matching
  const hasConflict = /проблем|страх|тревог|боле|умер|потерял|измен|развод|скандал/i.test(lowerLede + lowerTitle);
  const hasResolution = /счасть|радость|любовь|побед|простил|принял|нашел|смог/i.test(lowerLede + lowerTitle);
  const hasReflection = /думал|вспомнил|понял|осознал|решил/i.test(lowerLede + lowerTitle);

  // Select appropriate scene elements based on content
  let sceneElements: string[];
  let moodOverride: string;
  let sceneName: string;

  if (hasConflict && !hasResolution) {
    // Opening/Problem focused
    sceneElements = SCENE_VARIATIONS.scene1Elements;
    moodOverride = `introspective, ${emotion}`;
    sceneName = 'Cover: Setting the Scene';
  } else if (hasResolution) {
    // Resolution focused
    sceneElements = SCENE_VARIATIONS.scene3Elements;
    moodOverride = `peaceful, hopeful, ${emotion}`;
    sceneName = 'Cover: The Resolution';
  } else {
    // Balanced - use reflection elements
    sceneElements = [...SCENE_VARIATIONS.scene1Elements.slice(0, 5), ...SCENE_VARIATIONS.scene3Elements.slice(0, 5)];
    moodOverride = `reflective, ${emotion}`;
    sceneName = 'Cover: The Story';
  }

  // Select diverse components for variety
  const location = getRandomElement(SCENE_VARIATIONS.locations);
  const angle = getRandomElement(SCENE_VARIATIONS.angles);
  const elem1 = getRandomElement(sceneElements);
  const elem2 = getRandomElement(sceneElements);

  // Build the perfect cover prompt
  const prompt = `Cover image for "${title}". ${moodOverride} mood. ${audience}. Authentic domestic scene. Natural lighting.`;

  const detailedPrompt = `HYPERREALISTIC COVER PHOTO for article "${title}":

${location}. Real person (${audience.includes('Women') ? 'woman' : 'person'} 35-50 years old) with authentic ${emotion} expression.

VISUAL ELEMENTS:
- ${elem1}
- ${elem2}
- Authentic ${moodOverride} mood
- Natural window light creating soft shadows
- Real domestic Russian interior (not staged)
- Amateur smartphone photography aesthetic

CAMERA: ${angle}

EMOTION: Show the ${emotion} feeling authentically - this is the COVER that represents the entire story.

STYLE: "Like a photo from neighbor's WhatsApp" - authentic, slightly imperfect, real life. 4K detail but amateur aesthetic.

🔥 CRITICAL: NO text, watermarks, or overlays! Just the emotional scene.`;

  return {
    sceneNumber: 1,
    sceneName,
    prompt,
    detailedPrompt,
    visualElements: [
      elem1,
      elem2,
      location,
      `${moodOverride} atmosphere`,
      'Authentic setting'
    ],
    mood: moodOverride,
    cameraAngle: angle
  };
}

/**
 * Генерирует РАЗНЫЕ промпты для трёх сцен на основе outline статьи
 * Каждая сцена визуально и эмоционально отличается от других!
 */
async function generateImagePrompts(outline: any): Promise<ImagePrompt[]> {
  const prompts: ImagePrompt[] = [];

  // Извлекаем информацию из outline
  const theme = outline.theme || '';
  const mainEmotion = outline.emotion || 'neutral';
  const targetAudience = outline.audience || 'general';
  const keyMoments = outline.keyMoments || [];
  const visualCues = outline.visualCues || [];

  // Get random variations for uniqueness
  const location1 = getRandomElement(SCENE_VARIATIONS.locations);
  const location2 = getRandomElement(SCENE_VARIATIONS.locations);
  const location3 = getRandomElement(SCENE_VARIATIONS.locations);

  // 🎬 SCENE 1: OPENING - Problem/Conflict hook
  // Фокус на НАЧАЛЬНОЙ эмоции и проблеме
  prompts.push({
    sceneNumber: 1,
    sceneName: 'Opening: The Problem',
    prompt: `Real person in ${location1}. ${mainEmotion} emotion. Worried expression. Natural indoor lighting. Candid authentic moment. For ${targetAudience}.`,
    detailedPrompt: `HYPERREALISTIC PHOTO: ${location1}. Real person (${targetAudience.includes('Women') ? 'woman' : 'person'} 35-50 years old) sitting alone, looking ${mainEmotion}. ${getRandomElement(SCENE_VARIATIONS.scene1Elements)}. ${getRandomElement(SCENE_VARIATIONS.scene1Elements)}. Soft natural window light creating shadows. Amateur smartphone photo aesthetic. AUTHENTIC EMOTION: Show the inner conflict and questions. This is the START of the story - the problem is introduced.`,
    visualElements: [
      getRandomElement(SCENE_VARIATIONS.scene1Elements),
      getRandomElement(SCENE_VARIATIONS.scene1Elements),
      'Atmospheric lighting',
      'Authentic setting',
      `${location1} environment`
    ],
    mood: `introspective, ${mainEmotion}`,
    cameraAngle: getRandomElement(SCENE_VARIATIONS.angles)
  });

  // 🎬 SCENE 2: TURNING POINT - Climax/Action
  // Полная противоположность сцене 1 - ДЕЙСТВИЕ и напряжение!
  const oppositeEmotion = getOppositeEmotion(mainEmotion);
  prompts.push({
    sceneNumber: 2,
    sceneName: 'Turning Point: The Climax',
    prompt: `DRAMATIC moment in ${location2}. Action, tension, realization. Different from scene 1! ${oppositeEmotion} emotion. Cinematic lighting. For ${targetAudience}.`,
    detailedPrompt: `HYPERREALISTIC PHOTO: ${location2}. Real person experiencing a CRUCIAL MOMENT - the turning point of the story. ${getRandomElement(SCENE_VARIATIONS.scene2Elements)}. ${getRandomElement(SCENE_VARIATIONS.scene2Elements)}. COMPLETELY DIFFERENT FROM SCENE 1 in mood and energy! Action-focused, dramatic. Natural light but with more contrast and intensity. Amateur smartphone photo. AUTHENTIC: Show the peak emotion - tension, realization, or decisive action.`,
    visualElements: [
      'Dramatic action moment',
      getRandomElement(SCENE_VARIATIONS.scene2Elements),
      getRandomElement(SCENE_VARIATIONS.scene2Elements),
      'Cinematic lighting',
      'Tension and energy'
    ],
    mood: `dramatic, intense, ${oppositeEmotion}`,
    cameraAngle: getRandomElement(['Close-up on face showing emotion', 'Action shot', 'Dramatic low angle', 'Through doorway perspective'])
  });

  // 🎬 SCENE 3: RESOLUTION - Transformation
  // Полная трансформация от сцены 1 - СПОКОЙСТВИЕ и надежда!
  const positiveEmotion = getPositiveEmotion(mainEmotion);
  prompts.push({
    sceneNumber: 3,
    sceneName: 'Resolution: New Beginning',
    prompt: `TRANSFORMED person in ${location3}. Peaceful, hopeful. COMPLETELY DIFFERENT from scenes 1 & 2! Warm lighting. Growth visible. For ${targetAudience}.`,
    detailedPrompt: `HYPERREALISTIC PHOTO: ${location3}. Real person looking TRANFORMED, peaceful, hopeful. ${getRandomElement(SCENE_VARIATIONS.scene3Elements)}. ${getRandomElement(SCENE_VARIATIONS.scene3Elements)}. COMPLETELY OPPOSITE to scene 1 - no more worry, now there's acceptance and peace. Warm golden lighting suggesting hope. Wide shot showing the changed environment or new perspective. Amateur smartphone photo. AUTHENTIC: Show the resolution - how the person changed.`,
    visualElements: [
      'Transformed person',
      getRandomElement(SCENE_VARIATIONS.scene3Elements),
      getRandomElement(SCENE_VARIATIONS.scene3Elements),
      'Warm hopeful lighting',
      'Open space, new beginning'
    ],
    mood: `peaceful, hopeful, ${positiveEmotion}`,
    cameraAngle: getRandomElement(['Wide establishing shot', 'Open composition', 'Looking toward light source', 'Peaceful medium shot'])
  });

  return prompts;
}

/**
 * Get emotionally opposite emotion for turning point
 */
function getOppositeEmotion(emotion: string): string {
  const opposites: Record<string, string> = {
    'fear': 'brave confrontation',
    'worry': 'sudden clarity',
    'sadness': 'intense grief',
    'anger': 'explosive release',
    'neutral': 'surprising revelation',
    'triumph': 'hard-won victory',
    'joy': 'overwhelming happiness'
  };
  return opposites[emotion] || 'sudden realization';
}

/**
 * Get positive resolution emotion
 */
function getPositiveEmotion(originalEmotion: string): string {
  if (originalEmotion === 'triumph') return 'victorious';
  if (originalEmotion === 'joy') return 'blissful';
  return 'peaceful, at peace';
}

async function main() {
  const args = process.argv.slice(2);
  const showHelp = args.includes('--help') || args.includes('-h') || args.length === 0;
  
  if (showHelp) {
    console.log(`
📸 Image Prompt Generator

Usage:
  npx tsx scripts/generateImagePrompt.ts [options]

Options:
  --theme=TEXT              Custom theme for article
  --angle=VALUE             Article angle (confession, advice, etc)
  --emotion=VALUE           Primary emotion (triumph, fear, joy, etc)
  --audience=TEXT           Target audience (Women 35-60, etc)
  --project=NAME            Project name (default: channel-1)
  --cover-only              Generate ONE cover image (RECOMMENDED for articles)
  --generate-images         Generate actual images from prompts
  --image-count=N           Number of images per prompt (default: 1)
  --image-delay=MS          Delay between image generations (default: 3000)
  --output=PATH             Output directory
  --verbose                 Detailed logs
  --help                    Show this help

Examples:
  # Generate ONE cover image (RECOMMENDED)
  npx tsx scripts/generateImagePrompt.ts --cover-only --theme="My story"

  # Generate cover AND images
  npx tsx scripts/generateImagePrompt.ts --cover-only --generate-images

  # Generate 3 scene prompts (for multi-image articles)
  npx tsx scripts/generateImagePrompt.ts --theme="My theme" --emotion=triumph
`);
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
  const coverOnly = getFlag('cover-only');
  const generateImages = getFlag('generate-images');
  const imageCount = parseInt(getArg('image-count', '1'), 10);
  const imageDelay = parseInt(getArg('image-delay', '3000'), 10);
  const verbose = getFlag('verbose');
  const outputDir = getArg('output', './generated/image-prompts/');

  // 🔥 NEW: If --cover-only, generate ONE cover and exit
  if (coverOnly) {
    console.log(`\n${LOG.PROMPT} ============================================`);
    console.log(`${LOG.PROMPT} COVER IMAGE GENERATOR (1 image)`);
    console.log(`${LOG.PROMPT} ============================================\n`);

    // Use smart analysis to create best cover prompt
    const articleTheme = theme || `Article about ${audience}`;
    const ledeText = `This is a story about ${articleTheme}. ${emotion} emotions.`;

    const coverPrompt = generateCoverPrompt({
      title: articleTheme,
      ledeText,
      theme: articleTheme,
      emotion,
      audience
    });

    console.log(`${LOG.PROMPT} 🎯 COVER IMAGE PROMPT:\n`);
    console.log(`   Scene: ${coverPrompt.sceneName}`);
    console.log(`   Mood: ${coverPrompt.mood}`);
    console.log(`   Camera: ${coverPrompt.cameraAngle}\n`);
    console.log(`   Quick: ${coverPrompt.prompt}\n`);
    console.log(`   Detailed:`);
    console.log(`   "${coverPrompt.detailedPrompt}"`);

    // Save to file
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const promptsFile = path.join(outputDir, `cover_${timestamp}.json`);
    fs.writeFileSync(promptsFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      type: 'cover-only',
      theme: articleTheme,
      emotion,
      audience,
      prompt: coverPrompt
    }, null, 2));
    console.log(`\n${LOG.SAVE} Saved: ${promptsFile}\n`);

    // Optionally generate image
    if (generateImages) {
      console.log(`${LOG.PROMPT} Generating cover image...\n`);
      const imageGenerator = new ImageGeneratorService();
      try {
        const base64Image = await imageGenerator.generateVisual(coverPrompt.detailedPrompt);
        if (base64Image) {
          console.log(`\n${LOG.SUCCESS} ✅ Cover image generated!\n`);
        }
      } catch (error) {
        console.error(`\n${LOG.ERROR} Failed: ${(error as Error).message}\n`);
      }
    }

    console.log(`${LOG.SUCCESS} Done!`);
    process.exit(0);
  }
  
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
