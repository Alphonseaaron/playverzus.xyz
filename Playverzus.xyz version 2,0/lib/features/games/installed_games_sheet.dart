import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog/official_games.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../platform_channels/device_bridge.dart';
import '../developer/developer_repository.dart';

/// Opens a unified Featured Games Setup & Auto-Sync sheet usable on Web, Desktop,
/// Mobile, and Console setups so 1-tap launch & auto-launch work cleanly in Duels
/// and Tournaments.
Future<bool?> showInstalledGamesSetupSheet(
  BuildContext context, {
  String? highlightGameId,
}) {
  if (Responsive.isDesktopOrExpanded(context)) {
    return showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720, maxHeight: 740),
          child: InstalledGamesSetupSheet(
            highlightGameId: highlightGameId,
            isSheet: false,
          ),
        ),
      ),
    );
  }
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.9,
      child: InstalledGamesSetupSheet(
        highlightGameId: highlightGameId,
        isSheet: true,
      ),
    ),
  );
}

class InstalledGamesSetupSheet extends ConsumerStatefulWidget {
  final String? highlightGameId;
  final bool isSheet;

  const InstalledGamesSetupSheet({
    super.key,
    this.highlightGameId,
    this.isSheet = true,
  });

  @override
  ConsumerState<InstalledGamesSetupSheet> createState() =>
      _InstalledGamesSetupSheetState();
}

