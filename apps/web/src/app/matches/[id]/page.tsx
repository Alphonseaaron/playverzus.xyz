'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { MatchRoom } from '../../../components/MatchRoom';
import { apiClient } from '../../../lib/api';
import { getGameById } from '../../../lib/gamesCatalog';
import type { GameProfile } from '@playverzus/core';

interface MatchDetails {
  id: string;
  profileId: string;
  playerA: string;
  playerB: string | null;
  status: string;
  roomCode?: string | null;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;

  const { data: match, isLoading: loadingMatch } = useQuery<MatchDetails>({
    queryKey: ['match', matchId],
    queryFn: () => apiClient<MatchDetails>(`/matches/${matchId}`),
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<GameProfile>({
    queryKey: ['game-profile', match?.profileId],
    queryFn: () => apiClient<GameProfile>(`/games/${match!.profileId}`).catch(() => getGameById(match?.profileId)),
    enabled: !!match?.profileId,
  });

  const { data: me } = useQuery<{ id: string }>({
    queryKey: ['me'],
    queryFn: () => apiClient<{ id: string }>('/profile/me'),
  });

  if (loadingMatch || loadingProfile) {
    return <div className="p-12 text-center text-gray-400">Loading match lobby...</div>;
  }

  if (!match || !profile) {
    return <div className="p-12 text-center text-red-400">Match or game profile not found.</div>;
  }

  return (
    <MatchRoom
      matchId={match.id}
      profile={profile}
      playerAId={match.playerA}
      playerBId={match.playerB}
      currentUserId={me?.id ?? ''}
      status={match.status}
      roomCode={match.roomCode}
    />
  );
}
