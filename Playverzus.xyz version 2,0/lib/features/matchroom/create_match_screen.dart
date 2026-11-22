import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/countries.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/active_game_switcher.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Handles ALL versions of Challenges:
/// 1. 1v1 Open Board Duel
/// 2. Direct Rival Challenge (@username invite)
/// 3. Private Room Code Match
/// 4. Party / Squad Duel (2v2, 3v3, 5v5)
/// Plus Country/Region Lock, BO1/BO3/BO5, and Custom Cash/PTS Stakes!
class CreateMatchScreen extends ConsumerStatefulWidget {
  const CreateMatchScreen({super.key});

  @override
  ConsumerState<CreateMatchScreen> createState() => _CreateMatchScreenState();
}

class _CreateMatchScreenState extends ConsumerState<CreateMatchScreen> {
  String _mode = '1V1_OPEN'; // 1V1_OPEN | DIRECT_RIVAL | PRIVATE_ROOM | PARTY_SQUAD
  String _squadSize = '2v2';
  String _format = 'BO1';
  bool _isCash = true;
  double _stakeUsd = 5.0;
  String _region = 'East Africa';
  bool _countryLocked = false;
  bool _creating = false;
  String? _rivalErr;
  String? _stakeErr;

  final _rivalCtrl = TextEditingController();
  final _customStakeCtrl = TextEditingController();

  @override
  void dispose() {
    _rivalCtrl.dispose();
    _customStakeCtrl.dispose();
    super.dispose();
  }

  double get _effectiveStakeUsd {
    final parsed = double.tryParse(_customStakeCtrl.text.trim());
    if (parsed != null && parsed >= 0) return parsed;
    return _stakeUsd;
  }

  String _formatStake(PaymentGatewayMode gw, double usd) {
    if (!_isCash) return '${(usd * 100).round()} PTS';
    if (gw == PaymentGatewayMode.kopokopo) {
      return 'KES ${(usd * AppConfig.usdToKesRate).round()}';
    }
    return '\$${usd.toStringAsFixed(2)} USDC';
  }

