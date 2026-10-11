# Matemagico

MateMágico Champions é uma plataforma SaaS educacional para treino de estudantes das Olimpíadas Brasileiras de Matemática (OBMEP). Este repositório contém a base arquitetural e o **baseline do MVP** dos módulos de identidade e acesso escolar.

## Status

```text
MVP READY
Prisma Adapters Ready
```

Baseline estabilizado (Prompt 01): CI com PostgreSQL, seed e ambiente local reproduzível. Escopo em [docs/product/MVP-SCOPE.md](docs/product/MVP-SCOPE.md); ADRs em [ADR-INDEX](docs/architecture/ADRs/ADR-INDEX.md). Release: `v0.1.0-mvp-ready`. Detalhes em [docs/releases/MVP-READY.md](docs/releases/MVP-READY.md). Dívidas conhecidas em [TECH-DEBT.md](TECH-DEBT.md).

## Arquitetura

Monorepo (npm workspaces + Turborepo) com fronteiras de módulo verificadas por `dependency-cruiser`.

| Capacidade             | Responsabilidade                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Auth**               | Autentica o User, cria, consulta e revoga Sessions.                                                            |
| **Membership**         | Vínculo User–School (`PENDING` → `ACTIVE` → `REVOKED`) e concessão de Roles (Grants).                          |
| **School Context**     | Resolve e valida o contexto escolar de uma Session.                                                            |
| **Permissions**        | Deriva Permissions apenas de Grants vigentes, Roles escolares e RolePermission.                                |
| **Users**              | Cadastro de usuários (`CreateUser`, `GetUser`, `FindUserByEmail`, `DeactivateUser`) e `UserDirectory`.         |
| **Schools**            | Cadastro de escolas (`CreateSchool`, `GetSchool`, `FindSchoolBySlug`, `DeactivateSchool`) e `SchoolDirectory`. |
| **Topics + Questions** | Banco versionado de questões, tópicos e importação JSON/CSV.                                                   |
| **Question Engine**    | Seleção de questões atuais e publicadas, filtrada por nível/tópico e determinística por seed.                  |
| **Mock Exams**         | Criação, publicação, listagem e início de simulados com referências congeladas a versões de questões.          |

**Prompt 02 concluído**: o Composition Root usa apenas portas reais (repositórios Prisma de Users/Schools, diretórios reais, Argon2id e `GrantBasedActorAuthorizer`); `provisional-ports` foi removido. O seed cria os papéis `STUDENT`, `TEACHER` e `SCHOOL_ADMIN` e as permissões oficiais; `SEED_DEMO=true` com `SEED_ADMIN_PASSWORD` cria uma escola e um admin de demonstração.

**Prompt 03 concluído**: o Actor vem exclusivamente da Session (`Authorization: Bearer <sessionId>`); nenhuma rota aceita `actorUserId` (corpos Zod estritos; query string rejeitada). Rotas: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /memberships`, `POST /memberships/:id/activate`, `POST /memberships/:id/grants`, `POST /schools`, `GET /schools/:id`, `GET /openapi.json`. Erros: AUTH-001..005, MEM-001..005, SC-001..005 (401 sem Session, 403 sem permissão). CORS por `CORS_ALLOWED_ORIGINS` (lista separada por vírgulas). OpenAPI gerado em [docs/api/openapi.json](docs/api/openapi.json) (`npm run openapi -w @matemagico/api`). Limite de tentativas ainda em memória (adapter substituível; ver TECH-DEBT 14).

**Prompt 04 concluído**: módulos `@matemagico/topics` e `@matemagico/questions` (banco de questões OBMEP, versionado). Rotas (todas exigem Session): `GET/POST /topics`, `GET/PATCH /topics/:id`, `GET/POST /questions`, `GET /questions/:id`, `POST /questions/:id/{publish,archive,version}`. Escrita exige `question:create|update|publish` no `schoolId` informado (somente `TEACHER` e `SCHOOL_ADMIN`; `schoolId` é contexto, nunca identidade). Leitores veem só questões `PUBLISHED` e tópicos `ACTIVE`, sem `isCorrect`; autores (com `schoolId` e `question:create`) veem rascunhos, versões e gabarito. Filtros: `level`, `topicId`, `status`, `sourceYear` (+ `limit`/`offset`). Questões publicadas são imutáveis: qualquer alteração gera a versão N+1 em `DRAFT`; publicar a nova versão arquiva a anterior. Importação JSON/CSV (`npm run questions:import`, formato em [docs/questions/IMPORT-FORMAT.md](docs/questions/IMPORT-FORMAT.md)); `npm run seed` publica 100 questões MOCK (conteúdo gerado, sem direitos de terceiros: [ADR-0011](docs/architecture/ADRs/ADR-0011-question-content-licensing-strategy.md)).

**Prompt 05 concluído**: `@matemagico/question-engine` seleciona apenas questões PUBLISHED e `isCurrent`, sem repetição e de forma determinística por seed; insuficiência falha explicitamente. `@matemagico/mock-exams` cria simulados DRAFT com seleção ordenada e referências persistidas `(questionId, questionVersion)`. Publicação congela o conteúdo referenciado; o início retorna questões sem gabarito e não cria Attempt. Rotas: `GET/POST /exams`, `GET /exams/:id`, `POST /exams/:id/{publish,archive,start}`. Criação exige `exam:create`; publicação/arquivamento, `exam:publish`; alunos usam `school:read` e só listam/iniciam simulados publicados dentro da janela. Próximo: Prompt 06 (Attempts, AutoCorrect, Outbox e Ranking Base).

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

Outros diretórios: `apps/api` (API HTTP com Auth, Membership, banco de questões, simulados e `/health`), `apps/web` (scaffold de frontend, fora do baseline), `packages/shared-types`, `packages/logger`, `packages/events`.

## Testes

Sem banco de dados (24 testes de adapters Prisma pulados; o CI usa PostgreSQL e os executa):

| Pacote                                      | Testes                     |
| ------------------------------------------- | -------------------------- |
| `@matemagico/auth`                          | 60 (5 dependem de banco)   |
| `@matemagico/membership`                    | 143 (19 dependem de banco) |
| `@matemagico/testing`                       | 19                         |
| `@matemagico/logger`, `shared-types`, `web` | 1 cada                     |

Total: **225 testes passam** (24 adicionais são pulados sem banco). Com `TEST_DATABASE_URL` apontando para um PostgreSQL descartável e migrado, os adapters Prisma também são exercitados: Auth 65 e Membership 162.

## Como executar

Guia completo em [docs/setup/local-development.md](docs/setup/local-development.md). Stack: npm workspaces, Vitest, PostgreSQL/Prisma.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate
npm run seed
npm run test
npm run dev
```
