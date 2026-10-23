'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  BarChart3,
  ShieldAlert,
  Gamepad2,
  Users,
  Trophy,
  Gem,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Landmark,
  Headphones,
  Vote,
  Zap,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface ProfileData {
  id: string;
  username: string;
  role:
    | 'PLAYER'
    | 'REVIEWER'
    | 'ADMIN'
    | 'SUPER_ADMIN'
    | 'SUPPORT'
    | 'TOURNAMENT_ADMIN'
    | 'FINANCE_AUDITOR'
    | 'COMMUNITY_MANAGER';
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Fetch current user profile to verify role permissions
  const { data: profile, isLoading } = useQuery<ProfileData | null>({
    queryKey: ['admin-rbac-profile'],
    queryFn: async () => {
      try {
        return await apiClient<ProfileData>('/profile/me');
      } catch {
        return null;
      }
    },
    staleTime: 15000,
  });

  const fullAdminTabs = [
    { href: '/admin', label: 'Overview', icon: BarChart3, exact: true },
    { href: '/admin/treasury', label: 'Treasury & Audit', icon: Landmark },
    { href: '/admin/support', label: 'Support Desk', icon: Headphones },
    { href: '/admin/polls', label: 'Polls & Roadmap', icon: Vote },
    { href: '/admin/review', label: 'Review Queue', icon: ShieldAlert },
    { href: '/admin/profiles', label: 'Profiles', icon: Gamepad2 },
    { href: '/admin/users', label: 'Users & Staff', icon: Users },
    { href: '/admin/seasons', label: 'Seasons', icon: Trophy },
    { href: '/admin/sponsors', label: 'Sponsors', icon: Gem },
  ];

  const reviewerTabs = [
    { href: '/admin/review', label: 'Review Queue', icon: ShieldAlert, exact: true },
  ];

  const supportTabs = [
    { href: '/admin/support', label: 'Support Desk', icon: Headphones, exact: false },
    { href: '/admin/polls', label: 'Polls & Roadmap', icon: Vote, exact: false },
  ];

  const tournamentAdminTabs = [
    { href: '/admin/seasons', label: 'Seasons & Resets', icon: Trophy, exact: false },
    { href: '/admin/profiles', label: 'Game Profiles', icon: Gamepad2, exact: false },
    { href: '/games/new?mode=admin', label: 'Calibration', icon: Zap, exact: false },
  ];

  const financeAuditorTabs = [
    { href: '/admin/treasury', label: 'Treasury & Audit', icon: Landmark, exact: false },
  ];

  const communityManagerTabs = [
    { href: '/admin/polls', label: 'Polls & Proposals', icon: Vote, exact: false },
    { href: '/admin/sponsors', label: 'Sponsors & Grants', icon: Gem, exact: false },
  ];

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 max-w-7xl mx-auto py-20">
        <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-foreground">Verifying Operational Clearances</p>
          <p className="text-xs text-muted-foreground font-mono">Checking Role-Based Access Control privileges...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!profile) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-border shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border text-foreground mx-auto flex items-center justify-center shadow-lg">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              AUTHENTICATION REQUIRED (401)
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Staff Sign In Required
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Operations Console is restricted to authenticated platform administrators and match reviewers. Please sign in to verify your security clearances.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
              <Button
                variant="default"
                size="sm"
                className="font-bold text-xs"
              >
                Sign In to Account
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Arena
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const role = profile.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isReviewer = role === 'REVIEWER';
  const isSupport = role === 'SUPPORT';
  const isTournamentAdmin = role === 'TOURNAMENT_ADMIN';
  const isFinanceAuditor = role === 'FINANCE_AUDITOR';
  const isCommunityManager = role === 'COMMUNITY_MANAGER';
  const isStaff =
    isAdmin ||
    isReviewer ||
    isSupport ||
    isTournamentAdmin ||
    isFinanceAuditor ||
    isCommunityManager;

  // 3. Unauthorized Player State (HTTP 403 Forbidden)
  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-destructive/40 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mx-auto flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="destructive" className="font-mono text-[10px]">
              ACCESS FORBIDDEN (403 RBAC)
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Staff Clearance Required
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your account <span className="font-bold text-foreground">@{profile.username}</span> is registered with standard Player credentials. Access to operations, match audits, support triage, and liquidity controls requires designated Staff or Administrator privileges.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href="/">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Competition Arena
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Reviewer Scope Restriction (Reviewers only access /admin/review)
  if (isReviewer && !pathname.startsWith('/admin/review')) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" className="font-mono text-[10px]">
              REVIEWER SCOPE RESTRICTION
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Review Queue Access Only
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As an authorized Dispute Reviewer, your operational credentials grant access to the match dispute audit queue. System governance, user bans, and treasury controls require Administrator clearance.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/admin/review">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <ShieldAlert className="w-3.5 h-3.5" />
                Go to Review Queue
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Arena
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 5. Support Scope Restriction (Support staff only access /admin/support and /admin/polls)
  if (isSupport && !pathname.startsWith('/admin/support') && !pathname.startsWith('/admin/polls')) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center shadow-lg">
            <Headphones className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" className="font-mono text-[10px]">
              SUPPORT STAFF SCOPE
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Support Desk & Community Polls
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As an authorized Support Specialist, your operational credentials grant access to player ticket triage, staff delegation, and community roadmap polls.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/admin/support">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Headphones className="w-3.5 h-3.5" />
                Go to Support Desk
              </Button>
            </Link>
            <Link href="/admin/polls">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Vote className="w-3.5 h-3.5" />
                Polls & Proposals
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 6. Tournament Director Scope Restriction
  if (isTournamentAdmin && !pathname.startsWith('/admin/seasons') && !pathname.startsWith('/admin/profiles')) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center shadow-lg">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" className="font-mono text-[10px]">
              TOURNAMENT DIRECTOR SCOPE
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Seasons & Game Calibration Desk
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As an authorized Tournament Director, your operational credentials grant access to season resets, leaderboard cycles, and game calibration profiles. Treasury controls require Administrator clearance.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/admin/seasons">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Trophy className="w-3.5 h-3.5" />
                Manage Seasons
              </Button>
            </Link>
            <Link href="/admin/profiles">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Gamepad2 className="w-3.5 h-3.5" />
                Game Profiles
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 7. Finance Auditor Scope Restriction
  if (isFinanceAuditor && !pathname.startsWith('/admin/treasury')) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center shadow-lg">
            <Landmark className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" className="font-mono text-[10px]">
              FINANCE AUDITOR SCOPE
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Treasury & Accountancy Desk Only
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As an authorized Financial Auditor, your operational credentials grant read-and-audit access to the treasury balance sheet, segregated income books, and liquidity reserves.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/admin/treasury">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Landmark className="w-3.5 h-3.5" />
                Go to Treasury Audit
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Arena
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 8. Community Manager Scope Restriction
  if (isCommunityManager && !pathname.startsWith('/admin/polls') && !pathname.startsWith('/admin/sponsors')) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 bg-card border-amber-500/30 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center shadow-lg">
            <Vote className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" className="font-mono text-[10px]">
              COMMUNITY MANAGER SCOPE
            </Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Polls & Sponsor Desk Only
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As an authorized Community Manager, your operational credentials grant access to official roadmap polls, user suggestions, and commercial sponsors. Treasury and anti-cheat bans require Administrator clearance.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/admin/polls">
              <Button variant="default" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Vote className="w-3.5 h-3.5" />
                Community Polls
              </Button>
            </Link>
            <Link href="/admin/sponsors">
              <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 w-full sm:w-auto">
                <Gem className="w-3.5 h-3.5" />
                Sponsor Grants
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const activeMobileTabs = isReviewer
    ? reviewerTabs
    : isSupport
    ? supportTabs
    : isTournamentAdmin
    ? tournamentAdminTabs
    : isFinanceAuditor
    ? financeAuditorTabs
    : isCommunityManager
    ? communityManagerTabs
    : fullAdminTabs;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Mobile-Only Responsive Admin Nav Bar */}
      <div className="lg:hidden bg-card border border-border rounded-2xl p-2.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-tight text-foreground">
              Admin Console
            </span>
          </div>
          <Badge
            variant={
              isReviewer
                ? 'warning'
                : isSupport
                ? 'secondary'
                : isTournamentAdmin
                ? 'copper'
                : isFinanceAuditor
                ? 'outline'
                : isCommunityManager
                ? 'default'
                : 'copper'
            }
            className="text-[9px] font-mono uppercase"
          >
            {role.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {activeMobileTabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Admin Content Workspace */}
      <div className="w-full min-w-0">
        {children}
      </div>
    </div>
  );
}
