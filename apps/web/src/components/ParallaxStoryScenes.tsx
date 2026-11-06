'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Trophy,
  Swords,
  CheckCircle2,
  Lock,
  Scan,
  Coins,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CrossmintLogo } from './CrossmintLogo';

interface LifecycleStep {
  id: string;
  stepNumber: string;
  stepFraction: string;
  title: string;
  tagline: string;
  badge: string;
  icon: React.ElementType;
  iconColor: string;
  summary: string;
  details: string[];
  hud: {
    type: 'escrow' | 'compete' | 'verify' | 'payout';
    title: string;
    badge: string;
    stats: { label: string; value: string; color?: string }[];
  };
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'stage-1',
    stepNumber: '01',
    stepFraction: 'STEP 1 OF 4',
    title: 'Lock In Your Stake',
    tagline: 'Crossmint Smart Escrow',
    badge: 'GUARANTEED ESCROW',
    icon: Lock,
    iconColor: 'text-emerald-400',
    summary:
      'Connect your wallet or sign in with 1-click email. Entry fees are secured in audited Crossmint escrow vaults before kickoff. Your prize pool is guaranteed before the match begins.',
    details: [
      'Smart Contract Escrow: 100% on-chain vaults guarantee collateral before start.',
      'Universal Sign-in: Connect Web3 wallets or sign in seamlessly via email.',
      'Zero Chargeback Risk: Escrow locks funds to eliminate payment defaults.',
    ],
    hud: {
      type: 'escrow',
      title: 'Crossmint Smart Escrow',
      badge: 'LOCKED // SECURE',
      stats: [
        { label: 'Entry Fee', value: '$25.00 USDC', color: 'text-foreground' },
        { label: 'Total Prize Pool', value: '$50.00 USDC', color: 'text-emerald-400' },
        { label: 'Custody Rail', value: 'Crossmint Enterprise', color: 'text-primary' },
        { label: 'Audit Trail', value: 'Live On-Chain', color: 'text-muted-foreground' },
      ],
    },
  },
  {
    id: 'stage-2',
    stepNumber: '02',
    stepFraction: 'STEP 2 OF 4',
    title: 'Compete in Your Arena',
    tagline: 'PC, Console & Mobile',
    badge: 'UNIVERSAL INGEST',
    icon: Swords,
    iconColor: 'text-primary',
    summary:
      'Play your favorite titles—from Counter-Strike 2 to Tekken 8—on any platform. Our system supports the full spectrum of competitive gaming without relying on restrictive publisher APIs.',
    details: [
      'Universal Hardware: Full support across PC, PlayStation 5, Xbox Series X, and Mobile.',
      'Zero Developer API Limits: Independent from publisher rate limits or outages.',
      'Native Experience: Launch directly through Steam, PlayStation Network, or Xbox Live.',
    ],
    hud: {
      type: 'compete',
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
    stepNumber: '03',
    stepFraction: 'STEP 3 OF 4',
    title: 'Automated Verification',
    tagline: 'Visual Verification Engine™',
    badge: 'ZERO REFEREES',
    icon: Scan,
    iconColor: 'text-purple-400',
    summary:
      'Our proprietary Visual Verification Engine™ analyzes final match states directly from the game interface. It is faster, more universal, and more accurate than traditional referee workflows.',
    details: [
      'Real-Time UI Analysis: Validates end-game scoreboards with machine precision.',
      'Zero Human Referees: Eliminates manual delays, bias, and fabricated score disputes.',
      'Tamper-Proof Ingest: Detects resolution anomalies and score inconsistencies automatically.',
    ],
    hud: {
      type: 'verify',
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
    stepNumber: '04',
    stepFraction: 'STEP 4 OF 4',
    title: 'Instant USDC Settlement',
    tagline: 'Instant Liquidity',
    badge: 'INSTANT PAYOUT',
    icon: Coins,
    iconColor: 'text-emerald-400',
    summary:
      'Results are confirmed in seconds. Once verified, Crossmint automatically releases your winnings directly to your wallet. No waiting, no withdrawal delays, no friction.',
    details: [
      'Instant Smart Release: Payouts disburse automatically upon match validation.',
      'Zero Holding Periods: No multi-day administrative review queues or banking delays.',
      'Global USDC Standard: Liquid stablecoin balances instantly usable worldwide.',
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
  const containerRef = useRef<HTMLDivElement>(null);

  const currentScene = LIFECYCLE_STEPS[activeStage] ?? LIFECYCLE_STEPS[0]!;

  return (
    <section id="how-it-works" ref={containerRef} className="space-y-8 sm:space-y-10">
      {/* 1. Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase shadow-sm">
          <Scan className="w-3.5 h-3.5" />
          <span>AUTOMATED COMPETITIVE LIFECYCLE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground">
          From Challenge to Instant Payout in 4 Steps
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          We have removed the friction from competitive gaming. No referees. No delays. No manual disputes. Pure, automated competition.
        </p>
      </div>

      {/* 2. Visual "Flow" Grid: All 4 Steps Visible at a Glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {LIFECYCLE_STEPS.map((scene, idx) => {
          const isActive = activeStage === idx;
          const StepIcon = scene.icon;

          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => setActiveStage(idx)}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group relative ${
                isActive
                  ? 'bg-zinc-900/95 border-primary ring-1 ring-primary/40 shadow-lg'
                  : 'bg-card border-border hover:border-zinc-700 hover:bg-muted/30 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-black px-2.5 py-1 rounded-md ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-muted-foreground'
                    }`}
                  >
                    {scene.stepNumber}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {scene.stepFraction}
                  </span>
                </div>

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-900 text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1">
                <h3
                  className={`font-black text-base uppercase tracking-tight transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {scene.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {scene.summary}
                </p>
              </div>

              {/* Status pill & active indicator */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className={isActive ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {isActive ? '● Active Step' : 'Click to Inspect'}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-primary translate-x-1' : 'text-muted-foreground'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Deep-Dive Inspector Card (Step Detail & Live Simulated Telemetry) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column: Stage Detail (7 Cols) */}
        <Card className="lg:col-span-7 p-6 sm:p-7 rounded-2xl bg-card border-border shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                {currentScene.stepFraction}
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

            {/* Key Architectural Bullets */}
            <ul className="space-y-2.5 pt-2">
              {currentScene.details.map((detail, dIdx) => (
                <li key={dIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stepper Controls */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStage((prev) => (prev > 0 ? prev - 1 : LIFECYCLE_STEPS.length - 1))}
              className="text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; PREVIOUS STEP
            </button>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
              <span>{currentScene.stepFraction}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveStage((prev) => (prev < LIFECYCLE_STEPS.length - 1 ? prev + 1 : 0))}
              className="text-xs font-mono font-bold text-primary hover:underline transition-all"
            >
              NEXT STEP &rarr;
            </button>
          </div>
        </Card>

        {/* Right Column: Simulated Live Telemetry HUD (5 Cols) */}
        <Card className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950 border-zinc-800 shadow-md flex flex-col justify-between space-y-6 font-mono">
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

          {/* Contextual Rail Information */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            {currentScene.hud.type === 'escrow' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Smart Custody Security:</span>
                  <span className="text-emerald-400 font-bold">100% Guaranteed</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-400" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1">
                  <span>Crossmint Audited Vault</span>
                  <Link
                    href="/admin/treasury"
                    className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>Transparency Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {currentScene.hud.type === 'compete' && (
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

            {currentScene.hud.type === 'verify' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Automated Match Verification:</span>
                  <span className="text-emerald-400 font-bold">CONFIRMED // &lt; 2s</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-purple-500" />
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
                  <div className="w-full h-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground block text-center">
                  Settled via Crossmint Smart Custody · Instant USDC Liquidity
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
