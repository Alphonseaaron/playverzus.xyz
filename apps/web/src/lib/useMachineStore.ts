'use client';

import { create } from 'zustand';

export type MachinePlatform = 'PC' | 'CONSOLE' | 'MOBILE';
export type IngestMethod = 'WINDOW' | 'REMOTE_PLAY' | 'CAPTURE_CARD' | 'STREAM' | 'CAMERA';

export interface MachineProfile {
  id: string;
  name: string;
  platform: MachinePlatform;
  ingestMethod: IngestMethod;
  lastUsedAt: string;
  isDefault: boolean;
}

interface MachineStoreState {
  savedMachines: Record<string, MachineProfile>; // machineId -> MachineProfile
  activeMachineId: string | null;
  hasHydrated: boolean;

  // Actions
  registerMachine: (profile: Omit<MachineProfile, 'id' | 'lastUsedAt'>) => MachineProfile;
  setActiveMachine: (machineId: string) => void;
  getActiveMachine: () => MachineProfile | null;
  getSuggestedMachine: (gamePlatform?: string) => MachineProfile | null;
  hydrate: () => void;
}

const STORAGE_KEY = 'playverzus_registered_machines';

export const useMachineStore = create<MachineStoreState>((set, get) => ({
  savedMachines: {},
  activeMachineId: null,
  hasHydrated: false,

  registerMachine: (profileData) => {
    const id = `machine_${profileData.platform.toLowerCase()}_${Date.now().toString(36)}`;
    const newMachine: MachineProfile = {
      ...profileData,
      id,
      lastUsedAt: new Date().toISOString(),
      isDefault: true,
    };

    const current = get().savedMachines;
    const updated: Record<string, MachineProfile> = { ...current };

    // Set all other machines to non-default if this is default
    if (newMachine.isDefault) {
      Object.keys(updated).forEach((k) => {
        if (updated[k]) updated[k]!.isDefault = false;
      });
    }

    updated[id] = newMachine;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }

    set({ savedMachines: updated, activeMachineId: id });
    return newMachine;
  },

  setActiveMachine: (machineId: string) => {
    const current = get().savedMachines;
    if (current[machineId]) {
      const updated = {
        ...current,
        [machineId]: { ...current[machineId]!, lastUsedAt: new Date().toISOString() },
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      set({ savedMachines: updated, activeMachineId: machineId });
    }
  },

  getActiveMachine: () => {
    const { savedMachines, activeMachineId } = get();
    if (activeMachineId && savedMachines[activeMachineId]) {
      return savedMachines[activeMachineId]!;
    }
    const defaultMachine = Object.values(savedMachines).find((m) => m.isDefault);
    return defaultMachine || Object.values(savedMachines)[0] || null;
  },

  getSuggestedMachine: (gamePlatform?: string) => {
    const { savedMachines } = get();
    const machines = Object.values(savedMachines);
    if (machines.length === 0) return null;

    if (gamePlatform) {
      const upper = gamePlatform.toUpperCase();
      const match = machines.find((m) => m.platform === upper || (upper.includes(m.platform)));
      if (match) return match;
    }

    return machines.find((m) => m.isDefault) || machines[0] || null;
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Record<string, MachineProfile> = JSON.parse(saved);
          const active = Object.values(parsed).find((m) => m.isDefault)?.id || Object.keys(parsed)[0] || null;
          set({ savedMachines: parsed, activeMachineId: active, hasHydrated: true });
          return;
        }
      } catch {}

      // Pre-seed a sensible default machine if first visit (PC Gaming Rig)
      const defaultId = 'machine_pc_default';
      const initial: Record<string, MachineProfile> = {
        [defaultId]: {
          id: defaultId,
          name: 'Primary Gaming Rig',
          platform: 'PC',
          ingestMethod: 'WINDOW',
          lastUsedAt: new Date().toISOString(),
          isDefault: true,
        },
      };
      set({ savedMachines: initial, activeMachineId: defaultId, hasHydrated: true });
    }
  },
}));
