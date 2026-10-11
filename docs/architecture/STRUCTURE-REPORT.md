# Plano executável de correção estrutural — MateMágico Champions

**Fonte de estado:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md).  
**Escopo:** plano de trabalho derivado exclusivamente das divergências ali registradas. Não reavalia o repositório, não altera ADRs, não define arquitetura nova e não inclui código, migrations ou configuração.

> As classificações abaixo reproduzem as prioridades atribuídas na auditoria. P0 está vazio. “P1 — produto” e “P2 — capacidade futura” permanecem rotulados para não confundir bloqueadores de Foundation com entregas posteriores. Uma correção P2 não é pré-requisito para fechar os gates técnicos da Onda 1, salvo se o escopo de produto correspondente for iniciado.

## 1. Divergências Confirmadas

Somente as divergências descritas em [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md) são listadas.

### P0

**Nenhuma divergência classificada como P0** na auditoria.

### P1

| ID           | Divergência confirmada                                                                                                                                                                                   | Condição para remoção                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1           | CI não provisiona PostgreSQL, não aplica migrations nem injeta `TEST_DATABASE_URL`; 48 testes dependentes de PostgreSQL foram pulados. Não existe `test:db`.                                             | CI usa PostgreSQL descartável, aplica as migrations existentes e executa suites DB explicitamente, sem skips por configuração ausente.                           |
| D2           | `packages/events` não oferece envelope completo/versionado/validado; `correlationId` e `causationId` são opcionais e o publisher provisório descarta eventos.                                            | Contrato comum e validação previstos na Sprint 1 estão implementados e cobertos por testes; eventos existentes de Membership preservam owner, nomes e semântica. |
| D3           | O gate de dependency-cruiser passa, mas não demonstra enforcement adequado dos limites dos módulos atuais; regras específicas incluem módulos inexistentes e não há prova negativa para Auth/Membership. | As fronteiras relevantes para apps/packages/modules têm regras executáveis e fixtures negativas que falham quando introduzidas violações representativas.        |
| D4 — produto | Auth.js não está integrado; composição padrão usa adapters fail-closed provisórios para users, senha, autorização e school, impedindo operação real das jornadas Auth/Membership.                        | Integração e adapters requeridos pelo ADR-0004 são implementados e exercitados por testes de fluxo; defaults provisórios deixam de ser o caminho operacional.    |

### P2

| ID  | Divergência confirmada                                                                                                                                                                     | Condição para remoção                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D5  | A web é somente uma página Foundation: não há jornada, Server Action ou estrutura feature-based demonstrada; a relação entre o app API Node e o BFF não está explicitada na implementação. | Existe uma jornada web conforme o ADR-0005/0010 e sua integração com a API está definida na execução, sem duplicar responsabilidades.                                          |
| D6  | Não existem packages de Users, Schools ou Analytics, consumers, projeções, outbox/inbox ou telemetry store; o modelo permanece no recorte Auth/Membership.                                 | As capacidades forem implementadas segundo os owners e escopo documentados nos ADRs vigentes, em trabalho próprio da Onda 2+; não são requisito para Foundation Done/Sprint 1. |
| D7  | O comando existente `db:migrate` usa `prisma migrate dev`; não há comando de deploy versionado nem execução repetível de migrations de CI/deploy.                                          | Existe caminho explícito e repetível de deploy para migrations existentes e ele é exercitado em banco descartável no CI.                                                       |

Não são divergências: ausência de `pnpm-workspace.yaml` (o repositório usa npm workspaces) e ausência de outbox/broker/consumers durante a Sprint 1, cujo plano os exclui explicitamente.

## 2. Correções Necessárias

Os arquivos abaixo são alvos previstos para a implementação das correções, não confirmação de alterações realizadas. Os nomes de novos testes/fixtures são categorias de artefatos; este relatório não prescreve nomes de arquivos ainda inexistentes.

