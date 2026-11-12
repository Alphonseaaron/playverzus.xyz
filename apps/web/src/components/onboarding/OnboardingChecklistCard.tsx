'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Gamepad2,
  Coins,
  Swords,
  ChevronRight,
  X,
  HelpCircle,
  Play,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useGameAccountsStore } from '../../lib/gameAccountsStore';

interface OnboardingChecklistCardProps {
  onOpenTour: () => void;
  matchesCount: number;
  balancePoints: number;
}

export function OnboardingChecklistCard({
  onOpenTour,
  matchesCount,
  balancePoints,
}: OnboardingChecklistCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const { accounts } = useGameAccountsStore();

  const linkedGamesCount = Object.keys(accounts).length;

  // 4 Core Milestone Tasks
  const task1 = true; // Profile Created & Verified
  const task2 = linkedGamesCount > 0; // Gamertag Linked
  const task3 = balancePoints >= 1000; // Bonus Claimed
  const task4 = matchesCount > 0; // First Match Played

  const completedCount = [task1, task2, task3, task4].filter(Boolean).length;
  const isAllComplete = completedCount === 4;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('playverzus_checklist_dismissed') === 'true';
      if (isDismissed) setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('playverzus_checklist_dismissed', 'true');
    }
  };

  if (dismissed && !isAllComplete) {
    return (
      <button
        onClick={() => {
          setDismissed(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('playverzus_checklist_dismissed');
          }
        }}
        className="w-full p-2.5 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-xs flex items-center justify-between text-muted-foreground transition"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          <span>Competitor Onboarding Checklist ({completedCount}/4 completed)</span>
        </span>
        <span className="text-primary font-bold hover:underline">Show</span>
      </button>
    );
  }

  if (isAllComplete) {
    return null;
  }

  return (
    <Card className="p-5 border border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card shadow-lg relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Getting Started Checklist</h3>
              <Badge variant="copper" className="font-mono text-[10px]">
                {completedCount} OF 4 COMPLETED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these steps to unlock full competitive matchmaking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTour}
            className="text-xs text-primary font-bold h-8 px-2.5"
          >
            Launch Tour
          </Button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-500 rounded-full"
          style={{ width: `${(completedCount / 4) * 100}%` }}
        />
      </div>

      {/* 4 Task Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Item 1 */}
        <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block">Profile Created</span>
            <span className="text-[11px] text-muted-foreground">Account and region set</span>
          </div>
        </div>

        {/* Item 2 */}
        <div
          onClick={onOpenTour}
          className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
            task2
              ? 'bg-secondary/50 border-border'
              : 'bg-primary/10 border-primary/40 hover:bg-primary/15'
          }`}
        >
          {task2 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block">
              {task2 ? `Gamertag Linked (${linkedGamesCount})` : 'Link Game Handles'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {task2 ? 'Ready for in-game invites' : 'Click to link Riot, EA, Steam ID'}
            </span>
          </div>
        </div>

        {/* Item 3 */}
        <div
          onClick={onOpenTour}
          className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
            task3
              ? 'bg-secondary/50 border-border'
              : 'bg-primary/10 border-primary/40 hover:bg-primary/15'
          }`}
        >
          {task3 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block">
              {task3 ? '1,000 PTS Claimed' : 'Claim Practice Bonus'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {task3 ? 'Practice balance ready' : 'Get 1,000 free PTS for duels'}
            </span>
          </div>
        </div>

        {/* Item 4 */}
        <Link
          href="/challenges"
          className={`p-3 rounded-xl border flex items-start gap-2.5 transition ${
            task4
              ? 'bg-secondary/50 border-border'
              : 'bg-primary/10 border-primary/40 hover:bg-primary/15'
          }`}
        >
          {task4 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Swords className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-foreground block">
              {task4 ? 'First Match Played' : 'Play First Duel'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {task4 ? 'Combat verified' : 'Find or host a 1v1 match'}
            </span>
          </div>
        </Link>
      </div>
    </Card>
  );
}
