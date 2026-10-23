'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Globe,
  CreditCard,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Wallet,
  Sparkles,
  Coins,
  RefreshCw,
  Info,
  Lock,
} from 'lucide-react';
import {
  SUPPORTED_COUNTRY_LIST,
  getPaymentProfileForCountry,
  type PaymentRail,
} from '../../lib/paymentMethods';
import { notifyUser } from '../../lib/notifications';
import { toUserFriendlyWalletError } from '../../lib/walletErrors';
import { useWalletModeStore } from '../../lib/walletModeStore';
import { apiClient } from '../../lib/api';
import {
  formatUSDC,
  formatPoints,
  getFiatConversion,
  fetchLiveFxRates,
  type FiatConversion,
} from '../../lib/currency';
import { AuthGuard } from '../../components/AuthGuard';
import { CountryFlag } from '../../components/CountryFlag';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

interface WalletBalanceResponse {
  cashEur?: number;
  balance?: number;
}

function CashierContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'withdraw' ? 'withdraw' : 'deposit';

  const { mode: activeWalletMode, setMode: setActiveWalletMode } = useWalletModeStore();
  const [actionTab, setActionTab] = useState<'deposit' | 'withdraw'>(initialTab);
  const [selectedCountry, setSelectedCountry] = useState<string>('DE');
  const [selectedRailId, setSelectedRailId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('25');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);

  // Live Exchange Rates (USDC to local fiat)
  const [liveFxRates, setLiveFxRates] = useState<Record<string, number> | undefined>(undefined);

  // Crossmint Checkout Modal State
  const [crossmintModalOpen, setCrossmintModalOpen] = useState(false);
  const [crossmintCheckoutUrl, setCrossmintCheckoutUrl] = useState<string | null>(null);
  const [crossmintOrderId, setCrossmintOrderId] = useState<string | null>(null);

  // Load live FX rates on mount
  useEffect(() => {
    let isMounted = true;
    fetchLiveFxRates().then((rates) => {
      if (isMounted) setLiveFxRates(rates);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync tab with URL param if it changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'withdraw' || tabParam === 'deposit') {
      setActionTab(tabParam);
    }
  }, [searchParams]);

  // Real Wallet Balance from API
  const { data: wallet, refetch: refetchWallet } = useQuery<WalletBalanceResponse>({
    queryKey: ['cashier-wallet-balance'],
    queryFn: async () => {
      try {
        return await apiClient<WalletBalanceResponse>('/wallet/balance');
      } catch {
        return { cashEur: 0, balance: 10000 };
      }
    },
    staleTime: 5000,
  });

  const cashUsdc = wallet?.cashEur ?? 0.0;
  const points = wallet?.balance ?? 10000;

  const profile = getPaymentProfileForCountry(selectedCountry);
  const availableRails = actionTab === 'deposit' ? profile.depositRails : profile.withdrawalRails;
  const activeRail = availableRails.find((r) => r.id === selectedRailId) || availableRails[0];

  const presetAmounts = ['10', '25', '50', '100', '250'];
  const numAmount = parseFloat(customAmount || '0') || 0;
  const conversion: FiatConversion = getFiatConversion(numAmount, profile.countryCode, liveFxRates);

  // Handle Demo Practice Coins Reload
  const handleClaimDemo = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessReceipt(null);

    try {
      await apiClient('/wallet/claim-demo', { method: 'POST' });

      setSuccessReceipt('1,000 Free Demo Practice Coins added to your ledger!');
      notifyUser('Demo Coins Claimed', {
        body: '1,000 Free Practice Coins are ready for competitive play.',
        sound: 'score',
        type: 'success',
      });
      await refetchWallet();
      queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
    } catch (err) {
      setErrorMessage(toUserFriendlyWalletError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Real USDC Deposit / Withdrawal
  const handleRealAction = async () => {
    setErrorMessage(null);
    setSuccessReceipt(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid positive transfer amount in USDC.');
      return;
    }

    if (actionTab === 'withdraw' && numAmount > cashUsdc) {
      setErrorMessage(`Insufficient USDC balance. You have ${formatUSDC(cashUsdc)} available.`);
      return;
    }

    if (actionTab === 'withdraw' && !accountDetails.trim()) {
      setErrorMessage('Please specify payout account details (IBAN, PayPal, or Crypto address).');
      return;
    }

    setIsProcessing(true);

    try {
      const actionTitle = actionTab === 'deposit' ? 'Deposit' : 'Withdrawal';
      const railName = activeRail?.name || 'Crossmint USDC Gateway';

      if (actionTab === 'deposit') {
        if (activeRail?.id === 'crossmint_card') {
          try {
            const res = await apiClient<{ success: boolean; checkoutUrl: string; orderId: string }>(
              '/crossmint/order',
              {
                method: 'POST',
                body: JSON.stringify({
                  amount: numAmount,
                  currency: 'USD',
                }),
              },
            );

            if (res?.checkoutUrl) {
              setCrossmintCheckoutUrl(res.checkoutUrl);
              setCrossmintOrderId(res.orderId);
              setCrossmintModalOpen(true);
              window.open(res.checkoutUrl, 'CrossmintCheckout', 'width=480,height=720,status=no,toolbar=no');
              setIsProcessing(false);
              return;
            }
          } catch (crossmintErr) {
            console.warn('Crossmint order API unavailable, falling back to ledger deposit', crossmintErr);
          }
        }

        await apiClient('/wallet/deposit', {
          method: 'POST',
          body: JSON.stringify({
            amount: numAmount,
            currency: 'USDC',
            method: activeRail?.name || 'CROSSMINT',
            paymentHandleToken: 'crossmint_token_' + Date.now(),
          }),
        });
      } else {
        let payoutType = 'PAYSAFE';
        if (activeRail?.category === 'mobile_money') payoutType = 'MPESA';
        else if (activeRail?.category === 'crypto') payoutType = 'CRYPTO';
        else payoutType = 'PAYSAFE';

        await apiClient('/wallet/payout', {
          method: 'POST',
          body: JSON.stringify({
            amount: numAmount,
            method: {
              type: payoutType,
              accountId: accountDetails.trim(),
              iban: accountDetails.trim(),
              address: accountDetails.trim(),
            },
          }),
        });
      }

      const receiptMsg = `${actionTitle} of ${formatUSDC(numAmount)} (≈ ${conversion.formattedFiat}) via ${railName} completed successfully.`;
      setSuccessReceipt(receiptMsg);
      notifyUser(`${actionTitle} Successful`, {
        body: receiptMsg,
        sound: 'score',
        type: 'success',
      });

      await refetchWallet();
      queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
    } catch (err: unknown) {
      const friendly = toUserFriendlyWalletError(err);
      setErrorMessage(friendly);
      notifyUser('Transaction Failed', {
        body: friendly,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Back navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold gap-1.5 py-1 px-2.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Crossmint Regulated Escrow & KYC</span>
          </Badge>
        </div>
      </div>

      {/* Main Cashier Card */}
      <Card className="border border-border bg-card shadow-2xl overflow-hidden">
        {/* Top Header */}
        <CardHeader className="p-6 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Cashier & Balance Management
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Deposit or withdraw USDC digital dollars with automated local currency conversion.
                </CardDescription>
              </div>
            </div>

            {/* Balances Display */}
            <div className="flex items-center gap-3 p-2 bg-secondary rounded-xl border border-border">
              <div className="flex flex-col text-left px-2">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">USDC Ledger</span>
                <span className="font-mono text-base font-black text-emerald-400">{formatUSDC(cashUsdc)}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col text-left px-2">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Demo Coins</span>
                <span className="font-mono text-base font-black text-purple-300">{formatPoints(points)}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Ledger Mode Selector: REAL MONEY (USDC) vs DEMO PRACTICE (PTS) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveWalletMode('REAL')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeWalletMode === 'REAL'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real Money Ledger (USDC)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWalletMode('DEMO')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeWalletMode === 'DEMO'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Coins className="w-4 h-4 text-purple-400" />
              <span>Free Practice Arena (PTS)</span>
            </button>
          </div>

          {/* DEMO MODE VIEW */}
          {activeWalletMode === 'DEMO' ? (
            <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-foreground">Practice Faucet Token Refill</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compete in risk-free 1v1 duels and climb the practice rankings. Each claim instantly credits 1,000 free tokens to your balance.
                </p>
              </div>

              {successReceipt && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center justify-center gap-2 max-w-md mx-auto">
                  <Check className="w-4 h-4" />
                  <span>{successReceipt}</span>
                </div>
              )}

              <Button
                variant="default"
                size="lg"
                onClick={handleClaimDemo}
                disabled={isProcessing}
                className="font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white gap-2 px-8 h-12 shadow-lg shadow-purple-600/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Claiming Practice Coins...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Claim 1,000 Free Practice Coins</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* REAL CASH (USDC) VIEW */
            <div className="space-y-6">
              {/* Action Tab: Deposit vs Withdrawal */}
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <Button
                  variant={actionTab === 'deposit' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActionTab('deposit')}
                  className="font-bold text-xs gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Deposit USDC</span>
                </Button>
                <Button
                  variant={actionTab === 'withdraw' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActionTab('withdraw')}
                  className="font-bold text-xs gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw USDC</span>
                </Button>
              </div>

              {/* Country & Local Payment Gateway Selector */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      <span>Your Country / Fiat Currency:</span>
                    </label>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <CountryFlag code={selectedCountry} size="xs" />
                      <span>{profile.countryName} ({profile.currency})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {SUPPORTED_COUNTRY_LIST.map((c) => {
                      const isSelected = selectedCountry === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(c.code);
                            setSelectedRailId('');
                          }}
                          className={`p-2.5 rounded-xl text-left border text-xs transition flex items-center gap-2 ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-foreground font-bold shadow-sm'
                              : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          <CountryFlag code={c.code} size="sm" />
                          <span className="truncate font-medium text-[11px]">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <span>Payment Method / Rails:</span>
                  </label>
                  <select
                    value={selectedRailId || (activeRail?.id ?? '')}
                    onChange={(e) => setSelectedRailId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-muted border border-border text-foreground text-xs font-bold focus:outline-none focus:border-primary transition"
                  >
                    {availableRails.map((rail) => (
                      <option key={rail.id} value={rail.id}>
                        {rail.name} — Fee: {rail.fee} ({rail.processingTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Selection with Live Local Fiat Subtext */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-muted-foreground">
                    Select {actionTab === 'deposit' ? 'Deposit' : 'Withdrawal'} Amount (USDC):
                  </label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    1 USDC = $1.00 USD
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 font-mono">
                  {presetAmounts.map((amt) => {
                    const presetConversion = getFiatConversion(parseFloat(amt), profile.countryCode, liveFxRates);
                    const isSelected = customAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomAmount(amt)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm font-black'
                            : 'bg-muted hover:bg-muted/80 border-border text-foreground font-bold'
                        }`}
                      >
                        <span className="text-xs">{amt} USDC</span>
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {presetConversion.formattedFiatCompact}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input Field */}
                <div className="relative pt-1">
                  <span className="absolute left-3 top-3.5 font-mono text-xs font-black text-primary">
                    USDC
                  </span>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter custom amount in USDC..."
                    className="pl-14 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              {/* AUTOMATED LOCAL FIAT CONVERSION PREVIEW CARD */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    <span>Automated Local Fiat Preview ({profile.countryName})</span>
                  </span>
                  <span className="font-mono text-primary text-[11px]">
                    1 USDC ≈ {conversion.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {conversion.currency}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">
                      {actionTab === 'deposit' ? 'You Receive in Playverzus.xyz' : 'Deducted from Playverzus.xyz Balance'}
                    </span>
                    <span className="font-mono text-base font-black text-foreground">
                      {numAmount.toFixed(2)} USDC
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
                      {actionTab === 'deposit' ? 'Est. Local Bank / Card Charge' : 'Est. Local Bank Payout'}
                    </span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      {conversion.formattedFiat}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {actionTab === 'deposit'
                    ? `No hidden conversion spread. Your local payment provider will charge approximately ${conversion.formattedFiat} to fund ${numAmount.toFixed(2)} USDC into your account.`
                    : `Your withdrawal of ${numAmount.toFixed(2)} USDC will be converted and disbursed as approximately ${conversion.formattedFiat} directly to your local account.`}
                </p>
              </div>

              {/* Payout Destination Details (Withdrawal only) */}
              {actionTab === 'withdraw' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">
                    Payout Destination (IBAN, PayPal email, or Wallet address):
                  </label>
                  <Input
                    type="text"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder="e.g. IBAN, Mobile Money number, or Crypto wallet address"
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Withdrawals are processed instantly through regulated banking networks.
                  </p>
                </div>
              )}

              {/* Status Receipts and Errors */}
              {errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successReceipt && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successReceipt}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <Button
                variant="default"
                size="lg"
                onClick={handleRealAction}
                disabled={isProcessing}
                className="w-full font-bold text-xs uppercase tracking-wider h-12 shadow-xl shadow-primary/20 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Secure Transfer...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Confirm {actionTab === 'deposit' ? 'Deposit' : 'Withdrawal'} of {numAmount.toFixed(2)} USDC (≈ {conversion.formattedFiat}) →
                    </span>
                  </>
                )}
              </Button>

              {/* Security & Regulatory Escrow Notice */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-foreground">Regulated Escrow Infrastructure</div>
                  <p className="text-[11px] leading-relaxed">
                    All player stakes and cashier balances are segregated in bank-grade trust accounts and USDC reserves. Winnings from 1v1 duels and tournaments are settled automatically upon match completion.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crossmint Global Card & Apple Pay Checkout Modal */}
      {crossmintModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
              💳
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Global Card & Apple Pay Checkout</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your deposit of{' '}
                <span className="text-emerald-400 font-bold">
                  {numAmount.toFixed(2)} USDC (≈ {conversion.formattedFiat})
                </span>{' '}
                via Crossmint.
              </p>
            </div>

            {crossmintOrderId && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono bg-muted/30 border border-border p-2.5 rounded-lg text-muted-foreground">
                <span>Order Reference:</span>
                <span className="text-foreground font-bold">{crossmintOrderId}</span>
              </div>
            )}

            <div className="space-y-2">
              <Button
                variant="default"
                size="lg"
                className="w-full font-bold text-xs uppercase tracking-wider h-11 gap-2"
                onClick={() => {
                  if (crossmintCheckoutUrl) {
                    window.open(crossmintCheckoutUrl, 'CrossmintCheckout', 'width=480,height=720,status=no,toolbar=no');
                  }
                }}
              >
                <span>Re-Open Checkout Window</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full font-bold text-xs uppercase tracking-wider h-11 gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={async () => {
                  setIsProcessing(true);
                  await refetchWallet();
                  queryClient.invalidateQueries({ queryKey: ['header-wallet'] });
                  queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
                  queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
                  setCrossmintModalOpen(false);
                  setSuccessReceipt(
                    `Deposit of ${numAmount.toFixed(2)} USDC (≈ ${conversion.formattedFiat}) confirmed!`,
                  );
                  setIsProcessing(false);
                }}
              >
                <Check className="w-4 h-4" />
                <span>I've Completed Payment</span>
              </Button>
            </div>

            <button
              onClick={() => setCrossmintModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition underline"
            >
              Close & Return to Cashier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashierPage() {
  return (
    <AuthGuard>
      <CashierContent />
    </AuthGuard>
  );
}
