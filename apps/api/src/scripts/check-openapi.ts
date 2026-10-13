import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiDocument } from '../openapi';
import { serializeOpenApiDocument } from '../openapi-serialization';

async function main() {
  const target = resolve(process.cwd(), '../../docs/api/openapi.json');
  const first = await serializeOpenApiDocument(buildOpenApiDocument(), target);
  const second = await serializeOpenApiDocument(buildOpenApiDocument(), target);

  if (first !== second) {
    console.error('ERROR: consecutive OpenAPI generations differ');
    process.exitCode = 2;
    return;
  }

  const committed = readFileSync(target, 'utf8');
  if (first !== committed) {
    console.error(
      'ERROR: docs/api/openapi.json is out of sync; run npm run openapi --workspace @matemagico/api',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    'OK: generated OpenAPI matches the committed file and consecutive generations are identical',
  );
}

main();
