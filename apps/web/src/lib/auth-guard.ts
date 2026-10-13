export type GuardDecision = { action: 'next' } | { action: 'redirect'; to: string };

export const PROTECTED_PREFIX = '/app';
export const LOGIN_PATH = '/login';

export function isProtectedPath(pathname: string): boolean {
  return pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`);
}

/** Pure AuthGuard decision: protected routes require a session cookie, otherwise go to /login. */
export function authGuard(pathname: string, hasSession: boolean): GuardDecision {
  if (isProtectedPath(pathname) && !hasSession) {
    return { action: 'redirect', to: `${LOGIN_PATH}?next=${encodeURIComponent(pathname)}` };
  }
  return { action: 'next' };
}

/** Only same-origin relative app paths are accepted as post-login destinations. */
export function safeNext(value: string | null | undefined): string {
  return value && isProtectedPath(value) && !value.startsWith('//') ? value : '/app/dashboard';
}
