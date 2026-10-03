import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAX_BODY_BYTES = 8 * 1024;

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export class InvalidBodyError extends Error {}

/** Reads a bounded JSON object body; anything else is an invalid input. */
export async function readJsonObject(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new InvalidBodyError();
    chunks.push(chunk as Buffer);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new InvalidBodyError();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new InvalidBodyError();
  }
}
