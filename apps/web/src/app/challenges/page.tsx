'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Swords, Plus, Filter, Globe, Coins, ShieldCheck } from 'lucide-react';
import { ChallengeCard } from '../../components/ChallengeCard';
import { apiClient } from '../../lib/api';
import { useGameStore } from '../../lib/gameStore';
import { useRouter } from 'next/navigation';
import { GLOBAL_REGIONS } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById } from '../../lib/gamesCatalog';
import { GamePoster } from '../../components/GamePoster';
import { GameContextBar } from '../../components/GameContextBar';
import { notifyUser } from '../../lib/notifications';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

interface ChallengeItem {
  id: string;
  game_profiles?: { display_name: string; game_type: string; id?: string };
  profile_id?: string;
  entry_fee?: number;
  prize_pool?: number;
  created_by?: string;
  creator_username?: string;
  creator_country_code?: string;
  format?: string;
  country_code?: string;
  mode?: string;
}

export default function ChallengesPage() {
  const router = useRouter();
  const { activeGame, setActiveGame } = useGameStore();
  const [filterGameOnly, setFilterGameOnly] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'FREE' | 'CASH'>('ALL');

  const { data: userProfile } = useQuery<{ id: string } | null>({
    queryKey: ['challenges-profile'],
    queryFn: () => apiClient<{ id: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const { data: challenges, refetch, isLoading } = useQuery<ChallengeItem[]>({
    queryKey: ['open-challenges'],
    queryFn: async () => {
      try {
        return await apiClient<ChallengeItem[]>('/matches/open');
      } catch {
        return await apiClient<ChallengeItem[]>('/matches/mine');
      }
    },
  });

  const handleAccept = async (matchId: string) => {
    if (!userProfile) {
      router.push('/login?redirect=/challenges');
      return;
    }

    try {
      await apiClient(`/matches/${matchId}/accept`, { method: 'POST' });
      notifyUser('VS Duel Accepted!', {
        body: 'Connecting to matchroom...',
        sound: 'connect',
        type: 'match',
      });
      window.location.href = `/matches/${matchId}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        router.push('/login?redirect=/challenges');
        return;
      }
      notifyUser('Could not accept duel', {
        body: msg,
        sound: 'score',
        type: 'error',
      });
      refetch();
    }
  };

  // Filter items by active game, region, and fee
  const filteredChallenges = (challenges || []).filter((c) => {
    if (filterGameOnly && activeGame) {
      const matchName = c.game_profiles?.display_name?.toLowerCase();
      const activeName = activeGame.displayName?.toLowerCase();
      const sameId =
        c.profile_id &&
        (c.profile_id.toLowerCase() === activeGame.id.toLowerCase() ||
          getGameById(c.profile_id).id.toLowerCase() === activeGame.id.toLowerCase());
      if (
        !sameId &&
        matchName &&
        activeName &&
        !matchName.includes(activeName) &&
        !activeName.includes(matchName)
      ) {
        return false;
      }
    }

    if (selectedRegion !== 'All') {
      const itemCountry = (c.creator_country_code || c.country_code || '').toUpperCase();
      if (itemCountry && itemCountry !== selectedRegion.toUpperCase()) {
        // Also allow broad region filter when itemCountry isn't a 2-letter match
      }
    }

    if (feeFilter === 'FREE' && (c.entry_fee || 0) > 0) return false;
    if (feeFilter === 'CASH' && (c.entry_fee || 0) === 0) return false;

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Top Banner & Header */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 border border-border bg-card shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
            <Swords className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">Live Open Board</Badge>
              {activeGame && (
                <span className="text-xs text-muted-foreground font-semibold">
                  Selected Game: <strong className="text-foreground">{activeGame.displayName}</strong>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Duel Matchmaking Queue
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Challenge peers in instant 1v1 duels or Party matches. All results verified by automated instant game sync.
            </p>
          </div>
        </div>

        <Link
          href={activeGame ? `/matches/new?profileId=${activeGame.id}` : '/matches/new'}
          onClick={(e) => {
            if (!userProfile) {
              e.preventDefault();
              router.push('/login?redirect=/matches/new');
            }
          }}
          className="flex-shrink-0"
        >
          <Button variant="default" size="default" className="w-full sm:w-auto gap-2 font-bold shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Create Duel</span>
          </Button>
        </Link>
      </Card>

      {/* Active Game Arena Context Bar */}
      <GameContextBar
        title={filterGameOnly ? `${activeGame?.displayName || 'Arena'} Duels` : 'All Competitive Duels'}
        subtitle={filterGameOnly ? `Real-time 1v1 matchmaking for ${activeGame?.displayName || 'Active Game'}` : 'Browsing open duels across all supported esports titles'}
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

      {/* Challenge Grid States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((c) => (
            <ChallengeCard
              key={c.id}
              id={c.id}
              gameTitle={c.game_profiles?.display_name ?? activeGame?.displayName ?? 'Competitive Match'}
              gameType={c.game_profiles?.game_type ?? activeGame?.gameType ?? 'HIGH_SCORE'}
              entryFee={c.entry_fee ?? 0}
              prizePool={c.prize_pool ?? 0}
              creatorName={c.creator_username ?? c.created_by?.slice(0, 8) ?? 'player'}
              format={c.format ?? 'BO1'}
              countryCode={c.creator_country_code || c.country_code}
              mode={c.mode ?? '1v1'}
              onAccept={() => handleAccept(c.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Swords}
          title="No Open Duels in this Queue"
          description={
            filterGameOnly && activeGame
              ? `There are currently no active duels posted for ${activeGame.displayName}. Be the first to create one and set your stakes!`
              : 'There are currently no open duels waiting in this category. Host a 1v1 match now to challenge opponents!'
          }
          actionLabel="Host 1v1 Duel"
          actionHref={activeGame ? `/matches/new?profileId=${activeGame.id}` : '/matches/new'}
        />
      )}
    </div>
  );
}
