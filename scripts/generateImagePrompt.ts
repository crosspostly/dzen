#!/usr/bin/env npx tsx

/**
 * 📸 Smart Cover Image Prompt Generator
 * 
 * Анализирует СОДЕРЖАНИЕ статьи и генерирует УНИКАЛЬНЫЕ, РАЗНЫЕ промпты для обложки
 * Не повторяет одно и то же!
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
  shortPrompt: string;
  detailedPrompt: string;
  visualElements: string[];
  mood: string;
  lightingConditions: string;
  cameraAngle: string;
  whyThis: string;
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
 * Анализирует статью и генерирует УНИКАЛЬНЫЙ промпт
 */
async function generateCoverPrompt(
  articleTitle: string,
  articleContent: string,
  apiKey: string
): Promise<CoverPrompt> {
  console.log(`${LOG.BRAIN} Анализирую статью через Gemini API...\n`);

  const systemPrompt = `Ты - expert визуальный креатор для Яндекс Дзена. Твой стиль - РАЗНООБРАЗИЕ и УНИКАЛЬНОСТЬ.

ТВОЯ ЗАДАЧА: Создать ОДНУ фото-обложку, которая СОВЕРШЕННО СПЕЦИФИЧНА для этой конкретной статьи.

⚠️  КРИТИЧНО - ГЕНЕРИРУЙ РАЗНЫЕ СЦЕНЫ ДЛЯ РАЗНЫХ СТАТЕЙ:
- Если статья про СЕМЬЮ → сцена с семьей/детьми/родителями
- Если статья про РОМАНТИКУ → сцена с двумя людьми/любовью
- Если статья про РАБОТУ → офис/документы/встреча
- Если статья про ПУТЕШЕСТВИЕ → дорога/окно/карта
- Если статья про ДЕНЬГИ → документы/счета/деньги
- Если статья про ПОТЕРЮ → пустая комната/одиночество
- Если статья про ПОБЕДУ → поднятые руки/улыбка/радость
- Если статья про КОНФЛИКТ → напряженное лицо/спор
- Если статья про ИСЦЕЛЕНИЕ → спокойствие/свет/облегчение
- Если статья про ИЗМЕНЕНИЕ → трансформация/новое начало

Оформат ответа - ТОЛЬКО JSON:
{
  "title": "[название обложки]",
  "whyThis": "[почему именно эта сцена]",
  "shortPrompt": "[одна строка, макс 150 символов]",
  "detailedPrompt": "[детальное описание ДЛЯ ИЗОБРАЖЕНИЯ]",
  "visualElements": ["элемент1", "элемент2", "элемент3", "элемент4"],
  "mood": "[эмоция]",
  "lightingConditions": "[свет]",
  "cameraAngle": "[угол]"
}

ВАЖНО: detailedPrompt должен быть КОНКРЕТНЫМ для Gemini Image Gen:
- Укажи ТОЧНЫЙ возраст/внешность людей
- Конкретную ОДЕЖДУ и ЦВЕТА
- КОНКРЕТНЫЕ предметы в кадре
- КОНКРЕТНОЕ время дня и тип света
- КОНКРЕТНОЕ место/интерьер/фон
- КОНКРЕТНЫЕ эмоции на лицах
- ПОЗЫ и ЖЕСТЫ
- ДЕТАЛИ (украшения, фактуры, материалы)

ПРИМЕРЫ:

✅ МАТЕРИНСТВО:
shortPrompt: "Мама с малышом на руках, теплый свет, вина, нежность"
detailedPrompt: "Женщина 35 лет держит маленького ребенка 2-3 лет на руках. Она одета в мягкий серый кашемировый свитер. Её лицо показывает глубокую нежность и любовь, глаза влажные от счастья. Позади них - окно с золотым светом заката, создающим теплый ореол. На столе видны детские игрушки. Фото снято на iPhone в портретном режиме. Эмоционально и живо."

✅ РАССТАВАНИЕ:
shortPrompt: "Женщина смотрит в пустую комнату, грусть, одиночество"
detailedPrompt: "Женщина 40 лет стоит в просторной пустой комнате, её силуэт в свете из окна. На её лице выражение грусти и потери. Она одета в светлое платье. На полу - отпечатки ног в пыли. Мягкий, холодный свет создает атмосферу одиночества. Снято на камеру смартфона. Реальный момент боли."

✅ РАДОСТЬ:
shortPrompt: "Две подруги скачут от радости, солнечный день"
detailedPrompt: "Две женщины 30-35 лет прыгают в воздухе с поднятыми руками, их лица светятся чистой радостью. Одна в красном платье, вторая в белом. На лицах искренние улыбки. Позади них - летний парк, зеленая трава, яркое солнце создает четкие тени. Волосы развеваются в воздухе. Фото снято на улице в полдень. Живо, энергично, счастливо."

✅ ТРЕВОГА:
shortPrompt: "Женщина смотрит в окно ночью, беспокойство, страх"
detailedPrompt: "Женщина 45 лет смотрит в окно поздно ночью. Её выражение - тревога и беспокойство. На её лице видны морщины напряжения. Она держит в руках кружку с чаем. Окно отражает свет комнаты позади неё. Холодный лунный свет через окно. На фоне видна её спальня. Снято в монохромных тонах, созданиет атмосферу беспокойства."

КЛЮЧ К УСПЕХУ: Каждая деталь - возраст, одежда, жесты, предметы, свет, место - должна быть РАЗНОЙ для разных статей!
`;

  const userPrompt = `СТАТЬЯ:

ЗАГОЛОВОК: "${articleTitle}"

СОДЕРЖАНИЕ (первые 2000 символов):
${articleContent.substring(0, 2000)}...

ОСНОВНЫЕ ТЕМЫ этой статьи:
1. Проанализируй основной конфликт/эмоцию
2. Определи главных действующих лиц
3. Определи обстановку/место
4. Определи эмоциональный тон

ТЕПЕРЬ СОЗДАЙ УНИКАЛЬНЫЙ промпт для обложки:
- СЦЕНА должна быть специфична для ЭТОЙ статьи
- НЕ общая ситуация - а конкретная сцена
- НЕ повторяй одно и то же - пусть изображение будет УНИКАЛЬНЫМ

Ответ - ТОЛЬКО JSON!`;

  try {
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Не смог парсить JSON из ответа Gemini');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

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
📸 Smart Cover Image Prompt Generator\n`);
    console.log(`Usage:`);
    console.log(
      `  npx tsx scripts/generateImagePrompt.ts [options]\n`
    );
    console.log(`Options:`);
    console.log(`  --file=PATH        Путь к markdown файлу`);
    console.log(`  --title=TEXT       Заголовок статьи`);
    console.log(`  --content=TEXT     Содержание статьи`);
    console.log(`  --generate-image   Генерировать изображение`);
    console.log(`  --output=PATH      Папка для сохранения`);
    console.log(`  --verbose          Подробные логи\n`);
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
  console.log(`${LOG.PROMPT} Smart Cover Image Prompt Generator`);
  console.log(`${LOG.PROMPT} ============================================\n`);

  const startTime = Date.now();

  try {
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      articleTitle = parsed.data.title || 'Untitled';
      articleContent = parsed.content;

      console.log(`${LOG.INFO} Файл: ${filePath}`);
    }

    if (!articleContent) {
      throw new Error('Содержание статьи не предоставлено');
    }

    console.log(`${LOG.INFO} Объем: ${articleContent.length} символов\n`);

    console.log(`${LOG.BRAIN} Анализирую статью...`);
    const coverPrompt = await generateCoverPrompt(
      articleTitle,
      articleContent,
      apiKey
    );

    console.log(
      `${LOG.SUCCESS} ✅ Создан УНИКАЛЬНЫЙ промпт для обложки\n`
    );

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
    console.log(`\n   📝 ПОДРОБНЫЙ промпт для Gemini:\n   "${coverPrompt.detailedPrompt}"\n`);

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
          console.log(`${LOG.IMAGE} Генерирую обложку...`);

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
    console.log(`   ✅ УНИКАЛЬНЫЙ промпт сгенерирован`);
    console.log(`   ${generateImage ? '✅' : '⊘'} Обложка: ${generateImage ? 'создана' : 'пропущена'}`);
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