| ID  | Arquivo(s) afetados                                                                                                                                                                                                                                              | Package(s) afetados                                                                                                                                                                                                                       | Impacto                                                                                                                                                                                   | Dependências                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `.github/workflows/ci.yml`; `package.json` raiz; `turbo.json`; manifest e scripts de `packages/database`; manifests/configuração de testes em `packages/modules/auth`, `packages/modules/membership` e `apps/api`                                                | `@matemagico/database`, `@matemagico/auth`, `@matemagico/membership`, `@matemagico/api`                                                                                                                                                   | Substitui o falso verde por execução verificável de adapters e fluxos integrados contra PostgreSQL; torna ausência de DB/configuração uma falha explícita do gate dedicado.               | D7 para deploy repetível antes dos testes; banco PostgreSQL isolado e migrations existentes.                                                                           |
| D2  | `packages/events/src/index.ts`, `packages/events` (schemas e testes), contratos públicos de eventos no módulo Membership, publisher/composição em `packages/modules/membership` e `packages/composition-root`; documentação diretamente ligada a esses contratos | `@matemagico/events`, `@matemagico/membership`, `@matemagico/composition-root`                                                                                                                                                            | Estabelece metadata e validação estáveis sem transferir ownership dos payloads; permite consumidores posteriores compreenderem versão e contexto do evento. Não implementa broker/outbox. | Contrato comum definido antes de adaptar os produtores; compatibilidade com os nomes e fatos Membership existentes.                                                    |
| D3  | `.dependency-cruiser.js`; testes/fixtures da regra em `tests/` ou área de teste arquitetural já usada pelo projeto; eventualmente manifests públicos dos módulos se forem necessários para validar a fronteira                                                   | `@matemagico/api`, `@matemagico/web`, `@matemagico/composition-root`, `@matemagico/database`, `@matemagico/events`, `@matemagico/auth`, `@matemagico/membership`, `@matemagico/shared-types`, `@matemagico/logger`, `@matemagico/testing` | Faz o resultado de architecture fitness representar regras aplicáveis aos componentes realmente existentes e prova que uma violação reprova o gate.                                       | Inventário e direções permitidas/proibidas já documentados nos ADRs vigentes; definir fixtures de teste que não contaminem o grafo normal.                             |
| D4  | `package.json` e lockfile se a dependência Auth.js for necessária; bootstrap/composição em `apps/web` e `packages/composition-root`; adapters dos módulos Auth/Membership; testes de integração e documentação de execução                                       | `@matemagico/web`, `@matemagico/auth`, `@matemagico/membership`, `@matemagico/composition-root`, `@matemagico/database`                                                                                                                   | Permite fluxo operacional de autenticação/autorização em vez de negação invariável; mantém verificação contextual e persistência cobertas no servidor.                                    | Resolver D1/D7 para validar persistência real; definir e implementar os adapters reais de Users, Schools, senha e autorização; manter sessão/claims conforme ADR-0004. |
| D5  | `apps/web/src/app/**`, estrutura de features/composição da UI em `apps/web/src/**`, integração de entrada na API em `apps/api/src/**`, testes web/integração e documentação técnica da relação entre esses adapters                                              | `@matemagico/web`, `@matemagico/api` e contratos públicos dos módulos owners                                                                                                                                                              | Demonstra o fluxo de leitura/mutação conforme a estratégia vigente e deixa explícita a responsabilidade da API Node em relação ao BFF.                                                    | D4 para jornada autenticada; contratos de aplicação dos módulos existentes; não acessar Prisma/repositories pela UI.                                                   |
| D6  | Workspaces novos em `packages/modules/` para Users e Schools e, quando priorizado, Analytics; schema/migrations apenas quando requisitos e ownership dessas capacidades forem aprovados; consumers/projeções e testes correspondentes                            | Novos packages owners; `@matemagico/events`, `@matemagico/database`, composition e apps consumidores                                                                                                                                      | Completa as capacidades de domínio e analíticas ausentes, preservando isolamento/ownership e projeções derivadas de eventos. Não é trabalho da Sprint 1 nem requisito de Foundation Done. | D2 para contratos de eventos; D3 para proteger as novas fronteiras; requisitos de produto e sequência aprovados; persistência testável (D1/D7).                        |
| D7  | Manifest/scripts em `packages/database`; `package.json` raiz; `.github/workflows/ci.yml`; `turbo.json` quando o comando/task participar do grafo Turbo                                                                                                           | `@matemagico/database` e workflow do monorepo                                                                                                                                                                                             | Distingue migration de desenvolvimento (`migrate dev`) de aplicação repetível das migrations existentes; habilita CI e ambientes descartáveis sem gerar migrations novas.                 | Utilizar somente as migrations versionadas já existentes, incluindo a migration foundation e seu índice parcial; PostgreSQL vazio/descartável.                         |

### Limite de escopo da correção

