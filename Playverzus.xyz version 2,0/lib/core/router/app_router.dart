import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/layout/adaptive_scaffold.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../features/admin/admin_console_screen.dart';
import '../../features/admin/admin_models.dart';
import '../../features/agents/field_agents_screen.dart';
import '../../features/cashier/cashier_screen.dart';
import '../../features/challenges/challenges_screen.dart';
import '../../features/community_support/support_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/developer/developer_game_editor_screen.dart';
import '../../features/developer/developer_portal_screen.dart';
import '../../features/developer/developer_stats_tester_screen.dart';
import '../../features/downloads/download_hub_screen.dart';
import '../../features/friends/friends_screen.dart';
import '../../features/games/game_detail_screen.dart';
import '../../features/games/games_catalog_screen.dart';
import '../../features/leaderboards/leaderboards_screen.dart';
import '../../features/legal/legal_screen.dart';
import '../../features/matchroom/create_match_screen.dart';
import '../../features/matchroom/join_room_code_screen.dart';
import '../../features/matchroom/matchroom_screen.dart';
import '../../features/onboarding_auth/auth_screen.dart';
import '../../features/onboarding_auth/landing_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/ratings/ratings_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/tournaments/create_tournament_screen.dart';
import '../../features/tournaments/tournament_detail_screen.dart';
import '../../features/tournaments/tournaments_screen.dart';
import '../storage/app_state.dart';

class _RouterRefreshNotifier extends ChangeNotifier {
  void trigger() => notifyListeners();
}

/// Instant, zero-lag opaque page switch (zero slide lag, zero fade ghosting).
Page<void> _subtlePage(GoRouterState state, Widget child) {
  return NoTransitionPage<void>(
    key: state.pageKey,
    child: ColoredBox(color: HigColors.canvas, child: child),
  );
}

const Set<String> _publicRoutes = {
  '/',
  '/login',
  '/signup',
  '/download',
  '/privacy',
  '/terms',
  '/responsible-gaming',
};

bool _isAdminOnlyRoute(String path) =>
    path == '/admin' || path.startsWith('/admin/') || path == '/games/new';

bool _isDeveloperOnlyRoute(String path) =>
    path == '/developer' || path.startsWith('/developer/');

