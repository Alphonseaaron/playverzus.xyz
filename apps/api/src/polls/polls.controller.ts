import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { PollsService, CreatePollDto, SubmitSuggestionDto } from './polls.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  /**
   * Public or Authenticated: Browse community polls and vote breakdowns
   */
  @Get()
  async listPolls(@CurrentUser() user?: AuthUser) {
    return this.pollsService.listPolls(user?.id);
  }

  /**
   * Authenticated Registered User: Cast 1 vote on a poll
   */
  @UseGuards(SupabaseAuthGuard)
  @Post(':id/vote')
  async vote(
    @Param('id') id: string,
    @Body() body: { optionIndex: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.pollsService.castVote(id, user.id, body.optionIndex);
  }

  /**
   * Authenticated Registered User: Propose a new feature idea
   */
  @UseGuards(SupabaseAuthGuard)
  @Post('suggest')
  async suggest(
    @Body() body: SubmitSuggestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pollsService.submitSuggestion(
      user.id,
      user.username || 'Player',
      body,
    );
  }

  // ─── Staff & Admin Poll Management ────────────────────────────────────────

  /**
   * Staff / Admin: List player-submitted suggestions for review
   */
  @UseGuards(SupabaseAuthGuard)
  @Get('admin/suggestions')
  async listSuggestions(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    this.assertStaffClearance(user);
    return this.pollsService.listSuggestions(status);
  }

  /**
   * Staff / Admin: Launch an official Community Poll
   */
  @UseGuards(SupabaseAuthGuard)
  @Post('admin/create-poll')
  async createPoll(
    @Body() body: CreatePollDto,
    @CurrentUser() user: AuthUser,
  ) {
    this.assertStaffClearance(user);
    return this.pollsService.createPoll(user.id, body);
  }

  /**
   * Staff / Admin: Update poll roadmap status (PLANNED, IN_DEVELOPMENT, SHIPPED)
   */
  @UseGuards(SupabaseAuthGuard)
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: AuthUser,
  ) {
    this.assertStaffClearance(user);
    return this.pollsService.updatePollStatus(id, body.status);
  }

  private assertStaffClearance(user: AuthUser) {
    if (!['SUPPORT', 'COMMUNITY_MANAGER', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Staff or Administrator operational clearance is required.');
    }
  }
}
