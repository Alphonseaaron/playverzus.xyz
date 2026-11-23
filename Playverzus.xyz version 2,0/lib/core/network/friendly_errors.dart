/// Translates technical API, network, authentication, payment, permission, and
/// validation error strings into clear, everyday language that tells players
/// what went wrong and what they can do next — without exposing server codes
/// or developer jargon.
class FriendlyError {
  FriendlyError._();

  static String humanize(
    Object? error, {
    String fallback = 'Something went wrong. Please try again.',
  }) {
    if (error == null) return fallback;
    return fromText(error.toString(), fallback: fallback);
  }

  static String fromText(
    String raw, {
    int? statusCode,
    String fallback = 'Something went wrong. Please try again.',
  }) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return _fallbackForCode(statusCode, fallback);

    final lower = trimmed.toLowerCase();

    // 1. Network / Connectivity / Timeouts
    if (_matchesAny(lower, [
      'socketexception',
      'failed host lookup',
      'connection refused',
      'econnrefused',
      'connectionerror',
      'unable to connect',
      'xmlhttprequest',
      'network error',
      'err_internet_disconnected',
      'clientexception',
    ])) {
      return 'We could not connect right now. Check your internet connection and try again.';
    }
    if (_matchesAny(lower, ['timed out', 'timeout', 'took too long'])) {
      return 'That took a bit too long. Please check your connection and try again.';
    }

    // 2. Authentication & Session
    if (_matchesAny(lower, [
      'invalid login credentials',
      'invalid credentials',
      'wrong password',
      'incorrect password',
      'invalid email or password',
    ])) {
      return 'Your email, username, or password does not match. Please double-check and try again.';
    }
    if (_matchesAny(lower, ['email not confirmed', 'not confirmed'])) {
      return 'Please confirm your email address from your inbox first, then try signing in again.';
    }
    if (_matchesAny(lower, ['username']) &&
        _matchesAny(lower, ['taken', 'already', 'exists', 'duplicate'])) {
      return 'That gamer tag is already taken. Try picking a different username.';
    }
    if (_matchesAny(lower, [
      'already registered',
      'email already',
      'already exists',
      'unique constraint',
      'email_exists',
    ])) {
      return 'An account or entry with those details already exists. Try signing in or using another one.';
    }
    if (statusCode == 401 ||
        _matchesAny(lower, [
          'jwt expired',
          'session expired',
          'unauthorized',
          'invalid token',
          'missing bearer',
        ])) {
      return 'Your login timed out for security. Please sign in again.';
    }
    if (statusCode == 403 ||
        _matchesAny(lower, ['forbidden', 'do not have permission'])) {
      return 'You do not have permission to do that right now.';
    }

    // 3. Not Found / Missing Items
    if (_matchesAny(lower, [
      'player not found',
      'no player found',
      'no competitor account found',
      'could not find rival',
      'could not find a player',
      'could not find a competitor',
    ])) {
      return trimmed;
    }
    if (statusCode == 404 ||
        _matchesAny(lower, [
          'cannot get ',
          'cannot post ',
          'cannot patch ',
          'cannot delete ',
          'not found',
        ])) {
      return 'We could not find that item — it may have moved or already closed.';
    }

    // 4. Payments, Escrow & Balances
    if (_matchesAny(lower, ['insufficient', 'exceeds your available'])) {
      return 'Your available cash balance is not enough for that amount. Add funds or try a smaller amount.';
    }
    if (_matchesAny(lower, ['play-through', 'playthrough', 'wager requirement'])) {
      return 'To protect accounts from payment fraud, please enter at least one match with newly deposited cash before withdrawing it.';
    }
    if (_matchesAny(lower, ['stk', 'kopokopo', 'b2c'])) {
      return 'We could not reach M-PESA right now. Check your Safaricom phone number and try again.';
    }
    if (_matchesAny(lower, ['escrow'])) {
      return 'We could not lock match funds right now. Make sure you have enough balance and try again.';
    }