- D1, D2 e D3, com D7 como pré-requisito de D1, são o caminho mínimo para fechar a estrutura da Sprint 1 conforme o DoD registrado.
- D4 é uma lacuna de operação Auth/Membership identificada pela auditoria, mas não deve ser confundida com o escopo de implementação da Sprint 1; a auditoria afirma que o MVP não deve ser reimplementado nessa etapa.
- D5 e D6 permanecem itens de produto/estrutura para ondas posteriores. Devem ser planejados e executados quando a jornada/capacidade correspondente entrar no backlog, sem criar módulos prematuramente para “zerar” um inventário conceitual.
- D7 é incluído como correção porque foi confirmado como divergência; na sequência recomendada, é entregue junto ao preparo do banco de CI.

## 3. Ordem de Implementação

Sequência recomendada, ordenada por dependências técnicas. Cada passo só avança quando seu critério local estiver satisfeito.

### Passo 1 — Formalizar o caminho de migrations de deploy (D7)

Disponibilizar, nos scripts existentes do package de database, a execução de migrations versionadas com o comando apropriado de deploy, sem substituir o fluxo local `migrate dev`. Não criar nem editar migration.

**Justificativa:** o CI não pode testar adapters sobre schema implícito, nem usar `db push`, pois a migration SQL inclui o índice parcial necessário.

**Gate:** o comando aplica as migrations atuais em PostgreSQL vazio e termina sem pedir criação interativa de migration; o índice parcial continua vindo da migration existente.

### Passo 2 — Provisionar a fixture PostgreSQL isolada e habilitar execução DB (D1)

Adicionar ao job de CI PostgreSQL 16 compatível com o ambiente documentado, com readiness check e banco dedicado ao job. Configurar aplicação de migrations e variáveis antes de executar as suites.

**Justificativa:** testes Auth, Membership e API compartilham banco e podem apagar dados das tabelas dos módulos; a fixture deve ser descartável, isolada e previsível.

**Gate:** o job tem endpoint DB saudável; migration deploy conclui; testes DB rodam serializados onde necessário e não usam banco local compartilhado.

### Passo 3 — Criar o gate `test:db` não cacheável e eliminar skips silenciosos (D1)

Definir script raiz/workspace e task Turbo quando aplicável, encaminhando a URL explicitamente ao Vitest. O comando deve falhar se URL ausente, migration falha, ou as suites-alvo não executam; não aceitar sucesso por `describe.skipIf`.

**Justificativa:** `npm test` isoladamente passa com 48 skips e, portanto, não é prova da persistência. O gate dedicado evita que execução DB seja confundida com teste unitário/cacheável.

**Gate:** `npm run test:db` executa os testes Prisma de Auth e Membership e os E2E DB da API previstos, com zero skips atribuíveis à falta de DB e contagem executada maior que zero.

### Passo 4 — Estender os architecture fitness checks (D3)

Fazer `.dependency-cruiser.js` cobrir os boundaries efetivamente presentes e acrescentar provas negativas para as violações representativas acordadas: um ciclo e imports proibidos entre superfícies internas/owners e dependências indevidas de shared packages/apps.

**Justificativa:** uma regra só é evidência quando protege módulos atuais e demonstra rejeição. Regras para módulos que ainda não existem não substituem a validação de Auth/Membership/API/Web.

**Gate:** grafo real válido passa; fixtures negativas são detectadas como falha pelo mecanismo de teste sem deixar fixture inválida no grafo normal.

### Passo 5 — Implementar envelope e contratos de eventos da Foundation (D2)

Completar `@matemagico/events` com os campos/versionamento e validação runtime requeridos pelo plano de Sprint 1. Adaptar apenas os eventos Membership existentes preservando nome, significado e ownership dos payloads. Não adicionar broker, consumidor ou outbox.

**Justificativa:** separa metadados de transporte comuns dos contratos de domínio e estabiliza a interface antes que novos módulos dependam dela.

**Gate:** testes aceitam envelope/evento válido, rejeitam campos obrigatórios ausentes e payload inválido, e verificam que a metadata mandatória não seja opcional; testes dos produtores confirmam compatibilidade.

### Passo 6 — Completar composição operacional de Auth/Membership (D4)

Integrar Auth.js e os adapters reais descritos na auditoria, substituindo defaults fail-closed no caminho de execução normal. Preservar comportamento deny-by-default em falha real e manter as portas/adapters em seus owners.

