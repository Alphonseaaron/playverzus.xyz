import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Tournament Detail & Live Bracket View (`/tournaments/:id` and `/tournaments/:id/bracket`).
/// Fetches real tournament & bracket data from `GET /tournaments/:id` + `GET /tournaments/:id/bracket`.
class TournamentDetailScreen extends ConsumerStatefulWidget {
  final String tournamentId;
  final bool focusBracket;

  const TournamentDetailScreen({
    super.key,
    required this.tournamentId,
    this.focusBracket = false,
  });

  @override
  ConsumerState<TournamentDetailScreen> createState() =>
      _TournamentDetailScreenState();
}

class _TournamentDetailScreenState
    extends ConsumerState<TournamentDetailScreen> {
  bool _loading = false;
  bool _acting = false;
  String? _error;
  List<Map<String, dynamic>> _bracketMatches = const [];
  Map<String, dynamic>? _remoteTournament;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tRes = await ApiClient.get('/tournaments/${widget.tournamentId}');
      if (tRes is Map<String, dynamic>) _remoteTournament = tRes;
      final bRes =
          await ApiClient.get('/tournaments/${widget.tournamentId}/bracket');
      if (bRes is List) {
        _bracketMatches = bRes.whereType<Map<String, dynamic>>().toList();
      } else if (bRes is Map && bRes['matches'] is List) {
        _bracketMatches = (bRes['matches'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  String _fmt(PaymentGatewayMode gw, double usd) {
    if (usd == 0) return 'FREE';
    if (gw == PaymentGatewayMode.kopokopo) {
      return 'KES ${(usd * AppConfig.usdToKesRate).round()}';
    }
    return '\$${usd.toStringAsFixed(0)} USDC';
  }

  @override
  Widget build(BuildContext context) {
    final arena = ref.watch(arenaDataProvider);
    final session = ref.watch(playerSessionProvider);
    final gateway = ref.watch(paymentGatewayProvider);

    TournamentModel? tournament =
        arena.blitzPools.where((t) => t.id == widget.tournamentId).firstOrNull ??
            arena.tournaments
                .where((t) => t.id == widget.tournamentId)
                .firstOrNull;

    if (tournament == null && _remoteTournament != null) {
      final m = _remoteTournament!;
      final gp = m['game_profiles'] as Map<String, dynamic>?;
      final g = findOfficialGameById(
          (gp?['id'] ?? m['profile_id'] ?? 'eafc').toString());
      final fee = (m['entry_fee'] as num?)?.toDouble() ?? 0.0;
      final size = (m['size'] as num?)?.toInt() ?? 8;
      tournament = TournamentModel(
        id: widget.tournamentId,
        name: (m['name'] ?? '${g.displayName} Cup').toString(),
        gameId: g.id,
        format: (m['format'] ?? 'SINGLE_ELIM').toString(),
        size: size,
        entryFeeUsd: fee,
        prizePoolUsd:
            (m['prize_pool'] as num?)?.toDouble() ?? (fee * size * 0.9),
        status: (m['status'] ?? 'REGISTRATION').toString(),
        isBlitz: size == 5,
        region: (m['region'] ?? 'Global').toString(),
        entrants: const [],
      );
    }

    if (_loading && tournament == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: HigLoadingCard(message: 'Loading tournament & bracket...'),
        ),
      );
    }

    if (tournament == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: HigEmptyState(
            icon: CupertinoIcons.rosette,
            title: 'Tournament not found',
            subtitle: _error ??
                'This bracket may have ended or been removed. Return to browse active tournaments.',
            actionLabel: 'All Tournaments',
            onAction: () => context.go('/tournaments'),
          ),
        ),
      );
    }

    final t = tournament;
    final game = findOfficialGameById(t.gameId);
    final isEnrolled = t.entrants.any((e) => e.username == session.username);
    final isCheckedIn = t.entrants
        .any((e) => e.username == session.username && e.checkedIn);
    final inviteUrl = 'https://playverzus.xyz/#/tournaments/${t.id}';

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 960,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (!widget.focusBracket)
                        HigButton(
                          label: 'Full Bracket',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.secondary,
                          onPressed: () =>
                              context.push('/tournaments/${t.id}/bracket'),
                        ),
                      HigButton(
                        label: 'Copy Invite Link',
                        icon: CupertinoIcons.share,
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: inviteUrl));
                          ref.read(toastProvider.notifier).show(
                                'Tournament link copied',
                                tone: ToastTone.success,
                              );
                        },
                      ),
                    ],
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _load),
                ],

                const SizedBox(height: 14),

                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            width: 52,
                            height: 68,
                            child: GamePosterView(game: game, borderRadius: 8),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [
                                    HigBadge(
                                      label: t.isBlitz
                                          ? '5-PLAYER BLITZ'
                                          : t.format.replaceAll('_', ' '),
                                      tone: HigBadgeTone.copper,
                                    ),
                                    HigBadge(
                                      label: t.status,
                                      tone: t.status == 'ACTIVE'
                                          ? HigBadgeTone.emerald
                                          : HigBadgeTone.neutral,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(t.name, style: HigTypography.title2()),
                                const SizedBox(height: 4),
                                Text(
                                  '${game.displayName} · ${t.enrolledCount}/${t.size} · Entry ${_fmt(gateway, t.entryFeeUsd)} · Prize ${_fmt(gateway, t.prizePoolUsd)}',
                                  style: HigTypography.mono(
                                    size: 11.5,
                                    color: HigColors.emerald,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          if (!isEnrolled && !t.isFull)
                            HigButton(
                              label:
                                  'Join Tournament (${_fmt(gateway, t.entryFeeUsd)})',
                              loading: _acting,
                              onPressed: () async {
                                setState(() => _acting = true);
                                try {
                                  await ref
                                      .read(arenaDataProvider.notifier)
                                      .joinTournament(
                                        t.id,
                                        session.username,
                                        session.countryCode,
                                      );
                                  ref.read(toastProvider.notifier).show(
                                        'Registered in ${t.name}',
                                        tone: ToastTone.success,
                                      );
                                  await _load();
                                } on ApiException catch (e) {
                                  ref.read(toastProvider.notifier).show(
                                        e.message,
                                        tone: ToastTone.error,
                                      );
                                } finally {
                                  if (mounted) setState(() => _acting = false);
                                }
                              },
                            ),
                          if (isEnrolled && !isCheckedIn)
                            HigButton(
                              label: 'Check In',
                              variant: HigButtonVariant.emerald,
                              loading: _acting,
                              onPressed: () async {
                                setState(() => _acting = true);
                                try {
                                  await ref
                                      .read(arenaDataProvider.notifier)
                                      .checkInTournament(t.id, session.username);
                                  ref.read(toastProvider.notifier).show(
                                        'Checked in',
                                        tone: ToastTone.success,
                                      );
                                } on ApiException catch (e) {
                                  ref.read(toastProvider.notifier).show(
                                        e.message,
                                        tone: ToastTone.error,
                                      );
                                } finally {
                                  if (mounted) setState(() => _acting = false);
                                }
                              },
                            ),
                          if (t.status == 'REGISTRATION')
                            HigButton(
                              label: 'Start Bracket',
                              variant: HigButtonVariant.secondary,
                              loading: _acting,
                              onPressed: () async {
                                setState(() => _acting = true);
                                try {
                                  await ref
                                      .read(arenaDataProvider.notifier)
                                      .startTournamentBracket(t.id);
                                  ref.read(toastProvider.notifier).show(
                                        'Bracket launched',
                                        tone: ToastTone.success,
                                      );
                                  await _load();
                                } on ApiException catch (e) {
                                  ref.read(toastProvider.notifier).show(
                                        e.message,
                                        tone: ToastTone.error,
                                      );
                                } finally {
                                  if (mounted) setState(() => _acting = false);
                                }
                              },
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Live Bracket Matches
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bracket Schedule', style: HigTypography.title3()),
                      const SizedBox(height: 10),
                      if (_bracketMatches.isEmpty)
                        Text(
                          'Bracket pairings generate automatically once registration locks and check-in completes.',
                          style: HigTypography.footnote(),
                        )
                      else
                        ..._bracketMatches.map((m) {
                          final mid = (m['match_id'] ?? m['id'] ?? '').toString();
                          final round = (m['round'] ?? 1).toString();
                          final status = (m['status'] ?? 'SCHEDULED').toString();
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text('Round $round · Match #$mid',
                                style: HigTypography.headline()
                                    .copyWith(fontSize: 14)),
                            subtitle: Text('Status: $status',
                                style: HigTypography.caption()),
                            trailing: HigButton(
                              label: 'Open Match',
                              size: HigButtonSize.small,
                              variant: HigButtonVariant.secondary,
                              onPressed: () => context.push('/matches/$mid'),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
