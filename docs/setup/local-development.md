# Local Development

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- Docker Desktop, for PostgreSQL integration validation

## Install

```bash
npm install
copy packages/database/.env.example packages/database/.env
```

On PowerShell, use `Copy-Item packages/database/.env.example packages/database/.env`.

## Commands

```bash
npm run dev
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run build
npm run db:generate
npm run db:validate
npm run test:architecture
```

Start PostgreSQL before `npm run db:migrate`:

```bash
docker compose up -d postgres
npm run db:migrate
```

Foundation intentionally contains no domain models or definitive Prisma schema. Domain ownership and `schoolId` rules are implemented in later stages according to ADR-0002 and ADR-0003.
