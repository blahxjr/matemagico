import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from './openapi';

const target = resolve(process.cwd(), '../../docs/api/openapi.json');
mkdirSync(dirname(target), { recursive: true });

function sortKeysDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function canonicalizeStringify(obj: any) {
  return JSON.stringify(sortKeysDeep(obj), null, 2);
}

writeFileSync(target, `${canonicalizeStringify(buildOpenApiDocument())}\n`);
console.log(`OpenAPI written to ${target}`);
