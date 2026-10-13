# Auditoria de Foundation — MateMágico Champions

**Escopo:** estado do monorepo frente à baseline V1 selecionada (ADR-0001, 0002, 0003, 0004, 0005, 0009 e 0010) e ao Definition of Done da Sprint 1.  
**Método:** inspeção de manifests, configuração, código e documentação; execução dos gates locais disponíveis.  
**Limite:** auditoria arquitetural e de prontidão; não é pentest, teste de carga, revisão jurídica nem prova de prontidão para produção.

> Os ADRs da baseline permanecem `Proposed`; “vigentes” neste relatório significa referências selecionadas para a V1, não decisões formalmente aprovadas. A baseline e seu status constam no [índice de ADRs](ADRs/INDEX.md) e na [baseline arquitetural V1](ADRs/V1-ARCHITECTURAL-BASELINE.md).

## 1. Estrutura Encontrada

O monorepo usa **npm workspaces** com Turborepo. O `packageManager` da raiz declara npm 11.11.0 e inclui `apps/*`, `packages/*` e `packages/modules/*`. Não existe `pnpm-workspace.yaml`; essa ausência é coerente com a configuração npm atual, não uma divergência.

```text
apps/
  api/                         servidor HTTP Node.js
  web/                         Next.js App Router
packages/
  composition-root/            composição dos serviços e adaptadores
  database/                    cliente Prisma, schema e migrations
  events/                      namespace e metadados de eventos
  logger/                      logger compartilhado
  modules/
    auth/                      domínio, aplicação e persistência Auth
    membership/                Membership, roles e School Context
  shared-types/                tipos compartilhados
  testing/                     suporte e testes de integração
scripts/
  README.md                    não há scripts executáveis no diretório
```

### Apps e packages

| Tipo    | Nome                           | Estado observado                                                                                                                                                            |
| ------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App     | `apps/api` (`@matemagico/api`) | Servidor `node:http` com health/readiness e rotas de Auth e Membership; possui testes HTTP e suítes E2E condicionais a PostgreSQL.                                          |
| App     | `apps/web` (`@matemagico/web`) | Next.js 15 App Router; página Foundation, layout, CSS e um smoke test Playwright. Não há jornadas de produto, features, Server Actions ou integração Auth.js implementadas. |
| Package | `packages/composition-root`    | Monta Auth, Membership, repositories e portas; inclui adaptadores provisórios fail-closed.                                                                                  |
| Package | `packages/database`            | Cliente Prisma, schema PostgreSQL e uma migration foundation.                                                                                                               |
| Package | `packages/events`              | Exporta somente metadados-base; o README declara o namespace reservado à fundação futura do event bus.                                                                      |
| Package | `packages/logger`              | Logger compartilhado.                                                                                                                                                       |
| Package | `packages/modules/auth`        | Serviços de autenticação/sessão, entidades, ports e adapters Prisma.                                                                                                        |
| Package | `packages/modules/membership`  | Membership, grants, permissões derivadas e School Context, com implementações in-memory e Prisma.                                                                           |
| Package | `packages/shared-types`        | Tipos básicos compartilhados.                                                                                                                                               |
| Package | `packages/testing`             | Suporte e cenário de fluxo MVP.                                                                                                                                             |

Existem **2 apps e 8 packages** (10 manifests de workspace). `packages/modules` é apenas o agrupador dos dois módulos presentes; Users, Schools e os demais bounded contexts do mapa conceitual ainda não têm package próprio.

## 2. Componentes Existentes

