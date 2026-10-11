import { Injectable, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { OCRServer } from '@playverzus/core';

@Injectable()
export class OCRService {
  private ocrServer: OCRServer;

  constructor() {
    this.ocrServer = new OCRServer();
  }

  async verifyServerOCR(base64Image: string) {
    if (!base64Image || typeof base64Image !== 'string') {
      throw new BadRequestException('A valid base64 image string is required');
    }

    // 15MB base64 string corresponds to ~11MB decoded file
    if (base64Image.length > 15 * 1024 * 1024) {
      throw new PayloadTooLargeException('Image upload exceeds 10MB maximum size threshold');
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return this.ocrServer.recognize(buffer);
  }
}
