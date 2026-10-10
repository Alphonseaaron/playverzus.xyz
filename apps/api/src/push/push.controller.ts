import { Controller, Post, Delete, Get, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Frontend calls this to get the VAPID public key before subscribing */
  @Get('vapid-public-key')
  getVapidKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  /** Frontend calls this after the browser generates a push subscription */
  @UseGuards(SupabaseAuthGuard)
  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { subscription: object },
  ) {
    await this.push.saveSubscription(user.id, body.subscription as never);
    return { success: true };
  }

  /** Frontend calls this when user revokes notification permission */
  @UseGuards(SupabaseAuthGuard)
  @Delete('unsubscribe')
  async unsubscribe(@CurrentUser() user: { id: string }) {
    await this.push.removeSubscription(user.id);
    return { success: true };
  }
}
