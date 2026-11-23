import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import 'developer_models.dart';
import 'developer_repository.dart';

/// Game Developer Studio Home (`/developer`).
/// Lists the developer's API-integrated games, platform connectors, API health,
/// and quick entry points to add/configure games or test live stat fetches.
class DeveloperPortalScreen extends ConsumerWidget {
  const DeveloperPortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(playerSessionProvider);
    final devState = ref.watch(developerGamesProvider);
    final isCompact = Responsive.isCompact(context);

    final myGames = devState.games.where((g) {
      if (session.userId.isNotEmpty && g.ownerUserId == session.userId) {
        return true;
      }
      if (session.email.isNotEmpty &&
          g.ownerEmail.toLowerCase() == session.email.toLowerCase()) {
        return true;
      }
      return false;
    }).toList();

    final verifiedCount = myGames.where((g) => g.isVerified).length;
    final totalConnectors = myGames.fold<int>(
      0,
      (sum, g) => sum + g.platformApis.length,
    );
    final avgLatency = () {
      final latencies = myGames
          .map((g) => g.lastLatencyMs)
          .whereType<int>()
          .toList();
      if (latencies.isEmpty) return '--';
      final avg =
          latencies.reduce((a, b) => a + b) ~/ latencies.length;
      return '${avg}ms';
    }();

