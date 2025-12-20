# 🎨 ZenMaster v4.0 - Image Generation Guide

**Last Updated:** 2025-12-20  
**Status:** Production  
**Version:** 4.0+

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Image Generation Flow](#image-generation-flow)
4. [API Reference](#api-reference)
5. [Integration Points](#integration-points)
6. [Error Handling & Fallbacks](#error-handling--fallbacks)
7. [Debugging Guide](#debugging-guide)
8. [Common Mistakes](#common-mistakes)
9. [Performance Tips](#performance-tips)
10. [Testing](#testing)

---

## Overview

### What Gets Generated?

**ONE cover image per article** (NOT per episode!)

```
Article (title + lede)
    ↓
[ImageGeneratorAgent] ← Gemini Image API
    ↓
JPEG image (1920×1080, 16:9)
    ↓
[ImageProcessorService] ← Canvas post-processing
    ↓
Processed JPEG (metadata removed)
    ↓
Export as {slug}-cover.jpg
```

### Image Specs

| Property | Value | Notes |
|----------|-------|-------|
| **Format** | JPEG | Always JPEG, never PNG |
| **Dimensions** | 1920×1080 | Landscape 16:9 ratio |
| **Size** | 100-500 KB | Typical file size |
| **Quality** | High | Gemini high-quality setting |
| **Source** | Gemini Image API | `gemini-2.5-flash-image` model |
| **Processing** | Canvas | Remove metadata, apply filters |
| **Count** | 1 per article | NOT per episode! |
| **Generation Time** | ~10 seconds | Per image |

---

## Architecture

### Class Structure

```
ContentFactoryOrchestrator
├─ generateCoverImages()
│  └─ calls: ImageWorkerPool.start()
│     └─ for each article:
│        ├─ ImageWorkerPool.generateCoverImage()
│        │  ├─ PlotBibleBuilder.buildFromTheme()
│        │  │  └─ Returns: PlotBible (narrator, sensory, mood)
│        │  └─ ImageGeneratorAgent.generateCoverImage()
│        │     └─ Calls: Gemini API
│        │     └─ Returns: GeneratedImage (base64 JPEG)
│        └─ ImageQueueManager.processItem()
│           └─ Rate limiting (1 image/minute)
│
├─ postProcessCoverImages()
│  └─ ImageProcessorService.processImage()
│     ├─ Decode base64 JPEG
│     ├─ Load via canvas.loadImage()
│     ├─ Redraw on new canvas
│     └─ Export to JPEG (0.8 quality)
│
└─ exportForZen()
   └─ Save {slug}-cover.jpg
```

### Service Responsibilities

| Service | Responsibility | Key Methods |
|---------|-----------------|-------------|
| **ImageGeneratorAgent** | Generate images from prompts using Gemini API | `generateCoverImage()`, `generateWithModel()` |
| **ImageWorkerPool** | Serialize image generation (1/min) with error handling | `enqueueArticles()`, `start()`, `generateCoverImage()` |
| **PlotBibleBuilder** | Create narrative context for image prompts | `buildFromTheme()` |
| **ImageProcessorService** | Post-process JPEG via Canvas (remove metadata) | `processImage()` |
| **ImageQueueManager** | Legacy queue system (now used by ImageWorkerPool) | `start()`, `processItem()` |

---

## Image Generation Flow

### Complete Flow (Step-by-Step)

#### Step 1: Article Ready
```typescript
// Article generated with:
const article = {
  id: 'article_1',
  title: 'Я 30 лет жила с этим позором...',
  content: '...full article text...',
  metadata: {
    theme: 'confession about regret',
    angle: 'personal transformation',
    emotion: 'shame',        // ← Used for image mood
    audience: 'women 35-60'
  }
};
```

#### Step 2: Orchestrator Initiates
```typescript
// In ContentFactoryOrchestrator.start():
await this.generateCoverImages();
  → Extracts ledes (first paragraphs)
  → Calls: ImageWorkerPool.enqueueArticles(articles, ledes)
```

#### Step 3: PlotBible Creation
```typescript
// In ImageWorkerPool.generateCoverImage():
const plotBible = PlotBibleBuilder.buildFromTheme({
  theme: 'confession about regret',
  angle: 'personal transformation',
  emotion: 'shame',
  audience: 'women 35-60'
});

// Returns PlotBible:
{
  narrator: {
    gender: 'female',
    age: 48,
    tone: 'quiet sadness with wisdom',
    voiceMarkers: ['я же тебе скажу', 'честное слово', ...]
  },
  sensoryPalette: {
    details: ['warm', 'intimate', 'quiet', 'domestic'],
    smells: ['холодный чай', 'запах кофе', ...],
    sounds: ['тиканье часов', 'хлопок двери', ...],
    textures: ['потертая бумага', 'холодная поверхность', ...],
    lightSources: ['утренний солнечный свет', ...]
  },
  forbiddenThemes: ['убийство', 'полиция', ...]
}
```

#### Step 4: Image Prompt Building
```typescript
// In ImageGeneratorAgent.buildCoverImagePrompt():
const prompt = `
🔥 CRITICAL: NO TEXT ANYWHERE ON THE IMAGE!

AUTHENTIC mobile phone photo for article cover image.
Title: "Я 30 лет жила с этим позором..."

Scene from opening paragraph: woman sitting at table...

NARRATOR CONTEXT:
- Age: 48 years old
- Gender: Female
- Tone: quiet sadness with wisdom

SENSORY PALETTE:
warm, intimate, quiet, domestic

REQUIREMENTS:
- Natural lighting ONLY (window light, desk lamp, shadows)
- Domestic realism (Russian interior, everyday life)
- Amateur framing (NOT professional composition)
- Depth of field (slight background blur)
- Slight digital noise (like real smartphone camera)
- Natural colors (NOT oversaturated)

🚫 MUST AVOID (CRITICAL for Яндекс.Дзен):
- ANY text, captions, titles, labels, or overlays
- Watermarks or signatures
- ANY visible words or symbols
- Stock photography or glossy look
- Surrealism or strange proportions
- Western style (no American kitchens)
- Violence or shocking content
- Perfect models or professional posing
- Studio lighting
- Fancy interior design

STYLE: Like a photo from neighbor's WhatsApp - authentic, slightly imperfect, real life.
RESULT: 4K detail but amateur aesthetic, like real home photo taken 2018-2020.
PURE IMAGE: No text, no captions, no overlays - just the scene.
`;
```

#### Step 5: Gemini API Call
```typescript
// In ImageGeneratorAgent.generateWithModel():
const response = await this.geminiClient.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: { parts: [{ text: prompt }] },
  config: {
    responseModalities: [Modality.IMAGE],
    temperature: 0.85,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
    imageConfig: { aspectRatio: '16:9' }
  }
});

// Returns:
{
  candidates: [{
    content: {
      parts: [{
        inlineData: {
          data: '/9j/4AAQSkZJRg...base64...', // ← JPEG base64
          mimeType: 'image/jpeg'
        }
      }]
    }
  }]
}
```

#### Step 6: Image Validation
```typescript
// Validation checks:
✓ Has base64 data
✓ Format is image/jpeg
✓ Dimensions are 1920×1080
✓ Aspect ratio is 16:9 ±1%
✓ File size 10KB-5MB
```

#### Step 7: Canvas Post-Processing
```typescript
// In ImageProcessorService.processImage():
const input = 'data:image/jpeg;base64,/9j/4AAQ...'

// Step 7a: Decode base64
const jpegBuffer = Buffer.from(base64Data, 'base64');

// Step 7b: Load via canvas
const image = await canvas.loadImage(jpegBuffer);

// Step 7c: Create new canvas (strips metadata)
const newCanvas = canvas.createCanvas(1920, 1080);
const ctx = newCanvas.getContext('2d');
ctx.drawImage(image, 0, 0);

// Step 7d: Export to JPEG
const processedBuffer = newCanvas.toBuffer('image/jpeg', { quality: 0.8 });

// Result:
// ✓ Metadata removed (EXIF, IPTC)
// ✓ Looks like real smartphone photo
// ✓ Natural compression artifacts
// ✓ ~200KB (typical size)
```

#### Step 8: Attachment to Article
```typescript
article.coverImage = {
  base64: generatedImage.base64,        // base64 from Gemini
  processedBuffer: processedBuffer,     // Processed JPEG from Canvas
  format: 'jpeg',
  mimeType: 'image/jpeg'
};
```

#### Step 9: Export to Disk
```typescript
// In ContentFactoryOrchestrator.exportForZen():
const filename = 'ya-30-let-zhila-s-etim-pozorom-1766250498770';

// Option A: If Canvas succeeded
if (article.coverImage.processedBuffer) {
  fs.writeFileSync(
    `./articles/women-35-60/2025-12-20/${filename}-cover.jpg`,
    article.coverImage.processedBuffer  // ← JPEG buffer from Canvas
  );
}

// Option B: If Canvas failed (fallback)
if (!article.coverImage.processedBuffer) {
  const base64Data = article.coverImage.base64.replace(/^data:image\/\w+;base64,/, '');
  const jpegBuffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(
    `./articles/women-35-60/2025-12-20/${filename}-cover.jpg`,
    jpegBuffer  // ← Original JPEG from Gemini API
  );
}

// Result: articles/women-35-60/2025-12-20/ya-30-let-zhila...-cover.jpg (✅ REAL JPEG)
```

---

## API Reference

### ImageGeneratorAgent

#### `generateCoverImage(request: CoverImageRequest)`

**Purpose:** Generate ONE cover image for article  
**Returns:** GeneratedImage (base64 JPEG)

```typescript
const image = await agent.generateCoverImage({
  title: 'Article title',
  ledeText: 'First paragraph of article...',
  articleId: 'article_123',
  plotBible: plotBibleInstance
});

// Returns:
{
  id: 'img_article_123_1766250498770',
  base64: '/9j/4AAQSkZJRg...', // base64 JPEG
  mimeType: 'image/jpeg',
  width: 1920,
  height: 1080,
  fileSize: 245000,  // bytes
  generatedAt: 1766250498770,
  model: 'gemini-2.5-flash-image',
  prompt: '...',
  metadata: { ... }
}
```

**Key Points:**
- Returns **base64 string** (NOT buffer)
- Format is **always JPEG**
- Dimensions **always 1920×1080**
- Throws on Gemini API errors
- Retries fallback model on failure

#### `generateImage(request: ImageGenerationRequest)` [DEPRECATED]

⚠️ **DEPRECATED** - Use `generateCoverImage()` instead  
This was for per-episode images (v4.0), now we only generate one cover per article.

### ImageWorkerPool

#### `enqueueArticles(articles, ledes)`

**Purpose:** Add articles to generation queue  
**Parameters:**
- `articles: Article[]` - Array of articles
- `ledes: string[]` - First paragraph of each article

```typescript
const articles = [article1, article2, article3];
const ledes = [
  article1.content.split('\n\n')[0],
  article2.content.split('\n\n')[0],
  article3.content.split('\n\n')[0]
];

workerPool.enqueueArticles(articles, ledes);
```

#### `start()`

**Purpose:** Start serial image generation (1/minute)  
**Returns:** CoverImage[]

```typescript
const coverImages = await workerPool.start();
// Returns array of generated cover images
```

**Rate Limiting:**
- Default: 1 image per minute
- Respects Gemini API limits
- Automatic retry on timeout

#### `attachCoverImagesToArticles(articles, coverImages)`

**Purpose:** Attach generated images to article objects  
**1:1 Mapping:** Each image attached to corresponding article

```typescript
workerPool.attachCoverImagesToArticles(articles, coverImages);
// Now: articles[i].coverImage = coverImages[i]
```

### PlotBibleBuilder

#### `buildFromTheme(params: ThemeParams)`

**⚠️ CRITICAL:** This is a **STATIC method**! Don't create instance.

```typescript
// ✅ CORRECT (static method)
const plotBible = PlotBibleBuilder.buildFromTheme({
  theme: 'woman regrets decision',
  angle: 'personal growth',
  emotion: 'shame',
  audience: 'women 35-60'
});

// ❌ WRONG (doesn't exist)
const builder = new PlotBibleBuilder();
const plotBible = builder.build({ ... });  // build() doesn't exist!
```

**Parameters:**
- `theme: string` - Main article theme (required)
- `angle?: string` - Story perspective
- `emotion?: string` - Primary emotion
- `audience?: string` - Target audience

**Returns:** PlotBible

### ImageProcessorService

#### `processImage(base64: string)`

**Purpose:** Post-process JPEG via Canvas  
**Returns:** ImageProcessResult

```typescript
const result = await processor.processImage(
  'data:image/jpeg;base64,/9j/4AAQ...'
);

// Returns:
{
  success: true,
  buffer: Buffer,           // Processed JPEG buffer
  processingStatus: 'OK',
  errorMessage: null,
  format: 'jpeg'
}
```

**Graceful Fallback:**
If Canvas fails, returns `success: false` but doesn't throw.  
Original JPEG is used as fallback.

---

## Integration Points

### ContentFactoryOrchestrator ← Main Entry Point

```typescript
// 1. In start():
await this.generateCoverImages();

// 2. In generateCoverImages():
private async generateCoverImages(): Promise<void> {
  // Extract ledes
  const ledes = this.articles.map(article => {
    const paragraphs = article.content.split('\n\n');
    return paragraphs[0] || article.content.substring(0, 500);
  });

  // Enqueue
  this.imageWorkerPool.enqueueArticles(this.articles, ledes);

  // Generate (serial, 1/min)
  const coverImages = await this.imageWorkerPool.start();

  // Attach to articles
  this.imageWorkerPool.attachCoverImagesToArticles(
    this.articles,
    coverImages
  );
}

// 3. Post-process:
await this.postProcessCoverImages();

// 4. Export:
await this.exportForZen();
```

### EpisodeGeneratorService ← No Integration

⚠️ **NOTE:** Image generation is **NOT** per-episode!  
Do NOT call ImageGeneratorAgent from episodeGeneratorService.

### MultiAgentService ← No Integration

Do NOT integrate image generation here. Images are only generated at article level in orchestrator.

---

## Error Handling & Fallbacks

### Fallback Chain

```
1. Gemini Image API (primary model)
   ↓ Fails
2. Fallback Gemini model (gemini-2.5-flash-exp-02-05)
   ↓ Fails
3. SVG Placeholder (last resort)
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `plotBibleBuilder.build is not a function` | Calling instance method instead of static | Use `PlotBibleBuilder.buildFromTheme()` (static) |
| `API_KEY not found` | Missing GEMINI_API_KEY env var | Set `GEMINI_API_KEY=sk-...` |
| `No candidates in response` | Gemini API returned empty | Check prompt, retry |
| `No image data in response` | Response format unexpected | Check Gemini SDK version |
| `Invalid data URL format` | Canvas received wrong format | Ensure base64 has `data:image/jpeg;base64,` prefix |
| `Timeout after 60s` | Gemini API slow response | Retry, check API status |

### Error Recovery

**In ImageWorkerPool:**
```typescript
private async generateCoverImage(article, lede): Promise<CoverImage> {
  try {
    // Try to generate real image
    const plotBible = PlotBibleBuilder.buildFromTheme({ ... }); // ← MUST be static!
    const image = await this.imageGeneratorAgent.generateCoverImage({ ... });
    return image;
  } catch (error) {
    console.warn(`Image generation failed: ${error.message}`);
    // Fallback to SVG placeholder
    return this.generatePlaceholderImage(article.title, article.emotion);
  }
}
```

**In ContentFactoryOrchestrator.postProcessCoverImages():**
```typescript
if (processorResult.success && processorResult.buffer) {
  // Canvas succeeded
  article.coverImage.processedBuffer = processorResult.buffer;
} else {
  // Canvas failed - keep original JPEG (from Gemini API)
  console.warn(`Canvas failed: ${processorResult.errorMessage}`);
  // Fallback: original JPEG will be used in exportForZen()
}
```

---

## Debugging Guide

### Enable Verbose Logging

```typescript
const agent = new ImageGeneratorAgent(apiKey, {
  verbose: true,  // Enable detailed logs
  enableFallback: true,
  maxRetries: 2
});
```

### Check Image Generation Logs

Look for these patterns:

✅ **SUCCESS:**
```
🎨 Generating COVER image for article: "Title..."
📝 Cover prompt built (1477 chars)
✅ Image generated in 9490ms
✅ Cover image generated successfully for article article_1
```

❌ **SVG FALLBACK (Bug):**
```
📦 Image generation failed (plotBibleBuilder.build is not a function), using fallback SVG...
✅ Generated (1308 bytes, data:image/svg+xml;base64,...)
```

✅ **CORRECTED (After Fix):**
```
📝 Cover prompt built (1477 chars)
✅ Image generated in 9490ms
📼 Cover 1/1: Generating for "Я 30 лет жила..."
✅ Generated (245000 bytes, /9j/4AAQSkZJRg...)
```

### Inspect Generated Images

```bash
# Check image file
ls -lh articles/women-35-60/2025-12-20/*-cover.jpg

# Verify it's JPEG (not SVG)
file articles/women-35-60/2025-12-20/*-cover.jpg
# Should output: JPEG image data, ...

# Check file size (should be >50KB, not <10KB like SVG)
du -h articles/women-35-60/2025-12-20/*-cover.jpg
```

### Trace API Calls

```typescript
// Add logging in ImageGeneratorAgent.generateWithModel()
console.log(`🔍 Calling Gemini API with model: ${model}`);
console.log(`📝 Prompt length: ${prompt.length}`);
console.log(`🎨 Image config: aspectRatio=16:9, quality=high`);

// Log response
console.log(`✅ Response received:`);
console.log(`  - Candidates: ${response.candidates?.length || 0}`);
console.log(`  - Parts: ${response.candidates?.[0]?.content?.parts?.length || 0}`);
console.log(`  - InlineData: ${response.candidates?.[0]?.content?.parts?.[0]?.inlineData ? 'yes' : 'no'}`);
console.log(`  - Base64 length: ${baseData?.length || 0}`);
```

---

## Common Mistakes

### ❌ Mistake 1: Instance Method Instead of Static

**WRONG:**
```typescript
const plotBibleBuilder = new PlotBibleBuilder();
const plotBible = plotBibleBuilder.build({ ... });  // ← Crashes!
```

**CORRECT:**
```typescript
const plotBible = PlotBibleBuilder.buildFromTheme({ ... });  // ← Static method
```

**Why:** `PlotBibleBuilder` has ONLY static methods. Creating instance and calling `.build()` throws `is not a function`.

### ❌ Mistake 2: Generating Image Per Episode

**WRONG:**
```typescript
// In episodeGeneratorService.ts:
for (const episode of episodes) {
  const image = await imageGenerator.generateImage(episode);  // ← Wrong!
  episode.coverImage = image;
}
```

**CORRECT:**
```typescript
// In contentFactoryOrchestrator.ts:
// Generate ONE image per ARTICLE, not per episode
await this.generateCoverImages();  // ← One cover per article
```

**Why:** Gemini Image API rate limit is 1/min. Generating 12+ images per article = too slow + expensive.

### ❌ Mistake 3: Not Extracting Lede Before Enqueueing

**WRONG:**
```typescript
this.imageWorkerPool.enqueueArticles(articles, articles);
// ← Passes full article objects instead of first paragraphs
```

**CORRECT:**
```typescript
const ledes = articles.map(a => {
  const paragraphs = a.content.split('\n\n');
  return paragraphs[0] || a.content.substring(0, 500);
});
this.imageWorkerPool.enqueueArticles(articles, ledes);
```

**Why:** Lede (first paragraph) provides visual context for image. Full article text is too long for prompt.

### ❌ Mistake 4: Ignoring Canvas Failures Silently

**WRONG:**
```typescript
try {
  const result = await processor.processImage(base64);
  // If Canvas fails, result.success = false but we don't check
  article.coverImage.processedBuffer = result.buffer;  // ← null!
} catch (error) {
  // Empty catch
}
```

**CORRECT:**
```typescript
const result = await processor.processImage(base64);
if (result.success && result.buffer) {
  article.coverImage.processedBuffer = result.buffer;  // ← Processed JPEG
} else {
  console.warn(`Canvas failed: ${result.errorMessage}`);
  // Fallback: use original JPEG (don't set processedBuffer)
  // exportForZen() will detect null and use original base64
}
```

**Why:** Canvas can fail gracefully (no throw). We need to check `result.success` and provide fallback.

### ❌ Mistake 5: Wrong Data Format for Canvas

**WRONG:**
```typescript
const base64 = '/9j/4AAQSkZJRg...';  // ← No data URL prefix
await processor.processImage(base64);  // ← Canvas fails
```

**CORRECT:**
```typescript
const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
await processor.processImage(base64);
```

**Why:** Canvas expects full data URL with MIME type and base64 prefix.

### ❌ Mistake 6: Calling Methods on Undefined PlotBible

**WRONG:**
```typescript
const plotBible = undefined;
const prompt = `Age: ${plotBible.narrator.age}`; // ← Crashes!
```

**CORRECT:**
```typescript
const plotBible = PlotBibleBuilder.buildFromTheme({ theme: '...' });
const prompt = `Age: ${plotBible.narrator?.age || 40}`;  // Safe fallback

// Or in buildCoverImagePrompt():
const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
const sensoryPalette = plotBible?.sensoryPalette || { details: ['warm', 'intimate'] };
```

**Why:** PlotBible can be undefined or incomplete. Always provide safe defaults.

---

## Performance Tips

### 1. Parallel Article Generation, Serial Image Generation

```typescript
// ✅ FAST: Generate 10 articles in parallel
//    + 10 images serially (1/min each = 10 min)
const articles = await articleWorkerPool.executeBatch(10);
await imageWorkerPool.start();  // Serial, respects rate limit

// ❌ SLOW: Don't generate images per-episode
//    10 articles × 8 episodes = 80 images × 1/min = 80 min!
```

### 2. Batch Canvas Processing

```typescript
// ✅ Process all images in sequence
for (const article of articles) {
  if (article.coverImage?.base64) {
    const result = await processor.processImage(article.coverImage.base64);
    // Attach result
  }
}

// ❌ Don't parallelize (Canvas is CPU-bound)
Promise.all(articles.map(a => processor.processImage(a.coverImage.base64)));
```

### 3. Cache PlotBible per Theme

```typescript
// For articles with same theme/emotion, reuse PlotBible
const plotBibleCache = new Map();
const cacheKey = `${article.theme}|${article.emotion}`;

if (plotBibleCache.has(cacheKey)) {
  plotBible = plotBibleCache.get(cacheKey);
} else {
  plotBible = PlotBibleBuilder.buildFromTheme({ ... });
  plotBibleCache.set(cacheKey, plotBible);
}
```

### 4. Monitor Gemini API Quotas

```typescript
// Log API calls
let apiCallCount = 0;
const maxCallsPerDay = 1500;  // Check your quota

for (const article of articles) {
  if (apiCallCount >= maxCallsPerDay) {
    console.error('❌ Reached daily API limit');
    break;
  }
  // Generate image
  apiCallCount++;
}
```

---

## Testing

### Unit Test: PlotBibleBuilder

```typescript
import { PlotBibleBuilder } from '../services/plotBibleBuilder';

describe('PlotBibleBuilder', () => {
  it('should create PlotBible from theme (static method)', () => {
    // ✅ Use static method
    const plotBible = PlotBibleBuilder.buildFromTheme({
      theme: 'woman regrets decision',
      angle: 'personal growth',
      emotion: 'shame',
      audience: 'women 35-60'
    });

    // Assertions
    expect(plotBible.narrator).toBeDefined();
    expect(plotBible.narrator.age).toBeGreaterThan(30);
    expect(plotBible.narrator.age).toBeLessThan(70);
    expect(plotBible.sensoryPalette).toBeDefined();
  });

  it('should not allow instance method .build()', () => {
    // ❌ This should fail
    const builder = new PlotBibleBuilder();
    expect(() => builder.build({ ... })).toThrow('build is not a function');
  });
});
```

### Integration Test: Image Generation

```typescript
import { ImageWorkerPool } from '../services/imageWorkerPool';
import { ContentFactoryOrchestrator } from '../services/contentFactoryOrchestrator';

describe('Image Generation', () => {
  it('should generate JPEG cover image (not SVG)', async () => {
    const articles = [createTestArticle()];
    const ledes = [articles[0].content.split('\n\n')[0]];
    
    const pool = new ImageWorkerPool(process.env.GEMINI_API_KEY);
    pool.enqueueArticles(articles, ledes);
    
    const images = await pool.start();
    
    // Verify JPEG
    expect(images).toHaveLength(1);
    expect(images[0].base64).toMatch(/^data:image\/jpeg;base64,\/9j\/4AAQ/);
    expect(images[0].size).toBeGreaterThan(50000);  // >50KB = real image
  });

  it('should attach images to articles', async () => {
    const pool = new ImageWorkerPool();
    const articles = [createTestArticle()];
    const images = [createTestImage()];
    
    pool.attachCoverImagesToArticles(articles, images);
    
    expect(articles[0].coverImage).toBeDefined();
    expect(articles[0].coverImage.base64).toBe(images[0].base64);
  });
});
```

### Manual Test: End-to-End

```bash
# 1. Run factory with images
npm run factory -- --count=1 --channel=test-images --images

# 2. Verify image is JPEG (not SVG)
file ./articles/test-images/2025-12-20/*-cover.jpg
# Expected: JPEG image data, ...

# 3. Check file size
ls -lh ./articles/test-images/2025-12-20/*-cover.jpg
# Expected: >100KB (not <10KB like SVG)

# 4. View image
open ./articles/test-images/2025-12-20/article-title-cover.jpg
# Expected: Real photograph (not placeholder)
```

---

## Related Documentation

- [ContentFactory Guide](./CONTENT_FACTORY_GUIDE.md) - Overall factory architecture
- [PlotBible Guide](./PLOT_BIBLE_GUIDE.md) - Narrative DNA for images
- [API Reference](./API_REFERENCE.md) - Gemini API configuration

---

## Changelog

### v4.1 (2025-12-20)
- ✅ **FIXED:** SVG fallback bug in ImageWorkerPool
- ✅ **FIXED:** PlotBibleBuilder method call (static vs instance)
- ✅ **ADDED:** Comprehensive debugging guide
- ✅ **ADDED:** Common mistakes section
- ✅ **UPDATED:** Error handling documentation

### v4.0 (2025-12-19)
- Initial release
- One cover image per article (not per episode)
- Gemini Image API integration
- Canvas post-processing
- SVG fallback

---

**Last Updated:** 2025-12-20  
**Version:** 4.0+  
**Status:** Production  
**Author:** AI Agent
