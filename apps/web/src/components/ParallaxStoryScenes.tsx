'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  Swords,
  Scan,
  Coins,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
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
  highlight: string;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'step-1',
    stepNumber: '01',
    stepFraction: 'STEP 1 OF 4',
    title: 'Lock In Your Stake',
    tagline: 'Crossmint Smart Escrow',
    badge: 'GUARANTEED ESCROW',
    icon: Lock,
    iconColor: 'text-emerald-400',
    summary:
      'Connect your wallet or sign in via email. Entry fees are secured instantly in Crossmint smart contract escrow with 100% guaranteed prize pools before kickoff.',
    highlight: 'Zero Default Risk',
  },
  {
    id: 'step-2',
    stepNumber: '02',
    stepFraction: 'STEP 2 OF 4',
    title: 'Compete in Your Arena',
    tagline: 'PC, Console & Mobile',
    badge: 'UNIVERSAL INGEST',
    icon: Swords,
    iconColor: 'text-primary',
    summary:
      'Launch your favorite titles—from EA Sports FC 27 to Counter-Strike 2—on any platform. Play 1v1 duels, squad wagers, or knockout championship brackets.',
    highlight: 'Native Gameplay',
  },
  {
    id: 'step-3',
    stepNumber: '03',
    stepFraction: 'STEP 3 OF 4',
    title: 'Automated Verification',
    tagline: 'Visual Verification Engine™',
    badge: 'ZERO REFEREES',
    icon: Scan,
    iconColor: 'text-purple-400',
    summary:
      'Our proprietary engine validates match results directly from official in-game interfaces. Confirmed in under 2 seconds with zero human referee delays or bias.',
    highlight: '< 2s Verification',
  },
  {
    id: 'step-4',
    stepNumber: '04',
    stepFraction: 'STEP 4 OF 4',
    title: 'Instant USDC Settlement',
    tagline: 'Instant Liquidity',
    badge: 'INSTANT PAYOUT',
    icon: Coins,
    iconColor: 'text-emerald-400',
    summary:
      'Winnings disburse automatically upon match confirmation. Liquid USDC is released directly to your wallet on Polygon, Solana, or Base with zero banking delays.',
    highlight: 'Non-Custodial',
  },
];

export function ParallaxStoryScenes() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section id="how-it-works" className="relative space-y-6 sm:space-y-8">
      {/* Background Parallax Neon Blobs */}
      <div className="absolute -top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-10 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Section Header: Punchy & Direct */}
      <div className="text-center max-w-2xl mx-auto space-y-2 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111420]/80 border border-white/10 text-primary text-xs font-bold tracking-wider uppercase shadow-sm">
          <Scan className="w-3.5 h-3.5" />
          <span>HOW IT WORKS</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
          From Challenge to Instant Payout
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
          Four automated steps. No human referees. No delays. No disputes.
        </p>
      </div>

      {/* 2. Interactive Parallax 4-Card Pipeline with Shimmer & Tilt Hover */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={step.id}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`relative rounded-2xl overflow-hidden p-5 bg-[#0e121c]/80 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between gap-4 transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(139,92,246,0.2)] hover:border-primary/50`}
            >
              {/* Shimmer light sweep bar */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <div className="relative z-10 space-y-3">
                {/* Header: Step Number & Icon */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-foreground">
                    {step.stepNumber}
                  </span>

                  <div className={`w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${step.iconColor}`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 className="font-black text-base text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-primary block mt-0.5">
                    {step.tagline}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.summary}
                </p>
              </div>

              {/* Bottom Feature Pill */}
              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground font-medium">Feature</span>
                <span className="font-bold text-emerald-400">● {step.highlight}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Subtle Trust Ribbon with Frosted Glass */}
      <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-[#0c0f18]/80 backdrop-blur-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground text-center sm:text-left shadow-md">
        <div className="flex items-center gap-2 text-foreground font-semibold flex-wrap justify-center sm:justify-start">
          <CrossmintLogo className="w-4 h-4 text-emerald-400" />
          <span>Crossmint Escrow Vaults</span>
          <span className="text-zinc-600">·</span>
          <span>USDC Instant Settlement</span>
          <span className="text-zinc-600">·</span>
          <span>Zero Human Referees</span>
        </div>

        <Link
          href="/admin/treasury"
          className="text-primary hover:underline font-bold inline-flex items-center gap-1.5 text-[11px]"
        >
          <span>Live Blockchain Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
