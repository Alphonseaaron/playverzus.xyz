import { Body, Controller, Get, Param, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { GameProfileService } from './game-profile.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { GameType, Platform, ROI } from '@playverzus/core';

@Controller('games')
export class GameProfileController {
  constructor(private readonly gameProfileService: GameProfileService) {}

  @Get()
  async list() {
    return this.gameProfileService.listApproved();
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  async submit(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      displayName: string;
      gameType: GameType;
      platform: Platform;
      roi: ROI;
      constraints?: Record<string, unknown>;
      endKeywords?: string[];
      regexPattern?: string;
    },
  ) {
    return this.gameProfileService.submitProfile(user.id, body);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.gameProfileService.getById(id);
  }

  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.gameProfileService.approveProfile(id, user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':id/calibrate')
  async calibrate(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { roi: ROI },
  ) {
    const profile = await this.gameProfileService.getById(id);
    if (profile.creatorId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only the game profile creator or an administrator can update calibration');
    }
    return this.gameProfileService.updateCalibration(id, body.roi);
  }
}
