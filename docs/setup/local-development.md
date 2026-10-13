# Local Development

## Requirements

- Node.js 22 or newer
- npm 11 or newer (the repository uses npm workspaces; do not use pnpm)
- Docker Desktop (PostgreSQL 16)

## First run

```bash
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
docker compose up -d            # starts PostgreSQL with a health check
npm install
npm run prisma:migrate          # prisma migrate deploy
npm run seed                    # base roles and permissions (idempotent)
npm run test
npm run dev
```

`npm run db:migrate` (alias `prisma:migrate:dev`) runs `prisma migrate dev` for creating new migrations; it is not needed on first run.

## Environment variables

| Variable            | Purpose                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection used by Prisma, the API and the seed.                 |
| `TEST_DATABASE_URL` | Enables Prisma adapter tests. Must equal `DATABASE_URL` (`test:db` checks). |

Optional: `POSTGRES_PORT` (default 5432) changes the host port of `docker compose` when 5432 is taken (then use it in the URLs). `SEED_DEMO=true` plus `SEED_ADMIN_PASSWORD` (min. 12 characters) makes `npm run seed` also create a demo school (`escola-demo`) and the admin `admin@matemagico.local` with an Argon2id credential. Never use demo credentials outside local development.

`packages/database/.env.example` is kept for running Prisma commands from that workspace. Prisma tests expect a disposable database; with `TEST_DATABASE_URL` unset, 24 Prisma adapter tests are skipped.

## Commands

```bash
npm run dev               # API (port 3333, /health) and web
npm run lint
npm run format:check
npm run test              # all workspaces (Vitest)
npm run test:db           # Prisma adapter tests; needs both URLs set
npm run test:e2e
npm run build
npm run db:generate
npm run db:validate
npm run test:architecture
```

## Reset

```bash
docker compose down -v
```
