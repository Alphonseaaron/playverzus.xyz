import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CrossmintService } from '../crossmint/crossmint.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly crossmintService: CrossmintService) {}

  handleCrossmint(body: any, signature?: string) {
    return this.crossmintService.handleWebhook(body, signature);
  }

  handlePaystack() {
    throw new HttpException(
      'Paystack webhook integration requires WALLET_MODE=real. Stubbed in demo mode.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  handleMoonpay() {
    throw new HttpException(
      'Moonpay webhook integration requires WALLET_MODE=real. Stubbed in demo mode.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}

