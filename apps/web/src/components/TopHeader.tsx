'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  X,
  Search,
  Plus,
  Coins,
  ArrowLeftRight,
  ChevronDown,
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
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { EloBadge } from './EloBadge';
import { CountryFlag } from './CountryFlag';
import { NotificationBell } from './NotificationBell';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import { formatEUR, formatPoints } from '../lib/currency';
import { useWalletModeStore } from '../lib/walletModeStore';
import { OFFICIAL_GAMES, getGameById } from '../lib/gamesCatalog';
import { GamePoster } from './GamePoster';
import { GameDropdown } from './GameDropdown';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetHeader, SheetTitle } from './ui/sheet';
import { Avatar, AvatarFallback } from './ui/avatar';

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
  role?: 'PLAYER' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN';
}

function getPageContext(pathname: string): { title: string; subtitle?: string } {
  if (pathname === '/') return { title: 'Arena Overview', subtitle: 'Live Matchmaking' };
  if (pathname.startsWith('/challenges')) return { title: 'Duels & Wagers', subtitle: '1v1 Matchmaking' };
  if (pathname.startsWith('/tournaments')) return { title: 'Tournaments', subtitle: 'Championship Brackets' };
  if (pathname.startsWith('/leaderboards')) return { title: 'Ladders & Rank', subtitle: 'Competitive Elo' };
  if (pathname.startsWith('/games')) return { title: 'Game Catalog', subtitle: 'Supported Esports' };
  if (pathname.startsWith('/matches/new')) return { title: 'Create Duel', subtitle: 'Instant 1v1 Challenge' };
  if (pathname.startsWith('/matches/')) return { title: 'Match Arena', subtitle: 'Live Contest' };
  if (pathname.startsWith('/dashboard')) return { title: 'Wallet & Cashier', subtitle: 'Ledger Balances' };
  if (pathname.startsWith('/settings')) return { title: 'Settings', subtitle: 'Preferences' };
  if (pathname.startsWith('/admin')) return { title: 'Operations Console', subtitle: 'Administration' };
  if (pathname.startsWith('/profile')) return { title: 'Player Profile', subtitle: 'Career Dossier' };
  return { title: 'Playverzus.xyz', subtitle: 'Esports Platform' };
}

