# Plano de execução da CI Foundation — MateMágico Champions

**Fontes oficiais:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md), [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md), [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md), [EVENT-FOUNDATION-PLAN.md](EVENT-FOUNDATION-PLAN.md) e [SECURITY-FOUNDATION-PLAN.md](SECURITY-FOUNDATION-PLAN.md).  
**Escopo:** plano documental para concluir a CI Foundation da Onda 1. Não reexecuta auditorias, não altera ADRs, não propõe arquitetura nova e não inclui código, YAML, scripts, configuração ou workflow.

> Este documento trata CI Foundation, não de prontidão de produção. Os ADRs permanecem `Proposed`; a baseline selecionada é referência, não prova de aprovação ou implementação.

## 1. Estado Atual

Fatos registrados nos documentos oficiais:

- O monorepo usa npm workspaces, `package-lock.json`, Turborepo e Node 22 no workflow observado.
- O GitHub Actions CI executa `npm ci`, geração do Prisma Client, `format:check`, `lint`, `test`, `build` e `test:architecture`.
- No estado auditado, esses gates passaram localmente. `db:validate` também passou localmente, mas não consta entre as etapas registradas do workflow CI.
- `lint` e `build` incluem verificações TypeScript por scripts/configuração dos workspaces, mas não há um passo separado chamado `typecheck` documentado.
- `test:e2e` existe como script Playwright e um smoke test de Web passou localmente; a auditoria registra que o CI não executa esse smoke test.
- O workflow não provisiona PostgreSQL, não configura `DATABASE_URL`/`TEST_DATABASE_URL` e não aplica migrations.
- Quarenta e oito testes condicionais a PostgreSQL foram pulados: 5 Auth, 19 Membership e 24 E2E da API.
- Não existe `test:db` nem um comando `db:migrate:deploy`; o script disponível `db:migrate` usa `prisma migrate dev --name foundation`.
- A migration foundation contém índice parcial que `prisma db push` não garante; os documentos requerem aplicar migrations versionadas.
- O check de arquitetura passa, mas as fontes registram cobertura insuficiente dos boundaries atuais e ausência de fixtures negativas para comprovar que violações bloqueiam o gate.
- O pacote Events ainda não tem contrato/envelope completo validado ou testes de contrato; o publisher provisório Membership descarta eventos. A Event Foundation exige testes de contrato, mas exclui broker, consumers e outbox/inbox.
- Security Foundation requer gates de dependency review, `npm audit` e secret scanning; os documentos não confirmam que esses gates estejam implementados no CI.
- O estado atual de Auth.js/adapters é fail-closed/provisório; integração operacional é gap de produto e não se torna pronta pelo simples sucesso do pipeline estrutural.

## 2. Inventário do Pipeline

| Área              | O que já existe, segundo as fontes                                                                                                                                                              | Estado no CI documentado                                                                                     | Lacuna/limite                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**         | Script raiz `build` executa Turbo; workflows atuais executam `npm run build`. Build Web inclui verificação de tipo durante o build; apps/packages também têm scripts de compilação/verificação. | Presente como gate.                                                                                          | Não se deve interpretar build verde como prova de testes PostgreSQL, jornadas completas ou prontidão de produção.                              |
| **Lint**          | Script raiz `lint` executa `turbo run lint`; CI o invoca.                                                                                                                                       | Presente como gate.                                                                                          | Lint não substitui teste, validação de schema ou checks explícitos de segurança.                                                               |
| **Typecheck**     | A auditoria registra TypeScript dentro de scripts de lint/build dos workspaces; não registra comando/passo independente chamado `typecheck`.                                                    | Não há etapa separada documentada. A verificação de tipos ocorre indiretamente onde os scripts a executam.   | Se um gate nomeado e uniforme for exigido, isso deve ser acordado na implementação; não classificar como comando CI independente já existente. |
| **Test**          | Script raiz `test` executa `turbo run test`; suítes unitárias/in-memory existem.                                                                                                                | Presente e passou na execução auditada.                                                                      | Pode passar com 48 skips DB por uso de `describe.skipIf`; não prova persistência real.                                                         |
| **E2E**           | Script `test:e2e` existe para Playwright; um smoke test Chromium da página Foundation passou localmente. API tem suites E2E condicionais a DB.                                                  | O smoke Web não é executado pelo workflow descrito. E2E de API com DB fica ignorado sem `TEST_DATABASE_URL`. | Ausência de smoke Web no CI e ausência de execução E2E API DB efetiva.                                                                         |
| **Architecture**  | `test:architecture` usa dependency-cruiser para validar o grafo.                                                                                                                                | Presente e passa com as regras atuais.                                                                       | As regras não cobrem adequadamente os módulos existentes Auth/Membership; não há fixtures negativas demonstradas.                              |
| **DB validation** | `db:validate` executa `prisma validate` e passou localmente. `db:generate` também existe.                                                                                                       | Geração de Prisma Client está no workflow; `db:validate` não está listado como etapa CI.                     | Sem `db:validate` CI, PostgreSQL, deploy de migrations ou `test:db`, o pipeline não certifica schema aplicado nem adapters DB.                 |

