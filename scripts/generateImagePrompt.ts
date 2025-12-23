#!/usr/bin/env npx tsx

/**
 * 📸 Cover Image Prompt Generator
 * 
 * Генерирует ОДНУ УНИКАЛЬНУЮ, ЭМОЦИОНАЛЬНУЮ картинку-обложку для каждой статьи на основе:
 * 1. Темы статьи
 * 2. Содержания статьи
 * 3. Эмоционального тона (через Gemini)
 * 
 * Gemini генерирует:
 * - Конкретную сцену для фото-обложки
 * - Описание людей (их внешность, одежду, эмоции)
 * - Детали окружения
 * - Освещение и атмосферу
 * 
 * Фотография выглядит как:
 * - Снято на смартфон (реалистично, не постановка)
 * - Эмоционально заряженная
 * - Гиперреалистичные детали
 * - Уникальная под конкретную статью
 * - ГОРЯЧАЯ для Яндекс Дзена (зацепляет глаз)
 * 
 * Использование:
 *   npx tsx scripts/generateImagePrompt.ts --title="Заголовок" --content="Текст статьи"
 *   npx tsx scripts/generateImagePrompt.ts --file="path/to/article.md"
 *   npx tsx scripts/generateImagePrompt.ts --generate-image --file="article.md"
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
  IMAGE: '🖼️',
};

interface CoverPrompt {
  title: string;
  shortPrompt: string;  // Для быстрой генерации
  detailedPrompt: string;  // Полный промпт с деталями для Gemini Image Gen
  visualElements: string[];
  mood: string;
  lightingConditions: string;
  cameraAngle: string;
  whyThis: string;  // Почему эта сцена подходит к статье
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
 * Генерирует УНИКАЛЬНЫЙ промпт для обложки через Gemini на основе РЕАЛЬНОГО СОДЕРЖАНИЯ статьи
 */
