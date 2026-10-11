# Plano de execução da Database Foundation — MateMágico Champions

**Fontes oficiais:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md) e [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md).  
**Escopo:** eliminar os gaps de testes PostgreSQL, migrations e CI registrados nessas fontes.  
**Restrições:** plano documental; não inclui código, configuração, migrations ou alteração de ADRs. Não reexecuta auditoria.

## 1. Estado Atual

Fatos registrados nas fontes oficiais:

- O repositório usa npm workspaces, Turborepo, Prisma e PostgreSQL 16; `packages/database` mantém schema Prisma e migration foundation.
- A migration foundation contém, entre outros objetos, o índice parcial de memberships abertas, necessário à garantia de unicidade descrita pelo módulo.
- As suítes DB são condicionais à variável `TEST_DATABASE_URL`; sem ela, usam `describe.skipIf`.
- Na execução documentada, **48 testes dependentes de PostgreSQL foram pulados**: 5 de Auth, 19 de Membership e 24 de E2E da API.
- O script `test` geral passou, mas não substitui a execução das suítes PostgreSQL; `test:db` não existe.
- O workflow CI não provisiona PostgreSQL, não exporta `TEST_DATABASE_URL` e não executa migrations.
- O schema Prisma usa `DATABASE_URL`. A migration parcial não é garantida por `prisma db push`.
- O script existente `db:migrate` é de desenvolvimento (`prisma migrate dev --name foundation`); não há comando de deploy versionado.
- Os testes DB de Membership/API compartilham URL e há configuração para serializar arquivos. A documentação alerta que a suíte Membership apaga dados das tabelas pertinentes.
- O compose local usa volume persistente, portanto não é, por si, fixture efêmera segura para esses testes.

O problema é de **execução e garantia do gate**, não uma afirmação de que schema ou adapters não existam: o schema passou `prisma validate` e os adapters estão implementados, mas não foram exercitados contra PostgreSQL no CI.

## 2. Causa Raiz

### Por que os testes são pulados

1. As suítes DB leem `process.env.TEST_DATABASE_URL` e só criam o cliente Prisma/registram os testes se a variável estiver presente.
2. Sem conexão configurada, `describe.skipIf` marca os grupos de testes como ignorados. O runner retorna sucesso para as suítes unitárias e demais testes, de modo que `npm run test` pode ficar verde apesar dos 48 skips.
3. O CI não inicia PostgreSQL e não define `TEST_DATABASE_URL`; logo, os grupos condicionais não têm como executar naquele workflow.
4. Também não há `test:db` como gate explícito que valide pré-requisitos, exija uma contagem positiva de testes DB e rejeite skips causados por configuração ausente.

### Dependências

- PostgreSQL 16 acessível e pronto para conexões.
- Prisma Client gerado para a versão/dependências instaladas.
- Banco limpo com as migrations versionadas aplicadas, incluindo o índice parcial da migration foundation.
- Os processos Vitest recebem a URL que as suítes consultam; o Prisma CLI recebe a URL que o datasource utiliza.
- Execução serializada onde arquivos compartilham o banco e apagam dados de tabelas.

### Variáveis de ambiente

| Variável            | Consumidor                                     | Regra                                                                                                                             |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Prisma schema/CLI e comandos de migration      | Deve apontar para a instância PostgreSQL descartável preparada para a execução.                                                   |
| `TEST_DATABASE_URL` | Suítes de integração/DB Auth, Membership e API | Deve apontar ao mesmo banco migrado durante aquele run; ausência deve falhar o gate `test:db`, nunca converter os testes em skip. |

As URLs devem ficar disponíveis apenas aos processos que precisam delas, não ser impressas em logs ou publicadas em artifacts. Não se deve reutilizar conexão de desenvolvimento, staging ou produção.

### Infraestrutura ausente

- Serviço PostgreSQL de teste no job CI e readiness check.
- Banco isolado e efêmero por run.
- Aplicação automática das migrations antes dos testes.
- Comando explícito `test:db` integrado à raiz e ao grafo Turbo conforme necessário.
- Verificação de que as suites DB foram coletadas/executadas, em vez de ignoradas.

## 3. Inventário dos Testes

Os caminhos abaixo identificam as suítes registradas como dependentes de DB nas fontes/contexto oficial. Os números são os skips observados; não presumem que cada arquivo contenha apenas testes DB.

