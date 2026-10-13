# Plano de implementacao — Sprint 1

**Produto:** MateMágico Champions  
**Baseline:** ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0009 e ADR-0010  
**Fonte de planejamento:** [Backlog executavel V1](../backlog/V1-EXECUTABLE-BACKLOG.md) e [CSV de importacao](../backlog/V1-EXECUTABLE-BACKLOG.csv)  
**Work items:** `FEAT-V1-01-02`, `FEAT-V1-01-03`, `US-V1-01-02-01`, `US-V1-01-02-02`, `US-V1-01-03-01`  
**Restricao:** plano/documentacao; nao implementa codigo de negocio.

> O [SPRINT1-BACKLOG anterior](SPRINT1-BACKLOG.md) descreve o recorte legado de Auth/Membership. Esse produto ja esta registrado como entregue em [MVP READY](../releases/MVP-READY.md). Para este plano, Sprint 1 significa a iteracao 1 do backlog executavel V1, conforme solicitado; nao reabre nem duplica aquele escopo.

## 1. Resultado esperado

Ao fim do Sprint 1, a fundacao existente deve ter verificacoes arquiteturais executaveis no CI, contratos de eventos com envelope/schema versionados e validados, e os testes dos adapters Prisma rodando contra PostgreSQL descartavel no CI. O Sprint nao entrega novas jornadas de produto, consumers, event bus de producao, outbox/inbox ou alteracoes ao modelo Prisma.

### Escopo

1. Automatizar limites de imports e ausencia de ciclos para os pacotes existentes e regras aprovadas de ownership.
2. Completar a base de contratos do pacote `@matemagico/events` e documentar como contextos donos publicam seus payloads.
3. Habilitar PostgreSQL 16 no workflow CI, aplicar migrations existentes e executar explicitamente os testes de adapters que hoje podem ser pulados sem `TEST_DATABASE_URL`.
4. Preservar os comandos e a topologia npm workspaces/Turborepo existentes, alterando configuracao somente para tornar as verificacoes acima deterministicas.

### Fora do escopo

- Criar agregados, regras pedagogicas, endpoints, componentes de interface ou qualquer codigo de dominio.
- Alterar tabelas, entidades, constraints ou migrations de `packages/database/prisma`; o schema atual ja sustenta o MVP publicado.
- Implementar outbox/inbox, broker, consumer, retry/replay operacional ou publicar eventos adicionais.
- Criar novos bounded contexts, converter o monolito em microservices ou redesenhar os ADRs.
- Reimplementar Auth, Session, Membership ou School Context ja publicados em [MVP READY](../releases/MVP-READY.md).
- ADR-0006, ADR-0007 e ADR-0008, que sao `Superseded` e nao integram a baseline deste plano.

## 2. Estrutura de diretorios

Manter os workspaces e pacotes atuais. Criar somente os diretorios necessarios aos contratos e testes deste Sprint; nao scaffoldar os modulos futuros listados como possibilidade nos ADRs.

```text
.
├── .dependency-cruiser.js                 # regras executaveis de fronteira/ciclos
├── .github/
│   └── workflows/
│       └── ci.yml                         # PostgreSQL de teste + migrations + suites
├── apps/
│   ├── api/                               # existente; sem mudanca funcional no Sprint
│   └── web/                               # existente; sem mudanca funcional no Sprint
├── packages/
│   ├── events/                            # fundacao tecnica de eventos ja existente
│   │   ├── src/
│   │   │   ├── envelope/                  # envelope/meta/schema comuns e neutros
│   │   │   ├── validation/                # adaptador fino de validacao em runtime
│   │   │   └── index.ts                   # superficie publica minima
│   │   └── src/**/*.test.ts               # validacao de envelope e compatibilidade
│   ├── modules/
│   │   ├── auth/                          # owner existente; testes Prisma/contratos
│   │   └── membership/                    # owner existente
│   │       ├── src/contracts/events/       # payloads Membership-owned existentes
│   │       └── src/**/*.test.ts
│   ├── database/
│   │   └── prisma/                        # schema/migrations atuais; sem alteracao
│   └── ...                                # demais workspaces existentes
└── turbo.json                             # tarefas existentes; extensao pontual para test:db
```

