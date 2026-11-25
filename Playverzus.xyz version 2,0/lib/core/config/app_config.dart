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

  static const String appVersion = '2.0.5';
  static const int appBuildNumber = 6;
  static const double usdToKesRate = 130.0;

  /// Canonical platform currency formatter: always renders USDC cleanly.
  static String formatUsdc(double amount, {bool alwaysDecimals = false}) {
    if (!alwaysDecimals && (amount - amount.roundToDouble()).abs() < 0.005) {
      return 'USDC ${amount.round()}';
    }
    return 'USDC ${amount.toStringAsFixed(2)}';
  }

  /// Rounds a USDC value converted to local KES (for M-PESA settlement & converter preview).
  static int usdcToKes(double usdc) => (usdc * usdToKesRate).round();

  /// Converts a local KES value back to USDC (rounded cleanly to 2 decimals).
  static double kesToUsdc(num kes) =>
      ((kes / usdToKesRate) * 100).roundToDouble() / 100.0;
}

/// Upfront Customer-Paid Gateway Fee & Threshold Schedule.
/// Ensures Playverzus NEVER goes into the negative on deposits or withdrawals,
/// keeping 100% of its competitive match & tournament rake intact.
class PaymentFeeSchedule {
  // ── 1. M-PESA (Kopo Kopo Buy Goods & Move Money / PAY) Thresholds (KES) ──
  static const double minDepositUsdc = 5.00;
  static const int mpesaMinDepositKes = 650; // USDC 5.00 @ 130 KES/USDC
  static const int mpesaMaxSingleDepositKes = 250000; // Safaricom CBK single-tx cap
  static const int mpesaFreeDepositTierCapKes = 200; // Legacy band guard
  static const double mpesaBuyGoodsFeeRate = 0.0055; // 0.55% Kopo Kopo Buy Goods tariff
  static const int mpesaBuyGoodsMaxFeeKes = 200; // Capped at KES 200 above KES 36,365

  static const int mpesaFlatPayoutFeeKes = 50; // Kopo Kopo Move Money / PAY flat fee
  static const int mpesaExpressPrioritySurchargeKes =
      35; // Optional Instant VIP Payout pure profit surcharge (Total KES 85)
  static const int mpesaMinNetPayoutKes = 600; // Minimum net sent to M-PESA phone (USDC 5 gross - KES 50 fee)
  static const int mpesaMinWithdrawalKes =
      mpesaMinNetPayoutKes + mpesaFlatPayoutFeeKes; // KES 650 total deduction (USDC 5.00)
  static const int mpesaMinExpressWithdrawalKes =
      mpesaMinNetPayoutKes +
      mpesaFlatPayoutFeeKes +
      mpesaExpressPrioritySurchargeKes; // KES 685 total deduction
  static const double mpesaRecommendedBestWithdrawalUsdc = 20.0; // KES 2,600 (<2% fee impact)
  static const int mpesaMaxSingleWithdrawalKes = 70000;
  static const int mpesaMaxDailyWithdrawalKes = 150000;
  static const int mpesaMaxDailyWithdrawalCount = 3;

  // ── 2. Crossmint (Global Card / Apple Pay / Google Pay / USDC) Thresholds (USDC) ──
  static const double crossmintMinDepositUsd = 5.00;
  static const double crossmintMaxSingleDepositUsd = 2000.00;
  static const double crossmintCardFeeRate = 0.035; // 3.5% + $0.30 (min $0.50)
  static const double crossmintCardFixedFeeUsd = 0.30;
  static const double crossmintMinDepositFeeUsd = 0.50;

  static const double crossmintFlatPayoutFeeUsd = 1.00;
  static const double crossmintExpressPrioritySurchargeUsd =
      0.50; // Optional Instant VIP pure profit ($1.50 total)
  static const double crossmintMinWithdrawalUsd = 5.00; // $4.00 net + $1.00 fee
  static const double crossmintMaxSingleWithdrawalUsd = 1000.00;
  static const double crossmintMaxDailyWithdrawalUsd = 2500.00;
  static const int crossmintMaxDailyWithdrawalCount = 3;

