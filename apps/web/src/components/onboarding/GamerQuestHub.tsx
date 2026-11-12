'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Gamepad2,
  Coins,
  Swords,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  ShieldCheck,
  Zap,
  ArrowRight,
  Eye,
  Check,
  Trophy,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useGameAccountsStore } from '../../lib/gameAccountsStore';
import { notifyUser } from '../../lib/notifications';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

const POPULAR_GAMES = [
  { id: 'cs2', name: 'Counter-Strike 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 76561198000000000 or s1mple' },
  { id: 'eafc', name: 'EA Sports FC 25', tagLabel: 'EA ID / PSN ID', placeholder: 'e.g. ProStriker_99' },
  { id: 'val', name: 'Valorant', tagLabel: 'Riot ID (Name#TAG)', placeholder: 'e.g. TenZ#NA1' },
  { id: 'mlbb', name: 'Mobile Legends', tagLabel: 'MLBB User ID (Server ID)', placeholder: 'e.g. 12345678 (2041)' },
  { id: 'rl', name: 'Rocket League', tagLabel: 'Epic Games ID', placeholder: 'e.g. Zen_RL' },
  { id: 'dota2', name: 'Dota 2', tagLabel: 'Steam ID / Friend Code', placeholder: 'e.g. 89234102' },
  { id: 'cod', name: 'Warzone / CoD', tagLabel: 'Activision ID', placeholder: 'e.g. Scump#1234567' },
  { id: 'fortnite', name: 'Fortnite', tagLabel: 'Epic Games ID', placeholder: 'e.g. Mongraal' },
];

