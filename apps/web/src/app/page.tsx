'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Rocket,
  LogIn,
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
} from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { EloBadge } from '../components/EloBadge';
import { GamePoster } from '../components/GamePoster';
import { GameDropdown } from '../components/GameDropdown';
import { apiClient } from '../lib/api';
import { formatEUR, formatPoints } from '../lib/currency';
import { OFFICIAL_GAMES, getGameById, type CatalogGame } from '../lib/gamesCatalog';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import { SEEDED_TOURNAMENTS } from '../lib/seededTournaments';
import { SEEDED_CHAMPIONS } from '../lib/seededLeaderboards';

interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  rating?: number;
  region?: string;
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
  enrolled_count?: number;
}

interface HomeLeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username?: string;
  countryCode?: string;
}

export default function HomePage() {
  const { activeGame, setActiveGame } = useGameStore();
  const [selectedArenaTab, setSelectedArenaTab] = useState<'all' | 'pc' | 'console'>('all');

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

  // Query real tournaments from API — fall back to seeded data if API fails or returns empty
  const { data: tournaments, isLoading: loadingTournaments } = useQuery<HomeTournament[]>({
    queryKey: ['home-tournaments'],
    queryFn: async () => {
      try {
        const res = await apiClient<HomeTournament[]>('/tournaments');
        if (res && res.length > 0) return res;
        return SEEDED_TOURNAMENTS as HomeTournament[];
      } catch {
        return SEEDED_TOURNAMENTS as HomeTournament[];
      }
    },
    staleTime: 30000,
  });

  // Query real leaderboard champions from API — fall back to seeded data if API fails or returns empty
  const { data: champions, isLoading: loadingChampions } = useQuery<HomeLeaderboardEntry[]>({
    queryKey: ['home-champions'],
    queryFn: async () => {
      try {
        const res = await apiClient<HomeLeaderboardEntry[]>('/leaderboard/HEAD_TO_HEAD');
        if (res && res.length > 0) return res;
        return SEEDED_CHAMPIONS as HomeLeaderboardEntry[];
      } catch {
        return SEEDED_CHAMPIONS as HomeLeaderboardEntry[];
      }
    },
    staleTime: 30000,
  });

  const isAuthenticated = !!userProfile?.id;
  const currentCatalogGame = getGameById(activeGame?.id);

  const filteredGames = OFFICIAL_GAMES.filter((g) => {
    if (selectedArenaTab === 'pc') return g.platform === 'PC';
    if (selectedArenaTab === 'console') return g.platform === 'CONSOLE';
    return true;
  });

  return (
    <div className="flex flex-col gap-16 sm:gap-24 max-w-7xl mx-auto min-w-0 pb-16">
      {/* 1. Authenticated Welcome Bar (if logged in) */}
      {isAuthenticated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-md">
              {userProfile?.username?.slice(0, 1)?.toUpperCase() ?? 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  Welcome back, @{userProfile.username}
                </span>
                <EloBadge elo={userProfile.rating ?? 1000} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                Your competitive profile is active. Ready to challenge rivals or enter tournaments?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/challenges">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                <span>Play 1v1 Duels</span>
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Browse Cups</span>
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Cashier Ledger</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 text-center flex flex-col items-center gap-6 sm:gap-8 overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[200px] bg-amber-500/10 rounded-full filter blur-[90px] pointer-events-none" />

        {/* Brand Logo Display */}
        <div className="flex items-center justify-center">
          <Image
            src="/images/logo.png"
            alt="playverzus.xyz"
            width={320}
            height={64}
            className="h-10 sm:h-14 w-auto object-contain drop-shadow-[0_4px_24px_rgba(200,98,40,0.2)]"
            priority
          />
        </div>

        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>VERIFIED COMPETITIVE ESPORTS PLATFORM</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-foreground leading-[1.05] max-w-4xl">
          Play With The Best. <br />
          <span className="text-primary bg-gradient-to-r from-primary via-orange-400 to-amber-400 bg-clip-text text-transparent">
            Win Real Stakes.
          </span>
        </h1>

        {/* Subhead Description */}
        <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          The premier platform for automated 1v1 duels, community cups, and verified Elo rankings. Background score verification guarantees fair play. Zero manual screenshots. Instant cash payouts.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto pt-2">
          {!isAuthenticated ? (
            <>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 shadow-xl shadow-primary/20">
                  <Rocket className="w-4 h-4" />
                  <span>Play For Free</span>
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/challenges" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-black text-sm uppercase tracking-wider px-8 h-12 gap-2 shadow-xl shadow-primary/20">
                <Swords className="w-4 h-4" />
                <span>Enter Matchmaking Queue</span>
              </Button>
            </Link>
          )}

          <Link href="/tournaments" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span>Explore Tournaments</span>
            </Button>
          </Link>
        </div>

        {/* Live Proof Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full pt-8 sm:pt-12 border-t border-border/60">
          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">€150,000+</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Prize Cash Won</span>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-primary">100%</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Automated Score Sync</span>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-foreground">Level 1–10</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Competitive Elo Rating</span>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center">
            <span className="font-mono text-xl sm:text-2xl font-black text-purple-400">24/7</span>
            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Instant Duels & Payouts</span>
          </div>
        </div>
      </section>

      {/* 3. SUPPORTED COMPETITIVE GAME ARENAS */}
      <section id="arenas" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <Gamepad2 className="w-4 h-4" />
              <span>Supported Competitive Arenas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
              Select Your Game
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Battle in officially calibrated arenas with zero configuration and automated round tracking.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border self-start sm:self-auto">
            {(['all', 'pc', 'console'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedArenaTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  selectedArenaTab === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'all' ? 'All Platforms' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Game Arenas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredGames.map((game) => {
            const isActive = activeGame?.id === game.id;

            return (
              <Card
                key={game.id}
                className={`group relative overflow-hidden border transition-all duration-300 flex flex-col justify-between hover:shadow-xl ${
                  isActive
                    ? 'border-primary ring-1 ring-primary/40 bg-card'
                    : 'border-border hover:border-primary/50 bg-card/80'
                }`}
              >
                {/* Poster Artwork Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${game.posterUrl || game.bannerUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-md font-mono text-[9px]">
                      {game.platform}
                    </Badge>
                    {isActive && (
                      <Badge variant="copper" className="text-[9px]">
                        ACTIVE ARENA
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">
                      {game.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {game.tagline}
                    </p>
                  </div>

                  {/* Format & Quick Enter */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      1v1 Duels & Cups
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveGame(game);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      {isActive ? 'Selected ✓' : 'Select Arena'}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. THE 3-STEP COMPETITIVE EXPERIENCE */}
      <section id="how-it-works" className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10 sm:mb-14">
          <Badge variant="copper" className="font-mono text-[10px]">
            HOW IT WORKS
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
            From Match Kickoff to Payout in 3 Steps
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            No messy dispute tickets, no screenshots, and no waiting hours for admin intervention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-border flex flex-col gap-4 relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black font-mono text-sm flex items-center justify-center">
              01
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                Connect & Calibrate
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your game arena and connect your screen feed in one click. Our calibration maps the in-game scoreboard automatically.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-border flex flex-col gap-4 relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black font-mono text-sm flex items-center justify-center">
              02
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                Stake & Compete
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Queue instant 1v1 duels or enter scheduled tournament cups. Entry stakes are held safely in bank-grade escrow until match conclusion.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-border flex flex-col gap-4 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black font-mono text-sm flex items-center justify-center">
              03
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                Automated Instant Settlement
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As soon as the victory screen hits, the score is verified and winnings are credited immediately to your wallet. Zero delay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY PLAYERS CHOOSE VERZUS (4 PILLARS) */}
      <section id="fair-play" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="secondary" className="font-mono text-[10px]">
            COMPETITIVE INTEGRITY
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
            Engineered For Serious Gamers
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Built from the ground up to eliminate toxicity, smurfing, and payment fraud.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="p-5 sm:p-6 bg-card border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Zero Manual Proofs</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Background optical calibration detects round wins and final scores automatically. No screenshot uploads or dispute delays.
            </p>
          </Card>

          <Card className="p-5 sm:p-6 bg-card border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Dual-Ledger Wallet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Play for free using daily Practice Points or compete for real EUR cash via Paysafe instant banking in over 50 countries.
            </p>
          </Card>

          <Card className="p-5 sm:p-6 bg-card border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Level 1–10 Elo System</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calibrated Elo matchmaking ensures you only face opponents of equal rating. Fair, balanced, and competitive matches every time.
            </p>
          </Card>

          <Card className="p-5 sm:p-6 bg-card border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Secured Escrow Vault</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Match entry stakes are held safely in escrow before game start, guaranteeing that winners always receive 100% of their prize pool.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. FEATURED TOURNAMENT CUPS SHOWCASE */}
      <section id="tournaments" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>Championship Brackets</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
              Featured Tournament Cups
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Compete in single elimination brackets for cash prize pools and seasonal trophies.
            </p>
          </div>

          <Link href="/tournaments">
            <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5">
              <span>View All Cups</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {loadingTournaments ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 bg-card border border-border space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        ) : tournaments && tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tournaments.slice(0, 3).map((t) => (
              <Card key={t.id} className="p-5 sm:p-6 bg-card border border-border flex flex-col justify-between gap-4 hover:border-primary/50 transition">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="copper" className="font-mono text-[10px]">
                      {t.status || 'Active Cup'}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3 text-primary" /> {t.enrolled_count ?? 0}/{t.size} Players
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      {t.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{t.game_profiles?.display_name || 'Esports Arena'}</span>
                      <span>·</span>
                      <span>{t.format}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Prize Pool</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {t.prize_pool > 0 ? formatEUR(t.prize_pool) : 'Free Entry'}
                    </span>
                  </div>

                  <Link href={`/tournaments/${t.id}`}>
                    <Button variant="default" size="sm" className="font-bold text-xs">
                      View Bracket
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="Championship Cups Launching Soon"
            description="New tournament brackets with cash prize pools are announced regularly. In the meantime, challenge players in instant 1v1 duels or create your own custom tournament bracket."
            actionLabel="Play 1v1 Duels"
            actionHref="/challenges"
          />
        )}
      </section>

      {/* 7. HALL OF CHAMPIONS / LEADERBOARD SPOTLIGHT */}
      <section id="leaderboards" className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Verified Rankings</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Hall of Champions
            </h3>
            <p className="text-xs text-muted-foreground">
              Top competitors in this month&rsquo;s competitive prize pool.
            </p>
          </div>

          <Link href="/leaderboards">
            <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5">
              <span>Full Leaderboards</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {loadingChampions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-12 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-8 rounded-md ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : champions && champions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {champions.slice(0, 4).map((champ, index) => {
              const winRate = champ.gamesPlayed > 0
                ? `${Math.round((champ.wins / champ.gamesPlayed) * 100)}%`
                : '0%';
              return (
                <div
                  key={champ.userId}
                  className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black font-mono text-xs flex items-center justify-center flex-shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-foreground block truncate">
                        @{champ.username || 'Competitor'}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {champ.gamesPlayed} Matches · {winRate} Win
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-primary block">{champ.rating} Elo</span>
                    <span className="text-[10px] font-mono text-emerald-400">{champ.wins}W - {champ.losses}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="Season 1 Ladder Initializing"
            description="Be the first competitor to log ranked head-to-head match victories and claim the #1 spot in the global Hall of Champions."
            actionLabel="Queue Ranked Match"
            actionHref="/challenges"
          />
        )}
      </section>

      {/* 8. HIGH-CONVERTING BOTTOM CALL TO ACTION */}
      <section className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-card via-card to-primary/10 border border-border text-center flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-3 max-w-2xl">
          <Badge variant="copper" className="font-mono text-[10px]">
            JOIN THOUSANDS OF COMPETITORS
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground leading-tight">
            Ready to Prove Your Skill?
          </h2>
          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
            Create your player profile in under 60 seconds. Claim 1,000 practice points instantly or deposit cash via Paysafe to enter high-stakes duels.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {!isAuthenticated ? (
            <Link href="/signup">
              <Button size="lg" className="font-black text-sm uppercase tracking-wider px-8 h-12 shadow-xl shadow-primary/20 gap-2">
                <Rocket className="w-4 h-4" />
                <span>Create Free Player Account</span>
              </Button>
            </Link>
          ) : (
            <Link href="/matches/new">
              <Button size="lg" className="font-black text-sm uppercase tracking-wider px-8 h-12 shadow-xl shadow-primary/20 gap-2">
                <Swords className="w-4 h-4" />
                <span>Host Open 1v1 Duel</span>
              </Button>
            </Link>
          )}

          <Link href="/games">
            <Button variant="secondary" size="lg" className="font-bold text-sm uppercase tracking-wider px-6 h-12 gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span>Browse All Games</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 9. GLOBAL FOOTER */}
      <footer className="border-t border-border pt-10 text-xs text-muted-foreground space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-3">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo.png"
                alt="playverzus.xyz"
                width={160}
                height={32}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-[11px] leading-relaxed">
              The next-generation competitive gaming platform with automated score verification and instant payouts.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Competition</h4>
            <ul className="space-y-1 text-[11px]">
              <li><Link href="/challenges" className="hover:text-foreground">1v1 Duels</Link></li>
              <li><Link href="/tournaments" className="hover:text-foreground">Championship Cups</Link></li>
              <li><Link href="/leaderboards" className="hover:text-foreground">Ladders & Elo</Link></li>
              <li><Link href="/games" className="hover:text-foreground">Supported Games</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Banking & FairPlay</h4>
            <ul className="space-y-1 text-[11px]">
              <li><Link href="/dashboard" className="hover:text-foreground">Cashier Ledger</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Player Privacy Policy</Link></li>
              <li><a href="mailto:support@playverzus.xyz" className="text-primary hover:underline font-mono">support@playverzus.xyz</a></li>
              <li><span className="text-muted-foreground/80">Paysafe Banking Hub</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Platform Security</h4>
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
              <ShieldCheck className="w-4 h-4" />
              <span>Paysafe Certified Escrow</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              All financial transactions are encrypted with 256-bit SSL and processed via licensed payment institutions.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo-mark.png"
              alt="playverzus.xyz"
              width={18}
              height={18}
              className="h-4 w-auto object-contain"
            />
            <span>© 2026 PlayVerzus Arena. All rights reserved.</span>
          </div>
          <span className="font-mono text-[10px]">Premier competitive esports infrastructure</span>
        </div>
      </footer>
    </div>
  );
}
