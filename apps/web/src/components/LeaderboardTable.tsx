'use client';

import Link from 'next/link';
import { EloBadge } from './EloBadge';
import { CountryFlag } from './CountryFlag';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

interface LeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username?: string;
  countryCode?: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  gameType?: string;
  gameTitle?: string;
  gameIcon?: string;
}

export function LeaderboardTable({ entries, gameType, gameTitle, gameIcon }: LeaderboardTableProps) {
  const displayTitle = gameTitle || gameType?.replace(/_/g, ' ') || 'Competitive Ladder';

  return (
    <Card className="shadow-2xl">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border">
        <div className="flex items-center gap-3">
          {gameIcon && <span className="text-2xl">{gameIcon}</span>}
          <div>
            <CardTitle>Global Ranked Ladder</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Arena: <strong className="text-foreground font-bold">{displayTitle}</strong>
            </p>
          </div>
        </div>
        <Badge variant="copper" className="font-mono text-[11px]">
          VX ELO (Level 1–10)
        </Badge>
      </CardHeader>

      <Table>
        <TableHeader className="bg-secondary/40">
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead className="w-16">Level</TableHead>
            <TableHead>Gamer / Tag</TableHead>
            <TableHead>Elo Rating</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Win Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-mono text-xs">
          {entries.map((e, index) => {
            const winRate = e.gamesPlayed > 0 ? ((e.wins / e.gamesPlayed) * 100).toFixed(1) : '0.0';
            const isTop1 = index === 0;
            const isTop2 = index === 1;
            const isTop3 = index === 2;
            const tag = e.username ? `@${e.username}` : `Player #${e.userId.slice(0, 8)}`;

            return (
              <TableRow
                key={e.userId}
                className={isTop1 ? 'bg-primary/5 hover:bg-primary/10' : ''}
              >
                <TableCell className="font-black">
                  {isTop1 ? (
                    <span className="text-amber-400 font-bold">🥇 #1</span>
                  ) : isTop2 ? (
                    <span className="text-gray-300 font-bold">🥈 #2</span>
                  ) : isTop3 ? (
                    <span className="text-amber-600 font-bold">🥉 #3</span>
                  ) : (
                    <span className="text-muted-foreground">#{index + 1}</span>
                  )}
                </TableCell>
                <TableCell>
                  <EloBadge elo={e.rating} size="sm" />
                </TableCell>
                <TableCell className="font-sans font-bold text-foreground">
                  <div className="flex items-center gap-2">
                    <CountryFlag
                      code={e.countryCode}
                      fallbackSeed={e.username || e.userId}
                      size="sm"
                    />
                    {e.username ? (
                      <Link
                        href={`/profile/${e.username}`}
                        className="hover:text-primary transition-colors"
                      >
                        {tag}
                      </Link>
                    ) : (
                      <span>{tag}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-black text-foreground">{e.rating}</TableCell>
                <TableCell>
                  <span className="text-emerald-400 font-bold">{e.wins}W</span>
                  <span className="text-muted-foreground mx-1">-</span>
                  <span className="text-red-400 font-bold">{e.losses}L</span>
                </TableCell>
                <TableCell className="text-foreground font-bold">{winRate}%</TableCell>
              </TableRow>
            );
          })}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground font-sans">
                No ranked matches completed for {displayTitle} yet. Host or play a duel to claim Rank #1!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
