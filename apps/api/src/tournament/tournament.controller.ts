import { Body, Controller, Get, Param, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { TournamentFormat } from '@playverzus/core';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  async list() {
    return this.tournamentService.listTournaments();
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      profileId: string;
      format: TournamentFormat;
      size: number;
      entryFee?: number;
      prizePool?: number;
      startsAt?: string;
    },
  ) {
    return this.tournamentService.createTournament(user.id, body);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.tournamentService.getTournament(id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentService.joinTournament(id, user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':id/checkin')
  async checkin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tournamentService.checkinTournament(id, user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const tournament = await this.tournamentService.getTournament(id);
    if (tournament.creator_id !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only the tournament organizer or an administrator can launch this tournament');
    }
    return this.tournamentService.startTournament(id);
  }

  @Get(':id/bracket')
  async getBracket(@Param('id') id: string) {
    return this.tournamentService.getBracket(id);
  }
}
