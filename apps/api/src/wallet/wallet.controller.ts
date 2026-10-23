import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { PayoutMethod } from '@playverzus/core';

@Controller('wallet')
@UseGuards(SupabaseAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: AuthUser) {
    return this.walletService.getBalance(user.id);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.walletService.getHistory(
      user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('deposit')
  async deposit(
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; currency?: string; paymentHandleToken?: string; method?: string },
  ) {
    return this.walletService.deposit(
      user.id,
      body.amount,
      body.currency || 'USDC',
      body.paymentHandleToken,
      body.method || 'CROSSMINT',
    );
  }

  @Post('payout')
  async requestPayout(
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; method: PayoutMethod },
  ) {
    return this.walletService.requestPayout(user.id, body.amount, body.method);
  }

  @Post('claim-demo')
  async claimDemo(@CurrentUser() user: AuthUser) {
    return this.walletService.claimDemoTokens(user.id);
  }

  @Post('faucet')
  async faucet(@CurrentUser() user: AuthUser) {
    return this.walletService.claimDemoTokens(user.id);
  }

  @Get('paysafe/config')
  getPaysafeConfig() {
    return this.walletService.getPaysafeConfig();
  }
}
