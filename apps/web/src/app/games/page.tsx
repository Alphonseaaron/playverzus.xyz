'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Plus, Sparkles, Trophy, Users, Shield } from 'lucide-react';
import { GameProfileCard } from '../../components/GameProfileCard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { OFFICIAL_GAMES, type CatalogGame } from '../../lib/gamesCatalog';
import type { GameProfile } from '@playverzus/core';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export default function GamesPage() {
  const { setActiveGame } = useGameStore();
  const { data: games, isLoading } = useQuery<GameProfile[]>({
    queryKey: ['approved-games'],
    queryFn: () => apiClient<GameProfile[]>('/games').catch(() => []),
  });

  const { data: me } = useQuery<{ role?: string } | null>({
    queryKey: ['header-me'],
    queryFn: () => apiClient<{ role?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const isGameAdmin = Boolean(
    me?.role && ['ADMIN', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN'].includes(me.role),
  );

  const officialIds = new Set(OFFICIAL_GAMES.map((g) => g.id.toLowerCase()));
  const customGames = (games || []).filter(
    (g) => !officialIds.has(g.id.toLowerCase())
  );
  const allGames = [...OFFICIAL_GAMES, ...customGames];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto min-w-0">
      {/* Game Catalog Hero Header */}
      <Card className="p-6 sm:p-8 border border-border bg-card shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="copper">Official Esports Roster</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {allGames.length} Supported Titles
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
              Esports Arena Catalog
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Select any admin-verified game title to browse open duels, competitive ladders, and tournaments.
            </p>
          </div>
        </div>

        {isGameAdmin ? (
          <Link href="/games/new?mode=admin">
            <Button variant="default" size="default" className="gap-2 font-bold shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Add & Calibrate Game</span>
            </Button>
          </Link>
        ) : (
          <Link href="/community/polls">
            <Button variant="secondary" size="default" className="gap-2 font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Suggest a New Game</span>
            </Button>
          </Link>
        )}
      </Card>

      {isLoading && allGames.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground font-mono text-xs bg-card border border-border rounded-xl animate-pulse">
          Loading game roster...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allGames.map((g) => {
            const catalogItem = OFFICIAL_GAMES.find((c) => c.id.toLowerCase() === g.id.toLowerCase());
            const icon = catalogItem?.icon || '🎮';
            const posterUrl = catalogItem?.posterUrl;
            const bannerUrl = catalogItem?.bannerUrl;
            const tagline = catalogItem?.tagline || (g as any).tagline || 'Competitive Esports Duel';
            const displayName = g.displayName || (g as any).display_name || 'Untitled Game';
            const platform = g.platform || 'UNIVERSAL';
            const platforms = (g as any).constraints?.platforms;
            const isOfficial = g.isOfficial ?? (g as any).is_official ?? false;

            return (
              <GameProfileCard
                key={g.id}
                id={g.id}
                displayName={displayName}
                platform={platform}
                platforms={platforms}
                isOfficial={isOfficial}
                posterUrl={posterUrl}
                bannerUrl={bannerUrl}
                icon={icon}
                tagline={tagline}
                onSelectGame={() => setActiveGame(g)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