## 3. Lacunas Confirmadas

Listadas exclusivamente a partir dos documentos oficiais.

### P0

**Nenhuma lacuna foi classificada como P0** nas fontes oficiais. Isso não é certificação de segurança ou produção.

### P1

| Lacuna                                                                                                                                    | Evidência oficial                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CI sem PostgreSQL, sem deploy de migrations, sem URLs DB e sem `test:db`; 48 testes DB pulados.                                           | FOUNDATION-AUDIT.md e DATABASE-EXECUTION-PLAN.md.                    |
| Architecture gate verde não prova limites dos módulos atuais; regras relevantes para Auth/Membership e fixtures negativas estão ausentes. | FOUNDATION-AUDIT.md e STRUCTURE-REPORT.md.                           |
| Event contracts ainda não têm envelope runtime/versionado, testes próprios ou CI de contrato; publisher padrão descarta eventos.          | FOUNDATION-AUDIT.md, STRUCTURE-REPORT.md e EVENT-FOUNDATION-PLAN.md. |
| Security gates dependency review, `npm audit` e secret scanning não estão confirmados como etapas de CI.                                  | SECURITY-FOUNDATION-PLAN.md.                                         |
| `db:validate` passou localmente, mas não é etapa do workflow registrado.                                                                  | FOUNDATION-AUDIT.md e DATABASE-EXECUTION-PLAN.md.                    |

### P2

| Lacuna                                                                                                               | Evidência oficial                                      | Tratamento na CI Foundation                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smoke test Playwright da Web não executa no CI observado.                                                            | FOUNDATION-AUDIT.md.                                   | Incluir como gate leve quando viável no workflow da Onda 1; distingui-lo das suites de jornada/produto ainda inexistentes.                                |
| `typecheck` não aparece como etapa independente; verificações TypeScript estão incorporadas a `lint`/`build`.        | FOUNDATION-AUDIT.md e scripts descritos no inventário. | Registrar claramente quais gates cobrem tipos; não duplicar ou afirmar comando independente já presente sem decisão de implementação.                     |
| Integração Auth.js/adapters reais não opera; frontend não tem jornadas, Users/Schools/Analytics futuros não existem. | FOUNDATION-AUDIT.md e STRUCTURE-REPORT.md.             | Não bloquear a CI Foundation estrutural por capacidades de produto fora do escopo; gates Auth/E2E de produto serão ampliados quando houver implementação. |
| Consumers Analytics e outbox/inbox não existem.                                                                      | EVENT-FOUNDATION-PLAN.md.                              | Fora do escopo; não criar esses componentes para concluir CI Foundation.                                                                                  |
| `npm audit` e dependency review dependem de threshold/política de exceção aprovados.                                 | SECURITY-FOUNDATION-PLAN.md.                           | Definir threshold, owner e expiração de exceção antes de tornar o gate bloqueante.                                                                        |

## 4. Banco no CI

### Provisionamento PostgreSQL

- Usar PostgreSQL **16**, conforme ambiente documentado, como serviço efêmero do job.
- Dedicar uma instância/database limpo por execução; não compartilhar volume, serviço ou estado entre jobs.
- Confirmar readiness real antes de executar Prisma ou Vitest; inicialização do container não basta.
- Credenciais são exclusivas de teste, com privilégio restrito à instância descartável. Nenhuma credencial de produção é injetada em pull requests.
- Não reutilizar o volume persistente do Compose local como banco de CI; não reutilizar os defaults de desenvolvimento em produção.

### Migrations

