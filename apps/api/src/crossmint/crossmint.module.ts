import { Module } from '@nestjs/common';
import { CrossmintController } from './crossmint.controller';
import { CrossmintService } from './crossmint.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [CrossmintController],
  providers: [CrossmintService],
  exports: [CrossmintService],
})
export class CrossmintModule {}
