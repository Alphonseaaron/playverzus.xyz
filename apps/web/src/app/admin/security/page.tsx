'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Activity,
  Terminal,
  Cpu,
  Flame,
  PauseCircle,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';

interface SecurityOverview {
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

interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'ANTI_CHEAT' | 'SETTLEMENT_LOCK' | 'GSI_AUTH' | 'OCR_TAMPER' | 'RATE_LIMIT' | 'SYSTEM' | 'ADMIN_ACTION';
  actorId?: string;
  matchId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export default function SecurityDashboardPage() {
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Emergency Action Inputs
  const [freezeMatchId, setFreezeMatchId] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [voidMatchId, setVoidMatchId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Security Overview (Polled every 5 seconds for live operations)
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<SecurityOverview>({
    queryKey: ['admin-security-overview'],
    queryFn: () => apiClient<SecurityOverview>('/admin/security/overview'),
    refetchInterval: 5000,
  });

  // 2. Fetch Security Events Feed
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<SecurityEvent[]>({
    queryKey: ['admin-security-events', categoryFilter, severityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (severityFilter !== 'ALL') params.set('severity', severityFilter);
      params.set('limit', '75');
      return apiClient<SecurityEvent[]>(`/admin/security/events?${params.toString()}`);
    },
    refetchInterval: 5000,
  });

  // Mutations for Emergency Controls
  const toggleHaltMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiClient('/admin/security/settlement-halt', {
        method: 'POST',
        body: JSON.stringify({ enabled, reason: enabled ? 'Triggered from Security Operations Center' : 'Halt lifted' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-security-events'] });
      setActionSuccessMsg('Settlement Circuit Breaker state successfully updated.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
  });

  const freezeMutation = useMutation({
    mutationFn: ({ matchId, reason }: { matchId: string; reason: string }) =>
      apiClient(`/admin/security/freeze/${matchId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-security-events'] });
      setActionSuccessMsg(`Match #${freezeMatchId} quarantined into REVIEW state.`);
      setFreezeMatchId('');
      setFreezeReason('');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
  });

  const voidMutation = useMutation({
    mutationFn: ({ matchId, reason }: { matchId: string; reason: string }) =>
      apiClient(`/admin/security/void/${matchId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-security-events'] });
      setActionSuccessMsg(`Match #${voidMatchId} voided and escrowed stakes refunded.`);
      setVoidMatchId('');
      setVoidReason('');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    },
  });

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.matchId?.toLowerCase().includes(q) ||
      e.actorId?.toLowerCase().includes(q)
    );
  });

  const threat = overview?.threatLevel || 'NORMAL';
  const isHalted = overview?.settlementHalted || false;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Defcon Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Security Operations Center
                </h1>
                <Badge variant="outline" className="font-mono text-[10px] uppercase border-destructive/40 text-destructive bg-destructive/10">
                  SOC Tier-1
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time threat telemetry, anti-cheat adjudication, distributed locks & killswitch controls
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOverview();
              refetchEvents();
            }}
            className="text-xs font-bold gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          {/* Circuit Breaker Button */}
          <Button
            variant={isHalted ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => toggleHaltMutation.mutate(!isHalted)}
            disabled={toggleHaltMutation.isPending}
            className={`text-xs font-bold gap-1.5 h-9 ${
              isHalted ? 'bg-destructive hover:bg-destructive/90 text-white animate-pulse' : 'border-destructive/40 text-destructive hover:bg-destructive/10'
            }`}
          >
            {isHalted ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            {isHalted ? 'RESUME SETTLEMENTS' : 'CIRCUIT BREAKER: HALT SETTLEMENTS'}
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. Threat Level & Subsystem Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Threat Level */}
        <Card className={`border ${threat === 'HIGH' ? 'border-destructive/80 bg-destructive/5' : threat === 'ELEVATED' ? 'border-amber-500/80 bg-amber-500/5' : 'border-border bg-card'}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Threat Status</span>
              <Radio className={`w-4 h-4 ${threat === 'HIGH' ? 'text-destructive animate-ping' : 'text-emerald-400'}`} />
            </div>
            <CardTitle className="text-xl font-black">
              {threat === 'HIGH' ? 'DEFCON 1 / CRITICAL' : threat === 'ELEVATED' ? 'DEFCON 3 / ELEVATED' : 'DEFCON 5 / NORMAL'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {isHalted ? 'Automated payouts suspended by Security Engineer' : 'All intrusion detection and consensus heuristics nominal'}
          </CardContent>
        </Card>

        {/* Distributed Settlement Lock */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Settlement Guard</span>
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-xl font-black">100% Atomic</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Redis distributed lock active (`settle:id`, 15s TTL). Prevents double-spend concurrency.
          </CardContent>
        </Card>

        {/* Computer Vision & Anti-Cheat */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Computer Vision</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-black">Dual Consensus</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Frozen frame spoofing defense & aspect-ratio normalization active across 21 arenas.
          </CardContent>
        </Card>

        {/* Valve GSI Telemetry Gate */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valve GSI Auth</span>
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <CardTitle className="text-xl font-black">Token Enforced</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Strict room-code binding. Unauthorized client telemetry automatically dropped.
          </CardContent>
        </Card>
      </div>

      {/* 3. Threat Defense Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Settlement Races Blocked</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalSettlementRacesPrevented ?? 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Frozen Overlays Blocked</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalFrozenFrameSpoofsBlocked ?? 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GSI Spoofs Dropped</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalUnauthorizedGsiBlocked ?? 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OCR Tampering Prevented</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalOcrAnomaliesDetected ?? 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rate Limits Tripped</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalRateLimitsTripped ?? 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Killswitch Triggers</div>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">
            {overview?.metrics.totalKillswitchTriggers ?? 0}
          </div>
        </div>
      </div>

      {/* 4. Security Engineer Action Terminal (Killswitches & Quarantines) */}
      <Card className="border border-border bg-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-base font-bold">Emergency Threat Neutralization Controls</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Direct operational interventions for Security Engineers to isolate compromised rooms and refund players.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Freeze / Quarantine */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-amber-400" />
                  Quarantine Match to REVIEW Status
                </span>
                <Badge variant="outline" className="text-[9px] font-mono">Non-Destructive</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Halts OCR capture and locks payout settlement while disputed video frames are audited.
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Match ID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
                  value={freezeMatchId}
                  onChange={(e) => setFreezeMatchId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Input
                  placeholder="Reason for quarantine (e.g. OCR overlay anomaly)"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!freezeMatchId.trim() || freezeMutation.isPending}
                  onClick={() => freezeMutation.mutate({ matchId: freezeMatchId.trim(), reason: freezeReason })}
                  className="w-full text-xs font-bold h-8 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  {freezeMutation.isPending ? 'Quarantining...' : 'Quarantine Match'}
                </Button>
              </div>
            </div>

            {/* Void & Refund */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-destructive" />
                  Void Match & Refund Escrow
                </span>
                <Badge variant="destructive" className="text-[9px] font-mono">Escrow Refund</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Voids the match immediately, refunds all entry fees to both players, and marks match CANCELLED.
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Match ID to void & refund"
                  value={voidMatchId}
                  onChange={(e) => setVoidMatchId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Input
                  placeholder="Reason for cancellation"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!voidMatchId.trim() || voidMutation.isPending}
                  onClick={() => voidMutation.mutate({ matchId: voidMatchId.trim(), reason: voidReason })}
                  className="w-full text-xs font-bold h-8"
                >
                  {voidMutation.isPending ? 'Voiding...' : 'Void Match & Refund Stakes'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Live Security Events & Telemetry Stream */}
      <Card className="border border-border bg-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Real-Time Threat & Defense Audit Log</CardTitle>
                <CardDescription className="text-xs">
                  Streaming event telemetry capturing all OCR consensus mismatches, distributed locks, and auth rejections.
                </CardDescription>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events, matches, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border mt-3">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {['ALL', 'ANTI_CHEAT', 'SETTLEMENT_LOCK', 'GSI_AUTH', 'OCR_TAMPER', 'RATE_LIMIT', 'ADMIN_ACTION'].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="h-6 text-[10px] px-2 font-mono uppercase"
              >
                {cat.replace(/_/g, ' ')}
              </Button>
            ))}

            <div className="h-4 w-px bg-border mx-1" />

            <span className="text-[11px] font-bold text-muted-foreground">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'].map((sev) => (
              <Button
                key={sev}
                variant={severityFilter === sev ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSeverityFilter(sev)}
                className="h-6 text-[10px] px-2 font-mono"
              >
                {sev}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-foreground">Zero Security Anomalies In Filter Window</p>
                <p className="text-[11px]">All intrusion detection heuristics and settlement gates report 100% nominal operation.</p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isCrit = event.severity === 'CRITICAL';
                const isHigh = event.severity === 'HIGH';
                const isMed = event.severity === 'MEDIUM';

                return (
                  <div key={event.id} className="p-4 hover:bg-secondary/20 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isCrit ? 'destructive' : isHigh ? 'warning' : isMed ? 'secondary' : 'outline'}
                          className="font-mono text-[9px] px-1.5 py-0 uppercase"
                        >
                          {event.severity}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 uppercase bg-secondary/40">
                          {event.category.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="font-medium text-foreground text-xs leading-relaxed">
                        {event.description}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap pt-0.5">
                        {event.matchId && (
                          <span>
                            Match:{' '}
                            <span className="text-foreground font-bold">
                              {event.matchId.length > 12 ? `${event.matchId.substring(0, 8)}...` : event.matchId}
                            </span>
                          </span>
                        )}
                        {event.actorId && (
                          <span>
                            Actor:{' '}
                            <span className="text-foreground">
                              {event.actorId.length > 12 ? `${event.actorId.substring(0, 8)}...` : event.actorId}
                            </span>
                          </span>
                        )}
                        {event.metadata && (
                          <span>Metadata: {JSON.stringify(event.metadata)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
