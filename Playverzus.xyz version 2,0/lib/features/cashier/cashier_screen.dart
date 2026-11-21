import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/hig_primitives.dart';

class CashierScreen extends ConsumerStatefulWidget {
  const CashierScreen({super.key});

  @override
  ConsumerState<CashierScreen> createState() => _CashierScreenState();
}

class _CashierScreenState extends ConsumerState<CashierScreen> {
  int _tab = 0; // 0 = Deposit, 1 = Withdraw, 2 = History
  bool _faucetLoading = false;
  bool _faucetClaimed = false;
  bool _submitting = false;
  bool _loadingHistory = false;
  bool _checkingStk = false;
  String? _pendingStkLocation;
  String? _pendingStkStatus;
  String? _error;
  List<Map<String, dynamic>> _transactions = const [];

  final TextEditingController _amountCtrl = TextEditingController();
  final TextEditingController _mpesaPhoneCtrl = TextEditingController();
  final TextEditingController _walletAddrCtrl = TextEditingController();
  Timer? _stkPollTimer;

  @override
  void initState() {
    super.initState();
    _amountCtrl.addListener(_onAmountChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadWalletData());
  }

  void _onAmountChanged() {
    if (mounted) setState(() {});
  }

  void _startAutoStkPolling() {
    _stkPollTimer?.cancel();
    int checks = 0;
    _stkPollTimer = Timer.periodic(const Duration(seconds: 4), (timer) async {
      checks++;
      if (!mounted || _pendingStkLocation == null || checks > 18) {
        timer.cancel();
        return;
      }
      final st = (_pendingStkStatus ?? '').toLowerCase();
      if (st == 'success' || st == 'failed') {
        timer.cancel();
        return;
      }
      await _checkPendingStkStatus(silentPending: true);
    });
  }

