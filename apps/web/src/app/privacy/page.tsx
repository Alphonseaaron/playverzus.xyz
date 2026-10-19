import Link from 'next/link';
import {
  ShieldCheck,
  EyeOff,
  Database,
  Lock,
  Server,
  UserCheck,
  Cookie,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const metadata = {
  title: 'Privacy Policy | Playverzus.xyz',
  description: 'Player Privacy Policy and Zero Video Storage Guarantee for Playverzus.xyz.',
};

export default function PrivacyPolicyPage() {
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
                <Badge variant="outline" className="font-mono text-[10px] uppercase text-emerald-400 border-emerald-500/40">
                  Data Protection
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground">
                  Effective: October 2026
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
                Player Privacy Policy
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Our strict Zero-Storage visual policy, data minimization standards, and security safeguards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/terms">
                <Button variant="outline" size="sm" className="text-xs">
                  Terms of Service
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Zero Video Storage Guarantee Card */}
        <Card className="bg-emerald-500/5 border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <EyeOff className="w-5 h-5" />
                <span>Authoritative Zero Video Storage Guarantee</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                During competitive match sessions, screen captures and video telemetry feeds are processed transiently
                in <strong className="text-foreground">volatile device and server memory</strong> solely to verify scoreboards and prevent fraud.
                Playverzus.xyz <strong className="text-foreground">never records, never archives, and never retains full video streams</strong> or personal desktop recordings.
              </p>
            </div>
            <Badge variant="success" className="px-3 py-1 font-mono text-xs flex-shrink-0">
              ZERO-RETENTION ACTIVE
            </Badge>
          </div>
        </Card>

        {/* Content Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">01.</span>
              <span>Our Privacy Philosophy</span>
            </h2>
            <p>
              At Playverzus.xyz, we believe competitive integrity and personal privacy must coexist. We adhere to the
              principles of <strong>Data Minimization</strong> and <strong>Privacy by Design</strong> under global data protection
              regulations, including the European Union General Data Protection Regulation (GDPR) and the Kenya Data Protection Act (2019).
              We collect only the minimum information required to operate fair matchmaking, enforce anti-cheat rules, and settle financial escrow.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">02.</span>
              <span>Information We Collect & Process</span>
            </h2>
            <p>When you use the Platform, we process the following categories of data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Credentials:</strong> Username, public gamertag, email address, and cryptographically hashed passwords.
              </li>
              <li>
                <strong>Match Telemetry & Results:</strong> Numeric game scores, round durations, timestamped telemetry packets,
                and perceptual match integrity hashes. Telemetry is signed via ephemeral match room HMAC keys.
              </li>
              <li>
                <strong>Financial & Transactional Records:</strong> Ledger entries (deposits, entry fee locks, prize payouts, withdrawals),
                currency amounts, and payment transaction identifiers provided by our licensed payment processors.
                <em> Note: Full payment card numbers and CVV codes are transmitted directly to PCI-DSS Level 1 compliant processors and are never received or stored on Playverzus.xyz servers.</em>
              </li>
              <li>
                <strong>Anti-Fraud & Device Telemetry:</strong> Ephemeral device fingerprints (derived from display properties and WebGL environment),
                masked IP subnet hashes, and browser session tokens used solely to block win-trading rings, self-matching, and multi-accounting.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">03.</span>
              <span>How Game Feeds & Visual Data are Handled</span>
            </h2>
            <p>
              To ensure full transparency regarding how match feeds are verified:
            </p>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <Server className="w-4 h-4 text-primary" />
                <span>Ephemeral Memory Processing Pipeline:</span>
              </div>
              <p className="text-xs text-muted-foreground">
                1. You select a specific game window or display using standard browser permissions.<br />
                2. Our visual verification engine isolates designated scoreboard coordinates (Regions of Interest) in ephemeral volatile memory.<br />
                3. Extracted numeric values are compared across match participants to determine victory.<br />
                4. Immediately after numerical verification, the frame buffer is discarded from memory. No persistent image files or video recordings remain on our servers.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">04.</span>
              <span>How We Use Your Information</span>
            </h2>
            <p>We process collected data strictly for the following operational purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Facilitating real-time 1v1 matchmaking based on Skill Elo ratings.</li>
              <li>Validating match outcomes and releasing prize funds held in escrow.</li>
              <li>Detecting and penalizing cheating, stream hijacking, and collusion.</li>
              <li>Complying with Anti-Money Laundering (AML) regulatory standards, including 1x wagering rollover verification.</li>
              <li>Sending transactional notifications (match room ready, dispute updates, payout execution).</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">05.</span>
              <span>Data Sharing & Third-Party Processors</span>
            </h2>
            <p>
              We do not sell, rent, or monetize your personal data. We disclose limited information only to verified third-party
              service providers necessary for platform operation:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Regulated Payment Institutions:</strong> Licensed payment processors (Crossmint, Paysafe) and affiliated banking partners for processing
                deposits, card checkouts, and payouts.
              </li>
              <li>
                <strong>Infrastructure & Hosting Providers:</strong> Cloud infrastructure providers operating under strict European and
                international privacy standards (Supabase, Vercel) utilizing encrypted persistent storage.
              </li>
              <li>
                <strong>Legal & Regulatory Authorities:</strong> Where mandated by court order, subpoena, or applicable anti-money
                laundering reporting obligations.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">06.</span>
              <span>Cookies & Session Security</span>
            </h2>
            <p>
              Playverzus.xyz utilizes essential authentication cookies and encrypted local storage tokens strictly to maintain your
              logged-in session state and interface preferences. We do not use third-party behavioral advertising trackers or cross-site
              ad tracking networks.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">07.</span>
              <span>Your Rights as a Player</span>
            </h2>
            <p>Under international privacy laws, you possess the following rights regarding your personal data:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground">Right to Access:</span>
                <p className="text-muted-foreground">Request a copy of your account profile, match history, and ledger records.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground">Right to Erasure (&ldquo;Be Forgotten&rdquo;):</span>
                <p className="text-muted-foreground">Request complete account deletion, subject to financial audit retention rules.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground">Right to Rectification:</span>
                <p className="text-muted-foreground">Correct inaccurate personal information or update banking withdrawal details.</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground">Right to Restriction:</span>
                <p className="text-muted-foreground">Limit processing during active match disputes or verification inquiries.</p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <span className="text-emerald-400 font-mono">08.</span>
              <span>Contact the Data Protection Officer</span>
            </h2>
            <p>
              To exercise your privacy rights, request data exports, or report security concerns, please contact our Data Protection
              Officer at <a href="mailto:support@playverzus.xyz" className="font-mono text-emerald-400 hover:underline">support@playverzus.xyz</a>.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>Playverzus.xyz — Privacy by Design & Zero-Storage Architecture</span>
          <Link href="/terms" className="text-primary hover:underline">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
