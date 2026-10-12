'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Monitor,
  Coins,
  Copy,
  Check,
  Bell,
  Swords,
  Play,
  Square,
  ShieldCheck,
  AlertCircle,
  Gamepad2,
  Share2,
} from 'lucide-react';
import { useCapturePipeline as useMatchCapture } from '../hooks/useCapturePipeline';
import { LiveScore } from './LiveScore';
import { CountryFlag } from './CountryFlag';
import { GamePoster } from './GamePoster';
import { notifyUser, requestNotificationPermission } from '../lib/notifications';
import { useGameAccountsStore } from '../lib/gameAccountsStore';
import { getGameById } from '../lib/gamesCatalog';
import type { GameProfile } from '@playverzus/core';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';

interface MatchRoomProps {
  matchId: string;
  profile: GameProfile;
  playerAId: string;
  playerBId: string | null;
  currentUserId: string;
  status: string;
  roomCode?: string | null;
  playerAUsername?: string;
  playerACountry?: string;
  playerBUsername?: string;
  playerBCountry?: string;
}

export function MatchRoom({
  matchId,
  profile,
  playerAId,
  playerBId,
  currentUserId,
  status,
  roomCode,
  playerAUsername,
  playerACountry,
  playerBUsername,
  playerBCountry,
}: MatchRoomProps) {
  const catalogGame = getGameById(profile.id);
  const capture = useMatchCapture(matchId, profile);
  const { getGamertag, getGamertagLabel, setGamertag } = useGameAccountsStore();

  const isPlayerA = currentUserId === playerAId;
  const isPlayerB = currentUserId === playerBId;
  const isParticipant = isPlayerA || isPlayerB;

  const gameTagLabel = getGamertagLabel(profile.id);
  const myGamertag = getGamertag(profile.id);

  // Ready states
  const [isReadyA, setIsReadyA] = useState(false);
  const [isReadyB, setIsReadyB] = useState(false);
  const [coinResult, setCoinResult] = useState<'A' | 'B' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTagA, setCopiedTagA] = useState(false);
  const [copiedTagB, setCopiedTagB] = useState(false);

  // Edit gamertag inline
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState(myGamertag || '');

  // Pre-Match Permission Gate Modal
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [streamPlatform, setStreamPlatform] = useState<'TWITCH' | 'YOUTUBE'>('TWITCH');
  const [streamChannel, setStreamChannel] = useState(myGamertag || '');

  // Track state transitions for audio notifications
  const prevPlayerB = useRef(playerBId);
  const prevCaptureStatus = useRef(capture.status);

  // Check initial notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsGranted(Notification.permission === 'granted');
    }
  }, []);

  // 1. Notify on Opponent Join
  useEffect(() => {
    if (!prevPlayerB.current && playerBId) {
      notifyUser('Opponent Joined Arena!', {
        body: `Player #${playerBId.slice(0, 8)} has entered the match room. Get ready to duel!`,
        sound: 'connect',
        type: 'match',
      });
    }
    prevPlayerB.current = playerBId;
  }, [playerBId]);

  // 2. Notify on Screen Connected & Background Verification Active
  useEffect(() => {
    if (prevCaptureStatus.current !== 'CAPTURING' && capture.status === 'CAPTURING') {
      notifyUser('Game Window Connected!', {
        body: `${profile.displayName} window captured. Score verification is active in the background. Good luck!`,
        sound: 'connect',
      });
    }
    if (prevCaptureStatus.current !== 'ENDED' && capture.status === 'ENDED') {
      notifyUser('Match Concluded & Settled!', {
        body: 'Game outcome has been verified. Payouts and Elo standings updated!',
        sound: 'victory',
      });
    }
    prevCaptureStatus.current = capture.status;
  }, [capture.status, profile.displayName]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      notifyUser('Match Link Copied', { sound: 'score' });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyTag = (tag: string, side: 'A' | 'B') => {
    navigator.clipboard.writeText(tag);
    if (side === 'A') {
      setCopiedTagA(true);
      setTimeout(() => setCopiedTagA(false), 2000);
    } else {
      setCopiedTagB(true);
      setTimeout(() => setCopiedTagB(false), 2000);
    }
    notifyUser(`${gameTagLabel} Copied!`, {
      body: `"${tag}" copied to clipboard. Paste into your game friends list.`,
      sound: 'score',
    });
  };

  const handleSaveGamertag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    setGamertag(profile.id, tagInput.trim());
    setEditingTag(false);
    notifyUser(`${gameTagLabel} Saved`, { sound: 'score' });
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsGranted(granted);
    if (granted) {
      notifyUser('Notifications Enabled', {
        body: 'You will receive desktop alerts when opponents join or match outcomes finalize.',
        sound: 'connect',
      });
    }
  };

  const handleFlipCoin = () => {
    setIsFlipping(true);
    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'A' : 'B';
      setCoinResult(res);
      setIsFlipping(false);
      notifyUser('Coin Toss Result', {
        body: `Player ${res} won the toss for host/side selection!`,
        sound: 'score',
      });
    }, 1000);
  };

  const toggleReady = () => {
    // Before player marks ready, verify that game feed capture has been granted
    if (capture.status !== 'CAPTURING') {
      setPermissionsModalOpen(true);
      return;
    }

    if (isPlayerA) {
      const next = !isReadyA;
      setIsReadyA(next);
      if (next) notifyUser('Ready Status Confirmed', { sound: 'score' });
    } else {
      const next = !isReadyB;
      setIsReadyB(next);
      if (next) notifyUser('Ready Status Confirmed', { sound: 'score' });
    }
  };

  const playerATag = isPlayerA ? myGamertag || 'Unlinked Gamertag' : 'Host Player';
  const playerBTag = !isPlayerA && isParticipant ? myGamertag || 'Unlinked Gamertag' : 'Challenger';

  return (
    <div className="space-y-6 max-w-5xl mx-auto min-w-0 pb-16">
      {/* Optional Notification Opt-In Banner */}
      {!notificationsGranted && (
        <Card className="p-4 bg-muted/50 border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-foreground">
            <Bell className="w-4 h-4 text-primary" />
            <span>
              <strong>Enable Match Alerts:</strong> Receive audio & background notifications when your opponent joins or match finishes.
            </span>
          </div>
          <Button
            onClick={handleEnableNotifications}
            variant="default"
            size="sm"
            className="text-xs"
          >
            Enable Alerts
          </Button>
        </Card>
      )}

      {/* Top Header Matchroom Card */}
      <Card className="p-6 sm:p-8 border border-border bg-card shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <GamePoster
            game={catalogGame}
            aspect="thumb"
            className="w-14 h-18 sm:w-16 sm:h-22 rounded-xl shadow-xl border border-border flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">{profile.displayName}</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {profile.platform || 'UNIVERSAL'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Arena Matchroom #{matchId.slice(0, 8)}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Connect in-game via gamertags below, coin toss for side, and duel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
          {roomCode && (
            <div className="flex items-center gap-2 bg-muted border border-border px-3 py-1.5 rounded-lg text-xs">
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">Room:</span>
              <span className="font-mono font-bold text-foreground">{roomCode}</span>
              <button
                onClick={handleCopyLink}
                className="ml-1 text-primary hover:underline font-semibold"
              >
                {copiedLink ? 'Copied' : 'Share'}
              </button>
            </div>
          )}

          {/* Permissions Status Capsule */}
          {isParticipant && (
            <button
              type="button"
              onClick={() => setPermissionsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 border border-border text-xs transition"
              title="Click to check or update game feed and notification permissions"
            >
              <span className={`w-2 h-2 rounded-full ${capture.status === 'CAPTURING' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                Feed: <strong className="text-foreground">{capture.status === 'CAPTURING' ? 'LIVE' : 'SETUP'}</strong>
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase">
                Alerts: <strong className="text-foreground">{notificationsGranted ? 'ON' : 'OFF'}</strong>
              </span>
            </button>
          )}

          <Badge variant={capture.status === 'CAPTURING' ? 'success' : 'copper'} className="py-1 px-2.5 text-xs font-bold">
            {capture.status === 'CAPTURING' ? '● VERIFYING LIVE' : status}
          </Badge>
        </div>
      </Card>

      {/* Head-to-Head Competitor Roster with In-Game Gamertags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Side A (Host) */}
        <Card className="flex flex-col items-center md:items-start p-5 bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shadow-sm">
              A
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Host</span>
          </div>

          <div className="font-mono text-sm font-bold text-foreground flex items-center gap-2 max-w-[220px]">
            <CountryFlag
              code={playerACountry}
              fallbackSeed={playerAUsername || playerAId}
              size="sm"
            />
            <span className="truncate">
              {playerAUsername
                ? `@${playerAUsername}${isPlayerA ? ' (You)' : ''}`
                : isPlayerA
                ? 'You (@Host)'
                : `Player #${playerAId.slice(0, 8)}`}
            </span>
          </div>

          {/* Verified In-Game Gamertag */}
          <div className="mt-3 p-2.5 bg-muted/60 border border-border rounded-lg w-full flex items-center justify-between text-xs">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground font-bold uppercase">{gameTagLabel}</span>
              <span className="font-mono font-bold text-foreground truncate max-w-[120px]">{playerATag}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopyTag(playerATag, 'A')}
              className="h-7 px-2 text-[10px] gap-1"
            >
              {copiedTagA ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedTagA ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant={isReadyA ? 'success' : 'warning'}>
              {isReadyA ? '✓ READY' : '⏳ NOT READY'}
            </Badge>
            {coinResult === 'A' && (
              <Badge variant="copper">Host Pick</Badge>
            )}
          </div>
        </Card>

        {/* Center VS & Actions */}
        <div className="flex flex-col items-center justify-center text-center p-2">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-primary">
            VS
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">BEST OF 1 DUEL</div>

          {isParticipant && (
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[200px]">
              <Button
                onClick={toggleReady}
                variant={(isPlayerA ? isReadyA : isReadyB) ? 'outline' : 'default'}
                className="w-full text-xs font-bold"
              >
                {(isPlayerA ? isReadyA : isReadyB) ? '✓ Ready Confirmed' : 'Mark Ready'}
              </Button>

              <Button
                onClick={handleFlipCoin}
                disabled={isFlipping}
                variant="secondary"
                size="sm"
                className="w-full text-xs font-medium gap-1.5"
              >
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span>{isFlipping ? 'Flipping...' : 'Coin Toss'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Side B (Opponent) */}
        <Card className="flex flex-col items-center md:items-end p-5 bg-card border border-border text-right">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Challenger</span>
            <span className="w-6 h-6 rounded-md bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center shadow-sm">
              B
            </span>
          </div>

          <div className="font-mono text-sm font-bold text-foreground flex items-center gap-2 max-w-[220px]">
            {playerBId ? (
              <>
                <CountryFlag
                  code={playerBCountry}
                  fallbackSeed={playerBUsername || playerBId}
                  size="sm"
                />
                <span className="truncate">
                  {playerBUsername
                    ? `@${playerBUsername}${isPlayerB ? ' (You)' : ''}`
                    : !isPlayerA
                    ? 'You (@Challenger)'
                    : `Player #${playerBId.slice(0, 8)}`}
                </span>
              </>
            ) : (
              <span>Waiting for Opponent...</span>
            )}
          </div>

          {/* Opponent In-Game Gamertag */}
          <div className="mt-3 p-2.5 bg-muted/60 border border-border rounded-lg w-full flex items-center justify-between text-xs text-left">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopyTag(playerBTag, 'B')}
              className="h-7 px-2 text-[10px] gap-1"
            >
              {copiedTagB ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedTagB ? 'Copied' : 'Copy'}</span>
            </Button>
            <div className="flex flex-col text-right min-w-0">
              <span className="text-[9px] text-muted-foreground font-bold uppercase">{gameTagLabel}</span>
              <span className="font-mono font-bold text-foreground truncate max-w-[120px]">{playerBTag}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {coinResult === 'B' && (
              <Badge variant="copper">Host Pick</Badge>
            )}
            <Badge variant={playerBId ? (isReadyB ? 'success' : 'warning') : 'secondary'}>
              {playerBId ? (isReadyB ? '✓ READY' : '⏳ NOT READY') : 'VACANT'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Gamertag Setup Prompt */}
      {isParticipant && !myGamertag && !editingTag && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-amber-200">
            <Gamepad2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Link your {gameTagLabel}:</strong> Connect your in-game handle so your opponent can invite you to the match lobby.
            </span>
          </div>
          <Button
            onClick={() => setEditingTag(true)}
            variant="default"
            size="sm"
            className="text-xs"
          >
            + Set Handle
          </Button>
        </Card>
      )}

      {editingTag && (
        <form onSubmit={handleSaveGamertag} className="p-4 bg-card border border-border rounded-xl flex items-center gap-3 text-xs">
          <span className="text-foreground font-bold">{gameTagLabel}:</span>
          <Input
            type="text"
            placeholder="e.g. s1mple_pro"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="flex-1 font-mono h-9"
            autoFocus
          />
          <Button type="submit" variant="default" size="sm" className="h-9">
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTag(false)} className="h-9">
            Cancel
          </Button>
        </form>
      )}

      {/* Live Head-to-Head Scoreboard */}
      <LiveScore matchId={matchId} />

      {/* Seamless Background Verification */}
      {isParticipant && (
        <Card className="p-6 sm:p-8 space-y-4 border border-border bg-card shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${capture.status === 'CAPTURING' ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {capture.status === 'CAPTURING' ? 'Game Window Connected & Active' : 'Automatic Match Verification'}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {capture.status === 'CAPTURING'
                  ? 'All scores and victory conditions are automatically tracked in the background. Simply play your game.'
                  : 'Select your game window once. Results are verified automatically without any manual score entry.'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {capture.status === 'CAPTURING' ? (
                <Button
                  onClick={capture.stopCapture}
                  variant="destructive"
                  size="default"
                  className="gap-2 font-bold"
                >
                  <Square className="w-4 h-4" />
                  <span>Conclude & Settle</span>
                </Button>
              ) : (
                <Button
                  onClick={() => setPermissionsModalOpen(true)}
                  variant="default"
                  size="default"
                  className="gap-2 font-bold shadow-sm"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Connect Game Window</span>
                </Button>
              )}
            </div>
          </div>

          {/* Background Running Status Banner */}
          {capture.status === 'CAPTURING' && (
            <div className="p-3 bg-muted/60 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Anti-Cheat Verification Active
              </span>
              <span className="text-muted-foreground text-xs font-mono">
                {capture.lastScore ? `Live HUD: "${capture.lastScore}"` : 'Listening for match outcome...'}
              </span>
            </div>
          )}

          {capture.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl">
              {capture.error}
            </div>
          )}
        </Card>
      )}

      {/* Pre-Match Cross-Platform Permissions Setup Card (Inline page section, NO modal popups!) */}
      {permissionsModalOpen && (
        <Card className="p-6 bg-card border-primary/50 ring-1 ring-primary/30 space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Pre-Match Permissions & Optical Game Feed
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required for background victory detection and instant winner verification in {profile.displayName}.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPermissionsModalOpen(false)}
              className="text-xs font-bold"
            >
              Close Setup
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Video / Console Stream Capture */}
            <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  1. {profile.platform === 'CONSOLE' ? 'Console Stream / Optical Feed' : 'Optical Screen Feed'}
                </span>
                <Badge variant={capture.status === 'CAPTURING' ? 'success' : 'outline'}>
                  {capture.status === 'CAPTURING' ? 'Active ✓' : 'Required'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {profile.platform === 'CONSOLE'
                  ? 'Link your PS5/Xbox broadcast stream (Twitch/YouTube) or optical camera feed for zero-manual AI scoring.'
                  : 'Stream gameplay window to enable optical round detection and zero-screenshot scoring.'}
              </p>
              <Button
                variant={capture.status === 'CAPTURING' ? 'secondary' : 'default'}
                size="sm"
                onClick={capture.startCapture}
                disabled={capture.status === 'CAPTURING'}
                className="w-full text-xs font-bold"
              >
                {capture.status === 'CAPTURING'
                  ? 'Live Verification Active ✓'
                  : profile.platform === 'CONSOLE'
                  ? 'Start Optical / Companion Feed'
                  : 'Select Game Window'}
              </Button>

              {/* Console Broadcast Link (PS5 / Xbox Twitch & YouTube Ingest) */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono uppercase">
                  <span>PS5 / Xbox Broadcast Ingest</span>
                  <div className="flex gap-1">
                    {(['TWITCH', 'YOUTUBE'] as const).map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => setStreamPlatform(plat)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                          streamPlatform === plat
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    placeholder={`${streamPlatform === 'TWITCH' ? 'twitch_channel' : '@youtube_handle'}`}
                    value={streamChannel}
                    onChange={(e) => setStreamChannel(e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={capture.status === 'CAPTURING'}
                    onClick={() =>
                      capture.connectConsoleStream(
                        streamPlatform,
                        streamChannel.trim() || myGamertag || playerAUsername || 'console_pro',
                      )
                    }
                    className="h-8 text-[10px] font-bold px-2.5"
                  >
                    Link Stream
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Live Notifications */}
            <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">2. Match Alerts</span>
                <Badge variant={notificationsGranted ? 'success' : 'outline'}>
                  {notificationsGranted ? 'Granted ✓' : 'Recommended'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Receive browser audio and push alerts when rounds conclude or opponent submits.
              </p>
              <Button
                variant={notificationsGranted ? 'secondary' : 'default'}
                size="sm"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotificationsGranted(granted);
                }}
                disabled={notificationsGranted}
                className="w-full text-xs font-bold"
              >
                {notificationsGranted ? 'Notifications Active ✓' : 'Enable Alerts'}
              </Button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="default"
              size="default"
              onClick={() => {
                if (isPlayerA) setIsReadyA(true);
                else setIsReadyB(true);
                setPermissionsModalOpen(false);
                notifyUser('Permissions Verified & Ready!', { sound: 'score' });
              }}
              className="text-xs font-bold uppercase tracking-wider px-6"
            >
              Confirm Ready for Match →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