**Justificativa:** a fundação de persistência e os gates de boundaries devem existir antes de ampliar a composição operacional; os defaults atuais deliberadamente não habilitam operação.

**Gate:** fluxo autenticado e operações Membership passam por testes integrados com DB isolado; casos de usuário/escola/autorização indisponíveis continuam negados explicitamente.

### Passo 7 — Demonstrar uma jornada web e clarificar a integração API/BFF (D5)

Construir a primeira jornada priorizada no backlog em `apps/web`, com leitura/mutação pelo padrão vigente e integração explícita à API Node caso ela permaneça no caminho. Registrar a decisão de execução no documento de implementação apropriado; não alterar ADRs.

**Justificativa:** a jornada depende dos contratos e dos adapters de Auth reais; antecipá-la levaria a validar somente uma tela estática ou lógica provisória.

**Gate:** uma jornada de ponta a ponta valida rendering, loading/erro, autenticação/autorização e uma mutação persistida; o client não importa Prisma nem implementações internas.

### Passo 8 — Implementar capacidades P2 conforme backlog de produto (D6)

Criar Users, Schools e Analytics somente quando as capacidades correspondentes forem priorizadas, com ownership explícito e consumers/projeções decorrentes de eventos conforme as decisões vigentes. Tratar outbox/inbox como trabalho próprio posterior, não implícito em D2.

**Justificativa:** esses contextos não existem no estado auditado, e o plano da Sprint 1 os exclui. Criá-los apenas para satisfazer o mapa futuro aumentaria escopo sem critério de entrada.

**Gate:** cada capacidade tem work item e aceite próprios, boundaries cobertos por D3, migrations versionadas se necessárias, e projeções Analytics não são usadas como fonte transacional.

### Quality gates de fechamento da etapa de estrutura

Após os passos 1–5, executar no CI e registrar resultado de `format:check`, `lint`, `test`, `test:db`, `build`, `test:architecture` e `db:validate`. `test:db` deve apresentar evidência de PostgreSQL e nenhuma omissão por variável ausente. D4–D6 são acompanhados por seus gates específicos quando o respectivo escopo de produto for executado.

## 4. Banco de Testes

### Como habilitar os testes atualmente pulados

1. Provisionar um PostgreSQL **16**, compatível com o serviço descrito na auditoria e no compose local, em instância exclusiva e descartável para cada job (e para execução local isolada).
2. Esperar readiness/conexão antes da etapa de migration; não depender apenas de o container ter iniciado.
3. Apontar o datasource Prisma a esse banco e aplicar as migrations versionadas existentes usando o caminho de deploy. Não usar `prisma db push`; não gerar migration durante os testes.
4. Disponibilizar `TEST_DATABASE_URL` ao processo Vitest que executa as suites condicionais. Disponibilizar também `DATABASE_URL` ao Prisma CLI/migration deploy. Ambos devem referir-se à mesma instância descartável durante o job, sem imprimir seus valores em logs.
5. Executar Auth, Membership e API DB suites contra esse banco, respeitando serialização para os arquivos que compartilham a URL. Nunca apontar essas variáveis para desenvolvimento persistente, staging ou produção.
6. Fazer o gate falhar se a URL estiver ausente, se a aplicação da migration falhar ou se as suites DB forem puladas.

As duas variáveis são necessárias porque as suítes consultam `TEST_DATABASE_URL`, enquanto o datasource do schema Prisma é configurado por `DATABASE_URL`. A auditoria registra **48 testes pulados** no total quando `TEST_DATABASE_URL` está ausente. Não é esperado que toda execução de teste unitário local exija banco; o requisito é que o gate explícito `test:db` e o job CI não permitam falso verde.

### Requisitos de PostgreSQL e migrations

- Versão major: **PostgreSQL 16**, conforme serviço documentado.
- Instância/database: exclusivo, limpo e efêmero por execução; sem volume persistente compartilhado do compose de desenvolvimento.
- Migration: aplicar a migration foundation versionada existente e quaisquer outras já presentes, em ordem normal do Prisma migrate deploy.
- Integridade: preservar constraints e índice parcial de Membership criado por SQL; não substituir por `db push`.
- Isolamento: execução DB deve ser serializada conforme configuração dos testes que compartilham a mesma URL e apagam dados das tabelas relevantes.
- Não produzir migrations como parte deste plano; mudança futura de schema é outro escopo, revisado e testado.

## 5. CI

### Fluxo requerido

