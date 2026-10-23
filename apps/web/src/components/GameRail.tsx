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
  Globe,
  LogOut,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../lib/gameStore';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type { GameProfile } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { AdminSidebar } from './AdminSidebar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';

export function GameRail() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { activeGame, setActiveGame, initializeDefaultGame } = useGameStore();

  // All hooks must be called before any conditional returns (React Rules of Hooks)
  const { data: games } = useQuery<GameProfile[]>({
    queryKey: ['approved-games-rail'],
    queryFn: () => apiClient<GameProfile[]>('/games'),
    enabled: !['/', '/privacy', '/terms', '/login', '/signup'].includes(pathname) && !pathname.startsWith('/admin') && !pathname.startsWith('/matches/room/') && !(pathname.startsWith('/matches/') && pathname !== '/matches/new'),
  });

  const { data: me } = useQuery<{ id: string; role?: string } | null>({
    queryKey: ['gamerail-me'],
    queryFn: () => apiClient<{ id: string; role?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
    enabled: !['/', '/privacy', '/terms', '/login', '/signup'].includes(pathname) && !pathname.startsWith('/admin') && !pathname.startsWith('/matches/room/') && !(pathname.startsWith('/matches/') && pathname !== '/matches/new'),
  });

  const isStaff = Boolean(me?.role && me.role !== 'PLAYER');

  const staffTargetHref =
    me?.role === 'REVIEWER'
      ? '/admin/review'
      : me?.role === 'SUPPORT'
      ? '/admin/support'
      : me?.role === 'TOURNAMENT_ADMIN'
      ? '/admin/seasons'
      : me?.role === 'FINANCE_AUDITOR'
      ? '/admin/treasury'
      : me?.role === 'COMMUNITY_MANAGER'
      ? '/admin/polls'
      : '/admin';

  const staffLabel =
    me?.role === 'REVIEWER'
      ? 'Audit'
      : me?.role === 'SUPPORT'
      ? 'Support'
      : me?.role === 'TOURNAMENT_ADMIN'
      ? 'Leagues'
      : me?.role === 'FINANCE_AUDITOR'
      ? 'Finance'
      : me?.role === 'COMMUNITY_MANAGER'
      ? 'Community'
      : 'Admin';

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      queryClient.clear();
      window.location.href = '/?view=landing';
    } catch {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    if (games && games.length > 0) {
      initializeDefaultGame(games);
    }
  }, [games, initializeDefaultGame]);

  // Landing page, standalone documents, and live match arena do not include the sidebar
  const hideSidebar =
    pathname === '/' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/matches/room/') ||
    (pathname.startsWith('/matches/') && pathname !== '/matches/new');

  if (hideSidebar) {
    return null;
  }

  // If inside the admin console, render the dedicated shadcn Admin Sidebar
  if (pathname.startsWith('/admin')) {
    return <AdminSidebar className="hidden lg:flex" />;
  }

  const activeCatalogGame = getGameById(activeGame?.id);

  // Pinned top esports titles for quick 1-click switching
  const pinnedGames = OFFICIAL_GAMES.slice(0, 4);

  const navItems = [
    { href: me ? '/dashboard' : '/', label: me ? 'Dashboard' : 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/challenges', label: 'Play Duels', icon: Swords },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/leaderboards', label: 'Ladders & Rank', icon: BarChart3 },
    { href: '/games', label: 'Explore Games', icon: Gamepad2 },
    { href: '/cashier', label: 'Wallet & Cashier', icon: Wallet },
  ];

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-background border-r border-border flex-col justify-between p-4 select-none h-screen sticky top-0 overflow-y-auto scrollbar-none z-30 pb-20 space-y-6">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <Link
            href={me ? '/dashboard' : '/'}
            className="flex items-center gap-2 px-2 py-1 text-foreground hover:opacity-90 transition group"
          >
            <Image
              src="/images/logo.png"
              alt="playverzus.xyz"
              width={160}
              height={36}
              className="h-8 w-auto object-contain transition group-hover:scale-105"
              priority
            />
          </Link>

          {/* Active Game Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-2">
              Active Arena
            </span>
            <Link
              href="/games"
              className="flex items-center justify-between p-2 rounded-xl bg-card hover:bg-muted/80 border border-border hover:border-primary/50 transition group text-left w-full shadow-sm"
              title="Click to view full game roster & switch arena"
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
            </Link>
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
              <Link
                href="/games"
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                All ({OFFICIAL_GAMES.length})
              </Link>
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
        <div className="pt-3 border-t border-border flex flex-col gap-2 px-2 text-xs">
          <div className={`flex items-center ${isStaff ? 'justify-between' : 'justify-start'}`}>
            {isStaff && (
              <Link
                href={staffTargetHref}
                className={`flex items-center gap-1.5 transition ${
                  pathname.startsWith('/admin') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{staffLabel}</span>
              </Link>
            )}
            <Link
              href="/settings"
              className={`flex items-center gap-1.5 transition ${
                pathname.startsWith('/settings') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              } ${!isStaff ? 'w-full py-1 rounded-lg hover:text-foreground' : ''}`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>

          {me && (
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <Link
                href="/?view=landing"
                className="hover:text-foreground flex items-center gap-1 transition"
                title="View public marketing landing page"
              >
                <Globe className="w-3 h-3" />
                <span>Landing Page</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hover:text-destructive flex items-center gap-1 transition text-[11px]"
                title="Sign out of arena"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
