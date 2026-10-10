import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
