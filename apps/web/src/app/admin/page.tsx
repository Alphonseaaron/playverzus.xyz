'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  BarChart3,
  ShieldAlert,
  Gamepad2,
  Zap,
  Users,
  Trophy,
  Gem,
  ArrowRight,
  Shield,
  CheckCircle2,
} from 'lucide-react';

interface PlatformStats {
  users: number;
  matches: number;
  tournaments: number;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient<PlatformStats>('/admin/stats').catch(() => ({ users: 0, matches: 0, tournaments: 0 })),
  });

  const { data: reviewTasks } = useQuery<Array<{ id: string }>>({
    queryKey: ['admin-review-badge-count'],
    queryFn: () => apiClient<Array<{ id: string }>>('/review/queue').catch(() => []),
  });

  const pendingReviewCount = reviewTasks?.length ?? 0;

  const quickActions = [
    {
      title: 'Automated Game Calibration',
      badge: 'CALIBRATION',
      badgeVariant: 'copper' as const,
      description: 'Upload reference gameplay HUD screenshots to configure score recognition regions automatically.',
      href: '/games/new?mode=admin',
      actionLabel: 'Launch Calibrator',
      icon: Zap,
      highlight: true,
    },
    {
      title: 'Dispute & Review Queue',
      badge: pendingReviewCount > 0 ? `${pendingReviewCount} PENDING` : 'CLEARED',
      badgeVariant: pendingReviewCount > 0 ? ('warning' as const) : ('success' as const),
      description: 'Audit flagged match outcomes and human-moderated score discrepancies.',
      href: '/admin/review',
      actionLabel: 'Audit Queue',
      icon: ShieldAlert,
    },
    {
      title: 'Approve Game Profiles',
      badge: 'REGISTRY',
      badgeVariant: 'secondary' as const,
      description: 'Verify community-submitted game archetypes, rulesets, and verification coordinates.',
      href: '/admin/profiles',
      actionLabel: 'Review Profiles',
      icon: Gamepad2,
    },
    {
      title: 'User Management & Anti-Cheat',
      badge: 'SECURITY',
      badgeVariant: 'secondary' as const,
      description: 'Assign reviewer roles, inspect reputation scores, and enforce hardware or account bans.',
      href: '/admin/users',
      actionLabel: 'Manage Users',
      icon: Users,
    },
    {
      title: 'Competitive Seasons & Resets',
      badge: 'LADDERS',
      badgeVariant: 'secondary' as const,
      description: 'Configure season intervals, perform soft Elo resets, and distribute seasonal badges.',
      href: '/admin/seasons',
      actionLabel: 'Configure Seasons',
      icon: Trophy,
    },
    {
      title: 'Sponsor Liquidity & Pools',
      badge: 'TREASURY',
      badgeVariant: 'secondary' as const,
      description: 'Manage brand partners funding tournament prize pools and sponsored cash cups.',
      href: '/admin/sponsors',
      actionLabel: 'View Sponsors',
      icon: Gem,
    },
  ];

  return (
    <div className="space-y-8 min-w-0">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 bg-card border border-border rounded-3xl shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary flex-shrink-0 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">VERZUS OPERATIONS CORE</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                VERSION 2.4.0
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Operations & Moderator Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Platform administration, automated validation telemetry, dispute arbitration, and ladder governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          <Link href="/games/new?mode=admin">
            <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Calibrate Game</span>
            </Button>
          </Link>
          <Link href="/admin/review">
            <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Review Queue</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Platform KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
              Active Registered Gamers
            </CardDescription>
            <CardTitle className="text-3xl font-black font-mono text-primary">
              {isLoading ? '...' : (stats?.users ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">
              Verified player accounts with linked gamertags
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
              Total Matches Executed
            </CardDescription>
            <CardTitle className="text-3xl font-black font-mono text-foreground">
              {isLoading ? '...' : (stats?.matches ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">
              Auto-verified 1v1 duels and party contests
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
              Tournaments & Cups
            </CardDescription>
            <CardTitle className="text-3xl font-black font-mono text-foreground">
              {isLoading ? '...' : (stats?.tournaments ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">
              Elimination brackets, Swiss cups, and cash ladders
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Operational Command Modules */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
            Management & Verification Modules
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct access to all administrative interfaces and automated pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group">
                <Card
                  className={`h-full flex flex-col justify-between transition-all duration-200 hover:border-primary/50 hover:shadow-xl ${
                    action.highlight ? 'bg-primary/5 border-primary/40' : 'bg-card'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={action.badgeVariant} className="text-[10px] font-mono">
                        {action.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors mt-2">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>{action.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
