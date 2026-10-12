'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { formatEUR } from '../../../lib/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { CountryFlag } from '../../../components/CountryFlag';
import { Trophy, Users, CheckCircle2, ArrowRight, Clock, Coins, Medal, Gamepad2 } from 'lucide-react';
import { notifyUser } from '../../../lib/notifications';

interface TournamentDetails {
  id: string;
  name: string;
  description?: string;
  format: string;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  starts_at?: string;
  game_profiles?: { display_name: string; platform: string; game_type: string };
  tournament_entries?: Array<{
    user_id: string;
    seed?: number;
    checked_in: boolean;
    username?: string;
    country_code?: string;
  }>;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: tournament, refetch, isLoading } = useQuery<TournamentDetails>({
    queryKey: ['tournament', id],
    queryFn: () => apiClient<TournamentDetails>(`/tournaments/${id}`),
  });

  const handleJoin = async () => {
    try {
      await apiClient(`/tournaments/${id}/join`, { method: 'POST' });
      notifyUser('Joined tournament!', { body: 'You are now registered. Check-in when it opens.', type: 'match' });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        router.push(`/login?redirect=/tournaments/${id}`);
        return;
      }
      notifyUser('Could not join', { body: msg, type: 'error' });
    }
  };

  const handleCheckin = async () => {
    try {
      await apiClient(`/tournaments/${id}/checkin`, { method: 'POST' });
      notifyUser('Checked in!', { body: 'You are confirmed for this tournament.', type: 'match' });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        router.push(`/login?redirect=/tournaments/${id}`);
        return;
      }
      notifyUser('Check-in failed', { body: msg, type: 'error' });
    }
  };

  const handleStartBracket = async () => {
    try {
      await apiClient(`/tournaments/${id}/start`, { method: 'POST' });
      notifyUser('Bracket Generated & Live!', {
        body: 'Tournament matches are now live in the arena.',
        sound: 'connect',
        type: 'match',
      });
      router.push(`/tournaments/${id}/bracket`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notifyUser('Could not start tournament', { body: msg, type: 'error' });
    }
  };

  if (isLoading || !tournament) {
    return (
      <Card className="p-16 text-center text-xs text-muted-foreground bg-card border-border max-w-4xl mx-auto">
        Loading tournament bracket & entrants...
      </Card>
    );
  }

  const entrantsCount = tournament.tournament_entries?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* 1. Hero Card */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="copper" className="flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                {tournament.game_profiles?.display_name || 'Esports Arena'}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {tournament.format.replace(/_/g, ' ')}
              </Badge>
              <Badge
                variant={
                  tournament.status === 'REGISTRATION' || tournament.status === 'OPEN'
                    ? 'success'
                    : tournament.status === 'CHECKIN' || tournament.status === 'ACTIVE'
                    ? 'copper'
                    : 'secondary'
                }
                className="font-mono text-[10px]"
              >
                {tournament.status}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {tournament.name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Entrants: <strong className="text-foreground">{entrantsCount}/{tournament.size}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                Entry: <strong className="text-foreground">{tournament.entry_fee > 0 ? formatEUR(tournament.entry_fee) : 'Free'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
            {tournament.status === 'REGISTRATION' && entrantsCount < tournament.size && (
              <Button
                onClick={handleJoin}
                variant="default"
                size="default"
                className="font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20"
              >
                Join Tournament
              </Button>
            )}

            {(tournament.status === 'REGISTRATION' || tournament.status === 'CHECKIN') && entrantsCount >= 2 && (
              <Button
                onClick={handleStartBracket}
                variant="outline"
                size="default"
                className="font-bold text-xs uppercase tracking-wider"
              >
                Launch Bracket
              </Button>
            )}

            {tournament.status === 'CHECKIN' && (
              <Button
                onClick={handleCheckin}
                variant="default"
                size="default"
                className="font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Check In Now
              </Button>
            )}

            <Link href={`/tournaments/${id}/bracket`}>
              <Button variant="secondary" size="default" className="font-bold text-xs uppercase tracking-wider gap-1.5">
                <span>View Bracket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. Prize Pool Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border text-center p-5">
          <CardHeader className="p-0 pb-1">
            <CardDescription className="text-[10px] font-bold uppercase tracking-wider font-mono">
              Total Prize Pool
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-black font-mono text-primary mt-1">
              {tournament.prize_pool > 0 ? formatEUR(tournament.prize_pool) : 'Glory & Trophies'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-center p-5">
          <CardHeader className="p-0 pb-1">
            <CardDescription className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              1st Place (50%)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-black font-mono text-foreground mt-1">
              {tournament.prize_pool > 0 ? formatEUR(tournament.prize_pool * 0.5) : 'Gold Trophy'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-center p-5">
          <CardHeader className="p-0 pb-1">
            <CardDescription className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-1">
              <Medal className="w-3.5 h-3.5 text-gray-300" />
              2nd Place (30%)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-black font-mono text-foreground mt-1">
              {tournament.prize_pool > 0 ? formatEUR(tournament.prize_pool * 0.3) : 'Silver Trophy'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Registered Entrants Grid */}
      <Card className="bg-card border-border p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Registered Entrants ({entrantsCount}/{tournament.size})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Seeded participants locked for bracket progression.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            CAP: {tournament.size}
          </Badge>
        </div>

        {entrantsCount === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No entrants registered yet. Be the first to join the tournament!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {tournament.tournament_entries?.map((entry, idx) => (
              <div
                key={entry.user_id}
                className="p-3 bg-secondary/60 border border-border rounded-xl text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center font-mono font-bold text-[10px] text-muted-foreground flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <CountryFlag
                    code={entry.country_code}
                    fallbackSeed={entry.username || entry.user_id}
                    size="xs"
                  />
                  <span className="font-mono font-bold text-foreground truncate">
                    {entry.username ? `@${entry.username}` : `Player ${entry.user_id.slice(0, 6)}`}
                  </span>
                </div>
                {entry.checked_in && (
                  <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    READY
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
