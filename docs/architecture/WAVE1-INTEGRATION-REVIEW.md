# Revisão integrada da Onda 1 — MateMágico Champions

**Data:** 2026-10-09  
**Base da revisão:** exclusivamente os oito documentos oficiais listados abaixo.  
**Limites:** não reexecuta a auditoria técnica, não altera ADRs e não confirma implementação posterior à evidência registrada. Este relatório integra os planos existentes; não substitui nem cria um novo plano de execução por área.

## 1. Escopo Revisado

Foram analisados integralmente, para esta revisão, os documentos:

1. [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md)
2. [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md)
3. [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md)
4. [EVENT-FOUNDATION-PLAN.md](EVENT-FOUNDATION-PLAN.md)
5. [SECURITY-FOUNDATION-PLAN.md](SECURITY-FOUNDATION-PLAN.md)
6. [CI-FOUNDATION-PLAN.md](CI-FOUNDATION-PLAN.md)
7. [OBSERVABILITY-FOUNDATION-PLAN.md](OBSERVABILITY-FOUNDATION-PLAN.md)
8. [ARCHITECTURE-ENFORCEMENT-PLAN.md](ARCHITECTURE-ENFORCEMENT-PLAN.md)

A auditoria Foundation é a evidência do estado observado; os outros sete documentos são planos e critérios, não evidência de que as correções tenham sido implementadas. Os ADRs permanecem `Proposed` segundo as fontes. “Baseline” nesta revisão significa baseline selecionada para orientar trabalho, não aprovação formal nem conformidade comprovada.

## 2. Consistência Cruzada

| Cruzamento                            | Consistência encontrada                                                                                                                                                                                                                                                               | Divergência ou condição em aberto                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Banco × Eventos**                   | O plano de eventos preserva ownership por módulo, emissão após commit, minimização e tolerância futura a duplicidade/ordem. O plano DB aplica migrations versionadas antes dos testes. Ambos excluem `db push` como substituto das migrations.                                        | Não há outbox/inbox nem mecanismo de entrega comprovado. Os documentos corretamente tratam contrato e validação como trabalho da Foundation e delivery confiável como capacidade futura; a conclusão não pode ser descrita como entrega operacional de eventos.                                                      |
| **Banco × Segurança**                 | `DATABASE_URL` e `TEST_DATABASE_URL` devem apontar ao banco PostgreSQL 16 isolado do job, ficar restritas aos processos necessários e não aparecer em logs/artifacts. Testes destrutivos devem usar banco descartável e execução serializada ou isolada.                              | A auditoria não confirmou valores/configuração efetiva de `AUTH_SECRET`; SMTP e outros secrets não foram identificados. O plano de segurança exige inventário/segregação, enquanto o plano DB não comprova que tais controles já existam.                                                                            |
| **Eventos × Observabilidade**         | Os documentos compartilham o envelope de oito campos, correlation/causation obrigatórios, `schoolId` condicional ao escopo escolar, payload mínimo e proibição de tratar IDs/contexto como autorização. Ambos proíbem afirmar entrega quando o publisher provisório descarta eventos. | Ainda não há envelope validado, publisher operacional, consumer, tracing nem instrumentação uniforme. Métricas de emissão/consumo são condicionadas à existência desses componentes; não são evidência atual nem requisito para inventar broker ou consumer nesta etapa.                                             |
| **Segurança × CI**                    | Há alinhamento quanto a dependency review, `npm audit`, secret scanning, testes DB, validação de arquitetura/eventos, ausência de secrets de produção em PRs e falha explícita em vez de fallback verde.                                                                              | Os thresholds de vulnerabilidade, política de exceção, owners e expiração ainda precisam de decisão. Os documentos não demonstram esses scanners como gates implementados. Também não há evidência de gate automatizado de release que bloqueie papéis privilegiados até MFA.                                        |
| **CI × Observabilidade**              | CI deve tornar visíveis contagens de execução/skips e resultados dos gates; observabilidade identifica esses resultados como sinal operacional da própria Foundation. A recomendação de smoke Web não o confunde com E2E API/PostgreSQL.                                              | O plano CI não inclui gates de instrumentação, propagação de IDs, redaction ou métricas operacionais. O plano de observabilidade define critérios, mas não atribui todos a um gate CI específico nem fornece evidência de execução. O smoke Playwright é opcional/condicional, sem decisão final de obrigatoriedade. |
| **ADR Enforcement × todos os demais** | O plano de enforcement consolida ownership, boundaries, dados, eventos, RBAC, privacidade e critérios dos planos de área. Ele preserva o status `Proposed`, exige evidência por ADR e não transforma módulos futuros em escopo da Onda 1.                                             | Enforcement é normativo, não implementado: os próprios documentos registram lacunas em fixtures, migrations/testes DB, contratos Events, controles Auth, observabilidade e gates CI. Não há evidência de ratificação formal dos ADRs nem de owner/cadência atribuídos para todas as validações.                      |

