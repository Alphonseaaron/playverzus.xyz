'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

import {
  BarChart3,
  ShieldAlert,
  Gamepad2,
  Zap,
  Users,
  Trophy,
  Gem,
  Activity,
  ArrowLeft,
  Landmark,
  Headphones,
  Vote,
} from 'lucide-react';

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'copper' | 'warning' | 'success';
  exact?: boolean;
}

interface AdminNavSection {
  group: string;
  items: AdminNavItem[];
}

interface AdminSidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function AdminSidebar({ onNavClick, className = '' }: AdminSidebarProps) {
  const pathname = usePathname();

  // Fetch current user profile to determine clearance level
  const { data: profile } = useQuery<{ id: string; role?: string; username?: string } | null>({
    queryKey: ['admin-sidebar-profile'],
    queryFn: () => apiClient<{ id: string; role?: string; username?: string }>('/profile/me').catch(() => null),
    staleTime: 30000,
  });

  const role = profile?.role || 'PLAYER';
  const isReviewer = role === 'REVIEWER';
  const isSupport = role === 'SUPPORT';
  const isTournamentAdmin = role === 'TOURNAMENT_ADMIN';
  const isFinanceAuditor = role === 'FINANCE_AUDITOR';
  const isCommunityManager = role === 'COMMUNITY_MANAGER';

  // Fetch pending review count for live HITL badge
  const { data: reviewTasks } = useQuery<Array<{ id: string }>>({
    queryKey: ['admin-sidebar-review-count'],
    queryFn: () => apiClient<Array<{ id: string }>>('/review/queue').catch(() => []),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const pendingCount = reviewTasks?.length ?? 0;

  // Filter navigation sections based on RBAC clearance
  let navSections: AdminNavSection[] = [];

  if (isReviewer) {
    navSections = [
      {
        group: 'Moderation & Audit',
        items: [
          {
            href: '/admin/review',
            label: 'Audit & Review Queue',
            icon: ShieldAlert,
            badge: pendingCount > 0 ? `${pendingCount}` : null,
            badgeVariant: 'warning',
            exact: true,
          },
        ],
      },
    ];
  } else if (isSupport) {
    navSections = [
      {
        group: 'Player Care & Triage',
        items: [
          {
            href: '/admin/support',
            label: 'Support Desk',
            icon: Headphones,
            badge: 'STAFF',
            badgeVariant: 'warning',
          },
          {
            href: '/admin/polls',
            label: 'Community Polls',
            icon: Vote,
            badge: null,
          },
        ],
      },
    ];
  } else if (isTournamentAdmin) {
    navSections = [
      {
        group: 'Esports & Competition',
        items: [
          {
            href: '/admin/seasons',
            label: 'Seasons & Resets',
            icon: Trophy,
            badge: null,
          },
          {
            href: '/admin/profiles',
            label: 'Game Profiles',
            icon: Gamepad2,
            badge: null,
          },
          {
            href: '/games/new?mode=admin',
            label: 'Automated Calibration',
            icon: Zap,
            badge: 'NEW',
            badgeVariant: 'copper',
          },
        ],
      },
    ];
  } else if (isFinanceAuditor) {
    navSections = [
      {
        group: 'Treasury & Liquidity',
        items: [
          {
            href: '/admin/treasury',
            label: 'Treasury & Accountancy',
            icon: Landmark,
            badge: 'AUDIT',
            badgeVariant: 'copper',
          },
        ],
      },
    ];
  } else if (isCommunityManager) {
    navSections = [
      {
        group: 'Community & Growth',
        items: [
          {
            href: '/admin/polls',
            label: 'Roadmap & Polls',
            icon: Vote,
            badge: null,
          },
          {
            href: '/admin/sponsors',
            label: 'Sponsor Liquidity',
            icon: Gem,
            badge: null,
          },
        ],
      },
    ];
  } else {
    // Full Administrator / Super Administrator
    navSections = [
      {
        group: 'Core Operations',
        items: [
          {
            href: '/admin',
            label: 'Overview',
            icon: BarChart3,
            badge: null,
            exact: true,
          },
          {
            href: '/admin/review',
            label: 'Audit & Review Queue',
            icon: ShieldAlert,
            badge: pendingCount > 0 ? `${pendingCount}` : null,
            badgeVariant: 'warning',
          },
        ],
      },
      {
        group: 'Staff Support & Community',
        items: [
          {
            href: '/admin/support',
            label: 'Support Desk',
            icon: Headphones,
            badge: null,
          },
          {
            href: '/admin/polls',
            label: 'Community Polls',
            icon: Vote,
            badge: null,
          },
        ],
      },
      {
        group: 'Game Registry & Calibration',
        items: [
          {
            href: '/admin/profiles',
            label: 'Game Profiles',
            icon: Gamepad2,
            badge: null,
          },
          {
            href: '/games/new?mode=admin',
            label: 'Automated Calibration',
            icon: Zap,
            badge: 'NEW',
            badgeVariant: 'copper',
          },
        ],
      },
      {
        group: 'Governance & Liquidity',
        items: [
          {
            href: '/admin/treasury',
            label: 'Treasury & Accountancy',
            icon: Landmark,
            badge: 'CPA AUDIT',
            badgeVariant: 'copper',
          },
          {
            href: '/admin/users',
            label: 'Users & Staff Clearances',
            icon: Users,
            badge: null,
          },
          {
            href: '/admin/seasons',
            label: 'Seasons & Resets',
            icon: Trophy,
            badge: null,
          },
          {
            href: '/admin/sponsors',
            label: 'Sponsor Liquidity',
            icon: Gem,
            badge: null,
          },
        ],
      },
    ];
  }

  return (
    <aside
      className={`w-64 flex-shrink-0 bg-card border-r border-border flex flex-col justify-between p-4 pb-6 select-none h-screen min-h-screen sticky top-0 overflow-y-auto scrollbar-none z-30 ${className}`}
    >
      <div className="space-y-6">
        {/* Admin Brand & Shield Header */}
        <div className="space-y-2">
          <Link
            href="/admin"
            onClick={onNavClick}
            className="flex items-center gap-3 px-2 py-1 text-foreground hover:opacity-90 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-sm transition-transform group-hover:scale-105">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-foreground leading-tight">
                  ADMIN CONSOLE
                </span>
              </div>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider leading-none">
                Operations & Moderation
              </span>
            </div>
          </Link>

          {/* Operational Health Badge */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-secondary/60 border border-border text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>SYSTEM LIVE</span>
            </span>
            <span className="font-bold text-foreground">v2.4-STABLE</span>
          </div>
        </div>

        <Separator />

        {/* Grouped Nav Items */}
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-2">
              <span className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.group}
              </span>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const baseHref = item.href.split('?')[0] ?? item.href;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(baseHref);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant || (isActive ? 'secondary' : 'default')}
                          className="text-[9px] px-1.5 py-0 font-mono flex-shrink-0 ml-1.5"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Return to Player Experience */}
      <div className="pt-6 border-t border-border space-y-3">
        <Link href="/" onClick={onNavClick}>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs font-bold gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Arena</span>
          </Button>
        </Link>

        <div className="px-2 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
          <span>Security Clearance</span>
          <Badge variant="copper" className="text-[9px] font-mono px-1.5 py-0 uppercase">
            {role.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
    </aside>
  );
}
