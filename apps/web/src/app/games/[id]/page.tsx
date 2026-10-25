'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Swords,
  Trophy,
  BarChart3,
  BookOpen,
  Plus,
  ChevronsUpDown,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { getGameById, OFFICIAL_GAMES, type CatalogGame } from '../../../lib/gamesCatalog';
import { useGameStore } from '../../../lib/gameStore';
import { useGameAccountsStore } from '../../../lib/gameAccountsStore';
import { EloBadge } from '../../../components/EloBadge';
import { ChallengeCard } from '../../../components/ChallengeCard';
import { GamePoster } from '../../../components/GamePoster';
import { TournamentCard } from '../../../components/TournamentCard';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { formatEUR } from '../../../lib/currency';
import type { GameProfile } from '@playverzus/core';

interface ChallengeItem {
  id: string;
  game_profiles?: { display_name: string; game_type: string };
  entry_fee?: number;
  prize_pool?: number;
  created_by?: string;
  creator_username?: string;
  creator_country_code?: string;
  format?: string;
  country_code?: string;
  mode?: string;
}

interface LeaderboardEntry {
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  username?: string;
  countryCode?: string;
}

interface TournamentItem {
  id: string;
  name: string;
  format: string;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  game_profiles?: { display_name: string; id?: string };
}

