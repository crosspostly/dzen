# ZenMaster v4.0 - Models Configuration

## ✅ РАБОЧИЕ МОДЕЛИ (WORKING)

### Текст / Text Generation
```
✅ gemini-2.5-flash
```
- Генерирует outline и episodes
- Скорость: ~2-3 мин на 1 статью (12 эпизодов)
- Качество: отличное

### Изображения / Image Generation
```
✅ gemini-2.5-flash-vision
```
- Генерирует cover images (PNG, 16:9, 4K)
- Rate: 1 изображение в минуту
- Качество: реалистичные домашние фото

---

## ❌ НЕ ИСПОЛЬЗОВАТЬ (DO NOT USE)

```
❌ gemini-2.0-flash-exp-01-21  (BROKEN - удаленный API)
❌ gemini-2.0-flash  (deprecated)
❌ gemini-1.5-flash  (outdated)
```

---

## 📋 Configuration

### v4.0 CLI
```bash
npx tsx cli.ts generate:v4 \
  --count=10 \
  --includeImages=true \
  --quality=premium
```

### models config
```typescript
export const MODELS = {
  text: "gemini-2.5-flash",        // ✅ articles
  images: "gemini-2.5-flash-vision" // ✅ cover images
};
```

---

## 🚀 Output

```
output/
├─ article-1/
│  ├─ article-1.txt (для Дзена)
│  ├─ article-1-cover.png (1920×1080)
│  └─ article-1.json (метаданные)
├─ article-2/
│  ├─ article-2.txt
│  ├─ article-2-cover.png
│  └─ article-2.json
└─ REPORT.md (статистика)
```

**Время генерации:**
- 10 статей: ~50 мин (article gen 5 мин + image queue 60 мин параллельно)
- 100 статей: ~2 часа (article gen 50 мин + image queue 600 мин параллельно)
