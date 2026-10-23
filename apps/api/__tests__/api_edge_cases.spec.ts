import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WalletService } from '../src/wallet/wallet.service';
import { GeoblockGuard } from '../src/common/guards/geoblock.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { MIN_DEPOSIT_EUR, MAX_DEPOSIT_EUR, MIN_WITHDRAWAL_EUR, MAX_WITHDRAWAL_EUR } from '@playverzus/core';

describe('API Services & Security Guards Edge Case Suite', () => {
  describe('WalletService Validation & User-Friendly Errors', () => {
    const service = new WalletService();

    it('rejects deposit with invalid amounts (negative, zero, NaN)', async () => {
      await expect(service.deposit('u1', -10)).rejects.toThrowError(BadRequestException);
      await expect(service.deposit('u1', 0)).rejects.toThrowError(BadRequestException);
      await expect(service.deposit('u1', NaN)).rejects.toThrowError(BadRequestException);
    });

    it('rejects deposit below MIN_DEPOSIT_EUR', async () => {
      await expect(service.deposit('u1', 4.99)).rejects.toThrowError(
        `The minimum deposit amount is €${MIN_DEPOSIT_EUR.toFixed(2)}.`,
      );
    });

    it('rejects deposit above MAX_DEPOSIT_EUR', async () => {
      await expect(service.deposit('u1', MAX_WITHDRAWAL_EUR + 0.01)).rejects.toThrowError(
        `The maximum deposit limit per transaction is €${MAX_DEPOSIT_EUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      );
    });

    it('rejects unsupported deposit currencies', async () => {
      await expect(service.deposit('u1', 50, 'BITCOIN')).rejects.toThrowError(
        'Currency BITCOIN is not currently supported for instant deposits.',
      );
    });

    it('rejects payout with invalid amounts (negative, zero, NaN)', async () => {
      await expect(service.requestPayout('u1', -50, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        'Please enter a valid withdrawal amount greater than zero.',
      );
      await expect(service.requestPayout('u1', 0, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        'Please enter a valid withdrawal amount greater than zero.',
      );
      await expect(service.requestPayout('u1', NaN, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        'Please enter a valid withdrawal amount greater than zero.',
      );
    });

    it('rejects payout below MIN_WITHDRAWAL_EUR', async () => {
      await expect(service.requestPayout('u1', 9.99, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        `The minimum withdrawal threshold is €${MIN_WITHDRAWAL_EUR.toFixed(2)}.`,
      );
    });

    it('rejects payout above MAX_WITHDRAWAL_EUR', async () => {
      await expect(service.requestPayout('u1', MAX_WITHDRAWAL_EUR + 0.01, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        `The maximum single withdrawal limit is €${MAX_WITHDRAWAL_EUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}. For higher volumes, please contact VIP support.`,
      );
    });

    it('returns public Paysafe configuration containing exact financial bounds', () => {
      const cfg = service.getPaysafeConfig();
      expect(cfg.minDepositEur).toBe(MIN_DEPOSIT_EUR);
      expect(cfg.maxDepositEur).toBe(MAX_DEPOSIT_EUR);
      expect(cfg.minWithdrawalEur).toBe(MIN_WITHDRAWAL_EUR);
      expect(cfg.maxWithdrawalEur).toBe(MAX_WITHDRAWAL_EUR);
      expect(cfg.supportedCurrencies).toContain('EUR');
    });
  });

  describe('GeoblockGuard Compliance Filtering', () => {
    const guard = new GeoblockGuard();

    function createMockContext(headers: Record<string, string>, user?: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ headers, user }),
        }),
      } as unknown as ExecutionContext;
    }

    it('allows compliant countries', () => {
      const ctx = createMockContext({ 'cf-ipcountry': 'DE' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('blocks sanctioned regions from cf-ipcountry header', () => {
      const ctx = createMockContext({ 'cf-ipcountry': 'KP' });
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('blocks sanctioned regions from user profile region', () => {
      const ctx = createMockContext({}, { region: 'IR' });
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('allows requests when no region header is present (graceful default)', () => {
      const ctx = createMockContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('RolesGuard RBAC Authorization', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    function createRoleContext(userRole?: string, handlerRoles?: string[]): ExecutionContext {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(handlerRoles);
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user: userRole ? { role: userRole } : null,
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('allows access when no roles are required on route', () => {
      const ctx = createRoleContext('PLAYER', undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows user with matching role', () => {
      const ctx = createRoleContext('ADMIN', ['ADMIN', 'SUPER_ADMIN']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('blocks user with non-matching role', () => {
      const ctx = createRoleContext('PLAYER', ['ADMIN', 'SUPER_ADMIN']);
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('blocks unauthenticated request (no user on request)', () => {
      const ctx = createRoleContext(undefined, ['ADMIN']);
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    });
  });
});
