import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaLoginAttemptLimiter } from '../rate-limit/prisma-login-attempt-limiter';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaLoginAttemptLimiter', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const limiter = new PrismaLoginAttemptLimiter(prisma);
  const now = new Date();
  const email = `e2e-${crypto.randomUUID()}@example.test`;
  const ip = `127.0.0.${Math.floor(Math.random() * 255)}`;

  afterAll(() => prisma.$disconnect());

  it('enforces shared per-IP and per-email limits through persisted atomic counters', async () => {
    for (let i = 0; i < 30; i += 1) expect(await limiter.registerIpRequest(ip, now)).toBe(true);
    expect(await limiter.registerIpRequest(ip, now)).toBe(false);

    for (let i = 0; i < 5; i += 1) {
      expect(await limiter.isEmailBlocked(email, now)).toBe(false);
      await limiter.recordEmailFailure(email, now);
    }
    expect(await limiter.isEmailBlocked(email, now)).toBe(true);
  });

  it('enforces the per-IP limit atomically for concurrent requests', async () => {
    const concurrentIp = `192.0.2.${Math.floor(Math.random() * 255)}`;
    const results = await Promise.all(
      Array.from({ length: 40 }, () => limiter.registerIpRequest(concurrentIp, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(30);
    expect(results.filter((allowed) => !allowed)).toHaveLength(10);
  });
});
