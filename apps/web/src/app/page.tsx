'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Rocket,
  LogIn,
  LogOut,
  LayoutDashboard,
  Globe,
  Gamepad2,
  Zap,
  Coins,
  Trophy,
  Swords,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  TrendingUp,
  ChevronRight,
  Plus,
  Play,
  Award,
  Users,
  Shield,
  Clock,
  Sparkles,
  Check,
  Vote,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { EloBadge } from '../components/EloBadge';
import { CountryFlag } from '../components/CountryFlag';
import { GamePoster } from '../components/GamePoster';
import { GameDropdown } from '../components/GameDropdown';
import { apiClient } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import { formatUSDC } from '../lib/currency';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import { ParallaxStoryScenes } from '../components/ParallaxStoryScenes';
import { SquadShowcase } from '../components/SquadShowcase';

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
  const [selectedArenaTab, setSelectedArenaTab] = useState<'all' | 'pc' | 'console'>('all');

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

      {/* 2. HERO SECTION (Solid Modern Shadcn Styling - Zero Gradients) */}
      <section className="text-center flex flex-col items-center gap-6 sm:gap-8 pt-4 sm:pt-8">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase shadow-sm">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>VERIFIED COMPETITIVE ESPORTS // CROSSMINT SMART ESCROW</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-foreground leading-[1.05] max-w-4xl">
          Play With The Best. <br />
          <span className="text-primary block mt-1 sm:mt-2">
            Win Real USDC Prizes.
          </span>
        </h1>

        {/* Subhead Description */}
        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          The premier platform for automated 1v1 duels, clan squad battles, and verified tournaments. Automated computer-vision score verification eliminates manual disputes. Instant USDC payouts with regulated Crossmint smart custody.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto pt-2">
          {!isAuthenticated ? (
            <>
              <Link href="/signup?redirect=/challenges" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Rocket className="w-4 h-4" />
                  <span>Play For Free</span>
                </Button>
              </Link>
              <Link href="/login?redirect=/dashboard" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2 bg-card hover:bg-zinc-800 border-border">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/challenges" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Swords className="w-4 h-4" />
                <span>Enter Matchmaking Queue</span>
              </Button>
            </Link>
          )}

          <Link href="/tournaments" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2 border-border bg-card hover:bg-zinc-800">
              <Trophy className="w-4 h-4 text-primary" />
              <span>Explore Tournaments</span>
            </Button>
          </Link>
        </div>

        {/* Live Proof Metrics Strip (Pure Solid Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full pt-8 sm:pt-12 border-t border-border">
          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">$150,000+</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Prize Cash Won</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-primary">&lt; 8 Seconds</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Automated OCR Sync</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">100% On-Chain</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Crossmint Escrow</span>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl bg-card border-border shadow-sm flex flex-col items-center text-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-400">Zero Referees</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Direct Screen Vision</span>
          </Card>
        </div>
      </section>

      {/* 3. PARALLAX STORYLINE: 4-STAGE MATCH LIFECYCLE WITH CHARACTERS */}
      <ParallaxStoryScenes />

      {/* 4. COMPETITIVE SQUADS & CLAN ROSTERS SHOWCASE */}
      <SquadShowcase />

      {/* 5. SUPPORTED COMPETITIVE GAME ARENAS (Zero Gradients, Solid Cards) */}
      <section id="arenas" className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
              <Gamepad2 className="w-4 h-4" />
              <span>OFFICIAL COMPETITIVE ROSTER</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Select Your Arena
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Battle in officially calibrated titles with automated round tracking and instant score verification.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 self-start sm:self-auto">
            {(['all', 'pc', 'console'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedArenaTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
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

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredGames.map((game) => (
            <Card
              key={game.id}
              className="bg-card border border-border hover:border-zinc-700 transition-all rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group"
            >
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{game.icon}</span>
                    <div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {game.displayName}
                      </h3>
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        {game.shortName} · {game.platform}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] border-border">
                    {game.platform}
                  </Badge>
                </div>

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
                    <span className="block text-[9px] uppercase font-bold text-zinc-500">OCR Arbiter</span>
                    <span className="text-emerald-400 font-semibold">Active & Live</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-0">
                <Link
                  href={isAuthenticated ? `/matches/new?gameId=${game.id}` : `/signup?redirect=/matches/new?gameId=${game.id}`}
                  className="w-full block"
                >
                  <Button variant="secondary" size="sm" className="w-full font-bold text-xs uppercase tracking-wider gap-1.5 h-9">
                    <Swords className="w-3.5 h-3.5 text-primary" />
                    <span>Enter {game.shortName} Arena</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. TOURNAMENTS SHOWCASE SECTION */}
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
              <Card key={mIdx} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
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
              <Card key={t.id} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
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

      {/* 7. COMMUNITY ROADMAP POLLS SECTION */}
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
            { title: 'Add Marvel Rivals 6v6 Arena', votes: 412, status: 'IN PROGRESS', tag: 'NEW ARENA' },
            { title: 'Add 4v4 Clan Squad Brackets', votes: 328, status: 'HIGH PRIORITY', tag: 'TOURNAMENT' },
            { title: 'Instant Telegram Match Notifications', votes: 219, status: 'UNDER REVIEW', tag: 'FEATURE' },
          ].map((poll, pIdx) => (
            <Card key={pIdx} className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-sm">
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

      {/* 8. SECURITY & FAIR PLAY ARCHITECTURE (Pure Solid Cards) */}
      <section className="space-y-6 sm:space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>ENTERPRISE-GRADE FAIR PLAY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
            Built For Integrity
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Zero reliance on manual human referees or unverified third-party claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Crossmint Smart Custody</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Match entries and tournament prize pools are secured in regulated smart custody vaults. Neither player can tamper with funds once locked.
            </p>
          </Card>

          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Sub-Second OCR Verification</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Victory and defeat frames are parsed with OCR neural networks. Cryptographic frame hashing blocks duplicate submissions.
            </p>
          </Card>

          <Card className="bg-card border border-border p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Gamertag Fraud Prevention</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scores are only accepted if the in-game scoreboard gamertag matches your verified PlayVerzus identity. Impersonation is strictly blocked.
            </p>
          </Card>
        </div>
      </section>

      {/* 9. BOTTOM CONVERSION CTA */}
      <section className="p-8 sm:p-14 rounded-3xl bg-zinc-950 border border-zinc-800 text-center flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-3 max-w-xl">
          <span className="font-mono text-xs uppercase font-bold text-primary tracking-widest block">
            READY TO COMPETE?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
            Claim Your First Win Today
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Create your account in 30 seconds. Connect your favorite game gamertag and enter free 1v1 duels or real USDC championship brackets.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="font-black text-xs uppercase tracking-wider px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Rocket className="w-4 h-4 mr-2" />
              <span>Create Free Account</span>
            </Button>
          </Link>
          <Link href="/challenges">
            <Button variant="outline" size="lg" className="font-bold text-xs uppercase tracking-wider px-6 h-12 border-zinc-700 bg-zinc-900 text-foreground hover:bg-zinc-800">
              <Swords className="w-4 h-4 mr-2 text-primary" />
              <span>Browse 1v1 Duels</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 10. SITE FOOTER */}
      <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo-mark.png"
            alt="playverzus.xyz"
            width={24}
            height={24}
            className="w-5 h-5 object-contain"
          />
          <span>&copy; {new Date().getFullYear()} Playverzus.xyz. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/support" className="hover:text-foreground transition-colors">
            Support Desk
          </Link>
          <Link href="/community/polls" className="hover:text-foreground transition-colors">
            Roadmap
          </Link>
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
