import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from './openapi';
import { serializeOpenApiDocument } from './openapi-serialization';

const target = resolve(process.cwd(), '../../docs/api/openapi.json');
mkdirSync(dirname(target), { recursive: true });

async function main() {
  const document = await serializeOpenApiDocument(buildOpenApiDocument(), target);
  writeFileSync(target, document);
  console.log(`OpenAPI written to ${target}`);
}

main();