export function TopHeader() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { activeGame } = useGameStore();
  const { mode: walletMode, toggleMode: toggleWalletMode } = useWalletModeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false);

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
  const eloRating = me?.rating ?? 1000;
  const avatarLetter = me?.username ? me.username.slice(0, 1).toUpperCase() : 'U';

  const isStaff = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN' || me?.role === 'REVIEWER';

  const mobileNavLinks = [
    { href: me ? '/dashboard' : '/', label: me ? 'Dashboard' : 'Overview', icon: LayoutDashboard },
    { href: '/challenges', label: 'Play Duels', icon: Swords },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/leaderboards', label: 'Ladders & Rank', icon: BarChart3 },
    { href: '/games', label: 'Explore Games', icon: Gamepad2 },
    { href: '/cashier', label: 'Wallet & Cashier', icon: Wallet },
    ...(isStaff
      ? [
          {
            href: me?.role === 'REVIEWER' ? '/admin/review' : '/admin',
            label: me?.role === 'REVIEWER' ? 'Audit Queue' : 'Operations Admin',
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

  // Dedicated Public Marketing Header for Landing Page
  if (pathname === '/') {
    return (
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 max-w-full">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href={me ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <Image
              src="/images/logo.png"
              alt="playverzus.xyz"
              width={160}
              height={36}
              className="h-7 sm:h-9 w-auto object-contain transition group-hover:opacity-90"
              priority
            />
          </Link>
        </div>

        {/* Center: Desktop Public Marketing Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold tracking-wider uppercase">
          <a
            href="#arenas"
            className="text-muted-foreground hover:text-foreground transition-colors hover:text-primary"
          >
            Supported Arenas
          </a>
          <a
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors hover:text-primary"
          >
            How It Works
          </a>
          <Link
            href="/tournaments"
            className="text-muted-foreground hover:text-foreground transition-colors hover:text-primary"
          >
            Tournaments
          </Link>
          <Link
            href="/leaderboards"
            className="text-muted-foreground hover:text-foreground transition-colors hover:text-primary"
          >
            Ladders & Rank
          </Link>
          <a
            href="#fair-play"
            className="text-muted-foreground hover:text-foreground transition-colors hover:text-primary"
          >
            Fair Play
          </a>
        </nav>

        {/* Right: Auth / Arena Entry CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!me ? (
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-wider">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="font-bold text-[11px] sm:text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 h-8 sm:h-9 px-3 sm:px-4"
                >
                  Play For Free
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Link
                href={`/profile/${me.username || 'me'}`}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-lg transition"
                title="View Player Profile"
              >
                <Avatar size="sm" className="w-7 h-7 text-xs bg-primary text-primary-foreground">
                  <AvatarFallback>{avatarLetter}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-xs font-bold text-foreground">
                  @{me.username}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive gap-1"
                title="Log Out of Arena"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}

          {/* Mobile Navigation Drawer Trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-muted-foreground hover:text-foreground"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Landing Sheet Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="left">
          <SheetHeader>
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt="playverzus.xyz"
                width={140}
                height={32}
                className="h-7 w-auto object-contain"
              />
            </div>
          </SheetHeader>
          <div className="flex flex-col space-y-2 mt-6">
            <a
              href="#arenas"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              Supported Arenas
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              How It Works
            </a>
            <Link
              href="/tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              Tournaments
            </Link>
            <Link
              href="/leaderboards"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              Ladders & Rank
            </Link>
            <a
              href="#fair-play"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              Fair Play
            </a>
            <div className="pt-4 border-t border-border flex flex-col gap-2">
              {!me ? (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-wider">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full font-bold text-xs uppercase tracking-wider">
                      Play For Free
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full font-bold text-xs uppercase tracking-wider gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Enter Arena Dashboard</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Sheet>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 max-w-full">
      {/* 1. Left Zone: Mobile Drawer Trigger + Active Arena Pill + Context Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden text-muted-foreground hover:text-foreground w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Mobile Brand Mark */}
        <Link
          href={me ? '/dashboard' : '/'}
          className="lg:hidden flex items-center justify-center flex-shrink-0"
        >
          <Image
            src="/images/logo-mark.png"
            alt="playverzus.xyz"
            width={28}
            height={28}
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
          />
        </Link>

        {/* Active Game Dropdown Switcher (Anchored dropdown - NO sticky popup modals) */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setGameDropdownOpen((prev) => !prev)}
            aria-expanded={gameDropdownOpen}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border hover:border-primary/50 transition group text-left min-w-0"
            title="Switch Active Game Arena"
          >
            <GamePoster
              game={activeCatalogGame}
              aspect="mini"
              className="w-5 h-7 rounded flex-shrink-0"
            />
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider leading-none flex items-center gap-1">
                Arena <ChevronDown className={`w-3 h-3 text-primary transition-transform duration-200 ${gameDropdownOpen ? 'rotate-180' : ''}`} />
              </span>
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px] leading-tight">
                {activeCatalogGame.displayName}
              </span>
            </div>
          </button>

          {/* Anchored Dropdown Menu */}
          <GameDropdown
            open={gameDropdownOpen}
            onClose={() => setGameDropdownOpen(false)}
          />
        </div>

        <span className="hidden sm:inline text-muted-foreground/40 text-xs">/</span>

        {/* Current Page Context */}
        <div className="hidden md:flex flex-col text-left min-w-0">
          <span className="text-xs font-bold text-foreground tracking-tight leading-tight truncate">
            {pageContext.title}
          </span>
          {pageContext.subtitle && (
            <span className="text-[10px] text-muted-foreground font-mono leading-none">
              {pageContext.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* 2. Center Zone: Clean Omnisearch */}
      <div className="hidden xl:flex items-center flex-1 max-w-sm mx-4 relative min-w-0">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search duels, tournaments, players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-12 py-1.5 bg-muted/50 hover:bg-muted focus:bg-muted border border-border focus:border-primary rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition"
        />
        <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-background border border-border text-[9px] font-mono text-muted-foreground pointer-events-none">
          ⌘K
        </span>
      </div>

      {/* 3. Right Zone: Wallet Capsule + Notification Bell + Gamer Profile Chip */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Wallet Balance Capsule */}
        <div className="flex items-center bg-card border border-border rounded-lg p-0.5 sm:p-1 gap-1 shadow-sm">
          {/* Real vs Demo Toggle */}
          <button
            type="button"
            onClick={toggleWalletMode}
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition ${
              walletMode === 'REAL'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25'
            }`}
            title="Click to toggle between Real Cash (€ EUR) and Free Demo Play (PTS)"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                walletMode === 'REAL' ? 'bg-emerald-400' : 'bg-purple-400'
              }`}
            />
            <span>{walletMode === 'REAL' ? 'REAL' : 'DEMO'}</span>
            <ArrowLeftRight className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </button>

          {/* Active Balance Display */}
          <Link
            href="/cashier"
            className="px-2 py-1 font-mono font-bold text-xs hover:text-primary transition flex items-center gap-1.5"
            title="Open Cashier & Balance Management"
          >
            {/* Mobile indicator dot */}
            <span
              className={`sm:hidden w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                walletMode === 'REAL' ? 'bg-emerald-400' : 'bg-purple-400'
              }`}
            />
            {walletMode === 'REAL' ? (
              <span className="text-emerald-400 font-semibold">{formatEUR(cashAmount)}</span>
            ) : (
              <span className="text-purple-300 font-semibold">
                {formatPoints(pointsAmount)} <span className="text-[9px] text-muted-foreground font-sans">PTS</span>
              </span>
            )}
          </Link>

          {/* Top-up Button */}
          <Link href="/cashier?tab=deposit" className="hidden sm:inline-flex">
            <Button
              size="icon"
              variant="default"
              className="w-6 h-6 rounded-md"
              title="Quick Deposit / Claim Demo Points"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Notification Bell with Popover Dropdown */}
        <NotificationBell />

        {/* Gamer Profile Chip */}
        <Link
          href={`/profile/${me?.username || 'me'}`}
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-lg transition group flex-shrink-0"
          title="View Player Profile"
        >
          <div className="relative flex-shrink-0">
            <Avatar size="sm" className="w-7 h-7 text-xs bg-primary text-primary-foreground">
              <AvatarFallback>{avatarLetter}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
              <EloBadge elo={eloRating} size="sm" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              <CountryFlag
                code={me?.country_code || me?.region}
                fallbackSeed={me?.username || me?.id || 'me'}
                size="xs"
              />
              <span className="truncate max-w-[90px]">
                {me?.username ? `@${me.username}` : 'Gamer'}
              </span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {eloRating} <span className="text-[8px] uppercase">ELO</span>
            </span>
          </div>
        </Link>

        {/* Quick Desktop Sign Out Action */}
        {me && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition hidden sm:flex"
            title="Sign Out of Arena"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="left">
        <SheetHeader>
          <div className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="playverzus.xyz"
              width={140}
              height={32}
              className="h-7 w-auto object-contain"
            />
          </div>
        </SheetHeader>

        {/* Mobile Wallet Mode & Deposit Controls */}
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
            <Button variant="default" size="sm" className="w-full text-xs font-bold gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit / Top Up Balance</span>
            </Button>
          </Link>
        </div>

        {/* Current Arena Quick Switcher in Drawer */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setGameDropdownOpen(true);
            }}
            className="w-full p-2.5 rounded-xl bg-muted border border-border flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <GamePoster
                game={activeCatalogGame}
                aspect="mini"
                className="w-5 h-7 rounded flex-shrink-0"
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
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              Switch ▾
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-1">
          {mobileNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {me && (
            <div className="pt-4 border-t border-border mt-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full justify-start text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </header>
  );
}
