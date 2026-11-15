import Tesseract from 'tesseract.js';

export interface OCRRead {
  text: string;
  confidence: number;
}

/**
 * Client-side OCR using Tesseract.js. Safe to call from the browser
 * (or Node if a worker binary is available).
 */
export class OCRClient {
  private workerPromise: Promise<Tesseract.Worker> | null = null;

  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.workerPromise) {
      this.workerPromise = Tesseract.createWorker('eng');
    }
    return this.workerPromise;
  }

  async recognize(
    image: Buffer | string | HTMLCanvasElement,
    options?: { whitelist?: string; psm?: Tesseract.PSM },
  ): Promise<OCRRead> {
    const worker = await this.getWorker();
    if (options?.whitelist !== undefined || options?.psm !== undefined) {
      await worker.setParameters({
        ...(options?.whitelist ? { tessedit_char_whitelist: options.whitelist } : { tessedit_char_whitelist: '' }),
        ...(options?.psm ? { tessedit_pageseg_mode: options.psm } : {}),
      });
    }
    const { data } = await worker.recognize(image as never);
    return { text: data.text ?? '', confidence: (data.confidence ?? 0) / 100 };
  }

  async terminate(): Promise<void> {
    if (!this.workerPromise) return;
    const worker = await this.workerPromise;
    await worker.terminate();
    this.workerPromise = null;
  }
}
