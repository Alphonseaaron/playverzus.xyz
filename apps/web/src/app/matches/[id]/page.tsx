'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { MatchRoom } from '../../../components/MatchRoom';
import { AuthGuard } from '../../../components/AuthGuard';
import { apiClient } from '../../../lib/api';
import { getGameById } from '../../../lib/gamesCatalog';
import type { GameProfile } from '@playverzus/core';

interface MatchDetails {
  id: string;
  profileId: string;
  playerA: string;
  playerB: string | null;
  winner?: string | null;
  verifiedBy?: string | null;
  confidence?: number | null;
  status: string;
  roomCode?: string | null;
  playerAUsername?: string;
  playerACountry?: string;
  playerAGamertag?: string;
  playerBUsername?: string;
  playerBCountry?: string;
  playerBGamertag?: string;
}

function MatchDetailContent() {
  const params = useParams();
  const matchId = params.id as string;

  const { data: match, isLoading: loadingMatch, refetch } = useQuery<MatchDetails>({
    queryKey: ['match', matchId],
    queryFn: () => apiClient<MatchDetails>(`/matches/${matchId}`),
    refetchInterval: 4000,
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<GameProfile>({
    queryKey: ['game-profile', match?.profileId],
    queryFn: () => apiClient<GameProfile>(`/games/${match!.profileId}`).catch(() => getGameById(match?.profileId)),
    enabled: !!match?.profileId,
  });

  const { data: me } = useQuery<{ id: string; username?: string; country_code?: string; region?: string }>({
    queryKey: ['me'],
    queryFn: () => apiClient<{ id: string; username?: string; country_code?: string; region?: string }>('/profile/me'),
  });

  if (loadingMatch || loadingProfile) {
    return <div className="p-12 text-center text-muted-foreground font-mono text-xs">Loading match lobby...</div>;
  }

  if (!match || !profile) {
    return <div className="p-12 text-center text-destructive font-bold text-sm">Match or game profile not found.</div>;
  }

  const isMeA = me?.id === match.playerA;
  const isMeB = me?.id === match.playerB;

  return (
    <MatchRoom
      matchId={match.id}
      profile={profile}
      playerAId={match.playerA}
      playerBId={match.playerB}
      currentUserId={me?.id ?? ''}
      status={match.status}
      roomCode={match.roomCode}
      winnerId={match.winner}
      verifiedBy={match.verifiedBy}
      confidence={match.confidence}
      onRefresh={() => {
        refetch();
      }}
      playerAUsername={match.playerAUsername || (isMeA ? me?.username : undefined)}
      playerACountry={match.playerACountry || (isMeA ? me?.country_code || me?.region : undefined)}
      playerAGamertag={match.playerAGamertag}
      playerBUsername={match.playerBUsername || (isMeB ? me?.username : undefined)}
      playerBCountry={match.playerBCountry || (isMeB ? me?.country_code || me?.region : undefined)}
      playerBGamertag={match.playerBGamertag}
    />
  );
}

export default function MatchDetailPage() {
  return (
    <AuthGuard>
      <MatchDetailContent />
    </AuthGuard>
  );
}
