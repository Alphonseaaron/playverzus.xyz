'use client';

export type DevicePlatform = 'windows' | 'mac' | 'android' | 'ios' | 'linux' | 'other';

export interface DeviceMachineAuth {
  machineId: string;
  machineName: string;
  platform: DevicePlatform;
  screenShareAuthorized: boolean;
  alertsAuthorized: boolean;
  autoEscrowEnabled: boolean;
  intelligentGameLock: boolean;
  registeredAt: string;
  lastVerifiedAt: string;
}

const STORAGE_KEY = 'playverzus_machine_auth_v1';

export function detectDevicePlatform(): { platform: DevicePlatform; machineName: string } {
  if (typeof window === 'undefined') {
    return { platform: 'other', machineName: 'Universal Gaming Client' };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  let platform: DevicePlatform = 'other';
  let osLabel = 'Device';

  if (/iphone|ipad|ipod/.test(ua)) {
    platform = 'ios';
    osLabel = 'Apple iOS Device';
  } else if (/android/.test(ua)) {
    platform = 'android';
    osLabel = 'Android Mobile';
  } else if (/macintosh|mac os x/.test(ua)) {
    platform = 'mac';
    osLabel = 'macOS Workstation';
  } else if (/windows|win32|win64/.test(ua)) {
    platform = 'windows';
    osLabel = 'Windows Gaming PC';
  } else if (/linux/.test(ua)) {
    platform = 'linux';
    osLabel = 'Linux Rig';
  }

  let browserLabel = 'Browser';
  if (/edg\//.test(ua)) browserLabel = 'Edge';
  else if (/chrome\//.test(ua)) browserLabel = 'Chrome';
  else if (/firefox\//.test(ua)) browserLabel = 'Firefox';
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browserLabel = 'Safari';

  return {
    platform,
    machineName: `${osLabel} (${browserLabel})`,
  };
}

function generateMachineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `mach_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `mach_${Math.random().toString(36).substring(2, 14)}`;
}

export function getMachineAuth(): DeviceMachineAuth {
  if (typeof window === 'undefined') {
    return {
      machineId: 'server',
      machineName: 'Server Client',
      platform: 'other',
      screenShareAuthorized: false,
      alertsAuthorized: false,
      autoEscrowEnabled: true,
      intelligentGameLock: true,
      registeredAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeviceMachineAuth;
      // Re-verify browser notification permission if window.Notification is available
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && !parsed.alertsAuthorized) {
          parsed.alertsAuthorized = true;
          parsed.lastVerifiedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }
      return parsed;
    }
  } catch {}

  const detected = detectDevicePlatform();
  const initial: DeviceMachineAuth = {
    machineId: generateMachineId(),
    machineName: detected.machineName,
    platform: detected.platform,
    screenShareAuthorized: false,
    alertsAuthorized:
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission === 'granted'
        : false,
    autoEscrowEnabled: true,
    intelligentGameLock: true,
    registeredAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}

  return initial;
}

export function registerCurrentMachine(
  screenGranted: boolean = true,
  alertsGranted: boolean = true,
): DeviceMachineAuth {
  const current = getMachineAuth();
  const updated: DeviceMachineAuth = {
    ...current,
    screenShareAuthorized: screenGranted,
    alertsAuthorized: alertsGranted,
    autoEscrowEnabled: true,
    intelligentGameLock: true,
    lastVerifiedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event so all open tabs and components react immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('playverzus:machine-registered', { detail: updated }),
      );
    }
  } catch {}

  return updated;
}

export function updateAlertsPermission(granted: boolean): DeviceMachineAuth {
  const current = getMachineAuth();
  const updated: DeviceMachineAuth = {
    ...current,
    alertsAuthorized: granted,
    lastVerifiedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('playverzus:machine-registered', { detail: updated }),
      );
    }
  } catch {}

  return updated;
}

export function updateScreenPermission(granted: boolean): DeviceMachineAuth {
  const current = getMachineAuth();
  const updated: DeviceMachineAuth = {
    ...current,
    screenShareAuthorized: granted,
    lastVerifiedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('playverzus:machine-registered', { detail: updated }),
      );
    }
  } catch {}

  return updated;
}

export function isMachineFullyRegistered(): boolean {
  const auth = getMachineAuth();
  return auth.screenShareAuthorized && auth.alertsAuthorized;
}

export function isMachineRegisteredForCapture(): boolean {
  const auth = getMachineAuth();
  return auth.screenShareAuthorized;
}
