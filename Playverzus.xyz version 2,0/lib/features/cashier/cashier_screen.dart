import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  bool? _useMpesaOverride; // null = follow active platform gateway
  bool _useCardCheckout = false; // false = Direct Base USDC (No-KYB), true = Card Checkout
  bool _faucetLoading = false;
  bool _faucetClaimed = false;
  bool _submitting = false;
  bool _loadingHistory = false;
  bool _loadingDepositWallet = false;
  bool _syncingDepositWallet = false;
  bool _copiedDepositAddr = false;
  bool _checkingStk = false;
  bool _expressPayout = false;
  String? _pendingStkLocation;
  String? _pendingStkStatus;
  String? _error;
  String? _walletLoadErr;
  Map<String, dynamic>? _depositWallet;
  String? _amountErr;
  String? _destErr;
  bool _syncingConverter = false;
  List<Map<String, dynamic>> _transactions = const [];

  final TextEditingController _usdcCtrl = TextEditingController();
  final TextEditingController _kesCtrl = TextEditingController();
  final TextEditingController _mpesaPhoneCtrl = TextEditingController();
  final TextEditingController _walletAddrCtrl = TextEditingController();
  Timer? _stkPollTimer;
  Timer? _copyResetTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadWalletData();
      if (ref.read(paymentGatewayProvider) == PaymentGatewayMode.crossmint) {
        _loadDepositWallet();
      }
    });
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
    _copyResetTimer?.cancel();
    _usdcCtrl.dispose();
    _kesCtrl.dispose();
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

  Future<void> _loadDepositWallet({bool force = false}) async {
    if (!force && _depositWallet != null) return;
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) {
      if (!mounted) return;
      setState(() {
        _walletLoadErr =
            'Sign in to generate your dedicated Base USDC deposit address.';
      });
      return;
    }

    setState(() {
      _loadingDepositWallet = true;
      _walletLoadErr = null;
    });
    try {
      final res = await ApiClient.get('/crossmint/wallet');
      if (!mounted) return;
      if (res is Map) {
        setState(() {
          _depositWallet = Map<String, dynamic>.from(res);
          _walletLoadErr = null;
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _walletLoadErr = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _walletLoadErr =
            'Could not load your Base USDC deposit address right now.';
      });
    } finally {
      if (mounted) setState(() => _loadingDepositWallet = false);
    }
  }

  Future<void> _syncDepositWallet() async {
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Sign in required to check deposits.',
            tone: ToastTone.error,
          );
      return;
    }

    setState(() {
      _syncingDepositWallet = true;
      _error = null;
    });
    try {
      final res = await ApiClient.post('/crossmint/wallet/sync');
      await _loadWalletData();
      if (!mounted) return;
      final credited = res is Map ? ((res['newlyCreditedCount'] as num?)?.toInt() ?? 0) : 0;
      final msg = res is Map && res['message'] != null
          ? res['message'].toString()
          : 'Deposit check completed.';
      ref.read(toastProvider.notifier).show(
            credited > 0 ? 'Base USDC deposit credited' : 'Blockchain check complete',
            body: msg,
            tone: credited > 0 ? ToastTone.success : ToastTone.info,
          );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _syncingDepositWallet = false);
    }
  }

  double? _parsedAmountUsdc() {
    final rawUsdc = _usdcCtrl.text.trim().replaceAll(',', '');
    final val = double.tryParse(rawUsdc);
    if (val != null && val > 0) return val;
    final rawKes = _kesCtrl.text.trim().replaceAll(',', '');
    final kes = double.tryParse(rawKes);
    if (kes != null && kes > 0) return AppConfig.kesToUsdc(kes);
    return null;
  }

  void _setAmountUsdc(double usdc) {
    _syncingConverter = true;
    _usdcCtrl.text = (usdc - usdc.roundToDouble()).abs() < 0.005
        ? usdc.round().toString()
        : usdc.toStringAsFixed(2);
    _kesCtrl.text = AppConfig.usdcToKes(usdc).toString();
    _syncingConverter = false;
    if (_amountErr != null) {
      setState(() => _amountErr = null);
    } else {
      setState(() {});
    }
  }

  void _onUsdcTextChanged(String text) {
    if (_syncingConverter) return;
    _syncingConverter = true;
    final parsed = double.tryParse(text.trim().replaceAll(',', ''));
    _kesCtrl.text =
        (parsed != null && parsed > 0) ? AppConfig.usdcToKes(parsed).toString() : '';
    _syncingConverter = false;
    if (_amountErr != null) {
      setState(() => _amountErr = null);
    } else {
      setState(() {});
    }
  }

  void _onKesTextChanged(String text) {
    if (_syncingConverter) return;
    _syncingConverter = true;
    final parsed = double.tryParse(text.trim().replaceAll(',', ''));
    if (parsed != null && parsed > 0) {
      final usdc = AppConfig.kesToUsdc(parsed);
      _usdcCtrl.text = (usdc - usdc.roundToDouble()).abs() < 0.005
          ? usdc.round().toString()
          : usdc.toStringAsFixed(2);
    } else {
      _usdcCtrl.text = '';
    }
    _syncingConverter = false;
    if (_amountErr != null) {
      setState(() => _amountErr = null);
    } else {
      setState(() {});
    }
  }

  Future<void> _handleDeposit(bool isMpesa) async {
    setState(() {
      _amountErr = null;
      _destErr = null;
      _error = null;
    });
    final amountUsdc = _parsedAmountUsdc();
    if (amountUsdc == null) {
      setState(() => _amountErr =
          'Enter how much you want to deposit in USDC (minimum USDC 5.00 / KES 650).');
      return;
    }

    final exactUsdc = ((amountUsdc * 100).roundToDouble()) / 100.0;
    final exactKes = AppConfig.usdcToKes(exactUsdc);

    if (exactUsdc < PaymentFeeSchedule.minDepositUsdc) {
      setState(() => _amountErr = isMpesa
          ? 'Minimum deposit is USDC 5.00 (KES ${PaymentFeeSchedule.mpesaMinDepositKes}). Enter USDC 5 or more.'
          : 'Minimum deposit is USDC ${PaymentFeeSchedule.crossmintMinDepositUsd.toStringAsFixed(2)}.');
      return;
    }

    if (isMpesa) {
      if (exactKes > PaymentFeeSchedule.mpesaMaxSingleDepositKes) {
        setState(() => _amountErr =
            'Maximum single M-PESA deposit is KES ${PaymentFeeSchedule.mpesaMaxSingleDepositKes} (~${AppConfig.formatUsdc(AppConfig.kesToUsdc(PaymentFeeSchedule.mpesaMaxSingleDepositKes))}). Try a smaller amount.');
        return;
      }
      if (_mpesaPhoneCtrl.text.trim().length < 9) {
        setState(() => _destErr =
            'Enter a valid M-PESA phone number (e.g. +254 712 345 678).');
        return;
      }
    } else {
      if (exactUsdc > PaymentFeeSchedule.crossmintMaxSingleDepositUsd) {
        setState(() => _amountErr =
            'Maximum single deposit is ${AppConfig.formatUsdc(PaymentFeeSchedule.crossmintMaxSingleDepositUsd)}.');
        return;
      }
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final session = ref.read(playerSessionProvider);
    final mpesaBreak = PaymentFeeSchedule.mpesaDepositBreakdown(exactKes);
    final cmBreak = PaymentFeeSchedule.crossmintDepositBreakdown(exactUsdc);

    try {
      if (session.accessToken != null && session.accessToken!.isNotEmpty) {
        if (!isMpesa) {
          final cmRes = await ApiClient.post('/crossmint/order', data: {
            'amount': exactUsdc,
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
            'amountUsdc': exactUsdc,
            'amountKes': exactKes,
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
      _syncingConverter = true;
      _usdcCtrl.clear();
      _kesCtrl.clear();
      _syncingConverter = false;
      ref.read(toastProvider.notifier).show(
            isMpesa ? 'M-PESA STK prompt sent' : 'Checkout opened',
            body: isMpesa
                ? 'Approve KES ${mpesaBreak.totalStkChargeKes} on ${_mpesaPhoneCtrl.text.trim()} (Credits ${AppConfig.formatUsdc(exactUsdc, alwaysDecimals: true)} + KES ${mpesaBreak.feeKes} fee)'
                : 'Total ${AppConfig.formatUsdc(cmBreak.totalCheckoutUsd, alwaysDecimals: true)} (${AppConfig.formatUsdc(cmBreak.netCreditUsd, alwaysDecimals: true)} credit + ${AppConfig.formatUsdc(cmBreak.feeUsd, alwaysDecimals: true)} fee)',
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
    setState(() {
      _amountErr = null;
      _destErr = null;
      _error = null;
    });
    final amountUsdc = _parsedAmountUsdc();
    if (amountUsdc == null) {
      setState(() => _amountErr =
          'Enter how much you want to withdraw in USDC (suggested: USDC 20+).');
      return;
    }

    final exactUsdc = ((amountUsdc * 100).roundToDouble()) / 100.0;
    final exactKes = AppConfig.usdcToKes(exactUsdc);

    if (isMpesa) {
      final minWithdrawKes = _expressPayout
          ? PaymentFeeSchedule.mpesaMinExpressWithdrawalKes
          : PaymentFeeSchedule.mpesaMinWithdrawalKes;
      final feeKes = PaymentFeeSchedule.mpesaFlatPayoutFeeKes +
          (_expressPayout
              ? PaymentFeeSchedule.mpesaExpressPrioritySurchargeKes
              : 0);
      if (exactKes < minWithdrawKes) {
        setState(() => _amountErr =
            'Minimum M-PESA ${_expressPayout ? 'Express VIP ' : ''}withdrawal is ${AppConfig.formatUsdc(AppConfig.kesToUsdc(minWithdrawKes), alwaysDecimals: true)} (KES $minWithdrawKes = KES ${PaymentFeeSchedule.mpesaMinNetPayoutKes} received + KES $feeKes fee).');
        return;
      }
      if (exactKes > PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes) {
        setState(() => _amountErr =
            'Maximum single M-PESA withdrawal is KES ${PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes} (~${AppConfig.formatUsdc(AppConfig.kesToUsdc(PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes))}). Try a smaller amount.');
        return;
      }
    } else {
      final minWithdrawUsd = _expressPayout
          ? PaymentFeeSchedule.crossmintMinWithdrawalUsd +
              PaymentFeeSchedule.crossmintExpressPrioritySurchargeUsd
          : PaymentFeeSchedule.crossmintMinWithdrawalUsd;
      if (exactUsdc < minWithdrawUsd) {
        setState(() => _amountErr =
            'Minimum withdrawal is ${AppConfig.formatUsdc(minWithdrawUsd, alwaysDecimals: true)}.');
        return;
      }
      if (exactUsdc > PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd) {
        setState(() => _amountErr =
            'Maximum single withdrawal is ${AppConfig.formatUsdc(PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd)}.');
        return;
      }
    }

    final session = ref.read(playerSessionProvider);
    if (exactUsdc > session.cashUsd + 0.001) {
      setState(() => _amountErr =
          'That amount is higher than your available cash balance (${AppConfig.formatUsdc(session.cashUsd, alwaysDecimals: true)}).');
      return;
    }

    final dest = isMpesa
        ? _mpesaPhoneCtrl.text.trim()
        : _walletAddrCtrl.text.trim();
    if (dest.isEmpty || (isMpesa && dest.length < 9)) {
      setState(() => _destErr = isMpesa
          ? 'Enter your M-PESA phone number (e.g. +254 712 345 678).'
          : 'Paste your Base / EVM wallet address starting with 0x.');
      return;
    }
    if (!isMpesa && !RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(dest)) {
      setState(() => _destErr =
          'Enter a valid Base / EVM USDC address starting with 0x (42 characters).');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final mpesaOut = PaymentFeeSchedule.mpesaWithdrawalBreakdown(
      exactKes,
      expressPayout: _expressPayout,
    );
    final cmOut = PaymentFeeSchedule.crossmintWithdrawalBreakdown(
      exactUsdc,
      expressPayout: _expressPayout,
    );

    try {
      if (session.accessToken != null && session.accessToken!.isNotEmpty) {
        if (isMpesa) {
          await ApiClient.post('/mpesa/payout', data: {
            'amountUsdc': exactUsdc,
            'amountKes': exactKes,
            'phone': dest,
            'userId': session.userId,
            'firstName': session.username,
            'email': session.email,
            'expressPayout': _expressPayout,
          });
        } else {
          await ApiClient.post('/wallet/payout', data: {
            'amount': exactUsdc,
            'method': {
              'type': 'CROSSMINT_USDC',
              'destinationAddress': dest,
              'chain': 'base',
              'expressPayout': _expressPayout,
            },
          });
        }
        await _loadWalletData();
      } else {
        throw const ApiException('Sign in required to withdraw funds.');
      }

      if (!mounted) return;
      _syncingConverter = true;
      _usdcCtrl.clear();
      _kesCtrl.clear();
      _syncingConverter = false;
      ref.read(toastProvider.notifier).show(
            'Withdrawal initiated',
            body: isMpesa
                ? 'KES ${mpesaOut.netToMpesaKes} net sent to $dest (${AppConfig.formatUsdc(exactUsdc, alwaysDecimals: true)} / KES ${mpesaOut.walletDeductionKes} - KES ${mpesaOut.feeKes} payout fee)'
                : '${AppConfig.formatUsdc(cmOut.netToWalletUsd, alwaysDecimals: true)} net sent to $dest (${AppConfig.formatUsdc(cmOut.feeUsd, alwaysDecimals: true)} payout fee)',
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
    final isMpesa = _useMpesaOverride ?? (gateway == PaymentGatewayMode.kopokopo);

    final formattedBalance =
        AppConfig.formatUsdc(session.cashUsd, alwaysDecimals: true);
    final kesEquivalent = AppConfig.usdcToKes(session.cashUsd);

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
                      SizedBox(
                        width: double.infinity,
                        child: Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 10,
                          runSpacing: 8,
                          children: [
                            isMpesa
                                ? const BrandLogo.kopokopo(height: 26)
                                : const BrandLogo.crossmint(height: 22),
                            HigBadge(
                              label: isMpesa
                                  ? 'M-PESA · USDC <-> KES'
                                  : 'BASE USDC · NO KYC',
                              tone: HigBadgeTone.emerald,
                            ),
                          ],
                        ),
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
                              const SizedBox(height: 2),
                              Text(
                                '≈ KES $kesEquivalent (1 USDC = KES ${AppConfig.usdToKesRate.round()})',
                                style: HigTypography.caption(
                                  color: HigColors.labelSecondary,
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
                  onChanged: (v) => setState(() {
                    _tab = v;
                    _amountErr = null;
                    _destErr = null;
                    _error = null;
                  }),
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
                        HigSegmentedControl<bool>(
                          backgroundColor: HigColors.surfaceGrouped,
                          groupValue: isMpesa,
                          onChanged: (val) {
                            setState(() {
                              _useMpesaOverride = val;
                              _amountErr = null;
                              _destErr = null;
                              _error = null;
                            });
                            if (!val && _tab == 0) {
                              _loadDepositWallet();
                            }
                          },
                          segments: const {
                            true: 'M-PESA (KES)',
                            false: 'USDC (Base)',
                          },
                        ),
                        const SizedBox(height: 14),
                        if (!isMpesa && _tab == 0) ...[
                          HigSegmentedControl<bool>(
                            backgroundColor: HigColors.surfaceGrouped,
                            groupValue: _useCardCheckout,
                            onChanged: (val) {
                              setState(() {
                                _useCardCheckout = val;
                                _amountErr = null;
                                _error = null;
                              });
                              if (!val) _loadDepositWallet();
                            },
                            segments: const {
                              false: 'Direct USDC (0% Fee)',
                              true: 'Card / Apple Pay',
                            },
                          ),
                          const SizedBox(height: 14),
                        ],
                        Text(
                          _tab == 0
                              ? (isMpesa
                                  ? 'Deposit USDC via M-PESA'
                                  : (_useCardCheckout
                                      ? 'Deposit USDC via Card / Apple Pay'
                                      : 'Deposit USDC Directly on Base'))
                              : (isMpesa
                                  ? 'Withdraw USDC to M-PESA'
                                  : 'Withdraw USDC on Base'),
                          style: HigTypography.title3(),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _tab == 0
                              ? (isMpesa
                                  ? 'Type in USDC or KES to convert live (1 USDC = KES ${AppConfig.usdToKesRate.round()}). Minimum deposit: USDC 5.00 (KES ${PaymentFeeSchedule.mpesaMinDepositKes}).'
                                  : (_useCardCheckout
                                      ? 'Card deposits incur 3.5% + USDC 0.30 checkout fees and require Crossmint business KYB activation.'
                                      : 'Send USDC (Base network) directly to your dedicated playverzus.xyz deposit address — 0% platform deposit fee, No KYC/KYB required.'))
                              : isMpesa
                                  ? 'Convert your USDC balance to KES for M-PESA payout. Every M-PESA payout has a fixed KES ${PaymentFeeSchedule.mpesaFlatPayoutFeeKes} fee — we suggest USDC 20+ for best value.'
                                  : 'Send USDC from your balance directly to any Base / EVM wallet (0x...). Flat USDC 1.00 network fee — we suggest USDC 20+ for best value.',
                          style: HigTypography.caption(),
                        ),
                        const SizedBox(height: 14),

                        // Quick Preset / Suggested Value Chips
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _tab == 0
                              ? [5.0, 10.0, 25.0, 50.0]
                                  .map(
                                    (u) => _presetAmountChip(
                                      label: u == 5.0
                                          ? 'USDC 5 (Min)'
                                          : AppConfig.formatUsdc(u),
                                      subLabel:
                                          'KES ${AppConfig.usdcToKes(u)}',
                                      selected: (_parsedAmountUsdc() ?? 0) == u,
                                      onTap: () => _setAmountUsdc(u),
                                    ),
                                  )
                                  .toList()
                              : [
                                  (
                                    usdc: 5.0,
                                    label: 'USDC 5 (Min)',
                                    sub: isMpesa ? '7.7% fee' : '20% fee',
                                    recommended: false,
                                  ),
                                  (
                                    usdc: 10.0,
                                    label: 'USDC 10',
                                    sub: isMpesa ? '3.8% fee' : '10% fee',
                                    recommended: false,
                                  ),
                                  (
                                    usdc: 20.0,
                                    label: 'USDC 20 · Best Value',
                                    sub: isMpesa ? '1.9% fee' : '5% fee',
                                    recommended: true,
                                  ),
                                  (
                                    usdc: 50.0,
                                    label: 'USDC 50 · Optimal',
                                    sub: isMpesa ? '0.8% fee' : '2% fee',
                                    recommended: true,
                                  ),
                                ]
                                  .map(
                                    (opt) => _presetAmountChip(
                                      label: opt.label,
                                      subLabel:
                                          'KES ${AppConfig.usdcToKes(opt.usdc)} · ${opt.sub}',
                                      highlighted: opt.recommended,
                                      selected:
                                          (_parsedAmountUsdc() ?? 0) == opt.usdc,
                                      onTap: () => _setAmountUsdc(opt.usdc),
                                    ),
                                  )
                                  .toList(),
                        ),
                        const SizedBox(height: 12),

                        // Two-Way Live USDC <-> KES Converter Inputs (+ Max button on Withdraw)
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final usdcField = HigTextField(
                              controller: _usdcCtrl,
                              placeholder: _tab == 0
                                  ? 'Amount in USDC (min 5.00)'
                                  : 'Amount in USDC (e.g. 20)',
                              prefixIcon: CupertinoIcons.money_dollar_circle,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              errorText: _amountErr,
                              onChanged: _onUsdcTextChanged,
                            );
                            final kesField = HigTextField(
                              controller: _kesCtrl,
                              placeholder: _tab == 0
                                  ? 'Converted KES (min 650)'
                                  : 'Converted KES (e.g. 2600)',
                              prefixIcon:
                                  CupertinoIcons.arrow_right_arrow_left_circle,
                              keyboardType: TextInputType.number,
                              onChanged: _onKesTextChanged,
                            );

                            if (constraints.maxWidth >= 560) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: usdcField),
                                  Padding(
                                    padding: const EdgeInsets.only(
                                        left: 8, right: 8, top: 14),
                                    child: Icon(
                                      CupertinoIcons.arrow_right_arrow_left,
                                      size: 16,
                                      color: HigColors.brandBright,
                                    ),
                                  ),
                                  Expanded(child: kesField),
                                  if (_tab == 1) ...[
                                    const SizedBox(width: 8),
                                    HigButton(
                                      label: 'Max',
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      onPressed: () =>
                                          _setAmountUsdc(session.cashUsd),
                                    ),
                                  ],
                                ],
                              );
                            }

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: usdcField),
                                    if (_tab == 1) ...[
                                      const SizedBox(width: 8),
                                      HigButton(
                                        label: 'Max',
                                        size: HigButtonSize.small,
                                        variant: HigButtonVariant.secondary,
                                        onPressed: () =>
                                            _setAmountUsdc(session.cashUsd),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 8),
                                kesField,
                              ],
                            );
                          },
                        ),

                        const SizedBox(height: 12),

                        if (_tab == 1) ...[
                          HigSegmentedControl<bool>(
                            backgroundColor: HigColors.surfaceGrouped,
                            groupValue: _expressPayout,
                            onChanged: (v) => setState(() => _expressPayout = v),
                            segments: {
                              false: isMpesa
                                  ? 'Standard Payout (KES 50 Fee)'
                                  : 'Standard (USDC 1.00 Fee)',
                              true: isMpesa
                                  ? 'Instant VIP (+KES 35 · Priority)'
                                  : 'Instant VIP (+USDC 0.50 · Priority)',
                            },
                          ),
                          const SizedBox(height: 12),
                        ],

                        // Live Upfront Customer-Paid Fee, Converter Summary & Withdrawal Suggestion Box
                        ValueListenableBuilder<TextEditingValue>(
                          valueListenable: _usdcCtrl,
                          builder: (_, value, __) => _buildLiveFeeBreakdownBox(
                            isMpesa,
                            _tab == 0,
                            value.text,
                          ),
                        ),

                        const SizedBox(height: 12),

                        if (isMpesa)
                          HigTextField(
                            controller: _mpesaPhoneCtrl,
                            placeholder: 'M-PESA number (+2547...)',
                            prefixIcon: CupertinoIcons.phone,
                            keyboardType: TextInputType.phone,
                            errorText: _destErr,
                            onChanged: (_) {
                              if (_destErr != null) {
                                setState(() => _destErr = null);
                              }
                            },
                          )
                        else if (_tab == 1)
                          HigTextField(
                            controller: _walletAddrCtrl,
                            placeholder: 'Base / EVM USDC address (0x...)',
                            prefixIcon: CupertinoIcons.creditcard,
                            errorText: _destErr,
                            onChanged: (_) {
                              if (_destErr != null) {
                                setState(() => _destErr = null);
                              }
                            },
                          )
                        else if (_tab == 0 && !_useCardCheckout)
                          _buildDirectUsdcDepositPanel(
                            session.accessToken != null &&
                                session.accessToken!.isNotEmpty,
                          ),

                        if (isMpesa || _tab == 1 || _useCardCheckout) ...[
                          const SizedBox(height: 16),
                          HigButton(
                            label: _tab == 0
                                ? (isMpesa
                                    ? 'Deposit via M-PESA'
                                    : 'Continue to Card Checkout')
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
                        ],
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
                                  'M-PESA Status: ${(_pendingStkStatus == 'STK_PUSH_SENT' || _pendingStkStatus == null) ? 'Waiting for your M-PESA PIN on your phone' : _pendingStkStatus!}',
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
                            : '${positive ? '+' : '-'}${AppConfig.formatUsdc(amt.abs(), alwaysDecimals: true)}';

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

  Widget _presetAmountChip({
    required String label,
    required String subLabel,
    required VoidCallback onTap,
    bool highlighted = false,
    bool selected = false,
  }) {
    final borderColor = selected
        ? HigColors.emerald
        : highlighted
            ? HigColors.emerald.withValues(alpha: 0.55)
            : HigColors.separator;
    final bgColor = selected
        ? HigColors.emerald.withValues(alpha: 0.16)
        : highlighted
            ? HigColors.emerald.withValues(alpha: 0.08)
            : HigColors.surfaceElevated;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: borderColor, width: selected ? 1.4 : 0.9),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: HigTypography.mono(
                size: 11.5,
                weight: FontWeight.w700,
                color: selected || highlighted
                    ? HigColors.emerald
                    : HigColors.labelPrimary,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              subLabel,
              style: HigTypography.caption(
                color: HigColors.labelSecondary,
              ).copyWith(fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveFeeBreakdownBox(
    bool isMpesa,
    bool isDeposit,
    String rawUsdcText,
  ) {
    final parsed =
        double.tryParse(rawUsdcText.trim().replaceAll(',', '')) ?? 0.0;
    final hasTyped = parsed > 0;

    if (isMpesa && isDeposit) {
      final previewUsdc = hasTyped ? parsed : PaymentFeeSchedule.minDepositUsdc;
      final kes = AppConfig.usdcToKes(previewUsdc);
      final b = PaymentFeeSchedule.mpesaDepositBreakdown(kes);
      final feeUsdc = AppConfig.kesToUsdc(b.feeKes);
      final totalUsdc = AppConfig.kesToUsdc(b.totalStkChargeKes);
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
            if (!hasTyped)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  'FEE PREVIEW FOR MINIMUM DEPOSIT (USDC 5.00 = KES 650)',
                  style: HigTypography.caption(color: HigColors.brandBright)
                      .copyWith(fontWeight: FontWeight.w700, fontSize: 10.5),
                ),
              ),
            _feeLine(
              'Credited to playverzus.xyz Wallet',
              '${AppConfig.formatUsdc(previewUsdc, alwaysDecimals: true)} (KES ${b.netCreditKes})',
              HigColors.labelPrimary,
            ),
            const SizedBox(height: 5),
            _feeLine(
              'M-PESA Deposit Fee (0.55% · max KES 200)',
              b.feeKes == 0
                  ? 'KES 0'
                  : '+KES ${b.feeKes} (~${AppConfig.formatUsdc(feeUsdc, alwaysDecimals: true)})',
              HigColors.labelSecondary,
            ),
            const Divider(height: 14),
            _feeLine(
              'Total You Approve on M-PESA STK',
              'KES ${b.totalStkChargeKes} (~${AppConfig.formatUsdc(totalUsdc, alwaysDecimals: true)})',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              'Minimum deposit: USDC 5.00 (KES ${PaymentFeeSchedule.mpesaMinDepositKes}) · Max KES ${PaymentFeeSchedule.mpesaMaxSingleDepositKes} / transaction.',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    if (isMpesa && !isDeposit) {
      final previewUsdc = hasTyped
          ? parsed
          : PaymentFeeSchedule.mpesaRecommendedBestWithdrawalUsdc;
      final kes = AppConfig.usdcToKes(previewUsdc);
      final b = PaymentFeeSchedule.mpesaWithdrawalBreakdown(
        kes,
        expressPayout: _expressPayout,
      );
      final feeUsdc = AppConfig.kesToUsdc(b.feeKes);
      final netUsdc = AppConfig.kesToUsdc(b.netToMpesaKes);
      final feePct = PaymentFeeSchedule.mpesaWithdrawalFeePercent(
        kes,
        expressPayout: _expressPayout,
      );
      final isEfficient = previewUsdc >= 20.0;
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
            if (!hasTyped)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  'SUGGESTED BEST WITHDRAWAL PREVIEW (USDC 20.00 = KES 2,600)',
                  style: HigTypography.caption(color: HigColors.emerald)
                      .copyWith(fontWeight: FontWeight.w700, fontSize: 10.5),
                ),
              ),
            _feeLine(
              'Withdrawn from Wallet',
              '${AppConfig.formatUsdc(previewUsdc, alwaysDecimals: true)} (KES ${b.walletDeductionKes})',
              HigColors.labelPrimary,
            ),
            const SizedBox(height: 5),
            _feeLine(
              _expressPayout
                  ? 'Fixed M-PESA Fee (KES 50) + VIP Instant (KES 35)'
                  : 'Fixed M-PESA Payout Fee (${feePct.toStringAsFixed(1)}% of cashout)',
              '-KES ${b.feeKes} (~${AppConfig.formatUsdc(feeUsdc, alwaysDecimals: true)})',
              HigColors.amber,
            ),
            const Divider(height: 14),
            _feeLine(
              'Exact Net Disbursed to Your M-PESA',
              'KES ${b.netToMpesaKes} (~${AppConfig.formatUsdc(netUsdc, alwaysDecimals: true)})',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isEfficient ? HigColors.emerald : HigColors.copper)
                    .withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: (isEfficient ? HigColors.emerald : HigColors.copper)
                      .withValues(alpha: 0.40),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isEfficient
                        ? CupertinoIcons.checkmark_seal_fill
                        : CupertinoIcons.lightbulb_fill,
                    size: 16,
                    color: isEfficient ? HigColors.emerald : HigColors.copper,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isEfficient
                          ? 'Best value withdrawal (${feePct.toStringAsFixed(1)}% fee impact): Safaricom charges a fixed KES ${PaymentFeeSchedule.mpesaFlatPayoutFeeKes} (~USDC 0.38) fee per payout, so withdrawing USDC 20+ lets you keep ${(100 - feePct).clamp(0, 100).toStringAsFixed(1)}% of your money.'
                          : 'Understanding the KES 50 withdrawal fee: Every M-PESA withdrawal carries a fixed KES ${PaymentFeeSchedule.mpesaFlatPayoutFeeKes} (~USDC 0.38) network fee regardless of size. At ${AppConfig.formatUsdc(previewUsdc, alwaysDecimals: true)} (KES $kes), KES 50 takes ${feePct.toStringAsFixed(1)}% of your payout. Suggested best withdrawal: USDC 20+ (KES 2,600+), where the KES 50 fee drops under 2%!',
                      style: HigTypography.caption(
                        color: HigColors.labelPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Limits: Min ${_expressPayout ? 'USDC 5.27 (KES ${PaymentFeeSchedule.mpesaMinExpressWithdrawalKes})' : 'USDC 5.00 (KES ${PaymentFeeSchedule.mpesaMinWithdrawalKes})'} · Max KES ${PaymentFeeSchedule.mpesaMaxSingleWithdrawalKes}/tx · Daily Limit KES ${PaymentFeeSchedule.mpesaMaxDailyWithdrawalKes} (max ${PaymentFeeSchedule.mpesaMaxDailyWithdrawalCount}/day).',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    if (!isMpesa && isDeposit) {
      final usd = hasTyped ? parsed : PaymentFeeSchedule.crossmintMinDepositUsd;
      if (!_useCardCheckout) {
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
              _feeLine(
                'Credited to playverzus.xyz Wallet',
                '${AppConfig.formatUsdc(usd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(usd)})',
                HigColors.labelPrimary,
              ),
              const SizedBox(height: 5),
              _feeLine(
                'Platform Deposit Fee (Direct Base USDC)',
                'USDC 0.00 (0%)',
                HigColors.emerald,
              ),
              const Divider(height: 14),
              _feeLine(
                'Net You Receive',
                '${AppConfig.formatUsdc(usd, alwaysDecimals: true)} (100%)',
                HigColors.emerald,
                bold: true,
              ),
              const SizedBox(height: 6),
              Text(
                'Minimum deposit: USDC ${PaymentFeeSchedule.crossmintMinDepositUsd.toStringAsFixed(2)} (KES ${AppConfig.usdcToKes(PaymentFeeSchedule.crossmintMinDepositUsd)}) · Send USDC on Base only.',
                style: HigTypography.caption(),
              ),
            ],
          ),
        );
      }

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
            _feeLine(
              'Wallet Credit (Net)',
              '${AppConfig.formatUsdc(b.netCreditUsd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(b.netCreditUsd)})',
              HigColors.labelPrimary,
            ),
            const SizedBox(height: 5),
            _feeLine(
              'Card Processing Fee (3.5% + USDC 0.30, min 0.50)',
              '+${AppConfig.formatUsdc(b.feeUsd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(b.feeUsd)})',
              HigColors.labelSecondary,
            ),
            const Divider(height: 14),
            _feeLine(
              'Total Checkout Charge',
              '${AppConfig.formatUsdc(b.totalCheckoutUsd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(b.totalCheckoutUsd)})',
              HigColors.emerald,
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              'Minimum deposit: USDC ${PaymentFeeSchedule.crossmintMinDepositUsd.toStringAsFixed(2)} (KES ${AppConfig.usdcToKes(PaymentFeeSchedule.crossmintMinDepositUsd)}) · Max USDC ${PaymentFeeSchedule.crossmintMaxSingleDepositUsd.toStringAsFixed(0)} / transaction.',
              style: HigTypography.caption(),
            ),
          ],
        ),
      );
    }

    final usd = hasTyped
        ? parsed
        : PaymentFeeSchedule.mpesaRecommendedBestWithdrawalUsdc;
    final b = PaymentFeeSchedule.crossmintWithdrawalBreakdown(
      usd,
      expressPayout: _expressPayout,
    );
    final pct = usd > 0 ? (b.feeUsd / usd) * 100.0 : 0.0;
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
          _feeLine(
            'Wallet Deduction',
            '${AppConfig.formatUsdc(b.walletDeductionUsd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(b.walletDeductionUsd)})',
            HigColors.labelPrimary,
          ),
          const SizedBox(height: 5),
          _feeLine(
            _expressPayout
                ? 'On-Chain Payout + Instant VIP Fee (${pct.toStringAsFixed(1)}%)'
                : 'On-Chain Payout Fee (${pct.toStringAsFixed(1)}% · Flat)',
            '-${AppConfig.formatUsdc(b.feeUsd, alwaysDecimals: true)}',
            HigColors.labelSecondary,
          ),
          const Divider(height: 14),
          _feeLine(
            'Net Disbursed to Your Wallet',
            '${AppConfig.formatUsdc(b.netToWalletUsd, alwaysDecimals: true)} (≈ KES ${AppConfig.usdcToKes(b.netToWalletUsd)})',
            HigColors.emerald,
            bold: true,
          ),
          const SizedBox(height: 6),
          Text(
            'Tip: Because on-chain & mobile payout fees are fixed per transfer, withdrawing USDC 20+ keeps over 95% of your cashout. Min USDC ${PaymentFeeSchedule.crossmintMinWithdrawalUsd.toStringAsFixed(2)} · Max USDC ${PaymentFeeSchedule.crossmintMaxSingleWithdrawalUsd.toStringAsFixed(0)}/tx.',
            style: HigTypography.caption(),
          ),
        ],
      ),
    );
  }

  Widget _buildDirectUsdcDepositPanel(bool isSignedIn) {
    final address = (_depositWallet?['address'] ?? '').toString().trim();
    final netLabel =
        (_depositWallet?['networkLabel'] ?? 'Base Mainnet (USDC)').toString();
    final contract = (_depositWallet?['tokenContract'] ?? '').toString();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HigColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HigColors.emerald.withValues(alpha: 0.40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
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
                  Icon(
                    CupertinoIcons.link_circle_fill,
                    size: 16,
                    color: HigColors.emerald,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      netLabel,
                      style: HigTypography.headline().copyWith(fontSize: 13.5),
                    ),
                  ),
                ],
              ),
              const HigBadge(
                label: 'NO KYC / NO KYB · 0% FEE',
                tone: HigBadgeTone.emerald,
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (!isSignedIn)
            HigErrorBanner(
              message:
                  'Sign in to generate your dedicated Base USDC deposit address.',
            )
          else if (_loadingDepositWallet)
            const HigLoadingCard(
              message: 'Loading Base USDC address...',
            )
          else if (_walletLoadErr != null)
            HigErrorBanner(
              message: _walletLoadErr!,
              onRetry: () => _loadDepositWallet(force: true),
            )
          else if (address.isEmpty)
            HigButton(
              label: 'Load My Base USDC Deposit Address',
              icon: CupertinoIcons.qrcode,
              size: HigButtonSize.medium,
              variant: HigButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => _loadDepositWallet(force: true),
            )
          else ...[
            Text(
              'YOUR DEDICATED BASE DEPOSIT ADDRESS',
              style: HigTypography.caption(color: HigColors.labelSecondary)
                  .copyWith(fontWeight: FontWeight.w700, fontSize: 10.5),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: HigColors.canvas,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: HigColors.separator),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: SelectableText(
                      address,
                      style: HigTypography.mono(
                        size: 12,
                        color: HigColors.labelPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  HigButton(
                    label: _copiedDepositAddr ? 'Copied' : 'Copy',
                    icon: _copiedDepositAddr
                        ? CupertinoIcons.checkmark
                        : CupertinoIcons.doc_on_doc,
                    size: HigButtonSize.small,
                    variant: _copiedDepositAddr
                        ? HigButtonVariant.primary
                        : HigButtonVariant.secondary,
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: address));
                      if (!mounted) return;
                      setState(() => _copiedDepositAddr = true);
                      ref.read(toastProvider.notifier).show(
                            'Base deposit address copied',
                            body: 'Send >= 5.00 USDC on Base network.',
                            tone: ToastTone.success,
                          );
                      _copyResetTimer?.cancel();
                      _copyResetTimer = Timer(const Duration(seconds: 3), () {
                        if (mounted) {
                          setState(() => _copiedDepositAddr = false);
                        }
                      });
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '1. Send at least 5.00 USDC on Base network (do not send on unsupported chains).\n'
              '2. Your balance credits automatically once confirmed on Base (~10–30 sec).\n'
              '3. Tap below anytime to check for incoming transfers immediately.',
              style: HigTypography.caption(color: HigColors.labelSecondary),
            ),
            if (contract.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'USDC Contract (Base): $contract',
                style: HigTypography.mono(
                  size: 10,
                  color: HigColors.labelTertiary,
                ),
              ),
            ],
            const SizedBox(height: 12),
            HigButton(
              label: "I've Sent USDC — Check Deposit",
              icon: CupertinoIcons.refresh,
              size: HigButtonSize.large,
              fullWidth: true,
              loading: _syncingDepositWallet,
              onPressed: _syncDepositWallet,
            ),
          ],
        ],
      ),
    );
  }

  Widget _feeLine(String label, String value, Color valueColor,
      {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 3,
          child: Text(
            label,
            style: HigTypography.caption(
              color: bold ? HigColors.labelPrimary : HigColors.labelSecondary,
            ).copyWith(fontWeight: bold ? FontWeight.w700 : FontWeight.w500),
          ),
        ),
        const SizedBox(width: 10),
        Flexible(
          flex: 3,
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: HigTypography.mono(
              size: bold ? 13 : 11.5,
              color: valueColor,
            ).copyWith(fontWeight: bold ? FontWeight.w800 : FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
