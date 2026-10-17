import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('crossmint')
  crossmint(
    @Body() body: any,
    @Headers('x-signature') sig?: string,
    @Headers('crossmint-signature') altSig?: string,
  ) {
    return this.webhooksService.handleCrossmint(body, sig || altSig);
  }

  @Post('paystack')
  paystack() {
    return this.webhooksService.handlePaystack();
  }

  @Post('moonpay')
  moonpay() {
    return this.webhooksService.handleMoonpay();
  }
}

