'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  X,
  Search,
  Plus,
  ArrowLeftRight,
  LayoutDashboard,
  Swords,
  Trophy,
  BarChart3,
  Gamepad2,
  Wallet,
  Shield,
  Settings,
  Globe,
  LogOut,
  Headphones,
  Vote,
  Users,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { NotificationBell } from './NotificationBell';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import { formatUSDC, formatPoints } from '../lib/currency';
import { useWalletModeStore } from '../lib/walletModeStore';
import { OFFICIAL_GAMES, getGameById } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { CrossmintLogo } from './CrossmintLogo';

interface HeaderWallet {
  cashEur?: number;
  balance?: number;
}

interface HeaderProfile {
  id: string;
  username: string;
  display_name?: string;
  rating?: number;
  country_code?: string;
  region?: string;
  role?:
    | 'PLAYER'
    | 'REVIEWER'
    | 'ADMIN'
    | 'SUPER_ADMIN'
    | 'SUPPORT'
    | 'TOURNAMENT_ADMIN'
    | 'FINANCE_AUDITOR'
    | 'COMMUNITY_MANAGER';
}

function getPageContext(pathname: string): { title: string } {
  if (pathname === '/') return { title: 'Arena Overview' };
  if (pathname.startsWith('/challenges')) return { title: '1v1 Arena Duels' };
  if (pathname.startsWith('/tournaments')) return { title: 'Championship Tournaments' };
  if (pathname.startsWith('/leaderboards')) return { title: 'Ladders & Rank' };
  if (pathname.startsWith('/games')) return { title: 'Curated Arenas' };
  if (pathname.startsWith('/community/polls')) return { title: 'Community Roadmap' };
  if (pathname.startsWith('/support')) return { title: 'Player Support' };
  if (pathname.startsWith('/matches/new')) return { title: 'Create Arena Duel' };
  if (pathname.startsWith('/matches/')) return { title: 'Live Match Arena' };
  if (pathname.startsWith('/dashboard')) return { title: 'Arena Dashboard' };
  if (pathname.startsWith('/cashier')) return { title: 'Wallet & Cashier' };
  if (pathname.startsWith('/settings')) return { title: 'Account Settings' };
  if (pathname.startsWith('/admin')) return { title: 'Operations Console' };
  if (pathname.startsWith('/profile')) return { title: 'Player Profile' };
  return { title: 'Playverzus.xyz' };
}

