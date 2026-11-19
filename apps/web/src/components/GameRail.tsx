'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type { GameProfile } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { GameSelectionModal } from './GameSelectionModal';
import { AdminSidebar } from './AdminSidebar';
import { Separator } from './ui/separator';
import { notifyUser } from '../lib/notifications';

export function GameRail() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { activeGame, setActiveGame, initializeDefaultGame } = useGameStore();
  const [gameModalOpen, setGameModalOpen] = useState(false);

  // All hooks called before any conditional return
  const { data: games } = useQuery<GameProfile[]>({
    queryKey: ['approved-games-rail'],
    queryFn: () => apiClient<GameProfile[]>('/games'),
    enabled:
      !['/', '/privacy', '/terms', '/login', '/signup'].includes(pathname) &&
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/matches/room/') &&
      !(pathname.startsWith('/matches/') && pathname !== '/matches/new'),
  });

  const { data: me } = useQuery<{ id: string; role?: string } | null>({
    queryKey: ['gamerail-me'],
    queryFn: () => apiClient<{ id: string; role?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
    enabled:
      !['/', '/privacy', '/terms', '/login', '/signup'].includes(pathname) &&
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/matches/room/') &&
      !(pathname.startsWith('/matches/') && pathname !== '/matches/new'),
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
      : me?.role === 'SECURITY_ENGINEER'
      ? '/admin/security'
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
      : me?.role === 'SECURITY_ENGINEER'
      ? 'Security'
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

  // If inside the admin console, render the dedicated Admin Sidebar
  if (pathname.startsWith('/admin')) {
    return <AdminSidebar className="hidden lg:flex" />;
  }

  const activeCatalogGame = getGameById(activeGame?.id);
  const [arenasExpanded, setArenasExpanded] = useState(false);

  const FEATURED_ARENA_IDS = ['cs2', 'eafc', 'eafcm', 'rl', 'val', 'marvelrivals'];
  const featuredGames = OFFICIAL_GAMES.filter((g) => FEATURED_ARENA_IDS.includes(g.id.toLowerCase()));
  const isActiveInFeatured = FEATURED_ARENA_IDS.includes(activeCatalogGame.id.toLowerCase());
  const remainingGames = OFFICIAL_GAMES.filter(
    (g) => !FEATURED_ARENA_IDS.includes(g.id.toLowerCase()) && g.id.toLowerCase() !== activeCatalogGame.id.toLowerCase()
  );

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
      {/* 1. Layout Spacer: Reserves exact 256px width in desktop flex container so content does not underlap */}
      <div className="hidden lg:block w-64 flex-shrink-0" aria-hidden="true" />

      {/* 2. Fixed Stationary Sidebar: Stays maintained on screen, never scrolls with the page */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col justify-between bg-card border-r border-border select-none z-30 h-screen overflow-hidden">
        {/* Unified Scrollable Body: Mirrors AdminSidebar scroll behavior for entire menu and arenas */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
          {/* Brand Logo & Name */}
          <Link
            href={isStaff ? staffTargetHref : me ? '/dashboard' : '/'}
            className="flex items-center gap-2 px-1 py-1 text-foreground hover:opacity-90 transition group"
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

          {/* Active Arena Selector */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-1">
              Active Arena
            </span>
            <button
              type="button"
              onClick={() => setGameModalOpen(true)}
              className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 hover:bg-muted/80 border border-border hover:border-primary/50 transition group text-left w-full shadow-sm cursor-pointer"
              title="Click to switch active game arena (EA Sports FC 27, CS2, etc.)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GamePoster
                  game={activeCatalogGame}
                  aspect="thumb"
                  className="w-8 h-10 rounded-md flex-shrink-0 shadow-sm border border-border"
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
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-1 mb-1 block">
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
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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

          <Separator className="w-auto my-2" />

          {/* Arenas Section: Focus Wedge (Top 3 Featured Arenas + Collapsible Drawer) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-primary animate-pulse" />
                Featured Arenas
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE
              </span>
            </div>

            {/* Top 3 Featured Games */}
            <div className="space-y-1">
              {featuredGames.map((game) => {
                const isSelected = activeCatalogGame.id.toLowerCase() === game.id.toLowerCase();
                const activityCount = game.id === 'cs2' ? '14 Duels' : game.id === 'eafc' ? '8 Duels' : '6 Duels';

                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setActiveGame(game);
                      notifyUser('Active Arena Switched', {
                        body: `Now competing in ${game.displayName}`,
                        sound: 'connect',
                      });
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition border text-left w-full group ${
                      isSelected
                        ? 'bg-secondary border-primary/40 text-foreground font-semibold shadow-sm'
                        : 'bg-transparent hover:bg-muted/70 border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <GamePoster
                        game={game}
                        aspect="mini"
                        className="w-4 h-5 rounded flex-shrink-0"
                      />
                      <span className="truncate text-xs group-hover:text-foreground">{game.displayName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                      <span className="text-[9px] font-mono text-muted-foreground group-hover:text-emerald-400">
                        {activityCount}
                      </span>
                      {isSelected ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* If active arena is outside the top 3, show it here as active */}
              {!isActiveInFeatured && (
                <button
                  type="button"
                  onClick={() => setActiveGame(activeCatalogGame)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition border text-left w-full bg-secondary border-primary/40 text-foreground font-semibold shadow-sm"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <GamePoster
                      game={activeCatalogGame}
                      aspect="mini"
                      className="w-4 h-5 rounded flex-shrink-0"
                    />
                    <span className="truncate text-xs">{activeCatalogGame.displayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                    <span className="text-[9px] font-mono text-primary font-bold">SELECTED</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  </div>
                </button>
              )}
            </div>

            {/* Expand / Collapse All 21 Arenas Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setArenasExpanded(!arenasExpanded)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 border border-border/50 transition group"
              >
                <span className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-primary" />
                  {arenasExpanded ? 'Collapse Arenas' : `Browse All ${OFFICIAL_GAMES.length} Arenas`}
                </span>
                {arenasExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                )}
              </button>

              {arenasExpanded && (
                <div className="mt-1.5 space-y-1 pl-1 border-l-2 border-border/60 ml-2 animate-in fade-in duration-200">
                  {remainingGames.map((game) => {
                    const isSelected = activeCatalogGame.id.toLowerCase() === game.id.toLowerCase();
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => setActiveGame(game)}
                        className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition text-left w-full ${
                          isSelected
                            ? 'bg-secondary text-foreground font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <GamePoster
                            game={game}
                            aspect="mini"
                            className="w-3.5 h-4 rounded flex-shrink-0"
                          />
                          <span className="truncate">{game.displayName}</span>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                  <div className="pt-1.5">
                    <Link
                      href="/games"
                      className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 px-2 py-0.5"
                    >
                      <span>Explore Full Games Catalog →</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Pinned Region: Settings remains firmly below, never scrolls out of view */}
        <div className="flex-shrink-0 mt-auto p-3 border-t border-border bg-card flex flex-col gap-2 text-xs">
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
              } ${!isStaff ? 'w-full py-0.5 rounded-lg hover:text-foreground' : ''}`}
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

      {/* Global In-Place Game Switcher Modal */}
      <GameSelectionModal
        open={gameModalOpen}
        onClose={() => setGameModalOpen(false)}
      />
    </>
  );
}
