import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RatingService } from './rating.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { GameType } from '@playverzus/core';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.ratingService.getUserRatings(user.id);
  }

  @Get(':gameType/:userId')
  async getRating(@Param('gameType') gameType: GameType, @Param('userId') userId: string) {
    return this.ratingService.getRating(userId, gameType);
  }
}
