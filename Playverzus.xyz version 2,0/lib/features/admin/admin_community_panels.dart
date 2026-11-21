import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../developer/developer_repository.dart';
import 'admin_repository.dart';

/// ─── 4. SUPPORT DESK (Tickets, Thread Detail, Reply/Internal Note, Status, Staff Delegation)
class AdminSupportPanel extends ConsumerStatefulWidget {
  const AdminSupportPanel({super.key});

  @override
  ConsumerState<AdminSupportPanel> createState() => _AdminSupportPanelState();
}

class _AdminSupportPanelState extends ConsumerState<AdminSupportPanel> {
  String _statusFilter = 'ALL';
  String _search = '';
  Map<String, dynamic>? _selectedTicket;
  bool _loadingDetail = false;
  final _replyCtrl = TextEditingController();
  bool _isInternalNote = false;
  bool _submitting = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _openTicket(String id) async {
    setState(() => _loadingDetail = true);
    final detail =
        await ref.read(adminConsoleProvider.notifier).fetchTicketDetail(id);
    if (!mounted) return;
    setState(() {
      _loadingDetail = false;
      _selectedTicket = detail;
    });
  }

  Future<void> _sendReply() async {
    final id = (_selectedTicket?['id'] ?? '').toString();
    if (id.isEmpty) return;
    setState(() => _submitting = true);
    final err = await ref.read(adminConsoleProvider.notifier).replyToTicket(
          id,
          _replyCtrl.text,
          isInternalNote: _isInternalNote,
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ref.read(toastProvider.notifier).show(err, tone: ToastTone.error);
    } else {
      _replyCtrl.clear();
      ref.read(toastProvider.notifier).show(
            _isInternalNote ? 'Internal staff note saved' : 'Reply sent',
            tone: ToastTone.success,
          );
      await _openTicket(id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = ref.watch(adminConsoleProvider);
    final filtered = admin.tickets.where((t) {
      final status = (t['status'] ?? 'OPEN').toString().toUpperCase();
      if (_statusFilter != 'ALL' && status != _statusFilter) return false;
      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        final subj = (t['subject'] ?? '').toString().toLowerCase();
        final email = (t['email'] ?? '').toString().toLowerCase();
        if (!subj.contains(q) && !email.contains(q)) return false;
      }
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Support Desk & Staff Delegation',
                  style: HigTypography.title3()),
              const SizedBox(height: 10),
              HigTextField(
                placeholder: 'Search ticket subject or email...',
                prefixIcon: CupertinoIcons.search,
                onChanged: (v) => setState(() => _search = v),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
                      .map((s) {
                    final active = _statusFilter == s;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () => setState(() => _statusFilter = s),
                        child: Container(
                          height: 32,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: active
                                ? HigColors.brand
                                : HigColors.surfaceGrouped,
                            borderRadius: BorderRadius.circular(9),
                            border: Border.all(
                              color:
                                  active ? HigColors.brand : HigColors.separator,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            s.replaceAll('_', ' '),
                            style: HigTypography.caption(
                              color: active
                                  ? Colors.white
                                  : HigColors.labelSecondary,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        if (_loadingDetail)
          const HigLoadingCard(message: 'Loading ticket conversation...')
        else if (_selectedTicket != null) ...[
          _buildTicketDetailCard(_selectedTicket!, admin.staffList),
          const SizedBox(height: 14),
        ],

        if (filtered.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.headphones,
            title: 'No matching support tickets',
            subtitle:
                'Player inquiries, dispute escalations, and payout tickets appear here.',
          )
        else
          ...filtered.map((t) {
            final id = (t['id'] ?? '').toString();
            final numStr = t['ticket_number']?.toString() ?? id;
            final subject = (t['subject'] ?? 'Ticket').toString();
            final status = (t['status'] ?? 'OPEN').toString();
            final priority = (t['priority'] ?? 'NORMAL').toString();
            final email = (t['email'] ?? '').toString();
            final assigned =
                (t['assigned_staff']?['username'] ?? 'Unassigned').toString();

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                onTap: () => _openTicket(id),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('#$numStr · $subject',
                            style: HigTypography.headline()),
                        const SizedBox(height: 3),
                        Text(
                          '$email · Assigned: $assigned',
                          style: HigTypography.caption(),
                        ),
                      ],
                    ),
                    Wrap(
                      spacing: 6,
                      children: [
                        HigBadge(label: priority),
                        HigBadge(
                          label: status,
                          tone: status == 'RESOLVED'
                              ? HigBadgeTone.emerald
                              : HigBadgeTone.copper,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildTicketDetailCard(
    Map<String, dynamic> ticket,
    List<Map<String, dynamic>> staffList,
  ) {
    final id = (ticket['id'] ?? '').toString();
    final subject = (ticket['subject'] ?? '').toString();
    final body = (ticket['message'] ?? '').toString();
    final messages = (ticket['messages'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        const [];

    return GlassCard(
      radius: 16,
      padding: const EdgeInsets.all(18),
      borderColor: HigColors.brand,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(subject, style: HigTypography.title3()),
              ),
              HigButton(
                label: 'Close',
                size: HigButtonSize.small,
                variant: HigButtonVariant.ghost,
                onPressed: () => setState(() => _selectedTicket = null),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(body, style: HigTypography.footnote()),
          const SizedBox(height: 12),

          // Status & Delegation Controls
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final st in ['IN_PROGRESS', 'RESOLVED', 'CLOSED'])
                HigButton(
                  label: 'Set ${st.replaceAll('_', ' ')}',
                  size: HigButtonSize.small,
                  variant: HigButtonVariant.secondary,
                  onPressed: () async {
                    final err = await ref
                        .read(adminConsoleProvider.notifier)
                        .updateTicketStatus(id, status: st);
                    if (err != null) {
                      ref
                          .read(toastProvider.notifier)
                          .show(err, tone: ToastTone.error);
                    } else {
                      ref
                          .read(toastProvider.notifier)
                          .show('Ticket status set to $st',
                              tone: ToastTone.success);
                      await _openTicket(id);
                    }
                  },
                ),
              if (staffList.isNotEmpty)
                ...staffList.take(3).map((s) {
                  final sid = (s['id'] ?? '').toString();
                  final sname = (s['username'] ?? 'Staff').toString();
                  return HigButton(
                    label: 'Assign @$sname',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: () async {
                      final err = await ref
                          .read(adminConsoleProvider.notifier)
                          .delegateTicket(id, sid);
                      if (err != null) {
                        ref
                            .read(toastProvider.notifier)
                            .show(err, tone: ToastTone.error);
                      } else {
                        ref.read(toastProvider.notifier).show(
                              'Assigned to @$sname',
                              tone: ToastTone.success,
                            );
                        await _openTicket(id);
                      }
                    },
                  );
                }),
            ],
          ),

          if (messages.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 10),
            ...messages.map((m) {
              final internal = m['is_internal_note'] == true;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: internal
                        ? HigColors.amber.withValues(alpha: 0.10)
                        : HigColors.surfaceGrouped,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: internal
                          ? HigColors.amber.withValues(alpha: 0.4)
                          : HigColors.separator,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${m['sender_name'] ?? 'Staff'} (${m['sender_role'] ?? 'STAFF'})${internal ? ' · INTERNAL NOTE' : ''}',
                        style: HigTypography.caption(
                          color: internal
                              ? HigColors.amber
                              : HigColors.brandBright,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        (m['message'] ?? '').toString(),
                        style: HigTypography.footnote(
                            color: HigColors.labelPrimary),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],

          const SizedBox(height: 12),
          HigTextField(
            controller: _replyCtrl,
            placeholder: _isInternalNote
                ? 'Write internal staff note...'
                : 'Write reply to player...',
            prefixIcon: CupertinoIcons.chat_bubble,
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CupertinoSwitch(
                    value: _isInternalNote,
                    activeTrackColor: HigColors.amber,
                    onChanged: (v) => setState(() => _isInternalNote = v),
                  ),
                  const SizedBox(width: 8),
                  Text('Internal staff note only',
                      style: HigTypography.caption()),
                ],
              ),
              HigButton(
                label: _isInternalNote ? 'Save Note' : 'Send Reply',
                size: HigButtonSize.small,
                loading: _submitting,
                onPressed: _sendReply,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// ─── 5. POLLS & ROADMAP (Player Suggestions -> Convert to Official Poll, Create Poll, Update Roadmap Status)
class AdminPollsPanel extends ConsumerStatefulWidget {
  const AdminPollsPanel({super.key});

  @override
  ConsumerState<AdminPollsPanel> createState() => _AdminPollsPanelState();
}

class _AdminPollsPanelState extends ConsumerState<AdminPollsPanel> {
  bool _showSuggestions = false;
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _opt1Ctrl = TextEditingController(text: 'Yes, prioritize this');
  final _opt2Ctrl = TextEditingController(text: 'No, focus elsewhere');
  String _category = 'FEATURE';
  String? _suggestedBy;
  String? _suggestedByName;
  bool _creating = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _opt1Ctrl.dispose();
    _opt2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _submitPoll() async {
    setState(() => _creating = true);
    final options = [_opt1Ctrl.text.trim(), _opt2Ctrl.text.trim()]
        .where((o) => o.isNotEmpty)
        .toList();
    final err =
        await ref.read(adminConsoleProvider.notifier).createOfficialPoll(
              title: _titleCtrl.text,
              description: _descCtrl.text,
              category: _category,
              options: options,
              suggestedBy: _suggestedBy,
              suggestedByName: _suggestedByName,
            );
    if (!mounted) return;
    setState(() => _creating = false);
    if (err != null) {
      ref.read(toastProvider.notifier).show(err, tone: ToastTone.error);
    } else {
      _titleCtrl.clear();
      _descCtrl.clear();
      _suggestedBy = null;
      _suggestedByName = null;
      ref
          .read(toastProvider.notifier)
          .show('Official poll published', tone: ToastTone.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = ref.watch(adminConsoleProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Publish Official Poll Form
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Publish Official Roadmap Poll',
                  style: HigTypography.title3()),
              const SizedBox(height: 12),
              HigTextField(
                controller: _titleCtrl,
                placeholder: 'Poll title (e.g. Add Call of Duty Mobile 1v1?)',
              ),
              const SizedBox(height: 10),
              HigTextField(
                controller: _descCtrl,
                placeholder: 'Short description for voters',
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: HigTextField(
                      controller: _opt1Ctrl,
                      placeholder: 'Option 1',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: HigTextField(
                      controller: _opt2Ctrl,
                      placeholder: 'Option 2',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(
                    width: 240,
                    child: HigSegmentedControl<String>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _category,
                      onChanged: (v) => setState(() => _category = v),
                      segments: const {
                        'FEATURE': 'Feature',
                        'GAME': 'Game',
                        'RULES': 'Rules',
                      },
                    ),
                  ),
                  HigButton(
                    label: 'Publish Poll',
                    size: HigButtonSize.small,
                    loading: _creating,
                    onPressed: _submitPoll,
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        HigSegmentedControl<bool>(
          groupValue: _showSuggestions,
          onChanged: (v) => setState(() => _showSuggestions = v),
          segments: {
            false: 'Official Polls (${admin.polls.length})',
            true: 'Player Suggestions (${admin.suggestions.length})',
          },
        ),

        const SizedBox(height: 12),

        if (_showSuggestions) ...[
          if (admin.suggestions.isEmpty)
            const HigEmptyState(
              icon: CupertinoIcons.lightbulb,
              title: 'No pending player suggestions',
              subtitle:
                  'Community feature ideas submitted by players appear here for promotion into official polls.',
            )
          else
            ...admin.suggestions.map((s) {
              final title = (s['title'] ?? '').toString();
              final desc = (s['description'] ?? '').toString();
              final username = (s['username'] ?? 'Player').toString();
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  radius: 14,
                  padding: const EdgeInsets.all(14),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: HigTypography.headline()),
                          Text('By @$username · $desc',
                              style: HigTypography.caption()),
                        ],
                      ),
                      HigButton(
                        label: 'Convert to Poll',
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () {
                          setState(() {
                            _titleCtrl.text = title;
                            _descCtrl.text = desc;
                            _suggestedBy = s['user_id']?.toString();
                            _suggestedByName = username;
                          });
                          ref.read(toastProvider.notifier).show(
                                'Pre-filled poll form above',
                                tone: ToastTone.info,
                              );
                        },
                      ),
                    ],
                  ),
                ),
              );
            }),
        ] else ...[
          if (admin.polls.isEmpty)
            const HigEmptyState(
              icon: CupertinoIcons.checkmark_rectangle,
              title: 'No official polls yet',
              subtitle: 'Publish a poll above to gather community votes.',
            )
          else
            ...admin.polls.map((p) {
              final id = (p['id'] ?? '').toString();
              final title = (p['title'] ?? '').toString();
              final status = (p['status'] ?? 'ACTIVE_VOTING').toString();
              final totalVotes = p['totalVotes'] ?? 0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  radius: 14,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(title, style: HigTypography.headline()),
                          ),
                          HigBadge(
                            label: status.replaceAll('_', ' '),
                            tone: status == 'SHIPPED'
                                ? HigBadgeTone.emerald
                                : HigBadgeTone.copper,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('$totalVotes total votes',
                          style: HigTypography.caption()),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          'ACTIVE_VOTING',
                          'PLANNED',
                          'IN_DEVELOPMENT',
                          'SHIPPED',
                          'CLOSED'
                        ].map((st) {
                          return HigButton(
                            label: st.replaceAll('_', ' '),
                            size: HigButtonSize.small,
                            variant: st == status
                                ? HigButtonVariant.primary
                                : HigButtonVariant.secondary,
                            onPressed: () async {
                              final err = await ref
                                  .read(adminConsoleProvider.notifier)
                                  .updatePollStatus(id, st);
                              if (err != null) {
                                ref
                                    .read(toastProvider.notifier)
                                    .show(err, tone: ToastTone.error);
                              } else {
                                ref.read(toastProvider.notifier).show(
                                      'Poll status updated to $st',
                                      tone: ToastTone.success,
                                    );
                              }
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ],
    );
  }
}

/// ─── 7. GAME PROFILES & ROI CALIBRATION
class AdminGameProfilesPanel extends ConsumerWidget {
  const AdminGameProfilesPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin = ref.watch(adminConsoleProvider);
    final devGames = ref.watch(developerGamesProvider).games;
    final profiles = admin.gameProfiles;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (devGames.isNotEmpty) ...[
          GlassCard(
            radius: 16,
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Studio API-Integrated Games (${devGames.length})',
                  style: HigTypography.title3(),
                ),
                const SizedBox(height: 4),
                Text(
                  'Games registered by verified Game Developers via platform Stats APIs (PC, Console, Mobile, Web).',
                  style: HigTypography.caption(),
                ),
                const SizedBox(height: 12),
                ...devGames.map((g) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: HigColors.surfaceGrouped,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: HigColors.separator),
                      ),
                      child: Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${g.title} (${g.shortName})',
                                  style: HigTypography.headline()),
                              Text(
                                'Studio: ${g.studioName} · ${g.platforms.join(', ')} · ${g.gameType}',
                                style: HigTypography.caption(),
                              ),
                            ],
                          ),
                          Wrap(
                            spacing: 8,
                            children: [
                              HigBadge(
                                label: g.isVerified
                                    ? 'API VERIFIED'
                                    : 'CONFIGURED',
                                tone: g.isVerified
                                    ? HigBadgeTone.emerald
                                    : HigBadgeTone.copper,
                              ),
                              HigButton(
                                label: 'Remove',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.destructive,
                                onPressed: () => ref
                                    .read(developerGamesProvider.notifier)
                                    .deleteGame(g.id),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 10,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Game Profiles Registry (${profiles.isNotEmpty ? profiles.length : officialGames.length})',
                    style: HigTypography.title3(),
                  ),
                  Text(
                    'Approve submitted profiles or calibrate HUD scoreboard coordinates.',
                    style: HigTypography.caption(),
                  ),
                ],
              ),
              HigButton(
                label: 'Auto-Calibrate New Game',
                icon: CupertinoIcons.plus,
                size: HigButtonSize.small,
                onPressed: () => context.go('/games/new'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (profiles.isEmpty)
            const HigEmptyState(
              icon: CupertinoIcons.game_controller,
              title: 'No remote game profiles loaded yet',
              subtitle:
                  'Tap Refresh to load registered profiles from /api/games, or add a new game profile.',
            )
          else
            ...profiles.map((p) {
              final id = (p['id'] ?? '').toString();
              final name =
                  (p['displayName'] ?? p['display_name'] ?? id).toString();
              final platform = (p['platform'] ?? 'PC').toString();
              final gameType =
                  (p['gameType'] ?? p['game_type'] ?? 'HEAD_TO_HEAD')
                      .toString();
              final approved = p['approved'] == true;

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: HigColors.surfaceGrouped,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: HigColors.separator),
                  ),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: HigTypography.headline()),
                          Text('$platform · $gameType',
                              style: HigTypography.caption()),
                        ],
                      ),
                      Wrap(
                        spacing: 8,
                        children: [
                          HigBadge(
                            label: approved ? 'APPROVED' : 'PENDING',
                            tone: approved
                                ? HigBadgeTone.emerald
                                : HigBadgeTone.copper,
                          ),
                          if (!approved)
                            HigButton(
                              label: 'Approve',
                              size: HigButtonSize.small,
                              variant: HigButtonVariant.emerald,
                              onPressed: () async {
                                final err = await ref
                                    .read(adminConsoleProvider.notifier)
                                    .approveGameProfile(id);
                                if (err != null) {
                                  ref
                                      .read(toastProvider.notifier)
                                      .show(err, tone: ToastTone.error);
                                } else {
                                  ref.read(toastProvider.notifier).show(
                                        '$name approved',
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
              );
            }),
        ],
      ),
    ),
      ],
    );
  }
}

/// ─── 9. SEASONS & LADDER RESETS
class AdminSeasonsPanel extends ConsumerStatefulWidget {
  const AdminSeasonsPanel({super.key});

  @override
  ConsumerState<AdminSeasonsPanel> createState() => _AdminSeasonsPanelState();
}

class _AdminSeasonsPanelState extends ConsumerState<AdminSeasonsPanel> {
  final _nameCtrl = TextEditingController();
  int _durationDays = 30;
  bool _submitting = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _submitting = true);
    final now = DateTime.now();
    final err = await ref.read(adminConsoleProvider.notifier).createSeason(
          name: _nameCtrl.text,
          startsAt: now,
          endsAt: now.add(Duration(days: _durationDays)),
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ref.read(toastProvider.notifier).show(err, tone: ToastTone.error);
    } else {
      _nameCtrl.clear();
      ref
          .read(toastProvider.notifier)
          .show('Competitive season launched', tone: ToastTone.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final seasons = ref.watch(adminConsoleProvider).seasons;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Launch Competitive Season', style: HigTypography.title3()),
              const SizedBox(height: 10),
              HigTextField(
                controller: _nameCtrl,
                placeholder: 'Season title (e.g. Season 5: Champions Cup)',
              ),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(
                    width: 240,
                    child: HigSegmentedControl<int>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _durationDays,
                      onChanged: (v) => setState(() => _durationDays = v),
                      segments: const {
                        30: '30 days',
                        60: '60 days',
                        90: '90 days',
                      },
                    ),
                  ),
                  HigButton(
                    label: 'Create Season',
                    size: HigButtonSize.small,
                    loading: _submitting,
                    onPressed: _create,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (seasons.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.rosette,
            title: 'No seasons found',
            subtitle: 'Create a season above to schedule leaderboard cycles.',
          )
        else
          ...seasons.map((s) {
            final name = (s['name'] ?? 'Season').toString();
            final active = s['is_active'] == true;
            final start = (s['starts_at'] ?? '').toString();
            final end = (s['ends_at'] ?? '').toString();
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: HigTypography.headline()),
                          Text(
                            '${start.split('T').first} -> ${end.split('T').first}',
                            style: HigTypography.caption(),
                          ),
                        ],
                      ),
                    ),
                    HigBadge(
                      label: active ? 'ACTIVE' : 'ARCHIVED',
                      tone: active ? HigBadgeTone.emerald : HigBadgeTone.neutral,
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

/// ─── 10. SPONSORS & PRIZE POOL LIQUIDITY
class AdminSponsorsPanel extends ConsumerStatefulWidget {
  const AdminSponsorsPanel({super.key});

  @override
  ConsumerState<AdminSponsorsPanel> createState() => _AdminSponsorsPanelState();
}

class _AdminSponsorsPanelState extends ConsumerState<AdminSponsorsPanel> {
  final _nameCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _urlCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _addSponsor() async {
    setState(() => _submitting = true);
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    final err = await ref.read(adminConsoleProvider.notifier).createSponsor(
          name: _nameCtrl.text,
          websiteUrl: _urlCtrl.text,
          fundedAmount: amount,
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ref.read(toastProvider.notifier).show(err, tone: ToastTone.error);
    } else {
      _nameCtrl.clear();
      _urlCtrl.clear();
      _amountCtrl.clear();
      ref
          .read(toastProvider.notifier)
          .show('Brand sponsor registered', tone: ToastTone.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sponsors = ref.watch(adminConsoleProvider).sponsors;
    final totalFunded = sponsors.fold<double>(
      0,
      (sum, s) => sum + ((s['funded_amount'] as num?)?.toDouble() ?? 0),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Register Brand Sponsor', style: HigTypography.title3()),
                  HigBadge(
                    label: '\$${totalFunded.toStringAsFixed(0)} COMMITTED',
                    tone: HigBadgeTone.emerald,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              HigTextField(
                controller: _nameCtrl,
                placeholder: 'Sponsor / Brand name',
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: HigTextField(
                      controller: _urlCtrl,
                      placeholder: 'Website URL (optional)',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: HigTextField(
                      controller: _amountCtrl,
                      placeholder: 'Funded pool (USD)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              HigButton(
                label: 'Add Sponsor',
                size: HigButtonSize.small,
                loading: _submitting,
                onPressed: _addSponsor,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (sponsors.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.star,
            title: 'No sponsors registered yet',
            subtitle:
                'Commercial partners funding tournament prize pools appear here.',
          )
        else
          ...sponsors.map((s) {
            final name = (s['name'] ?? 'Sponsor').toString();
            final web = (s['website_url'] ?? '').toString();
            final amt = (s['funded_amount'] as num?)?.toDouble() ?? 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name, style: HigTypography.headline()),
                          if (web.isNotEmpty)
                            Text(web, style: HigTypography.caption()),
                        ],
                      ),
                    ),
                    Text(
                      '\$${amt.toStringAsFixed(0)}',
                      style:
                          HigTypography.mono(size: 14, color: HigColors.emerald),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
