import { describe, expect, it } from 'vitest';
import type { AvailabilityProbe } from '../ports/availability-probe';
import { HealthCheckAuthService } from './health-check-auth.service';

const up: AvailabilityProbe = { isAvailable: async () => true };
const down: AvailabilityProbe = { isAvailable: async () => false };
const broken: AvailabilityProbe = {
  isAvailable: async () => {
    throw new Error('connection string postgres://secret');
  },
};

describe('HealthCheckAuthService', () => {
  it('is READY when every required dependency is available', async () => {
    const service = new HealthCheckAuthService({ probes: [up, up, up] });
    expect(await service.execute()).toEqual({ state: 'READY' });
  });

  it('is NOT_READY when any dependency reports unavailable', async () => {
    const service = new HealthCheckAuthService({ probes: [up, down, up] });
    expect(await service.execute()).toEqual({ state: 'NOT_READY' });
  });

  it('is NOT_READY when a probe throws and never leaks the cause', async () => {
    const service = new HealthCheckAuthService({ probes: [up, broken] });
    const result = await service.execute();
    expect(result).toEqual({ state: 'NOT_READY' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('is NOT_READY when no dependency is configured (fail closed)', async () => {
    expect(await new HealthCheckAuthService({ probes: [] }).execute()).toEqual({
      state: 'NOT_READY',
    });
  });

  it('exposes only the state field', async () => {
    const result = await new HealthCheckAuthService({ probes: [up] }).execute();
    expect(Object.keys(result)).toEqual(['state']);
  });
});
