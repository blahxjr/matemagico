export const MAX_EMAIL_FAILURES = 5;
export const MAX_IP_REQUESTS = 30;
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export interface LoginAttemptLimiter {
  /** Counts the request for the IP window; returns false when the IP limit is already reached. */
  registerIpRequest(ip: string, now: Date): Promise<boolean>;
  isEmailBlocked(normalizedEmail: string, now: Date): Promise<boolean>;
  recordEmailFailure(normalizedEmail: string, now: Date): Promise<void>;
}
