import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot } from '@matemagico/composition-root';

/**
 * Imports questions into the bank (DRAFT unless --publish). Idempotent: rows with the same
 * (sourceName, sourceYear, sourceReference) are skipped. Format: docs/questions/IMPORT-FORMAT.md
 *
 *   npm run questions:import -- --format json|csv --file <path> [--publish]
 */
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

async function main(): Promise<void> {
  const format = option('format');
  const file = option('file');
  if ((format !== 'json' && format !== 'csv') || !file) {
    throw new Error('Usage: --format json|csv --file <path> [--publish]');
  }
  const prisma = new PrismaClient();
  try {
    const { services } = createCompositionRoot(prisma);
    const report = await services.importQuestions.execute({
      format,
      payload: readFileSync(file, 'utf8'),
      publish: args.includes('--publish'),
    });
    console.log(JSON.stringify(report));
    if (report.failed.length > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Import failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
