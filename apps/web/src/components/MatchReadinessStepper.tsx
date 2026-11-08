'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Monitor, 
  Tv, 
  Smartphone, 
  Copy, 
  Check, 
  ShieldCheck, 
  Eye, 
  Sparkles,
  ChevronRight,
  Settings2,
  Play
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { useMachineStore, MachinePlatform, IngestMethod } from '../lib/useMachineStore';
import { useGameAccountsStore } from '../lib/gameAccountsStore';
import { findCatalogGame } from '../lib/gamesCatalog';
import { CrossmintLogo } from './CrossmintLogo';
import { GameplaySetupTutorialModal } from './GameplaySetupTutorialModal';

interface MatchReadinessStepperProps {
  matchId: string;
  gameId: string;
  gameName: string;
  gamePlatform: string;
  roomCode?: string | null;
  isHost: boolean;
  isParticipant: boolean;
  hasOpponent: boolean;
  isReady: boolean;
  opponentReady: boolean;
  isCapturing: boolean;
  onToggleReady: () => void;
  onStartCapture: () => void;
  onCopyRoomLink: () => void;
  copiedLink: boolean;
}

export function MatchReadinessStepper({
  matchId,
  gameId,
  gameName,
  gamePlatform,
  roomCode,
  isHost,
  isParticipant,
  hasOpponent,
  isReady,
  opponentReady,
  isCapturing,
  onToggleReady,
  onStartCapture,
  onCopyRoomLink,
  copiedLink,
}: MatchReadinessStepperProps) {
  const { hydrate, getActiveMachine, registerMachine, getSuggestedMachine } = useMachineStore();
  const { getGamertag, setGamertag, getGamertagLabel } = useGameAccountsStore();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [wizardPlatform, setWizardPlatform] = useState<MachinePlatform>(
    gamePlatform.toUpperCase().includes('CONSOLE') ? 'CONSOLE' : 'PC'
  );
  const [wizardMethod, setWizardMethod] = useState<IngestMethod>(
    gamePlatform.toUpperCase().includes('CONSOLE') ? 'REMOTE_PLAY' : 'WINDOW'
  );
  const [wizardName, setWizardName] = useState('');
  const [wizardGamertag, setWizardGamertag] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const activeMachine = getSuggestedMachine(gamePlatform) || getActiveMachine();
  const myGamertag = getGamertag(gameId);
  const tagLabel = getGamertagLabel(gameId);

  // Auto-fill wizard default on open
  const handleOpenWizard = () => {
    setWizardName(
      wizardPlatform === 'CONSOLE'
        ? 'PS5 / Xbox Console'
        : wizardPlatform === 'MOBILE'
        ? 'Mobile Gaming Device'
        : 'Primary PC Rig'
    );
    setWizardGamertag(myGamertag || '');
    setWizardOpen(true);
  };

  const handleSaveWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardGamertag.trim()) {
      setGamertag(gameId, wizardGamertag.trim());
    }
    registerMachine({
      name: wizardName.trim() || 'My Machine',
      platform: wizardPlatform,
      ingestMethod: wizardMethod,
      isDefault: true,
    });
    setWizardOpen(false);
  };

  const catalogGame = findCatalogGame(gameId);
  const isSoloGame = catalogGame?.gameType === 'HIGH_SCORE' || catalogGame?.gameType === 'LOW_TIME';

  // 4 Standardized Readiness Steps (Solo games like Subway Surfers bind to device session directly)
  const step1Done = Boolean(activeMachine && (isSoloGame || myGamertag));
  const step2Done = Boolean(hasOpponent);
  const step3Done = Boolean(isCapturing);
  const step4Done = Boolean(isReady && opponentReady);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-black text-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Autonomous Match Verification Stepper
            </h3>
            <p className="text-[11px] text-muted-foreground">
              4-step machine pairing and readiness check. Verified automatically before duel begins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTutorialOpen(true)}
            className="text-xs gap-1.5 h-8 font-bold border-primary/40 text-primary hover:bg-primary/10"
          >
            <Play className="w-3.5 h-3.5 fill-primary" />
            <span>Watch 14s Video Guide</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWizard}
            className="text-xs gap-1.5 h-8 font-mono"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{activeMachine ? 'Switch Machine' : 'Register Machine'}</span>
          </Button>
        </div>
      </div>

      {/* 4 Interactive Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Step 1: Machine & Gamertag */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            step1Done
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              Step 1 · Machine Sync
            </span>
            {step1Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-600" />
            )}
          </div>
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            {activeMachine?.platform === 'CONSOLE' ? (
              <Tv className="w-3.5 h-3.5 text-primary" />
            ) : activeMachine?.platform === 'MOBILE' ? (
              <Smartphone className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Monitor className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="truncate">{activeMachine?.name || 'No Machine Paired'}</span>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
            {myGamertag ? (
              <span className="text-emerald-400 font-bold">{myGamertag}</span>
            ) : isSoloGame ? (
              <span className="text-emerald-400/80 font-medium">Session Bound (Solo Duel)</span>
            ) : (
              <button
                onClick={handleOpenWizard}
                className="text-primary hover:underline font-bold"
              >
                + Set {tagLabel}
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Room Invite & Opponent */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            step2Done
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              Step 2 · Room Handshake
            </span>
            {step2Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-600" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-foreground">
              Code: <strong className="text-primary">{roomCode || 'LOBBY'}</strong>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCopyRoomLink}
              className="h-6 px-1.5 text-[10px] gap-1"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Copied' : 'Invite'}</span>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {hasOpponent ? '✓ Opponent present' : 'Waiting for challenger...'}
          </p>
        </div>

        {/* Step 3: Optical AI Sync */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            step3Done
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              Step 3 · Optical Sync
            </span>
            {step3Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Eye className="w-4 h-4 text-primary animate-pulse" />
            )}
          </div>
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${step3Done ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span>{step3Done ? 'Scorebug Locked' : 'HUD Ready'}</span>
          </div>
          <div className="mt-1">
            {step3Done ? (
              <span className="text-[10px] font-mono text-emerald-400 font-bold">● Streaming & verifying</span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={onStartCapture}
                className="h-6 px-2 text-[10px] font-bold w-full mt-0.5"
              >
                + Connect Screen
              </Button>
            )}
          </div>
        </div>

        {/* Step 4: Escrow & Ready Check */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            step4Done
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              Step 4 · Escrow & Ready
            </span>
            {step4Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <CrossmintLogo variant="icon" className="w-3.5 h-3.5" />
            <span>Smart Escrow Vault</span>
          </div>
          <div className="mt-1">
            <Button
              size="sm"
              variant={isReady ? 'outline' : 'default'}
              onClick={onToggleReady}
              disabled={!isParticipant}
              className="h-6 px-2 text-[10px] font-bold w-full mt-0.5"
            >
              {isReady ? '✓ Ready Confirmed' : 'Confirm Ready'}
            </Button>
          </div>
        </div>
      </div>

      {/* Guided "Register Machine / Device" Modal */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <span>Register Your Gaming Machine</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveWizard} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pair your machine once. Our visual engine remembers your capture feed and gamertag across all future duels.
            </p>

            {/* Platform Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Device Platform:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PC', label: 'PC Rig', icon: Monitor },
                  { id: 'CONSOLE', label: 'Console (PS5/Xbox)', icon: Tv },
                  { id: 'MOBILE', label: 'Mobile Device', icon: Smartphone },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setWizardPlatform(id as MachinePlatform);
                      setWizardMethod(id === 'CONSOLE' ? 'REMOTE_PLAY' : id === 'MOBILE' ? 'CAMERA' : 'WINDOW');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center text-xs transition ${
                      wizardPlatform === id
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingest Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Preferred Ingest Method:</label>
              <select
                value={wizardMethod}
                onChange={(e) => setWizardMethod(e.target.value as IngestMethod)}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground"
              >
                {wizardPlatform === 'CONSOLE' ? (
                  <>
                    <option value="REMOTE_PLAY">PlayStation Remote Play / Xbox App Window</option>
                    <option value="CAPTURE_CARD">HDMI Capture Card (Elgato / AVerMedia)</option>
                    <option value="STREAM">Twitch / YouTube Direct Console Broadcast</option>
                  </>
                ) : wizardPlatform === 'MOBILE' ? (
                  <>
                    <option value="CAMERA">Mobile Optical Camera (Pointed at TV Screen)</option>
                    <option value="WINDOW">Mobile Screen Broadcast (AirPlay / Screen Mirror)</option>
                  </>
                ) : (
                  <>
                    <option value="WINDOW">Direct PC Game Window Capture</option>
                    <option value="STREAM">OBS / Virtual Camera Loop</option>
                  </>
                )}
              </select>
            </div>

            {/* Machine Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Machine Nickname:</label>
              <Input
                type="text"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                placeholder="e.g. Living Room PS5 Pro"
                className="text-xs h-9"
                required
              />
            </div>

            {/* Remembered Gamertag */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                In-Game {tagLabel} (Remembered):
              </label>
              <Input
                type="text"
                value={wizardGamertag}
                onChange={(e) => setWizardGamertag(e.target.value)}
                placeholder={`e.g. ${wizardPlatform === 'CONSOLE' ? 'PSN_King99' : 'ProPlayer_USA'}`}
                className="text-xs h-9 font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Automatically pre-filled and verified during opponent gamertag binding checks.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setWizardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" className="font-bold">
                Save & Auto-Pair Machine
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 14s Gameplay & Machine Setup Tutorial Modal */}
      <GameplaySetupTutorialModal
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        initialTab="video"
      />
    </div>
  );
}
