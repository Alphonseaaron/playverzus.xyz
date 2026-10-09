# Wallet Architecture & Points Ledger Specification (WALLET.md)

PlayVerzus employs an abstracted, dual-mode wallet architecture. By default, the platform ships with **zero-cost demo POINTS**, ensuring absolute compliance with gaming and financial regulations without requiring merchant licenses or payment gateways.

---

## 🏦 Dual-Mode Interface (`IWalletService`)

The core wallet service contract is implemented in `packages/core/src/wallet/WalletService.ts`:

```typescript
export interface IWalletService {
  getBalance(userId: string): Promise<WalletBalance>;
  escrowWager(matchId: string, userId: string, amount: number): Promise<string>;
  settleMatch(matchId: string, winnerId: string, loserId: string, amount: number, rakePercent: number): Promise<void>;
  refundMatch(matchId: string, reason: string): Promise<void>;
  getLedger(userId: string, limit?: number, offset?: number): Promise<LedgerEntry[]>;
}
```

### Modes
1. **`WALLET_MODE=demo` (Default)**:
   - Currency: `POINTS` (PTS).
   - Backed by PostgreSQL `wallet_ledgers` table.
   - Non-fiat, zero monetary value.
   - Automated faucet allows players to reload 500 PTS every 15 minutes.
2. **`WALLET_MODE=real` (Gated / Stubbed)**:
   - Throws `WalletError('NOT_IMPLEMENTED', 'Real money wagers require merchant credentials and regional licensing')`.
   - Stubs prepared for M-Pesa Daraja, Paystack, and EVM/Solana crypto payments.

---

## 📒 Double-Entry Accounting Model

Every balance alteration in PlayVerzus follows immutable double-entry bookkeeping principles. Balances are never mutated with a raw `UPDATE balance = balance + 10`. Instead, balance queries compute the sum of entries or utilize `SECURITY DEFINER` stored procedures.

### Transaction Types
- **`CREDIT`**: Faucet refills, tournament prize payouts, match winnings.
- **`DEBIT`**: Challenge creations, tournament entry fees.
- **`HOLD`**: Funds locked in escrow during match execution.
- **`RELEASE`**: Escrow unlock upon match cancellation or tie.
- **`FORFEIT`**: Disciplinary debit due to anti-cheat disqualification.

### Escrow & Settlement Lifecycle
```
[Player A: 1000 PTS]              [Player B: 1000 PTS]
        |                                 |
        v                                 v
[HOLD: -100 PTS]                  [HOLD: -100 PTS]
        \                                 /
         +-------> [ESCROW POT: 200 PTS] <+
                           |
            Match Concludes (Player A Wins)
            Platform Rake: 5% (10 PTS)
                           |
                           v
              [CREDIT: +190 PTS to Player A]
              [CREDIT: +10 PTS to Platform Reserve]
```

---

## 🔌 Activating Real-Money Rails (When Licensed)

When moving to real money in jurisdictions where skill-gaming licenses have been procured:

### 1. M-Pesa Daraja (Kenya)
- Set `WALLET_MODE=mpesa`
- Provide `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`.
- Implement STK Push for deposits and B2C API for instant prize withdrawals.

### 2. Paystack (Nigeria, Ghana, South Africa)
- Set `WALLET_MODE=paystack`
- Provide `PAYSTACK_SECRET_KEY` and register webhook handler at `/webhooks/paystack`.

### 3. Solana / EVM Smart Contracts
- Deploy escrow program where players deposit USDC to an on-chain program PDA.
- Backend signs an oracle result attesting to the winner's address, releasing escrowed tokens.

---

## ⚖️ Financial Compliance Checklist

- [ ] Real-money mode must be disabled in environments lacking explicit BCLB/gambling operator licenses.
- [ ] Implement strict KYC checks (`KYCStub.ts`) verifying player identity and minimum age (18+) before any withdrawal.
- [ ] Enforce deposit and daily loss limits.
- [ ] Segregate player funds into designated client trust accounts distinct from corporate operating accounts.
