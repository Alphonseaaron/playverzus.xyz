'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Monitor,
  Gamepad2,
  Smartphone,
  Eye,
  Bell,
  Coins,
  CheckCircle2,
  Copy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Clock,
  Trophy,
  Wifi,
  ChevronRight,
  ExternalLink,
  Play,
} from 'lucide-react';
import { CrossmintLogo } from './CrossmintLogo';

interface GameplaySetupTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'video' | 'machine' | 'lobby' | 'vision' | 'notifications';
}

interface ToastNotification {
  id: string;
  type: 'tournament' | 'machine' | 'vision' | 'goal' | 'settlement';
  title: string;
  body: string;
  time: string;
  badge: string;
  icon: string;
  action?: string;
}

export function GameplaySetupTutorialModal({
  open,
  onOpenChange,
  initialTab = 'video',
}: GameplaySetupTutorialModalProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'machine' | 'lobby' | 'vision' | 'notifications'>(initialTab);
  const [activePlatform, setActivePlatform] = useState<'CONSOLE' | 'PC' | 'MOBILE'>('CONSOLE');
  const [simulatedToasts, setSimulatedToasts] = useState<ToastNotification[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Trigger simulated live toast
  const triggerToast = (type: ToastNotification['type']) => {
    const toastConfigs: Record<ToastNotification['type'], ToastNotification> = {
      tournament: {
        id: Math.random().toString(),
        type: 'tournament',
        title: '⚔️ Tournament Round Ready — Check In',
        body: 'You have been paired against @ApexStriker in EA FC 27 Champions Cup! Check-in required within 3:00 to avoid auto-forfeit.',
        time: 'Just now',
        badge: 'TOURNAMENT LOBBY',
        icon: '🏆',
        action: 'Check In Now',
      },
      machine: {
        id: Math.random().toString(),
        type: 'machine',
        title: '🎮 Machine Feed Verified (1080p60)',
        body: 'PlayStation 5 Remote Play stream connected with 14ms latency. Audio and frame buffer synced.',
        time: 'Just now',
        badge: 'MACHINE PAIRED',
        icon: '🖥️',
      },
      vision: {
        id: Math.random().toString(),
        type: 'vision',
        title: '🎯 AI Vision Engine Synced',
        body: 'EA Sports FC 27 HUD locked! Score bug at Top-Left & Game Clock detected with 99.1% neural confidence.',
        time: 'Just now',
        badge: 'NEURAL LOCK',
        icon: '👁️',
      },
      goal: {
        id: Math.random().toString(),
        type: 'goal',
        title: '⚽ GOAL DETECTED! (34\')',
        body: 'PlayerOne scores! Real-time scoreboard updated: [FCB 1 - 0 RMA]. Matchroom state synced for spectators.',
        time: 'Just now',
        badge: 'LIVE SCORE',
        icon: '⚽',
      },
      settlement: {
        id: Math.random().toString(),
        type: 'settlement',
        title: '💰 Match Settled — Instant Payout',
        body: 'Final whistle verified: 2 - 1. Payout of $20.00 USDC automatically credited to your Crossmint Embedded Wallet.',
        time: 'Just now',
        badge: 'ESCROW RELEASED',
        icon: '💎',
        action: 'View Wallet',
      },
    };

    const newToast = toastConfigs[type];
    setSimulatedToasts((prev) => [newToast, ...prev.slice(0, 2)]);
  };

  const removeToast = (id: string) => {
    setSimulatedToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCopyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-background via-muted/40 to-background border-b border-border sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                  Player Setup & Live Gameplay Tutorial
                  <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-primary/20 text-primary">
                    Dual-Side Sync
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How auto-machine registration, gamertags, AI visual refereeing, and automated wallet payouts work
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-b border-border/60 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'video'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              🎬 14s Walkthrough Video
            </button>
            <button
              onClick={() => setActiveTab('machine')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'machine'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              1. Machine Registration
            </button>
            <button
              onClick={() => setActiveTab('lobby')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'lobby'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              2. Gamertags & Lobby Code
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'vision'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Eye className="w-4 h-4" />
              3. AI Gameplay Vision Sync
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              4. Notifications & Wallets
            </button>
          </div>
        </div>

        {/* Tab 0: 14s Walkthrough Video */}
        {activeTab === 'video' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>🎬</span> 14-Second Video Walkthrough (Real Gameplay & Live Toasts)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Experience how the AI Vision Engine detects the score bug in real-time, validates live goals, and releases Crossmint wallet payouts with zero human referees.
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5 shrink-0">
                <Zap className="w-3.5 h-3.5" />
                Zero-Slides Policy
              </div>
            </div>

            {/* Video Player */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-2xl bg-black aspect-video max-h-[480px]">
              <video
                src="/fc27_tutorial_walkthrough.mp4"
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Step-by-Step Milestones in the Video */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                <div className="font-mono text-xs font-bold text-blue-400">0:00 — STEP 1</div>
                <div className="font-bold text-xs text-foreground">Machine & Lobby</div>
                <p className="text-[12px] text-muted-foreground">PS5 Broadcast / Remote Play paired. Code FC27-8821 synced.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                <div className="font-mono text-xs font-bold text-emerald-400">0:04 — STEP 2</div>
                <div className="font-bold text-xs text-foreground">Score Bug Auto-Locked</div>
                <p className="text-[12px] text-muted-foreground">Neural OCR locks Top-Left HUD: [FCB 1 - 0 RMA | 34:12].</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                <div className="font-mono text-xs font-bold text-amber-400">0:07 — STEP 3</div>
                <div className="font-bold text-xs text-foreground">Goal Detected Toast</div>
                <p className="text-[12px] text-muted-foreground">Real-time matchroom score update & anti-tamper check.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                <div className="font-mono text-xs font-bold text-purple-400">0:11 — STEP 4</div>
                <div className="font-bold text-xs text-foreground">Instant Wallet Payout</div>
                <p className="text-[12px] text-muted-foreground">Whistle blows &rarr; +$20 USDC deposited to Crossmint wallet.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('machine')}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
              >
                Explore Step 1: Machine Registration
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Machine Registration */}
        {activeTab === 'machine' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">One-Time Machine Registration</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You configure your gaming device once. PlayVerzus remembers it forever so you never have to pair again.
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Auto-Remembered
              </div>
            </div>

            {/* Platform Selector */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActivePlatform('CONSOLE')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                  activePlatform === 'CONSOLE'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-muted-foreground/40'
                }`}
              >
                <Gamepad2 className={`w-6 h-6 ${activePlatform === 'CONSOLE' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className="font-bold text-sm text-foreground">Console (PS5 / Xbox)</div>
                  <div className="text-xs text-muted-foreground">Remote Play or Capture Card</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('PC')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                  activePlatform === 'PC'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-muted-foreground/40'
                }`}
              >
                <Monitor className={`w-6 h-6 ${activePlatform === 'PC' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className="font-bold text-sm text-foreground">PC Rig</div>
                  <div className="text-xs text-muted-foreground">Game Window / OBS Virtual Cam</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('MOBILE')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                  activePlatform === 'MOBILE'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-muted-foreground/40'
                }`}
              >
                <Smartphone className={`w-6 h-6 ${activePlatform === 'MOBILE' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className="font-bold text-sm text-foreground">Mobile Device</div>
                  <div className="text-xs text-muted-foreground">Screen Mirror / Phone Stand</div>
                </div>
              </button>
            </div>

            {/* Platform Walkthrough Details */}
            <div className="p-5 rounded-xl border border-border bg-background/50 space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Zap className="w-4 h-4 text-primary" />
                How to connect {activePlatform === 'CONSOLE' ? 'PlayStation / Xbox' : activePlatform === 'PC' ? 'PC Gaming Rig' : 'Mobile Gaming'}:
              </div>

              {activePlatform === 'CONSOLE' && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-xs">OPTION A</span>
                      PS5 Native Broadcast (No PC or Capture Card Required)
                    </div>
                    <div className="text-xs space-y-1.5 leading-relaxed">
                      <div>• <strong>DualSense Create Button:</strong> Press the <code className="px-1 py-0.5 bg-muted rounded font-mono text-[11px] text-foreground">Create</code> button (left of the touchpad) while playing EA FC 27.</div>
                      <div>• <strong>Select Broadcast:</strong> Tap <strong className="text-foreground">Broadcast</strong>, choose your linked YouTube or Twitch account (can be set to <em>Unlisted</em>).</div>
                      <div>• <strong>PS5 Settings Quality Check:</strong> In PS5 <code className="px-1 py-0.5 bg-muted rounded font-mono text-[11px] text-foreground">Settings &gt; Captures &amp; Broadcasts &gt; Broadcasts &gt; Video Quality</code>, ensure it is set to <strong>1080p 60 fps</strong>.</div>
                      <div>• <strong>Auto-Pair:</strong> PlayVerzus ingests the live stream feed directly without adding any input lag to your controller!</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">OPTION B</span>
                      Sony PS Remote Play (Free Laptop / PC Window Ingest)
                    </div>
                    <div className="text-xs space-y-1.5 leading-relaxed">
                      <div>• Launch the free <strong>PS Remote Play</strong> app on your laptop or PC connected to your home Wi-Fi.</div>
                      <div>• In PlayVerzus, click <span className="text-primary font-bold">Start Capture</span> and select the PS Remote Play window. Zero latency and instant OCR lock.</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs">OPTION C</span>
                      HDMI Capture Card (Elgato / AverMedia / Cam Link)
                    </div>
                    <div className="text-xs space-y-1.5 leading-relaxed">
                      <div>• Plug your console HDMI into an Elgato USB capture card.</div>
                      <div>• PlayVerzus selects the USB Video Capture input directly as your verified stream feed.</div>
                    </div>
                  </div>
                </div>
              )}

              {activePlatform === 'PC' && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                    <div>
                      <strong className="text-foreground">Launch Your Game:</strong> Open EA Sports FC 27 (or any PC game) on Steam, EA App, or Epic Games.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                    <div>
                      <strong className="text-foreground">Select Game Window:</strong> In PlayVerzus, select the game window directly or route through OBS Virtual Camera.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                    <div>
                      <strong className="text-foreground">Instant Sync:</strong> Our neural OCR automatically recognizes the in-game scoreboard without interrupting your FPS.
                    </div>
                  </div>
                </div>
              )}

              {activePlatform === 'MOBILE' && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                    <div>
                      <strong className="text-foreground">Screen Mirroring:</strong> Use AirPlay, scrcpy, or Chromecast to cast your phone screen directly into your browser.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                    <div>
                      <strong className="text-foreground">Direct Camera Option:</strong> Point a phone camera stand at your device screen if you are playing in an esports lounge or LAN cafe.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('lobby')}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
              >
                Next: Gamertags & Lobby Code
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Gamertags & Lobby Code */}
        {activeTab === 'lobby' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">In-Game Gamertags & Lobby Codes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  How competitors find each other in EA Sports FC 27 and join the exact match room.
                </p>
              </div>
            </div>

            {/* Visual Walkthrough of Match Coordination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host Card */}
              <div className="p-5 rounded-xl border border-primary/40 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-primary/20 text-primary">
                    SIDE A (HOST)
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">EA ID: PlayerOne_EA</span>
                </div>
                <div className="text-sm text-foreground font-medium">
                  The host launches EA Sports FC 27, creates a <strong>Friendly / Online Seasons Lobby</strong>, and copies the 6-character room code:
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div className="font-mono text-base font-black tracking-widest text-primary">
                    FC27-8821
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1 rounded-md text-xs font-bold bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 transition"
                  >
                    {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  The code is automatically shared across both players' screens via WebSockets.
                </div>
              </div>

              {/* Challenger Card */}
              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-muted text-muted-foreground">
                    SIDE B (CHALLENGER)
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">EA ID: ApexStriker_99</span>
                </div>
                <div className="text-sm text-foreground font-medium">
                  The challenger clicks <strong>Copy Code</strong> in PlayVerzus, opens EA FC 27, and pastes it into the in-game invite field.
                </div>
                <div className="p-3 rounded-lg bg-card border border-border flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Gamertag Cross-Check:</strong> PlayVerzus displays both verified gamertags to guarantee you are playing against the real opponent.
                  </div>
                </div>
              </div>
            </div>

            {/* In-Game Menu Preview */}
            <div className="p-4 rounded-xl border border-border bg-background space-y-3">
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-primary" />
                In-Game Lineup & Kickoff Match Preview (Real EA FC 27 Screenshot):
              </div>
              <div className="relative rounded-lg overflow-hidden border border-border max-h-56">
                <img
                  src="/fc27_ps5_match_preview_lineup.jpg"
                  alt="EA FC 27 Match Preview Lineup"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute bottom-2 left-2 px-3 py-1 rounded-md bg-black/80 backdrop-blur-md text-[12px] text-white font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  In-Game Match Ready: Real-time opponent verified
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveTab('machine')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to Machine Registration
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vision')}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
              >
                Next: AI Gameplay Vision Sync
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: AI Gameplay Vision Sync */}
        {activeTab === 'vision' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">AI Vision Engine: Real-Time Gameplay Tracking</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Using gameplay footage as our direct shortcut: Zero manual referees, instant score recognition, and tamper-proof verification.
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Pre-Calibrated (Zero Config)
              </div>
            </div>

            {/* Real Gameplay Footage with Neural Score Bug Overlay */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-2xl bg-black">
              <img
                src="/fc27_ps5_in_game_scorebug.jpg"
                alt="EA FC 27 In-Game Gameplay Scorebug"
                className="w-full h-auto object-cover"
              />

              {/* Simulated Neural Bounding Box around Score Bug */}
              <div className="absolute top-4 left-6 border-2 border-emerald-400 bg-emerald-500/20 rounded-lg p-2.5 backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.5)] flex flex-col gap-1 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs font-black text-white tracking-wider">
                    ROI-1: SCOREBUG [FCB 1 - 0 RMA]
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] font-mono text-emerald-200">
                  <span>Clock: 34:12</span>
                  <span>OCR: 99.4%</span>
                  <span>State: ACTIVE_PLAY</span>
                </div>
              </div>

              {/* Live Status Pill at Bottom */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Vision Engine: Tracking Live PS5 Gameplay Stream
                </div>
                <div className="flex items-center gap-2 font-mono text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  1080p60 · Latency: 12ms · Zero Manual Admin
                </div>
              </div>
            </div>

            {/* Explanatory Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Score Bug Detection
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extracts Home vs Away scores directly from the top-left HUD frame every second.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  Match Clock & Whistles
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Monitors half-time, extra-time, and final full-time whistle screens for instant match ending.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Anti-Cheat Protection
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verifies continuous video timestamps to prevent paused screens, replayed VODs, or score tampering.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveTab('lobby')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to Gamertags & Lobby
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
              >
                Next: Live Notifications & Wallets
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Notifications & Wallets */}
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">Interactive Notification Simulator</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the buttons below to test how each notification appears on screen during a match or tournament!
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CrossmintLogo className="w-3.5 h-3.5" />
                Crossmint Auto-Settlement
              </div>
            </div>

            {/* Notification Trigger Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => triggerToast('tournament')}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-primary/60 text-left transition flex flex-col gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🏆</span>
                  <span className="text-[12px] font-bold text-primary font-mono">SIMULATE</span>
                </div>
                <div className="font-bold text-xs text-foreground">1. Opponent Check-In</div>
                <div className="text-[12px] text-muted-foreground">Tournament pairing alert & 3-min timer</div>
              </button>

              <button
                type="button"
                onClick={() => triggerToast('machine')}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-primary/60 text-left transition flex flex-col gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🖥️</span>
                  <span className="text-[12px] font-bold text-primary font-mono">SIMULATE</span>
                </div>
                <div className="font-bold text-xs text-foreground">2. Machine Feed Synced</div>
                <div className="text-[12px] text-muted-foreground">PS5 / PC feed verified at 1080p60</div>
              </button>

              <button
                type="button"
                onClick={() => triggerToast('vision')}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-primary/60 text-left transition flex flex-col gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">🎯</span>
                  <span className="text-[12px] font-bold text-primary font-mono">SIMULATE</span>
                </div>
                <div className="font-bold text-xs text-foreground">3. AI Vision Locked</div>
                <div className="text-[12px] text-muted-foreground">HUD detected & tracking active</div>
              </button>

              <button
                type="button"
                onClick={() => triggerToast('goal')}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-primary/60 text-left transition flex flex-col gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">⚽</span>
                  <span className="text-[12px] font-bold text-primary font-mono">SIMULATE</span>
                </div>
                <div className="font-bold text-xs text-foreground">4. Live Goal Detection</div>
                <div className="text-[12px] text-muted-foreground">Real-time score update toast</div>
              </button>

              <button
                type="button"
                onClick={() => triggerToast('settlement')}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-emerald-500/60 text-left transition flex flex-col gap-1.5 shadow-sm hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">💎</span>
                  <span className="text-[12px] font-bold text-emerald-400 font-mono">SIMULATE</span>
                </div>
                <div className="font-bold text-xs text-foreground">5. Instant Escrow Payout</div>
                <div className="text-[12px] text-muted-foreground">Crossmint smart wallet deposit</div>
              </button>
            </div>

            {/* Active Simulated Toasts Display Area */}
            <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  Live Toast Stream Preview ({simulatedToasts.length} active)
                </span>
                {simulatedToasts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSimulatedToasts([])}
                    className="text-[12px] text-muted-foreground hover:text-foreground font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {simulatedToasts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Click any simulation button above to preview real-time player notifications
                </div>
              ) : (
                <div className="space-y-2.5">
                  {simulatedToasts.map((toast) => (
                    <div
                      key={toast.id}
                      className="p-4 rounded-xl border border-primary/30 bg-card shadow-lg flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{toast.icon}</span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{toast.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary">
                              {toast.badge}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{toast.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{toast.body}</p>
                          {toast.action && (
                            <button
                              type="button"
                              className="mt-2 px-3 py-1 rounded-md text-[12px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition"
                            >
                              {toast.action}
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeToast(toast.id)}
                        className="text-muted-foreground hover:text-foreground text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet Settlement Architecture Card */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <Coins className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-xs text-foreground flex items-center gap-2">
                    Automated Crossmint Escrow Release
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                      ON-CHAIN SETTLEMENT
                    </span>
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    Match stake deposits are locked in smart escrow at kick-off and released within 3 seconds of the final whistle.
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm text-emerald-400">+$20.00 USDC</div>
                <div className="text-[10px] text-muted-foreground">Zero Gas Fees</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveTab('vision')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Back to AI Vision Sync
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition"
              >
                Got It — Return to Arena
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
