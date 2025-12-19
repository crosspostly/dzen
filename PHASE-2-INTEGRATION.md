# 🔥 ZenMaster v4.0: Phase 2 - REAL Integration

**Дата:** 19 декабря 2025  
**Версия:** v4.0 Phase 2  
**Статус:** 🟠 SPECIFICATION  
**Приоритет:** 🔥 КРИТИЧНЫЙ

---

## ❌ CLARIFICATION: Что фазы 2 НЕ делает

```
❌ articleExporter (JSON/HTML export)
   Почему: Zen не нужны JSON/HTML файлы
   Что нужно Zen: Markdown (текст) + PNG/JPEG (картинки)

❌ Integration с "multiAgentService" 
   Почему: Непонятно что это за сервис
   Что реально: Только episodeGeneratorService + imageGeneratorAgent

❌ Встраивание картинок в JSON/HTML артефакты
   Почему: Картинки остаются отдельными файлами
   Правильно: Markdown ссылается на PNG, они разные файлы
```

---

## ✅ ЧТО Phase 2 ДЕЛАЕТ

### Проблема (текущая архитектура)

**Временная шкала ДО Phase 2:**
```
episodeGeneratorService (генерирует 12 эпизодов) → 5 минут
  ТОЛЬКО ПОТОМ
imageQueueManager (генерирует 12 картинок) → 60 минут (1 минута за каждую)

ИТОГО: 65 минут для 1 статьи 🐢
```

**Почему медленно:**
- Картинки начинают генерироваться только ПОСЛЕ всех эпизодов
- Первая картинка стартует в минуту 5, последняя в минуту 65

---

### Решение Phase 2: Параллельная генерация

**Новая архитектура:**
```
episodeGeneratorService 🔄 ЗАПУСКАЕТСЯ
  ├─ Episode 1 готов (25 сек) → СРАЗУ добавляем в imageQueueManager
  ├─ Episode 2 готов (50 сек) → СРАЗУ добавляем в imageQueueManager
  ├─ Episode 3 готов (75 сек) → СРАЗУ добавляем в imageQueueManager
  │
  └─ Пока генерируются episodes 4-12 (еще 225 секунд)
     imageQueueManager 🔄 ПАРАЛЛЕЛЬНО
     ├─ Image 1 генерируется (60 сек, пока episodes 4-5 генерируются)
     ├─ Image 2 генерируется (60 сек, пока episodes 6-7 генерируются)
     └─ Image 3 генерируется (60 сек, пока episodes 8-9 генерируются)

ИТОГО: max(5 мин, 12 мин) = 12 минут вместо 65! ⚡
```

---

## 📋 РЕАЛИЗАЦИЯ

### Шаг 1: Обновить imageQueueManager

**Файл:** `services/imageQueueManager.ts` (UPDATE)

```typescript
export class ImageQueueManager {
  // ... existing code ...

  /**
   * NEW METHOD: Wait for specific episodes to complete image generation
   * 
   * Used by articleWithImagesService to get images after all episodes processed
   */
  async waitForEpisodeImages(
    episodeIds: string[]
  ): Promise<Map<string, GeneratedImage>> {
    const results = new Map<string, GeneratedImage>();
    
    // Poll until all episodes have images
    while (results.size < episodeIds.length) {
      for (const episodeId of episodeIds) {
        if (!results.has(episodeId)) {
          const image = this.processedImages.get(episodeId);
          if (image) {
            results.set(episodeId, image);
          }
        }
      }
      
      if (results.size < episodeIds.length) {
        await delay(1000); // Poll every second
      }
    }
    
    return results;
  }
}
```

---

### Шаг 2: Обновить episodeGeneratorService

**Файл:** `services/episodeGeneratorService.ts` (UPDATE)

```typescript
export class EpisodeGeneratorService {
  constructor(
    private gemini: GoogleGenAI,
    private plotBible: PlotBible,
    private imageQueueManager: ImageQueueManager  // ← NEW DEPENDENCY
  ) {}

  /**
   * Generate all 12 episodes for an article
   * 
   * NEW: Queue each episode for image generation IMMEDIATELY after text is ready
   * This allows images to generate in parallel with remaining episodes
   */
  async generateAllEpisodes(
    outline: ArticleOutline
  ): Promise<Episode[]> {
    const episodes: Episode[] = [];
    
    for (let i = 0; i < 12; i++) {
      console.log(`📄 Episode ${i + 1}/12...`);
      
      // Generate episode text (fast, ~25 sec each)
      const episode = await this.generateEpisode(outline, i);
      episodes.push(episode);
      
      // 🆕 IMMEDIATELY queue for image generation
      // This is the key change! Images start generating now, not after all episodes
      this.imageQueueManager.enqueue({
        episodeId: episode.id,
        episodeText: episode.content,
        plotBible: this.plotBible,
        emotion: episode.metadata.emotion,
        sceneDescription: this.extractSceneDescription(episode),
      });
      
      console.log(`✅ Episode ${i + 1}/12 done - image queued`);
    }
    
    return episodes;
  }

  private async generateEpisode(
    outline: ArticleOutline,
    episodeNumber: number
  ): Promise<Episode> {
    // Existing logic - NO CHANGES
    const prompt = this.buildPrompt(outline, episodeNumber, this.previousContext);
    const content = await this.gemini.generateContent(prompt);
    
    this.previousContext = content.slice(-800); // Rolling context
    
    return {
      id: `episode-${episodeNumber + 1}`,
      number: episodeNumber + 1,
      content,
      metadata: {
        emotion: this.detectEmotion(content),
        generatedAt: Date.now(),
      },
    };
  }

  private extractSceneDescription(episode: Episode): string {
    // Extract key visual details from episode text
    // Used by imageGeneratorAgent to build image prompt
    return episode.content.slice(0, 500); // First 500 chars as scene hint
  }
}
```

