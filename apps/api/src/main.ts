import { createCompositionRoot } from '@matemagico/composition-root';
import { prisma } from '@matemagico/database';
import { logger } from '@matemagico/logger';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3333);
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const root = createCompositionRoot(prisma);
const server = createApp(root, { corsAllowedOrigins });

server.listen(port, () => {
  logger.info('api.server.started', { module: 'platform', port });
});

const dispatcher = setInterval(() => {
  root.services.attemptCompletedDispatcher.dispatchPending().catch((error: unknown) =>
    logger.error('outbox.dispatch.failed', {
      module: 'rankings',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
}, 5000);
dispatcher.unref();

const shutdown = () => {
  clearInterval(dispatcher);
  logger.info('api.server.stopping', { module: 'platform' });
  server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
