'use client';

import Link from 'next/link';
import { useGameStore } from '../lib/gameStore';
import { getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface GameContextBarProps {
  title?: string;
  subtitle?: string;
  filterGameOnly?: boolean;
  onToggleFilter?: (onlyActive: boolean) => void;
  showAllToggle?: boolean;
  onSelectGame?: (game: CatalogGame) => void;
  actionButton?: React.ReactNode;
}

export function GameContextBar({
  title,
  subtitle,
  filterGameOnly = true,
  onToggleFilter,
  showAllToggle = true,
  onSelectGame,
  actionButton,
}: GameContextBarProps) {
  const { activeGame } = useGameStore();

  const catalogGame = getGameById(activeGame?.id);

  return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl shadow-sm">
        {/* Left: Active Game Capsule */}
        <div className="flex items-center gap-3.5 min-w-0">
          <GamePoster
            game={catalogGame}
            aspect="thumb"
            className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl flex-shrink-0 shadow-md border border-border"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge variant="copper">Active Arena</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {catalogGame.platform}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                {catalogGame.gameType.replace('_', ' ')}
              </Badge>
            </div>

            <h2 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight truncate">
              {title || `${catalogGame.displayName} Arena`}
            </h2>

            <p className="text-xs text-muted-foreground truncate">
              {subtitle || catalogGame.tagline}
            </p>
          </div>
        </div>

        {/* Right: Switch Game & Filter Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between md:justify-end flex-shrink-0">
          {showAllToggle && onToggleFilter && (
            <div className="flex items-center bg-secondary border border-border rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => onToggleFilter(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterGameOnly
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {catalogGame.shortName} Only
              </button>
              <button
                type="button"
                onClick={() => onToggleFilter(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  !filterGameOnly
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Games
              </button>
            </div>
          )}

          <Link href="/games">
            <Button
              variant="secondary"
              size="default"
              className="text-xs font-bold gap-1.5"
            >
              <span>⇄ Switch Game</span>
            </Button>
          </Link>

          {actionButton}
        </div>
      </div>
  );
}