async function generateCoverPrompt(
  articleTitle: string,
  articleContent: string,
  apiKey: string
): Promise<CoverPrompt> {
  console.log(`${LOG.BRAIN} Анализирую статью через Gemini API...\n`);

  const systemPrompt = `Ты - expert визуальный креатор для Яндекс Дзена.

Твоя задача: на основе содержания статьи создать ОДНУ ИДЕАЛЬНУЮ, ЭМОЦИОНАЛЬНУЮ фото-обложку, которая:
1. ЗАЦЕПЛЯЕТ ГЛАЗ - в ленте Дзена остановит скролл
2. ОТРАЖАЕТ СУТЬ - показывает о чем статья
3. ЭМОЦИОНАЛЬНА - вызывает чувства (страх, радость, сопереживание, интерес)
4. РЕАЛИСТИЧНА - выглядит как снято на смартфон РЕАЛЬНЫМ человеком, не постановка
5. ГИПЕРРЕАЛИСТИЧНА - конкретные детали (одежда, лица, выражения, интерьер, предметы)
6. УНИКАЛЬНА - специфична ИМЕННО для этой статьи, не генерик

Оформат ответа - ТОЛЬКО JSON, БЕЗ дополнительного текста:
{
  "title": "[название обложки]",
  "context": "[почему эта сцена подходит к статье?]",
  "whyThis": "[почему эта картинка будет зацеплять в ленте Дзена?]",
  "shortPrompt": "[одна строка для быстрой генерации, макс 150 символов]",
  "detailedPrompt": "[детальное описание для Gemini Image Generation]",
  "visualElements": ["элемент1", "элемент2", "элемент3", "элемент4"],
  "mood": "[доминирующая эмоция]",
  "lightingConditions": "[тип и качество света]",
  "cameraAngle": "[угол, композиция, кадрирование]"
}

ЛЕТЧИЕ ПРИМЕРЫ:

✅ ОТЛИЧНЫЙ промпт:
"shortPrompt": "Женщина 40+ смотрит письмо дома, слёзы на лице, золотой свет"
"detailedPrompt": "Женщина возраста 40-45 лет сидит за кухонным столом и держит в руках старое письмо. На её лице видны слёзы счастья/грусти, задумчивое выражение. Солнечный свет через окно позади неё создаёт контровое освещение и золотистые тени на её лице. На столе видны старые фотографии, чашка кофе. Фото снято на смартфон в портретном режиме. Гиперреалистично, эмоционально, живо. Реальная момент, не постановка."

❌ ПЛОХОЙ промпт:
"shortPrompt": "Woman reading letter. Sad mood."
"detailedPrompt": "Woman. Letter. Sad. Professional photography."

✅ ОТЛИЧНЫЙ промпт:
"shortPrompt": "Две подруги обнимаются с слёзами счастья, вечерний свет"
"detailedPrompt": "Две женщины в возрасте 30-40 лет обнимают друг друга крепко, обе со слёзами счастья на лицах. Их выражение - смесь радости, облегчения и любви. Позади них видна городская улица в золотом свете заката. Одна одета в чёрное пальто, вторая в светлый свитер. Фото снято на iPhone, золотой час, реальный эмоциональный момент. Очень живое и искреннее. Гиперреалистично."

ЗАПОМНИ: Каждая деталь важна! Описывай одежду, выражение лица, позы, предметы в кадре, освещение. Это должно быть СПЕЦИФИЧНОЕ описание, а не общее.
`;

  const userPrompt = `СТАТЬЯ:

ЗАГОЛОВОК: "${articleTitle}"

СОДЕРЖАНИЕ (первые 1500 символов):
${articleContent.substring(0, 1500)}...

НА ОСНОВЕ ЭТОЙ СТАТЬИ СОЗДАЙ ОДНУ ИДЕАЛЬНУЮ ФОТО-ОБЛОЖКУ ДЛЯ ЯНДЕКС ДЗЕНА.

Обложка должна:
1. Быть ЭМОЦИОНАЛЬНОЙ и ЖИВОЙ
2. ЗАЦЕПИТЬ ГЛАЗ в ленте
3. ТОЧНО отражать суть статьи
4. Выглядеть как РЕАЛЬНОЕ ФОТО (не постановка, не CGI)
5. Иметь КОНКРЕТНЫЕ ДЕТАЛИ (люди, эмоции, предметы, свет)

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

    // Конвертируем в наш формат
    const prompt: CoverPrompt = {
      title: parsedResponse.title || 'Cover Image',
      shortPrompt: parsedResponse.shortPrompt,
      detailedPrompt: parsedResponse.detailedPrompt,
      visualElements: parsedResponse.visualElements || [],
      mood: parsedResponse.mood,
      lightingConditions: parsedResponse.lightingConditions,
      cameraAngle: parsedResponse.cameraAngle,
      whyThis: parsedResponse.whyThis || parsedResponse.context || '',
    };

    return prompt;
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
📸 Cover Image Prompt Generator\n`);
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
      `  --generate-image          Генерировать реальное изображение (требует ImageGeneratorService)`
    );
    console.log(
      `  --output=PATH             Папка для сохранения (default: ./generated/covers/)`
    );
    console.log(`  --verbose                 Подробные логи\n`);
    console.log(`Examples:`);
    console.log(
      `  # Из markdown файла\n  npx tsx scripts/generateImagePrompt.ts --file=articles/story.md\n`
    );
    console.log(
      `  # Вручную\n  npx tsx scripts/generateImagePrompt.ts --title="Мой рассказ" --content="Текст статьи"\n`
    );
    console.log(
      `  # Генерировать картинку\n  npx tsx scripts/generateImagePrompt.ts --file=article.md --generate-image\n`
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
  const generateImage = getFlag('generate-image');
  const verbose = getFlag('verbose');
  const outputDir = getArg('output', './generated/covers/');

  console.log(`\n${LOG.PROMPT} ============================================`);
  console.log(`${LOG.PROMPT} Cover Image Prompt Generator`);
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

    // Step 2: Генерируем промпт через Gemini
    console.log(`${LOG.BRAIN} Анализирую статью...`);
    const coverPrompt = await generateCoverPrompt(
      articleTitle,
      articleContent,
      apiKey
    );

    console.log(
      `${LOG.SUCCESS} ✅ Создан промпт для обложки\n`
    );

    // Step 3: Показываем результат
    console.log(
      `${LOG.PROMPT} ============================================`
    );
    console.log(`${LOG.IMAGE} ОБЛОЖКА ДЛЯ СТАТЬИ`);
    console.log(
      `${LOG.PROMPT} ============================================\n`
    );

    console.log(`${LOG.IMAGE} ${coverPrompt.title}`);
    console.log(`   📍 Зачем: ${coverPrompt.whyThis}`);
    console.log(`   💭 Настроение: ${coverPrompt.mood}`);
    console.log(`   💡 Свет: ${coverPrompt.lightingConditions}`);
    console.log(`   📷 Композиция: ${coverPrompt.cameraAngle}`);
    console.log(`   🎨 Элементы: ${coverPrompt.visualElements.join(', ')}`);
    console.log(`\n   ⚡ Быстрый промпт:\n   "${coverPrompt.shortPrompt}"`);
    console.log(`\n   📝 Полный промпт:\n   "${coverPrompt.detailedPrompt}"\n`);

    // Step 4: Сохраняем промпт
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');
    const promptsFile = path.join(
      outputDir,
      `cover_${timestamp}.json`
    );

    fs.writeFileSync(
      promptsFile,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          articleTitle,
          articleLength: articleContent.length,
          coverPrompt,
        },
        null,
        2
      )
    );

    console.log(`${LOG.SAVE} Сохранено: ${promptsFile}\n`);

    // Step 5: Опционально генерируем картинку
    if (generateImage) {
      console.log(`${LOG.PROMPT} Генерирование изображения...\n`);

      try {
        const { ImageGeneratorService } = await import(
          '../services/imageGeneratorService'
        );
        const { ImageProcessorService } = await import(
          '../services/imageProcessorService'
        );

        const imageGenerator = new ImageGeneratorService();
        const imageProcessor = new ImageProcessorService();
        const imagesDir = path.join(outputDir, `images_${timestamp}`);

        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        try {
          if (verbose) console.log(`🎨 Генерирую обложку...`);
          console.log(`${LOG.IMAGE} Генерирую обложку...`);

          // Используем ДЕТАЛЬНЫЙ промпт для максимального качества
          const base64Image = await imageGenerator.generateVisual(
            coverPrompt.detailedPrompt
          );
          if (!base64Image)
            throw new Error('Generation returned null');

          const processedBuffer = await imageProcessor.processImage(
            base64Image
          );

          const filename = `cover_${timestamp}.jpg`;
          const filepath = path.join(imagesDir, filename);
          fs.writeFileSync(filepath, processedBuffer, 'binary');

          console.log(
            `${LOG.SUCCESS} ✅ ${filename} (${
              (processedBuffer.length / 1024).toFixed(1)
            } KB)`
          );
          console.log(`${LOG.SAVE} Сохранено: ${filepath}\n`);
        } catch (error) {
          console.error(
            `${LOG.ERROR} Ошибка генерации:`,
            (error as Error).message
          );
        }
      } catch (error) {
        console.error(
          `${LOG.ERROR} Ошибка загрузки сервисов:`,
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
    console.log(`   ✅ Промпт сгенерирован`);
    console.log(`   ${generateImage ? '✅' : '⊘'} Обложка: ${generateImage ? 'создана' : 'пропущена (используй --generate-image)'}`);
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
