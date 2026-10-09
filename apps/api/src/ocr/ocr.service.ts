import { Injectable } from '@nestjs/common';
import { OCRServer } from '@playverzus/core';

@Injectable()
export class OCRService {
  private ocrServer: OCRServer;

  constructor() {
    this.ocrServer = new OCRServer();
  }

  async verifyServerOCR(base64Image: string) {
    const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    return this.ocrServer.recognize(buffer);
  }
}
