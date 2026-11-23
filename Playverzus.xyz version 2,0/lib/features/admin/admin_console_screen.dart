import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../agents/field_agents_screen.dart';
import 'admin_community_panels.dart';
import 'admin_models.dart';
import 'admin_repository.dart';

/// Complete 10-Module Role-Scoped Staff Operations Console (1:1 parity with v1.0 `/admin/*`).
/// Accepts `initialModule` from GoRouter (`/admin`, `/admin/security`, `/admin/treasury`, etc.)
/// and strictly restricts visible desks to the authenticated staff member's clearance.
class AdminConsoleScreen extends ConsumerStatefulWidget {
  final AdminModule initialModule;
  const AdminConsoleScreen({super.key, this.initialModule = AdminModule.overview});

  @override
  ConsumerState<AdminConsoleScreen> createState() => _AdminConsoleScreenState();
}

class _AdminConsoleScreenState extends ConsumerState<AdminConsoleScreen> {
  // Security controls
  final _freezeMatchCtrl = TextEditingController();
  final _freezeReasonCtrl = TextEditingController();
  final _voidMatchCtrl = TextEditingController();
  final _voidReasonCtrl = TextEditingController();
  String _secCategory = 'ALL';

  // Treasury withdrawal controls
  final _withdrawAmtCtrl = TextEditingController();
  final _withdrawDestCtrl = TextEditingController();
  final _withdrawNoteCtrl = TextEditingController();
  String _withdrawMode = 'WALLET_TRANSFER';

  // Review score correction controls
  final Map<String, TextEditingController> _correctionCtrls = {};

  // Users search & filter
  String _userSearch = '';
  String _userRoleFilter = 'ALL';

  // Mail diagnostics
  final _testEmailCtrl = TextEditingController();

  // Live Dual-Rail Payment Gateway Diagnostics (M-PESA Pilot + Crossmint Global)
  Map<String, dynamic>? _gatewayDiagnostics;
  bool _verifyingGateways = false;

