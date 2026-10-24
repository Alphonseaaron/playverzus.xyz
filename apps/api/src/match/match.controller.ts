import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { MatchFormat, ScoreFrame } from '@playverzus/core';

@Controller('matches')
@UseGuards(SupabaseAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('mine')
  async getMine(@CurrentUser() user: AuthUser) {
    return this.matchService.getMyMatches(user.id);
  }

  @Get('open')
  async getOpen(@Query('profileId') profileId?: string) {
    return this.matchService.getOpenMatches(profileId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { profileId: string; opponentId?: string; format?: MatchFormat; entryFee?: number },
  ) {
    return this.matchService.createMatch(user.id, body.profileId, body.opponentId ?? null, body.format, body.entryFee);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.matchService.getMatch(id);
  }

  @Post(':id/accept')
  async accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const match = await this.matchService.getMatch(id);
    if (match.playerA === user.id) {
      throw new BadRequestException('You cannot accept your own duel');
    }
    return this.matchService.acceptMatch(id, user.id);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const match = await this.matchService.getMatch(id);
    if (match.playerA !== user.id && match.playerB !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only match participants or administrators can start this match');
    }
    return this.matchService.startMatch(id);
  }

  @Post(':id/score')
  async score(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      rawText: string;
      confidence: number;
      isFinal?: boolean;
      imageHash?: string;
      source?: ScoreFrame['source'];
      gamertag?: string;
    },
  ) {
    const match = await this.matchService.getMatch(id);
    if (match.playerA !== user.id && match.playerB !== user.id) {
      throw new ForbiddenException('Only verified participants in this match can submit score proofs');
    }
    return this.matchService.submitScore(
      id,
      user.id,
      body.rawText,
      body.confidence,
      body.isFinal ?? false,
      body.imageHash,
      body.source,
      body.gamertag,
    );
  }

  @Post(':id/settle')
  async settle(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const match = await this.matchService.getMatch(id);
    if (match.playerA !== user.id && match.playerB !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only match participants or administrators can trigger settlement');
    }
    return this.matchService.settleMatch(id);
  }

  @Post(':id/dispute')
  async dispute(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason: string },
  ) {
    const match = await this.matchService.getMatch(id);
    if (match.playerA !== user.id && match.playerB !== user.id) {
      throw new ForbiddenException('Only match participants can raise a dispute for this match');
    }
    return this.matchService.disputeMatch(id, user.id, body.reason);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.matchService.cancelMatch(id, user.id);
  }

  @Post('room/:code/join')
  async joinByRoom(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.matchService.joinByRoomCode(code, user.id);
  }
}
