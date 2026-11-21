import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../developer/developer_models.dart';
import '../developer/developer_repository.dart';

/// Dedicated Game Arena Hub (`/games/:id`)
class GameDetailScreen extends ConsumerWidget {
  final String gameId;
  const GameDetailScreen({super.key, required this.gameId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allGames = ref.watch(allCatalogGamesProvider);
    final devGames = ref.watch(developerGamesProvider).games;
    final game = findAnyCatalogGame(allGames, gameId);
    DeveloperGame? devMeta;
    for (final d in devGames) {
      if (d.id == game.id) {
        devMeta = d;
        break;
      }
    }
    final machine = ref.watch(machineAuthProvider);
    final arena = ref.watch(arenaDataProvider);
    final handles = ref.watch(gameAccountsProvider);
    final onDevice = machine.installedGameIds.contains(game.id);
    final openDuels =
        arena.challenges.where((c) => c.gameId == game.id).toList();
    final blitz =
        arena.blitzPools.where((b) => b.gameId == game.id).toList();

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                padding: EdgeInsets.zero,
                radius: 22,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: 180,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          GamePosterView(
                            game: game,
                            useBanner: true,
                            borderRadius: 0,
                          ),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.25),
                                  HigColors.surfacePrimary,
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            left: 20,
                            right: 20,
                            bottom: 16,
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 56,
                                  height: 74,
                                  child: GamePosterView(
                                      game: game, borderRadius: 10),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Wrap(
                                        spacing: 6,
                                        children: [
                                          HigBadge(
                                            label: game.platformSummary,
                                            tone: HigBadgeTone.copper,
                                          ),
                                          HigBadge(
                                            label: game.gameType
                                                .replaceAll('_', ' '),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(game.displayName,
                                          style: HigTypography.title1()),
                                      Text(game.tagline,
                                          style: HigTypography.footnote()),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(18),
                      child: Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          HigButton(
                            label: 'Play 1v1 Duels (${openDuels.length})',
                            icon: CupertinoIcons.bolt_fill,
                            onPressed: () {
                              ref
                                  .read(activeGameProvider.notifier)
                                  .selectGame(game);
                              context.go('/challenges');
                            },
                          ),
                          HigButton(
                            label: 'Create Challenge',
                            icon: CupertinoIcons.add,
                            variant: HigButtonVariant.secondary,
                            onPressed: () {
                              ref
                                  .read(activeGameProvider.notifier)
                                  .selectGame(game);
                              context.push('/matches/new');
                            },
                          ),
                          HigButton(
                            label: 'Blitz Pools (${blitz.length})',
                            icon: CupertinoIcons.rosette,
                            variant: HigButtonVariant.secondary,
                            onPressed: () {
                              ref
                                  .read(activeGameProvider.notifier)
                                  .selectGame(game);
                              context.go('/tournaments');
                            },
                          ),
                          HigButton(
                            label: onDevice
                                ? 'Pinned on This Device'
                                : 'Pin on This Device',
                            icon: onDevice
                                ? CupertinoIcons.checkmark_alt
                                : CupertinoIcons.pin,
                            variant: onDevice
                                ? HigButtonVariant.emerald
                                : HigButtonVariant.secondary,
                            onPressed: () => ref
                                .read(machineAuthProvider.notifier)
                                .toggleInstalledGame(game.id),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              GlassCard(
                radius: 18,
                padding: const EdgeInsets.all(18),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Linked ${game.gamertagLabel}',
                            style: HigTypography.caption()),
                        const SizedBox(height: 4),
                        Text(
                          handles[game.id] ?? 'Not linked yet',
                          style: HigTypography.mono(
                            size: 14,
                            color: handles[game.id] != null
                                ? HigColors.emerald
                                : HigColors.labelTertiary,
                          ),
                        ),
                      ],
                    ),
                    HigButton(
                      label: 'Manage Handles',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.secondary,
                      onPressed: () => context.go('/dashboard'),
                    ),
                  ],
                ),
              ),
              if (devMeta != null) ...[
                const SizedBox(height: 16),
                _DeveloperLiveStatsCard(
                  devGame: devMeta,
                  initialPlayerHandle: handles[game.id] ?? '',
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _DeveloperLiveStatsCard extends ConsumerStatefulWidget {
  final DeveloperGame devGame;
  final String initialPlayerHandle;
  const _DeveloperLiveStatsCard({
    required this.devGame,
    required this.initialPlayerHandle,
  });

  @override
  ConsumerState<_DeveloperLiveStatsCard> createState() =>
      _DeveloperLiveStatsCardState();
}

class _DeveloperLiveStatsCardState
    extends ConsumerState<_DeveloperLiveStatsCard> {
  late TextEditingController _handleCtrl;
  late String _platform;
  bool _loading = false;
  LiveStatsFetchResult? _result;

  @override
  void initState() {
    super.initState();
    _handleCtrl = TextEditingController(text: widget.initialPlayerHandle);
    _platform = widget.devGame.platforms.isNotEmpty
        ? widget.devGame.platforms.first
        : 'PC';
  }

  @override
  void dispose() {
    _handleCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchStats() async {
    setState(() {
      _loading = true;
      _result = null;
    });
    final res =
        await ref.read(developerGamesProvider.notifier).fetchGamePlayerStats(
              gameId: widget.devGame.id,
              playerId: _handleCtrl.text.trim(),
              platform: _platform,
            );
    if (!mounted) return;
    setState(() {
      _loading = false;
      _result = res;
    });
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.devGame;
    return GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const HigBadge(
                label: 'STUDIO STATS API CONNECTED',
                tone: HigBadgeTone.emerald,
              ),
              HigBadge(
                label: 'BY ${g.studioName.toUpperCase()}',
                tone: HigBadgeTone.copper,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text('Live Platform Stats Verification',
              style: HigTypography.title3()),
          const SizedBox(height: 4),
          Text(
            'Pull live player stats directly from ${g.studioName}\'s configured platform API.',
            style: HigTypography.caption(),
          ),
          const SizedBox(height: 12),
          if (g.platforms.length > 1) ...[
            HigSegmentedControl<String>(
              backgroundColor: HigColors.surfaceGrouped,
              groupValue: _platform,
              onChanged: (v) => setState(() => _platform = v),
              segments: {for (final p in g.platforms) p: p},
            ),
            const SizedBox(height: 12),
          ],
          HigTextField(
            controller: _handleCtrl,
            placeholder: g.gamertagPlaceholder,
            prefixIcon: CupertinoIcons.person,
          ),
          const SizedBox(height: 12),
          HigButton(
            label: 'Fetch Live $_platform Stats',
            icon: CupertinoIcons.bolt_fill,
            loading: _loading,
            onPressed: _fetchStats,
          ),
          if (_result != null) ...[
            const SizedBox(height: 12),
            if (_result!.error != null)
              HigErrorBanner(message: _result!.error!)
            else if (_result!.extractedStats.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _result!.extractedStats.entries.map((e) {
                  return Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: HigColors.surfaceGrouped,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: HigColors.separator),
                    ),
                    child: Text(
                      '${e.key.toUpperCase()}: ${e.value}',
                      style: HigTypography.mono(
                        size: 12,
                        color: HigColors.emerald,
                      ),
                    ),
                  );
                }).toList(),
              )
            else
              Text(
                'Connected (HTTP ${_result!.statusCode} in ${_result!.latencyMs}ms), no mapped stat fields returned for this ID.',
                style: HigTypography.caption(color: HigColors.amber),
              ),
          ],
        ],
      ),
    );
  }
}