export default function GameHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setActiveGame } = useGameStore();

  const [feeFilter, setFeeFilter] = useState<'ALL' | 'FREE' | 'CASH'>('ALL');

  // Query database profile
  const { data: profile } = useQuery<GameProfile>({
    queryKey: ['game-profile-hub', id],
    queryFn: () => apiClient<GameProfile>(`/games/${id}`),
    staleTime: 60000,
  });

  const catalogFallback = getGameById(id);
  const resolvedProfile = profile || catalogFallback;
  const catalogItem = OFFICIAL_GAMES.find((c) => c.id.toLowerCase() === resolvedProfile.id.toLowerCase()) || catalogFallback;
  const tagline = catalogItem?.tagline || 'Competitive Matchmaking Arena';

  // Gamertag handle integration
  const { getGamertag, getGamertagLabel } = useGameAccountsStore();
  const gamertagLabel = getGamertagLabel(resolvedProfile.id);
  const myGamertag = getGamertag(resolvedProfile.id);

  // 1. Fetch live open challenges for this game
  const { data: challenges, isLoading: loadingChallenges } = useQuery<ChallengeItem[]>({
    queryKey: ['hub-challenges', resolvedProfile.id],
    queryFn: async () => {
      try {
        const list = await apiClient<ChallengeItem[]>('/matches/open');
        return list.filter((c) => {
          const matchName = c.game_profiles?.display_name?.toLowerCase();
          const targetName = resolvedProfile.displayName?.toLowerCase();
          return matchName && targetName ? matchName.includes(targetName) || targetName.includes(matchName) : true;
        });
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  // 2. Fetch tournaments for this game
  const { data: tournaments, isLoading: loadingTournaments } = useQuery<TournamentItem[]>({
    queryKey: ['hub-tournaments', resolvedProfile.id],
    queryFn: async () => {
      try {
        const list = await apiClient<TournamentItem[]>('/tournaments');
        return list.filter((t) => {
          const tName = (t.name + ' ' + (t.game_profiles?.display_name || '')).toLowerCase();
          const targetName = resolvedProfile.displayName.toLowerCase();
          return tName.includes(targetName);
        });
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // 3. Fetch leaderboard ranking for this game
  const { data: ladderEntries, isLoading: loadingLadder } = useQuery<LeaderboardEntry[]>({
    queryKey: ['hub-leaderboard', resolvedProfile.gameType],
    queryFn: () => apiClient<LeaderboardEntry[]>(`/leaderboard/${resolvedProfile.gameType}`).catch(() => []),
    staleTime: 15000,
  });

  const filteredChallenges = (challenges || []).filter((c) => {
    if (feeFilter === 'FREE' && (c.entry_fee || 0) > 0) return false;
    if (feeFilter === 'CASH' && (c.entry_fee || 0) === 0) return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full min-w-0 pb-16">
      {/* 1. HERO ARENA BANNER */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-xl">
        {catalogItem.bannerUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-xs"
            style={{ backgroundImage: `url(${catalogItem.bannerUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-card/75" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <GamePoster
              game={catalogItem}
              aspect="thumb"
              className="w-16 h-22 sm:w-20 sm:h-28 rounded-xl shadow-2xl border border-border flex-shrink-0"
            />

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="copper">OFFICIAL ARENA</Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {resolvedProfile.platform || 'UNIVERSAL'}
                </Badge>
                {myGamertag ? (
                  <Badge variant="success" className="font-mono text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{gamertagLabel}: {myGamertag}</span>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="font-mono text-[10px] gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{gamertagLabel} Not Linked</span>
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight truncate leading-tight uppercase">
                {resolvedProfile.displayName} Arena
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                {tagline} · Automated score sync & anti-cheat active.
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
            <Link href="/games">
              <Button
                variant="outline"
                size="sm"
                className="font-bold text-xs gap-1.5 h-9"
              >
                <ChevronsUpDown className="w-4 h-4" />
                <span>Switch Arena</span>
              </Button>
            </Link>

            <Link href={`/matches/new?profileId=${resolvedProfile.id}`}>
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 h-9 shadow-sm">
                <Swords className="w-4 h-4" />
                <span>Create 1v1 Duel</span>
              </Button>
            </Link>

            <Link href={`/tournaments/new?profileId=${resolvedProfile.id}`}>
              <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5 h-9">
                <Trophy className="w-4 h-4" />
                <span>Create Cup</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. DECLUTTERED SHADCN TABS WORKSPACE */}
      <Tabs defaultValue="duels" className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
          <TabsList className="h-10 bg-muted/70 p-1 border border-border">
            <TabsTrigger value="duels" className="text-xs font-semibold gap-1.5">
              <Swords className="w-3.5 h-3.5" />
              <span>Open Duels</span>
              <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">
                {challenges?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="text-xs font-semibold gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Tournaments</span>
              <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">
                {tournaments?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ladders" className="text-xs font-semibold gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Ladder Rankings</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs font-semibold gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Rules & Calibration</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filter Capsule for Duels */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border text-xs">
            {(['ALL', 'FREE', 'CASH'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFeeFilter(m)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wider transition ${
                  feeFilter === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'ALL' ? 'ALL TIERS' : m === 'FREE' ? 'DEMO (0 PTS)' : 'REAL CASH ($ USDC)'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Duels & Challenges */}
        <TabsContent value="duels">
          {loadingChallenges ? (
            <div className="p-12 text-center text-muted-foreground font-mono text-xs bg-card border border-border rounded-xl animate-pulse">
              Querying live match pool...
            </div>
          ) : filteredChallenges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChallenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  id={c.id}
                  gameTitle={c.game_profiles?.display_name || resolvedProfile.displayName}
                  gameType={c.game_profiles?.game_type || resolvedProfile.gameType}
                  entryFee={c.entry_fee ?? 0}
                  prizePool={c.prize_pool ?? 0}
                  creatorName={c.creator_username || c.created_by?.slice(0, 8) || 'Player'}
                  format={c.format || 'BO1'}
                  countryCode={c.creator_country_code || c.country_code}
                  mode={c.mode || '1v1'}
                />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border border-border bg-card flex flex-col items-center justify-center gap-4">
              <Swords className="w-10 h-10 text-muted-foreground/60" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  No Open {feeFilter !== 'ALL' ? feeFilter : ''} Duels in {resolvedProfile.displayName}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Host an open challenge or queue up against matchmaking opponents.
                </p>
              </div>
              <Link href={`/matches/new?profileId=${resolvedProfile.id}`}>
                <Button variant="default" size="sm" className="gap-1.5 font-bold">
                  <Plus className="w-4 h-4" />
                  <span>Host New Duel</span>
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Tournaments */}
        <TabsContent value="tournaments">
          {loadingTournaments ? (
            <div className="p-12 text-center text-muted-foreground font-mono text-xs bg-card border border-border rounded-xl animate-pulse">
              Loading brackets...
            </div>
          ) : tournaments && tournaments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={{
                    id: t.id,
                    name: t.name,
                    status: t.status as any,
                    entryFee: t.entry_fee,
                    prizePool: t.prize_pool,
                    maxParticipants: t.size,
                    currentParticipants: 0,
                    startsAt: new Date().toISOString(),
                    gameProfileId: resolvedProfile.id,
                  }}
                  game={catalogItem}
                />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border border-border bg-card flex flex-col items-center justify-center gap-4">
              <Trophy className="w-10 h-10 text-muted-foreground/60" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">No Active Cups Scheduled</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create a custom single-elimination cup for your squad and community.
                </p>
              </div>
              <Link href={`/tournaments/new?profileId=${resolvedProfile.id}`}>
                <Button variant="default" size="sm" className="gap-1.5 font-bold">
                  <Plus className="w-4 h-4" />
                  <span>Host Tournament Cup</span>
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Ladder Rankings */}
        <TabsContent value="ladders">
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">{resolvedProfile.displayName} Competitive Ladder</CardTitle>
              <CardDescription className="text-xs">
                Official Season 1 Elo standings. Play verified duels to increase rank.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ladderEntries && ladderEntries.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Competitor</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Win Rate</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ladderEntries.slice(0, 15).map((entry, idx) => {
                        const winRate = entry.gamesPlayed > 0
                          ? ((entry.wins / entry.gamesPlayed) * 100).toFixed(1)
                          : '0.0';

                        return (
                          <TableRow key={entry.userId} className="hover:bg-muted/30">
                            <TableCell className="font-bold font-mono text-sm">
                              #{idx + 1}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/profile/${entry.username || entry.userId}`}
                                className="font-bold text-xs text-foreground hover:text-primary transition"
                              >
                                @{entry.username || entry.userId.slice(0, 8)}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <EloBadge elo={entry.rating} size="sm" showLabel />
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold">
                              {winRate}%
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {entry.wins}W - {entry.losses}L
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/matches/new?profileId=${resolvedProfile.id}&opponent=${entry.userId}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                  <span>Challenge</span>
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
                <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                  No ranked matches logged for this title yet. Be the first to establish a rating!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Rules & Calibration */}
        <TabsContent value="rules">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 border border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-foreground">Automated Match Verification</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Matches are automatically verified by client-side game feed detection. Zero manual screenshots or referee delays required.
              </p>
              <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono space-y-1">
                <div className="text-muted-foreground">Extraction Mode: <span className="text-foreground font-bold">{resolvedProfile.gameType}</span></div>
                <div className="text-muted-foreground">Supported Platforms: <span className="text-foreground font-bold">{resolvedProfile.platform || 'Cross-Platform PC / Console'}</span></div>
              </div>
            </Card>

            <Card className="p-6 border border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Anti-Cheat & Dispute Arbitrage</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If scores differ between opponents or confidence falls below threshold, match enters HITL dispute review where reviewers audit cryptographic evidence hashes.
              </p>
              <div className="pt-2">
                <Link href={`/matches/new?profileId=${resolvedProfile.id}`}>
                  <Button variant="default" size="sm" className="text-xs font-bold gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    <span>Launch 1v1 Arena</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
