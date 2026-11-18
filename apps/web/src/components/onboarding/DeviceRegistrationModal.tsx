'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  Monitor,
  Coins,
  CheckCircle2,
  Lock,
  ArrowRight,
  Laptop,
  Check,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  getMachineAuth,
  registerCurrentMachine,
  updateAlertsPermission,
  updateScreenPermission,
  type DeviceMachineAuth,
} from '../../lib/deviceMachineStore';
import {
  requestSessionScreenShare,
  hasActiveSessionStream,
} from '../../lib/screenCaptureSingleton';
import { requestNotificationPermission } from '../../lib/notifications';

interface DeviceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
  username?: string;
}

export function DeviceRegistrationModal({
  open,
  onOpenChange,
  onCompleted,
  username = 'Competitor',
}: DeviceRegistrationModalProps) {
  const [authData, setAuthData] = useState<DeviceMachineAuth>(() => getMachineAuth());
  const [requestingAlerts, setRequestingAlerts] = useState(false);
  const [requestingScreen, setRequestingScreen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = getMachineAuth();
    if (hasActiveSessionStream() && !current.screenShareAuthorized) {
      current.screenShareAuthorized = true;
    }
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      current.alertsAuthorized = true;
    }
    setAuthData(current);
  }, [open]);

  const handleGrantAlerts = async () => {
    try {
      setRequestingAlerts(true);
      const granted = await requestNotificationPermission();
      const updated = updateAlertsPermission(granted);
      setAuthData(updated);
    } finally {
      setRequestingAlerts(false);
    }
  };

  const handleGrantScreen = async () => {
    try {
      setRequestingScreen(true);
      const stream = await requestSessionScreenShare();
      if (stream) {
        const updated = updateScreenPermission(true);
        setAuthData(updated);
      }
    } finally {
      setRequestingScreen(false);
    }
  };

  const handleFinish = () => {
    registerCurrentMachine(authData.screenShareAuthorized, authData.alertsAuthorized);
    onOpenChange(false);
    onCompleted?.();
  };

  const isReady = authData.screenShareAuthorized && authData.alertsAuthorized;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0c0f18]/95 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden shadow-2xl rounded-2xl text-foreground">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-[#111422]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-black shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-foreground">
                  Machine Registration & Esports Engine
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  One-time authorization for @{username} on this machine.
                </DialogDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-[10px] gap-1.5 py-1 px-2.5 bg-zinc-900 border-zinc-800">
              <Laptop className="w-3 h-3 text-primary" />
              <span>{authData.machineName}</span>
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Priority Notice */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Zero Interruption Matchplay:</strong> Authorize permissions once for this machine so you never get prompted inside game rooms or interrupted mid-match.
            </p>
          </div>

          {/* PERMISSION 1: REAL-TIME MATCH ALERTS (TOP PRIORITY) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              authData.alertsAuthorized
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-[#111422]/80 border-white/10 hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    1. Live Match & Payout Alerts
                  </span>
                  {authData.alertsAuthorized && (
                    <Badge variant="success" className="font-mono text-[9px] py-0 px-1.5">
                      AUTHORIZED ✓
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Direct browser and device alerts for opponent invitations, goal milestones, and instant USDC payout settlements.
                </p>
              </div>

              <Button
                size="sm"
                variant={authData.alertsAuthorized ? 'secondary' : 'default'}
                disabled={authData.alertsAuthorized || requestingAlerts}
                onClick={handleGrantAlerts}
                className="flex-shrink-0 text-xs h-9 px-3.5 font-bold uppercase tracking-wider"
              >
                {requestingAlerts ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : authData.alertsAuthorized ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  'Enable Alerts'
                )}
              </Button>
            </div>
          </div>

          {/* PERMISSION 2: SCREEN SHARE & OPTICAL ANTI-CHEAT (SECRET SAUCE) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              authData.screenShareAuthorized
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-[#111422]/80 border-white/10 hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Autonomous Visual Engine (Secret Sauce)
                  </span>
                  {authData.screenShareAuthorized && (
                    <Badge variant="success" className="font-mono text-[9px] py-0 px-1.5">
                      AUTO-LOCKED ✓
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Authorize full screen capture once. Our engine intelligently locks onto your game window, skips browser navigation chrome and taskbars, and verifies scores silently in memory with zero manual uploads.
                </p>
                <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Privacy Shield: Zero video recorded or stored. Ingest runs locally in RAM.</span>
                </div>
              </div>

              <Button
                size="sm"
                variant={authData.screenShareAuthorized ? 'secondary' : 'default'}
                disabled={authData.screenShareAuthorized || requestingScreen}
                onClick={handleGrantScreen}
                className="flex-shrink-0 text-xs h-9 px-3.5 font-bold uppercase tracking-wider"
              >
                {requestingScreen ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : authData.screenShareAuthorized ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> Authorized
                  </span>
                ) : (
                  'Authorize Screen'
                )}
              </Button>
            </div>
          </div>

          {/* FEATURE 3: AUTOMATED ESCROW STAKING */}
          <div className="p-4 rounded-xl border border-white/10 bg-[#111422]/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. Automated Smart Escrow
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-[9px] text-emerald-400 border-emerald-500/40">
                AUTOMATIC ✓
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              When both competitors click <strong>Mark Ready</strong>, entry stakes are automatically locked in Crossmint smart contract escrow without extra confirmation dialogs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5 bg-[#111422]/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Machine ID: {authData.machineId}</span>
          </div>

          <Button
            size="default"
            variant="default"
            onClick={handleFinish}
            className="text-xs font-black uppercase tracking-wider px-6 h-10 gap-2 shadow-lg hover:shadow-primary/20"
          >
            <span>{isReady ? 'Confirm & Enter Arena' : 'Save & Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
