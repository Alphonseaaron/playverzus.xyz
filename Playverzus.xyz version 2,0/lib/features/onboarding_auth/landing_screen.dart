import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/catalog/official_games.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../developer/developer_repository.dart';

/// Public Playverzus v2.0 Landing Page modeled on FACEIT's low-noise,
/// high-clarity vertical architecture tuned for Playverzus's Obsidian & Purple
/// identity and Kenya-first M-PESA / global Crossmint USDC competitive rails.
class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  static const List<String> _heroKeywords = ['GAME.', 'SKILL.', 'RANK.', 'SQUAD.'];
  static const List<String> _showcaseGameIds = [
    'eafc',
    'eafcm',
    'cs2',
    'cod',
    'tekken8',
    'val',
    'pubgm',
  ];
  static const List<String> _rankingGameIds = [
    'eafc',
    'eafcm',
    'cs2',
    'tekken8',
  ];

  final ScrollController _galleryController = ScrollController();
  Timer? _keywordTimer;
  int _keywordIndex = 0;
  String _selectedFormatGameId = 'eafc';
  String _selectedRankingGameId = 'eafc';
  bool _showSquadRankings = false;
  bool _gamesMenuOpen = false;

  @override
  void initState() {
    super.initState();
    _keywordTimer = Timer.periodic(const Duration(milliseconds: 2800), (_) {
      if (!mounted) return;
      setState(() => _keywordIndex = (_keywordIndex + 1) % _heroKeywords.length);
    });
  }

  @override
  void dispose() {
    _keywordTimer?.cancel();
    _galleryController.dispose();
    super.dispose();
  }

  OfficialGame _findGame(List<OfficialGame> catalog, String id) {
    return catalog.firstWhere(
      (g) => g.id == id,
      orElse: () => catalog.firstWhere(
        (g) => g.id == 'eafc',
        orElse: () => catalog.first,
      ),
    );
  }

  void _openGamesSearch(BuildContext context, List<OfficialGame> allGames) {
    setState(() => _gamesMenuOpen = false);
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (_) => _QuickGamesDialog(
        games: allGames,
        onSelectGame: (game) {
          Navigator.of(context).pop();
          _openGameQuickSheet(context, game);
        },
      ),
    );
  }

  void _openGameQuickSheet(BuildContext context, OfficialGame game) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _GamePreviewModal(
        game: game,
        onPlayNow: () {
          Navigator.of(ctx).pop();
          context.go('/signup');
        },
      ),
    );
  }

  void _scrollGalleryBy(double delta) {
    if (!_galleryController.hasClients) return;
    final target = (_galleryController.offset + delta).clamp(
      0.0,
      _galleryController.position.maxScrollExtent,
    );
    _galleryController.animateTo(
      target,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final allGames = ref.watch(allCatalogGamesProvider);
    final selectedFormatGame = _findGame(allGames, _selectedFormatGameId);
    final selectedRankingGame = _findGame(allGames, _selectedRankingGameId);
    final showcaseGames = _showcaseGameIds
        .map((id) => _findGame(allGames, id))
        .toSet()
        .toList();
    final rankingGames = _rankingGameIds
        .map((id) => _findGame(allGames, id))
        .toSet()
        .toList();

    return Scaffold(
      backgroundColor: HigColors.canvas,
      body: Stack(
        children: [
          Column(
            children: [
              _LandingNavBar(
                gamesMenuOpen: _gamesMenuOpen,
                onToggleGamesMenu: () =>
                    setState(() => _gamesMenuOpen = !_gamesMenuOpen),
                onOpenSearch: () => _openGamesSearch(context, allGames),
                onDownload: () => context.go('/download'),
                onSignIn: () => context.go('/login'),
                onPlayNow: () => context.go('/signup'),
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _HeroStageSection(
                        keyword: _heroKeywords[_keywordIndex],
                        leftGame: _findGame(allGames, 'eafc'),
                        rightGame: _findGame(allGames, 'cs2'),
                        onPlayNow: () => context.go('/signup'),
                      ),
                      _MoreThanMatchmakingSection(
                        showcaseGames: showcaseGames,
                        selectedGame: selectedFormatGame,
                        onSelectGame: (id) =>
                            setState(() => _selectedFormatGameId = id),
                        onPlayNow: () => context.go('/signup'),
                        onDownload: () => context.go('/download'),
                        onDeveloper: () => context.go('/signup?type=developer'),
                      ),
                      _RankingsSection(
                        rankingGames: rankingGames,
                        selectedGame: selectedRankingGame,
                        showSquads: _showSquadRankings,
                        onSelectGame: (id) =>
                            setState(() => _selectedRankingGameId = id),
                        onToggleMode: (squads) =>
                            setState(() => _showSquadRankings = squads),
                        onViewAll: () => context.go('/login'),
                      ),
                      _BiggerThanOneTitleSection(
                        games: allGames,
                        scrollController: _galleryController,
                        onScrollLeft: () => _scrollGalleryBy(-380),
                        onScrollRight: () => _scrollGalleryBy(380),
                        onTapGame: (g) => _openGameQuickSheet(context, g),
                        onGetStarted: () => context.go('/signup'),
                      ),
                      _FinalConversionBanner(
                        onPlayNow: () => context.go('/signup'),
                      ),
                      _LandingFooter(
                        onPlayNow: () => context.go('/signup'),
                        onSignIn: () => context.go('/login'),
                        onDownload: () => context.go('/download'),
                        onDeveloper: () => context.go('/signup?type=developer'),
                        onPrivacy: () => context.go('/privacy'),
                        onTerms: () => context.go('/terms'),
                        onResponsibleGaming: () =>
                            context.go('/responsible-gaming'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (_gamesMenuOpen)
            Positioned(
              top: 64 + MediaQuery.paddingOf(context).top,
              left: 0,
              right: 0,
              child: _GamesMegaMenu(
                games: showcaseGames,
                totalCount: allGames.length,
                onDismiss: () => setState(() => _gamesMenuOpen = false),
                onSelectGame: (game) {
                  setState(() {
                    _gamesMenuOpen = false;
                    _selectedFormatGameId = game.id;
                  });
                  _openGameQuickSheet(context, game);
                },
                onBrowseAll: () => _openGamesSearch(context, allGames),
              ),
            ),
        ],
      ),
    );
  }
}

TextStyle _displayStyle({
  required double size,
  Color color = HigColors.labelPrimary,
  double height = 1.04,
}) {
  return GoogleFonts.inter(
    fontSize: size,
    fontWeight: FontWeight.w900,
    letterSpacing: -1.1,
    height: height,
    color: color,
  );
}

class _LandingNavBar extends StatelessWidget {
  final bool gamesMenuOpen;
  final VoidCallback onToggleGamesMenu;
  final VoidCallback onOpenSearch;
  final VoidCallback onDownload;
  final VoidCallback onSignIn;
  final VoidCallback onPlayNow;

  const _LandingNavBar({
    required this.gamesMenuOpen,
    required this.onToggleGamesMenu,
    required this.onOpenSearch,
    required this.onDownload,
    required this.onSignIn,
    required this.onPlayNow,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final showCenterNav = width >= 860;
    final ultraNarrow = width < 420;

    return Container(
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(bottom: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1240),
            child: SizedBox(
              height: 62,
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: ultraNarrow ? 12 : 24),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: onPlayNow,
                      child: ultraNarrow
                          ? const BrandLogo.mark(height: 26)
                          : const BrandLogo.full(height: 24),
                    ),
                    const Spacer(),
                    if (showCenterNav) ...[
                      _NavBarItem(
                        label: 'GAMES',
                        trailingIcon: gamesMenuOpen
                            ? CupertinoIcons.chevron_up
                            : CupertinoIcons.chevron_down,
                        active: gamesMenuOpen,
                        onTap: onToggleGamesMenu,
                      ),
                      const SizedBox(width: 24),
                      _NavBarItem(label: 'DOWNLOAD', onTap: onDownload),
                      const SizedBox(width: 24),
                      _NavBarItem(
                        label: 'SEARCH',
                        leadingIcon: CupertinoIcons.search,
                        onTap: onOpenSearch,
                      ),
                      const Spacer(),
                    ] else ...[
                      IconButton(
                        onPressed: onOpenSearch,
                        tooltip: 'Search Games',
                        icon: const Icon(
                          CupertinoIcons.search,
                          size: 19,
                          color: HigColors.labelSecondary,
                        ),
                      ),
                      const SizedBox(width: 4),
                    ],
                    HigButton(
                      label: 'Sign In',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.ghost,
                      onPressed: onSignIn,
                    ),
                    const SizedBox(width: 8),
                    HigButton(
                      label: 'Play Now',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.primary,
                      onPressed: onPlayNow,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  final String label;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final bool active;
  final VoidCallback onTap;

  const _NavBarItem({
    required this.label,
    required this.onTap,
    this.leadingIcon,
    this.trailingIcon,
    this.active = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? HigColors.labelPrimary : HigColors.labelSecondary;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leadingIcon != null) ...[
                Icon(leadingIcon, size: 15, color: color),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.7,
                  color: color,
                ),
              ),
              if (trailingIcon != null) ...[
                const SizedBox(width: 5),
                Icon(trailingIcon, size: 12, color: color),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _GamesMegaMenu extends StatelessWidget {
  final List<OfficialGame> games;
  final int totalCount;
  final VoidCallback onDismiss;
  final ValueChanged<OfficialGame> onSelectGame;
  final VoidCallback onBrowseAll;

  const _GamesMegaMenu({
    required this.games,
    required this.totalCount,
    required this.onDismiss,
    required this.onSelectGame,
    required this.onBrowseAll,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        border: Border(
          bottom: BorderSide(color: HigColors.separator, width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1180),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'FEATURED ARENA TITLES ($totalCount)',
                    style: HigTypography.caption(color: HigColors.labelSecondary)
                        .copyWith(fontWeight: FontWeight.w700, letterSpacing: 1),
                  ),
                  const Spacer(),
                  HigButton(
                    label: 'Browse All ($totalCount)',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: onBrowseAll,
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: onDismiss,
                    icon: const Icon(
                      CupertinoIcons.xmark,
                      size: 16,
                      color: HigColors.labelSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: games.map((g) {
                  return InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () => onSelectGame(g),
                    child: Container(
                      width: 148,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: HigColors.surfaceGrouped,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: HigColors.separator),
                      ),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 34,
                            height: 46,
                            child: GamePosterView(game: g, borderRadius: 6),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              g.shortName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: HigTypography.footnote(
                                color: HigColors.labelPrimary,
                              ).copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroStageSection extends StatelessWidget {
  final String keyword;
  final OfficialGame leftGame;
  final OfficialGame rightGame;
  final VoidCallback onPlayNow;

  const _HeroStageSection({
    required this.keyword,
    required this.leftGame,
    required this.rightGame,
    required this.onPlayNow,
  });

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final width = MediaQuery.sizeOf(context).width;
    final desktopSplit = width >= 940;

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0E1017),
        border: Border(bottom: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: CustomPaint(
        painter: _HeroGeometricPainter(),
        child: HigMaxWidthContainer(
          maxWidth: 1200,
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 20 : 32,
            vertical: compact ? 44 : 84,
          ),
          child: desktopSplit
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: 5,
                      child: _HeroCopyColumn(
                        keyword: keyword,
                        compact: false,
                        onPlayNow: onPlayNow,
                      ),
                    ),
                    const SizedBox(width: 48),
                    Expanded(
                      flex: 6,
                      child: _HeroShowcaseTriad(
                        leftGame: leftGame,
                        rightGame: rightGame,
                        onTapCard: onPlayNow,
                      ),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HeroCopyColumn(
                      keyword: keyword,
                      compact: compact,
                      onPlayNow: onPlayNow,
                    ),
                    SizedBox(height: compact ? 36 : 48),
                    _HeroShowcaseTriad(
                      leftGame: leftGame,
                      rightGame: rightGame,
                      onTapCard: onPlayNow,
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _HeroCopyColumn extends StatelessWidget {
  final String keyword;
  final bool compact;
  final VoidCallback onPlayNow;

  const _HeroCopyColumn({
    required this.keyword,
    required this.compact,
    required this.onPlayNow,
  });

  @override
  Widget build(BuildContext context) {
    final headlineSize = compact ? 36.0 : 54.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CHALLENGE\nYOUR',
          style: _displayStyle(size: headlineSize),
        ),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: Text(
            keyword,
            key: ValueKey(keyword),
            style: _displayStyle(size: headlineSize, color: HigColors.brand),
          ),
        ),
        const SizedBox(height: 18),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Text(
            'Players come to Playverzus for competitive gaming at its best. Queue 1v1 duels, Blitz pools, or team rankings with zero ceiling.',
            style: HigTypography.body(color: HigColors.labelSecondary)
                .copyWith(fontSize: compact ? 14.5 : 15.5, height: 1.5),
          ),
        ),
        const SizedBox(height: 28),
        Wrap(
          spacing: 18,
          runSpacing: 14,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            HigButton(
              label: 'PLAY NOW',
              size: HigButtonSize.large,
              variant: HigButtonVariant.primary,
              onPressed: onPlayNow,
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: HigColors.emerald,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Kenya Phase 1 (M-PESA) · Ready Worldwide',
                    style: HigTypography.footnote(color: HigColors.labelPrimary)
                        .copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class _HeroShowcaseTriad extends StatelessWidget {
  final OfficialGame leftGame;
  final OfficialGame rightGame;
  final VoidCallback onTapCard;

  const _HeroShowcaseTriad({
    required this.leftGame,
    required this.rightGame,
    required this.onTapCard,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final cardHeight = (w * 0.42).clamp(176.0, 260.0);
        return SizedBox(
          height: cardHeight + 34,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 26),
                  child: _HeroContenderCard(
                    game: leftGame,
                    handle: 'ziyad_ke',
                    accent: HigColors.brand,
                    onTap: onTapCard,
                  ),
                ),
              ),
              SizedBox(width: w < 420 ? 10 : 16),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 26),
                  child: _HeroYouCard(onTap: onTapCard),
                ),
              ),
              SizedBox(width: w < 420 ? 10 : 16),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 26),
                  child: _HeroContenderCard(
                    game: rightGame,
                    handle: 'kuro_gg',
                    accent: const Color(0xFF06B6D4),
                    onTap: onTapCard,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _HeroContenderCard extends StatelessWidget {
  final OfficialGame game;
  final String handle;
  final Color accent;
  final VoidCallback onTap;

  const _HeroContenderCard({
    required this.game,
    required this.handle,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Stack(
            fit: StackFit.expand,
            children: [
              GamePosterView(game: game, borderRadius: 14),
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.12),
                      Colors.black.withValues(alpha: 0.78),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                    width: 1,
                  ),
                ),
              ),
              Positioned(
                left: 10,
                right: 10,
                bottom: 14,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        handle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      CupertinoIcons.checkmark_seal_fill,
                      size: 13,
                      color: accent,
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

class _HeroYouCard extends StatelessWidget {
  final VoidCallback onTap;
  const _HeroYouCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF131622),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: HigColors.brand.withValues(alpha: 0.55),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: HigColors.brand.withValues(alpha: 0.16),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: const BoxDecoration(
                  color: Color(0xFF202536),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.person_rounded,
                  size: 32,
                  color: Color(0xFF8B95A5),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'You',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroGeometricPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final facetPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.024)
      ..style = PaintingStyle.fill;

    final p1 = Path()
      ..moveTo(size.width * 0.52, 0)
      ..lineTo(size.width * 0.72, 0)
      ..lineTo(size.width * 0.48, size.height)
      ..lineTo(size.width * 0.28, size.height)
      ..close();
    canvas.drawPath(p1, facetPaint);

    final p2 = Path()
      ..moveTo(size.width * 0.76, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height * 0.65)
      ..lineTo(size.width * 0.62, size.height)
      ..lineTo(size.width * 0.54, size.height)
      ..close();
    canvas.drawPath(p2, facetPaint);

    final glowPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.65, -0.35),
        radius: 0.8,
        colors: [
          HigColors.brand.withValues(alpha: 0.14),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), glowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _MoreThanMatchmakingSection extends StatelessWidget {
  final List<OfficialGame> showcaseGames;
  final OfficialGame selectedGame;
  final ValueChanged<String> onSelectGame;
  final VoidCallback onPlayNow;
  final VoidCallback onDownload;
  final VoidCallback onDeveloper;

  const _MoreThanMatchmakingSection({
    required this.showcaseGames,
    required this.selectedGame,
    required this.onSelectGame,
    required this.onPlayNow,
    required this.onDownload,
    required this.onDeveloper,
  });

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final twoColumns = MediaQuery.sizeOf(context).width >= 760;

    final cards = [
      _FormatFeatureCard(
        badgeLabel: 'LIVE',
        badgeTone: HigBadgeTone.emerald,
        badgeDot: true,
        title: '1v1 & Squad Matchmaking',
        description:
            'Solo duels or squad lobbies in ${selectedGame.shortName} protected by Playverzus verification.',
        primaryActionLabel: 'PLAY NOW',
        onPrimaryAction: onPlayNow,
      ),
      _FormatFeatureCard(
        badgeLabel: '5-PLAYER PODS',
        badgeTone: HigBadgeTone.copper,
        title: 'Blitz Instant Pools',
        description:
            'Fill a 5-player sit-and-go bracket for ${selectedGame.shortName} and win 1st & 2nd cash payouts.',
        primaryActionLabel: 'JOIN BLITZ',
        onPrimaryAction: onPlayNow,
      ),
      _FormatFeatureCard(
        badgeLabel: 'KENYA FIRST · GLOBAL READY',
        badgeTone: HigBadgeTone.emerald,
        title: 'M-PESA & Global USDC',
        description:
            'Testing first in Kenya with instant M-PESA STK & withdrawals, ready worldwide via Visa, Apple Pay & USDC.',
        primaryActionLabel: 'Create Account',
        onPrimaryAction: onPlayNow,
      ),
      _FormatFeatureCard(
        badgeLabel: 'COMPANION & DEVELOPERS',
        badgeTone: HigBadgeTone.indigo,
        title: 'Verified Cups & Game APIs',
        description:
            'Native PC & Android companion telemetry paired with automated developer Stats APIs.',
        primaryActionLabel: 'DOWNLOAD CLIENT',
        onPrimaryAction: onDownload,
        secondaryActionLabel: 'DEVELOPER API',
        onSecondaryAction: onDeveloper,
      ),
    ];

    return HigMaxWidthContainer(
      maxWidth: 1200,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 20 : 32,
        vertical: compact ? 52 : 84,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'MORE THAN\nMATCHMAKING.',
            style: _displayStyle(size: compact ? 30 : 42),
          ),
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Text(
              'Playverzus is home to every ambition, offering distinct competitive formats across supported titles for every player and squad.',
              style: HigTypography.body(color: HigColors.labelSecondary)
                  .copyWith(fontSize: 14.5),
            ),
          ),
          const SizedBox(height: 28),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: showcaseGames.map((g) {
              final selected = g.id == selectedGame.id;
              return _PureCoverPill(
                game: g,
                width: compact ? 48 : 58,
                height: compact ? 66 : 80,
                selected: selected,
                onTap: () => onSelectGame(g.id),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),
          if (twoColumns) ...[
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 18),
                  Expanded(child: cards[1]),
                ],
              ),
            ),
            const SizedBox(height: 18),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: cards[2]),
                  const SizedBox(width: 18),
                  Expanded(child: cards[3]),
                ],
              ),
            ),
          ] else ...[
            cards[0],
            const SizedBox(height: 14),
            cards[1],
            const SizedBox(height: 14),
            cards[2],
            const SizedBox(height: 14),
            cards[3],
          ],
        ],
      ),
    );
  }
}

class _FormatFeatureCard extends StatelessWidget {
  final String badgeLabel;
  final HigBadgeTone badgeTone;
  final bool badgeDot;
  final String title;
  final String description;
  final String primaryActionLabel;
  final VoidCallback onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  const _FormatFeatureCard({
    required this.badgeLabel,
    required this.badgeTone,
    required this.title,
    required this.description,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
    this.badgeDot = false,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: HigColors.surfacePrimary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: HigColors.separator, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              HigBadge(
                label: badgeLabel,
                tone: badgeTone,
                icon: badgeDot ? Icons.circle : null,
              ),
              const SizedBox(height: 14),
              Text(title, style: HigTypography.title3()),
              const SizedBox(height: 8),
              Text(
                description,
                style: HigTypography.footnote(color: HigColors.labelSecondary)
                    .copyWith(fontSize: 13.5, height: 1.48),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _OutlinedAccentButton(
                label: primaryActionLabel,
                onTap: onPrimaryAction,
              ),
              if (secondaryActionLabel != null && onSecondaryAction != null)
                _OutlinedAccentButton(
                  label: secondaryActionLabel!,
                  onTap: onSecondaryAction!,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OutlinedAccentButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _OutlinedAccentButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
          decoration: BoxDecoration(
            color: HigColors.brand.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: HigColors.brand.withValues(alpha: 0.65),
              width: 1,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
              color: HigColors.brandBright,
            ),
          ),
        ),
      ),
    );
  }
}

class _PureCoverPill extends StatelessWidget {
  final OfficialGame game;
  final double width;
  final double height;
  final bool selected;
  final VoidCallback onTap;

  const _PureCoverPill({
    required this.game,
    required this.width,
    required this.height,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: game.displayName,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 140),
            width: width,
            height: height,
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? HigColors.brand : Colors.transparent,
                width: 2,
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: HigColors.brand.withValues(alpha: 0.28),
                        blurRadius: 12,
                      ),
                    ]
                  : null,
            ),
            child: Opacity(
              opacity: selected ? 1.0 : 0.72,
              child: GamePosterView(game: game, borderRadius: 7),
            ),
          ),
        ),
      ),
    );
  }
}

