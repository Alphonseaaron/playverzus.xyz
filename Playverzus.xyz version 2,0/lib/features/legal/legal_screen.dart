import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

enum LegalDocType { privacy, terms, responsibleGaming }

/// Complete Playverzus.xyz Legal & Compliance Documents (`/privacy`, `/terms`,
/// `/responsible-gaming`) uniting all v1.0 legal clauses, `docs/LEGAL.md`
/// jurisdictional & Predominance Test doctrine, Global Compliance Matrix,
/// exact USDC & Kenya M-PESA settlement thresholds, tiered arena service fees,
/// Zero Video Storage guarantee, and Nominative Fair Use IP disclosures.
class LegalScreen extends ConsumerWidget {
  final LegalDocType docType;
  const LegalScreen({super.key, required this.docType});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compact = Responsive.isCompact(context);
    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(vertical: compact ? 24 : 44),
      child: HigMaxWidthContainer(
        maxWidth: 900,
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
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  'Playverzus Technologies Inc. · Global Operations: Nairobi · Delaware · London',
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
                        label: 'Compliance & Responsible Gaming',
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
              const HigBadge(
                label: 'PLAYVERZUS TECHNOLOGIES INC.',
                tone: HigBadgeTone.neutral,
              ),
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
              'Our strict Zero Video Storage commitment, data minimization standards, and security safeguards under GDPR and the Kenya Data Protection Act (2019).',
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
                'Playverzus.xyz confirms competitive match outcomes strictly to uphold fair play and instant escrow payouts. We never record, never archive, and never retain gameplay videos or personal desktop recordings on our servers.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        const _LegalSectionBlock(
          number: '01.',
          accentColor: HigColors.emerald,
          heading: 'Our Privacy Philosophy & Data Controller',
          children: [
            _Paragraph(
              'Playverzus.xyz is operated by Playverzus Technologies Inc. (Global Operations: Nairobi · Delaware · London). We believe competitive integrity and personal privacy must coexist. We adhere strictly to the principles of Data Minimization and Privacy by Design under international data protection frameworks, including the European Union General Data Protection Regulation (GDPR) and the Kenya Data Protection Act (2019). We collect only the minimum information required to operate fair matchmaking, enforce anti-cheat rules, and settle financial escrow.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.emerald,
          heading: 'Information We Collect & Process',
          children: [
            _Paragraph(
              'When you register, bind a device, or compete on the Platform, we process these categories of data:',
            ),
            _BulletItem(
              lead: 'Account Credentials:',
              body:
                  'Username, public gamertag / publisher IDs, email address, mobile number (where opted in for M-PESA settlement), date of birth for 18+ eligibility checks, and cryptographically hashed passwords.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Match Scores & Outcomes:',
              body:
                  'Numeric game scores, match timestamps, and verified final outcome records used to update skill ratings and settle prizes.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Financial & Transactional Records:',
              body:
                  'Ledger entries (deposits, entry fee locks, prize payouts, referral commissions, withdrawals), currency amounts, and payment transaction identifiers provided by our licensed payment processors. Full payment card numbers and CVV codes are transmitted directly to PCI-DSS Level 1 compliant processors and are never received or stored on Playverzus.xyz servers.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Fair-Play & Device Security:',
              body:
                  'Standard device and session identifiers used strictly to protect your account, prevent duplicate multi-accounting, and block fraudulent match manipulation.',
              dotColor: HigColors.emerald,
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.emerald,
          heading: 'How Match Verification Protects Your Privacy',
          children: [
            const _Paragraph(
              'Every step of match verification prioritizes player privacy:',
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
                        Icons.verified_user_rounded,
                        size: 16,
                        color: HigColors.brandBright,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Permission-First Verification Standards',
                        style: HigTypography.headline().copyWith(fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const _Paragraph(
                    '1. Device permissions prompt you clearly before any live competitive match begins.',
                  ),
                  const _Paragraph(
                    '2. Playverzus confirms only the official numeric match outcome and final winner cleanly.',
                  ),
                  const _Paragraph(
                    '3. Playverzus never archives full gameplay streams, personal files, or desktop recordings.',
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
            _Paragraph(
              'We process collected data strictly for the following operational purposes:',
            ),
            _BulletItem(
              lead: '',
              body: 'Facilitating real-time 1v1, 5-player Blitz, and tournament matchmaking based on per-game ELO Division 1–10 ratings.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Validating match outcomes and releasing prize pools held in smart escrow.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Detecting and penalizing cheating, stream hijacking, pre-recorded loops, and multi-account collusion.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Complying with Anti-Money Laundering (AML) regulatory standards, including 1x competitive play-through verification.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: '',
              body: 'Sending high-priority transactional notifications (matchroom ready, kickoff auto-launch, dispute updates, payout execution).',
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
              'We do not sell, rent, or monetize your personal data. We disclose limited operational information only to verified service providers:',
            ),
            _BulletItem(
              lead: 'Regulated Payment Institutions:',
              body:
                  'Licensed mobile money gateways for Kenyan M-PESA STK/B2C settlement (Phase 1 pilot) and Crossmint custodial USDC / global card rails for global deposits and payouts.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Infrastructure & Hosting Providers:',
              body:
                  'Cloud infrastructure operating under strict international encryption and privacy safeguards (Supabase Auth/PostgreSQL, Vercel Edge, Render API, Upstash Redis, Cloudflare R2) utilizing encrypted persistent storage.',
              dotColor: HigColors.emerald,
            ),
            _BulletItem(
              lead: 'Legal & Regulatory Authorities:',
              body:
                  'Where mandated by court order, subpoena, or applicable anti-money laundering reporting obligations.',
              dotColor: HigColors.emerald,
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '06.',
          accentColor: HigColors.emerald,
          heading: 'Cookies, Device Permissions & Session Security',
          children: [
            _Paragraph(
              'Playverzus.xyz utilizes essential authentication cookies and encrypted local storage tokens strictly to maintain your logged-in session state, region selection, and verified machine binding. We do not deploy third-party behavioral advertising trackers or cross-site ad networks. Functions requiring elevated OS permissions (Browser Notifications and Screen/Window Sharing during matches) explicitly prompt for your approval and may be revoked in Cookie & Permissions or browser site settings at any time.',
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '07.',
          accentColor: HigColors.emerald,
          heading: 'Your Rights as a Player',
          children: [
            const _Paragraph(
              'Under GDPR, Kenya DPA (2019), and international privacy laws, you possess the following rights regarding your personal data:',
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                final twoCol = constraints.maxWidth >= 560;
                const rights = [
                  (
                    'Right to Access',
                    'Request a copy of your account profile, linked gamertags, match history, and wallet ledger records.'
                  ),
                  (
                    'Right to Erasure ("Be Forgotten")',
                    'Request complete account deletion at any time, subject to statutory financial audit and anti-fraud retention rules.'
                  ),
                  (
                    'Right to Rectification',
                    'Correct inaccurate personal information or update verified payout details in Account Settings.'
                  ),
                  (
                    'Right to Restriction',
                    'Limit non-essential processing during active match disputes or verification inquiries.'
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
              'To exercise your privacy rights, request data exports, revoke device consent, or report security concerns, please contact our Data Protection Officer at support@playverzus.xyz.',
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
              'Governing competitive skill contests, smart escrow settlement, upfront processor fee disclosure, and fair-play rules on Playverzus.xyz.',
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
                    'Every match is governed by the Predominance Test: Prize, Consideration, and predominant Skill/Dexterity — zero chance or casino mechanics.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.lock_shield_fill,
                color: HigColors.emerald,
                title: 'Secured Escrow',
                body:
                    'Contest prize pools lock automatically upon dual-Ready launch and credit the verified winner upon Full Time settlement.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.shield_lefthalf_fill,
                color: HigColors.amber,
                title: 'Fair-Play Integrity',
                body:
                    'Proprietary automated verification protects fair play across every duel and bracket. Collusion, bots, or tampering trigger permanent bans.',
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
              'By creating an account, connecting a game client, or entering any contest on Playverzus.xyz (the "Platform", operated by Playverzus Technologies Inc.), you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all official game rules. If you do not agree to these Terms, you must not access the Platform.',
            ),
            _BulletItem(
              lead: 'Age Limitations:',
              body:
                  'You must be at least thirteen (13) years of age to access free-to-play Practice Coins (Demo PTS) contests. You must be at least eighteen (18) years of age, or the legal age of majority in your jurisdiction, to deposit cash funds, enter real-money skill competitions, or request payouts.',
            ),
            _BulletItem(
              lead: 'Jurisdictional Compliance:',
              body:
                  'You are solely responsible for ensuring that participation in skill-based esports contests is lawful in your country, state, or province. Users residing in prohibited jurisdictions are barred from real-money entry and subject to geoblocking.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.brand,
          heading: 'The Skill vs. Chance Doctrine & Predominance Test',
          children: [
            _Paragraph(
              'Under common-law and statutory jurisprudence, gambling requires three concurrent elements: Prize, Consideration, and Chance. Playverzus.xyz operates strictly on contests governed by the Predominance Test, where outcomes depend predominantly upon player physical dexterity, tactical decision-making, reflex accuracy, map knowledge, and execution:',
            ),
            _BulletItem(
              lead: 'Predominance Test Compliance:',
              body:
                  'Over standard match durations, RNG elements in eligible titles must never outweigh participant skill. Winners are determined by verified highest score, lowest completion time, or official round victory.',
            ),
            _BulletItem(
              lead: 'Zero Gambling or House Bank:',
              body:
                  'Games of chance (roulette, slots, dice, bingo, card lotteries) and house-banked odds are strictly banned. Playverzus does not act as a bookmaker or compete against players; prize pools are funded solely by participant stakes subject to disclosed fixed tier facilitation fees.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.brand,
          heading: 'Proprietary Match Verification',
          children: [
            _Paragraph(
              'To eliminate delayed manual disputes across 21+ PC, console, mobile, and developer Stats API titles, Playverzus uses proprietary automated verification:',
            ),
            _BulletItem(
              lead: 'Zero Video Retention:',
              body:
                  'Match confirmation runs strictly during active competitive sessions without permanently recording or archiving personal video streams.',
            ),
            _BulletItem(
              lead: 'Proprietary Technology Protections:',
              body:
                  'All verification engines, integrity checks, and official developer Stats API connectors are confidential proprietary trade secrets of Playverzus.xyz.',
            ),
            _BulletItem(
              lead: 'Fair Display Rules:',
              body:
                  'Participants must play honestly without tampering, third-party overlays, or hiding active match screens during live competitions.',
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '04.',
          accentColor: HigColors.brand,
          heading: 'Anti-Cheat, Anti-Fraud & Fair Play Policy',
          children: [
            const _Paragraph(
              'Playverzus.xyz enforces a strict zero-tolerance policy against all forms of cheating, unsportsmanlike conduct, and financial fraud.',
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
                          'Strictly Prohibited Infractions (Immediate Permanent Ban & Forfeiture)',
                          style: HigTypography.headline(color: HigColors.crimson)
                              .copyWith(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const _BulletItem(
                    lead: '',
                    body: 'Injecting pre-recorded game replays, frozen video loops, or synthetic match footage.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Displaying fabricated digital overlays or splicing modified score graphics onto captured feeds.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Using virtual webcam drivers (e.g., OBS Virtual Cam) to stream non-live external media.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Stream hijacking, including submitting another player’s broadcast or archival VOD as your own gameplay.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Multi-accounting, duplicate browser/device spoofing, self-matching, or local subnet collisions.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Win-trading, match-fixing, intentional throw-ins, or colluding with opponents to shift wallet balances.',
                    dotColor: HigColors.crimson,
                  ),
                  const _BulletItem(
                    lead: '',
                    body: 'Exploiting game bugs, memory editors, scripts, wall-hacks, aim-assists, or unauthorized third-party mods.',
                    dotColor: HigColors.crimson,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const _Paragraph(
              'Any participant confirmed to have engaged in fraudulent conduct forfeits all entry fees, has prize balances nullified, and receives a permanent hardware/account ban.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '05.',
          accentColor: HigColors.brand,
          heading: 'Financial Ledgers, Escrow, Fees & Thresholds',
          children: [
            _Paragraph(
              'Playverzus maintains a strict dual-ledger system separating non-monetary Practice Coins from real-cash balances:',
            ),
            _BulletItem(
              lead: 'Practice Demo Coins (PTS):',
              body:
                  'Complimentary tokens strictly for skill rehearsal. Demo PTS hold zero cash value and cannot be exchanged, sold, or withdrawn.',
            ),
            _BulletItem(
              lead: 'Contest Escrow & Tiered Service Fees:',
              body:
                  'When both players confirm Ready, stakes lock in segregated escrow. Verified winners receive prize pools less published arena facilitation fees (1v1 Duels: 15% under \$10 / 12.5% \$10+; 5-Player Blitz Pods: 16%–22% by Division tier; Tournaments: 15%–20%). Third-party payment processor deposit/withdrawal fees are calculated transparently upfront before payment approval.',
            ),
            _BulletItem(
              lead: 'AML 1x Competitive Play-Through Invariant:',
              body:
                  'To deter payment fraud and money laundering, deposited cash funds must be staked at least once (1x) in completed skill matches before withdrawal eligibility. Match winnings are withdrawable immediately.',
            ),
            _BulletItem(
              lead: 'Global Crossmint USDC & Kenya M-PESA Thresholds:',
              body:
                  'All balances, entry fees, and prize pools are denominated in USDC. Minimum deposit is 5.00 USDC (KES 650 on M-PESA, max 2,000.00 USDC / KES 250,000 per deposit); minimum withdrawal is 5.00 USDC (KES 650 on M-PESA). Every M-PESA withdrawal carries a flat KES 50 (~0.38 USDC) Safaricom/Kopo Kopo network payout fee paid upfront (we suggest withdrawing 20.00 USDC / KES 2,600+ to keep the fixed fee impact under 2%). Optional Express VIP instant priority payout fee (KES 35 M-PESA / 0.50 USDC) applies only when explicitly selected.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '06.',
          accentColor: HigColors.brand,
          heading: 'Match Settlement, Finality & Disputes',
          children: [
            _Paragraph(
              'Outcomes certified by dual-player consensus telemetry or official Game Developer Stats APIs settle automatically under Consumer Protection Act (2012) fairness standards. Flagged anomalies route automatically to our Review Queue for Human-in-the-Loop adjudication.',
            ),
            _Paragraph(
              'Participants have fifteen (15) minutes following match completion to submit an official dispute ticket with accompanying context. Determinations issued by Platform dispute officers are final and binding.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '07.',
          accentColor: HigColors.brand,
          heading: 'Intellectual Property & Nominative Fair Use',
          children: [
            _Paragraph(
              'The Platform name, Playverzus.xyz X-Y-Z emblem, visual interfaces, verification software, and trade dress are the exclusive property of Playverzus Technologies Inc. Third-party game titles, trademarks, and cover artwork (including EA SPORTS FC, Counter-Strike, Apex Legends, Marvel Rivals, Valorant, Rocket League, Call of Duty, Tekken, Fortnite, League of Legends, Dota 2, Mobile Legends: Bang Bang, and Subway Surfers) remain the property of their respective publishers (Electronic Arts Inc., Valve Corporation, Riot Games, Epic Games, Activision Publishing, Bandai Namco, NetEase, Moonton, SYBO Games). Reference indicates matchmaking compatibility only and does not imply sponsorship or endorsement.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '08.',
          accentColor: HigColors.brand,
          heading: 'Limitation of Liability & Indemnification',
          children: [
            _Paragraph(
              'The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, express or implied. Under no circumstances shall Playverzus Technologies Inc., its directors, or affiliates be liable for indirect, incidental, special, consequential, or punitive damages arising out of match participation, game publisher server downtime, or connectivity disruptions.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '09.',
          accentColor: HigColors.brand,
          heading: 'Contact & Regulatory Inquiries',
          children: [
            _Paragraph(
              'For support tickets, formal dispute escalations, or regulatory inquiries, please contact our compliance desk at support@playverzus.xyz.',
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

  static const List<(String, String, String, String)> _jurisdictionMatrix = [
    (
      'United States',
      'Legal in 40+ states',
      'Yes (State-dependent)',
      'Geoblocked in prohibited states (AZ, AR, CT, DE, LA, MT, SC, SD, TN, VT). Predominance Test enforced.',
    ),
    (
      'Kenya (Phase 1 Pilot)',
      'Legal (Contest of Skill)',
      'USDC (M-PESA Converter) + Demo',
      'BCLB Cap 131 skill exemption, Consumer Protection Act 2012 audit trails, 18+ gate, Kenya DPA (2019).',
    ),
    (
      'United Kingdom',
      'Legal (Prize Competitions)',
      'Yes',
      'Exempt from Gambling Act 2005 where skill prevents non-skilled entrants from winning consistently.',
    ),
    (
      'Nigeria',
      'Legal',
      'Yes',
      'National Lottery Regulatory Commission (NLRC) guidance excludes direct peer-to-peer esports skill contests.',
    ),
    (
      'European Union',
      'Member-state dependent',
      'Varies by nation',
      'Strict GDPR data minimization, Zero Video Storage privacy compliance, age verification.',
    ),
    (
      'India',
      'Legal in most states',
      'Varies by state',
      'Restricted in Assam, Telangana, Odisha, Andhra Pradesh, and Tamil Nadu.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _LegalHeader(
          categoryBadge: 'COMPLIANCE & INTEGRITY',
          badgeTone: HigBadgeTone.indigo,
          effectiveLabel: 'BCLB · GDPR · PREDOMINANCE TEST',
          title: 'RESPONSIBLE SKILL-BASED GAMING',
          subtitle:
              'Playverzus is committed to transparent, fair, and legally compliant competitive esports operating on skill-based rules and institutional escrow.',
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
                    'All duels, 5-player Blitz pods, and brackets are decided purely by verified player skill across official esports titles. Chance elements are absent.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.lock_shield_fill,
                color: HigColors.emerald,
                title: 'Segregated Smart Escrow',
                body:
                    'Player balances and match entry stakes remain quarantined in audited escrow accounts (Kenya M-PESA & Crossmint USDC) separate from company funds.',
              ),
              _HighlightMiniCard(
                icon: CupertinoIcons.person_badge_plus_fill,
                color: HigColors.brandBright,
                title: 'Age & Identity Checks',
                body:
                    'Real-money skill competitions strictly require age 18+ (or jurisdiction age of majority) alongside hardware fingerprinting and KYC checks.',
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
              'Under international statutes and common law, competitions where outcome is predominantly determined by physical coordination, strategic acumen, reflex speed, and game mastery satisfy the Predominance Test and constitute lawful contests of skill rather than gambling.',
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '02.',
          accentColor: HigColors.indigo,
          heading: 'Kenyan Legal & Regulatory Framework (Phase 1 Pilot)',
          children: [
            _BulletItem(
              lead: 'Betting, Lotteries and Gaming Act (Cap 131, BCLB):',
              body:
                  'Cap 131 regulates uncertain-outcome betting and games of chance. Direct peer-to-peer skill esports contests without house odds—where participant stakes fund fixed-fee prize pools—alongside risk-free Demo PTS mode are structured under the pure-skill exemption rationale.',
              dotColor: HigColors.indigo,
            ),
            _BulletItem(
              lead: 'Kenya Data Protection Act (2019):',
              body:
                  'Enforces our Zero Video Storage commitment: only official match scores and outcome records are retained.',
              dotColor: HigColors.indigo,
            ),
            _BulletItem(
              lead: 'Consumer Protection Act (2012):',
              body:
                  'Automated verification, transparent upfront gateway fee disclosures, and formal 15-minute Human-in-the-Loop dispute resolution satisfy fairness standards.',
              dotColor: HigColors.indigo,
            ),
          ],
        ),

        _LegalSectionBlock(
          number: '03.',
          accentColor: HigColors.indigo,
          heading: 'Global Compliance Matrix',
          children: [
            const _Paragraph(
              'Jurisdictional rules enforced automatically by region detection and progressive KYC checks:',
            ),
            Container(
              decoration: BoxDecoration(
                color: HigColors.surfacePrimary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: HigColors.separator),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  Container(
                    color: HigColors.surfaceGrouped,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 11,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Text(
                            'Jurisdiction',
                            style: HigTypography.caption(
                              color: HigColors.labelTertiary,
                            ).copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: Text(
                            'Status',
                            style: HigTypography.caption(
                              color: HigColors.labelTertiary,
                            ).copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (!compact)
                          Expanded(
                            flex: 2,
                            child: Text(
                              'Paid Entry',
                              style: HigTypography.caption(
                                color: HigColors.labelTertiary,
                              ).copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                        Expanded(
                          flex: 4,
                          child: Text(
                            'Safeguards',
                            style: HigTypography.caption(
                              color: HigColors.labelTertiary,
                            ).copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ..._jurisdictionMatrix.map(
                    (row) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: HigColors.separator, width: 0.7),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(
                              row.$1,
                              style: HigTypography.footnote(
                                color: HigColors.labelPrimary,
                              ).copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              row.$2,
                              style: HigTypography.caption(
                                color: HigColors.emerald,
                              ),
                            ),
                          ),
                          if (!compact)
                            Expanded(
                              flex: 2,
                              child: Text(
                                row.$3,
                                style: HigTypography.caption(
                                  color: HigColors.labelSecondary,
                                ),
                              ),
                            ),
                          Expanded(
                            flex: 4,
                            child: Text(
                              row.$4,
                              style: HigTypography.caption(
                                color: HigColors.labelSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        const _LegalSectionBlock(
          number: '04.',
          accentColor: HigColors.indigo,
          heading: 'Player Safeguards, Demo Mode & Self-Exclusion',
          children: [
            _Paragraph(
              'You can switch to risk-free Practice Coins (Demo PTS) at any time from the utility bar, or stay within daily deposit and M-PESA/USDC payout limits in Cashier. To request a 24-hour cooling-off break, custom daily cap, or permanent account self-exclusion, contact support@playverzus.xyz. Self-exclusion locks match entry, deposits, and tournament registrations immediately.',
            ),
          ],
        ),
      ],
    );
  }
}
