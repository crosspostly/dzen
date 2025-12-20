# 🎨 Image Generation - Quick Reference

**For**: Developers working with image generation  
**Last Updated**: 2025-12-20  
**Read Time**: 5 minutes

---

## 🎯 Quick Facts

| Item | Value | Note |
|------|-------|------|
| **Images per Article** | 1 cover | NOT per episode! |
| **Format** | JPEG | Always JPEG, never PNG/SVG |
| **Dimensions** | 1920×1080 | 16:9 aspect ratio |
| **Generation Time** | ~10 sec | Per image (rate limit 1/min) |
| **Source** | Gemini API | `gemini-2.5-flash-image` model |
| **Processing** | Canvas | Remove metadata, apply filters |
| **Fallback** | SVG placeholder | Only if API fails (rare) |

---

## 🚫 CRITICAL MISTAKES (Don't Do These!)

### ❌ Mistake #1: Instance Method Instead of Static

```typescript
// WRONG ❌
const builder = new PlotBibleBuilder();
const plotBible = builder.build({ ... });  // throws: "build is not a function"

// CORRECT ✅
const plotBible = PlotBibleBuilder.buildFromTheme({ ... });  // static method
```

**Why**: `PlotBibleBuilder` only has static methods. No instance methods exist.  
**Result if wrong**: SVG fallback instead of real image 🔴

---

### ❌ Mistake #2: Image Per Episode

```typescript
// WRONG ❌
for (const episode of episodes) {  // 12 episodes per article
  const image = await generator.generateImage(episode);  // 12+ images!
}

// CORRECT ✅
// Generate ONE image per ARTICLE only
await orchestrator.generateCoverImages();  // 1 image per article
```

**Why**: Gemini rate limit is 1/min. 12 images = 12+ minutes per article.  
**Result if wrong**: Extremely slow generation 🔴

---

### ❌ Mistake #3: Not Extracting Lede First

```typescript
// WRONG ❌
const ledes = articles;  // Passing full articles instead of first paragraph
workerPool.enqueueArticles(articles, ledes);

// CORRECT ✅
const ledes = articles.map(a => {
  const paragraphs = a.content.split('\n\n');
  return paragraphs[0] || a.content.substring(0, 500);
});
workerPool.enqueueArticles(articles, ledes);
```

**Why**: Lede provides visual context. Full article = too long for prompt.  
**Result if wrong**: Poor image quality, slow generation 🔴

---

### ❌ Mistake #4: Ignoring Canvas Errors

```typescript
// WRONG ❌
const result = await processor.processImage(base64);
article.coverImage.processedBuffer = result.buffer;  // null if Canvas failed!

// CORRECT ✅
if (result.success && result.buffer) {
  article.coverImage.processedBuffer = result.buffer;  // Canvas OK
} else {
  console.warn(`Canvas failed: ${result.errorMessage}`);
  // Fallback: original JPEG will be used
}
```

**Why**: Canvas can fail gracefully (no throw). Must check `result.success`.  
**Result if wrong**: Null image data, export fails 🔴

---

### ❌ Mistake #5: Wrong Data Format for Canvas

```typescript
// WRONG ❌
const base64 = '/9j/4AAQSkZJRg...';  // Missing prefix!
await processor.processImage(base64);

// CORRECT ✅
const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
await processor.processImage(base64);
```

**Why**: Canvas expects full data URL with MIME type.  
**Result if wrong**: Canvas fails, SVG fallback 🔴

---

### ❌ Mistake #6: Undefined PlotBible

```typescript
// WRONG ❌
const plotBible = await someFunction();  // Could be undefined
const prompt = `Age: ${plotBible.narrator.age}`;  // Crashes!

// CORRECT ✅
const narrator = plotBible?.narrator || { age: 40, gender: 'female', tone: 'confessional' };
const prompt = `Age: ${narrator.age}`;  // Safe
```

**Why**: PlotBible can be undefined or incomplete. Always provide defaults.  
**Result if wrong**: Runtime crash 🔴

---

## ✅ Correct Flow (Step by Step)

```
1. Article ready (title + lede extracted)
   ↓
2. PlotBibleBuilder.buildFromTheme()  ← STATIC method
   ↓ Returns PlotBible object
3. ImageGeneratorAgent.generateCoverImage()
   ↓ Calls Gemini API
4. Gemini returns base64 JPEG
   ↓
5. ImageProcessorService.processImage()
   ↓ Canvas post-processing
6. If Canvas OK: use processedBuffer
   If Canvas fails: use original JPEG
   ↓
7. Export to: {slug}-cover.jpg ✅
```

---

## 🔧 Key Classes & Methods

### PlotBibleBuilder

```typescript
// ✅ STATIC METHOD (use this!)
const plotBible = PlotBibleBuilder.buildFromTheme({
  theme: 'woman regrets decision',
  angle: 'personal growth',
  emotion: 'shame',
  audience: 'women 35-60'
});

// Returns PlotBible:
// {
//   narrator: { gender, age, tone, voiceMarkers },
//   sensoryPalette: { details, smells, sounds, textures, lightSources },
//   protagonist: { name, age, traits, ... },
//   antagonist: { ... },
//   timeline: { ... },
//   forbiddenThemes: [...]
// }
```

### ImageGeneratorAgent

