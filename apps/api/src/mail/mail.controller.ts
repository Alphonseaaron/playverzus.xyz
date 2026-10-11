import { Controller, Post, Body, BadRequestException, Get, UseGuards } from '@nestjs/common';
import { BrevoService, SupportTicketDto } from './brevo.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('mail')
export class MailController {
  constructor(private readonly brevoService: BrevoService) {}

  @Get('info')
  getInfo() {
    return {
      service: 'Brevo Transactional Mail Engine',
      supportEmail: 'support@playverzus.xyz',
      domain: 'https://playverzus.xyz',
      configured: Boolean(process.env.BREVO_API_KEY),
    };
  }

  @Post('support')
  async submitSupportInquiry(@Body() body: SupportTicketDto) {
    if (!body?.email || !body?.message || !body?.subject) {
      throw new BadRequestException('Please provide your contact email, subject, and message.');
    }
    return this.brevoService.handleSupportInquiry(body);
  }

  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('test')
  async sendTestEmail(@Body() body: { to: string; name?: string }) {
    if (!body?.to) {
      throw new BadRequestException('Recipient email is required.');
    }
    return this.brevoService.sendWelcomeEmail(body.to, body.name || 'Competitor');
  }
}