| Componente       | Estado atual                                                                                                                                                                                                                                                           | Aderência e limite                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **database**     | PostgreSQL 16 em Docker Compose; Prisma 6; schema com `AuthAccount`, `PasswordCredential`, `Session`, `SchoolMembership`, `Role`, `RolePermission`, `RoleGrantAllowlist` e `Grant`. A migration adiciona, entre outros objetos, o índice parcial de Membership aberta. | A base de persistência existe e `prisma validate` passa. O modelo cobre o recorte Auth/Membership do MVP, não o mapa de dados completo do ADR-0003. A migration precisa ser aplicada via `migrate deploy` para preservar o índice parcial; o script existente `db:migrate` usa `prisma migrate dev`. |
| **events**       | `EventFoundationMetadata` contém `correlationId` e `causationId` opcionais; sem `eventId`, `eventType`, `schemaVersion`, `occurredAt`, schema/runtime validation ou testes próprios. O publisher provisório de Membership descarta eventos.                            | Ainda não é o contrato/envelope nem o mecanismo de comunicação definidos no ADR-0002 e previstos para esta Foundation no [plano da Sprint 1](SPRINT1-IMPLEMENTATION-PLAN.md).                                                                                                                        |
| **auth**         | Módulo com entidades e serviços de login/sessão/logout, persistência Prisma e testes unitários/in-memory e condicionais a banco.                                                                                                                                       | O código pesquisado não contém dependência nem integração Auth.js. O root usa `noUserRepository` e `rejectAllPasswordVerifier` por padrão; são defaults fail-closed, não adapters operacionais.                                                                                                      |
| **membership**   | Módulo com criação/ativação, grants, roles e resolução/validação de School Context; repositories in-memory e Prisma.                                                                                                                                                   | Portas `ActorAuthorizer`, `UserDirectory` e `SchoolDirectory` são preenchidas por defaults que negam ou não encontram entidades. `Role`/`Grant` estão no schema, mas as portas externas não têm implementações reais.                                                                                |
| **shared-types** | Package enxuto com export e teste básico.                                                                                                                                                                                                                              | Aderente à intenção de manter tipos compartilhados pequenos; a regra de arquitetura correspondente existe, mas outras fronteiras de módulos não estão suficientemente cobertas.                                                                                                                      |
| **web**          | App Router com uma página estática Foundation e um teste de renderização; Playwright executa um smoke test Chromium.                                                                                                                                                   | O framework está instalado, mas a organização feature-based, jornadas, design system e composição de UI do ADR-0010 não estão demonstrados.                                                                                                                                                          |
| **api**          | Processo HTTP Node separado, expõe `/health`, `/ready`, login/sessão e operações de Membership.                                                                                                                                                                        | Existe superfície HTTP funcional de MVP, mas não equivale à estratégia BFF por Server Actions do ADR-0005; não há integração dela com Auth.js. A relação entre esse processo e o BFF do frontend não está documentada como decisão.                                                                  |

### Prisma e migrations

- A migration `20260103000000_foundation` e o schema Prisma existem; `npm run db:validate` confirma que o schema declarativo é válido.
- O índice único parcial para memberships abertas não está representado integralmente no schema Prisma. O README de Membership orienta aplicar migrations, e não `db push`.
- O banco compartilhado e o uso de IDs para referenciar entidades de outros owners são compatíveis com a direção do ADR-0003; não foi encontrada evidência de isolamento/execução de migrations no CI.
- Há um `.env` local em `packages/database`; seus valores não foram inspecionados nem reproduzidos. `.env.example` existe.

### Docker Compose

O [compose local](../../docker-compose.yml) declara PostgreSQL 16, porta publicada e volume persistente. É um serviço local de desenvolvimento, não um banco efêmero de teste: não há healthcheck nem configuração de job de CI associada. Os valores no YAML são defaults de desenvolvimento e não foram tratados como credenciais de produção.

### Scripts disponíveis

- Raiz: `build`, `dev`, `lint`, `format`, `format:check`, `test`, `test:coverage`, `test:e2e`, `test:architecture`, `db:generate`, `db:validate` e `db:migrate`.
- `scripts/` contém somente README e não tem scripts executáveis.
- Não há `test:db` nem `db:migrate:deploy` nos manifests. `turbo.json` não declara task `test:db`; a task `test` é cacheável e só declara `coverage/**` como output.

### Testes, arquitetura e CI

- [GitHub Actions CI](../../.github/workflows/ci.yml) executa `npm ci`, geração do Prisma Client, formato, lint, testes, build e dependency-cruiser em Node 22.
- O workflow não sobe PostgreSQL, não define `TEST_DATABASE_URL` e não aplica migrations. As suítes DB usam `describe.skipIf` quando a variável não está definida.
- `.dependency-cruiser.js` verifica ciclos e uma regra de `shared-types`; outras regras nomeadas se referem a `questions`, `attempts` e `rankings`, módulos ainda ausentes. Não se observou cobertura equivalente de ownership/imports internos para Auth e Membership nem fixtures que provem que imports proibidos fazem o gate falhar.
- `apps/api` e Membership configuram serialização de arquivos de teste porque suas suítes DB compartilham `TEST_DATABASE_URL`; a documentação de Membership alerta que os testes Prisma apagam dados das tabelas do módulo. Portanto, qualquer execução DB precisa de banco isolado e descartável.

