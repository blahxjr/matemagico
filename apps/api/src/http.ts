import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';

export const MAX_BODY_BYTES = 32 * 1024;

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

/** Malformed transport (size, JSON syntax) or a payload that does not satisfy its Zod contract. */
export class InvalidBodyError extends Error {}

async function readRaw(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new InvalidBodyError();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Reads a bounded JSON body and validates it against a strict schema. Unknown fields (for
 * instance an `actorUserId` forged by the client) are rejected, never ignored.
 */
export async function readBody<S extends z.ZodType>(
  req: IncomingMessage,
  schema: S,
  options: { emptyAs?: unknown } = {},
): Promise<z.output<S>> {
  const raw = await readRaw(req);
  let parsed: unknown;
  if (raw.trim() === '' && 'emptyAs' in options) {
    parsed = options.emptyAs;
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InvalidBodyError();
    }
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new InvalidBodyError();
  return result.data;
}

/**
 * Validates the query string against a strict schema (unknown or repeated keys are rejected).
 * Only listing/reading routes accept a query, and never for identity.
 */
export function readQuery<S extends z.ZodType>(req: IncomingMessage, schema: S): z.output<S> {
  let params: URLSearchParams;
  try {
    params = new URL(req.url ?? '', 'http://localhost').searchParams;
  } catch {
    throw new InvalidBodyError();
  }
  const seen = new Map<string, string>();
  for (const [key, value] of params) {
    if (seen.has(key)) throw new InvalidBodyError();
    seen.set(key, value);
  }
  const result = schema.safeParse(Object.fromEntries(seen));
  if (!result.success) throw new InvalidBodyError();
  return result.data;
}

/** Validates a path parameter; the value is never trusted as identity. */
export function parseParam(value: string | undefined): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value ?? '');
  } catch {
    throw new InvalidBodyError();
  }
  const result = z.string().trim().min(1).max(128).safeParse(decoded);
  if (!result.success) throw new InvalidBodyError();
  return result.data;
}

/** Extracts the opaque Session token from `Authorization: Bearer <token>`. */
export function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([A-Za-z0-9._~+/=-]{1,256})$/.exec(header);
  return match ? match[1]! : null;
}

export function methodNotAllowed(res: ServerResponse, allow: string): void {
  res.setHeader('allow', allow);
  sendJson(res, 405, { status: 'method_not_allowed' });
}