### Suítes que exigem PostgreSQL

| Área                      | Arquivos/suítes                                                                                                                                                                                 | Papel e observação                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auth adapters             | `packages/modules/auth/src/infrastructure/persistence/prisma/auth-prisma-adapters.db.test.ts` — **5 testes**                                                                                    | Exercita adapters Prisma de Auth contra banco real.                                                                               |
| Membership adapters/fluxo | `packages/modules/membership/src/infrastructure/persistence/prisma/prisma-adapters.contract.test.ts` e `membership-flow.prisma.test.ts` — **19 testes** no total                                | Testa contrato dos adapters Prisma e fluxo Membership/School Context. Compartilha URL; pode apagar dados das tabelas pertinentes. |
| API E2E com DB            | `apps/api/src/auth-login.e2e.test.ts`, `auth-session.e2e.test.ts`, `membership-create.e2e.test.ts`, `membership-activate.e2e.test.ts` e `membership-grant.e2e.test.ts` — **24 testes** no total | Exercita endpoints/fluxos da API com persistência real. Compartilha a URL do banco e deve seguir serialização configurada.        |
| **Total observado**       | **48 testes pulados**                                                                                                                                                                           | A execução do gate DB deverá reportar execução positiva e zero skips por falta de configuração.                                   |

### Testes que podem permanecer unitários/in-memory

Podem continuar no gate geral sem PostgreSQL:

- testes de entidades, value objects, policies e regras de domínio Auth/Membership;
- testes unitários de application services com ports/fakes/in-memory;
- testes de contratos executados contra repositories in-memory;
- testes de API com doubles/fakes, teste de readiness/health que não dependa de DB e testes da composição com dependências controladas;
- testes de `shared-types`, `logger`, `testing`, `composition-root` e Web que não dependam de banco;
- smoke test Playwright da página Foundation, conforme registrado na auditoria.

Estes testes não substituem os adapters Prisma nem os E2E explicitamente configurados para PostgreSQL.

### O que deve executar no CI

1. **Gate geral `test`:** suítes unitárias/in-memory e testes não-DB, como hoje; seus skips condicionais devem continuar visíveis no output.
2. **Gate dedicado `test:db`:** Auth DB adapters, Membership Prisma contract/flow e os cinco grupos E2E da API que dependem de banco.
3. **Gate de schema/migration:** geração do Prisma Client, validação do schema e deploy das migrations existentes no PostgreSQL efêmero.
4. Não somar resultados de uma execução sem DB como evidência DB; não aceitar `--passWithNoTests` como sucesso se o gate DB não coletou suas suítes esperadas.

## 4. Plano para `test:db`

### Objetivo

Oferecer um comando explícito, repetível e fail-closed para executar todos os testes que dependem de PostgreSQL contra schema migrado, diferenciando-os das suítes unitárias e impedindo o falso verde por ausência de `TEST_DATABASE_URL`.

### Responsabilidades

- Verificar presença das variáveis necessárias antes de iniciar as suítes.
- Executar as suítes DB catalogadas de Auth, Membership e API.
- Preservar a serialização necessária a testes que compartilham uma URL e removem dados.
- Produzir no resultado contagem explícita de testes executados, falhos e ignorados; falhar se nenhum teste DB rodar ou se um skip decorrer de variável ausente.
- Não iniciar ou destruir serviços fora do ambiente de teste; provisionamento é responsabilidade do ambiente local/CI que invoca o comando.
- Não gerar schema ou migrations; recebe banco pronto e migrado.

### Pré-requisitos

1. PostgreSQL 16 exclusivo e descartável, acessível.
2. Prisma Client gerado.
3. Migration deploy concluído em banco limpo.
4. `DATABASE_URL` disponível ao Prisma CLI e `TEST_DATABASE_URL` disponível ao runner, ambas apontando ao banco destinado ao run.
5. Execução serializada nos grupos que compartilham e limpam o estado.

### Resultado esperado

- Exit code zero somente quando todas as suítes DB definidas passarem.
- Exit code diferente de zero diante de variável ausente, PostgreSQL indisponível, falha de migration, suite sem coleta, skip proibido ou falha de teste.
- Contagem maior que zero de testes DB executados e **zero skips por falta de PostgreSQL/configuração**.
- Nenhum acesso a banco persistente compartilhado e nenhuma alteração de migration durante a execução.

