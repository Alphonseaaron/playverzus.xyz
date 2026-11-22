import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

enum LegalDocType { privacy, terms, responsibleGaming }

/// Detailed Playverzus.xyz Legal & Compliance Documents (`/privacy`, `/terms`,
/// `/responsible-gaming`) carried over in full parity from v1.0, covering our
/// Zero Video Storage Architecture, Predominance Test skill classification,
/// Anti-Fraud bans, AML 1x play-through, Kenya M-PESA & Crossmint USDC rails,
/// and player self-exclusion rights.
class LegalScreen extends ConsumerWidget {
  final LegalDocType docType;
  const LegalScreen({super.key, required this.docType});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compact = Responsive.isCompact(context);
    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(vertical: compact ? 24 : 44),
      child: HigMaxWidthContainer(
        maxWidth: 880,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            switch (docType) {
              LegalDocType.privacy => _PrivacyDocument(compact: compact),
              LegalDocType.terms => _TermsDocument(compact: compact),
              LegalDocType.responsibleGaming =>
                _ResponsibleGamingDocument(compact: compact),
            },
            const SizedBox(height: 28),
            const Divider(color: HigColors.separator, height: 1),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  'Playverzus.xyz — Privacy by Design & Institutional Skill Esports Infrastructure',
                  style: HigTypography.caption(color: HigColors.labelTertiary),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (docType != LegalDocType.privacy)
                      HigButton(
                        label: 'Privacy Policy',
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () => context.go('/privacy'),
                      ),
                    if (docType != LegalDocType.terms)
                      HigButton(
                        label: 'Terms of Service',
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () => context.go('/terms'),
                      ),
                    if (docType != LegalDocType.responsibleGaming)
                      HigButton(
                        label: 'Responsible Gaming',
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () => context.go('/responsible-gaming'),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LegalHeader extends StatelessWidget {
  final String categoryBadge;
  final HigBadgeTone badgeTone;
  final String effectiveLabel;
  final String title;
  final String subtitle;

  const _LegalHeader({
    required this.categoryBadge,
    required this.badgeTone,
    required this.effectiveLabel,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    return Container(
      padding: const EdgeInsets.only(bottom: 22),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: HigColors.separator)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              HigBadge(label: categoryBadge, tone: badgeTone),
              HigBadge(label: effectiveLabel, tone: HigBadgeTone.neutral),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: compact ? 26 : 36,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.9,
              height: 1.08,
              color: HigColors.labelPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: HigTypography.body(color: HigColors.labelSecondary)
                .copyWith(fontSize: 14.5),
          ),
        ],
      ),
    );
  }
}

class _LegalSectionBlock extends StatelessWidget {
  final String number;
  final Color accentColor;
  final String heading;
  final List<Widget> children;

  const _LegalSectionBlock({
    required this.number,
    required this.accentColor,
    required this.heading,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                number,
                style: HigTypography.mono(
                  size: 14,
                  weight: FontWeight.w800,
                  color: accentColor,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  heading.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                    color: HigColors.labelPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _BulletItem extends StatelessWidget {
  final String lead;
  final String body;
  final Color dotColor;

  const _BulletItem({
    required this.lead,
    required this.body,
    this.dotColor = HigColors.brand,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 5,
            height: 5,
            margin: const EdgeInsets.only(top: 7),
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: HigTypography.footnote(color: HigColors.labelSecondary)
                    .copyWith(fontSize: 13.5, height: 1.5),
                children: [
                  if (lead.isNotEmpty)
                    TextSpan(
                      text: '$lead ',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: HigColors.labelPrimary,
                      ),
                    ),
                  TextSpan(text: body),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Paragraph extends StatelessWidget {
  final String text;
  const _Paragraph(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        text,
        style: HigTypography.footnote(color: HigColors.labelSecondary)
            .copyWith(fontSize: 13.8, height: 1.55),
      ),
    );
  }
}

class _HighlightMiniCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String body;

  const _HighlightMiniCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: HigColors.surfacePrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 17, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: HigTypography.headline().copyWith(fontSize: 13.5),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: HigTypography.caption(color: HigColors.labelSecondary)
                .copyWith(fontSize: 12.2, height: 1.48),
          ),
        ],
      ),
    );
  }
}