1. Checkout e instalação reproduzível com `npm ci` na versão Node já usada pelo workflow.
2. Subir PostgreSQL 16 como serviço de teste com database/user de CI não reutilizados fora do job.
3. Aguardar health/readiness e validar conexão antes de prosseguir.
4. Gerar Prisma Client conforme o pipeline atual.
5. Configurar `DATABASE_URL` para comandos Prisma e `TEST_DATABASE_URL` para as suítes; manter os valores mascarados e fora dos artefatos/logs.
6. Aplicar migrations versionadas pelo comando de deploy do Prisma, em banco limpo.
7. Executar `test:db` explicitamente; exigir execução efetiva das suites DB Auth/Membership/API e zero skips por variável ausente.
8. Executar os quality gates do workflow: formato, lint, testes gerais, build e architecture fitness. Validar também `db:validate`.
9. Falhar o job no primeiro erro de disponibilidade, migration, teste, skip proibido ou validação. Não aceitar uma etapa marcada como sucesso por `--passWithNoTests` se nenhuma suite de banco tiver sido coletada.
10. Encerrar a instância efêmera junto ao job; não manter volume nem reutilizar dados entre execuções.

### Quality gates

| Gate                | Exigência verificável                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `format:check`      | Passa sem alterar arquivos.                                                                                      |
| `lint`              | Passa em todos os workspaces do workflow.                                                                        |
| `test`              | Passa para suítes comuns; skips DB fora do gate dedicado são reportados, não confundidos com cobertura de banco. |
| `test:db`           | Passa com PostgreSQL migrado, execução DB maior que zero e nenhum skip por falta de URL.                         |
| `build`             | Passa para apps e packages.                                                                                      |
| `test:architecture` | Passa no grafo real; regressões introduzidas nas fixtures negativas são reconhecidas como falha.                 |
| `db:validate`       | Prisma schema continua válido.                                                                                   |

O smoke test Playwright já passou na auditoria, mas não foi apontado como bloqueador de Foundation Done; sua execução em CI pode ser incluída quando o pipeline e a jornada web correspondente forem priorizados.

## 6. Arquitetura

Esta seção interpreta apenas a evidência registrada na auditoria; não reexecuta dependency-cruiser nem inspeciona novo estado do repositório.

### Apps

- O gate global detecta ciclos, mas o relatório não demonstra regras específicas de fronteira entre `apps/web`, `apps/api` e packages server-side.
- A UI não tem jornada ou Server Actions, então a ausência de imports indevidos em um fluxo real não foi demonstrada por testes de uso.
- A relação do processo API Node com o padrão BFF de Next.js não está explicitada na implementação observada.
- O smoke test da página Foundation não prova boundaries entre app, módulos e persistência.

### Packages

- Há uma regra que restringe infraestrutura em `shared-types`, mas a auditoria a considera insuficiente como proteção geral das fronteiras.
- A existência de ciclos é verificada globalmente; isso não prova ownership por package, acesso somente por superfícies públicas ou dependências permitidas entre packages.
- `events`, `database`, `composition-root`, `logger` e `testing` não têm, segundo o relatório, uma matriz de imports proibidos exercitada por fixtures.

### Modules

- As regras nomeadas observadas concentram-se em `questions`, `attempts` e `rankings`, que não existem no estado auditado.
- Não há demonstração de que imports de implementação entre `auth` e `membership`, ou acessos cruzados a repositories/tabelas, sejam rejeitados.
- A auditoria não encontrou fixtures de violação para provar que uma dependência proibida reprova o gate; portanto, o resultado verde só certifica que o grafo atual satisfaz as regras atualmente declaradas.
- A correção D3 deve converter os limites de módulos presentes em checks e testes de falha controlada; limites de contexts futuros entram quando esses modules forem planejados.

## 7. Critérios de Aceite

### Foundation / estrutura (passos 1–5)

