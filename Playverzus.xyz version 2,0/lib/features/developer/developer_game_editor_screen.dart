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

class _PlatformApiFormController {
  String providerPreset;
  final TextEditingController baseUrlCtrl;
  final TextEditingController playerStatsPathCtrl;
  final TextEditingController matchResultPathCtrl;
  String httpMethod;
  String authType;
  final TextEditingController authHeaderCtrl;
  final TextEditingController authParamCtrl;
  final TextEditingController authSecretCtrl;
  final TextEditingController launchUriCtrl;
  bool hasStoredSecret;
  String secretHint;

  _PlatformApiFormController({
    required this.providerPreset,
    String baseUrl = '',
    String playerStatsPath = '',
    String matchResultPath = '',
    this.httpMethod = 'GET',
    this.authType = 'NONE',
    String authHeader = 'X-API-Key',
    String authParam = 'api_key',
    String launchUri = '',
    this.hasStoredSecret = false,
    this.secretHint = '',
  })  : baseUrlCtrl = TextEditingController(text: baseUrl),
        playerStatsPathCtrl = TextEditingController(text: playerStatsPath),
        matchResultPathCtrl = TextEditingController(text: matchResultPath),
        authHeaderCtrl = TextEditingController(text: authHeader),
        authParamCtrl = TextEditingController(text: authParam),
        authSecretCtrl = TextEditingController(),
        launchUriCtrl = TextEditingController(text: launchUri);

  factory _PlatformApiFormController.fromConfig(PlatformApiConfig cfg) {
    return _PlatformApiFormController(
      providerPreset: cfg.providerPreset,
      baseUrl: cfg.baseUrl,
      playerStatsPath: cfg.playerStatsPath,
      matchResultPath: cfg.matchResultPath,
      httpMethod: cfg.httpMethod,
      authType: cfg.authType,
      authHeader: cfg.authHeaderName,
      authParam: cfg.authParamName,
      launchUri: cfg.launchUriOrPackage,
      hasStoredSecret: cfg.hasSecret,
      secretHint: cfg.secretHint,
    );
  }

  factory _PlatformApiFormController.forPlatform(String platform) {
    final presets = presetsForPlatform(platform);
    final first = presets.isNotEmpty ? presets.first : null;
    return _PlatformApiFormController(
      providerPreset: first?.id ?? 'CUSTOM_REST',
      baseUrl: '',
      playerStatsPath: first?.defaultPlayerStatsPath ?? '/players/{playerId}/stats',
      matchResultPath: first?.defaultMatchResultPath ?? '/matches/{matchId}/result',
      httpMethod: 'GET',
      authType: first?.defaultAuthType ?? 'NONE',
      authHeader: first?.defaultAuthHeader ?? 'X-API-Key',
      authParam: first?.defaultAuthParam ?? 'api_key',
    );
  }

  void applyPreset(PlatformConnectorPreset preset) {
    providerPreset = preset.id;
    if (baseUrlCtrl.text.trim().isEmpty ||
        baseUrlCtrl.text.contains('yourgame.com') ||
        baseUrlCtrl.text.contains('yourmobilegame.com') ||
        baseUrlCtrl.text.contains('yourwebgame.com')) {
      baseUrlCtrl.text = preset.defaultBaseUrl;
    }
    playerStatsPathCtrl.text = preset.defaultPlayerStatsPath;
    matchResultPathCtrl.text = preset.defaultMatchResultPath;
    authType = preset.defaultAuthType;
    authHeaderCtrl.text = preset.defaultAuthHeader;
    authParamCtrl.text = preset.defaultAuthParam;
  }

  PlatformApiConfig toConfig(String platform) {
    return PlatformApiConfig(
      platform: platform,
      providerPreset: providerPreset,
      baseUrl: baseUrlCtrl.text.trim(),
      playerStatsPath: playerStatsPathCtrl.text.trim(),
      matchResultPath: matchResultPathCtrl.text.trim(),
      httpMethod: httpMethod,
      authType: authType,
      authHeaderName: authHeaderCtrl.text.trim(),
      authParamName: authParamCtrl.text.trim(),
      hasSecret: hasStoredSecret,
      secretHint: secretHint,
      authSecretInput: authSecretCtrl.text.trim(),
      launchUriOrPackage: launchUriCtrl.text.trim(),
    );
  }

