'use client';

import Link from 'next/link';
import {
  Swords,
  Trophy,
  Users,
  AlertTriangle,
  XCircle,
  Bell,
  X,
  ArrowRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useNotificationStore, type NotificationType } from '../lib/notificationStore';
import { Button } from './ui/button';

function getToastMeta(title: string, body: string, type?: NotificationType) {
  const lower = `${title} ${body}`.toLowerCase();

  if (lower.includes('goal')) {
    return {
      badgeText: 'GOAL DETECTED',
      badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.2)] border-emerald-500/30',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    };
  }
  if (lower.includes('full time') || lower.includes('settled') || lower.includes('victory') || type === 'success') {
    return {
      badgeText: 'MATCH CONCLUDED',
      badgeClass: 'bg-primary/20 border-primary/50 text-primary',
      glowClass: 'shadow-[0_0_25px_rgba(139,92,246,0.25)] border-primary/40',
      icon: <Trophy className="w-4 h-4 text-primary" />,
    };
  }
  if (lower.includes('kick off') || lower.includes('kickoff') || lower.includes('live')) {
    return {
      badgeText: 'KICK OFF',
      badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400',
      glowClass: 'shadow-[0_0_25px_rgba(6,182,212,0.2)] border-cyan-500/30',
      icon: <Swords className="w-4 h-4 text-cyan-400" />,
    };
  }
  if (lower.includes('half time') || lower.includes('halftime')) {
    return {
      badgeText: 'HALFTIME',
      badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      glowClass: 'shadow-[0_0_25px_rgba(245,158,11,0.2)] border-amber-500/30',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    };
  }
  if (type === 'party') {
    return {
      badgeText: 'SQUAD',
      badgeClass: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
      glowClass: 'border-blue-500/30',
      icon: <Users className="w-4 h-4 text-blue-400" />,
    };
  }
  if (type === 'error') {
    return {
      badgeText: 'ALERT',
      badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
      glowClass: 'border-rose-500/30',
      icon: <XCircle className="w-4 h-4 text-rose-400" />,
    };
  }
  return {
    badgeText: 'EVENT',
    badgeClass: 'bg-white/10 border-white/20 text-white',
    glowClass: 'border-white/15',
    icon: <Bell className="w-4 h-4 text-primary" />,
  };
}

export function NotificationToastContainer() {
  const { activeToasts, dismissToast } = useNotificationStore();

  if (!activeToasts || activeToasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none"
    >
      {activeToasts.map((toast) => {
        const meta = getToastMeta(toast.title, toast.body, toast.type);

        // Highlight any score formatted as [X - Y] or (X - Y)
        const scoreMatch = toast.body.match(/(\[\s*\d+\s*[-:]\s*\d+\s*\]|\(\s*\d+\s*[-:]\s*\d+\s*\)|\d+\s*[-:]\s*\d+)/);
        const scoreText = scoreMatch ? scoreMatch[0].replace(/[\[\]\(\)]/g, '').trim() : null;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative rounded-2xl bg-[#0c0f18]/90 backdrop-blur-2xl border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/5 text-foreground flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-300 transition-all hover:scale-[1.02] ${meta.glowClass}`}
            role="alert"
          >
            {/* Ambient subtle glow blob inside toast */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Event Icon Capsule */}
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 backdrop-blur-md ${meta.badgeClass}`}>
                  {meta.icon}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                      {meta.badgeText}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/80">
                      JUST NOW
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-white leading-snug truncate">
                    {toast.title}
                  </h4>

                  <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                    {toast.body}
                  </p>

                  {/* High-Impact Monospace Score Bug if score is present */}
                  {scoreText && (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Live Score:</span>
                      <span className="text-xs font-mono font-black text-white tracking-widest">{scoreText}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-muted-foreground/60 hover:text-white p-1 text-xs transition rounded-lg hover:bg-white/10 flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {toast.actionUrl && toast.actionLabel && (
              <div className="relative z-10 flex items-center justify-end gap-2 pt-1.5 border-t border-white/10">
                <Link
                  href={toast.actionUrl}
                  onClick={() => dismissToast(toast.id)}
                >
                  <Button variant="default" size="sm" className="h-7 text-[10px] px-3 font-mono font-bold uppercase tracking-wider gap-1 bg-white text-black hover:bg-white/90">
                    <span>{toast.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
