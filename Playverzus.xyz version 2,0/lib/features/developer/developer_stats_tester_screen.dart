import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import 'developer_models.dart';
import 'developer_repository.dart';

/// Live Stats Fetch Inspector (`/developer/tester`).
/// Lets developers pick any configured game + platform and pull real-time stats
/// through Playverzus's server-side platform stats engine.
class DeveloperStatsTesterScreen extends ConsumerStatefulWidget {
  final String? initialGameId;
  const DeveloperStatsTesterScreen({super.key, this.initialGameId});

  @override
  ConsumerState<DeveloperStatsTesterScreen> createState() =>
      _DeveloperStatsTesterScreenState();
}

class _DeveloperStatsTesterScreenState
    extends ConsumerState<DeveloperStatsTesterScreen> {
  final _playerIdCtrl = TextEditingController();
  final _matchIdCtrl = TextEditingController();

  String? _selectedGameId;
  String _selectedPlatform = 'PC';
  String _mode = 'player';
  bool _loading = false;
  LiveStatsFetchResult? _result;

  @override
  void initState() {
    super.initState();
    _selectedGameId = widget.initialGameId;
  }

  @override
  void dispose() {
    _playerIdCtrl.dispose();
    _matchIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch(DeveloperGame game) async {
    setState(() {
      _loading = true;
      _result = null;
    });
    final res =
        await ref.read(developerGamesProvider.notifier).fetchGamePlayerStats(
              gameId: game.id,
              playerId: _playerIdCtrl.text.trim(),
              matchId: _matchIdCtrl.text.trim(),
              platform: _selectedPlatform,
              mode: _mode,
            );
    if (!mounted) return;
    setState(() {
      _loading = false;
      _result = res;
    });
  }

  @override
  Widget build(BuildContext context) {
    final devGames = ref.watch(developerGamesProvider).games;
    final isCompact = Responsive.isCompact(context);

    DeveloperGame? selected;
    if (devGames.isNotEmpty) {
      selected = devGames.firstWhere(
        (g) => g.id == _selectedGameId,
        orElse: () => devGames.first,
      );
      if (!selected.platforms.contains(_selectedPlatform) &&
          selected.platforms.isNotEmpty) {
        _selectedPlatform = selected.platforms.first;
      }
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 820,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                radius: 20,
                padding: EdgeInsets.all(isCompact ? 16 : 22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const HigBadge(
                      label: 'LIVE STATS ENGINE',
                      tone: HigBadgeTone.copper,
                    ),
                    const SizedBox(height: 10),
                    Text('Platform API Stats Tester',
                        style: HigTypography.title1()),
                    const SizedBox(height: 6),
                    Text(
                      'Select any API-configured game, choose the target platform, and pull live player or match stats directly through the playverzus.xyz server connector.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (selected == null)
                GlassCard(
                  radius: 18,
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('No API-configured games yet',
                          style: HigTypography.title3()),
                      const SizedBox(height: 6),
                      Text(
                        'Add a game with its platform Stats API first to test live stats fetching here.',
                        style: HigTypography.footnote(),
                      ),
                      const SizedBox(height: 14),
                      HigButton(
                        label: 'Add Game via API',
                        icon: CupertinoIcons.plus_circle_fill,
                        onPressed: () => context.push('/developer/games/new'),
                      ),
                    ],
                  ),
                )
              else ...[
                GlassCard(
                  radius: 18,
                  padding: EdgeInsets.all(isCompact ? 16 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Select Game', style: HigTypography.caption()),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: devGames.map((g) {
                          final active = g.id == selected!.id;
                          return GestureDetector(
                            onTap: () => setState(() {
                              _selectedGameId = g.id;
                              if (g.platforms.isNotEmpty) {
                                _selectedPlatform = g.platforms.first;
                              }
                              _result = null;
                            }),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: active
                                    ? HigColors.brand
                                    : HigColors.surfaceGrouped,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: active
                                      ? HigColors.brand
                                      : HigColors.separator,
                                ),
                              ),
                              child: Text(
                                '${g.title} (${g.shortName})',
                                style: HigTypography.footnote(
                                  color: active
                                      ? Colors.white
                                      : HigColors.labelPrimary,
                                ).copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      Text('Target Platform Connector',
                          style: HigTypography.caption()),
                      const SizedBox(height: 8),
                      HigSegmentedControl<String>(
                        backgroundColor: HigColors.surfaceGrouped,
                        groupValue: _selectedPlatform,
                        onChanged: (v) => setState(() => _selectedPlatform = v),
                        segments: {
                          for (final p in selected.platforms) p: p,
                        },
                      ),

                      const SizedBox(height: 14),
                      Text('Query Mode', style: HigTypography.caption()),
                      const SizedBox(height: 8),
                      HigSegmentedControl<String>(
                        backgroundColor: HigColors.surfaceGrouped,
                        groupValue: _mode,
                        onChanged: (v) => setState(() => _mode = v),
                        segments: const {
                          'player': 'Player Career Stats',
                          'match': 'Match Result Telemetry',
                        },
                      ),

                      const SizedBox(height: 14),
                      Text(
                        _mode == 'match'
                            ? 'Match ID'
                            : selected.gamertagLabel,
                        style: HigTypography.caption(),
                      ),
                      const SizedBox(height: 6),
                      HigTextField(
                        controller:
                            _mode == 'match' ? _matchIdCtrl : _playerIdCtrl,
                        placeholder: _mode == 'match'
                            ? 'Enter Match ID'
                            : selected.gamertagPlaceholder,
                        prefixIcon: _mode == 'match'
                            ? CupertinoIcons.flag
                            : CupertinoIcons.person,
                      ),

                      const SizedBox(height: 16),
                      HigButton(
                        label: 'Fetch Live Stats from $_selectedPlatform API',
                        icon: CupertinoIcons.bolt_fill,
                        size: HigButtonSize.large,
                        fullWidth: true,
                        loading: _loading,
                        onPressed: () => _fetch(selected!),
                      ),
                    ],
                  ),
                ),

                if (_result != null) ...[
                  const SizedBox(height: 16),
                  GlassCard(
                    radius: 18,
                    padding: const EdgeInsets.all(18),
                    borderColor:
                        _result!.ok ? HigColors.emerald : HigColors.crimson,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            HigBadge(
                              label: _result!.ok
                                  ? 'HTTP ${_result!.statusCode} OK'
                                  : 'HTTP ${_result!.statusCode} ERROR',
                              tone: _result!.ok
                                  ? HigBadgeTone.emerald
                                  : HigBadgeTone.crimson,
                            ),
                            HigBadge(
                              label: '${_result!.latencyMs}ms',
                              tone: HigBadgeTone.neutral,
                            ),
                            HigBadge(
                              label: _selectedPlatform,
                              tone: HigBadgeTone.copper,
                            ),
                          ],
                        ),
                        if (_result!.resolvedUrl.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            _result!.resolvedUrl,
                            style: HigTypography.mono(
                                size: 11, color: HigColors.labelSecondary),
                          ),
                        ],
                        if (_result!.error != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _result!.error!,
                            style: HigTypography.footnote(
                                color: HigColors.crimson),
                          ),
                        ],
                        if (_result!.extractedStats.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Text('Extracted Stats',
                              style: HigTypography.title3()),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: _result!.extractedStats.entries.map((e) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: HigColors.surfaceGrouped,
                                  borderRadius: BorderRadius.circular(10),
                                  border:
                                      Border.all(color: HigColors.separator),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(e.key.toUpperCase(),
                                        style: HigTypography.caption()),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${e.value}',
                                      style: HigTypography.title3(
                                          color: HigColors.emerald),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                        if (_result!.rawPreview.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Text('Raw JSON Response',
                              style: HigTypography.caption()),
                          const SizedBox(height: 6),
                          Container(
                            width: double.infinity,
                            constraints: const BoxConstraints(maxHeight: 240),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: HigColors.canvas,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: HigColors.separator),
                            ),
                            child: SingleChildScrollView(
                              child: SelectableText(
                                _result!.rawPreview,
                                style: HigTypography.mono(
                                    size: 11, color: HigColors.labelSecondary),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ],
    );
  }
}
