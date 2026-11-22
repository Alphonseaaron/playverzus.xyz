import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

class SupportScreen extends ConsumerStatefulWidget {
  final int initialTab; // 0 = Polls & Ideas, 1 = Support Tickets
  const SupportScreen({super.key, this.initialTab = 0});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  late int _tab;
  bool _loading = false;
  String? _error;

  List<Map<String, dynamic>> _polls = const [];
  List<Map<String, dynamic>> _myTickets = const [];
  Map<String, dynamic>? _openTicket;

  // Suggest idea controllers
  final _ideaTitleCtrl = TextEditingController();
  final _ideaDescCtrl = TextEditingController();
  String _ideaCategory = 'FEATURE';

  // New ticket controllers
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  final _replyCtrl = TextEditingController();
  String _ticketCategory = 'GENERAL';
  bool _submitting = false;
  String? _ideaTitleErr;
  String? _subjectErr;
  String? _messageErr;

  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _ideaTitleCtrl.dispose();
    _ideaDescCtrl.dispose();
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final session = ref.read(playerSessionProvider);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final pollsRes = await ApiClient.get('/polls');
      if (pollsRes is List) {
        _polls = pollsRes.whereType<Map<String, dynamic>>().toList();
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}

    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      try {
        final tRes = await ApiClient.get('/support/my-tickets');
        if (tRes is List) {
          _myTickets = tRes.whereType<Map<String, dynamic>>().toList();
        } else if (tRes is Map && tRes['tickets'] is List) {
          _myTickets = (tRes['tickets'] as List)
              .whereType<Map<String, dynamic>>()
              .toList();
        }
      } on ApiException catch (e) {
        _error ??= e.message;
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _vote(String pollId, int optionIndex) async {
    try {
      await ApiClient.post('/polls/$pollId/vote', data: {
        'optionIndex': optionIndex,
      });
      ref
          .read(toastProvider.notifier)
          .show('Vote recorded', tone: ToastTone.success);
      await _loadData();
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    }
  }

  Future<void> _submitIdea() async {
    if (_ideaTitleCtrl.text.trim().isEmpty) {
      setState(() => _ideaTitleErr = 'Add a short title for your idea above.');
      return;
    }
    setState(() {
      _ideaTitleErr = null;
      _submitting = true;
    });
    try {
      await ApiClient.post('/polls/suggest', data: {
        'title': _ideaTitleCtrl.text.trim(),
        'description': _ideaDescCtrl.text.trim(),
        'category': _ideaCategory,
      });
      _ideaTitleCtrl.clear();
      _ideaDescCtrl.clear();
      ref.read(toastProvider.notifier).show(
            'Idea submitted for review',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitTicket() async {
    final session = ref.read(playerSessionProvider);
    final noSubj = _subjectCtrl.text.trim().isEmpty;
    final noMsg = _messageCtrl.text.trim().isEmpty;
    if (noSubj || noMsg) {
      setState(() {
        _subjectErr = noSubj ? 'Enter a short topic for your question or dispute.' : null;
        _messageErr = noMsg ? 'Tell us what happened so our team can help you faster.' : null;
      });
      return;
    }
    setState(() {
      _subjectErr = null;
      _messageErr = null;
      _submitting = true;
    });
    try {
      await ApiClient.post('/support/tickets', data: {
        'name': session.username,
        'email': session.email,
        'subject': _subjectCtrl.text.trim(),
        'message': _messageCtrl.text.trim(),
        'category': _ticketCategory,
      });
      _subjectCtrl.clear();
      _messageCtrl.clear();
      ref.read(toastProvider.notifier).show(
            'Support ticket created',
            tone: ToastTone.success,
          );
      await _loadData();
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openTicketThread(String ticketId) async {
    try {
      final detail = await ApiClient.get('/support/tickets/$ticketId');
      if (detail is Map<String, dynamic> && mounted) {
        setState(() => _openTicket = detail);
      }
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    }
  }

  Future<void> _sendTicketReply() async {
    final id = (_openTicket?['id'] ?? '').toString();
    if (id.isEmpty || _replyCtrl.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    try {
      await ApiClient.post('/support/tickets/$id/reply', data: {
        'message': _replyCtrl.text.trim(),
      });
      _replyCtrl.clear();
      await _openTicketThread(id);
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 920,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                HigSegmentedControl<int>(
                  groupValue: _tab,
                  onChanged: (v) => setState(() => _tab = v),
                  segments: {
                    0: 'Community Polls (${_polls.length})',
                    1: 'Support Tickets (${_myTickets.length})',
                  },
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _loadData),
                ],

                const SizedBox(height: 14),

                if (_loading && _polls.isEmpty && _myTickets.isEmpty)
                  const HigLoadingCard(message: 'Loading community data...')
                else if (_tab == 0)
                  _buildPollsTab()
                else
                  _buildSupportTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPollsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_polls.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.checkmark_rectangle,
            title: 'No active community polls yet',
            subtitle:
                'Propose a new game or feature below — popular ideas become official polls.',
          )
        else
          ..._polls.map((p) {
            final id = (p['id'] ?? '').toString();
            final title = (p['title'] ?? '').toString();
            final desc = (p['description'] ?? '').toString();
            final status = (p['status'] ?? 'ACTIVE_VOTING').toString();
            final breakdown = (p['optionBreakdown'] as List?)
                    ?.whereType<Map<String, dynamic>>()
                    .toList() ??
                const [];
            final rawOpts = (p['options'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                const [];

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(title, style: HigTypography.headline()),
                        ),
                        HigBadge(label: status.replaceAll('_', ' ')),
                      ],
                    ),
                    if (desc.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(desc, style: HigTypography.footnote()),
                    ],
                    const SizedBox(height: 12),
                    if (breakdown.isNotEmpty)
                      ...breakdown.map((opt) {
                        final idx = (opt['index'] as num?)?.toInt() ?? 0;
                        final text = (opt['text'] ?? '').toString();
                        final votes = (opt['votes'] as num?)?.toInt() ?? 0;
                        final pct = (opt['percent'] as num?)?.toInt() ?? 0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text('$text ($votes · $pct%)',
                                    style: HigTypography.footnote(
                                        color: HigColors.labelPrimary)),
                              ),
                              HigButton(
                                label: 'Vote',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () => _vote(id, idx),
                              ),
                            ],
                          ),
                        );
                      })
                    else
                      ...List.generate(
                        rawOpts.length,
                        (idx) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(rawOpts[idx],
                                    style: HigTypography.footnote(
                                        color: HigColors.labelPrimary)),
                              ),
                              HigButton(
                                label: 'Vote',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () => _vote(id, idx),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),

        const SizedBox(height: 14),

        // Propose New Idea / Game Form
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Suggest a Feature or Game', style: HigTypography.title3()),
              const SizedBox(height: 10),
              HigTextField(
                controller: _ideaTitleCtrl,
                placeholder: 'Idea title (e.g. Add Call of Duty: Mobile)',
                errorText: _ideaTitleErr,
                onChanged: (_) {
                  if (_ideaTitleErr != null) setState(() => _ideaTitleErr = null);
                },
              ),
              const SizedBox(height: 10),
              HigTextField(
                controller: _ideaDescCtrl,
                placeholder: 'Why should we add this?',
              ),
              const SizedBox(height: 12),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 10,
                children: [
                  SizedBox(
                    width: 260,
                    child: HigSegmentedControl<String>(
                      backgroundColor: HigColors.surfaceGrouped,
                      groupValue: _ideaCategory,
                      onChanged: (v) => setState(() => _ideaCategory = v),
                      segments: const {
                        'FEATURE': 'Feature',
                        'GAME': 'Game',
                        'RULES': 'Rules',
                      },
                    ),
                  ),
                  HigButton(
                    label: 'Submit Suggestion',
                    size: HigButtonSize.small,
                    loading: _submitting,
                    onPressed: _submitIdea,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSupportTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Open Support Ticket', style: HigTypography.title3()),
              const SizedBox(height: 4),
              Text(
                'Contact staff about match disputes, deposits, payouts, or account issues.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 12),
              HigSegmentedControl<String>(
                backgroundColor: HigColors.surfaceGrouped,
                groupValue: _ticketCategory,
                onChanged: (v) => setState(() => _ticketCategory = v),
                segments: const {
                  'GENERAL': 'General',
                  'MATCH_DISPUTE': 'Dispute',
                  'BILLING': 'Payouts',
                },
              ),
              const SizedBox(height: 12),
              HigTextField(
                controller: _subjectCtrl,
                placeholder: 'Subject',
                errorText: _subjectErr,
                onChanged: (_) {
                  if (_subjectErr != null) setState(() => _subjectErr = null);
                },
              ),
              const SizedBox(height: 10),
              HigTextField(
                controller: _messageCtrl,
                placeholder: 'Describe the issue in detail...',
                errorText: _messageErr,
                onChanged: (_) {
                  if (_messageErr != null) setState(() => _messageErr = null);
                },
              ),
              const SizedBox(height: 14),
              HigButton(
                label: 'Submit Ticket',
                size: HigButtonSize.large,
                fullWidth: true,
                loading: _submitting,
                onPressed: _submitTicket,
              ),
            ],
          ),
        ),

        if (_openTicket != null) ...[
          const SizedBox(height: 14),
          GlassCard(
            radius: 16,
            padding: const EdgeInsets.all(18),
            borderColor: HigColors.brand,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        (_openTicket!['subject'] ?? 'Ticket').toString(),
                        style: HigTypography.headline(),
                      ),
                    ),
                    HigButton(
                      label: 'Close',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.ghost,
                      onPressed: () => setState(() => _openTicket = null),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  (_openTicket!['message'] ?? '').toString(),
                  style: HigTypography.footnote(),
                ),
                const SizedBox(height: 12),
                ...((_openTicket!['messages'] as List?) ?? const [])
                    .whereType<Map<String, dynamic>>()
                    .map((m) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${m['sender_name'] ?? 'User'} (${m['sender_role'] ?? ''})',
                                  style: HigTypography.caption(
                                      color: HigColors.brandBright),
                                ),
                                Text(
                                  (m['message'] ?? '').toString(),
                                  style: HigTypography.footnote(
                                      color: HigColors.labelPrimary),
                                ),
                              ],
                            ),
                          ),
                        )),
                Row(
                  children: [
                    Expanded(
                      child: HigTextField(
                        controller: _replyCtrl,
                        placeholder: 'Write a reply...',
                      ),
                    ),
                    const SizedBox(width: 8),
                    HigButton(
                      label: 'Send',
                      size: HigButtonSize.small,
                      loading: _submitting,
                      onPressed: _sendTicketReply,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 14),

        if (_myTickets.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.chat_bubble_2,
            title: 'No support tickets submitted yet',
            subtitle: 'Your submitted support requests and staff replies appear here.',
          )
        else
          ..._myTickets.map((t) {
            final id = (t['id'] ?? '').toString();
            final subject = (t['subject'] ?? 'Ticket').toString();
            final status = (t['status'] ?? 'OPEN').toString();
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                onTap: () => _openTicketThread(id),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(subject, style: HigTypography.headline()),
                          Text((t['category'] ?? 'GENERAL').toString(),
                              style: HigTypography.caption()),
                        ],
                      ),
                    ),
                    HigBadge(label: status),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
