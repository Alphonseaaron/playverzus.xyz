import Tesseract from 'tesseract.js';
import type { GameType, ROI } from '@playverzus/core';

export interface AutoCalibrateResult {
  detectedGameType: GameType;
  detectedEndKeywords: string[];
  detectedRegexPattern: string;
  detectedRoi: ROI;
  confidence: number;
  summary: string;
  ocrSnippet: string;
}

const END_KEYWORD_DICTIONARY = [
  'VICTORY',
  'DEFEAT',
  'WINNER',
  'YOU WIN',
  'YOU LOSE',
  'GAME OVER',
  'TRY AGAIN',
  'PLAY AGAIN',
  'MATCH COMPLETE',
  'FINAL SCORE',
  'TOTAL SCORE',
  'HIGH SCORE',
  'NEW RECORD',
  'RESULTS',
  'FINISH',
  'ROUND WON',
  'ROUND LOST',
  'K.O.',
  'KNOCKOUT',
  'ELIMINATED',
  'TOP 1',
  'PLACEMENT',
  'MISSION FAILED',
  'MISSION COMPLETE',
  'TIME UP',
];

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load reference image'));
    img.src = url;
  });
}

/**
 * Runs OCR on a specific cropped ROI of an image
 */
export async function testOcrOnRoi(
  imageUrl: string,
  roi: ROI,
): Promise<{ text: string; confidence: number }> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  const sx = Math.max(0, Math.floor(roi.x * img.naturalWidth));
  const sy = Math.max(0, Math.floor(roi.y * img.naturalHeight));
  const sw = Math.max(10, Math.floor(roi.w * img.naturalWidth));
  const sh = Math.max(10, Math.floor(roi.h * img.naturalHeight));

  canvas.width = sw;
  canvas.height = sh;

  // Enhance contrast for OCR
  ctx.filter = 'contrast(160%) brightness(100%)';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const worker = await Tesseract.createWorker('eng');
  try {
    const { data } = await worker.recognize(canvas);
    return {
      text: data.text.trim(),
      confidence: Math.round(data.confidence),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Analyzes one or more reference images to automatically detect:
 * 1. Match end trigger keywords
 * 2. Score regex pattern
 * 3. Bounding Box Calibration (ROI)
 * 4. Engine Game Type
 */
export async function autoAnalyzeScreenshots(
  imageUrls: string[],
): Promise<AutoCalibrateResult> {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('Please upload at least one reference screenshot.');
  }

  const worker = await Tesseract.createWorker('eng');

  try {
    const discoveredKeywords: Set<string> = new Set();
    let bestRoi: ROI | null = null;
    let bestScorePattern: string | null = null;
    let detectedGameType: GameType = 'HIGH_SCORE';
    let maxConfidence = 0;
    const recognizedSnippets: string[] = [];

    // Analyze each uploaded reference screenshot
    for (const url of imageUrls) {
      const img = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(img, 0, 0);

      const { data } = await worker.recognize(canvas);
      const text = data.text || '';
      recognizedSnippets.push(text.slice(0, 100));

      const upperText = text.toUpperCase();

      // 1. Scan for Match End Keywords
      for (const kw of END_KEYWORD_DICTIONARY) {
        if (upperText.includes(kw)) {
          discoveredKeywords.add(kw);
        }
      }

      // 2. Scan lines / words for score patterns and bounding boxes
      const lines = data.lines || [];
      for (const line of lines) {
        const lineText = line.text.trim();
        const bbox = line.bbox;
        const confidence = line.confidence || 0;

        // Check for Time / Duration (e.g. 01:23.45 or 12:34)
        const timeMatch = lineText.match(/\b(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\b/);
        if (timeMatch && bbox) {
          detectedGameType = 'LOW_TIME';
          bestScorePattern = '(\\d{1,2}):(\\d{2})(?:\\.(\\d{2,3}))?';
          if (!bestRoi || confidence > maxConfidence) {
            maxConfidence = confidence;
            bestRoi = normalizeBbox(bbox, img.naturalWidth, img.naturalHeight);
          }
          continue;
        }

        // Check for Binary Victory/Defeat
        const winLossMatch = lineText.match(/\b(VICTORY|DEFEAT|WIN|LOSE|DRAW)\b/i);
        if (winLossMatch && bbox) {
          if (detectedGameType !== 'LOW_TIME') {
            detectedGameType = 'BINARY_RESULT';
          }
          if (!bestRoi || confidence > maxConfidence) {
            maxConfidence = confidence;
            bestRoi = normalizeBbox(bbox, img.naturalWidth, img.naturalHeight);
          }
          continue;
        }

        // Check for Numeric Score (e.g. Score: 15,200 or 125000)
        const scoreMatch = lineText.match(/(?:Score:?\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,8})/i);
        if (scoreMatch && bbox && detectedGameType !== 'LOW_TIME') {
          detectedGameType = 'HIGH_SCORE';
          bestScorePattern = '([0-9][0-9,\\.]*)';
          if (!bestRoi || confidence > maxConfidence) {
            maxConfidence = confidence;
            bestRoi = normalizeBbox(bbox, img.naturalWidth, img.naturalHeight);
          }
        }
      }
    }

    // Default Fallbacks if specific element bounding boxes weren't isolated
    const finalEndKeywords = discoveredKeywords.size > 0
      ? Array.from(discoveredKeywords)
      : ['Game Over', 'Victory', 'Defeat', 'Final Score'];

    const finalRegexPattern = bestScorePattern || (
      detectedGameType === 'LOW_TIME'
        ? '(\\d{1,2}):(\\d{2})(?:\\.(\\d{2,3}))?'
        : detectedGameType === 'BINARY_RESULT'
        ? '(VICTORY|DEFEAT|WIN|LOSE)'
        : '([0-9][0-9,\\.]*)'
    );

    const finalRoi: ROI = bestRoi || (
      detectedGameType === 'HIGH_SCORE'
        ? { x: 0.65, y: 0.05, w: 0.3, h: 0.08 }
        : detectedGameType === 'LOW_TIME'
        ? { x: 0.35, y: 0.05, w: 0.3, h: 0.08 }
        : { x: 0.25, y: 0.35, w: 0.5, h: 0.2 }
    );

    return {
      detectedGameType,
      detectedEndKeywords: finalEndKeywords,
      detectedRegexPattern: finalRegexPattern,
      detectedRoi: finalRoi,
      confidence: Math.max(65, Math.round(maxConfidence)),
      summary: `Auto-detected ${detectedGameType} format with ${finalEndKeywords.length} end triggers and calibrated target ROI bounding box.`,
      ocrSnippet: recognizedSnippets.join(' | ').slice(0, 150),
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Normalizes pixel bounding box { x0, y0, x1, y1 } to 0..1 ROI with safety padding
 */
function normalizeBbox(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  imgW: number,
  imgH: number,
): ROI {
  const padX = Math.max(12, (bbox.x1 - bbox.x0) * 0.15);
  const padY = Math.max(8, (bbox.y1 - bbox.y0) * 0.25);

  const x0 = Math.max(0, bbox.x0 - padX);
  const y0 = Math.max(0, bbox.y0 - padY);
  const x1 = Math.min(imgW, bbox.x1 + padX);
  const y1 = Math.min(imgH, bbox.y1 + padY);

  return {
    x: Number((x0 / imgW).toFixed(4)),
    y: Number((y0 / imgH).toFixed(4)),
    w: Number(Math.max(0.05, (x1 - x0) / imgW).toFixed(4)),
    h: Number(Math.max(0.04, (y1 - y0) / imgH).toFixed(4)),
  };
}
