import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/countries.dart';
import '../../core/catalog/official_games.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/active_game_switcher.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Unified Per-Game Leaderboards & Player Skill Ratings (`/leaderboards`, `/leaderboards/:gameType`, `/ratings`).
/// Combines individual game selection (all 21 titles), country flag filtering, Level 1–10 VX ELO badges,
/// and the player's per-game rating breakdown in one coherent screen.
class LeaderboardsScreen extends ConsumerStatefulWidget {
  final String? initialGameType;
  final int initialTab; // 0 = Standings, 1 = My Ratings (21 Games)

  const LeaderboardsScreen({
    super.key,
    this.initialGameType,
    this.initialTab = 0,
  });

  @override
  ConsumerState<LeaderboardsScreen> createState() => _LeaderboardsScreenState();
}

class _LeaderboardsScreenState extends ConsumerState<LeaderboardsScreen> {
  late int _tab;
  String? _selectedCountry; // null = All Countries
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _rows = const [];
  List<Map<String, dynamic>> _myRatings = const [];
  Map<String, dynamic>? _myRank;

  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  String _scoringModelLabel(String gameType) {
    return switch (gameType.toUpperCase()) {
      'HIGH_SCORE' => 'High-Score Ladder',
      'BINARY_RESULT' => 'Win / Loss Skill Rating',
      _ => 'Head-to-Head Skill Rating',
    };
  }

