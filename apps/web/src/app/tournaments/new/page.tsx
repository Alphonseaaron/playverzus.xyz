'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { OFFICIAL_GAMES } from '../../../lib/gamesCatalog';
import type { GameProfile, TournamentFormat } from '@playverzus/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Trophy, Gamepad2, Users, Layers, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthGuard } from '../../../components/AuthGuard';
import Link from 'next/link';

interface FormatDetail {
  label: string;
  badge: string;
  description: string;
  bestFor: string;
  matchCount: string;
}

const TOURNAMENT_FORMATS: Record<TournamentFormat, FormatDetail> = {
  SINGLE_ELIM: {
    label: 'Single Elimination',
    badge: 'Knockout / Sudden Death',
    description:
      'Classic high-stakes bracket. Win and advance; lose a single match and you are eliminated. Highest adrenaline and fastest progression to the championship.',
    bestFor: 'Large fields (8 to 64 players), fast-paced cups, decisive spectator esports.',
    matchCount: 'N - 1 matches (e.g. 8 players = 7 total matches, 3 rounds)',
  },
  DOUBLE_ELIM: {
    label: 'Double Elimination',
    badge: 'Second Chance / EVO Style',
    description:
      'Two-tier bracket with Winners and Losers paths. Players must lose twice before elimination. The Losers bracket champion faces the undefeated Winners champion in Grand Finals.',
    bestFor: 'Fighting games, Rocket League, competitive fairness where one fluke loss does not end your run.',
    matchCount: 'Approx 2N - 1 matches (Grand Finals includes potential bracket reset)',
  },
  ROUND_ROBIN: {
    label: 'Round Robin',
    badge: 'League / All-Play-All',
    description:
      'Every participant plays a direct match against every other entrant. Placements are determined by total wins, head-to-head records, and cumulative score differential.',
    bestFor: 'Small groups (4 to 8 players), friend leagues, community nights with guaranteed play time for all.',
    matchCount: 'N × (N - 1) / 2 matches (e.g. 4 players = 6 matches, 8 players = 28 matches)',
  },
  SWISS: {
    label: 'Swiss System',
    badge: 'Skill-Paired / No Knockout',
    description:
      'Non-elimination format over set rounds. Each round, players are paired against opponents with identical match records (e.g., 2-0 vs 2-0). No one gets knocked out early.',
    bestFor: 'Chess, Card Games (TCGs), Major qualifiers, competitive rankings where everyone plays every round.',
    matchCount: 'Typically 3 to 5 rounds; everyone participates in all rounds',
  },
};

function NewTournamentContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('SINGLE_ELIM');
  const [size, setSize] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profiles } = useQuery<GameProfile[]>({
    queryKey: ['approved-profiles'],
    queryFn: () => apiClient<GameProfile[]>('/games').catch(() => []),
  });

  const officialIds = new Set(OFFICIAL_GAMES.map((g) => g.id.toLowerCase()));
  const customGames = (profiles || []).filter(
    (g) => !officialIds.has(g.id.toLowerCase())
  );
  const allAvailableGames = [...OFFICIAL_GAMES, ...customGames];

  const handleProfileChange = (selectedId: string) => {
    setProfileId(selectedId);
    const selected = allAvailableGames.find((p) => p.id === selectedId);
    if (selected) {
      const displayName = selected.displayName || (selected as any).display_name || 'Game';
      const formatLabel = TOURNAMENT_FORMATS[format].label;
      if (!name || name.includes('Tournament') || name.includes('Cup') || name.includes('Championship')) {
        setName(`${displayName} ${formatLabel} Championship`);
      }
    }
  };

  const handleFormatChange = (selectedFormat: TournamentFormat) => {
    setFormat(selectedFormat);
    const selected = profiles?.find((p) => p.id === profileId);
    if (selected && name.includes('Championship')) {
      const displayName = selected.displayName || (selected as any).display_name || 'Game';
      setName(`${displayName} ${TOURNAMENT_FORMATS[selectedFormat].label} Championship`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) {
      setError('Please select a game title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const t = await apiClient<{ id: string }>('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          profileId,
          format,
          size: Number(size),
        }),
      });

      router.push(`/tournaments/${t.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
    }
  };

  const currentFormatInfo = TOURNAMENT_FORMATS[format];

  return (
    <div className="max-w-2xl mx-auto my-6 space-y-6">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Tournaments</span>
      </Link>

      <Card className="bg-card border-border shadow-2xl">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper" className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Tournament Engine
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              COMMUNITY & PRO CUPS
            </Badge>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
            Create Tournament Cup
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure tournament structure, bracket elimination engine, entrant caps, and competitive format.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Game Profile Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground">Esports Game Arena</label>
                <span className="text-[11px] text-muted-foreground font-mono">Title & calibrated rules</span>
              </div>
              <select
                value={profileId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full h-10 px-3 bg-secondary/70 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary transition"
              >
                <option value="">Select a game arena...</option>
                {allAvailableGames.map((p) => {
                  const dName = p.displayName || (p as any).display_name || 'Game';
                  return (
                    <option key={p.id} value={p.id}>
                      {dName} ({p.platform || 'UNIVERSAL'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Tournament Name */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground">Tournament Title</label>
                <span className="text-[11px] text-muted-foreground font-mono">Public banner name</span>
              </div>
              <Input
                type="text"
                required
                placeholder="e.g. Genesis Weekly Cup #1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Tournament Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Tournament Format & Progression Rules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(TOURNAMENT_FORMATS) as TournamentFormat[]).map((fKey) => {
                  const item = TOURNAMENT_FORMATS[fKey];
                  const isSelected = format === fKey;
                  return (
                    <button
                      key={fKey}
                      type="button"
                      onClick={() => handleFormatChange(fKey)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-secondary/50 border-border hover:bg-secondary hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {item.label}
                        </span>
                        <Badge variant={isSelected ? 'copper' : 'secondary'} className="text-[9px] font-mono px-1 py-0">
                          {item.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format detail highlight card */}
            <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{currentFormatInfo.label} Breakdown</span>
              </div>
              <p className="text-muted-foreground text-[11px]">{currentFormatInfo.bestFor}</p>
              <div className="text-[10px] font-mono text-primary font-bold pt-1">
                Progression: {currentFormatInfo.matchCount}
              </div>
            </div>

            {/* Entrant Cap */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Player Capacity Cap
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 8, 16, 32].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold transition ${
                      size === s
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-secondary/50 border-border hover:bg-secondary text-foreground'
                    }`}
                  >
                    {s} Players
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="default"
              size="lg"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20"
            >
              {loading ? 'Creating Tournament...' : 'Confirm & Launch Tournament'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewTournamentPage() {
  return (
    <AuthGuard>
      <NewTournamentContent />
    </AuthGuard>
  );
}