  @override
  void dispose() {
    _stkPollTimer?.cancel();
    _amountCtrl.removeListener(_onAmountChanged);
    _amountCtrl.dispose();
    _mpesaPhoneCtrl.dispose();
    _walletAddrCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadWalletData() async {
    final session = ref.read(playerSessionProvider);
    setState(() {
      _loadingHistory = true;
      _error = null;
    });

    await ref.read(playerSessionProvider.notifier).refreshFromBackend();

    if (session.accessToken == null || session.accessToken!.isEmpty) {
      if (!mounted) return;
      setState(() => _loadingHistory = false);
      return;
    }

    try {
      final res = await ApiClient.get('/wallet/history?limit=50');
      if (res is List) {
        _transactions = res.whereType<Map<String, dynamic>>().toList();
      } else if (res is Map && res['transactions'] is List) {
        _transactions = (res['transactions'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}

    if (!mounted) return;
    setState(() => _loadingHistory = false);
  }

  double? _parsedAmountUsd(bool isMpesa) {
    final raw = _amountCtrl.text.trim().replaceAll(',', '');
    final val = double.tryParse(raw);
    if (val == null || val <= 0) return null;
    return isMpesa ? (val / AppConfig.usdToKesRate) : val;
  }

  Future<void> _handleDeposit(bool isMpesa) async {
    final amountUsd = _parsedAmountUsd(isMpesa);
    if (amountUsd == null) {
      ref.read(toastProvider.notifier).show(
            isMpesa ? 'Enter a valid amount in KES' : 'Enter a valid amount in USD',
            tone: ToastTone.error,
          );
      return;
    }

    final rawInputAmount =
        double.parse(_amountCtrl.text.trim().replaceAll(',', ''));

    if (isMpesa) {
      final kes = rawInputAmount.round();
      if (kes < PaymentFeeSchedule.mpesaMinDepositKes) {
        ref.read(toastProvider.notifier).show(
              'Minimum M-PESA deposit is KES ${PaymentFeeSchedule.mpesaMinDepositKes}',
              tone: ToastTone.error,
            );
        return;
      }
      if (kes > PaymentFeeSchedule.mpesaMaxSingleDepositKes) {
        ref.read(toastProvider.notifier).show(
              'Maximum single M-PESA deposit is KES ${PaymentFeeSchedule.mpesaMaxSingleDepositKes}',
              tone: ToastTone.error,
            );
        return;
      }
      if (_mpesaPhoneCtrl.text.trim().length < 9) {
        ref.read(toastProvider.notifier).show(
              'Enter a valid M-PESA phone number',
              tone: ToastTone.error,
            );
        return;
      }
    } else {
      if (rawInputAmount < PaymentFeeSchedule.crossmintMinDepositUsd) {
        ref.read(toastProvider.notifier).show(
              'Minimum deposit is \$${PaymentFeeSchedule.crossmintMinDepositUsd.toStringAsFixed(2)} USD',
              tone: ToastTone.error,
            );
        return;
      }
      if (rawInputAmount > PaymentFeeSchedule.crossmintMaxSingleDepositUsd) {
        ref.read(toastProvider.notifier).show(
              'Maximum single deposit is \$${PaymentFeeSchedule.crossmintMaxSingleDepositUsd.toStringAsFixed(0)} USD',
              tone: ToastTone.error,
            );
        return;
      }
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final session = ref.read(playerSessionProvider);
    final mpesaBreak =
        PaymentFeeSchedule.mpesaDepositBreakdown(rawInputAmount.round());
    final cmBreak =
        PaymentFeeSchedule.crossmintDepositBreakdown(rawInputAmount);

    try {
      if (session.accessToken != null && session.accessToken!.isNotEmpty) {
        if (!isMpesa) {
          final cmRes = await ApiClient.post('/crossmint/order', data: {
            'amount': amountUsd,
            'currency': 'USD',
            'email': session.email,
          });
          if (cmRes is Map && cmRes['checkoutUrl'] != null) {
            final checkoutUrl = cmRes['checkoutUrl'].toString().trim();
            final uri = Uri.tryParse(checkoutUrl);
            if (uri != null && checkoutUrl.isNotEmpty) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          }
        } else {
          final stkRes = await ApiClient.post('/mpesa/stk-push', data: {
            'amountKes': rawInputAmount.round(),
            'phone': _mpesaPhoneCtrl.text.trim(),
            'userId': session.userId,
            'firstName': session.username,
            'email': session.email,
          });
          if (stkRes is Map && stkRes['location'] != null) {
            _pendingStkLocation = stkRes['location'].toString();
            _pendingStkStatus = 'STK_PUSH_SENT';
            _startAutoStkPolling();
          }
        }
        await _loadWalletData();
      } else {
        throw const ApiException('Sign in required to process deposits.');
      }

      if (!mounted) return;
      _amountCtrl.clear();
      ref.read(toastProvider.notifier).show(
            isMpesa ? 'M-PESA STK prompt sent' : 'Checkout opened',
            body: isMpesa
                ? 'Approve KES ${mpesaBreak.totalStkChargeKes} on ${_mpesaPhoneCtrl.text.trim()} (KES ${mpesaBreak.netCreditKes} wallet credit + KES ${mpesaBreak.feeKes} fee)'
                : 'Total \$${cmBreak.totalCheckoutUsd.toStringAsFixed(2)} (\$${cmBreak.netCreditUsd.toStringAsFixed(2)} credit + \$${cmBreak.feeUsd.toStringAsFixed(2)} fee)',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _checkPendingStkStatus({bool silentPending = false}) async {
    final loc = _pendingStkLocation;
    if (loc == null || loc.isEmpty) return;
    setState(() => _checkingStk = true);
    try {
      final res = await ApiClient.get(
        '/mpesa/check-status?location=${Uri.encodeQueryComponent(loc)}',
      );
      if (res is Map) {
        final st = (res['status'] ?? 'Pending').toString();
        setState(() => _pendingStkStatus = st);
        if (st.toLowerCase() == 'success') {
          _stkPollTimer?.cancel();
          await _loadWalletData();
          if (!mounted) return;
          ref.read(toastProvider.notifier).show(
                'M-PESA payment confirmed & credited',
                tone: ToastTone.success,
              );
        } else if (st.toLowerCase() == 'failed') {
          _stkPollTimer?.cancel();
          if (!mounted) return;
          ref.read(toastProvider.notifier).show(
                'M-PESA payment failed or cancelled',
                tone: ToastTone.error,
              );
        } else if (!silentPending) {
          if (!mounted) return;
          ref.read(toastProvider.notifier).show(
                'M-PESA status: $st',
                body: 'Waiting for PIN confirmation on your phone.',
                tone: ToastTone.info,
              );
        }
      }
    } on ApiException catch (e) {
      if (!mounted || silentPending) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _checkingStk = false);
    }
  }

  Future<void> _handleWithdraw(bool isMpesa) async {
    final amountUsd = _parsedAmountUsd(isMpesa);
    if (amountUsd == null) {
      ref.read(toastProvider.notifier).show(
            isMpesa ? 'Enter a valid amount in KES' : 'Enter a valid amount in USD',
            tone: ToastTone.error,
          );
      return;
    }

    final rawInputAmount =
        double.parse(_amountCtrl.text.trim().replaceAll(',', ''));

    if (isMpesa) {
      final kes = rawInputAmount.round();
      if (kes < PaymentFeeSchedule.mpesaMinWithdrawalKes) {
        ref.read(toastProvider.notifier).show(
              'Minimum M-PESA withdrawal is KES ${PaymentFeeSchedule.mpesaMinWithdrawalKes} (KES ${PaymentFeeSchedule.mpesaMinNetPayoutKes} net + KES ${PaymentFeeSchedule.mpesaFlatPayoutFeeKes} payout fee)',
              tone: ToastTone.error,
            );
        return;
      }
      if (kes > PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes) {
        ref.read(toastProvider.notifier).show(
              'Maximum single M-PESA withdrawal is KES ${PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes}',
              tone: ToastTone.error,
            );
        return;
      }
    } else {
      if (rawInputAmount < PaymentFeeSchedule.crossmintMinWithdrawalUsd) {
        ref.read(toastProvider.notifier).show(
              'Minimum withdrawal is \$${PaymentFeeSchedule.crossmintMinWithdrawalUsd.toStringAsFixed(2)} USDC',
              tone: ToastTone.error,
            );
        return;
      }
      if (rawInputAmount > PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd) {
        ref.read(toastProvider.notifier).show(
              'Maximum single withdrawal is \$${PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd.toStringAsFixed(0)} USDC',
              tone: ToastTone.error,
            );
        return;
      }
    }

    final session = ref.read(playerSessionProvider);
    if (amountUsd > session.cashUsd + 0.001) {
      ref.read(toastProvider.notifier).show(
            'Amount exceeds your available cash balance',
            tone: ToastTone.error,
          );
      return;
    }

    final dest = isMpesa
        ? _mpesaPhoneCtrl.text.trim()
        : _walletAddrCtrl.text.trim();
    if (dest.isEmpty) {
      ref.read(toastProvider.notifier).show(
            isMpesa
                ? 'Enter your M-PESA phone number'
                : 'Enter a destination wallet address',
            tone: ToastTone.error,
          );
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final mpesaOut =
        PaymentFeeSchedule.mpesaWithdrawalBreakdown(rawInputAmount.round());
    final cmOut =
        PaymentFeeSchedule.crossmintWithdrawalBreakdown(rawInputAmount);

    try {
      if (session.accessToken != null && session.accessToken!.isNotEmpty) {
        if (isMpesa) {
          await ApiClient.post('/mpesa/payout', data: {
            'amountKes': rawInputAmount.round(),
            'phone': dest,
            'userId': session.userId,
            'firstName': session.username,
            'email': session.email,
          });
        } else {
          await ApiClient.post('/wallet/payout', data: {
            'amount': amountUsd,
            'method': {
              'type': 'CROSSMINT_USDC',
              'destinationAddress': dest,
              'chain': 'base',
            },
          });
        }
        await _loadWalletData();
      } else {
        throw const ApiException('Sign in required to withdraw funds.');
      }

      if (!mounted) return;
      _amountCtrl.clear();
      ref.read(toastProvider.notifier).show(
            'Withdrawal initiated',
            body: isMpesa
                ? 'KES ${mpesaOut.netToMpesaKes} net sent to $dest (KES ${mpesaOut.walletDeductionKes} - KES ${mpesaOut.feeKes} payout fee)'
                : '\$${cmOut.netToWalletUsd.toStringAsFixed(2)} USDC net sent to $dest (\$${cmOut.feeUsd.toStringAsFixed(2)} payout fee)',
            tone: ToastTone.success,
          );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final isMpesa = gateway == PaymentGatewayMode.kopokopo;

    final formattedBalance = isMpesa
        ? 'KES ${session.cashKes.round()}'
        : '\$${session.cashUsd.toStringAsFixed(2)} USDC';

    return RefreshIndicator(
      onRefresh: _loadWalletData,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 920,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          isMpesa
                              ? const BrandLogo.kopokopo(height: 26)
                              : const BrandLogo.crossmint(height: 22),
                          HigBadge(
                            label: isMpesa ? 'M-PESA / KES' : 'CARD / USDC',
                            tone: HigBadgeTone.emerald,
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Wrap(
                        spacing: 28,
                        runSpacing: 14,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('AVAILABLE CASH',
                                  style: HigTypography.caption()),
                              const SizedBox(height: 4),
                              Text(
                                formattedBalance,
                                style: HigTypography.mono(
                                  size: 30,
                                  weight: FontWeight.w800,
                                  color: HigColors.emerald,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('PRACTICE COINS',
                                  style: HigTypography.caption()),
                              const SizedBox(height: 4),
                              Text(
                                '${session.demoPoints} PTS',
                                style: HigTypography.mono(
                                  size: 30,
                                  weight: FontWeight.w800,
                                  color: HigColors.brandBright,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      HigButton(
                        label: _faucetClaimed
                            ? 'Daily Practice Coins Claimed'
                            : 'Claim 1,000 Free Practice Coins',
                        icon: CupertinoIcons.gift,
                        variant: HigButtonVariant.secondary,
                        size: HigButtonSize.small,
                        loading: _faucetLoading,
                        onPressed: _faucetClaimed
                            ? null
                            : () async {
                                setState(() => _faucetLoading = true);
                                final err = await ref
                                    .read(playerSessionProvider.notifier)
                                    .claimDailyPracticeCoins();
                                if (!mounted) return;
                                setState(() => _faucetLoading = false);
                                if (err != null) {
                                  ref
                                      .read(toastProvider.notifier)
                                      .show(err, tone: ToastTone.error);
                                } else {
                                  setState(() => _faucetClaimed = true);
                                  ref.read(toastProvider.notifier).show(
                                        '+1,000 Practice Coins credited',
                                        tone: ToastTone.success,
                                      );
                                }
                              },
                      ),
                    ],
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _loadWalletData),
                ],

                const SizedBox(height: 14),

                HigSegmentedControl<int>(
                  groupValue: _tab,
                  onChanged: (v) => setState(() => _tab = v),
                  segments: const {
                    0: 'Deposit',
                    1: 'Withdraw',
                    2: 'Ledger History',
                  },
                ),

                const SizedBox(height: 14),

                if (_tab == 0 || _tab == 1)
                  GlassCard(
                    radius: 16,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _tab == 0
                              ? (isMpesa
                                  ? 'M-PESA STK Push Deposit'
                                  : 'Card / USDC Deposit')
                              : (isMpesa
                                  ? 'M-PESA Withdrawal'
                                  : 'USDC Withdrawal'),
                          style: HigTypography.title3(),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isMpesa
                              ? 'Enter any amount in KES to ${_tab == 0 ? 'deposit' : 'withdraw'}.'
                              : 'Enter any amount in USD to ${_tab == 0 ? 'deposit' : 'withdraw'}.',
                          style: HigTypography.caption(),
                        ),
                        const SizedBox(height: 14),

                        // Primary Custom Amount Input (+ Max button on Withdraw)
                        Row(
                          children: [
                            Expanded(
                              child: HigTextField(
                                controller: _amountCtrl,
                                placeholder: isMpesa
                                    ? 'Amount in KES (e.g. 500)'
                                    : 'Amount in USD (e.g. 15.00)',
                                prefixIcon: CupertinoIcons.money_dollar_circle,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                  decimal: true,
                                ),
                              ),
                            ),
                            if (_tab == 1) ...[
                              const SizedBox(width: 8),
                              HigButton(
                                label: 'Max',
                                size: HigButtonSize.small,
                                variant: HigButtonVariant.secondary,
                                onPressed: () {
                                  _amountCtrl.text = isMpesa
                                      ? session.cashKes.round().toString()
                                      : session.cashUsd.toStringAsFixed(2);
                                },
                              ),
                            ],
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Live Upfront Customer-Paid Fee & Threshold Breakdown Box
                        _buildLiveFeeBreakdownBox(isMpesa, _tab == 0),

                        const SizedBox(height: 12),

                        if (isMpesa)
                          HigTextField(
                            controller: _mpesaPhoneCtrl,
                            placeholder: 'M-PESA number (+2547...)',
                            prefixIcon: CupertinoIcons.phone,
                            keyboardType: TextInputType.phone,
                          )
                        else if (_tab == 1)
                          HigTextField(
                            controller: _walletAddrCtrl,
                            placeholder: 'USDC wallet address (Base / EVM)',
                            prefixIcon: CupertinoIcons.creditcard,
                          ),

                        const SizedBox(height: 16),

                        HigButton(
                          label: _tab == 0
                              ? (isMpesa
                                  ? 'Deposit via M-PESA'
                                  : 'Continue to Deposit')
                              : (isMpesa
                                  ? 'Withdraw to M-PESA'
                                  : 'Withdraw USDC'),
                          size: HigButtonSize.large,
                          fullWidth: true,
                          loading: _submitting,
                          onPressed: () => _tab == 0
                              ? _handleDeposit(isMpesa)
                              : _handleWithdraw(isMpesa),
                        ),
                        if (_tab == 0 &&
                            isMpesa &&
                            _pendingStkLocation != null) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: HigColors.emerald.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: HigColors.emerald.withValues(alpha: 0.35),
                              ),
                            ),
                            child: Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 10,
                              runSpacing: 8,
                              children: [
                                Text(
                                  'M-PESA Prompt Status: ${_pendingStkStatus ?? 'Pending'}',
                                  style: HigTypography.footnote(
                                    color: HigColors.labelPrimary,
                                  ),
                                ),
                                HigButton(
                                  label: 'Check Payment Status',
                                  size: HigButtonSize.small,
                                  variant: HigButtonVariant.secondary,
                                  loading: _checkingStk,
                                  onPressed: () => _checkPendingStkStatus(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  )
                else if (_loadingHistory)
                  const HigLoadingCard(message: 'Loading ledger history...')
                else if (_transactions.isEmpty)
                  const HigEmptyState(
                    icon: CupertinoIcons.doc_text,
                    title: 'No transactions yet',
                    subtitle:
                        'Deposits, match escrow locks, payouts, and withdrawals appear here.',
                  )
                else
                  GlassCard(
                    radius: 16,
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: List.generate(_transactions.length, (i) {
                        final tx = _transactions[i];
                        final meta = tx['metadata'] is Map
                            ? Map<String, dynamic>.from(tx['metadata'] as Map)
                            : const <String, dynamic>{};
                        final rawReason = (tx['reason'] ??
                                meta['type'] ??
                                tx['type'] ??
                                'Wallet Transaction')
                            .toString()
                            .trim();
                        final label = rawReason.isEmpty
                            ? 'Wallet Transaction'
                            : rawReason.replaceAll('_', ' ');
                        final rawCurr = (tx['currency'] ??
                                meta['currency'] ??
                                'USDC')
                            .toString()
                            .toUpperCase();
                        final isPoints = rawCurr == 'POINTS' ||
                            rawCurr == 'PTS' ||
                            meta['type'] == 'DEMO_CLAIM';
                        final amt = (tx['amount'] as num?)?.toDouble() ?? 0.0;
                        final rawCreated =
                            (tx['createdAt'] ?? tx['created_at'] ?? '')
                                .toString();
                        final dateStr = rawCreated.isNotEmpty
                            ? rawCreated.replaceFirst('T', ' ').split('.').first
                            : '';
                        final status = (tx['status'] ?? 'COMPLETED')
                            .toString()
                            .toUpperCase();
                        final positive = amt >= 0 &&
                            !label.toUpperCase().contains('WITHDRAW') &&
                            !label.toUpperCase().contains('LOCK');

                        final formattedAmt = isPoints
                            ? '${positive ? '+' : '-'}${amt.abs().round()} PTS'
                            : isMpesa
                                ? '${positive ? '+' : '-'}KES ${(amt.abs() * AppConfig.usdToKesRate).round()}'
                                : '${positive ? '+' : '-'}\$${amt.abs().toStringAsFixed(2)}';

                        return Column(
                          children: [
                            ListTile(
                              title: Text(
                                label,
                                style: HigTypography.headline()
                                    .copyWith(fontSize: 14),
                              ),
                              subtitle: Text(
                                dateStr.isNotEmpty
                                    ? '$status · $dateStr'
                                    : status,
                                style: HigTypography.caption(),
                              ),
                              trailing: Text(
                                formattedAmt,
                                style: HigTypography.mono(
                                  size: 13.5,
                                  color: positive
                                      ? HigColors.emerald
                                      : HigColors.labelPrimary,
                                ),
                              ),
                            ),
                            if (i < _transactions.length - 1)
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

  Widget _buildLiveFeeBreakdownBox(bool isMpesa, bool isDeposit) {
    final raw =
        double.tryParse(_amountCtrl.text.trim().replaceAll(',', '')) ?? 0.0;

    if (isMpesa && isDeposit) {
      final kes = raw > 0 ? raw.round() : 500;
      final b = PaymentFeeSchedule.mpesaDepositBreakdown(kes);
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: HigColors.surfaceGrouped,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HigColors.separator),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _feeLine('Wallet Credit (Net)', 'KES ${b.netCreditKes}',
                HigColors.labelPrimary),
            const SizedBox(height: 5),
            _feeLine(
              'M-PESA Processing Fee (Customer Paid Upfront)',
              b.feeKes == 0
                  ? 'KES 0 (Free ≤ KES 200)'
                  : '+KES ${b.feeKes} (0.55% · Capped at KES 200)',
              HigColors.labelSecondary,
            ),
            const Divider(height: 14),
            _feeLine(
              'Total STK Push Prompt',
              'KES ${b.totalStkChargeKes}',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              'Limits: Min KES ${PaymentFeeSchedule.mpesaMinDepositKes} · Max KES ${PaymentFeeSchedule.mpesaMaxSingleDepositKes} / transaction.',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    if (isMpesa && !isDeposit) {
      final kes = raw > 0 ? raw.round() : 500;
      final b = PaymentFeeSchedule.mpesaWithdrawalBreakdown(kes);
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: HigColors.surfaceGrouped,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HigColors.separator),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _feeLine('Wallet Deduction', 'KES ${b.walletDeductionKes}',
                HigColors.labelPrimary),
            const SizedBox(height: 5),
            _feeLine(
              'M-PESA Payout Fee (Flat · Customer Paid Upfront)',
              '-KES ${b.feeKes}',
              HigColors.labelSecondary,
            ),
            const Divider(height: 14),
            _feeLine(
              'Net Disbursed to Your M-PESA',
              'KES ${b.netToMpesaKes}',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              'Thresholds: Min KES ${PaymentFeeSchedule.mpesaMinWithdrawalKes} (KES ${PaymentFeeSchedule.mpesaMinNetPayoutKes} net + KES ${PaymentFeeSchedule.mpesaFlatPayoutFeeKes} fee) · Max KES ${PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes}/tx · Daily Limit KES ${PaymentFeeSchedule.mpesaMaxDailyWithdrawalKes} (max ${PaymentFeeSchedule.mpesaMaxDailyWithdrawalCount}/day).',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    if (!isMpesa && isDeposit) {
      final usd = raw > 0 ? raw : 10.0;
      final b = PaymentFeeSchedule.crossmintDepositBreakdown(usd);
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: HigColors.surfaceGrouped,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HigColors.separator),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _feeLine('Wallet Credit (Net)',
                '\$${b.netCreditUsd.toStringAsFixed(2)} USDC', HigColors.labelPrimary),
            const SizedBox(height: 5),
            _feeLine(
              'Gateway Processing Fee (Customer Paid Upfront)',
              '+\$${b.feeUsd.toStringAsFixed(2)} (3.5% + \$0.30)',
              HigColors.labelSecondary,
            ),
            const Divider(height: 14),
            _feeLine(
              'Total Checkout Charge',
              '\$${b.totalCheckoutUsd.toStringAsFixed(2)} USD',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              'Limits: Min \$${PaymentFeeSchedule.crossmintMinDepositUsd.toStringAsFixed(2)} · Max \$${PaymentFeeSchedule.crossmintMaxSingleDepositUsd.toStringAsFixed(0)} / transaction.',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    final usd = raw > 0 ? raw : 10.0;
    final b = PaymentFeeSchedule.crossmintWithdrawalBreakdown(usd);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: HigColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _feeLine('Wallet Deduction',
              '\$${b.walletDeductionUsd.toStringAsFixed(2)} USDC', HigColors.labelPrimary),
          const SizedBox(height: 5),
          _feeLine(
            'On-Chain Payout Fee (Flat · Customer Paid Upfront)',
            '-\$${b.feeUsd.toStringAsFixed(2)} USDC',
            HigColors.labelSecondary,
          ),
          const Divider(height: 14),
          _feeLine(
            'Net Disbursed to Your Wallet',
            '\$${b.netToWalletUsd.toStringAsFixed(2)} USDC',
            HigColors.emerald,
            bold: true,
          ),
          const SizedBox(height: 6),
          Text(
            'Thresholds: Min \$${PaymentFeeSchedule.crossmintMinWithdrawalUsd.toStringAsFixed(2)} · Max \$${PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd.toStringAsFixed(0)}/tx · Daily Limit \$${PaymentFeeSchedule.crossmintMaxDailyWithdrawalUsd.toStringAsFixed(0)} (max ${PaymentFeeSchedule.crossmintMaxDailyWithdrawalCount}/day).',
            style: HigTypography.caption(),
          ),
        ],
      ),
    );
  }

  Widget _feeLine(String label, String value, Color valueColor,
      {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Text(
            label,
            style: HigTypography.caption(
              color: bold ? HigColors.labelPrimary : HigColors.labelSecondary,
            ).copyWith(fontWeight: bold ? FontWeight.w700 : FontWeight.w500),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          value,
          style: HigTypography.mono(
            size: bold ? 13 : 11.5,
            color: valueColor,
          ).copyWith(fontWeight: bold ? FontWeight.w800 : FontWeight.w600),
        ),
      ],
    );
  }
}
