'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  Users,
  Trophy,
  ShieldCheck,
  Zap,
  Coins,
  ArrowRight,
  Gamepad2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { useGameStore } from '../../../lib/gameStore';
import { usePartyStore } from '../../../lib/partyStore';
import { formatEUR, formatPoints } from '../../../lib/currency';
import { CountrySelect } from '../../../components/CountrySelect';
import { AuthGuard } from '../../../components/AuthGuard';
import { OFFICIAL_GAMES, getGameById, findCatalogGame } from '../../../lib/gamesCatalog';
import { useWalletModeStore } from '../../../lib/walletModeStore';
import { useGameAccountsStore } from '../../../lib/gameAccountsStore';
import type { GameProfile, MatchFormat } from '@playverzus/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Separator } from '../../../components/ui/separator';

const STAKE_PRESETS_REAL = [0, 1, 2.5, 5, 10, 20];
const STAKE_PRESETS_DEMO = [0, 100, 250, 500, 1000, 2500];

function NewMatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultProfileId = searchParams.get('profileId') || searchParams.get('gameId') || '';

  const { activeGame, setActiveGameById } = useGameStore();
  const { members } = usePartyStore();
  const { mode: walletMode } = useWalletModeStore();
  const { getGamertag, getGamertagLabel, setGamertag } = useGameAccountsStore();

  const [profileId, setProfileId] = useState(defaultProfileId || activeGame?.id || 'cs2');
  const [format, setFormat] = useState<MatchFormat>('BO1');
  const [mode, setMode] = useState<'1v1' | 'PARTY'>(members.length > 1 ? 'PARTY' : '1v1');
  const [entryFee, setEntryFee] = useState<number>(0);
  const [customFee, setCustomFee] = useState<string>('');
  const [isCountryRestricted, setIsCountryRestricted] = useState(false);
  const [targetCountry, setTargetCountry] = useState<string>('');
  const [opponentId, setOpponentId] = useState('');
  const [gamertagInput, setGamertagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profiles } = useQuery<GameProfile[]>({
    queryKey: ['approved-profiles'],
    queryFn: () => apiClient<GameProfile[]>('/games').catch(() => []),
  });

  const { data: balanceData, refetch: refetchBalance } = useQuery<{
    balance: number;
    cashEur?: number;
    cashUsdc?: number;
  }>({
    queryKey: ['wallet-balance'],
    queryFn: () => apiClient('/wallet/balance'),
    staleTime: 10000,
  });

  const officialIds = new Set(OFFICIAL_GAMES.map((g) => g.id.toLowerCase()));
  const customGames = (profiles || []).filter(
    (g) => !officialIds.has(g.id.toLowerCase())
  );
  const allAvailableGames = [...OFFICIAL_GAMES, ...customGames];

  const selectedGame = allAvailableGames.find((g) => g.id.toLowerCase() === profileId.toLowerCase());
  const gameDisplayName = selectedGame?.displayName || (selectedGame as any)?.display_name || 'Selected Game';
  const currentGamertag = getGamertag(profileId);
  const tagLabel = getGamertagLabel(profileId);
  const hasLinkedTag = Boolean(currentGamertag?.trim());

  const effectiveFee = customFee !== '' ? Math.max(0, parseFloat(customFee) || 0) : entryFee;
  // Guaranteed prize pool with pre-disclosed 10% platform fee for peer-to-peer cash duels
  const prizePool = effectiveFee > 0 ? (effectiveFee * 2) * 0.90 : 0;

  const availableFunds = walletMode === 'REAL'
    ? (balanceData?.cashUsdc ?? balanceData?.cashEur ?? 0)
    : (balanceData?.balance ?? 0);
  const hasSufficientFunds = effectiveFee === 0 || availableFunds >= effectiveFee;

  const handleClaimFaucet = async () => {
    try {
      await apiClient('/wallet/claim-demo', { method: 'POST' });
      await refetchBalance();
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  // Sync with activeGame or default
  useEffect(() => {
    if (!profileId && activeGame?.id) {
      setProfileId(activeGame.id);
    }
  }, [profileId, activeGame]);

  const handleGameSelect = (id: string) => {
    setProfileId(id);
    setActiveGameById(id, allAvailableGames);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) {
      setError('Please select a game');
      return;
    }

    if (!hasLinkedTag) {
      setError(`Preset Condition Required: You must connect your ${tagLabel} for ${gameDisplayName} before initiating this match.`);
      return;
    }

    if (!hasSufficientFunds) {
      setError(`Preset Condition Required: Insufficient balance. Entry fee is ${effectiveFee}, available is ${availableFunds}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const match = await apiClient<{ id: string }>('/matches', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          opponentId: opponentId ? opponentId.trim() : null,
          format,
          entryFee: effectiveFee,
          mode,
          countryCode: isCountryRestricted ? targetCountry : null,
        }),
      });

      router.push(`/matches/${match.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto my-6 p-6 sm:p-8 border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-border">
        <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
          <Swords className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Create Arena Duel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Host a competitive duel or challenge with automated instant score verification.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-6">
        {/* Game Picker */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            1. Select Esports Title <span className="text-primary">*</span>
          </label>
          <select
            value={profileId}
            onChange={(e) => handleGameSelect(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition"
          >
            <option value="">Select a competitive game...</option>
            {allAvailableGames.map((p) => {
              const dName = p.displayName || (p as any).display_name || 'Game';
              const catalogItem = findCatalogGame(p.id) || findCatalogGame(p.displayName || (p as any).display_name) || getGameById(p.id);
              const icon = catalogItem?.icon || '🎮';
              return (
                <option key={p.id} value={p.id}>
                  {icon} {dName} ({p.platform || 'UNIVERSAL'})
                </option>
              );
            })}
          </select>

          {/* Preset Condition Check: Linked In-Game Gamertag */}
          <div className="mt-2.5">
            {hasLinkedTag ? (
              <div className="p-3 bg-secondary/50 border border-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-muted-foreground font-semibold">{tagLabel}:</span>
                  <span className="font-mono font-bold text-foreground truncate">{currentGamertag}</span>
                </div>
                <Badge variant="success" className="font-mono text-[9px] py-0 px-2 flex-shrink-0">
                  PRESET READY ✓
                </Badge>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Preset Condition: Connect Your {tagLabel}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Before initiating a duel in <strong>{gameDisplayName}</strong>, link your in-game handle so your opponent can invite you to the private lobby.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="text"
                    placeholder={`Enter your ${tagLabel}`}
                    value={gamertagInput}
                    onChange={(e) => setGamertagInput(e.target.value)}
                    className="h-8 text-xs font-mono flex-1 bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => {
                      if (gamertagInput.trim()) {
                        setGamertag(profileId, gamertagInput.trim());
                        setError(null);
                      }
                    }}
                    className="h-8 text-xs font-bold px-3"
                  >
                    Save Handle
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match Mode */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            2. Match Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('1v1')}
              className={`p-3 rounded-xl border text-left transition ${
                mode === '1v1'
                  ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                  : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-primary" />
                1v1 Solo Duel
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Head-to-head individual match</div>
            </button>

            <button
              type="button"
              onClick={() => setMode('PARTY')}
              className={`p-3 rounded-xl border text-left transition ${
                mode === 'PARTY'
                  ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                  : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Party vs Party
                {members.length > 1 && (
                  <Badge variant="default" className="text-[9px] px-1 py-0 ml-1">
                    {members.length} Squad
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Queue with current squad</div>
            </button>
          </div>
        </div>

        {/* Match Series Format */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            3. Series Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['BO1', 'BO3', 'BO5'] as MatchFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition ${
                  format === f
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Best of {f.replace('BO', '')}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {format === 'BO1' && 'Single game sudden-death duel. Winner takes matchroom victory.'}
            {format === 'BO3' && 'Best of 3 games. First player to 2 game wins claims victory.'}
            {format === 'BO5' && 'Championship format. First player to 3 game wins claims victory.'}
          </p>
        </div>

        {/* Entry Fee & Prize Pool */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-semibold text-foreground">
                4. Match Entry Fee
              </label>
              <Badge
                variant={walletMode === 'REAL' ? 'success' : 'secondary'}
                className="font-mono text-[10px]"
              >
                {walletMode === 'REAL' ? 'REAL CASH ($ USDC)' : 'DEMO PLAY (PTS)'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Guaranteed Prize:{' '}
              <strong className="text-primary font-mono">
                {prizePool > 0
                  ? walletMode === 'REAL'
                    ? formatEUR(prizePool)
                    : `${formatPoints(prizePool)} PTS`
                  : 'Free Glory'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(walletMode === 'REAL' ? STAKE_PRESETS_REAL : STAKE_PRESETS_DEMO).map((fee) => (
              <Button
                key={fee}
                type="button"
                variant={entryFee === fee && customFee === '' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => {
                  setEntryFee(fee);
                  setCustomFee('');
                }}
                className="font-mono text-xs"
              >
                {fee === 0
                  ? 'FREE'
                  : walletMode === 'REAL'
                  ? `$${fee}`
                  : `${fee} PTS`}
              </Button>
            ))}
          </div>

          {/* Preset Condition: Balance Check */}
          {!hasSufficientFunds && effectiveFee > 0 && (
            <div className="mt-2.5 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center justify-between gap-3 text-xs text-destructive">
              <span className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  Insufficient {walletMode === 'REAL' ? 'cash' : 'practice points'} ({availableFunds} available, {effectiveFee} required)
                </span>
              </span>
              {walletMode === 'DEMO' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClaimFaucet}
                  className="h-7 text-xs font-bold gap-1 flex-shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Claim +1,000 PTS</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => router.push('/cashier?tab=deposit')}
                  className="h-7 text-xs font-bold flex-shrink-0"
                >
                  Deposit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* FairPlay Guarantee Notice */}
        <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Automated Match Verification · 100% Anti-Cheat Escrow</span>
          </div>
          <span className="font-mono text-[10px]">Instant Settlement</span>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !hasLinkedTag || !hasSufficientFunds}
          className="w-full h-11 font-bold text-sm uppercase tracking-wider shadow-md gap-2"
        >
          <Swords className="w-4 h-4" />
          <span>
            {loading
              ? 'Creating Duel...'
              : !hasLinkedTag
              ? `Link ${tagLabel} to Continue`
              : !hasSufficientFunds
              ? 'Insufficient Balance'
              : 'Launch Matchroom'}
          </span>
        </Button>
      </form>
    </Card>
  );
}

export default function NewMatchPage() {
  return (
    <AuthGuard>
      <NewMatchForm />
    </AuthGuard>
  );
}