## 3. Divergências

| Prioridade             | Baseline / expectativa                                                                                                              | Estado encontrado                                                                                                                                                                        | Consequência                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1                     | Sprint 1: testar adapters Prisma em PostgreSQL migrado no CI, sem skips por falta de URL.                                           | O workflow não provisiona banco. Nesta execução, **48 testes dependentes de banco foram pulados**; não existe `test:db`.                                                                 | O CI dá verde sem validar migrations, índices parciais, transações e adapters PostgreSQL.                                                                                      |
| P1                     | ADR-0002 e Sprint 1: contratos de eventos versionados, correlation/causation obrigatórios e ownership explícito; testar fronteiras. | `packages/events` só exporta metadados com IDs opcionais; sem envelope validado ou testes; publisher default descarta eventos.                                                           | Não há garantia testável para integração assíncrona ou para evoluir as projeções propostas no ADR-0009.                                                                        |
| P1                     | ADR-0002 e Sprint 1: fitness checks executáveis para as fronteiras relevantes.                                                      | O check passa, mas regras concretas focam módulos ausentes; não há regra/fixture demonstrando bloqueio de violações nos módulos presentes.                                               | O resultado positivo não certifica as fronteiras Auth/Membership nem protege a expansão da Onda 2.                                                                             |
| P1 — produto           | ADR-0004: Auth.js Credentials, sessão JWT com registro/revogação server-side e autorização contextual real.                         | Sem dependência/integração Auth.js. A API expõe rotas próprias; defaults do composition root não encontram usuários, rejeitam senhas e negam autorização.                                | O fluxo operacional de login e de Membership não está pronto para uso real; defaults impedem concessões, mas também tornam a composição incapaz de operar.                     |
| P2                     | ADR-0005/0010: Next.js como BFF de mutações e UI feature-based, acessível e responsiva.                                             | O frontend só apresenta uma página Foundation; nenhuma Server Action, jornada ou feature está implementada. A API é um processo separado sem decisão explícita de sua relação com o BFF. | A arquitetura de frontend está scaffoldada, não demonstrada por uma jornada. Não bloqueia os gates técnicos da Sprint 1.                                                       |
| P2 — capacidade futura | ADR-0003/0009: ownership de dados por contexto e Analytics derivado de eventos.                                                     | Não há packages de Users, Schools ou Analytics, nem consumers, projeções, outbox/inbox ou telemetry store.                                                                               | O schema atual não representa todo o produto e ainda não suporta Analytics. O plano da Sprint 1 explicitamente não inclui criar esses módulos nem implementar outbox/consumer. |
| P2                     | Execução repetível de migrations de CI/deploy.                                                                                      | O script `db:migrate` é `prisma migrate dev --name foundation`; falta comando de deploy versionado e workflow que o exercite.                                                            | A execução de migrations fora do fluxo local de desenvolvimento não está comprovada.                                                                                           |

**Observação sobre o package manager:** não há divergência por ausência de pnpm. O repositório adota npm workspaces no manifest e lockfile, e o CI usa `npm ci`.

## 4. Riscos