class _RankingsSection extends StatelessWidget {
  final List<OfficialGame> rankingGames;
  final OfficialGame selectedGame;
  final bool showSquads;
  final ValueChanged<String> onSelectGame;
  final ValueChanged<bool> onToggleMode;
  final VoidCallback onViewAll;

  const _RankingsSection({
    required this.rankingGames,
    required this.selectedGame,
    required this.showSquads,
    required this.onSelectGame,
    required this.onToggleMode,
    required this.onViewAll,
  });

  static List<_SamplePlayerRow> _playerRowsFor(String gameId) {
    if (gameId == 'cs2') {
      return const [
        _SamplePlayerRow(1, 'maverick_ke', 'KE', 2410),
        _SamplePlayerRow(2, 'kuro_gg', 'GB', 2285),
        _SamplePlayerRow(3, 'donk_nbo', 'KE', 2140),
        _SamplePlayerRow(4, 'nexa_za', 'ZA', 1980),
        _SamplePlayerRow(5, 'ryze_eu', 'DE', 1875),
      ];
    }
    if (gameId == 'tekken8') {
      return const [
        _SamplePlayerRow(1, 'jin_nairobi', 'KE', 2290),
        _SamplePlayerRow(2, 'kazuya_ke', 'KE', 2120),
        _SamplePlayerRow(3, 'devil_uk', 'GB', 1995),
        _SamplePlayerRow(4, 'reina_ng', 'NG', 1860),
        _SamplePlayerRow(5, 'law_us', 'US', 1730),
      ];
    }
    return const [
      _SamplePlayerRow(1, 'ziyad_fc', 'KE', 2380),
      _SamplePlayerRow(2, 'otieno_10', 'KE', 2190),
      _SamplePlayerRow(3, 'salim_pro', 'TZ', 2045),
      _SamplePlayerRow(4, 'wellington', 'GB', 1910),
      _SamplePlayerRow(5, 'khalid_fc', 'AE', 1785),
    ];
  }

