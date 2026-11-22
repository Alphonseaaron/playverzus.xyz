import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/network/friendly_errors.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Shared formatter for KES or USD/USDC depending on active Payment Rail.
String _fmtMoney(PaymentGatewayMode gw, num kesAmount) {
  final kes = kesAmount.round();
  if (gw == PaymentGatewayMode.kopokopo) {
    return 'KES $kes';
  }
  final usd = kes / AppConfig.usdToKesRate;
  return '\$${usd.toStringAsFixed(2)} USDC';
}

/// ═══════════════════════════════════════════════════════════════════════════
/// 1. ADMIN CONSOLE DESK: `/admin/agents` (Ground Force, Wing Sub-Agents & Owed Ledger)
/// ═══════════════════════════════════════════════════════════════════════════
class AdminGroundAgentsPanel extends ConsumerStatefulWidget {
  const AdminGroundAgentsPanel({super.key});

  @override
  ConsumerState<AdminGroundAgentsPanel> createState() =>
      _AdminGroundAgentsPanelState();
}

class _AdminGroundAgentsPanelState
    extends ConsumerState<AdminGroundAgentsPanel> {
  bool _loading = true;
  bool _submitting = false;
  String? _settlingAgentId;
  String? _error;

  Map<String, dynamic> _summary = const {};
  List<Map<String, dynamic>> _agents = const [];
  List<Map<String, dynamic>> _platformRakes = const [];

  // Recruit Agent / Sub-Agent form controllers
  final _nameCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _regionCtrl = TextEditingController(text: 'Nairobi CBD & Campuses');
  final _wingCodeCtrl = TextEditingController();

  // Attribute / Record Ground Conversion form controllers
  final _attrCodeCtrl = TextEditingController(text: 'PVZ-KE-BRIAN');
  final _attrPlayerCtrl = TextEditingController();
  final _attrDepositCtrl = TextEditingController(text: '1000');
  final _attrPotCtrl = TextEditingController(text: '2600');
  String _attrMode = 'DUEL_STARTER';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOverview());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _usernameCtrl.dispose();
    _phoneCtrl.dispose();
    _regionCtrl.dispose();
    _wingCodeCtrl.dispose();
    _attrCodeCtrl.dispose();
    _attrPlayerCtrl.dispose();
    _attrDepositCtrl.dispose();
    _attrPotCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOverview() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('/agents/overview');
      if (res is Map) {
        _applyOverviewMap(Map<String, dynamic>.from(res));
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = FriendlyError.humanize(e);
    }
    if (mounted) setState(() => _loading = false);
  }

  void _applyOverviewMap(Map<String, dynamic> data) {
    final sum = data['summary'];
    if (sum is Map) {
      _summary = Map<String, dynamic>.from(sum);
    }
    final list = data['agents'];
    if (list is List) {
      _agents = list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    final sched = data['schedule'];
    if (sched is Map && sched['platformRakes'] is List) {
      _platformRakes = (sched['platformRakes'] as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
  }

  Future<void> _recruitAgent() async {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter Agent Name and M-PESA Phone Number',
            tone: ToastTone.error,
          );
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await ApiClient.post('/agents/register', data: {
        'fullName': _nameCtrl.text.trim(),
        'username': _usernameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'region': _regionCtrl.text.trim(),
        'parentWingCode': _wingCodeCtrl.text.trim(),
      });
      if (res is Map && res['overview'] is Map) {
        _applyOverviewMap(Map<String, dynamic>.from(res['overview'] as Map));
      } else {
        await _loadOverview();
      }
      if (!mounted) return;
      final created = (res is Map && res['agent'] is Map)
          ? Map<String, dynamic>.from(res['agent'] as Map)
          : const <String, dynamic>{};
      _nameCtrl.clear();
      _usernameCtrl.clear();
      _phoneCtrl.clear();
      _wingCodeCtrl.clear();
      setState(() {});
      ref.read(toastProvider.notifier).show(
            'Agent onboarded (${created['referralCode'] ?? 'READY'})',
            body: created['tier'] == 'SUB_AGENT'
                ? 'Linked under Lead Agent wing (${created['parentAgentName']}).'
                : 'Enrolled as Tier 1 Lead Agent with Wing Code ${created['wingInviteCode']}.',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _recordConversion() async {
    final code = _attrCodeCtrl.text.trim();
    if (code.isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter an Agent Referral Code (e.g. PVZ-KE-KEVIN)',
            tone: ToastTone.error,
          );
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await ApiClient.post('/agents/attribute', data: {
        'referralCode': code,
        'playerUsername': _attrPlayerCtrl.text.trim().isEmpty
            ? 'player_${DateTime.now().millisecondsSinceEpoch.toString().substring(9)}'
            : _attrPlayerCtrl.text.trim(),
        'firstDepositKes':
            int.tryParse(_attrDepositCtrl.text.trim()) ?? 1000,
        'matchPotKes': int.tryParse(_attrPotCtrl.text.trim()) ?? 2600,
        'mode': _attrMode,
      });
      if (res is Map && res['overview'] is Map) {
        _applyOverviewMap(Map<String, dynamic>.from(res['overview'] as Map));
      } else {
        await _loadOverview();
      }
      if (!mounted) return;
      _attrPlayerCtrl.clear();
      setState(() {});
      final bd = (res is Map && res['breakdown'] is Map)
          ? Map<String, dynamic>.from(res['breakdown'] as Map)
          : const <String, dynamic>{};
      ref.read(toastProvider.notifier).show(
            'Conversion & Rake Split Recorded',
            body:
                'Company Profit Locked: KES ${bd['companyNetRetainedKes'] ?? 0} · Direct Agent: +KES ${bd['directAgentEarnedKes'] ?? 0} · Lead Wing Override: +KES ${bd['leadAgentOverrideEarnedKes'] ?? 0}',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _settleAgentPayout(Map<String, dynamic> agent) async {
    final id = (agent['id'] ?? '').toString();
    final pendingKes = (agent['pendingOwedKes'] as num?)?.round() ?? 0;
    if (pendingKes <= 0) return;

    setState(() => _settlingAgentId = id);
    try {
      final res = await ApiClient.post('/agents/settle-payout', data: {
        'agentId': id,
        'amountKes': pendingKes,
        'phone': agent['phone'],
      });
      if (res is Map && res['overview'] is Map) {
        _applyOverviewMap(Map<String, dynamic>.from(res['overview'] as Map));
      } else {
        await _loadOverview();
      }
      if (!mounted) return;
      setState(() {});
      ref.read(toastProvider.notifier).show(
            'Agent Settled & Marked Paid',
            body:
                'Disbursed KES $pendingKes to ${agent['fullName']} (${agent['phone']}). New owed balance: KES 0.',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _settlingAgentId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gw = ref.watch(paymentGatewayProvider);
    final isDesktop = Responsive.isDesktopOrExpanded(context);

    final companyNetKes =
        (_summary['companyNetProfitAfterAgentsKes'] as num?) ?? 30228;
    final companyRetPct =
        (_summary['companyRetentionPercentOfRake'] as num?) ?? 82.0;
    final totalOwedKes = (_summary['totalPendingOwedKes'] as num?) ?? 4388;
    final totalPaidKes = (_summary['totalSettledPaidKes'] as num?) ?? 4500;
    final totalAgents = (_summary['totalAgents'] as num?) ?? _agents.length;
    final leadCount = (_summary['leadAgentsCount'] as num?) ?? 2;
    final subCount = (_summary['subAgentsCount'] as num?) ?? 2;

    final leadAgents =
        _agents.where((a) => a['tier'] == 'LEAD_AGENT').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null) ...[
          HigErrorBanner(message: _error!, onRetry: _loadOverview),
          const SizedBox(height: 12),
        ],

        // 1. TOP GROUND FORCE & COMPANY PRODUCTION FLOOR KPIs
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: isDesktop ? 4 : 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.85,
          children: [
            _kpiTile(
              'Company Net Profit (${companyRetPct.toStringAsFixed(0)}% of Rake)',
              _fmtMoney(gw, companyNetKes),
              'Locked for Cost of Production First',
              HigColors.emerald,
            ),
            _kpiTile(
              'Total Owed to Agents Now',
              _fmtMoney(gw, totalOwedKes),
              'Exact Unpaid Commission Liability',
              HigColors.amber,
            ),
            _kpiTile(
              'Total Already Paid to Agents',
              _fmtMoney(gw, totalPaidKes),
              'Audited Lifetime Settlements',
              HigColors.brandBright,
            ),
            _kpiTile(
              'Active Ground Force',
              '$totalAgents Agents ($leadCount Lead · $subCount Wing)',
              '${_summary['totalActivatedDepositors'] ?? 38} Activated Depositors',
              HigColors.labelPrimary,
            ),
          ],
        ),

        const SizedBox(height: 14),

        // 2. DIFFERENTIATED PLATFORM RAKE & 2-TIER AGENT COMMISSION SCHEDULE
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
                    'Differentiated Platform Fee & 2-Tier Ground Commission Model',
                    style: HigTypography.title3(),
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const HigBadge(
                        label: '80%+ OF ALL RAKE LOCKED FOR COMPANY PRODUCTION FIRST',
                        tone: HigBadgeTone.emerald,
                      ),
                      HigButton(
                        label: 'Revenue Model PDF',
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
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Duels, 5-Player Blitz Pools, and Tournaments charge differentiated rakes (12.5% – 22.0%). Playverzus locks the first 80%–82% of all collected rake for Cost of Production & Company Profit before allocating Direct Agent (15%–18% of rake) and Lead Agent Wing Override (5% of rake) commissions.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 12),
              ...(_platformRakes.isNotEmpty
                      ? _platformRakes
                      : const [
                          {
                            'label':
                                '1v1 & Squad Duels — Starter Tier (KES 130 – 650 / \$1 – \$5)',
                            'totalRakePercent': 15.0,
                            'winnerPayoutPercent': 85.0,
                            'companyProductionFloorPercentOfPot': 12.0,
                            'maxAgentPoolPercentOfPot': 3.0,
                          },
                          {
                            'label':
                                '1v1 & Squad Duels — Standard & Pro Tier (KES 1,300+ / \$10+)',
                            'totalRakePercent': 12.5,
                            'winnerPayoutPercent': 87.5,
                            'companyProductionFloorPercentOfPot': 10.0,
                            'maxAgentPoolPercentOfPot': 2.5,
                          },
                          {
                            'label':
                                '5-Player Blitz Sit & Go — Tier 1 Starter (KES 325 / \$2.50)',
                            'totalRakePercent': 16.0,
                            'winnerPayoutPercent': 84.0,
                            'companyProductionFloorPercentOfPot': 12.8,
                            'maxAgentPoolPercentOfPot': 3.2,
                          },
                          {
                            'label':
                                '5-Player Blitz Sit & Go — Tier 2 Challenger (KES 650 / \$5.00)',
                            'totalRakePercent': 18.0,
                            'winnerPayoutPercent': 82.0,
                            'companyProductionFloorPercentOfPot': 14.4,
                            'maxAgentPoolPercentOfPot': 3.6,
                          },
                          {
                            'label':
                                '5-Player Blitz Sit & Go — Tier 3 & 4 Champion/Master (KES 1,300 – 3,250)',
                            'totalRakePercent': 20.0,
                            'winnerPayoutPercent': 80.0,
                            'companyProductionFloorPercentOfPot': 16.0,
                            'maxAgentPoolPercentOfPot': 4.0,
                          },
                          {
                            'label':
                                '5-Player Blitz Sit & Go — Tier 5 Grandmaster (KES 6,500 / \$50.00)',
                            'totalRakePercent': 22.0,
                            'winnerPayoutPercent': 78.0,
                            'companyProductionFloorPercentOfPot': 17.6,
                            'maxAgentPoolPercentOfPot': 4.4,
                          },
                          {
                            'label':
                                'Scheduled Multi-Bracket Tournaments & Cups (8–64 Players)',
                            'totalRakePercent': 20.0,
                            'winnerPayoutPercent': 80.0,
                            'companyProductionFloorPercentOfPot': 16.0,
                            'maxAgentPoolPercentOfPot': 4.0,
                          },
                        ])
                  .map((r) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: HigColors.surfaceGrouped,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: HigColors.separator),
                    ),
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 10,
                      runSpacing: 6,
                      children: [
                        Text(
                          (r['label'] ?? '').toString(),
                          style: HigTypography.footnote(
                            color: HigColors.labelPrimary,
                          ).copyWith(fontWeight: FontWeight.w600),
                        ),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            HigBadge(
                              label:
                                  'TOTAL RAKE ${r['totalRakePercent']}% (WINNER ${r['winnerPayoutPercent']}%)',
                              tone: HigBadgeTone.copper,
                            ),
                            HigBadge(
                              label:
                                  'COMPANY FLOOR ${r['companyProductionFloorPercentOfPot']}% OF POT',
                              tone: HigBadgeTone.emerald,
                            ),
                            HigBadge(
                              label:
                                  'AGENT POOL ≤ ${r['maxAgentPoolPercentOfPot']}%',
                              tone: HigBadgeTone.neutral,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 6),
              Text(
                'First-Deposit Bonus Protection: Unlocks ONLY after referred player deposits ≥ KES 300 AND completes 1st settled Cash Match (Lead Agent Direct: 5.0% capped at KES 150 · Wing Sub-Agent Direct: 3.5% + Lead Agent Wing Override: 1.5%).',
                style: HigTypography.caption(color: HigColors.emerald),
              ),
              const SizedBox(height: 10),
              Text(
                'Additional Company-Only Profit Streams: Express VIP Instant Cashout (+KES 35 / +\$0.50 · 100% Margin) · Arena Pro Pass (KES 499/mo · 82% Margin) · Gaming Lounge Wing License (KES 2,500/mo · 95% Margin) · Game Studio Featured Arena (KES 25,000/mo) & Brand Sponsor Production Fee (20%).',
                style: HigTypography.caption(color: HigColors.brandBright),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // 3. RECRUIT FIELD AGENT / SUB-AGENT & RECORD CONVERSION TOOLS
        LayoutBuilder(
          builder: (context, constraints) {
            final twoCol = constraints.maxWidth >= 760;

            final recruitCard = GlassCard(
              radius: 16,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Onboard Field Agent or Wing Sub-Agent',
                      style: HigTypography.headline()),
                  const SizedBox(height: 4),
                  Text(
                    'Leave Wing Code empty to create a Tier 1 Lead Agent, or enter a Lead Agent\'s Wing Code (e.g. WING-KE-KEVIN) to place this worker under their wing.',
                    style: HigTypography.caption(),
                  ),
                  const SizedBox(height: 10),
                  HigTextField(
                    controller: _nameCtrl,
                    placeholder: 'Full Name (e.g. Mercy Achieng)',
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: HigTextField(
                          controller: _usernameCtrl,
                          placeholder: 'Handle (e.g. mercy_cbd)',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: HigTextField(
                          controller: _phoneCtrl,
                          placeholder: 'M-PESA (+2547...)',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: HigTextField(
                          controller: _regionCtrl,
                          placeholder: 'Territory / Campus / Lounge',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: HigTextField(
                          controller: _wingCodeCtrl,
                          placeholder: 'Lead Wing Code (optional)',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  HigButton(
                    label: 'Register Field Agent',
                    icon: CupertinoIcons.person_add_solid,
                    size: HigButtonSize.small,
                    loading: _submitting,
                    onPressed: _recruitAgent,
                  ),
                ],
              ),
            );

            final conversionCard = GlassCard(
              radius: 16,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Attribute Ground Referral & Match Settlement',
                      style: HigTypography.headline()),
                  const SizedBox(height: 4),
                  Text(
                    'Credit a referred player\'s first deposit and settled cash match pot to calculate Company Profit Floor + Direct Agent + Lead Wing Override.',
                    style: HigTypography.caption(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: HigTextField(
                          controller: _attrCodeCtrl,
                          placeholder: 'Agent Code (e.g. PVZ-KE-BRIAN)',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: HigTextField(
                          controller: _attrPlayerCtrl,
                          placeholder: 'Player @username',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: HigTextField(
                          controller: _attrDepositCtrl,
                          placeholder: '1st Deposit (KES)',
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: HigTextField(
                          controller: _attrPotCtrl,
                          placeholder: 'Match Pot (KES)',
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  HigSegmentedControl<String>(
                    backgroundColor: HigColors.surfaceGrouped,
                    groupValue: _attrMode,
                    onChanged: (v) => setState(() => _attrMode = v),
                    segments: const {
                      'DUEL_STARTER': 'Duel (15%)',
                      'BLITZ_TIER_3_4': 'Blitz (20%)',
                      'TOURNAMENT_CUP': 'Cup (20%)',
                    },
                  ),
                  const SizedBox(height: 10),
                  HigButton(
                    label: 'Record Conversion & Split Rake',
                    icon: CupertinoIcons.bolt_fill,
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    loading: _submitting,
                    onPressed: _recordConversion,
                  ),
                ],
              ),
            );

            if (twoCol) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: recruitCard),
                  const SizedBox(width: 12),
                  Expanded(child: conversionCard),
                ],
              );
            }
            return Column(
              children: [
                recruitCard,
                const SizedBox(height: 12),
                conversionCard,
              ],
            );
          },
        ),

        const SizedBox(height: 14),

        // 4. HIERARCHICAL LEAD AGENTS & SUB-AGENTS ("UNDER THEIR WING") LEDGER
        GlassCard(
          radius: 16,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ground Force Hierarchy & Owed Commission Ledger (${_agents.length} Agents)',
                style: HigTypography.title3(),
              ),
              const SizedBox(height: 4),
              Text(
                'Every Lead Agent and the Sub-Agents under their wing see these exact same ledger balances in their Field Agent Hub (/agent). Click "Settle & Mark Paid" to disburse and clear what you owe.',
                style: HigTypography.footnote(),
              ),
              const SizedBox(height: 14),
              if (_loading && _agents.isEmpty)
                const HigLoadingCard(message: 'Loading Field Agents ledger...')
              else
                ...leadAgents.map((lead) {
                  final leadId = (lead['id'] ?? '').toString();
                  final subAgents = _agents
                      .where((a) => a['parentAgentId'] == leadId)
                      .toList();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildAgentLedgerCard(lead, gw, isSubUnderWing: false),
                        if (subAgents.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(left: 18, top: 8),
                            child: Column(
                              children: subAgents
                                  .map(
                                    (sub) => Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: _buildAgentLedgerCard(
                                        sub,
                                        gw,
                                        isSubUnderWing: true,
                                      ),
                                    ),
                                  )
                                  .toList(),
                            ),
                          ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAgentLedgerCard(
    Map<String, dynamic> ag,
    PaymentGatewayMode gw, {
    required bool isSubUnderWing,
  }) {
    final id = (ag['id'] ?? '').toString();
    final fullName = (ag['fullName'] ?? ag['username'] ?? 'Agent').toString();
    final region = (ag['region'] ?? 'Kenya').toString();
    final phone = (ag['phone'] ?? '').toString();
    final refCode = (ag['referralCode'] ?? '').toString();
    final wingCode = (ag['wingInviteCode'] ?? '').toString();
    final parentName = (ag['parentAgentName'] ?? '').toString();

    final players = (ag['referredPlayersCount'] as num?)?.round() ?? 0;
    final ftds = (ag['activatedDepositorsCount'] as num?)?.round() ?? 0;
    final subCount = (ag['subAgentsCount'] as num?)?.round() ?? 0;

    final ftdComm = (ag['firstDepositCommissionKes'] as num?)?.round() ?? 0;
    final rakeComm = (ag['gameplayRakeCommissionKes'] as num?)?.round() ?? 0;
    final wingComm = (ag['wingOverrideCommissionKes'] as num?)?.round() ?? 0;
    final companyNet = (ag['companyNetRetainedKes'] as num?)?.round() ?? 0;
    final totalPaid = (ag['totalPaidKes'] as num?)?.round() ?? 0;
    final pendingOwed = (ag['pendingOwedKes'] as num?)?.round() ?? 0;
    final payoutRequested = ag['payoutRequested'] == true && pendingOwed > 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isSubUnderWing
            ? HigColors.canvas
            : HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: payoutRequested
              ? HigColors.amber.withValues(alpha: 0.65)
              : isSubUnderWing
                  ? HigColors.separator
                  : HigColors.brand.withValues(alpha: 0.40),
        ),
      ),
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
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      HigBadge(
                        label: isSubUnderWing
                            ? 'TIER 2 · WING SUB-AGENT'
                            : 'TIER 1 · LEAD AGENT',
                        tone: isSubUnderWing
                            ? HigBadgeTone.neutral
                            : HigBadgeTone.copper,
                      ),
                      if (payoutRequested)
                        const HigBadge(
                          label: 'PAYOUT REQUESTED',
                          tone: HigBadgeTone.crimson,
                        ),
                      Text(fullName, style: HigTypography.headline()),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isSubUnderWing
                        ? '$region · $phone · Under Wing of $parentName'
                        : '$region · $phone · $subCount Sub-Agents Under Wing',
                    style: HigTypography.caption(),
                  ),
                ],
              ),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _copyCodePill('Player Code: $refCode', refCode),
                  if (!isSubUnderWing)
                    _copyCodePill('Wing Code: $wingCode', wingCode),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Wrap(
            spacing: 18,
            runSpacing: 10,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _miniStat('Players / 1st Deposits', '$players Signups · $ftds FTDs'),
              _miniStat(
                'Company Profit Retained',
                _fmtMoney(gw, companyNet),
                color: HigColors.emerald,
              ),
              _miniStat(
                '1st Dep + Gameplay + Wing Cut',
                '${_fmtMoney(gw, ftdComm)} + ${_fmtMoney(gw, rakeComm)} + ${_fmtMoney(gw, wingComm)}',
              ),
              _miniStat(
                'Already Paid',
                _fmtMoney(gw, totalPaid),
                color: HigColors.brandBright,
              ),
              _miniStat(
                'YOU OWE AGENT',
                _fmtMoney(gw, pendingOwed),
                color: pendingOwed > 0 ? HigColors.amber : HigColors.emerald,
              ),
              HigButton(
                label: pendingOwed > 0
                    ? 'Settle & Mark Paid (${_fmtMoney(gw, pendingOwed)})'
                    : 'Fully Settled',
                icon: CupertinoIcons.checkmark_seal_fill,
                size: HigButtonSize.small,
                variant: pendingOwed > 0
                    ? HigButtonVariant.emerald
                    : HigButtonVariant.secondary,
                loading: _settlingAgentId == id,
                onPressed:
                    pendingOwed > 0 ? () => _settleAgentPayout(ag) : null,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _copyCodePill(String label, String code) {
    return GestureDetector(
      onTap: () {
        Clipboard.setData(ClipboardData(text: code));
        ref.read(toastProvider.notifier).show(
              'Copied $code',
              tone: ToastTone.info,
            );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: HigColors.surfacePrimary,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: HigColors.separator),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: HigTypography.mono(
                size: 10.5,
                color: HigColors.labelPrimary,
              ),
            ),
            const SizedBox(width: 5),
            const Icon(
              CupertinoIcons.doc_on_doc,
              size: 11,
              color: HigColors.brandBright,
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniStat(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: HigTypography.caption()),
        const SizedBox(height: 2),
        Text(
          value,
          style: HigTypography.mono(
            size: 12.5,
            color: color ?? HigColors.labelPrimary,
          ).copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  Widget _kpiTile(String label, String value, String sub, Color accent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: HigTypography.caption(),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: HigTypography.mono(size: 18, color: accent)
                  .copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: HigTypography.caption(color: HigColors.labelTertiary),
          ),
        ],
      ),
    );
  }
}

/// ═══════════════════════════════════════════════════════════════════════════
/// 2. DEDICATED FIELD AGENT & STAFF PORTAL: `/agent` (Transparent Mutual-Trust Hub)
/// ═══════════════════════════════════════════════════════════════════════════
class FieldAgentStaffScreen extends ConsumerStatefulWidget {
  const FieldAgentStaffScreen({super.key});

  @override
  ConsumerState<FieldAgentStaffScreen> createState() =>
      _FieldAgentStaffScreenState();
}

class _FieldAgentStaffScreenState extends ConsumerState<FieldAgentStaffScreen> {
  bool _loading = true;
  bool _requestingPayout = false;
  bool _recruitingSub = false;
  String? _selectedAgentCode;

  Map<String, dynamic> _agent = const {};
  List<Map<String, dynamic>> _subAgents = const [];
  List<Map<String, dynamic>> _allAgents = const [];

  final _subNameCtrl = TextEditingController();
  final _subPhoneCtrl = TextEditingController();
  final _subRegionCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAgentPortal());
  }

  @override
  void dispose() {
    _subNameCtrl.dispose();
    _subPhoneCtrl.dispose();
    _subRegionCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAgentPortal({String? codeOverride}) async {
    setState(() => _loading = true);
    final session = ref.read(playerSessionProvider);
    final targetCode = codeOverride ?? _selectedAgentCode ?? '';
    try {
      // Single-round-trip fetch: `/agents/overview` contains full agents list + schedule
      final overviewRes = await ApiClient.get('/agents/overview');
      if (overviewRes is Map && overviewRes['agents'] is List) {
        _allAgents = (overviewRes['agents'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        if (_allAgents.isNotEmpty) {
          final qUser = session.username.toLowerCase();
          final qEmail = session.email.toLowerCase();
          final qCode = targetCode.toUpperCase();
          final found = _allAgents.firstWhere(
            (a) =>
                (qCode.isNotEmpty &&
                    (a['referralCode'] ?? '').toString().toUpperCase() ==
                        qCode) ||
                (qCode.isEmpty &&
                    qEmail.isNotEmpty &&
                    (a['email'] ?? '').toString().toLowerCase() == qEmail) ||
                (qCode.isEmpty &&
                    qUser.isNotEmpty &&
                    (a['username'] ?? '').toString().toLowerCase() == qUser),
            orElse: () => _allAgents.first,
          );
          _agent = found;
          _selectedAgentCode = (_agent['referralCode'] ?? '').toString();
          final myId = (_agent['id'] ?? '').toString();
          _subAgents = _allAgents
              .where((a) => (a['parentAgentId'] ?? '').toString() == myId)
              .toList();
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _requestPayout() async {
    final id = (_agent['id'] ?? '').toString();
    if (id.isEmpty) return;
    setState(() => _requestingPayout = true);
    try {
      await ApiClient.post('/agents/request-payout', data: {
        'agentId': id,
        'phone': _agent['phone'],
      });
      await _loadAgentPortal(codeOverride: _selectedAgentCode);
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Payout Request Sent to Admin Treasury',
            body:
                'Your pending balance of KES ${_agent['pendingOwedKes'] ?? 0} is flagged for M-PESA settlement to ${_agent['phone']}.',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _requestingPayout = false);
    }
  }

  Future<void> _recruitSubAgentUnderMyWing() async {
    final wingCode = (_agent['wingInviteCode'] ?? '').toString();
    if (_subNameCtrl.text.trim().isEmpty || _subPhoneCtrl.text.trim().isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter Sub-Agent Name & M-PESA Phone',
            tone: ToastTone.error,
          );
      return;
    }
    setState(() => _recruitingSub = true);
    try {
      await ApiClient.post('/agents/register', data: {
        'fullName': _subNameCtrl.text.trim(),
        'phone': _subPhoneCtrl.text.trim(),
        'region': _subRegionCtrl.text.trim().isEmpty
            ? (_agent['region'] ?? 'Nairobi')
            : _subRegionCtrl.text.trim(),
        'parentWingCode': wingCode,
      });
      _subNameCtrl.clear();
      _subPhoneCtrl.clear();
      _subRegionCtrl.clear();
      await _loadAgentPortal(codeOverride: _selectedAgentCode);
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Sub-Agent Added Under Your Wing',
            body:
                'You now earn 1.5% on their players\' 1st deposits + 5% override on all platform rake from their players.',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _recruitingSub = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gw = ref.watch(paymentGatewayProvider);
    final isDesktop = Responsive.isDesktopOrExpanded(context);

    final fullName = (_agent['fullName'] ?? 'Field Agent').toString();
    final tier = (_agent['tier'] ?? 'LEAD_AGENT').toString();
    final isSub = tier == 'SUB_AGENT';
    final refCode = (_agent['referralCode'] ?? 'PVZ-KE-KEVIN').toString();
    final wingCode = (_agent['wingInviteCode'] ?? 'WING-KE-KEVIN').toString();
    final pendingOwedKes = (_agent['pendingOwedKes'] as num?)?.round() ?? 0;
    final totalPaidKes = (_agent['totalPaidKes'] as num?)?.round() ?? 0;
    final totalEarnedKes = (_agent['totalEarnedKes'] as num?)?.round() ?? 0;
    final ftdCommKes =
        (_agent['firstDepositCommissionKes'] as num?)?.round() ?? 0;
    final rakeCommKes =
        (_agent['gameplayRakeCommissionKes'] as num?)?.round() ?? 0;
    final wingCommKes =
        (_agent['wingOverrideCommissionKes'] as num?)?.round() ?? 0;
    final referredPlayers = (_agent['referredPlayers'] as List?)
            ?.whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList() ??
        const [];
    final payouts = (_agent['payoutHistory'] as List?)
            ?.whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList() ??
        const [];

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 1060,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Agent Header & Referral Codes
              GlassCard(
                radius: 18,
                padding: const EdgeInsets.all(20),
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
                              runSpacing: 4,
                              children: [
                                HigBadge(
                                  label: isSub
                                      ? 'TIER 2 · WING SUB-AGENT'
                                      : 'TIER 1 · LEAD GROUND AGENT',
                                  tone: isSub
                                      ? HigBadgeTone.neutral
                                      : HigBadgeTone.copper,
                                ),
                                const HigBadge(
                                  label: 'VERIFIED STAFF LEDGER',
                                  tone: HigBadgeTone.emerald,
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '$fullName — Ground Force Hub',
                              style: HigTypography.title2(),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isSub
                                  ? 'Operating under Lead Agent ${_agent['parentAgentName']} · Earn 3.5% on 1st Deposits + 15% of Match Rake.'
                                  : 'Earn 5.0% on Direct Players\' 1st Deposits + 18% of Match Rake + 5% Wing Override on Sub-Agents you recruit.',
                              style: HigTypography.footnote(),
                            ),
                          ],
                        ),
                        if (_allAgents.length > 1)
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: _allAgents.map((a) {
                              final code =
                                  (a['referralCode'] ?? '').toString();
                              final selected = code == refCode;
                              return GestureDetector(
                                onTap: () =>
                                    _loadAgentPortal(codeOverride: code),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: selected
                                        ? HigColors.brand
                                        : HigColors.surfaceGrouped,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: selected
                                          ? HigColors.brandBright
                                          : HigColors.separator,
                                    ),
                                  ),
                                  child: Text(
                                    (a['username'] ?? code).toString(),
                                    style: HigTypography.mono(
                                      size: 11,
                                      color: selected
                                          ? Colors.white
                                          : HigColors.labelSecondary,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 10,
                      children: [
                        _shareCodeBox(
                          'PLAYER REFERRAL CODE',
                          refCode,
                          'Players enter this at /signup or 1st deposit',
                        ),
                        if (!isSub)
                          _shareCodeBox(
                            'WING SUB-AGENT INVITE CODE',
                            wingCode,
                            'Recruit sub-agents under your wing & earn overrides',
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // 2. MUTUAL-TRUST COMMISSION LEDGER ("HOW MUCH PLAYVERZUS OWES YOU")
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: isDesktop ? 4 : 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.85,
                children: [
                  _agentKpi(
                    'PLAYVERZUS OWES YOU NOW',
                    _fmtMoney(gw, pendingOwedKes),
                    _agent['payoutRequested'] == true
                        ? 'Payout Requested · Awaiting Admin'
                        : 'Available for M-PESA Payout',
                    HigColors.amber,
                  ),
                  _agentKpi(
                    'TOTAL ALREADY PAID TO YOU',
                    _fmtMoney(gw, totalPaidKes),
                    '${payouts.length} Verified M-PESA Settlements',
                    HigColors.emerald,
                  ),
                  _agentKpi(
                    '1ST DEPOSIT + GAMEPLAY CUT',
                    '${_fmtMoney(gw, ftdCommKes)} + ${_fmtMoney(gw, rakeCommKes)}',
                    '${_agent['activatedDepositorsCount'] ?? 0} Activated Depositors',
                    HigColors.brandBright,
                  ),
                  _agentKpi(
                    'WING SUB-AGENT OVERRIDES',
                    _fmtMoney(gw, wingCommKes),
                    '${_subAgents.length} Sub-Agents · Lifetime ${_fmtMoney(gw, totalEarnedKes)}',
                    HigColors.labelPrimary,
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Request Payout Banner
              GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 10,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Commission Payout to M-PESA (${_agent['phone'] ?? '+2547...'})',
                          style: HigTypography.headline(),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Your ledger is 100% synchronized with Admin Treasury (/admin/agents) so both sides always see the exact same balance owed.',
                          style: HigTypography.caption(),
                        ),
                      ],
                    ),
                    HigButton(
                      label: _agent['payoutRequested'] == true
                          ? 'Payout Requested (${_fmtMoney(gw, pendingOwedKes)})'
                          : 'Request Payout (${_fmtMoney(gw, pendingOwedKes)})',
                      icon: CupertinoIcons.paperplane_fill,
                      size: HigButtonSize.small,
                      variant: HigButtonVariant.emerald,
                      loading: _requestingPayout,
                      onPressed: (pendingOwedKes >= 150 &&
                              _agent['payoutRequested'] != true)
                          ? _requestPayout
                          : null,
                    ),
                  ],
                ),
              ),

              // 3. SUB-AGENTS UNDER MY WING (For Tier 1 Lead Agents)
              if (!isSub) ...[
                const SizedBox(height: 14),
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sub-Agents Under My Wing (${_subAgents.length})',
                        style: HigTypography.title3(),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Recruit ground promoters under your wing code ($wingCode). They earn 3.5% on 1st deposits + 15% of match rake, while you automatically earn 1.5% on their 1st deposits + 5% override on all their players\' match rakes.',
                        style: HigTypography.footnote(),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: HigTextField(
                              controller: _subNameCtrl,
                              placeholder: 'Sub-Agent Full Name',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: HigTextField(
                              controller: _subPhoneCtrl,
                              placeholder: 'M-PESA (+2547...)',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: HigTextField(
                              controller: _subRegionCtrl,
                              placeholder: 'Campus / Area',
                            ),
                          ),
                          const SizedBox(width: 8),
                          HigButton(
                            label: 'Add to My Wing',
                            size: HigButtonSize.small,
                            loading: _recruitingSub,
                            onPressed: _recruitSubAgentUnderMyWing,
                          ),
                        ],
                      ),
                      if (_subAgents.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        ..._subAgents.map((sub) {
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
                                spacing: 12,
                                runSpacing: 6,
                                children: [
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${sub['fullName']} (${sub['referralCode']})',
                                        style: HigTypography.headline()
                                            .copyWith(fontSize: 13.5),
                                      ),
                                      Text(
                                        '${sub['region']} · ${sub['referredPlayersCount']} Signups · ${sub['activatedDepositorsCount']} Activated Depositors',
                                        style: HigTypography.caption(),
                                      ),
                                    ],
                                  ),
                                  HigBadge(
                                    label:
                                        'SUB-AGENT EARNED ${_fmtMoney(gw, (sub['totalEarnedKes'] as num?) ?? 0)}',
                                    tone: HigBadgeTone.emerald,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 14),

              // 4. REFERRED PLAYERS & SETTLEMENT RECEIPTS
              GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'My Referred Players (${referredPlayers.length} Recent)',
                      style: HigTypography.title3(),
                    ),
                    const SizedBox(height: 10),
                    if (_loading && referredPlayers.isEmpty)
                      const HigLoadingCard(message: 'Loading referred players...')
                    else if (referredPlayers.isEmpty)
                      Text(
                        'Share your code $refCode with players on the ground to start earning first-deposit and match rake commissions.',
                        style: HigTypography.footnote(),
                      )
                    else
                      ...referredPlayers.map((p) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: HigColors.surfaceGrouped,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: HigColors.separator),
                            ),
                            child: Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 12,
                              runSpacing: 6,
                              children: [
                                Text(
                                  '@${p['username']} · Joined ${p['joinedAt']}',
                                  style: HigTypography.footnote(
                                    color: HigColors.labelPrimary,
                                  ).copyWith(fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  '1st Deposit: ${_fmtMoney(gw, (p['firstDepositKes'] as num?) ?? 0)} · ${p['cashMatchesPlayed']} Cash Matches',
                                  style: HigTypography.caption(),
                                ),
                                HigBadge(
                                  label:
                                      'YOUR CUT +${_fmtMoney(gw, (p['agentCommissionKes'] as num?) ?? 0)}',
                                  tone: HigBadgeTone.emerald,
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
          ),
        ),
      ],
    );
  }

  Widget _shareCodeBox(String label, String code, String hint) {
    return GestureDetector(
      onTap: () {
        Clipboard.setData(ClipboardData(text: code));
        ref.read(toastProvider.notifier).show(
              'Copied $code to clipboard',
              tone: ToastTone.success,
            );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: HigColors.surfaceGrouped,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HigColors.brand.withValues(alpha: 0.45)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: HigTypography.caption()),
            const SizedBox(height: 3),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  code,
                  style: HigTypography.mono(
                    size: 15,
                    color: HigColors.brandBright,
                  ).copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(width: 8),
                const Icon(
                  CupertinoIcons.doc_on_doc_fill,
                  size: 14,
                  color: HigColors.brandBright,
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              hint,
              style: HigTypography.caption(color: HigColors.labelTertiary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _agentKpi(String label, String value, String sub, Color accent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: HigTypography.caption(),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: HigTypography.mono(size: 18, color: accent)
                  .copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: HigTypography.caption(color: HigColors.labelTertiary),
          ),
        ],
      ),
    );
  }
}
