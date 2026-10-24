import Link from 'next/link';
import {
  ShieldCheck,
  Scale,
  Lock,
  Eye,
  AlertTriangle,
  Coins,
  FileText,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const metadata = {
  title: 'Terms of Service | Playverzus.xyz',
  description: 'Terms of Service and Competitive Skill Gaming Rules for Playverzus.xyz.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Playverzus.xyz</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-[10px] uppercase text-primary border-primary/40">
                  Legal Agreement
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">
                  Effective: October 2026
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
                Terms of Service & Rules
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Governing competitive skill contests, escrow settlement, and fair-play participation on Playverzus.xyz.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/privacy">
                <Button variant="outline" size="sm" className="text-xs">
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Highlights Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border p-4">
            <div className="flex items-center gap-2.5 text-primary mb-1.5 font-bold text-xs">
              <Scale className="w-4 h-4" />
              <span>Skill-Based Only</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every match is governed by the legal Predominance Test. Pure skill, strategy, and dexterity. No chance or casino mechanics.
            </p>
          </Card>

          <Card className="bg-card/50 border-border p-4">
            <div className="flex items-center gap-2.5 text-emerald-400 mb-1.5 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>Secured Escrow</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Contest prize pools are locked in escrow upon match launch and automatically credited to the verified winner upon settlement.
            </p>
          </Card>

          <Card className="bg-card/50 border-border p-4">
            <div className="flex items-center gap-2.5 text-amber-400 mb-1.5 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Anti-Cheat Integrity</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Proprietary automated visual verification protects fair play in volatile memory. Cheating, replays, or collusion trigger permanent bans.
            </p>
          </Card>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">01.</span>
              <span>Acceptance of Agreement & Eligibility</span>
            </h2>
            <p>
              By creating an account, connecting a game stream, or entering any contest on Playverzus.xyz (the &ldquo;Platform&rdquo;),
              you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;), our Privacy Policy, and all official game rules.
              If you do not agree to these Terms, you must not use or access the Platform.
            </p>
            <p>
              <strong>Age Limitations:</strong> You must be at least thirteen (13) years of age to access free-to-play Practice
              contests. You must be at least eighteen (18) years of age, or the legal age of majority in your jurisdiction,
              to deposit funds, enter real-money contests, or request payouts.
            </p>
            <p>
              <strong>Jurisdictional Compliance:</strong> You are solely responsible for ensuring that participation in skill-based
              esports contests is lawful in your country, state, or province. Users residing in jurisdictions where online cash
              skill competitions are prohibited by law are barred from real-money participation and will be geoblocked.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">02.</span>
              <span>Classification as Contests of Pure Skill</span>
            </h2>
            <p>
              Playverzus.xyz operates exclusively as an esports platform hosting contests governed by the <strong>Predominance Test</strong>.
              Match outcomes depend predominantly upon the physical dexterity, reaction speed, strategic decision-making, game knowledge,
              and execution of the competing players.
            </p>
            <p>
              Games of chance, lotteries, slots, roulette, dice, and house-banked games are strictly barred from the Platform catalog.
              Playverzus.xyz does not offer house odds, act as a bookmaker, or compete against players. Prize pools are funded by participant
              entry fees, and administrative contest facilitation fees are fixed and non-contingent upon match outcomes.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">03.</span>
              <span>Proprietary Automated Match Verification & Video Telemetry</span>
            </h2>
            <p>
              To eliminate the necessity of developer API integrations, manual screenshot uploads, and delayed disputes, the Platform
              employs proprietary automated visual verification technology and video telemetry ingestion.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Ephemeral Volatile Analysis:</strong> Game feeds, scoreboard regions, and HUD elements captured during active
                matches are analyzed transiently in volatile system memory. Raw video streams are never permanently recorded or stored on disk.
              </li>
              <li>
                <strong>Proprietary Technology Protections:</strong> All visual verification engines, mathematical algorithms, detection models,
                and validation architectures are strictly proprietary trade secrets of Playverzus.xyz. No licenses, technical schematics,
                or blueprints are granted to players or third parties.
              </li>
              <li>
                <strong>Display Integrity:</strong> Participants are required to maintain clear, unobstructed visibility of the designated
                in-game scoreboard and gamertag during competitive match sessions. Obscuring, modifying, or cropping HUD elements constitutes
                a match violation.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">04.</span>
              <span>Anti-Cheat, Anti-Fraud & Fair Play Policy</span>
            </h2>
            <p>
              Playverzus.xyz enforces a zero-tolerance policy against all forms of cheating, unsportsmanlike conduct, and fraud.
              Prohibited behaviors include, but are not limited to:
            </p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2 text-foreground text-xs">
              <div className="flex items-center gap-2 font-bold text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>Strictly Prohibited Infractions (Immediate Permanent Ban & Forfeiture):</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Injecting pre-recorded game replays, video loops, or pre-rendered match footage.</li>
                <li>Displaying fabricated digital text overlays or splicing modified score graphics onto screen feeds.</li>
                <li>Utilizing virtual webcam software (e.g., OBS Virtual Cam) to feed external or non-live media.</li>
                <li>Stream hijacking, including broadcasting another player&apos;s live stream or archival VOD as your own.</li>
                <li>Multi-accounting, running duplicate browser instances on identical devices, or local subnet collisions.</li>
                <li>Win-trading, match fixing, intentional throw-ins, or colluding with opponents to transfer ledger balances.</li>
                <li>Exploiting in-game bugs, memory editors, wall-hacks, aim-assists, or unauthorized third-party game modifications.</li>
              </ul>
            </div>
            <p>
              Any participant determined to have engaged in fraudulent conduct will forfeit all entry fees, have active prize balances
              nullified, and face permanent hardware/account banishment.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">05.</span>
              <span>Financial Ledgers, Escrow & AML Play-Through Requirements</span>
            </h2>
            <p>
              The Platform maintains a segregated dual-ledger accounting architecture separating Practice Coins from real USDC balances.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Practice Demo Coins:</strong> Complimentary tokens intended strictly for skill training and tournament rehearsals.
                Practice coins have zero fiat currency value and cannot be exchanged, withdrawn, or transferred for real currency.
              </li>
              <li>
                <strong>Contest Escrow Vault:</strong> When you enter a match or tournament, your entry fee is locked in a secure
                escrow ledger. Upon authoritative match validation, the entire prize pool (less platform service fees) is instantly credited
                to the victor&apos;s available balance.
              </li>
              <li>
                <strong>Anti-Money Laundering (AML) 1x Competitive Play-Through Invariant:</strong> To prevent payment fraud, stolen credit card abuse,
                and money laundering, all deposited funds must be entered at least once in competitive skill matches before
                becoming eligible for withdrawal. Net prizes resulting from completed matches are immediately withdrawable.
              </li>
              <li>
                <strong>Transaction Thresholds:</strong> The minimum deposit is 5.00 USDC; maximum single deposit is 5,000.00 USDC.
                The minimum withdrawal is 10.00 USDC; maximum single withdrawal is 10,000.00 USDC. Payout requests are processed through regulated
                banking and stablecoin gateways.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">06.</span>
              <span>Match Settlement, Finality & Disputes</span>
            </h2>
            <p>
              Match outcomes certified by our automated verification engine and confirmed by dual-player telemetry are considered final.
              If a technical anomaly occurs or scores are flagged for human review, the match enters the Review Queue for manual adjudication
              by our verification officers.
            </p>
            <p>
              Players have a window of fifteen (15) minutes post-match to file an official dispute ticket with accompanying context.
              Decisions rendered by Platform dispute referees are final and binding upon all participants.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">07.</span>
              <span>Intellectual Property & Proprietary Rights</span>
            </h2>
            <p>
              The Platform name, Playverzus.xyz logo, visual interfaces, automated verification engines, anti-cheat detection mechanisms,
              and trade dress are the exclusive property of Playverzus.xyz. All third-party game titles, trademarks, and artwork referenced
              on the Platform belong to their respective publishers and copyright holders. Reference to third-party games does not imply
              sponsorship, endorsement, or affiliation.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">08.</span>
              <span>Limitation of Liability & Indemnification</span>
            </h2>
            <p>
              The Platform is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. Playverzus.xyz disclaims all warranties
              of any kind, whether express or implied. Under no circumstances shall Playverzus.xyz, its directors, or affiliates be liable
              for any indirect, incidental, special, consequential, or punitive damages arising out of your participation in matches or inability
              to access the service.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">09.</span>
              <span>Contact & Regulatory Inquiries</span>
            </h2>
            <p>
              If you have any questions regarding these Terms, dispute escalation, or regulatory compliance, please contact our
              compliance and support department at <a href="mailto:support@playverzus.xyz" className="font-mono text-primary hover:underline">support@playverzus.xyz</a>.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>Playverzus.xyz — Operating under International Skill Contest Standards</span>
          <Link href="/privacy" className="text-primary hover:underline">
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
