'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Cpu,
  Trophy,
  Swords,
  CheckCircle2,
  Lock,
  Eye,
  Wallet,
  ArrowRight,
  Sparkles,
  Gamepad2,
  Clock,
  Scan,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';

interface StoryScene {
  id: string;
  step: string;
  title: string;
  tagline: string;
  character: {
    name: string;
    codename: string;
    role: string;
    specialty: string;
    avatarBg: string;
    avatarLetter: string;
    accentColor: string;
  };
  summary: string;
  details: string[];
  hud: {
    type: 'escrow' | 'matchroom' | 'ocr' | 'payout';
    title: string;
    badge: string;
    stats: { label: string; value: string; color?: string }[];
  };
}

const STORY_SCENES: StoryScene[] = [
  {
    id: 'stage-1',
    step: 'STAGE 01',
    title: 'The Challenge & Protected Escrow',
    tagline: '1v1 Duels & Squad Showdowns with Instant Prize Escrow',
    character: {
      name: 'Kaelen "Striker" Voss',
      codename: 'STRIKER-01',
      role: 'Apex Duelist & Team Captain',
      specialty: 'High-Velocity 1v1 Arena Matches',
      avatarBg: 'bg-primary',
      avatarLetter: 'S',
      accentColor: 'text-primary',
    },
    summary:
      'Players select their official game arena, choose an entry tier ($5, $10, $25, or $50), and lock in. Prize pools are protected in secure escrow before kickoff so winners get paid instantly without hassle.',
    details: [
      'Protected Pools: Prize funds are guaranteed before the match begins.',
      'Instant Match Code: Private game lobby code generated automatically.',
      'Anti-Fraud Verification: Both players must have registered game gamertags.',
    ],
    hud: {
      type: 'escrow',
      title: 'Protected Prize Escrow',
      badge: 'LOCKED // SECURE',
      stats: [
        { label: 'Entry Fee', value: '$25.00 USDC', color: 'text-foreground' },
        { label: 'Total Prize Pool', value: '$50.00 USDC', color: 'text-emerald-400' },
        { label: 'Escrow Status', value: '100% FUNDED', color: 'text-primary' },
        { label: 'Settlement', value: 'Instant Escrow', color: 'text-muted-foreground' },
      ],
    },
  },
  {
    id: 'stage-2',
    step: 'STAGE 02',
    title: 'Play Natively in Your Game',
    tagline: 'No Invasive Kernel Spyware. Pure Native Gaming.',
    character: {
      name: 'Major Jax Bennett',
      codename: 'VANGUARD-09',
      role: 'Tactical CS2 In-Game Leader',
      specialty: 'Tactical FPS & Defuse Strategy',
      avatarBg: 'bg-indigo-600',
      avatarLetter: 'V',
      accentColor: 'text-indigo-400',
    },
    summary:
      'Compete on your normal PC or Console inside Counter-Strike 2, Warzone, FC 25, Fortnite, or Rocket League. There are no kernel-level monitoring drivers or invasive bloatware required.',
    details: [
      'Native Game Client: Launch your normal game on Steam, Xbox, PlayStation, or Battle.net.',
      'Private Server / Room Code: Connect directly using the platform-issued lobby code.',
      'Real-Time Heartbeat: PlayVerzus monitors match status in the background.',
    ],
    hud: {
      type: 'matchroom',
      title: 'Live Arena Matchroom HUD',
      badge: 'MATCH IN PROGRESS',
      stats: [
        { label: 'Active Arena', value: 'Counter-Strike 2', color: 'text-foreground' },
        { label: 'Format', value: '1v1 Aim Map · Best of 16', color: 'text-muted-foreground' },
        { label: 'Lobby Server', value: 'de_inferno // EU-Frankfurt', color: 'text-primary' },
        { label: 'Latency', value: '12ms · Optimal', color: 'text-emerald-400' },
      ],
    },
  },
  {
    id: 'stage-3',
    step: 'STAGE 03',
    title: 'Instant Match Results',
    tagline: 'Automated Winner Detection & Anti-Cheat in Seconds',
    character: {
      name: 'A.R.I.A. Arbiter',
      codename: 'ARBITER-01',
      role: 'Automated Match Referee & Anti-Cheat',
      specialty: 'Real-Time Result Resolution & Fair Play',
      avatarBg: 'bg-emerald-600',
      avatarLetter: 'A',
      accentColor: 'text-emerald-400',
    },
    summary:
      'As soon as the match concludes, our automated system verifies the final score and victory screen in seconds. Zero admin wait times, zero disputed reports—just fair, fast results.',
    details: [
      'Zero Wait Times: Results are verified and confirmed in seconds.',
      'Anti-Cheat Protection: Automated checks prevent duplicate or fake reports.',
      'Gamertag Matching: Guarantees that the rightful player receives the victory.',
    ],
    hud: {
      type: 'ocr',
      title: 'Automated Match Arbiter',
      badge: 'VERIFIED // INSTANT RESULT',
      stats: [
        { label: 'Final Score', value: '16 - 11 // VICTORY', color: 'text-emerald-400' },
        { label: 'Verified Player', value: 'Striker_X (CONFIRMED)', color: 'text-primary' },
        { label: 'Result Resolution', value: 'Instant (< 2s)', color: 'text-muted-foreground' },
        { label: 'Match Integrity', value: 'Passed // Fair Play', color: 'text-muted-foreground' },
      ],
    },
  },
  {
    id: 'stage-4',
    step: 'STAGE 04',
    title: 'Instant Prize Payout',
    tagline: 'Direct Wallet Settlement with 1-Click Cashouts',
    character: {
      name: 'Elena "Valkyrie" Rostova',
      codename: 'CHAMPION-07',
      role: 'Championship Arena Victor',
      specialty: 'High-Stakes Knockout Tournaments',
      avatarBg: 'bg-purple-700',
      avatarLetter: 'E',
      accentColor: 'text-purple-400',
    },
    summary:
      'The moment the final round ends, the full prize pool is credited directly into your player wallet. No waiting periods, no manual referee reviews—withdraw straight to your wallet or bank whenever you want.',
    details: [
      'Instant Crediting: Funds appear in your account balance the exact moment the match ends.',
      'Zero Hold Periods: No multi-day delays or manual approval bottlenecks.',
      'Flexible Cashout: Withdraw directly to your personal crypto wallet or bank account.',
    ],
    hud: {
      type: 'payout',
      title: 'Instant Prize Payout',
      badge: 'PAYOUT COMPLETED',
      stats: [
        { label: 'Prize Disbursed', value: '+$50.00 USDC', color: 'text-emerald-400 font-black' },
        { label: 'Settlement Speed', value: 'Instant (< 2s)', color: 'text-primary' },
        { label: 'Player Account', value: 'Active & Funded', color: 'text-foreground' },
        { label: 'Cashout Status', value: 'Available Immediately', color: 'text-muted-foreground' },
      ],
    },
  },
];

