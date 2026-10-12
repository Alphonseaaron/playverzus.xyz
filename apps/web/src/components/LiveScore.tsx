'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../lib/api';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface LiveScoreProps {
  matchId: string;
  initialScoreA?: string | number | null;
  initialScoreB?: string | number | null;
}

export function LiveScore({ matchId, initialScoreA = null, initialScoreB = null }: LiveScoreProps) {
  const [scoreA, setScoreA] = useState<string | number | null>(initialScoreA);
  const [scoreB, setScoreB] = useState<string | number | null>(initialScoreB);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    let socket: Socket | null = null;

    try {
      socket = io(`${wsUrl}/ws`, { transports: ['websocket'] });
      socket.on('connect', () => {
        setIsLive(true);
        socket?.emit('subscribe', { room: `match:${matchId}` });
      });

      socket.on('score_update', (data: { playerId: string; score: string | number; playerType: 'A' | 'B' }) => {
        if (data.playerType === 'A') setScoreA(data.score);
        if (data.playerType === 'B') setScoreB(data.score);
      });

      socket.on('disconnect', () => setIsLive(false));
    } catch {
      setIsLive(false);
    }

    // Polling fallback every 3 seconds
    const interval = setInterval(async () => {
      try {
        const match = await apiClient<{
          scoreA?: { primary?: string | number; fields?: { a?: number; b?: number } };
          scoreB?: { primary?: string | number; fields?: { a?: number; b?: number } };
          score_a?: { primary?: string | number; fields?: { a?: number; b?: number } };
          score_b?: { primary?: string | number; fields?: { a?: number; b?: number } };
        }>(`/matches/${matchId}`);

        const rawA = match.scoreA ?? match.score_a;
        const rawB = match.scoreB ?? match.score_b;

        if (rawA?.primary !== undefined) {
          setScoreA(rawA.primary);
        } else if (rawA?.fields?.a !== undefined) {
          setScoreA(rawA.fields.a);
        }

        if (rawB?.primary !== undefined && rawB.primary !== rawA?.primary) {
          setScoreB(rawB.primary);
        } else if (rawA?.fields?.b !== undefined) {
          setScoreB(rawA.fields.b);
        } else if (rawB?.primary !== undefined) {
          setScoreB(rawB.primary);
        }
      } catch {
        // quiet fallback
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.emit('unsubscribe', { room: `match:${matchId}` });
        socket.disconnect();
      }
    };
  }, [matchId]);

  return (
    <Card className="flex items-center justify-between p-6 bg-card border-border shadow-xl">
      <div className="flex-1 text-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Player A</span>
        <div className="text-4xl font-black font-mono text-primary mt-1">
          {scoreA ?? '—'}
        </div>
      </div>

      <div className="flex flex-col items-center px-4">
        <span className="text-xs font-black text-muted-foreground font-mono">VS</span>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 uppercase">
            {isLive ? 'Realtime' : 'Polling'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 text-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Player B</span>
        <div className="text-4xl font-black font-mono text-foreground mt-1">
          {scoreB ?? '—'}
        </div>
      </div>
    </Card>
  );
}