- [ ] Há comando repetível de deploy que aplica somente migrations versionadas e existentes; nenhum arquivo de migration foi criado por esta etapa.
- [ ] CI inicia PostgreSQL 16 descartável, confirma readiness e destrói o ambiente no fim do job.
- [ ] `DATABASE_URL` e `TEST_DATABASE_URL` estão disponíveis nos processos corretos, apontam à mesma instância isolada e nunca são expostas em logs.
- [ ] `test:db` existe como comando explícito, não é atendido por cache anterior e falha se banco/URL/migrations/suites estiverem ausentes.
- [ ] Suítes Prisma Auth e Membership e suites E2E da API dependentes do DB executam; não há skip devido à falta de `TEST_DATABASE_URL`.
- [ ] Suites que partilham e limpam tabelas não executam concorrencialmente sobre dados não isolados.
- [ ] O deploy aplica o índice parcial já definido na migration existente; não usa `db push`.
- [ ] `@matemagico/events` valida runtime dos campos obrigatórios e versionamento do envelope previsto pelo plano da Sprint 1.
- [ ] Contratos de eventos Membership mantêm payloads sob ownership do módulo e preservam nome/semântica existentes.
- [ ] Os testes de eventos cobrem payload válido, campos obrigatórios ausentes, versão inválida e payload inválido.
- [ ] `test:architecture` protege apps, packages e modules presentes; pelo menos uma fixture de ciclo e fixtures de fronteira proibida falham como esperado, enquanto o grafo válido passa.
- [ ] Passam `format:check`, `lint`, `test`, `test:db`, `build`, `test:architecture` e `db:validate`; os resultados e contagens ficam registrados no CI.
- [ ] Nenhum ADR foi alterado e não foram incluídos broker, consumer, outbox, schema de produto ou feature fora do escopo.

### Correções de produto / ondas posteriores (passos 6–8)

- [ ] Para D4: fluxo integrado Auth.js executa com lookup/verificação/autorização reais e DB isolado; falhas de dependência permanecem fail-closed.
- [ ] Para D5: existe uma jornada web testada, conforme a estratégia já registrada, e está documentada a relação operacional API/BFF.
- [ ] Para D6: cada módulo/capacidade foi priorizado em backlog, tem owner/testes/migrations se aplicável e não é criado somente para satisfazer inventário conceitual futuro.

Os três critérios posteriores não devem ser marcados como concluídos pelo sucesso dos gates da Foundation; sua conclusão é independente e depende do escopo da onda de produto.

## 8. Definition of Done

### Etapa de estrutura — Foundation Done

- [ ] D1, D2, D3 e D7 foram implementados e seus critérios de aceite demonstrados.
- [ ] CI é a evidência autoritativa de que migrations existentes e testes Prisma passam em PostgreSQL 16 limpo.
- [ ] `test:db` não pode produzir sucesso vazio nem resultado verde por skips ligados a ausência de configuração.
- [ ] Eventos possuem contrato comum testado e contratos de produtor continuam owned pelos módulos.
- [ ] Fitness checks exercitam os boundaries reais atuais e provam rejeição das violações de referência.
- [ ] Quality gates completos passam; logs/relatório registram contagens e não contêm connection strings.
- [ ] Nenhum schema/migration de negócio, outbox, broker, consumer ou arquitetura alternativa foi adicionado como parte da Sprint 1.
- [ ] A conclusão e os itens explicitamente diferidos estão rastreados no backlog da onda seguinte.

### Encerramento das divergências remanescentes

- D4 é encerrada somente após a integração operacional e testes de fluxo Auth/Membership; não é implicitamente resolvida por configurar PostgreSQL.
- D5 é encerrada após a primeira jornada Web e integração API/BFF comprovadas.
- D6 é encerrada por entregas de produto próprias para Users, Schools e Analytics, sem ampliar retroativamente o escopo de Foundation.
- O responsável da etapa atual deve reportar Foundation Done separadamente do fechamento integral de D4–D6, para não apresentar o scaffold como produto pronto.

## Resumo Executivo

- **Menor conjunto para Foundation Done:** D7 (deploy de migrations existentes), D1 (PostgreSQL isolado + `test:db` obrigatório), D3 (boundaries testados) e D2 (contrato de eventos versionado e validado).
- **Ordem recomendada:** deploy migrations → PostgreSQL/variáveis → `test:db` sem skips → fixtures/regras de arquitetura → envelope e testes de eventos → todos os quality gates.
- **Depois da Foundation:** D4 integra Auth.js e adapters operacionais; D5 demonstra jornada web e clarifica API/BFF; D6 implementa Users/Schools/Analytics conforme backlog e ownership.
- **Riscos residuais:** até D4, Auth/Membership não opera com composição real; até D5 não há jornada web; até D6 não existem projeções Analytics nem módulos de domínio futuros.
- D4–D6 são divergências confirmadas e permanecem visíveis, mas não justificam reimplementar o MVP ou introduzir escopo de produto na Sprint 1.
