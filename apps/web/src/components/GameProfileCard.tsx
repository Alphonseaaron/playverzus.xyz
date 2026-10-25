'use client';

import Link from 'next/link';
import { Swords, Trophy } from 'lucide-react';
import { GamePoster } from './GamePoster';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getGameById } from '../lib/gamesCatalog';

interface GameProfileCardProps {
  id: string;
  displayName: string;
  gameType?: string;
  platform: string;
  platforms?: string[];
  isOfficial?: boolean;
  posterUrl?: string;
  bannerUrl?: string;
  icon?: string;
  tagline?: string;
  onSelectGame?: () => void;
}

export function GameProfileCard({
  id,
  displayName,
  platform,
  platforms,
  isOfficial,
  posterUrl,
  bannerUrl,
  icon,
  tagline,
  onSelectGame,
}: GameProfileCardProps) {
  const catalogItem = getGameById(id);
  const resolvedPoster = posterUrl || catalogItem.posterUrl;
  const resolvedBanner = bannerUrl || catalogItem.bannerUrl;
  const resolvedTagline = tagline || catalogItem.tagline || 'Competitive Matchmaking Arena';
  const platformDisplay = platforms && platforms.length > 0 ? platforms.join(' · ') : platform;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border hover:border-primary/80 bg-card transition-all duration-300 group shadow-xl flex flex-col justify-between aspect-[3/4] min-w-0">
      {/* 1. Full Background Poster Cover Art */}
      <GamePoster
        game={{
          displayName,
          posterUrl: resolvedPoster,
          bannerUrl: resolvedBanner,
          icon: icon || catalogItem.icon,
          gradient: catalogItem.gradient,
          platform,
        }}
        aspect="poster"
        showOverlay
        className="absolute inset-0 w-full h-full"
      />

      {/* 2. Top Header Badges */}
      <div className="relative z-10 p-3.5 flex items-center justify-between gap-2 pointer-events-none">
        <Badge variant="secondary" className="backdrop-blur-md bg-background/80 text-foreground font-mono text-[10px] border-border">
          {platformDisplay}
        </Badge>
        {isOfficial && (
          <Badge variant="copper" className="backdrop-blur-md bg-primary/20 font-bold text-[10px]">
            OFFICIAL
          </Badge>
        )}
      </div>

      {/* 3. Bottom Content Details & Quick Actions */}
      <div className="relative z-10 p-4 pt-4 flex flex-col gap-3 bg-zinc-950/95 border-t border-zinc-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {resolvedTagline}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/matches/new?profileId=${id}`}
            onClick={onSelectGame}
            className="w-full"
          >
            <Button size="sm" variant="default" className="w-full text-xs font-bold gap-1 shadow-sm">
              <Swords className="w-3.5 h-3.5" />
              <span>Play Duel</span>
            </Button>
          </Link>
          <Link
            href={`/games/${id}`}
            onClick={onSelectGame}
            className="w-full"
          >
            <Button size="sm" variant="secondary" className="w-full text-xs font-bold gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Arena Hub</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