`packages/events` define apenas tipos/envelope e validacao tecnica transversal. Cada modulo produtor permanece dono do contrato/payload de seu evento e o exporta pela sua superficie publica. O pacote comum nao importa modulos, entidades, repositories nem tipos internos de dominio.

## 3. Ordem de criacao e execucao dos pacotes

Esta ordem estabelece dependencias de engenharia; nao e ordem de criacao de bounded contexts.

| Ordem | Pacote/superficie                        | Trabalho do Sprint                                                                                              | Gate de saida                                                                                  |
| ----- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0     | Workspace raiz e CI                      | Confirmar npm workspaces, scripts, Node/npm e variaveis de banco isoladas; preservar scripts padrao.            | Instalacao reproduzivel com `npm ci`; comandos existentes continuam disponiveis.               |
| 1     | Regras de arquitetura                    | Estender `.dependency-cruiser.js` para as fronteiras definidas nos ADRs e pacotes presentes.                    | `npm run test:architecture` passa; fixture de import interno/ciclo falha como esperado.        |
| 2     | `@matemagico/events`                     | Definir envelope versionado e validacao de runtime, sem broker nem consumer.                                    | Testes de contrato rejeitam payload incompleto/malformado e aceitam payload valido minimizado. |
| 3     | Contratos de eventos dos owners          | Reconciliar somente os eventos existentes de Membership com o envelope comum; nao criar evento de negocio novo. | Producer continua publicando apenas fatos ja documentados e preserva ownership do payload.     |
| 4     | `@matemagico/database` + Auth/Membership | Executar `prisma generate`, `prisma validate`, migrations existentes e testes Prisma em banco descartavel.      | Auth e Membership DB suites rodam em vez de serem puladas; banco e limpo/isolado por job.      |
| 5     | Workflow de CI                           | Orquestrar instalacao, PostgreSQL, migrations, testes, lint, build, format e architecture checks.               | PR falha se migration, suite DB, contratos ou regra de arquitetura falhar.                     |

### Dependencia entre tarefas

`npm ci` e PostgreSQL saudavel → migrations deploy → testes de adapters Auth/Membership;  
`dependency-cruiser` baseline → envelope comum → contratos dos owners → testes de contrato;  
ambos os caminhos convergem no workflow CI e no Definition of Done.

## 4. Schema conceitual inicial

### 4.1 Contrato de evento — nao e schema de banco

O Sprint define a estrutura logica de um evento e seus criterios de compatibilidade. Nao altera `schema.prisma`, nao cria tabela de eventos e nao define persistencia/outbox; isso pertence ao trabalho posterior de persistencia e confiabilidade.

| Campo conceitual | Cardinalidade | Regra                                                                                                                                   |
| ---------------- | ------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `eventId`        |   Obrigatorio | Identificador unico e estavel do fato.                                                                                                  |
| `eventType`      |   Obrigatorio | Nome estavel em ingles, no passado, pertencente ao catalogo do modulo produtor.                                                         |
| `schemaVersion`  |   Obrigatorio | Inteiro positivo; alteracao incompatível exige nova versao e transicao/compatibilidade aprovadas.                                       |
| `occurredAt`     |   Obrigatorio | Instante UTC serializado em RFC 3339/ISO 8601; fato de negocio, nao horario de consumo.                                                 |
| `correlationId`  |   Obrigatorio | Identificador para correlacionar request/jornada entre fronteiras.                                                                      |
| `causationId`    |   Obrigatorio | Identificador do comando/evento que originou o fato, sem token secreto.                                                                 |
| `schoolId`       |   Condicional | Obrigatorio para fato pertencente a um tenant escolar; omitido somente para fato explicitamente global.                                 |
| `actorRef`       |   Condicional | Referencia minima ao ator/sistema quando necessaria ao fato; sem claims de autorizacao.                                                 |
| `aggregateRef`   |   Condicional | Tipo e identificador do agregado owner quando o fato descreve agregado; sem serializar entidade ou dados internos.                      |
| `payload`        |   Obrigatorio | DTO especifico e minimizado, validado pelo schema do modulo produtor; nunca inclui senha, hash, token, segredo MFA ou PII nao aprovada. |

