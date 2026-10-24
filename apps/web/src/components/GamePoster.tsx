'use client';

import { useState } from 'react';

export interface GamePosterData {
  displayName: string;
  shortName?: string;
  posterUrl?: string;
  bannerUrl?: string;
  icon?: string;
  gradient?: string;
  platform?: string;
}

interface GamePosterProps {
  game: GamePosterData;
  aspect?: 'poster' | 'banner' | 'thumb' | 'mini';
  className?: string;
  showOverlay?: boolean;
  priority?: boolean;
}

export function GamePoster({
  game,
  aspect = 'poster',
  className = '',
  showOverlay = false,
}: GamePosterProps) {
  const [imageError, setImageError] = useState(false);

  const posterSrc = aspect === 'banner' ? (game.bannerUrl || game.posterUrl) : (game.posterUrl || game.bannerUrl);

  const aspectClasses = {
    poster: 'aspect-[3/4] w-full',
    banner: 'aspect-[16/9] w-full',
    thumb: 'w-11 h-14 rounded-lg',
    mini: 'w-6 h-8 rounded',
  };

  const gradientClass = game.gradient || 'from-[#7C3AED] via-stone-900 to-black';

  return (
    <div
      className={`relative overflow-hidden bg-secondary select-none flex-shrink-0 ${aspectClasses[aspect]} ${className}`}
    >
      {posterSrc && !imageError ? (
        <img
          src={posterSrc}
          alt={game.displayName}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        /* Dynamic High-End SVG Fallback Poster */
        <div
          className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-2 text-center relative`}
        >
          {aspect === 'mini' || aspect === 'thumb' ? (
            <span className="text-sm font-black font-mono text-white/90 uppercase tracking-tighter">
              {game.shortName || game.displayName.slice(0, 3)}
            </span>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 z-10">
              <span className="text-2xl sm:text-3xl opacity-80">{game.icon || '🎮'}</span>
              <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider drop-shadow-md">
                {game.shortName || game.displayName}
              </span>
              <span className="text-[9px] font-mono text-primary uppercase tracking-wider font-bold">
                {game.platform || 'ESPORTS'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Subtle Vignette Gradient Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