    // 5. Permissions & Match Capture
    if (_matchesAny(lower, ['notallowederror', 'permission denied', 'getdisplaymedia'])) {
      return 'Your browser blocked permission. Click the lock icon next to the website address to allow access, then try again.';
    }
    if (_matchesAny(lower, ['impossible velocity', 'value ']) &&
        lower.contains('outside allowed')) {
      return 'Those match numbers do not look right compared to the live match. Double-check the final score on your screen and try again.';
    }
    if (_matchesAny(lower, [
      'frozen video frame',
      'static video feed',
      'overlay spoofing',
      'sequence regression',
      'timestamp skew',
      'hmac-sha256',
      'telemetry signature',
      'oversized ocr payload',
      'non-finite score',
    ])) {
      return 'We could not verify that score right now. Keep your game scoreboard visible and submit the final result cleanly.';
    }

    // 6. Developer / Regex / Format Exceptions
    if (_matchesAny(lower, ['invalid regex', 'formatexception'])) {
      return 'That text pattern does not look valid. Check any special symbols and try again.';
    }

    // 7. Server errors (never expose HTTP codes like 500/502/503)
    if (statusCode == 503 &&
        _matchesAny(lower, ['temporarily unavailable', 'm-pesa deposits', 'm-pesa payouts'])) {
      return trimmed;
    }
    if ((statusCode != null && statusCode >= 500) ||
        _matchesAny(lower, [
          'internal server error',
          'bad gateway',
          'service unavailable',
          'gateway timeout',
        ])) {
      return 'Something went wrong on our side. Please wait a moment and try again.';
    }

    // 8. Clean stray Dart/HTTP technical wrappers if backend gave a decent message
    var cleaned = trimmed
        .replaceAll(
            RegExp(r'^(ApiException|AuthException|Exception|Error|DioException):\s*',
                caseSensitive: false),
            '')
        .replaceAll(RegExp(r'DioException\s*\[[^\]]*\]:?\s*', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s*\(?(?:HTTP|status code|code)\s*\d{3}\)?', caseSensitive: false), '')
        .trim();

    if (cleaned.isEmpty ||
        cleaned.startsWith('{') ||
        cleaned.startsWith('[') ||
        cleaned.contains('Instance of ') ||
        cleaned.contains('StackTrace') ||
        cleaned.length > 220) {
      return _fallbackForCode(statusCode, fallback);
    }

    return cleaned;
  }

  /// Identifies which input area a message refers to so forms can highlight the
  /// right box directly for the user (`'email'`, `'password'`, `'username'`,
  /// `'phone'`, `'amount'`, `'wallet'`, `'country'`, `'studio'`, `'terms'`).
  static String? detectTargetField(String raw) {
    final lower = raw.toLowerCase();
    if (_matchesAny(lower, [
      'does not match',
      'invalid login',
      'wrong password',
      'incorrect password',
      'invalid email or password',
    ])) {
      return 'credentials';
    }
    if (lower.contains('email')) return 'email';
    if (lower.contains('password')) return 'password';
    if (_matchesAny(lower, ['username', 'gamer tag', 'gamertag', 'rival', '@'])) {
      return 'username';
    }
    if (_matchesAny(lower, ['phone', 'm-pesa number', 'safaricom'])) return 'phone';
    if (_matchesAny(lower, ['wallet address', 'usdc address'])) return 'wallet';
    if (_matchesAny(lower, [
      'amount',
      'deposit',
      'withdraw',
      'balance',
      'stake',
      'minimum',
      'maximum',
    ])) {
      return 'amount';
    }
    if (lower.contains('country') || lower.contains('nationality')) return 'country';
    if (lower.contains('studio')) return 'studio';
    if (lower.contains('terms') || lower.contains('age')) return 'terms';
    if (lower.contains('subject')) return 'subject';
    if (lower.contains('scoreboard') || lower.contains('score')) return 'score';
    return null;
  }

  static String _fallbackForCode(int? statusCode, String fallback) {
    if (statusCode == null) return fallback;
    if (statusCode == 400 || statusCode == 422) {
      return 'Please check the information you entered and try again.';
    }
    if (statusCode == 401) {
      return 'Your login timed out for security. Please sign in again.';
    }
    if (statusCode == 403) {
      return 'You do not have permission to do that right now.';
    }
    if (statusCode == 404) {
      return 'We could not find what you were looking for.';
    }
    if (statusCode == 429) {
      return 'You tried that a little too fast. Please wait a few seconds and try again.';
    }
    if (statusCode >= 500) {
      return 'Something went wrong on our side. Please wait a moment and try again.';
    }
    return fallback;
  }

  static bool _matchesAny(String input, List<String> needles) {
    for (final n in needles) {
      if (input.contains(n)) return true;
    }
    return false;
  }
}