Diagrama conceitual:

```text
IntegrationEvent
├── metadata: eventId, eventType, schemaVersion, occurredAt
├── trace: correlationId, causationId
├── scope: schoolId?                 # condicionado ao fato
├── source: actorRef?, aggregateRef
└── payload: EventPayload@schemaVersion
```

Na implementacao atual, `EventFoundationMetadata` marca `correlationId` e `causationId` como opcionais. O contrato novo deve seguir ADR-0002 e torna-los obrigatorios para eventos publicados sob o envelope V1. Antes de alterar a superficie atual, comparar usos reais: a busca no workspace encontrou o tipo base e publishers/ports existentes em Membership, sem consumidores de `@matemagico/events`. Nao fazer conversao silenciosa nem remover metadados de publishers existentes; migrar payloads e testes explicitamente.

### 4.2 Eventos de escopo deste Sprint

Somente payloads que ja pertencem a Membership e estao listados nos ADRs/contratos atuais, como `MembershipCreated` e `RoleGranted`, podem ser adaptados ao envelope. Confirmar nome, produtor, momento de emissao e dados do payload contra os contratos aprovados antes de fechar schema. Nao introduzir evento novo, consumidor, retencao ou efeito de Analytics neste Sprint.

### 4.3 Persistencia Prisma

- `packages/database/prisma/schema.prisma` e as migrations existentes sao entrada para testes de integracao; nao se adiciona tabela para envelope, event store ou outbox.
- O deploy de migration deve usar `prisma migrate deploy` em banco de teste vazio, antes dos adapters.
- Todo teste capaz de apagar linhas usa apenas `TEST_DATABASE_URL` apontando a uma instancia descartavel exclusiva do job.

## 5. Dependencias NPM e scripts

Usar `npm` workspaces com `package-lock.json` raiz e Node 22, conforme CI atual. Turborepo resolve a ordem dos scripts conforme o package graph; nao criar `pnpm-workspace.yaml` nem duplicar lockfile.

| Pacote                                        | Dependencias ja disponiveis/relevantes                                                      | Plano Sprint 1                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raiz                                          | `turbo`, `dependency-cruiser`, `typescript`, `prettier`, `@commitlint/*`, Husky/lint-staged | Reutilizar; sem instalar ferramenta paralela de arquitetura.                                                                                                                          |
| `@matemagico/events`                          | `typescript`, `vitest`                                                                      | Adicionar **Zod** como dependencia direta de runtime para validar eventos no limite e inferir tipos TypeScript. Instalar no workspace que usa o schema; registrar versao no lockfile. |
| `@matemagico/auth` e `@matemagico/membership` | `vitest`, `@prisma/client`                                                                  | Reutilizar para testes unitarios e de integracao. Separar suites dependentes de banco em script `test:db`.                                                                            |
| `@matemagico/database`                        | `prisma`, `@prisma/client` 6.7.x                                                            | Reutilizar Prisma atual; adicionar script `db:migrate:deploy` para ambiente de teste/CI sem usar `migrate dev`.                                                                       |
| CI                                            | GitHub Actions checkout/setup-node existentes; PostgreSQL service container                 | Nenhuma dependencia NPM para subir Postgres; usar service container `postgres:16-alpine`.                                                                                             |

Comandos de preparacao quando a implementacao iniciar:

```text
npm install zod --workspace @matemagico/events
npm run db:generate --workspace @matemagico/database
npm run db:validate --workspace @matemagico/database
npm run test:architecture
```

Nao adicionar SDK de broker, ORM, migrator, `pg` ou cliente HTTP no Sprint 1. O Prisma Client conecta os testes existentes ao PostgreSQL.

## 6. Configuracao do monorepo

### 6.1 Workspaces e dependencias

