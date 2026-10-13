# Matemagico

MateMágico Champions é uma plataforma SaaS educacional para treino de estudantes das Olimpíadas Brasileiras de Matemática (OBMEP). Este repositório contém a base arquitetural e o **baseline do MVP** dos módulos de identidade e acesso escolar.

## Status

```text
P10 IMPLEMENTADO
RELEASE v0.2.0-mvp PENDENTE
```

O hardening do Prompt 10 foi implementado e os gates locais de testes, build, lint, arquitetura, formatacao, DB e Playwright passaram. A stack Docker de staging e o smoke flow foram validados localmente. A release existente e `v0.1.0-mvp-ready`; nao criar a tag `v0.2.0-mvp` ate obter evidencia do CI remoto e de um staging real. Escopo em [docs/product/MVP-SCOPE.md](docs/product/MVP-SCOPE.md), ADRs em [ADR-INDEX](docs/architecture/ADRs/ADR-INDEX.md), operacao em [docs/engineering/operations.md](docs/engineering/operations.md) e dividas em [TECH-DEBT.md](TECH-DEBT.md).

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

**Prompt 05 concluído**: `@matemagico/question-engine` seleciona apenas questões PUBLISHED e `isCurrent`, sem repetição e de forma determinística por seed; insuficiência falha explicitamente. `@matemagico/mock-exams` cria simulados DRAFT com seleção ordenada e referências persistidas `(questionId, questionVersion)`. Publicação congela o conteúdo referenciado; o início retorna questões sem gabarito e não cria Attempt. Rotas: `GET/POST /exams`, `GET /exams/:id`, `POST /exams/:id/{publish,archive,start}`. Criação exige `exam:create`; publicação/arquivamento, `exam:publish`; alunos usam `school:read` e só listam/iniciam simulados publicados dentro da janela. Attempts, rankings e jornada escolar foram entregues nos Prompts 06-09.

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

## Editorial Pipeline (Prompt 04.1)

This section supersedes the earlier Prompt 04 notes above where lifecycle labels predate the
editorial workflow. Question ingestion is editorial, not publication. XLSX uploads create `IMPORTED` questions; only
questions corrected in `IN_REVIEW`, validated and marked `APPROVED` can be published. Published
versions are immutable, and new versions re-enter the editorial flow. See
[the editorial pipeline](docs/questions/EDITORIAL-PIPELINE.md) and
[the import formats](docs/questions/IMPORT-FORMAT.md). Real OBMEP content remains unauthorized
until written permission is recorded in ADR-0011. The current question bank is global, so school IDs
authorize editorial actions but do not provide content isolation.

## Estrutura

```text
packages/database            Schema Prisma e migrations (PostgreSQL)
packages/modules/auth        Módulo Auth: domínio, serviços, adapters Prisma
packages/modules/membership  Módulo Membership + School Context: domínio, serviços, adapters Prisma
packages/testing             Testes end-to-end entre módulos
docs/architecture            ADRs, contratos, decisões e planos de implementação
```

Outros diretórios: `apps/api` (API HTTP com Auth, Membership, banco de questões, simulados, rankings, `/health`, `/ready` e `/metrics`), `apps/web` (jornadas de aluno e equipe escolar), `packages/shared-types`, `packages/logger`, `packages/events` e `packages/modules/audit`.

## Hardening (Prompt 10)

Implementados: eventos de auditoria em Auth, Membership, Exams, Attempts e privacidade; limiter de login persistido no PostgreSQL; cache de autorização em memória; logs JSON com contexto de request; métricas Prometheus; request IDs; headers de segurança; exportação/desativação do próprio usuário; `/health` e `/ready`; CI com gates de qualidade; contratos OpenAPI; Compose de staging e smoke test. Validação local passou em lint, build, unitários, DB, Playwright, arquitetura, formatação e geração OpenAPI; o smoke flow Docker local também passou. A release continua pendente de execução do workflow remoto e validação em staging real. Consulte [docs/engineering/operations.md](docs/engineering/operations.md).

Para executar todos os gates: `npm run lint`, `npm run build`, `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run test:architecture`, `npm run format:check`, `npm run openapi --workspace @matemagico/api` e `npm run smoke-test` (com as variáveis descritas na documentação operacional).

## Testes e evidências locais

Última validação local (2026-10-13): `npm test` passou com 456 testes e 88 testes DB-gated pulados; `npm run test:db` passou com 102; Playwright passou 6/6. Lint e build passaram nos 21 workspaces, architecture check passou (739 módulos/1.078 dependências), format check passou, Prisma validou e a geração OpenAPI foi idempotente. O smoke flow também passou na stack Docker local. CI remoto e staging real ainda precisam ser validados antes de criar a tag `v0.2.0-mvp`.

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