  Future<void> _launchMatchroom() async {
    final activeGame = ref.read(activeGameProvider);
    final session = ref.read(playerSessionProvider);

    setState(() {
      _rivalErr = null;
      _stakeErr = null;
    });

    if (_mode == 'DIRECT_RIVAL' && _rivalCtrl.text.trim().isEmpty) {
      setState(() => _rivalErr =
          'Type the opponent’s Playverzus username here so we know who to invite.');
      return;
    }

    final customRaw = _customStakeCtrl.text.trim();
    if (customRaw.isNotEmpty) {
      final parsed = double.tryParse(customRaw);
      if (parsed == null || parsed < 0) {
        setState(() => _stakeErr =
            'Enter a valid positive amount, or clear this box to use a preset above.');
        return;
      }
      if (_isCash && parsed > session.cashUsd + 0.001) {
        setState(() => _stakeErr =
            'That stake is higher than your available cash balance.');
        return;
      }
    }

    setState(() => _creating = true);
    try {
      final created = await ref.read(arenaDataProvider.notifier).createChallenge(
            gameId: activeGame.id,
            hostName: session.username,
            mode: _mode,
            squadSize: _mode == 'PARTY_SQUAD' ? _squadSize : '1v1',
            format: _format,
            stakeUsd: _effectiveStakeUsd,
            isCash: _isCash,
            region: _region,
            countryLock: _countryLocked ? session.countryCode : null,
            invitedOpponent:
                _mode == 'DIRECT_RIVAL' ? _rivalCtrl.text.trim() : null,
          );
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Challenge Live · Room ${created.roomCode}',
            body: _mode == 'PRIVATE_ROOM'
                ? 'Share code ${created.roomCode} or match link so your opponent joins.'
                : _mode == 'DIRECT_RIVAL'
                    ? 'Direct challenge sent to @${created.invitedOpponent}!'
                    : 'Listed on the Open Board — opponents can accept immediately.',
            tone: ToastTone.success,
          );
      context.go('/matches/${created.id}');
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
    const presets = [0.0, 1.0, 2.5, 5.0, 10.0, 25.0];
    final winnerPrize =
        PlatformRakeSchedule.duelWinnerPayoutUsd(_effectiveStakeUsd);
    final winnerSharePct =
        ((1.0 - PlatformRakeSchedule.duelRakeRate(_effectiveStakeUsd)) * 100)
            .toStringAsFixed(1)
            .replaceAll('.0', '');

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 780,
          child: GlassCard(
            radius: 22,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    SizedBox(
                      width: 48,
                      height: 64,
                      child: GamePosterView(game: activeGame, borderRadius: 10),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          HigBadge(
                            label: activeGame.gameType.replaceAll('_', ' '),
                            tone: HigBadgeTone.copper,
                          ),
                          const SizedBox(height: 6),
                          Text(activeGame.displayName,
                              style: HigTypography.title2()),
                          Text(
                            activeGame.platformSummary,
                            style: HigTypography.footnote(),
                          ),
                        ],
                      ),
                    ),
                    HigButton(
                      label: 'Change',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.secondary,
                      onPressed: () => showGameSelectionSheet(context, ref),
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                const Divider(height: 1),
                const SizedBox(height: 18),

                // 1. CHALLENGE VERSION SELECTOR
                Text('Challenge Version', style: HigTypography.headline()),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _choicePill('1V1_OPEN', '1v1 Open Board', _mode,
                        (v) => setState(() => _mode = v)),
                    _choicePill('DIRECT_RIVAL', 'Direct Rival (@tag)', _mode,
                        (v) => setState(() => _mode = v)),
                    _choicePill('PRIVATE_ROOM', 'Private Room Code', _mode,
                        (v) => setState(() => _mode = v)),
                    _choicePill('PARTY_SQUAD', 'Squad / Party', _mode,
                        (v) => setState(() => _mode = v)),
                  ],
                ),

                if (_mode == 'DIRECT_RIVAL') ...[
                  const SizedBox(height: 12),
                  HigTextField(
                    controller: _rivalCtrl,
                    placeholder: 'Target opponent @username',
                    prefixIcon: CupertinoIcons.at,
                    errorText: _rivalErr,
                    onChanged: (_) {
                      if (_rivalErr != null) setState(() => _rivalErr = null);
                    },
                  ),
                ],

                if (_mode == 'PARTY_SQUAD') ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: ['2v2', '3v3', '5v5']
                        .map((sz) => _choicePill(sz, '$sz Squad', _squadSize,
                            (v) => setState(() => _squadSize = v)))
                        .toList(),
                  ),
                ],

                const SizedBox(height: 18),

                // 2. SERIES FORMAT (Lag-free HigSegmentedControl)
                Text('Series Format', style: HigTypography.headline()),
                const SizedBox(height: 8),
                HigSegmentedControl<String>(
                  backgroundColor: HigColors.surfaceGrouped,
                  groupValue: _format,
                  onChanged: (v) => setState(() => _format = v),
                  segments: const {
                    'BO1': 'Best of 1',
                    'BO3': 'Best of 3',
                    'BO5': 'Best of 5',
                  },
                ),

                const SizedBox(height: 18),

                // 3. REGION & COUNTRY LOCK (With real CountryFlag)
                Builder(builder: (context) {
                  final session = ref.watch(playerSessionProvider);
                  final userCountry = findCountryByCode(session.countryCode);
                  final countryLabel = userCountry != null
                      ? '${userCountry.name} Only'
                      : 'My Country Only';
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          Text('Region & Country Lock',
                              style: HigTypography.headline()),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (userCountry != null) ...[
                                CountryFlag(
                                  code: userCountry.code,
                                  width: 18,
                                  height: 12,
                                ),
                                const SizedBox(width: 6),
                              ],
                              Text(countryLabel,
                                  style: HigTypography.footnote()),
                              const SizedBox(width: 8),
                              CupertinoSwitch(
                                value: _countryLocked,
                                activeTrackColor: HigColors.brand,
                                onChanged: (v) => setState(() {
                                  _countryLocked = v;
                                  if (v) _region = countryLabel;
                                }),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          'Global',
                          'Africa',
                          'Europe',
                          'North America',
                          if (userCountry != null) countryLabel,
                        ]
                            .map((r) => _choicePill(
                                r, r, _region, (v) => setState(() => _region = v)))
                            .toList(),
                      ),
                    ],
                  );
                }),

                const SizedBox(height: 18),

                // 4. CURRENCY & STAKE (Lag-free HigSegmentedControl)
                Text('Entry Stake & Guaranteed Winner Pool',
                    style: HigTypography.headline()),
                const SizedBox(height: 8),
                HigSegmentedControl<bool>(
                  backgroundColor: HigColors.surfaceGrouped,
                  activeColor: _isCash ? HigColors.emerald : HigColors.brand,
                  activeTextColor: _isCash ? Colors.black : Colors.white,
                  groupValue: _isCash,
                  onChanged: (v) => setState(() => _isCash = v),
                  segments: {
                    true: gateway == PaymentGatewayMode.kopokopo
                        ? 'Real Cash (KES / M-PESA)'
                        : 'Real Cash (USDC)',
                    false: 'Demo Practice (PTS)',
                  },
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: presets.map((p) {
                    final sel = _stakeUsd == p && _customStakeCtrl.text.isEmpty;
                    return GestureDetector(
                      onTap: () {
                        _customStakeCtrl.clear();
                        setState(() => _stakeUsd = p);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 13, vertical: 9),
                        decoration: BoxDecoration(
                          color: sel
                              ? HigColors.copper
                              : HigColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Text(
                          p == 0 ? 'FREE' : _formatStake(gateway, p),
                          style: HigTypography.mono(
                            size: 12,
                            color: sel ? Colors.white : HigColors.labelSecondary,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                HigTextField(
                  controller: _customStakeCtrl,
                  placeholder: 'Or enter custom USD stake amount (optional)',
                  prefixIcon: CupertinoIcons.money_dollar_circle,
                  keyboardType: TextInputType.number,
                  errorText: _stakeErr,
                  onChanged: (_) => setState(() => _stakeErr = null),
                ),

                if (_isCash && _effectiveStakeUsd > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: HigColors.emerald.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: HigColors.emerald.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Guaranteed Winner Payout ($winnerSharePct%)',
                            style: HigTypography.footnote(
                                color: HigColors.labelPrimary)),
                        Text(
                          _formatStake(gateway, winnerPrize),
                          style: HigTypography.mono(
                            size: 14,
                            color: HigColors.emerald,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 22),
                HigButton(
                  label:
                      'Launch Matchroom (${_formatStake(gateway, _effectiveStakeUsd)})',
                  icon: CupertinoIcons.rocket_fill,
                  size: HigButtonSize.large,
                  fullWidth: true,
                  loading: _creating,
                  onPressed: _launchMatchroom,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _choicePill(
    String value,
    String label,
    String current,
    ValueChanged<String> onPick,
  ) {
    final sel = value == current;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onPick(value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: sel ? HigColors.copper : HigColors.surfaceElevated,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: sel ? HigColors.copper : HigColors.glassBorder,
            width: 0.7,
          ),
        ),
        child: Text(
          label,
          style: HigTypography.footnote(
            color: sel ? Colors.white : HigColors.labelSecondary,
          ),
        ),
      ),
    );
  }
}