/// Full v1.0 Game Calibration Studio (`/games/new`):
/// Multi-platform selection, visual interactive ROI scoreboard cropper,
/// end-trigger keywords, regex pattern + live tester, and `POST /games`.
class NewGameScreen extends ConsumerStatefulWidget {
  const NewGameScreen({super.key});

  @override
  ConsumerState<NewGameScreen> createState() => _NewGameScreenState();
}

class _NewGameScreenState extends ConsumerState<NewGameScreen> {
  final _titleCtrl = TextEditingController();
  final _keywordsCtrl = TextEditingController(
    text: 'FULL TIME, VICTORY, DEFEAT, FINAL SCORE',
  );
  final _regexCtrl = TextEditingController(
    text: r'(\d{1,2})\s*[-:]\s*(\d{1,2})',
  );
  final _testSampleCtrl = TextEditingController(text: 'FULL TIME 3 - 1');

  final Set<String> _platforms = {'PC'};
  String _gameType = 'HEAD_TO_HEAD';
  double _roiX = 0.35;
  double _roiY = 0.05;
  double _roiW = 0.30;
  double _roiH = 0.12;
  bool _submitting = false;

  static const _allPlatforms = ['PC', 'CONSOLE', 'MOBILE', 'WEB', 'PHYSICAL'];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _keywordsCtrl.dispose();
    _regexCtrl.dispose();
    _testSampleCtrl.dispose();
    super.dispose();
  }

  String _regexTestPreview() {
    final pat = _regexCtrl.text.trim();
    final sample = _testSampleCtrl.text;
    if (pat.isEmpty) return 'Enter a regex pattern';
    try {
      final match = RegExp(pat, caseSensitive: false).firstMatch(sample);
      if (match == null) return 'No match on sample text';
      final groups = <String>[];
      for (int i = 1; i <= match.groupCount; i++) {
        final g = match.group(i);
        if (g != null) groups.add(g);
      }
      return groups.isEmpty
          ? 'Matched: "${match.group(0)}"'
          : 'Extracted: ${groups.join(' vs ')}';
    } catch (e) {
      return 'Invalid regex: $e';
    }
  }

  @override
  Widget build(BuildContext context) {
    final regexPreview = _regexTestPreview();
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 780,
          child: GlassCard(
            radius: 20,
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Align(
                  alignment: Alignment.centerLeft,
                  child: HigBadge(
                    label: 'GAME CALIBRATION STUDIO',
                    tone: HigBadgeTone.copper,
                  ),
                ),
                const SizedBox(height: 10),
                Text('Register & Calibrate Esports Title',
                    style: HigTypography.title2()),
                const SizedBox(height: 6),
                Text(
                  'Configure supported platforms, scoring model, HUD scoreboard ROI box, end-trigger keywords, and score extraction regex.',
                  style: HigTypography.footnote(),
                ),
                const SizedBox(height: 18),

                Text('Game Title', style: HigTypography.caption()),
                const SizedBox(height: 6),
                HigTextField(
                  controller: _titleCtrl,
                  placeholder: 'Game Title (e.g. Call of Duty: Mobile)',
                  prefixIcon: CupertinoIcons.game_controller_solid,
                ),

                const SizedBox(height: 16),
                Text('Supported Platforms (Multi-Select)',
                    style: HigTypography.caption()),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _allPlatforms.map((p) {
                    final sel = _platforms.contains(p);
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          if (sel && _platforms.length > 1) {
                            _platforms.remove(p);
                          } else {
                            _platforms.add(p);
                          }
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: sel
                              ? HigColors.brand
                              : HigColors.surfaceGrouped,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: sel ? HigColors.brand : HigColors.separator,
                          ),
                        ),
                        child: Text(
                          p,
                          style: HigTypography.footnote(
                            color:
                                sel ? Colors.white : HigColors.labelSecondary,
                          ).copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 16),
                Text('Scoring Engine Type', style: HigTypography.caption()),
                const SizedBox(height: 8),
                HigSegmentedControl<String>(
                  backgroundColor: HigColors.surfaceGrouped,
                  groupValue: _gameType,
                  onChanged: (v) => setState(() => _gameType = v),
                  segments: const {
                    'HEAD_TO_HEAD': 'Head-to-Head',
                    'HIGH_SCORE': 'High Score',
                    'BINARY_RESULT': 'Win / Loss',
                  },
                ),

                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Scoreboard ROI Calibration (16:9 HUD)',
                        style: HigTypography.headline().copyWith(fontSize: 14)),
                    Text(
                      'x:${_roiX.toStringAsFixed(2)} y:${_roiY.toStringAsFixed(2)} w:${_roiW.toStringAsFixed(2)} h:${_roiH.toStringAsFixed(2)}',
                      style: HigTypography.mono(
                        size: 10.5,
                        color: HigColors.brandBright,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Interactive Visual 16:9 HUD ROI Box Preview (Drag to move)
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final cw = constraints.maxWidth;
                      final ch = constraints.maxHeight;
                      return GestureDetector(
                        onPanUpdate: (details) {
                          setState(() {
                            _roiX = (_roiX + details.delta.dx / cw)
                                .clamp(0.0, 1.0 - _roiW);
                            _roiY = (_roiY + details.delta.dy / ch)
                                .clamp(0.0, 1.0 - _roiH);
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: HigColors.canvas,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: HigColors.separator,
                              width: 1,
                            ),
                          ),
                          child: Stack(
                            children: [
                              Center(
                                child: Text(
                                  '16:9 Game HUD Frame (Drag purple ROI box)',
                                  style: HigTypography.caption(),
                                ),
                              ),
                              Positioned(
                                left: _roiX * cw,
                                top: _roiY * ch,
                                width: _roiW * cw,
                                height: _roiH * ch,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color:
                                        HigColors.brand.withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: HigColors.brandBright,
                                      width: 2,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    'OCR ROI',
                                    style: HigTypography.mono(
                                      size: 10,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('ROI Width (${(_roiW * 100).round()}%)',
                              style: HigTypography.caption()),
                          CupertinoSlider(
                            value: _roiW,
                            min: 0.08,
                            max: 0.80,
                            activeColor: HigColors.brand,
                            onChanged: (v) => setState(() {
                              _roiW = v;
                              _roiX = _roiX.clamp(0.0, 1.0 - _roiW);
                            }),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('ROI Height (${(_roiH * 100).round()}%)',
                              style: HigTypography.caption()),
                          CupertinoSlider(
                            value: _roiH,
                            min: 0.05,
                            max: 0.50,
                            activeColor: HigColors.brand,
                            onChanged: (v) => setState(() {
                              _roiH = v;
                              _roiY = _roiY.clamp(0.0, 1.0 - _roiH);
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                Text('End-of-Match Trigger Keywords (comma-separated)',
                    style: HigTypography.caption()),
                const SizedBox(height: 6),
                HigTextField(
                  controller: _keywordsCtrl,
                  placeholder: 'FULL TIME, VICTORY, DEFEAT, FINAL SCORE',
                  prefixIcon: CupertinoIcons.tag,
                ),

                const SizedBox(height: 12),
                Text('Score Extraction Regex Pattern',
                    style: HigTypography.caption()),
                const SizedBox(height: 6),
                HigTextField(
                  controller: _regexCtrl,
                  placeholder: r'(\d{1,2})\s*[-:]\s*(\d{1,2})',
                  prefixIcon: CupertinoIcons.chevron_left_slash_chevron_right,
                  onChanged: (_) => setState(() {}),
                ),

                const SizedBox(height: 10),
                HigTextField(
                  controller: _testSampleCtrl,
                  placeholder: 'Test OCR sample text...',
                  prefixIcon: CupertinoIcons.lab_flask,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 6),
                Text(
                  'Regex Test: $regexPreview',
                  style: HigTypography.mono(
                    size: 11.5,
                    color: regexPreview.startsWith('Extracted') ||
                            regexPreview.startsWith('Matched')
                        ? HigColors.emerald
                        : HigColors.labelTertiary,
                  ),
                ),

                const SizedBox(height: 20),
                HigButton(
                  label: 'Submit Game Profile & Calibration',
                  icon: CupertinoIcons.checkmark_seal_fill,
                  size: HigButtonSize.large,
                  fullWidth: true,
                  loading: _submitting,
                  onPressed: () async {
                    final t = _titleCtrl.text.trim();
                    if (t.isEmpty) {
                      ref.read(toastProvider.notifier).show(
                            'Enter a game title first',
                            tone: ToastTone.error,
                          );
                      return;
                    }
                    setState(() => _submitting = true);
                    final keywords = _keywordsCtrl.text
                        .split(',')
                        .map((k) => k.trim())
                        .where((k) => k.isNotEmpty)
                        .toList();
                    try {
                      await ApiClient.post('/games', data: {
                        'displayName': t,
                        'platform': _platforms.first,
                        'platforms': _platforms.toList(),
                        'gameType': _gameType,
                        'roi': {
                          'x': double.parse(_roiX.toStringAsFixed(3)),
                          'y': double.parse(_roiY.toStringAsFixed(3)),
                          'w': double.parse(_roiW.toStringAsFixed(3)),
                          'h': double.parse(_roiH.toStringAsFixed(3)),
                        },
                        'endKeywords': keywords,
                        'regexPattern': _regexCtrl.text.trim(),
                      });
                      if (!context.mounted) return;
                      ref.read(toastProvider.notifier).show(
                            'Game profile calibrated & submitted',
                            body: '$t (${_platforms.join('/')} · $_gameType)',
                            tone: ToastTone.success,
                          );
                      context.go('/admin/profiles');
                    } on ApiException catch (e) {
                      if (!context.mounted) return;
                      ref
                          .read(toastProvider.notifier)
                          .show(e.message, tone: ToastTone.error);
                    } finally {
                      if (mounted) setState(() => _submitting = false);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
