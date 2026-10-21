'use client';

import { AuthGuard } from '../../components/AuthGuard';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy, BarChart3, Swords, Gamepad2, ArrowRight } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { EloBadge } from '../../components/EloBadge';
import { OFFICIAL_GAMES, type CatalogGame } from '../../lib/gamesCatalog';
import { useGameStore } from '../../lib/gameStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { GamePoster } from '../../components/GamePoster';

interface RatingItem {
  id: string;
  game_type: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
}

interface UserProfile {
  id: string;
  username: string;
  rating?: number;
}

function MyRatingsContent() {
  const { setActiveGame } = useGameStore();

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['ratings-user-me'],
    queryFn: () => apiClient<UserProfile>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const { data: ratings, isLoading } = useQuery<RatingItem[]>({
    queryKey: ['my-ratings'],
    queryFn: () => apiClient<RatingItem[]>('/ratings/me').catch(() => []),
  });

  // Map ratings by underlying gameType
  const ratingsByEngine = new Map<string, RatingItem>();
  (ratings || []).forEach((r) => {
    ratingsByEngine.set(r.game_type.toUpperCase(), r);
  });

  const defaultUserElo = userProfile?.rating ?? 1000;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8 border border-border bg-card shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="copper">Skill Index</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                Season 1 Active
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
              My Competitive Ratings & Tiers
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Level 1 to 10 skill rankings across each esports title. All outcomes verified by automated instant match sync.
            </p>
          </div>
        </div>

        <Link href="/leaderboards">
          <Button variant="secondary" size="default" className="gap-2 font-bold shadow-sm">
            <BarChart3 className="w-4 h-4" />
            <span>Global Ladders</span>
          </Button>
        </Link>
      </Card>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground font-mono text-xs bg-card border border-border rounded-xl animate-pulse">
          Loading your competitive ratings...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OFFICIAL_GAMES.map((game) => {
            const userRatingRecord = ratingsByEngine.get(game.gameType.toUpperCase());
            const rating = userRatingRecord?.rating ?? defaultUserElo;
            const wins = userRatingRecord?.wins ?? 0;
            const losses = userRatingRecord?.losses ?? 0;
            const gamesPlayed = userRatingRecord?.games_played ?? 0;
            const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : '0.0';

            return (
              <Card
                key={game.id}
                className="p-5 border border-border bg-card hover:border-primary/50 rounded-xl flex flex-col justify-between gap-4 shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <GamePoster
                      game={game}
                      aspect="thumb"
                      className="w-12 h-16 rounded-lg flex-shrink-0 shadow-sm border border-border"
                    />
                    <div className="text-right">
                      <EloBadge elo={rating} size="md" showLabel />
                      <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                        {game.platform}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {game.displayName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-mono block uppercase">
                      {game.gameType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border text-center">
                    <div className="p-2 bg-muted/40 rounded-lg">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Win Rate
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {winRate}%
                      </span>
                    </div>
                    <div className="p-2 bg-muted/40 rounded-lg">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Record
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {wins}W-{losses}L
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {gamesPlayed} Played
                  </span>
                  <Link href={`/games/${game.id}`} onClick={() => setActiveGame(game)}>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 font-bold">
                      <span>Queue</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default function MyRatingsPage() {
  return (
    <AuthGuard>
      <MyRatingsContent />
    </AuthGuard>
  );
}
