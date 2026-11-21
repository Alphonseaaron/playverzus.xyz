import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Supports both `/profile` (authenticated user's own profile) and
/// `/profile/:username` (public competitor profile fetched via `GET /profile/:username`).
class ProfileScreen extends ConsumerStatefulWidget {
  final String? lookupUsername;
  const ProfileScreen({super.key, this.lookupUsername});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _loadingRemote = false;
  bool _sendingFriendReq = false;
  bool _friendReqSent = false;
  String? _remoteError;
  Map<String, dynamic>? _remoteProfile;
  Map<String, dynamic>? _myProfileMeta;
  List<Map<String, dynamic>> _remoteMatches = const [];

  bool get _isViewingOther {
    final me = ref.read(playerSessionProvider).username;
    return widget.lookupUsername != null &&
        widget.lookupUsername!.isNotEmpty &&
        widget.lookupUsername!.toLowerCase() != me.toLowerCase();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.lookupUsername != null && widget.lookupUsername!.isNotEmpty) {
        _loadRemoteProfile();
      } else {
        _loadMyProfileMeta();
      }
    });
  }

  Future<void> _loadMyProfileMeta() async {
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) return;
    try {
      final p = await ApiClient.get('/profile/me');
      if (p is Map<String, dynamic> && mounted) {
        setState(() => _myProfileMeta = p);
      }
    } catch (_) {}
  }

  Future<void> _sendFriendRequest() async {
    final targetId = (_remoteProfile?['id'] ?? '').toString();
    if (targetId.isEmpty) return;
    setState(() => _sendingFriendReq = true);
    try {
      await ApiClient.post('/social/friends/request', data: {
        'addresseeId': targetId,
      });
      if (!mounted) return;
      setState(() => _friendReqSent = true);
      ref.read(toastProvider.notifier).show(
            'Friend request sent to @${widget.lookupUsername}',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _sendingFriendReq = false);
    }
  }

  Future<void> _loadRemoteProfile() async {
    final target = widget.lookupUsername;
    if (target == null || target.isEmpty) return;
    setState(() {
      _loadingRemote = true;
      _remoteError = null;
    });
    try {
      final p = await ApiClient.get('/profile/$target');
      if (p is Map<String, dynamic>) _remoteProfile = p;
      final m = await ApiClient.get('/profile/$target/matches');
      if (m is List) {
        _remoteMatches = m.whereType<Map<String, dynamic>>().toList();
      }
    } on ApiException catch (e) {
      _remoteError = e.message;
    } catch (_) {}
    if (mounted) setState(() => _loadingRemote = false);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final handles = ref.watch(gameAccountsProvider);
    final machine = ref.watch(machineAuthProvider);
    final arena = ref.watch(arenaDataProvider);

    final viewingOther = _isViewingOther;
    final displayUsername = viewingOther
        ? (_remoteProfile?['username']?.toString() ?? widget.lookupUsername!)
        : session.username;
    final displayElo = viewingOther
        ? ((_remoteProfile?['elo_rating'] as num?)?.toInt() ?? 1200)
        : session.elo;
    final displayWins = viewingOther
        ? ((_remoteProfile?['wins'] as num?)?.toInt() ?? 0)
        : session.wins;
    final displayLosses = viewingOther
        ? ((_remoteProfile?['losses'] as num?)?.toInt() ?? 0)
        : session.losses;
    final displayCountry = viewingOther
        ? (_remoteProfile?['country_code'] ?? _remoteProfile?['region'] ?? '')
            .toString()
        : (_myProfileMeta?['country_code'] ?? session.countryCode).toString();
    final trustScore = viewingOther
        ? (_remoteProfile?['trust_score'] as num?)?.toInt()
        : (_myProfileMeta?['trust_score'] as num?)?.toInt();
    final nextTierElo = ((displayElo / 150).ceil() * 150).clamp(800, 2200);
    final prevTierElo = (nextTierElo - 150).clamp(0, nextTierElo);
    final tierProgress = nextTierElo > prevTierElo
        ? ((displayElo - prevTierElo) / (nextTierElo - prevTierElo))
            .clamp(0.0, 1.0)
        : 1.0;
    final initial =
        displayUsername.isNotEmpty ? displayUsername[0].toUpperCase() : 'P';

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 920,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_loadingRemote)
                const HigLoadingCard(message: 'Loading player profile...')
              else ...[
                if (_remoteError != null) ...[
                  HigErrorBanner(
                    message: _remoteError!,
                    onRetry: _loadRemoteProfile,
                  ),
                  const SizedBox(height: 12),
                ],
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: HigColors.brand,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              initial,
                              style: HigTypography.title1(color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    if (displayCountry.isNotEmpty) ...[
                                      CountryFlag(
                                        code: displayCountry,
                                        width: 22,
                                        height: 15,
                                      ),
                                      const SizedBox(width: 8),
                                    ],
                                    Expanded(
                                      child: Text(
                                        '@$displayUsername',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: HigTypography.title2(),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    EloLevelBadge(
                                      elo: displayElo,
                                      showNumeric: true,
                                      size: 22,
                                    ),
                                    HigBadge(
                                      label:
                                          '${displayWins}W - ${displayLosses}L',
                                      tone: HigBadgeTone.emerald,
                                    ),
                                    if (!viewingOther)
                                      HigBadge(
                                        label: machine.capabilities.osLabel
                                            .replaceAll(' Browser', ''),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          if (!Responsive.isCompact(context)) ...[
                            const SizedBox(width: 10),
                            if (viewingOther)
                              Wrap(
                                spacing: 8,
                                children: [
                                  if (_remoteProfile?['id'] != null)
                                    HigButton(
                                      label: _friendReqSent
                                          ? 'Requested'
                                          : 'Add Friend',
                                      icon: _friendReqSent
                                          ? CupertinoIcons.checkmark_alt
                                          : CupertinoIcons.person_add,
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      loading: _sendingFriendReq,
                                      onPressed: _friendReqSent
                                          ? null
                                          : _sendFriendRequest,
                                    ),
                                  HigButton(
                                    label: 'Challenge 1v1',
                                    size: HigButtonSize.small,
                                    onPressed: () =>
                                        context.push('/matches/new'),
                                  ),
                                ],
                              )
                            else
                              HigButton(
                                label: 'Share',
                                icon: CupertinoIcons.share,
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () {
                                  Clipboard.setData(
                                    ClipboardData(
                                      text:
                                          'https://playverzus.xyz/#/profile/$displayUsername',
                                    ),
                                  );
                                  ref.read(toastProvider.notifier).show(
                                        'Profile link copied',
                                        tone: ToastTone.success,
                                      );
                                },
                              ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 14),
                      // Elo Level Progress + Real DB Trust Score Strip
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 12,
                        runSpacing: 6,
                        children: [
                          Text(
                            '${EloLevelBadge.infoFor(displayElo).label} · $displayElo / $nextTierElo Rating',
                            style: HigTypography.caption(),
                          ),
                          if (trustScore != null)
                            HigBadge(
                              label: 'TRUST SCORE $trustScore%',
                              tone: trustScore >= 80
                                  ? HigBadgeTone.emerald
                                  : HigBadgeTone.copper,
                              icon: CupertinoIcons.shield_lefthalf_fill,
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: tierProgress,
                          minHeight: 6,
                          backgroundColor: HigColors.surfaceElevated,
                          valueColor:
                              const AlwaysStoppedAnimation(HigColors.brand),
                        ),
                      ),
                      if (Responsive.isCompact(context)) ...[
                        const SizedBox(height: 14),
                        if (viewingOther)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (_remoteProfile?['id'] != null) ...[
                                HigButton(
                                  label: _friendReqSent
                                      ? 'Friend Request Sent'
                                      : 'Add Friend',
                                  icon: _friendReqSent
                                      ? CupertinoIcons.checkmark_alt
                                      : CupertinoIcons.person_add,
                                  size: HigButtonSize.small,
                                  variant: HigButtonVariant.secondary,
                                  fullWidth: true,
                                  loading: _sendingFriendReq,
                                  onPressed: _friendReqSent
                                      ? null
                                      : _sendFriendRequest,
                                ),
                                const SizedBox(height: 8),
                              ],
                              HigButton(
                                label: 'Challenge 1v1',
                                size: HigButtonSize.small,
                                fullWidth: true,
                                onPressed: () => context.push('/matches/new'),
                              ),
                            ],
                          )
                        else
                          HigButton(
                            label: 'Share Profile Link',
                            icon: CupertinoIcons.share,
                            size: HigButtonSize.small,
                            variant: HigButtonVariant.secondary,
                            fullWidth: true,
                            onPressed: () {
                              Clipboard.setData(
                                ClipboardData(
                                  text:
                                      'https://playverzus.xyz/#/profile/$displayUsername',
                                ),
                              );
                              ref.read(toastProvider.notifier).show(
                                    'Profile link copied',
                                    tone: ToastTone.success,
                                  );
                            },
                          ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        viewingOther ? 'Recent Matches' : 'My Match History',
                        style: HigTypography.title3(),
                      ),
                      const SizedBox(height: 12),
                      if (viewingOther) ...[
                        if (_remoteMatches.isEmpty)
                          Text(
                            'No public match history recorded for @$displayUsername yet.',
                            style: HigTypography.footnote(),
                          )
                        else
                          ..._remoteMatches.map((m) {
                            final id = (m['id'] ?? '').toString();
                            final status = (m['status'] ?? '').toString();
                            final fmt = (m['format'] ?? 'BO1').toString();
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text('Match #$id · $fmt',
                                  style: HigTypography.headline()
                                      .copyWith(fontSize: 14)),
                              subtitle: Text('Status: $status',
                                  style: HigTypography.caption()),
                            );
                          }),
                      ] else ...[
                        if (arena.myMatches.isEmpty)
                          Text(
                            'No completed or active matches for @$displayUsername yet.',
                            style: HigTypography.footnote(),
                          )
                        else
                          ...arena.myMatches.map((m) {
                            final g = findOfficialGameById(m.gameId);
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: SizedBox(
                                width: 30,
                                height: 40,
                                child: GamePosterView(game: g, borderRadius: 6),
                              ),
                              title: Text(
                                '${g.displayName} · ${m.format} (${m.roomCode})',
                                style: HigTypography.headline()
                                    .copyWith(fontSize: 14),
                              ),
                              subtitle: Text(
                                'Status: ${m.status}',
                                style: HigTypography.footnote(),
                              ),
                              trailing: HigButton(
                                label: 'Open',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () => context.push('/matches/${m.id}'),
                              ),
                            );
                          }),
                        const Divider(height: 18),
                        Text(
                          '${handles.length} linked game handles · Device ID: ${machine.deviceFingerprint}',
                          style: HigTypography.caption(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
