'use client';

import Link from 'next/link';
import { formatEUR } from '../lib/currency';
import { getCountryByCode } from '@playverzus/core';
import { CountryFlag } from './CountryFlag';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface TournamentItemData {
  id: string;
  name: string;
  format?: string;
  size?: number;
  maxParticipants?: number;
  entryFee?: number;
  prizePool?: number;
  status?: any;
  gameProfileId?: string;
  currentParticipants?: number;
  enrolledCount?: number;
  region?: string;
  countryCode?: string;
  startsAt?: string;
}

export interface TournamentCardProps {
  id?: string;
  name?: string;
  format?: string;
  size?: number;
  entryFee?: number;
  prizePool?: number;
  status?: string;
  gameTitle?: string;
  region?: string;
  countryCode?: string;
  enrolledCount?: number;
  tournament?: TournamentItemData;
  game?: { displayName?: string; shortName?: string };
}

export function TournamentCard({
  id,
  name,
  format,
  size,
  entryFee,
  prizePool,
  status,
  gameTitle,
  region = 'Worldwide',
  countryCode,
  enrolledCount,
  tournament,
  game,
}: TournamentCardProps) {
  const resolvedId = id || tournament?.id || '';
  const resolvedName = name || tournament?.name || 'Tournament';
  const resolvedFormat = format || tournament?.format || 'SINGLE_ELIM';
  const resolvedSize = size ?? tournament?.size ?? tournament?.maxParticipants ?? 8;
  const resolvedEntryFee = entryFee ?? tournament?.entryFee ?? 0;
  const resolvedPrizePool = prizePool ?? tournament?.prizePool ?? 0;
  const resolvedStatus = status || tournament?.status || 'REGISTRATION';
  const resolvedGameTitle = gameTitle || game?.displayName || '';
  const resolvedRegion = region || tournament?.region || 'Worldwide';
  const resolvedCountryCode = countryCode || tournament?.countryCode;
  const resolvedEnrolledCount = enrolledCount ?? tournament?.currentParticipants ?? tournament?.enrolledCount ?? 0;

  const country = resolvedCountryCode ? getCountryByCode(resolvedCountryCode) : null;

  return (
    <Card className="flex flex-col justify-between hover:border-primary/50 transition-all duration-200 group">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="copper">
              {resolvedFormat.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1.5 font-mono text-[10px]">
              {country ? (
                <>
                  <CountryFlag code={country.code} size="xs" />
                  <span>{country.name}</span>
                </>
              ) : (
                <>
                  <CountryFlag code={resolvedRegion} fallbackSeed={resolvedName} size="xs" />
                  <span>{resolvedRegion}</span>
                </>
              )}
            </Badge>
          </div>

          <Badge
            variant={
              resolvedStatus === 'REGISTRATION' || resolvedStatus === 'OPEN'
                ? 'success'
                : resolvedStatus === 'ACTIVE' || resolvedStatus === 'IN_PROGRESS'
                ? 'copper'
                : 'secondary'
            }
          >
            {resolvedStatus.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div>
          <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
            {resolvedName}
          </CardTitle>
          {resolvedGameTitle && (
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block mt-1">
              {resolvedGameTitle}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/60 border border-border rounded-xl text-center text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Slots</span>
            <span className="font-mono font-bold text-foreground">
              {resolvedEnrolledCount > 0 ? `${resolvedEnrolledCount}/${resolvedSize}` : `${resolvedSize} Cap`}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Entry Fee</span>
            <span className="font-mono font-bold text-foreground">
              {resolvedEntryFee === 0 ? <span className="text-emerald-400">FREE</span> : formatEUR(resolvedEntryFee)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Prize Pool</span>
            <span className="font-mono font-bold text-primary">
              {resolvedPrizePool === 0 ? 'Trophies' : formatEUR(resolvedPrizePool)}
            </span>
          </div>
        </div>

        <Link href={`/tournaments/${resolvedId}`} className="block w-full">
          <Button variant="secondary" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            View Tournament Bracket
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
