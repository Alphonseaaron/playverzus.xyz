import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

export interface CreatePollDto {
  title: string;
  description: string;
  category?: string;
  options?: string[];
  suggestedBy?: string;
  suggestedByName?: string;
  closesAt?: string;
}

export interface SubmitSuggestionDto {
  title: string;
  description: string;
  category?: string;
}

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  /**
   * List community polls with real-time vote distribution and user's voted choice.
   */
  async listPolls(userId?: string) {
    const { data: polls, error } = await this.supabase
      .from('community_polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !polls || polls.length === 0) {
      // Seed default community polls if empty
      return this.seedDefaultPolls(userId);
    }

    // Load all votes
    const { data: allVotes } = await this.supabase
      .from('community_poll_votes')
      .select('poll_id, user_id, option_index');

    const votesMap = new Map<string, { total: number; options: Record<number, number>; userVote?: number }>();

    for (const v of allVotes || []) {
      const entry = votesMap.get(v.poll_id) || { total: 0, options: {} };
      entry.total += 1;
      entry.options[v.option_index] = (entry.options[v.option_index] || 0) + 1;
      if (userId && v.user_id === userId) {
        entry.userVote = v.option_index;
      }
      votesMap.set(v.poll_id, entry);
    }

    return polls.map((poll) => {
      const v = votesMap.get(poll.id) || { total: 0, options: {} };
      const optionsArray = Array.isArray(poll.options)
        ? (poll.options as string[])
        : ['Yes, build this!', 'No, prioritize others'];

      const optionBreakdown = optionsArray.map((optText, idx) => {
        const count = v.options[idx] || 0;
        const percent = v.total > 0 ? Math.round((count / v.total) * 100) : 0;
        return {
          index: idx,
          text: optText,
          votes: count,
          percent,
        };
      });

      return {
        ...poll,
        options: optionsArray,
        optionBreakdown,
        totalVotes: v.total,
        userVotedOptionIndex: v.userVote !== undefined ? v.userVote : null,
      };
    });
  }

  /**
   * Cast a vote on a community poll. Enforces strictly 1 vote per registered player.
   */
  async castVote(pollId: string, userId: string, optionIndex: number) {
    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      throw new BadRequestException('Please select a valid poll option.');
    }

    const { data: poll, error } = await this.supabase
      .from('community_polls')
      .select('*')
      .eq('id', pollId)
      .maybeSingle();

    if (error || !poll) {
      throw new NotFoundException('Community poll not found.');
    }

    if (poll.status !== 'ACTIVE_VOTING') {
      throw new BadRequestException(`This poll is ${poll.status.toLowerCase().replace(/_/g, ' ')} and is no longer accepting new votes.`);
    }

    // Check if already voted
    const { data: existingVote } = await this.supabase
      .from('community_poll_votes')
      .select('id, option_index')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote) {
      throw new BadRequestException('You have already cast your vote on this feature poll.');
    }

    // Record vote
    const { error: insertError } = await this.supabase
      .from('community_poll_votes')
      .insert({
        poll_id: pollId,
        user_id: userId,
        option_index: optionIndex,
      });

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    return {
      success: true,
      message: 'Your vote has been counted! Thank you for shaping the Playverzus product roadmap.',
      pollId,
      optionIndex,
    };
  }

  /**
   * Submit a new feature idea / improvement suggestion from registered users.
   */
  async submitSuggestion(userId: string, userName: string, dto: SubmitSuggestionDto) {
    if (!dto.title || !dto.description) {
      throw new BadRequestException('Please provide a title and detailed description for your suggestion.');
    }

    const { data, error } = await this.supabase
      .from('user_suggestions')
      .insert({
        user_id: userId,
        user_name: userName,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category || 'FEATURE',
        status: 'PENDING_REVIEW',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      success: true,
      suggestionId: data.id,
      message: 'Thank you! Your feature suggestion has been submitted to support and product staff for community poll consideration.',
    };
  }

  /**
   * List submitted user suggestions for Staff / Support review.
   */
  async listSuggestions(status?: string) {
    let query = this.supabase
      .from('user_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  /**
   * Introduce a community poll (Staff / Admin only).
   * Can be created directly or promoted from a player suggestion.
   */
  async createPoll(staffId: string, dto: CreatePollDto) {
    if (!dto.title || !dto.description) {
      throw new BadRequestException('Title and description are required for community polls.');
    }

    const options = dto.options && dto.options.length >= 2
      ? dto.options
      : ['Yes - Build this!', 'No - Prioritize other features'];

    const { data: newPoll, error } = await this.supabase
      .from('community_polls')
      .insert({
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category || 'FEATURE',
        status: 'ACTIVE_VOTING',
        options,
        suggested_by: dto.suggestedBy || null,
        suggested_by_username: dto.suggestedByName || null,
        created_by: staffId,
        closes_at: dto.closesAt || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // If promoted from suggestion, update suggestion status
    if (dto.suggestedBy) {
      await this.supabase
        .from('user_suggestions')
        .update({ status: 'PROMOTED_TO_POLL', poll_id: newPoll.id })
        .eq('user_id', dto.suggestedBy)
        .eq('title', dto.title);
    }

    return {
      success: true,
      poll: newPoll,
      message: `Community Poll "${newPoll.title}" is now live for registered players to vote!`,
    };
  }

  /**
   * Update poll lifecycle status (e.g. marked as PLANNED, IN_DEVELOPMENT, or SHIPPED).
   */
  async updatePollStatus(pollId: string, status: string) {
    const { data, error } = await this.supabase
      .from('community_polls')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', pollId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Seed realistic initial community polls so players have active polls to vote on immediately.
   */
  private async seedDefaultPolls(userId?: string) {
    const defaultPolls = [
      {
        title: 'Add Mobile Legends: Bang Bang to 5-Player Sit & Go Blitz Pools',
        description: 'Introduce MLBB 1v1 and 5-player blitz tournaments with $10, $50, and $100 entry pools for mobile esports players.',
        category: 'NEW_GAME',
        status: 'ACTIVE_VOTING',
        options: ['Yes! Add MLBB ASAP', 'Add League of Legends instead', 'Keep current PC/Console lineup'],
        suggested_by_username: 'ProMobileGamer',
      },
      {
        title: 'Instant In-Game Overlay for Live Score HUD Display',
        description: 'A lightweight Windows / Mac desktop widget that displays current live match score and tournament bracket progress directly on top of your game window.',
        category: 'FEATURE',
        status: 'IN_DEVELOPMENT',
        options: ['Must-have! Super convenient', 'Nice to have later', 'Not needed - browser is fine'],
        suggested_by_username: 'ApexPredator99',
      },
      {
        title: 'Clan & Guild Team Tournaments (5v5 Squad Cups)',
        description: 'Allow esports clans to register 5-player rosters to compete in scheduled weekend clan wars with pooled prize funds.',
        category: 'FEATURE',
        status: 'PLANNED',
        options: ['Yes! We need Clan Wars', 'Focus on 1v1 and Blitz first', 'Neutral'],
        suggested_by_username: 'ClanCaptainX',
      },
      {
        title: 'USDC Staking & VIP Tier Rewards for Daily Tournament Competitors',
        description: 'Earn platform XP multipliers, zero withdrawal fees, and exclusive monthly high-roller freerolls based on your competitive activity.',
        category: 'REWARD',
        status: 'ACTIVE_VOTING',
        options: ['Love this idea!', 'Only if non-wagered funds remain 100% liquid', 'Indifferent'],
        suggested_by_username: 'CryptoGamer_KE',
      },
    ];

    try {
      const created = [];
      for (const p of defaultPolls) {
        const { data } = await this.supabase.from('community_polls').insert(p).select().single();
        if (data) created.push(data);
      }
      return created.map((poll) => ({
        ...poll,
        options: poll.options,
        optionBreakdown: (poll.options as string[]).map((t, idx) => ({
          index: idx,
          text: t,
          votes: 0,
          percent: 0,
        })),
        totalVotes: 0,
        userVotedOptionIndex: null,
      }));
    } catch {
      return [];
    }
  }
}
