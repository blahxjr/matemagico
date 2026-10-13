import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

export async function serializeOpenApiDocument(value: unknown, filepath: string): Promise<string> {
  const json = JSON.stringify(sortKeysDeep(value), null, 2);
  if (json === undefined) {
    throw new TypeError('OpenAPI document cannot be serialized as JSON');
  }

  const config = (await resolveConfig(filepath)) ?? {};
  return format(json, { ...config, filepath: resolve(filepath), parser: 'json' });
}