    return RefreshIndicator(
      color: HigColors.brand,
      onRefresh: () => ref.read(developerGamesProvider.notifier).refresh(),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Studio Header Card
                GlassCard(
                  radius: 20,
                  padding: EdgeInsets.all(isCompact ? 16 : 22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          const HigBadge(
                            label: 'GAME DEVELOPER PORTAL',
                            tone: HigBadgeTone.copper,
                          ),
                          HigBadge(
                            label: session.studioName.isNotEmpty
                                ? session.studioName.toUpperCase()
                                : '@${session.username.toUpperCase()}',
                            tone: HigBadgeTone.emerald,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        session.studioName.isNotEmpty
                            ? '${session.studioName} · API Studio'
                            : 'Game Developer API Studio',
                        style: HigTypography.title1(),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Register your games by connecting platform-specific Stats APIs (PC, Console, Mobile, Web). Playverzus automatically fetches player stats & match results from your endpoints.',
                        style: HigTypography.footnote(),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          HigButton(
                            label: 'Add Game via API',
                            icon: CupertinoIcons.plus_circle_fill,
                            onPressed: () => context.push('/developer/games/new'),
                          ),
                          HigButton(
                            label: 'Live Stats Tester',
                            icon: CupertinoIcons.bolt_fill,
                            variant: HigButtonVariant.secondary,
                            onPressed: () => context.push('/developer/tester'),
                          ),
                          HigButton(
                            label: 'View Live Catalog',
                            icon: CupertinoIcons.game_controller,
                            variant: HigButtonVariant.ghost,
                            onPressed: () => context.go('/games'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Real Studio Metrics Row (zero fabricated data)
                LayoutBuilder(
                  builder: (context, constraints) {
                    final cols = constraints.maxWidth >= 700 ? 4 : 2;
                    final metrics = [
                      ('My API Games', '${myGames.length}', HigColors.brandBright),
                      ('Verified Live', '$verifiedCount', HigColors.emerald),
                      ('Platform APIs', '$totalConnectors', HigColors.labelPrimary),
                      ('Avg API Latency', avgLatency, HigColors.amber),
                    ];
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: cols,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        mainAxisExtent: 84,
                      ),
                      itemCount: metrics.length,
                      itemBuilder: (_, i) {
                        final m = metrics[i];
                        return GlassCard(
                          radius: 14,
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(m.$1, style: HigTypography.caption()),
                              const SizedBox(height: 4),
                              Text(
                                m.$2,
                                style: HigTypography.title2(color: m.$3),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),

                const SizedBox(height: 20),

                // Section Title
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'My Configured Games (${myGames.length})',
                      style: HigTypography.title3(),
                    ),
                    HigButton(
                      label: 'Refresh',
                      icon: CupertinoIcons.refresh,
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.ghost,
                      loading: devState.loading,
                      onPressed: () =>
                          ref.read(developerGamesProvider.notifier).refresh(),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                if (devState.error != null) ...[
                  HigErrorBanner(message: devState.error!),
                  const SizedBox(height: 12),
                ],

                if (myGames.isEmpty)
                  _buildEmptyOnboarding(context)
                else
                  ...myGames.map(
                    (g) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _DeveloperGameCard(
                        game: g,
                        onEdit: () =>
                            context.push('/developer/games/${g.id}/edit'),
                        onTest: () =>
                            context.push('/developer/tester?gameId=${g.id}'),
                        onOpenHub: () => context.push('/games/${g.id}'),
                        onDelete: () => _confirmDelete(context, ref, g),
                      ),
                    ),
                  ),

                // Other community developer titles (read-only awareness)
                if (devState.games.length > myGames.length) ...[
                  const SizedBox(height: 18),
                  Text(
                    'All Studio API Games on Platform (${devState.games.length})',
                    style: HigTypography.headline(),
                  ),
                  const SizedBox(height: 8),
                  ...devState.games
                      .where((g) => !myGames.any((m) => m.id == g.id))
                      .map(
                        (g) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: GlassCard(
                            radius: 14,
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(g.title,
                                          style: HigTypography.headline()),
                                      const SizedBox(height: 2),
                                      Text(
                                        'By ${g.studioName} · ${g.platforms.join(', ')}',
                                        style: HigTypography.caption(),
                                      ),
                                    ],
                                  ),
                                ),
                                HigButton(
                                  label: 'Inspect',
                                  size: HigButtonSize.small,
                                  variant: HigButtonVariant.secondary,
                                  onPressed: () =>
                                      context.push('/games/${g.id}'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyOnboarding(BuildContext context) {
    return GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: HigColors.brand.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  CupertinoIcons.cloud_upload_fill,
                  color: HigColors.brandBright,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Connect Your First Game API',
                        style: HigTypography.title3()),
                    Text(
                      'Connect your official platform Stats API so player stats and match results sync automatically.',
                      style: HigTypography.caption(),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _stepRow('1', 'Select Platform(s)',
              'Choose where your game runs: PC, Console, Mobile, or Web.'),
          const SizedBox(height: 10),
          _stepRow('2', 'Provide Platform Stats API',
              'Supply your base URL, player/match endpoints, and API key or Bearer token (stored server-side only).'),
          const SizedBox(height: 10),
          _stepRow('3', 'Map JSON Stats & Go Live',
              'Point Playverzus to score, wins, losses, rank, or winner fields, run a live test fetch, and publish.'),
          const SizedBox(height: 18),
          HigButton(
            label: 'Add & Configure Game API',
            icon: CupertinoIcons.plus_circle_fill,
            size: HigButtonSize.large,
            onPressed: () => context.push('/developer/games/new'),
          ),
        ],
      ),
    );
  }

  Widget _stepRow(String numStr, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: HigColors.surfaceGrouped,
            borderRadius: BorderRadius.circular(7),
            border: Border.all(color: HigColors.separator),
          ),
          child: Text(
            numStr,
            style: HigTypography.mono(size: 11, color: HigColors.brandBright),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: HigTypography.headline().copyWith(fontSize: 13.5)),
              const SizedBox(height: 2),
              Text(desc, style: HigTypography.caption()),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    DeveloperGame game,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: HigColors.surfacePrimary,
        title: Text('Remove "${game.title}"?', style: HigTypography.title3()),
        content: Text(
          'This disconnects all configured platform Stats APIs for this title and removes it from the platform catalog.',
          style: HigTypography.footnote(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Remove', style: TextStyle(color: HigColors.crimson)),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    final err =
        await ref.read(developerGamesProvider.notifier).deleteGame(game.id);
    if (!context.mounted) return;
    ref.read(toastProvider.notifier).show(
          err == null ? 'Removed ${game.title}' : 'Delete failed',
          body: err,
          tone: err == null ? ToastTone.info : ToastTone.error,
        );
  }
}

class _DeveloperGameCard extends StatelessWidget {
  final DeveloperGame game;
  final VoidCallback onEdit;
  final VoidCallback onTest;
  final VoidCallback onOpenHub;
  final VoidCallback onDelete;

  const _DeveloperGameCard({
    required this.game,
    required this.onEdit,
    required this.onTest,
    required this.onOpenHub,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: HigColors.brand.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: HigColors.brand.withValues(alpha: 0.4),
                  ),
                ),
                alignment: Alignment.center,
                child: Text(
                  game.shortName.length > 4
                      ? game.shortName.substring(0, 4)
                      : game.shortName,
                  style: HigTypography.mono(
                    size: 12,
                    color: HigColors.brandBright,
                  ).copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(game.title, style: HigTypography.title3()),
                        HigBadge(
                          label: game.isVerified
                              ? 'API VERIFIED'
                              : 'API CONFIGURED',
                          tone: game.isVerified
                              ? HigBadgeTone.emerald
                              : HigBadgeTone.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(game.tagline, style: HigTypography.caption()),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Per-platform API badges & endpoint summary
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final p in game.platforms)
                HigBadge(label: p, tone: HigBadgeTone.copper),
              HigBadge(
                label: game.gameType.replaceAll('_', ' '),
                tone: HigBadgeTone.neutral,
              ),
              if (game.lastLatencyMs != null)
                HigBadge(
                  label: '${game.lastLatencyMs}ms',
                  tone: HigBadgeTone.emerald,
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Platform API Endpoint Rows
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: HigColors.surfaceGrouped,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: HigColors.separator),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (int i = 0; i < game.platformApis.length; i++) ...[
                  if (i > 0) const Divider(height: 14),
                  _apiSummaryRow(game.platformApis[i]),
                ],
              ],
            ),
          ),

          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              HigButton(
                label: 'Test Live Stats',
                icon: CupertinoIcons.bolt_fill,
                size: HigButtonSize.small,
                onPressed: onTest,
              ),
              HigButton(
                label: 'Configure APIs',
                icon: CupertinoIcons.slider_horizontal_3,
                size: HigButtonSize.small,
                variant: HigButtonVariant.secondary,
                onPressed: onEdit,
              ),
              HigButton(
                label: 'Arena Hub',
                icon: CupertinoIcons.game_controller,
                size: HigButtonSize.small,
                variant: HigButtonVariant.ghost,
                onPressed: onOpenHub,
              ),
              HigButton(
                label: 'Remove',
                icon: CupertinoIcons.trash,
                size: HigButtonSize.small,
                variant: HigButtonVariant.destructive,
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _apiSummaryRow(PlatformApiConfig api) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              api.platform == 'ALL' ? 'ALL PLATFORMS' : api.platform,
              style: HigTypography.mono(
                size: 11,
                color: HigColors.brandBright,
              ).copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              '· ${api.httpMethod} · ${api.authType}',
              style: HigTypography.caption(),
            ),
            if (api.hasSecret)
              Text(
                '· Key ${api.secretHint}',
                style: HigTypography.mono(
                  size: 10.5,
                  color: HigColors.emerald,
                ),
              ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          '${api.baseUrl}${api.playerStatsPath}',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: HigTypography.mono(size: 11, color: HigColors.labelSecondary),
        ),
      ],
    );
  }
}
