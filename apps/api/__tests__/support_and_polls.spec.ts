import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupportService } from '../src/support/support.service';
import { PollsService } from '../src/polls/polls.service';
import { BadRequestException } from '@nestjs/common';

// Mock DB client
vi.mock('@playverzus/db', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: { id: 'poll-1', title: 'Poll 1', options: ['A', 'B'] }, error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
        in: () => ({
          order: () => Promise.resolve({
            data: [
              { id: 'staff-1', username: 'support_sarah', role: 'SUPPORT' },
              { id: 'staff-2', username: 'admin_dave', role: 'ADMIN' },
            ],
            error: null,
          }),
        }),
      }),
      insert: (payload: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-id', ...payload }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
          }),
        }),
      }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
}));

describe('SupportService & PollsService Unit Tests', () => {
  let supportService: SupportService;
  let pollsService: PollsService;

  beforeEach(() => {
    supportService = new SupportService();
    pollsService = new PollsService();
  });

  describe('SupportService Validation & Operations', () => {
    it('creates a new support ticket and returns ticket ID & open status', async () => {
      const ticket = await supportService.createTicket('user-123', {
        name: 'Gamer One',
        email: 'gamer@example.com',
        subject: 'USDC Deposit Question',
        category: 'BILLING_USDC',
        priority: 'NORMAL',
        message: 'Where is my Crossmint deposit?',
      });

      expect(ticket).toBeDefined();
      expect(ticket.success).toBe(true);
      expect(ticket.ticketId).toBeDefined();
    });

    it('rejects empty message or missing subject', async () => {
      await expect(
        supportService.createTicket('user-123', {
          name: 'Gamer One',
          email: 'gamer@example.com',
          subject: '',
          message: 'Valid message',
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        supportService.createTicket('user-123', {
          name: 'Gamer One',
          email: 'gamer@example.com',
          subject: 'Valid Subject',
          message: '',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('lists staff members available for delegation', async () => {
      const staff = await supportService.listStaffMembers();
      expect(Array.isArray(staff)).toBe(true);
      expect(staff.length).toBeGreaterThan(0);
      expect(staff[0]).toHaveProperty('username');
      expect(staff[0]).toHaveProperty('role');
    });
  });

  describe('PollsService Validation & Voting', () => {
    it('lists fallback community polls when database is empty', async () => {
      const polls = await pollsService.listPolls('user-123');
      expect(Array.isArray(polls)).toBe(true);
      expect(polls.length).toBeGreaterThan(0);

      const firstPoll = polls[0];
      expect(firstPoll).toHaveProperty('optionBreakdown');
      expect(Array.isArray(firstPoll.optionBreakdown)).toBe(true);
      for (const opt of firstPoll.optionBreakdown) {
        expect(typeof opt.percent).toBe('number');
        expect(opt.percent).toBeGreaterThanOrEqual(0);
        expect(opt.percent).toBeLessThanOrEqual(100);
      }
    });

    it('submits a player suggestion with valid title and category', async () => {
      const suggestion = await pollsService.submitSuggestion('user-456', 'SuperPlayer', {
        title: 'Add Chess 3-minute blitz tournaments',
        category: 'NEW_GAME',
        description: 'Chess is skill-based and has global audience with fast blitzes.',
      });

      expect(suggestion).toBeDefined();
      expect(suggestion.success).toBe(true);
      expect(suggestion.suggestionId).toBeDefined();
    });

    it('rejects suggestion with empty description or title', async () => {
      await expect(
        pollsService.submitSuggestion('user-456', 'SuperPlayer', {
          title: 'Valid title',
          category: 'NEW_GAME',
          description: '',
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        pollsService.submitSuggestion('user-456', 'SuperPlayer', {
          title: '',
          category: 'NEW_GAME',
          description: 'Valid description',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects voting with invalid option index', async () => {
      await expect(pollsService.castVote('poll-1', 'user-456', -1)).rejects.toThrow(BadRequestException);
    });
  });
});
