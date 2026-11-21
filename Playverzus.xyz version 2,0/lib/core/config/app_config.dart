import 'package:flutter/foundation.dart';

/// Centralized runtime configuration for Playverzus.xyz Version 2.0.
/// Uses same-origin `/api` proxy on localhost web previews (eliminating CORS),
/// and connects directly to the live Playverzus NestJS API on production & native builds.
class AppConfig {
  static const String _envApiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    if (_envApiUrl.isNotEmpty) return _envApiUrl;
    if (kIsWeb) {
      return '${Uri.base.origin}/api';
    }
    return 'https://playverzus-api.onrender.com/api';
  }

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://ydpkvsqaadfjukdncqyo.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_qfbO3Rpl_Q6k75a-v3cHiA_l7_H8hQ1',
  );

  /// Direct download URLs served from Flutter Web (`web/downloads/...`) or CDN.
  static const String androidApkDownloadUrl = String.fromEnvironment(
    'ANDROID_APK_URL',
    defaultValue: 'downloads/playverzus-v2-android.apk',
  );

  static const String windowsInstallerUrl = String.fromEnvironment(
    'WINDOWS_INSTALLER_URL',
    defaultValue: 'downloads/playverzus-v2-windows-setup.exe',
  );

  static const String macosDmgUrl = String.fromEnvironment(
    'MACOS_DMG_URL',
    defaultValue: 'downloads/playverzus-v2-macos.dmg',
  );

  static const String iosTestFlightUrl = String.fromEnvironment(
    'IOS_APP_URL',
    defaultValue: 'https://testflight.apple.com/join/playverzus',
  );

  static const String appVersion = '2.0.0';
  static const double usdToKesRate = 130.0;
}

/// Upfront Customer-Paid Gateway Fee & Threshold Schedule.
/// Ensures Playverzus NEVER goes into the negative on deposits or withdrawals,
/// keeping 100% of its 10% competitive match & tournament rake intact.
class PaymentFeeSchedule {
  // ── 1. M-PESA (Kopo Kopo Buy Goods & Move Money / PAY) Thresholds (KES) ──
  static const int mpesaMinDepositKes = 100;
  static const int mpesaMaxSingleDepositKes = 250000; // Safaricom CBK single-tx cap
  static const int mpesaFreeDepositTierCapKes = 200; // Conservative 0-fee floor
  static const double mpesaBuyGoodsFeeRate = 0.0055; // 0.55% Kopo Kopo Buy Goods tariff
  static const int mpesaBuyGoodsMaxFeeKes = 200; // Capped at KES 200 above KES 36,365

  static const int mpesaFlatPayoutFeeKes = 50; // Kopo Kopo Move Money / PAY flat fee
  static const int mpesaMinNetPayoutKes = 100; // Minimum net sent to M-PESA phone
  static const int mpesaMinWithdrawalKes =
      mpesaMinNetPayoutKes + mpesaFlatPayoutFeeKes; // KES 150 total deduction
  static const int mpesaMaxSingleWithdrawalKes = 70000;
  static const int mpesaMaxDailyWithdrawalKes = 150000;
  static const int mpesaMaxDailyWithdrawalCount = 3;

  // ── 2. Crossmint (Global Card / Apple Pay / Google Pay / USDC) Thresholds (USD) ──
  static const double crossmintMinDepositUsd = 2.00;
  static const double crossmintMaxSingleDepositUsd = 2000.00;
  static const double crossmintCardFeeRate = 0.035; // 3.5% + $0.30 (min $0.50)
  static const double crossmintCardFixedFeeUsd = 0.30;
  static const double crossmintMinDepositFeeUsd = 0.50;

  static const double crossmintFlatPayoutFeeUsd = 1.00;
  static const double crossmintMinWithdrawalUsd = 5.00; // $4.00 net + $1.00 fee
  static const double crossmintMaxSingleWithdrawalUsd = 1000.00;
  static const double crossmintMaxDailyWithdrawalUsd = 2500.00;
  static const int crossmintMaxDailyWithdrawalCount = 3;

