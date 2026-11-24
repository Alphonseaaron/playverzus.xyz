import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../developer/developer_repository.dart';
import 'installed_games_sheet.dart';

class GamesCatalogScreen extends ConsumerStatefulWidget {
  const GamesCatalogScreen({super.key});

  @override
  ConsumerState<GamesCatalogScreen> createState() => _GamesCatalogScreenState();
}

class _GamesCatalogScreenState extends ConsumerState<GamesCatalogScreen> {
  String _search = '';
  GamePlatformFilter _filter = GamePlatformFilter.all;

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final machine = ref.watch(machineAuthProvider);
    final allGames = ref.watch(allCatalogGamesProvider);

    final filtered = allGames.where((g) {
      if (!g.matchesPlatformFilter(_filter)) return false;
      if (_search.trim().isEmpty) return true;
      final q = _search.toLowerCase();
      return g.displayName.toLowerCase().contains(q) ||
          g.shortName.toLowerCase().contains(q) ||
          g.platformSummary.toLowerCase().contains(q) ||
          (g.studioName?.toLowerCase().contains(q) ?? false);
    }).toList();

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                radius: 20,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const HigBadge(
                          label: 'OFFICIAL ESPORTS ROSTER',
                          tone: HigBadgeTone.copper,
                        ),
                        HigBadge(
                          label: '${allGames.length} TITLES',
                          tone: HigBadgeTone.emerald,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text('Esports Arena Catalog', style: HigTypography.title1()),
                    const SizedBox(height: 4),
                    Text(
                      'Select any official or developer API-integrated title to enter its matchmaking queue.',
                      style: HigTypography.footnote(),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        HigButton(
                          label:
                              'Sync My Installed Games (${machine.featuredInstalledGames.length} / ${allGames.length})',
                          icon: CupertinoIcons.game_controller,
                          size: HigButtonSize.small,
                          variant: machine.needsGameSetup
                              ? HigButtonVariant.emerald
                              : HigButtonVariant.secondary,
                          onPressed: () =>
                              showInstalledGamesSetupSheet(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    HigTextField(
                      placeholder: 'Filter all ${allGames.length} arenas...',
                      prefixIcon: CupertinoIcons.search,
                      onChanged: (v) => setState(() => _search = v),
                    ),
                    const SizedBox(height: 12),
                    HigSegmentedControl<GamePlatformFilter>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _filter,
                      onChanged: (v) => setState(() => _filter = v),
                      segments: {
                        for (final t in GamePlatformFilter.values)
                          t: Responsive.isCompact(context)
                              ? (t == GamePlatformFilter.all
                                  ? 'All'
                                  : t == GamePlatformFilter.pc
                                      ? 'PC'
                                      : t == GamePlatformFilter.console
                                          ? 'Console'
                                          : 'Mobile')
                              : '${t.name.toUpperCase()} (${allGames.where((g) => g.matchesPlatformFilter(t)).length})',
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: Responsive.posterGridColumns(context),
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: Responsive.isCompact(context) ? 0.62 : 0.68,
                ),
                itemCount: filtered.length,
                itemBuilder: (context, idx) {
                  final g = filtered[idx];
                  final isActive = activeGame.id == g.id;
                  final isOnDevice = machine.installedGameIds.contains(g.id);

                  return GlassCard(
                    padding: EdgeInsets.zero,
                    radius: 16,
                    borderColor: isActive ? HigColors.brand : null,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          GamePosterView(game: g, borderRadius: 0),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.48),
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.94),
                                ],
                                stops: const [0.0, 0.36, 1.0],
                              ),
                            ),
                          ),
                          Positioned(
                            top: 8,
                            left: 8,
                            right: 8,
                            child: Wrap(
                              spacing: 4,
                              runSpacing: 4,
                              alignment: WrapAlignment.spaceBetween,
                              children: [
                                HigBadge(
                                  label: g.isDeveloperApiGame
                                      ? 'API STATS'
                                      : g.primaryPlatform,
                                  tone: g.isDeveloperApiGame
                                      ? HigBadgeTone.copper
                                      : HigBadgeTone.neutral,
                                ),
                                GestureDetector(
                                  onTap: () => ref
                                      .read(machineAuthProvider.notifier)
                                      .toggleInstalledGame(g.id),
                                  child: HigBadge(
                                    label: isOnDevice ? 'ON DEVICE' : 'PIN',
                                    tone: isOnDevice
                                        ? HigBadgeTone.emerald
                                        : HigBadgeTone.neutral,
                                    icon: isOnDevice
                                        ? CupertinoIcons.checkmark_alt
                                        : CupertinoIcons.pin,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Positioned(
                            left: 10,
                            right: 10,
                            bottom: 10,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  g.displayName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: HigTypography.headline()
                                      .copyWith(fontSize: 13.5),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: HigButton(
                                        label: 'Play',
                                        size: HigButtonSize.small,
                                        fullWidth: true,
                                        onPressed: () {
                                          ref
                                              .read(activeGameProvider.notifier)
                                              .selectGame(g);
                                          context.go('/challenges');
                                        },
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: HigButton(
                                        label: 'Hub',
                                        size: HigButtonSize.small,
                                        variant: HigButtonVariant.secondary,
                                        fullWidth: true,
                                        onPressed: () {
                                          ref
                                              .read(activeGameProvider.notifier)
                                              .selectGame(g);
                                          context.push('/games/${g.id}');
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
