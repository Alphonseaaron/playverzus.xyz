import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import type { GameType } from '@playverzus/core';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':gameType')
  async getTop(@Param('gameType') gameType: GameType, @Query('limit') limit?: string) {
    return this.leaderboardService.getTop(gameType, limit ? parseInt(limit, 10) : 50);
  }

  @Get(':gameType/rank/:userId')
  async getRank(@Param('gameType') gameType: GameType, @Param('userId') userId: string) {
    return this.leaderboardService.getRank(userId, gameType);
  }
}
