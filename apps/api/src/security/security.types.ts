export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecurityCategory =
  | 'ANTI_CHEAT'
  | 'SETTLEMENT_LOCK'
  | 'GSI_AUTH'
  | 'OCR_TAMPER'
  | 'RATE_LIMIT'
  | 'SYSTEM'
  | 'ADMIN_ACTION';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: SecuritySeverity;
  category: SecurityCategory;
  actorId?: string;
  matchId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityOverview {
  threatLevel: 'NORMAL' | 'ELEVATED' | 'HIGH';
  settlementHalted: boolean;
  activeLocksCount: number;
  activeSettlementKeys: string[];
  metrics: {
    totalSettlementRacesPrevented: number;
    totalFrozenFrameSpoofsBlocked: number;
    totalUnauthorizedGsiBlocked: number;
    totalRateLimitsTripped: number;
    totalOcrAnomaliesDetected: number;
    totalKillswitchTriggers: number;
  };
  subsystems: {
    redisDistributedLock: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
    antiCheatEngine: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
    valveGsiGate: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
    rateLimitingShield: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  };
}
