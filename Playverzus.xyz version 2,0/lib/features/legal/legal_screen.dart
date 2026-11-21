import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

enum LegalDocType { privacy, terms, responsibleGaming }

class LegalScreen extends ConsumerStatefulWidget {
  final LegalDocType docType;
  const LegalScreen({super.key, required this.docType});

  @override
  ConsumerState<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends ConsumerState<LegalScreen> {

  @override
  Widget build(BuildContext context) {
    final title = switch (widget.docType) {
      LegalDocType.privacy => 'Privacy Policy & Local RAM Verification',
      LegalDocType.terms => 'Terms of Service & Skill-Based Competition',
      LegalDocType.responsibleGaming => 'Responsible Gaming & Player Protection',
    };

    final sections = switch (widget.docType) {
      LegalDocType.privacy => const [
          (
            '1. On-Device HUD Verification Privacy',
            'Screen frames used for scoreboard verification are processed ephemerally in local memory. Only verified match scores and cryptographic proofs are transmitted to settle escrow.'
          ),
          (
            '2. Account & Wallet Data',
            'Authentication is secured via Supabase Auth. Financial settlements are processed strictly through licensed payment rails (M-PESA Mobile Money and Crossmint USDC).'
          ),
          (
            '3. Your Data Rights',
            'You may request export or deletion of your account and linked gamertags anytime via Support Desk.'
          ),
        ],
      LegalDocType.terms => const [
          (
            '1. Skill-Based Competition',
            'Playverzus is a skill-based competitive esports platform. Outcomes are determined solely by verified player performance across supported titles.'
          ),
          (
            '2. Smart Escrow & 10% Platform Fee',
            'Peer-to-peer cash duels lock stakes automatically upon Ready. Winning players receive 90% of the total pot immediately upon verified Full Time.'
          ),
          (
            '3. Fair Play & Anti-Cheat',
            'Score tampering, smurfing, match-fixing, or edited proof submissions result in permanent forfeiture and account suspension.'
          ),
        ],
      LegalDocType.responsibleGaming => const [
          (
            '1. Compete Responsibly',
            'Always play within your personal budget. You can switch to Free Practice Coins (Demo PTS) anytime in the top bar.'
          ),
          (
            '2. Daily Deposit & Stake Controls',
            'Set personal spending caps or activate a 24-hour cooling-off break at any time.'
          ),
        ],
    };

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 820,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                radius: 22,
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: HigTypography.title1()),
                    const SizedBox(height: 18),
                    ...sections.map(
                      (s) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s.$1, style: HigTypography.headline()),
                            const SizedBox(height: 4),
                            Text(s.$2, style: HigTypography.body(color: HigColors.labelSecondary)),
                          ],
                        ),
                      ),
                    ),
                    if (widget.docType == LegalDocType.responsibleGaming) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Need a cooling-off period or custom deposit cap? Submit a request directly to our Support team and staff will apply the restriction to your account.',
                        style: HigTypography.footnote(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
