import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot } from '@matemagico/composition-root';

/**
 * Imports questions into editorial review only. No imported question is published by this CLI.
 *
 *   npm run questions:import -- --format json|csv|xlsx --file <path>
 */
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

async function main(): Promise<void> {
  const format = option('format');
  const file = option('file');
  if ((format !== 'json' && format !== 'csv' && format !== 'xlsx') || !file) {
    throw new Error('Usage: --format json|csv|xlsx --file <path>');
  }
  const prisma = new PrismaClient();
  try {
    const { services } = createCompositionRoot(prisma);
    const report =
      format === 'xlsx'
        ? await services.importQuestionsFromXlsx.execute({
            buffer: readFileSync(file),
            fileName: file,
          })
        : await services.importQuestions.execute({ format, payload: readFileSync(file, 'utf8') });
    console.log(JSON.stringify(report));
    if (('failed' in report ? report.failed.length : report.errors) > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Import failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
