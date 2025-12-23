#!/usr/bin/env npx tsx

/**
 * 📸 Dynamic Image Prompt Generator
 * 
 * Генерирует УНИКАЛЬНЫЕ ПРОМПТЫ ДЛЯ КАЖДОЙ СТАТЬИ на основе:
 * 1. Темы статьи
 * 2. Содержания статьи
 * 3. Эмоционального тона (через Gemini)
 * 
 * Gemini генерирует:
 * - Конкретные сцены для фото
 * - Описание людей (их внешность, одежду, эмоции)
 * - Детали окружения
 * - Освещение и атмосферу
 * 
 * Фотографии выглядят как:
 * - Снято на смартфон (реалистично, не постановка)
 * - Эмоционально заряженные
 * - Гиперреалистичные детали
 * - Уникальные под конкретную статью
 * 
 * Использование:
 *   npx tsx scripts/generateImagePrompt.ts --title="Заголовок" --content="Текст статьи"
 *   npx tsx scripts/generateImagePrompt.ts --file="path/to/article.md"
 *   npx tsx scripts/generateImagePrompt.ts --generate-images --file="article.md"
 */

import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';

const LOG = {
  INFO: '🔷',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  PROMPT: '📸',
  BRAIN: '🧠',
  TIMER: '⏱️',
  SAVE: '💾',
  SCENE: '🎬',
};