### Resultado da consistência

Os contratos conceituais entre as áreas são predominantemente coerentes: isolamento e migrations sustentam testes DB; ownership limita payloads de eventos; segurança e observabilidade convergem na minimização; CI é o mecanismo planejado para tornar esses controles verificáveis. A principal divergência efetiva é de **escopo para declarar “Foundation Done”**, detalhada na seção 4. A principal fragilidade transversal é que critérios bem descritos ainda não têm evidências de implementação.

## 3. Dependências

### Grafo de dependências documentais e técnicas

1. **FOUNDATION-AUDIT → STRUCTURE-REPORT:** o relatório estrutural declara a auditoria como única fonte das divergências e prioridades.
2. **STRUCTURE-REPORT → DATABASE-EXECUTION-PLAN:** habilitar suites DB depende de banco isolado, caminho de deploy forward-only e comando dedicado sem skips.
3. **DATABASE-EXECUTION-PLAN → CI-FOUNDATION-PLAN:** CI depende de PostgreSQL 16 pronto, Prisma Client, `db:validate`, migrations aplicadas e `test:db` efetivamente executado.
4. **STRUCTURE-REPORT → EVENT-FOUNDATION-PLAN → CI-FOUNDATION-PLAN:** o contrato Events e seus testes dependem de ownership/nome/versionamento definidos; CI precisa executar esses testes e bloquear regressões.
5. **SECURITY-FOUNDATION-PLAN → CI-FOUNDATION-PLAN:** dependency review, `npm audit` e secret scanning dependem de thresholds, política de exceção, owner e expiração definidos antes de serem gates de bloqueio.
6. **EVENT-FOUNDATION-PLAN → OBSERVABILITY-FOUNDATION-PLAN:** logging/observação de eventos depende de envelope/correlation definidos e diferencia contrato/chamada ao publisher de entrega efetiva.
7. **DATABASE + EVENT + SECURITY + CI + OBSERVABILITY → ARCHITECTURE-ENFORCEMENT-PLAN:** enforcement depende dos critérios de domínio de cada área e deve torná-los revisáveis e verificáveis, sem substituir suas evidências.
8. **Ratificação dos ADRs → governança mandatória:** os documentos dependem de aprovação formal pelo processo existente para promover `Proposed` a `Accepted`; a seleção como baseline não resolve essa dependência.

### Ordem de prontidão inferida dos documentos

O caminho mínimo documentado para Foundation estrutural é: (a) deploy repetível das migrations existentes; (b) PostgreSQL efêmero e URLs restritas; (c) `test:db` sem skips de configuração; (d) contract tests de eventos e fixtures negativas de arquitetura; (e) quality/security gates efetivos e registro de evidências. Instrumentação operacional e ratificação formal têm critérios próprios e não são provadas pela sequência de testes DB.

## 4. Conflitos

### P0

**Nenhum conflito P0** é classificado nas fontes revisadas.

### P1

| ID  | Conflito                                                                                              | Evidência e impacto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Resolução necessária                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Auth operacional está dentro do DoD de Security Foundation, mas fora do DoD estrutural da Onda 1.** | `STRUCTURE-REPORT.md` classifica a integração Auth.js/adapters como divergência de produto e determina encerrá-la separadamente, depois da Foundation estrutural. Em contraste, `SECURITY-FOUNDATION-PLAN.md` inclui no checklist “Security Foundation Done” que Auth.js/adapters operacionais sejam implementados/testados e resume integração/hardening Auth como trabalho faltante para Security Foundation Done. O plano CI também trata Auth real como capacidade de produto, não pré-requisito da CI Foundation. Isso permite declarar a Onda 1 concluída ou bloqueada conforme o documento usado. | Formalizar uma única fronteira de escopo: distinguir controles estruturais de segurança que bloqueiam Foundation Done (secret handling, scanners, redaction, gates existentes) da prontidão operacional Auth/Membership e MFA, que deve bloquear uso/produção dos fluxos/papéis correspondentes. Atualizar os critérios oficiais na próxima manutenção documental aprovada; não alterar ADRs nesta revisão. |

