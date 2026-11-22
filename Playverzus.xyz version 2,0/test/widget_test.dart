import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:playverzus_v2/app.dart';
import 'package:playverzus_v2/core/catalog/official_games.dart';
import 'package:playverzus_v2/core/config/app_config.dart';
import 'package:playverzus_v2/core/security/anti_fraud_engine.dart';
import 'package:playverzus_v2/core/storage/app_state.dart';
import 'package:playverzus_v2/design_system/tokens/hig_tokens.dart';
import 'package:playverzus_v2/features/admin/admin_models.dart';
import 'package:playverzus_v2/features/developer/developer_models.dart';
import 'package:playverzus_v2/features/downloads/download_hub_screen.dart';
import 'package:playverzus_v2/features/legal/legal_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });
  test('Official catalog contains all 21 games with multi-platform filters', () {
    expect(officialGames.length, 21);
    expect(
      officialGames
          .where((g) => g.matchesPlatformFilter(GamePlatformFilter.pc))
          .any((g) => g.id == 'eafc'),
      isTrue,
      reason: 'EA Sports FC 27 must appear in PC tab (cross-platform)',
    );
    expect(
      officialGames
          .where((g) => g.matchesPlatformFilter(GamePlatformFilter.console))
          .any((g) => g.id == 'rl'),
      isTrue,
      reason: 'Rocket League must appear in Console tab (cross-platform)',
    );
  });

  test('Authentic brand color is Playverzus Purple (#8B5CF6), not orange', () {
    expect(HigColors.brand, const Color(0xFF8B5CF6));
    expect(HigColors.copper, const Color(0xFF8B5CF6));
    expect(HigColors.canvas, const Color(0xFF0B0C10));
  });

  test('Granular Staff RBAC covers all 11 admin modules and enforces per-role scopes', () {
    expect(allAdminModules.length, 11);
    expect(allowedAdminModulesForRole('ADMIN').length, 11);
    expect(allowedAdminModulesForRole('SUPER_ADMIN').length, 11);
    expect(allowedAdminModulesForRole('PLAYER'), isEmpty);

    // Scoped clearances
    expect(canRoleAccessAdminPath('REVIEWER', '/admin/review'), isTrue);
    expect(canRoleAccessAdminPath('REVIEWER', '/admin/treasury'), isFalse);
    expect(canRoleAccessAdminPath('FINANCE_AUDITOR', '/admin/treasury'), isTrue);
    expect(canRoleAccessAdminPath('FINANCE_AUDITOR', '/admin/agents'), isTrue);
    expect(canRoleAccessAdminPath('FINANCE_AUDITOR', '/admin/users'), isFalse);
    expect(canRoleAccessAdminPath('SECURITY_ENGINEER', '/admin/security'), isTrue);
    expect(canRoleAccessAdminPath('SECURITY_ENGINEER', '/admin/sponsors'), isFalse);
    expect(canRoleAccessAdminPath('SUPPORT', '/admin/support'), isTrue);
    expect(canRoleAccessAdminPath('SUPPORT', '/admin/polls'), isTrue);
    expect(canRoleAccessAdminPath('SUPPORT', '/admin/treasury'), isFalse);
    expect(canRoleAccessAdminPath('TOURNAMENT_ADMIN', '/admin/seasons'), isTrue);
    expect(canRoleAccessAdminPath('TOURNAMENT_ADMIN', '/admin/profiles'), isTrue);
    expect(canRoleAccessAdminPath('TOURNAMENT_ADMIN', '/games/new'), isTrue);
    expect(canRoleAccessAdminPath('COMMUNITY_MANAGER', '/admin/polls'), isTrue);
    expect(canRoleAccessAdminPath('COMMUNITY_MANAGER', '/admin/sponsors'), isTrue);
    expect(canRoleAccessAdminPath('COMMUNITY_MANAGER', '/admin/users'), isFalse);
  });

  test('RBAC & user data isolation: default is Guest, Admin != Player, signOut wipes state',
      () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    // 1. Starts signed out as Guest
    expect(container.read(playerSessionProvider).isAuthenticated, isFalse);
    expect(container.read(playerSessionProvider).isAdmin, isFalse);
    expect(container.read(playerSessionProvider).isPlayer, isFalse);
    expect(container.read(gameAccountsProvider), isEmpty);

    // 2. Player role has player access, NOT admin
    await container
        .read(playerSessionProvider.notifier)
        .signInSandboxRole(asAdmin: false);
    expect(container.read(playerSessionProvider).isPlayer, isTrue);
    expect(container.read(playerSessionProvider).isAdmin, isFalse);

    await container
        .read(gameAccountsProvider.notifier)
        .setHandle('eafc', 'PlayerA_Tag');
    expect(container.read(gameAccountsProvider)['eafc'], 'PlayerA_Tag');

    // 3. Sign out wipes User A's handles & machine binding completely
    await container.read(playerSessionProvider.notifier).signOut();
    expect(container.read(playerSessionProvider).isAuthenticated, isFalse);
    expect(container.read(gameAccountsProvider), isEmpty);
    expect(container.read(machineAuthProvider).boundUserId, isEmpty);

    // 4. Admin role has Admin access ONLY (NOT Player) and zero User A handles
    await container
        .read(playerSessionProvider.notifier)
        .signInSandboxRole(asAdmin: true);
    expect(container.read(playerSessionProvider).isAdmin, isTrue);
    expect(container.read(playerSessionProvider).isPlayer, isFalse);
    expect(container.read(gameAccountsProvider), isEmpty);
  });

  testWidgets(
      'Public Landing renders with zero overflow across all 4 HIG breakpoints and contains zero logged-in UI',
      (WidgetTester tester) async {
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    tester.view.devicePixelRatio = 1.0;

    // 1. Compact iPhone (390x844)
    tester.view.physicalSize = const Size(390, 844);
    await tester.pumpWidget(const ProviderScope(child: PlayverzusV2App()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Sign In'), findsWidgets);
    expect(find.text('Enter Dashboard'), findsNothing);
    expect(find.text('Sign Out'), findsNothing);

    // 2. Medium iPad Portrait (768x1024)
    tester.view.physicalSize = const Size(768, 1024);
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Create Account'), findsWidgets);

    // 3. Expanded Laptop (1280x800)
    tester.view.physicalSize = const Size(1280, 800);
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('MORE THAN\nMATCHMAKING.'), findsOneWidget);

    // 4. Ultra-Wide Monitor (1600x900)
    tester.view.physicalSize = const Size(1600, 900);
    await tester.pump(const Duration(milliseconds: 200));
    expect(
      find.text('THE SPORT OF\nGAMING IS BIGGER\nTHAN ONE TITLE.'),
      findsOneWidget,
    );
    expect(find.text('GET STARTED NOW'), findsOneWidget);
  });

  test('Game Developer role & platform-aware Stats API model conversion', () {
    const devSession = PlayerSession(
      isAuthenticated: true,
      userId: 'dev_01',
      username: 'indie_dev',
      email: 'dev@studio.gg',
      countryCode: 'KE',
      role: 'GAME_DEVELOPER',
      studioName: 'Neon Pixel Studios',
      elo: 1200,
      wins: 0,
      losses: 0,
      cashUsd: 0,
      demoPoints: 10000,
    );
    expect(devSession.isDeveloper, isTrue);
    expect(devSession.isAdmin, isFalse);
    expect(allowedAdminModulesForRole(devSession.role), isEmpty);

    // Every platform has tailored API connector presets
    expect(presetsForPlatform('PC'), isNotEmpty);
    expect(presetsForPlatform('CONSOLE'), isNotEmpty);
    expect(presetsForPlatform('MOBILE'), isNotEmpty);
    expect(presetsForPlatform('WEB'), isNotEmpty);

    // Developer API game converts cleanly to OfficialGame catalog entry
    final devGame = DeveloperGame.fromJson({
      'id': 'dev_test_01',
      'studioName': 'Neon Pixel Studios',
      'title': 'Neon Arena',
      'shortName': 'NEON',
      'gameType': 'HEAD_TO_HEAD',
      'platforms': ['PC', 'MOBILE'],
      'platformApis': [
        {
          'platform': 'PC',
          'baseUrl': 'https://api.neonarena.gg',
          'playerStatsPath': '/pc/{playerId}/stats',
          'authType': 'BEARER_TOKEN',
          'hasSecret': true,
        },
        {
          'platform': 'MOBILE',
          'baseUrl': 'https://mobile.neonarena.gg',
          'playerStatsPath': '/mobile/{playerId}/stats',
          'launchUriOrPackage': 'com.neonpixel.arena',
        },
      ],
      'statsMapping': {'scorePath': 'data.score', 'winsPath': 'data.wins'},
      'status': 'VERIFIED_LIVE',
    });
    final catalogEntry = devGame.toOfficialGame();
    expect(catalogEntry.isDeveloperApiGame, isTrue);
    expect(catalogEntry.studioName, 'Neon Pixel Studios');
    expect(catalogEntry.androidPackageId, 'com.neonpixel.arena');
    expect(catalogEntry.matchesPlatformFilter(GamePlatformFilter.pc), isTrue);
    expect(catalogEntry.matchesPlatformFilter(GamePlatformFilter.mobile), isTrue);
  });

  test('Bulletproof Anti-Fraud & Dual-Consensus Verification Engine (5 Pillars)', () {
    // 1. FrameHasher: 64-bit Perceptual dHash & Hamming distance
    expect(FrameHasher.hammingDistance('0000000000000000', '0000000000000000'), 0);
    expect(FrameHasher.isPerceptualMatch('0000000000000000', '0000000000000003'), isTrue);
    expect(FrameHasher.isPerceptualMatch('0000000000000000', 'ffffffffffffffff'), isFalse);

    // 2. TelemetrySigner: HMAC-SHA256 + Monotonic Sequence + Clock Skew Guard
    const secret = 'PVZ-ROOM-SECRET';
    const pkt1 = TelemetryPayload(
      matchId: 'm_101',
      playerId: 'p_a',
      seq: 1,
      timestamp: 1700000000000,
      perceptualHash: 'aabbccddeeff0011',
      rawText: '2 - 1',
    );
    final sig1 = TelemetrySigner.signTelemetry(secret, pkt1);
    expect(
      TelemetrySigner.verifyTelemetry(
        secret: secret,
        signature: sig1,
        payload: pkt1,
        nowMs: 1700000005000,
      ).valid,
      isTrue,
    );
    // Reject sequence replay (seq <= lastSeq)
    expect(
      TelemetrySigner.verifyTelemetry(
        secret: secret,
        signature: sig1,
        payload: pkt1,
        lastSeq: 1,
        nowMs: 1700000005000,
      ).valid,
      isFalse,
    );

    // 3. AntiCheatAnalyzer: Frozen-frame overlay spoofing & impossible velocity
    final baseTime = DateTime(2026, 1, 1, 12, 0, 0);
    final spoofFrames = List.generate(
      5,
      (i) => ScoreFrameSample.fromRaw(
        matchId: 'm_101',
        playerId: 'p_a',
        rawText: '$i - 0',
        confidence: 0.9,
        isFinal: false,
        createdAt: baseTime.add(Duration(seconds: i * 5)),
        imageHash: 'FROZEN_STATIC_HASH_001',
      ),
    );
    final spoofCheck = AntiCheatAnalyzer.analyzeScoreStream(spoofFrames);
    expect(spoofCheck.suspicious, isTrue);

    // 4. DualConsensusOracle: Direct, Inverted, and Conflict detection
    final hostFrame = ScoreFrameSample.fromRaw(
      matchId: 'm_101',
      playerId: 'playerA',
      rawText: '3 - 1',
      confidence: 0.96,
      isFinal: true,
    );
    final challengerInverted = ScoreFrameSample.fromRaw(
      matchId: 'm_101',
      playerId: 'playerB',
      rawText: '1 - 3',
      confidence: 0.95,
      isFinal: true,
    );
    final consensus = DualConsensusOracle.evaluate(
      frameA: hostFrame,
      frameB: challengerInverted,
      playerAId: 'playerA',
      playerBId: 'playerB',
      gameType: 'HEAD_TO_HEAD',
    );
    expect(consensus.hasConsensus, isTrue);
    expect(consensus.winnerId, 'playerA');
    expect(consensus.method, ConsensusMethod.dualInverted);

    // 5. VotingOcrEngine: Temporal persistence confidence multiplier
    final temporal = VotingOcrEngine.computeTemporalConfidence(
      currentText: '3 - 1',
      baseConfidence: 0.80,
      recentHistory: const ['3 - 1', '3 - 1'],
    );
    expect(temporal.consecutiveStableFrames, 2);
    expect(temporal.effectiveConfidence, closeTo(0.96, 0.001));
  });

  test(
      'Upfront customer-paid Kopo Kopo & Crossmint fee schedule guarantees zero negative margin',
      () {
    // 1. M-PESA Deposits across all Kopo Kopo Buy Goods tariff bands
    for (final desiredKes in [100, 200, 201, 500, 1000, 5000, 36365, 50000, 250000]) {
      final b = PaymentFeeSchedule.mpesaDepositBreakdown(desiredKes);
      final kopoActualCut = b.totalStkChargeKes <= 200
          ? 0.0
          : (b.totalStkChargeKes * 0.0055).clamp(0.0, 200.0);
      final netReceivedByCompany = b.totalStkChargeKes - kopoActualCut;
      expect(
        netReceivedByCompany >= b.netCreditKes,
        isTrue,
        reason:
            'Deposit KES $desiredKes: company net $netReceivedByCompany must be >= wallet credit ${b.netCreditKes}',
      );
    }

    // 2. M-PESA Withdrawals: Standard (KES 50) & Express VIP (KES 85 = KES 50 cost + KES 35 profit)
    for (final withdrawKes in [150, 500, 1000, 10000, 70000]) {
      final w = PaymentFeeSchedule.mpesaWithdrawalBreakdown(withdrawKes);
      expect(w.feeKes, 50);
      expect(w.profitKes, 0);
      expect(w.netToMpesaKes, withdrawKes - 50);
      expect(w.netToMpesaKes >= 100, isTrue);
      // Total cash leaving company (netToMpesaKes + 50 Kopo Kopo fee) == walletDeductionKes
      expect(w.netToMpesaKes + 50, w.walletDeductionKes);
    }
    final expressW = PaymentFeeSchedule.mpesaWithdrawalBreakdown(
      1000,
      expressPayout: true,
    );
    expect(expressW.feeKes, 85);
    expect(expressW.profitKes, 35);
    expect(expressW.netToMpesaKes, 915);
    final expressCm = PaymentFeeSchedule.crossmintWithdrawalBreakdown(
      20.0,
      expressPayout: true,
    );
    expect(expressCm.feeUsd, 1.50);
    expect(expressCm.profitUsd, 0.50);
    expect(expressCm.netToWalletUsd, 18.50);

    // 3. Differentiated Platform Rake & 2-Tier Agent Split locks >= 80% of rake for Company Production first
    expect(PlatformRakeSchedule.duelRakeRate(5.0), 0.15);
    expect(PlatformRakeSchedule.duelRakeRate(10.0), 0.125);
    expect(PlatformRakeSchedule.blitzRakeRate(1), 0.16);
    expect(PlatformRakeSchedule.blitzRakeRate(3), 0.20);
    expect(PlatformRakeSchedule.blitzRakeRate(5), 0.22);

    final subWingSplit = PlatformRakeSchedule.splitMatchRakeKes(
      totalPotKes: 6500,
      rakeRate: PlatformRakeSchedule.blitzRakeRate(3), // 20% = KES 1300 rake
      hasAgent: true,
      isSubAgentUnderWing: true,
    );
    expect(subWingSplit.totalRakeKes, 1300);
    expect(subWingSplit.companyProductionAndProfitKes, 1040); // 80% locked for company
    expect(subWingSplit.directAgentCommissionKes, 195); // 15% to Sub-Agent
    expect(subWingSplit.leadAgentWingOverrideKes, 65); // 5% to Lead Agent
  });

  testWidgets(
      'Single-device Download hub & full v1 Legal documents render cleanly without overflow',
      (WidgetTester tester) async {
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    tester.view.devicePixelRatio = 1.0;

    // 1. Download Hub on Compact Mobile & Desktop (single detected device initially)
    tester.view.physicalSize = const Size(390, 844);
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: Scaffold(body: DownloadHubScreen())),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Need a different platform?'), findsOneWidget);
    expect(find.text('FREQUENTLY ASKED QUESTIONS'), findsOneWidget);

    tester.view.physicalSize = const Size(1440, 900);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Need a different platform?'), findsOneWidget);

    // 2. Detailed v1 Privacy Policy
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: LegalScreen(docType: LegalDocType.privacy)),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('PLAYER PRIVACY POLICY'), findsOneWidget);
    expect(
      find.text('Authoritative Zero Video Storage Guarantee'),
      findsOneWidget,
    );

    // 3. Detailed v1 Terms of Service
    tester.view.physicalSize = const Size(390, 844);
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: LegalScreen(docType: LegalDocType.terms)),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('TERMS OF SERVICE & RULES'), findsOneWidget);
    expect(
      find.text(
        'Strictly Prohibited Infractions (Immediate Permanent Ban & Forfeiture)',
      ),
      findsOneWidget,
    );
    expect(
      find.text('THE SKILL VS. CHANCE DOCTRINE & PREDOMINANCE TEST'),
      findsOneWidget,
    );

    // 4. Detailed v1 Responsible Gaming & Global Compliance Matrix
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: LegalScreen(docType: LegalDocType.responsibleGaming),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('RESPONSIBLE SKILL-BASED GAMING'), findsOneWidget);
    expect(find.text('GLOBAL COMPLIANCE MATRIX'), findsOneWidget);
  });
}
