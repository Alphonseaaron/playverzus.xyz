import { Module } from '@nestjs/common';
import { V2DeveloperController } from './v2-developer.controller';

@Module({
  controllers: [V2DeveloperController],
})
export class V2GatewayModule {}
