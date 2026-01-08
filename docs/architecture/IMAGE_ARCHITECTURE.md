# 📸 ZenMaster v3.5 - Image Generation Architecture

## 🎯 Visual Philosophy

**Primary Goal**: Images should look like authentic home photos taken by regular people on smartphones (Samsung A-series or iPhone 2018-2020) in real domestic conditions.

**Target Aesthetic**: "Like a photo from a neighbor's WhatsApp" - authentic, slightly imperfect, real life.

---

## ✅ MUST HAVE (Обязательно)

### 1. **16:9 Aspect Ratio**
- Always horizontal orientation
- Standard smartphone landscape mode
- Resolution: 1280x720px minimum

### 2. **Domestic Realism**
Background details should be **recognizable** and **Russian**:
- Old curtains (тюль, занавески)
- Soviet or modern furniture (серванты, диваны, столы)
- Tea cups (кружки в цветочек)
- Tea packages (пачки чая, печенье)
- Real clutter (пульты, газеты, книги)
- Simple interior design (no luxury)

**Examples of good backgrounds:**
```
- Old Soviet apartment with worn curtains and wallpaper
- Modern but lived-in apartment with family clutter
- Small kitchen with old cabinets and simple furniture
- Bedroom with simple furniture and family photos
```

### 3. **Natural Lighting Only**
- Window light (best)
- Desk lamp or ceiling light
- Shadows (realistic)
- **NO studio lighting** (no softboxes, reflectors, or professional setups)
- **NO harsh overhead lights**
- Colors appear slightly cool or warm depending on time of day

### 4. **"Live Photo" Effect**
- Slight digital noise (realistic smartphone camera noise)
- Natural depth of field (background slightly blurred)
- Not overly sharp (amateur framing)
- Natural colors (not oversaturated or edited)
- Slight vignetting (natural, not obvious)

### 5. **Authentic Typology**
People should look like real Russian women (35-60 years old):
- Visible wrinkles, age marks (морщины)
- Imperfect hairstyles (not salon perfect)
- Simple clothing:
  - Halats (халаты - home robes)
  - Sweaters and cardigans
  - Casual jackets
  - Simple home wear
- Real facial expressions (not posed smiles)
- Natural makeup or no makeup

---

## ❌ MUST NOT (Категорически запрещено)

### 1. **Stock Photography or Glossy Look**
- ❌ Perfect models with ideal teeth
- ❌ Professional makeup and styling
- ❌ Posed smiles or artificial expressions
- ❌ Instagram-style filtered photos
- ❌ Oversaturated colors
- ❌ Perfect lighting and composition

### 2. **Text or Watermarks**
- ❌ Any text on image
- ❌ Watermarks or logos
- ❌ Date/time stamps
- ❌ Platform logos

### 3. **Surrealism**
- ❌ Flying objects
- ❌ Strange proportions
- ❌ Impossible physics
- ❌ Fantasy elements
- ❌ Double exposures

### 4. **Western Style**
- ❌ American kitchens with islands
- ❌ Scandinavian minimalism
- ❌ Luxury furniture
- ❌ Expensive modern design
- ❌ Non-Russian context

### 5. **Dark/Shocking Content**
- ❌ Blood or violence
- ❌ Dead bodies
- ❌ Open violence or weapons
- ❌ Shocking/disturbing imagery
- ❌ Content that could get article banned on Yandex.Zen

---

## 🛠 Prompt Formula

### Base Template
```
AUTHENTIC mobile phone photo, taken on mid-range smartphone 
(iPhone 2018-2020 or Samsung A-series).
Russian interior/domestic context.
Subject: [SCENE_DESCRIPTION]

REQUIREMENTS:
- 16:9 aspect ratio, horizontal
- Natural lighting (window, desk lamp, shadows - NO studio)
- Domestic realism (old curtains, Soviet furniture, clutter)
- Amateur framing (not professional)
- Depth of field (slight background blur)
- High realism with non-professional aesthetic
- Slight digital noise
- Authentic Russian woman typology (35-60, wrinkles, imperfect hair, simple clothes)
- Natural colors (NOT oversaturated)

STYLE: Like a photo from neighbor's WhatsApp.
RESULT: 4K detail but amateur aesthetic.
```

### Scene Description Examples

**GOOD descriptions** (detailed, visual, specific):
```
"Woman 35-40 in kitchen, making tea, sunlight from window, 
worn curtains in background, Soviet era furniture, morning atmosphere, 
natural wrinkles visible, wearing simple home cardigan"

"Two friends at kitchen table, one crying, the other holding her hand, 
Russian apartment interior, warm lamp light, tea cups and cookies, 
real emotion, lived-in space"

"Young mother with child on couch, morning sunlight, 
family apartment, simple furniture, natural moment, 
worn fabric, real domestic scene"

"Woman 50+ in bedroom, sitting by window, thoughtful expression, 
Russian interior, natural side lighting, age-appropriate appearance, 
wearing simple clothes, realistic wrinkles"
```

**BAD descriptions** (too generic, unclear, problematic):
```
❌ "woman" (too generic)
❌ "happy people" (unclear context)
❌ "beautiful girl in luxury apartment" (wrong typology)
❌ "surreal landscape" (wrong domain)
❌ "couple in romantic setting" (might be too glossy)
❌ "woman crying with blood" (forbidden content)
```

---

## 🎬 Integration Points

### In episodeGeneratorService:
```typescript
// Generate episode text
const episode = await generateEpisode(outline);

// Extract scene description from first sentence + outline
const sceneDescription = `
  ${episode.content.split('.')[0]}.
  ${outline.externalConflict}.
  Atmosphere: ${outline.emotion}
`;

// Generate image in parallel or after
const image = await imageGenerator.generateVisual(sceneDescription);

// Validate before use
const validation = imageGenerator.validateDescription(sceneDescription);
if (!validation.valid) {
  console.warn('Scene description issues:', validation.warnings);
}
```

### Image Processing Pipeline:
```
Gemini Generate (PNG base64)
  ↓
ImageProcessorService (Canvas):
  - Crop to 16:9 (1280x720)
  - Apply filters (contrast, saturation)
  - Redraw for metadata cleanup
  ↓
MetadataCleanerService (optional):
  - Scan for EXIF/IPTC/XMP
  - Redraw again for complete cleanup
  ↓
Save as JPEG 0.8 quality
```

---

## 📊 Quality Checklist

Before using generated image:

- [ ] Aspect ratio is 16:9 (or close)
- [ ] Image shows Russian domestic interior
- [ ] Lighting is natural (not studio)
- [ ] People look authentic (wrinkles, simple clothes, imperfect hair)
- [ ] No visible text or watermarks
- [ ] Colors are natural (not oversaturated)
- [ ] Background has recognizable details
- [ ] Image matches scene description
- [ ] No forbidden content (violence, surrealism, Western style)
- [ ] File size is reasonable (<500KB after processing)

---

## 🚀 Future Improvements

1. **Image Validation**: Add AI check to ensure generated images meet quality standards
2. **Fallback Generation**: If image fails validation, retry with adjusted prompt
3. **Caching**: Cache good scene descriptions to avoid regenerating
4. **A/B Testing**: Test multiple prompts to find optimal wording
5. **Performance**: Parallel image generation (multiple images at once)

---

## 📚 References

- Prompt Architecture: ZenMaster v3.5
- Target Platform: Yandex.Zen
- Target Audience: Women 35-60 years old, Russian domestic context
- Smartphone Models: iPhone 2018-2020, Samsung A-series
- Generation Model: Gemini 2.5 Flash Image