export function TopHeader() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { activeGame } = useGameStore();
  const { mode: walletMode, toggleMode: toggleWalletMode } = useWalletModeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when mobile top dropdown is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const activeCatalogGame = getGameById(activeGame?.id);
  const pageContext = getPageContext(pathname);

  // Real Wallet Balance from API
  const { data: wallet } = useQuery<HeaderWallet>({
    queryKey: ['header-wallet'],
    queryFn: async () => {
      try {
        return await apiClient<HeaderWallet>('/wallet/balance');
      } catch {
        return { cashEur: 0, balance: 0 };
      }
    },
    staleTime: 15000,
  });

  // Real User Profile from API
  const { data: me } = useQuery<HeaderProfile | null>({
    queryKey: ['header-me'],
    queryFn: async () => {
      try {
        return await apiClient<HeaderProfile>('/profile/me');
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

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

  const cashAmount = wallet?.cashEur ?? 0.0;
  const pointsAmount = wallet?.balance ?? 0;
  const avatarLetter = me?.username ? me.username.slice(0, 1).toUpperCase() : 'U';

  const isStaff =
    me?.role === 'ADMIN' ||
    me?.role === 'SUPER_ADMIN' ||
    me?.role === 'REVIEWER' ||
    me?.role === 'SUPPORT' ||
    me?.role === 'TOURNAMENT_ADMIN' ||
    me?.role === 'FINANCE_AUDITOR' ||
    me?.role === 'COMMUNITY_MANAGER';

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
      ? 'Audit Queue'
      : me?.role === 'SUPPORT'
      ? 'Support Desk'
      : me?.role === 'TOURNAMENT_ADMIN'
      ? 'Tournaments & Seasons'
      : me?.role === 'FINANCE_AUDITOR'
      ? 'Treasury & Audit'
      : me?.role === 'COMMUNITY_MANAGER'
      ? 'Roadmap & Sponsors'
      : 'Operations Admin';

  const mobileNavLinks = [
    { href: me ? '/dashboard' : '/', label: me ? 'Dashboard' : 'Overview', icon: LayoutDashboard },
    { href: '/challenges', label: 'Play Duels', icon: Swords },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/leaderboards', label: 'Ladders & Rank', icon: BarChart3 },
    { href: '/games', label: 'Explore Games', icon: Gamepad2 },
    { href: '/community/polls', label: 'Feature Polls', icon: Vote },
    { href: '/cashier', label: 'Wallet & Cashier', icon: Wallet },
    { href: '/support', label: 'Support Desk', icon: Headphones },
    ...(isStaff
      ? [
          {
            href: staffTargetHref,
            label: staffLabel,
            icon: Shield,
          },
        ]
      : []),
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(me ? [{ href: '/?view=landing', label: 'Landing Page', icon: Globe }] : []),
  ];

  // Hide top navigation header on standalone document / auth pages
  if (
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return null;
  }

  // =========================================================================
  // 1. DEDICATED PUBLIC MARKETING HEADER FOR LANDING PAGE (Clean, Uncongested)
  // =========================================================================
  if (pathname === '/') {
    return (
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border h-16 w-full">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          {/* Left: Clean Brand Logo */}
          <Link href={me ? '/dashboard' : '/'} className="flex items-center group flex-shrink-0">
            <Image
              src="/images/logo.png"
              alt="playverzus.xyz"
              width={140}
              height={32}
              className="h-8 w-auto object-contain transition group-hover:opacity-90"
              priority
            />
          </Link>

          {/* Center: Clean, Airy Desktop Navigation (Only 3 essential links with generous spacing) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#arenas"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Arenas
            </a>
            <Link
              href="/tournaments"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tournaments
            </Link>
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
          </nav>

          {/* Right: Clean Action Buttons + Mobile Hamburger */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {!me ? (
              <>
                <Link href="/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9 px-4 rounded-xl"
                  >
                    Play Free
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <Button size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 h-9 px-3.5 rounded-xl">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link
                  href={`/profile/${me.username || 'me'}`}
                  className="flex items-center p-0.5 hover:ring-2 hover:ring-primary/50 rounded-full transition flex-shrink-0"
                  title="View Player Profile"
                >
                  <Avatar size="sm" className="w-8 h-8 text-xs bg-primary text-primary-foreground">
                    <AvatarFallback>{avatarLetter}</AvatarFallback>
                  </Avatar>
                </Link>
              </>
            )}

            {/* Mobile Menu Button (Hamburger / X Toggle) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden h-9 w-9 rounded-xl bg-card hover:bg-muted border border-border text-foreground flex items-center justify-center transition-colors flex-shrink-0"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-primary" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TOP-OPENING MOBILE DROPDOWN (LaserScan Style: Opens Directly on Top) */}
        {/* =================================================================== */}
        {mounted &&
          mobileMenuOpen &&
          createPortal(
            <div className="fixed inset-0 top-16 z-[9999] md:hidden flex flex-col">
              {/* Tap-outside Backdrop */}
              <div
                className="fixed inset-0 top-16 bg-black/75 backdrop-blur-sm transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />

              {/* Menu Container: Slides down from the top header */}
              <div className="relative z-10 w-full bg-zinc-950/98 border-b border-border shadow-2xl p-4 sm:p-6 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                {/* Crossmint Trust Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-emerald-400">
                  <CrossmintLogo className="w-3.5 h-3.5" />
                  <span>Powered by Crossmint Escrow</span>
                </div>

                {/* Navigation Links Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  <a
                    href="#arenas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Gamepad2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Supported Arenas</span>
                  </a>

                  <Link
                    href="/tournaments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Tournaments</span>
                  </Link>

                  <a
                    href="#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>How It Works</span>
                  </a>

                  <Link
                    href="/leaderboards"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span>Ladders & Rank</span>
                  </Link>

                  <a
                    href="#why-playverzus"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Why Playverzus</span>
                  </a>

                  <a
                    href="#squads"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Squads & Clans</span>
                  </a>

                  <Link
                    href="/community/polls"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Vote className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <span>Feature Polls</span>
                  </Link>

                  <Link
                    href="/support"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-sm font-semibold text-foreground transition"
                  >
                    <Headphones className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <span>Support Desk</span>
                  </Link>
                </div>

                {/* Action Controls */}
                <div className="pt-4 border-t border-border flex flex-col gap-2.5">
                  {!me ? (
                    <>
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground shadow-sm h-10 rounded-xl">
                          Start Competing Free
                        </Button>
                      </Link>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-wider h-10 rounded-xl">
                          Sign In to Account
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full font-bold text-xs uppercase tracking-wider gap-2 h-10 rounded-xl">
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Enter Arena Dashboard</span>
                        </Button>
                      </Link>
                      <div className="flex gap-2">
                        <Link
                          href={`/profile/${me.username || 'me'}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-wider gap-2 h-10 rounded-xl">
                            <Avatar size="sm" className="w-5 h-5 text-[10px] bg-primary text-primary-foreground">
                              <AvatarFallback>{avatarLetter}</AvatarFallback>
                            </Avatar>
                            <span>Profile (@{me.username})</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleSignOut();
                          }}
                          className="font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 gap-2 h-10 px-4 rounded-xl"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
      </header>
    );
  }

  // =========================================================================
  // 2. AUTHENTICATED & IN-APP TOP HEADER (Spacious, Minimal, Decongested)
  // =========================================================================
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 w-full">
      {/* Left: Mobile Toggle + Logo mark (< lg) OR Page Heading (lg+) */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {/* Mobile menu toggle (Only visible on < lg) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="lg:hidden h-9 w-9 rounded-xl bg-card hover:bg-muted border border-border text-foreground flex items-center justify-center transition-colors flex-shrink-0"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 text-primary" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Mobile Brand Mark (< lg) */}
        <Link
          href={me ? '/dashboard' : '/'}
          className="lg:hidden flex items-center justify-center flex-shrink-0"
        >
          <Image
            src="/images/logo-mark.png"
            alt="playverzus.xyz"
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
          />
        </Link>

        {/* Clean Page Title (Desktop lg+) */}
        <div className="hidden lg:flex items-center min-w-0">
          <h1 className="text-sm font-bold text-foreground tracking-tight truncate">
            {pageContext.title}
          </h1>
        </div>
      </div>

      {/* Center: Slim Omnisearch (Desktop xl+) */}
      <div className="hidden xl:flex items-center flex-1 max-w-xs mx-4 relative min-w-0">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search duels, tournaments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-10 py-1.5 bg-muted/40 hover:bg-muted/70 focus:bg-muted border border-border focus:border-primary rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition"
        />
        <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-background border border-border text-[9px] font-mono text-muted-foreground pointer-events-none">
          ⌘K
        </span>
      </div>

      {/* Right: Decongested Clean Wallet + Bell + Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Sleek Wallet Balance Pill */}
        <Link
          href="/cashier"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border hover:border-primary/50 transition shadow-sm"
          title="Open Cashier & Wallet Management"
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              walletMode === 'REAL' ? 'bg-emerald-400' : 'bg-purple-400'
            }`}
          />
          {walletMode === 'REAL' ? (
            <span className="text-emerald-400 font-mono font-bold text-xs">{formatUSDC(cashAmount)}</span>
          ) : (
            <span className="text-purple-300 font-mono font-bold text-xs">
              {formatPoints(pointsAmount)} <span className="text-[10px] text-muted-foreground font-sans">PTS</span>
            </span>
          )}
        </Link>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Clean Gamer Profile Avatar */}
        <Link
          href={`/profile/${me?.username || 'me'}`}
          className="flex items-center p-0.5 hover:ring-2 hover:ring-primary/50 rounded-full transition group flex-shrink-0"
          title="View Player Profile"
        >
          <Avatar size="sm" className="w-8 h-8 text-xs bg-primary text-primary-foreground">
            <AvatarFallback>{avatarLetter}</AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* =================================================================== */}
      {/* TOP-OPENING IN-APP DROPDOWN (LaserScan Style: Opens Directly on Top) */}
      {/* =================================================================== */}
      {mounted &&
        mobileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 top-16 z-[9999] lg:hidden flex flex-col">
            {/* Tap-outside Backdrop */}
            <div
              className="fixed inset-0 top-16 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Dropdown Container */}
            <div className="relative z-10 w-full bg-zinc-950/98 border-b border-border shadow-2xl p-4 sm:p-6 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
              {/* Play Mode & Deposit Controls */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Play Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleWalletMode}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider transition ${
                      walletMode === 'REAL'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${walletMode === 'REAL' ? 'bg-emerald-400' : 'bg-purple-400'}`} />
                    <span>{walletMode === 'REAL' ? 'REAL CASH' : 'DEMO PTS'}</span>
                    <ArrowLeftRight className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                </div>

                <Link href="/cashier?tab=deposit" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="sm" className="w-full text-xs font-bold gap-1.5 shadow-sm h-10 rounded-xl">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deposit / Top Up Balance</span>
                  </Button>
                </Link>
              </div>

              {/* Active Arena Switcher Link */}
              <div className="mb-4">
                <Link
                  href="/games"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full p-2.5 rounded-xl bg-muted/60 border border-border hover:border-primary/50 flex items-center justify-between text-left transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GamePoster
                      game={activeCatalogGame}
                      aspect="mini"
                      className="w-6 h-8 rounded flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">
                        Active Arena
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {activeCatalogGame.displayName}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary flex items-center gap-1 flex-shrink-0">
                    Browse ▾
                  </span>
                </Link>
              </div>

              {/* Navigation Links Grid */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider px-2 py-1 block">
                  Arena Navigation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {mobileNavLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
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
              </div>

              {/* Sign Out Button */}
              {me && (
                <div className="pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full justify-start text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-10 rounded-xl"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Arena</span>
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