  Future<void> _load() async {
    final session = ref.read(playerSessionProvider);
    final activeGame = ref.read(activeGameProvider);
    final gameType = activeGame.gameType;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await ApiClient.get('/leaderboard/$gameType?limit=100');
      if (res is List) {
        _rows = res.whereType<Map<String, dynamic>>().toList();
      } else if (res is Map && res['leaderboard'] is List) {
        _rows = (res['leaderboard'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      } else {
        _rows = const [];
      }

      if (session.isAuthenticated && session.userId.isNotEmpty) {
        try {
          final rankRes =
              await ApiClient.get('/leaderboard/$gameType/rank/${session.userId}');
          if (rankRes is Map<String, dynamic>) _myRank = rankRes;
        } catch (_) {}

        try {
          final rRes = await ApiClient.get('/ratings/me');
          if (rRes is List) {
            _myRatings = rRes.whereType<Map<String, dynamic>>().toList();
          } else if (rRes is Map && rRes['ratings'] is List) {
            _myRatings = (rRes['ratings'] as List)
                .whereType<Map<String, dynamic>>()
                .toList();
          }
        } catch (_) {}
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _pickCountryFilter() async {
    String query = '';
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: HigColors.surfacePrimary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final filtered = searchOfficialCountries(query);
            return SafeArea(
              child: SizedBox(
                height: 460,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Filter by Country',
                              style: HigTypography.title3()),
                          if (_selectedCountry != null)
                            HigButton(
                              label: 'Clear',
                              size: HigButtonSize.small,
                              variant: HigButtonVariant.ghost,
                              onPressed: () {
                                setState(() => _selectedCountry = null);
                                Navigator.of(ctx).pop();
                              },
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      HigTextField(
                        placeholder: 'Search country...',
                        prefixIcon: CupertinoIcons.search,
                        onChanged: (v) => setSheetState(() => query = v),
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: ListView.separated(
                          itemCount: filtered.length + 1,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            if (i == 0) {
                              return ListTile(
                                leading: const Icon(
                                  CupertinoIcons.globe,
                                  size: 18,
                                  color: HigColors.labelSecondary,
                                ),
                                title: Text('All Countries (Worldwide)',
                                    style: HigTypography.headline()
                                        .copyWith(fontSize: 14)),
                                trailing: _selectedCountry == null
                                    ? const Icon(CupertinoIcons.checkmark_alt,
                                        color: HigColors.brand)
                                    : null,
                                onTap: () {
                                  setState(() => _selectedCountry = null);
                                  Navigator.of(ctx).pop();
                                },
                              );
                            }
                            final c = filtered[i - 1];
                            final sel = c.code == _selectedCountry;
                            return ListTile(
                              leading: CountryFlag(
                                code: c.code,
                                width: 24,
                                height: 16,
                              ),
                              title: Text(c.name,
                                  style: HigTypography.headline()
                                      .copyWith(fontSize: 14)),
                              subtitle: Text(c.region,
                                  style: HigTypography.caption()),
                              trailing: sel
                                  ? const Icon(CupertinoIcons.checkmark_alt,
                                      color: HigColors.brand)
                                  : Text(c.code,
                                      style: HigTypography.mono(size: 11.5)),
                              onTap: () {
                                setState(() => _selectedCountry = c.code);
                                Navigator.of(ctx).pop();
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
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<OfficialGame>(activeGameProvider, (prev, next) {
      if (prev?.id != next.id) _load();
    });
    final session = ref.watch(playerSessionProvider);
    final activeGame = ref.watch(activeGameProvider);
    final myRankNum = _myRank?['rank'];
    final isCompact = Responsive.isCompact(context);

    final filteredRows = _selectedCountry == null
        ? _rows
        : _rows.where((r) {
            final cc = (r['countryCode'] ?? r['country_code'] ?? '')
                .toString()
                .toUpperCase();
            return cc == _selectedCountry;
          }).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 980,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Per-Game Header Card (Pick any of the 21 games individually)
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 46,
                            height: 62,
                            child: GamePosterView(
                              game: activeGame,
                              borderRadius: 8,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [
                                    HigBadge(
                                      label: _scoringModelLabel(
                                          activeGame.gameType),
                                      tone: HigBadgeTone.copper,
                                    ),
                                    HigBadge(label: activeGame.primaryPlatform),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${activeGame.displayName} Standings',
                                  style: HigTypography.title2(),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  myRankNum != null
                                      ? 'Your rank: #$myRankNum · ${session.elo} Rating'
                                      : 'Select any game individually to inspect its ladder and ratings.',
                                  style: HigTypography.footnote(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          HigButton(
                            label: 'Game: ${activeGame.shortName}',
                            icon: CupertinoIcons.game_controller_solid,
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            onPressed: () => showGameSelectionSheet(
                              context,
                              ref,
                              onGameSelected: (_) => _load(),
                            ),
                          ),
                          GestureDetector(
                            onTap: _pickCountryFilter,
                            child: Container(
                              height: HigSpacing.buttonSmall,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: HigColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _selectedCountry != null
                                      ? HigColors.brand
                                      : HigColors.separator,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (_selectedCountry != null) ...[
                                    CountryFlag(
                                      code: _selectedCountry,
                                      width: 18,
                                      height: 12,
                                    ),
                                    const SizedBox(width: 6),
                                  ] else ...[
                                    const Icon(
                                      CupertinoIcons.globe,
                                      size: 14,
                                      color: HigColors.labelSecondary,
                                    ),
                                    const SizedBox(width: 6),
                                  ],
                                  Text(
                                    _selectedCountry == null
                                        ? 'All Countries'
                                        : (findCountryByCode(_selectedCountry)
                                                ?.name ??
                                            _selectedCountry!),
                                    style: HigTypography.headline(
                                      color: HigColors.labelPrimary,
                                    ).copyWith(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          HigButton(
                            label: 'Refresh',
                            icon: CupertinoIcons.refresh,
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            loading: _loading,
                            onPressed: _load,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      HigSegmentedControl<int>(
                        groupValue: _tab,
                        onChanged: (v) => setState(() => _tab = v),
                        segments: {
                          0: isCompact
                              ? '${activeGame.shortName} Ladder'
                              : '${activeGame.displayName} Standings',
                          1: 'My Ratings (${officialGames.length})',
                        },
                      ),
                    ],
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _load),
                ],

                const SizedBox(height: 14),

                if (_tab == 0)
                  _buildStandingsTab(
                    context,
                    session,
                    activeGame,
                    filteredRows,
                  )
                else
                  _buildMyRatingsTab(context, session),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStandingsTab(
    BuildContext context,
    PlayerSession session,
    OfficialGame activeGame,
    List<Map<String, dynamic>> rows,
  ) {
    if (_loading && rows.isEmpty) {
      return HigLoadingCard(
        message: 'Loading ${activeGame.displayName} standings...',
      );
    }
    if (rows.isEmpty) {
      return HigEmptyState(
        icon: CupertinoIcons.chart_bar,
        title: _selectedCountry != null
            ? 'No ranked players from ${findCountryByCode(_selectedCountry)?.name ?? _selectedCountry} yet'
            : 'No ranked matches recorded for ${activeGame.displayName} yet',
        subtitle:
            'Complete a verified duel or tournament match in ${activeGame.displayName} to appear on this ladder.',
        actionLabel: _selectedCountry != null ? 'Show All Countries' : null,
        onAction: _selectedCountry != null
            ? () => setState(() => _selectedCountry = null)
            : null,
      );
    }

    return GlassCard(
      radius: 16,
      padding: EdgeInsets.zero,
      child: Column(
        children: List.generate(rows.length, (i) {
          final r = rows[i];
          final rank = (r['rank'] as num?)?.toInt() ?? (i + 1);
          final username =
              (r['username'] ?? r['profiles']?['username'] ?? 'player')
                  .toString();
          final countryCode =
              (r['countryCode'] ?? r['country_code'] ?? '').toString();
          final rating = (r['rating'] ?? r['elo'] ?? 1000) as num;
          final wins = (r['wins'] as num?)?.toInt() ?? 0;
          final losses = (r['losses'] as num?)?.toInt() ?? 0;
          final gamesPlayed = (r['gamesPlayed'] as num?)?.toInt() ??
              (r['games_played'] as num?)?.toInt() ??
              (wins + losses);
          final winRate = gamesPlayed > 0
              ? ((wins / gamesPlayed) * 100).toStringAsFixed(0)
              : '0';
          final isMe = username.toLowerCase() == session.username.toLowerCase();

          return Column(
            children: [
              Container(
                color: isMe
                    ? HigColors.brand.withValues(alpha: 0.08)
                    : Colors.transparent,
                child: ListTile(
                  onTap: () => context.push('/profile/$username'),
                  leading: SizedBox(
                    width: 62,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 30,
                          child: Text(
                            '#$rank',
                            style: HigTypography.mono(
                              size: 12,
                              color: rank <= 3
                                  ? HigColors.brandBright
                                  : HigColors.labelSecondary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        EloLevelBadge(elo: rating.round(), size: 24),
                      ],
                    ),
                  ),
                  title: Row(
                    children: [
                      if (countryCode.isNotEmpty) ...[
                        CountryFlag(code: countryCode, width: 18, height: 12),
                        const SizedBox(width: 6),
                      ],
                      Expanded(
                        child: Text(
                          '@$username${isMe ? ' (You)' : ''}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              HigTypography.headline().copyWith(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                  subtitle: Text(
                    '${wins}W - ${losses}L · $winRate% WR',
                    style: HigTypography.caption(),
                  ),
                  trailing: Text(
                    '${rating.round()}',
                    style: HigTypography.mono(
                      size: 13.5,
                      color: HigColors.emerald,
                    ),
                  ),
                ),
              ),
              if (i < rows.length - 1) const Divider(height: 1),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildMyRatingsTab(BuildContext context, PlayerSession session) {
    final byType = <String, Map<String, dynamic>>{};
    for (final r in _myRatings) {
      final gt =
          (r['game_type'] ?? r['gameType'] ?? '').toString().toUpperCase();
      if (gt.isNotEmpty) byType[gt] = r;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= 820
            ? 3
            : constraints.maxWidth >= 520
                ? 2
                : 1;
        final width = (constraints.maxWidth - (cols - 1) * 12) / cols;

        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: officialGames.map((g) {
            final rec = byType[g.gameType.toUpperCase()];
            final rating = (rec?['rating'] as num?)?.round();
            final wins = (rec?['wins'] as num?)?.toInt() ?? 0;
            final losses = (rec?['losses'] as num?)?.toInt() ?? 0;
            final played = (rec?['games_played'] as num?)?.toInt() ??
                (wins + losses);

            return SizedBox(
              width: width,
              child: GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 38,
                          height: 50,
                          child: GamePosterView(game: g, borderRadius: 7),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
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
                                '${g.primaryPlatform} · ${_scoringModelLabel(g.gameType)}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: HigTypography.caption(),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (rating != null && played > 0)
                          EloLevelBadge(
                            elo: rating,
                            showNumeric: true,
                            size: 22,
                          )
                        else
                          Text(
                            'Unranked',
                            style: HigTypography.mono(
                              size: 12,
                              color: HigColors.labelTertiary,
                            ),
                          ),
                        Text(
                          played > 0 ? '${wins}W - ${losses}L' : '0 matches',
                          style: HigTypography.mono(
                            size: 11.5,
                            color: played > 0
                                ? HigColors.emerald
                                : HigColors.labelTertiary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    HigButton(
                      label: 'Compete in ${g.shortName}',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () {
                        ref.read(activeGameProvider.notifier).selectGame(g);
                        context.go('/challenges');
                      },
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
