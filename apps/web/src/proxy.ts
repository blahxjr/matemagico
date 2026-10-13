import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authGuard } from './lib/auth-guard';
import { SESSION_COOKIE } from './lib/config';

export function proxy(request: NextRequest) {
  const decision = authGuard(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE));
  if (decision.action === 'redirect') {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app', '/app/:path*'],
};