interface ImagePrompt {
  sceneNumber: number;
  sceneName: string;
  shortPrompt: string;  // Для быстрой генерации
  detailedPrompt: string;  // Полный промпт с деталями
  visualElements: string[];
  mood: string;
  lightingConditions: string;
  cameraAngle: string;
  context: string;  // Откуда эта сцена в статье
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

/**
 * Генерирует УНИКАЛЬНЫЕ промпты через Gemini на основе РЕАЛЬНОГО СОДЕРЖАНИЯ статьи
 */
async function generateDynamicImagePrompts(
  articleTitle: string,
  articleContent: string,
  apiKey: string
): Promise<ImagePrompt[]> {
  console.log(`${LOG.BRAIN} Анализирую статью через Gemini API...\n`);

  const systemPrompt = `Ты - expert визуальный режиссер для Яндекс Дзена.

Твоя задача: на основе содержания статьи создать 3 УНИКАЛЬНЫХ, ЭМОЦИОНАЛЬНЫХ сцены для фотографий.

Требования к сценам:
- РЕАЛЬНЫЕ: выглядят как снято на смартфон реальным человеком
- ГИПЕРРЕАЛИСТИЧНЫЕ: конкретные детали (одежда, лица, интерьер)
- ЭМОЦИОНАЛЬНЫЕ: показывают чувства и истории людей
- УНИКАЛЬНЫЕ: каждая совершенно разная, не повторяют друг друга
- ДЛЯ СТАТЬИ: сцены точно отражают содержание и эмоцию статьи

Оформат ответа - ТОЛЬКО JSON, без дополнительного текста:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "sceneName": "Opening: [название сцены]",
      "context": "[Где в статье эта сцена?]",
      "shortPrompt": "[Одна строка для быстрой генерации]",
      "detailedPrompt": "[Полное описание для Gemini Image Gen]",
      "visualElements": ["элемент1", "элемент2", ...],
      "mood": "[эмоция]",
      "lightingConditions": "[освещение]",
      "cameraAngle": "[угол камеры]"
    },
    { "sceneNumber": 2, ... },
    { "sceneNumber": 3, ... }
  ]
}

ЛЕТЧИЕ ПРИМЕРЫ:

✅ ХОРОШО: "Женщина 45 лет сидит на кухне с чашкой кофе, смотрит за окно с грустным выражением. Солнечный свет через окно создает тени на её лице. На столе письмо. Снято на iPhone, режим портрета."

❌ ПЛОХО: "Woman in room. Sad mood. Professional photography."

✅ ХОРОШО: "Две подруги обнимаются в проезде между домов, слёзы счастья. Один держит другую. Фото снято в золотой час, контровое освещение. Реальное эмоциональное переживание."

❌ ПЛОХО: "People hugging. Happy moment. Real photo."
`;

  const userPrompt = `СТАТЬЯ:

ЗАГОЛОВОК: "${articleTitle}"

СОДЕРЖАНИЕ (первые 1000 символов):
${articleContent.substring(0, 1000)}...

ГЕНЕРИРУЙ 3 УНИКАЛЬНЫЕ СЦЕНЫ:
1. OPENING: Эмоциональный крючок, показывает начальную проблему/ситуацию
2. CLIMAX: Кульминация, пик эмоции, поворотный момент
3. RESOLUTION: Финал, результат, новое состояние (СОВЕРШЕННО ОТЛИЧАЕТСЯ от сцены 1!)

Ответ - ТОЛЬКО JSON!`;

  try {
    // Вызываем Gemini API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' +
        apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: [{ text: systemPrompt }],
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;

    // Парсим JSON из ответа
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Не смог парсить JSON из ответа Gemini');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    const scenes = parsedResponse.scenes || [];

    // Конвертируем в наш формат
    const prompts: ImagePrompt[] = scenes.map((scene: any) => ({
      sceneNumber: scene.sceneNumber,
      sceneName: scene.sceneName,
      shortPrompt: scene.shortPrompt,
      detailedPrompt: scene.detailedPrompt,
      visualElements: scene.visualElements || [],
      mood: scene.mood,
      lightingConditions: scene.lightingConditions,
      cameraAngle: scene.cameraAngle,
      context: scene.context,
    }));

    return prompts;
  } catch (error) {
    console.error(
      `${LOG.ERROR} Ошибка Gemini API:`,
      (error as Error).message
    );
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showHelp =
    args.includes('--help') ||
    args.includes('-h') ||
    (args.length === 0 && !getArg('file'));

  if (showHelp) {
    console.log(`
📸 Dynamic Image Prompt Generator\n`);
    console.log(`Usage:`);
    console.log(
      `  npx tsx scripts/generateImagePrompt.ts [options]\n`
    );
    console.log(`Options:`);
    console.log(
      `  --file=PATH               Путь к markdown файлу статьи`
    );
    console.log(
      `  --title=TEXT              Заголовок статьи (если без файла)`
    );
    console.log(
      `  --content=TEXT            Содержание статьи (если без файла)`
    );
    console.log(
      `  --generate-images         Генерировать реальные изображения`
    );
    console.log(
      `  --image-count=N           Количество вариантов на сцену (default: 1)`
    );
    console.log(
      `  --output=PATH             Папка для сохранения (default: ./generated/)`
    );
    console.log(`  --verbose                 Подробные логи\n`);
    console.log(`Examples:`);
    console.log(
      `  # Из markdown файла\n  npx tsx scripts/generateImagePrompt.ts --file=articles/story.md\n`
    );
    console.log(
      `  # Вручную\n  npx tsx scripts/generateImagePrompt.ts --title="Заголовок" --content="Текст"\n`
    );
    console.log(
      `  # Генерировать картинки\n  npx tsx scripts/generateImagePrompt.ts --file=article.md --generate-images\n`
    );
    process.exit(0);
  }

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error(`${LOG.ERROR} GEMINI_API_KEY не установлен`);
    process.exit(1);
  }

  const filePath = getArg('file');
  let articleTitle = getArg('title', '');
  let articleContent = getArg('content', '');
  const generateImages = getFlag('generate-images');
  const imageCount = parseInt(getArg('image-count', '1'), 10);
  const verbose = getFlag('verbose');
  const outputDir = getArg('output', './generated/image-prompts/');

  console.log(`\n${LOG.PROMPT} ============================================`);
  console.log(`${LOG.PROMPT} Dynamic Image Prompt Generator`);
  console.log(`${LOG.PROMPT} ============================================\n`);

  const startTime = Date.now();

  try {
    // Step 1: Получаем содержание статьи
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      articleTitle = parsed.data.title || 'Untitled';
      articleContent = parsed.content;

      console.log(`${LOG.INFO} Файл: ${filePath}`);
    } else {
      console.log(`${LOG.INFO} Заголовок: "${articleTitle}"`);
    }

    if (!articleContent) {
      throw new Error('Содержание статьи не предоставлено');
    }

    console.log(`${LOG.INFO} Объем: ${articleContent.length} символов\n`);

    // Step 2: Генерируем промпты через Gemini
    console.log(`${LOG.BRAIN} Step 1: Анализ статьи...`);
    const imagePrompts = await generateDynamicImagePrompts(
      articleTitle,
      articleContent,
      apiKey
    );

    console.log(
      `${LOG.SUCCESS} ✅ Сгенерировано ${imagePrompts.length} уникальных сцен\n`
    );

    // Step 3: Показываем результаты
    console.log(
      `${LOG.PROMPT} ============================================`
    );
    console.log(`${LOG.PROMPT} СЦЕНЫ ДЛЯ ФОТОГРАФИЙ`);
    console.log(
      `${LOG.PROMPT} ============================================\n`
    );

    imagePrompts.forEach((prompt) => {
      console.log(
        `${LOG.SCENE} Сцена ${prompt.sceneNumber}: ${prompt.sceneName}`
      );
      console.log(`   📍 Контекст: ${prompt.context}`);
      console.log(`   💭 Настроение: ${prompt.mood}`);
      console.log(
        `   💡 Освещение: ${prompt.lightingConditions}`
      );
      console.log(`   📷 Камера: ${prompt.cameraAngle}`);
      console.log(`   🎨 Элементы: ${prompt.visualElements.join(', ')}`);
      console.log(`\n   ⚡ Промпт (быстро):\n   "${prompt.shortPrompt}"`);
      console.log(`\n   📝 Полный промпт:\n   "${prompt.detailedPrompt}"\n`);
    });

    // Step 4: Сохраняем промпты
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');
    const promptsFile = path.join(
      outputDir,
      `prompts_${timestamp}.json`
    );

    fs.writeFileSync(
      promptsFile,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          articleTitle,
          articleLength: articleContent.length,
          imagePrompts,
        },
        null,
        2
      )
    );

    console.log(`${LOG.SAVE} Сохранено: ${promptsFile}\n`);

    // Step 5: Опционально генерируем картинки
    if (generateImages) {
      console.log(
        `${LOG.PROMPT} Step 2: Генерирование изображений...\n`
      );

      try {
        const { ImageGeneratorService } = await import(
          '../services/imageGeneratorService'
        );
        const { ImageProcessorService } = await import(
          '../services/imageProcessorService'
        );

        const imageGenerator = new ImageGeneratorService();
        const imageProcessor = new ImageProcessorService();
        const imagesDir = path.join(
          outputDir,
          `images_${timestamp}`
        );

        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        let generatedCount = 0;

        for (const imgPrompt of imagePrompts) {
          console.log(
            `${LOG.SCENE} Сцена ${imgPrompt.sceneNumber}: ${imgPrompt.sceneName}`
          );

          for (let i = 1; i <= imageCount; i++) {
            try {
              if (verbose)
                console.log(
                  `   🎨 Генерирую вариант ${i}/${imageCount}...`
                );

              // Используем ДЕТАЛЬНЫЙ промпт для максимального качества
              const base64Image =
                await imageGenerator.generateVisual(
                  imgPrompt.detailedPrompt
                );
              if (!base64Image)
                throw new Error('Generation returned null');

              const processedBuffer =
                await imageProcessor.processImage(
                  base64Image
                );

              const filename = `scene_${imgPrompt.sceneNumber}_variant_${i}.jpg`;
              const filepath = path.join(
                imagesDir,
                filename
              );
              fs.writeFileSync(
                filepath,
                processedBuffer,
                'binary'
              );

              console.log(
                `   ✅ ${filename} (${
                  (processedBuffer.length / 1024).toFixed(1)
                } KB)`
              );
              generatedCount++;

              if (i < imageCount) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 3000)
                );
              }
            } catch (error) {
              console.log(
                `   ❌ Ошибка: ${
                  (error as Error).message
                }`
              );
            }
          }
          console.log('');
        }

        console.log(
          `${LOG.SUCCESS} ✅ Сгенерировано ${generatedCount} изображений`
        );
        console.log(`${LOG.SAVE} Сохранено: ${imagesDir}\n`);
      } catch (error) {
        console.error(
          `${LOG.ERROR} Ошибка при генерировании картинок:`,
          (error as Error).message
        );
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`${LOG.SUCCESS} ============================================`);
    console.log(`${LOG.SUCCESS} Готово!`);
    console.log(`${LOG.SUCCESS} ============================================`);
    console.log(``);
    console.log(`📊 Статистика:`);
    console.log(`   ✅ Промпты: ${imagePrompts.length}`);
    console.log(
      `   ${generateImages ? '✅' : '⊘'} Картинки: ${
        generateImages
          ? imagePrompts.length * imageCount
          : 'пропущено (используй --generate-images)'
      }`
    );
    console.log(`   📁 Сохранено: ${path.resolve(outputDir)}`);
    console.log(`   ⏱️  Время: ${duration}s`);
    console.log('');
  } catch (error) {
    console.error(
      `\n${LOG.ERROR} Ошибка:`,
      (error as Error).message
    );
    if (verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