class _PrivacyDocument extends StatelessWidget {
  final bool compact;
  const _PrivacyDocument({required this.compact});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _LegalHeader(
          categoryBadge: 'DATA PROTECTION',
          badgeTone: HigBadgeTone.emerald,
          effectiveLabel: 'EFFECTIVE: NOVEMBER 2026',
          title: 'PLAYER PRIVACY POLICY',
          subtitle:
              'Our strict Zero-Storage visual policy, data minimization standards, and security safeguards.',
        ),
        const SizedBox(height: 22),

        // Authoritative Zero Video Storage Guarantee Callout
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: HigColors.emerald.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: HigColors.emerald.withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 8,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        CupertinoIcons.eye_slash_fill,
                        color: HigColors.emerald,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Authoritative Zero Video Storage Guarantee',
                        style: HigTypography.headline(color: HigColors.emerald),
                      ),
                    ],
                  ),
                  const HigBadge(
                    label: 'ZERO-RETENTION ACTIVE',
                    tone: HigBadgeTone.emerald,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const _Paragraph(
                'During competitive match sessions, screen captures and video telemetry feeds are processed transiently in volatile device and server memory solely to verify scoreboards and prevent fraud. Playverzus.xyz never records, never archives, and never retains full video streams or personal desktop recordings.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        const _LegalSectionBlock(
          number: '01.',
          accentColor: HigColors.emerald,
          heading: 'Our Privacy Philosophy',
          children: [
            _Paragraph(
              'At Playverzus.xyz, we believe competitive integrity and personal privacy must coexist. We adhere strictly to the principles of Data Minimization and Privacy by Design under international data protection frameworks, including the EU General Data Protection Regulation (GDPR) and the Kenya Data Protection Act (2019). We collect only the minimum information needed to operate fair matchmaking, enforce anti-cheat rules, and settle financial escrow.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.emerald,
          heading: 'Information We Collect & Process',
          children: [
            _Paragraph(
              'When you register, link a device, or compete on the Platform, we process these categories of data:',
            ),
            _BulletItem(
              lead: 'Account Credentials:',
              body:
                  'Username, linked game handles/gamertags, email address, phone number (for mobile money settlement where opted in), and cryptographically hashed authentication credentials.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Match Telemetry & Results:',
              body:
                  'Numeric game scores, round durations, timestamped telemetry packets signed with ephemeral match-room HMAC-SHA256 keys, and perceptual match-integrity hashes (dHash).',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Financial & Transactional Records:',
              body:
                  'Ledger entries (deposits, entry fee locks, prize payouts, agent commissions, withdrawals), currency amounts, and transaction references from licensed processors. Full payment card numbers and CVV codes are handled directly by PCI-DSS Level 1 payment processors and are never received or stored on Playverzus.xyz servers.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Anti-Fraud & Device Telemetry:',
              body:
                  'Deterministic device fingerprints, hardware-bound IDs, masked subnet digests, and session tokens used strictly to block win-trading rings, emulator manipulation, and multi-accounting.',
              dotColor: HigColors.emerald,
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.emerald,
          heading: 'How Game Feeds & Visual Data Are Handled',
          children: [
            const _Paragraph(
              'Our verification pipeline keeps your device and desktop screen private:',
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: HigColors.surfacePrimary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: HigColors.separator),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.memory_rounded,
                        size: 16,
                        color: HigColors.brandBright,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Ephemeral Memory Processing Pipeline',
                        style: HigTypography.headline().copyWith(fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const _Paragraph(
                    '1. You explicitly authorize a game window, screen feed, or native companion service via OS/browser permission prompts.',
                  ),
                  const _Paragraph(
                    '2. The verification engine isolates designated scoreboard Regions of Interest in volatile memory.',
                  ),
                  const _Paragraph(
                    '3. Extracted numeric scores are validated across participants via dual-consensus and telemetry proofs.',
                  ),
                  const _Paragraph(
                    '4. Frame buffers are immediately discarded from volatile RAM — zero raw video files are written or stored.',
                  ),
                ],
              ),
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '04.',
          accentColor: HigColors.emerald,
          heading: 'How We Use Your Information',
          children: [
            _Paragraph('We process personal and match data strictly for:'),
            _BulletItem(
              lead: '',
              body: 'Facilitating real-time 1v1, 5-player Blitz, and tournament matchmaking via ELO Division 1–10 ratings.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Validating match outcomes and releasing prize pools held in smart escrow.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Detecting, auditing, and blocking cheating, frozen-frame replays, virtual webcams, or multi-account collusion.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Complying with Anti-Money Laundering (AML) rules including 1x competitive play-through verification.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Delivering high-priority live notifications (match ready checks, kickoff, score alerts, and settlement receipts).',
              dotColor: HigColors.emerald,
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '05.',
          accentColor: HigColors.emerald,
          heading: 'Data Sharing & Third-Party Processors',
          children: [
            _Paragraph(
              'We never sell, rent, or monetize player data. Necessary operational data is shared only with:',
            ),
            _BulletItem(
              lead: 'Regulated Payment Processors:',
              body:
                  'Licensed Kenyan mobile-money M-PESA settlement infrastructure (Phase 1 Kenya pilot) and Crossmint custodial USDC/global card settlement rails.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Cloud & Auth Infrastructure:',
              body:
                  'Encrypted authentication, PostgreSQL ledger, and hosting partners (Supabase, Vercel, Render) operating under strict confidentiality obligations.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Legal & Compliance Authorities:',
              body:
                  'When strictly mandated by lawful subpoena, court order, or statutory AML reporting obligations.',
              dotColor: HigColors.emerald,
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '06.',
          accentColor: HigColors.emerald,
          heading: 'Cookies & Session Security',
          children: [
            _Paragraph(
              'Playverzus.xyz uses essential authentication cookies and encrypted local storage strictly to preserve active login sessions, selected region/gateway preferences, and permission settings. We do not deploy third-party behavioral ad-tracking networks.',
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '07.',
          accentColor: HigColors.emerald,
          heading: 'Your Rights as a Player',
          children: [
            const _Paragraph(
              'Under GDPR, Kenya DPA (2019), and applicable international privacy laws, you hold the following rights:',
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                final twoCol = constraints.maxWidth >= 560;
                const rights = [
                  (
                    'Right to Access',
                    'Request a complete export of your account profile, linked gamertags, match history, and wallet ledger.'
                  ),
                  (
                    'Right to Erasure',
                    'Request full account deletion at any time, subject to statutory financial audit retention requirements.'
                  ),
                  (
                    'Right to Rectification',
                    'Correct inaccurate personal details or update verified payout accounts in Settings.'
                  ),
                  (
                    'Right to Restriction',
                    'Request temporary processing restriction during active match disputes or identity reviews.'
                  ),
                ];

                if (!twoCol) {
                  return Column(
                    children: rights
                        .map(
                          (r) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _HighlightMiniCard(
                              icon: CupertinoIcons.person_crop_circle_badge_checkmark,
                              color: HigColors.emerald,
                              title: r.$1,
                              body: r.$2,
                            ),
                          ),
                        )
                        .toList(),
                  );
                }

                return Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _HighlightMiniCard(
                            icon: CupertinoIcons.doc_text_viewfinder,
                            color: HigColors.emerald,
                            title: rights[0].$1,
                            body: rights[0].$2,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _HighlightMiniCard(
                            icon: CupertinoIcons.trash_fill,
                            color: HigColors.emerald,
                            title: rights[1].$1,
                            body: rights[1].$2,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _HighlightMiniCard(
                            icon: CupertinoIcons.pencil_circle_fill,
                            color: HigColors.emerald,
                            title: rights[2].$1,
                            body: rights[2].$2,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _HighlightMiniCard(
                            icon: CupertinoIcons.pause_circle_fill,
                            color: HigColors.emerald,
                            title: rights[3].$1,
                            body: rights[3].$2,
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '08.',
          accentColor: HigColors.emerald,
          heading: 'Contact the Data Protection Officer',
          children: [
            _Paragraph(
              'To exercise your privacy rights, request data exports, or report security concerns, contact our Data Protection Officer at support@playverzus.xyz.',
            ),
          ],
        ),
      ],
    );
  }
}

class _TermsDocument extends StatelessWidget {
  final bool compact;
  const _TermsDocument({required this.compact});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _LegalHeader(
          categoryBadge: 'LEGAL AGREEMENT',
          badgeTone: HigBadgeTone.copper,
          effectiveLabel: 'EFFECTIVE: NOVEMBER 2026',
          title: 'TERMS OF SERVICE & RULES',
          subtitle:
              'Governing competitive skill contests, escrow settlement, and fair-play participation on Playverzus.xyz.',
        ),
        const SizedBox(height: 22),

        // 3 Summary Cards
        LayoutBuilder(
          builder: (context, constraints) {
            final rowLayout = constraints.maxWidth >= 680;
            const cards = [
              _HighlightMiniCard(
                icon: Icons.balance_rounded,
                color: HigColors.brand,
                title: 'Skill-Based Only',
                body:
                    'Every match is governed by the Predominance Test: pure skill, strategy, and execution. Zero chance or casino mechanics.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.lock_shield_fill,
                color: HigColors.emerald,
                title: 'Secured Escrow',
                body:
                    'Contest entry stakes lock in escrow upon match kickoff and credit the verified winner automatically on settlement.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.shield_lefthalf_fill,
                color: HigColors.amber,
                title: 'Anti-Cheat Integrity',
                body:
                    'Automated telemetry & ephemeral memory verification protect fair play. Replays, bots, or collusion trigger permanent bans.',
              ),
            ];
            if (!rowLayout) {
              return Column(
                children: [
                  cards[0],
                  const SizedBox(height: 12),
                  cards[1],
                  const SizedBox(height: 12),
                  cards[2],
                ],
              );
            }
            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 12),
                  Expanded(child: cards[1]),
                  const SizedBox(width: 12),
                  Expanded(child: cards[2]),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 28),

        const _LegalSectionBlock(
          number: '01.',
          accentColor: HigColors.brand,
          heading: 'Acceptance of Agreement & Eligibility',
          children: [
            _Paragraph(
              'By creating an account, connecting a game client, or entering any contest on Playverzus.xyz (the "Platform"), you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and official tournament rules. If you do not agree, do not access the Platform.',
            ),
            _BulletItem(
              lead: 'Age Limitations:',
              body:
                  'You must be at least thirteen (13) years old to compete in Free Practice Coins contests, and at least eighteen (18) years old (or legal age of majority in your jurisdiction) to deposit funds, enter real-cash competitions, or request withdrawals.',
            ),
            _BulletItem(
              lead: 'Jurisdictional Compliance:',
              body:
                  'You are solely responsible for confirming that paid skill competitions are permitted under the laws of your country or territory. Playverzus.xyz is launching its Phase 1 M-PESA pilot in Kenya alongside compliant Crossmint global rails.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.brand,
          heading: 'Classification as Contests of Pure Skill',
          children: [
            _Paragraph(
              'Playverzus.xyz operates strictly as an esports arena hosting competitions governed by the legal Predominance Test. Match outcomes depend predominantly upon player physical dexterity, tactical skill, reaction speed, and game execution.',
            ),
            _Paragraph(
              'Games of pure chance, casino games, lotteries, or house-banked wagering are strictly excluded from our catalog. Playverzus.xyz does not set odds or compete against players; prize pools are funded by participant stakes subject to disclosed contest facilitation fees.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.brand,
          heading: 'Proprietary Match Verification & Telemetry',
          children: [
            _Paragraph(
              'To minimize delayed referee disputes across 21+ supported PC, console, mobile, and developer-integrated games, Playverzus utilizes automated verification and companion telemetry:',
            ),
            _BulletItem(
              lead: 'Ephemeral Volatile Analysis:',
              body:
                  'Scoreboard captures and telemetry packets are processed transiently in volatile RAM. Full raw video streams are never permanently written to disk.',
            ),
            _BulletItem(
              lead: 'Proprietary Protections:',
              body:
                  'All verification engines, perceptual hashing logic, detection rules, and SDK connectors are proprietary trade secrets of Playverzus.xyz.',
            ),
            _BulletItem(
              lead: 'Display Integrity:',
              body:
                  'Participants must keep designated in-game scoreboards and gamertags unobstructed during matches. Cropping, masking, or spoofing HUD overlays violates competition rules.',
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '04.',
          accentColor: HigColors.brand,
          heading: 'Anti-Cheat, Anti-Fraud & Fair Play Policy',
          children: [
            const _Paragraph(
              'Playverzus.xyz maintains zero tolerance toward cheating, multi-accounting, or score manipulation.',
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: HigColors.crimson.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: HigColors.crimson.withValues(alpha: 0.35),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        CupertinoIcons.exclamationmark_triangle_fill,
                        size: 16,
                        color: HigColors.crimson,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Strictly Prohibited Infractions (Immediate Ban & Forfeiture)',
                          style: HigTypography.headline(color: HigColors.crimson)
                              .copyWith(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const _BulletItem(
                    lead: '',
                    body: 'Injecting pre-recorded replays, video loops, or synthetic match footage.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Splicing fabricated score graphics or altered screenshots into verification submissions.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Using virtual camera software (e.g., OBS Virtual Cam) to impersonate a live feed.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Stream hijacking or submitting another player’s VOD as your own gameplay.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Multi-accounting, device spoofing, self-matching, or duplicate local session collisions.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Win-trading, match-fixing, intentional throwing, or collusion to shift wallet balances.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Exploiting game bugs, memory editors, scripts, wall-hacks, or unauthorized mods.',
                    dotColor: HigColors.crimson,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const _Paragraph(
              'Accounts confirmed to engage in fraudulent play forfeit contested stakes, lose access to active prize balances, and receive permanent device/account bans.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '05.',
          accentColor: HigColors.brand,
          heading: 'Financial Ledgers, Escrow & AML Play-Through',
          children: [
            _Paragraph(
              'The Platform enforces strict dual-ledger separation between Free Practice Coins and real-cash balances (KES M-PESA & USDC):',
            ),
            _BulletItem(
              lead: 'Practice Demo Coins (PTS):',
              body:
                  'Complimentary tokens strictly for training and warm-up duels. Demo PTS carry zero cash value and cannot be withdrawn or exchanged.',
            ),
            _BulletItem(
              lead: 'Contest Escrow & Tiered Platform Fees:',
              body:
                  'Upon both sides pressing Ready, stakes lock in escrow. Verified winners receive prize pools less published tier service fees (covering verification infrastructure, instant payout rails, and ecosystem operations). Third-party payment processor gateway charges are disclosed upfront prior to checkout.',
            ),
            _BulletItem(
              lead: 'AML 1x Competitive Play-Through Invariant:',
              body:
                  'To deter payment fraud and money laundering, deposited cash funds must be staked at least once (1x) in completed skill matches before withdrawal eligibility. Match winnings are withdrawable immediately subject to gateway minimums.',
            ),
            _BulletItem(
              lead: 'Regulated Settlement Channels:',
              body:
                  'Kenya M-PESA STK / B2C payouts operate within licensed Kenyan mobile-money thresholds, and global USDC / card rails operate through Crossmint enterprise infrastructure.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '06.',
          accentColor: HigColors.brand,
          heading: 'Match Settlement, Finality & Disputes',
          children: [
            _Paragraph(
              'Results certified by dual-player consensus telemetry or official Game Developer Stats APIs settle automatically. Matches flagged for variance route to the Moderator Review Queue for manual audit.',
            ),
            _Paragraph(
              'Participants have fifteen (15) minutes following match completion to submit an official dispute ticket with unedited scoreboard context. Adjudicated referee rulings are final.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '07.',
          accentColor: HigColors.brand,
          heading: 'Intellectual Property & Trademarks',
          children: [
            _Paragraph(
              'The Playverzus.xyz name, X-Y-Z brand emblem, UI systems, and verification infrastructure belong exclusively to Playverzus.xyz. All game titles, publisher logos, and cover artwork belong to their respective copyright owners and indicate compatibility only.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '08.',
          accentColor: HigColors.brand,
          heading: 'Limitation of Liability',
          children: [
            _Paragraph(
              'The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without implied warranties. To the maximum extent permitted by law, Playverzus.xyz shall not be liable for indirect, incidental, or consequential damages resulting from third-party connectivity outages or service interruptions.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '09.',
          accentColor: HigColors.brand,
          heading: 'Contact & Regulatory Inquiries',
          children: [
            _Paragraph(
              'Questions regarding these Terms, dispute escalations, or compliance inquiries can be directed to support@playverzus.xyz.',
            ),
          ],
        ),
      ],
    );
  }
}

class _ResponsibleGamingDocument extends StatelessWidget {
  final bool compact;
  const _ResponsibleGamingDocument({required this.compact});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _LegalHeader(
          categoryBadge: 'COMPLIANCE & INTEGRITY',
          badgeTone: HigBadgeTone.indigo,
          effectiveLabel: 'PLAYER PROTECTION',
          title: 'RESPONSIBLE SKILL-BASED GAMING',
          subtitle:
              'Playverzus is committed to transparent, fair, and responsible esports competition backed by institutional safeguards.',
        ),
        const SizedBox(height: 22),

        LayoutBuilder(
          builder: (context, constraints) {
            final rowLayout = constraints.maxWidth >= 680;
            const cards = [
              _HighlightMiniCard(
                icon: Icons.balance_rounded,
                color: HigColors.brand,
                title: '100% Skill-Determined',
                body:
                    'All duels, Blitz pods, and brackets are decided solely by verified in-game skill across official titles. Chance mechanics are excluded.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.lock_shield_fill,
                color: HigColors.emerald,
                title: 'Segregated Smart Escrow',
                body:
                    'Contest stakes are quarantined in audited escrow accounts (M-PESA Kenya & Crossmint USDC rails) separate from operating balances.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.person_badge_plus_fill,
                color: HigColors.brandBright,
                title: 'Age & Identity Checks',
                body:
                    'Cash competitions require participants to be 18+ (or jurisdiction age of majority) with progressive anti-fraud checks.',
              ),
            ];
            if (!rowLayout) {
              return Column(
                children: [
                  cards[0],
                  const SizedBox(height: 12),
                  cards[1],
                  const SizedBox(height: 12),
                  cards[2],
                ],
              );
            }
            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 12),
                  Expanded(child: cards[1]),
                  const SizedBox(width: 12),
                  Expanded(child: cards[2]),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 28),

        const _LegalSectionBlock(
          number: '01.',
          accentColor: HigColors.indigo,
          heading: 'Skill Gaming Regulatory Standard & Compliance',
          children: [
            _Paragraph(
              'Under international skill-gaming jurisprudence, competitions where outcome is predominantly determined by tactical judgment, reflex accuracy, and controller/keyboard execution constitute lawful contests of skill. Playverzus does not offer sportsbook odds, lotteries, or house-banked gambling.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.indigo,
          heading: 'Player Safeguards, Demo Mode & Stake Limits',
          children: [
            _Paragraph(
              'Healthy competition stays fun and intentional. Switch to Free Practice Coins (Demo PTS) at any time from the top utility bar to practice zero-risk, or monitor daily deposit and withdrawal thresholds in Cashier.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.indigo,
          heading: 'Cooling-Off & Self-Exclusion Support',
          children: [
            _Paragraph(
              'If you ever wish to pause competitive cash play, activate a 24-hour cooling-off break, set lower stake caps, or request immediate account self-exclusion by emailing support@playverzus.xyz. Self-exclusion locks match creation, deposits, and tournament entries immediately.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '04.',
          accentColor: HigColors.indigo,
          heading: 'Visual Verification & Anti-Fraud Guarantee',
          children: [
            _Paragraph(
              'Match integrity is protected by our multi-pillar anti-fraud engine (HMAC-signed telemetry, perceptual frame hashes, and dual-consensus checks). Smurfing, cheating tools, or fraudulent claims trigger immediate forfeiture.',
            ),
          ],
        ),
      ],
    );
  }
}
