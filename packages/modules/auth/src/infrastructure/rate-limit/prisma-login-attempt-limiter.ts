import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  LOGIN_ATTEMPT_WINDOW_MS,
  MAX_EMAIL_FAILURES,
  MAX_IP_REQUESTS,
  type LoginAttemptLimiter,
} from '../../application/ports/login-attempt-limiter';

export class PrismaLoginAttemptLimiter implements LoginAttemptLimiter {
  constructor(private readonly prisma: PrismaClient) {}

  async registerIpRequest(ip: string, now: Date): Promise<boolean> {
    const windowStartedAt = this.windowStart(now);
    const key = this.key('ip', ip);
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "LoginAttemptCounter" ("key", "windowStartedAt", "count")
      VALUES (${key}, ${windowStartedAt}, 1)
      ON CONFLICT ("key", "windowStartedAt")
      DO UPDATE SET "count" = "LoginAttemptCounter"."count" + 1
      WHERE "LoginAttemptCounter"."count" < ${MAX_IP_REQUESTS}
      RETURNING "count"
    `;
    await this.prisma.loginAttemptCounter.deleteMany({
      where: { windowStartedAt: { lt: new Date(now.getTime() - 2 * LOGIN_ATTEMPT_WINDOW_MS) } },
    });
    return rows.length > 0;
  }

  async isEmailBlocked(normalizedEmail: string, now: Date): Promise<boolean> {
    const counter = await this.prisma.loginAttemptCounter.findUnique({
      where: {
        key_windowStartedAt: {
          key: this.key('email', normalizedEmail),
          windowStartedAt: this.windowStart(now),
        },
      },
    });
    return (counter?.count ?? 0) >= MAX_EMAIL_FAILURES;
  }

  async recordEmailFailure(normalizedEmail: string, now: Date): Promise<void> {
    const key = this.key('email', normalizedEmail);
    const windowStartedAt = this.windowStart(now);
    await this.prisma.$executeRaw`
      INSERT INTO "LoginAttemptCounter" ("key", "windowStartedAt", "count")
      VALUES (${key}, ${windowStartedAt}, 1)
      ON CONFLICT ("key", "windowStartedAt")
      DO UPDATE SET "count" = "LoginAttemptCounter"."count" + 1
    `;
  }

  private windowStart(now: Date): Date {
    return new Date(Math.floor(now.getTime() / LOGIN_ATTEMPT_WINDOW_MS) * LOGIN_ATTEMPT_WINDOW_MS);
  }

  private key(kind: 'ip' | 'email', value: string): string {
    const digest = createHash('sha256').update(value).digest('hex');
    return `${kind}:${digest}`;
  }
}