  /// Effective percentage of a withdrawal eaten by the fixed M-PESA payout fee.
  static double mpesaWithdrawalFeePercent(int grossKes,
      {bool expressPayout = false}) {
    if (grossKes <= 0) return 0.0;
    final fee = mpesaFlatPayoutFeeKes +
        (expressPayout ? mpesaExpressPrioritySurchargeKes : 0);
    return (fee / grossKes) * 100.0;
  }

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
  /// player's wallet, `feeKes` (KES 50 Standard or KES 85 Express VIP) covers
  /// Kopo Kopo's flat Move Money tariff (+ KES 35 company margin on Express),
  /// and `netToMpesaKes` is disbursed to the player's phone.
  static ({int walletDeductionKes, int feeKes, int profitKes, int netToMpesaKes})
      mpesaWithdrawalBreakdown(int requestedWithdrawalKes,
          {bool expressPayout = false}) {
    final base = requestedWithdrawalKes > 0 ? mpesaFlatPayoutFeeKes : 0;
    final surcharge = (requestedWithdrawalKes > 0 && expressPayout)
        ? mpesaExpressPrioritySurchargeKes
        : 0;
    final fee = base + surcharge;
    final net = (requestedWithdrawalKes - fee).clamp(0, requestedWithdrawalKes);
    return (
      walletDeductionKes: requestedWithdrawalKes,
      feeKes: fee,
      profitKes: surcharge,
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
  /// `feeUsd` ($1.00 Standard or $1.50 Express VIP) covers payout overhead (+$0.50 profit),
  /// and `netToWalletUsd` is sent on-chain.
  static ({
    double walletDeductionUsd,
    double feeUsd,
    double profitUsd,
    double netToWalletUsd
  }) crossmintWithdrawalBreakdown(double requestedWithdrawalUsd,
      {bool expressPayout = false}) {
    final base = requestedWithdrawalUsd > 0 ? crossmintFlatPayoutFeeUsd : 0.0;
    final surcharge = (requestedWithdrawalUsd > 0 && expressPayout)
        ? crossmintExpressPrioritySurchargeUsd
        : 0.0;
    final fee = base + surcharge;
    final net = ((requestedWithdrawalUsd - fee).clamp(0.0, requestedWithdrawalUsd) *
            100)
        .roundToDouble() /
        100.0;
    return (
      walletDeductionUsd: requestedWithdrawalUsd,
      feeUsd: fee,
      profitUsd: surcharge,
      netToWalletUsd: net,
    );
  }
}

/// Complete 8-Stream Playverzus Commercial & Unit Economics Model.
class PlatformRevenueStreams {
  static const int arenaProPassMonthlyKes = 499;
  static const double arenaProPassMonthlyUsd = 3.99;
  static const int seasonBattlePassKes = 999;
  static const int gamingLoungeMonthlyLicenseKes = 2500;
  static const int studioFeaturedSlotMonthlyKes = 25000;
  static const double sponsorProductionFeePercent = 20.0;
  static const String revenueModelPdfPath =
      'downloads/playverzus-v2-revenue-model.pdf';
}

/// Differentiated Platform Rake & 2-Tier Field Agent Commission Schedule.
/// Guarantees Playverzus locks the first 80%+ of all collected rake for
/// Cost of Production, Server/API Infrastructure & Company Net Profit
/// before allocating Direct Agent & Lead Agent Wing Override commissions.
class PlatformRakeSchedule {
  /// 1v1 & Squad Duels:
  /// - Starter Duels (≤ $5.00 / KES 650 stake): 15.0% of Total Pot (Winner gets 85.0%)
  /// - Standard & Pro Duels (> $5.00 / KES 650 stake): 12.5% of Total Pot (Winner gets 87.5%)
  static double duelRakeRate(double stakeUsdPerPlayer) {
    if (stakeUsdPerPlayer <= 0) return 0.0;
    return stakeUsdPerPlayer <= 5.0 ? 0.15 : 0.125;
  }

  static double duelWinnerPayoutUsd(double stakeUsdPerPlayer) {
    if (stakeUsdPerPlayer <= 0) return 0.0;
    final totalPot = stakeUsdPerPlayer * 2.0;
    final rake = duelRakeRate(stakeUsdPerPlayer);
    return ((totalPot * (1.0 - rake)) * 100).roundToDouble() / 100.0;
  }

  /// 5-Player Blitz Sit & Go Pools (Tiered 16% -> 22% Rake):
  /// - Tier 1 ($2.50 / KES 325): 16.0% Rake (84.0% Prize Pool)
  /// - Tier 2 ($5.00 / KES 650): 18.0% Rake (82.0% Prize Pool)
  /// - Tier 3 ($10.00 / KES 1,300): 20.0% Rake (80.0% Prize Pool)
  /// - Tier 4 ($25.00 / KES 3,250): 20.0% Rake (80.0% Prize Pool)
  /// - Tier 5 ($50.00 / KES 6,500): 22.0% Rake (78.0% Prize Pool)
  static double blitzRakeRate(int tier) {
    return switch (tier) {
      1 => 0.16,
      2 => 0.18,
      3 => 0.20,
      4 => 0.20,
      _ => 0.22,
    };
  }

  /// Multi-Bracket Tournaments & Championships (8–64 Players): 20.0% Rake (80.0% Prize Pool)
  static const double tournamentCupRakeRate = 0.20;

  /// Company Cost-of-Production Protection Split:
  /// - Organic Player (No Agent): Playverzus keeps 100% of collected rake.
  /// - Direct Lead Agent Player: Playverzus keeps 82% of rake; Lead Agent gets 18% of rake.
  /// - Sub-Agent Player (Under a Lead Agent's Wing): Playverzus keeps 80% of rake;
  ///   Sub-Agent gets 15% of rake; Lead Agent gets 5% wing override.
  static ({
    int totalRakeKes,
    int companyProductionAndProfitKes,
    int directAgentCommissionKes,
    int leadAgentWingOverrideKes,
  }) splitMatchRakeKes({
    required int totalPotKes,
    required double rakeRate,
    required bool hasAgent,
    required bool isSubAgentUnderWing,
  }) {
    final totalRake = (totalPotKes * rakeRate).round();
    if (!hasAgent) {
      return (
        totalRakeKes: totalRake,
        companyProductionAndProfitKes: totalRake,
        directAgentCommissionKes: 0,
        leadAgentWingOverrideKes: 0,
      );
    }
    if (isSubAgentUnderWing) {
      final direct = (totalRake * 0.15).round();
      final override = (totalRake * 0.05).round();
      final company = totalRake - direct - override;
      return (
        totalRakeKes: totalRake,
        companyProductionAndProfitKes: company,
        directAgentCommissionKes: direct,
        leadAgentWingOverrideKes: override,
      );
    }
    final direct = (totalRake * 0.18).round();
    final company = totalRake - direct;
    return (
      totalRakeKes: totalRake,
      companyProductionAndProfitKes: company,
      directAgentCommissionKes: direct,
      leadAgentWingOverrideKes: 0,
    );
  }
}
