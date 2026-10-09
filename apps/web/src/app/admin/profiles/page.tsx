'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import type { GameProfile } from '@playverzus/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Zap } from 'lucide-react';

export default function AdminProfilesPage() {
  const { data: profiles, refetch, isLoading } = useQuery<GameProfile[]>({
    queryKey: ['all-game-profiles'],
    queryFn: () => apiClient<GameProfile[]>('/games'),
  });

  const handleApprove = async (id: string) => {
    try {
      await apiClient(`/games/${id}/approve`, { method: 'POST' });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Approval failed: ${msg}`);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-3xl shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper">GAME REGISTRY</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {profiles?.length || 0} TOTAL TITLES
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
            Approve Game Profiles
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review community-submitted archetypes, coordinate regions, and game calibration metadata.
          </p>
        </div>

        <Link href="/games/new?mode=admin" className="flex-shrink-0">
          <Button variant="default" size="default" className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20">
            <Zap className="w-3.5 h-3.5" />
            <span>Auto-Calibrate New Game</span>
          </Button>
        </Link>
      </div>

      {/* Profiles Data Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Registered Esports Archetypes
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Games approved here will immediately become playable across 1v1 duels, brackets, and ladder leaderboards.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading registered game profiles...
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No game profiles registered yet. Launch the Auto-Calibrator to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Game Title</TableHead>
                  <TableHead className="font-bold">Platform</TableHead>
                  <TableHead className="font-bold">Genre / Mode</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-foreground">
                      <div className="flex flex-col">
                        <span>{p.displayName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {p.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.gameType.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.approved ? 'success' : 'warning'}
                        className="font-mono text-[10px]"
                      >
                        {p.approved ? 'APPROVED ✓' : 'PENDING REVIEW'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/games/${p.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Hub
                          </Button>
                        </Link>
                        {!p.approved && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(p.id)}
                            className="text-xs font-bold"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
