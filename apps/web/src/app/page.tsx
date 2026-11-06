'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Rocket,
  LogOut,
  LayoutDashboard,
  Gamepad2,
  Zap,
  Coins,
  Trophy,
  Swords,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Shield,
  Scan,
  Vote,
  Lock,
  ExternalLink,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { EloBadge } from '../components/EloBadge';
import { CountryFlag } from '../components/CountryFlag';
import { GamePoster } from '../components/GamePoster';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import { OFFICIAL_GAMES, type CatalogGame } from '../lib/gamesCatalog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ParallaxStoryScenes } from '../components/ParallaxStoryScenes';
import { SquadShowcase } from '../components/SquadShowcase';
import { CrossmintLogo } from '../components/CrossmintLogo';

interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  rating?: number;
  region?: string;
  country_code?: string;
}

interface HomeTournament {
  id: string;
  name: string;
  format: string;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  game_profiles?: { display_name: string; id?: string };
  region?: string;
  country_code?: string;
  enrolled_count?: number;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeGame, setActiveGame } = useGameStore();
  const [selectedArenaTab, setSelectedArenaTab] = useState<'all' | 'pc' | 'console' | 'mobile'>('all');

  const viewParam = searchParams.get('view');
  const wantsLanding = viewParam === 'landing' || viewParam === 'public';

  // Check authentication
  const { data: userProfile, isLoading: loadingProfile } = useQuery<UserProfile | null>({
    queryKey: ['home-user-profile'],
    queryFn: async () => {
      try {
        return await apiClient<UserProfile>('/profile/me');
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  const isAuthenticated = !!userProfile?.id;

  // When a user is logged in, automatically forward to dashboard unless they explicitly requested the public landing page (?view=landing)
  useEffect(() => {
    if (!loadingProfile && isAuthenticated && !wantsLanding) {
      router.replace('/dashboard');
    }
  }, [loadingProfile, isAuthenticated, wantsLanding, router]);

  // Query real tournaments from API
  const { data: tournaments = [], isLoading: loadingTournaments } = useQuery<HomeTournament[]>({
    queryKey: ['home-tournaments'],
    queryFn: async () => {
      try {
        const res = await apiClient<HomeTournament[]>('/tournaments');
        return res || [];
      } catch {
        return [];
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

  // If authenticated and redirecting to dashboard, show clean loading state
  if (isAuthenticated && !wantsLanding) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Entering Arena Dashboard...
        </p>
      </div>
    );
  }

  const filteredGames = OFFICIAL_GAMES.filter((g) => {
    if (selectedArenaTab === 'pc') return g.platform === 'PC';
    if (selectedArenaTab === 'console') return g.platform === 'CONSOLE';
    if (selectedArenaTab === 'mobile') return g.platform === 'MOBILE';
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-16 sm:gap-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0 pb-20 pt-4 sm:pt-8">
      {/* 1. Authenticated Welcome Bar (if logged in and explicitly browsing landing) */}
      {isAuthenticated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-sm">
              {userProfile?.username?.slice(0, 1)?.toUpperCase() ?? 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CountryFlag
                  code={userProfile.country_code || userProfile.region}
                  fallbackSeed={userProfile.username || userProfile.id}
                  size="sm"
                />
                <span className="font-bold text-sm text-foreground">
                  Logged in as @{userProfile.username}
                </span>
                <EloBadge elo={userProfile.rating ?? 1000} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                Public Arena Overview. Return to your dashboard or challenge opponents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/dashboard">
              <Button size="sm" className="font-bold text-xs gap-1.5 h-9">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </Button>
            </Link>
            <Link href="/challenges">
              <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5 h-9">
                <Swords className="w-3.5 h-3.5 text-primary" />
                <span>Play Duels</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="font-bold text-xs gap-1.5 h-9 text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION (FACEIT AESTHETIC, HIGH ENERGY ESPORTS) */}
      <section className="text-center flex flex-col items-center gap-6 sm:gap-8 pt-4 sm:pt-8">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase shadow-sm">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>COMPETITIVE ESPORTS INFRASTRUCTURE</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-foreground leading-[1.05] max-w-4xl">
          The Global Infrastructure for <br />
          <span className="text-primary block mt-1 sm:mt-2">
            Skill-Based Competition
          </span>
        </h1>

        {/* Sub-headline: Clear & Gamer-Focused */}
        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl leading-relaxed font-medium">
          <strong className="text-foreground font-black">Play. Verify. Get Paid.</strong> It’s that simple. Compete across PC, Console, and Mobile with automated match verification and instant USDC settlements.
        </p>

        {/* Trust Bar with Visual Crossmint Logo */}
        <div className="inline-flex items-center gap-2 sm:gap-5 px-4 sm:px-6 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-bold tracking-wider flex-wrap justify-center shadow-md">
          <span className="flex items-center gap-2 text-emerald-400">
            <CrossmintLogo className="w-4 h-4" />
            <span>Powered by Crossmint</span>
          </span>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="flex items-center gap-1.5 text-foreground">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span>USDC Settlements</span>
          </span>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <Scan className="w-3.5 h-3.5" />
            <span>Visual Verification Engine™</span>
          </span>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto pt-2">
          {!isAuthenticated ? (
            <>
              <Link href="/signup?redirect=/challenges" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Rocket className="w-4 h-4" />
                  <span>Start Competing Free</span>
                </Button>
              </Link>
              <Link href="#arenas" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2 bg-card hover:bg-zinc-800 border-border">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <span>Explore Arenas</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/challenges" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Swords className="w-4 h-4" />
                  <span>Start Competing Free</span>
                </Button>
              </Link>
              <Link href="/tournaments" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2 bg-card hover:bg-zinc-800 border-border">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span>View Live Tournaments</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Live Proof Metrics Strip (FACEIT Live Stats Vibe) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full pt-8 sm:pt-12 border-t border-border">
          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">Crossmint</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Smart Escrow Vault</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-primary">&lt; 2 Seconds</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Visual Verification™</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">USDC Standard</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Instant Liquidity</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-400">Zero Referees</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Universal Ingest</span>
          </Card>
        </div>
      </section>

      {/* 3. CURATED ARENAS / GAME MATRIX (DIRECTLY BELOW HERO - FACEIT CORE LAYOUT) */}
      <section id="arenas" className="space-y-6 sm:space-y-8 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
              <Gamepad2 className="w-4 h-4" />
              <span>CURATED COMPETITIVE ROSTER</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Select Your Arena
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Battle in curated competitive arenas with automated round tracking and instant score verification.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 self-start sm:self-auto overflow-x-auto">
            {(['all', 'pc', 'console', 'mobile'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedArenaTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                  selectedArenaTab === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'all' ? 'All Arenas' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Game Poster Grid (Rich FACEIT Game Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredGames.map((game) => (
            <Card
              key={game.id}
              className="bg-card border border-border hover:border-zinc-700 transition-all rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group"
            >
              <div>
                {/* Poster Artwork Header */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-950">
                  <GamePoster
                    game={{
                      displayName: game.displayName,
                      shortName: game.shortName,
                      posterUrl: game.posterUrl,
                      bannerUrl: game.bannerUrl,
                      icon: game.icon,
                      platform: game.platform,
                    }}
                    aspect="banner"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

                  {/* Top-Right Platform Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="font-mono text-[10px] bg-zinc-900/90 border-zinc-700 backdrop-blur-md">
                      {game.platform}
                    </Badge>
                  </div>

                  {/* Bottom-Left Title Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors drop-shadow-md">
                        {game.displayName}
                      </h3>
                      <span className="font-mono text-[10px] text-zinc-400 block font-semibold">
                        {game.shortName} · Universal Match Ingest
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {game.tagline}
                  </p>

                  {/* Match Features Pill Strip */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-muted-foreground">
                      <span className="block text-[9px] uppercase font-bold text-zinc-500">Mode</span>
                      <span className="text-foreground font-semibold">1v1 & Squads</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-muted-foreground">
                      <span className="block text-[9px] uppercase font-bold text-zinc-500">Verification</span>
                      <span className="text-emerald-400 font-semibold">Visual Engine™</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 sm:p-5 pt-0">
                <Link
                  href={isAuthenticated ? `/matches/new?gameId=${game.id}` : `/signup?redirect=/matches/new?gameId=${game.id}`}
                  className="w-full block"
                >
                  <Button variant="secondary" size="sm" className="w-full font-bold text-xs uppercase tracking-wider gap-1.5 h-9 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Swords className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground" />
                    <span>Enter {game.shortName} Arena</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. "HOW IT WORKS" (4-STEP AUTOMATED LIFECYCLE - ALL 4 STEPS VISIBLE AT A GLANCE) */}
      <ParallaxStoryScenes />

      {/* 5. COMPETITIVE INTEGRITY & ESCROW (THE TECH MOAT - FACEIT ANTI-CHEAT EQUIVALENT) */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>TRUST BY DESIGN // ZERO REFEREES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground">
            Built for the Future of Esports
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Most platforms are limited by publisher APIs and manual referee disputes. We are not.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm hover:border-zinc-700 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-foreground">Escrow Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Funds are secured in <strong className="text-foreground">Crossmint-managed vaults</strong> until the match is verified. Zero default risk.
              </p>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider pt-2 block border-t border-border/60">
              ● Guaranteed Prize Pools
            </span>
          </Card>

          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm hover:border-zinc-700 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400 flex items-center justify-center font-bold">
                <Scan className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-base text-foreground">Visual Intelligence™</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our proprietary AI-driven verification layer analyzes official game UIs in real-time. Zero human error. Zero score tampering.
              </p>
            </div>
            <span className="font-mono text-[10px] text-purple-400 uppercase font-bold tracking-wider pt-2 block border-t border-border/60">
              ● Instant Ingest (&lt; 2s)
            </span>
          </Card>

          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm hover:border-zinc-700 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-primary flex items-center justify-center font-bold">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground">Instant USDC Liquidity</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Global stablecoin standard settlements on Polygon, Solana, and Base. Win in USDC with zero banking delays or cross-border fees.
              </p>
            </div>
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider pt-2 block border-t border-border/60">
              ● Multi-Chain Payouts
            </span>
          </Card>

          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm hover:border-zinc-700 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-yellow-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-bold text-base text-foreground">Platform Agnostic</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Independent from restrictive developer APIs. Operates universally across PC, Console, and Mobile with native game launches.
              </p>
            </div>
            <span className="font-mono text-[10px] text-yellow-400 uppercase font-bold tracking-wider pt-2 block border-t border-border/60">
              ● Universal Crossplay
            </span>
          </Card>
        </div>
      </section>

      {/* 6. TOURNAMENTS SHOWCASE SECTION (CHAMPIONSHIP KNOCKOUT BRACKETS) */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4" />
              <span>CHAMPIONSHIP BRACKETS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Live Knockout Tournaments
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Single elimination brackets with guaranteed prize pools and automated bracket advancement.
            </p>
          </div>

          <Link href="/tournaments">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 h-9 border-border bg-card hover:bg-zinc-800">
              <span>View All Tournaments</span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </Button>
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {[
              { name: 'CS2 Weekend Cup', size: 16, entry: 10, prize: 150, game: 'Counter-Strike 2' },
              { name: 'Apex Predator Clash', size: 32, entry: 25, prize: 750, game: 'Apex Legends' },
              { name: 'Warzone Squad Showdown', size: 16, entry: 15, prize: 225, game: 'Call of Duty: Warzone' },
            ].map((mock, mIdx) => (
              <Card key={mIdx} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {mock.game}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    ${mock.prize}.00 USDC
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">{mock.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {mock.size} Competitor Knockout Bracket
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Entry Fee</span>
                    <span className="font-bold text-foreground">${mock.entry}.00 USDC</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Format</span>
                    <span className="font-bold text-primary">Single Elim</span>
                  </div>
                </div>
                <Link href={isAuthenticated ? '/tournaments' : '/signup?redirect=/tournaments'} className="w-full block">
                  <Button size="sm" className="w-full font-bold text-xs uppercase tracking-wider h-9">
                    Register For Tournament
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {tournaments.slice(0, 3).map((t) => (
              <Card key={t.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {t.game_profiles?.display_name || 'Esports'}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    ${t.prize_pool}.00 USDC
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">{t.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {t.size} Competitor Bracket · {t.format}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Entry Fee</span>
                    <span className="font-bold text-foreground">${t.entry_fee}.00 USDC</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Enrolled</span>
                    <span className="font-bold text-primary">{t.enrolled_count ?? 0} / {t.size}</span>
                  </div>
                </div>
                <Link href={`/tournaments/${t.id}`} className="w-full block">
                  <Button size="sm" className="w-full font-bold text-xs uppercase tracking-wider h-9">
                    Register For Tournament
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 7. COMPETITIVE SQUADS & CLAN ROSTERS SHOWCASE (FACEIT CLANS VIBE) */}
      <SquadShowcase />

      {/* 8. COMMUNITY ROADMAP POLLS SECTION (PLAYER GOVERNANCE) */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
              <Vote className="w-4 h-4" />
              <span>PLAYER GOVERNANCE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Community Feature Roadmap
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              You decide the next game arenas, prize formats, and platform features. 1 Verified Player = 1 Vote.
            </p>
          </div>

          <Link href="/community/polls">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 h-9 border-border bg-card hover:bg-zinc-800">
              <span>View All Active Polls</span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: 'Marvel Rivals 6v6 Arena', votes: 412, status: 'SHIPPED // LIVE', tag: 'OFFICIAL ARENA' },
            { title: 'Add 4v4 Clan Squad Brackets', votes: 328, status: 'IN PROGRESS', tag: 'TOURNAMENT' },
            { title: 'Instant Telegram & Discord Match Alerts', votes: 219, status: 'HIGH PRIORITY', tag: 'FEATURE' },
          ].map((poll, pIdx) => (
            <Card key={pIdx} className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm hover:border-zinc-700 transition">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-primary">
                  {poll.tag}
                </Badge>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {poll.votes} Votes
                </span>
              </div>
              <h3 className="font-bold text-base text-foreground">{poll.title}</h3>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  {poll.status}
                </span>
                <Link href="/community/polls">
                  <span className="text-xs font-bold text-primary hover:underline font-mono">
                    Vote Now &rarr;
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 9. BOTTOM CONVERSION CTA BANNER */}
      <section className="p-8 sm:p-14 rounded-3xl bg-zinc-950 border border-zinc-800 text-center flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-3 max-w-xl">
          <span className="font-mono text-xs uppercase font-bold text-primary tracking-widest block">
            READY TO ENTER THE ARENA?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
            Start Competing Free
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Create your account in 30 seconds. Connect your favorite game gamertag and enter free 1v1 duels or real USDC championship brackets.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="font-black text-xs uppercase tracking-wider px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Rocket className="w-4 h-4 mr-2" />
              <span>Start Competing Free</span>
            </Button>
          </Link>
          <Link href="/tournaments">
            <Button variant="outline" size="lg" className="font-bold text-xs uppercase tracking-wider px-6 h-12 border-zinc-700 bg-zinc-900 text-foreground hover:bg-zinc-800">
              <Trophy className="w-4 h-4 mr-2 text-primary" />
              <span>View Live Tournaments</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 10. INSTITUTIONAL & LEGAL FOOTER */}
      <footer className="pt-12 border-t border-border space-y-8 text-xs text-muted-foreground font-mono">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo-mark.png"
                alt="playverzus.xyz"
                width={28}
                height={28}
                className="w-6 h-6 object-contain"
              />
              <span className="font-black text-sm text-foreground">Playverzus.xyz</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The Global Infrastructure for Skill-Based Competition.
            </p>
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed pt-1">
              Playverzus Technologies Inc. <br />
              Registered Entity · Skill Gaming Infrastructure <br />
              Global Operations: Nairobi · Delaware · London
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Infrastructure</span>
            <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
              <CrossmintLogo className="w-3.5 h-3.5" />
              <span>Powered by Crossmint</span>
            </p>
            <span className="text-[10px] text-muted-foreground block">
              Enterprise Custody & Escrow
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Settlement & Security</span>
            <p className="text-xs text-foreground font-semibold">
              USDC (Polygon · Solana · Base)
            </p>
            <span className="text-[10px] text-muted-foreground block">
              Audited Smart Contracts
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Legal & Compliance</span>
            <div className="flex flex-col gap-1 text-xs">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/responsible-gaming" className="hover:text-foreground transition-colors">
                Responsible Gaming
              </Link>
              <Link href="/responsible-gaming#compliance" className="hover:text-foreground transition-colors">
                Compliance & Licensing
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <span>© 2026 Playverzus Technologies Inc. All rights reserved. Operating as a skill-based competition infrastructure.</span>
          <div className="flex items-center gap-4">
            <Link href="/support" className="hover:text-foreground transition-colors">Support Desk</Link>
            <Link href="/community/polls" className="hover:text-foreground transition-colors">Roadmap Polls</Link>
            <Link href="/admin/treasury" className="text-primary hover:underline">Block Explorer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Loading Playverzus Arena...
          </p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
