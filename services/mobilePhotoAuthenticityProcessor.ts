/**
 * 📱 Modern Mobile Photo Authenticity Processor
 * 
 * Makes AI-generated images look like authentic modern smartphone photos
 */

import sharp from 'sharp';

export interface AuthenticityResult {
  success: boolean;
  processedBuffer: Buffer | null;
  authenticityLevel: 'low' | 'medium' | 'high';
  appliedEffects: string[];
  deviceSimulated: string;
  errorMessage?: string;
}

export class MobilePhotoAuthenticityProcessor {
  // Full device profiles list synced with Orchestrator mapDeviceToKey
  private readonly DEVICE_PROFILES: Record<string, any> = {
    // Apple
    iphone15: { model: 'iPhone 15 Pro', characteristics: { saturation: 1.02, contrast: 1.05, sharpness: 'medium', noise: 0.02 } },
    iphone13: { model: 'iPhone 13', characteristics: { saturation: 1.04, contrast: 1.06, sharpness: 'medium', noise: 0.04 } },
    iphone11: { model: 'iPhone 11', characteristics: { saturation: 1.05, contrast: 1.07, sharpness: 'low', noise: 0.08 } },
    iphone_xs: { model: 'iPhone XS', characteristics: { saturation: 1.06, contrast: 1.08, sharpness: 'low', noise: 0.10 } },
    iphone_7: { model: 'iPhone 7', characteristics: { saturation: 1.08, contrast: 1.10, sharpness: 'low', noise: 0.15 } },
    iphone_6s: { model: 'iPhone 6s', characteristics: { saturation: 1.10, contrast: 1.12, sharpness: 'low', noise: 0.20 } },
    
    // Samsung
    samsung_s24: { model: 'Galaxy S24 Ultra', characteristics: { saturation: 1.08, contrast: 1.08, sharpness: 'high', noise: 0.015 } },
    samsung_s21: { model: 'Galaxy S21', characteristics: { saturation: 1.10, contrast: 1.10, sharpness: 'high', noise: 0.03 } },
    samsung_s10: { model: 'Galaxy S10', characteristics: { saturation: 1.12, contrast: 1.12, sharpness: 'medium', noise: 0.06 } },
    samsung_s9: { model: 'Galaxy S9', characteristics: { saturation: 1.14, contrast: 1.14, sharpness: 'medium', noise: 0.08 } },
    samsung_a51: { model: 'Galaxy A51', characteristics: { saturation: 1.10, contrast: 1.10, sharpness: 'medium', noise: 0.06 } },
    samsung_a31: { model: 'Galaxy A31', characteristics: { saturation: 1.12, contrast: 1.12, sharpness: 'low', noise: 0.10 } },
    samsung_a10: { model: 'Galaxy A10', characteristics: { saturation: 1.15, contrast: 1.15, sharpness: 'low', noise: 0.15 } },
    samsung_j7: { model: 'Galaxy J7', characteristics: { saturation: 1.18, contrast: 1.18, sharpness: 'low', noise: 0.20 } },
    samsung_j5: { model: 'Galaxy J5', characteristics: { saturation: 1.20, contrast: 1.20, sharpness: 'low', noise: 0.25 } },
    
    // Google
    pixel_8: { model: 'Pixel 8 Pro', characteristics: { saturation: 1.04, contrast: 1.04, sharpness: 'medium', noise: 0.01 } },
    pixel_4: { model: 'Pixel 4', characteristics: { saturation: 1.06, contrast: 1.06, sharpness: 'medium', noise: 0.05 } }
  };

  async processWithDevice(base64Image: string, deviceKey: string, year?: number): Promise<AuthenticityResult> {
    const selectedKey = this.DEVICE_PROFILES[deviceKey] ? deviceKey : 'samsung_a10';
    const device = this.DEVICE_PROFILES[selectedKey];
    
    try {
      let buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const chars = device.characteristics;
      const appliedEffects: string[] = [];

      // 1. Apply color science (Saturation/Contrast)
      buffer = await sharp(buffer)
        .modulate({ saturation: chars.saturation })
        .linear(chars.contrast, -(0.5 * chars.contrast) + 0.5)
        .toBuffer();
      appliedEffects.push('color_science');

      // 2. Apply sharpening
      const sigma = chars.sharpness === 'high' ? 0.8 : chars.sharpness === 'medium' ? 0.5 : 0.3;
      buffer = await sharp(buffer)
        .sharpen({ sigma })
        .toBuffer();
      appliedEffects.push('edge_enhancement');

      // 3. Add noise for older devices
      if (chars.noise > 0.05) {
        buffer = await sharp(buffer)
          .blur(0.2) // Slight blur to simulate lower end lens
          .sharpen({ sigma: 0.5, m1: 2, m2: 5 }) // Then sharpen to create artifacts
          .toBuffer();
        appliedEffects.push('artifact_simulation');
      }

      return {
        success: true,
        processedBuffer: buffer,
        authenticityLevel: chars.noise < 0.05 ? 'high' : 'medium',
        appliedEffects,
        deviceSimulated: `${device.model}${year ? ` (${year})` : ''}`
      };
    } catch (error) {
      return {
        success: false, processedBuffer: null, authenticityLevel: 'low', 
        appliedEffects: [], deviceSimulated: 'unknown', errorMessage: (error as Error).message
      };
    }
  }

  async processForMobileAuthenticity(base64Image: string): Promise<AuthenticityResult> {
    return this.processWithDevice(base64Image, 'iphone15');
  }
}