import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/active_game_switcher.dart';
import '../../design_system/widgets/hig_primitives.dart';

class CreateTournamentScreen extends ConsumerStatefulWidget {
  const CreateTournamentScreen({super.key});

  @override
  ConsumerState<CreateTournamentScreen> createState() =>
      _CreateTournamentScreenState();
}

class _CreateTournamentScreenState
    extends ConsumerState<CreateTournamentScreen> {
  final _nameCtrl = TextEditingController();
  String _format = 'SINGLE_ELIM';
  int _size = 8;
  double _entryFeeUsd = 5.0;
  String _region = 'East Africa';
  bool _creating = false;

  static const _formatDetails = {
    'SINGLE_ELIM': (
      'Single Elimination',
      'Classic knockout bracket — win and advance, one loss eliminates.'
    ),
    'DOUBLE_ELIM': (
      'Double Elimination',
      'Winners + Losers brackets (EVO style) — must lose twice to be eliminated.'
    ),
    'ROUND_ROBIN': (
      'Round Robin',
      'All-play-all league — every player faces every other entrant.'
    ),
    'SWISS': (
      'Swiss System',
      'Skill-paired rounds — no early knockout, everyone plays every round.'
    ),
  };

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  String _fmt(PaymentGatewayMode gw, double usd) {
    if (usd == 0) return 'FREE';
    if (gw == PaymentGatewayMode.kopokopo) {
      return 'KES ${(usd * AppConfig.usdToKesRate).round()}';
    }
    return '\$${usd.toStringAsFixed(0)} USDC';
  }

  Future<void> _submit() async {
    final activeGame = ref.read(activeGameProvider);
    final session = ref.read(playerSessionProvider);
    final title = _nameCtrl.text.trim().isNotEmpty
        ? _nameCtrl.text.trim()
        : '${activeGame.displayName} ${_formatDetails[_format]!.$1} Cup';

    setState(() => _creating = true);
    try {
      final created =
          await ref.read(arenaDataProvider.notifier).createTournament(
                name: title,
                gameId: activeGame.id,
                format: _format,
                size: _size,
                entryFeeUsd: _entryFeeUsd,
                region: _region,
                creatorUsername: session.username,
              );
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Tournament Launched!',
            body: 'Share the invite link so opponents can register & check in.',
            tone: ToastTone.success,
          );
      context.go('/tournaments/${created.id}');
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final prizePool = _entryFeeUsd * _size * 0.90;

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 780,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                radius: 22,
                padding: const EdgeInsets.all(22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 48,
                          height: 64,
                          child:
                              GamePosterView(game: activeGame, borderRadius: 10),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const HigBadge(
                                label: 'CREATE CHAMPIONSHIP',
                                tone: HigBadgeTone.copper,
                              ),
                              const SizedBox(height: 6),
                              Text(activeGame.displayName,
                                  style: HigTypography.title2()),
                            ],
                          ),
                        ),
                        HigButton(
                          label: 'Change Game',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.secondary,
                          onPressed: () => showGameSelectionSheet(context, ref),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    Text('Tournament Name', style: HigTypography.headline()),
                    const SizedBox(height: 8),
                    HigTextField(
                      controller: _nameCtrl,
                      placeholder:
                          'e.g. ${activeGame.displayName} Weekend Championship',
                      prefixIcon: CupertinoIcons.rosette,
                    ),

                    const SizedBox(height: 18),
                    Text('Bracket Format', style: HigTypography.headline()),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _formatDetails.entries.map((e) {
                        final sel = _format == e.key;
                        return GestureDetector(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _format = e.key);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: sel
                                  ? HigColors.copper
                                  : HigColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: sel
                                    ? HigColors.copper
                                    : HigColors.glassBorder,
                              ),
                            ),
                            child: Text(
                              e.value.$1,
                              style: HigTypography.footnote(
                                color: sel
                                    ? Colors.white
                                    : HigColors.labelSecondary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _formatDetails[_format]!.$2,
                      style: HigTypography.footnote(),
                    ),

                    const SizedBox(height: 18),
                    Text('Bracket Size (Max Entrants)',
                        style: HigTypography.headline()),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [4, 8, 16, 32, 64].map((n) {
                        final sel = _size == n;
                        return GestureDetector(
                          onTap: () => setState(() => _size = n),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              color: sel
                                  ? HigColors.copper
                                  : HigColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Text(
                              '$n Players',
                              style: HigTypography.mono(
                                size: 12,
                                color: sel
                                    ? Colors.white
                                    : HigColors.labelSecondary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 18),
                    Text('Entry Buy-In (Guaranteed Pool: ${_fmt(gateway, prizePool)})',
                        style: HigTypography.headline()),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [0.0, 2.5, 5.0, 10.0, 25.0, 50.0].map((fee) {
                        final sel = _entryFeeUsd == fee;
                        return GestureDetector(
                          onTap: () => setState(() => _entryFeeUsd = fee),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              color: sel
                                  ? HigColors.emerald
                                  : HigColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Text(
                              _fmt(gateway, fee),
                              style: HigTypography.mono(
                                size: 12,
                                color: sel
                                    ? Colors.black
                                    : HigColors.labelSecondary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 18),
                    Text('Region Scope', style: HigTypography.headline()),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ['Global', 'East Africa', 'Kenya Only', 'Europe']
                          .map((r) {
                        final sel = _region == r;
                        return GestureDetector(
                          onTap: () => setState(() => _region = r),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: sel
                                  ? HigColors.blue
                                  : HigColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              r,
                              style: HigTypography.footnote(
                                color: sel
                                    ? Colors.white
                                    : HigColors.labelSecondary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 24),
                    HigButton(
                      label: 'Create & Open Registration',
                      icon: CupertinoIcons.rocket_fill,
                      size: HigButtonSize.large,
                      fullWidth: true,
                      loading: _creating,
                      onPressed: _submit,
                    ),
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
