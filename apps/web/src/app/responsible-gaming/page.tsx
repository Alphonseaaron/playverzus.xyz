'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Scale, HeartHandshake, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export default function ResponsibleGamingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="font-mono text-xs gap-1.5 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Arena Overview</span>
        </Button>
      </Link>

      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-primary text-xs font-bold tracking-wider uppercase">
          <Scale className="w-3.5 h-3.5" />
          <span>COMPLIANCE & INTEGRITY</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
          Responsible Skill-Based Gaming
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Playverzus is committed to transparent, fair, and responsible competitive esports. Our platform operates exclusively on skill-based competition rules and institutional infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-card border border-border p-5 rounded-2xl space-y-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-primary flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-foreground">100% Skill-Determined</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All duels and tournaments are decided solely by player skill, strategy, and in-game performance in certified esports titles. Chance elements are completely absent.
          </p>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl space-y-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-foreground">Crossmint Smart Escrow</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Player funds and entry stakes are held in segregated, audited smart vaults by Crossmint enterprise infrastructure. No commingling of platform and user balances.
          </p>
        </Card>

        <Card className="bg-card border border-border p-5 rounded-2xl space-y-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-foreground">Age & Identity Verification</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Participation in real cash prize competitions requires players to be at least 18 years of age (or legal majority in your jurisdiction) with progressive identity checks.
          </p>
        </Card>
      </div>

      <div className="space-y-6 text-xs text-muted-foreground leading-relaxed font-sans pt-4 border-t border-border">
        <section id="compliance" className="space-y-2">
          <h2 className="text-base font-bold text-foreground">1. Skill Gaming Regulatory Standard &amp; Compliance</h2>
          <p>
            Under relevant international and federal statutes, competitions where outcome is predominantly determined by physical coordination, strategic acumen, reflex speed, and game mastery constitute lawful games of skill. Playverzus does not offer games of chance, lotteries, or casino gambling.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">2. Player Safeguards & Stake Limits</h2>
          <p>
            To promote healthy competitive play, Playverzus enforces automated per-match and daily deposit limits. Players can set custom spend controls or initiate temporary cooling-off periods directly in their profile settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">3. Self-Exclusion & Support</h2>
          <p>
            If you ever feel that competitive gaming is becoming unmanageable, you can request an immediate self-exclusion lock on your account by contacting our Support Desk at{' '}
            <a href="mailto:support@playverzus.xyz" className="text-primary underline">
              support@playverzus.xyz
            </a>
            . Self-exclusion immediately restricts match creation, deposit rails, and tournament registrations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">4. Visual Verification & Anti-Fraud Guarantee</h2>
          <p>
            Match integrity is certified by the proprietary Visual Verification Engine™, which monitors official game outcomes with zero human referee intervention. Any participant found using unauthorized third-party software, smurfing, or fraudulent reporting faces immediate disqualification and forfeiture of entry stakes.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span>Playverzus.xyz · Institutional Skill Esports Infrastructure</span>
        <Link href="/terms" className="text-primary hover:underline">
          Read Terms of Service &rarr;
        </Link>
      </div>
    </div>
  );
}