## 5. Provisionamento PostgreSQL

### Ambiente local

- Reutilizar o serviço PostgreSQL 16 documentado no compose apenas se o desenvolvedor criar/selecionar um banco **descartável e isolado** para testes; o volume padrão persistente não deve ser assumido seguro.
- Definir `DATABASE_URL` e `TEST_DATABASE_URL` somente no processo/sessão de teste, ambas para o mesmo database temporário.
- Aplicar migrations antes do gate `test:db`; ao término, descartar database/instância temporária conforme o mecanismo local adotado.
- Antes de iniciar, validar que a URL não aponta para produção, staging ou banco de desenvolvimento com dados que devam ser preservados.
- Se não houver ambiente descartável, o comando deve falhar com diagnóstico claro e não tentar selecionar silenciosamente outro banco.

### Ambiente CI

- Subir PostgreSQL 16 efêmero para o job, com credenciais de teste exclusivas e database isolado.
- Esperar readiness efetiva antes de gerar/aplicar schema.
- Exportar as duas URLs aos processos corretos sem imprimir seus valores.
- Usar a mesma instância para migration e testes naquele job; encerrar o serviço e remover seus dados ao final.
- Não compartilhar volume, database ou URL entre jobs, branches ou runs.

### Estratégia de isolamento

- Um database limpo por job/run; testes não executam contra instância persistente.
- Dentro do database compartilhado por suites, respeitar a serialização indicada pela configuração de Membership/API.
- Se o runner paralelizar pacotes, separar bancos por pacote ou manter serialização. Não permitir concorrência de suites destrutivas sobre as mesmas tabelas.
- Teste DB isolado de testes unitários: failure/skip do primeiro não é mascarado pelo sucesso do segundo.

## 6. Migrations

Aplicar o modelo **forward-only** registrado no ADR-0003: migrations versionadas são aplicadas para frente em ordem; falhas de produção são corrigidas por nova migration compensatória/reparadora ou procedimento operacional aprovado, não por rollback destrutivo presumido.

### Ordem de execução

1. Confirmar que o banco de teste é novo, descartável e acessível.
2. Gerar Prisma Client pela versão instalada/documentada no pipeline.
3. Validar o schema Prisma (`db:validate`).
4. Executar o comando de deploy sobre as migrations **já versionadas**, em ordem normal de migration.
5. Confirmar término sem falhas e então iniciar `test:db`.
6. Descartar a instância ao fim do run; não manter estado como base do próximo job.

A auditoria registra uma migration foundation existente. Nenhuma migration nova deve ser criada para habilitar testes ou corrigir o comando de execução. O deploy precisa preservar os objetos SQL que o schema declarativo não expressa integralmente, em particular o índice parcial de Membership aberta.

### Validações

- O schema Prisma continua válido antes do deploy.
- O banco começa vazio e recebe somente migrations versionadas.
- O comando termina sem prompt de desenvolvimento/criação de migration.
- O índice parcial e constraints definidos pela migration são aplicados; `prisma db push` não é substituto.
- Qualquer migration pendente inválida, falha de conexão ou falha de deploy interrompe o job antes dos testes.
- A execução do mesmo fluxo em um database limpo e descartável é reproduzível.

### Critérios de sucesso

- Estado de migration do banco é aplicado até a última migration versionada.
- Nenhuma migration foi gerada, editada ou revertida pelo gate.
- As suites DB começam apenas depois do deploy bem-sucedido e passam sobre banco migrado.
- Correções posteriores de schema são forward-only; problemas detectados neste gate não justificam `db push`, reset de dados preserváveis ou rollback implícito.

## 7. Critérios de Aceite