### P2

**Nenhum conflito P2 com requisitos incompatíveis foi identificado.** Há pontos de decisão/atribuição pendentes — threshold de scanners, obrigatoriedade do smoke Web, e owner/cadência dos controles de observabilidade —, mas as fontes os descrevem como pendências, não como regras opostas.

## 5. Lacunas

As lacunas abaixo são as que os próprios documentos oficiais mantêm abertas; não representam reauditoria do monorepo.

### P1 — bloqueiam declarar Foundation estrutural concluída

- CI não provisiona PostgreSQL, não aplica migrations e não executa `test:db`; 48 testes dependentes de PostgreSQL foram pulados na evidência da auditoria. O comando `test:db` não existe.
- O comando disponível de migration é de desenvolvimento; deploy repetível das migrations versionadas, forward-only, não está demonstrado.
- O pacote Events não possui envelope completo validado/versionado nem contract tests; o publisher provisório descarta `MembershipCreated` e `RoleGranted`.
- O gate de arquitetura não demonstra rejeição de violações representativas nos módulos presentes; faltam fixtures negativas adequadas a Auth/Membership e boundaries atuais.
- Os security gates não estão confirmados como implementados; threshold/exceções para dependency review e `npm audit` não foram fechados.
- A Security Foundation não tem fronteira inequívoca sobre a inclusão de integração operacional Auth no DoD, conforme conflito C1.
- A instrumentação de logs estruturados, redaction, correlação, métricas e tracing não está comprovada; `packages/logger` existir não demonstra uso uniforme.
- Não há evidência de ratificação formal dos ADRs selecionados, aprovação de thresholds/políticas, ou registro completo de owner e cadência para validações contínuas.

### P2 — capacidade, decisão ou validação diferida

- Smoke Playwright Web passou localmente, mas não está no CI; sua condição de gate permanece condicional e a cobertura é apenas da página Foundation.
- Typecheck não é um passo CI independente; os documentos registram verificação incorporada em lint/build, que deve continuar coberta sem alegar um gate separado existente.
- Analytics, consumers/projeções, outbox/inbox, broker e telemetry store não existem; os planos corretamente os deixam fora da Foundation estrutural.
- Usuários/Schools, jornada Web, relação API/BFF e Auth operacional permanecem trabalho de produto conforme os limites registrados; não devem ser declarados como entregues pelos gates estruturais.
- Não há evidência de implementação/validação operacional de alertas, retenção, destinos de logs/traces ou métricas. SLOs, carga, DR, pentest e revisão legal tampouco são comprovados pelos documentos e não podem ser inferidos como escopo concluído.

## 6. Critérios Foundation Done