export function ParallaxStoryScenes() {
  const [activeStage, setActiveStage] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const topOffset = rect.top;
            setScrollY(topOffset);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentScene = STORY_SCENES[activeStage] ?? STORY_SCENES[0]!;

  // Calculate subtle parallax offsets based on scroll position
  const parallaxOffset = Math.max(-25, Math.min(25, -scrollY * 0.05));
  const cardTilt = Math.max(-4, Math.min(4, -scrollY * 0.01));

  return (
    <section id="how-it-works" ref={containerRef} className="space-y-8 sm:space-y-12">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase">
          <Scan className="w-3.5 h-3.5" />
          <span>MATCH LIFECYCLE & AUTOMATION</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground">
          How It Works
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          From duel challenge to instant prize settlement. Level up your game across 4 seamless stages with automated matchmaking, live duels, and instant rewards.
        </p>
      </div>

      {/* Stage Selector Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {STORY_SCENES.map((scene, idx) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => setActiveStage(idx)}
            className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
              activeStage === idx
                ? 'bg-zinc-900 border-primary text-primary shadow-sm ring-1 ring-primary/40'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-zinc-700'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                activeStage === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {idx + 1}
            </span>
            <span className="hidden sm:inline">{scene.title.split('&')[0]}</span>
            <span className="sm:hidden">{scene.step}</span>
          </button>
        ))}
      </div>

      {/* Master Interactive Stage Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        {/* Left Column: Character Dossier & Scene Narrative (7 cols) */}
        <Card className="lg:col-span-7 bg-card border-border shadow-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Stage Eyebrow + Character Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-border">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${currentScene.character.avatarBg} text-white font-black text-xl flex items-center justify-center flex-shrink-0 shadow-md`}
                >
                  {currentScene.character.avatarLetter}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      {currentScene.step}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] border-border">
                      {currentScene.character.codename}
                    </Badge>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground mt-0.5">
                    {currentScene.character.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {currentScene.character.role}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block">Specialty</span>
                <span className="text-xs font-bold text-foreground font-mono">
                  {currentScene.character.specialty}
                </span>
              </div>
            </div>

            {/* Scene Headline & Explanation */}
            <div className="space-y-2">
              <h4 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                {currentScene.title}
              </h4>
              <p className="text-xs sm:text-sm font-mono text-primary font-bold">
                {currentScene.tagline}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                {currentScene.summary}
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5 pt-2">
              {currentScene.details.map((detail, dIdx) => (
                <div key={dIdx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">Next Stage:</span>
              <button
                type="button"
                onClick={() => setActiveStage((prev) => (prev + 1) % STORY_SCENES.length)}
                className="text-xs font-bold text-primary hover:underline font-mono inline-flex items-center gap-1"
              >
                <span>Stage {((activeStage + 1) % STORY_SCENES.length) + 1}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <Link href="/challenges">
              <Button size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 h-9 px-4">
                <span>Enter Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Right Column: Interactive Dynamic Parallax HUD (5 cols) */}
        <div
          className="lg:col-span-5 flex flex-col justify-center transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(0, ${parallaxOffset}px, 0) rotate(${cardTilt}deg)`,
          }}
        >
          <Card className="bg-zinc-950 border border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 rounded-2xl relative overflow-hidden">
            {/* Status Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  {currentScene.hud.title}
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-primary">
                {currentScene.hud.badge}
              </Badge>
            </div>

            {/* Live Stats Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentScene.hud.stats.map((stat, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    {stat.label}
                  </span>
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold block truncate ${
                      stat.color || 'text-foreground'
                    }`}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive Visual Element per Stage */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              {currentScene.hud.type === 'escrow' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Smart Custody Security:</span>
                    <span className="text-emerald-400 font-bold">100% Guaranteed</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-primary" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block text-center">
                    Crossmint Vault Address: 0x89c2...41a0 · Fully Audited
                  </span>
                </div>
              )}

              {currentScene.hud.type === 'matchroom' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Network Integrity:</span>
                    <span className="text-emerald-400 font-bold">STABLE // 128 TICK</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-indigo-500" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block text-center">
                    Room Code: VZ-8492-CS2 · Active Ping: 12ms
                  </span>
                </div>
              )}

              {currentScene.hud.type === 'ocr' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Result Verification:</span>
                    <span className="text-emerald-400 font-bold">100% CONFIRMED</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block text-center">
                    Victory Confirmed · Fair Play Guarantee
                  </span>
                </div>
              )}

              {currentScene.hud.type === 'payout' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">USDC Settlement:</span>
                    <span className="text-emerald-400 font-bold">COMPLETED // INSTANT</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-purple-500" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block text-center">
                    Funds in Crossmint Custody Wallet · Ready for 1-Click Withdrawal
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