---

### Шаг 3: Создать articleWithImagesService

**Файл:** `services/articleWithImagesService.ts` (NEW)

```typescript
export interface ArticleWithImages {
  article: Article;
  images: Map<number, GeneratedImage>; // episodeNumber -> Image
  status: "generating" | "complete" | "failed";
  progress: {
    textComplete: boolean;
    imagesQueued: number;
    imagesComplete: number;
  };
}

export class ArticleWithImagesService {
  constructor(
    private episodeGenerator: EpisodeGeneratorService,
    private imageQueueManager: ImageQueueManager,
    private fileService: FileService
  ) {}

  /**
   * Generate article with images in parallel
   * 
   * Timeline:
   * - Episode 1 text: 25s → queue image
   * - Episode 2 text: 25s → queue image  
   * - Episode 3 text: 25s → queue image
   * - Episode 4 text: 25s → queue image
   * - Image 1 generates: 60s (episodes 5-12 still generating)
   * - Image 2 generates: 60s
   * - ...
   * - Image 12 generates: 60s
   * 
   * Total: max(text_time, image_time) = max(5min, 12min) = 12 minutes
   */
  async generateArticleWithImages(
    outline: ArticleOutline,
    config: ContentFactoryConfig
  ): Promise<ArticleWithImages> {
    const result: ArticleWithImages = {
      article: null,
      images: new Map(),
      status: "generating",
      progress: {
        textComplete: false,
        imagesQueued: 0,
        imagesComplete: 0,
      },
    };

    try {
      // Step 1: Generate all episodes (automatically queues images)
      console.log(`\n📄 Generating ${outline.title}...`);
      console.log(`⏱️  Timeline: ~5 min for text + ~12 min for images in parallel`);
      
      const startTime = Date.now();
      const episodes = await this.episodeGenerator.generateAllEpisodes(outline);
      const textTime = Date.now() - startTime;
      
      result.progress.textComplete = true;
      result.progress.imagesQueued = episodes.length;
      
      console.log(`✅ ${episodes.length} episodes done in ${Math.round(textTime / 1000)}s`);
      console.log(`📸 ${episodes.length} images queued`);

      // Step 2: Build article object
      const article = this.buildArticle(outline, episodes);
      result.article = article;

      // Step 3: Wait for images (runs in parallel with any remaining work)
      console.log(`⏳ Waiting for images (1 per minute)...`);
      const imageStartTime = Date.now();
      
      const images = await this.imageQueueManager.waitForEpisodeImages(
        episodes.map(e => e.id)
      );

      const imageTime = Date.now() - imageStartTime;
      
      // Map images back to episodes
      episodes.forEach((episode, idx) => {
        const image = images.get(episode.id);
        if (image) {
          result.images.set(idx + 1, image);
          result.progress.imagesComplete++;
        }
      });

      result.status = "complete";
      
      console.log(`✅ ${result.progress.imagesComplete}/${episodes.length} images done in ${Math.round(imageTime / 1000)}s`);
      console.log(`⏱️  Total time: ${Math.round((textTime + imageTime) / 1000)}s`);

      return result;

    } catch (error) {
      result.status = "failed";
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export to Zen format: Markdown + PNG files
   * 
   * Output structure:
   * output/
   *   ├─ article-1.md (Markdown with image links)
   *   └─ images/
   *       ├─ article-1-episode-1.png
   *       ├─ article-1-episode-2.png
   *       └─ ...
   */
  async exportForZen(
    articleWithImages: ArticleWithImages,
    outputDir: string = "./output"
  ): Promise<{
    markdownPath: string;
    imagePaths: string[];
    manifestPath: string;
  }> {
    
    const articleId = articleWithImages.article.id;
    const imageDir = path.join(outputDir, "images");
    const mdPath = path.join(outputDir, `${articleId}.md`);
    const manifestPath = path.join(outputDir, `${articleId}.manifest.json`);

    // Ensure directories exist
    await this.fileService.ensureDir(outputDir);
    await this.fileService.ensureDir(imageDir);

    // Save images
    const imagePaths: string[] = [];
    for (const [episodeNum, image] of articleWithImages.images.entries()) {
      const imagePath = path.join(
        imageDir,
        `${articleId}-episode-${episodeNum}.png`
      );
      
      // Decode base64 and save PNG
      const buffer = Buffer.from(image.base64, "base64");
      await this.fileService.writeFile(imagePath, buffer);
      imagePaths.push(imagePath);
      
      console.log(`💾 Saved: ${imagePath}`);
    }

    // Build Markdown with image references
    const markdown = this.buildMarkdown(
      articleWithImages.article,
      articleWithImages.images
    );

    // Save Markdown
    await this.fileService.writeFile(mdPath, markdown, "utf-8");
    console.log(`💾 Saved: ${mdPath}`);

    // Save manifest (for Zen upload tracking)
    const manifest = {
      articleId,
      title: articleWithImages.article.title,
      textFile: path.basename(mdPath),
      images: imagePaths.map(p => path.basename(p)),
      metadata: {
        episodes: articleWithImages.article.episodes.length,
        wordCount: articleWithImages.article.charCount,
        imageCount: imagePaths.length,
        exportedAt: new Date().toISOString(),
      },
    };
    
    await this.fileService.writeFile(
      manifestPath,
      JSON.stringify(manifest, null, 2),
      "utf-8"
    );
    console.log(`💾 Saved: ${manifestPath}`);

    return { markdownPath: mdPath, imagePaths, manifestPath };
  }

  private buildMarkdown(
    article: Article,
    images: Map<number, GeneratedImage>
  ): string {
    let md = `# ${article.title}\n\n`;
    
    // Intro
    md += `${article.episodes[0]?.content || ""}\n\n`;
    md += `---\n\n`;

    // Episodes with images
    article.episodes.slice(1).forEach((episode, idx) => {
      const episodeNum = idx + 2;
      
      // Episode text
      md += `## Часть ${episodeNum}\n\n`;
      md += `${episode.content}\n\n`;
      
      // Image if available
      const image = images.get(episodeNum);
      if (image) {
        const imageName = `article-${article.id}-episode-${episodeNum}.png`;
        md += `![Иллюстрация к части ${episodeNum}](./images/${imageName})\n\n`;
      }
      
      md += `---\n\n`;
    });

    return md;
  }

  private buildArticle(
    outline: ArticleOutline,
    episodes: Episode[]
  ): Article {
    return {
      id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: outline.title,
      episodes,
      content: episodes.map(e => e.content).join("\n\n"),
      charCount: episodes.reduce((sum, e) => sum + e.content.length, 0),
      metadata: {
        theme: outline.theme,
        genre: outline.genre,
        generatedAt: Date.now(),
      },
    };
  }
}
```

---

## 🧪 TESTS для Phase 2

**Файл:** `tests/integration/articleWithImages.integration.test.ts` (NEW)

```typescript
describe("Article + Images Integration (Phase 2)", () => {
  let articleService: ArticleWithImagesService;
  let geminiMock: jest.Mocked<GoogleGenAI>;
  let imageQueueMock: jest.Mocked<ImageQueueManager>;

  beforeEach(() => {
    geminiMock = createMockGemini();
    imageQueueMock = createMockImageQueue();
    articleService = new ArticleWithImagesService(
      new EpisodeGeneratorService(geminiMock, plotBible, imageQueueMock),
      imageQueueMock,
      createMockFileService()
    );
  });

  describe("Parallel generation", () => {
    it("should queue images DURING episode generation, not after", async () => {
      const outline = createSampleOutline();
      
      // Track when enqueue() is called vs when episodes are generated
      const enqueueCalls: number[] = [];
      const episodeCompletions: number[] = [];
      
      imageQueueMock.enqueue.mockImplementation(() => {
        enqueueCalls.push(Date.now());
      });

      geminiMock.models.generateContent.mockImplementation(async () => {
        episodeCompletions.push(Date.now());
        await delay(100); // Simulate generation time
        return "episode content";
      });

      await articleService.generateArticleWithImages(outline, defaultConfig);

      // Key assertion: enqueue called during episode generation, not after
      expect(enqueueCalls.length).toBe(12);
      expect(enqueueCalls[0]).toBeLessThan(episodeCompletions[11]); // First image queued before last episode done
    });

    it("should complete in ~12 minutes instead of ~65 minutes", async () => {
      const outline = createSampleOutline();
      
      const startTime = Date.now();
      await articleService.generateArticleWithImages(outline, defaultConfig);
      const duration = Date.now() - startTime;

      // Should be roughly 12 minutes (allowing some overhead)
      const twelveMins = 12 * 60 * 1000;
      expect(duration).toBeLessThan(twelveMins * 1.2); // 20% overhead for testing
      expect(duration).toBeGreaterThan(twelveMins * 0.8); // At least 80% of expected
    });
  });

  describe("Export to Zen format", () => {
    it("should create Markdown + PNG structure", async () => {
      const articleWithImages = await createSampleArticleWithImages();
      const outputDir = "./test-output";

      const { markdownPath, imagePaths } = await articleService.exportForZen(
        articleWithImages,
        outputDir
      );

      // Verify Markdown exists
      expect(fs.existsSync(markdownPath)).toBe(true);
      
      // Verify 12 PNG files exist
      expect(imagePaths).toHaveLength(12);
      imagePaths.forEach(path => {
        expect(fs.existsSync(path)).toBe(true);
        expect(path).toMatch(/\.png$/);
      });

      // Verify Markdown links to images
      const markdown = fs.readFileSync(markdownPath, "utf-8");
      imagePaths.forEach(path => {
        const imageName = path.split("/").pop();
        expect(markdown).toContain(`images/${imageName}`);
      });
    });

    it("should create valid Markdown with 12 episodes + images", async () => {
      const articleWithImages = await createSampleArticleWithImages();
      const outputDir = "./test-output";

      const { markdownPath } = await articleService.exportForZen(
        articleWithImages,
        outputDir
      );

      const markdown = fs.readFileSync(markdownPath, "utf-8");

      // Should have title
      expect(markdown).toContain("# ");

      // Should have 12 parts
      expect(markdown.match(/## Часть \d+/g)).toHaveLength(12);

      // Should have 12 image links
      expect(markdown.match(/!\[.+\]\(.+\.png\)/g)).toHaveLength(12);
    });

    it("should create manifest.json for Zen upload tracking", async () => {
      const articleWithImages = await createSampleArticleWithImages();
      const outputDir = "./test-output";

      const { manifestPath } = await articleService.exportForZen(
        articleWithImages,
        outputDir
      );

      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest).toHaveProperty("articleId");
      expect(manifest).toHaveProperty("textFile");
      expect(manifest.images).toHaveLength(12);
      expect(manifest.metadata.imageCount).toBe(12);
    });
  });

  describe("Ready for Zen", () => {
    it("should produce output ready for direct Zen upload", async () => {
      const outline = createSampleOutline();
      const result = await articleService.generateArticleWithImages(
        outline,
        defaultConfig
      );
      const { markdownPath, imagePaths } = await articleService.exportForZen(
        result,
        "./zen-ready"
      );

      // What Zen needs:
      // 1. One .md file with article text
      expect(fs.existsSync(markdownPath)).toBe(true);
      expect(markdownPath).toMatch(/\.md$/);

      // 2. PNG images in /images folder
      expect(imagePaths.length).toBe(12);
      imagePaths.forEach(p => {
        expect(fs.existsSync(p)).toBe(true);
        expect(p).toMatch(/\.png$/);
      });

      // 3. Markdown references images correctly
      const markdown = fs.readFileSync(markdownPath, "utf-8");
      imagePaths.forEach(imagePath => {
        const fileName = imagePath.split("/").pop();
        expect(markdown).toContain(`./images/${fileName}`);
      });
    });
  });
});
```

---

## 📦 Phase 2 Deliverables

- [ ] **imageQueueManager.ts** - Add `waitForEpisodeImages()` method
- [ ] **episodeGeneratorService.ts** - Add dependency injection of `imageQueueManager`, call enqueue() immediately after each episode
- [ ] **articleWithImagesService.ts** - NEW service for orchestrating parallel generation + export
- [ ] **Integration tests** - Verify parallel timeline, export format, Zen readiness
- [ ] **Documentation** - How to use articleWithImagesService

---

## ⏱️ Timeline Comparison

| Metric | Before Phase 2 | After Phase 2 | Improvement |
|--------|---|---|---|
| 1 article + 12 images | 65 min | 12 min | **82% faster** ⚡ |
| 5 articles + 60 images | 325 min | 60 min | **82% faster** ⚡ |
| 100 articles + 1200 images | 6500 min | ~1200 min | **82% faster** ⚡ |

---

## 🚀 Phase 2 Go-Live Checklist

- [ ] imageQueueManager.waitForEpisodeImages() implemented and tested
- [ ] episodeGeneratorService queues images during generation
- [ ] articleWithImagesService fully working
- [ ] Export to Markdown + PNG validated
- [ ] Integration tests passing
- [ ] Real Zen export structure verified
- [ ] Ready for batch generation (1-100 articles)
- [ ] Performance meets 12-minute target per article

---

**Статус:** 🟠 READY FOR IMPLEMENTATION
