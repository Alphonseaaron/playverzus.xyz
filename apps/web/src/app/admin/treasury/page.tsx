'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { formatEUR, formatPoints } from '../../../lib/currency';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Landmark,
  Server,
  Cpu,
  Zap,
  Sparkles,
  Lightbulb,
  Layers,
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  Vault,
  Coins,
  Receipt,
  Calculator,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface DiscrepancyItem {
  userId: string;
  username: string;
  walletBalance: number;
  ledgerSum: number;
  difference: number;
  issue: string;
}

interface IncomeBookItem {
  id: string;
  name: string;
  category: string;
  grossVolumeEur: number;
  netRevenueEur: number;
  takeRatePercent: number;
  marginPercent: number;
  status: string;
  description: string;
}

interface ExpenseBillItem {
  service: string;
  provider: string;
  category: string;
  monthlyCostEur: number;
  billingCycle: string;
  status: 'ACTIVE' | 'WARNING' | 'CRITICAL';
  autoRenew: boolean;
  description: string;
}

interface ExpenseTracker {
  totalMonthlyInfraBurnEur: number;
  calculatedRunwayDays: number;
  runwayStatus: 'OPTIMAL' | 'HEALTHY' | 'WARNING';
  bills: ExpenseBillItem[];
}

interface CompanyLimits {
  minimumOperationalReserveEur: number;
  maxCompanyWithdrawalEur: number;
  operatingRunwayDays: number;
}

interface FinancialAdvisor {
  solvencyGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
  financialHealthSummary: string;
  spendOptimizations: string[];
  growthStrategies: string[];
  executiveActionPlan: string;
}

interface TreasuryReport {
  incomeBooks?: IncomeBookItem[];
  expenseTracker?: ExpenseTracker;
  companyLimits?: CompanyLimits;
  advisor?: FinancialAdvisor;
  grossCashEur: number;
  playerLiabilitiesEur: number;
  playerAvailableEur: number;
  activeEscrowEur: number;
  netRetainedEarningsEur: number;
  demoPointsTotal: number;
  demoPointsLocked: number;
  reserveRatioPercent: number;
  solvencyStatus: 'HEALTHY' | 'ADEQUATE' | 'DEFICIT';
  recommendations: {
    safeWithdrawableEur: number;
    recommendedReserveEur: number;
    operationalBufferEur: number;
    estimatedExpensesEur: {
      gatewayFeesEstimate: number;
      serverInfraEstimate: number;
      chargebackReserveEstimate: number;
      totalEstimatedExpensesEur: number;
    };
    advisoryText: string;
    actionType: 'WITHDRAW_SURPLUS' | 'MAINTAIN_RESERVE' | 'INJECT_CAPITAL';
  };
  audit: {
    status: 'CLEARED' | 'WARNING';
    totalWalletsAudited: number;
    discrepancyCount: number;
    discrepancies: DiscrepancyItem[];
    lastAuditedAt: string;
    totalCreditsEur: number;
    totalDebitsEur: number;
    netLedgerChangeEur: number;
  };
  limits: {
    minDepositEur: number;
    maxDepositEur: number;
    minWithdrawalEur: number;
    maxWithdrawalEur: number;
  };
}