1. Gerar Prisma Client conforme o fluxo atual.
2. Executar `db:validate`.
3. Aplicar as migrations existentes por um comando versionado de deploy, distinto de `migrate dev`.
4. Não usar `prisma db push`: a migration foundation contém índice parcial não garantido por esse comando.
5. Não criar/alterar migrations como parte da simples ativação do CI Foundation.
6. Se a migration falhar ou houver drift/estado incompleto, reprovar o job antes de iniciar testes DB; não converter falha em warning.

### Isolamento dos testes

- `DATABASE_URL` é entregue ao Prisma CLI/schema/migration.
- `TEST_DATABASE_URL` é entregue ao processo Vitest que registra as suítes DB.
- As duas URLs apontam para o mesmo database efêmero e migrado durante o job; valores não aparecem em logs ou artifacts.
- Auth, Membership e API compartilham banco em parte das suítes. Manter serialização documentada ou isolamento por database antes de paralelizar; não executar simultaneamente testes que apagam as mesmas tabelas.
- Garantir descarte do database com o encerramento do job.

## 5. Test Database

### Estratégia para `test:db`

Criar um gate explícito de integração PostgreSQL, separado do `test` geral, que:

- execute Auth Prisma adapters, Membership Prisma contract/flow e E2E DB da API;
- valide pré-requisitos antes de iniciar suites;
- falhe quando qualquer variável necessária, PostgreSQL, migration ou suite esperada estiver indisponível;
- reporte contagem de testes executados, falhas e skips;
- exija quantidade positiva de testes DB e nenhum skip decorrente de configuração ausente;
- não seja atendido por cache de execução anterior, pois o resultado depende de estado real do banco.

O comando não provisiona nem migra o banco sozinho; o job/ambiente é responsável por preparar PostgreSQL e aplicar migrations antes da invocação.

### Ordem de execução

1. Instalação reproduzível via `npm ci`.
2. Provisionamento PostgreSQL 16 e readiness check.
3. Geração Prisma Client.
4. `db:validate`.
5. Configuração de `DATABASE_URL` e `TEST_DATABASE_URL` para o banco isolado.
6. Deploy das migrations versionadas existentes em banco vazio.
7. Execução serializada de `test:db`.
8. Execução dos quality gates não-DB e compilação/build.
9. Encerramento e descarte do serviço/database.

Os quality gates podem executar em paralelo somente quando independentes do DB e sem compartilhamento destrutivo de recursos. A sequência acima é a ordem de dependências para o caminho DB.

### Pré-requisitos

- PostgreSQL 16 acessível e limpo.
- Prisma Client gerado.
- Schema validado e migrations existentes aplicadas.
- `DATABASE_URL` e `TEST_DATABASE_URL` disponíveis aos consumidores certos e apontando ao mesmo DB descartável.
- Serialização/isolamento para testes que compartilham URL e apagam dados.
- Detecção de suites não coletadas ou ignoradas; `--passWithNoTests` não pode produzir falso positivo do gate DB.

## 6. Quality Gates

### Gates bloqueantes para CI Foundation Done

| Gate                            | Requisito de bloqueio                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**                       | Build de apps/packages passa. Falha de compilação ou de verificação de tipos já incluída no build reprova o job.                                                                                           |
| **Lint**                        | `lint` passa em todos os workspaces.                                                                                                                                                                       |
| **Typecheck**                   | A verificação TypeScript incorporada em `lint`/`build` continua obrigatória. Se o projeto optar por uma etapa independente, ela deve cobrir os workspaces e ser um gate real; não aceitar uma etapa vazia. |
| **Architecture**                | `test:architecture` passa no grafo normal; fixtures negativas provam que ciclos/imports proibidos em apps/packages/modules atuais fazem o gate reprovar.                                                   |
| **Unit tests**                  | `test` passa para suítes unitárias/in-memory. Skips condicionais DB devem ficar visíveis e não contar como cobertura PostgreSQL.                                                                           |
| **Database tests**              | `test:db` executa os casos DB esperados no PostgreSQL migrado; zero skips por falta de URL, contagem executada maior que zero, falha de conexão/migration/suíte bloqueia.                                  |
| **DB validation/migrations**    | `db:validate` e deploy das migrations versionadas passam em DB efêmero antes dos DB tests.                                                                                                                 |
| **Event contracts**             | Testes de envelope/payload e contratos de eventos owner-owned passam; alteração incompatível sem versão/compatibilidade aprovada bloqueia. Publisher discard não vale como evidência de entrega.           |
| **Security: dependency review** | Mudanças de dependências são revisadas conforme política; vulnerabilidade acima do threshold acordado bloqueia ou exige exceção registrada com owner/prazo.                                                |
| **Security: npm audit**         | Audit roda contra lockfile do PR e bloqueia conforme threshold definido; indisponibilidade/falha da ferramenta não vira sucesso.                                                                           |
| **Security: secret scanning**   | Secrets plausíveis em diff/repositório bloqueiam merge; valor é mascarado; suspeita de vazamento requer revogação/rotação.                                                                                 |

