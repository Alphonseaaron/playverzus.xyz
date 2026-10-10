'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Globe, Filter, Users, Sparkles } from 'lucide-react';
import { TournamentCard } from '../../components/TournamentCard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { useRouter } from 'next/navigation';
import { GLOBAL_REGIONS } from '@playverzus/core';
import { OFFICIAL_GAMES } from '../../lib/gamesCatalog';
import { GamePoster } from '../../components/GamePoster';
import { GameContextBar } from '../../components/GameContextBar';
import { EmptyState } from '../../components/EmptyState';
import { SEEDED_TOURNAMENTS } from '../../lib/seededTournaments';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

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

  const { data: userProfile } = useQuery<{ id: string } | null>({
    queryKey: ['tournaments-profile'],
    queryFn: () => apiClient<{ id: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const { data: rawTournaments, isLoading } = useQuery<TournamentItem[]>({
    queryKey: ['tournaments-list'],
    queryFn: async () => {
      try {
        const res = await apiClient<TournamentItem[]>('/tournaments');
        if (res && res.length > 0) return res;
        return SEEDED_TOURNAMENTS;
      } catch {
        return SEEDED_TOURNAMENTS;
      }
    },
    staleTime: 15000,
  });

  const tournaments = rawTournaments && rawTournaments.length > 0 ? rawTournaments : SEEDED_TOURNAMENTS;

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
                {mode === 'ALL' ? 'All Stakes' : mode === 'FREE' ? 'Free (0€)' : 'Cash EUR (€)'}
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