class _InstalledGamesSetupSheetState
    extends ConsumerState<InstalledGamesSetupSheet> {
  final Set<String> _selectedIds = {};
  String _query = '';
  GamePlatformFilter _filter = GamePlatformFilter.all;
  bool _scanning = false;
  bool _saving = false;
  String? _launchingGameId;

  @override
  void initState() {
    super.initState();
    _selectedIds.addAll(ref.read(machineAuthProvider).installedGameIds);
  }

  Future<void> _autoScan() async {
    setState(() => _scanning = true);
    final foundCount =
        await ref.read(machineAuthProvider.notifier).rescanInstalledGames();
    if (!mounted) return;
    final updated = ref.read(machineAuthProvider);
    setState(() {
      _selectedIds.addAll(updated.installedGameIds);
      _scanning = false;
    });
    ref.read(toastProvider.notifier).show(
          foundCount > 0
              ? 'Synced $foundCount installed game(s) from this device'
              : 'Device scan finished — confirm any remaining titles below',
          tone: foundCount > 0 ? ToastTone.success : ToastTone.info,
        );
  }

  Future<void> _testLaunch(OfficialGame game) async {
    setState(() => _launchingGameId = game.id);
    final res = await DeviceBridge.forceAutoLaunchGame(
      game,
      matchId: 'setup_test',
    );
    if (!mounted) return;
    setState(() => _launchingGameId = null);
    ref.read(toastProvider.notifier).show(
          res.launched
              ? 'Launched ${game.shortName} via ${res.channelLabel}'
              : 'Could not open ${game.shortName} automatically on this browser',
          body: res.launched
              ? null
              : 'Open the installed desktop or mobile app for direct one-tap launch.',
          tone: res.launched ? ToastTone.success : ToastTone.info,
        );
  }

  Future<void> _saveAndConfirm() async {
    setState(() => _saving = true);
    await ref
        .read(machineAuthProvider.notifier)
        .markGamesSetupConfirmed(gameIds: _selectedIds.toList());
    if (!mounted) return;
    setState(() => _saving = false);
    ref.read(toastProvider.notifier).show(
          _selectedIds.isEmpty
              ? 'Game setup saved — you can add installed games anytime'
              : '${_selectedIds.length} featured game(s) confirmed for quick launch',
          tone: ToastTone.success,
        );
    await Navigator.of(context).maybePop(true);
  }

  @override
  Widget build(BuildContext context) {
    final machine = ref.watch(machineAuthProvider);
    final allGames = ref.watch(allCatalogGamesProvider);
    final handles = ref.watch(gameAccountsProvider);

    final filtered = allGames.where((g) {
      if (!g.matchesPlatformFilter(_filter)) return false;
      if (_query.trim().isEmpty) return true;
      final q = _query.trim().toLowerCase();
      return g.displayName.toLowerCase().contains(q) ||
          g.shortName.toLowerCase().contains(q) ||
          g.platformSummary.toLowerCase().contains(q) ||
          (g.studioName?.toLowerCase().contains(q) ?? false);
    }).toList();

    filtered.sort((a, b) {
      final aHi = a.id == widget.highlightGameId ? 0 : 1;
      final bHi = b.id == widget.highlightGameId ? 0 : 1;
      if (aHi != bHi) return aHi.compareTo(bHi);
      final aSel = _selectedIds.contains(a.id) ? 0 : 1;
      final bSel = _selectedIds.contains(b.id) ? 0 : 1;
      if (aSel != bSel) return aSel.compareTo(bSel);
      return a.displayName.compareTo(b.displayName);
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
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: HigColors.copper.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: const Icon(
                        CupertinoIcons.game_controller_solid,
                        color: HigColors.copper,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Setup Featured Games',
                            style: HigTypography.title3(),
                          ),
                          Text(
                            '${_selectedIds.length} of ${allGames.length} confirmed on ${machine.capabilities.osLabel} · Ready for 1-tap launch',
                            style: HigTypography.footnote(),
                          ),
                        ],
                      ),
                    ),
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(44, 44),
                      onPressed: () => Navigator.of(context).maybePop(false),
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

              // Auto-Sync vs Manual Confirmation Banner
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassCard(
                  radius: 14,
                  padding: const EdgeInsets.all(12),
                  backgroundColor: machine.canAutoScanGames
                      ? HigColors.emerald.withValues(alpha: 0.08)
                      : HigColors.indigo.withValues(alpha: 0.08),
                  borderColor: machine.canAutoScanGames
                      ? HigColors.emerald.withValues(alpha: 0.28)
                      : HigColors.indigo.withValues(alpha: 0.28),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(
                        machine.canAutoScanGames
                            ? CupertinoIcons.checkmark_shield_fill
                            : CupertinoIcons.hand_draw_fill,
                        size: 20,
                        color: machine.canAutoScanGames
                            ? HigColors.emerald
                            : HigColors.indigo,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          machine.canAutoScanGames
                              ? 'This app can scan your installed games automatically or let you toggle titles manually for Duels & Tournaments.'
                              : 'Browsers block automatic local app scans for privacy. Confirm the featured games installed on this device or console so Duels & Tournaments launch in one tap.',
                          style: HigTypography.footnote(
                            color: HigColors.labelPrimary,
                          ),
                        ),
                      ),
                      if (machine.canAutoScanGames) ...[
                        const SizedBox(width: 10),
                        HigButton(
                          label: 'Auto-Scan',
                          icon: CupertinoIcons.arrow_2_circlepath,
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.emerald,
                          loading: _scanning,
                          onPressed: _scanning ? null : _autoScan,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Search & Platform Filter
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    HigTextField(
                      placeholder: 'Search featured games...',
                      prefixIcon: CupertinoIcons.search,
                      onChanged: (v) => setState(() => _query = v),
                    ),
                    const SizedBox(height: 10),
                    HigSegmentedControl<GamePlatformFilter>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _filter,
                      onChanged: (v) => setState(() => _filter = v),
                      segments: const {
                        GamePlatformFilter.all: 'All',
                        GamePlatformFilter.pc: 'PC',
                        GamePlatformFilter.console: 'Console',
                        GamePlatformFilter.mobile: 'Mobile',
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),

              // Checklist of Featured Titles
              Expanded(
                child: filtered.isEmpty
                    ? const Center(
                        child: HigEmptyState(
                          icon: CupertinoIcons.game_controller,
                          title: 'No matching games',
                          subtitle:
                              'Clear your search or switch the platform filter.',
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final g = filtered[index];
                          final isSelected = _selectedIds.contains(g.id);
                          final isHighlighted = g.id == widget.highlightGameId;
                          final linkedHandle = handles[g.id];
                          final canTestLaunch = isSelected &&
                              g.effectiveLaunchUri != null &&
                              g.effectiveLaunchUri!.isNotEmpty;

                          return GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                if (isSelected) {
                                  _selectedIds.remove(g.id);
                                } else {
                                  _selectedIds.add(g.id);
                                }
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 140),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? HigColors.emerald.withValues(alpha: 0.08)
                                    : HigColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isHighlighted
                                      ? HigColors.copper
                                      : isSelected
                                          ? HigColors.emerald
                                              .withValues(alpha: 0.45)
                                          : HigColors.separator,
                                  width: isHighlighted ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 44,
                                    height: 56,
                                    child: GamePosterView(
                                      game: g,
                                      borderRadius: 10,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                g.displayName,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: HigTypography.headline()
                                                    .copyWith(fontSize: 14.5),
                                              ),
                                            ),
                                            if (isHighlighted) ...[
                                              const SizedBox(width: 6),
                                              const HigBadge(
                                                label: 'NEEDED',
                                                tone: HigBadgeTone.copper,
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          linkedHandle != null &&
                                                  linkedHandle.isNotEmpty
                                              ? '${g.platformSummary} · Handle: $linkedHandle'
                                              : '${g.platformSummary} · Ready to sync',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: HigTypography.caption(),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (canTestLaunch) ...[
                                    HigButton(
                                      label: 'Test',
                                      icon: CupertinoIcons.play_fill,
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      loading: _launchingGameId == g.id,
                                      onPressed: _launchingGameId == g.id
                                          ? null
                                          : () => _testLaunch(g),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? HigColors.emerald
                                              .withValues(alpha: 0.18)
                                          : HigColors.surfaceGrouped,
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(
                                        color: isSelected
                                            ? HigColors.emerald
                                            : HigColors.separator,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          isSelected
                                              ? CupertinoIcons
                                                  .checkmark_circle_fill
                                              : CupertinoIcons.circle,
                                          size: 14,
                                          color: isSelected
                                              ? HigColors.emerald
                                              : HigColors.labelTertiary,
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          isSelected ? 'INSTALLED' : 'SELECT',
                                          style: HigTypography.caption(
                                            color: isSelected
                                                ? HigColors.emerald
                                                : HigColors.labelSecondary,
                                          ).copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
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
              ),

              // Sticky Footer Action Bar
              Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
                decoration: const BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  border: Border(
                    top: BorderSide(color: HigColors.separator, width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${_selectedIds.length} Selected',
                            style: HigTypography.headline().copyWith(
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            'Used for 1-tap & auto-launch in matches',
                            style: HigTypography.caption(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    HigButton(
                      label: _selectedIds.isEmpty
                          ? 'Save Setup'
                          : 'Save & Confirm (${_selectedIds.length})',
                      icon: CupertinoIcons.checkmark_alt,
                      variant: HigButtonVariant.emerald,
                      loading: _saving,
                      onPressed: _saving ? null : _saveAndConfirm,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
