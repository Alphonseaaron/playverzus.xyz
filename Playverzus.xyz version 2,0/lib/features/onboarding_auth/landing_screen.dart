import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../developer/developer_repository.dart';

/// FACEIT-Architecture Public Landing Page (`/`).
/// Built in Playverzus's authentic Electric Purple (#8B5CF6) & Deep Obsidian (#0B0C10) palette.
/// Strictly public: contains ZERO logged-in user data and ZERO redundant/sheepish buttons.
class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  static const List<String> _heroRibbonGameIds = [
    'eafc',
    'cs2',
    'cod',
    'tekken8',
    'pubgm',
    'val',
    'dota2',
    'chess',
  ];

  final ScrollController _scrollCtrl = ScrollController();
  final TextEditingController _roomCodeCtrl = TextEditingController();
  final GlobalKey _gamesSectionKey = GlobalKey();
  final GlobalKey _skillLevelsKey = GlobalKey();
  final GlobalKey _howItWorksKey = GlobalKey();
  final GlobalKey _rolloutKey = GlobalKey();
  final GlobalKey _pillarsKey = GlobalKey();
  final GlobalKey _faqKey = GlobalKey();

  String _spotlightId = 'eafc';
  String _searchQuery = '';
  GamePlatformFilter _platformFilter = GamePlatformFilter.all;
  int? _openFaq = 0;

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _roomCodeCtrl.dispose();
    super.dispose();
  }

  void _scrollToSection(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx != null) {
      HapticFeedback.selectionClick();
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _handleRoomCodeJoin() {
    final code = _roomCodeCtrl.text.trim().toUpperCase();
    HapticFeedback.mediumImpact();
    if (code.isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter a Match Room Code',
            body:
                'Paste the room code shared by your opponent (e.g. PVZ-8F2A) to jump into their matchroom.',
            tone: ToastTone.info,
          );
      return;
    }
    ref.read(toastProvider.notifier).show(
          'Room $code Ready',
          body: 'Sign in or create an account to take Side B in room $code.',
          tone: ToastTone.info,
        );
    context.go('/login');
  }

  List<String> _stakeTierLabels(PaymentGatewayMode gateway) {
    const usdTiers = [0.0, 2.5, 5.0, 10.0, 25.0];
    return usdTiers.map((usd) {
      if (usd == 0) return 'FREE PTS';
      if (gateway == PaymentGatewayMode.kopokopo) {
        return 'KES ${(usd * AppConfig.usdToKesRate).round()}';
      }
      return '\$${usd.toStringAsFixed(2)}';
    }).toList();
  }

  void _showGameArenaPreviewSheet(
    BuildContext context,
    OfficialGame game,
    PaymentGatewayMode gateway,
  ) {
    HapticFeedback.selectionClick();
    final tiers = _stakeTierLabels(gateway);

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          constraints: const BoxConstraints(maxWidth: 640),
          decoration: const BoxDecoration(
            color: HigColors.surfacePrimary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
            border: Border(
              top: BorderSide(color: HigColors.separator, width: 1),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 170,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          GamePosterView(
                            game: game,
                            useBanner: true,
                            borderRadius: 0,
                          ),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.2),
                                  HigColors.surfacePrimary,
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 14,
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 52,
                                  height: 68,
                                  child: GamePosterView(
                                    game: game,
                                    borderRadius: 10,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 4,
                                        children: [
                                          HigBadge(
                                            label: game.platformSummary,
                                            tone: HigBadgeTone.copper,
                                          ),
                                          HigBadge(
                                            label: game.gameType
                                                .replaceAll('_', ' '),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        game.displayName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: HigTypography.title2(),
                                      ),
                                      Text(
                                        game.tagline,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: HigTypography.caption(),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: HigColors.surfaceGrouped,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: HigColors.separator),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _specRow(
                          'Required Handle',
                          '${game.gamertagLabel} (${game.gamertagPlaceholder})',
                        ),
                        const Divider(height: 18),
                        _specRow(
                          'Match Formats',
                          '1v1 Room Code · Open Duels · 5-Player Blitz Brackets',
                        ),
                        const Divider(height: 18),
                        _specRow(
                          'Skill Ladder',
                          'Independent ${game.shortName} ELO (Level 1–10)',
                        ),
                        const Divider(height: 18),
                        _specRow(
                          'Verification',
                          game.isDeveloperApiGame
                              ? 'Live Studio Stats API (${game.studioName ?? 'Verified Studio'})'
                              : game.effectiveLaunchUri != null
                                  ? 'Native Companion Auto-Launch & Scoreboard Lock'
                                  : 'Console Stream / Match Telemetry Verification',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text('Official Stake Tiers', style: HigTypography.caption()),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: tiers.map((t) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: HigColors.surfaceGrouped,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: HigColors.separator),
                        ),
                        child: Text(
                          t,
                          style: HigTypography.mono(
                            size: 11,
                            color: HigColors.labelPrimary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  HigButton(
                    label: 'Compete in ${game.shortName}',
                    icon: CupertinoIcons.bolt_fill,
                    size: HigButtonSize.large,
                    fullWidth: true,
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      context.go('/signup');
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

  Widget _specRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(label, style: HigTypography.caption()),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: HigTypography.footnote(color: HigColors.labelPrimary)
                .copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCompact = Responsive.isCompact(context);
    final tier = Responsive.tierOf(context);
    final isDesktop =
        tier == ScreenTier.expanded || tier == ScreenTier.ultraWide;
    final gateway = ref.watch(paymentGatewayProvider);
    final allGames = ref.watch(allCatalogGamesProvider);

    final spotlightGame = findAnyCatalogGame(allGames, _spotlightId);
    final stakeTiers = _stakeTierLabels(gateway);

    final filteredGames = allGames.where((g) {
      if (!g.matchesPlatformFilter(_platformFilter)) return false;
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return g.displayName.toLowerCase().contains(q) ||
          g.shortName.toLowerCase().contains(q) ||
          g.platformSummary.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: HigColors.canvas,
      body: Stack(
        children: [
          Column(
            children: [
              // ── FACEIT-STYLE STICKY TOP NAVIGATION BAR ──
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
                    child: HigMaxWidthContainer(
                      padding: EdgeInsets.symmetric(
                        horizontal: isCompact ? 14 : 24,
                      ),
                      child: Row(
                        children: [
                          isCompact
                              ? const BrandLogo.mark(height: 26)
                              : const BrandLogo.full(height: 26),
                          if (isDesktop) ...[
                            const SizedBox(width: 18),
                            Expanded(
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    _headerAnchorButton(
                                      'GAMES (${allGames.length})',
                                      () => _scrollToSection(_gamesSectionKey),
                                    ),
                                    _headerAnchorButton(
                                      'SKILL LEVELS',
                                      () => _scrollToSection(_skillLevelsKey),
                                    ),
                                    _headerAnchorButton(
                                      'HOW IT WORKS',
                                      () => _scrollToSection(_howItWorksKey),
                                    ),
                                    _headerAnchorButton(
                                      'GLOBAL ROLLOUT',
                                      () => _scrollToSection(_rolloutKey),
                                    ),
                                    _headerAnchorButton(
                                      'ANTI-CHEAT & API',
                                      () => _scrollToSection(_pillarsKey),
                                    ),
                                    _headerAnchorButton(
                                      'FAQ',
                                      () => _scrollToSection(_faqKey),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                          ] else
                            const Spacer(),
                          HigButton(
                            label: 'Sign In',
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.ghost,
                            onPressed: () => context.go('/login'),
                          ),
                          const SizedBox(width: 8),
                          HigButton(
                            label: isCompact ? 'Sign Up' : 'Create Account',
                            size: HigButtonSize.small,
                            onPressed: () => context.go('/signup'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              Expanded(
                child: ListView(
                  controller: _scrollCtrl,
                  cacheExtent: 2600,
                  children: [
                    HigMaxWidthContainer(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(height: isCompact ? 16 : 28),

                          // ── 1. FACEIT CINEMATIC FULL-BLEED KEY-ART HERO ──
                          _buildFaceitHeroBanner(
                            context,
                            spotlightGame: spotlightGame,
                            allGames: allGames,
                            stakeTiers: stakeTiers,
                            gateway: gateway,
                            isCompact: isCompact,
                            isDesktop: isDesktop,
                          ),

                          const SizedBox(height: 44),

                          // ── 2. FACEIT "CHOOSE YOUR GAME" ROSTER (Front & Center below Hero) ──
                          KeyedSubtree(
                            key: _gamesSectionKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  crossAxisAlignment: WrapCrossAlignment.end,
                                  spacing: 14,
                                  runSpacing: 12,
                                  children: [
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'CHOOSE YOUR ARENA',
                                          style: HigTypography.mono(
                                            size: 11,
                                            color: HigColors.brandBright,
                                          ).copyWith(
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 1.0,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Supported games (${allGames.length})',
                                          style: HigTypography.title2(),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          'Every title runs its own dedicated matchmaking queue, brackets, and Level 1–10 ELO ladder.',
                                          style: HigTypography.footnote(),
                                        ),
                                      ],
                                    ),
                                    Wrap(
                                      spacing: 10,
                                      runSpacing: 10,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        SizedBox(
                                          width:
                                              isCompact ? double.infinity : 220,
                                          child: HigTextField(
                                            placeholder: 'Search games...',
                                            prefixIcon: CupertinoIcons.search,
                                            onChanged: (v) => setState(
                                                () => _searchQuery = v),
                                          ),
                                        ),
                                        SizedBox(
                                          width:
                                              isCompact ? double.infinity : 310,
                                          child: HigSegmentedControl<
                                              GamePlatformFilter>(
                                            groupValue: _platformFilter,
                                            onChanged: (v) => setState(
                                                () => _platformFilter = v),
                                            segments: {
                                              for (final t
                                                  in GamePlatformFilter.values)
                                                t: t == GamePlatformFilter.all
                                                    ? 'All'
                                                    : t == GamePlatformFilter.pc
                                                        ? 'PC'
                                                        : t ==
                                                                GamePlatformFilter
                                                                    .console
                                                            ? 'Console'
                                                            : 'Mobile',
                                            },
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount:
                                        Responsive.posterGridColumns(context),
                                    crossAxisSpacing: 12,
                                    mainAxisSpacing: 12,
                                    childAspectRatio: 0.72,
                                  ),
                                  itemCount: filteredGames.length,
                                  itemBuilder: (context, idx) {
                                    final g = filteredGames[idx];
                                    return GlassCard(
                                      padding: EdgeInsets.zero,
                                      radius: 14,
                                      onTap: () => context.go('/signup'),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(13),
                                        child: Stack(
                                          fit: StackFit.expand,
                                          children: [
                                            GamePosterView(
                                                game: g, borderRadius: 0),
                                            DecoratedBox(
                                              decoration: BoxDecoration(
                                                gradient: LinearGradient(
                                                  begin: Alignment.topCenter,
                                                  end: Alignment.bottomCenter,
                                                  colors: [
                                                    Colors.transparent,
                                                    Colors.black.withValues(
                                                        alpha: 0.90),
                                                  ],
                                                  stops: const [0.45, 1.0],
                                                ),
                                              ),
                                            ),
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
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style:
                                                        HigTypography.headline()
                                                            .copyWith(
                                                                fontSize: 13.5),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    g.platformSummary,
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style:
                                                        HigTypography.caption(),
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

                          const SizedBox(height: 48),

                          // ── 3. FACEIT SKILL PROGRESSION: LEVEL 1 TO LEVEL 10 + NATIONAL LADDERS ──
                          KeyedSubtree(
                            key: _skillLevelsKey,
                            child: _buildFaceitSkillProgressionSection(
                              context,
                              spotlightGame: spotlightGame,
                              isCompact: isCompact,
                            ),
                          ),

                          const SizedBox(height: 48),

                          // ── 4. HOW A MATCH SETTLES (4-Stage Matchroom Pipeline) ──
                          KeyedSubtree(
                            key: _howItWorksKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'MATCHROOM PIPELINE',
                                  style: HigTypography.mono(
                                    size: 11,
                                    color: HigColors.brandBright,
                                  ).copyWith(
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'How a match settles',
                                  style: HigTypography.title2(),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Deterministic four-stage escrow flow from room creation to wallet credit.',
                                  style: HigTypography.footnote(),
                                ),
                                const SizedBox(height: 16),
                                _buildStepsGrid(),
                              ],
                            ),
                          ),

                          const SizedBox(height: 48),

                          // ── 4.5. REGIONAL ROLLOUT: PILOTING IN KENYA FIRST · ARCHITECTED FOR THE WORLD ──
                          KeyedSubtree(
                            key: _rolloutKey,
                            child: _buildGlobalRolloutSection(
                              context,
                              isCompact: isCompact,
                            ),
                          ),

                          const SizedBox(height: 48),

                          // ── 5. FACEIT 3-PILLAR BENTO GRID (Tournaments · Hardware Anti-Smurf · Developer Stats API) ──
                          KeyedSubtree(
                            key: _pillarsKey,
                            child: _buildFaceitThreePillarsGrid(
                              context,
                              stakeTiers: stakeTiers,
                            ),
                          ),

                          const SizedBox(height: 48),

                          // ── 6. FREQUENTLY ASKED QUESTIONS ──
                          KeyedSubtree(
                            key: _faqKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Frequently asked questions',
                                    style: HigTypography.title2()),
                                const SizedBox(height: 14),
                                _buildFaqList(),
                              ],
                            ),
                          ),

                          const SizedBox(height: 48),
                          const Divider(height: 1),
                          const SizedBox(height: 22),

                          // Strictly Public Footer
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 20,
                            runSpacing: 12,
                            children: [
                              const BrandLogo.full(height: 22),
                              Wrap(
                                spacing: 8,
                                runSpacing: 4,
                                children: [
                                  if (kIsWeb)
                                    _footerLink('Download App', '/download'),
                                  _footerLink('Sign In', '/login'),
                                  _footerLink('Create Account', '/signup'),
                                  _footerLink('Game Developers',
                                      '/signup?type=developer'),
                                  _footerLink('Privacy', '/privacy'),
                                  _footerLink('Terms', '/terms'),
                                  _footerLink('Responsible Gaming',
                                      '/responsible-gaming'),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 36),
                        ],
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
    );
  }

  Widget _headerAnchorButton(String label, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: CupertinoButton(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        minimumSize: const Size(28, 28),
        onPressed: onTap,
        child: Text(
          label,
          style: HigTypography.mono(
            size: 11,
            color: HigColors.labelSecondary,
          ).copyWith(fontWeight: FontWeight.w700, letterSpacing: 0.5),
        ),
      ),
    );
  }

  /// FACEIT Signature Full-Bleed Cinematic Split Hero with Interactive Game Ribbon.
  Widget _buildFaceitHeroBanner(
    BuildContext context, {
    required OfficialGame spotlightGame,
    required List<OfficialGame> allGames,
    required List<String> stakeTiers,
    required PaymentGatewayMode gateway,
    required bool isCompact,
    required bool isDesktop,
  }) {
    final ribbonGames = _heroRibbonGameIds
        .map((id) => findAnyCatalogGame(allGames, id))
        .toList();

    return Container(
      decoration: BoxDecoration(
        color: HigColors.surfacePrimary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: HigColors.separator, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Main Cinematic Split Stage
          Stack(
            children: [
              // Right-aligned Full-Bleed Key Art Backdrop with directional dark obsidian fade
              Positioned.fill(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FractionallySizedBox(
                    widthFactor: isDesktop ? 0.64 : 1.0,
                    heightFactor: 1.0,
                    child: Opacity(
                      opacity: isDesktop ? 0.36 : 0.22,
                      child: GamePosterView(
                        game: spotlightGame,
                        useBanner: true,
                        borderRadius: 0,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        HigColors.surfacePrimary,
                        HigColors.surfacePrimary.withValues(alpha: 0.94),
                        HigColors.surfacePrimary.withValues(alpha: 0.55),
                        HigColors.surfacePrimary.withValues(alpha: 0.85),
                      ],
                      stops: const [0.0, 0.42, 0.78, 1.0],
                    ),
                  ),
                ),
              ),

              Padding(
                padding: EdgeInsets.all(isCompact ? 18 : 30),
                child: isDesktop
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            flex: 12,
                            child: _buildFaceitHeroPitch(
                              context,
                              spotlightGame: spotlightGame,
                              gateway: gateway,
                              totalGames: allGames.length,
                              isCompact: false,
                            ),
                          ),
                          const SizedBox(width: 28),
                          Expanded(
                            flex: 9,
                            child: _buildFaceitHeroMatchroomPreview(
                              context,
                              game: spotlightGame,
                              stakeTiers: stakeTiers,
                              gateway: gateway,
                            ),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildFaceitHeroPitch(
                            context,
                            spotlightGame: spotlightGame,
                            gateway: gateway,
                            totalGames: allGames.length,
                            isCompact: isCompact,
                          ),
                          const SizedBox(height: 20),
                          _buildFaceitHeroMatchroomPreview(
                            context,
                            game: spotlightGame,
                            stakeTiers: stakeTiers,
                            gateway: gateway,
                          ),
                        ],
                      ),
              ),
            ],
          ),

          // Bottom Interactive Game Switcher Ribbon (FACEIT Game Selector Bar)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: HigColors.surfaceGrouped,
              border: Border(
                top: BorderSide(color: HigColors.separator, width: 1),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Text(
                    'FEATURED ARENAS:',
                    style: HigTypography.mono(
                      size: 10.5,
                      color: HigColors.labelTertiary,
                    ).copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(width: 12),
                  ...ribbonGames.map((g) {
                    final selected = g.id == spotlightGame.id;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _spotlightId = g.id);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: selected
                                ? HigColors.brand
                                : HigColors.surfacePrimary,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: selected
                                  ? HigColors.brandBright
                                  : HigColors.separator,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 18,
                                height: 22,
                                child: GamePosterView(
                                  game: g,
                                  borderRadius: 4,
                                ),
                              ),
                              const SizedBox(width: 7),
                              Text(
                                g.shortName,
                                style: HigTypography.mono(
                                  size: 11,
                                  color: selected
                                      ? Colors.white
                                      : HigColors.labelPrimary,
                                ).copyWith(fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaceitHeroPitch(
    BuildContext context, {
    required OfficialGame spotlightGame,
    required PaymentGatewayMode gateway,
    required int totalGames,
    required bool isCompact,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const HigBadge(
              label: 'COMPETITIVE MATCHMAKING',
              tone: HigBadgeTone.copper,
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: HigColors.emerald.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: HigColors.emerald.withValues(alpha: 0.35),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CountryFlag(code: 'KE', width: 15, height: 10),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'PILOTING IN KENYA FIRST · READY FOR THE WORLD',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: HigTypography.mono(
                        size: 10,
                        color: HigColors.emerald,
                      ).copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            HigBadge(
              label: '${spotlightGame.displayName.toUpperCase()} SPOTLIGHT',
              tone: HigBadgeTone.neutral,
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'CHALLENGE YOUR GAME.',
          style: HigTypography.mono(
            size: isCompact ? 12 : 13,
            color: HigColors.brandBright,
          ).copyWith(fontWeight: FontWeight.w800, letterSpacing: 1.4),
        ),
        const SizedBox(height: 6),
        Text(
          'Head-to-head matches and brackets across $totalGames games.',
          style: isCompact
              ? HigTypography.largeTitle().copyWith(
                  fontSize: 28,
                  height: 1.12,
                )
              : HigTypography.largeTitle().copyWith(
                  fontSize: 42,
                  height: 1.07,
                  letterSpacing: -0.9,
                ),
        ),
        const SizedBox(height: 12),
        Text(
          'Queue into 1v1 duels, share a private room code, or enter 5-player Blitz tournaments. Climb Level 1–10 per-game skill ratings with escrow-backed payouts.',
          style: HigTypography.body(
            color: HigColors.labelSecondary,
          ).copyWith(fontSize: isCompact ? 14 : 15.5, height: 1.45),
        ),
        const SizedBox(height: 20),

        // Purposeful FACEIT Action Row: Primary Create Account + Room Code Join Bar
        LayoutBuilder(
          builder: (ctx, c) {
            final roomCodeBar = Container(
              height: 44,
              padding: const EdgeInsets.only(left: 12, right: 5),
              decoration: BoxDecoration(
                color: HigColors.canvas,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: HigColors.separator),
              ),
              child: Row(
                children: [
                  const Icon(
                    CupertinoIcons.tag,
                    size: 15,
                    color: HigColors.labelTertiary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoTextField(
                      controller: _roomCodeCtrl,
                      placeholder: 'Room code (e.g. PVZ-8F2A)',
                      placeholderStyle: HigTypography.footnote(
                        color: HigColors.labelTertiary,
                      ),
                      style: HigTypography.mono(
                        size: 12,
                        color: HigColors.labelPrimary,
                      ),
                      decoration: const BoxDecoration(
                        color: Colors.transparent,
                      ),
                      padding: EdgeInsets.zero,
                      onSubmitted: (_) => _handleRoomCodeJoin(),
                    ),
                  ),
                  const SizedBox(width: 6),
                  HigButton(
                    label: 'Join',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: _handleRoomCodeJoin,
                  ),
                ],
              ),
            );

            if (c.maxWidth >= 500) {
              return Row(
                children: [
                  HigButton(
                    label: 'Create Account',
                    icon: CupertinoIcons.bolt_fill,
                    size: HigButtonSize.large,
                    onPressed: () => context.go('/signup'),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: roomCodeBar),
                ],
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                HigButton(
                  label: 'Create Account',
                  icon: CupertinoIcons.bolt_fill,
                  size: HigButtonSize.large,
                  fullWidth: true,
                  onPressed: () => context.go('/signup'),
                ),
                const SizedBox(height: 10),
                roomCodeBar,
              ],
            );
          },
        ),

        const SizedBox(height: 18),

        // Grounded Settlement & Platform Facts Strip
        Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const BrandLogo.kopokopo(height: 19),
            Text(
              'Kenya Phase 1: Instant M-PESA STK & Payouts',
              style: HigTypography.caption(color: HigColors.labelPrimary)
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            const BrandLogo.crossmint(height: 15),
            Text(
              'Global Ready: Card & USDC Escrow',
              style: HigTypography.caption(color: HigColors.labelPrimary)
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            Text(
              '· 10,000 Free Practice PTS',
              style: HigTypography.caption(color: HigColors.labelSecondary),
            ),
          ],
        ),
      ],
    );
  }

  /// FACEIT-style Matchroom Lobby & Telemetry Spec Card inside the Right Hero Column.
  Widget _buildFaceitHeroMatchroomPreview(
    BuildContext context, {
    required OfficialGame game,
    required List<String> stakeTiers,
    required PaymentGatewayMode gateway,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: HigColors.canvas.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Matchroom Top Header
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 24,
                    height: 30,
                    child: GamePosterView(game: game, borderRadius: 5),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      '${game.shortName} MATCHROOM SPEC',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: HigTypography.mono(
                        size: 11.5,
                        color: HigColors.labelPrimary,
                      ).copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
              const HigBadge(
                label: 'DUAL-READY ESCROW',
                tone: HigBadgeTone.emerald,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // FACEIT Side A vs Side B Matchroom Architecture Visual
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: HigColors.surfacePrimary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: HigColors.separator),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SIDE A (HOST)', style: HigTypography.caption()),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: const [
                          EloLevelBadge(elo: 1900, size: 22),
                          HigBadge(
                            label: 'READY',
                            tone: HigBadgeTone.emerald,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    'VS',
                    style: HigTypography.mono(
                      size: 12,
                      color: HigColors.brandBright,
                    ).copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('SIDE B (CHALLENGER)',
                          textAlign: TextAlign.right,
                          style: HigTypography.caption()),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        alignment: WrapAlignment.end,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: const [
                          HigBadge(
                            label: 'READY',
                            tone: HigBadgeTone.emerald,
                          ),
                          EloLevelBadge(elo: 1860, size: 22),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Game-Specific Technical Requirements
          _kvRow('Platform', game.platformSummary, HigColors.labelPrimary),
          const SizedBox(height: 6),
          _kvRow('Required ID', game.gamertagLabel, HigColors.labelSecondary),
          const SizedBox(height: 6),
          _kvRow(
            'Ready Action',
            game.isDeveloperApiGame
                ? 'Studio Stats API Sync'
                : game.effectiveLaunchUri != null
                    ? 'Force Auto-Launch (${game.primaryPlatform})'
                    : 'Console Stream Telemetry',
            HigColors.emerald,
          ),

          const SizedBox(height: 12),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: stakeTiers.map((t) {
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: HigColors.surfacePrimary,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: HigColors.separator),
                ),
                child: Text(
                  t,
                  style: HigTypography.mono(
                    size: 10,
                    color: HigColors.labelSecondary,
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 14),
          HigButton(
            label: 'Inspect ${game.shortName} Arena Rules',
            icon: CupertinoIcons.info,
            size: HigButtonSize.small,
            variant: HigButtonVariant.secondary,
            fullWidth: true,
            onPressed: () =>
                _showGameArenaPreviewSheet(context, game, gateway),
          ),
        ],
      ),
    );
  }

  Widget _kvRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: HigTypography.caption()),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: HigTypography.mono(size: 11, color: valueColor),
          ),
        ),
      ],
    );
  }

  /// FACEIT Signature Skill Progression Section: Visual Level 1 to Level 10 ELO Ladder + Country Ladders.
  Widget _buildFaceitSkillProgressionSection(
    BuildContext context, {
    required OfficialGame spotlightGame,
    required bool isCompact,
  }) {
    const levelSamples = [
      (1, 750, '< 800'),
      (2, 900, '800–949'),
      (3, 1000, '950–1099'),
      (4, 1200, '1100–1249'),
      (5, 1300, '1250–1399'),
      (6, 1450, '1400–1549'),
      (7, 1600, '1550–1699'),
      (8, 1750, '1700–1849'),
      (9, 1900, '1850–2000'),
      (10, 2100, '2001+'),
    ];
    const sampleFlags = ['KE', 'NG', 'ZA', 'GH', 'UG', 'GB', 'US', 'DE', 'BR'];

    return GlassCard(
      radius: 20,
      padding: EdgeInsets.all(isCompact ? 18 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SKILL PROGRESSION & NATIONAL STANDINGS',
                    style: HigTypography.mono(
                      size: 11,
                      color: HigColors.brandBright,
                    ).copyWith(fontWeight: FontWeight.w800, letterSpacing: 1.0),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Climb Level 1 to Level 10 — Independently Per Game',
                    style: HigTypography.title2(),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your ELO rating in ${spotlightGame.displayName} is tracked separately from every other title, with national & global leaderboards.',
                    style: HigTypography.footnote(),
                  ),
                ],
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: sampleFlags
                    .map((code) => CountryFlag(
                          code: code,
                          width: 22,
                          height: 15,
                        ))
                    .toList(),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Visual Level 1 -> Level 10 Badge Ladder
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: levelSamples.map((lvl) {
                final isTopTier = lvl.$1 >= 8;
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: Container(
                    width: 106,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 12),
                    decoration: BoxDecoration(
                      color: HigColors.surfaceGrouped,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isTopTier
                            ? HigColors.brand.withValues(alpha: 0.45)
                            : HigColors.separator,
                      ),
                    ),
                    child: Column(
                      children: [
                        EloLevelBadge(elo: lvl.$2, size: 30),
                        const SizedBox(height: 8),
                        Text(
                          'LEVEL ${lvl.$1}',
                          style: HigTypography.mono(
                            size: 11,
                            color: HigColors.labelPrimary,
                          ).copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${lvl.$3} ELO',
                          style: HigTypography.mono(
                            size: 10,
                            color: HigColors.labelSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepsGrid() {
    const steps = [
      (
        '01',
        'ROOM CODE OR QUEUE',
        'Create or join a match',
        'Select any supported title to post an open 1v1 challenge, invite a friend by room code, or take a seat in a 5-player Blitz bracket.',
      ),
      (
        '02',
        'DUAL-READY ESCROW',
        'Lock stakes on Ready',
        'Entry stakes remain in your wallet until both sides confirm Ready in the matchroom. Practice Points mode is always free.',
      ),
      (
        '03',
        'AUTO-LAUNCH & SYNC',
        'Play on your device',
        'Our native companion app scans your installed titles and auto-launches the game when both players lock Ready.',
      ),
      (
        '04',
        'VERIFIED SETTLEMENT',
        'Automatic wallet payout',
        'Final scores verify via native scoreboard telemetry, console stream sync, or the studio Stats API and credit the winner immediately.',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= 920
            ? 4
            : constraints.maxWidth >= 560
                ? 2
                : 1;
        const spacing = 12.0;
        final itemWidth =
            (constraints.maxWidth - (spacing * (cols - 1))) / cols;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: steps.map((s) {
            return SizedBox(
              width: itemWidth,
              child: GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        Text(
                          s.$1,
                          style: HigTypography.mono(
                            size: 13,
                            color: HigColors.brandBright,
                          ).copyWith(fontWeight: FontWeight.w800),
                        ),
                        HigBadge(
                          label: s.$2,
                          tone: HigBadgeTone.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(s.$3, style: HigTypography.headline()),
                    const SizedBox(height: 6),
                    Text(s.$4, style: HigTypography.footnote()),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  /// Regional Rollout Section: Piloting Live in Kenya First · Architected for the World.
  Widget _buildGlobalRolloutSection(
    BuildContext context, {
    required bool isCompact,
  }) {
    const globalFlags = ['KE', 'NG', 'ZA', 'GH', 'UG', 'GB', 'US', 'DE', 'BR'];

    return GlassCard(
      radius: 20,
      padding: EdgeInsets.all(isCompact ? 18 : 24),
      borderColor: HigColors.brand.withValues(alpha: 0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 14,
            runSpacing: 10,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'REGIONAL ROLLOUT & GLOBAL INFRASTRUCTURE',
                    style: HigTypography.mono(
                      size: 11,
                      color: HigColors.brandBright,
                    ).copyWith(fontWeight: FontWeight.w800, letterSpacing: 1.0),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Piloting Live in Kenya First. Architected for the World.',
                    style: HigTypography.title2(),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'We launched Phase 1 in Kenya — the world\'s premier mobile-money proving ground — to stress-test sub-second escrow and anti-cheat verification under live match conditions while keeping our global Card & USDC settlement engine ready for worldwide queues.',
                    style: HigTypography.footnote(),
                  ),
                ],
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: globalFlags
                    .map(
                      (code) => CountryFlag(
                        code: code,
                        width: 22,
                        height: 15,
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final cols = constraints.maxWidth >= 900 ? 3 : 1;
              const spacing = 12.0;
              final itemWidth =
                  (constraints.maxWidth - (spacing * (cols - 1))) / cols;

              final phase1Kenya = Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: HigColors.emerald.withValues(alpha: 0.38),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CountryFlag(code: 'KE', width: 18, height: 12),
                            const SizedBox(width: 8),
                            const BrandLogo.kopokopo(height: 18),
                          ],
                        ),
                        const HigBadge(
                          label: 'PHASE 1 · LIVE IN KENYA',
                          tone: HigBadgeTone.emerald,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Kenya First: Real-World Proving Ground',
                      style: HigTypography.headline(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Live KES match stakes, instant M-PESA STK Push deposits, and automated Safaricom B2C payouts. Built to prove deterministic match settlement at high daily match volume across East Africa.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              );

              final phase2World = Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: HigColors.brand.withValues(alpha: 0.38),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 6,
                      children: const [
                        BrandLogo.crossmint(height: 18),
                        HigBadge(
                          label: 'GLOBAL RAIL · ARMED & READY',
                          tone: HigBadgeTone.indigo,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Ready for the World: Card & USDC Rails',
                      style: HigTypography.headline(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Our global settlement layer is pre-integrated with Crossmint for Visa, Mastercard, Apple Pay, Google Pay, and on-chain USDC escrow — ready to scale across Europe, the Americas, Asia, and pan-African arenas.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              );

              final unifiedCore = Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: HigColors.separator),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 6,
                      children: const [
                        HigBadge(
                          label: 'UNIFIED CORE ENGINE',
                          tone: HigBadgeTone.copper,
                        ),
                        HigBadge(
                          label: 'ZERO RE-ARCHITECTURE',
                          tone: HigBadgeTone.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'One Switch From Regional Pilot to Global',
                      style: HigTypography.headline(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Whether a match settles in KES during our Kenya rollout or USD/USDC globally, players compete on the same 5-pillar anti-fraud engine, Level 1–10 ELO progression, and developer Stats APIs.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              );

              return Wrap(
                spacing: spacing,
                runSpacing: spacing,
                children: [
                  SizedBox(width: itemWidth, child: phase1Kenya),
                  SizedBox(width: itemWidth, child: phase2World),
                  SizedBox(width: itemWidth, child: unifiedCore),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  /// FACEIT 3-Pillar Bento Grid:
  /// 1. 5-Player Blitz Brackets & Cups
  /// 2. Hardware Anti-Smurf & Companion Auto-Launch
  /// 3. Game Developer Platform Stats APIs
  Widget _buildFaceitThreePillarsGrid(
    BuildContext context, {
    required List<String> stakeTiers,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= 960 ? 3 : 1;
        const spacing = 14.0;
        final itemWidth =
            (constraints.maxWidth - (spacing * (cols - 1))) / cols;

        final blitzCard = GlassCard(
          radius: 18,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const HigBadge(
                label: 'TOURNAMENTS & BLITZ CUPS',
                tone: HigBadgeTone.indigo,
              ),
              const SizedBox(height: 12),
              Text('5-Player Instant Brackets',
                  style: HigTypography.title3()),
              const SizedBox(height: 6),
              Text(
                'Pick your game and entry tier. As soon as 5 players lock into the queue, the bracket seeds automatically and settles upon final verification.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 14),
              _featureBullet('Five standardized entry tiers across all titles'),
              const SizedBox(height: 8),
              _featureBullet('Live bracket tree & room-code match generation'),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: stakeTiers.map((t) {
                  return Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: HigColors.surfaceGrouped,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: HigColors.separator),
                    ),
                    child: Text(
                      t,
                      style: HigTypography.mono(
                        size: 10,
                        color: HigColors.labelPrimary,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );

        final antiCheatCard = GlassCard(
          radius: 18,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const HigBadge(
                label: 'ANTI-SMURF & AUTO-LAUNCH',
                tone: HigBadgeTone.emerald,
              ),
              const SizedBox(height: 12),
              Text('Windows & Android Companion Client',
                  style: HigTypography.title3()),
              const SizedBox(height: 6),
              Text(
                'Your account binds to your device fingerprint on sign-in. The companion client auto-scans installed games and launches your title on Ready.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 14),
              _featureBullet('Hardware fingerprint binding prevents multi-accounting'),
              const SizedBox(height: 8),
              _featureBullet('Auto-syncs installed games & force-launches on Ready'),
              const SizedBox(height: 16),
              HigButton(
                label: 'Download Companion App',
                icon: CupertinoIcons.arrow_down_circle,
                size: HigButtonSize.small,
                variant: HigButtonVariant.secondary,
                onPressed: () => context.go('/download'),
              ),
            ],
          ),
        );

        final developerCard = GlassCard(
          radius: 18,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const HigBadge(
                label: 'FOR GAME DEVELOPERS',
                tone: HigBadgeTone.copper,
              ),
              const SizedBox(height: 12),
              Text('Onboard Games via Platform Stats APIs',
                  style: HigTypography.title3()),
              const SizedBox(height: 6),
              Text(
                'Register as a Game Developer and connect your PC, Console, Mobile, or Web Stats APIs so Playverzus fetches live player stats & match results.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 14),
              _featureBullet('Steamworks, Epic EOS, PSN/Xbox, PlayFab, Unity & REST'),
              const SizedBox(height: 8),
              _featureBullet('Server-side API key vault & live JSON dot-path mapper'),
              const SizedBox(height: 16),
              HigButton(
                label: 'Register as Game Developer',
                icon: CupertinoIcons.gear_solid,
                size: HigButtonSize.small,
                variant: HigButtonVariant.secondary,
                onPressed: () => context.go('/signup?type=developer'),
              ),
            ],
          ),
        );

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            SizedBox(width: itemWidth, child: blitzCard),
            SizedBox(width: itemWidth, child: antiCheatCard),
            SizedBox(width: itemWidth, child: developerCard),
          ],
        );
      },
    );
  }

  Widget _featureBullet(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(
            CupertinoIcons.checkmark_alt_circle_fill,
            size: 14,
            color: HigColors.brandBright,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: HigTypography.footnote(color: HigColors.labelPrimary),
          ),
        ),
      ],
    );
  }

  Widget _buildFaqList() {
    const faqs = [
      (
        'How do opponents join a private match?',
        'Each match creates a short room code and shareable link. Your opponent signs in, enters the code in the hero bar or Duels lobby, and takes Side B.'
      ),
      (
        'How do 5-player Blitz brackets work?',
        'Blitz brackets run across five entry tiers. Once 5 players join a queue for a specific game, the bracket starts automatically and settles the payout after the final.'
      ),
      (
        'How are rankings and ELO handled across the 21 games?',
        'Every game maintains its own independent ELO rating (Level 1–10) and leaderboard. Your rating in EA Sports FC 27 never mixes with Counter-Strike 2 or Chess.'
      ),
      (
        'Why is Playverzus piloting in Kenya first, and is it ready for global players?',
        'Kenya leads the world in instant mobile-money adoption, making it the ideal live proving ground for real-time competitive escrow. While our Phase 1 pilot settles in KES via M-PESA, our global Visa/Mastercard and USDC settlement rails via Crossmint are already built and ready to activate worldwide.'
      ),
      (
        'How can game developers integrate their own games?',
        'Register a Game Developer account, select your game\'s target platforms (PC, Console, Mobile, Web), and provide your Stats API endpoint and JSON field paths. Playverzus fetches live player stats and match results server-side.'
      ),
    ];

    return Column(
      children: List.generate(faqs.length, (i) {
        final open = _openFaq == i;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: GlassCard(
            radius: 14,
            padding: const EdgeInsets.all(15),
            onTap: () => setState(() => _openFaq = open ? null : i),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(faqs[i].$1, style: HigTypography.headline()),
                    ),
                    Icon(
                      open
                          ? CupertinoIcons.chevron_up
                          : CupertinoIcons.chevron_down,
                      size: 15,
                      color: HigColors.labelTertiary,
                    ),
                  ],
                ),
                if (open) ...[
                  const SizedBox(height: 8),
                  Text(faqs[i].$2, style: HigTypography.footnote()),
                ],
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _footerLink(String label, String route) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      minimumSize: const Size(28, 28),
      onPressed: () => context.go(route),
      child: Text(
        label,
        style: HigTypography.footnote(color: HigColors.labelSecondary),
      ),
    );
  }
}