/// Lightweight public shell for legal & download pages so guests never see logged-in chrome.
class _PublicPageShell extends ConsumerWidget {
  final Widget child;
  const _PublicPageShell({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(playerSessionProvider);
    if (session.isAuthenticated) {
      return AdaptiveScaffold(
        currentPath: GoRouterState.of(context).uri.path,
        child: child,
      );
    }

    return Scaffold(
      backgroundColor: HigColors.canvas,
      body: Stack(
        children: [
          Column(
            children: [
              Container(
                decoration: const BoxDecoration(
                  color: HigColors.surfacePrimary,
                  border: Border(
                    bottom: BorderSide(color: HigColors.separator, width: 1),
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: SizedBox(
                    height: 60,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          HigButton(
                            label: 'Back',
                            icon: CupertinoIcons.chevron_left,
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            onPressed: () {
                              if (context.canPop()) {
                                context.pop();
                              } else {
                                context.go('/');
                              }
                            },
                          ),
                          const SizedBox(width: 10),
                          GestureDetector(
                            onTap: () => context.go('/'),
                            child: MediaQuery.sizeOf(context).width < 360
                                ? const BrandLogo.mark(height: 24)
                                : const BrandLogo.full(height: 22),
                          ),
                          const Spacer(),
                          HigButton(
                            label: 'Sign In',
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.ghost,
                            onPressed: () => context.go('/login'),
                          ),
                          const SizedBox(width: 6),
                          HigButton(
                            label: MediaQuery.sizeOf(context).width < 420
                                ? 'Play Now'
                                : 'Create Account',
                            size: HigButtonSize.small,
                            onPressed: () => context.go('/signup'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(child: child),
            ],
          ),
          const FrostedToastOverlay(),
        ],
      ),
    );
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _RouterRefreshNotifier();
  ref.listen<PlayerSession>(playerSessionProvider, (_, __) {
    refreshNotifier.trigger();
  });
  ref.onDispose(refreshNotifier.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final session = ref.read(playerSessionProvider);
      final path = state.uri.path;

      // 1. GUEST (UNAUTHENTICATED): Can ONLY visit public routes
      if (!session.isAuthenticated) {
        if (_publicRoutes.contains(path)) return null;
        return '/login';
      }

      // 2. ADMIN / STAFF ROLE: Granular per-role RBAC — zero Player routes, zero unauthorized desks!
      if (session.isAdmin) {
        final home = defaultAdminRouteForRole(session.role);
        if (path == '/' || path == '/login' || path == '/signup') {
          return home;
        }
        if (canRoleAccessAdminPath(session.role, path)) {
          return null;
        }
        return home;
      }

      // 3. GAME DEVELOPER: Default home `/developer`, full Developer Studio + Arena catalog access, ZERO Admin routes!
      if (session.isDeveloper) {
        if (path == '/' || path == '/login' || path == '/signup') {
          return '/developer';
        }
        if (_isAdminOnlyRoute(path)) {
          return '/developer';
        }
        return null;
      }

      // 4. PLAYER: Strictly isolated to Player workspace — zero Admin routes, zero Developer portal, zero guest landing/auth!
      if (path == '/' || path == '/login' || path == '/signup') {
        return '/dashboard';
      }
      if (_isAdminOnlyRoute(path) || _isDeveloperOnlyRoute(path)) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      // STRICTLY PUBLIC ROUTES
      GoRoute(
        path: '/',
        pageBuilder: (context, state) => _subtlePage(state, const LandingScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) =>
            _subtlePage(state, const AuthScreen(isSignUp: false)),
      ),
      GoRoute(
        path: '/signup',
        pageBuilder: (context, state) => _subtlePage(
          state,
          AuthScreen(
            isSignUp: true,
            initialDeveloper:
                state.uri.queryParameters['type'] == 'developer',
          ),
        ),
      ),
      GoRoute(
        path: '/download',
        pageBuilder: (context, state) =>
            _subtlePage(state, const _PublicPageShell(child: DownloadHubScreen())),
      ),
      GoRoute(
        path: '/privacy',
        pageBuilder: (context, state) => _subtlePage(
          state,
          const _PublicPageShell(
            child: LegalScreen(docType: LegalDocType.privacy),
          ),
        ),
      ),
      GoRoute(
        path: '/terms',
        pageBuilder: (context, state) => _subtlePage(
          state,
          const _PublicPageShell(
            child: LegalScreen(docType: LegalDocType.terms),
          ),
        ),
      ),
      GoRoute(
        path: '/responsible-gaming',
        pageBuilder: (context, state) => _subtlePage(
          state,
          const _PublicPageShell(
            child: LegalScreen(docType: LegalDocType.responsibleGaming),
          ),
        ),
      ),

      // AUTHENTICATED SHELL (Renders Role-Specific Admin Shell vs Player Shell!)
      ShellRoute(
        builder: (context, state, child) => AdaptiveScaffold(
          currentPath: state.uri.path,
          child: child,
        ),
        routes: [
          // PLAYER WORKSPACE ROUTES
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) =>
                _subtlePage(state, const DashboardScreen()),
          ),
          GoRoute(
            path: '/games',
            pageBuilder: (context, state) =>
                _subtlePage(state, const GamesCatalogScreen()),
          ),
          GoRoute(
            path: '/games/new',
            pageBuilder: (context, state) =>
                _subtlePage(state, const NewGameScreen()),
          ),
          GoRoute(
            path: '/games/:id',
            pageBuilder: (context, state) => _subtlePage(
              state,
              GameDetailScreen(
                gameId: state.pathParameters['id'] ?? 'eafc',
              ),
            ),
          ),
          GoRoute(
            path: '/challenges',
            pageBuilder: (context, state) =>
                _subtlePage(state, const ChallengesScreen()),
          ),
          GoRoute(
            path: '/matches/new',
            pageBuilder: (context, state) =>
                _subtlePage(state, const CreateMatchScreen()),
          ),
          GoRoute(
            path: '/matches/room/:code',
            pageBuilder: (context, state) => _subtlePage(
              state,
              JoinRoomCodeScreen(
                code: state.pathParameters['code'] ?? '',
              ),
            ),
          ),
          GoRoute(
            path: '/matches/:id',
            pageBuilder: (context, state) => _subtlePage(
              state,
              MatchRoomScreen(
                matchId: state.pathParameters['id'] ?? '',
              ),
            ),
          ),
          GoRoute(
            path: '/tournaments',
            pageBuilder: (context, state) =>
                _subtlePage(state, const TournamentsScreen()),
          ),
          GoRoute(
            path: '/tournaments/new',
            pageBuilder: (context, state) =>
                _subtlePage(state, const CreateTournamentScreen()),
          ),
          GoRoute(
            path: '/tournaments/:id/bracket',
            pageBuilder: (context, state) => _subtlePage(
              state,
              TournamentDetailScreen(
                tournamentId: state.pathParameters['id'] ?? '',
                focusBracket: true,
              ),
            ),
          ),
          GoRoute(
            path: '/tournaments/:id',
            pageBuilder: (context, state) => _subtlePage(
              state,
              TournamentDetailScreen(
                tournamentId: state.pathParameters['id'] ?? '',
              ),
            ),
          ),
          GoRoute(
            path: '/leaderboards',
            pageBuilder: (context, state) =>
                _subtlePage(state, const LeaderboardsScreen()),
          ),
          GoRoute(
            path: '/leaderboards/:gameType',
            pageBuilder: (context, state) => _subtlePage(
              state,
              LeaderboardsScreen(
                initialGameType:
                    state.pathParameters['gameType'] ?? 'HEAD_TO_HEAD',
              ),
            ),
          ),
          GoRoute(
            path: '/ratings',
            pageBuilder: (context, state) =>
                _subtlePage(state, const LeaderboardsScreen(initialTab: 1)),
          ),
          GoRoute(
            path: '/settlement-preview',
            pageBuilder: (context, state) =>
                _subtlePage(state, const SettlementPreviewScreen()),
          ),
          GoRoute(
            path: '/cashier',
            pageBuilder: (context, state) =>
                _subtlePage(state, const CashierScreen()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) =>
                _subtlePage(state, const ProfileScreen()),
          ),
          GoRoute(
            path: '/profile/:username',
            pageBuilder: (context, state) => _subtlePage(
              state,
              ProfileScreen(
                lookupUsername: state.pathParameters['username'],
              ),
            ),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) =>
                _subtlePage(state, const SettingsScreen()),
          ),
          GoRoute(
            path: '/friends',
            pageBuilder: (context, state) =>
                _subtlePage(state, const FriendsScreen()),
          ),
          GoRoute(
            path: '/support',
            pageBuilder: (context, state) =>
                _subtlePage(state, const SupportScreen(initialTab: 1)),
          ),
          GoRoute(
            path: '/community/polls',
            pageBuilder: (context, state) =>
                _subtlePage(state, const SupportScreen(initialTab: 0)),
          ),

          // FIELD AGENT & GROUND STAFF HUB
          GoRoute(
            path: '/agent',
            pageBuilder: (context, state) =>
                _subtlePage(state, const FieldAgentStaffScreen()),
          ),

          // GAME DEVELOPER STUDIO ROUTES
          GoRoute(
            path: '/developer',
            pageBuilder: (context, state) =>
                _subtlePage(state, const DeveloperPortalScreen()),
          ),
          GoRoute(
            path: '/developer/games/new',
            pageBuilder: (context, state) =>
                _subtlePage(state, const DeveloperGameEditorScreen()),
          ),
          GoRoute(
            path: '/developer/games/:id/edit',
            pageBuilder: (context, state) => _subtlePage(
              state,
              DeveloperGameEditorScreen(
                editGameId: state.pathParameters['id'],
              ),
            ),
          ),
          GoRoute(
            path: '/developer/tester',
            pageBuilder: (context, state) => _subtlePage(
              state,
              DeveloperStatsTesterScreen(
                initialGameId: state.uri.queryParameters['gameId'],
              ),
            ),
          ),

          // ADMIN WORKSPACE ROUTES (All 10 Desks — Granular Role-Scoped RBAC!)
          for (final meta in allAdminModules)
            GoRoute(
              path: meta.route,
              pageBuilder: (context, state) => _subtlePage(
                state,
                AdminConsoleScreen(initialModule: meta.module),
              ),
            ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: HigColors.canvas,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              CupertinoIcons.exclamationmark_triangle,
              size: 32,
              color: HigColors.labelTertiary,
            ),
            const SizedBox(height: 12),
            Text('Page not found', style: HigTypography.title3()),
            const SizedBox(height: 6),
            Text(state.uri.toString(), style: HigTypography.caption()),
            const SizedBox(height: 16),
            HigButton(
              label: 'Go Home',
              size: HigButtonSize.small,
              onPressed: () => context.go('/'),
            ),
          ],
        ),
      ),
    ),
  );
});
