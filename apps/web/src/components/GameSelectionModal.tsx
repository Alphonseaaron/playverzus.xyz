'use client';

import { useState } from 'react';
import { Search, X, Check, Gamepad2 } from 'lucide-react';
import { OFFICIAL_GAMES, type CatalogGame } from '../lib/gamesCatalog';
import { useGameStore } from '../lib/gameStore';
import { GamePoster } from './GamePoster';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface GameSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectGame?: (game: CatalogGame) => void;
}

export function GameSelectionModal({
  open,
  onClose,
  onSelectGame,
}: GameSelectionModalProps) {
  const { activeGame, setActiveGame } = useGameStore();
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filteredGames = OFFICIAL_GAMES.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.displayName.toLowerCase().includes(q) ||
      g.shortName.toLowerCase().includes(q) ||
      g.gameType.toLowerCase().includes(q) ||
      g.platform.toLowerCase().includes(q)
    );
  });

  const handlePick = (game: CatalogGame) => {
    setActiveGame(game);
    if (onSelectGame) {
      onSelectGame(game);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center animate-in fade-in duration-150"
    >
      <div className="w-full max-w-3xl my-4 sm:my-8 bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 text-foreground flex flex-col gap-5 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Select Esports Arena
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pick an official title to filter open duels, matchmaking queues, tournaments, and ladders.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search game titles, platforms, genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 focus:bg-secondary h-10 text-sm"
            autoFocus
          />
        </div>

        {/* 3:4 Vertical Game Poster Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 overflow-y-auto pr-1 scrollbar-thin max-h-[58vh]">
          {filteredGames.map((g) => {
            const isSelected = activeGame?.id?.toLowerCase() === g.id.toLowerCase();

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handlePick(g)}
                className={`group relative rounded-xl overflow-hidden border text-left transition-all duration-200 aspect-[3/4] flex flex-col justify-between p-3.5 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 shadow-lg scale-[1.02]'
                    : 'border-border hover:border-primary/60 hover:scale-[1.01]'
                }`}
              >
                <GamePoster
                  game={g}
                  aspect="poster"
                  showOverlay
                  className="absolute inset-0 w-full h-full"
                />

                {/* Top badges */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <Badge variant="secondary" className="backdrop-blur-md bg-background/80 text-[10px] font-mono border-border">
                    {g.platform}
                  </Badge>
                  {isSelected && (
                    <Badge variant="default" className="gap-1 text-[10px] font-bold">
                      <Check className="w-3 h-3" /> ACTIVE
                    </Badge>
                  )}
                </div>

                {/* Bottom title & genre */}
                <div className="relative z-10">
                  <span className="font-bold text-sm text-white block leading-tight group-hover:text-accent-400 transition-colors drop-shadow-md truncate">
                    {g.displayName}
                  </span>
                  <span className="text-[10px] text-gray-300 font-mono block mt-1 uppercase tracking-wider">
                    {g.gameType.replace('_', ' ')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-mono text-[11px]">
            {OFFICIAL_GAMES.length} Official Arenas Supported
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
