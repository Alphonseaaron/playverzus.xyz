import { Module } from '@nestjs/common';
import { V2DeveloperController } from './v2-developer.controller';
import { V2MpesaController } from './v2-mpesa.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [V2DeveloperController, V2MpesaController],
})
export class V2GatewayModule {}
