'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Share2,
  Users,
  Swords,
  ShieldCheck,
  Trophy,
  Check,
  Flame,
  Award,
  Gamepad2,
  History,
  Coins,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { EloBadge } from '../../../components/EloBadge';
import { CountryFlag, resolveCountryInfo } from '../../../components/CountryFlag';
import { GamePoster } from '../../../components/GamePoster';
import { useGameStore } from '../../../lib/gameStore';
import { getGameById, OFFICIAL_GAMES } from '../../../lib/gamesCatalog';
import { notifyUser } from '../../../lib/notifications';
import { formatEUR } from '../../../lib/currency';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';

interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  trust_score: number;
  role: string;
  region?: string;
  country_code?: string;
  rating?: number;
}

interface MatchRecord {
  id: string;
  profile_id?: string;
  game_profiles?: { display_name: string; game_type: string; id?: string };
  format: string;
  status: string;
  entry_fee: number;
  prize_pool: number;
  created_at: string;
  winner_id?: string | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { activeGame } = useGameStore();
  const [copiedLink, setCopiedLink] = useState(false);

  const catalogGame = getGameById(activeGame?.id);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['public-profile', username],
    queryFn: () => apiClient<UserProfile>(`/profile/${username}`),
  });

  const { data: matches } = useQuery<MatchRecord[]>({
    queryKey: ['public-profile-matches', username],
    queryFn: () => apiClient<MatchRecord[]>(`/profile/${username}/matches`).catch(() => []),
  });

  if (isLoading) {
    return (
      <div className="p-20 text-center text-muted-foreground font-mono text-xs animate-pulse bg-card border border-border rounded-2xl max-w-4xl mx-auto my-12">
        Loading competitor profile and battle history...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto my-16 text-center">
        <Card className="p-8 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            👤
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              Player @{username} not found
            </h2>
            <p className="text-xs text-muted-foreground">
              This competitor tag does not exist or has not enrolled in Playverzus.xyz yet.
            </p>
          </div>
          <Link href="/" className="inline-block pt-2">
            <Button variant="default" size="sm">
              Return to Playverzus.xyz
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const elo = profile.rating ?? 1000;
  const nextTier = Math.ceil(elo / 150) * 150;
  const eloToNext = Math.max(0, nextTier - elo);
  const eloPercent = Math.min(100, Math.max(10, ((150 - eloToNext) / 150) * 100));

  // Match calculations
  const settledMatches = (matches || []).filter((m) => m.status === 'SETTLED' || m.status === 'COMPLETED');
  const totalMatches = settledMatches.length;
  const wins = settledMatches.filter((m) => m.winner_id === profile.id).length;
  const losses = Math.max(0, totalMatches - wins);
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';

  const recentForm = settledMatches.slice(0, 5).map((m) => (m.winner_id === profile.id ? 'W' : 'L'));

  const handleInviteToParty = () => {
    notifyUser(`Party Invite Sent to @${profile.username}`, {
      body: 'They will receive an in-app ping to join your squad dock.',
      sound: 'connect',
      type: 'party',
    });
  };

  const handleShareProfile = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      notifyUser('Profile Link Copied', {
        body: 'Share this link with your squad or opponent.',
        sound: 'score',
        type: 'info',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-16">
      {/* 1. HERO PROFILE BANNER & INTEGRATED COMPETITIVE LEDGER CARD */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-xl">
        {/* Cinematic Backdrop Banner */}
        <div className="h-44 sm:h-56 bg-gradient-to-r from-stone-950 via-stone-900 to-primary/20 w-full relative overflow-hidden">
          {catalogGame.bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-xs"
              style={{ backgroundImage: `url(${catalogGame.bannerUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="backdrop-blur-md bg-background/80 font-mono text-[10px] border-border">
              VERZUS ESPORTS
            </Badge>
          </div>
        </div>

        {/* Profile Info Header */}
        <div className="px-6 sm:px-8 pb-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Left: Avatar + Identity */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6 min-w-0">
              {/* Large Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-card bg-primary text-primary-foreground text-3xl sm:text-4xl font-extrabold shadow-2xl">
                  <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-stone-900 to-primary">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2">
                  <EloBadge elo={elo} size="md" />
                </div>
              </div>

              {/* Names, Tags & Badges */}
              <div className="space-y-2 min-w-0 pb-1">
                {(() => {
                  const countryInfo = resolveCountryInfo(
                    profile.country_code || profile.region,
                    profile.username || profile.id,
                  );
                  return (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="copper">VERIFIED PLAYER</Badge>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {profile.role.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px] flex items-center gap-1.5">
                          <CountryFlag code={countryInfo.code} size="xs" />
                          <span>{countryInfo.name} ({countryInfo.code})</span>
                        </Badge>
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5">
                          <CountryFlag code={countryInfo.code} size="lg" />
                          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate leading-tight">
                            {profile.display_name || profile.username}
                          </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                          <span>@{profile.username}</span>
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Right: Primary Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0 pt-2 lg:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareProfile}
                className="gap-1.5 h-9 text-xs"
                title="Copy profile link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleInviteToParty}
                className="gap-1.5 h-9 text-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite Squad</span>
              </Button>

              <Link
                href={activeGame ? `/matches/new?profileId=${activeGame.id}&opponent=${profile.id}` : '/matches/new'}
              >
                <Button variant="default" size="sm" className="gap-1.5 h-9 text-xs font-bold shadow-sm">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Challenge 1v1</span>
                </Button>
              </Link>
            </div>
          </div>

          <Separator className="my-6" />

          {/* INTEGRATED COMPETITIVE LEDGER (Part of Intro Card - Generous, Full Width, No Squeeze!) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-muted-foreground font-mono tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                Competitive Ledger & Career Dossier
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Verified Skill Level & Battle Records
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Stat 1: Elo Rating & Level */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                    Skill Rating
                  </span>
                  <EloBadge elo={elo} size="sm" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-foreground">{elo}</div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${eloPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                    {eloToNext > 0 ? `${eloToNext} to next tier` : 'Top Tier'}
                  </span>
                </div>
              </div>

              {/* Stat 2: Win Rate */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  Win Rate
                </span>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-emerald-400">{winRate}%</div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {wins} Wins in {totalMatches} Matches
                  </span>
                </div>
              </div>

              {/* Stat 3: Match Record */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  W/L Record
                </span>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {wins}W <span className="text-muted-foreground text-sm font-normal">/</span> {losses}L
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {totalMatches} Settled Duels
                  </span>
                </div>
              </div>

              {/* Stat 4: Recent 5 Form */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                  Recent Form
                </span>
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    {recentForm.length > 0 ? (
                      recentForm.map((outcome, idx) => (
                        <span
                          key={idx}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs font-mono border ${
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
                        No matches yet
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-2">
                    Last 5 contested duels
                  </span>
                </div>
              </div>

              {/* Stat 5: FairPlay Trust Score */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Trust Score
                </span>
                <div className="mt-2">
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {profile.trust_score}
                    <span className="text-xs text-muted-foreground font-normal">/1000</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Anti-cheat verified · Zero bans
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. MAIN TABS SECTION (Full Width, Standard Shadcn UI Tabs) */}
      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="h-10 bg-muted/70 p-1 border border-border">
          <TabsTrigger value="matches" className="text-xs font-semibold gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Match History</span>
            <Badge variant="secondary" className="text-[10px] ml-1 px-1 py-0">
              {matches?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ratings" className="text-xs font-semibold gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Game Ratings</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="text-xs font-semibold gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>Badges & Trophies</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs font-semibold gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span>Settlement Ledger</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Match History (Clean Shadcn Table) */}
        <TabsContent value="matches">
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Verified Match Records</CardTitle>
              <CardDescription className="text-xs">
                Official competitive duels settled with automated game verification and anti-cheat proof.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches && matches.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center">Result</TableHead>
                        <TableHead>Game & Mode</TableHead>
                        <TableHead>Match ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Prize Pool</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.map((m) => {
                        const isWin = m.winner_id === profile.id;
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
                                variant={isWin ? 'success' : 'destructive'}
                                className="font-mono font-bold text-xs px-2"
                              >
                                {isWin ? 'WIN' : 'LOSS'}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-3">
                                <GamePoster
                                  game={catalogItem}
                                  aspect="mini"
                                  className="w-5 h-7 rounded flex-shrink-0"
                                />
                                <div>
                                  <span className="font-bold text-xs text-foreground block">
                                    {gameTitle}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {m.format}
                                  </span>
                                </div>
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
                              <Badge
                                variant={m.status === 'SETTLED' ? 'success' : 'secondary'}
                                className="text-[10px] font-mono"
                              >
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
                  <h4 className="text-sm font-bold text-foreground">No Settled Duels Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This player has not finished any competitive matches yet. Be the first to challenge them!
                  </p>
                  <div className="pt-2">
                    <Link href={`/matches/new?opponent=${profile.id}`}>
                      <Button variant="default" size="sm" className="text-xs font-bold gap-1.5">
                        <Swords className="w-3.5 h-3.5" />
                        <span>Send 1v1 Challenge</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Game Ratings (Grid of Official Arenas) */}
        <TabsContent value="ratings">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OFFICIAL_GAMES.map((game) => (
              <Card key={game.id} className="p-4 border border-border bg-card flex flex-col justify-between hover:border-primary/50 transition">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <GamePoster
                      game={game}
                      aspect="thumb"
                      className="w-12 h-16 rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground truncate block">
                        {game.displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        {game.platform}
                      </span>
                      <div className="mt-1">
                        <EloBadge elo={elo} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Tier Rank</span>
                      <span className="text-foreground font-bold">{elo} Elo</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${eloPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Official Ruleset</span>
                  <Link href={`/games/${game.id}`}>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                      View Hub →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Badges & Trophies */}
        <TabsContent value="badges">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border border-border bg-card space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Anti-Cheat Certified</h4>
              <p className="text-xs text-muted-foreground">
                Matches are continuously monitored with zero flagged telemetry or dispute penalties.
              </p>
            </Card>

            <Card className="p-5 border border-border bg-card space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Arena Competitor</h4>
              <p className="text-xs text-muted-foreground">
                Official contender enrolled in Season 1 regional tournament ladders.
              </p>
            </Card>

            <Card className="p-5 border border-border bg-card space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Instant Score Sync</h4>
              <p className="text-xs text-muted-foreground">
                Connected screen feed active for automated score capture and payout settlements.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Settlement Ledger */}
        <TabsContent value="ledger">
          <Card className="border border-border bg-card p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base font-bold">Escrow & Settlement Audit</CardTitle>
              <CardDescription className="text-xs">
                Zero-slippage skill gaming escrow. Every match entry fee is held transparently until verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">FairPlay Ledger Guarantee</span>
                  <span className="text-foreground font-bold">100% Automated Instant Settlements</span>
                </div>
                <Badge variant="success" className="font-mono text-[10px]">
                  ACTIVE ESCROW
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
