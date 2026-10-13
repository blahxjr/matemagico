import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOpenApiDocument } from '../openapi';

function sortKeysDeep(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeysDeep(value[k]);
    return out;
  }
  return value;
}

function canonicalizeStringify(obj: any) {
  return JSON.stringify(sortKeysDeep(obj), null, 2);
}

(async function main() {
  const t1 = join(tmpdir(), `openapi-1-${Date.now()}.json`);
  const t2 = join(tmpdir(), `openapi-2-${Date.now()}.json`);

  const doc1 = canonicalizeStringify(buildOpenApiDocument());
  writeFileSync(t1, doc1 + '\n');
  const doc2 = canonicalizeStringify(buildOpenApiDocument());
  writeFileSync(t2, doc2 + '\n');

  if (doc1 === doc2) {
    console.log('OK: two consecutive generations are identical');
    console.log('temp files:');
    console.log('  ', t1);
    console.log('  ', t2);
    process.exit(0);
  } else {
    console.error('ERROR: consecutive generations differ');
    process.exit(2);
  }
})();