  static const List<_SampleSquadRow> _squadRows = [
    _SampleSquadRow(1, 'Nairobi Wolves', 'KE', 14, 12, 2, 36),
    _SampleSquadRow(2, 'Mombasa Apex', 'KE', 14, 11, 3, 33),
    _SampleSquadRow(3, 'Eldoret Five', 'KE', 13, 10, 3, 30),
    _SampleSquadRow(4, 'Lagos Legion', 'NG', 14, 10, 4, 30),
    _SampleSquadRow(5, 'London Royals', 'GB', 13, 9, 4, 27),
  ];

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final playerRows = _playerRowsFor(selectedGame.id);

    return HigMaxWidthContainer(
      maxWidth: 1200,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 20 : 32,
        vertical: compact ? 44 : 76,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Text(
              'RANKINGS FOR BOTH\nINDIVIDUAL PLAYERS\nAND TEAMS.',
              style: _displayStyle(size: compact ? 28 : 40),
            ),
          ),
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Text(
              'Climb Level 1–10 ELO rankings in ${selectedGame.displayName} as a solo player or squad, tracked first across Kenya and built for global seasons.',
              style: HigTypography.body(color: HigColors.labelSecondary)
                  .copyWith(fontSize: 14.5),
            ),
          ),
          const SizedBox(height: 26),
          LayoutBuilder(
            builder: (context, constraints) {
              final narrow = constraints.maxWidth < 560;
              final pills = Wrap(
                spacing: 10,
                runSpacing: 10,
                children: rankingGames.map((g) {
                  return _PureCoverPill(
                    game: g,
                    width: 44,
                    height: 62,
                    selected: g.id == selectedGame.id,
                    onTap: () => onSelectGame(g.id),
                  );
                }).toList(),
              );
              final switcher = SizedBox(
                width: narrow ? double.infinity : 210,
                child: HigSegmentedControl<bool>(
                  groupValue: showSquads,
                  segments: const {false: 'Players', true: 'Teams'},
                  onChanged: onToggleMode,
                ),
              );

              if (narrow) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [pills, const SizedBox(height: 16), switcher],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: pills),
                  const SizedBox(width: 16),
                  switcher,
                ],
              );
            },
          ),
          const SizedBox(height: 22),
          LayoutBuilder(
            builder: (context, constraints) {
              final dense = constraints.maxWidth < 620;
              return Container(
                decoration: BoxDecoration(
                  color: HigColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: HigColors.separator, width: 1),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    _RankTableHeader(
                      showSquads: showSquads,
                      dense: dense,
                    ),
                    if (!showSquads)
                      ...playerRows.map(
                        (r) => _PlayerRankRowView(
                          row: r,
                          dense: dense,
                          onTap: onViewAll,
                        ),
                      )
                    else
                      ..._squadRows.map(
                        (r) => _SquadRankRowView(
                          row: r,
                          dense: dense,
                          onTap: onViewAll,
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Illustrative Division 1–10 tiers · Sign in to inspect live player standings.',
                  style: HigTypography.caption(color: HigColors.labelTertiary),
                ),
              ),
              TextButton(
                onPressed: onViewAll,
                child: Text(
                  'Leaderboards →',
                  style: HigTypography.footnote(color: HigColors.brandBright)
                      .copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RankTableHeader extends StatelessWidget {
  final bool showSquads;
  final bool dense;
  const _RankTableHeader({required this.showSquads, required this.dense});

  @override
  Widget build(BuildContext context) {
    final style = HigTypography.caption(color: HigColors.labelTertiary)
        .copyWith(fontWeight: FontWeight.w700);
    return Container(
      color: HigColors.surfaceGrouped,
      padding: EdgeInsets.symmetric(horizontal: dense ? 14 : 20, vertical: 13),
      child: Row(
        children: [
          SizedBox(width: dense ? 34 : 52, child: Text('Rank', style: style)),
          Expanded(
            flex: 3,
            child: Text(showSquads ? 'Team' : 'Player', style: style),
          ),
          if (!dense) ...[
            Expanded(
              flex: 2,
              child: Text('Country', style: style),
            ),
            if (!showSquads) ...[
              SizedBox(width: 96, child: Text('Skill level', style: style)),
              SizedBox(
                width: 72,
                child: Text('ELO', textAlign: TextAlign.right, style: style),
              ),
            ] else ...[
              SizedBox(
                width: 68,
                child: Text('Matches', textAlign: TextAlign.center, style: style),
              ),
              SizedBox(
                width: 52,
                child: Text('Win', textAlign: TextAlign.center, style: style),
              ),
              SizedBox(
                width: 52,
                child: Text('Loss', textAlign: TextAlign.center, style: style),
              ),
              SizedBox(
                width: 64,
                child: Text('Points', textAlign: TextAlign.right, style: style),
              ),
            ],
          ] else ...[
            SizedBox(width: 34, child: Text('Flag', style: style)),
            SizedBox(
              width: 72,
              child: Text(
                showSquads ? 'Pts' : 'ELO',
                textAlign: TextAlign.right,
                style: style,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PlayerRankRowView extends StatelessWidget {
  final _SamplePlayerRow row;
  final bool dense;
  final VoidCallback onTap;

  const _PlayerRankRowView({
    required this.row,
    required this.dense,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: dense ? 14 : 20, vertical: 15),
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: HigColors.separator, width: 0.7)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: dense ? 34 : 52,
              child: Text(
                '${row.rank}',
                style: HigTypography.mono(
                  size: 13.5,
                  color: HigColors.labelPrimary,
                ),
              ),
            ),
            Expanded(
              flex: 3,
              child: Row(
                children: [
                  Container(
                    width: dense ? 30 : 36,
                    height: dense ? 30 : 36,
                    decoration: BoxDecoration(
                      color: HigColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      row.handle.substring(0, 1).toUpperCase(),
                      style: HigTypography.headline(color: HigColors.brandBright),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      row.handle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: HigTypography.subheadline(
                        color: HigColors.labelPrimary,
                      ).copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(width: 5),
                  const Icon(
                    CupertinoIcons.checkmark_seal_fill,
                    size: 13,
                    color: HigColors.brand,
                  ),
                ],
              ),
            ),
            if (!dense) ...[
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: CountryFlag(code: row.countryCode, width: 22, height: 15),
                ),
              ),
              SizedBox(
                width: 96,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: EloLevelBadge(elo: row.elo, showNumeric: true, size: 22),
                ),
              ),
              SizedBox(
                width: 72,
                child: Text(
                  '${row.elo}',
                  textAlign: TextAlign.right,
                  style: HigTypography.mono(
                    size: 13.5,
                    weight: FontWeight.w700,
                    color: HigColors.labelPrimary,
                  ),
                ),
              ),
            ] else ...[
              SizedBox(
                width: 34,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: CountryFlag(code: row.countryCode, width: 20, height: 14),
                ),
              ),
              SizedBox(
                width: 72,
                child: Text(
                  '${row.elo}',
                  textAlign: TextAlign.right,
                  style: HigTypography.mono(size: 13, weight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SquadRankRowView extends StatelessWidget {
  final _SampleSquadRow row;
  final bool dense;
  final VoidCallback onTap;

  const _SquadRankRowView({
    required this.row,
    required this.dense,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: dense ? 14 : 20, vertical: 15),
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: HigColors.separator, width: 0.7)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: dense ? 34 : 52,
              child: Text('${row.rank}', style: HigTypography.mono(size: 13.5)),
            ),
            Expanded(
              flex: 3,
              child: Row(
                children: [
                  Container(
                    width: dense ? 30 : 36,
                    height: dense ? 30 : 36,
                    decoration: BoxDecoration(
                      color: HigColors.brand.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.shield_rounded,
                      size: 16,
                      color: HigColors.brandBright,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      row.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: HigTypography.subheadline(
                        color: HigColors.labelPrimary,
                      ).copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            if (!dense) ...[
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: CountryFlag(code: row.countryCode, width: 22, height: 15),
                ),
              ),
              SizedBox(
                width: 68,
                child: Text(
                  '${row.matches}',
                  textAlign: TextAlign.center,
                  style: HigTypography.mono(size: 13),
                ),
              ),
              SizedBox(
                width: 52,
                child: Text(
                  '${row.wins}',
                  textAlign: TextAlign.center,
                  style: HigTypography.mono(size: 13, color: HigColors.emerald),
                ),
              ),
              SizedBox(
                width: 52,
                child: Text(
                  '${row.losses}',
                  textAlign: TextAlign.center,
                  style: HigTypography.mono(
                    size: 13,
                    color: HigColors.labelSecondary,
                  ),
                ),
              ),
              SizedBox(
                width: 64,
                child: Text(
                  '${row.points}',
                  textAlign: TextAlign.right,
                  style: HigTypography.mono(size: 13.5, weight: FontWeight.w700),
                ),
              ),
            ] else ...[
              SizedBox(
                width: 34,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: CountryFlag(code: row.countryCode, width: 20, height: 14),
                ),
              ),
              SizedBox(
                width: 72,
                child: Text(
                  '${row.points} pts',
                  textAlign: TextAlign.right,
                  style: HigTypography.mono(size: 13, weight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BiggerThanOneTitleSection extends StatelessWidget {
  final List<OfficialGame> games;
  final ScrollController scrollController;
  final VoidCallback onScrollLeft;
  final VoidCallback onScrollRight;
  final ValueChanged<OfficialGame> onTapGame;
  final VoidCallback onGetStarted;

  const _BiggerThanOneTitleSection({
    required this.games,
    required this.scrollController,
    required this.onScrollLeft,
    required this.onScrollRight,
    required this.onTapGame,
    required this.onGetStarted,
  });

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    return HigMaxWidthContainer(
      maxWidth: 1120,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 20 : 32,
        vertical: compact ? 52 : 84,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Text(
              'THE SPORT OF\nGAMING IS BIGGER\nTHAN ONE TITLE.',
              textAlign: TextAlign.center,
              style: _displayStyle(size: compact ? 30 : 42),
            ),
          ),
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 580),
            child: Text(
              'Every game on Playverzus carries its own competitive formats: 1v1 duels, 5-player Blitz pools, and Cups across ${games.length}+ PC, console, and mobile titles — rolling out first in Kenya with M-PESA and ready for the world.',
              textAlign: TextAlign.center,
              style: HigTypography.footnote(color: HigColors.labelSecondary)
                  .copyWith(fontSize: 14, height: 1.55),
            ),
          ),
          const SizedBox(height: 36),
          SizedBox(
            height: compact ? 156 : 182,
            child: Stack(
              children: [
                ListView.separated(
                  controller: scrollController,
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.symmetric(horizontal: compact ? 12 : 44),
                  itemCount: games.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    final game = games[index];
                    return Tooltip(
                      message: game.displayName,
                      child: MouseRegion(
                        cursor: SystemMouseCursors.click,
                        child: GestureDetector(
                          onTap: () => onTapGame(game),
                          child: AspectRatio(
                            aspectRatio: 0.72,
                            child: GamePosterView(game: game, borderRadius: 10),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: compact ? 28 : 72,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            HigColors.canvas,
                            HigColors.canvas.withValues(alpha: 0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: compact ? 28 : 72,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerRight,
                          end: Alignment.centerLeft,
                          colors: [
                            HigColors.canvas,
                            HigColors.canvas.withValues(alpha: 0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                if (!compact) ...[
                  Positioned(
                    left: 4,
                    top: 66,
                    child: _GalleryArrowButton(
                      icon: CupertinoIcons.chevron_left,
                      onTap: onScrollLeft,
                    ),
                  ),
                  Positioned(
                    right: 4,
                    top: 66,
                    child: _GalleryArrowButton(
                      icon: CupertinoIcons.chevron_right,
                      onTap: onScrollRight,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 36),
          _OutlinedAccentButton(
            label: 'GET STARTED NOW',
            onTap: onGetStarted,
          ),
        ],
      ),
    );
  }
}

class _GalleryArrowButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _GalleryArrowButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: HigColors.surfacePrimary.withValues(alpha: 0.92),
      shape: const CircleBorder(side: BorderSide(color: HigColors.separator)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, size: 16, color: HigColors.labelPrimary),
        ),
      ),
    );
  }
}

class _FinalConversionBanner extends StatelessWidget {
  final VoidCallback onPlayNow;

  const _FinalConversionBanner({required this.onPlayNow});

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final size = compact ? 30.0 : 44.0;
    return HigMaxWidthContainer(
      maxWidth: 920,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 20 : 32,
        vertical: compact ? 56 : 92,
      ),
      child: Column(
        children: [
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'READY TO CHALLENGE\nYOUR ',
                  style: _displayStyle(size: size),
                ),
                TextSpan(
                  text: 'GAME?',
                  style: _displayStyle(size: size, color: HigColors.brand),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          HigButton(
            label: 'PLAY NOW',
            size: HigButtonSize.large,
            variant: HigButtonVariant.primary,
            onPressed: onPlayNow,
          ),
        ],
      ),
    );
  }
}

class _LandingFooter extends StatelessWidget {
  final VoidCallback onPlayNow;
  final VoidCallback onSignIn;
  final VoidCallback onDownload;
  final VoidCallback onDeveloper;
  final VoidCallback onPrivacy;
  final VoidCallback onTerms;
  final VoidCallback onResponsibleGaming;

  const _LandingFooter({
    required this.onPlayNow,
    required this.onSignIn,
    required this.onDownload,
    required this.onDeveloper,
    required this.onPrivacy,
    required this.onTerms,
    required this.onResponsibleGaming,
  });

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final wide = MediaQuery.sizeOf(context).width >= 820;

    final brandUtilityColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const BrandLogo.full(height: 24),
        const SizedBox(height: 18),
        Text(
          'Playverzus Companion',
          style: HigTypography.caption(color: HigColors.labelTertiary),
        ),
        const SizedBox(height: 8),
        HigButton(
          label: 'DOWNLOAD THE CLIENT',
          size: HigButtonSize.small,
          variant: HigButtonVariant.primary,
          onPressed: onDownload,
        ),
        const SizedBox(height: 18),
        const Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CountryFlag(code: 'KE', width: 20, height: 14),
            BrandLogo.kopokopo(height: 20),
            BrandLogo.crossmintMark(height: 18),
          ],
        ),
      ],
    );

    final platformLinks = _FooterLinkColumn(
      heading: 'Platform',
      items: [
        _FooterLinkItem('Play 1v1 & Blitz', onPlayNow),
        _FooterLinkItem('Leaderboards', onSignIn),
        _FooterLinkItem('Download Client', onDownload),
        _FooterLinkItem('Sign In', onSignIn),
      ],
    );
    final ecosystemLinks = _FooterLinkColumn(
      heading: 'Ecosystem',
      items: [
        _FooterLinkItem('Game Developers', onDeveloper),
        _FooterLinkItem('Ground Agents', onSignIn),
        _FooterLinkItem('5-Pillar Anti-Cheat', onDownload),
        _FooterLinkItem('Cashier & Payouts', onSignIn),
      ],
    );
    final legalLinks = _FooterLinkColumn(
      heading: 'Support & Info',
      items: [
        _FooterLinkItem('Privacy Policy', onPrivacy),
        _FooterLinkItem('Terms of Service', onTerms),
        _FooterLinkItem('Responsible Gaming', onResponsibleGaming),
      ],
    );

    return Container(
      decoration: const BoxDecoration(
        color: HigColors.canvas,
        border: Border(top: BorderSide(color: HigColors.separator, width: 1)),
      ),
      child: HigMaxWidthContainer(
        maxWidth: 1200,
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 20 : 32,
          vertical: compact ? 40 : 56,
        ),
        child: wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: brandUtilityColumn),
                  const SizedBox(width: 40),
                  Expanded(flex: 2, child: platformLinks),
                  Expanded(flex: 2, child: ecosystemLinks),
                  Expanded(flex: 2, child: legalLinks),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  brandUtilityColumn,
                  const SizedBox(height: 36),
                  Wrap(
                    spacing: 40,
                    runSpacing: 28,
                    children: [
                      platformLinks,
                      ecosystemLinks,
                      legalLinks,
                    ],
                  ),
                ],
              ),
      ),
    );
  }
}

class _FooterLinkColumn extends StatelessWidget {
  final String heading;
  final List<_FooterLinkItem> items;

  const _FooterLinkColumn({required this.heading, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          heading,
          style: HigTypography.caption(color: HigColors.labelTertiary)
              .copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: item.onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  item.label,
                  style: HigTypography.footnote(color: HigColors.labelSecondary)
                      .copyWith(fontSize: 13.5),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _FooterLinkItem {
  final String label;
  final VoidCallback onTap;
  const _FooterLinkItem(this.label, this.onTap);
}

class _QuickGamesDialog extends StatefulWidget {
  final List<OfficialGame> games;
  final ValueChanged<OfficialGame> onSelectGame;

  const _QuickGamesDialog({required this.games, required this.onSelectGame});

  @override
  State<_QuickGamesDialog> createState() => _QuickGamesDialogState();
}

class _QuickGamesDialogState extends State<_QuickGamesDialog> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? widget.games
        : widget.games
            .where(
              (g) =>
                  g.displayName.toLowerCase().contains(q) ||
                  g.shortName.toLowerCase().contains(q) ||
                  g.platforms.any((p) => p.toLowerCase().contains(q)),
            )
            .toList();

    return Dialog(
      backgroundColor: HigColors.surfacePrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: HigColors.separator),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 540),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: HigTextField(
                      placeholder: 'Search ${widget.games.length} arena games...',
                      prefixIcon: CupertinoIcons.search,
                      autofocus: true,
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(
                      CupertinoIcons.xmark,
                      size: 16,
                      color: HigColors.labelSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          'No matching games found',
                          style: HigTypography.footnote(),
                        ),
                      )
                    : ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const Divider(
                          height: 1,
                          color: HigColors.separator,
                        ),
                        itemBuilder: (_, index) {
                          final g = filtered[index];
                          return ListTile(
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 4),
                            leading: SizedBox(
                              width: 36,
                              height: 48,
                              child: GamePosterView(game: g, borderRadius: 6),
                            ),
                            title: Text(
                              g.displayName,
                              style: HigTypography.subheadline(
                                color: HigColors.labelPrimary,
                              ),
                            ),
                            subtitle: Text(
                              g.platformSummary,
                              style: HigTypography.caption(),
                            ),
                            trailing: const Icon(
                              CupertinoIcons.chevron_right,
                              size: 14,
                              color: HigColors.labelTertiary,
                            ),
                            onTap: () => widget.onSelectGame(g),
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

class _GamePreviewModal extends StatelessWidget {
  final OfficialGame game;
  final VoidCallback onPlayNow;

  const _GamePreviewModal({required this.game, required this.onPlayNow});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: HigColors.surfacePrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: HigColors.separator)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Center(
        widthFactor: 1,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
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
              const SizedBox(height: 18),
              Row(
                children: [
                  SizedBox(
                    width: 68,
                    height: 92,
                    child: GamePosterView(game: game, borderRadius: 10),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(game.displayName, style: HigTypography.title2()),
                        const SizedBox(height: 4),
                        Text(
                          game.platformSummary,
                          style: HigTypography.caption(
                            color: HigColors.brandBright,
                          ).copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          game.tagline,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: HigTypography.footnote(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              HigButton(
                label: 'Play ${game.shortName} Now',
                fullWidth: true,
                size: HigButtonSize.large,
                onPressed: onPlayNow,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SamplePlayerRow {
  final int rank;
  final String handle;
  final String countryCode;
  final int elo;
  const _SamplePlayerRow(this.rank, this.handle, this.countryCode, this.elo);
}

class _SampleSquadRow {
  final int rank;
  final String name;
  final String countryCode;
  final int matches;
  final int wins;
  final int losses;
  final int points;
  const _SampleSquadRow(
    this.rank,
    this.name,
    this.countryCode,
    this.matches,
    this.wins,
    this.losses,
    this.points,
  );
}
