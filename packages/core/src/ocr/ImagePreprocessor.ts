import sharp from 'sharp';

import type { ROI } from '../types';

export interface CropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InpaintingResult {
  suspicious: boolean;
  variance: number;
  reason?: string;
}

/**
 * Turns a raw screenshot buffer into a clean, OCR-friendly buffer.
 * Supports anchor-based geometry (21:9 ultrawide handling) and adaptive histogram thresholding.
 */
export class ImagePreprocessor {
  constructor(private readonly roi: ROI) {}

  /**
   * Computes the exact pixel crop box based on viewport aspect ratio constraints,
   * non-standard stretched resolutions (4:3 stretched, 16:10), and anchor points.
   */
  calculateCropBox(metaWidth: number, metaHeight: number): CropBox {
    let gameX = 0;
    let gameY = 0;
    let gameW = metaWidth;
    let gameH = metaHeight;

    const currentRatio = metaWidth / metaHeight;

    // Adjust for 16:9 pillarboxing on Ultrawide (e.g. 21:9 or 32:9)
    if (this.roi.aspectRatioConstraint === '16:9') {
      const targetRatio = 16 / 9;
      if (currentRatio > targetRatio) {
        // Ultrawide: game rendered in centered 16:9 box
        gameW = Math.round(metaHeight * targetRatio);
        gameX = Math.round((metaWidth - gameW) / 2);
      } else if (currentRatio < targetRatio) {
        // Letterboxed
        gameH = Math.round(metaWidth / targetRatio);
        gameY = Math.round((metaHeight - gameH) / 2);
      }
    }

    // Adapt for 4:3 stretched competitive esports resolutions (e.g. 1280x960, 1024x768 in CS2/Valorant)
    // In 4:3 stretched mode, HUD elements widen horizontally across the screen
    const is4by3Stretched = currentRatio >= 1.25 && currentRatio <= 1.40;
    const horizontalScaleModifier = is4by3Stretched ? 1.20 : 1.0;

    const roiW = Math.max(1, Math.round(this.roi.w * gameW * horizontalScaleModifier));
    const roiH = Math.max(1, Math.round(this.roi.h * gameH));

    let left = Math.round(gameX + this.roi.x * gameW);
    let top = Math.round(gameY + this.roi.y * gameH);

    // If 4:3 stretched and anchor is centered, offset left slightly to accommodate wider digits
    if (is4by3Stretched && (this.roi.anchor === 'TOP_CENTER' || !this.roi.anchor)) {
      left = Math.round(left - (roiW * 0.1));
    }

    // Anchor-based alignment
    const anchor = this.roi.anchor ?? 'TOP_LEFT';
    if (anchor === 'TOP_RIGHT') {
      left = Math.round(gameX + gameW - this.roi.x * gameW - roiW);
    } else if (anchor === 'TOP_CENTER') {
      left = Math.round(gameX + (gameW - roiW) / 2 + this.roi.x * gameW);
    } else if (anchor === 'BOTTOM_RIGHT') {
      left = Math.round(gameX + gameW - this.roi.x * gameW - roiW);
      top = Math.round(gameY + gameH - this.roi.y * gameH - roiH);
    } else if (anchor === 'BOTTOM_CENTER') {
      left = Math.round(gameX + (gameW - roiW) / 2 + this.roi.x * gameW);
      top = Math.round(gameY + gameH - this.roi.y * gameH - roiH);
    } else if (anchor === 'BOTTOM_LEFT') {
      top = Math.round(gameY + gameH - this.roi.y * gameH - roiH);
    } else if (anchor === 'CENTER') {
      left = Math.round(gameX + (gameW - roiW) / 2 + this.roi.x * gameW);
      top = Math.round(gameY + (gameH - roiH) / 2 + this.roi.y * gameH);
    }

    // Boundary clamping
    left = Math.max(0, Math.min(metaWidth - 1, left));
    top = Math.max(0, Math.min(metaHeight - 1, top));
    const width = Math.max(1, Math.min(metaWidth - left, roiW));
    const height = Math.max(1, Math.min(metaHeight - top, roiH));

    return { left, top, width, height };
  }

  async process(buffer: Buffer): Promise<Buffer> {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) throw new Error('Image has no dimensions');

    const { left, top, width, height } = this.calculateCropBox(meta.width, meta.height);

    // Step 1: Crop and grayscale
    const cropped = sharp(buffer)
      .extract({ left, top, width, height })
      .grayscale();

    // Step 2: Adaptive threshold calculation from image histogram mean
    const stats = await cropped.stats();
    const mean = stats.channels[0]?.mean ?? 128;
    const dynamicThreshold = Math.max(45, Math.min(210, Math.round(mean)));

    // Step 3: Noise reduction, contrast amplification, normalization, upscaling, and dynamic binarization
    return cropped
      .median(3)
      .linear(1.3, -15)
      .normalize()
      .sharpen({ sigma: 1 })
      .resize({ width: width * 2, kernel: 'lanczos3' })
      .threshold(dynamicThreshold)
      .png()
      .toBuffer();
  }
}

/**
 * Error Level Analysis (ELA) helper to detect artificial digital text overlays or photoshop splices.
 * Injected digital overlays exhibit mismatched compression variance relative to native video textures.
 */
export async function detectOverlayInpainting(buffer: Buffer): Promise<InpaintingResult> {
  try {
    // Recompress image as JPEG
    const recompressed = await sharp(buffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    // Difference between original and recompressed
    const diff = await sharp(buffer)
      .composite([{ input: recompressed, blend: 'difference' }])
      .raw()
      .toBuffer();

    // Calculate variance of pixel error deltas
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < diff.length; i++) {
      const v = diff[i]!;
      sum += v;
      sumSq += v * v;
    }
    const n = diff.length;
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    // Abnormal high variance indicates digital layer splice or artificial artifact mismatch
    const isSuspicious = variance > 2500;
    return {
      suspicious: isSuspicious,
      variance: Math.round(variance),
      reason: isSuspicious ? 'high localized error-level variance indicative of spliced digital overlay' : undefined,
    };
  } catch {
    return { suspicious: false, variance: 0 };
  }
}
