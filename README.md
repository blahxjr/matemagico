# Matemagico

MateMágico Champions é uma plataforma SaaS educacional para treino de estudantes das Olimpíadas Brasileiras de Matemática (OBMEP). Este repositório contém a base arquitetural e o **baseline do MVP** dos módulos de identidade e acesso escolar.

## Status

```text
MVP READY
Prisma Adapters Ready
```

Release: `v0.1.0-mvp-ready`. Detalhes em [docs/releases/MVP-READY.md](docs/releases/MVP-READY.md). Dívidas conhecidas em [docs/backlog/TECH-DEBT.md](docs/backlog/TECH-DEBT.md).

## Arquitetura

Monorepo (npm workspaces + Turborepo) com fronteiras de módulo verificadas por `dependency-cruiser`.

| Capacidade         | Responsabilidade                                                                      |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Auth**           | Autentica o User, cria, consulta e revoga Sessions.                                   |
| **Membership**     | Vínculo User–School (`PENDING` → `ACTIVE` → `REVOKED`) e concessão de Roles (Grants). |
| **School Context** | Resolve e valida o contexto escolar de uma Session.                                   |
| **Permissions**    | Deriva Permissions apenas de Grants vigentes, Roles escolares e RolePermission.       |

Princípios: _fail closed_ (dependência indisponível nunca autoriza), _deny by default_ e Permission nunca concedida diretamente.

## Fluxo MVP

```text
AuthenticateUser
↓
CreateMembership      (PENDING)
↓
ActivateMembership    (ACTIVE)
↓
GrantRole
↓
ResolveSchoolContext
↓
ResolvePermissions
↓
ValidateSchoolContext
```

O fluxo completo é validado de ponta a ponta em `packages/testing/src/e2e/mvp-flow.e2e.test.ts`.

## Estrutura

```text
packages/database            Schema Prisma e migrations (PostgreSQL)
packages/modules/auth        Módulo Auth: domínio, serviços, adapters Prisma
packages/modules/membership  Módulo Membership + School Context: domínio, serviços, adapters Prisma
packages/testing             Testes end-to-end entre módulos
docs/architecture            ADRs, contratos, decisões e planos de implementação
```

Outros diretórios: `apps/web` (frontend, fora do escopo do MVP), `packages/shared-types`, `packages/logger`, `packages/events`.

## Testes

Sem banco de dados (padrão, também no CI):

| Pacote                                      | Testes                     |
| ------------------------------------------- | -------------------------- |
| `@matemagico/auth`                          | 60 (5 dependem de banco)   |
| `@matemagico/membership`                    | 143 (19 dependem de banco) |
| `@matemagico/testing`                       | 19                         |
| `@matemagico/logger`, `shared-types`, `web` | 1 cada                     |

Total: **225 testes passam** (24 adicionais são pulados sem banco). Com `TEST_DATABASE_URL` apontando para um PostgreSQL descartável e migrado, os adapters Prisma também são exercitados: Auth 65 e Membership 162.

## Como executar

```bash
npm install
npm run lint
npm run test
npm run test:architecture
```

Testes de adapters Prisma (o banco informado terá os dados das tabelas apagados):

```bash
cd packages/database
DATABASE_URL="postgresql://..." npx prisma migrate deploy
cd ../..
TEST_DATABASE_URL="postgresql://..." npm run test
```

Ambiente local: [docs/setup/local-development.md](docs/setup/local-development.md). Arquitetura completa: [ARCHITECTURE.md](ARCHITECTURE.md).
