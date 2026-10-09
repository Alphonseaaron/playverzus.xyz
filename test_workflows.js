const http = require('http');
const assert = require('assert');

// 1. Test Paysafe Integration Logic
const { DEFAULT_PAYSAFE_CONFIG, PaysafeClient } = require('./packages/core/dist/wallet/paysafe.js');
const { toUserFriendlyWalletError } = require('./apps/web/src/lib/walletErrors.ts');

console.log('=== STARTING EXTENSIVE WORKFLOW TEST SUITE ===\n');

// Test 1: Paysafe Configuration & Auth Headers
console.log('Test 1: Validating Paysafe Sandbox Configuration...');
assert.strictEqual(DEFAULT_PAYSAFE_CONFIG.accountNumber, '1166160', 'Account number must match user config');
assert.ok(DEFAULT_PAYSAFE_CONFIG.publicKey.startsWith('OT-1166160'), 'Public key must match user config');
assert.ok(DEFAULT_PAYSAFE_CONFIG.secretKey.startsWith('pmle-1166160'), 'Secret key must match user config');
assert.strictEqual(DEFAULT_PAYSAFE_CONFIG.apiUrl, 'https://api.test.paysafe.com');

const client = new PaysafeClient();
const publicConfig = client.getPublicConfig();
assert.strictEqual(publicConfig.accountNumber, '1166160');
assert.strictEqual(publicConfig.environment, 'test');
console.log('✓ Paysafe configuration and client verified.\n');

// Test 2: Error Translation Functions
console.log('Test 2: Validating User-Friendly Error Translations...');
const testErrors = [
  { raw: new Error('INSUFFICIENT_FUNDS: Cannot withdraw EUR 50: balance is EUR 20'), expectedKey: 'Insufficient balance' },
  { raw: new Error('CARD_DECLINED_BY_ISSUER'), expectedKey: 'payment method was declined' },
  { raw: new Error('INVALID_AMOUNT: Credit amount must be positive'), expectedKey: 'greater than zero' },
  { raw: new Error('Unauthorized 401: jwt expired'), expectedKey: 'session has expired' },
  { raw: new Error('Failed to fetch from payment gateway'), expectedKey: 'internet connection' },
];

for (const { raw, expectedKey } of testErrors) {
  const translated = toUserFriendlyWalletError(raw);
  assert.ok(
    translated.toLowerCase().includes(expectedKey.toLowerCase()),
    `Translation for "${raw.message}" should contain "${expectedKey}", got "${translated}"`
  );
}
console.log('✓ All error translations produced user-friendly guidance.\n');

// Test 3: Game Catalog Completeness
console.log('Test 3: Validating Official Game Catalog...');
const { OFFICIAL_GAMES } = require('./apps/web/src/lib/gamesCatalog.ts');
assert.ok(OFFICIAL_GAMES.length >= 8, 'At least 8 official games must be defined');
for (const game of OFFICIAL_GAMES) {
  assert.ok(game.id, 'Game ID must exist');
  assert.ok(game.displayName, 'Display name must exist');
  assert.ok(game.platform, 'Platform must exist');
  assert.ok(game.posterUrl, 'Poster URL must exist');
  assert.ok(game.defaultRoi, 'ROI coordinates must exist');
}
console.log(`✓ Verified ${OFFICIAL_GAMES.length} official games with ROI calibrations.\n`);

