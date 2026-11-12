'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  User,
  Globe,
  Gamepad2,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Coins,
  Monitor,
  Smartphone,
  Eye,
  Check,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { CountryFlag } from '../CountryFlag';
import { useGameAccountsStore } from '../../lib/gameAccountsStore';
import { apiClient } from '../../lib/api';
import { notifyUser } from '../../lib/notifications';

interface FirstTimeOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
  initialCountry?: string;
  onComplete?: () => void;
}

const POPULAR_GAMES = [
  { id: 'cs2', name: 'Counter-Strike 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 76561198000000000 or s1mple' },
  { id: 'eafc', name: 'EA Sports FC 25', tagLabel: 'EA ID / PSN ID', placeholder: 'e.g. ProStriker_99' },
  { id: 'val', name: 'Valorant', tagLabel: 'Riot ID (Name#TAG)', placeholder: 'e.g. TenZ#NA1' },
  { id: 'mlbb', name: 'Mobile Legends', tagLabel: 'MLBB User ID (Server ID)', placeholder: 'e.g. 12345678 (2041)' },
  { id: 'rl', name: 'Rocket League', tagLabel: 'Epic Games ID', placeholder: 'e.g. Zen_RL' },
  { id: 'dota2', name: 'Dota 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 89234102' },
  { id: 'cod', name: 'Warzone / CoD', tagLabel: 'Activision ID (Name#1234)', placeholder: 'e.g. Scump#1234567' },
  { id: 'fortnite', name: 'Fortnite', tagLabel: 'Epic Games ID', placeholder: 'e.g. Mongraal' },
];

const REGIONS = [
  { code: 'US', name: 'United States (NA East/West)' },
  { code: 'GB', name: 'United Kingdom (Europe)' },
  { code: 'DE', name: 'Germany (Central Europe)' },
  { code: 'FR', name: 'France (West Europe)' },
  { code: 'BR', name: 'Brazil (South America)' },
  { code: 'JP', name: 'Japan (Asia Pacific)' },
  { code: 'KR', name: 'South Korea (East Asia)' },
  { code: 'SG', name: 'Singapore (Southeast Asia)' },
  { code: 'AU', name: 'Australia (Oceania)' },
  { code: 'KE', name: 'Kenya (Africa East)' },
  { code: 'NG', name: 'Nigeria (Africa West)' },
  { code: 'ZA', name: 'South Africa (Africa South)' },
];

