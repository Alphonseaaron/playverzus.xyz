import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CrossmintModule } from '../crossmint/crossmint.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [CrossmintModule, WalletModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
