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
  ExternalLink,
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
    title: '1. Lock In Your Stake',
    tagline: 'Secured Instantly via Crossmint Escrow',
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
      'Connect your wallet or use email sign-in. Entry fees are secured instantly via Crossmint Escrow. Your prize pool is guaranteed before the match begins.',
    details: [
      'Crossmint Smart Vault: 100% on-chain escrow locks funds before match kickoff.',
      'Guaranteed Prize Pools: Your winnings are fully collateralized before start.',
      'Universal Onboarding: Connect Web3 wallet or sign in with 1-click email.',
    ],
    hud: {
      type: 'escrow',
      title: 'Crossmint Smart Escrow',
      badge: 'LOCKED // SECURE',
      stats: [
        { label: 'Entry Fee', value: '$25.00 USDC', color: 'text-foreground' },
        { label: 'Total Prize Pool', value: '$50.00 USDC', color: 'text-emerald-400' },
        { label: 'Escrow Provider', value: 'Crossmint Enterprise', color: 'text-primary' },
        { label: 'Audit Trail', value: 'Live On-Chain', color: 'text-muted-foreground' },
      ],
    },
  },
  {
    id: 'stage-2',
    step: 'STAGE 02',
    title: '2. Compete in Your Arena',
    tagline: 'Platform Agnostic · PC, Console, and Mobile',
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
      'Play your favorite titles—from Counter-Strike 2 to Tekken 8—on any platform. Our system supports the full spectrum of competitive gaming, not just those with limited APIs.',
    details: [
      'Full Ecosystem: Competitions across PC, PlayStation 5, Xbox Series X, and Mobile.',
      'Zero API Barriers: Unrestricted by publisher rate limits or missing developer endpoints.',
      'Native Gameplay: Launch normally on Steam, Battle.net, Riot, or console network.',
    ],
    hud: {
      type: 'matchroom',
      title: 'Arena Match Session',
      badge: 'MATCH IN PROGRESS',
      stats: [
        { label: 'Active Arena', value: 'Counter-Strike 2', color: 'text-foreground' },
        { label: 'Platform Rail', value: 'Universal Ingest', color: 'text-muted-foreground' },
        { label: 'Lobby Server', value: 'EU-Central // Direct', color: 'text-primary' },
        { label: 'Interface State', value: 'Active In-Game', color: 'text-emerald-400' },
      ],
    },
  },
  {
    id: 'stage-3',
    step: 'STAGE 03',
    title: '3. Automated Visual Verification',
    tagline: 'Proprietary Visual Intelligence · Zero Human Referees',
    character: {
      name: 'A.R.I.A. Arbiter',
      codename: 'ARBITER-01',
      role: 'Visual Verification Engine™',
      specialty: 'Real-Time Interface Analysis & Fair Play',
      avatarBg: 'bg-emerald-600',
      avatarLetter: 'A',
      accentColor: 'text-emerald-400',
    },
    summary:
      'Our proprietary Visual Verification Engine™ analyzes final match states directly from the game interface. It is faster, more universal, and more accurate than traditional API dependencies.',
    details: [
      'Visual Intelligence: Direct game UI parsing certifies final round states in seconds.',
      'Zero Human Referees: Eliminates manual referee bias, delays, and disputed claims.',
      'Universal Reliability: Operates seamlessly regardless of publisher API downtime.',
    ],
    hud: {
      type: 'ocr',
      title: 'Visual Verification Engine™',
      badge: 'VERIFIED // ZERO REFEREES',
      stats: [
        { label: 'Final Score', value: '16 - 11 // VICTORY', color: 'text-emerald-400' },
        { label: 'Verified Player', value: 'Striker_X (CONFIRMED)', color: 'text-primary' },
        { label: 'Resolution Speed', value: 'Instant (< 2s)', color: 'text-muted-foreground' },
        { label: 'Integrity Check', value: 'Passed // Zero Referees', color: 'text-muted-foreground' },
      ],
    },
  },
  {
    id: 'stage-4',
    step: 'STAGE 04',
    title: '4. Instant USDC Settlement',
    tagline: 'Automatic Crossmint Disbursement · Immediate Liquidity',
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
      'Results are confirmed in seconds. Once verified, Crossmint automatically releases your winnings to your wallet. No waiting. No friction.',
    details: [
      'Automated Release: Smart contracts disburse funds instantly upon engine confirmation.',
      'Zero Holding Periods: No multi-day administrative delays or manual review queues.',
      'Global Stablecoin Standard: Liquid USDC balances redeemable or transferable anywhere.',
    ],
    hud: {
      type: 'payout',
      title: 'Crossmint Instant Settlement',
      badge: 'PAYOUT COMPLETED',
      stats: [
        { label: 'Prize Disbursed', value: '+$50.00 USDC', color: 'text-emerald-400 font-black' },
        { label: 'Settlement Speed', value: 'Instant (< 2s)', color: 'text-primary' },
        { label: 'Custody Rail', value: 'Crossmint Smart Vault', color: 'text-foreground' },
        { label: 'Audit Trail', value: 'On-Chain Ledger Recorded', color: 'text-muted-foreground' },
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase">
          <Scan className="w-3.5 h-3.5" />
          <span>PROPRIETARY COMPETITIVE ARCHITECTURE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground">
          From Challenge to Instant Payout in 4 Steps
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          We have removed the friction from competitive gaming. No referees. No delays. No manual disputes.
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
              0{idx + 1}
            </span>
            <span>{scene.title.split('. ')[1] || scene.title}</span>
          </button>
        ))}
      </div>

      {/* 2-Column Split: Character Dossier & Live Match HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Stage Details (7 Cols) */}
        <div
          className="lg:col-span-7 flex flex-col justify-between transition-transform duration-300"
          style={{ transform: `translateY(${parallaxOffset * 0.4}px)` }}
        >
          <Card className="p-6 sm:p-8 rounded-2xl bg-card border-border shadow-sm flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                  {currentScene.step}
                </Badge>
                <span className="font-mono text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  {currentScene.tagline}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                {currentScene.title}
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {currentScene.summary}
              </p>

              {/* Character Profile Tag */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${currentScene.character.avatarBg} text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0`}
                >
                  {currentScene.character.avatarLetter}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">
                      {currentScene.character.name}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {currentScene.character.codename}
                    </Badge>
                  </div>
                  <span className={`text-xs font-mono ${currentScene.character.accentColor} block truncate`}>
                    {currentScene.character.role}
                  </span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    Specialty: {currentScene.character.specialty}
                  </span>
                </div>
              </div>

              {/* Bullet Details */}
              <ul className="space-y-2.5 pt-2">
                {currentScene.details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation Stepper Controls */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStage((prev) => (prev > 0 ? prev - 1 : STORY_SCENES.length - 1))}
                className="text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                &larr; PREVIOUS STAGE
              </button>
              <div className="flex gap-1.5">
                {STORY_SCENES.map((_, sIdx) => (
                  <div
                    key={sIdx}
                    className={`h-1.5 rounded-full transition-all ${
                      activeStage === sIdx ? 'w-6 bg-primary' : 'w-1.5 bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveStage((prev) => (prev < STORY_SCENES.length - 1 ? prev + 1 : 0))}
                className="text-xs font-mono font-bold text-primary hover:underline transition-all"
              >
                NEXT STAGE &rarr;
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Simulated High-Tech HUD (5 Cols) */}
        <div
          className="lg:col-span-5 transition-transform duration-300"
          style={{ transform: `rotate(${cardTilt}deg)` }}
        >
          <Card className="p-6 rounded-2xl bg-zinc-950 border-zinc-800 shadow-md flex flex-col justify-between h-full space-y-6 font-mono">
            {/* HUD Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                  {currentScene.hud.title}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                {currentScene.hud.badge}
              </Badge>
            </div>

            {/* HUD Metric Cells */}
            <div className="space-y-3">
              {currentScene.hud.stats.map((stat, stIdx) => (
                <div
                  key={stIdx}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                >
                  <span className="text-xs text-muted-foreground uppercase">{stat.label}</span>
                  <span
                    className={`text-xs font-bold ${
                      stat.color ? stat.color : 'text-foreground'
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
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1">
                    <span>Crossmint Audited Vault</span>
                    <Link
                      href="/admin/treasury"
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>Live Transparency Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {currentScene.hud.type === 'matchroom' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Platform Agnostic Ingest:</span>
                    <span className="text-emerald-400 font-bold">ACTIVE // UNIVERSAL</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-indigo-500" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block text-center">
                    PC · PS5 · Xbox · Mobile Interface Ingest
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
                    Visual Verification Engine™ · Zero Human Referees
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
                    Settled via Crossmint Smart Custody · Instant USDC Liquidity
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