- Manter o `package.json` raiz com `apps/*`, `packages/*` e `packages/modules/*`; cada workspace novo requer `package.json` proprio. Os pacotes listados ja existem.
- Dependencia entre workspaces deve ser declarada no `package.json` consumidor, nao resolvida por imports relativos atravessando pacotes. Somente `packages/modules/membership` depende do contrato tecnico comum necessario; `@matemagico/events` nao depende de Auth/Membership.
- Dependencias externas ficam no workspace que as importa; ferramentas de repositorio permanecem na raiz.
- Preservar `package-lock.json` unico e `npm ci` como instalacao CI.

### 6.2 Turborepo

O `turbo.json` atual tem tarefas `build`, `lint`, `test`, `test:coverage` e `dev`. A configuracao de build usa `^build`; as tasks sao executadas conforme o grafo DAG derivado de dependencias declaradas pelos workspaces.

- Preservar definicoes existentes e outputs; nao criar scripts sem correspondencia em `package.json`.
- Adicionar script `test:db` nos workspaces Auth/Membership e no root como runner direcionado. A tarefa Turborepo `test:db` deve definir `cache: false` e allowlist `env: ["TEST_DATABASE_URL"]`, para nao restaurar resultado cacheado nem ocultar que o teste DB depende do ambiente.
- Manter modo estrito de variaveis; nao usar modo `loose` como correcao de CI. `TEST_DATABASE_URL` deve estar declarado na configuracao da tarefa e fornecido pelo job.
- Executar migration deploy explicitamente antes de `test:db`; nao depender de implicit ordering ou side effects no teste.
- `test` comum pode continuar cobrindo suites unitarias/in-memory; `test:db` deve selecionar somente as suites Prisma que precisam de PostgreSQL e deve falhar se nao recebeu URL.

### 6.3 CI e banco de testes

Estender o workflow `.github/workflows/ci.yml` atual:

1. Manter checkout, Node 22, cache npm e `npm ci`.
2. Declarar service PostgreSQL 16 com health check; criar database/usuario temporarios e sem dados persistentes entre execucoes.
3. Definir `DATABASE_URL` somente no step de migration e `TEST_DATABASE_URL` somente no step `test:db`; ambos apontam para o banco descartavel deste job.
4. Gerar Prisma Client e validar schema; aplicar `prisma migrate deploy` ao banco descartavel.
5. Rodar `npm run test:db` com suites de adapters Auth e Membership, confirmando que nao foram skipped.
6. Rodar format check, lint, unit/integration suite restante, build e `npm run test:architecture`.
7. Nao imprimir URLs, secrets ou credenciais no log; nao compartilhar banco entre jobs concorrentes.

O workflow e a fonte de automacao. `docker-compose.yml` segue util para desenvolvimento local, mas nao substitui um service Postgres isolado do GitHub Actions.

## 7. Estrategia de testes

| Nivel                  | Alvo                                    | Verificacoes de aceite                                                                                                                                                                |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitario               | Schema/envelope em `packages/events`    | Evento valido parseia; campos requeridos, timestamp, versao, `schoolId` condicional e payload malformado sao validados/rejeitados.                                                    |
| Contrato               | Eventos existentes do modulo Membership | `MembershipCreated` e `RoleGranted` correspondem a producer contracts aprovados, tem versao e payload minimizado; mudanca incompatível falha ate bump/revisao.                        |
| Architecture fitness   | `.dependency-cruiser.js`                | Sem ciclos; shared packages sem infraestrutura; eventos sem imports de modulos; consumidores usam superficies publicas; regras exercitam imports proibidos por fixtures/configuração. |
| Integracao PostgreSQL  | Auth e Membership Prisma adapters       | Rodar sobre banco limpo migrado; cobrir constraints, transacoes/serializacao onde ja existe, unicidades e lifecycle dos repositories; suite nao pode ser skipped no CI.               |
| Integracao de pipeline | GitHub Actions                          | CI provisiona Postgres, aguarda health, aplica migration deploy e executa suites DB; qualquer indisponibilidade/falha bloqueia o job.                                                 |
| Regressao              | Workspace existente                     | `format:check`, `lint`, `test`, `build` e `test:architecture` preservam comportamento dos pacotes existentes.                                                                         |

