// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, proxy } from './proxy';
import { SESSION_COOKIE } from './lib/config';

describe('proxy (AuthGuard)', () => {
  it('redirects unauthenticated /app requests to /login', () => {
    const response = proxy(new NextRequest('http://web.test/app/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?next=%2Fapp%2Fdashboard');
  });

  it('lets authenticated requests through', () => {
    const response = proxy(
      new NextRequest('http://web.test/app/dashboard', {
        headers: { cookie: `${SESSION_COOKIE}=tok` },
      }),
    );
    expect(response.headers.get('location')).toBeNull();
  });

  it('only matches /app routes', () => {
    expect(config.matcher).toEqual(['/app', '/app/:path*']);
  });
});
