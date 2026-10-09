'use client';

import Link from 'next/link';
import { formatEUR } from '../lib/currency';
import { getCountryByCode } from '@playverzus/core';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface ChallengeCardProps {
  id: string;
  gameTitle: string;
  gameType: string;
  entryFee: number;
  prizePool: number;
  creatorName: string;
  format?: string;
  countryCode?: string;
  mode?: string;
  onAccept?: () => void;
}

export function ChallengeCard({
  id,
  gameTitle,
  gameType,
  entryFee,
  prizePool,
  creatorName,
  format = 'BO1',
  countryCode,
  mode = '1v1',
  onAccept,
}: ChallengeCardProps) {
  const country = countryCode ? getCountryByCode(countryCode) : null;

  return (
    <Card className="flex flex-col justify-between hover:border-primary/50 transition-all duration-200 group">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="copper">{mode}</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">{format}</Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            {country && <span title={country.name} className="text-sm">{country.flag}</span>}
            <span>@{creatorName}</span>
          </div>
        </div>

        <div>
          <CardTitle className="text-base group-hover:text-primary transition-colors truncate">
            {gameTitle}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5 block">
            Instant Sync Verified
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/60 border border-border rounded-xl text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Entry Fee</span>
            <span className="font-mono font-bold text-foreground">
              {entryFee === 0 ? <span className="text-emerald-400">FREE</span> : formatEUR(entryFee)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Prize Pool</span>
            <span className="font-mono font-bold text-primary">
              {prizePool === 0 ? 'Honor & ELO' : formatEUR(prizePool)}
            </span>
          </div>
        </div>

        {onAccept ? (
          <Button onClick={onAccept} variant="default" className="w-full">
            Accept Duel
          </Button>
        ) : (
          <Link href={`/matches/${id}`} className="block w-full">
            <Button variant="secondary" className="w-full">
              Enter Matchroom
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