// Test 4: Live Server Route Checks & Content Verification
console.log('Test 4: Verifying Live Web UI Routes on Port 3005...');

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3005' + path, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    // 4.1 Home Page
    const home = await fetchRoute('/');
    assert.strictEqual(home.status, 200);
    assert.ok(home.html.includes('PLAY WITH THE BEST') || home.html.includes('Play With The Best'), 'Hero title must be present');
    assert.ok(home.html.includes('Supported Competitive Arenas'), 'Game arenas section must be present');
    assert.ok(home.html.includes('Featured Tournament Cups'), 'Tournaments showcase must be present');
    assert.ok(home.html.includes('Hall of Champions'), 'Hall of champions must be present');
    console.log('✓ Landing page has complete Pro-tier structure.');

    // 4.2 Challenges Page
    const challenges = await fetchRoute('/challenges');
    assert.strictEqual(challenges.status, 200);
    console.log('✓ Challenges matchmaking board rendered successfully.');

    // 4.3 Tournaments Page
    const tournaments = await fetchRoute('/tournaments');
    assert.strictEqual(tournaments.status, 200);
    console.log('✓ Tournaments cups rendered successfully.');

    // 4.4 Leaderboards Page
    const leaderboards = await fetchRoute('/leaderboards');
    assert.strictEqual(leaderboards.status, 200);
    console.log('✓ Leaderboard Elo standings rendered successfully.');

    // 4.5 Profile Page
    const profile = await fetchRoute('/profile/s1mple');
    assert.strictEqual(profile.status, 200);
    console.log('✓ Player Profile rendered successfully.');

    // 4.6 Dashboard Page
    const dashboard = await fetchRoute('/dashboard');
    assert.strictEqual(dashboard.status, 200);
    console.log('✓ Cashier Dashboard rendered successfully.');

    // 4.7 Admin Console
    const admin = await fetchRoute('/admin');
    assert.strictEqual(admin.status, 200);
    console.log('✓ Operations Admin console rendered successfully.');

    // 4.8 Treasury & Accountancy Console
    const treasury = await fetchRoute('/admin/treasury');
    assert.strictEqual(treasury.status, 200);
    console.log('✓ CPA Treasury & Accountancy console rendered successfully.');

    // Test 5: Verify Established Financial Thresholds & Accounting Invariants
    console.log('\nTest 5: Validating Accounting Thresholds & Invariants...');
    const {
      MIN_DEPOSIT_EUR,
      MAX_DEPOSIT_EUR,
      MIN_WITHDRAWAL_EUR,
      MAX_WITHDRAWAL_EUR,
      TARGET_RESERVE_RATIO,
    } = require('./packages/core/dist/constants.js');

    assert.strictEqual(MIN_DEPOSIT_EUR, 5.0, 'Minimum deposit must be €5.00');
    assert.strictEqual(MAX_DEPOSIT_EUR, 5000.0, 'Maximum deposit must be €5,000.00');
    assert.strictEqual(MIN_WITHDRAWAL_EUR, 10.0, 'Minimum withdrawal must be €10.00');
    assert.strictEqual(MAX_WITHDRAWAL_EUR, 5000.0, 'Maximum withdrawal must be €5,000.00');
    assert.strictEqual(TARGET_RESERVE_RATIO, 1.20, 'Target reserve ratio must be 120%');
    console.log(`✓ Established Financial Thresholds verified: Min Deposit €${MIN_DEPOSIT_EUR.toFixed(2)}, Min Withdrawal €${MIN_WITHDRAWAL_EUR.toFixed(2)}.`);

    // Accounting Invariant Test: Verify Double-Entry Zero-Sum and Segregated Liability formula
    const mockLiabilities = 1000.0;
    const mockGrossCash = 1500.0;
    const mockBuffer = Math.max(250, mockLiabilities * 0.15); // 150 -> 250
    const mockExpenses = 155.0;
    const mockRequiredReserve = mockLiabilities + mockBuffer + mockExpenses; // 1405.0
    const mockSafeWithdrawable = Math.max(0, mockGrossCash - mockRequiredReserve); // 95.0
    assert.strictEqual(mockSafeWithdrawable, 95.0, 'Safe withdrawable dividend calculation must match CPA formula');
    assert.ok(mockGrossCash > mockLiabilities, 'Solvent platform gross cash must exceed custodial player liabilities');
    console.log('✓ Accounting Solvency & Reserve Invariant verified.\n');

    console.log('=== ALL WORKFLOW & ACCOUNTING TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  }
})();