| Área/documento                                    | Critérios de aceite                                                                                    | DoD                                                                                 | Evidência disponível nas fontes                                                                                                                             | Avaliação integrada                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Estado-base — FOUNDATION-AUDIT**                | Não é plano de entrega; define gaps, blockers e notas.                                                 | Não define DoD de implementação; registra evidência de auditoria.                   | Sim: `format:check`, lint, testes, build, architecture, Prisma validation e smoke local passaram; 265 testes passaram, 48 foram pulados; `test:db` ausente. | Evidência útil de baseline, insuficiente para Foundation Done.                                                                    |
| **Estrutura — STRUCTURE-REPORT**                  | Sim, itens verificáveis D1–D7 com limites por onda.                                                    | Sim, separa D1/D2/D3/D7 estruturais de D4–D6 de produto.                            | Não há evidência de correções; documento explicitamente é plano.                                                                                            | Critérios claros, mas não concluídos; há conflito de escopo C1 com o DoD Security.                                                |
| **Database — DATABASE-EXECUTION-PLAN**            | Sim: PostgreSQL efêmero, migrations, zero skips por ausência de URL, contagem DB positiva, isolamento. | Sim, específico da Database Foundation.                                             | Não: plano confirma ausência de `test:db`, infraestrutura CI e deploy migrations.                                                                           | Não concluído; evidência de execução em CI inexistente.                                                                           |
| **Events — EVENT-FOUNDATION-PLAN**                | Sim: envelope, ownership, contratos, compatibilidade e privacidade verificáveis.                       | Sim: validação runtime, registry, contratos e CI.                                   | Não: estado documentado tem metadata parcial, publisher que descarta e nenhum consumer.                                                                     | Não concluído. Entrega confiável permanece expressamente fora da etapa; não contar contrato como delivery.                        |
| **Security — SECURITY-FOUNDATION-PLAN**           | Sim: inventário, ambientes, scanners, Auth, audit trail e controles de dados.                          | Sim, mas inclui Auth operacional e por isso conflita com a fronteira estrutural D4. | Parcial apenas como diagnóstico documental: 45/100 qualitativo, nenhum valor de secrets lido, scanners não confirmados, Auth.js ausente.                    | Não concluído; precisa resolver C1 e produzir evidência de controles. A revisão documental não equivale a avaliação de segurança. |
| **CI — CI-FOUNDATION-PLAN**                       | Sim: DB, migration, gates gerais, arquitetura, eventos e security.                                     | Sim: execução DB sem skips, gates bloqueantes e resultados rastreáveis.             | Não: workflow observado não provisiona DB, não aplica migrations, não executa `test:db` nem scanners confirmados.                                           | Não concluído; nenhum resultado de pipeline pós-correção é apresentado.                                                           |
| **Observability — OBSERVABILITY-FOUNDATION-PLAN** | Sim: propagação IDs, redaction, logs, métricas, eventos e evidências operacionais.                     | Sim: critérios de observabilidade definidos.                                        | Não: não há logs estruturados/métricas/tracing uniformes comprovados; evento publisher descarta.                                                            | Não concluído. Critérios não estão mapeados integralmente a gates/evidências executáveis.                                         |
| **Governança — ARCHITECTURE-ENFORCEMENT-PLAN**    | Sim: ADRs com evidência, gates, owners, cadência e aprovações.                                         | Sim: status formal separado da aplicação técnica.                                   | Não: status `Proposed`; gaps de gates e ausência de fixtures estão documentados.                                                                            | Não concluído. Ratificação e governança contínua precisam de registro próprio.                                                    |

**Conclusão da seção:** todas as áreas, exceto a auditoria que serve de baseline, descrevem critérios de aceite e DoD; nenhuma apresenta evidência de que os critérios tenham sido implementados e aprovados. Portanto, critérios documentados não podem ser tratados como critérios satisfeitos.

## 7. Riscos Residuais

Classificação preserva as prioridades e limites registrados nas fontes; nenhum novo risco P0 é inferido.

### P0

**Nenhum risco P0 classificado** nos documentos revisados. Isso não é certificação de segurança ou produção.

### P1

| Risco                                                                      | Efeito residual                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Persistência e migrations não testadas no CI; testes DB ignorados.         | CI pode permanecer verde sem provar constraints, migrations ou adapters PostgreSQL.                                             |
| Publisher descarta eventos e não existe contrato validado.                 | Eventos nomeados podem não ser entregues e não há compatibilidade verificável; não assumir exactly-once/outbox.                 |
| Boundaries Auth/Membership sem prova negativa.                             | Dependências proibidas podem entrar sem reprovação automatizada.                                                                |
| Controles de segurança e escopo Auth contraditórios.                       | Completion pode ser reportada de modo inconsistente; jornadas operacionais não estão prontas.                                   |
| Segredos, scanners, audit trail e instrumentação sem evidência suficiente. | Risco de governança/observabilidade não mensurado; ausência documental não prova presença nem ausência operacional de segredos. |

### P2

| Risco                                                                             | Efeito residual                                                                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Smoke Web ausente no CI e limitado à página Foundation.                           | Não valida jornadas Web nem comportamento de produto.                                                                |
| Analytics, consumers e mecanismos de entrega ausentes por escopo.                 | Sem projeções ou telemetria derivada de eventos; a ausência não bloqueia a foundation estrutural conforme os planos. |
| ADRs ainda `Proposed`.                                                            | A baseline não tem ratificação formal demonstrada.                                                                   |
| Sem evidência de carga, DR, pentest, revisão jurídica ou validação multiambiente. | Não inferir prontidão para produção a partir do fechamento técnico da Foundation.                                    |

