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
  Optional,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { SecurityService } from '../security/security.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { MatchFormat, ScoreFrame } from '@playverzus/core';

@Controller('matches')
@UseGuards(SupabaseAuthGuard)
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    @Optional() private readonly securityService?: SecurityService,
  ) {}

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

  @Post(':id/ready')
  async setReady(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { ready?: boolean },
  ) {
    return this.matchService.setPlayerReady(id, user.id, body.ready ?? true);
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
    if (!body || typeof body.rawText !== 'string' || body.rawText.trim() === '') {
      throw new BadRequestException('Valid OCR rawText is required');
    }
    if (body.rawText.length > 2000) {
      this.securityService?.logEvent({
        severity: 'MEDIUM',
        category: 'OCR_TAMPER',
        actorId: user.id,
        matchId: id,
        description: `Blocked oversized OCR rawText payload (${body.rawText.length} chars)`,
      });
      throw new BadRequestException('OCR payload exceeds maximum allowed size (2000 characters)');
    }

    const match = await this.matchService.getMatch(id);
    if (match.playerA !== user.id && match.playerB !== user.id) {
      this.securityService?.logEvent({
        severity: 'HIGH',
        category: 'ANTI_CHEAT',
        actorId: user.id,
        matchId: id,
        description: `Unauthorized score submission: non-participant user attempted to submit score for match #${id}`,
      });
      throw new ForbiddenException('Only verified participants in this match can submit score proofs');
    }
    if (['CANCELLED', 'VOIDED'].includes(match.status)) {
      throw new BadRequestException(`Cannot submit score to a match with status ${match.status}`);
    }

    const clampedConfidence = typeof body.confidence === 'number'
      ? Math.max(0, Math.min(1.0, body.confidence))
      : 0.5;

    return this.matchService.submitScore(
      id,
      user.id,
      body.rawText.trim(),
      clampedConfidence,
      Boolean(body.isFinal),
      body.imageHash,
      body.source,
      body.gamertag,
    );
  }

  @Post(':id/gsi')
  async handleCs2Gsi(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() payload: any,
  ) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Valid CS2 GSI payload is required');
    }

    const match = await this.matchService.getMatch(id);
    const isParticipant = match.playerA === user.id || match.playerB === user.id;
    const isValidMatchToken = payload.auth?.token && (payload.auth.token === match.room_code || payload.auth.token === match.id);

    if (!isParticipant && !isValidMatchToken) {
      this.securityService?.logEvent({
        severity: 'HIGH',
        category: 'GSI_AUTH',
        actorId: user.id,
        matchId: id,
        description: `Rejected unauthorized CS2 GSI telemetry submission: invalid token and non-participant`,
        metadata: { tokenProvided: Boolean(payload.auth?.token) },
      });
      throw new ForbiddenException('Unauthorized: You must be a match participant or provide a valid match GSI security token');
    }

    if (['SETTLED', 'CANCELLED', 'VOIDED'].includes(match.status)) {
      throw new BadRequestException(`Cannot submit GSI telemetry to a match with status ${match.status}`);
    }

    return this.matchService.handleCs2Gsi(id, user.id, payload);
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
