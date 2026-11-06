'use client';

import React from 'react';
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
import { Badge } from './ui/badge';
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
      'Launch your favorite titles—from Counter-Strike 2 to Tekken 8—on any platform. Play 1v1 duels, squad wagers, or knockout championship brackets.',
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
  return (
    <section id="how-it-works" className="space-y-6 sm:space-y-8">
      {/* 1. Section Header: Punchy & Direct */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase">
          <Scan className="w-3.5 h-3.5" />
          <span>HOW IT WORKS</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
          From Challenge to Instant Payout
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Four automated steps. No human referees. No delays. No disputes.
        </p>
      </div>

      {/* 2. Clean 4-Card Pipeline: All 4 Steps Visible Side-by-Side Without Exhausting The User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {LIFECYCLE_STEPS.map((step) => {
          const StepIcon = step.icon;

          return (
            <Card
              key={step.id}
              className="p-5 rounded-2xl bg-card border-border hover:border-zinc-700 transition flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="space-y-3">
                {/* Header: Step Number & Icon */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-foreground">
                    {step.stepNumber}
                  </span>

                  <div className={`w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center ${step.iconColor}`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 className="font-black text-base text-foreground uppercase tracking-tight">
                    {step.title}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-primary block mt-0.5">
                    {step.tagline}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.summary}
                </p>
              </div>

              {/* Bottom Feature Pill */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground font-medium">Feature</span>
                <span className="font-bold text-emerald-400">● {step.highlight}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3. Subtle Trust Ribbon: Highlights What's Offered In One Line */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground text-center sm:text-left">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <CrossmintLogo className="w-4 h-4 text-emerald-400" />
          <span>Crossmint Escrow Vaults</span>
          <span className="text-zinc-600">·</span>
          <span>USDC Instant Settlement</span>
          <span className="text-zinc-600">·</span>
          <span>Zero Human Referees</span>
        </div>

        <Link
          href="/admin/treasury"
          className="text-primary hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
        >
          <span>Live Blockchain Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
