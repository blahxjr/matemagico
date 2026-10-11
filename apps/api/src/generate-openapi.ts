import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from './openapi';

const target = resolve(process.cwd(), '../../docs/api/openapi.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`OpenAPI written to ${target}`);
