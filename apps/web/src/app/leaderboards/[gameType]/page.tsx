'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LeaderboardTable } from '../../../components/LeaderboardTable';
import { apiClient } from '../../../lib/api';
import { OFFICIAL_GAMES, getGameById } from '../../../lib/gamesCatalog';
import { SEEDED_CHAMPIONS } from '../../../lib/seededLeaderboards';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username?: string;
  countryCode?: string;
}

export default function GameLeaderboardDynamicPage() {
  const params = useParams();
  const rawParam = (params.gameType as string) || 'cs2';

  // Check if rawParam matches a game id or displayName
  const matchedGame = OFFICIAL_GAMES.find(
    (g) => g.id.toLowerCase() === rawParam.toLowerCase() || g.gameType.toLowerCase() === rawParam.toLowerCase()
  ) || getGameById(rawParam);

  const engineType = matchedGame.gameType;

  const { data: rawEntries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', engineType],
    queryFn: async () => {
      try {
        const res = await apiClient<LeaderboardEntry[]>(`/leaderboard/${engineType}`);
        if (res && res.length > 0) return res;
        return SEEDED_CHAMPIONS;
      } catch {
        return SEEDED_CHAMPIONS;
      }
    },
    staleTime: 10000,
  });

  const entries = rawEntries && rawEntries.length > 0 ? rawEntries : SEEDED_CHAMPIONS;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto my-6">
      <div className="flex items-center justify-between">
        <Link
          href="/leaderboards"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-bold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Game Ladders</span>
        </Link>
        <Link href={`/matches/new?profileId=${matchedGame.id}`}>
          <Button variant="default" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 shadow-md shadow-primary/20">
            <Swords className="w-3.5 h-3.5" />
            <span>Play {matchedGame.displayName} Duel</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground font-mono text-xs bg-card border-border animate-pulse">
          Loading {matchedGame.displayName} rankings...
        </Card>
      ) : (
        <LeaderboardTable
          entries={entries ?? []}
          gameTitle={matchedGame.displayName}
          gameIcon={matchedGame.icon}
          gameType={matchedGame.gameType}
        />
      )}
    </div>
  );
}