- [ ] Existe script `test:db` invocável na raiz, com responsabilidade explícita e integrado ao workflow CI.
- [ ] Execução sem `TEST_DATABASE_URL` falha de forma explícita; não transforma as suites em sucesso ignorado.
- [ ] PostgreSQL 16 descartável é provisionado e readiness é confirmada antes das migrations.
- [ ] `DATABASE_URL` alcança Prisma CLI/migration e `TEST_DATABASE_URL` alcança Vitest; ambas apontam ao database isolado da execução e não vazam em logs/artifacts.
- [ ] Aplicam-se as migrations existentes por comando de deploy; nenhuma migration é gerada durante o processo.
- [ ] `db:validate` passa; o deploy aplica a migration foundation e preserva seu índice parcial.
- [ ] Auth DB adapters executam; Membership Prisma contract e fluxo executam; E2E API DB executa.
- [ ] O resultado de `test:db` demonstra quantidade positiva de testes executados, zero falhas e zero skips causados por variável ausente.
- [ ] A contagem de referência cobre os **48 casos historicamente pulados** (Auth 5, Membership 19, API 24), ou uma alteração aprovada das suítes documenta precisamente a nova composição sem reduzir cobertura silenciosamente.
- [ ] Testes que compartilham/limpam tabelas são serializados ou recebem bancos independentes.
- [ ] Cada run usa banco isolado; nenhuma execução local/CI aponta para produção, staging ou banco persistente compartilhado.
- [ ] O CI reprova por serviço indisponível, migration inválida, variável ausente, nenhum teste DB coletado, skip proibido ou falha de teste.
- [ ] O gate geral continua executando testes unitários/in-memory independentemente do gate PostgreSQL.
- [ ] Nenhum código, YAML, configuração ou migration foi criado como parte deste documento.

## 8. Definition of Done — Database Foundation

- [ ] Fluxo de provisionamento PostgreSQL 16 está disponível em CI e documentado para execução local segura.
- [ ] Banco de teste é novo/isolado por run, readiness é verificada e a instância é descartada ao final.
- [ ] `DATABASE_URL` e `TEST_DATABASE_URL` estão mapeadas aos consumidores certos e ausências falham antes de iniciar as suites DB.
- [ ] Existe comando de deploy repetível para migrations versionadas, distinto de `migrate dev`.
- [ ] Migration foundation existente aplica corretamente em banco vazio, inclusive índice parcial; `db push` não é utilizado.
- [ ] `test:db` executa Auth, Membership e API DB suites explicitamente, serializadas quando necessário.
- [ ] Contagens e resultados no CI demonstram que não há os 48 skips por configuração; nenhuma suite esperada fica sem coleta.
- [ ] O workflow executa e registra `db:validate`, deploy de migrations e `test:db`; qualquer falha de infraestrutura/schema/teste reprova o job.
- [ ] Quality gates geral e DB são apresentados separadamente, sem que o sucesso das suítes unitárias mascare DB não executado.
- [ ] Nenhuma migration foi criada/alterada por esta entrega; qualquer reparo de schema futuro seguirá migration forward-only revisada.
- [ ] Nenhuma URL de conexão ou credencial é exposta em log ou artifact.

## 9. Riscos Residuais

Classificação de riscos residuais **após** executar o plano. Não é uma nova auditoria; representa limitações que este escopo de Database Foundation não elimina.

| Nível  | Risco residual                                                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | Nenhum risco P0 identificado nas fontes oficiais para o escopo de execução DB. Isso não equivale a pentest, certificação de segurança ou prontidão de produção.                                                                                          |
| **P1** | As suítes DB são destrutivas para tabelas pertinentes; erro de configuração que aponte para banco persistente ainda pode causar perda de dados. Mitigar com banco descartável, guardas de URL, serialização e nunca reutilizar ambientes compartilhados. |
| **P1** | Testes de adapters e cenários atuais não provam resiliência sob carga, concorrência de produção ou disaster recovery. Esses aspectos ficam fora deste plano.                                                                                             |
| **P1** | Os adapters podem passar contra PostgreSQL e ainda haver lacunas de integração operacional Auth/Users/Schools/autorização; isso está registrado como gap de produto separado, não resolvido pelo gate DB.                                                |
| **P2** | O schema continua limitado ao recorte Auth/Membership; os modelos de Users, Schools e Analytics futuros e suas migrations precisam de planejamento próprio.                                                                                              |
| **P2** | A execução em PostgreSQL 16 não certifica outras versões ou ambientes de deploy; este plano toma a versão 16 registrada como alvo.                                                                                                                       |
| **P2** | Migrations forward-only podem exigir correções compensatórias em caso de defeito; o teste de banco limpo reduz risco de deploy, mas não substitui staging, backup e procedimento operacional de produção.                                                |