export default function AdminTreasuryPage() {
  const { data: treasury, isLoading, refetch, isFetching } = useQuery<TreasuryReport>({
    queryKey: ['admin-treasury-report'],
    queryFn: () => apiClient<TreasuryReport>('/admin/treasury'),
    staleTime: 15000,
  });

  const report = treasury ?? {
    grossCashEur: 0,
    playerLiabilitiesEur: 0,
    playerAvailableEur: 0,
    activeEscrowEur: 0,
    netRetainedEarningsEur: 0,
    demoPointsTotal: 0,
    demoPointsLocked: 0,
    reserveRatioPercent: 100,
    solvencyStatus: 'HEALTHY' as const,
    recommendations: {
      safeWithdrawableEur: 0,
      recommendedReserveEur: 0,
      operationalBufferEur: 0,
      estimatedExpensesEur: {
        gatewayFeesEstimate: 0,
        serverInfraEstimate: 120,
        chargebackReserveEstimate: 0,
        totalEstimatedExpensesEur: 120,
      },
      advisoryText: 'Evaluating operational ledger and reserve balances...',
      actionType: 'MAINTAIN_RESERVE' as const,
    },
    audit: {
      status: 'CLEARED' as const,
      totalWalletsAudited: 0,
      discrepancyCount: 0,
      discrepancies: [],
      lastAuditedAt: new Date().toISOString(),
      totalCreditsEur: 0,
      totalDebitsEur: 0,
      netLedgerChangeEur: 0,
    },
    limits: {
      minDepositEur: 5.0,
      maxDepositEur: 5000.0,
      minWithdrawalEur: 10.0,
      maxWithdrawalEur: 5000.0,
    },
  };

  return (
    <div className="space-y-8 min-w-0 pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 bg-card border border-border rounded-3xl shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary flex-shrink-0 shadow-inner">
            <Landmark className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="copper">CPA TREASURY & ACCOUNTANCY</Badge>
              <Badge
                variant={
                  report.solvencyStatus === 'HEALTHY'
                    ? 'success'
                    : report.solvencyStatus === 'ADEQUATE'
                    ? 'warning'
                    : 'destructive'
                }
                className="font-mono text-[10px]"
              >
                SOLVENCY: {report.solvencyStatus} ({report.reserveRatioPercent}% RESERVE)
              </Badge>
              <Badge
                variant={report.audit.status === 'CLEARED' ? 'outline' : 'destructive'}
                className="font-mono text-[10px]"
              >
                AUDIT: {report.audit.discrepancyCount} DISCREPANCIES
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
              Treasury & Financial Solvency Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Segregated client custodial asset accounting, liquidity forecasting, safe business dividend recommendations, and double-entry reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="font-bold text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Auditing Ledger...' : 'Run Audit'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Primary Financial Balance Sheet Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Cash Asset */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
                Gross Merchant Liquidity
              </CardDescription>
              <Vault className="w-4 h-4 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {isLoading ? '...' : formatEUR(report.grossCashEur)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <span className="text-[11px] text-muted-foreground block">
              Total liquid assets in Paysafe merchant account & banking rails.
            </span>
          </CardContent>
        </Card>

        {/* Custodial Player Liabilities */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
                Segregated Player Funds
              </CardDescription>
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {isLoading ? '...' : formatEUR(report.playerLiabilitiesEur)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Available Cash:</span>
              <span className="font-mono text-foreground">{formatEUR(report.playerAvailableEur)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Active Duel Escrows:</span>
              <span className="font-mono text-primary font-bold">{formatEUR(report.activeEscrowEur)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Retained Earnings */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
                Net Platform Equity
              </CardDescription>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-foreground">
              {isLoading ? '...' : formatEUR(report.netRetainedEarningsEur)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <span className="text-[11px] text-muted-foreground block">
              Unencumbered platform earnings from match commissions & sponsor margins.
            </span>
          </CardContent>
        </Card>

        {/* Reserve Ratio & Solvency Index */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider font-mono">
                Reserve Coverage Ratio
              </CardDescription>
              <Percent className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-primary">
              {isLoading ? '...' : `${report.reserveRatioPercent}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <span className="text-[11px] text-muted-foreground block">
              Target minimum: 120% coverage to protect against high withdrawal waves.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. CPA FINANCIAL ADVISORY: WHAT TO WITHDRAW VS. WHAT TO KEEP */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">
                CPA Treasury Advisory: Distribution vs. Reserve Buffer
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time calculation of safe business dividends versus required regulatory and operating reserves.
            </p>
          </div>

          <Badge variant={report.recommendations.safeWithdrawableEur > 0 ? 'success' : 'warning'}>
            {report.recommendations.actionType === 'WITHDRAW_SURPLUS'
              ? 'SURPLUS CAPITAL AVAILABLE'
              : 'MAINTAIN 100% CAPITAL IN VAULT'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: What Amount is Best to Withdraw */}
          <div className="p-6 rounded-2xl bg-secondary/40 border border-border flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  Recommended Maximum Withdrawal (Owner Dividend)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  SOLVENT SURPLUS
                </Badge>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                {formatEUR(report.recommendations.safeWithdrawableEur)}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                This is the net surplus capital above the 120% target reserve ratio. Withdrawing this amount preserves 100% full coverage of all player liabilities and operating expenses.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1.5">
              <span className="font-bold text-foreground block">Accountant&rsquo;s Directive:</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {report.recommendations.advisoryText}
              </p>
            </div>
          </div>

          {/* Card B: What Amount is Best to Keep for Future Expenses */}
          <div className="p-6 rounded-2xl bg-secondary/40 border border-border flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Vault className="w-4 h-4 text-amber-400" />
                  Mandatory Capital to Retain in Reserve
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  MINIMUM RESERVE
                </Badge>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
                {formatEUR(report.recommendations.recommendedReserveEur)}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Total liquidity required to ensure 100% solvency across player balances, active match locks, and projected monthly operational obligations.
              </p>
            </div>

            {/* Breakdown of Retained Capital */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">1. Segregated Player Balances & Escrows:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatEUR(report.playerLiabilitiesEur)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">2. 30-Day Withdrawal Surge Buffer (15%):</span>
                <span className="font-mono font-bold text-foreground">
                  {formatEUR(report.recommendations.operationalBufferEur)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">3. Estimated Gateway Interchange & Processing:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatEUR(report.recommendations.estimatedExpensesEur.gatewayFeesEstimate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">4. Cloud Infrastructure & Match Verification Engine:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatEUR(report.recommendations.estimatedExpensesEur.serverInfraEstimate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">5. Chargeback & Dispute Contingency:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatEUR(report.recommendations.estimatedExpensesEur.chargebackReserveEstimate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. ESTABLISHED DEPOSIT & WITHDRAWAL THRESHOLDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-foreground">
                Deposit Limits & Minimums
              </h3>
            </div>
            <Badge variant="copper" className="font-mono text-[10px]">
              ESTABLISHED
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Minimum Deposit Threshold:</span>
              <span className="font-mono font-black text-sm text-emerald-400">
                {formatEUR(report.limits.minDepositEur)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Maximum Single Deposit Limit:</span>
              <span className="font-mono font-black text-sm text-foreground">
                {formatEUR(report.limits.maxDepositEur)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The €5.00 floor protects merchant margins from being consumed by Paysafe fixed transaction fees (€0.25 + 1.8%). Maximum €5,000.00 prevents unverified velocity abuse under AML standards.
          </p>
        </Card>

        <Card className="p-6 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-sm text-foreground">
                Withdrawal Limits & Minimums
              </h3>
            </div>
            <Badge variant="copper" className="font-mono text-[10px]">
              ESTABLISHED
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Minimum Withdrawal Threshold:</span>
              <span className="font-mono font-black text-sm text-primary">
                {formatEUR(report.limits.minWithdrawalEur)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <span className="text-xs text-muted-foreground">Maximum Single Withdrawal Limit:</span>
              <span className="font-mono font-black text-sm text-foreground">
                {formatEUR(report.limits.maxWithdrawalEur)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The €10.00 payout floor eliminates micro-payout bank transmission fees and ensures all payout requests have sufficient cleared funds. Daily limits above €5,000 require manual compliance audit.
          </p>
        </Card>
      </div>

      {/* 5. DOUBLE-ENTRY LEDGER RECONCILIATION & ANOMALY DETECTOR */}
      <Card className="p-6 sm:p-8 bg-card border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">
                Ledger Reconciliation & Misconfigured Balance Detector
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Automated double-entry verification comparing current user wallet balances against historical cryptographically signed transactions.
            </p>
          </div>

          <Badge
            variant={report.audit.discrepancyCount === 0 ? 'success' : 'destructive'}
            className="flex items-center gap-1.5"
          >
            {report.audit.discrepancyCount === 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ALL BALANCES RECONCILED (0 ANOMALIES)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{report.audit.discrepancyCount} MISCONFIGURED BALANCES DETECTED</span>
              </>
            )}
          </Badge>
        </div>

        {/* Double-Entry Verification Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-secondary/40 border border-border">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
              Total Inbound Credits (Deposits & Winnings)
            </span>
            <span className="font-mono font-bold text-emerald-400 text-lg">
              {formatEUR(report.audit.totalCreditsEur)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-secondary/40 border border-border">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
              Total Outbound Debits (Payouts & Fees)
            </span>
            <span className="font-mono font-bold text-amber-400 text-lg">
              {formatEUR(report.audit.totalDebitsEur)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-secondary/40 border border-border">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
              Net Ledger Movement (Delta)
            </span>
            <span className="font-mono font-bold text-foreground text-lg">
              {formatEUR(report.audit.netLedgerChangeEur)}
            </span>
          </div>
        </div>

        {/* Discrepancies Table / Clear Banner */}
        {report.audit.discrepancies.length > 0 ? (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-4">
            <div className="flex items-center gap-2 text-destructive font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Flagged User Balances Requiring Manual Correction</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-destructive/20 text-muted-foreground">
                    <th className="py-2 px-3">Player</th>
                    <th className="py-2 px-3">Wallet Record</th>
                    <th className="py-2 px-3">Transaction Sum</th>
                    <th className="py-2 px-3">Variance</th>
                    <th className="py-2 px-3">Diagnostic Note</th>
                  </tr>
                </thead>
                <tbody>
                  {report.audit.discrepancies.map((d) => (
                    <tr key={d.userId} className="border-b border-destructive/10">
                      <td className="py-2.5 px-3 font-bold text-foreground">@{d.username}</td>
                      <td className="py-2.5 px-3 font-mono">{formatEUR(d.walletBalance)}</td>
                      <td className="py-2.5 px-3 font-mono">{formatEUR(d.ledgerSum)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-destructive">
                        {formatEUR(d.difference)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{d.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-foreground block">
                  Zero Accounting Discrepancies Detected
                </span>
                <p className="text-xs text-muted-foreground">
                  All {report.audit.totalWalletsAudited} active user accounts and contest escrow locks reconcile 1:1 with transaction history. Zero floating point rounding drift or orphan locked funds found.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
              Audit Timestamp: {new Date(report.audit.lastAuditedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </Card>

      {/* 3. Overall Accounts Advisor & AI Financial Auditor */}
      {report.advisor && (
        <Card className="p-6 sm:p-8 bg-card border-border shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="copper">AI CHIEF FINANCIAL OFFICER</Badge>
                  <Badge
                    variant={
                      report.advisor.solvencyGrade === 'A+' || report.advisor.solvencyGrade === 'A'
                        ? 'success'
                        : 'warning'
                    }
                    className="font-mono text-xs font-black"
                  >
                    SOLVENCY GRADE: {report.advisor.solvencyGrade}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-black text-foreground">
                  Overall Accounts Advisor & Treasury Audit
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Autonomous financial intelligence on safe corporate withdrawals, cost cutting, and revenue acceleration.
                </CardDescription>
              </div>
            </div>

            <div className="p-3 bg-secondary/60 border border-border rounded-2xl flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px]">Operational Runway</span>
                <span className="font-mono font-bold text-foreground">
                  {report.companyLimits?.operatingRunwayDays || 90} Days Buffer
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spend Optimizations */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Spend Optimization & Cost Controls</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {report.advisor.spendOptimizations.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 mt-1.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Strategies */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Earning Opportunities & Revenue Expansion</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {report.advisor.growthStrategies.map((strat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 mt-1.5 flex-shrink-0" />
                    <span>{strat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Executive Action Banner */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3.5">
            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-xs font-medium text-foreground leading-relaxed">
              <strong>Executive Directive:</strong> {report.advisor.executiveActionPlan}
            </p>
          </div>
        </Card>
      )}

      {/* 4. Segregated Income Books (What Works vs What Doesn't) */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="copper">REVENUE SEGREGATION</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {report.incomeBooks?.length || 5} SEGREGATED BOOKS
              </Badge>
            </div>
            <CardTitle className="text-xl font-black text-foreground">
              Income Streams & Revenue Books
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Isolated profit-and-loss tracking to identify highest-performing gaming mechanics and ensure customer escrow remains 100% untouched.
            </CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(report.incomeBooks || []).map((book) => (
            <div
              key={book.id}
              className={`p-5 rounded-2xl border transition-all ${
                book.id === 'custodial_escrow'
                  ? 'bg-secondary/20 border-border opacity-85'
                  : 'bg-secondary/40 border-border hover:border-primary/40'
              } space-y-3 flex flex-col justify-between`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                    {book.category}
                  </span>
                  <Badge
                    variant={book.id === 'custodial_escrow' ? 'outline' : 'success'}
                    className="text-[9px] font-mono py-0.5 px-2"
                  >
                    {book.status}
                  </Badge>
                </div>

                <div className="font-bold text-sm text-foreground">{book.name}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">Gross Volume</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatEUR(book.grossVolumeEur)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {book.id === 'custodial_escrow' ? 'Custodial Hold' : 'Net Retained'}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      book.id === 'custodial_escrow' ? 'text-muted-foreground' : 'text-emerald-400'
                    }`}
                  >
                    {formatEUR(book.netRevenueEur)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 5. Operational Infrastructure & API Expense Tracker */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="copper">INFRASTRUCTURE EXPENSES</Badge>
              <Badge variant="success" className="font-mono text-[10px]">
                BURN: {formatEUR(report.expenseTracker?.totalMonthlyInfraBurnEur || 70.25)} / MO
              </Badge>
            </div>
            <CardTitle className="text-xl font-black text-foreground">
              Production API Keys & Server Bill Tracker
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Real-time monitoring of cloud compute, database, Redis cache, and payment gateway costs to guarantee timely bill settlement before credit depletion.
            </CardDescription>
          </div>

          <div className="p-3 bg-secondary rounded-xl border border-border flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">Total Fixed Burn</span>
              <span className="font-bold text-foreground text-sm">
                {formatEUR(report.expenseTracker?.totalMonthlyInfraBurnEur || 70.25)}/mo
              </span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Runway Status</span>
              <span className="font-bold text-emerald-400">
                {report.expenseTracker?.runwayStatus || 'OPTIMAL'}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Service / Key</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Monthly Cost</th>
                <th className="py-2.5 px-3">Billing Cycle</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(report.expenseTracker?.bills || []).map((bill, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3 font-bold text-foreground flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{bill.service}</span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">{bill.provider}</td>
                  <td className="py-3 px-3">
                    <Badge variant="secondary" className="font-mono text-[9px]">
                      {bill.category}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-foreground">
                    {formatEUR(bill.monthlyCostEur)}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground text-[11px] font-mono">
                    {bill.billingCycle}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                      {bill.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6. Company Withdrawal Governance & Operating Floor */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary flex-shrink-0 shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="copper">LIQUIDITY GOVERNANCE</Badge>
                <Badge variant="outline" className="font-mono text-[10px]">
                  STRICT OPERATING FLOOR
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-foreground">
                Corporate Distribution Ceiling & Minimum Reserve
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enforcing legal capital adequacy to prevent company over-withdrawal and guarantee ongoing operational solvency.
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Minimum Operating Cost Floor (Locked)
            </span>
            <span className="text-2xl font-black font-mono text-foreground">
              {formatEUR(report.companyLimits?.minimumOperationalReserveEur || 330.0)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Required 90-day operating buffer to ensure server infrastructure & payment services cannot be interrupted.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              100% Segregated Player Liabilities (Locked)
            </span>
            <span className="text-2xl font-black font-mono text-amber-400">
              {formatEUR(report.playerLiabilitiesEur)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Customer deposits and active match escrows. Cannot be touched for company dividends under any circumstances.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold">
              Max Permissible Company Withdrawal
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {formatEUR(report.companyLimits?.maxCompanyWithdrawalEur || report.recommendations.safeWithdrawableEur)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Net retained profit after 100% player liabilities and 90-day operating reserve deduction.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
