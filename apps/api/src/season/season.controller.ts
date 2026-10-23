import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SeasonService } from './season.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('seasons')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Get()
  async list() {
    return this.seasonService.listSeasons();
  }

  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN')
  @Post()
  async create(@Body() body: { name: string; startsAt: string; endsAt: string }) {
    return this.seasonService.createSeason(body.name, body.startsAt, body.endsAt);
  }
}
