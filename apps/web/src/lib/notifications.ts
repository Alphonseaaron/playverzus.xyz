'use client';

/**
 * Verzus In-Browser Notification & Audio Chime Service
 * Provides audio tones (via Web Audio API) and system desktop notifications
 * so players know when an opponent joins, screen connects, scores progress,
 * or the match finishes without having to stare at the browser window.
 */

// Web Audio synthesizer for clean, zero-asset notification chimes
class SoundEffects {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft high two-tone chime for "Opponent Joined" or "Game Connected"
  playConnectChime() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Note 1: E5 (659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5 (987Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Audio not permitted or supported
    }
  }

  // Subtle score update tick
  playScorePip() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio not permitted or supported
    }
  }

  // Fanfare victory chord for "Match Settled / Winner Declared"
  playVictoryChord() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.14, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.7);
      });
    } catch {
      // Audio not permitted or supported
    }
  }
}

export const sounds = new SoundEffects();

/**
 * Request desktop notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

import { useNotificationStore, type NotificationType } from './notificationStore';

/**
 * Dispatch in-app toast popup, desktop notification + optional audio alert
 */
export function notifyUser(
  title: string,
  options?: {
    body?: string;
    sound?: 'connect' | 'score' | 'victory';
    type?: NotificationType;
    actionLabel?: string;
    actionUrl?: string;
    durationMs?: number;
  }
) {
  // 1. Play audio chime if requested
  if (options?.sound === 'connect') sounds.playConnectChime();
  else if (options?.sound === 'score') sounds.playScorePip();
  else if (options?.sound === 'victory') sounds.playVictoryChord();

  // 2. Dispatch visual in-app popup toast (always visible to user)
  if (typeof window !== 'undefined') {
    try {
      useNotificationStore.getState().addNotification({
        title,
        body: options?.body || 'Check the Playverzus.xyz room for updates.',
        type: options?.type || (options?.sound === 'victory' ? 'success' : options?.sound === 'connect' ? 'match' : 'info'),
        actionLabel: options?.actionLabel,
        actionUrl: options?.actionUrl,
        durationMs: options?.durationMs ?? 6000,
      });
    } catch {
      // Store fallback
    }
  }

  // 3. Dispatch native desktop notification if user granted permission
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: options?.body || 'Check the Playverzus.xyz room for updates.',
        icon: '/favicon.ico',
      });
    } catch {
      // Fallback
    }
  }
}

