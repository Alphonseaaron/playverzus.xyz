'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import {
  SUPPORTED_COUNTRY_LIST,
  getPaymentProfileForCountry,
  type PaymentRail,
} from '../lib/paymentMethods';
import { notifyUser } from '../lib/notifications';
import { toUserFriendlyWalletError } from '../lib/walletErrors';
import { useWalletModeStore, type WalletMode } from '../lib/walletModeStore';
import { apiClient } from '../lib/api';
import { formatEUR, formatPoints } from '../lib/currency';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
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

  if (!open) return null;

  const profile = getPaymentProfileForCountry(selectedCountry);
  const availableRails = actionTab === 'deposit' ? profile.depositRails : profile.withdrawalRails;
  const activeRail = availableRails.find((r) => r.id === selectedRailId) || availableRails[0];

  const presetAmounts = actionTab === 'deposit'
    ? ['10', '25', '50', '100', '250']
    : ['10', '25', '50', '100', '250'];

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

  // Handle Real Cash Deposit / Withdrawal via Paysafe
  const handleRealAction = async () => {
    setErrorMessage(null);
    setSuccessReceipt(null);

    const numAmount = parseFloat(customAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (actionTab === 'deposit' && numAmount < 5) {
      setErrorMessage('The minimum deposit threshold is €5.00.');
      return;
    }

    if (actionTab === 'withdraw') {
      if (numAmount < 10) {
        setErrorMessage('The minimum withdrawal threshold is €10.00.');
        return;
      }
      if (numAmount > userBalanceEur) {
        setErrorMessage(`Your available cash balance is €${userBalanceEur.toFixed(2)}. Please enter an amount within this limit.`);
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
      const railName = activeRail?.name || 'Paysafe Gateway';

      if (actionTab === 'deposit') {
        await apiClient('/wallet/deposit', {
          method: 'POST',
          body: JSON.stringify({
            amount: numAmount,
            currency: profile.currency || 'EUR',
            method: activeRail?.name || 'PAYSAFE',
            paymentHandleToken: 'paysafe_token_' + Date.now(),
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

      const receiptMsg = `${actionTitle} of ${profile.currencySymbol}${numAmount.toFixed(2)} via ${railName} completed successfully.`;
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
        {/* Top Header (Sticky / Non-collapsing) */}
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
                Manage your real money ledger or free practice tokens with instant bank-grade escrow.
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

        {/* Ledger Mode Selector: REAL MONEY (€ EUR) vs DEMO PRACTICE (PTS) */}
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
            <span>Real Money Ledger (€ EUR)</span>
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

        {/* VIEW A: REAL MONEY PAYSFE LEDGER */}
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
                <span>Deposit Funds (Min €5)</span>
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
                <span>Withdraw Cash (Min €10)</span>
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

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                            Min: {profile.currencySymbol}{rail.minAmount} · Max: {profile.currencySymbol}{rail.maxAmount}
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

            {/* Amount Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {actionTab === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'} ({profile.currency}):
                </span>
                {actionTab === 'withdraw' && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Available: <span className="text-emerald-400 font-bold">€{userBalanceEur.toFixed(2)}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={customAmount === preset ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setCustomAmount(preset)}
                    className="flex-1 font-mono text-xs"
                  >
                    {profile.currencySymbol}{preset}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-mono font-bold text-muted-foreground text-sm">
                  {profile.currencySymbol}
                </span>
                <Input
                  type="number"
                  min={actionTab === 'deposit' ? '5' : '10'}
                  max="5000"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-9 font-mono font-bold text-base h-10 bg-background"
                  placeholder={actionTab === 'deposit' ? 'Min €5.00' : 'Min €10.00'}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>
                  {actionTab === 'deposit'
                    ? 'Minimum deposit: €5.00 · Maximum: €5,000.00'
                    : 'Minimum withdrawal: €10.00 · Maximum: €5,000.00'}
                </span>
                <span className="font-mono">
                  {actionTab === 'withdraw'
                    ? `Available: €${userBalanceEur.toFixed(2)}`
                    : 'Instant Credit'}
                </span>
              </div>
            </div>

            {/* Destination details for withdrawal */}
            {actionTab === 'withdraw' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  {activeRail?.category === 'mobile_money'
                    ? 'Mobile Money Phone Number (e.g. +254 7XX XXX XXX)'
                    : activeRail?.category === 'crypto'
                    ? 'Crypto Wallet Address (USDT / Polygon)'
                    : 'Recipient IBAN or Bank Account Number'}
                </label>
                <Input
                  type="text"
                  placeholder={
                    activeRail?.category === 'mobile_money'
                      ? '+254 712 345 678'
                      : activeRail?.category === 'crypto'
                      ? '0x... or T...'
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
                <span>Paysafe Sandbox Certified · 0% Platform Surcharge</span>
              </div>
              <span className="font-mono text-[10px] text-foreground font-semibold">
                Speed: {activeRail?.processingTime || 'Instant'}
              </span>
            </div>

            {/* Main Action CTA */}
            <Button
              onClick={handleRealAction}
              disabled={isProcessing}
              className="w-full h-11 font-bold text-sm uppercase tracking-wider shadow-md"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authorizing Transaction...
                </span>
              ) : (
                `${actionTab === 'deposit' ? 'Confirm Deposit' : 'Request Payout'} of ${profile.currencySymbol}${customAmount}`
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
                  {formatPoints(userBalancePoints)} <span className="text-xs font-sans text-muted-foreground">PTS</span>
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
    </div>
  );
}
