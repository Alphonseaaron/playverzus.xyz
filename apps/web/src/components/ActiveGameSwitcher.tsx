'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronsUpDown, Gamepad2, ArrowLeftRight } from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { GameSelectionModal } from './GameSelectionModal';
import { notifyUser } from '../lib/notifications';
import { Badge } from './ui/badge';

interface ActiveGameSwitcherProps {
  compact?: boolean;
  className?: string;
  showPlatform?: boolean;
}

export function ActiveGameSwitcher({
  compact = false,
  className = '',
  showPlatform = true,
}: ActiveGameSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGame, setActiveGame } = useGameStore();
  const [modalOpen, setModalOpen] = useState(false);

  const catalogGame = getGameById(activeGame?.id);

  const handleSelectGame = (game: CatalogGame) => {
    setActiveGame(game);
    setModalOpen(false);

    notifyUser('Active Arena Switched', {
      body: `Now competing in ${game.displayName}`,
      sound: 'connect',
    });

    // If currently inside an active matchroom, redirect smoothly to the newly selected game's duels queue
    if (pathname.startsWith('/matches/') && pathname !== '/matches/new') {
      router.push(`/challenges`);
    } else if (pathname.startsWith('/games/')) {
      router.push(`/games/${game.id}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`group flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 rounded-xl bg-card/90 hover:bg-muted/90 border border-border hover:border-primary/50 transition-all shadow-sm text-left select-none cursor-pointer ${className}`}
        title="Click to switch active game arena (EA Sports FC 27, CS2, etc.)"
        aria-label={`Active game: ${catalogGame.displayName}. Click to change.`}
      >
        {/* Game Poster Thumbnail */}
        <GamePoster
          game={catalogGame}
          aspect="thumb"
          className="w-6 h-8 sm:w-7 sm:h-9 rounded-md flex-shrink-0 shadow-sm border border-border/80 group-hover:scale-105 transition-transform"
        />

        {/* Game Titles & Platform */}
        <div className="flex flex-col min-w-0 pr-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors max-w-[110px] sm:max-w-[160px]">
              {compact ? catalogGame.shortName : catalogGame.displayName}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            {showPlatform && (
              <span className="truncate max-w-[90px] sm:max-w-[130px]">
                {catalogGame.platform}
              </span>
            )}
            <span className="hidden sm:inline text-primary/70 font-semibold">• Change</span>
          </div>
        </div>

        {/* Chevrons */}
        <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors ml-0.5">
          <ChevronsUpDown className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </button>

      {/* Global Game Selection Modal */}
      <GameSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectGame={handleSelectGame}
      />
    </>
  );
}