## 8. Recomendação

# NO GO

**Não declarar a Onda 1 / Foundation Done com base nas evidências revisadas.** Persistem bloqueadores estruturais explícitos (DB/migrations/`test:db`, contratos de eventos e architecture fitness), security gates sem evidência e ausência de comprovação de instrumentação. Adicionalmente, a divergência C1 torna ambíguo se a integração operacional Auth é exigência para o mesmo marco.

Esta decisão refere-se à **declaração de conclusão da Onda 1**. Não declara o repositório inutilizável nem antecipa conclusão sobre vulnerabilidades exploráveis. Jornadas autenticadas e papéis privilegiados em produção devem permanecer bloqueados até satisfazer seus requisitos próprios de Auth/MFA, independentemente do fechamento estrutural.

## 9. Plano de Correção

Há lacunas; a sequência abaixo consolida dependências já presentes nos documentos e não introduz arquitetura, escopo ou plano separado:

1. **Resolver a fronteira de conclusão (C1).** Registrar uma definição única de Foundation Done versus prontidão operacional de Auth/Membership e produção/MFA; alinhar os checklists de estrutura, segurança e CI.
2. **Fechar o caminho de banco.** Criar o caminho repetível de deploy das migrations versionadas; configurar PostgreSQL 16 efêmero/readiness/URLs isoladas; executar `db:validate` e `test:db` sem skips, com as suítes e serialização definidas.
3. **Fechar os contratos de eventos.** Implementar e validar o envelope/versionamento, preservar ownership/nome/semântica dos contratos Membership e executar contract tests em CI. Não declarar delivery operacional enquanto o publisher não o comprovar; não adicionar broker/outbox/consumer por inferência.
4. **Provar os boundaries.** Completar os fitness checks para apps/packages/modules presentes e demonstrar fixtures negativas que falham para violações relevantes.
5. **Ativar gates de segurança.** Aprovar thresholds, política de exceção, owner e expiração; tornar dependency review, `npm audit` e secret scanning verificáveis e bloqueantes. Demonstrar segregação/redaction dos segredos conhecidos e estabelecer audit trail dos fluxos que efetivamente existam.
6. **Fechar critérios de observabilidade.** Atribuir responsáveis e evidências executáveis para propagação/correlação, logs redigidos, métricas mínimas e estado de tracing; não confundir presença de `packages/logger` com instrumentação. Harmonizar a evidência com CI, sem criar consumer ou Analytics.
7. **Registrar governança e evidência final.** Obter/registrar ratificação formal conforme processo existente ou manter `Proposed` explicitamente; anexar resultados CI de todos os gates obrigatórios e comprovar que nenhum skip/fallback/cache fabricou sucesso.

Somente após os critérios estruturais resolvidos e evidências rastreáveis pode-se reavaliar a recomendação. Auth/Membership operacional, jornada Web, Analytics, produção/MFA, pentest, carga, DR e revisão legal permanecem sujeitos aos escopos e precondições que os documentos atribuem a essas capacidades.

## 10. Resumo Executivo

1. **Quais conflitos existem?** Um conflito material de escopo: o DoD da Security Foundation exige Auth operacional, enquanto o plano estrutural e o plano CI diferem essa entrega e separam Foundation estrutural de produto. Outros limites — especialmente contrato versus delivery de eventos — são coerentes desde que não se declare entrega sem evidência.
2. **Quais lacunas existem?** PostgreSQL/migrations/`test:db`; envelope e contract tests Events; fixtures de arquitetura; security gates/políticas; instrumentação e evidências de observabilidade; decisão formal do escopo Auth e ratificação/governança dos ADRs.
3. **O que falta para encerrar a Onda 1?** Resolver a fronteira C1, fechar os gates DB, eventos, arquitetura e segurança, tornar os critérios de observabilidade verificáveis e publicar evidências CI rastreáveis, sem skips ocultos.
4. **A fundação está coerente?** Conceitualmente, em grande parte sim: os planos concordam em ownership, tenant scope, minimização, migrations forward-only e limites de Analytics. Operacionalmente, ainda não está concluída nem comprovada; existe a divergência C1 e os planos não são evidência de implementação.