export function FirstTimeOnboardingModal({
  open,
  onOpenChange,
  username = 'Competitor',
  initialCountry = 'US',
  onComplete,
}: FirstTimeOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedGameId, setSelectedGameId] = useState('cs2');
  const [gamertagInput, setGamertagInput] = useState('');
  const [claimedBonus, setClaimedBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);

  const { getGamertag, setGamertag, accounts } = useGameAccountsStore();

  const handleSaveGamertag = (gameId: string, tag: string) => {
    if (!tag.trim()) return;
    setGamertag(gameId, tag.trim());
    notifyUser('In-Game Handle Linked', {
      body: `Your handle for this title has been saved.`,
      sound: 'score',
    });
  };

  const handleClaimBonus = async () => {
    setClaimingBonus(true);
    try {
      await apiClient('/wallet/claim-demo', { method: 'POST' });
      setClaimedBonus(true);
      notifyUser('1,000 Practice Credits Added! 🏆', {
        body: 'You now have 1,000 PTS to duel in risk-free practice matches.',
        sound: 'score',
      });
    } catch {
      // In case already claimed
      setClaimedBonus(true);
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleRunCalibration = () => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrated(true);
      notifyUser('Optical Engine Calibrated! 🎯', {
        body: 'Simulated game scoreboard verified with 99.4% confidence. Match settlement unlocked.',
        sound: 'score',
      });
    }, 1800);
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('playverzus_onboarding_completed', 'true');
      } catch {}
    }
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-md">
                PV
              </span>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                  Competitor Onboarding & Arena Setup
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete these 4 rapid steps to get match-ready on Playverzus.
                </p>
              </div>
            </div>

            <Badge variant="copper" className="font-mono text-xs px-2.5 py-1">
              Step {step} of 4
            </Badge>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: COMPETITIVE IDENTITY & REGION */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <User className="w-4 h-4" />
                  <span>Your Playverzus Account: @{username}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your Playverzus username is your overall competitive profile across all tournaments.
                  In the next step, you will link your game-specific IDs (such as Riot ID, PSN, or Steam) so opponents can invite you to lobbies.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>Select Your Primary Matchmaking Region</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Helps our matchmaking engine pair you with nearby competitors for the lowest possible latency.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {REGIONS.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setSelectedCountry(r.code)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                        selectedCountry === r.code
                          ? 'bg-primary/15 border-primary ring-1 ring-primary/40 text-foreground font-bold'
                          : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <CountryFlag code={r.code} size="sm" />
                      <span className="text-xs truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IN-GAME GAMERTAG LINKAGE */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-muted/60 border border-border rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                  <span>Connect Your In-Game Handles</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Opponents need your in-game handle to invite you to private duels and lobbies.
                  Select the titles you play and enter your exact in-game ID.
                </p>
              </div>

              {/* Game Selector Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Select Game to Link:</label>
                <div className="flex gap-2 flex-wrap">
                  {POPULAR_GAMES.map((g) => {
                    const existing = accounts[g.id] || getGamertag(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGameId(g.id);
                          setGamertagInput(existing || '');
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                          selectedGameId === g.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-secondary border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{g.name}</span>
                        {existing && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input for Selected Game */}
              {(() => {
                const active = POPULAR_GAMES.find((g) => g.id === selectedGameId)!;
                const existing = accounts[active.id] || getGamertag(active.id);
                return (
                  <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{active.tagLabel}</span>
                      {existing && (
                        <Badge variant="success" className="font-mono text-[10px] py-0 px-2">
                          LINKED: {existing}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder={active.placeholder}
                        value={gamertagInput}
                        onChange={(e) => setGamertagInput(e.target.value)}
                        className="h-10 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => handleSaveGamertag(active.id, gamertagInput)}
                        className="h-10 px-4 text-xs font-bold"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Format tip: For Riot games use Name#Tag (e.g. Player#EUW). For Steam use your Friend Code or Custom URL.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 3: WALLET & 100% SKILL DUEL PRIMER */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary border border-border space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>100% Skill, Zero Gambling</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Playverzus has no house odds or games of chance. Outcome is determined entirely by in-game skill, scored by autonomous optical anti-cheat.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary border border-border space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wide">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Instant Escrow Payouts</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Stakes are locked in escrow when the match starts. The winner is paid out within 2 seconds of the victory screen, with zero manual disputes.
                  </p>
                </div>
              </div>

              {/* Free 1,000 Practice Points Claim */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary border border-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Welcome Practice Grant</h4>
                      <p className="text-xs text-muted-foreground">
                        Claim 1,000 Free Practice Credits (PTS) to try free duels.
                      </p>
                    </div>
                  </div>

                  <Badge variant={claimedBonus ? 'success' : 'copper'} className="py-1 px-2 text-xs">
                    {claimedBonus ? '1,000 PTS Claimed ✓' : '+1,000 PTS'}
                  </Badge>
                </div>

                <Button
                  onClick={handleClaimBonus}
                  disabled={claimedBonus || claimingBonus}
                  variant="default"
                  className="w-full text-xs font-bold gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{claimedBonus ? 'Practice Bonus Credited ✓' : claimingBonus ? 'Claiming Funds...' : 'Claim 1,000 Practice Credits'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: INTERACTIVE OPTICAL CALIBRATION DRY-RUN */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-muted/60 border border-border rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Optical Anti-Cheat Calibration Dry-Run</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Test our optical verification engine before your first duel. Run this quick scan over a simulated in-game HUD to see how auto-settlement works.
                </p>
              </div>

              {/* Simulated In-Game HUD Card */}
              <div className="relative rounded-xl overflow-hidden border border-border bg-zinc-950 p-6 text-center space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    SIMULATED GAME SCREEN · EA SPORTS FC 25
                  </span>
                  <Badge variant="outline" className="font-mono text-[9px] text-zinc-400 border-zinc-700">
                    90:00 FULL TIME
                  </Badge>
                </div>

                {/* Scoreboard Mock */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-right">
                    <span className="text-xs font-mono text-zinc-400 block">YOU</span>
                    <span className="text-3xl font-black text-foreground">3</span>
                  </div>
                  <div className="text-xl font-mono font-black text-primary">-</div>
                  <div className="text-left">
                    <span className="text-xs font-mono text-zinc-400 block">CHALLENGER</span>
                    <span className="text-3xl font-black text-foreground">1</span>
                  </div>
                </div>

                <div className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  VICTORY FULL TIME
                </div>

                {/* Calibration Trigger / Result */}
                <div className="pt-2">
                  {calibrated ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>VERIFIED: "3 - 1 VICTORY FULL TIME"</span>
                      </span>
                      <Badge variant="success" className="font-mono text-[9px]">
                        99.4% CONFIDENCE
                      </Badge>
                    </div>
                  ) : (
                    <Button
                      onClick={handleRunCalibration}
                      disabled={calibrating}
                      variant="default"
                      size="sm"
                      className="text-xs font-bold gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{calibrating ? 'Scanning HUD Zones...' : 'Run Optical Calibration Scan'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {calibrated && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-center text-xs text-foreground font-semibold">
                  🎉 System Calibrated! Your account is primed for automated match verification.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 pt-4 border-t border-border bg-muted/20 flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="text-xs font-bold gap-1.5 px-5 shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleFinish}
              className="text-xs font-bold uppercase tracking-wider px-6 shadow-md shadow-primary/20"
            >
              <span>Enter Arena Dashboard →</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
