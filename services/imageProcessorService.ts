import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage, Canvas, Image } from 'canvas';

export class ImageProcessorService {
  /**
   * 🎨 Обрабатывает изображение:
   * 1. Кроппирует/масштабирует к 16:9 (1280x720)
   * 2. Перерисовывает через Canvas (удаляет ВСЕ метаданные Gemini)
   * 3. Применяет фильтры "бытового фото"
   * 4. Экспортирует в JPEG 0.8 quality (естественные артефакты)
   */
  async processImage(dataUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Удаляем data URL префикс и загружаем
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      
      loadImage(Buffer.from(base64, 'base64')).then((img) => {
        try {
          // 1️⃣ ВЫЧИСЛИТЬ 16:9 РАЗМЕР (1280x720)
          const targetWidth = 1280;
          const targetHeight = 720;
          const targetAspectRatio = targetWidth / targetHeight; // 16/9 = 1.777...
          
          // Вычислить размеры исходного изображения
          const sourceAspectRatio = img.width / img.height;
          
          let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
          
          // Кроппировать исходное изображение к 16:9
          if (sourceAspectRatio > targetAspectRatio) {
            // Исходное шире чем 16:9 - обрезать по ширине
            srcWidth = img.height * targetAspectRatio;
            srcX = (img.width - srcWidth) / 2;
          } else {
            // Исходное выше чем 16:9 - обрезать по высоте
            srcHeight = img.width / targetAspectRatio;
            srcY = (img.height - srcHeight) / 2;
          }
          
          // 2️⃣ СОЗДАТЬ НОВЫЙ CANVAS 16:9 (1280x720)
          const canvas = createCanvas(targetWidth, targetHeight);
          const ctx = canvas.getContext('2d');

          // 3️⃣ ПЕРВАЯ ПЕРЕРИСОВКА - ОЧИСТКА МЕТАДАННЫХ
          // Это полностью удаляет EXIF, IPTC, все подписи Gemini
          // Вся информация о ИИ-происхождении СТИРАЕТСЯ здесь
          ctx.drawImage(
            img, 
            srcX, srcY, srcWidth, srcHeight,  // Кроппированное исходное
            0, 0, targetWidth, targetHeight    // На новый 16:9 canvas
          );

          // 4️⃣ ПРИМЕНЕНИЕ ФИЛЬТРА "БЫТОВОЕ ФОТО"
          // Имитирует реальное фото со смартфона
          // @ts-ignore - canvas filter не всегда определен в типах
          (ctx as any).filter = 'contrast(1.05) saturate(0.85) brightness(0.98)';
          
          // 5️⃣ ВТОРАЯ ПЕРЕРИСОВКА - ПРИМЕНИТЬ ФИЛЬТР
          // Еще раз перерисовываем с фильтром (дополнительная очистка)
          ctx.drawImage(canvas, 0, 0);

          // 6️⃣ ЭКСПОРТ В JPEG 0.8 QUALITY
          // - PNG был бы слишком чистый (выдал бы происхождение)
          // - JPEG 0.8 добавляет естественные артефакты сжатия
          // - Выглядит как фото через мессенджер
          const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
          
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * 💾 Сохраняет обработанное изображение на диск
   */
  async saveImage(
    processedBuffer: Buffer,
    articleTitle: string,
    outputDir: string
  ): Promise<string> {
    const sanitizedTitle = articleTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const imagePath = path.join(outputDir, `${sanitizedTitle}.jpg`);
    
    fs.writeFileSync(imagePath, processedBuffer, 'binary');
    
    console.log(`   ✅ Image saved (16:9 1280x720): ${path.basename(imagePath)}`);
    
    return imagePath;
  }
}