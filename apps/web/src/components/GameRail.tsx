'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  Trophy,
  BarChart3,
  Gamepad2,
  Shield,
  Settings,
  ChevronsUpDown,
  Flame,
  LayoutDashboard,
  Wallet,
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { apiClient } from '../lib/api';
import type { GameProfile } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { GameSelectionModal } from './GameSelectionModal';
import { AdminSidebar } from './AdminSidebar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';

export function GameRail() {
  const pathname = usePathname();
  const { activeGame, setActiveGame, initializeDefaultGame } = useGameStore();
  const [gameModalOpen, setGameModalOpen] = useState(false);

  // If inside the admin console, render the dedicated shadcn Admin Sidebar
  if (pathname.startsWith('/admin')) {
    return <AdminSidebar className="hidden lg:flex" />;
  }

  const { data: games } = useQuery<GameProfile[]>({
    queryKey: ['approved-games-rail'],
    queryFn: () => apiClient<GameProfile[]>('/games'),
  });

  const { data: me } = useQuery<{ id: string; role?: string } | null>({
    queryKey: ['gamerail-me'],
    queryFn: () => apiClient<{ id: string; role?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const isStaff = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN' || me?.role === 'REVIEWER';

  useEffect(() => {
    if (games && games.length > 0) {
      initializeDefaultGame(games);
    }
  }, [games, initializeDefaultGame]);

  const activeCatalogGame = getGameById(activeGame?.id);

  // Pinned top esports titles for quick 1-click switching
  const pinnedGames = OFFICIAL_GAMES.slice(0, 4);

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/challenges', label: 'Play Duels', icon: Swords },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/leaderboards', label: 'Ladders & Rank', icon: BarChart3 },
    { href: '/games', label: 'Explore Games', icon: Gamepad2 },
    { href: '/dashboard', label: 'Wallet & Cashier', icon: Wallet },
  ];

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-background border-r border-border flex-col justify-between p-4 select-none h-screen sticky top-0 overflow-y-auto scrollbar-none z-30 pb-20 space-y-6">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-3 px-2 py-1 text-foreground hover:opacity-90 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center p-1 shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
              <Image
                src="/images/logo-mark.png"
                alt="playverzus.xyz logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-foreground leading-tight flex items-center gap-0.5">
                <span>playverzus</span>
                <span className="text-primary font-mono text-xs font-black">.xyz</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-primary border-primary/30 ml-1">
                  PRO
                </Badge>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-none">
                Esports Arena
              </span>
            </div>
          </Link>

          {/* Active Game Selector (Faceit-Style Trigger, opens clean dialog modal, no top scrollbars!) */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-2">
              Active Arena
            </span>
            <button
              type="button"
              onClick={() => setGameModalOpen(true)}
              className="flex items-center justify-between p-2 rounded-xl bg-card hover:bg-muted/80 border border-border hover:border-primary/50 transition group text-left w-full shadow-sm"
              title="Click to switch game arena"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GamePoster
                  game={activeCatalogGame}
                  aspect="thumb"
                  className="w-9 h-12 rounded-lg flex-shrink-0 shadow-sm"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground truncate block group-hover:text-primary transition-colors">
                    {activeCatalogGame.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {activeCatalogGame.platform} · {activeCatalogGame.shortName}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-1 transition-colors" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-2 mb-1.5 block">
              Menu
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <Separator />

          {/* Quick Game Switcher (Pinned Favorites) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-primary" />
                Featured
              </span>
              <button
                type="button"
                onClick={() => setGameModalOpen(true)}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                All ({OFFICIAL_GAMES.length})
              </button>
            </div>

            <div className="space-y-1">
              {pinnedGames.map((game) => {
                const isSelected = activeCatalogGame.id.toLowerCase() === game.id.toLowerCase();
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setActiveGame(game)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition border text-left w-full ${
                      isSelected
                        ? 'bg-secondary border-primary/40 text-foreground font-semibold'
                        : 'bg-transparent hover:bg-muted/70 border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GamePoster
                        game={game}
                        aspect="mini"
                        className="w-4 h-6 rounded flex-shrink-0"
                      />
                      <span className="truncate text-xs">{game.displayName}</span>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Utility Links */}
        <div className={`pt-3 border-t border-border flex items-center ${isStaff ? 'justify-between' : 'justify-center'} px-2 text-xs`}>
          {isStaff && (
            <Link
              href={me?.role === 'REVIEWER' ? '/admin/review' : '/admin'}
              className={`flex items-center gap-1.5 transition ${
                pathname.startsWith('/admin') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{me?.role === 'REVIEWER' ? 'Audit' : 'Admin'}</span>
            </Link>
          )}
          <Link
            href="/settings"
            className={`flex items-center gap-1.5 transition ${
              pathname.startsWith('/settings') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            } ${!isStaff ? 'w-full justify-center py-1 rounded-lg hover:bg-muted' : ''}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* FACEIT-Style Game Selection Modal (clean dialog popup, replaces top scrollbars) */}
      <GameSelectionModal
        open={gameModalOpen}
        onClose={() => setGameModalOpen(false)}
      />
    </>
  );
}