  void dispose() {
    baseUrlCtrl.dispose();
    playerStatsPathCtrl.dispose();
    matchResultPathCtrl.dispose();
    authHeaderCtrl.dispose();
    authParamCtrl.dispose();
    authSecretCtrl.dispose();
    launchUriCtrl.dispose();
  }
}

/// Platform-Aware Game API Configurator (`/developer/games/new` & `/developer/games/:id/edit`).
/// Developers configure or add games solely by providing the Stats APIs
/// that work for their game's target platform(s) (PC, Console, Mobile, Web).
class DeveloperGameEditorScreen extends ConsumerStatefulWidget {
  final String? editGameId;

  const DeveloperGameEditorScreen({super.key, this.editGameId});

  @override
  ConsumerState<DeveloperGameEditorScreen> createState() =>
      _DeveloperGameEditorScreenState();
}

class _DeveloperGameEditorScreenState
    extends ConsumerState<DeveloperGameEditorScreen> {
  static const List<String> _allPlatforms = ['PC', 'CONSOLE', 'MOBILE', 'WEB'];

  final _titleCtrl = TextEditingController();
  final _shortNameCtrl = TextEditingController();
  final _taglineCtrl = TextEditingController();
  final _posterUrlCtrl = TextEditingController();
  final _handleLabelCtrl = TextEditingController(text: 'In-Game Player ID');
  final _handlePlaceholderCtrl =
      TextEditingController(text: 'Enter your player handle');

  // JSON Stats Mapping Controllers
  final _scorePathCtrl = TextEditingController(text: 'stats.score');
  final _winsPathCtrl = TextEditingController(text: 'stats.wins');
  final _lossesPathCtrl = TextEditingController(text: 'stats.losses');
  final _killsPathCtrl = TextEditingController();
  final _rankPathCtrl = TextEditingController();
  final _winnerPathCtrl = TextEditingController(text: 'winnerId');

  // Live Test Fetch Controllers
  final _samplePlayerIdCtrl = TextEditingController();
  final _sampleMatchIdCtrl = TextEditingController();

  final Set<String> _selectedPlatforms = {'PC'};
  bool _unifiedApi = false;
  String _editingPlatformTab = 'PC';
  String _gameType = 'HEAD_TO_HEAD';

  final Map<String, _PlatformApiFormController> _platformCtrls = {};

  bool _testing = false;
  bool _saving = false;
  String? _formError;
  LiveStatsFetchResult? _lastTestResult;
  bool _hydratedExisting = false;

  bool get _isEdit => widget.editGameId != null && widget.editGameId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    for (final p in [..._allPlatforms, 'ALL']) {
      _platformCtrls[p] = _PlatformApiFormController.forPlatform(p);
    }
  }

  void _hydrateFromExisting(DeveloperGame g) {
    if (_hydratedExisting) return;
    _hydratedExisting = true;
    _titleCtrl.text = g.title;
    _shortNameCtrl.text = g.shortName;
    _taglineCtrl.text = g.tagline;
    _posterUrlCtrl.text = g.posterUrl;
    _handleLabelCtrl.text = g.gamertagLabel;
    _handlePlaceholderCtrl.text = g.gamertagPlaceholder;
    _gameType = g.gameType;
    _unifiedApi = g.unifiedApi;
    _selectedPlatforms
      ..clear()
      ..addAll(g.platforms.isNotEmpty ? g.platforms : ['PC']);
    _editingPlatformTab = _unifiedApi ? 'ALL' : _selectedPlatforms.first;

    _scorePathCtrl.text = g.statsMapping.scorePath;
    _winsPathCtrl.text = g.statsMapping.winsPath;
    _lossesPathCtrl.text = g.statsMapping.lossesPath;
    _killsPathCtrl.text = g.statsMapping.killsPath;
    _rankPathCtrl.text = g.statsMapping.rankPath;
    _winnerPathCtrl.text = g.statsMapping.winnerPath;

    for (final api in g.platformApis) {
      final key = api.platform.toUpperCase();
      _platformCtrls[key]?.dispose();
      _platformCtrls[key] = _PlatformApiFormController.fromConfig(api);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _shortNameCtrl.dispose();
    _taglineCtrl.dispose();
    _posterUrlCtrl.dispose();
    _handleLabelCtrl.dispose();
    _handlePlaceholderCtrl.dispose();
    _scorePathCtrl.dispose();
    _winsPathCtrl.dispose();
    _lossesPathCtrl.dispose();
    _killsPathCtrl.dispose();
    _rankPathCtrl.dispose();
    _winnerPathCtrl.dispose();
    _samplePlayerIdCtrl.dispose();
    _sampleMatchIdCtrl.dispose();
    for (final c in _platformCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  String get _activeConfigKey =>
      _unifiedApi ? 'ALL' : (_selectedPlatforms.contains(_editingPlatformTab)
          ? _editingPlatformTab
          : _selectedPlatforms.first);

  _PlatformApiFormController get _activeCtrl =>
      _platformCtrls[_activeConfigKey]!;

  StatsFieldMapping _currentMapping() => StatsFieldMapping(
        scorePath: _scorePathCtrl.text.trim(),
        winsPath: _winsPathCtrl.text.trim(),
        lossesPath: _lossesPathCtrl.text.trim(),
        killsPath: _killsPathCtrl.text.trim(),
        rankPath: _rankPathCtrl.text.trim(),
        winnerPath: _winnerPathCtrl.text.trim(),
      );

  /// Loads a real, working public external game API (Chess.com Public Stats API)
  /// so developers can immediately test live stats fetching end-to-end.
  void _loadLivePublicExample() {
    setState(() {
      _formError = null;
      _titleCtrl.text = 'Studio Blitz Chess';
      _shortNameCtrl.text = 'SBCHESS';
      _taglineCtrl.text = 'Real-Time Public Stats API Integration Example';
      _gameType = 'HEAD_TO_HEAD';
      _handleLabelCtrl.text = 'Chess.com Username';
      _handlePlaceholderCtrl.text = 'e.g. hikaru';
      _selectedPlatforms
        ..clear()
        ..addAll(['PC', 'MOBILE', 'WEB']);
      _unifiedApi = true;
      _editingPlatformTab = 'ALL';

      final ctrl = _platformCtrls['ALL']!;
      ctrl.providerPreset = 'WEB_CUSTOM_REST';
      ctrl.baseUrlCtrl.text = 'https://api.chess.com/pub';
      ctrl.playerStatsPathCtrl.text = '/player/{playerId}/stats';
      ctrl.matchResultPathCtrl.text = '/player/{playerId}/games/archives';
      ctrl.httpMethod = 'GET';
      ctrl.authType = 'NONE';
      ctrl.launchUriCtrl.text = 'https://www.chess.com/play/online';

      _scorePathCtrl.text = 'chess_blitz.last.rating';
      _winsPathCtrl.text = 'chess_blitz.record.win';
      _lossesPathCtrl.text = 'chess_blitz.record.loss';
      _rankPathCtrl.text = 'chess_blitz.best.rating';
      _killsPathCtrl.text = '';
      _winnerPathCtrl.text = '';
      _samplePlayerIdCtrl.text = 'hikaru';
    });
    ref.read(toastProvider.notifier).show(
          'Loaded Live Public API Example',
          body: 'Click "Test Live Stats Fetch" below to pull live stats from api.chess.com.',
          tone: ToastTone.info,
        );
  }

  Future<void> _runLiveTest() async {
    final key = _activeConfigKey;
    final cfg = _platformCtrls[key]!.toConfig(key);
    if (cfg.baseUrl.isEmpty) {
      setState(() => _formError = 'Enter a Base API URL before testing.');
      return;
    }
    setState(() {
      _formError = null;
      _testing = true;
      _lastTestResult = null;
    });

    final result = await ref.read(developerGamesProvider.notifier).testFetchStats(
          gameId: _isEdit ? widget.editGameId : null,
          apiConfig: cfg,
          statsMapping: _currentMapping(),
          platform: key == 'ALL' ? _selectedPlatforms.first : key,
          playerId: _samplePlayerIdCtrl.text.trim(),
          matchId: _sampleMatchIdCtrl.text.trim(),
          mode: 'player',
        );

    if (!mounted) return;
    setState(() {
      _testing = false;
      _lastTestResult = result;
    });
  }

  Future<void> _saveGame() async {
    setState(() => _formError = null);
    final title = _titleCtrl.text.trim();
    if (title.length < 2) {
      setState(() => _formError = 'Enter a Game Title (at least 2 characters).');
      return;
    }
    if (_selectedPlatforms.isEmpty) {
      setState(() => _formError = 'Select at least one target platform.');
      return;
    }

    final List<PlatformApiConfig> apisToSave = [];
    if (_unifiedApi) {
      final c = _platformCtrls['ALL']!.toConfig('ALL');
      if (c.baseUrl.isEmpty) {
        setState(() => _formError = 'Enter your Unified Base API URL.');
        return;
      }
      apisToSave.add(c);
    } else {
      for (final p in _selectedPlatforms) {
        final c = _platformCtrls[p]!.toConfig(p);
        if (c.baseUrl.isEmpty) {
          setState(() {
            _editingPlatformTab = p;
            _formError = 'Enter the Base API URL for platform $p.';
          });
          return;
        }
        apisToSave.add(c);
      }
    }

    setState(() => _saving = true);
    final session = ref.read(playerSessionProvider);
    final payload = {
      'ownerUserId': session.userId,
      'ownerEmail': session.email,
      'ownerUsername': session.username,
      'studioName': session.studioName.isNotEmpty
          ? session.studioName
          : '${session.username} Studio',
      'title': title,
      'shortName': _shortNameCtrl.text.trim(),
      'tagline': _taglineCtrl.text.trim(),
      'gameType': _gameType,
      'platforms': _selectedPlatforms.toList(),
      'posterUrl': _posterUrlCtrl.text.trim(),
      'gamertagLabel': _handleLabelCtrl.text.trim(),
      'gamertagPlaceholder': _handlePlaceholderCtrl.text.trim(),
      'unifiedApi': _unifiedApi,
      'platformApis': apisToSave.map((a) => a.toPayload()).toList(),
      'statsMapping': _currentMapping().toJson(),
      'verified': _lastTestResult?.ok == true,
      if (_lastTestResult?.ok == true)
        'lastLatencyMs': _lastTestResult!.latencyMs,
    };

    final notifier = ref.read(developerGamesProvider.notifier);
    final res = _isEdit
        ? await notifier.updateGame(widget.editGameId!, payload)
        : await notifier.createGame(payload);

    if (!mounted) return;
    setState(() => _saving = false);

    if (res.error != null) {
      setState(() => _formError = res.error);
      return;
    }

    ref.read(toastProvider.notifier).show(
          _isEdit ? 'Game API Updated' : 'Game API Published Live',
          body:
              '$title is now configured for ${_selectedPlatforms.join(', ')} stats fetching.',
          tone: ToastTone.success,
        );
    context.go('/developer');
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit) {
      final devGames = ref.watch(developerGamesProvider).games;
      for (final g in devGames) {
        if (g.id == widget.editGameId) {
          _hydrateFromExisting(g);
          break;
        }
      }
    }

    final isCompact = Responsive.isCompact(context);
    final activeKey = _activeConfigKey;
    final activeCtrl = _activeCtrl;
    final presets = presetsForPlatform(activeKey);

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 860,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              GlassCard(
                radius: 20,
                padding: EdgeInsets.all(isCompact ? 16 : 22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        HigBadge(
                          label: _isEdit
                              ? 'EDIT PLATFORM STATS API'
                              : 'API-ONLY GAME ONBOARDING',
                          tone: HigBadgeTone.copper,
                        ),
                        if (!_isEdit)
                          HigButton(
                            label: 'Load Live Example API',
                            icon: CupertinoIcons.sparkles,
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            onPressed: _loadLivePublicExample,
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _isEdit
                          ? 'Configure Game Stats APIs'
                          : 'Add Your Game via Platform APIs',
                      style: HigTypography.title1(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Select the platform(s) where your game runs and supply your Stats API endpoints. playverzus.xyz handles live stats fetching & match verification automatically.',
                      style: HigTypography.footnote(),
                    ),
                  ],
                ),
              ),

              if (_formError != null) ...[
                const SizedBox(height: 12),
                HigErrorBanner(message: _formError!),
              ],

              const SizedBox(height: 16),

              // STEP 1: Game Identity & Target Platforms
              GlassCard(
                radius: 18,
                padding: EdgeInsets.all(isCompact ? 16 : 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('1. Game Identity & Target Platform(s)',
                        style: HigTypography.title3()),
                    const SizedBox(height: 14),
                    LayoutBuilder(
                      builder: (ctx, c) {
                        final titleField = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Game Title *', style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigTextField(
                              controller: _titleCtrl,
                              placeholder: 'e.g. Cyber Arena Legends',
                              prefixIcon: CupertinoIcons.game_controller_solid,
                            ),
                          ],
                        );
                        final shortField = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Short Code', style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigTextField(
                              controller: _shortNameCtrl,
                              placeholder: 'e.g. CAL',
                              prefixIcon: CupertinoIcons.tag,
                            ),
                          ],
                        );
                        if (c.maxWidth >= 520) {
                          return Row(
                            children: [
                              Expanded(flex: 3, child: titleField),
                              const SizedBox(width: 12),
                              Expanded(flex: 1, child: shortField),
                            ],
                          );
                        }
                        return Column(
                          children: [
                            titleField,
                            const SizedBox(height: 12),
                            shortField,
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    Text('Tagline / Competitive Description',
                        style: HigTypography.caption()),
                    const SizedBox(height: 6),
                    HigTextField(
                      controller: _taglineCtrl,
                      placeholder: 'e.g. 1v1 Tactical Shooter with Live Ranked API',
                      prefixIcon: CupertinoIcons.text_alignleft,
                    ),
                    const SizedBox(height: 14),

                    Text('Where Does Your Game Run? *',
                        style: HigTypography.caption()),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _allPlatforms.map((p) {
                        final sel = _selectedPlatforms.contains(p);
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              if (sel && _selectedPlatforms.length > 1) {
                                _selectedPlatforms.remove(p);
                                if (_editingPlatformTab == p) {
                                  _editingPlatformTab =
                                      _selectedPlatforms.first;
                                }
                              } else {
                                _selectedPlatforms.add(p);
                                _editingPlatformTab = p;
                              }
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              color: sel
                                  ? HigColors.brand
                                  : HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: sel
                                    ? HigColors.brand
                                    : HigColors.separator,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _platformIcon(p),
                                  size: 14,
                                  color: sel
                                      ? Colors.white
                                      : HigColors.labelSecondary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  p,
                                  style: HigTypography.footnote(
                                    color: sel
                                        ? Colors.white
                                        : HigColors.labelPrimary,
                                  ).copyWith(fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 14),
                    Text('Scoring Format', style: HigTypography.caption()),
                    const SizedBox(height: 8),
                    HigSegmentedControl<String>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _gameType,
                      onChanged: (v) => setState(() => _gameType = v),
                      segments: const {
                        'HEAD_TO_HEAD': 'Head-to-Head',
                        'HIGH_SCORE': 'High Score',
                        'BINARY_RESULT': 'Win / Loss',
                      },
                    ),

                    const SizedBox(height: 14),
                    LayoutBuilder(
                      builder: (ctx, c) {
                        final labelField = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Player ID Field Label',
                                style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigTextField(
                              controller: _handleLabelCtrl,
                              placeholder: 'e.g. SteamID64 / Riot ID / UID',
                              prefixIcon: CupertinoIcons.person_badge_plus,
                            ),
                          ],
                        );
                        final coverField = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Cover Art Image URL (Optional)',
                                style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigTextField(
                              controller: _posterUrlCtrl,
                              placeholder: 'https://cdn.studio.com/poster.jpg',
                              prefixIcon: CupertinoIcons.photo,
                            ),
                          ],
                        );
                        if (c.maxWidth >= 520) {
                          return Row(
                            children: [
                              Expanded(child: labelField),
                              const SizedBox(width: 12),
                              Expanded(child: coverField),
                            ],
                          );
                        }
                        return Column(
                          children: [
                            labelField,
                            const SizedBox(height: 12),
                            coverField,
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // STEP 2: Platform-Specific API Endpoints
              GlassCard(
                radius: 18,
                padding: EdgeInsets.all(isCompact ? 16 : 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('2. Platform Stats API Configuration',
                                  style: HigTypography.title3()),
                              const SizedBox(height: 3),
                              Text(
                                'Provide one shared cross-platform API or configure dedicated APIs per platform.',
                                style: HigTypography.caption(),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Unified vs Per-Platform toggle
                    HigSegmentedControl<bool>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _unifiedApi,
                      onChanged: (v) {
                        setState(() {
                          _unifiedApi = v;
                          _editingPlatformTab =
                              v ? 'ALL' : _selectedPlatforms.first;
                        });
                      },
                      segments: const {
                        false: 'Per-Platform APIs',
                        true: 'Single Cross-Platform API',
                      },
                    ),

                    if (!_unifiedApi && _selectedPlatforms.length > 1) ...[
                      const SizedBox(height: 12),
                      HigSegmentedControl<String>(
                        backgroundColor: HigColors.surfaceGrouped,
                        groupValue: activeKey,
                        onChanged: (v) =>
                            setState(() => _editingPlatformTab = v),
                        segments: {
                          for (final p in _selectedPlatforms) p: '$p API',
                        },
                      ),
                    ],

                    const SizedBox(height: 14),

                    // Platform-Specific Connector Presets
                    Text(
                      activeKey == 'ALL'
                          ? 'Quick Connector Presets'
                          : 'Recommended $activeKey API Connectors',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: presets.map((preset) {
                        final isSelected =
                            activeCtrl.providerPreset == preset.id;
                        return GestureDetector(
                          onTap: () => setState(() {
                            activeCtrl.applyPreset(preset);
                            if (_handleLabelCtrl.text == 'In-Game Player ID') {
                              _handleLabelCtrl.text = preset.handleLabel;
                            }
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 11, vertical: 7),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? HigColors.brand.withValues(alpha: 0.2)
                                  : HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(9),
                              border: Border.all(
                                color: isSelected
                                    ? HigColors.brand
                                    : HigColors.separator,
                              ),
                            ),
                            child: Text(
                              preset.label,
                              style: HigTypography.caption(
                                color: isSelected
                                    ? HigColors.brandBright
                                    : HigColors.labelPrimary,
                              ).copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 14),
                    Text(
                      'Base API URL (${activeKey == 'ALL' ? 'All Platforms' : activeKey}) *',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 6),
                    HigTextField(
                      controller: activeCtrl.baseUrlCtrl,
                      placeholder: 'https://api.yourgame.com/v1',
                      prefixIcon: CupertinoIcons.globe,
                    ),

                    const SizedBox(height: 12),
                    Text(
                      'Player Stats Endpoint Path (supports {playerId}, {handle}, {platform})',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 6),
                    HigTextField(
                      controller: activeCtrl.playerStatsPathCtrl,
                      placeholder: '/players/{playerId}/stats?platform={platform}',
                      prefixIcon: CupertinoIcons.chart_bar,
                    ),

                    const SizedBox(height: 12),
                    Text(
                      'Match Result Endpoint Path (Optional · supports {matchId}, {playerId})',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 6),
                    HigTextField(
                      controller: activeCtrl.matchResultPathCtrl,
                      placeholder: '/matches/{matchId}/result',
                      prefixIcon: CupertinoIcons.flag,
                    ),

                    const SizedBox(height: 14),
                    LayoutBuilder(
                      builder: (ctx, c) {
                        final methodCol = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('HTTP Method', style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigSegmentedControl<String>(
                              backgroundColor: HigColors.surfaceGrouped,
                              groupValue: activeCtrl.httpMethod,
                              onChanged: (v) =>
                                  setState(() => activeCtrl.httpMethod = v),
                              segments: const {'GET': 'GET', 'POST': 'POST'},
                            ),
                          ],
                        );
                        final authCol = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('API Authentication',
                                style: HigTypography.caption()),
                            const SizedBox(height: 6),
                            HigSegmentedControl<String>(
                              backgroundColor: HigColors.surfaceGrouped,
                              groupValue: activeCtrl.authType,
                              onChanged: (v) =>
                                  setState(() => activeCtrl.authType = v),
                              segments: const {
                                'NONE': 'None',
                                'API_KEY_HEADER': 'Header Key',
                                'BEARER_TOKEN': 'Bearer',
                                'QUERY_PARAM': 'Query',
                              },
                            ),
                          ],
                        );
                        if (c.maxWidth >= 640) {
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(width: 170, child: methodCol),
                              const SizedBox(width: 12),
                              Expanded(child: authCol),
                            ],
                          );
                        }
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            methodCol,
                            const SizedBox(height: 12),
                            authCol,
                          ],
                        );
                      },
                    ),

                    if (activeCtrl.authType != 'NONE') ...[
                      const SizedBox(height: 12),
                      if (activeCtrl.authType == 'API_KEY_HEADER') ...[
                        Text('API Key Header Name',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: activeCtrl.authHeaderCtrl,
                          placeholder: 'X-API-Key',
                          prefixIcon: CupertinoIcons.lock_shield,
                        ),
                        const SizedBox(height: 10),
                      ] else if (activeCtrl.authType == 'QUERY_PARAM') ...[
                        Text('Query Parameter Name',
                            style: HigTypography.caption()),
                        const SizedBox(height: 6),
                        HigTextField(
                          controller: activeCtrl.authParamCtrl,
                          placeholder: 'api_key or key',
                          prefixIcon: CupertinoIcons.search,
                        ),
                        const SizedBox(height: 10),
                      ],
                      Text(
                        activeCtrl.hasStoredSecret
                            ? 'API Secret / Token (Stored server-side: ${activeCtrl.secretHint} — leave blank to keep)'
                            : 'API Secret / Token (Stored server-side only, never exposed to players)',
                        style: HigTypography.caption(),
                      ),
                      const SizedBox(height: 6),
                      HigTextField(
                        controller: activeCtrl.authSecretCtrl,
                        placeholder: activeCtrl.hasStoredSecret
                            ? 'Leave blank to keep stored key (${activeCtrl.secretHint})'
                            : 'Paste your server API key or Bearer token',
                        prefixIcon: CupertinoIcons.lock,
                        obscureText: true,
                      ),
                    ],

                    const SizedBox(height: 12),
                    Text(
                      _launchLabelFor(activeKey),
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 6),
                    HigTextField(
                      controller: activeCtrl.launchUriCtrl,
                      placeholder: _launchPlaceholderFor(activeKey),
                      prefixIcon: CupertinoIcons.arrow_up_right_square,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // STEP 3: JSON Stats Field Mapping
              GlassCard(
                radius: 18,
                padding: EdgeInsets.all(isCompact ? 16 : 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('3. JSON Stats Field Mapping',
                        style: HigTypography.title3()),
                    const SizedBox(height: 4),
                    Text(
                      'Tell playverzus.xyz which dot-notation JSON keys contain each stat in your API response (e.g. data.stats.score or chess_blitz.last.rating).',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 14),
                    _twoColInputs(
                      'Score / Rating JSON Path',
                      _scorePathCtrl,
                      'e.g. stats.score or chess_blitz.last.rating',
                      'Wins JSON Path',
                      _winsPathCtrl,
                      'e.g. stats.wins',
                    ),
                    const SizedBox(height: 12),
                    _twoColInputs(
                      'Losses JSON Path',
                      _lossesPathCtrl,
                      'e.g. stats.losses',
                      'Kills / Secondary Metric Path',
                      _killsPathCtrl,
                      'e.g. stats.kills (optional)',
                    ),
                    const SizedBox(height: 12),
                    _twoColInputs(
                      'Rank / Tier JSON Path',
                      _rankPathCtrl,
                      'e.g. stats.rank (optional)',
                      'Match Winner ID Path',
                      _winnerPathCtrl,
                      'e.g. match.winnerId (optional)',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // STEP 4: Live Test Fetch & Publish
              GlassCard(
                radius: 18,
                padding: EdgeInsets.all(isCompact ? 16 : 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('4. Test Live Stats Fetch & Publish',
                        style: HigTypography.title3()),
                    const SizedBox(height: 4),
                    Text(
                      'Verify playverzus.xyz can reach your $activeKey API server-side and extract mapped stats in real time.',
                      style: HigTypography.caption(),
                    ),
                    const SizedBox(height: 14),
                    _twoColInputs(
                      'Sample Player ID / Handle',
                      _samplePlayerIdCtrl,
                      'e.g. hikaru or player_123',
                      'Sample Match ID (Optional)',
                      _sampleMatchIdCtrl,
                      'e.g. match_9901',
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        HigButton(
                          label: 'Test Live Stats Fetch',
                          icon: CupertinoIcons.bolt_fill,
                          variant: HigButtonVariant.secondary,
                          loading: _testing,
                          onPressed: _runLiveTest,
                        ),
                        HigButton(
                          label: _isEdit
                              ? 'Save Game API Configuration'
                              : 'Publish Game to playverzus.xyz',
                          icon: CupertinoIcons.checkmark_seal_fill,
                          loading: _saving,
                          onPressed: _saveGame,
                        ),
                      ],
                    ),

                    if (_lastTestResult != null) ...[
                      const SizedBox(height: 16),
                      _LiveFetchResultPanel(result: _lastTestResult!),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _twoColInputs(
    String labelA,
    TextEditingController ctrlA,
    String hintA,
    String labelB,
    TextEditingController ctrlB,
    String hintB,
  ) {
    return LayoutBuilder(
      builder: (ctx, c) {
        final colA = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(labelA, style: HigTypography.caption()),
            const SizedBox(height: 6),
            HigTextField(controller: ctrlA, placeholder: hintA),
          ],
        );
        final colB = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(labelB, style: HigTypography.caption()),
            const SizedBox(height: 6),
            HigTextField(controller: ctrlB, placeholder: hintB),
          ],
        );
        if (c.maxWidth >= 520) {
          return Row(
            children: [
              Expanded(child: colA),
              const SizedBox(width: 12),
              Expanded(child: colB),
            ],
          );
        }
        return Column(
          children: [
            colA,
            const SizedBox(height: 12),
            colB,
          ],
        );
      },
    );
  }

  IconData _platformIcon(String p) {
    switch (p) {
      case 'PC':
        return CupertinoIcons.desktopcomputer;
      case 'CONSOLE':
        return CupertinoIcons.game_controller;
      case 'MOBILE':
        return CupertinoIcons.device_phone_portrait;
      default:
        return CupertinoIcons.globe;
    }
  }

  String _launchLabelFor(String platform) {
    switch (platform) {
      case 'MOBILE':
        return 'Android Package ID / iOS URL Scheme (Optional · for Auto-Scan & Launch)';
      case 'PC':
        return 'PC Launcher Deep-Link URI (Optional · e.g. steam://rungameid/...)';
      case 'WEB':
        return 'Web Play URL (Optional · e.g. https://play.yourgame.com)';
      case 'CONSOLE':
        return 'Console Cross-Play Lobby Prefix (Optional)';
      default:
        return 'Auto-Launch URI / Package ID (Optional)';
    }
  }

  String _launchPlaceholderFor(String platform) {
    switch (platform) {
      case 'MOBILE':
        return 'com.yourstudio.yourgame';
      case 'PC':
        return 'steam://rungameid/123456';
      case 'WEB':
        return 'https://play.yourgame.com/match/{matchId}';
      case 'CONSOLE':
        return 'Cross-play lobby code format';
      default:
        return 'steam://... or com.studio.game or https://...';
    }
  }
}

class _LiveFetchResultPanel extends StatelessWidget {
  final LiveStatsFetchResult result;
  const _LiveFetchResultPanel({required this.result});

  @override
  Widget build(BuildContext context) {
    final borderColor = result.ok ? HigColors.emerald : HigColors.crimson;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: borderColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              HigBadge(
                label: result.ok
                    ? 'HTTP ${result.statusCode} OK'
                    : 'HTTP ${result.statusCode} FAILED',
                tone: result.ok ? HigBadgeTone.emerald : HigBadgeTone.crimson,
              ),
              HigBadge(
                label: '${result.latencyMs}ms',
                tone: HigBadgeTone.neutral,
              ),
              if (result.platform.isNotEmpty)
                HigBadge(
                  label: result.platform,
                  tone: HigBadgeTone.copper,
                ),
            ],
          ),
          if (result.resolvedUrl.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              result.resolvedUrl,
              style: HigTypography.mono(size: 11, color: HigColors.labelSecondary),
            ),
          ],
          if (result.error != null) ...[
            const SizedBox(height: 8),
            Text(
              result.error!,
              style: HigTypography.footnote(color: HigColors.crimson),
            ),
          ],
          if (result.extractedStats.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Extracted Mapped Stats',
                style: HigTypography.headline().copyWith(fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: result.extractedStats.entries.map((e) {
                return Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: HigColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: HigColors.separator),
                  ),
                  child: Text(
                    '${e.key.toUpperCase()}: ${e.value}',
                    style: HigTypography.mono(
                      size: 11.5,
                      color: HigColors.emerald,
                    ).copyWith(fontWeight: FontWeight.w700),
                  ),
                );
              }).toList(),
            ),
          ] else if (result.ok) ...[
            const SizedBox(height: 8),
            Text(
              'API responded with 200 OK, but no mapped paths matched yet. Check the raw JSON below and update your dot-notation paths.',
              style: HigTypography.caption(color: HigColors.amber),
            ),
          ],
          if (result.rawPreview.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Raw API Response Preview',
                style: HigTypography.caption()),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxHeight: 190),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: HigColors.canvas,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: HigColors.separator),
              ),
              child: SingleChildScrollView(
                child: SelectableText(
                  result.rawPreview,
                  style: HigTypography.mono(
                    size: 10.5,
                    color: HigColors.labelSecondary,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
