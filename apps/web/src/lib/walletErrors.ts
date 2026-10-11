/**
 * User-Friendly Wallet & Cashier Error Messages
 *
 * Translates technical error codes, gateway responses, and network exceptions
 * into clear, helpful, customer-facing explanations.
 */

export function toUserFriendlyWalletError(error: unknown): string {
  if (!error) {
    return 'An unexpected issue occurred. Please try again.';
  }

  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase();

  // 1. Session / Authentication (check before generic 'expired')
  if (
    raw.includes('unauthorized') ||
    raw.includes('jwt') ||
    raw.includes('token') ||
    raw.includes('session') ||
    raw.includes('401') ||
    raw.includes('login') ||
    raw.includes('forbidden')
  ) {
    return 'Your session has expired. Please sign in again to complete your transaction safely.';
  }

  // 2. Insufficient Funds
  if (raw.includes('insufficient') || raw.includes('balance')) {
    return 'Insufficient balance for this transaction. Please adjust the amount or make a deposit.';
  }

  // 2b. Demo Faucet Cooldown
  if (raw.includes('cooldown') || raw.includes('24 hours') || raw.includes('once per') || raw.includes('demo coins')) {
    return 'Demo practice refill is only available once every 24 hours. Please check back later!';
  }

  // 3. Payment Method / Card Declined
  if (raw.includes('declined') || raw.includes('card_declined') || raw.includes('do_not_honor')) {
    return 'Your payment method was declined by the card issuer or banking provider. Please check your details or try another card.';
  }

  // 4. Expired Card or CVV
  if (
    raw.includes('card_expired') ||
    raw.includes('card expired') ||
    raw.includes('expiration date') ||
    raw.includes('cvv') ||
    raw.includes('cvc') ||
    raw.includes('security code')
  ) {
    return 'The card expiration date or security code is invalid. Please double-check your card details.';
  }

  // 5. Transaction Limits
  if (raw.includes('limit') || raw.includes('min') || raw.includes('max') || raw.includes('exceed')) {
    return 'The entered amount is outside the permitted transaction limits for this payment method.';
  }

  // 6. Invalid Amount
  if (raw.includes('invalid_amount') || raw.includes('positive') || raw.includes('nan') || raw.includes('invalid amount')) {
    return 'Please enter a valid amount greater than zero.';
  }

  // 7. Network / Connection
  if (raw.includes('network') || raw.includes('failed to fetch') || raw.includes('offline') || raw.includes('timeout')) {
    return 'Unable to reach the payment gateway. Please check your internet connection and try again.';
  }

  // 8. Payout / Withdrawal Destination Details
  if (raw.includes('iban') || raw.includes('account number') || raw.includes('phone') || raw.includes('destination')) {
    return 'Please provide a valid destination bank IBAN or mobile account number for your withdrawal.';
  }

  // 9. Gateway / Provider Unreachable
  if (raw.includes('gateway') || raw.includes('paysafe') || raw.includes('upstream') || raw.includes('500') || raw.includes('502') || raw.includes('503')) {
    return 'The banking gateway is currently undergoing maintenance. Your funds are secure. Please try again shortly.';
  }

  // 10. Default friendly fallback
  return 'We could not complete your transaction at this time. Please check your details and try again.';
}
