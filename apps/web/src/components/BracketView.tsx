'use client';

import Link from 'next/link';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CountryFlag } from './CountryFlag';
import { Trophy, Swords, ArrowUpRight } from 'lucide-react';

interface MatchNode {
  id: string;
  bracket_round: number;
  bracket_position: number;
  player_a: string | null;
  player_b: string | null;
  winner: string | null;
  status: string;
  player_a_username?: string;
  player_a_country?: string;
  player_b_username?: string;
  player_b_country?: string;
}

interface BracketViewProps {
  matches: MatchNode[];
}

export function BracketView({ matches }: BracketViewProps) {
  // Group by round
  const rounds = matches.reduce<Record<number, MatchNode[]>>((acc, m) => {
    const r = m.bracket_round ?? 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  if (matches.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border text-muted-foreground">
        <Swords className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm font-bold text-foreground">Tournament bracket has not been generated yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Brackets seed automatically when registration reaches capacity or tournament starts.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border shadow-xl overflow-x-auto">
      <div className="flex gap-8 min-w-[700px] items-stretch pb-2">
        {roundNumbers.map((r) => (
          <div key={r} className="flex-1 flex flex-col justify-around gap-6">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs uppercase font-black tracking-wider text-primary font-mono">
                Round {r}
              </h4>
              <Badge variant="secondary" className="text-[9px] font-mono">
                {rounds[r]?.length ?? 0} {rounds[r]?.length === 1 ? 'Match' : 'Matches'}
              </Badge>
            </div>

            <div className="flex flex-col justify-around gap-4 h-full">
              {rounds[r]?.map((match) => {
                const isPlayerAWinner = match.winner && match.winner === match.player_a;
                const isPlayerBWinner = match.winner && match.winner === match.player_b;

                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="group bg-secondary/70 border border-border hover:border-primary/60 rounded-xl p-3 text-xs flex flex-col gap-2 shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground pb-0.5">
                      <span className="uppercase font-bold">
                        {match.status === 'SETTLED'
                          ? '✓ Verified'
                          : match.status === 'LIVE'
                          ? '● Live Arena'
                          : match.status}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-primary group-hover:underline">
                        Arena <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Player A */}
                    <div
                      className={`flex justify-between items-center py-1.5 px-2.5 rounded-lg transition-colors ${
                        isPlayerAWinner
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="font-mono truncate flex items-center gap-1.5">
                        {match.player_a ? (
                          <>
                            <CountryFlag
                              code={match.player_a_country}
                              fallbackSeed={match.player_a_username || match.player_a}
                              size="xs"
                            />
                            <span className="truncate">
                              {match.player_a_username ? `@${match.player_a_username}` : `Player #${match.player_a.slice(0, 6)}`}
                            </span>
                          </>
                        ) : (
                          'TBD'
                        )}
                      </span>
                      {isPlayerAWinner && (
                        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-1" />
                      )}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Player B */}
                    <div
                      className={`flex justify-between items-center py-1.5 px-2.5 rounded-lg transition-colors ${
                        isPlayerBWinner
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="font-mono truncate flex items-center gap-1.5">
                        {match.player_b ? (
                          <>
                            <CountryFlag
                              code={match.player_b_country}
                              fallbackSeed={match.player_b_username || match.player_b}
                              size="xs"
                            />
                            <span className="truncate">
                              {match.player_b_username ? `@${match.player_b_username}` : `Player #${match.player_b.slice(0, 6)}`}
                            </span>
                          </>
                        ) : (
                          'TBD'
                        )}
                      </span>
                      {isPlayerBWinner && (
                        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-1" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
