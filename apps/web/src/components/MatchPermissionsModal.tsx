'use client';

import { useState, useEffect } from 'react';
import {
  Monitor,
  Bell,
  ShieldCheck,
  Check,
  Loader2,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export interface MatchPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  gameName: string;
  isCapturing: boolean;
  onStartCapture: () => Promise<void> | void;
  notificationsGranted: boolean;
  onRequestNotifications: () => Promise<boolean>;
}

type DevicePlatform = 'windows' | 'mac' | 'android' | 'ios' | 'linux' | 'other';

export function MatchPermissionsModal({
  open,
  onClose,
  onComplete,
  gameName,
  isCapturing,
  onStartCapture,
  notificationsGranted,
  onRequestNotifications,
}: MatchPermissionsModalProps) {
  const [platform, setPlatform] = useState<DevicePlatform>('windows');
  const [requestingScreen, setRequestingScreen] = useState(false);
  const [requestingNotifs, setRequestingNotifs] = useState(false);
  const [localNotifsGranted, setLocalNotifsGranted] = useState(notificationsGranted);

  // Detect user operating system / platform
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else if (/macintosh|mac os x/.test(ua)) {
      setPlatform('mac');
    } else if (/windows|win32|win64/.test(ua)) {
      setPlatform('windows');
    } else if (/linux/.test(ua)) {
      setPlatform('linux');
    } else {
      setPlatform('other');
    }
  }, []);

  useEffect(() => {
    setLocalNotifsGranted(notificationsGranted);
  }, [notificationsGranted]);

  if (!open) return null;

  const handleGrantScreen = async () => {
    try {
      setRequestingScreen(true);
      await onStartCapture();
    } catch {
      // Handled in pipeline
    } finally {
      setRequestingScreen(false);
    }
  };

  const handleGrantNotifications = async () => {
    try {
      setRequestingNotifs(true);
      const res = await onRequestNotifications();
      setLocalNotifsGranted(res);
    } catch {
      // Handled
    } finally {
      setRequestingNotifs(false);
    }
  };

  const getPlatformDetails = () => {
    switch (platform) {
      case 'windows':
        return {
          label: 'Windows PC (Desktop)',
          icon: Laptop,
          screenTip: 'In the browser sharing popup, select your game window (or entire screen) so scores record automatically.',
          pushTip: 'Windows action center alerts will notify you during full-screen gameplay.',
        };
      case 'mac':
        return {
          label: 'macOS (Desktop / Safari / Chrome)',
          icon: Laptop,
          screenTip: 'Select the game window in System Screen Recording permissions if prompted.',
          pushTip: 'Notification banner alerts will ping you when your opponent joins or match finishes.',
        };
      case 'android':
        return {
          label: 'Android Mobile / Tablet',
          icon: Smartphone,
          screenTip: 'Allow screen cast / window sharing permission when prompted by Chrome/browser.',
          pushTip: 'System lockscreen & heads-up push notifications enabled.',
        };
      case 'ios':
        return {
          label: 'iOS / iPadOS (Safari & PWA)',
          icon: Smartphone,
          screenTip: 'Allow screen broadcast / share in Safari to sync match score feed.',
          pushTip: 'Web push notifications enabled for match room pings.',
        };
      default:
        return {
          label: 'Universal Browser Platform',
          icon: Laptop,
          screenTip: 'Select your game window or display to enable automated score sync and anti-cheat verification.',
          pushTip: 'Browser push notifications will keep you updated in real time.',
        };
    }
  };

  const platformInfo = getPlatformDetails();
  const PlatformIcon = platformInfo.icon;
  const screenDone = isCapturing;
  const notifsDone = localNotifsGranted;
  const allGranted = screenDone && notifsDone;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg my-4 sm:my-8 bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                Pre-Match Permissions
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Required by your device for automated verification and live match alerts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="font-mono text-[10px] gap-1">
              <PlatformIcon className="w-3 h-3" />
              <span>{platformInfo.label}</span>
            </Badge>
          </div>
        </div>

        {/* Permissions Checklist */}
        <div className="space-y-4">
          {/* Permission 1: Game Feed Capture */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              screenDone
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-muted/40 border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    1. Game Window Feed & Anti-Cheat
                  </span>
                  {screenDone && (
                    <Badge variant="success" className="font-mono text-[9px] py-0 px-1.5">
                      CONNECTED ✓
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {platformInfo.screenTip}
                </p>
                <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Privacy guarantee: processed locally in memory. Zero video stored.</span>
                </div>
              </div>

              <Button
                size="sm"
                variant={screenDone ? 'secondary' : 'default'}
                disabled={screenDone || requestingScreen}
                onClick={handleGrantScreen}
                className="flex-shrink-0 text-xs h-8"
              >
                {requestingScreen ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : screenDone ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  'Connect Feed'
                )}
              </Button>
            </div>
          </div>

          {/* Permission 2: Push Notifications */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              notifsDone
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-muted/40 border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    2. Device Alerts & Match Pings
                  </span>
                  {notifsDone && (
                    <Badge variant="success" className="font-mono text-[9px] py-0 px-1.5">
                      ALLOWED ✓
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {platformInfo.pushTip}
                </p>
                <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-1">
                  <span>Audio chime & pop-up toasts active during match duels.</span>
                </div>
              </div>

              <Button
                size="sm"
                variant={notifsDone ? 'secondary' : 'default'}
                disabled={notifsDone || requestingNotifs}
                onClick={handleGrantNotifications}
                className="flex-shrink-0 text-xs h-8"
              >
                {requestingNotifs ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : notifsDone ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  'Enable Alerts'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Permissions Status:</span>
          <span
            className={`font-bold font-mono ${
              allGranted ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {allGranted ? 'All Systems Verified' : `${[screenDone, notifsDone].filter(Boolean).length}/2 Permissions Ready`}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          <Button
            variant={allGranted ? 'default' : 'secondary'}
            size="sm"
            onClick={onComplete}
            disabled={!allGranted}
            className="text-xs gap-1.5 font-bold"
          >
            <span>Proceed to Duel</span>
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
