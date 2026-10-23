'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { CountryFlag } from '../../../components/CountryFlag';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Headphones,
  Trophy,
  Landmark,
  Vote,
  Sparkles,
  Info,
  X,
} from 'lucide-react';

type UserRole =
  | 'PLAYER'
  | 'SUPPORT'
  | 'REVIEWER'
  | 'TOURNAMENT_ADMIN'
  | 'FINANCE_AUDITOR'
  | 'COMMUNITY_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  country_code?: string;
  region?: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason: string | null;
  reputation_score: number;
  created_at: string;
}

const STAFF_ROLES_META: Record<
  UserRole,
  {
    title: string;
    description: string;
    scope: string;
    icon: any;
    badgeVariant: 'default' | 'secondary' | 'outline' | 'copper' | 'warning' | 'success';
  }
> = {
  PLAYER: {
    title: 'Standard Competitor',
    description: 'Standard player account. Can enter 1v1 duels, tournaments, cashier, and submit support tickets.',
    scope: 'No operational access',
    icon: Users,
    badgeVariant: 'outline',
  },
  SUPPORT: {
    title: 'Customer Support Specialist',
    description: 'Triages player tickets, resolves inquiries, assigns tasks, and reviews incoming feature suggestions.',
    scope: 'Support Desk (/admin/support) & Community Polls (/admin/polls)',
    icon: Headphones,
    badgeVariant: 'secondary',
  },
  REVIEWER: {
    title: 'Match Dispute Referee',
    description: 'Audits disputed match rooms, inspects OCR score anomalies, and resolves anti-cheat flags.',
    scope: 'Review Queue (/admin/review) only',
    icon: ShieldAlert,
    badgeVariant: 'warning',
  },
  TOURNAMENT_ADMIN: {
    title: 'Tournament & Esports Director',
    description: 'Manages season resets, competitive leagues, brackets, and calibrates game profile parameters.',
    scope: 'Seasons (/admin/seasons), Profiles (/admin/profiles), Calibration',
    icon: Trophy,
    badgeVariant: 'copper',
  },
  FINANCE_AUDITOR: {
    title: 'Treasury & Financial Auditor',
    description: 'Independent CPA auditor. Inspects segregated income books, reserve coverage, and cashier flows.',
    scope: 'Treasury & Accountancy (/admin/treasury) only',
    icon: Landmark,
    badgeVariant: 'copper',
  },
  COMMUNITY_MANAGER: {
    title: 'Community & Growth Manager',
    description: 'Curates player suggestions, launches official roadmap polls, and manages commercial sponsors.',
    scope: 'Roadmap Polls (/admin/polls) & Sponsors (/admin/sponsors)',
    icon: Vote,
    badgeVariant: 'default',
  },
  ADMIN: {
    title: 'Platform Operations Administrator',
    description: 'Full administrative access across all operational desks, player moderation, bans, and calibration.',
    scope: 'All desks except Super Admin root ownership',
    icon: ShieldCheck,
    badgeVariant: 'copper',
  },
  SUPER_ADMIN: {
    title: 'Root Platform Founder',
    description: 'Unrestricted root clearance. Full authority over platform configuration, treasury, and staff roles.',
    scope: 'Global Unrestricted Authority',
    icon: Sparkles,
    badgeVariant: 'copper',
  },
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'STAFF' | 'ALL' | 'ROLE_GUIDE'>('STAFF');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Ban modal state
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');

  // Promote staff modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('SUPPORT');

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiClient<UserProfile[]>('/admin/users'),
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiClient(`/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setBanModalUser(null);
      setBanReason('');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/admin/users/${userId}/unban`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient(`/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setPromoteModalOpen(false);
    },
  });

  const staffMembers = users.filter((u) => u.role !== 'PLAYER');

  const filteredUsers = users.filter((u) => {
    if (activeTab === 'STAFF') {
      if (u.role === 'PLAYER') return false;
    }
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchEmail = u.email ? u.email.toLowerCase().includes(q) : false;
      const matchId = u.id.toLowerCase().includes(q);
      return matchUsername || matchEmail || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-3xl shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper">SECURITY & ACCESS CONTROL</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {staffMembers.length} ACTIVE STAFF · {users.length} TOTAL ACCOUNTS
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
            Staff Clearances & User Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Delegate operational responsibilities to staff members with strict least-privilege security.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={() => setPromoteModalOpen(true)}
            size="sm"
            className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add / Assign Staff
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'STAFF'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Staff Directory ({staffMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Registered Players ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROLE_GUIDE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'ROLE_GUIDE'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Clearance Scopes Guide</span>
        </button>
      </div>

      {/* Search and Filters Bar (Shown on STAFF and ALL tabs) */}
      {activeTab !== 'ROLE_GUIDE' && (
        <Card className="p-3.5 bg-card border-border shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search username, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Filter Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-auto font-mono"
              >
                <option value="ALL">All Roles</option>
                <option value="PLAYER">PLAYER (Standard)</option>
                <option value="SUPPORT">SUPPORT (Customer Care)</option>
                <option value="REVIEWER">REVIEWER (Dispute Referee)</option>
                <option value="TOURNAMENT_ADMIN">TOURNAMENT_ADMIN (Director)</option>
                <option value="FINANCE_AUDITOR">FINANCE_AUDITOR (Treasury)</option>
                <option value="COMMUNITY_MANAGER">COMMUNITY_MANAGER (Polls)</option>
                <option value="ADMIN">ADMIN (Operations)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Owner)</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 1 & TAB 2: Table View */}
      {activeTab !== 'ROLE_GUIDE' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              {activeTab === 'STAFF' ? 'Operational Staff Clearances' : 'Registered Users Database'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {activeTab === 'STAFF'
                ? 'Each staff member is restricted strictly to their assigned workspace and cannot view unauthorized financial or governance data.'
                : 'All role promotions, revocations, and bans execute immediately in real time.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Loading accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                No accounts match the current filter criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Account / User</TableHead>
                    <TableHead className="font-bold">Security Clearance (Role)</TableHead>
                    <TableHead className="font-bold">Permitted Workspace Scope</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const meta = STAFF_ROLES_META[u.role] || STAFF_ROLES_META.PLAYER;
                    const RoleIcon = meta.icon;

                    return (
                      <TableRow key={u.id}>
                        {/* Account Name */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <CountryFlag
                                code={u.country_code || u.region}
                                fallbackSeed={u.username || u.id}
                                size="xs"
                              />
                              <span>@{u.username}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {u.id.substring(0, 8)}... {u.email ? `· ${u.email}` : ''}
                            </span>
                          </div>
                        </TableCell>

                        {/* Role Select Dropdown */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="w-4 h-4 text-primary flex-shrink-0" />
                            <select
                              value={u.role}
                              onChange={(e) =>
                                roleMutation.mutate({
                                  userId: u.id,
                                  role: e.target.value,
                                })
                              }
                              className="bg-secondary text-foreground text-xs px-2.5 py-1.5 rounded-xl border border-border focus:border-primary outline-none font-mono"
                            >
                              <option value="PLAYER">PLAYER (Standard User)</option>
                              <option value="SUPPORT">SUPPORT (Customer Care)</option>
                              <option value="REVIEWER">REVIEWER (Dispute Referee)</option>
                              <option value="TOURNAMENT_ADMIN">TOURNAMENT_ADMIN (Director)</option>
                              <option value="FINANCE_AUDITOR">FINANCE_AUDITOR (Treasury)</option>
                              <option value="COMMUNITY_MANAGER">COMMUNITY_MANAGER (Polls)</option>
                              <option value="ADMIN">ADMIN (Operations Admin)</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN (Owner)</option>
                            </select>
                          </div>
                        </TableCell>

                        {/* Scope description */}
                        <TableCell>
                          <span className="text-[11px] text-muted-foreground font-mono block max-w-xs truncate">
                            {meta.scope}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {u.is_banned ? (
                            <Badge variant="destructive" className="font-mono text-[10px]">
                              BANNED: {u.ban_reason || 'Violation'}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-mono text-[10px]">
                              ACTIVE ✓
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {u.is_banned ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => unbanMutation.mutate(u.id)}
                              className="text-xs font-bold"
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setBanModalUser(u);
                                setBanReason('');
                              }}
                              className="text-xs font-bold"
                            >
                              Ban User
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Roles & Permissions Scopes Matrix Guide */}
      {activeTab === 'ROLE_GUIDE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(STAFF_ROLES_META) as UserRole[]).map((roleKey) => {
            const meta = STAFF_ROLES_META[roleKey];
            const Icon = meta.icon;
            const staffCount = users.filter((u) => u.role === roleKey).length;

            return (
              <Card key={roleKey} className="p-5 bg-card border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground font-mono">{roleKey}</h3>
                      <p className="text-[11px] text-muted-foreground">{meta.title}</p>
                    </div>
                  </div>

                  <Badge variant={meta.badgeVariant} className="font-mono text-[10px]">
                    {staffCount} {staffCount === 1 ? 'user' : 'users'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>

                <div className="p-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] font-mono">
                  <span className="text-muted-foreground uppercase text-[10px] block font-bold">Authorized Scope:</span>
                  <span className="text-foreground font-semibold">{meta.scope}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Promote Staff Member Modal */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative space-y-4">
            <button
              onClick={() => setPromoteModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-bold">
                <UserPlus className="w-3.5 h-3.5" />
                STAFF ASSIGNMENT & ONBOARDING
              </div>
              <h3 className="text-xl font-black text-foreground">Promote User to Staff Role</h3>
              <p className="text-xs text-muted-foreground">
                Assign a dedicated operational clearance. The staff member will be restricted to what they need.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select User Account</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Choose a registered user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.username} ({u.email || u.id.slice(0, 8)}) — Current: {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Designated Staff Role</label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              >
                <option value="SUPPORT">SUPPORT — Customer Support Desk & Polls</option>
                <option value="REVIEWER">REVIEWER — Match Dispute Referee</option>
                <option value="TOURNAMENT_ADMIN">TOURNAMENT_ADMIN — Tournament & Seasons Director</option>
                <option value="FINANCE_AUDITOR">FINANCE_AUDITOR — Treasury & Accountancy Auditor</option>
                <option value="COMMUNITY_MANAGER">COMMUNITY_MANAGER — Roadmap Polls & Sponsor Manager</option>
                <option value="ADMIN">ADMIN — Full Platform Administrator</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN — Root Platform Owner</option>
                <option value="PLAYER">PLAYER — Revoke Staff Clearances (Reset to Player)</option>
              </select>
            </div>

            {selectedNewRole && (
              <div className="p-3 rounded-xl bg-secondary/60 border border-border text-xs space-y-1">
                <span className="font-bold text-foreground block">
                  {STAFF_ROLES_META[selectedNewRole]?.title}
                </span>
                <p className="text-muted-foreground text-[11px]">
                  {STAFF_ROLES_META[selectedNewRole]?.description}
                </p>
                <p className="text-primary font-mono text-[10px] font-bold mt-1">
                  Scope: {STAFF_ROLES_META[selectedNewRole]?.scope}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPromoteModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={roleMutation.isPending || !selectedUserId}
                onClick={() =>
                  roleMutation.mutate({
                    userId: selectedUserId,
                    role: selectedNewRole,
                  })
                }
                className="font-bold text-xs gap-1.5"
              >
                {roleMutation.isPending ? 'Updating...' : 'Assign Clearance'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Ban Reason Inline Action Panel */}
      {banModalUser && (
        <Card className="p-6 border border-destructive/50 bg-card shadow-2xl space-y-4 animate-in fade-in duration-150">
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-black text-foreground flex items-center justify-between">
              <span>Moderate & Ban @{banModalUser.username}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBanModalUser(null)}
                className="text-xs"
              >
                ✕ Cancel
              </Button>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Provide a valid moderation reason. The player will be immediately restricted from entering duels, escrow payouts, and tournaments.
            </CardDescription>
          </CardHeader>

          <Input
            type="text"
            placeholder="e.g. Cheat detection: emulator exploit / ROI bypass"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="text-xs"
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBanModalUser(null)}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                banMutation.mutate({
                  userId: banModalUser.id,
                  reason: banReason || 'Terms of Service violation',
                })
              }
              disabled={banMutation.isPending}
              className="text-xs font-bold"
            >
              {banMutation.isPending ? 'Banning...' : 'Confirm Ban'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
