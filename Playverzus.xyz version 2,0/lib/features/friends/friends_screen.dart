import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client.dart';
import '../../core/network/friendly_errors.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  final _addCtrl = TextEditingController();
  bool _loading = false;
  bool _submitting = false;
  String? _error;
  List<Map<String, dynamic>> _friends = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadFriends());
  }

  @override
  void dispose() {
    _addCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFriends() async {
    final session = ref.read(playerSessionProvider);
    setState(() {
      _loading = true;
      _error = null;
    });

    if (session.accessToken == null || session.accessToken!.isEmpty) {
      setState(() {
        _loading = false;
        _friends = const [];
      });
      return;
    }

    try {
      final res = await ApiClient.get('/social/friends');
      if (res is List) {
        _friends = res.whereType<Map<String, dynamic>>().toList();
      } else if (res is Map && res['friends'] is List) {
        _friends = (res['friends'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _sendRequest() async {
    final raw = _addCtrl.text.trim().replaceAll('@', '');
    if (raw.isEmpty) return;

    setState(() => _submitting = true);
    try {
      String targetId = raw;
      final isUuid = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        caseSensitive: false,
      ).hasMatch(raw);
      if (!isUuid) {
        dynamic resolved;
        try {
          resolved = await ApiClient.post('/auth/resolve-username', data: {
            'username': raw,
          });
        } on ApiException catch (e) {
          if (!mounted) return;
          final notFound = e.statusCode == 404 ||
              e.message.toLowerCase().contains('not find') ||
              e.message.toLowerCase().contains('no competitor');
          ref.read(toastProvider.notifier).show(
                notFound ? 'Player not found' : e.message,
                body: notFound
                    ? 'Could not find a player named @$raw. Double-check their username spelling.'
                    : null,
                tone: ToastTone.error,
              );
          return;
        }
        final resolvedId = (resolved is Map)
            ? (resolved['userId'] ?? resolved['id'])?.toString()
            : null;
        if (resolvedId == null || resolvedId.isEmpty) {
          if (mounted) {
            ref.read(toastProvider.notifier).show(
                  'Player not found',
                  body: 'Could not find a competitor named @$raw.',
                  tone: ToastTone.error,
                );
          }
          return;
        }
        targetId = resolvedId;
      }

      await ApiClient.post('/social/friends/request', data: {
        'addresseeId': targetId,
      });
      _addCtrl.clear();
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Friend request sent to @$raw',
            tone: ToastTone.success,
          );
      await _loadFriends();
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            FriendlyError.humanize(e),
            tone: ToastTone.error,
          );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _acceptRequest(String friendshipId) async {
    try {
      await ApiClient.post('/social/friends/accept', data: {
        'friendshipId': friendshipId,
      });
      ref.read(toastProvider.notifier).show(
            'Friend request accepted',
            tone: ToastTone.success,
          );
      await _loadFriends();
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    }
  }

  Future<void> _blockUser(String targetId, String username) async {
    try {
      await ApiClient.post('/social/friends/block', data: {
        'targetId': targetId,
      });
      ref.read(toastProvider.notifier).show(
            'Blocked @$username',
            tone: ToastTone.info,
          );
      await _loadFriends();
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);

    return RefreshIndicator(
      onRefresh: _loadFriends,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 920,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Friends & Squads Header Card (Real API-backed only)
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          Text('Friends & Squads',
                              style: HigTypography.title2()),
                          HigBadge(
                            label: '${_friends.length} CONNECTED',
                            tone: HigBadgeTone.copper,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Add rivals by @username to send direct 1v1 or squad challenges from @${session.username}.',
                        style: HigTypography.footnote(),
                      ),
                      const SizedBox(height: 14),
                      HigButton(
                        label: 'Create Direct / Squad Duel',
                        icon: CupertinoIcons.add,
                        size: HigButtonSize.small,
                        onPressed: () => context.push('/matches/new'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 2. Send Friend Request
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(16),
                  child: Responsive.isCompact(context)
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            HigTextField(
                              controller: _addCtrl,
                              placeholder: 'Add player by @username',
                              prefixIcon: CupertinoIcons.person_add,
                            ),
                            const SizedBox(height: 10),
                            HigButton(
                              label: 'Send Friend Request',
                              loading: _submitting,
                              fullWidth: true,
                              onPressed: _sendRequest,
                            ),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: HigTextField(
                                controller: _addCtrl,
                                placeholder: 'Add player by @username',
                                prefixIcon: CupertinoIcons.person_add,
                              ),
                            ),
                            const SizedBox(width: 10),
                            HigButton(
                              label: 'Send Request',
                              loading: _submitting,
                              onPressed: _sendRequest,
                            ),
                          ],
                        ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _loadFriends),
                ],

                const SizedBox(height: 14),

                // 3. Friends & Pending Requests
                if (_loading)
                  const HigLoadingCard(message: 'Loading friends...')
                else if (_friends.isEmpty)
                  const HigEmptyState(
                    icon: CupertinoIcons.person_2,
                    title: 'No friends connected yet',
                    subtitle:
                        'Send a friend request by @username above to challenge rivals directly or build a squad.',
                  )
                else
                  GlassCard(
                    radius: 16,
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: List.generate(_friends.length, (i) {
                        final f = _friends[i];
                        final friendshipId = (f['id'] ?? '').toString();
                        final status =
                            (f['status'] ?? 'ACCEPTED').toString().toUpperCase();
                        final other = (f['friend'] as Map?) ??
                            (f['addressee'] as Map?) ??
                            (f['requester'] as Map?) ??
                            f;
                        final targetId = (other['id'] ?? '').toString();
                        final username =
                            (other['username'] ?? 'player').toString();

                        return Column(
                          children: [
                            ListTile(
                              onTap: () => context.push('/profile/$username'),
                              leading: Container(
                                width: 38,
                                height: 38,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: HigColors.surfaceElevated,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  username.isNotEmpty
                                      ? username[0].toUpperCase()
                                      : 'P',
                                  style: HigTypography.headline(),
                                ),
                              ),
                              title: Text('@$username',
                                  style: HigTypography.headline()
                                      .copyWith(fontSize: 14)),
                              subtitle: Text(
                                status == 'PENDING'
                                    ? 'Pending request'
                                    : 'Connected',
                                style: HigTypography.caption(),
                              ),
                              trailing: Wrap(
                                spacing: 6,
                                children: [
                                  if (status == 'PENDING')
                                    HigButton(
                                      label: 'Accept',
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.emerald,
                                      onPressed: () =>
                                          _acceptRequest(friendshipId),
                                    )
                                  else
                                    HigButton(
                                      label: 'Challenge',
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      onPressed: () =>
                                          context.push('/matches/new'),
                                    ),
                                  HigButton(
                                    label: 'Block',
                                    size: HigButtonSize.small,
                                    variant: HigButtonVariant.destructive,
                                    onPressed: () =>
                                        _blockUser(targetId, username),
                                  ),
                                ],
                              ),
                            ),
                            if (i < _friends.length - 1)
                              const Divider(height: 1),
                          ],
                        );
                      }),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
