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

interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  role: 'PLAYER' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN';
  is_banned: boolean;
  ban_reason: string | null;
  reputation_score: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');

  const { data: users, isLoading } = useQuery<UserProfile[]>({
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
    },
  });

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-3xl shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper">ACCESS CONTROL</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {users?.length || 0} REGISTERED ACCOUNTS
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
            User Management & Anti-Cheat
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Assign moderator and reviewer roles, monitor player reputation, and enforce platform bans.
          </p>
        </div>
      </div>

      {/* Users Data Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Platform Players & Staff
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            All actions executed here take effect in real time across the matchmaking and escrow services.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading registered users...
            </div>
          ) : !users || users.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No registered users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Player Account</TableHead>
                  <TableHead className="font-bold">Security Role</TableHead>
                  <TableHead className="font-bold">Reputation</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">@{u.username}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {u.id.substring(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            userId: u.id,
                            role: e.target.value,
                          })
                        }
                        className="bg-secondary text-foreground text-xs px-2.5 py-1 rounded-xl border border-border focus:border-primary outline-none font-mono"
                      >
                        <option value="PLAYER">PLAYER</option>
                        <option value="REVIEWER">REVIEWER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-primary">
                        {u.reputation_score}
                      </span>
                    </TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
