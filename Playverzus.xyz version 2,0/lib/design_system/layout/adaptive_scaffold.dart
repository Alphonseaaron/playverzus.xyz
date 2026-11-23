import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/engine/live_match_engine.dart';
import '../../core/storage/app_state.dart';
import '../../features/admin/admin_models.dart';
import '../tokens/hig_tokens.dart';
import '../widgets/active_game_switcher.dart';
import '../widgets/brand_logo.dart';
import '../widgets/hig_primitives.dart';
import 'responsive.dart';

class _NavDestination {
  final String route;
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const _NavDestination({
    required this.route,
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

const List<_NavDestination> _playerPrimaryDestinations = [
  _NavDestination(
    route: '/dashboard',
    label: 'Home',
    icon: CupertinoIcons.square_grid_2x2,
    activeIcon: CupertinoIcons.square_grid_2x2_fill,
  ),
  _NavDestination(
    route: '/challenges',
    label: 'Duels',
    icon: CupertinoIcons.bolt,
    activeIcon: CupertinoIcons.bolt_fill,
  ),
  _NavDestination(
    route: '/games',
    label: 'Games',
    icon: CupertinoIcons.game_controller,
    activeIcon: CupertinoIcons.game_controller_solid,
  ),
  _NavDestination(
    route: '/tournaments',
    label: 'Brackets',
    icon: CupertinoIcons.rosette,
    activeIcon: CupertinoIcons.rosette,
  ),
  _NavDestination(
    route: '/cashier',
    label: 'Wallet',
    icon: CupertinoIcons.creditcard,
    activeIcon: CupertinoIcons.creditcard_fill,
  ),
];

const Set<String> _playerRootPaths = {
  '/dashboard',
  '/challenges',
  '/games',
  '/tournaments',
  '/cashier',
};

const List<_NavDestination> _developerPrimaryDestinations = [
  _NavDestination(
    route: '/developer',
    label: 'Studio',
    icon: CupertinoIcons.gear_solid,
    activeIcon: CupertinoIcons.gear_solid,
  ),
  _NavDestination(
    route: '/developer/games/new',
    label: 'Add API',
    icon: CupertinoIcons.plus_circle,
    activeIcon: CupertinoIcons.plus_circle_fill,
  ),
  _NavDestination(
    route: '/developer/tester',
    label: 'Tester',
    icon: CupertinoIcons.bolt,
    activeIcon: CupertinoIcons.bolt_fill,
  ),
  _NavDestination(
    route: '/games',
    label: 'Games',
    icon: CupertinoIcons.game_controller,
    activeIcon: CupertinoIcons.game_controller_solid,
  ),
  _NavDestination(
    route: '/dashboard',
    label: 'Arena',
    icon: CupertinoIcons.square_grid_2x2,
    activeIcon: CupertinoIcons.square_grid_2x2_fill,
  ),
];

const Set<String> _developerRootPaths = {
  '/developer',
  '/developer/games/new',
  '/developer/tester',
  '/games',
  '/dashboard',
};

List<_NavDestination> _adminDestinationsForRole(String role) {
  final modules = allowedAdminModulesForRole(role);
  return [
    for (final m in modules)
      _NavDestination(
        route: m.route,
        label: m.label,
        icon: m.icon,
        activeIcon: m.icon,
      ),
    if (canRoleAccessAdminPath(role, '/games/new'))
      const _NavDestination(
        route: '/games/new',
        label: 'Auto-Calibrate',
        icon: CupertinoIcons.plus_circle,
        activeIcon: CupertinoIcons.plus_circle_fill,
      ),
  ];
}

/// Strictly Role-Separated, Decluttered Adaptive Scaffold:
/// - Primary Navigation (Sidebar / Rail / Bottom Bar): ONLY core workspace tabs (5 for Player, role-scoped desks for Admin).
/// - Account Menu (`Avatar ⌄`): Single home for Profile, Friends, Leaderboards, Ratings, Support & Polls, Settings, Download App, and Sign Out.
/// - Universal Top-Bar `‹ Back` button on ALL secondary & detail routes so users are never stranded.
class AdaptiveScaffold extends ConsumerStatefulWidget {
  final String currentPath;
  final Widget child;

  const AdaptiveScaffold({
    super.key,
    required this.currentPath,
    required this.child,
  });

  @override
  ConsumerState<AdaptiveScaffold> createState() => _AdaptiveScaffoldState();
}

class _AdaptiveScaffoldState extends ConsumerState<AdaptiveScaffold> {
  bool _soundAlertsEnabled = true;

  bool _isMatchroom(String path) =>
      path.startsWith('/matches/') && path != '/matches/new';

  bool _needsBackButton(String path, PlayerSession session, ScreenTier tier) {
    if (session.isAdmin) {
      if (path == '/settings' || path == '/games/new') return true;
      final isDesktop =
          tier == ScreenTier.expanded || tier == ScreenTier.ultraWide;
      if (!isDesktop && path != defaultAdminRouteForRole(session.role)) {
        return true;
      }
      return false;
    }
    if (session.isDeveloper) {
      return !_developerRootPaths.contains(path);
    }
    return !_playerRootPaths.contains(path);
  }

  String _fallbackBackRoute(String path, PlayerSession session) {
    if (session.isAdmin) {
      return defaultAdminRouteForRole(session.role);
    }
    if (path.startsWith('/developer/')) return '/developer';
    if (path.startsWith('/games/') && path != '/games/new') return '/games';
    if (path.startsWith('/tournaments/')) return '/tournaments';
    if (path.startsWith('/matches/')) return '/challenges';
    if (path.startsWith('/profile/')) return '/leaderboards';
    if (path == '/privacy' ||
        path == '/terms' ||
        path == '/responsible-gaming') {
      return '/settings';
    }
    return session.isDeveloper ? '/developer' : '/dashboard';
  }

  String _secondaryTitle(String path) {
    if (path == '/agent') return 'Ground Agent Hub';
    if (path == '/developer') return 'Developer Studio';
    if (path == '/developer/games/new') return 'Add Game API';
    if (path.startsWith('/developer/games/') && path.endsWith('/edit')) {
      return 'Configure Game API';
    }
    if (path == '/developer/tester') return 'Live Stats Tester';
    if (path == '/profile') return 'My Profile';
    if (path.startsWith('/profile/')) return 'Player Profile';
    if (path == '/settings') return 'Settings';
    if (path == '/friends') return 'Friends & Squads';
    if (path == '/leaderboards' || path.startsWith('/leaderboards/')) {
      return 'Leaderboards';
    }
    if (path == '/ratings') return 'Elo Ratings';
    if (path == '/settlement-preview') return 'Settlement Card';
    if (path == '/support' || path == '/community/polls') {
      return 'Support & Polls';
    }
    if (path == '/download') return 'Download App';
    if (path == '/matches/new') return 'Create Challenge';
    if (path.startsWith('/matches/room/')) return 'Join Room';
    if (path.startsWith('/matches/')) return 'Matchroom';
    if (path == '/tournaments/new') return 'Create Tournament';
    if (path.endsWith('/bracket')) return 'Live Bracket';
    if (path.startsWith('/tournaments/')) return 'Tournament';
    if (path == '/games/new') return 'Calibrate Game';
    if (path.startsWith('/games/')) return 'Game Hub';
    if (path == '/privacy') return 'Privacy Policy';
    if (path == '/terms') return 'Terms of Service';
    if (path == '/responsible-gaming') return 'Responsible Gaming';
    return 'Back';
  }

  void _handleBack(BuildContext context, PlayerSession session) {
    HapticFeedback.selectionClick();
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(_fallbackBackRoute(widget.currentPath, session));
    }
  }

  Future<void> _handleSignOut(BuildContext context) async {
    HapticFeedback.mediumImpact();
    await ref.read(playerSessionProvider.notifier).signOut();
    if (!context.mounted) return;
    ref.read(toastProvider.notifier).show(
          'Signed out',
          tone: ToastTone.info,
        );
    context.go('/');
  }

  void _showNotificationsSheet(BuildContext context) {
    HapticFeedback.selectionClick();
    final history = ref.read(liveMatchEngineProvider).notificationHistory;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: Container(
                constraints: const BoxConstraints(maxHeight: 480),
                decoration: const BoxDecoration(
                  color: HigColors.surfacePrimary,
                  border: Border(
                    top: BorderSide(color: HigColors.separator, width: 1),
                  ),
                ),
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 36,
                              height: 4,
                              decoration: BoxDecoration(
                                color: HigColors.separator,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Notifications',
                                  style: HigTypography.title3()),
                              Row(
                                children: [
                                  Text('Sound', style: HigTypography.caption()),
                                  const SizedBox(width: 6),
                                  CupertinoSwitch(
                                    value: _soundAlertsEnabled,
                                    activeTrackColor: HigColors.brand,
                                    onChanged: (v) {
                                      setSheetState(
                                          () => _soundAlertsEnabled = v);
                                      setState(() => _soundAlertsEnabled = v);
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          if (history.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 28),
                              child: Column(
                                children: [
                                  const Icon(
                                    CupertinoIcons.bell_slash,
                                    color: HigColors.labelTertiary,
                                    size: 24,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No notifications yet',
                                    style: HigTypography.headline(),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Match updates, score verifications, and bracket alerts appear here.',
                                    textAlign: TextAlign.center,
                                    style: HigTypography.caption(),
                                  ),
                                ],
                              ),
                            )
                          else
                            Flexible(
                              child: ListView.separated(
                                shrinkWrap: true,
                                itemCount: history.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 8),
                                itemBuilder: (_, i) {
                                  final evt = history[i];
                                  final toneColor = evt.leadStatus ==
                                          MatchLeadStatus.winning
                                      ? HigColors.emerald
                                      : evt.leadStatus == MatchLeadStatus.losing
                                          ? HigColors.crimson
                                          : HigColors.brand;
                                  return GlassCard(
                                    radius: 12,
                                    padding: const EdgeInsets.all(12),
                                    backgroundColor: HigColors.surfaceGrouped,
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: toneColor,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                evt.title,
                                                style: HigTypography.headline()
                                                    .copyWith(fontSize: 13),
                                              ),
                                              Text(
                                                evt.detail,
                                                style: HigTypography.caption(),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
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
    );
  }

  void _showAccountMenuSheet(BuildContext context) {
    HapticFeedback.selectionClick();
    final session = ref.read(playerSessionProvider);
    final gateway = ref.read(paymentGatewayProvider);

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        void nav(String route) {
          Navigator.of(ctx).pop();
          if (widget.currentPath != route) {
            context.push(route);
          }
        }

        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.82,
            ),
            decoration: const BoxDecoration(
              color: HigColors.surfacePrimary,
              border: Border(
                top: BorderSide(color: HigColors.separator, width: 1),
              ),
            ),
              child: SafeArea(
                top: false,
                child: ListView(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: HigColors.separator,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Current Authenticated User Card
                    GlassCard(
                      radius: 14,
                      padding: const EdgeInsets.all(14),
                      backgroundColor: HigColors.surfaceGrouped,
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: HigColors.brand,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              session.username.isNotEmpty
                                  ? session.username[0].toUpperCase()
                                  : 'U',
                              style: HigTypography.headline(color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '@${session.username}',
                                  style: HigTypography.headline(),
                                ),
                                Text(
                                  session.isAdmin
                                      ? '${session.role.toUpperCase()} · ${session.email}'
                                      : session.isDeveloper
                                          ? '${session.studioName.isNotEmpty ? session.studioName : 'Developer Studio'} · ${session.email}'
                                          : '${session.elo} ELO · ${gateway == PaymentGatewayMode.kopokopo ? 'KES ${session.cashKes.round()}' : '\$${session.cashUsd.toStringAsFixed(2)}'}',
                                  style: HigTypography.caption(),
                                ),
                              ],
                            ),
                          ),
                          HigBadge(
                            label: session.isAdmin
                                ? session.role
                                : session.isDeveloper
                                    ? 'DEVELOPER'
                                    : 'PLAYER',
                            tone: (session.isAdmin || session.isDeveloper)
                                ? HigBadgeTone.copper
                                : HigBadgeTone.neutral,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // DECLUTTERED, ROLE-SCOPED ACCOUNT MENU
                    if (session.isAdmin) ...[
                      _menuTile(
                        icon: CupertinoIcons.gear_solid,
                        title: 'Account Settings',
                        subtitle: 'Profile & staff preferences',
                        onTap: () => nav('/settings'),
                      ),
                    ] else ...[
                      if (session.isDeveloper)
                        _menuTile(
                          icon: CupertinoIcons.gear_solid,
                          title: 'Developer Studio',
                          subtitle: 'Manage platform Stats APIs & test live fetches',
                          onTap: () => nav('/developer'),
                        ),
                      _menuTile(
                        icon: CupertinoIcons.person_2_square_stack,
                        title: 'Ground Agent & Staff Hub',
                        subtitle: 'Your referral codes, wing sub-agents & owed payouts',
                        onTap: () => nav('/agent'),
                      ),
                      _menuTile(
                        icon: CupertinoIcons.person_crop_circle,
                        title: 'My Profile',
                        subtitle: 'Stats, linked handles & match history',
                        onTap: () => nav('/profile'),
                      ),
                      _menuTile(
                        icon: CupertinoIcons.person_2_fill,
                        title: 'Friends & Squads',
                        subtitle: 'Party code & friend challenges',
                        onTap: () => nav('/friends'),
                      ),
                      _menuTile(
                        icon: CupertinoIcons.chart_bar_fill,
                        title: 'Leaderboards & Ratings',
                        subtitle: 'Per-game standings, countries & your rank',
                        onTap: () => nav('/leaderboards'),
                      ),
                      _menuTile(
                        icon: CupertinoIcons.chat_bubble_2_fill,
                        title: 'Support & Polls',
                        subtitle: 'Help tickets and community polls',
                        onTap: () => nav('/support'),
                      ),
                      _menuTile(
                        icon: CupertinoIcons.gear_solid,
                        title: 'Settings & Device',
                        subtitle: 'Device fingerprint, console sync & limits',
                        onTap: () => nav('/settings'),
                      ),
                      if (kIsWeb)
                        _menuTile(
                          icon: CupertinoIcons.arrow_down_circle_fill,
                          title: 'Download App (APK / Desktop)',
                          subtitle: 'One-tap launches & live match alerts',
                          onTap: () => nav('/download'),
                        ),
                    ],

                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),

                    HigButton(
                      label: 'Sign Out',
                      icon: CupertinoIcons.square_arrow_right,
                      variant: HigButtonVariant.destructive,
                      size: HigButtonSize.large,
                      fullWidth: true,
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        _handleSignOut(context);
                      },
                    ),
                  ],
                ),
              ),
            ),
        );
      },
    );
  }

  Widget _menuTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: HigColors.surfaceGrouped,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: HigColors.separator, width: 1),
            ),
            child: Row(
              children: [
                Icon(icon, size: 18, color: HigColors.labelSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: HigTypography.headline()
                              .copyWith(fontSize: 13.5)),
                      Text(subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: HigTypography.caption()),
                    ],
                  ),
                ),
                const Icon(
                  CupertinoIcons.chevron_right,
                  size: 14,
                  color: HigColors.labelTertiary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final isAdmin = session.isAdmin;
    final tier = Responsive.tierOf(context);
    final isMatch = !isAdmin && _isMatchroom(widget.currentPath);
    final liveMatch = ref.watch(liveMatchEngineProvider);
    final showLiveBackgroundPill =
        !isAdmin && liveMatch.backgroundActive && !isMatch;

    final showSidebar =
        (tier == ScreenTier.expanded || tier == ScreenTier.ultraWide) &&
            !isMatch;
    final showRail = tier == ScreenTier.medium && !isMatch;
    final showBottomTabs = tier == ScreenTier.compact && !isMatch;

    return Scaffold(
      backgroundColor: HigColors.canvas,
      extendBody: showBottomTabs,
      body: Stack(
        children: [
          Row(
            children: [
              if (showSidebar)
                isAdmin
                    ? _buildAdminSidebar(context)
                    : _buildPlayerSidebar(context),
              if (showRail) _buildTabletRail(context, isAdmin: isAdmin),
              Expanded(
                child: Column(
                  children: [
                    _buildTopBar(context, tier, isMatch, isAdmin),
                    if (showLiveBackgroundPill)
                      _buildDynamicIslandMatchBar(context, liveMatch),
                    Expanded(
                      child: ColoredBox(
                        color: HigColors.canvas,
                        child: widget.child,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const FrostedToastOverlay(),
        ],
      ),
      bottomNavigationBar: showBottomTabs
          ? _buildBottomTabBar(context, isAdmin: isAdmin)
          : null,
    );
  }

  Widget _buildDynamicIslandMatchBar(
    BuildContext context,
    LiveMatchState live,
  ) {
    final accent = switch (live.leadStatus) {
      MatchLeadStatus.winning => HigColors.emerald,
      MatchLeadStatus.losing => HigColors.crimson,
      MatchLeadStatus.tied => HigColors.brand,
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.12),
        border: Border(
          bottom: BorderSide(color: accent.withValues(alpha: 0.35), width: 1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(shape: BoxShape.circle, color: accent),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'LIVE · ${live.game?.shortName ?? 'MATCH'} · ${live.leadBadgeLabel}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: HigTypography.mono(size: 11.5, color: accent),
            ),
          ),
          const SizedBox(width: 8),
          HigButton(
            label: 'Open Match',
            size: HigButtonSize.small,
            variant: HigButtonVariant.secondary,
            onPressed: () {
              if (live.matchId != null) {
                context.push('/matches/${live.matchId}');
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(
    BuildContext context,
    ScreenTier tier,
    bool isMatch,
    bool isAdmin,
  ) {
    final session = ref.watch(playerSessionProvider);
    final walletMode = ref.watch(walletModeProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final liveHistoryCount =
        ref.watch(liveMatchEngineProvider).notificationHistory.length;
    final isCompact = tier == ScreenTier.compact;
    final showBack = _needsBackButton(widget.currentPath, session, tier);

    final balanceLabel = walletMode == WalletPlayMode.realCash
        ? (gateway == PaymentGatewayMode.kopokopo
            ? 'KES ${session.cashKes.round()}'
            : '\$${session.cashUsd.toStringAsFixed(2)}')
        : '${session.demoPoints} PTS';

    return Container(
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(
          bottom: BorderSide(color: HigColors.separator, width: 1),
        ),
      ),
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              height: 58,
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: isCompact ? 10 : 20),
                child: Row(
                  children: [
                    if (showBack) ...[
                      HigButton(
                        label: 'Back',
                        icon: CupertinoIcons.chevron_left,
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () => _handleBack(context, session),
                      ),
                      const SizedBox(width: 8),
                      if (!isCompact) ...[
                        Flexible(
                          child: Text(
                            _secondaryTitle(widget.currentPath),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: HigTypography.headline(),
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                    ] else if (isCompact) ...[
                      GestureDetector(
                        onTap: () => context.go(
                          isAdmin
                              ? defaultAdminRouteForRole(session.role)
                              : '/dashboard',
                        ),
                        child: const BrandLogo.mark(height: 24),
                      ),
                      const SizedBox(width: 8),
                    ],

                    if (isAdmin) ...[
                      if (!showBack)
                        const Flexible(
                          child: HigBadge(
                            label: 'ADMIN CONSOLE',
                            tone: HigBadgeTone.copper,
                            icon: CupertinoIcons.shield_fill,
                          ),
                        ),
                    ] else if (!showBack || isMatch) ...[
                      Flexible(
                        child: ActiveGameSwitcherPill(
                          compact: isCompact,
                          onGameSelected: (game) {
                            if (isMatch) {
                              context.go('/challenges');
                            }
                          },
                        ),
                      ),
                    ],

                    if (!isCompact) const Spacer() else const SizedBox(width: 6),

                    if (!isAdmin) ...[
                      if (isCompact) const Spacer(),
                      MouseRegion(
                        cursor: SystemMouseCursors.click,
                        child: GestureDetector(
                          onTap: () {
                            ref.read(walletModeProvider.notifier).toggle();
                            final next = ref.read(walletModeProvider);
                            ref.read(toastProvider.notifier).show(
                                  next == WalletPlayMode.realCash
                                      ? 'Cash mode active'
                                      : 'Practice mode active',
                                  tone: ToastTone.info,
                                );
                          },
                          child: Container(
                            height: 34,
                            padding: EdgeInsets.symmetric(
                              horizontal: isCompact ? 8 : 10,
                            ),
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: HigColors.separator,
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: walletMode == WalletPlayMode.realCash
                                        ? HigColors.emerald
                                        : HigColors.brand,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  balanceLabel,
                                  style: HigTypography.mono(
                                    size: isCompact ? 11 : 12,
                                    color: HigColors.labelPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: isCompact ? 6 : 8),

                      // Notification Bell (Player)
                      Tooltip(
                        message: 'Notifications',
                        child: GestureDetector(
                          onTap: () => _showNotificationsSheet(context),
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: HigColors.separator,
                                width: 1,
                              ),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                const Icon(
                                  CupertinoIcons.bell,
                                  size: 16,
                                  color: HigColors.labelPrimary,
                                ),
                                if (liveHistoryCount > 0)
                                  Positioned(
                                    top: 7,
                                    right: 7,
                                    child: Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: HigColors.brand,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      SizedBox(width: isCompact ? 6 : 8),
                    ] else if (isCompact)
                      const Spacer(),

                    // Account Menu Pill (Single home for secondary pages & Sign Out)
                    Tooltip(
                      message: 'Account Menu',
                      child: MouseRegion(
                        cursor: SystemMouseCursors.click,
                        child: GestureDetector(
                          onTap: () => _showAccountMenuSheet(context),
                          child: Container(
                            height: 34,
                            padding: const EdgeInsets.only(left: 4, right: 8),
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(17),
                              border: Border.all(
                                color: HigColors.separator,
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 26,
                                  height: 26,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: HigColors.brand,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    session.username.isNotEmpty
                                        ? session.username[0].toUpperCase()
                                        : 'U',
                                    style: HigTypography.headline(
                                      color: Colors.white,
                                    ).copyWith(fontSize: 12),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  CupertinoIcons.chevron_down,
                                  size: 11,
                                  color: HigColors.labelSecondary,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
  }

  bool _isRouteActive(String route) {
    if (route == '/admin') return widget.currentPath == '/admin';
    if (route == '/developer') return widget.currentPath == '/developer';
    return widget.currentPath == route ||
        widget.currentPath.startsWith('$route/');
  }

  Widget _buildBottomTabBar(BuildContext context, {required bool isAdmin}) {
    final session = ref.watch(playerSessionProvider);
    final destinations = isAdmin
        ? _adminDestinationsForRole(session.role).take(4).toList()
        : session.isDeveloper
            ? _developerPrimaryDestinations
            : _playerPrimaryDestinations;
    final currentIndex =
        destinations.indexWhere((d) => _isRouteActive(d.route));

    return Container(
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(
          top: BorderSide(color: HigColors.separator, width: 1),
        ),
      ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 56,
              child: Row(
                children: List.generate(destinations.length, (i) {
                  final dest = destinations[i];
                  final selected = i == currentIndex;
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        context.go(dest.route);
                      },
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            selected ? dest.activeIcon : dest.icon,
                            size: 21,
                            color: selected
                                ? HigColors.brand
                                : HigColors.labelTertiary,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            dest.label,
                            style: HigTypography.caption(
                              color: selected
                                  ? HigColors.brandBright
                                  : HigColors.labelTertiary,
                            ).copyWith(fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        );
  }

  Widget _buildTabletRail(BuildContext context, {required bool isAdmin}) {
    final session = ref.watch(playerSessionProvider);
    final all = isAdmin
        ? _adminDestinationsForRole(session.role)
        : session.isDeveloper
            ? _developerPrimaryDestinations
            : _playerPrimaryDestinations;
    return Container(
      width: 74,
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(right: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 14),
            GestureDetector(
              onTap: () => context.go(
                isAdmin
                    ? defaultAdminRouteForRole(session.role)
                    : session.isDeveloper
                        ? '/developer'
                        : '/dashboard',
              ),
              child: const BrandLogo.mark(height: 28),
            ),
            const SizedBox(height: 18),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                itemCount: all.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (_, i) {
                  final d = all[i];
                  final active = _isRouteActive(d.route);
                  return Tooltip(
                    message: d.label,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () {
                        HapticFeedback.selectionClick();
                        context.go(d.route);
                      },
                      child: Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: active
                              ? HigColors.brand.withValues(alpha: 0.16)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          active ? d.activeIcon : d.icon,
                          size: 20,
                          color: active
                              ? HigColors.brandBright
                              : HigColors.labelSecondary,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdminSidebar(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    return Container(
      width: 244,
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(right: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
              child: Align(
                alignment: Alignment.centerLeft,
                child: GestureDetector(
                  onTap: () =>
                      context.go(defaultAdminRouteForRole(session.role)),
                  child: const BrandLogo.full(height: 26),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: GlassCard(
                radius: 12,
                padding: const EdgeInsets.all(12),
                backgroundColor: HigColors.surfaceGrouped,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '@${session.username}',
                      style: HigTypography.headline().copyWith(fontSize: 13.5),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Role: ${session.role.toUpperCase()}',
                      style: HigTypography.mono(
                        size: 11,
                        color: HigColors.brandBright,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                children: [
                  Text(
                    'OPERATIONS',
                    style: HigTypography.mono(
                      size: 10,
                      color: HigColors.labelTertiary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ..._adminDestinationsForRole(session.role)
                      .map(_sidebarNavItem),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerSidebar(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final isDev = session.isDeveloper;
    final items =
        isDev ? _developerPrimaryDestinations : _playerPrimaryDestinations;

    return Container(
      width: 228,
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(right: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              child: Align(
                alignment: Alignment.centerLeft,
                child: GestureDetector(
                  onTap: () => context.go(isDev ? '/developer' : '/dashboard'),
                  child: const BrandLogo.full(height: 26),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                children: [
                  Text(
                    isDev ? 'DEVELOPER STUDIO' : 'ARENA',
                    style: HigTypography.mono(
                      size: 10,
                      color: HigColors.labelTertiary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...items.map(_sidebarNavItem),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sidebarNavItem(_NavDestination d) {
    final active = _isRouteActive(d.route);
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            HapticFeedback.selectionClick();
            context.go(d.route);
          },
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: active ? HigColors.brand : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(
                  active ? d.activeIcon : d.icon,
                  size: 18,
                  color: active ? Colors.white : HigColors.labelSecondary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    d.label,
                    style: HigTypography.subheadline(
                      color: active ? Colors.white : HigColors.labelSecondary,
                    ).copyWith(
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
