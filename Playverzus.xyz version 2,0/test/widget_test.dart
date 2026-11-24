import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:playverzus_v2/app.dart';
import 'package:playverzus_v2/core/catalog/official_games.dart';
import 'package:playverzus_v2/core/config/app_config.dart';
import 'package:playverzus_v2/core/data/arena_repository.dart';
import 'package:playverzus_v2/core/network/friendly_errors.dart';
import 'package:playverzus_v2/core/security/anti_fraud_engine.dart';
import 'package:playverzus_v2/core/storage/app_state.dart';
import 'package:playverzus_v2/core/storage/app_update_provider.dart';
import 'package:playverzus_v2/design_system/layout/adaptive_scaffold.dart';
import 'package:playverzus_v2/design_system/tokens/hig_tokens.dart';
import 'package:playverzus_v2/features/admin/admin_models.dart';
import 'package:playverzus_v2/features/cashier/cashier_screen.dart';
import 'package:playverzus_v2/features/dashboard/dashboard_screen.dart';
import 'package:playverzus_v2/features/developer/developer_models.dart';
import 'package:playverzus_v2/features/downloads/download_hub_screen.dart';
import 'package:playverzus_v2/features/games/installed_games_sheet.dart';
import 'package:playverzus_v2/features/legal/legal_screen.dart';
import 'package:playverzus_v2/features/matchroom/pre_match_permissions_sheet.dart';
import 'package:playverzus_v2/features/onboarding_auth/auth_screen.dart';
import 'package:playverzus_v2/features/tournaments/tournament_detail_screen.dart';
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

    // 4. Unified USDC currency formatting, 5 USDC minimum thresholds & withdrawal fee efficiency
    expect(PaymentFeeSchedule.minDepositUsdc, 5.00);
    expect(PaymentFeeSchedule.mpesaMinDepositKes, 650);
    expect(PaymentFeeSchedule.crossmintMinDepositUsd, 5.00);
    expect(PaymentFeeSchedule.mpesaMinWithdrawalKes, 650);
    expect(AppConfig.formatUsdc(5.0), 'USDC 5');
    expect(AppConfig.formatUsdc(5.0, alwaysDecimals: true), 'USDC 5.00');
    expect(AppConfig.usdcToKes(20.0), 2600);
    expect(AppConfig.kesToUsdc(650), 5.00);
    expect(
      PaymentFeeSchedule.mpesaWithdrawalFeePercent(650),
      greaterThan(PaymentFeeSchedule.mpesaWithdrawalFeePercent(2600)),
    );
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

  testWidgets(
      'Friendly errors avoid technical jargon and AuthScreen points to exact invalid fields',
      (WidgetTester tester) async {
    // 1. Technical strings translate to everyday plain language
    final netMsg = FriendlyError.fromText(
      'DioException [connection error]: SocketException: Failed host lookup',
    );
    expect(netMsg.contains('DioException'), isFalse);
    expect(netMsg.contains('SocketException'), isFalse);
    expect(netMsg.toLowerCase().contains('internet'), isTrue);

    final srvMsg = FriendlyError.fromText('Internal server error', statusCode: 500);
    expect(srvMsg.contains('500'), isFalse);
    expect(srvMsg.contains('Internal'), isFalse);

    final fraudMsg = FriendlyError.fromText(
      'Invalid telemetry signature: payload does not match HMAC-SHA256 digest',
    );
    expect(fraudMsg.contains('HMAC'), isFalse);

    expect(
      FriendlyError.detectTargetField('Your Safaricom phone number looks invalid'),
      'phone',
    );
    expect(
      FriendlyError.detectTargetField('Minimum M-PESA deposit is KES 50'),
      'amount',
    );
    expect(
      FriendlyError.detectTargetField(
        'Your email, username, or password does not match. Please double-check and try again.',
      ),
      'credentials',
    );
    expect(
      FriendlyError.fromText(
        'No competitor account found with username "nobody99".',
        statusCode: 404,
      ),
      contains('nobody99'),
    );
    expect(
      FriendlyError.fromText('Player not found'),
      'Player not found',
    );

    // 2. AuthScreen highlights exact fields where issues are when submitted empty
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: AuthScreen(isSignUp: true)),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    final createBtn = find.text('Create Account & Play');
    await tester.ensureVisible(createBtn);
    await tester.tap(createBtn);
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Please fix the highlighted fields below.'), findsOneWidget);
    expect(
      find.text('Look for the red highlighted field(s) below.'),
      findsOneWidget,
    );
    expect(
      find.text('Pick a username with at least 3 characters.'),
      findsOneWidget,
    );
    expect(
      find.text('Enter a valid email address (like name@example.com).'),
      findsOneWidget,
    );
    expect(
      find.text('Use at least 6 characters for your password.'),
      findsOneWidget,
    );
  });

  testWidgets(
      'Public & player screens keep internal visual machine mechanics confidential',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final forbiddenTerms = [
      'volatile RAM',
      'dHash',
      'HMAC-SHA256',
      'Regions of Interest',
      '5-pillar',
      '5-Pillar',
      'ScreenCaptureKit',
      'MediaProjection',
      'ReplayKit',
    ];

    for (final w in <Widget>[
      const DownloadHubScreen(),
      const LegalScreen(docType: LegalDocType.privacy),
      const LegalScreen(docType: LegalDocType.terms),
      const LegalScreen(docType: LegalDocType.responsibleGaming),
    ]) {
      await tester.pumpWidget(
        ProviderScope(child: MaterialApp(home: Scaffold(body: w))),
      );
      await tester.pump(const Duration(milliseconds: 100));
      for (final term in forbiddenTerms) {
        expect(find.textContaining(term), findsNothing,
            reason: '$w must not display "$term"');
      }
    }
  });

  testWidgets(
      'Cashier displays USDC, enforces min USDC 5 deposit, provides 2-way converter, and explains KES 50 withdrawal fee',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: Scaffold(body: CashierScreen())),
      ),
    );
    await tester.pump(const Duration(milliseconds: 120));

    // Primary currency is USDC with KES conversion preview
    expect(find.text('USDC 0.00'), findsOneWidget);
    expect(find.textContaining('Minimum deposit: USDC 5.00 (KES 650)'),
        findsWidgets);

    // Entering below 5 USDC shows clear red validation error (HigTextField wraps CupertinoTextField -> EditableText)
    final usdcField = find.byType(EditableText).first;
    await tester.enterText(usdcField, '2');
    await tester.pump();
    final depBtn = find.text('Deposit via M-PESA');
    await tester.ensureVisible(depBtn);
    await tester.tap(depBtn);
    await tester.pump();
    expect(
      find.text('Minimum deposit is USDC 5.00 (KES 650). Enter USDC 5 or more.'),
      findsOneWidget,
    );

    // 2-way converter syncs KES -> USDC cleanly
    final kesField = find.byType(EditableText).at(1);
    await tester.enterText(kesField, '2600');
    await tester.pump();
    expect(find.text('20'), findsWidgets);

    // Switch to Withdraw tab -> verify converter + suggested best withdrawal + KES 50 explanation
    await tester.ensureVisible(find.text('Withdraw'));
    await tester.tap(find.text('Withdraw'));
    await tester.pump();
    expect(find.text('USDC 20 · Best Value'), findsOneWidget);
    expect(
      find.textContaining('Best value withdrawal'),
      findsOneWidget,
    );

    // Tap USDC 5 (Min) -> shows clear explanation of the fixed KES 50 fee (7.7%) and recommends USDC 20+
    await tester.ensureVisible(find.text('USDC 5 (Min)'));
    await tester.tap(find.text('USDC 5 (Min)'));
    await tester.pump();
    expect(
      find.textContaining('Understanding the KES 50 withdrawal fee'),
      findsOneWidget,
    );
    expect(find.textContaining('Suggested best withdrawal: USDC 20+'),
        findsOneWidget);
  });

  test(
      'Onboarding MachineAuthState tracks installed app mode, permissions, and featured game confirmation persistently',
      () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container
        .read(machineAuthProvider.notifier)
        .bootstrapOnRegistration(userId: 'player_onboard_1', username: 'kibet');

    final initial = container.read(machineAuthProvider);
    // Test runner is native Dart VM (!kIsWeb), so installed app mode is active and download prompt stays hidden
    expect(initial.isRunningInstalledApp, isTrue);
    expect(initial.needsAppDownloadPrompt, isFalse);
    expect(initial.needsOnboardingGuide, isTrue);

    await container
        .read(machineAuthProvider.notifier)
        .markGamesSetupConfirmed(gameIds: ['chess', 'eafc']);
    final afterSync = container.read(machineAuthProvider);
    expect(afterSync.gamesConfirmed, isTrue);
    expect(afterSync.needsGameSetup, isFalse);
    expect(afterSync.installedGameIds, containsAll(['chess', 'eafc']));

    // Re-hydrating the same user preserves gamesConfirmed and selected featured titles
    container.read(machineAuthProvider.notifier).clearForSignOut();
    await container
        .read(machineAuthProvider.notifier)
        .bootstrapOnRegistration(userId: 'player_onboard_1', username: 'kibet');
    final reloaded = container.read(machineAuthProvider);
    expect(reloaded.gamesConfirmed, isTrue);
    expect(reloaded.installedGameIds, containsAll(['chess', 'eafc']));

    await container.read(machineAuthProvider.notifier).dismissOnboarding();
    expect(container.read(machineAuthProvider).onboardingDismissed, isTrue);
    expect(container.read(machineAuthProvider).needsOnboardingGuide, isFalse);
  });

  testWidgets(
      'Bell Notification Center shows missing permission & game-setup alerts and auto-clears once confirmed',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer();
    addTearDown(container.dispose);
    final authNotifier = container.read(machineAuthProvider.notifier);
    await tester.runAsync(() async {
      await container
          .read(playerSessionProvider.notifier)
          .signInSandboxRole(asAdmin: false);
      // Ensure initial permissions & gamesConfirmed are false so first-time alerts appear in Notification Center
      await authNotifier.bootstrapOnRegistration(
        userId: container.read(playerSessionProvider).userId,
        username: container.read(playerSessionProvider).username,
      );
    });

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: AdaptiveScaffold(
            currentPath: '/challenges',
            child: Center(child: Text('Arena Body')),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    // Open Notification Center via top-bar bell icon
    await tester.tap(find.byIcon(CupertinoIcons.bell_fill).first);
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('DEVICE & APP ACTIONS'), findsOneWidget);
    expect(find.text('Confirm Installed Games'), findsOneWidget);

    // Confirming games clears the "Confirm Installed Games" notification immediately
    await tester.runAsync(
      () => authNotifier.markGamesSetupConfirmed(gameIds: ['chess']),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Confirm Installed Games'), findsNothing);
  });

  testWidgets(
      'InstalledGamesSetupSheet filters & saves featured games and TournamentDetailScreen exposes Confirm Installed / Launch',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer(
      overrides: [
        arenaDataProvider.overrideWith((ref) => _TestArenaNotifier(ref)),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: Scaffold(body: InstalledGamesSetupSheet(isSheet: false)),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 120));

    expect(find.text('Setup Featured Games'), findsOneWidget);
    // Search for Chess.com and select it
    await tester.enterText(find.byType(EditableText).first, 'Chess.com');
    await tester.pump();
    await tester.tap(find.text('SELECT').first);
    await tester.pump();

    expect(find.text('Save & Confirm (1)'), findsOneWidget);
    await tester.tap(find.text('Save & Confirm (1)'));
    await tester.pump(const Duration(milliseconds: 120));
    expect(container.read(machineAuthProvider).installedGameIds,
        contains('chess'));
    expect(container.read(machineAuthProvider).gamesConfirmed, isTrue);

    // Clear 4-second FrostedToast timer scheduled on save
    await tester.pump(const Duration(seconds: 5));

    // Render TournamentDetailScreen for confirmed game ('chess') -> shows INSTALLED badge & Launch CHESS button
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: Scaffold(
            body: TournamentDetailScreen(tournamentId: 't_chess_test'),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('INSTALLED'), findsOneWidget);
    expect(find.text('Launch CHESS'), findsOneWidget);

    // Ensure confidential internal words remain completely hidden on new/updated widgets
    final forbidden = [
      'volatile RAM',
      'dHash',
      'HMAC-SHA256',
      'Regions of Interest',
      'ScreenCaptureKit',
      'MediaProjection',
      'ReplayKit',
    ];
    for (final term in forbidden) {
      expect(find.textContaining(term), findsNothing);
    }

    // Also mount DashboardScreen and flush any onboarding toast timer cleanly
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: Scaffold(body: DashboardScreen())),
      ),
    );
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.byType(PreMatchPermissionsDialog), findsNothing);
    await tester.pump(const Duration(seconds: 7));
  });

  test(
      'AppUpdateNotifier compares semver/builds and alerts users who already downloaded/installed when a newer version ships',
      () async {
    expect(
      isNewerAppVersion(
        currentVersion: '2.0.1',
        currentBuild: 2,
        remoteVersion: '2.0.2',
        remoteBuild: 3,
      ),
      isTrue,
    );
    expect(
      isNewerAppVersion(
        currentVersion: '2.0.1',
        currentBuild: 2,
        remoteVersion: '2.0.1',
        remoteBuild: 3,
      ),
      isTrue,
    );
    expect(
      isNewerAppVersion(
        currentVersion: '2.0.1',
        currentBuild: 2,
        remoteVersion: '2.0.1',
        remoteBuild: 2,
      ),
      isFalse,
    );

    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(appUpdateProvider.notifier);
    await notifier.recordDownloadedCurrentVersion(
      version: '2.0.0',
      buildNumber: 1,
    );
    notifier.applyRemoteManifest(
      latestVersion: '2.0.5',
      latestBuildNumber: 6,
      releaseNotes: 'Better onboarding & 1-tap tournament launch.',
    );

    final pending = container.read(appUpdateProvider);
    expect(pending.hasInstalledOrDownloadedApp, isTrue);
    expect(pending.hasNewerDownloadedRelease, isTrue);
    expect(pending.hasPendingUpdate, isTrue);

    // Dismissing 2.0.5 hides that version until a newer release (2.0.6) arrives
    await notifier.dismissCurrentUpdate();
    expect(container.read(appUpdateProvider).hasPendingUpdate, isFalse);

    notifier.applyRemoteManifest(
      latestVersion: '2.0.6',
      latestBuildNumber: 7,
    );
    expect(container.read(appUpdateProvider).hasPendingUpdate, isTrue);
  });

  testWidgets(
      'Bell Notification Center and DownloadHub surface App Update notification when an update is pending',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.runAsync(() async {
      await container
          .read(playerSessionProvider.notifier)
          .signInSandboxRole(asAdmin: false);
    });
    container.read(appUpdateProvider.notifier).applyRemoteManifest(
          latestVersion: '2.1.0',
          latestBuildNumber: 5,
          releaseNotes: 'Faster bracket sync & new update alert.',
        );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: AdaptiveScaffold(
            currentPath: '/challenges',
            child: DownloadHubScreen(),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 120));

    expect(find.text('UPDATE AVAILABLE · V2.1.0'), findsOneWidget);

    await tester.tap(find.byIcon(CupertinoIcons.bell_fill).first);
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Update Available · playverzus.xyz v2.1.0'), findsOneWidget);
    expect(find.text('Download Update'), findsOneWidget);
  });

  test(
      'DeviceBridge & MachineAuthNotifier enforce real OS Allow/Deny permission outcomes instead of faking approval',
      () async {
    const channel = MethodChannel('xyz.playverzus.v2/device_bridge');
    var osNotifAllow = false;
    var osCaptureAllow = false;

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      switch (call.method) {
        case 'getNotificationPermissionState':
          return osNotifAllow ? 'granted' : 'denied';
        case 'requestNotificationPermission':
          return osNotifAllow;
        case 'requestCapturePermission':
          return osCaptureAllow;
        case 'scanInstalledGames':
          return <String>[];
        case 'getDeviceFingerprint':
          return <String, dynamic>{
            'fingerprint': 'PVZ-AND-REALTEST',
            'deviceModel': 'Pixel Test',
            'osVersion': 'Android 15',
            'hardwareAttested': true,
          };
      }
      return null;
    });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final container = ProviderContainer();
    addTearDown(container.dispose);

    final notifier = container.read(machineAuthProvider.notifier);
    await notifier.bootstrapOnRegistration(userId: 'u_perm_1', username: 'ada');

    // Denied on device -> MUST remain false (zero simulation)
    expect(await notifier.promptNotificationPermission(), isFalse);
    expect(await notifier.promptScreenCapturePermission(), isFalse);
    expect(container.read(machineAuthProvider).alertsAuthorized, isFalse);
    expect(container.read(machineAuthProvider).captureAuthorized, isFalse);

    // User subsequently grants on device -> flips cleanly to true
    osNotifAllow = true;
    osCaptureAllow = true;
    expect(await notifier.promptNotificationPermission(), isTrue);
    expect(await notifier.promptScreenCapturePermission(), isTrue);
    expect(container.read(machineAuthProvider).alertsAuthorized, isTrue);
    expect(container.read(machineAuthProvider).captureAuthorized, isTrue);
  });

  testWidgets(
      'AuthScreen & LegalScreen enforce scrolling through Terms of Service & Privacy Policy before unlocking agreement checkbox',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(520, 920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: AuthScreen(isSignUp: true)),
      ),
    );
    await tester.pump(const Duration(milliseconds: 120));

    // Tapping READ TERMS opens the iOS Agreement Reader instead of checking blindly
    final readTermsPill = find.text('READ TERMS');
    await tester.ensureVisible(readTermsPill);
    await tester.tap(readTermsPill);
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Read Agreements Before Accepting'), findsOneWidget);
    expect(find.text('Read to Bottom'), findsOneWidget);

    // Tapping disabled button before reading does NOT advance
    await tester.tap(find.text('Read to Bottom'));
    await tester.pump();
    expect(find.text('TERMS OF SERVICE & RULES'), findsOneWidget);

    // Partial scroll must NOT unlock accept button
    final docScroll = find.byKey(const ValueKey('legal_doc_scroll'));
    await tester.drag(docScroll, const Offset(0, -350));
    await tester.pumpAndSettle();
    expect(find.text('Read to Bottom'), findsOneWidget);

    // Jump to final section and scroll all the way to bottom -> button unlocks
    final tocTerm = find.text('09 Contact');
    await tester.ensureVisible(tocTerm);
    await tester.tap(tocTerm);
    await tester.pumpAndSettle();
    await tester.drag(docScroll, const Offset(0, -500));
    await tester.pumpAndSettle();

    expect(find.text('Accept Terms & Next: Privacy Policy'), findsOneWidget);
    await tester.tap(find.text('Accept Terms & Next: Privacy Policy'));
    await tester.pump(const Duration(milliseconds: 250));

    // Now on Privacy Policy (step 2) -> must also read to bottom
    expect(find.text('PLAYER PRIVACY POLICY'), findsOneWidget);
    expect(find.text('Read to Bottom'), findsOneWidget);

    final privacyScroll = find.byKey(const ValueKey('legal_doc_scroll'));
    final tocPrivacy = find.text('08 DPO Contact');
    await tester.ensureVisible(tocPrivacy);
    await tester.tap(tocPrivacy);
    await tester.pumpAndSettle();
    await tester.drag(privacyScroll, const Offset(0, -500));
    await tester.pumpAndSettle();

    expect(find.text('Accept Privacy Policy & Agree'), findsOneWidget);
    await tester.tap(find.text('Accept Privacy Policy & Agree'));
    await tester.pump(const Duration(milliseconds: 250));

    // Modal closed & both policies now marked reviewed on signup form
    expect(find.text('TERMS READ'), findsOneWidget);
    expect(find.text('PRIVACY READ'), findsOneWidget);
  });
}

class _TestArenaNotifier extends ArenaDataNotifier {
  _TestArenaNotifier(super.ref) {
    state = const ArenaDataState(
      tournaments: [
        TournamentModel(
          id: 't_chess_test',
          name: 'Nairobi Chess Blitz Open',
          gameId: 'chess',
          format: 'SINGLE_ELIM',
          size: 8,
          entryFeeUsd: 5.0,
          prizePoolUsd: 36.0,
          status: 'REGISTRATION',
          isBlitz: false,
          entrants: [],
        ),
      ],
    );
  }

  @override
  Future<void> refreshFromApi() async {}
}
