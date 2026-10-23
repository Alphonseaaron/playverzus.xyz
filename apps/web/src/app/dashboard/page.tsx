'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { EloBadge } from '../../components/EloBadge';
import { CountryFlag, resolveCountryInfo } from '../../components/CountryFlag';
import { GamePoster } from '../../components/GamePoster';
import { AuthGuard } from '../../components/AuthGuard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { formatEUR, formatPoints } from '../../lib/currency';
import { getGameById, OFFICIAL_GAMES } from '../../lib/gamesCatalog';
import { notifyUser } from '../../lib/notifications';
import { toUserFriendlyWalletError } from '../../lib/walletErrors';
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
}

function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeGame } = useGameStore();
  const [faucetLoading, setFaucetLoading] = useState(false);

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

  const openDeposit = () => {
    router.push('/cashier?tab=deposit');
  };

  const openWithdraw = () => {
    router.push('/cashier?tab=withdraw');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full min-w-0 pb-16">
      {/* 1. MASTER INTRO CARD: Identity + Integrated Competitive Ledger */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-xl">
        <div className="h-44 sm:h-52 bg-gradient-to-r from-stone-950 via-stone-900 to-primary/20 w-full relative overflow-hidden">
          {catalogGame.bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xs"
              style={{ backgroundImage: `url(${catalogGame.bannerUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Badge variant="copper" className="font-mono text-[10px]">
              OFFICIAL ARENA: {catalogGame.shortName}
            </Badge>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-8 relative z-10 space-y-6">
          {/* Identity Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Player Avatar & Handle */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-card bg-primary text-primary-foreground text-3xl font-extrabold shadow-2xl">
                  <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-stone-900 to-primary">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2">
                  <EloBadge elo={elo} size="md" />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="copper">VERIFIED COMPETITOR</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    LEVEL {Math.min(10, Math.max(1, Math.floor(elo / 150)))} ELO
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] flex items-center gap-1.5">
                    <CountryFlag code={countryInfo.code} size="xs" />
                    <span>{countryInfo.name} ({countryInfo.code}) · ZERO DISPUTES</span>
                  </Badge>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <CountryFlag code={countryInfo.code} size="lg" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
                    @{username}
                  </h1>
                  <span className="font-mono text-sm text-primary font-bold">
                    {elo} ELO
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Match Launchers */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
              <Link href={`/matches/new?profileId=${catalogGame.id}`}>
                <Button variant="default" size="default" className="font-bold text-xs gap-1.5 shadow-sm">
                  <Swords className="w-4 h-4" />
                  <span>Host 1v1 Duel</span>
                </Button>
              </Link>
              <Link href="/challenges">
                <Button variant="secondary" size="default" className="font-bold text-xs gap-1.5">
                  <span>Find Duels</span>
                </Button>
              </Link>
            </div>
          </div>

          <Separator />

          {/* COMPETITIVE LEDGER (Full Width, Part of Intro Card) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground font-mono">
                  Competitive Ledger & Wallet Escrow
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Standardized in $ USDC · Zero exchange-rate slippage
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Cash Box */}
              <div className="p-5 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">
                      Cash Balance
                    </span>
                    <Badge variant="success" className="text-[9px] font-mono">
                      REAL MONEY
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold font-mono text-emerald-400">
                    {loadingBalance ? '...' : formatEUR(cashEur)}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Escrow Locked in Active Duels: <strong className="text-foreground">{formatEUR(lockedCashEur)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openDeposit}
                    className="font-bold text-xs gap-1 h-8 shadow-sm"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Deposit</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openWithdraw}
                    className="font-bold text-xs gap-1 h-8"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Withdraw</span>
                  </Button>
                </div>
              </div>

              {/* Free Demo Points Box */}
              <div className="p-5 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">
                      Demo Play Points
                    </span>
                    <Badge variant="copper" className="text-[9px] font-mono">
                      FREE PLAY
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold font-mono text-primary">
                    {loadingBalance ? '...' : formatPoints(points)} <span className="text-xs text-muted-foreground font-sans">PTS</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Tournaments Locked: <strong className="text-foreground">{formatPoints(lockedPoints)} PTS</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={faucetLoading}
                    onClick={handleClaimFaucet}
                    className="font-bold text-xs gap-1.5 h-8"
                  >
                    <Gift className="w-3.5 h-3.5 text-primary" />
                    <span>{faucetLoading ? 'Claiming...' : '+1,000 PTS'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
                        const catalogItem = OFFICIAL_GAMES.find(
                          (c) =>
                            c.id.toLowerCase() === m.profile_id?.toLowerCase() ||
                            c.displayName.toLowerCase() === gameTitle.toLowerCase()
                        ) || catalogGame;

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
                Complete cryptographic settlement history of deposits, stakes, and prize payouts.
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
      </Tabs>
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