```typescript
// Generate one cover image
const image = await agent.generateCoverImage({
  title: 'Article title',
  ledeText: 'First paragraph...',
  articleId: 'article_123',
  plotBible: plotBibleInstance
});

// Returns:
// {
//   base64: '/9j/4AAQSkZJRg...',  // JPEG base64
//   mimeType: 'image/jpeg',
//   width: 1920,
//   height: 1080,
//   fileSize: 245000,
//   ...
// }
```

### ImageWorkerPool

```typescript
// 1. Enqueue articles
workerPool.enqueueArticles(articles, ledes);

// 2. Generate serially (1/min)
const coverImages = await workerPool.start();

// 3. Attach to articles
workerPool.attachCoverImagesToArticles(articles, coverImages);

// Now: articles[i].coverImage = coverImages[i]
```

### ImageProcessorService

```typescript
// Post-process JPEG via Canvas
const result = await processor.processImage(
  'data:image/jpeg;base64,/9j/4AAQ...'
);

// Returns:
// {
//   success: true/false,
//   buffer: Buffer,              // Processed JPEG
//   processingStatus: 'OK' | 'FAILED',
//   errorMessage: null | 'error text',
//   format: 'jpeg'
// }
```

---

## 🐛 Debug Checklist

If images are **SVG instead of JPEG**:

- [ ] Check error log for: `plotBibleBuilder.build is not a function`
- [ ] Verify using `PlotBibleBuilder.buildFromTheme()` (static)
- [ ] NOT `new PlotBibleBuilder().build()` (doesn't exist)

If images are **missing or null**:

- [ ] Check Canvas failed: `ImageProcessorService.processImage()` returned `success: false`
- [ ] Fallback should use original JPEG from Gemini API
- [ ] Verify export logic checks both `processedBuffer` and `base64`

If generation is **too slow**:

- [ ] Verify generating **1 image per article** (not per episode!)
- [ ] Rate limiting: 1 image per minute (Gemini API limit)
- [ ] Check queue: should be serial, not parallel

If images are **wrong size/aspect**:

- [ ] Verify `imageConfig: { aspectRatio: '16:9' }` in Gemini API call
- [ ] Check image dimensions: should be 1920×1080
- [ ] File size should be >100KB (not <10KB like SVG)

---

## 📊 Image Specs

```
┌─────────────────────────────────────────┐
│      CORRECT JPEG IMAGE SPECS          │
├─────────────────────────────────────────┤
│ Format: JPEG (image/jpeg)               │
│ Dimensions: 1920×1080                   │
│ Aspect Ratio: 16:9 (±1%)                │
│ File Size: 100-500 KB                   │
│ Quality: High (0.8)                     │
│ Color Space: RGB/sRGB                   │
│ Metadata: Removed (Canvas processing)   │
│ Source: Gemini Image API                │
│ Authentication: ✅ Human-like photo     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      WRONG SVG FALLBACK SPECS           │
├─────────────────────────────────────────┤
│ Format: SVG (image/svg+xml)             │
│ Size: <10 KB                            │
│ Content: Placeholder with text          │
│ Source: Fallback (API failed)           │
│ Authentication: ❌ Obviously fake       │
│ Zen Rating: REJECTED                    │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing

### Verify Image Generation Works

```bash
# Run factory with images
npm run factory -- --count=1 --channel=test --images

# Check output is JPEG
file ./articles/test/2025-12-20/*-cover.jpg
# Expected: JPEG image data, ...
# NOT: SVG ...

# Check file size
ls -lh ./articles/test/2025-12-20/*-cover.jpg
# Expected: >100KB
# NOT: <10KB
```

### Check Logs

```
✅ CORRECT (JPEG generated):
  📝 Cover prompt built (1477 chars)
  ✅ Image generated in 9490ms
  ✅ Generated (245000 bytes, /9j/4AAQ...)

❌ WRONG (SVG fallback):
  📦 Image generation failed (plotBibleBuilder.build is not a function)
  ✅ Generated (1308 bytes, data:image/svg+xml;base64,...)
```

---

## 📚 Read More

- **Full Guide**: [IMAGE_GENERATION_GUIDE.md](./IMAGE_GENERATION_GUIDE.md) (1500+ lines)
- **ROADMAP**: [ROADMAP.md](./ROADMAP.md) - Development timeline and milestones
- **Bug Report**: [PR #47](https://github.com/crosspostly/dzen/pull/47) - SVG fallback fix

---

## ⚡ One-Liner Fixes

```typescript
// Fix #1: Use static method
- const plotBible = new PlotBibleBuilder().build({ ... });
+ const plotBible = PlotBibleBuilder.buildFromTheme({ ... });

// Fix #2: One image per article
- for (const ep of episodes) await generateImage(ep);  // 12+ images
+ await orchestrator.generateCoverImages();             // 1 image

// Fix #3: Extract lede first
- workerPool.enqueueArticles(articles, articles);
+ const ledes = articles.map(a => a.content.split('\n\n')[0]);
+ workerPool.enqueueArticles(articles, ledes);

// Fix #4: Check Canvas result
- article.coverImage.processedBuffer = result.buffer;
+ if (result.success) article.coverImage.processedBuffer = result.buffer;

// Fix #5: Use full data URL
- await processor.processImage(base64Str);
+ await processor.processImage(`data:image/jpeg;base64,${base64Str}`);

// Fix #6: Safe PlotBible access
- const age = plotBible.narrator.age;
+ const age = plotBible?.narrator?.age || 40;
```

---

**Last Updated**: 2025-12-20  
**Status**: Production  
**Version**: 4.1 (image generation fix)
