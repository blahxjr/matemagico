import { GENERIC_ERROR } from './errors';

export type AdminResult = { ok: true } | { ok: false; message: string };

/** Client-side call to a same-origin BFF route; the message is already user-facing. */
export async function callBff(
  url: string,
  method: 'POST' | 'PATCH',
  body?: unknown,
): Promise<AdminResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const json = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return { ok: false, message: json?.error?.message ?? GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