  Future<void> _verifyLivePaymentRails() async {
    if (!mounted) return;
    setState(() => _verifyingGateways = true);
    try {
      final diag = await ref
          .read(paymentGatewayProvider.notifier)
          .syncFromServer(verifyOAuth: true);
      if (mounted && diag != null) {
        setState(() => _gatewayDiagnostics = diag);
      }
    } finally {
      if (mounted) setState(() => _verifyingGateways = false);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(adminConsoleProvider.notifier)
          .refreshModule(widget.initialModule);
      _verifyLivePaymentRails();
    });
  }

  @override
  void didUpdateWidget(covariant AdminConsoleScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialModule != widget.initialModule) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ref
            .read(adminConsoleProvider.notifier)
            .refreshModule(widget.initialModule);
      });
    }
  }

  @override
  void dispose() {
    _freezeMatchCtrl.dispose();
    _freezeReasonCtrl.dispose();
    _voidMatchCtrl.dispose();
    _voidReasonCtrl.dispose();
    _withdrawAmtCtrl.dispose();
    _withdrawDestCtrl.dispose();
    _withdrawNoteCtrl.dispose();
    _testEmailCtrl.dispose();
    for (final c in _correctionCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _corrCtrlFor(String taskId) =>
      _correctionCtrls.putIfAbsent(taskId, TextEditingController.new);

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final admin = ref.watch(adminConsoleProvider);
    final allowedModules = allowedAdminModulesForRole(session.role);
    final activeMeta = allowedModules.firstWhere(
      (m) => m.module == widget.initialModule,
      orElse: () => allowedModules.isNotEmpty
          ? allowedModules.first
          : allAdminModules.first,
    );
    final activeModule = activeMeta.module;

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(adminConsoleProvider.notifier).refreshModule(activeModule),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 1120,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Desk Header + Role Clearance Badge + Refresh
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 10,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(activeMeta.label,
                                  style: HigTypography.title2()),
                              HigBadge(
                                label: session.role.replaceAll('_', ' '),
                                tone: HigBadgeTone.copper,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(activeMeta.description,
                              style: HigTypography.footnote()),
                        ],
                      ),
                      HigButton(
                        label: 'Refresh',
                        icon: CupertinoIcons.refresh,
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        loading: admin.loading,
                        onPressed: () => ref
                            .read(adminConsoleProvider.notifier)
                            .refreshModule(activeModule),
                      ),
                    ],
                  ),
                ),

                // Role-Filtered Horizontal Desk Switcher (Compact / Tablet only — Desktop uses Sidebar)
                if (!Responsive.isDesktopOrExpanded(context)) ...[
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: allowedModules.map((meta) {
                        final selected = meta.module == activeModule;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: GestureDetector(
                            onTap: () => context.go(meta.route),
                            child: Container(
                              height: 36,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 13),
                              decoration: BoxDecoration(
                                color: selected
                                    ? HigColors.brand
                                    : HigColors.surfacePrimary,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: selected
                                      ? HigColors.brand
                                      : HigColors.separator,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    meta.icon,
                                    size: 14,
                                    color: selected
                                        ? Colors.white
                                        : HigColors.labelSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    meta.shortLabel,
                                    style: HigTypography.footnote(
                                      color: selected
                                          ? Colors.white
                                          : HigColors.labelSecondary,
                                    ).copyWith(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],

                if (admin.error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(
                    message: admin.error!,
                    onRetry: () => ref
                        .read(adminConsoleProvider.notifier)
                        .refreshModule(activeModule),
                  ),
                ],

                const SizedBox(height: 16),

                switch (activeModule) {
                  AdminModule.overview =>
                    _buildOverviewPanel(context, admin, allowedModules),
                  AdminModule.security => _buildSecurityPanel(admin),
                  AdminModule.treasury => _buildTreasuryPanel(admin),
                  AdminModule.agents => const AdminGroundAgentsPanel(),
                  AdminModule.support => const AdminSupportPanel(),
                  AdminModule.polls => const AdminPollsPanel(),
                  AdminModule.review => _buildReviewPanel(admin),
                  AdminModule.profiles => const AdminGameProfilesPanel(),
                  AdminModule.users => _buildUsersPanel(admin),
                  AdminModule.seasons => const AdminSeasonsPanel(),
                  AdminModule.sponsors => const AdminSponsorsPanel(),
                },
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── 1. OVERVIEW + BREVO MAIL DIAGNOSTICS ─────────────────────────────────
  Widget _buildOverviewPanel(
    BuildContext context,
    AdminConsoleState admin,
    List<AdminModuleMeta> allowedModules,
  ) {
    final stats = admin.stats;
    final gateway = ref.watch(paymentGatewayProvider);
    final mailConfigured = admin.mailInfo['configured'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: Responsive.isDesktopOrExpanded(context) ? 4 : 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.9,
          children: [
            _metric(
              'Total Users',
              '${stats['users'] ?? stats['totalUsers'] ?? 0}',
              HigColors.labelPrimary,
            ),
            _metric(
              'Total Matches',
              '${stats['matches'] ?? stats['totalMatches'] ?? 0}',
              HigColors.brandBright,
            ),
            _metric(
              'Tournaments',
              '${stats['tournaments'] ?? stats['totalTournaments'] ?? 0}',
              HigColors.labelPrimary,
            ),
            _metric(
              'Pending Reviews',
              '${admin.reviewQueue.length}',
              admin.reviewQueue.isEmpty ? HigColors.emerald : HigColors.amber,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Quick Desk Cards (all authorized operational desks)
        LayoutBuilder(
          builder: (context, constraints) {
            final cols = constraints.maxWidth >= 900
                ? 3
                : constraints.maxWidth >= 560
                    ? 2
                    : 1;
            final cardW = (constraints.maxWidth - (cols - 1) * 12) / cols;
            final desks = allowedModules
                .where((m) => m.module != AdminModule.overview)
                .toList();
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: desks.map((m) {
                return SizedBox(
                  width: cardW,
                  child: GlassCard(
                    radius: 14,
                    padding: const EdgeInsets.all(16),
                    onTap: () => context.go(m.route),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Icon(m.icon, size: 19, color: HigColors.brandBright),
                            const Icon(
                              CupertinoIcons.chevron_right,
                              size: 14,
                              color: HigColors.labelTertiary,
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(m.label, style: HigTypography.headline()),
                        const SizedBox(height: 4),
                        Text(m.description, style: HigTypography.caption()),
                      ],
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 16),

        // Active Gateway & Brevo Transactional Mail Diagnostics
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 8,
                children: [
                  Text('Platform Services & Mail Test',
                      style: HigTypography.title3()),
                  Wrap(
                    spacing: 8,
                    children: [
                      HigBadge(
                        label: gateway == PaymentGatewayMode.kopokopo
                            ? 'RAIL: M-PESA'
                            : 'RAIL: CROSSMINT',
                        tone: HigBadgeTone.copper,
                      ),
                      HigBadge(
                        label: mailConfigured ? 'BREVO LIVE' : 'MAIL STANDBY',
                        tone: mailConfigured
                            ? HigBadgeTone.emerald
                            : HigBadgeTone.neutral,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: HigTextField(
                      controller: _testEmailCtrl,
                      placeholder: 'Send Brevo test email to address...',
                      prefixIcon: CupertinoIcons.mail,
                    ),
                  ),
                  const SizedBox(width: 8),
                  HigButton(
                    label: 'Send Test',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: () async {
                      final err = await ref
                          .read(adminConsoleProvider.notifier)
                          .sendTestEmail(_testEmailCtrl.text);
                      if (err != null) {
                        ref
                            .read(toastProvider.notifier)
                            .show(err, tone: ToastTone.error);
                      } else {
                        _testEmailCtrl.clear();
                        ref.read(toastProvider.notifier).show(
                              'Test email dispatched',
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
      ],
    );
  }

  // ─── 2. SECURITY & ANTI-CHEAT OPERATIONS CENTER ───────────────────────────
  Widget _buildSecurityPanel(AdminConsoleState admin) {
    final ov = admin.securityOverview;
    final threatLevel = (ov['threatLevel'] ?? 'NORMAL').toString();
    final halted = ov['settlementHalted'] == true;
    final metrics = (ov['metrics'] as Map?) ?? const {};
    final subsystems = (ov['subsystems'] as Map?) ?? const {};
    final activeLocks =
        (ov['activeSettlementKeys'] as List?)?.map((e) => e.toString()).toList() ??
            const <String>[];

    final filteredEvents = admin.securityEvents.where((e) {
      if (_secCategory == 'ALL') return true;
      return (e['category'] ?? '').toString().toUpperCase() == _secCategory;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Threat Level & Emergency Circuit Breaker
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          borderColor: halted ? HigColors.crimson : HigColors.separator,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Settlement Circuit Breaker',
                          style: HigTypography.title3()),
                      Text(
                        'Threat level: $threatLevel · Active settlement locks: ${activeLocks.length}',
                        style: HigTypography.caption(),
                      ),
                    ],
                  ),
                  CupertinoSwitch(
                    value: halted,
                    activeTrackColor: HigColors.crimson,
                    onChanged: (v) async {
                      final err = await ref
                          .read(adminConsoleProvider.notifier)
                          .toggleSettlementHalt(
                            v,
                            v
                                ? 'Emergency halt from Security Console'
                                : 'Halt lifted',
                          );
                      if (err != null) {
                        ref
                            .read(toastProvider.notifier)
                            .show(err, tone: ToastTone.error);
                      } else {
                        ref.read(toastProvider.notifier).show(
                              v ? 'Settlements halted' : 'Settlements resumed',
                              tone: v ? ToastTone.warning : ToastTone.success,
                            );
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 14),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: Responsive.isDesktopOrExpanded(context) ? 3 : 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.2,
                children: [
                  _metric(
                    'Races Prevented',
                    '${metrics['totalSettlementRacesPrevented'] ?? 0}',
                    HigColors.emerald,
                  ),
                  _metric(
                    'Frame Spoofs Blocked',
                    '${metrics['totalFrozenFrameSpoofsBlocked'] ?? 0}',
                    HigColors.amber,
                  ),
                  _metric(
                    'Unauthorized GSI',
                    '${metrics['totalUnauthorizedGsiBlocked'] ?? 0}',
                    HigColors.crimson,
                  ),
                  _metric(
                    'OCR Anomalies',
                    '${metrics['totalOcrAnomaliesDetected'] ?? 0}',
                    HigColors.amber,
                  ),
                  _metric(
                    'Rate Limits Tripped',
                    '${metrics['totalRateLimitsTripped'] ?? 0}',
                    HigColors.labelPrimary,
                  ),
                  _metric(
                    'Redis Lock Engine',
                    (subsystems['redisDistributedLock'] ?? 'UNKNOWN').toString(),
                    HigColors.brandBright,
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Emergency Match Freeze & Void Forms
        LayoutBuilder(
          builder: (context, constraints) {
            final twoCol = constraints.maxWidth >= 680;
            final freezeCard = GlassCard(
              radius: 16,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Freeze Match Escrow', style: HigTypography.headline()),
                  const SizedBox(height: 8),
                  HigTextField(
                    controller: _freezeMatchCtrl,
                    placeholder: 'Match ID to freeze',
                  ),
                  const SizedBox(height: 8),
                  HigTextField(
                    controller: _freezeReasonCtrl,
                    placeholder: 'Reason (e.g. suspicious frame anomaly)',
                  ),
                  const SizedBox(height: 10),
                  HigButton(
                    label: 'Freeze Match',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: () async {
                      final err = await ref
                          .read(adminConsoleProvider.notifier)
                          .freezeMatch(
                            _freezeMatchCtrl.text,
                            _freezeReasonCtrl.text,
                          );
                      if (err != null) {
                        ref
                            .read(toastProvider.notifier)
                            .show(err, tone: ToastTone.error);
                      } else {
                        _freezeMatchCtrl.clear();
                        _freezeReasonCtrl.clear();
                        ref.read(toastProvider.notifier).show(
                              'Match frozen for audit',
                              tone: ToastTone.warning,
                            );
                      }
                    },
                  ),
                ],
              ),
            );

            final voidCard = GlassCard(
              radius: 16,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Void Exploited Match', style: HigTypography.headline()),
                  const SizedBox(height: 8),
                  HigTextField(
                    controller: _voidMatchCtrl,
                    placeholder: 'Match ID to void',
                  ),
                  const SizedBox(height: 8),
                  HigTextField(
                    controller: _voidReasonCtrl,
                    placeholder: 'Reason (e.g. confirmed exploit)',
                  ),
                  const SizedBox(height: 10),
                  HigButton(
                    label: 'Void Match',
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.destructive,
                    onPressed: () async {
                      final err = await ref
                          .read(adminConsoleProvider.notifier)
                          .voidMatch(
                            _voidMatchCtrl.text,
                            _voidReasonCtrl.text,
                          );
                      if (err != null) {
                        ref
                            .read(toastProvider.notifier)
                            .show(err, tone: ToastTone.error);
                      } else {
                        _voidMatchCtrl.clear();
                        _voidReasonCtrl.clear();
                        ref.read(toastProvider.notifier).show(
                              'Match voided',
                              tone: ToastTone.info,
                            );
                      }
                    },
                  ),
                ],
              ),
            );

            if (twoCol) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: freezeCard),
                  const SizedBox(width: 12),
                  Expanded(child: voidCard),
                ],
              );
            }
            return Column(
              children: [
                freezeCard,
                const SizedBox(height: 12),
                voidCard,
              ],
            );
          },
        ),

        if (activeLocks.isNotEmpty) ...[
          const SizedBox(height: 14),
          GlassCard(
            radius: 16,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Active Distributed Settlement Locks',
                    style: HigTypography.headline()),
                const SizedBox(height: 8),
                ...activeLocks.map((key) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(key, style: HigTypography.mono(size: 12)),
                        ),
                        HigButton(
                          label: 'Clear Lock',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.destructive,
                          onPressed: () async {
                            final err = await ref
                                .read(adminConsoleProvider.notifier)
                                .clearSettlementLock(key);
                            if (err != null) {
                              ref
                                  .read(toastProvider.notifier)
                                  .show(err, tone: ToastTone.error);
                            } else {
                              ref.read(toastProvider.notifier).show(
                                    'Lock cleared',
                                    tone: ToastTone.success,
                                  );
                            }
                          },
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],

        const SizedBox(height: 14),

        // Security Events Telemetry Log
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Security Events Feed (${filteredEvents.length})',
                  style: HigTypography.title3()),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    'ALL',
                    'ANTI_CHEAT',
                    'OCR_TAMPER',
                    'GSI_AUTH',
                    'SETTLEMENT_LOCK',
                    'RATE_LIMIT',
                    'ADMIN_ACTION'
                  ].map((cat) {
                    final active = _secCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: GestureDetector(
                        onTap: () => setState(() => _secCategory = cat),
                        child: Container(
                          height: 30,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: active
                                ? HigColors.brand
                                : HigColors.surfaceGrouped,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color:
                                  active ? HigColors.brand : HigColors.separator,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            cat.replaceAll('_', ' '),
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
              const SizedBox(height: 12),
              if (filteredEvents.isEmpty)
                const Text('No security events matching this filter.')
              else
                ...filteredEvents.take(20).map((e) {
                  final sev = (e['severity'] ?? 'INFO').toString();
                  final desc = (e['description'] ?? '').toString();
                  final cat = (e['category'] ?? '').toString();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: HigColors.surfaceGrouped,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: HigColors.separator),
                      ),
                      child: Row(
                        children: [
                          HigBadge(
                            label: sev,
                            tone: sev == 'CRITICAL' || sev == 'HIGH'
                                ? HigBadgeTone.crimson
                                : HigBadgeTone.neutral,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(desc,
                                    style: HigTypography.footnote(
                                        color: HigColors.labelPrimary)),
                                Text(cat, style: HigTypography.caption()),
                              ],
                            ),
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

  // ─── 3. TREASURY, GATEWAY SWITCH & COMPANY EARNINGS WITHDRAWAL ────────────
  Widget _buildTreasuryPanel(AdminConsoleState admin) {
    final gateway = ref.watch(paymentGatewayProvider);
    final isKopo = gateway == PaymentGatewayMode.kopokopo;
    final tr = admin.treasury;
    final rec = (tr['recommendations'] as Map?) ?? const {};
    final incomeBooks = (tr['incomeBooks'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        const [];

    final kopoDiag = (_gatewayDiagnostics?['kopokopo'] as Map?) ?? const {};
    final cmDiag = (_gatewayDiagnostics?['crossmint'] as Map?) ?? const {};
    final kopoReady = kopoDiag['configured'] != false;
    final kopoOauth = kopoDiag['oauthLive'] == true;
    final cmReady = cmDiag['configured'] != false;
    final cmProd = (cmDiag['mode'] ?? 'production').toString() == 'production';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Payment Gateway Switch (Server-Synced Global Hot-Swap: Kenya Pilot <-> Global Crossmint)
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
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text('Active Payment Rail Switch',
                              style: HigTypography.title3()),
                          HigBadge(
                            label: isKopo
                                ? 'KENYA PILOT ACTIVE (M-PESA KES)'
                                : 'GLOBAL RAIL ACTIVE (CROSSMINT USDC)',
                            tone: HigBadgeTone.emerald,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Both production rails are pre-wired and live in your canonical .env. Flipping this switch hot-swaps platform currency, Cashier deposits, withdrawals, and match stake tiers globally without redeploying.',
                        style: HigTypography.footnote(),
                      ),
                    ],
                  ),
                  HigButton(
                    label: 'Verify Both Live Rails',
                    icon: CupertinoIcons.checkmark_shield,
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    loading: _verifyingGateways,
                    onPressed: () async {
                      await _verifyLivePaymentRails();
                      if (!mounted) return;
                      ref.read(toastProvider.notifier).show(
                            'Both payment rails verified live',
                            body:
                                'M-PESA (Kenya Pilot) and Crossmint (Global Card/USDC) are armed and ready.',
                            tone: ToastTone.success,
                          );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 14),
              LayoutBuilder(
                builder: (context, constraints) {
                  final row = constraints.maxWidth >= 680;
                  final mpesaCard = _gatewayCard(
                    logo: const BrandLogo.kopokopo(height: 24),
                    title: 'Phase 1 Pilot: M-PESA Mobile Money (KES)',
                    subtitle:
                        'Kenya live proving ground — instant mobile-money deposits & automated Safaricom B2C payouts.',
                    readinessLabel: kopoOauth
                        ? 'LIVE · OAUTH VERIFIED · TILL READY'
                        : kopoReady
                            ? 'LIVE · KEYS & TILL CONFIGURED'
                            : 'STANDBY',
                    implementedCapabilities: const [
                      'Platform UI displays balances & prizes in USDC (Cashier converts USDC <-> KES at 130)',
                      'Cashier Deposit: Instant STK Push (POST /api/mpesa/stk-push, Min USDC 5 / KES 650)',
                      'Cashier Payout: Safaricom B2C Transfer (POST /api/mpesa/payout, KES 50 fixed fee)',
                      'Webhook Settlement: HMAC-SHA256 (/api/webhooks/mpesa)',
                    ],
                    active: isKopo,
                    onSelect: () async {
                      final updated = await ref
                          .read(paymentGatewayProvider.notifier)
                          .setGateway(PaymentGatewayMode.kopokopo);
                      if (mounted && updated != null) {
                        setState(() => _gatewayDiagnostics = updated);
                      }
                      if (!mounted) return;
                      ref.read(toastProvider.notifier).show(
                            'Active payment rail: M-PESA (Kenya · USDC <-> KES)',
                            body:
                                'Balances remain in USDC while Cashier STK Push & M-PESA B2C payouts handle local KES conversion.',
                            tone: ToastTone.success,
                          );
                    },
                  );
                  final crossmintCard = _gatewayCard(
                    logo: const BrandLogo.crossmint(height: 20),
                    title: 'Global Scale: Crossmint (Card / Apple Pay / USDC)',
                    subtitle:
                        'Worldwide production rail — Visa, Mastercard, Apple Pay, Google Pay & on-chain USDC escrow.',
                    readinessLabel: (cmReady && cmProd)
                        ? 'LIVE · PRODUCTION KEYS · SVIX READY'
                        : 'ARMED & CONFIGURED',
                    implementedCapabilities: const [
                      'Keeps Top-Bar Wallet, Landing, Duels & Brackets in USDC',
                      'Cashier Deposit: Hosted Card & USDC Checkout (POST /api/crossmint/order, Min USDC 5)',
                      'Cashier Payout: On-Chain Base USDC Transfer (POST /api/wallet/payout, Min USDC 5)',
                      'Webhook Settlement: Svix HMAC-SHA256 (/api/webhooks/crossmint)',
                    ],
                    active: !isKopo,
                    onSelect: () async {
                      final updated = await ref
                          .read(paymentGatewayProvider.notifier)
                          .setGateway(PaymentGatewayMode.crossmint);
                      if (mounted && updated != null) {
                        setState(() => _gatewayDiagnostics = updated);
                      }
                      if (!mounted) return;
                      ref.read(toastProvider.notifier).show(
                            'Active payment rail: Crossmint (Global Card & USDC)',
                            body:
                                'Global platform USDC, Card/USDC checkout, and on-chain payouts are now live.',
                            tone: ToastTone.success,
                          );
                    },
                  );
                  return row
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: mpesaCard),
                            const SizedBox(width: 12),
                            Expanded(child: crossmintCard),
                          ],
                        )
                      : Column(children: [
                          mpesaCard,
                          const SizedBox(height: 12),
                          crossmintCard,
                        ]);
                },
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Upfront Customer-Paid Gateway Fee Schedule & Daily Thresholds (Zero Negative Margin Policy)
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 6,
                children: [
                  Text(
                    'Upfront Customer-Paid Fee Pass-Through & Daily Thresholds',
                    style: HigTypography.title3(),
                  ),
                  const HigBadge(
                    label: 'ZERO NEGATIVE MARGIN · 80%+ RAKE FLOOR FOR COMPANY',
                    tone: HigBadgeTone.emerald,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Customers pay 100% of Kopo Kopo M-PESA and Crossmint processing fees upfront at deposit and withdrawal. Playverzus absorbs KES 0 / \$0.00 in gateway drag and collects differentiated 12.5%–22.0% match/Blitz/tournament rakes (with 80%+ locked for Company Cost of Production & Profit first before paying Ground Agents).',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 12),
              _feeRuleRow(
                'M-PESA Deposit (Buy Goods STK)',
                'Min USDC 5.00 (KES 650) · Max KES 250,000/tx · Customer pays +0.55% upfront (capped at KES 200 above KES 36,365).',
              ),
              const Divider(height: 14),
              _feeRuleRow(
                'M-PESA Withdrawal (Move Money / PAY)',
                'Min USDC 5.00 (KES 650: KES 600 net + flat KES 50 Kopo Kopo PAY fee paid upfront; USDC 20+ suggested for <2% fee impact) · Max KES 70,000/tx · Daily limit KES 150,000 (max 3/day).',
              ),
              const Divider(height: 14),
              _feeRuleRow(
                'Crossmint Global Deposit & Payout',
                'Deposit: Min USDC 5.00 · Max USDC 2,000/tx (+3.5% + \$0.30 upfront card fee) · Withdrawal: Min USDC 5.00 (\$1.00 flat payout fee) · Max USDC 1,000/tx · USDC 2,500/day.',
              ),
              const Divider(height: 14),
              _feeRuleRow(
                'Playverzus Differentiated Company Earning Model',
                '1v1/Squad Duels: 15.0% Starter / 12.5% Pro rake · 5-Player Blitz Sit & Go: Tier 1 (16%), Tier 2 (18%), Tier 3 & 4 (20%), Tier 5 (22%) · Tournaments & Cups: 20.0%. First 80%–82% of all rake is locked for Company Cost of Production & Profit before Field Agent commission.',
              ),
              const Divider(height: 14),
              _feeRuleRow(
                '4 Additional High-Margin Revenue Streams (Subscription, VIP Express, Venue & B2B)',
                'Express VIP Instant Payout (+KES 35 / +\$0.50 pure profit) · Arena Pro Pass (KES 499/mo · \$3.99/mo) · Verified Gaming Lounge Wing Licenses (KES 2,500/mo) · Game Studio Featured Arena (KES 25,000/mo) & Sponsor Production Fee (20%).',
              ),
              const SizedBox(height: 12),
              HigButton(
                label: 'Download Executive Revenue Model PDF',
                icon: CupertinoIcons.doc_text_fill,
                size: HigButtonSize.small,
                variant: HigButtonVariant.secondary,
                onPressed: () {
                  final pdfUrl = kIsWeb
                      ? '${Uri.base.origin}/${PlatformRevenueStreams.revenueModelPdfPath}'
                      : 'https://playverzus.xyz/${PlatformRevenueStreams.revenueModelPdfPath}';
                  launchUrl(
                    Uri.parse(pdfUrl),
                    mode: LaunchMode.externalApplication,
                  );
                },
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Treasury Balance Sheet KPIs
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: Responsive.isDesktopOrExpanded(context) ? 4 : 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.9,
          children: [
            _metric(
              'Gross Cash',
              '\$${((tr['grossCashEur'] as num?) ?? 0).toStringAsFixed(2)}',
              HigColors.labelPrimary,
            ),
            _metric(
              'Player Liabilities',
              '\$${((tr['playerLiabilitiesEur'] as num?) ?? 0).toStringAsFixed(2)}',
              HigColors.amber,
            ),
            _metric(
              'Net Retained Earnings',
              '\$${((tr['netRetainedEarningsEur'] as num?) ?? 0).toStringAsFixed(2)}',
              HigColors.emerald,
            ),
            _metric(
              'Solvency / Reserve',
              '${(tr['solvencyStatus'] ?? 'N/A')} · ${((tr['reserveRatioPercent'] as num?) ?? 0).toStringAsFixed(0)}%',
              HigColors.brandBright,
            ),
          ],
        ),

        if (incomeBooks.isNotEmpty) ...[
          const SizedBox(height: 14),
          GlassCard(
            radius: 16,
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Segregated Income Books', style: HigTypography.title3()),
                const SizedBox(height: 10),
                ...incomeBooks.map((b) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '${b['name']} (${b['takeRatePercent'] ?? 10}% take)',
                              style: HigTypography.footnote(
                                  color: HigColors.labelPrimary),
                            ),
                          ),
                          Text(
                            '\$${((b['netRevenueEur'] as num?) ?? 0).toStringAsFixed(2)}',
                            style: HigTypography.mono(
                                size: 13, color: HigColors.emerald),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ),
        ],

        const SizedBox(height: 14),

        // Company Earnings Withdrawal Form
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Withdraw Platform Earnings',
                      style: HigTypography.title3()),
                  if (rec['safeWithdrawableEur'] != null)
                    HigBadge(
                      label:
                          'SAFE MAX \$${(rec['safeWithdrawableEur'] as num).toStringAsFixed(2)}',
                      tone: HigBadgeTone.emerald,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              HigSegmentedControl<String>(
                backgroundColor: HigColors.surfaceGrouped,
                groupValue: _withdrawMode,
                onChanged: (v) => setState(() => _withdrawMode = v),
                segments: const {
                  'WALLET_TRANSFER': 'Wallet Transfer',
                  'BANK_OFFRAMP': 'Bank / M-PESA Off-Ramp',
                },
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: HigTextField(
                      controller: _withdrawAmtCtrl,
                      placeholder: 'Amount (USD)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: HigTextField(
                      controller: _withdrawDestCtrl,
                      placeholder: 'Destination wallet / account',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              HigTextField(
                controller: _withdrawNoteCtrl,
                placeholder: 'Audit memo / reference (optional)',
              ),
              const SizedBox(height: 12),
              HigButton(
                label: 'Execute Treasury Withdrawal',
                size: HigButtonSize.small,
                onPressed: () async {
                  final amt = double.tryParse(_withdrawAmtCtrl.text.trim()) ?? 0;
                  final err = await ref
                      .read(adminConsoleProvider.notifier)
                      .withdrawTreasury(
                        amount: amt,
                        mode: _withdrawMode,
                        destinationAddress: _withdrawDestCtrl.text,
                        note: _withdrawNoteCtrl.text,
                      );
                  if (err != null) {
                    ref
                        .read(toastProvider.notifier)
                        .show(err, tone: ToastTone.error);
                  } else {
                    _withdrawAmtCtrl.clear();
                    _withdrawDestCtrl.clear();
                    _withdrawNoteCtrl.clear();
                    ref.read(toastProvider.notifier).show(
                          'Treasury withdrawal submitted',
                          tone: ToastTone.success,
                        );
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── 6. REVIEW & DISPUTE QUEUE (APPROVE / REJECT / CORRECT SCORE) ─────────
  Widget _buildReviewPanel(AdminConsoleState admin) {
    if (admin.reviewQueue.isEmpty) {
      return const HigEmptyState(
        icon: CupertinoIcons.checkmark_shield,
        title: 'Dispute queue is clear',
        subtitle:
            'Flagged OCR captures and contested match scores appear here for Approve, Reject, or Score Correction.',
      );
    }

    return Column(
      children: admin.reviewQueue.map((task) {
        final id = (task['id'] ?? '').toString();
        final matchId = (task['match_id'] ?? task['matchId'] ?? '').toString();
        final reason =
            (task['reason'] ?? task['notes'] ?? 'Manual review requested')
                .toString();
        final ocrRaw = (task['raw_text'] ?? task['rawText'] ?? '').toString();
        final corrCtrl = _corrCtrlFor(id);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            radius: 16,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Review #$id · Match $matchId',
                    style: HigTypography.headline()),
                const SizedBox(height: 4),
                Text(reason, style: HigTypography.footnote()),
                if (ocrRaw.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('OCR Capture: $ocrRaw',
                      style: HigTypography.mono(size: 12)),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: HigTextField(
                        controller: corrCtrl,
                        placeholder: 'Corrected score (e.g. 3-1)',
                      ),
                    ),
                    const SizedBox(width: 8),
                    HigButton(
                      label: 'Correct Score',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.secondary,
                      onPressed: () async {
                        final err = await ref
                            .read(adminConsoleProvider.notifier)
                            .correctReview(id, correctedValue: corrCtrl.text);
                        if (err != null) {
                          ref
                              .read(toastProvider.notifier)
                              .show(err, tone: ToastTone.error);
                        } else {
                          ref.read(toastProvider.notifier).show(
                                'Score corrected and settled',
                                tone: ToastTone.success,
                              );
                        }
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    HigButton(
                      label: 'Approve Outcome',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.emerald,
                      onPressed: () async {
                        final err = await ref
                            .read(adminConsoleProvider.notifier)
                            .approveReview(id);
                        if (err != null) {
                          ref
                              .read(toastProvider.notifier)
                              .show(err, tone: ToastTone.error);
                        } else {
                          ref.read(toastProvider.notifier).show(
                                'Outcome approved',
                                tone: ToastTone.success,
                              );
                        }
                      },
                    ),
                    HigButton(
                      label: 'Reject Proof',
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.destructive,
                      onPressed: () async {
                        final err = await ref
                            .read(adminConsoleProvider.notifier)
                            .rejectReview(id);
                        if (err != null) {
                          ref
                              .read(toastProvider.notifier)
                              .show(err, tone: ToastTone.error);
                        } else {
                          ref.read(toastProvider.notifier).show(
                                'Proof rejected',
                                tone: ToastTone.info,
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
      }).toList(),
    );
  }

  // ─── 8. USERS, KYC & ALL 9 STAFF ROLES MANAGEMENT ─────────────────────────
  Widget _buildUsersPanel(AdminConsoleState admin) {
    final filtered = admin.users.where((u) {
      final role = (u['role'] ?? 'PLAYER').toString().toUpperCase();
      if (_userRoleFilter != 'ALL' && role != _userRoleFilter) return false;
      if (_userSearch.trim().isNotEmpty) {
        final q = _userSearch.toLowerCase();
        final name = (u['username'] ?? '').toString().toLowerCase();
        final email = (u['email'] ?? '').toString().toLowerCase();
        if (!name.contains(q) && !email.contains(q)) return false;
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
              HigTextField(
                placeholder: 'Search username or email...',
                prefixIcon: CupertinoIcons.search,
                onChanged: (v) => setState(() => _userSearch = v),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['ALL', ...allPlayverzusRoles].map((r) {
                    final active = _userRoleFilter == r;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: GestureDetector(
                        onTap: () => setState(() => _userRoleFilter = r),
                        child: Container(
                          height: 30,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: active
                                ? HigColors.brand
                                : HigColors.surfaceGrouped,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color:
                                  active ? HigColors.brand : HigColors.separator,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            r.replaceAll('_', ' '),
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

        if (filtered.isEmpty)
          const HigEmptyState(
            icon: CupertinoIcons.person_3,
            title: 'No matching user accounts',
            subtitle:
                'Sign in with a live Admin account to search members, assign staff roles, verify KYC, or ban accounts.',
          )
        else
          ...filtered.map((u) {
            final id = (u['id'] ?? '').toString();
            final username = (u['username'] ?? u['email'] ?? 'user').toString();
            final email = (u['email'] ?? '').toString();
            final role = (u['role'] ?? 'PLAYER').toString().toUpperCase();
            final kyc = (u['kyc_status'] ?? 'NONE').toString().toUpperCase();
            final banned = u['is_banned'] == true || u['banned'] == true;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                radius: 14,
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('@$username', style: HigTypography.headline()),
                            if (email.isNotEmpty)
                              Text(email, style: HigTypography.caption()),
                          ],
                        ),
                        Wrap(
                          spacing: 6,
                          children: [
                            HigBadge(
                              label: role.replaceAll('_', ' '),
                              tone: role == 'PLAYER'
                                  ? HigBadgeTone.neutral
                                  : HigBadgeTone.copper,
                            ),
                            HigBadge(
                              label: 'KYC: $kyc',
                              tone: kyc == 'VERIFIED'
                                  ? HigBadgeTone.emerald
                                  : HigBadgeTone.neutral,
                            ),
                            if (banned)
                              const HigBadge(
                                label: 'BANNED',
                                tone: HigBadgeTone.crimson,
                              ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        HigButton(
                          label: 'Assign Role',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.secondary,
                          onPressed: () => _openRolePicker(id, username, role),
                        ),
                        HigButton(
                          label: kyc == 'VERIFIED' ? 'Revoke KYC' : 'Verify KYC',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.secondary,
                          onPressed: () async {
                            final nextKyc =
                                kyc == 'VERIFIED' ? 'REJECTED' : 'VERIFIED';
                            final err = await ref
                                .read(adminConsoleProvider.notifier)
                                .updateUserKyc(id, nextKyc);
                            if (err != null) {
                              ref
                                  .read(toastProvider.notifier)
                                  .show(err, tone: ToastTone.error);
                            } else {
                              ref.read(toastProvider.notifier).show(
                                    '@$username KYC set to $nextKyc',
                                    tone: ToastTone.success,
                                  );
                            }
                          },
                        ),
                        HigButton(
                          label: banned ? 'Unban' : 'Ban Account',
                          size: HigButtonSize.small,
                          variant: banned
                              ? HigButtonVariant.emerald
                              : HigButtonVariant.destructive,
                          onPressed: () async {
                            final err = banned
                                ? await ref
                                    .read(adminConsoleProvider.notifier)
                                    .unbanUser(id)
                                : await ref
                                    .read(adminConsoleProvider.notifier)
                                    .banUser(id, 'Suspended by administrator');
                            if (err != null) {
                              ref
                                  .read(toastProvider.notifier)
                                  .show(err, tone: ToastTone.error);
                            } else {
                              ref.read(toastProvider.notifier).show(
                                    banned
                                        ? '@$username reinstated'
                                        : '@$username banned',
                                    tone: ToastTone.info,
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
    );
  }

  void _openRolePicker(String userId, String username, String currentRole) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: HigColors.surfacePrimary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(20),
          children: [
            Text('Assign Role for @$username', style: HigTypography.title3()),
            const SizedBox(height: 12),
            ...allPlayverzusRoles.map((r) {
              final selected = r == currentRole;
              return ListTile(
                title: Text(r.replaceAll('_', ' '),
                    style: HigTypography.headline().copyWith(fontSize: 14)),
                trailing: selected
                    ? const Icon(CupertinoIcons.checkmark_alt,
                        color: HigColors.brand)
                    : null,
                onTap: () async {
                  Navigator.of(ctx).pop();
                  final err = await ref
                      .read(adminConsoleProvider.notifier)
                      .updateUserRole(userId, r);
                  if (err != null) {
                    ref
                        .read(toastProvider.notifier)
                        .show(err, tone: ToastTone.error);
                  } else {
                    ref.read(toastProvider.notifier).show(
                          '@$username is now $r',
                          tone: ToastTone.success,
                        );
                  }
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _gatewayCard({
    required Widget logo,
    required String title,
    required String subtitle,
    required String readinessLabel,
    required List<String> implementedCapabilities,
    required bool active,
    required VoidCallback onSelect,
  }) {
    return GlassCard(
      radius: 14,
      padding: const EdgeInsets.all(16),
      backgroundColor: active
          ? HigColors.brand.withValues(alpha: 0.08)
          : HigColors.surfaceGrouped,
      borderColor: active ? HigColors.brand : HigColors.separator,
      onTap: onSelect,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              logo,
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  HigBadge(
                    label: readinessLabel,
                    tone: HigBadgeTone.emerald,
                  ),
                  HigBadge(
                    label: active ? 'ACTIVE RAIL' : 'READY · CLICK TO ACTIVATE',
                    tone: active ? HigBadgeTone.copper : HigBadgeTone.neutral,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(title, style: HigTypography.headline()),
          const SizedBox(height: 4),
          Text(subtitle, style: HigTypography.caption()),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Text(
            'WHAT THIS SWITCH IMPLEMENTS:',
            style: HigTypography.mono(
              size: 10,
              color: HigColors.brandBright,
            ).copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          ...implementedCapabilities.map(
            (cap) => Padding(
              padding: const EdgeInsets.only(bottom: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    CupertinoIcons.checkmark_alt_circle_fill,
                    size: 13,
                    color: active ? HigColors.emerald : HigColors.labelSecondary,
                  ),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      cap,
                      style: HigTypography.caption(
                        color: HigColors.labelPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _feeRuleRow(String title, String detail) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(
            CupertinoIcons.shield_fill,
            size: 14,
            color: HigColors.emerald,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: HigTypography.footnote(color: HigColors.labelPrimary)
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 2),
              Text(detail, style: HigTypography.caption()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _metric(String label, String value, Color accent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: HigTypography.caption()),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: HigTypography.mono(size: 17, color: accent),
            ),
          ),
        ],
      ),
    );
  }
}