| Nível  | Risco                                                                                           | Evidência / efeito                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | Nenhum risco P0 foi classificado nesta auditoria de Foundation.                                 | Isto não representa certificação de segurança, revisão legal ou pentest.                                                                                                                |
| **P1** | Falso verde em persistência.                                                                    | Os testes de adapters e E2E que dependem de PostgreSQL são pulados no pipeline atual; 48 skips observados localmente.                                                                   |
| **P1** | Fronteiras modulares podem regredir sem alarme.                                                 | As regras passam, mas não exercitam adequadamente imports proibidos entre os módulos existentes. A Onda 2 aumentará a superfície de dependências.                                       |
| **P1** | Eventos podem ser perdidos e não têm contrato evolutivo.                                        | O publisher padrão descarta eventos; não há envelope versionado. Outbox não é escopo da Sprint 1, mas o estado atual não permite declarar a fundação de contratos de eventos concluída. |
| **P1** | Jornadas reais de Auth/Membership não operam com a composição padrão.                           | Users/Schools/authorization/password adapters são ausentes ou provisórios e fail-closed; Auth.js exigido pelo ADR-0004 não está integrado.                                              |
| **P2** | Frontend e Analytics podem ser confundidos com capacidades prontas por existirem packages/apps. | Web é somente uma landing foundation; events não alimenta projeções e não existe Analytics.                                                                                             |
| **P2** | Drift de migration/constraint fora do Prisma declarativo.                                       | O índice parcial depende da migration SQL; `db push` não o garante e o CI ainda não aplica migrations.                                                                                  |
| **P2** | Testes locais DB poderiam afetar dados não descartáveis.                                        | README do módulo alerta que suites Prisma apagam tabelas do módulo. A variável DB deve apontar apenas a uma instância isolada e descartável.                                            |

## 5. Bloqueadores

### Para declarar Foundation Done e iniciar a Onda 2 conforme o plano registrado

1. **CI PostgreSQL:** adicionar PostgreSQL descartável ao job, aguardar disponibilidade, aplicar migrations versionadas e fornecer `TEST_DATABASE_URL` explicitamente.
2. **Gate DB explícito:** criar o comando/task `test:db` exigido pelo plano, garantir que não seja cacheado ou pulado quando o CI o executa e verificar que a contagem de testes DB executados é maior que zero. Hoje `npm run test:db` termina com `Missing script`.
3. **Contrato de eventos:** implementar e testar o envelope versionado e validar os campos requeridos pelo plano; manter payload e ownership nos módulos produtores. O evento não precisa de broker, consumer ou outbox neste sprint.
4. **Fitness checks para os módulos existentes:** estender as regras e demonstrar por teste/fixture que uma dependência proibida ou ciclo reprova o comando de arquitetura.

Esses quatro itens correspondem aos critérios e ao DoD documentados em [SPRINT1-IMPLEMENTATION-PLAN.md](SPRINT1-IMPLEMENTATION-PLAN.md). Os gates locais de formato, lint, testes in-memory, build, Prisma validation e smoke web passam; não substituem os quatro itens acima.

### Para operação de jornadas autenticadas (não é requisito de implementação da Sprint 1)

- Resolver e implementar a integração de autenticação conforme ADR-0004, incluindo Auth.js e composição real de user lookup, verificação de senha, autorização, User e School; remover defaults provisórios do caminho operacional.
- Definir/documentar se a API Node permanece como superfície adicional e como se relaciona ao BFF Next.js do ADR-0005.
- Esses itens são necessários antes de afirmar prontidão de login/Membership real ou produção, mas o plano da Sprint 1 explicitamente não pede reimplementação dos módulos MVP.

## 6. Prontidão

Notas de 0 a 100 para o recorte auditado. São avaliações qualitativas de Foundation, não métricas de runtime nem certificações.

| Área      |   Nota | Justificativa                                                                                                                                                                                                                                     |
| --------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo  | **82** | Workspaces npm, Turbo e scripts consistentes; lint/build/format passam. A fitness function não cobre suficientemente os módulos existentes e falta task DB não cacheável.                                                                         |
| Banco     | **62** | PostgreSQL + Prisma, schema/migration válidos e adapters implementados. Sem execução DB no CI; script de migration é apenas `migrate dev`; modelo restrito a Auth/Membership.                                                                     |
| Eventos   | **18** | Package reservado e metadata mínima existem. Faltam envelope validado/versionado, testes, publishers operacionais e garantias de entrega.                                                                                                         |
| Testes    | **68** | Suítes unitárias/in-memory e um smoke Playwright passam. 48 testes condicionais DB foram ignorados nesta execução; `test:db` ausente.                                                                                                             |
| CI        | **58** | Formato, lint, testes, build e arquitetura estão no workflow e passam localmente. Pipeline não prova migrations nem persistência real e não executa o smoke Playwright.                                                                           |
| Segurança | **45** | Há policies de sessão, controle fail-closed e lógica de autorização no domínio. Não há Auth.js conforme baseline, adapters operacionais ou evidência de hardening/avaliação independente. Não é uma conclusão sobre vulnerabilidades exploráveis. |

