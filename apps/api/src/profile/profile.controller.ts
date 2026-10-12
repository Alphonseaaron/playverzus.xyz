import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.profileService.getProfileById(user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: { displayName?: string; avatarUrl?: string; region?: string; country_code?: string; phone?: string },
  ) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Get(':username')
  async getByUsername(@Param('username') username: string) {
    return this.profileService.getProfileByUsername(username);
  }

  @Get(':username/matches')
  async getUserMatches(@Param('username') username: string) {
    return this.profileService.getUserMatches(username);
  }
}