### E2E smoke

- O smoke Playwright da Web passou na execução local auditada, mas não está no workflow registrado.
- Planejar sua inclusão como gate bloqueante de smoke apenas se for estável, independente de dados sensíveis e executável no runner disponível; a evidência do CI deve incluir teste realmente coletado e executado.
- Os cinco grupos E2E da API que dependem do PostgreSQL fazem parte de `test:db`, não do smoke Web. Devem executar no banco isolado e não podem ser contabilizados como cobertos quando skipados.
- A ausência atual de jornada de produto na Web limita o que o smoke verifica; ele não substitui E2E de Auth/Membership real nem prova readiness de produção.

### Ordem agregada sugerida dos gates

1. Checkout, `npm ci`, geração Prisma.
2. Provisionar DB, readiness, variáveis, `db:validate` e migrations.
3. Executar `test:db` sem skips.
4. Executar `format:check`, `lint`/typecheck, `test`, `build`, `test:architecture` e testes de contrato Events.
5. Executar dependency review, `npm audit` e secret scanning.
6. Executar smoke Playwright quando incluído e estável.
7. Publicar status de cada gate; merge só fica apto quando todos os gates definidos como obrigatórios estiverem verdes.

## 7. Critérios de Aceite

- [ ] O workflow CI usa instalação reproduzível (`npm ci`) e mantém os gates já existentes.
- [ ] PostgreSQL 16 é iniciado por job, readiness verificada e database descartado após execução.
- [ ] `DATABASE_URL` e `TEST_DATABASE_URL` são injetados apenas nos steps necessários, apontam ao DB efêmero e não aparecem em logs/artifacts.
- [ ] Prisma Client é gerado; `db:validate` passa no CI.
- [ ] Migrations existentes são aplicadas por comando deploy não interativo em banco vazio; índice parcial foundation está presente; `db push` não é usado.
- [ ] Existe comando `test:db` integrado ao CI, não cacheado, com pré-requisitos e failure explícitos.
- [ ] Auth (5), Membership (19) e API E2E DB (24) são executados ou eventual mudança de escopo é documentada sem reduzir cobertura silenciosamente; zero skips por variável ausente.
- [ ] Testes que compartilham/limpam tabelas são serializados ou segregados por database.
- [ ] Build, lint, typecheck coberto, unit tests e architecture gate passam.
- [ ] Architecture fixtures negativas demonstram que violações representativas em boundaries atuais bloqueiam.
- [ ] Contract tests Events executam no CI e bloqueiam evento inválido ou breaking change sem versionamento explícito.
- [ ] Dependency review, `npm audit` e secret scanning têm política de threshold/exceção definida e funcionam como gates; pull requests não recebem secrets de produção.
- [ ] O smoke E2E Web, se incorporado como gate, executa pelo menos um teste real; não é reportado como cobertura de jornada que ainda não existe.
- [ ] Falhas de infraestrutura, schema, migração, teste, análise de dependência ou ferramenta de segurança não têm fallback para sucesso.
- [ ] Resultados CI deixam clara a distinção entre gates gerais, DB, E2E e security.

## 8. Definition of Done — CI Foundation

