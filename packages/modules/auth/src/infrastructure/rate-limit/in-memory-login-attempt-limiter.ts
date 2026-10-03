import {
  LOGIN_ATTEMPT_WINDOW_MS,
  MAX_EMAIL_FAILURES,
  MAX_IP_REQUESTS,
  type LoginAttemptLimiter,
} from '../../application/ports/login-attempt-limiter';

export class InMemoryLoginAttemptLimiter implements LoginAttemptLimiter {
  private readonly ipRequests = new Map<string, number[]>();
  private readonly emailFailures = new Map<string, number[]>();

  async registerIpRequest(ip: string, now: Date): Promise<boolean> {
    const recent = this.recent(this.ipRequests, ip, now);
    if (recent.length >= MAX_IP_REQUESTS) {
      return false;
    }
    recent.push(now.getTime());
    return true;
  }

  async isEmailBlocked(normalizedEmail: string, now: Date): Promise<boolean> {
    return this.recent(this.emailFailures, normalizedEmail, now).length >= MAX_EMAIL_FAILURES;
  }

  async recordEmailFailure(normalizedEmail: string, now: Date): Promise<void> {
    this.recent(this.emailFailures, normalizedEmail, now).push(now.getTime());
  }

  // Sliding window: drops entries older than the window and returns the live list.
  private recent(store: Map<string, number[]>, key: string, now: Date): number[] {
    const threshold = now.getTime() - LOGIN_ATTEMPT_WINDOW_MS;
    const live = (store.get(key) ?? []).filter((instant) => instant > threshold);
    store.set(key, live);
    return live;
  }
}
