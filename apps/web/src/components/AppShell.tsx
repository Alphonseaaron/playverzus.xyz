'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { GameRail } from './GameRail';
import { TopHeader } from './TopHeader';
import { PartyBar } from './PartyBar';
import { NotificationToastContainer } from './NotificationToastContainer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Standalone pages: NO Sidebar, NO TopHeader, NO PartyBar, NO pb-32
  // Dedicated clean view for legal agreements and authentication
  const isStandalone =
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/login' ||
    pathname === '/signup';

  // 2. Landing page: Public marketing header inside TopHeader, NO Sidebar, NO PartyBar, NO pb-32
  const isLanding = pathname === '/';

  // 3. Live Match Arena (/matches/[id], /matches/room/[code]):
  // Full-width contest space without sidebar or party dock collisions
  const isLiveMatch =
    pathname.startsWith('/matches/room/') ||
    (pathname.startsWith('/matches/') && pathname !== '/matches/new');

  // 4. Admin console: Uses AdminSidebar (inside GameRail), TopHeader, NO PartyBar, NO pb-32
  const isAdmin = pathname.startsWith('/admin');

  // Render Case 1: Standalone Pages (Privacy, Terms, Login, Signup)
  if (isStandalone) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden">
        <main className="flex-1 w-full flex flex-col min-w-0">
          {children}
        </main>
        <NotificationToastContainer />
      </div>
    );
  }

  // Render Case 2: Landing Page
  if (isLanding) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden">
        <TopHeader />
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
        <NotificationToastContainer />
      </div>
    );
  }

  // Render Case 3: Live Match Arena (/matches/[id], /matches/room/[code])
  if (isLiveMatch) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden">
        <TopHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 min-w-0">
          {children}
        </main>
        <NotificationToastContainer />
      </div>
    );
  }

  // Render Case 4: Admin Pages
  if (isAdmin) {
    return (
      <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
        <GameRail />
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-x-hidden">
          <TopHeader />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
            {children}
          </main>
        </div>
        <NotificationToastContainer />
      </div>
    );
  }

  // Render Case 5: Default In-App Dashboard & Arena Workspace
  // (/dashboard, /cashier, /challenges, /tournaments, /leaderboards, /games, /settings, /friends, /ratings, etc.)
  return (
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-x-hidden">
      <GameRail />
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-x-hidden">
        <TopHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 min-w-0">
          {children}
        </main>
      </div>
      <PartyBar />
      <NotificationToastContainer />
    </div>
  );
}