Nao executar teste de carga, consumer replay, outbox, E2E de jornada de produto ou migracao de schema neste Sprint: esses itens dependem de capacidades posteriores.

## 8. Criterios de aceite da Sprint

1. `npm ci` instala todos os workspaces a partir do lockfile raiz.
2. `npm run test:architecture` passa no grafo atual; ao introduzir artificialmente um ciclo/import interno proibido, a verificacao reprova.
3. `@matemagico/events` publica uma superficie minima com envelope versionado e validacao de runtime; eventos e payloads tem owner claro e nao carregam secrets/PII nao aprovada.
4. Contratos de eventos existentes adaptados nao alteram nomes ou semantica de negocio sem aprovacao; `correlationId` e `causationId` atendem ao envelope ADR-0002.
5. O workflow provisiona PostgreSQL temporario, aplica migrations existentes e executa testes Prisma Auth/Membership com contagem de testes esperada diferente de zero e nenhum skip por falta de `TEST_DATABASE_URL`.
6. Os testes DB nao rodam contra banco compartilhado, desenvolvimento persistente ou producao e nao usam `prisma db push`.
7. Scripts/cache/env do Turborepo nao permitem falso verde: `test:db` sempre executa e recebe explicitamente `TEST_DATABASE_URL`.
8. Checks existentes de format, lint, tests, build e arquitetura passam em PR.
9. Nenhum schema/migration de negocio, endpoint, consumer ou funcionalidade de produto foi adicionado.

## 9. Definition of Done — checklist

- [ ] Work items do Sprint 1 (`US-V1-01-02-01`, `US-V1-01-02-02`, `US-V1-01-03-01` e Tasks associadas) estao ligados a PRs e criterios demonstrados.
- [ ] Regras de fronteira refletem owners/dependencias vigentes e nao proíbem fluxo permitido por ADR-0002.
- [ ] `@matemagico/events` tem contrato comum pequeno; payloads permanecem nos owners; nenhum consumidor novo foi incluido.
- [ ] `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `correlationId`, `causationId`, `schoolId` condicional, references minimas e payload minimizado estao cobertos por testes.
- [ ] Decisao de compatibilidade para o `EventFoundationMetadata` existente esta registrada; publishers atuais continuam cobertos por seus testes.
- [ ] Zod foi adicionado somente ao workspace consumidor e lockfile npm atualizado.
- [ ] `db:migrate:deploy` usa migrations versionadas e e exercitado em banco descartavel; nenhuma migration/schema Prisma foi criada ou alterada para este escopo.
- [ ] `TEST_DATABASE_URL` esta explicitamente disponivel ao Turborepo e ao processo Vitest no step de integracao; testes DB nao sao cacheados nem ignorados.
- [ ] Suites de adapters Auth/Membership passam em PostgreSQL 16 no CI; falha de banco, migration ou teste reprova PR.
- [ ] `npm run format:check`, `npm run lint`, `npm run test`, `npm run build` e `npm run test:architecture` passam; `npm run test:db` passa sem skips.
- [ ] Nenhum segredo, URL de conexao ou PII e exposto em fixtures/logs/artifacts.
- [ ] Documentacao de eventos, execucao local e CI esta atualizada; backlog vincula status e evidencia de aceite.

## Referencias de configuracao

- [Pacote `@matemagico/events`](../../packages/events/README.md)
- [Dívidas técnicas conhecidas](../backlog/TECH-DEBT.md)
- [Release MVP publicada](../releases/MVP-READY.md)
- [ADR-0002 — fronteiras e eventos](ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — persistencia e migrations](ADRs/ADR-0003-database-strategy.md)
- [ADR-0009 — Analytics e telemetria](ADRs/ADR-0009%20-%20Analytics,%20Telemetry%20and%20Educational%20Insights%20Strategy)
- Documentacao Turborepo instalada no repositorio: `node_modules/turbo/docs/README.md`, `crafting-your-repository/configuring-tasks.mdx`, `structuring-a-repository.mdx`, `managing-dependencies.mdx` e `using-environment-variables.mdx`.