  /// Computes upfront customer-paid Kopo Kopo Buy Goods fee for a desired wallet credit in KES.
  static int computeMpesaDepositFeeKes(int desiredCreditKes) {
    if (desiredCreditKes <= 0) return 0;
    if (desiredCreditKes <= mpesaFreeDepositTierCapKes) return 0;
    // Gross-up so that after Kopo Kopo takes 0.55% of totalCharge, Playverzus nets >= desiredCreditKes
    final grossed = (desiredCreditKes / (1.0 - mpesaBuyGoodsFeeRate)).ceil();
    final rawFee = grossed - desiredCreditKes;
    return rawFee.clamp(1, mpesaBuyGoodsMaxFeeKes);
  }

  /// Full M-PESA deposit breakdown: customer receives `netCreditKes` in wallet,
  /// and STK push prompts for `totalStkChargeKes = netCreditKes + feeKes`.
  static ({int netCreditKes, int feeKes, int totalStkChargeKes})
      mpesaDepositBreakdown(int desiredCreditKes) {
    final fee = computeMpesaDepositFeeKes(desiredCreditKes);
    return (
      netCreditKes: desiredCreditKes,
      feeKes: fee,
      totalStkChargeKes: desiredCreditKes + fee,
    );
  }

  /// Full M-PESA withdrawal breakdown: `walletDeductionKes` is deducted from the
  /// player's wallet, `feeKes` (KES 50) covers Kopo Kopo's flat Move Money tariff,
  /// and `netToMpesaKes` is disbursed to the player's phone.
  static ({int walletDeductionKes, int feeKes, int netToMpesaKes})
      mpesaWithdrawalBreakdown(int requestedWithdrawalKes) {
    final fee = requestedWithdrawalKes > 0 ? mpesaFlatPayoutFeeKes : 0;
    final net = (requestedWithdrawalKes - fee).clamp(0, requestedWithdrawalKes);
    return (
      walletDeductionKes: requestedWithdrawalKes,
      feeKes: fee,
      netToMpesaKes: net,
    );
  }

  /// Full Crossmint deposit breakdown: customer receives `netCreditUsd` in wallet,
  /// and pays `totalCheckoutUsd = netCreditUsd + feeUsd` at checkout.
  static ({double netCreditUsd, double feeUsd, double totalCheckoutUsd})
      crossmintDepositBreakdown(double desiredCreditUsd) {
    if (desiredCreditUsd <= 0) {
      return (netCreditUsd: 0, feeUsd: 0, totalCheckoutUsd: 0);
    }
    final rawFee =
        (desiredCreditUsd * crossmintCardFeeRate) + crossmintCardFixedFeeUsd;
    final fee = ((rawFee < crossmintMinDepositFeeUsd
                ? crossmintMinDepositFeeUsd
                : rawFee) *
            100)
        .ceilToDouble() /
        100.0;
    final total = ((desiredCreditUsd + fee) * 100).roundToDouble() / 100.0;
    return (
      netCreditUsd: desiredCreditUsd,
      feeUsd: fee,
      totalCheckoutUsd: total,
    );
  }

  /// Full Crossmint withdrawal breakdown: `walletDeductionUsd` is deducted from wallet,
  /// `feeUsd` ($1.00) covers payout overhead, and `netToWalletUsd` is sent on-chain.
  static ({double walletDeductionUsd, double feeUsd, double netToWalletUsd})
      crossmintWithdrawalBreakdown(double requestedWithdrawalUsd) {
    final fee = requestedWithdrawalUsd > 0 ? crossmintFlatPayoutFeeUsd : 0.0;
    final net = ((requestedWithdrawalUsd - fee).clamp(0.0, requestedWithdrawalUsd) *
            100)
        .roundToDouble() /
        100.0;
    return (
      walletDeductionUsd: requestedWithdrawalUsd,
      feeUsd: fee,
      netToWalletUsd: net,
    );
  }
}
