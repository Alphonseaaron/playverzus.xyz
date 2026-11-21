import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { CrossmintModule } from '../crossmint/crossmint.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [CrossmintModule, WalletModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

