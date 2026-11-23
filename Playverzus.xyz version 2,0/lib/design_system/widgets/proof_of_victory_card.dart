import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/app_state.dart';
import '../tokens/hig_tokens.dart';
import 'brand_logo.dart';
import 'hig_primitives.dart';

/// Institutional Proof of Victory / Match Settlement Card (v2.0 HIG Standard):
/// - Blurred official game poster/banner ambient background
/// - Official game logo + official Playverzus logo (NO typed brand names)
/// - Player avatars & tabular scores
/// - Relative single payout (Winner sees +amount green; Loser sees -amount red; NEVER both)
/// - Tournament mode: shows Advancing/Eliminated on non-finals, prize only on Final
/// - External Copy Brag Snippet & Share dock strictly OUTSIDE the card
class ProofOfVictoryCard extends ConsumerWidget {
  final OfficialGame game;
  final String matchId;
  final String playerAName;
  final String playerBName;
  final int scoreA;
  final int scoreB;
  final bool viewerWon;
  final double stakeUsd;
  final double payoutUsd;
  final bool isTournament;
  final String? tournamentRound;
  final bool isTournamentFinal;

  const ProofOfVictoryCard({
    super.key,
    required this.game,
    required this.matchId,
    required this.playerAName,
    required this.playerBName,
    required this.scoreA,
    required this.scoreB,
    required this.viewerWon,
    required this.stakeUsd,
    required this.payoutUsd,
    this.isTournament = false,
    this.tournamentRound,
    this.isTournamentFinal = false,
  });

  String _formatAmount(double usd) {
    return AppConfig.formatUsdc(usd, alwaysDecimals: true);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gateway = ref.watch(paymentGatewayProvider);
    final showCashDelta = !isTournament || isTournamentFinal;
    final relativeText = viewerWon
        ? '+${_formatAmount(payoutUsd)}'
        : '-${_formatAmount(stakeUsd)}';
    final accentColor = viewerWon ? HigColors.emerald : HigColors.crimson;

    final statusPillText = isTournament && !isTournamentFinal
        ? (viewerWon ? 'ADVANCING TO NEXT ROUND' : 'ELIMINATED FROM CUP')
        : (viewerWon ? 'OFFICIAL VICTORY · SETTLED' : 'DEFEAT · SETTLED');

    final bragSnippet = viewerWon
        ? 'Verified Victory on Playverzus! $playerAName $scoreA - $scoreB $playerBName in ${game.displayName} (${showCashDelta ? relativeText : 'Advancing'}) — playverzus.xyz/matches/$matchId'
        : 'GGs on Playverzus! $playerAName $scoreA - $scoreB $playerBName in ${game.displayName} — playverzus.xyz/matches/$matchId';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // THE SHAREABLE PROOF CARD
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              // 1. Blurred Official Game Poster Ambient Layer
              Positioned.fill(
                child: ImageFiltered(
                  imageFilter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
                  child: Opacity(
                    opacity: 0.42,
                    child: GamePosterView(
                      game: game,
                      useBanner: true,
                      borderRadius: 0,
                    ),
                  ),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        HigColors.canvas.withValues(alpha: 0.80),
                        (viewerWon ? HigColors.emerald : HigColors.crimson)
                            .withValues(alpha: 0.14),
                        HigColors.canvas.withValues(alpha: 0.92),
                      ],
                    ),
                    border: Border.all(
                      color: accentColor.withValues(alpha: 0.40),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
              ),

              // 2. Card Content
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Top Row: Official Game Logo + Settled Chip
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        BrandLogo.game(game, height: 34),
                        HigBadge(
                          label: isTournament
                              ? (tournamentRound ?? 'TOURNAMENT')
                              : 'VERIFIED SETTLED',
                          tone: viewerWon
                              ? HigBadgeTone.emerald
                              : HigBadgeTone.crimson,
                          icon: CupertinoIcons.checkmark_shield_fill,
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Player Profiles & Tabular Match Score
                    Row(
                      children: [
                        Expanded(
                          child: _PlayerColumn(
                            username: playerAName,
                            isWinner: scoreA >= scoreB,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.50),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: HigColors.glassBorder),
                          ),
                          child: Text(
                            '$scoreA  -  $scoreB',
                            style: HigTypography.mono(
                              size: 28,
                              weight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Expanded(
                          child: _PlayerColumn(
                            username: playerBName,
                            isWinner: scoreB > scoreA,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Single Relative Outcome Figure (or Tournament Progression)
                    if (showCashDelta)
                      Text(
                        relativeText,
                        style: HigTypography.mono(
                          size: 38,
                          weight: FontWeight.w900,
                          color: accentColor,
                          letterSpacing: -1.0,
                        ),
                      )
                    else
                      Text(
                        viewerWon ? 'QUALIFIED' : 'ELIMINATED',
                        style: HigTypography.largeTitle(color: accentColor),
                      ),

                    const SizedBox(height: 12),

                    HigBadge(
                      label: statusPillText,
                      tone: viewerWon
                          ? HigBadgeTone.emerald
                          : HigBadgeTone.crimson,
                    ),

                    const SizedBox(height: 22),
                    const Divider(height: 1),
                    const SizedBox(height: 16),

                    // Official Playverzus Brand Logo Footer (NO typed name!)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const BrandLogo.full(height: 22),
                        gateway == PaymentGatewayMode.kopokopo
                            ? const BrandLogo.kopokopo(height: 22)
                            : const BrandLogo.crossmint(height: 18),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // EXTERNAL ACTION DOCK — STRICTLY OUTSIDE THE PROOF CARD
        Row(
          children: [
            Expanded(
              child: HigButton(
                label: 'Copy Brag Snippet',
                icon: CupertinoIcons.doc_on_doc,
                variant: HigButtonVariant.secondary,
                size: HigButtonSize.medium,
                fullWidth: true,
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: bragSnippet));
                  ref.read(toastProvider.notifier).show(
                        'Brag Snippet Copied',
                        body: 'Ready to paste on X, WhatsApp, or Discord.',
                        tone: ToastTone.success,
                      );
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: HigButton(
                label: 'Share Proof',
                icon: CupertinoIcons.share,
                variant: HigButtonVariant.primary,
                size: HigButtonSize.medium,
                fullWidth: true,
                onPressed: () {
                  Share.share(bragSnippet, subject: 'Playverzus Verified Match');
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _PlayerColumn extends StatelessWidget {
  final String username;
  final bool isWinner;

  const _PlayerColumn({required this.username, required this.isWinner});

  @override
  Widget build(BuildContext context) {
    final letter = username.isNotEmpty ? username[0].toUpperCase() : 'P';
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isWinner
                ? HigColors.copper.withValues(alpha: 0.22)
                : HigColors.surfaceElevated,
            border: Border.all(
              color: isWinner ? HigColors.copper : HigColors.glassBorder,
              width: isWinner ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            letter,
            style: HigTypography.title3(
              color: isWinner ? HigColors.copperBright : HigColors.labelPrimary,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '@$username',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: HigTypography.headline().copyWith(fontSize: 13.5),
        ),
        const SizedBox(height: 2),
        Text(
          isWinner ? 'WINNER' : 'CHALLENGER',
          style: HigTypography.mono(
            size: 9.5,
            color: isWinner ? HigColors.emerald : HigColors.labelTertiary,
          ),
        ),
      ],
    );
  }
}
