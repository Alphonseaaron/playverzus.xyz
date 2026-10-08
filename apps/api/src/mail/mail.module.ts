import { Module } from '@nestjs/common';
import { BrevoService } from './brevo.service';
import { MailController } from './mail.controller';

@Module({
  controllers: [MailController],
  providers: [BrevoService],
  exports: [BrevoService],
})
export class MailModule {}
