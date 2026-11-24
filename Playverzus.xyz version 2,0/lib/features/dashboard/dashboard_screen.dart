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
import '../../core/storage/app_update_provider.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../platform_channels/device_bridge.dart';
import '../../platform_channels/web_bridge.dart';
import '../games/installed_games_sheet.dart';
import '../matchroom/pre_match_permissions_sheet.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  static String? _announcedForUserId;
  static String? _announcedUpdateForVersion;

  double _selectedStakeUsd = 5.0;
  int _dossierTab = 0; // 0 = Career, 1 = Gamer Handles (21), 2 = Ledger
  String? _editingGameId;
  final TextEditingController _handleCtrl = TextEditingController();

  bool _loadingLedger = false;
  String? _ledgerError;
  List<Map<String, dynamic>> _ledgerRows = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadLedger();
      _maybeShowFirstTimeOnboardingToast();
      _checkAppUpdates();
    });
  }

  Future<void> _checkAppUpdates() async {
    final update = await ref.read(appUpdateProvider.notifier).checkForUpdates();
    if (!mounted || !update.hasPendingUpdate) return;
    if (_announcedUpdateForVersion == update.latestVersion) return;
    _announcedUpdateForVersion = update.latestVersion;
    ref.read(toastProvider.notifier).show(
          'Update Available · Playverzus v${update.latestVersion}',
          body:
              'Tap Notifications or Download Update to get the newest version.',
          tone: ToastTone.info,
          duration: const Duration(seconds: 6),
        );
  }

  void _maybeShowFirstTimeOnboardingToast() {
    if (!mounted) return;
    final session = ref.read(playerSessionProvider);
    final machine = ref.read(machineAuthProvider);
    if (!session.isAuthenticated || session.userId.isEmpty) return;
    if (_announcedForUserId == session.userId) return;
    if (!machine.needsFirstTimePermissions && !machine.needsGameSetup) return;
    _announcedForUserId = session.userId;
    final missing = <String>[
      if (machine.needsFirstTimePermissions) 'grant required permissions',
      if (machine.needsGameSetup) 'sync your featured games',
    ];
    ref.read(toastProvider.notifier).show(
          'Finish ${machine.capabilities.osLabel} setup',
          body: 'Check the notification bell or setup card to ${missing.join(' & ')}.',
          tone: ToastTone.info,
          duration: const Duration(seconds: 6),
        );
  }

  @override
  void dispose() {
    _handleCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadLedger() async {
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) {
      if (mounted) setState(() => _ledgerRows = const []);
      return;
    }
    setState(() {
      _loadingLedger = true;
      _ledgerError = null;
    });
    try {
      final res = await ApiClient.get('/wallet/history?limit=15');
      if (res is List) {
        _ledgerRows = res.whereType<Map<String, dynamic>>().toList();
      } else if (res is Map && res['transactions'] is List) {
        _ledgerRows = (res['transactions'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      } else {
        _ledgerRows = const [];
      }
    } on ApiException catch (e) {
      _ledgerError = e.message;
    } catch (_) {}
    if (mounted) setState(() => _loadingLedger = false);
  }

  String _formatStake(PaymentGatewayMode gateway, double usd) {
    if (usd == 0) return 'FREE PTS';
    return AppConfig.formatUsdc(usd);
  }

  Widget _onboardingStepTile({
    required bool done,
    required String title,
    required String subtitle,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: done
            ? HigColors.emerald.withValues(alpha: 0.08)
            : HigColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: done
              ? HigColors.emerald.withValues(alpha: 0.32)
              : HigColors.separator,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
            size: 18,
            color: done ? HigColors.emerald : HigColors.copper,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: HigTypography.headline().copyWith(fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: HigTypography.caption()),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing,
          ],
        ],
      ),
    );
  }

  Widget _buildOnboardingChecklistCard(
    BuildContext context,
    MachineAuthState machine,
    OfficialGame activeGame,
    bool isCompact,
  ) {
    final stepsDone = machine.onboardingStepsDone;
    final step1Done =
        machine.isRunningInstalledApp || machine.dismissedDownloadBanner;
    final canInstantInstall = isWebAppInstallReady();

    return GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(16),
      borderColor: HigColors.copper.withValues(alpha: 0.42),
      backgroundColor: HigColors.surfacePrimary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: HigColors.copper.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  machine.isRunningInstalledApp
                      ? CupertinoIcons.checkmark_shield_fill
                      : CupertinoIcons.device_phone_portrait,
                  color: HigColors.copperBright,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          'Device Setup · ${machine.capabilities.osLabel}',
                          style: HigTypography.headline(),
                        ),
                        HigBadge(
                          label: '$stepsDone / 3 READY',
                          tone: stepsDone == 3
                              ? HigBadgeTone.emerald
                              : HigBadgeTone.copper,
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      machine.isRunningInstalledApp
                          ? 'Playverzus App detected — no download needed. Finish permissions & game sync below.'
                          : 'Detected ${machine.capabilities.osLabel}. Complete these 3 steps once for 1-tap game launches and alerts.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              ),
              CupertinoButton(
                padding: EdgeInsets.zero,
                minimumSize: const Size(28, 28),
                onPressed: () =>
                    ref.read(machineAuthProvider.notifier).dismissOnboarding(),
                child: const Icon(
                  CupertinoIcons.xmark,
                  size: 15,
                  color: HigColors.labelTertiary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Step 1: Device / App status (Hidden download CTA if already inside installed app)
          _onboardingStepTile(
            done: step1Done,
            title: machine.isRunningInstalledApp
                ? '1. Playverzus App Active'
                : machine.needsAppDownloadPrompt
                    ? '1. Get Playverzus App (${machine.capabilities.osLabel})'
                    : '1. Playing in Browser Mode',
            subtitle: machine.isRunningInstalledApp
                ? 'Running natively on ${machine.capabilities.osLabel}'
                : machine.needsAppDownloadPrompt
                    ? 'Recommended for 1-tap launches & alerts'
                    : 'Download anytime from Account Menu if desired',
            trailing: machine.isRunningInstalledApp
                ? const HigBadge(label: 'ACTIVE', tone: HigBadgeTone.emerald)
                : machine.needsAppDownloadPrompt
                    ? Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          HigButton(
                            label: canInstantInstall
                                ? 'Install App'
                                : DeviceBridge.recommendedAppActionLabel(),
                            icon: CupertinoIcons.arrow_down_circle,
                            size: HigButtonSize.small,
                            onPressed: () async {
                              if (canInstantInstall) {
                                final installed = await promptWebAppInstall();
                                if (installed && mounted) {
                                  await ref
                                      .read(machineAuthProvider.notifier)
                                      .dismissDownloadPrompt();
                                  ref.read(toastProvider.notifier).show(
                                        'Playverzus app installed',
                                        tone: ToastTone.success,
                                      );
                                }
                                return;
                              }
                              if (context.mounted) context.push('/download');
                            },
                          ),
                          HigButton(
                            label: 'Already in App',
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            onPressed: () => ref
                                .read(machineAuthProvider.notifier)
                                .dismissDownloadPrompt(),
                          ),
                        ],
                      )
                    : const HigBadge(label: 'WEB', tone: HigBadgeTone.neutral),
          ),
          const SizedBox(height: 8),

          // Step 2: Required First-Time Permissions
          _onboardingStepTile(
            done: !machine.needsFirstTimePermissions,
            title: machine.needsFirstTimePermissions
                ? '2. Grant Required Permissions'
                : '2. Permissions Granted',
            subtitle: machine.needsFirstTimePermissions
                ? (!machine.alertsAuthorized && !machine.captureAuthorized
                    ? 'Allow Match Alerts & Match Verification Access'
                    : !machine.alertsAuthorized
                        ? 'Allow Live Match Alerts for Ready pings & payouts'
                        : 'Allow Match Verification Access before Duels/Tournaments')
                : 'Live Match Alerts & Verification Access ready',
            trailing: !machine.needsFirstTimePermissions
                ? const HigBadge(label: 'READY', tone: HigBadgeTone.emerald)
                : HigButton(
                    label: 'Allow Permissions',
                    icon: CupertinoIcons.checkmark_shield,
                    size: HigButtonSize.small,
                    onPressed: () async {
                      final ok =
                          await PreMatchPermissionsDialog.ensureAuthorized(
                        context,
                        ref,
                        gameName: activeGame.shortName,
                      );
                      if (ok && mounted) {
                        ref.read(toastProvider.notifier).show(
                              'Permissions active for matches',
                              tone: ToastTone.success,
                            );
                      }
                    },
                  ),
          ),
          const SizedBox(height: 8),

          // Step 3: Featured Games Auto-Sync / Manual Confirm
          _onboardingStepTile(
            done: !machine.needsGameSetup,
            title:
                '3. Featured Games (${machine.featuredInstalledGames.length} / ${officialGames.length} Confirmed)',
            subtitle: machine.needsGameSetup
                ? (machine.canAutoScanGames
                    ? 'Auto-scan your installed games or confirm manually for Duels & Tournaments'
                    : 'Confirm installed titles on your device/console for 1-tap & auto-launch')
                : 'Ready for 1-tap & auto-launch across Duels and Tournaments',
            trailing: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (machine.canAutoScanGames)
                  HigButton(
                    label: 'Auto-Scan',
                    icon: CupertinoIcons.arrow_2_circlepath,
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: () async {
                      final found = await ref
                          .read(machineAuthProvider.notifier)
                          .rescanInstalledGames();
                      if (mounted) {
                        ref.read(toastProvider.notifier).show(
                              'Synced $found installed featured game(s)',
                              tone: ToastTone.success,
                            );
                      }
                    },
                  ),
                HigButton(
                  label: machine.needsGameSetup ? 'Setup Games' : 'Manage',
                  icon: CupertinoIcons.game_controller,
                  size: HigButtonSize.small,
                  variant: machine.needsGameSetup
                      ? HigButtonVariant.emerald
                      : HigButtonVariant.secondary,
                  onPressed: () => showInstalledGamesSetupSheet(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final session = ref.watch(playerSessionProvider);
    final machine = ref.watch(machineAuthProvider);
    final appUpdate = ref.watch(appUpdateProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final handles = ref.watch(gameAccountsProvider);
    final arena = ref.watch(arenaDataProvider);
    final isCompact = Responsive.isCompact(context);

    final openDuelsForGame =
        arena.challenges.where((c) => c.gameId == activeGame.id).length;
    final blitzForGame =
        arena.blitzPools.where((b) => b.gameId == activeGame.id).toList();
    final cupsForGame =
        arena.tournaments.where((t) => t.gameId == activeGame.id).length;
    final activeGameInstalled =
        machine.installedGameIds.contains(activeGame.id);

    const stakeOptions = [0.0, 2.5, 5.0, 10.0, 25.0];

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(playerSessionProvider.notifier).refreshFromBackend();
        await ref.read(arenaDataProvider.notifier).refreshFromApi();
        await _loadLedger();
      },
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 0A. APP UPDATE NOTIFICATION BANNER (Shown to installed/downloaded users when a newer version is live)
                if (appUpdate.hasPendingUpdate) ...[
                  GlassCard(
                    radius: 16,
                    padding: const EdgeInsets.all(14),
                    backgroundColor: HigColors.emerald.withValues(alpha: 0.1),
                    borderColor: HigColors.emerald.withValues(alpha: 0.4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Icon(
                          CupertinoIcons.arrow_up_circle_fill,
                          color: HigColors.emerald,
                          size: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Update Available · Playverzus v${appUpdate.latestVersion}',
                                style: HigTypography.headline().copyWith(
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                appUpdate.releaseNotes,
                                style: HigTypography.caption(),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            HigButton(
                              label: (appUpdate.swUpdateReady &&
                                      isRunningStandaloneApp())
                                  ? 'Reload Now'
                                  : 'Download Update',
                              size: HigButtonSize.small,
                              variant: HigButtonVariant.emerald,
                              onPressed: () {
                                if (appUpdate.swUpdateReady &&
                                    isRunningStandaloneApp()) {
                                  applyWebAppUpdate();
                                } else {
                                  context.push('/download');
                                }
                              },
                            ),
                            if (!appUpdate.isForcedUpdate)
                              HigButton(
                                label: 'Later',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () => ref
                                    .read(appUpdateProvider.notifier)
                                    .dismissCurrentUpdate(),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // 0. SMART DEVICE, PERMISSIONS & FEATURED GAMES ONBOARDING
                if (machine.needsOnboardingGuide) ...[
                  _buildOnboardingChecklistCard(
                    context,
                    machine,
                    activeGame,
                    isCompact,
                  ),
                  const SizedBox(height: 16),
                ],

                // 1. ACTIVE GAME ARENA HERO
                GlassCard(
                  padding: EdgeInsets.zero,
                  radius: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: isCompact ? 96 : 112,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Opacity(
                              opacity: 0.36,
                              child: GamePosterView(
                                game: activeGame,
                                useBanner: true,
                                borderRadius: 0,
                              ),
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
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Align(
                                alignment: Alignment.bottomLeft,
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${activeGame.displayName} Arena',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.title2(),
                                          ),
                                          Text(
                                            activeGame.tagline,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.caption(),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    HigBadge(
                                      label: activeGameInstalled
                                          ? 'SYNCED'
                                          : activeGame.primaryPlatform,
                                      tone: activeGameInstalled
                                          ? HigBadgeTone.emerald
                                          : HigBadgeTone.copper,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Action Cards Grid: 1v1 Duels + Live Tournaments (Strictly real API counts)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final twoCol = constraints.maxWidth >= 680;
                            final duelCard = _buildQuickDuelCard(
                              context,
                              activeGame,
                              gateway,
                              stakeOptions,
                              openDuelsForGame,
                            );
                            final blitzCard = _buildBlitzCupCard(
                              context,
                              activeGame,
                              gateway,
                              blitzForGame,
                              cupsForGame,
                            );

                            if (twoCol) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: duelCard),
                                  const SizedBox(width: 14),
                                  Expanded(child: blitzCard),
                                ],
                              );
                            }
                            return Column(
                              children: [
                                duelCard,
                                const SizedBox(height: 14),
                                blitzCard,
                              ],
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                // 2. ADAPTIVE DEVICE BINDING & AUTO-SYNC STATUS CARD
                GlassCard(
                  radius: 18,
                  padding: const EdgeInsets.all(18),
                  borderColor: machine.isFullyReady
                      ? HigColors.emerald.withValues(alpha: 0.35)
                      : HigColors.copper.withValues(alpha: 0.45),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            machine.isFullyReady
                                ? CupertinoIcons.checkmark_shield_fill
                                : CupertinoIcons.desktopcomputer,
                            color: machine.isFullyReady
                                ? HigColors.emerald
                                : HigColors.copper,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${machine.capabilities.osLabel} · ${machine.capabilities.modeTitle}',
                                  style: HigTypography.headline(),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Device ID: ${machine.deviceFingerprint}',
                                  style: HigTypography.mono(
                                    size: 11,
                                    color: HigColors.brandBright,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  machine.canAutoScanGames
                                      ? '${machine.featuredInstalledGames.length} / ${officialGames.length} featured games auto-synced for instant Ready auto-launch.'
                                      : machine.deviceBindingSummary,
                                  style: HigTypography.footnote(),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          HigBadge(
                            label: machine.isFullyReady ? 'BOUND' : 'SETUP',
                            tone: machine.isFullyReady
                                ? HigBadgeTone.emerald
                                : HigBadgeTone.copper,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (!machine.isFullyReady)
                            HigButton(
                              label: 'Grant Permissions',
                              icon: CupertinoIcons.bell,
                              size: HigButtonSize.small,
                              onPressed: () async {
                                final ok = await PreMatchPermissionsDialog
                                    .ensureAuthorized(
                                  context,
                                  ref,
                                  gameName: activeGame.shortName,
                                );
                                if (ok && mounted) {
                                  ref.read(toastProvider.notifier).show(
                                        'Device permissions ready',
                                        tone: ToastTone.success,
                                      );
                                }
                              },
                            ),
                          HigButton(
                            label:
                                'Setup / Sync Games (${machine.featuredInstalledGames.length})',
                            icon: CupertinoIcons.game_controller,
                            size: HigButtonSize.small,
                            variant: machine.needsGameSetup
                                ? HigButtonVariant.emerald
                                : HigButtonVariant.secondary,
                            onPressed: () =>
                                showInstalledGamesSetupSheet(context),
                          ),
                          if (machine.canAutoScanGames)
                            HigButton(
                              label: 'Re-Scan Device',
                              icon: CupertinoIcons.refresh,
                              size: HigButtonSize.small,
                              variant: HigButtonVariant.secondary,
                              onPressed: () async {
                                final count = await ref
                                    .read(machineAuthProvider.notifier)
                                    .rescanInstalledGames();
                                if (mounted) {
                                  ref.read(toastProvider.notifier).show(
                                        'Synced $count featured installed game(s)',
                                        tone: ToastTone.success,
                                      );
                                }
                              },
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 3. LAG-FREE SEGMENTED DOSSIER
                HigSegmentedControl<int>(
                  groupValue: _dossierTab,
                  onChanged: (v) {
                    setState(() => _dossierTab = v);
                    if (v == 2) _loadLedger();
                  },
                  segments: {
                    0: isCompact ? 'Career' : 'Career Stats',
                    1: isCompact
                        ? 'Handles (${officialGames.length})'
                        : 'Gamer Handles (${officialGames.length})',
                    2: isCompact ? 'Ledger' : 'Recent Ledger',
                  },
                ),

                const SizedBox(height: 14),

                if (_dossierTab == 0) _buildCareerTab(session),
                if (_dossierTab == 1) _buildGamerHandlesTab(handles),
                if (_dossierTab == 2) _buildLedgerTab(gateway),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickDuelCard(
    BuildContext context,
    OfficialGame activeGame,
    PaymentGatewayMode gateway,
    List<double> stakeOptions,
    int openDuelsCount,
  ) {
    return GlassCard(
      radius: 16,
      padding: const EdgeInsets.all(16),
      backgroundColor: HigColors.surfaceGrouped,
      borderColor: HigColors.brand.withValues(alpha: 0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HigBadge(
            label: '$openDuelsCount OPEN DUELS · ${activeGame.shortName}',
            tone: HigBadgeTone.copper,
            icon: CupertinoIcons.bolt_fill,
          ),
          const SizedBox(height: 10),
          Text('1v1 Matchmaking', style: HigTypography.title3()),
          const SizedBox(height: 4),
          Text(
            'Pick a stake for ${activeGame.displayName}. Escrow locks when both sides press Ready.',
            style: HigTypography.footnote(),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: stakeOptions.map((s) {
              final selected = _selectedStakeUsd == s;
              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedStakeUsd = s);
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                  decoration: BoxDecoration(
                    color: selected
                        ? HigColors.brand
                        : HigColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color:
                          selected ? HigColors.brand : HigColors.glassBorder,
                      width: 0.7,
                    ),
                  ),
                  child: Text(
                    _formatStake(gateway, s),
                    style: HigTypography.mono(
                      size: 11.5,
                      color: selected ? Colors.white : HigColors.labelSecondary,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          HigButton(
            label: 'Browse Duels (${_formatStake(gateway, _selectedStakeUsd)})',
            icon: CupertinoIcons.bolt_fill,
            size: HigButtonSize.large,
            fullWidth: true,
            onPressed: () => context.go('/challenges'),
          ),
        ],
      ),
    );
  }

  Widget _buildBlitzCupCard(
    BuildContext context,
    OfficialGame activeGame,
    PaymentGatewayMode gateway,
    List<TournamentModel> blitzForGame,
    int cupsForGame,
  ) {
    final topBlitz = blitzForGame.isNotEmpty ? blitzForGame.first : null;
    final subtitle = topBlitz != null
        ? 'Live Queue: ${topBlitz.enrolledCount}/${topBlitz.size} seated · Prize ${_formatStake(gateway, topBlitz.prizePoolUsd)}'
        : (cupsForGame > 0
            ? '$cupsForGame active tournament${cupsForGame == 1 ? '' : 's'} open in ${activeGame.displayName}.'
            : 'No active Blitz queue in ${activeGame.displayName} right now. Browse brackets or host a duel.');

    return GlassCard(
      radius: 16,
      padding: const EdgeInsets.all(16),
      backgroundColor: HigColors.surfaceGrouped,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HigBadge(
            label: topBlitz != null
                ? 'BLITZ QUEUE · ${topBlitz.enrolledCount}/${topBlitz.size}'
                : 'BRACKETS & BLITZ',
            tone: HigBadgeTone.indigo,
            icon: CupertinoIcons.rosette,
          ),
          const SizedBox(height: 10),
          Text('${activeGame.shortName} Brackets', style: HigTypography.title3()),
          const SizedBox(height: 4),
          Text(subtitle, style: HigTypography.footnote()),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 330) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    HigButton(
                      label: 'View Brackets',
                      icon: CupertinoIcons.rosette,
                      variant: HigButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () => context.go('/tournaments'),
                    ),
                    const SizedBox(height: 10),
                    HigButton(
                      label: 'Create Duel',
                      icon: CupertinoIcons.add,
                      fullWidth: true,
                      onPressed: () => context.push('/matches/new'),
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: HigButton(
                      label: 'View Brackets',
                      icon: CupertinoIcons.rosette,
                      variant: HigButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () => context.go('/tournaments'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: HigButton(
                      label: 'Create Duel',
                      icon: CupertinoIcons.add,
                      fullWidth: true,
                      onPressed: () => context.push('/matches/new'),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCareerTab(PlayerSession session) {
    final total = session.wins + session.losses;
    final winRate = total == 0 ? '—' : '${((session.wins / total) * 100).round()}%';
    final isCompact = Responsive.isCompact(context);

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: isCompact ? 2 : 4,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: isCompact ? 1.42 : 1.6,
      children: [
        _statTile(
          'Skill Rating',
          total == 0 ? 'Unranked' : '${session.elo}',
          HigColors.brandBright,
        ),
        _statTile('Win Rate', winRate, HigColors.emerald),
        _statTile(
          'Verified Record',
          '${session.wins}W - ${session.losses}L',
          HigColors.labelPrimary,
        ),
        _statTile(
          'Practice Coins',
          '${session.demoPoints} PTS',
          HigColors.indigo,
        ),
      ],
    );
  }

  Widget _statTile(String label, String value, Color accent) {
    return GlassCard(
      radius: 14,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: HigTypography.caption()),
          const SizedBox(height: 6),
          Text(
            value,
            style: HigTypography.mono(size: 19, color: accent),
          ),
        ],
      ),
    );
  }

  Widget _buildGamerHandlesTab(Map<String, String> handles) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: Responsive.isCompact(context) ? 1 : 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        mainAxisExtent: 86,
      ),
      itemCount: officialGames.length,
      itemBuilder: (context, idx) {
        final g = officialGames[idx];
        final current = handles[g.id];
        final isEditing = _editingGameId == g.id;

        return GlassCard(
          radius: 14,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              SizedBox(
                width: 34,
                height: 46,
                child: GamePosterView(game: g, borderRadius: 7),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: isEditing
                    ? HigTextField(
                        controller: _handleCtrl,
                        placeholder: g.gamertagPlaceholder,
                        autofocus: true,
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            g.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: HigTypography.headline()
                                .copyWith(fontSize: 13.5),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            current ?? g.gamertagLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: HigTypography.mono(
                              size: 11,
                              color: current != null
                                  ? HigColors.emerald
                                  : HigColors.labelTertiary,
                            ),
                          ),
                        ],
                      ),
              ),
              const SizedBox(width: 8),
              if (isEditing)
                HigButton(
                  label: 'Save',
                  size: HigButtonSize.small,
                  variant: HigButtonVariant.emerald,
                  onPressed: () {
                    if (_handleCtrl.text.trim().isNotEmpty) {
                      ref
                          .read(gameAccountsProvider.notifier)
                          .setHandle(g.id, _handleCtrl.text);
                      ref.read(toastProvider.notifier).show(
                            'Gamertag Linked',
                            body: '${g.displayName}: ${_handleCtrl.text.trim()}',
                            tone: ToastTone.success,
                          );
                    }
                    setState(() => _editingGameId = null);
                  },
                )
              else
                HigButton(
                  label: current == null ? 'Link' : 'Edit',
                  size: HigButtonSize.small,
                  variant: HigButtonVariant.secondary,
                  onPressed: () {
                    _handleCtrl.text = current ?? '';
                    setState(() => _editingGameId = g.id);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLedgerTab(PaymentGatewayMode gateway) {
    if (_loadingLedger && _ledgerRows.isEmpty) {
      return const HigLoadingCard(message: 'Loading ledger transactions...');
    }
    if (_ledgerError != null) {
      return HigErrorBanner(message: _ledgerError!, onRetry: _loadLedger);
    }
    if (_ledgerRows.isEmpty) {
      return HigEmptyState(
        icon: CupertinoIcons.doc_text,
        title: 'No ledger activity yet',
        subtitle:
            'Your real deposits, match payouts, practice coin claims, and withdrawals will appear here.',
        actionLabel: 'Open Wallet',
        onAction: () => context.go('/cashier'),
      );
    }

    return GlassCard(
      radius: 16,
      padding: EdgeInsets.zero,
      child: Column(
        children: List.generate(_ledgerRows.length, (i) {
          final tx = _ledgerRows[i];
          final meta = tx['metadata'] is Map
              ? Map<String, dynamic>.from(tx['metadata'] as Map)
              : const <String, dynamic>{};
          final rawReason = (tx['reason'] ??
                  meta['type'] ??
                  tx['type'] ??
                  'Wallet Transaction')
              .toString()
              .trim();
          final label = rawReason.isEmpty
              ? 'Wallet Transaction'
              : rawReason.replaceAll('_', ' ');
          final rawCurr = (tx['currency'] ?? meta['currency'] ?? 'USDC')
              .toString()
              .toUpperCase();
          final isPoints = rawCurr == 'POINTS' ||
              rawCurr == 'PTS' ||
              meta['type'] == 'DEMO_CLAIM';
          final amt = (tx['amount'] as num?)?.toDouble() ?? 0.0;
          final rawCreated =
              (tx['createdAt'] ?? tx['created_at'] ?? '').toString();
          final dateStr = rawCreated.isNotEmpty
              ? rawCreated.replaceFirst('T', ' ').split('.').first
              : '';
          final positive = amt >= 0 &&
              !label.toUpperCase().contains('WITHDRAW') &&
              !label.toUpperCase().contains('LOCK');

          final formattedAmt = isPoints
              ? '${positive ? '+' : '-'}${amt.abs().round()} PTS'
              : '${positive ? '+' : '-'}${AppConfig.formatUsdc(amt.abs(), alwaysDecimals: true)}';

          return Column(
            children: [
              ListTile(
                leading: Icon(
                  positive
                      ? CupertinoIcons.arrow_down_left_circle_fill
                      : CupertinoIcons.arrow_up_right_circle_fill,
                  color: positive ? HigColors.emerald : HigColors.crimson,
                ),
                title: Text(label,
                    style: HigTypography.headline().copyWith(fontSize: 14)),
                subtitle: dateStr.isNotEmpty
                    ? Text(dateStr, style: HigTypography.caption())
                    : null,
                trailing: Text(
                  formattedAmt,
                  style: HigTypography.mono(
                    size: 13,
                    color: positive ? HigColors.emerald : HigColors.crimson,
                  ),
                ),
              ),
              if (i < _ledgerRows.length - 1) const Divider(height: 1),
            ],
          );
        }),
      ),
    );
  }
}
