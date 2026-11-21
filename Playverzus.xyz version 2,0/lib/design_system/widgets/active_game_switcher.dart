import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog/official_games.dart';
import '../../core/storage/app_state.dart';
import '../../features/developer/developer_repository.dart';
import '../layout/responsive.dart';
import '../tokens/hig_tokens.dart';
import 'hig_primitives.dart';

/// Universal Active Game Switcher Pill — mounted in the Top Bar on EVERY screen
/// (including Matchrooms, Dashboard, Challenges, Tournaments & Landing).
class ActiveGameSwitcherPill extends ConsumerWidget {
  final bool compact;
  final ValueChanged<OfficialGame>? onGameSelected;

  const ActiveGameSwitcherPill({
    super.key,
    this.compact = false,
    this.onGameSelected,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeGame = ref.watch(activeGameProvider);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          showGameSelectionSheet(
            context,
            ref,
            onGameSelected: onGameSelected,
          );
        },
        child: Container(
          height: compact ? 34 : 40,
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 7 : 10,
            vertical: compact ? 3 : 4,
          ),
          decoration: BoxDecoration(
            color: HigColors.surfaceElevated.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(compact ? 10 : 13),
            border: Border.all(color: HigColors.glassBorder, width: 0.75),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: compact ? 20 : 24,
                height: compact ? 26 : 30,
                child: GamePosterView(
                  game: activeGame,
                  borderRadius: compact ? 4 : 6,
                ),
              ),
              SizedBox(width: compact ? 6 : 9),
              Flexible(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: compact ? 76 : 155),
                  child: compact
                      ? Text(
                          activeGame.shortName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: HigTypography.headline().copyWith(
                            fontSize: 12,
                          ),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activeGame.displayName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: HigTypography.headline()
                                  .copyWith(fontSize: 12.5),
                            ),
                            Text(
                              '${activeGame.primaryPlatform} · Switch',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: HigTypography.mono(
                                size: 9.5,
                                color: HigColors.copperBright,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              SizedBox(width: compact ? 4 : 6),
              Icon(
                CupertinoIcons.chevron_up_chevron_down,
                size: compact ? 11 : 13,
                color: HigColors.labelSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Adaptive Apple HIG Arena Selector:
/// - Draggable iOS Bottom Sheet on Phones (< 600dp)
/// - Centered Frosted Modal Dialog on Tablets & Desktop (>= 600dp)
Future<void> showGameSelectionSheet(
  BuildContext context,
  WidgetRef ref, {
  ValueChanged<OfficialGame>? onGameSelected,
}) async {
  final isPhone = Responsive.isCompact(context);
  if (isPhone) {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.86,
        minChildSize: 0.55,
        maxChildSize: 0.94,
        builder: (_, scrollController) => _GameSelectionModalBody(
          scrollController: scrollController,
          isSheet: true,
          onGameSelected: onGameSelected,
        ),
      ),
    );
  } else {
    await showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 820, maxHeight: 680),
          child: _GameSelectionModalBody(
            isSheet: false,
            onGameSelected: onGameSelected,
          ),
        ),
      ),
    );
  }
}

class _GameSelectionModalBody extends ConsumerStatefulWidget {
  final ScrollController? scrollController;
  final bool isSheet;
  final ValueChanged<OfficialGame>? onGameSelected;

  const _GameSelectionModalBody({
    this.scrollController,
    required this.isSheet,
    this.onGameSelected,
  });

  @override
  ConsumerState<_GameSelectionModalBody> createState() =>
      _GameSelectionModalBodyState();
}

