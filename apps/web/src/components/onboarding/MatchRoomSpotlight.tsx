'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Monitor,
  CheckCircle2,
  Zap,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface MatchRoomSpotlightProps {
  gameName: string;
}

export function MatchRoomSpotlight({ gameName }: MatchRoomSpotlightProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('playverzus_matchroom_spotlight_seen') === 'true';
      if (!seen) {
        setOpen(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('playverzus_matchroom_spotlight_seen', 'true');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150">
      <Card className="max-w-lg w-full p-6 bg-card border-border shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="text-base font-bold text-foreground">
              How Arena Duels Work ({gameName})
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
              1
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block">
                Connect In-Game via Gamertag
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                Copy your opponent's in-game handle from their player card below and invite them to your custom match or party.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
              2
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block">
                Connect Game Feed or Screenshot
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                On PC, click "Connect Game Window" to track the HUD in real-time. On mobile or console, upload your final victory screenshot or broadcast to Twitch/YouTube.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
              3
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block">
                Confirm Ready & Play
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                Once both players are connected and marked "Ready", the duel begins!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-400 block">
                Autonomous AI Settlement
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                The optical anti-cheat detects the final score and victory screen automatically. Payouts are instant without human dispute delays.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="default"
            size="default"
            onClick={handleDismiss}
            className="w-full text-xs font-bold uppercase tracking-wider gap-2 shadow-sm"
          >
            <span>Got it, let's duel!</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
