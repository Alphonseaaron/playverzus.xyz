'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Swords,
  BarChart3,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Clock,
  ArrowRight,
  Wallet,
  Sparkles,
  TrendingUp,
  Gamepad2,
  Zap,
  Flame,
  Users,
} from 'lucide-react';
import { EloBadge } from '../../components/EloBadge';
import { CountryFlag, resolveCountryInfo } from '../../components/CountryFlag';
import { GamePoster } from '../../components/GamePoster';
import { AuthGuard } from '../../components/AuthGuard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { formatEUR, formatPoints } from '../../lib/currency';
import { getGameById, findCatalogGame, OFFICIAL_GAMES } from '../../lib/gamesCatalog';
import { notifyUser } from '../../lib/notifications';
import { toUserFriendlyWalletError } from '../../lib/walletErrors';
import { FirstTimeOnboardingModal } from '../../components/onboarding/FirstTimeOnboardingModal';
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingChecklistCard';
import { LinkedGameAccountsCard } from '../../components/dashboard/LinkedGameAccountsCard';
import { GameSelectionModal } from '../../components/GameSelectionModal';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';

interface MatchItem {
  id: string;
  profile_id?: string;
  game_profiles?: { display_name: string; game_type: string };
  format: string;
  status: string;
  entry_fee: number;
  prize_pool: number;
  created_at: string;
  room_code?: string;
  winner_id?: string | null;
}

interface WalletData {
  balance: number;
  locked: number;
  currency: string;
  cashEur?: number;
  lockedCashEur?: number;
}

