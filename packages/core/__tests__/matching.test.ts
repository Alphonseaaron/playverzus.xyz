import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from '../src/matching/MatchStateMachine';
import { TournamentEngine } from '../src/matching/TournamentEngine';
import type { TypedSupabaseClient } from '@playverzus/db';

describe('MatchStateMachine', () => {
  it('allows valid state progression', () => {
    expect(canTransition('DRAFT', 'OPEN')).toBe(true);
    expect(canTransition('OPEN', 'ACCEPTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'LIVE')).toBe(true);
    expect(canTransition('LIVE', 'CAPTURING')).toBe(true);
    expect(canTransition('CAPTURING', 'VERIFYING')).toBe(true);
    expect(canTransition('VERIFYING', 'VERIFIED')).toBe(true);
    expect(canTransition('VERIFIED', 'SETTLED')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('DRAFT', 'LIVE')).toBe(false);
    expect(canTransition('SETTLED', 'OPEN')).toBe(false);
    expect(() => assertTransition('SETTLED', 'LIVE')).toThrow();
  });
});

describe('TournamentEngine Bracket Generation', () => {
  const mockClient = {} as TypedSupabaseClient;
  const engine = new TournamentEngine({ client: mockClient });

  it('generates correct single elimination brackets for power-of-2', () => {
    const entries = [
      { userId: 'u1', seed: 1 },
      { userId: 'u2', seed: 2 },
      { userId: 'u3', seed: 3 },
      { userId: 'u4', seed: 4 },
    ];

    const drafts = engine.generateSingleElim(entries);
    expect(drafts.length).toBe(3); // 2 semifinal matches + 1 final match
    const round1 = drafts.filter((d) => d.round === 1);
    expect(round1.length).toBe(2);
    expect(round1[0]?.playerA).toBe('u1');
    expect(round1[0]?.playerB).toBe('u2');
  });

  it('generates round robin pairs for all players', () => {
    const entries = [
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' },
    ];
    const drafts = engine.generateRoundRobin(entries);
    expect(drafts.length).toBe(3); // (3 * 2) / 2 = 3
  });
});
