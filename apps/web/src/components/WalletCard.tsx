'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { formatEUR, formatPoints } from '../lib/currency';
import { notifyUser } from '../lib/notifications';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent } from './ui/card';
import { Separator } from './ui/separator';

interface WalletData {
  balance: number;
  locked: number;
  currency: string;
  cashEur?: number;
  lockedCashEur?: number;
}

interface TransactionItem {
  id: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export function WalletCard() {
  const [faucetLoading, setFaucetLoading] = useState(false);

  const { data: balanceData, isLoading: loadingBalance, refetch: refetchBalance } = useQuery<WalletData>({
    queryKey: ['wallet-balance'],
    queryFn: () => apiClient<WalletData>('/wallet/balance'),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<TransactionItem[]>({
    queryKey: ['wallet-history'],
    queryFn: () => apiClient<TransactionItem[]>('/wallet/history?limit=5'),
  });

  const handleClaimFaucet = async () => {
    setFaucetLoading(true);
    try {
      await apiClient('/wallet/faucet', { method: 'POST' });
      notifyUser('Demo Funds Claimed! +1,000 PTS', {
        body: 'Demo play points added to your account for free tournament entries.',
        sound: 'score',
        type: 'success',
      });
      refetchBalance();
      refetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notifyUser('Faucet Request Failed', {
        body: msg,
        sound: 'score',
        type: 'error',
      });
    } finally {
      setFaucetLoading(false);
    }
  };

  const cashBalance = balanceData?.cashEur ?? 0.0;
  const lockedCash = balanceData?.lockedCashEur ?? 0.0;
  const pointsBalance = balanceData?.balance ?? 0;
  const lockedPoints = balanceData?.locked ?? 0;

  return (
    <>
      <Card className="p-4 sm:p-5 bg-card border-border shadow-xl space-y-4 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
                Competitive Ledger
              </h2>
              <Badge variant="success" className="font-mono text-[9px]">
                € EUR
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct smart escrow for cash duels and tournament cups.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <Link href="/cashier?tab=deposit">
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold"
              >
                + Deposit €
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClaimFaucet}
              disabled={faucetLoading}
              className="text-xs font-bold"
            >
              {faucetLoading ? 'Claiming...' : '🚰 +1,000 PTS'}
            </Button>
          </div>
        </div>

        {/* Dual Balances Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Cash Balance */}
          <div className="p-3.5 bg-secondary/70 rounded-xl border border-border flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">
                Cash Balance (€ EUR)
              </span>
              <Badge variant="success" className="text-[9px] font-mono">
                REAL CASH
              </Badge>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {loadingBalance ? '...' : formatEUR(cashBalance)}
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Locked in Escrow:</span>
              <span className="text-foreground font-bold">{formatEUR(lockedCash)}</span>
            </div>
          </div>

          {/* Points Balance */}
          <div className="p-3.5 bg-secondary/70 rounded-xl border border-border flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">
                Demo Play (PTS)
              </span>
              <Badge variant="copper" className="text-[9px] font-mono">
                FREE PLAY
              </Badge>
            </div>
            <div className="text-2xl font-black font-mono text-accent-400">
              {loadingBalance ? '...' : formatPoints(pointsBalance)}
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Locked in Tourneys:</span>
              <span className="text-foreground font-bold">{formatPoints(lockedPoints)}</span>
            </div>
          </div>
        </div>

        {/* Recent Ledger History */}
        {historyData && historyData.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground font-bold font-mono tracking-wider">
                Recent Ledger
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">5 Records</span>
            </div>

            <div className="divide-y divide-border bg-secondary/50 rounded-xl p-2 border border-border overflow-hidden">
              {historyData.map((tx) => (
                <div key={tx.id} className="py-2 px-1 flex justify-between items-center text-xs min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold capitalize text-foreground truncate text-xs">
                      {tx.reason.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div
                    className={`font-mono font-bold text-xs flex-shrink-0 ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} PTS
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