interface TransactionItem {
  id: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface UserProfileData {
  id: string;
  username: string;
  display_name?: string;
  rating?: number;
  region?: string;
  country_code?: string;
  trust_score?: number;
  role?: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  const queryClient = useQueryClient();
  const { activeGame, setActiveGame } = useGameStore();
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number>(5);
  const [arenaModalOpen, setArenaModalOpen] = useState(false);

  // Note: Uninvited auto-popup modal disabled in favor of non-intrusive GamerQuestHub drawer
  // Users can still launch the full onboarding wizard intentionally via checklist or settings button

  const catalogGame = getGameById(activeGame?.id);

  // 1. User Profile Data
  const { data: userProfile } = useQuery<UserProfileData | null>({
    queryKey: ['dashboard-profile'],
    queryFn: () => apiClient<UserProfileData>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  // 2. Wallet Balance
  const { data: balanceData, isLoading: loadingBalance, refetch: refetchBalance } = useQuery<WalletData>({
    queryKey: ['wallet-balance'],
    queryFn: () => apiClient<WalletData>('/wallet/balance'),
    staleTime: 10000,
  });

  // 3. Match History
  const { data: matches, isLoading: loadingMatches } = useQuery<MatchItem[]>({
    queryKey: ['my-matches'],
    queryFn: () => apiClient<MatchItem[]>('/matches/mine'),
    staleTime: 15000,
  });

  // 4. Ledger Transaction History
  const { data: historyData, refetch: refetchHistory } = useQuery<TransactionItem[]>({
    queryKey: ['wallet-history'],
    queryFn: () => apiClient<TransactionItem[]>('/wallet/history?limit=10'),
    staleTime: 15000,
  });

  // 5. Live 5-Player Blitz Sit & Go Pools
  const { data: blitzPools } = useQuery<any[]>({
    queryKey: ['dashboard-blitz-pools'],
    queryFn: async () => {
      try {
        const res = await apiClient<any[]>('/tournaments/blitz-pools');
        return res || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  // 6. Open Challenges in Arena
  const { data: openChallenges } = useQuery<any[]>({
    queryKey: ['dashboard-open-challenges'],
    queryFn: async () => {
      try {
        const res = await apiClient<any[]>('/matches/open');
        return res || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const cashEur = balanceData?.cashEur ?? 0.0;
  const lockedCashEur = balanceData?.lockedCashEur ?? 0.0;
  const points = balanceData?.balance ?? 0;
  const lockedPoints = balanceData?.locked ?? 0;

  const elo = userProfile?.rating ?? 1000;
  const username = userProfile?.username || 'Competitor';
  const countryInfo = resolveCountryInfo(userProfile?.country_code || userProfile?.region, username);
  const trustScore = userProfile?.trust_score ?? 980;

  // Match calculations
  const settledMatches = (matches || []).filter((m) => m.status === 'SETTLED' || m.status === 'COMPLETED');
  const totalMatches = settledMatches.length;
  const wins = userProfile?.id
    ? settledMatches.filter((m) => m.winner_id === userProfile.id).length
    : 0;
  const losses = Math.max(0, totalMatches - wins);
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';
  const recentForm = settledMatches.slice(0, 5).map((m) => (m.winner_id === userProfile?.id ? 'W' : 'L'));

  const handleClaimFaucet = async () => {
    setFaucetLoading(true);
    try {
      await apiClient('/wallet/claim-demo', { method: 'POST' });
      notifyUser('Demo Funds Claimed! +1,000 PTS', {
        body: 'Demo play points added to your account for free practice duels.',
        sound: 'score',
        type: 'success',
      });
      await refetchBalance();
      await refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-wallet-balance'] });
    } catch (err: unknown) {
      const msg = toUserFriendlyWalletError(err);
      notifyUser('Faucet Unavailable', { body: msg, type: 'error' });
    } finally {
      setFaucetLoading(false);
    }
  };

  const role = userProfile?.role;
  const isStaff = Boolean(role && role !== 'PLAYER');

  // Immediately forward admin and staff roles directly to their operational admin consoles
  useEffect(() => {
    if (isStaff && viewParam !== 'player') {
      const dest =
        role === 'REVIEWER'
          ? '/admin/review'
          : role === 'SUPPORT'
          ? '/admin/support'
          : role === 'TOURNAMENT_ADMIN'
          ? '/admin/seasons'
          : role === 'FINANCE_AUDITOR'
          ? '/admin/treasury'
          : role === 'COMMUNITY_MANAGER'
          ? '/admin/polls'
          : '/admin';
      router.replace(dest);
    }
  }, [isStaff, role, viewParam, router]);

  const openDeposit = () => {
    router.push('/cashier?tab=deposit');
  };

  const openWithdraw = () => {
    router.push('/cashier?tab=withdraw');
  };

  const STAKE_OPTIONS = [
    { label: '0 PTS', value: 0, isCash: false },
    { label: '$2.50', value: 2.5, isCash: true },
    { label: '$5.00', value: 5, isCash: true },
    { label: '$10.00', value: 10, isCash: true },
    { label: '$25.00', value: 25, isCash: true },
  ];

  const FEATURED_ARENA_KEYS = ['cs2', 'eafc', 'eafcm', 'rl', 'val', 'apex', 'marvelrivals'];
  const activeQuickIds = Array.from(new Set([catalogGame.id.toLowerCase(), ...FEATURED_ARENA_KEYS])).slice(0, 5);

  const activeBlitzPool =
    blitzPools?.find((p: any) => p.profile_id === catalogGame.id || p.game_profiles?.id === catalogGame.id) ||
    blitzPools?.[0];
  const blitzEntrants = activeBlitzPool?.enrolled_count ?? 0;
  const blitzFee = activeBlitzPool?.entry_fee ?? 10;
  const blitzFirstPlace = Math.round(blitzFee * 5 * 0.7);
  const blitzSecondPlace = Math.round(blitzFee * 5 * 0.2);

  if (isStaff && viewParam !== 'player') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Redirecting to Admin Operations Console...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full min-w-0 pb-16">
      {/* 1. First-Time Onboarding Setup Modal */}
      <FirstTimeOnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        username={username}
        initialCountry={countryInfo.code}
        onComplete={() => {
          refetchBalance();
          refetchHistory();
          queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
        }}
      />

      {/* 2. THE PLAY-FIRST ARCADE HERO CENTERPIECE */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Arena Banner Backdrop */}
        <div className="relative h-28 sm:h-36 bg-zinc-950 border-b border-border w-full overflow-hidden">
          {catalogGame.bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${catalogGame.bannerUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

          {/* Quick 1-Click Arena Switcher Bar */}
          <div className="absolute top-3 left-3 sm:left-6 right-3 sm:right-6 flex items-center justify-between gap-2 z-10 flex-wrap">
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border/80 px-2.5 py-1 rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                Active Arena:
              </span>
              <span className="text-xs font-bold text-foreground">
                {catalogGame.displayName}
              </span>
              <Badge variant="copper" className="text-[9px] px-1 py-0 ml-1">
                {catalogGame.platform}
              </Badge>
            </div>

            <div className="hidden sm:flex items-center gap-1 bg-background/80 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-sm">
              {activeQuickIds.map((id) => {
                const matchedGame = OFFICIAL_GAMES.find((g) => g.id.toLowerCase() === id.toLowerCase());
                if (!matchedGame) return null;
                const isCurrent = catalogGame.id.toLowerCase() === matchedGame.id.toLowerCase();
                return (
                  <button
                    key={matchedGame.id}
                    type="button"
                    onClick={() => {
                      setActiveGame(matchedGame);
                      notifyUser('Active Arena Switched', {
                        body: `Now competing in ${matchedGame.displayName}`,
                        sound: 'connect',
                      });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <span>{matchedGame.shortName || matchedGame.displayName}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setArenaModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 transition flex items-center gap-1 cursor-pointer"
                title="Browse and select from all 21 official esports arenas"
              >
                <span>+ All (21)</span>
              </button>
            </div>
          </div>
        </div>

        {/* The 2 Primary Action Cards */}
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Action Card 1: ⚡ Quick 1v1 Duel */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg hover:border-primary/70 transition-all p-5 flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="default" className="text-[10px] font-mono uppercase tracking-wider font-bold gap-1 px-2 py-0.5 shadow-sm">
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Quick 1v1 Duel</span>
                  </Badge>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Instant Adjudication
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <span>Host or Find 1v1 Match</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direct head-to-head match in {catalogGame.displayName}. Automated optical score verification.
                  </p>
                </div>

                {/* Fast Stake Selector Pills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider">
                    Select Duel Stake:
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {STAKE_OPTIONS.map((opt) => {
                      const isSelected = selectedStake === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setSelectedStake(opt.value)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border text-center flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                              : 'bg-muted/50 hover:bg-muted border-border text-foreground'
                          }`}
                        >
                          <span className="leading-none">{opt.label}</span>
                          <span className={`text-[9px] mt-0.5 leading-none ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {opt.isCash ? 'USDC' : 'FREE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Button & Sublink */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/matches/new?profileId=${catalogGame.id}&entryFee=${selectedStake}`}
                  className="w-full block"
                >
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full font-black text-sm h-11 gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      {selectedStake === 0
                        ? 'Find Opponent (Free Glory)'
                        : `Find Opponent ($${selectedStake.toFixed(2)} USDC)`}
                    </span>
                  </Button>
                </Link>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>Zero exchange rate fees · Instant settlement</span>
                  <Link
                    href="/challenges"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Browse Open Duels ({openChallenges?.length ?? 0})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Card 2: 🏆 5-Player Blitz Cup */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-lg hover:border-amber-500/60 transition-all p-5 flex flex-col justify-between space-y-5 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="copper" className="text-[10px] font-mono uppercase tracking-wider font-bold gap-1 px-2 py-0.5 shadow-sm">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>5-Player Sit & Go</span>
                  </Badge>
                  <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                    Continuous Pools
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <span>5-Player Blitz Cup</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mini tournament in {catalogGame.displayName}. Automatically begins when 5 competitors register!
                  </p>
                </div>

                {/* Queue Status & Entrants Dots */}
                <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground font-semibold">
                      Live Queue Status:
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {blitzEntrants}/5 Competitors Ready
                    </span>
                  </div>

                  {/* 5 Dots Indicator */}
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const isFilled = idx < blitzEntrants;
                      return (
                        <div
                          key={idx}
                          className={`flex-1 h-2 rounded-full transition-all ${
                            isFilled
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                              : 'bg-muted border border-border'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Payout Structure */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground font-mono">
                    <span>Entry: <strong className="text-foreground">${blitzFee} USDC</strong></span>
                    <span>1st: <strong className="text-emerald-400">${blitzFirstPlace}</strong> · 2nd: <strong className="text-foreground">${blitzSecondPlace}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Button & Sublink */}
              <div className="space-y-2 pt-2">
                <Link
                  href={activeBlitzPool ? `/tournaments/${activeBlitzPool.id}` : '/tournaments'}
                  className="w-full block"
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full font-black text-sm h-11 gap-2 border border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500 text-foreground shadow-sm hover:scale-[1.01] transition-transform"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Enter Blitz Cup (${blitzFee} USDC)</span>
                  </Button>
                </Link>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>90% Prize Pool Payout (70/20)</span>
                  <Link
                    href="/tournaments"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View All Tournaments</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Compact Player & Wallet Escrow Strip */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Player Identity */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12 rounded-xl border-2 border-card bg-primary text-primary-foreground text-lg font-black shadow-md">
                  <AvatarFallback className="rounded-xl bg-zinc-900 text-primary border border-zinc-800">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <EloBadge elo={elo} size="sm" />
                </div>
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <CountryFlag code={countryInfo.code} size="xs" />
                  <span className="font-bold text-sm text-foreground truncate">@{username}</span>
                  <Badge variant="copper" className="text-[9px] px-1.5 py-0 font-mono">
                    VERIFIED
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="text-primary font-bold">{elo} ELO</span>
                  <span>·</span>
                  <span>Level {Math.min(10, Math.max(1, Math.floor(elo / 150)))}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">{winRate}% Win Rate</span>
                </div>
              </div>
            </div>

            {/* Fast Cashier & Points Strip */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
              {/* Cash Box */}
              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-card border border-border shadow-sm">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Cash
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {loadingBalance ? '...' : formatEUR(cashEur)}
                  </div>
                </div>
                <div className="flex items-center gap-1 pl-2 border-l border-border">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openDeposit}
                    className="h-7 text-xs px-2.5 font-bold shadow-sm"
                  >
                    <ArrowDownLeft className="w-3 h-3 mr-1" />
                    Deposit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openWithdraw}
                    className="h-7 text-xs px-2.5 font-bold"
                  >
                    Withdraw
                  </Button>
                </div>
              </div>

              {/* Points Box */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-card border border-border shadow-sm">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                    Practice
                  </div>
                  <div className="text-base font-bold font-mono text-primary">
                    {loadingBalance ? '...' : formatPoints(points, false)} <span className="text-[10px] text-muted-foreground font-sans">PTS</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={faucetLoading}
                  onClick={handleClaimFaucet}
                  className="h-7 text-xs px-2.5 font-bold gap-1 ml-1"
                >
                  <Gift className="w-3 h-3 text-primary" />
                  <span>{faucetLoading ? '...' : '+1,000'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Onboarding Milestone Progress Card (Collapsible) */}
      <OnboardingChecklistCard
        onOpenTour={() => setOnboardingOpen(true)}
        matchesCount={totalMatches}
        balancePoints={points}
      />

      {/* 2. BODY CONTENT: Clean Full-Width Shadcn Tabs */}
      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="h-10 bg-muted/70 p-1 border border-border">
          <TabsTrigger value="matches" className="text-xs font-semibold gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            <span>Match History</span>
            <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">
              {matches?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs font-semibold gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Career Performance</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs font-semibold gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Ledger Transactions</span>
            <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">
              {historyData?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="handles" className="text-xs font-semibold gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>In-Game Handles</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Match History */}
        <TabsContent value="matches">
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Recent Head-to-Head Duels & Tournament Matches</CardTitle>
              <CardDescription className="text-xs">
                Scores verified automatically by background instant game sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMatches ? (
                <p className="py-12 text-center text-xs text-muted-foreground font-mono animate-pulse">
                  Loading match records...
                </p>
              ) : matches && matches.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center">Result</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Match ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Prize</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.map((m) => {
                        const isWin = m.winner_id === userProfile?.id;
                        const gameTitle = m.game_profiles?.display_name || catalogGame.displayName;
                        const catalogItem = findCatalogGame(m.profile_id) || findCatalogGame(gameTitle) || catalogGame;

                        return (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="text-center">
                              <Badge
                                variant={m.status === 'SETTLED' ? (isWin ? 'success' : 'destructive') : 'secondary'}
                                className="font-mono text-xs px-2"
                              >
                                {m.status === 'SETTLED' ? (isWin ? 'WIN' : 'LOSS') : 'LIVE'}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-3">
                                <GamePoster
                                  game={catalogItem}
                                  aspect="mini"
                                  className="w-5 h-7 rounded flex-shrink-0"
                                />
                                <span className="font-bold text-xs text-foreground">
                                  {gameTitle}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-xs text-muted-foreground">
                              #{m.id.slice(0, 8)}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {new Date(m.created_at).toLocaleDateString()}
                            </TableCell>

                            <TableCell className="text-xs font-bold font-mono text-foreground">
                              {m.prize_pool > 0 ? formatEUR(m.prize_pool) : 'Free Glory'}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {m.status}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <Link href={`/matches/${m.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                  <span>Room</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground space-y-3 bg-muted/20 rounded-xl border border-dashed border-border">
                  <Swords className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <h4 className="text-sm font-bold text-foreground">No Matches Logged Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Queue for your first competitive match to start building your verified match history!
                  </p>
                  <div className="pt-2">
                    <Link href={`/matches/new?profileId=${catalogGame.id}`}>
                      <Button variant="default" size="sm" className="font-bold">
                        Host First Duel
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Career Stats & Form */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-border bg-card space-y-3">
              <span className="text-xs uppercase font-bold text-muted-foreground font-mono">
                Win Rate
              </span>
              <div className="text-4xl font-bold font-mono text-emerald-400">
                {winRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {wins} victories in {totalMatches} settled competitive duels.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card space-y-3">
              <span className="text-xs uppercase font-bold text-muted-foreground font-mono">
                Head-to-Head Record
              </span>
              <div className="text-4xl font-bold font-mono text-foreground">
                {wins}W - {losses}L
              </div>
              <p className="text-xs text-muted-foreground">
                All records verified via real-time automated scoring.
              </p>
            </Card>

            <Card className="p-6 border border-border bg-card space-y-3">
              <span className="text-xs uppercase font-bold text-muted-foreground font-mono">
                Recent 5 Form
              </span>
              <div className="flex items-center gap-2 pt-1">
                {recentForm.length > 0 ? (
                  recentForm.map((outcome, idx) => (
                    <span
                      key={idx}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono border ${
                        outcome === 'W'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-destructive/20 text-destructive border-destructive/40'
                      }`}
                    >
                      {outcome}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">
                    No matches settled yet
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Most recent match outcomes.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Ledger Transactions */}
        <TabsContent value="transactions">
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Ledger Transactions & Audit Trail</CardTitle>
              <CardDescription className="text-xs">
                Complete cryptographic settlement history of deposits, match entries, and prize payouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyData && historyData.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono text-xs">
                      {historyData.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/30">
                            <TableCell className="font-sans font-medium text-foreground">
                              {tx.reason}
                            </TableCell>
                            <TableCell className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-foreground'}`}>
                              {isPositive ? `+${tx.amount}` : tx.amount} PTS
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {tx.balanceAfter} PTS
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-xs">
                  No ledger activity logged yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: In-Game Handles */}
        <TabsContent value="handles">
          <LinkedGameAccountsCard />
        </TabsContent>
      </Tabs>

      {/* Global In-Place Game Switcher Modal */}
      <GameSelectionModal
        open={arenaModalOpen}
        onClose={() => setArenaModalOpen(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