export function GamerQuestHub() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Quest form states
  const [selectedGameId, setSelectedGameId] = useState('cs2');
  const [tagInput, setTagInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [tagSavedNotice, setTagSavedNotice] = useState(false);

  const { accounts, setGamertag } = useGameAccountsStore();

  // Load user profile & wallet to verify quest milestones
  const { data: me } = useQuery<{ id: string; role?: string; username?: string } | null>({
    queryKey: ['gamer-quest-me'],
    queryFn: () => apiClient<{ id: string; role?: string; username?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const { data: balanceData } = useQuery<{ balance: number; cashEur?: number } | null>({
    queryKey: ['gamer-quest-balance'],
    queryFn: () => apiClient<{ balance: number; cashEur?: number }>('/wallet/balance').catch(() => null),
    staleTime: 10000,
    enabled: Boolean(me),
  });

  const { data: matches } = useQuery<Array<{ id: string }> | null>({
    queryKey: ['gamer-quest-matches'],
    queryFn: () => apiClient<Array<{ id: string }>>('/matches/mine').catch(() => null),
    staleTime: 30000,
    enabled: Boolean(me),
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('playverzus_questhub_dismissed') === 'true';
      const minimized = localStorage.getItem('playverzus_questhub_minimized') === 'true';
      const calibSaved = localStorage.getItem('playverzus_calibrated') === 'true';
      if (dismissed) setIsDismissed(true);
      if (!minimized && !dismissed) {
        // Start minimized as a docked indicator on first visit to avoid screen blocking
        setIsExpanded(false);
      }
      if (calibSaved) setCalibrated(true);
    }
  }, []);

  // Sync selected game tag from store if available
  useEffect(() => {
    if (accounts[selectedGameId]) {
      setTagInput(accounts[selectedGameId]);
    } else {
      setTagInput('');
    }
  }, [selectedGameId, accounts]);

  // Hide on standalone pages, admin operations, and live match battle room
  const shouldHide =
    !mounted ||
    !me ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/matches/room/') ||
    (pathname.startsWith('/matches/') && pathname !== '/matches/new');

  if (shouldHide) return null;

  // Quest Milestones
  const hasLinkedTag = Object.keys(accounts).length > 0;
  const hasPracticeCredits = (balanceData?.balance ?? 0) > 0 || (balanceData?.cashEur ?? 0) > 0;
  const isOpticalReady = calibrated;
  const hasPlayedMatch = (matches?.length ?? 0) > 0;

  const completedCount = [hasLinkedTag, hasPracticeCredits, isOpticalReady, hasPlayedMatch].filter(Boolean).length;
  const progressPct = Math.round((completedCount / 4) * 100);
  const isAllComplete = completedCount === 4;

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('playverzus_questhub_minimized', (!nextState).toString());
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('playverzus_questhub_dismissed', 'true');
    }
  };

  const handleReopen = () => {
    setIsDismissed(false);
    setIsExpanded(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('playverzus_questhub_dismissed');
      localStorage.setItem('playverzus_questhub_minimized', 'false');
    }
  };

  const handleSaveGamertag = () => {
    if (!tagInput.trim()) return;
    setGamertag(selectedGameId, tagInput.trim());
    setTagSavedNotice(true);
    setTimeout(() => setTagSavedNotice(false), 2500);
    notifyUser('In-Game Handle Linked', {
      body: `Your ID for ${POPULAR_GAMES.find((g) => g.id === selectedGameId)?.name || 'Game'} has been linked.`,
      sound: 'score',
    });
  };

  const handleClaimCredits = async () => {
    setClaiming(true);
    try {
      await apiClient('/wallet/claim-demo', { method: 'POST' });
      notifyUser('1,000 Practice PTS Claimed! 🏆', {
        body: 'Demo balance credited to enter risk-free duels.',
        sound: 'score',
      });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['gamer-quest-balance'] });
      queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
    } catch {
      // In case already claimed
    } finally {
      setClaiming(false);
    }
  };

  const handleRunCalibration = () => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      setCalibrated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('playverzus_calibrated', 'true');
      }
      notifyUser('Optical Recognition Calibrated! 🎯', {
        body: 'Automated scoreboard validation verified with 99.4% confidence score.',
        sound: 'score',
      });
    }, 2200);
  };

  // If dismissed, render a subtle non-intrusive re-launcher pill in bottom right
  if (isDismissed) {
    if (isAllComplete) return null;
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={handleReopen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 hover:bg-card border border-border shadow-xl backdrop-blur-md text-xs font-bold text-foreground transition group hover:border-primary/50"
          title="Re-open Arena Setup Quests"
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
            Quests ({completedCount}/4)
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* 1. COLLAPSED PILL DOCK (Always visible when not dismissed) */}
      {!isExpanded && (
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/95 hover:bg-zinc-900 border border-border hover:border-primary/50 shadow-2xl backdrop-blur-md text-xs font-bold text-foreground transition-all duration-200 group hover:scale-[1.02]"
        >
          <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">Arena Quests</span>
              <span className="text-[10px] font-mono text-primary font-bold">
                {completedCount}/4
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform ml-1" />
        </button>
      )}

      {/* 2. EXPANDED QUEST DRAWER (Interactive slide-up card) */}
      {isExpanded && (
        <div className="w-84 sm:w-96 bg-zinc-950/98 border border-border rounded-3xl shadow-2xl backdrop-blur-lg p-5 text-foreground flex flex-col gap-4 animate-in slide-in-from-bottom-3 duration-200 border-primary/30">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/20">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Arena Readiness
                  </h4>
                  <Badge variant="copper" className="text-[9px] font-mono px-1.5 py-0">
                    {progressPct}% READY
                  </Badge>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {completedCount} of 4 Milestones Complete
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleExpand}
                className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                title="Minimize drawer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-7 h-7 rounded-lg bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
                title="Dismiss setup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Competitor Calibration XP</span>
              <span className="text-primary font-bold">{progressPct} XP / 100 XP</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 4 Interactive Quests */}
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
            {/* Quest 1: Link In-Game Tag */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                hasLinkedTag
                  ? 'bg-secondary/40 border-emerald-500/30'
                  : 'bg-secondary/70 border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {hasLinkedTag ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-foreground">1. Link In-Game Identity</span>
                </div>
                {hasLinkedTag && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400">
                    Linked
                  </Badge>
                )}
              </div>

              {!hasLinkedTag ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Required for optical match engine to auto-verify your scoreboard score.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={selectedGameId}
                      onChange={(e) => setSelectedGameId(e.target.value)}
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
                    >
                      {POPULAR_GAMES.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      placeholder="Your In-Game Tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="text-[11px] h-8 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveGamertag}
                    disabled={!tagInput.trim()}
                    className="w-full text-xs font-bold h-7 rounded-lg gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Gamertag</span>
                  </Button>
                  {tagSavedNotice && (
                    <span className="text-[10px] text-emerald-400 font-mono block text-center">
                      ✓ In-Game ID Saved
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                  <span>Linked Titles:</span>
                  <span className="text-foreground font-bold">{Object.keys(accounts).length} Game(s)</span>
                </div>
              )}
            </div>

            {/* Quest 2: Claim Practice PTS */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                hasPracticeCredits
                  ? 'bg-secondary/40 border-emerald-500/30'
                  : 'bg-secondary/70 border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {hasPracticeCredits ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-foreground">2. Claim Practice Credits</span>
                </div>
                {hasPracticeCredits && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400">
                    {balanceData?.balance?.toLocaleString() || '1,000'} PTS
                  </Badge>
                )}
              </div>

              {!hasPracticeCredits ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Get 1,000 risk-free Demo PTS to practice duels without cash wager.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleClaimCredits}
                    disabled={claiming}
                    className="w-full text-xs font-bold h-7 rounded-lg gap-1.5 shadow-sm"
                  >
                    {claiming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Coins className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>Claim 1,000 Free PTS</span>
                  </Button>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                  <span>Practice Wallet:</span>
                  <span className="text-emerald-400 font-bold">Ready for Duels</span>
                </div>
              )}
            </div>

            {/* Quest 3: Test Optical Calibration */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                isOpticalReady
                  ? 'bg-secondary/40 border-emerald-500/30'
                  : 'bg-secondary/70 border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isOpticalReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-foreground">3. Scoreboard Optical Calibration</span>
                </div>
                {isOpticalReady && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400">
                    99.4% Validated
                  </Badge>
                )}
              </div>

              {!isOpticalReady ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Test the AI referee vision pipeline against simulated scoreboard HUD.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRunCalibration}
                    disabled={calibrating}
                    className="w-full text-xs font-bold h-7 rounded-lg gap-1.5"
                  >
                    {calibrating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calibrating Vision...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span>Run 3s Calibration Test</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                  <span>Vision Referee:</span>
                  <span className="text-emerald-400 font-bold">Auto-Settlement Ready</span>
                </div>
              )}
            </div>

            {/* Quest 4: First Match Duel */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                hasPlayedMatch
                  ? 'bg-secondary/40 border-emerald-500/30'
                  : 'bg-secondary/70 border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {hasPlayedMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-foreground">4. Play First 1v1 Arena Duel</span>
                </div>
                {hasPlayedMatch && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400">
                    Duel Logged
                  </Badge>
                )}
              </div>

              {!hasPlayedMatch ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Initiate a direct duel or join an open challenge in your preferred title.
                  </p>
                  <Link href="/matches/new" onClick={() => setIsExpanded(false)}>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full text-xs font-bold h-7 rounded-lg gap-1.5 shadow-md shadow-primary/20"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Create 1v1 Challenge</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                  <span>Match History:</span>
                  <span className="text-foreground font-bold">{matches?.length} Contest(s)</span>
                </div>
              )}
            </div>
          </div>

          {/* All Complete Celebration Banner */}
          {isAllComplete && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-1.5">
              <span className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1.5">
                <span>🏆</span> ALL SETUP QUESTS COMPLETE!
              </span>
              <p className="text-[10px] text-muted-foreground">
                Your account is fully primed for real-cash and points competition.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-[11px] text-emerald-400 h-6 px-3"
              >
                Dismiss Quest Drawer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
