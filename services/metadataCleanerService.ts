import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';

/**
 * 🧹 MetadataCleanerService
 * 
 * Очищает ПОЛНОСТЬЮ всю метаду JPG файлов:
 * - EXIF данные
 * - IPTC данные
 * - XMP данные
 * - Комментарии и подписи
 * - Информация о софте (Google Gemini, Kamerapixel и т.д.)
 */
export class MetadataCleanerService {
  
  /**
   * 🔍 Читает JPG файл и проверяет его на наличие метаданных
   */
  async scanForMetadata(imagePath: string): Promise<{
    hasEXIF: boolean;
    hasIPTC: boolean;
    hasXMP: boolean;
    software?: string;
    creator?: string;
  }> {
    try {
      const buffer = fs.readFileSync(imagePath);
      
      // Ищем маркеры метаданных в буфере
      const bufferString = buffer.toString('binary');
      
      return {
        hasEXIF: bufferString.includes('Exif') || bufferString.includes('exif'),
        hasIPTC: bufferString.includes('Photoshop') || bufferString.includes('8BIM'),
        hasXMP: bufferString.includes('<?xpacket') || bufferString.includes('xpacket'),
        software: this.extractMetadataValue(bufferString, 'Software'),
        creator: this.extractMetadataValue(bufferString, 'Creator'),
      };
    } catch (error) {
      console.error('❌ Scan failed:', (error as Error).message);
      return {
        hasEXIF: false,
        hasIPTC: false,
        hasXMP: false,
      };
    }
  }

  /**
   * 🔧 Перерисовывает JPG через Canvas (удаляет 100% метаданных)
   */
  async stripAllMetadata(imagePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const imageBuffer = fs.readFileSync(imagePath);
      
      loadImage(imageBuffer).then((img) => {
        try {
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');

          // ✨ ЕДИНСТВЕННАЯ ОПЕРАЦИЯ: перерисовать
          // Это ПОЛНОСТЬЮ стирает все метаданные
          ctx.drawImage(img, 0, 0);

          // Экспорт как чистый JPEG
          const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
          
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      }).catch((error) => {
        reject(new Error(`Failed to load image for metadata stripping: ${error.message}`));
      });
    });
  }

  /**
   * 💾 Применяет очистку к файлу (перезаписывает)
   */
  async cleanFile(imagePath: string, backup: boolean = true): Promise<void> {
    console.log(`   🧹 Cleaning metadata from: ${path.basename(imagePath)}`);

    // Опционально: создать бэкап
    if (backup) {
      const backupPath = `${imagePath}.backup`;
      fs.copyFileSync(imagePath, backupPath);
      console.log(`   📦 Backup created: ${backupPath}`);
    }

    // Сканируем на предмет метаданных
    const metadata = await this.scanForMetadata(imagePath);
    
    if (metadata.hasEXIF || metadata.hasIPTC || metadata.hasXMP) {
      console.log(`   ⚠️  Found metadata:`);
      if (metadata.hasEXIF) console.log(`      • EXIF`);
      if (metadata.hasIPTC) console.log(`      • IPTC`);
      if (metadata.hasXMP) console.log(`      • XMP`);
      if (metadata.software) console.log(`      • Software: ${metadata.software}`);
      if (metadata.creator) console.log(`      • Creator: ${metadata.creator}`);
    }

    // Очищаем (перерисовываем)
    const cleanBuffer = await this.stripAllMetadata(imagePath);

    // Перезаписываем файл
    fs.writeFileSync(imagePath, cleanBuffer);

    console.log(`   ✅ Metadata removed: ${path.basename(imagePath)}`);
  }

  /**
   * 🔄 Очищает ВСЕ JPG файлы в директории
   */
  async cleanDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    console.log(`\n🧹 Metadata Cleaner: Processing directory...`);
    console.log(`📁 Directory: ${dirPath}\n`);

    const files = this.getImageFiles(dirPath, recursive);

    if (files.length === 0) {
      console.log(`   ⚠️  No JPG files found`);
      return;
    }

    console.log(`   📊 Found ${files.length} image(s)\n`);

    for (const filePath of files) {
      await this.cleanFile(filePath, false);
    }

    console.log(`\n✅ Metadata cleanup complete! (${files.length} files)`);
  }

  /**
   * 🔍 Helper: Получить все JPG файлы
   */
  private getImageFiles(dirPath: string, recursive: boolean): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile() && (entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg'))) {
        files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        files.push(...this.getImageFiles(fullPath, recursive));
      }
    }

    return files;
  }

  /**
   * 🔎 Helper: Извлечь значение метаданных из буфера
   */
  private extractMetadataValue(bufferString: string, key: string): string | undefined {
    const pattern = new RegExp(`${key}.*?\\x00`, 'i');
    const match = bufferString.match(pattern);
    if (match && match[0]) {
      return match[0].replace(key, '').replace(/\x00/g, '').trim();
    }
    return undefined;
  }
}