- [ ] O workflow cobre o caminho DB completo, de PostgreSQL 16 saudável ao deploy das migrations versionadas e `test:db`.
- [ ] As 48 omissões DB observadas foram eliminadas do gate CI: testes executados, zero skip devido à configuração ausente e contagem demonstrável.
- [ ] Banco é isolado/efêmero e os testes destrutivos não podem apontar para ambientes persistentes.
- [ ] Os gates existentes de format, lint, build, test e architecture seguem verdes; `db:validate` e contract tests Events estão incluídos.
- [ ] Fitness checks para modules/packages atuais têm fixtures negativas válidas.
- [ ] Dependency review, `npm audit` e secret scanning bloqueiam merge conforme política documentada.
- [ ] Nenhum secret de produção é exposto a PR/CI; URLs e tokens não aparecem em log, artifact ou output de falha.
- [ ] Smoke E2E Web executa no CI se estiver definido como obrigatório, sem ser confundido com E2E DB da API.
- [ ] Exceções temporárias de segurança têm owner, justificativa, mitigação e expiração; não existem bypasses silenciosos.
- [ ] O status de CI representa testes realmente executados e não usa `--passWithNoTests`, skips ou cache para fabricar aprovação de um gate DB.
- [ ] Nenhuma feature de produto, consumer Analytics, broker, outbox ou módulo futuro é necessária para a conclusão estrutural da CI Foundation.
- [ ] A conclusão do CI Foundation não é apresentada como auditoria de segurança, pentest ou prontidão de produção.

## 9. Riscos Residuais

Classificação derivada dos riscos/lacunas já registrados nos documentos oficiais. Não é uma nova avaliação.

### P0

**Nenhum risco P0** foi classificado nas fontes oficiais para a CI Foundation.

### P1

| Risco residual                                                                                                                                  | Mitigação/limite                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Pipeline verde não prova ausência de vulnerabilidades exploráveis, pois Foundation Audit não foi pentest nem revisão de código de segurança.    | Manter declaração explícita de escopo; realizar avaliação de segurança separada antes de produção. |
| Auth.js e adapters reais de User/School/authorization/password não estão integrados; testes estruturais não tornam jornadas reais operacionais. | Tratar como gate de produto antes de declarar Auth/Membership operacional ou liberar produção.     |
| Testes DB limpam tabelas e podem causar perda caso apontem a ambiente persistente.                                                              | DB descartável por job, credencial exclusiva, URLs mascaradas e serialização.                      |
| Thresholds de `npm audit`/dependency review ainda requerem política definida para evitar tanto bloqueios ambíguos quanto falso verde.           | Definir threshold, exceção, owner e expiração antes de tornar o gate efetivo.                      |

### P2

| Risco residual                                                                                                                   | Mitigação/limite                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Smoke Web cobre apenas a página Foundation; não há jornada real de produto a validar.                                            | Relatar exatamente a cobertura executada; adicionar E2E de jornadas quando entregues.                      |
| Analytics, event consumers, outbox/inbox e telemetria não existem.                                                               | Fora do escopo Onda 1 estrutural; implementar por backlog futuro com seus gates próprios.                  |
| Validação em PostgreSQL 16 não prova outras versões, ambientes de deploy, performance ou recuperação/DR.                         | Tratar compatibilidade, carga, staging e DR em planos próprios, sem inferir capacidade pelos gates atuais. |
| MFA é pré-condição para papéis privilegiados em produção segundo ADR-0004, mas capacidade não está demonstrada na CI Foundation. | Bloquear liberação desses papéis até integração e testes MFA específicos.                                  |

## 10. Resumo Executivo

1. **O que falta para Foundation Done?** PostgreSQL efêmero, migrations deploy, `test:db` não cacheável e sem skips; `db:validate` no CI; boundaries e contract tests Events efetivamente cobertos; gates de dependency review, `npm audit` e secret scanning. O smoke Playwright também não roda no CI observado.
2. **Como integrar PostgreSQL?** Serviço PostgreSQL 16 isolado por job, readiness check, URLs de teste restritas, geração Prisma, validação, migrations existentes via deploy e descarte do DB ao final.
3. **Como habilitar `test:db`?** Criar comando dedicado com Auth/Membership/API DB suites, exigir `DATABASE_URL`/`TEST_DATABASE_URL`, execução positiva, serialização e falha em variável ausente, migração falha ou skip.
4. **Quais gates devem bloquear merge?** Build, lint/typecheck coberto, architecture com fixtures negativas, unit tests, database tests/migrations, DB validation, contract tests Events, dependency review, `npm audit`, secret scanning e smoke E2E quando incluído como gate.
5. **Qual a sequência mínima?** (1) comando deploy + Postgres/readiness, (2) URLs + migrations + `db:validate`, (3) `test:db` sem skips, (4) completar architecture/event/security gates, (5) decidir e habilitar smoke Playwright, (6) exigir todos os gates no status de merge.
