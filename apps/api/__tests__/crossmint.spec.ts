import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrossmintService } from '../src/crossmint/crossmint.service';

describe('CrossmintService', () => {
  let crossmintService: CrossmintService;
  let mockWalletService: any;

  beforeEach(() => {
    mockWalletService = {
      creditCrossmintDeposit: vi.fn().mockResolvedValue({
        success: true,
        transactionId: 'tx-123',
        amount: 25,
        currency: 'USD',
        balanceAfter: 125,
      }),
    };
    crossmintService = new CrossmintService(mockWalletService);
  });

  it('returns valid client configuration', () => {
    const config = crossmintService.getConfig();
    expect(config).toBeDefined();
    expect(config.environment).toBeDefined();
    expect(config.supportedCurrencies).toContain('USDC');
    expect(config.supportedMethods).toContain('card');
  });

  it('creates deposit order session with valid amount and metadata', async () => {
    const order = await crossmintService.createDepositOrder('user-abc-123', 'gamer@playverzus.xyz', 25, 'USD');
    expect(order.success).toBe(true);
    expect(order.orderId).toBeDefined();
    expect(order.amount).toBe(25);
    expect(order.checkoutUrl).toBeDefined();
  });

  it('rejects deposit order with amount below minimum threshold', async () => {
    await expect(
      crossmintService.createDepositOrder('user-abc-123', 'gamer@playverzus.xyz', 0.5),
    ).rejects.toThrow();
  });

  it('processes valid Crossmint order completed webhook and credits user wallet', async () => {
    const webhookPayload = {
      type: 'orders.delivery.completed',
      data: {
        orderId: 'cm-order-777',
        payment: {
          amount: 50,
          currency: 'usd',
        },
        metadata: {
          userId: 'user-winner-1',
          platform: 'playverzus',
        },
      },
    };

    const res = await crossmintService.handleWebhook(webhookPayload);
    expect(res.success).toBe(true);
    expect(mockWalletService.creditCrossmintDeposit).toHaveBeenCalledWith(
      'user-winner-1',
      50,
      'USD',
      'cm-order-777',
      webhookPayload,
    );
  });

  it('handles failed Crossmint order webhooks by recording audit and alerting user', async () => {
    mockWalletService.recordFailedCrossmintDeposit = vi.fn().mockResolvedValue(undefined);

    const webhookPayload = {
      type: 'orders.payment.failed',
      data: {
        orderId: 'cm-order-failed-999',
        error: { message: 'Card declined: Insufficient funds' },
        metadata: { userId: 'user-winner-1' },
      },
    };

    const res = await crossmintService.handleWebhook(webhookPayload);
    expect(res.status).toBe('FAILED');
    expect(mockWalletService.recordFailedCrossmintDeposit).toHaveBeenCalledWith(
      'user-winner-1',
      'cm-order-failed-999',
      'Card declined: Insufficient funds',
      webhookPayload,
    );
  });

  it('handles in-progress / initiated Crossmint order webhooks without crediting balance early', async () => {
    mockWalletService.recordPendingCrossmintDeposit = vi.fn().mockResolvedValue(undefined);

    const webhookPayload = {
      type: 'orders.delivery.intiated',
      data: {
        orderId: 'cm-order-pending-555',
        amount: 25,
        metadata: { userId: 'user-winner-1' },
      },
    };

    const res = await crossmintService.handleWebhook(webhookPayload);
    expect(res.status).toBe('IN_PROGRESS');
    expect(mockWalletService.recordPendingCrossmintDeposit).toHaveBeenCalledWith(
      'user-winner-1',
      'cm-order-pending-555',
      25,
      'orders.delivery.intiated',
      webhookPayload,
    );
    expect(mockWalletService.creditCrossmintDeposit).not.toHaveBeenCalled();
  });

  it('handles outbound wallet transfer updates for treasury payouts', async () => {
    mockWalletService.recordTransferUpdate = vi.fn().mockResolvedValue(undefined);

    const webhookPayload = {
      type: 'wallets.experimental.tranfer.updated',
      data: {
        id: 'tx-transfer-777',
        status: 'CONFIRMED',
        txHash: '0xabc123def456',
        metadata: { userId: 'admin-user-1' },
      },
    };

    const res = await crossmintService.handleWebhook(webhookPayload);
    expect(res.status).toBe('TRANSFER_UPDATED');
    expect(mockWalletService.recordTransferUpdate).toHaveBeenCalledWith(
      'tx-transfer-777',
      'CONFIRMED',
      '0xabc123def456',
      webhookPayload,
    );
  });

  it('safely ignores non-completion webhook events without throwing', async () => {
    const webhookPayload = {
      type: 'unknown.custom.event',
      data: { orderId: 'cm-order-888' },
    };

    const res = await crossmintService.handleWebhook(webhookPayload);
    expect(res.ignored).toBe(true);
    expect(mockWalletService.creditCrossmintDeposit).not.toHaveBeenCalled();
  });
});
