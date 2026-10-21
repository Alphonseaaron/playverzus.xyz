'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy, BarChart3, Swords, Users, ShieldCheck, Flame } from 'lucide-react';
import { LeaderboardTable } from '../../components/LeaderboardTable';
import { EloBadge } from '../../components/EloBadge';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../../lib/gamesCatalog';
import { GamePoster } from '../../components/GamePoster';
import { GameContextBar } from '../../components/GameContextBar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

interface LeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username?: string;
  countryCode?: string;
}

interface UserProfile {
  id: string;
  username: string;
  rating?: number;
}

interface UserRankResponse {
  userId: string;
  gameType: string;
  rank: number | null;
}

export default function LeaderboardsPage() {
  const { activeGame, setActiveGame } = useGameStore();
  const [selectedGameId, setSelectedGameId] = useState<string>(activeGame?.id || 'cs2');

  // Keep local selection synchronized with global active game
  useEffect(() => {
    if (activeGame?.id && activeGame.id !== selectedGameId) {
      setSelectedGameId(activeGame.id);
    }
  }, [activeGame?.id, selectedGameId]);

  const selectedGame: CatalogGame = getGameById(selectedGameId);

  const handleSelectGame = (game: CatalogGame) => {
    setSelectedGameId(game.id);
    setActiveGame(game);
  };

  // 1. Fetch logged-in user profile
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['leaderboard-user-me'],
    queryFn: async () => {
      try {
        return await apiClient<UserProfile>('/profile/me');
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  // 2. Fetch Leaderboard for the selected game's engine type
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', selectedGame.gameType],
    queryFn: async () => {
      try {
        const res = await apiClient<LeaderboardEntry[]>('/leaderboard/' + selectedGame.gameType);
        return res || [];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  // 3. Fetch user's individual rank in this ladder
  const { data: userRankData } = useQuery<UserRankResponse | null>({
    queryKey: ['leaderboard-rank', selectedGame.gameType, userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return null;
      try {
        return await apiClient<UserRankResponse>(`/leaderboard/${selectedGame.gameType}/rank/${userProfile.id}`);
      } catch {
        return null;
      }
    },
    enabled: !!userProfile?.id,
    staleTime: 15000,
  });

  const userRank = userRankData?.rank;
  const userElo = userProfile?.rating ?? 1000;

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-16">
      {/* 1. Global Ladders Hero */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 border border-border bg-card shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <GamePoster
            game={selectedGame}
            aspect="thumb"
            className="w-14 h-18 sm:w-16 sm:h-22 rounded-xl shadow-xl border border-border flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">Official Elo Ladder</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {selectedGame.platform}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {selectedGame.displayName} Standings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Live competitive skill ratings, global rankings, and win rates across all duels.
            </p>
          </div>
        </div>

        {/* User's Current Standings Chip */}
        <div className="p-4 bg-muted/50 border border-border rounded-xl flex items-center gap-4 flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Your Rank</span>
            <span className="text-xl font-bold text-foreground font-mono">
              {userRank ? `#${userRank}` : 'Unranked'}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Your Elo</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <EloBadge elo={userElo} size="sm" />
              <span className="font-mono font-bold text-sm text-foreground">{userElo}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Game Ladder Context Bar */}
      <GameContextBar
        title={`${selectedGame.displayName} Elo Leaderboard`}
        subtitle={`Official competitive ladder standings & MMR for ${selectedGame.displayName}`}
        showAllToggle={false}
        onSelectGame={(g) => handleSelectGame(g)}
      />

      {/* Global Ladder Table */}
      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground font-mono text-sm animate-pulse bg-card border border-border rounded-xl">
          Calculating Elo standings for {selectedGame.displayName}...
        </div>
      ) : (
        <LeaderboardTable
          entries={entries || []}
          gameTitle={selectedGame.displayName}
          gameType={selectedGame.gameType}
        />
      )}
    </div>
  );
}
