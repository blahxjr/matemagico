import { createCompositionRoot } from '@matemagico/composition-root';
import { prisma } from '@matemagico/database';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3333);
const server = createApp(createCompositionRoot(prisma));

server.listen(port, () => {
  console.log(`api listening on :${port}`);
});

const shutdown = () => {
  server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
