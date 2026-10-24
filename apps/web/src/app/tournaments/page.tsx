'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Globe, Filter, Users, Sparkles, Zap, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { TournamentCard } from '../../components/TournamentCard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { useRouter } from 'next/navigation';
import { GLOBAL_REGIONS } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById } from '../../lib/gamesCatalog';
import { GamePoster } from '../../components/GamePoster';
import { GameContextBar } from '../../components/GameContextBar';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { formatUSDC } from '../../lib/currency';

interface TournamentItem {
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

export default function TournamentsPage() {
  const router = useRouter();
  const { activeGame, setActiveGame } = useGameStore();
  const [filterGameOnly, setFilterGameOnly] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'FREE' | 'CASH'>('ALL');
  const [blitzTierFilter, setBlitzTierFilter] = useState<number | 'ALL'>('ALL');
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);

  const { data: userProfile } = useQuery<{ id: string } | null>({
    queryKey: ['tournaments-profile'],
    queryFn: () => apiClient<{ id: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const { data: blitzPools = [], isLoading: loadingBlitz, refetch: refetchBlitz } = useQuery<any[]>({
    queryKey: ['blitz-pools'],
    queryFn: async () => {
      try {
        const res = await apiClient<any[]>('/tournaments/blitz-pools');
        return res || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  const handleJoinBlitzPool = async (poolId: string) => {
    if (!userProfile) {
      router.push(`/login?redirect=/tournaments/${poolId}`);
      return;
    }
    try {
      setJoiningPoolId(poolId);
      await apiClient(`/tournaments/${poolId}/join`, { method: 'POST' });
      router.push(`/tournaments/${poolId}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to enter tournament pool. Check your cash balance in Cashier.');
    } finally {
      setJoiningPoolId(null);
    }
  };

  const { data: tournaments = [], isLoading } = useQuery<TournamentItem[]>({
    queryKey: ['tournaments-list'],
    queryFn: async () => {
      try {
        const res = await apiClient<TournamentItem[]>('/tournaments');
        return res || [];
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  const filteredTournaments = (tournaments || []).filter((t) => {
    if (filterGameOnly && activeGame) {
      const tName = (t.name + ' ' + (t.game_profiles?.display_name || '')).toLowerCase();
      const activeName = activeGame.displayName.toLowerCase();
      if (!tName.includes(activeName)) {
        return false;
      }
    }

    if (selectedRegion !== 'All' && t.region && t.region !== selectedRegion) {
      return false;
    }

    if (feeFilter === 'FREE' && (t.entry_fee || 0) > 0) return false;
    if (feeFilter === 'CASH' && (t.entry_fee || 0) === 0) return false;

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-16">
      {/* Tournament Hero */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 border border-border bg-card shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">Official & Community Cups</Badge>
              {activeGame && (
                <span className="text-xs text-muted-foreground font-semibold">
                  Selected Game: <strong className="text-foreground">{activeGame.displayName}</strong>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Tournaments & Championships
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Single & double elimination brackets, Swiss ladders, and national cups with guaranteed prize pools.
            </p>
          </div>
        </div>

        <Link
          href={activeGame ? `/tournaments/new?profileId=${activeGame.id}` : '/tournaments/new'}
          onClick={(e) => {
            if (!userProfile) {
              e.preventDefault();
              router.push('/login?redirect=/tournaments/new');
            }
          }}
          className="flex-shrink-0"
        >
          <Button variant="default" size="default" className="w-full sm:w-auto gap-2 font-bold shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Create Tournament</span>
          </Button>
        </Link>
      </Card>

      {/* 5-Player Sit & Go Blitz Pools (Instant Fill & Auto-Cloning) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  5-Player Blitz Sit & Go
                  <Badge variant="success" className="animate-pulse text-[10px] py-0 px-1.5 uppercase font-black">
                    Live Queues
                  </Badge>
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Continuous 5-player pools for top esports titles. 1st & 2nd place win USDC cash. Auto-generates next tournament the second it fills!
              </p>
            </div>
          </div>

          {/* Tier Filters */}
          <div className="flex items-center bg-muted/80 border border-border rounded-xl p-1 gap-1 text-xs font-semibold">
            <button
              onClick={() => setBlitzTierFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                blitzTierFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setBlitzTierFilter(1)}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                blitzTierFilter === 1
                  ? 'bg-emerald-500 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-emerald-400'
              }`}
            >
              <span>Tier 1 ($10)</span>
            </button>
            <button
              onClick={() => setBlitzTierFilter(2)}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                blitzTierFilter === 2
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-blue-400'
              }`}
            >
              <span>Tier 2 ($50)</span>
            </button>
            <button
              onClick={() => setBlitzTierFilter(3)}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                blitzTierFilter === 3
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-purple-400'
              }`}
            >
              <span>Tier 3 ($100)</span>
            </button>
            <button
              onClick={() => setBlitzTierFilter(4)}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                blitzTierFilter === 4
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-amber-400'
              }`}
            >
              <span>Tier 4 ($200)</span>
            </button>
            <button
              onClick={() => setBlitzTierFilter(5)}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                blitzTierFilter === 5
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-rose-400'
              }`}
            >
              <span>Tier 5 ($500)</span>
            </button>
          </div>
        </div>

        {/* Blitz Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blitzPools
            .filter((p: any) => {
              if (blitzTierFilter !== 'ALL' && p.tier !== blitzTierFilter) return false;
              if (filterGameOnly && activeGame) {
                const pName = (p.name + ' ' + (p.game_profiles?.display_name || '')).toLowerCase();
                return pName.includes(activeGame.displayName.toLowerCase());
              }
              return true;
            })
            .map((pool: any) => {
              const enrolled = pool.enrolled_count ?? 0;
              const slotsLeft = Math.max(0, 5 - enrolled);
              const isFull = enrolled >= 5;
              const tierNum = pool.tier || 1;
              const tierColor =
                tierNum === 1
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : tierNum === 2
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : tierNum === 3
                  ? 'border-purple-500/40 bg-purple-500/5'
                  : tierNum === 4
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-rose-500/40 bg-rose-500/5';
              const tierBadgeColor =
                tierNum === 1
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : tierNum === 2
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : tierNum === 3
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : tierNum === 4
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

              const gameCatalog = getGameById(pool.game_profiles?.id || pool.profile_id);

              return (
                <Card
                  key={pool.id}
                  className={`flex flex-col justify-between border ${tierColor} hover:border-primary/80 transition-all duration-200 group overflow-hidden shadow-md`}
                >
                  <CardHeader className="p-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${tierBadgeColor}`}>
                        {tierNum === 1
                          ? 'TIER 1 · STARTER ($10)'
                          : tierNum === 2
                          ? 'TIER 2 · CHALLENGER ($50)'
                          : tierNum === 3
                          ? 'TIER 3 · CHAMPION ($100)'
                          : tierNum === 4
                          ? 'TIER 4 · MASTER ($200)'
                          : 'TIER 5 · GRANDMASTER ($500)'}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold text-foreground">{enrolled}/5</span> Players
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{gameCatalog.icon}</div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {gameCatalog.displayName}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground">Fast 5-Player Single Elim</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Queue Status</span>
                        <span className="text-emerald-400 font-bold">{slotsLeft} Slots Left</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-300"
                          style={{ width: `${(enrolled / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial Economics Box */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-background/80 border border-border/80 rounded-xl text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Entry Fee</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatUSDC(pool.entry_fee)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Prize Pool</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatUSDC(pool.prize_pool)}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border/40 flex justify-between text-[10px] text-muted-foreground">
                        <span>1st (70%): <strong className="text-foreground">{formatUSDC(pool.prize_pool * 0.70)}</strong></span>
                        <span>2nd (30%): <strong className="text-foreground">{formatUSDC(pool.prize_pool * 0.30)}</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={isFull || joiningPoolId === pool.id}
                        onClick={() => handleJoinBlitzPool(pool.id)}
                        className="flex-1 gap-1.5 font-bold shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>{joiningPoolId === pool.id ? 'Joining...' : isFull ? 'Starting...' : 'Join Pool'}</span>
                      </Button>
                      <Link href={`/tournaments/${pool.id}`}>
                        <Button size="sm" variant="secondary" className="px-3" title="View Bracket">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>

      {/* Active Game Context Bar */}
      <GameContextBar
        title={filterGameOnly ? `${activeGame?.displayName || 'Arena'} Cups` : 'All Tournament Cups'}
        subtitle={filterGameOnly ? `Brackets and cups for ${activeGame?.displayName || 'Active Game'}` : 'Browsing official championships across all supported esports titles'}
        filterGameOnly={filterGameOnly}
        onToggleFilter={setFilterGameOnly}
      />

      {/* Filter Controls Bar */}
      <Card className="p-4 border border-border bg-card flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted border border-border rounded-lg p-1 gap-1">
            {(['ALL', 'FREE', 'CASH'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFeeFilter(mode)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  feeFilter === mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'ALL' ? 'All Entry Tiers' : mode === 'FREE' ? 'Free Demo (PTS)' : 'Real Cash ($ USDC)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> Region:
          </span>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1.5 bg-muted border border-border text-foreground rounded-lg text-xs focus:outline-none focus:border-primary"
          >
            <option value="All">Global (All Regions)</option>
            {GLOBAL_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Tournaments Grid States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            const catalogItem = OFFICIAL_GAMES.find((c) =>
              c.displayName.toLowerCase().includes((t.game_profiles?.display_name || '').toLowerCase())
            ) || OFFICIAL_GAMES[0];

            return (
              <TournamentCard
                key={t.id}
                tournament={{
                  id: t.id,
                  name: t.name,
                  status: t.status as any,
                  entryFee: t.entry_fee,
                  prizePool: t.prize_pool,
                  maxParticipants: t.size,
                  currentParticipants: t.enrolled_count ?? 0,
                  startsAt: '2026-10-15T18:00:00.000Z',
                  gameProfileId: t.game_profiles?.id || 'cs2',
                }}
                game={catalogItem}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No Tournaments Found"
          description={
            filterGameOnly && activeGame
              ? `No cups are currently scheduled for ${activeGame.displayName}. Be the first organizer to launch a bracket!`
              : 'No tournaments match your current filters. Host a championship cup now to invite competitors!'
          }
          actionLabel="Create Tournament Cup"
          actionHref={activeGame ? `/tournaments/new?profileId=${activeGame.id}` : '/tournaments/new'}
        />
      )}
    </div>
  );
}