## 7. Próximas Correções

Ordem recomendada para concluir **a Onda 1**, sem ampliar o escopo para features ou novas arquiteturas:

1. Atualizar `.github/workflows/ci.yml` para provisionar PostgreSQL de teste isolado, aguardar health, aplicar migration deploy e exportar `TEST_DATABASE_URL` ao job.
2. Adicionar o comando de deploy de migrations e a task `test:db` na raiz/workspace e no `turbo.json`; configurar a task para sempre executar e não reutilizar cache quando depende do banco.
3. Executar no CI as suites Prisma de Auth, Membership e API; falhar o job se a configuração de banco estiver ausente ou se essas suites forem puladas. Preservar banco descartável por job.
4. Completar `packages/events` com o contrato comum versionado e validação de runtime prevista no plano; tornar obrigatórios os campos mandatórios do envelope, incluindo `correlationId` e `causationId`.
5. Definir/testar os contratos dos eventos Membership já existentes sem mover seus payloads para o pacote comum; manter a alteração compatível com nomes e semântica atuais.
6. Estender `.dependency-cruiser.js` às fronteiras reais de Auth, Membership, shared packages e Events; adicionar fixture(s) negativas para provar que imports/ciclos proibidos quebram `npm run test:architecture`.
7. Reexecutar os gates abaixo, atualizar as contagens/evidências e marcar Foundation Done apenas após todos passarem sem skips DB.

Fora da Onda 1, mas necessário antes de jornadas reais/produção: integração Auth.js e adapters de Users/Schools/autorização/senha; decisão sobre a superfície API versus BFF; jornada UI conforme ADR-0005/0010; instrumentação/projeções conforme ADR-0009. Não criar Analytics, outbox, broker ou módulos de produto como parte das correções da Sprint 1: eles estão fora do escopo documentado.

### Evidência de validação desta auditoria

| Comando                     | Resultado observado                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `npm run format:check`      | **PASS**                                                                             |
| `npm run lint`              | **PASS**                                                                             |
| `npm run test`              | **PASS**, 265 testes passaram e 48 foram pulados por ausência de `TEST_DATABASE_URL` |
| `npm run test:e2e`          | **PASS**, 1 smoke test Chromium                                                      |
| `npm run build`             | **PASS**                                                                             |
| `npm run test:architecture` | **PASS** no grafo/configuração atuais; escopo insuficiente conforme acima            |
| `npm run db:validate`       | **PASS**, schema Prisma válido                                                       |
| `npm run test:db`           | **NÃO DISPONÍVEL**, npm retorna `Missing script: "test:db"`                          |

Os 48 skips incluem testes Prisma de Auth/Membership e E2E da API dependentes do banco. O processo atual não tinha `TEST_DATABASE_URL` nem `DATABASE_URL` no ambiente; nenhuma migration foi aplicada a banco local ou persistente durante a auditoria.

## 8. Resumo Executivo para Prompt 02

1. O monorepo npm/Turbo tem 2 apps e 8 packages; formato, lint, build e validação Prisma passam.
2. O smoke test Playwright passa (1 teste); as suítes não-DB também passam.
3. `npm run test` passou 265 testes, mas pulou 48 testes dependentes de PostgreSQL.
4. CI não provisiona PostgreSQL, não aplica migrations e não define `TEST_DATABASE_URL`.
5. `test:db` não existe; os adapters Prisma e E2E DB não são gate efetivo de CI.
6. `@matemagico/events` ainda não tem envelope versionado/validado e o publisher provisório descarta eventos.
7. dependency-cruiser passa, mas não testa adequadamente as fronteiras de Auth/Membership existentes.
8. Auth.js e adapters reais de Users/Schools/autorização/senha não estão integrados; defaults operacionais falham fechados.
9. Web é apenas uma landing Foundation; não há jornadas ou Server Actions. Analytics também não está implementado.
10. Foundation Done e início da Onda 2 devem aguardar CI DB, contratos de eventos e fitness checks conforme o DoD da Sprint 1.
