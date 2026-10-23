'use client';

import { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Globe,
  CreditCard,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  X,
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
} from '../lib/paymentMethods';
import { notifyUser } from '../lib/notifications';
import { toUserFriendlyWalletError } from '../lib/walletErrors';
import { useWalletModeStore } from '../lib/walletModeStore';
import { apiClient } from '../lib/api';
import {
  formatUSDC,
  formatPoints,
  getFiatConversion,
  fetchLiveFxRates,
  type FiatConversion,
} from '../lib/currency';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CountryFlag } from './CountryFlag';

interface CashierModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'deposit' | 'withdraw';
  countryCode?: string;
  userBalanceEur?: number;
  userBalancePoints?: number;
  onSuccess?: () => void;
}

export function CashierModal({
  open,
  onClose,
  initialMode = 'deposit',
  countryCode = 'DE',
  userBalanceEur = 0,
  userBalancePoints = 1000,
  onSuccess,
}: CashierModalProps) {
  const { mode: activeWalletMode, setMode: setActiveWalletMode } = useWalletModeStore();
  const [actionTab, setActionTab] = useState<'deposit' | 'withdraw'>(initialMode);
  const [selectedCountry, setSelectedCountry] = useState<string>(countryCode);
  const [selectedRailId, setSelectedRailId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('25');
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);

  // Live Exchange Rates
  const [liveFxRates, setLiveFxRates] = useState<Record<string, number> | undefined>(undefined);

  // Crossmint Checkout Modal State
  const [crossmintCheckoutUrl, setCrossmintCheckoutUrl] = useState<string | null>(null);
  const [crossmintOrderId, setCrossmintOrderId] = useState<string | null>(null);
  const [crossmintModalOpen, setCrossmintModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchLiveFxRates().then((rates) => {
      if (isMounted) setLiveFxRates(rates);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!open) return null;

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
      if (onSuccess) onSuccess();
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
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (actionTab === 'deposit' && numAmount < 5) {
      setErrorMessage('The minimum deposit threshold is 5.00 USDC.');
      return;
    }

    if (actionTab === 'withdraw') {
      if (numAmount < 10) {
        setErrorMessage('The minimum withdrawal threshold is 10.00 USDC.');
        return;
      }
      if (numAmount > userBalanceEur) {
        setErrorMessage(
          `Your available balance is ${formatUSDC(userBalanceEur)}. Please enter an amount within this limit.`,
        );
        return;
      }
      if (!accountDetails.trim()) {
        setErrorMessage('Please provide destination bank IBAN, account number, or payout address.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const actionTitle = actionTab === 'deposit' ? 'Deposit' : 'Withdrawal';
      const railName = activeRail?.name || 'Payment Gateway';

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
        let payoutType = 'CROSSMINT';
        if (activeRail?.category === 'mobile_money') payoutType = 'MPESA';
        else if (activeRail?.category === 'crypto') payoutType = 'CRYPTO';
        else payoutType = 'CROSSMINT';

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

      if (onSuccess) onSuccess();
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center animate-in fade-in duration-150"
    >
      <div className="w-full max-w-3xl my-4 sm:my-8 bg-card border border-border rounded-2xl text-foreground flex flex-col shadow-2xl relative max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border bg-card flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Cashier & Balance Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deposit or withdraw USDC with automated local currency conversion.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close cashier modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin flex flex-col gap-6 flex-1">
          {/* Ledger Mode Selector: REAL MONEY (USDC) vs DEMO PRACTICE (PTS) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => {
                setActiveWalletMode('REAL');
                setErrorMessage(null);
                setSuccessReceipt(null);
              }}
              className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                activeWalletMode === 'REAL'
                  ? 'bg-card text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real Money Ledger (USDC)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveWalletMode('DEMO');
                setErrorMessage(null);
                setSuccessReceipt(null);
              }}
              className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                activeWalletMode === 'DEMO'
                  ? 'bg-card text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Practice Demo Ledger (PTS)</span>
            </button>
          </div>

          {/* Error Alert Display */}
          {errorMessage && (
            <div className="p-3.5 bg-destructive/15 border border-destructive/40 rounded-xl flex items-start gap-3 text-xs text-destructive animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Alert Display */}
          {successReceipt && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-3 text-xs text-emerald-400 animate-in fade-in">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successReceipt}</div>
            </div>
          )}

          {/* VIEW A: REAL MONEY (USDC) */}
          {activeWalletMode === 'REAL' ? (
            <div className="space-y-6">
              {/* Deposit vs Withdraw Sub-tabs */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={actionTab === 'deposit' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setActionTab('deposit');
                    setErrorMessage(null);
                    setSuccessReceipt(null);
                  }}
                  className="flex-1 font-bold text-xs gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Deposit USDC (Min 5)</span>
                </Button>
                <Button
                  type="button"
                  variant={actionTab === 'withdraw' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setActionTab('withdraw');
                    setErrorMessage(null);
                    setSuccessReceipt(null);
                  }}
                  className="flex-1 font-bold text-xs gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw USDC (Min 10)</span>
                </Button>
              </div>

              {/* Country Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" /> Region & Banking Rails:
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <span>Current:</span>
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
                        onClick={() => setSelectedCountry(c.code)}
                        className={`p-2.5 rounded-lg text-left border text-xs transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm'
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

              {/* Payment Method Rails */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Select {actionTab === 'deposit' ? 'Deposit' : 'Withdrawal'} Gateway:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableRails.map((rail) => {
                    const isSelected = activeRail ? activeRail.id === rail.id : false;

                    return (
                      <button
                        key={rail.id}
                        type="button"
                        onClick={() => setSelectedRailId(rail.id)}
                        className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between ${
                          isSelected
                            ? 'bg-primary/10 border-primary ring-1 ring-primary/40 shadow-sm'
                            : 'bg-card hover:bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{rail.icon}</span>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">{rail.name}</span>
                              {rail.fee && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-primary border-primary/30">
                                  {rail.fee} FEE
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{rail.description}</p>
                            <span className="text-[10px] text-muted-foreground/80 font-mono block">
                              Min: {rail.minAmount} · Max: {rail.maxAmount}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-black flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Selection with Live Local Fiat Subtext */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {actionTab === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'} (USDC):
                  </span>
                  {actionTab === 'withdraw' && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Available: <span className="text-emerald-400 font-bold">{formatUSDC(userBalanceEur)}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2 font-mono">
                  {presetAmounts.map((preset) => {
                    const presetConversion = getFiatConversion(parseFloat(preset), profile.countryCode, liveFxRates);
                    const isSelected = customAmount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomAmount(preset)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm font-black'
                            : 'bg-muted hover:bg-muted/80 border-border text-foreground font-bold'
                        }`}
                      >
                        <span className="text-xs">{preset} USDC</span>
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

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono font-black text-primary text-xs">
                    USDC
                  </span>
                  <Input
                    type="number"
                    min={actionTab === 'deposit' ? '5' : '10'}
                    max="5000"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-14 font-mono font-bold text-base h-10 bg-background"
                    placeholder={actionTab === 'deposit' ? 'Min 5.00 USDC' : 'Min 10.00 USDC'}
                  />
                </div>

                {/* AUTOMATED LOCAL FIAT CONVERSION PREVIEW CARD */}
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      <span>Local Fiat Preview ({profile.countryName})</span>
                    </span>
                    <span className="font-mono text-primary text-[11px]">
                      1 USDC ≈ {conversion.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      {conversion.currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block font-bold">
                        {actionTab === 'deposit' ? 'You Receive in Playverzus.xyz' : 'Deducted from Playverzus.xyz Balance'}
                      </span>
                      <span className="font-mono text-sm font-black text-foreground">
                        {numAmount.toFixed(2)} USDC
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
                        {actionTab === 'deposit' ? 'Est. Local Bank / Card Charge' : 'Est. Local Bank Payout'}
                      </span>
                      <span className="font-mono text-sm font-black text-emerald-400">
                        {conversion.formattedFiat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination details for withdrawal */}
              {actionTab === 'withdraw' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    {activeRail?.category === 'mobile_money'
                      ? 'Mobile Money Phone Number (e.g. +254 7XX XXX XXX)'
                      : activeRail?.category === 'crypto'
                      ? 'Crypto Wallet Address (USDC / Solana / Base)'
                      : 'Recipient IBAN or Bank Account Number'}
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      activeRail?.category === 'mobile_money'
                        ? '+254 712 345 678'
                        : activeRail?.category === 'crypto'
                        ? '0x... or Solana wallet address'
                        : 'DE89 3704 0044 0532 0130 00'
                    }
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    className="font-mono text-xs h-10 bg-background"
                  />
                </div>
              )}

              {/* Escrow Guarantee Strip */}
              <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Segregated USDC Escrow · 0% Platform Spread</span>
                </div>
                <span className="font-mono text-[10px] text-foreground font-semibold">
                  Speed: {activeRail?.processingTime || 'Instant'}
                </span>
              </div>

              {/* Main Action CTA */}
              <Button
                onClick={handleRealAction}
                disabled={isProcessing}
                className="w-full h-11 font-bold text-xs uppercase tracking-wider shadow-md gap-2"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authorizing Transaction...
                  </span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Confirm {actionTab === 'deposit' ? 'Deposit' : 'Withdrawal'} of {numAmount.toFixed(2)} USDC (≈ {conversion.formattedFiat}) →
                    </span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* VIEW B: DEMO PRACTICE COINS LEDGER */
            <div className="space-y-6 py-2">
              <div className="p-6 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center shadow-inner">
                  <Coins className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-lg font-bold text-foreground">Free Practice Tokens</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Practice tokens let you experience 1v1 duels, automated match verification, and ladder progression with zero real money risk.
                  </p>
                </div>

                <div className="p-3 px-6 rounded-xl bg-card border border-border mt-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                    Current Practice Balance
                  </span>
                  <span className="text-2xl font-black font-mono text-purple-300">
                    {formatPoints(userBalancePoints)}
                  </span>
                </div>
              </div>

              {/* 1-Click Reload Button */}
              <Button
                onClick={handleClaimDemo}
                disabled={isProcessing}
                className="w-full h-12 font-bold text-sm uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-lg gap-2"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Crediting Practice Coins...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Claim 1,000 Free Practice Coins
                  </span>
                )}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>You can claim free practice coins anytime to test your competitive strategies.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crossmint Global Card & Apple Pay Checkout Modal */}
      {crossmintModalOpen && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
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
                  if (onSuccess) onSuccess();
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
              Close & Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