class _GameSelectionModalBodyState
    extends ConsumerState<_GameSelectionModalBody> {
  String _query = '';
  GamePlatformFilter _filter = GamePlatformFilter.all;

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final machine = ref.watch(machineAuthProvider);
    final allGames = ref.watch(allCatalogGamesProvider);

    final filtered = allGames.where((g) {
      if (!g.matchesPlatformFilter(_filter)) return false;
      if (_query.trim().isEmpty) return true;
      final q = _query.toLowerCase();
      return g.displayName.toLowerCase().contains(q) ||
          g.shortName.toLowerCase().contains(q) ||
          g.platformSummary.toLowerCase().contains(q) ||
          (g.studioName?.toLowerCase().contains(q) ?? false);
    }).toList();

    // Sort "Ready on This Device" games first!
    filtered.sort((a, b) {
      final aOn = machine.installedGameIds.contains(a.id) ? 0 : 1;
      final bOn = machine.installedGameIds.contains(b.id) ? 0 : 1;
      return aOn.compareTo(bOn);
    });

    final borderRadius = widget.isSheet
        ? const BorderRadius.vertical(top: Radius.circular(26))
        : BorderRadius.circular(24);

    return Material(
      color: HigColors.surfacePrimary,
      borderRadius: borderRadius,
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          color: HigColors.surfacePrimary,
          borderRadius: borderRadius,
          border: Border.all(color: HigColors.separator, width: 1),
        ),
        child: SafeArea(
            top: false,
            child: Column(
              children: [
                if (widget.isSheet)
                  Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 4),
                    child: Container(
                      width: 38,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.28),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),

                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 16, 12),
                  child: Row(
                    children: [
                      const Icon(
                        CupertinoIcons.game_controller_solid,
                        color: HigColors.copper,
                        size: 22,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Select Esports Arena',
                              style: HigTypography.title3(),
                            ),
                            Text(
                              '${allGames.length} Arenas · ${machine.installedGameIds.length} Ready on This Device',
                              style: HigTypography.footnote(),
                            ),
                          ],
                        ),
                      ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(44, 44),
                        onPressed: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            color: HigColors.surfaceElevated,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            CupertinoIcons.xmark,
                            size: 15,
                            color: HigColors.labelSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Search & Multi-Platform Filter Pills
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      HigTextField(
                        placeholder: 'Search titles, platforms, genres...',
                        prefixIcon: CupertinoIcons.search,
                        onChanged: (v) => setState(() => _query = v),
                      ),
                      const SizedBox(height: 12),
                      HigSegmentedControl<GamePlatformFilter>(
                        backgroundColor: HigColors.surfaceGrouped,
                        groupValue: _filter,
                        onChanged: (v) => setState(() => _filter = v),
                        segments: {
                          GamePlatformFilter.all: widget.isSheet
                              ? 'All'
                              : 'All (${allGames.length})',
                          GamePlatformFilter.pc: widget.isSheet
                              ? 'PC'
                              : 'PC (${allGames.where((g) => g.matchesPlatformFilter(GamePlatformFilter.pc)).length})',
                          GamePlatformFilter.console: widget.isSheet
                              ? 'Console'
                              : 'Console (${allGames.where((g) => g.matchesPlatformFilter(GamePlatformFilter.console)).length})',
                          GamePlatformFilter.mobile: widget.isSheet
                              ? 'Mobile'
                              : 'Mobile (${allGames.where((g) => g.matchesPlatformFilter(GamePlatformFilter.mobile)).length})',
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),
                const Divider(height: 1),

                // 3:4 Vertical Official Game Poster Grid (Width-Aware Column Count)
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final cols = constraints.maxWidth >= 700
                          ? 4
                          : constraints.maxWidth >= 480
                              ? 3
                              : 2;
                      return GridView.builder(
                        controller: widget.scrollController,
                        padding: const EdgeInsets.all(20),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: cols,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 0.72,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, idx) {
                          final g = filtered[idx];
                          final isSelected = activeGame.id == g.id;
                          final isOnDevice =
                              machine.installedGameIds.contains(g.id);

                          return MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: GestureDetector(
                              onTap: () {
                                ref
                                    .read(activeGameProvider.notifier)
                                    .selectGame(g);
                                ref.read(toastProvider.notifier).show(
                                      'Active Arena Switched',
                                      body: 'Now competing in ${g.displayName}',
                                      tone: ToastTone.success,
                                    );
                                Navigator.of(context).pop();
                                widget.onGameSelected?.call(g);
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 160),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? HigColors.copper
                                        : HigColors.glassBorder,
                                    width: isSelected ? 2 : 0.75,
                                  ),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: HigColors.copper
                                                .withValues(alpha: 0.35),
                                            blurRadius: 16,
                                          )
                                        ]
                                      : null,
                                ),
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
                                              Colors.black
                                                  .withValues(alpha: 0.45),
                                              Colors.transparent,
                                              Colors.black
                                                  .withValues(alpha: 0.92),
                                            ],
                                            stops: const [0.0, 0.45, 1.0],
                                          ),
                                        ),
                                      ),
                                      // Top Badges (Flex-safe — zero overlap)
                                      Positioned(
                                        top: 8,
                                        left: 8,
                                        right: 8,
                                        child: Wrap(
                                          spacing: 4,
                                          runSpacing: 4,
                                          alignment:
                                              WrapAlignment.spaceBetween,
                                          children: [
                                            HigBadge(
                                              label: g.primaryPlatform,
                                              tone: HigBadgeTone.neutral,
                                            ),
                                            if (isSelected)
                                              const HigBadge(
                                                label: 'ACTIVE',
                                                tone: HigBadgeTone.copper,
                                                icon:
                                                    CupertinoIcons.checkmark_alt,
                                              )
                                            else if (isOnDevice)
                                              const HigBadge(
                                                label: 'READY',
                                                tone: HigBadgeTone.emerald,
                                              ),
                                          ],
                                        ),
                                      ),
                                      // Bottom Title
                                      Positioned(
                                        left: 10,
                                        right: 10,
                                        bottom: 10,
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              g.displayName,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: HigTypography.headline()
                                                  .copyWith(fontSize: 13.5),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              g.platformSummary,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: HigTypography.mono(
                                                size: 9.5,
                                                color: HigColors.labelSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      );
  }
}
