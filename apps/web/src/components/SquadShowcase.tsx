'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Trophy,
  Swords,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  Award,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { EloBadge } from './EloBadge';

interface SquadMember {
  gamertag: string;
  role: string;
  elo: number;
  initials: string;
  avatarBg: string;
}

interface CompetitiveSquad {
  id: string;
  name: string;
  tag: string;
  game: string;
  division: string;
  teamElo: number;
  winRate: number;
  record: { wins: number; losses: number };
  recentForm: ('W' | 'L')[];
  captain: string;
  members: SquadMember[];
}

const FEATURED_SQUADS: CompetitiveSquad[] = [
  {
    id: 'squad-1',
    name: 'Phantom Syndicate',
    tag: 'PHNTM',
    game: 'Counter-Strike 2',
    division: 'Tactical Premier Division',
    teamElo: 2480,
    winRate: 78,
    record: { wins: 142, losses: 40 },
    recentForm: ['W', 'W', 'W', 'L', 'W'],
    captain: 'Viper_X',
    members: [
      { gamertag: 'Viper_X', role: 'Captain / IGL', elo: 2620, initials: 'VX', avatarBg: 'bg-primary' },
      { gamertag: 'Krono5', role: 'Entry Fragger', elo: 2510, initials: 'K5', avatarBg: 'bg-indigo-600' },
      { gamertag: 'Nyx', role: 'Sniper / AWP', elo: 2440, initials: 'NX', avatarBg: 'bg-zinc-800' },
      { gamertag: 'Ghost_01', role: 'Support / Utility', elo: 2350, initials: 'GH', avatarBg: 'bg-purple-800' },
    ],
  },
  {
    id: 'squad-2',
    name: 'Valkyrie Protocol',
    tag: 'VLKY',
    game: 'Call of Duty: Warzone',
    division: 'Battle Royale Champions',
    teamElo: 2360,
    winRate: 74,
    record: { wins: 118, losses: 42 },
    recentForm: ['W', 'W', 'L', 'W', 'W'],
    captain: 'Aegis',
    members: [
      { gamertag: 'Aegis', role: 'Squad Lead', elo: 2420, initials: 'AG', avatarBg: 'bg-emerald-600' },
      { gamertag: 'Rogue', role: 'Recon & Scout', elo: 2390, initials: 'RG', avatarBg: 'bg-teal-700' },
      { gamertag: 'Blaze', role: 'Assault Gunner', elo: 2280, initials: 'BZ', avatarBg: 'bg-zinc-800' },
      { gamertag: 'Echo', role: 'Anchor / Medic', elo: 2150, initials: 'EC', avatarBg: 'bg-primary' },
    ],
  },
  {
    id: 'squad-3',
    name: 'Iron Apex',
    tag: 'IR0N',
    game: 'Apex Legends',
    division: 'Trio Predator League',
    teamElo: 2290,
    winRate: 71,
    record: { wins: 96, losses: 39 },
    recentForm: ['W', 'L', 'W', 'W', 'W'],
    captain: 'Zenith',
    members: [
      { gamertag: 'Zenith', role: 'Entry Fragger', elo: 2380, initials: 'ZN', avatarBg: 'bg-purple-600' },
      { gamertag: 'Tempest', role: 'Initiator', elo: 2240, initials: 'TP', avatarBg: 'bg-indigo-700' },
      { gamertag: 'Sol', role: 'Recon / Anchor', elo: 2130, initials: 'SL', avatarBg: 'bg-zinc-800' },
    ],
  },
];

export function SquadShowcase() {
  return (
    <section id="squads" className="space-y-8 sm:space-y-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>COMPETITIVE TEAM ROSTERS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
            Featured Squads & Clans
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Assemble a 2v2 duo, 3v3 trio, or 4v4 squad. Challenge rival teams in private room brackets with automated score parsing and team prize pools.
          </p>
        </div>

        <Link href="/signup?redirect=/challenges">
          <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider gap-1.5 h-9">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Assemble Your Squad</span>
          </Button>
        </Link>
      </div>

      {/* 3-Column Squad Grid (Pure Shadcn/ui Card aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURED_SQUADS.map((squad) => (
          <Card
            key={squad.id}
            className="bg-card border border-border hover:border-zinc-700 transition-all rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-5"
          >
            {/* Squad Header */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      [{squad.tag}]
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] border-border">
                      {squad.game}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-foreground">
                    {squad.name}
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    {squad.division}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">Squad Elo</span>
                  <EloBadge elo={squad.teamElo} size="sm" />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono text-xs">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">Win Rate</span>
                  <span className="font-bold text-emerald-400">{squad.winRate}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">Record</span>
                  <span className="font-bold text-foreground">
                    {squad.record.wins}W - {squad.record.losses}L
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">Form</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {squad.recentForm.map((f, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-black rounded px-1 ${
                          f === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Squad Roster Breakdown */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground tracking-wider block">
                Active Roster ({squad.members.length} Players)
              </span>

              <div className="space-y-2">
                {squad.members.map((member, mIdx) => (
                  <div
                    key={mIdx}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg ${member.avatarBg} text-white font-black text-[10px] flex items-center justify-center flex-shrink-0`}
                      >
                        {member.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground truncate block">
                          {member.gamertag}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] font-bold text-primary flex-shrink-0">
                      {member.elo} Elo
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <Link href="/signup?redirect=/challenges" className="w-full block">
                <Button variant="secondary" size="sm" className="w-full font-bold text-xs uppercase tracking-wider gap-1.5 h-9">
                  <Swords className="w-3.5 h-3.5 text-primary" />
                  <span>Challenge This Squad</span>
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
