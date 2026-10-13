import { API_URL } from './config';

export interface ApiResult<T = unknown> {
  status: number;
  data: T | null;
  errorCode: string | null;
}

/** Server-side only: the Session token never reaches client code. */
export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      cache: 'no-store',
      headers: {
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const json = (await response.json().catch(() => null)) as
      (T & { error?: { code?: string } }) | null;
    return {
      status: response.status,
      data: response.ok ? (json as T) : null,
      errorCode: response.ok ? null : (json?.error?.code ?? 'INTERNAL_ERROR'),
    };
  } catch {
    return { status: 503, data: null, errorCode: 'UNAVAILABLE' };
  }
}
