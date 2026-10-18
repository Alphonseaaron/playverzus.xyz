import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('crossmint')
  crossmint(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleCrossmint(body, headers);
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

