import { describe, it, expect } from 'vitest';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('returns ok status and service name', () => {
    const controller = new HealthController();
    const res = controller.check();

    expect(res.status).toBe('ok');
    expect(res.service).toBe('playverzus-api');
    expect(typeof res.uptime).toBe('number');
    expect(res.timestamp).toBeDefined();
  });
});
