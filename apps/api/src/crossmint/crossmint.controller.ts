import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('crossmint')
export class CrossmintController {
  constructor(private readonly crossmintService: CrossmintService) {}

  @Get('config')
  getConfig() {
    return this.crossmintService.getConfig();
  }

  @Get('wallet')
  @UseGuards(SupabaseAuthGuard)
  async getDepositWallet(@CurrentUser() user: AuthUser) {
    return this.crossmintService.getOrProvisionDepositWallet(user.id, user.email);
  }

  @Post('wallet/sync')
  @UseGuards(SupabaseAuthGuard)
  async syncDepositWallet(@CurrentUser() user: AuthUser) {
    return this.crossmintService.syncDepositWallet(user.id, user.email);
  }

  @Post('order')
  @UseGuards(SupabaseAuthGuard)
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; currency?: string },
  ) {
    return this.crossmintService.createDepositOrder(
      user.id,
      user.email,
      body.amount,
      body.currency || 'USD',
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.crossmintService.handleWebhook(body, headers);
  }
}
