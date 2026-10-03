# ADR Diagnostic Report

**Data da revisao:** 2026-09-29  
**Escopo:** Documento Mestre `ARCHITECTURE.md`, ADR-TEMPLATE e todos os artefatos ADR encontrados em `docs/architecture/ADRs/`; contexto adicional em `memory/*`.  
**Natureza:** Revisao documental. O workspace auditado nao contem aplicacao, schema Prisma, migrations, testes, pipeline ou infraestrutura executaveis; conclusoes de runtime/seguranca/performance nao podem ser certificadas.

## Executive Summary

**Pontuacao geral: 65/100** (media aritmetica das dez notas ADR do Executive Scorecard, reavaliada apos a harmonizacao documental; avalia maturidade/coerencia documental, nao codigo em producao). O veredito de prontidao e separado e permanece **NAO** devido a bloqueios de aprovacao, privacidade, seguranca e evidencia executavel.

O conjunto tem uma baseline documental mais coerente: `INDEX.md` e o registro central, `schoolId` e o identificador escolar canonico, ownership de acesso e matricula esta separado, e ADR-0005 e a proposta canonica de frontend/BFF. ADR-0006–0008 estao explicitamente Superseded e ADR-0010 foi limitado a composicao visual. Permanecem status Proposed sem aprovacao, documentos historicos incorporados e afirmacoes de capacidade/seguranca sem verificacao executavel.

**Principal bloqueio:** consolidar um unico conjunto normativo (ADR-0001 a ADR-0010), aprovar/superseder as propostas conflitantes e reconciliar Documento Mestre/memoria antes de scaffold/schema. Nao iniciar implementacao de Auth, tenancy, eventos, analytics ou stores com os documentos atuais como se todos fossem decisoes aprovadas.

## Architecture Maturity

**Nivel: Inicial.** Existe vocabulário e intencao arquitetural, mas falta governanca documental e validacao tecnica. Enterprise exige decisao canonica, ownership consistente, controles automatizados, revisao formal, modelo de ameacas e evidencias de carga/teste. O nivel nao desqualifica o desenho recente; indica que as decisoes ainda nao foram integradas nem aprovadas.

### Strengths

- ADR-0002 estabelece ownership por modulo, contratos publicos, proibe acesso direto a repositorios alheios e distingue eventos de chamadas sincr onas.
- ADR-0003 especifica multi-escola logico por `schoolId`, separa OLTP e projecoes, identifica versoes de questao, outbox/inbox e migrations forward-only.
- ADR-0004 separa identidade global, membership, RBAC contextual e papel global; proibe claims de permissao como autoridade e minimiza dados pessoais em eventos.
- ADR-0005 (novo) separa BFF adapter de Application, prioriza RSC, limita Zustand a UI e torna TanStack Query opt-in com cache tenant-aware; permanece Proposed e ainda conflita documentalmente com 0006–0010.
- ADR-0009 reconhece analytics como read model, eventual consistency, reconstruibilidade, isolamento escolar e necessidade de observabilidade.
- `ADR-TEMPLATE.md` define um esqueleto de decisao completo, incluindo consequencias, riscos, alternativas e reconsideracao.

### Weaknesses

- ADR-0001 esta embutido no Documento Mestre e nao e um arquivo ADR autonomo. O documento diz status Accepted, mas o proprio texto/memoria ainda pede stakeholder review e sign-off.
- O `INDEX.md` agora existe, mas memoria e blocos historicos de `ARCHITECTURE.md` ainda precisam ser tratados como snapshots nao normativos.
- ADR-0006, ADR-0007 e ADR-0008 estao marcados Superseded; ADR-0010 permanece Proposed apenas para composicao visual. O novo ADR-0005 e a proposta canonica de frontend/BFF e supersede a versao state-only antiga.
- ADR-0007 descreve dados de dominio como armazenados no TanStack Query cache, embora diga que servidor e fonte de verdade; formula isso de modo propenso a tornar o cache cliente uma fonte operacional.
- O Documento Mestre propoe um `User` com password, um `role` e `schoolId` unico, `jsonwebtoken` separado de Auth.js, relacoes circulares e migrations “sempre reversiveis”, contrariando ADR-0003/0004.
- `schoolId` e o identificador canonico nos ADRs ativos; ocorrencias de `tenantId` foram removidas dos contratos ativos. Historico e diagnostico devem usar o termo apenas para descrever o conflito anterior.
- Eventos, taxonomia, metricas, papeis e nomes de entidade nao possuem um catalogo/registry unico de versoes e owners aprovado.
- Varios ADRs sao tabelas achatadas, headings inconsistentes e placeholders; a verificacao automatica de Mermaid requer login e nao substitui validação em CI.
- Datas e metricas de escala sao metas, nao resultados. Nenhuma capacidade de 100 mil alunos, SLO, controles OWASP ou LGPD foi testada neste workspace.

### Critical Findings

1. **Baseline de frontend ainda ambigua (ALTO/CRITICO para implementacao):** o novo ADR-0005 define RSC/Server Actions primeiro, Zustand apenas UI e TanStack Query opt-in; ADR-0006 recomenda Query para estado servidor; ADR-0007 chama Query Cache de armazenamento de estado de dominio; ADR-0008 repete Zustand + TanStack; ADR-0010 permite auth state global em Zustand. O novo 0005 resolve a decisao proposta, mas precisa ser aprovado e 0006–0010 precisam de lifecycle explicito.
2. **ADR-0001 nao possui artefato atomico nem aprovacao comprovada (ALTO):** citado como accepted, mas stakeholder review consta pendente; referencias apontam para arquivo ADR-0001 que nao existe. A autoridade da decisao fundacional e ambigua.
3. **Tenancy/ownership documental reconciliados, mas sem evidencia executavel (ALTO):** ADRs ativos usam `schoolId`; Auth/Authorization possui memberships/grants, Users possui identidade/perfil, Schools possui a instituicao e Classes possui enrollment/teaching assignment. Ainda faltam schema, constraints e testes negativos cross-school.
4. **Prontidao de seguranca nao comprovada (CRITICO para go-live):** ADR-0004 define decisoes valiosas, mas password hashing, rate limiting distribuido, email/reset, ledger de sessao, MFA, LGPD/menores e resposta a incidentes nao existem como codigo ou evidencia. O proprio ADR exige MFA para privilegios em producao.
5. **Capacidade para 100 mil nao demonstrada (ALTO):** `ARCHITECTURE.md` declara capacidade sem teste; ADRs recentes corretamente dizem que e meta, mas nao retiram nem corrigem formalmente a afirmacao legada. Sem app, esquema, carga e observabilidade nao ha base para declarar escalabilidade.
6. **Eventos nao estao prontos para uso critico (ALTO):** ADR-0002 define outbox, entrega pelo menos uma vez, idempotencia, `schemaVersion` e registry conceitual; ADR-0009 separa telemetria de analytics. Faltam evidencia operacional de replay, compatibilidade, retencao e SLO.

## ADR Inventory

O inventario abaixo conta **10 numeros distintos** (0001–0010). ADR-0001 esta embutido em `ARCHITECTURE.md`; existem 10 arquivos com prefixo numerado porque ADR-0005 tem um arquivo canonico e uma versao state-only supersedida. O arquivo ADR-0009 nao tem extensao `.md` e nao e retornado por glob markdown. Nenhuma proposta recente tem sign-off; ADR-0001 segue contradito por stakeholder review pendente.

| Arquivo atual                                                       | Numero / titulo                                                    | Status observado                                                   | Objetivo principal                                                                                                | Dependencias/referencias                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ARCHITECTURE.md` (secao “ADR 0001”)                                | ADR-0001, Escolha da Arquitetura Base                              | Accepted no header; stakeholder approval pendente em texto/memoria | Modular Monolith, DDD, Clean Architecture, stack e escala                                                         | Aponta a 0002–0006; diz que ADR-0001 e Accepted sem sign-off formal visivel.                                |
| `ADR-0002-module-boundaries.md`                                     | ADR-0002, Module Boundaries and Domain Communication               | Proposed                                                           | Bounded contexts, ownership, dependencias, API publica, eventos e extracao                                        | 0001/0003/0004/0005; `schoolId` canonico e ownership reconciliado, com registry e testes ainda conceituais. |
| `ADR-0003-database-strategy.md`                                     | ADR-0003, Database Strategy and Domain Data Model                  | Proposed                                                           | PostgreSQL/Prisma conceitual, tenancy, ERD, agregados, analytics/event storage                                    | Depende de 0001/0002 e antecipa 0004; deveria ser predecessor do schema.                                    |
| `ADR-0004-authentication-authorization.md`                          | ADR-0004, Authentication and Authorization Strategy                | Proposed                                                           | Auth.js Credentials, sessao JWT revogavel, RBAC e multi-escola                                                    | Depende de 0002/0003; referencias Auth.js e OWASP; corrige modelo User legado.                              |
| `ADR-0005-frontend-architecture-state-management-bff.md`            | ADR-0005, Frontend Architecture, State Management and BFF Strategy | Proposed                                                           | Feature frontend, RSC/Client Components, BFF/Actions, estado, cache, forms, performance, testes e observabilidade | Depende de 0002/0003/0004; propoe consolidacao de 0006–0008/0010, que ainda aguardam lifecycle formal.      |
| `ADR-0005-state-management-strategy.md`                             | ADR-0005 legado, State Management Strategy                         | Superseded (historico)                                             | Decisao anterior focada em state management                                                                       | Substituido pelo novo ADR-0005; nao deve ser citado como decisao normativa independente.                    |
| `ADR-0006 - Frontend Architecture and UI State Management.md`       | ADR-0006, Frontend Architecture and UI State Management            | Superseded                                                         | Proposta historica de frontend/estado                                                                             | Mantido como historico; ADR-0005 e ADR-0010 sao as referencias atuais.                                      |
| `ADR-0007 - Frontend State Management Strategy.md`                  | ADR-0007, Frontend State Management Strategy                       | Superseded                                                         | Proposta historica de estado                                                                                      | Mantido como historico; nao e guidance normativo.                                                           |
| `ADR-0008-.md`                                                      | ADR-0008, Frontend Architecture, UI State and BFF Strategy         | Superseded                                                         | Proposta historica de frontend/BFF                                                                                | Mantido como historico; ADR-0005 e a proposta canonica atual.                                               |
| `ADR-0009 - Analytics, Telemetry and Educational Insights Strategy` | ADR-0009, Analytics, Telemetry and Educational Insights Strategy   | Proposed                                                           | Projecoes pedagogicas, telemetry, dashboards e observabilidade                                                    | Refere 0001–0004; depende de 0002/0003/0004; sem extensao e markdown malformado.                            |
| `ADR-0010 - Frontend Architecture and UI Composition Strategy.md`   | ADR-0010, Frontend Architecture and UI Composition Strategy        | Proposed                                                           | Feature-based UI, RSC, UI kit, forms, acessibilidade e performance                                                | Escopo residual de composição visual/design system; estado, auth e BFF seguem ADR-0005.                     |

### Sequencia, lacunas e orfaos

- Numeracao: 0001–0010 sem lacuna numerica, **se** a secao embutida for considerada ADR-0001. Como arquivo, falta `ADR-0001-*.md`.
- Ha duplicacao de artefato para ADR-0005 (uma versao historica Superseded e uma canonica Proposed). Nao ha duas decisoes vigentes se o status for respeitado; falta registrar a relacao no indice futuro.
- Persiste duplicacao funcional severa entre ADR-0005/0006/0007/0008/0010 ate aprovacao/supersession explicita.
- `ADR-0009` existe, mas sem extensao; ferramentas e links por glob nao o reconhecem de forma consistente.
- `ADR-0008-.md` tem slug vazio; `ADR-0006`, 0007, 0008, 0010 usam espacos/Title Case.
- ADRs 0002–0010 estao Proposed e nao possuem evidencias de sign-off preenchido. 0001 Accepted contradiz stakeholder review pendente.
- Nao existe arquivo atomico `ADR-0001-base-architecture.md`; `INDEX.md` existe e registra que ADR-0001 permanece embutido no Documento Mestre.
- Nenhuma ADR e verdadeiramente orfa quanto a tema, mas nao ha indice que assegure navegacao; 0005/0006/0007/0008/0010 geram referencias circulares/ambiguidade, nao dependencia limpa.
- 0002 ainda fala de ADR-0003 “a produzir”, embora 0003 exista; 0003 referencia 0004 “a produzir”, embora 0004 exista; 0010 chama ADR-0005 futuro e ADR-0006 governanca de design ainda futuro apesar de ADR-0006 existir com outro tema.

## File Rename Plan

Prioridade considera descoberta, automacao de links e clareza normativa. Nomes recomendados pressupoem consolidacao e nao implicam aceitar documentos duplicados como decisoes simultaneas.

| Prioridade | Arquivo Atual                                                       | Arquivo Recomendado                                                                              | Motivo                                                                                                                        |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| ALTO       | ADR-0001 embutido em `ARCHITECTURE.md`                              | `ADR-0001-architecture-foundation.md` (extrair; manter link no Mestre)                           | ADR fundamental nao e arquivo atomico; referencias apontam para alvo ausente; controle de aprovacao/versionamento impossivel. |
| BAIXO      | `ADR-0002-module-boundaries.md`                                     | `ADR-0002-module-boundaries.md`                                                                  | Ja conforme slug minusculo/kebab-case; confirmar capitalizacao no titulo somente.                                             |
| BAIXO      | `ADR-0003-database-strategy.md`                                     | `ADR-0003-database-strategy.md`                                                                  | Ja conforme.                                                                                                                  |
| BAIXO      | `ADR-0004-authentication-authorization.md`                          | `ADR-0004-authentication-authorization.md`                                                       | Ja conforme.                                                                                                                  |
| BAIXO      | `ADR-0005-frontend-architecture-state-management-bff.md`            | `ADR-0005-frontend-architecture-state-management-bff.md`                                         | Novo arquivo canonico; nome conforme lowercase/kebab-case.                                                                    |
| BAIXO      | `ADR-0005-state-management-strategy.md`                             | Manter como historico Superseded ou arquivar via politica de ADR                                 | Nao e mais decisao ativa; preservar link ao ADR-0005 canonico e evitar duplicidade no indice.                                 |
| ALTO       | `ADR-0006 - Frontend Architecture and UI State Management.md`       | `ADR-0006-frontend-architecture-ui-state-management.md` ou arquivo Superseded/removido do indice | Espacos/Title Case; duplicacao com 0005, 0007, 0008 e 0010. Consolidar antes de rename para nao legitimar duplicate.          |
| ALTO       | `ADR-0007 - Frontend State Management Strategy.md`                  | `ADR-0007-frontend-state-management.md` ou Superseded                                            | Espacos/Title Case; contradiz fontes de verdade e repete 0005/0006/0008.                                                      |
| ALTO       | `ADR-0008-.md`                                                      | `ADR-0008-frontend-architecture-ui-state-bff.md` ou Superseded                                   | Slug vazio; duplicacao com 0006/0007/0010.                                                                                    |
| ALTO       | `ADR-0009 - Analytics, Telemetry and Educational Insights Strategy` | `ADR-0009-analytics-telemetry-educational-insights.md`                                           | Sem `.md`, espacos e Title Case; indevido para tooling e links.                                                               |
| ALTO       | `ADR-0010 - Frontend Architecture and UI Composition Strategy.md`   | `ADR-0010-frontend-architecture-ui-composition.md` ou Superseded                                 | Espacos/Title Case; disputa escopo com 0006–0008 e 0005.                                                                      |

## Template Conformance

Legenda: ✅ estrutura e conteudo suficientes; ⚠️ secao existe implicitamente/parcial ou formato irregular; ❌ ausente. ADR-0001 e avaliado no conteudo embutido.

| ADR             | Context | Decisao | Consequencias | Riscos                                                  | Alternativas                   | Implementacao                                                           | Relacionadas                             | Referencias                            | Aprovacao                                             | Reconsideracao                      |
| --------------- | ------- | ------- | ------------- | ------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| 0001            | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ⚠️ timeline, sem plano de migracao/estimativa por template              | ✅                                       | ⚠️ bibliografia/ref externa fraca      | ⚠️ header Accepted, sign-off/checklist nao comprovado | ❌ sem secao formal no ADR embutido |
| 0002            | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ✅ diretrizes; estimativa explicitamente fora de escopo                 | ✅                                       | ✅                                     | ✅ checks presentes, nao preenchidos                  | ✅                                  |
| 0003            | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ✅ documental; estimativa fora de escopo                                | ✅                                       | ✅                                     | ✅ checks presentes, nao preenchidos                  | ✅                                  |
| 0004            | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ✅ diretriz e rollback, estimativa fora de escopo                       | ✅                                       | ✅                                     | ✅ checks presentes, nao preenchidos                  | ✅                                  |
| 0005 (canonico) | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ✅ diretriz, migracao e rollback por feature; estimativa fora de escopo | ✅                                       | ✅                                     | ✅ checks presentes, nao preenchidos                  | ✅                                  |
| 0006            | ✅      | ✅      | ✅            | ⚠️ tabela parcial sem probabilidade/monitoramento claro | ⚠️ duas alternativas resumidas | ⚠️ sem migration/estimativa                                             | ✅ parcial                               | ⚠️ lista nomes sem links/versionamento | ❌ lista nomes sem checkbox/decisao preenchida        | ⚠️ “revisao futura” curta           |
| 0007            | ✅      | ✅      | ✅            | ⚠️ risco em texto achatado                              | ✅ parcial                     | ✅ parcial; sem migracao clara                                          | ✅                                       | ⚠️ nomes de docs sem links precisos    | ⚠️ nomes sem checks                                   | ✅                                  |
| 0008            | ✅      | ✅      | ✅            | ⚠️ riscos/tabularizacao corrompida                      | ✅ parcial                     | ✅ parcial, sem estimativa/rollback                                     | ✅                                       | ⚠️ lista de tecnologias sem links      | ⚠️ nomes sem checkboxes                               | ✅                                  |
| 0009            | ✅      | ✅      | ✅            | ⚠️ tabela achatada e sem qualidade consistente          | ✅ parcial                     | ⚠️ fases sem migration/rollback/estimativa                              | ✅                                       | ⚠️ refs sem links/versionamento        | ⚠️ nomes sem aprovacao/checks                         | ✅                                  |
| 0010            | ✅      | ✅      | ✅            | ✅                                                      | ✅                             | ✅ diretriz e componentes; estimativa fora de escopo                    | ✅ mas cruza referencia futura 0005/0006 | ⚠️ fontes genericas, sem versoes/links | ⚠️ nomes sem checkboxes/resultado                     | ✅                                  |

## Architectural Scorecard

Escala 0–10; mede qualidade do **conteudo documental e coerencia da decisao**, nao qualidade de uma implementacao inexistente. Valores baixos em observabilidade/seguranca/testabilidade significam falta de plano ou evidencias suficientes, nao necessariamente violacao em runtime.

| ADR  | DDD | Clean | SOLID | Modular | Hexagonal | Event | CQRS | Escala | Observab. | Multi-tenant | Seguranca | LGPD | Testabilidade | Manutencao |
| ---- | --: | ----: | ----: | ------: | --------: | ----: | ---: | -----: | --------: | -----------: | --------: | ---: | ------------: | ---------: |
| 0001 |   5 |     4 |     4 |       5 |         3 |     3 |    2 |      3 |         4 |            3 |         2 |    1 |             4 |          5 |
| 0002 |   8 |     8 |     7 |       8 |         8 |     7 |    6 |      7 |         6 |            6 |         6 |    4 |             7 |          7 |
| 0003 |   8 |     8 |     7 |       8 |         7 |     7 |    7 |      7 |         6 |            8 |         7 |    6 |             7 |          8 |
| 0004 |   7 |     8 |     7 |       8 |         8 |     6 |    5 |      6 |         7 |            9 |         8 |    7 |             7 |          7 |
| 0005 |   7 |     8 |     7 |       8 |         8 |     5 |    5 |      7 |         6 |            8 |         7 |    6 |             8 |          8 |
| 0006 |   5 |     5 |     5 |       5 |         4 |     1 |    2 |      4 |         3 |            3 |         4 |    2 |             4 |          5 |
| 0007 |   5 |     5 |     5 |       5 |         4 |     1 |    3 |      5 |         3 |            4 |         4 |    2 |             5 |          5 |
| 0008 |   5 |     5 |     4 |       5 |         4 |     2 |    3 |      5 |         4 |            4 |         5 |    3 |             5 |          5 |
| 0009 |   7 |     7 |     6 |       7 |         7 |     8 |    8 |      7 |         8 |            8 |         6 |    5 |             6 |          7 |
| 0010 |   6 |     7 |     6 |       7 |         6 |     2 |    3 |      6 |         5 |            5 |         5 |    4 |             6 |          7 |

**Justificativas por ADR**

- **0001:** DDD/Clean/Modular sao apresentados como principios, mas exemplos violam dependencias e misturam UI, domain, repositorio e Auth. Hexagonal/eventos/CQRS nao sao modelados com rigor. Escala, seguranca, tenant e LGPD ficam em claims/plans; falta prova/teste e ADR atomico.
- **0002:** forte em bounded contexts, ownership, contratos, grafo e idempotencia; queda em SOLID/Hexagonal por ownership ainda contestado e relacoes ciclicas/inconsistentes. Event/CQRS e conceitual; tenancy usa nome conflitante e privacidade/observabilidade requerem politicas aprovadas.
- **0003:** bom ownership, agregados, versoes e read models; modelagem conceitual detalhada. Cai em event/CQRS/observabilidade porque nao ha schema/contratos de evento executados; tenancy robusta no papel, mas ownership de membership e algumas entidades/metrica permanecem divergentes; LGPD esta condicionada a revisao legal.
- **0004:** forte least privilege, roles por escopo, fail closed, minimizacao e fluxo de credenciais; dependencias em Auth.js e ledger de sessao nao foram prototipadas, nem matriz convertida em permissions/testes. LGPD/MFA continuam precondicoes sem aprovacao legal/operacional.
- **0005:** decisao coesa com RSC, Actions, estado efemero, tenant/cache e limites modulares; boa testabilidade pretendida. Read models/eventos dependem dos contratos ainda sem runtime; comportamento de cache e specifics de Next 15 precisam ser validados em app real e 100K via carga.
- **0006:** mistura arquitetura frontend, estado e design system em proposta concisa; carece separacao em boundaries, eventos, tenancy/seguranca/LGPD e teste. Server-first e bom, mas Query/Context/Zustand sem governanca suficiente.
- **0007:** classifica estado e nega stores de dominio, mas declara dados de dominio “armazenados” no TanStack Query e permite `permissions`/`activeSchool` como dados client sem fronteira suficientemente clara. Riscos e alternativas sao pouco estruturados; isolamento e privacidade incompletos.
- **0008:** inclui BFF, `schoolId`, no-store para fluxo critico e proibicao de dominio em Zustand, mas repete 0006/0007/0010; Server Actions como BFF podem virar orquestrador multi-modulo. Cache, eventos e seguranca estao superficiais e markdown ilegivel reduz manutencao/teste.
- **0009:** melhor alinhamento com CQRS/event projections, rebuild, observabilidade e schoolId. Falta especificacao de deduplicacao/versionamento/replay/retencao e definicao dos limites entre telemetria tecnica e dados educacionais pessoais; event store/analytics nao esta validado.
- **0010:** bom frontend modular, RSC, acessibilidade, metas UX e fluxo de forms; decisao sobre auth/Zustand/tema conflita com 0004/0005 e design system deixa componentes/frameworks sem governanca. Evento/CQRS pouco aplicaveis, tenancy e privacidade superficial.

## Revisao Individual por ADR

Classificacao de maturidade: **Excelente** (9–10), **Boa** (7–8), **Media** (5–6), **Fraca** (0–4). Classificacao final avalia a decisao isolada e sua aprovabilidade agora; nao significa que o sistema esteja pronto para producao.

### ADR-0001 — Arquitetura Base

- **Resumo/nota/maturidade:** modular monolith + DDD + Clean Architecture; **3.4/10, Fraca** como decisao normativa, pois a intencao e boa mas o documento-base contem exemplos e contratos que contradizem as ADRs posteriores.
- **Fortes:** reconhece risco de acoplamento, custo operacional de microservicos e necessidade de fronteiras/testes.
- **Fracos/inconsistencias:** decisao embutida em documento mestre extenso; conteudo funde visao, exemplos executaveis e ADR. User inclui senha/role/schoolId singular; Auth/Users tem dependencia contraditoria; grafo inclui ciclos; estrutura mistura UI com dominio; stack lista Auth.js e JWT lib paralela; CUID/soft delete/migrations colidem com 0003.
- **Riscos/lacunas/ambiguidades:** Accepted sem aprovacao demonstrada e com stakeholder review pendente; “100K concurrent” e metas de latencia nao definem workload; deploy Vercel/serverless e cache/estado em memoria nao sao demonstrados; nao define tenancy ou threat model.
- **Melhorias/decisoes faltantes:** extrair como ADR-0001 atomico, separar Documento Mestre como visao; declarar estrategia de tenancy, boundary rules, fonte canonica de Auth/DB e criterios de escala; retirar exemplos conflitantes e obter sign-off.
- **Impactos:** produto: caminho geral, mas nao prioriza claramente motores pedagogico/competitivo; escala: promessas nao medidas; seguranca: exemplos de credencial e RBAC inseguros; manutencao: documento monolitico, links e memoria stale.
- **Classificacao final:** **Reescrever parcialmente** e reconciliar com 0002–0005 antes de ratificar `Accepted`.

### ADR-0002 — Module Boundaries and Domain Communication

- **Resumo/nota/maturidade:** define contexts, ownership, comunicacao, catalogo de eventos e extracao; **6.8/10, Media**.
- **Fortes:** afirma ownership de dados, fachadas publicas, grafo sincrono aciclico, eventos apos commit, idempotencia, outbox e nao acoplamento por repositorio.
- **Fracos/inconsistencias:** ainda ha artefatos de digitacao e nomenclatura; registry e catalogo de eventos precisam de contract tests; a lista consolidada de contexts do ADR-0002 e mais detalhada que os resumos historicos do Mestre.
- **Riscos/lacunas/ambiguidades:** enforcement de fronteiras, event version/retencao/DLQ e testes de ciclo ainda nao existem no workspace; dependencias sincrona e eventos exigem validação em tooling.
- **Melhorias/decisoes faltantes:** corrigir grafo e tabela de dependencias a partir de um unico registry; padronizar `schoolId`; tornar `Auth/Authorization`, `Users`, `Schools`, `Classes` owners inequivocos; definir command/query/event e regra de publicacao; automatizar import-boundary e contrato.
- **Impactos:** produto: protege diferenciadores ao separar core; escala: extracao plausivel, nao provada; seguranca: boa intencao multi-tenant mas identificador contraditorio; manutencao: documento detalhado, mas exige registry e testes.
- **Classificacao final:** **Aprovar com ajustes** apos P0 de tenancy, ownership e eventos; manter Proposed ate entao.

### ADR-0003 — Database Strategy and Domain Data Model

- **Resumo/nota/maturidade:** fixa PostgreSQL/Prisma, ownership, tenancy, ERD, analytics e evolucao; **7.2/10, Boa** no desenho conceitual.
- **Fortes:** distingue agregado de tabela, previne database-per-school, requer `schoolId`, versiona questoes, separa analytics de OLTP, declara outbox/inbox sem event sourcing, define expand/contract e chama 100K de meta a testar.
- **Fracos/inconsistencias:** ERD permanece conceitual e alguns nomes de projection/tabela exigem congelamento; UUID substitui o exemplo legado de CUID, mas o runtime/provider Prisma ainda precisa ser prototipado antes do schema.
- **Riscos/lacunas/ambiguidades:** constraints cross-school/joins e unicidade em tabelas particionadas nao estao prototipadas; planos de retencao sao baselines sujeitos a juridico; outbox/archive e analytics projection carecem de formato/retention operacional.
- **Melhorias/decisoes faltantes:** fechar Auth membership owner e nomes de tabela; explicitar catalogo global versus tenant-scoped e integridade de tenant; decidir UUID/Prisma mapping e prototipar particionamento; documentar PII lifecycle, backups/restore e fonte das taxonomias.
- **Impactos:** produto: habilita progresso e analytics pedagogico; escala: coerente por fases, mas sem benchmark; seguranca: tenant logicamente forte, dependente de disciplina/constraints; manutencao: abrangente, precisa de schema review e registry.
- **Classificacao final:** **Aprovar com ajustes** como estrategia conceitual; schema e migrations ficam bloqueados ate resolver ownership, tenancy e prototipos.

### ADR-0004 — Authentication and Authorization Strategy

- **Resumo/nota/maturidade:** User global, membership por escola, RBAC/ABAC, Auth.js Credentials + JWT revogavel; **6.9/10, Media**.
- **Fortes:** least privilege, scope global/escola/turma/pessoal, deny-by-default, sem roles no token, MFA para admins, credenciais fora de User e eventos sem segredos.
- **Fracos/inconsistencias:** 0003 ainda registra Auth/Security ownership agregado; produtores de `UserRegistered`, `UserCreated`, `UserActivated`, `MembershipCreated` variam entre ADRs; diz Auth.js Credentials implica JWT e adiciona revocation registry custom que precisa de desenho/version testado; papel de Auth/Authorization vs Schools ainda requer aceite conjunto.
- **Riscos/lacunas/ambiguidades:** senha, reset, rate limiter, email, revogacao, MFA, break-glass e event notifications nao existem; politica de password/session concreta sem threat model, calibracao ou aprovacao legal; para menores, self-registration/consentimento e dados de perfil ainda nao definidos.
- **Melhorias/decisoes faltantes:** fechar registry/session invalidation, cookie/rotation e failover; escolher Auth.js adapter/versao; definir se `SchoolMembership` pertence a Auth/Authorization e atualizar 0003; converter permission matrix em permissions testaveis; aprovacao juridica e security review.
- **Impactos:** produto: permite multi-escola e papeis; escala: revocation check pode ser hotspot; seguranca: bom desenho conceitual, critical path sem implementacao; manutencao: matriz rica, alto custo de governanca.
- **Classificacao final:** **Reescrever parcialmente** ownership e sessao; bloquear acesso privilegiado/real data ate controles serem implementados e testados.

### ADR-0005 — Frontend Architecture, State Management and BFF Strategy

- **Resumo/nota/maturidade:** arquitetura feature-based, RSC-first, Server Actions como adapters BFF, React Hook Form/Zod, cache, testes e observabilidade; **7.8/10, Boa** como proposta documental.
- **Fortes:** separa Action de Application/Domain, proibe UI->Prisma, limita Zustand, torna TanStack Query opt-in, inclui `schoolId`, cache, testes e criterios de qualidade.
- **Fracos/inconsistencias:** ADR-0006–0010 continuam no diretorio e ainda expressam decisoes diferentes; o novo ADR nao pode supersede-los sem aprovacao explicita. `packages/ui` vs `shared-ui` e a fronteira visual de `packages/modules/*` ainda precisam harmonizacao.
- **Riscos/lacunas/ambiguidades:** cache do Next 15/deployment adapter, Query hydration, factories Zustand SSR e invalidacao multi-instancia ainda sem vertical slice/teste; requisitos tecnicos e SLOs nao foram medidos.
- **Melhorias/decisoes faltantes:** aprovar formalmente, manter `ADR-0005-state-management-strategy.md` como Superseded, decidir lifecycle de 0006–0010 e validar estrategia em uma jornada com teste cross-tenant/performance.
- **Impactos:** produto: bom suporte a formularios e jornadas de treino sem otimizar resultado oficial no client; escala: reduz bundle, mas exige medicao de RSC/actions/cache; seguranca: fronteira server-first robusta no papel, sem implementacao; manutencao: contratos claros, desde que ADRs concorrentes sejam reconciliadas.
- **Classificacao final:** **Aprovar com ajustes**; manter Proposed ate sign-off e decisao sobre ADRs concorrentes.

### ADR-0006 — Frontend Architecture and UI State Management

- **Resumo/nota/maturidade:** frontend server-first, TanStack Query remoto, Zustand global restrito, design system; **4.3/10, Fraca**.
- **Fortes:** reconhece Server Components, proibe regra de negocio na UI e tenta reduzir Client Components.
- **Fracos/inconsistencias:** conciso demais para arquitetura de estado; TanStack Query para estado servidor conflita com 0005 e não especifica fonte canonica, keys, tenant, invalidation ou SSR; “não utilizar Redux” é restricao sem rationale comparativo suficiente.
- **Riscos/lacunas/ambiguidades:** falta template completo (aprovacao, referencias, migration/rollback); segurança/LGPD/eventos/testes quase ausentes; design system e estado misturados no mesmo escopo.
- **Melhorias/decisoes faltantes:** superseder em favor de 0005 + 0010 consolidado; manter design system/frontend composition em ADR distinto, não state management.
- **Impactos:** produto: promove SSR sem detalhar jornadas; escala: pouca evidência; segurança: controles incompletos; manutenção: duplicação e baixo nível de detalhe.
- **Classificacao final:** **Reescrever completamente** ou marcar Superseded; não aprovar junto do 0005.

### ADR-0007 — Frontend State Management Strategy

- **Resumo/nota/maturidade:** RSC + TanStack Query para estado remoto + Zustand para UI; **4.0/10, Fraca**.
- **Fortes:** URL para estado navegável, proíbe explicitamente stores para tentativas/rankings/perguntas e lista optimistic updates não permitidos.
- **Fracos/inconsistencias:** declara “Estado de Domínio” armazenado no TanStack Query Cache; autenticação client fornece `session`, `permissions`, `activeSchool` sem DTO/expiração, apesar de 0004 exigir autorização server-side; Query global obrigatória conflita com 0005.
- **Riscos/lacunas/ambiguidades:** cache client multi-tenant, hydration, logout, cache de permissões, SSR request isolation e retencao não definidos; documentação está em texto achatado, placeholders e tabelas corrompidas.
- **Melhorias/decisoes faltantes:** remover a ideia de dominio armazenado no Query cache; explicitar cache como projeção descartável com autorização server-side; superseder por 0005 ou reescrever com teste de tenant/hydration.
- **Impactos:** produto: potencial de UX dinâmica; escala: fetch/cache pode ajudar, mas duplica RSC sem critérios; segurança: risco alto de stale permission/cross-tenant; manutenção: sem governança e formatação.
- **Classificação final:** **Reescrever completamente** ou Superseded; não é aprovável como escrito.

### ADR-0008 — Frontend Architecture, UI State and BFF Strategy

- **Resumo/nota/maturidade:** RSC, Server Actions como BFF, Zustand UI e TanStack Query remoto; **4.5/10, Fraca**.
- **Fortes:** proíbe UI acessar Prisma e lógica de negócio, recomenda no-store para tentativa em andamento, restringe estado de domínio em Zustand e limita analytics de UI.
- **Fracos/inconsistencias:** repete escopo de 0006/0007/0010; afirma Server Actions como BFF oficial sem separar adapter HTTP de application use case; TanStack Query global contraria 0005; arquivo slug vazio e Markdown quebrado.
- **Riscos/lacunas/ambiguidades:** BFF pode se tornar camada de negócio transversal e violar ownership do 0002; SSR/SSG/cache e keys tenant não possuem estratégia verificável; inexistem rollout/rollback e critérios de performance.
- **Melhorias/decisoes faltantes:** separar contrato de entrada, use case e cache owner; consolidar decisões frontend; corrigir formatação/arquivo e registrar supersession.
- **Impactos:** produto: oferece caminho de composição; escala: dependente de App Router e caches ainda não testados; segurança: auth/resolve schoolId são princípios sem evidência; manutenção: escopo duplicado e prosa difícil de revisar.
- **Classificação final:** **Reescrever parcialmente** como ADR de BFF/adapters, ou superseder se 0005/0010 definirem a fronteira.

### ADR-0009 — Analytics, Telemetry and Educational Insights Strategy

- **Resumo/nota/maturidade:** projeções assíncronas, dashboards educacionais e telemetria OpenTelemetry; **5.4/10, Media**.
- **Fortes:** Analytics não é fonte de verdade; dashboards partem de eventos; projections reconstruíveis/versionadas; schoolId e queue lag são reconhecidos.
- **Fracos/inconsistencias:** markdown quase inteiro achatado; `RankingMetrics` pode invadir ownership de Rankings; mistura telemetry técnica, analytics pedagógico e insight adaptativo; lista `UserActivated` que não coincide com evento canônico de 0002/0004.
- **Riscos/lacunas/ambiguidades:** sem definição operacional de event schema, DLQ/replay/retention/PII, consentimento ou suppression de grupos pequenos; “PostgreSQL analítico” não define workload/read replica/warehouse; mastery/risco pedagógico sem validação de métrica.
- **Melhorias/decisoes faltantes:** separar technical observability de analytics educacional; evento registry e retention LGPD; definir owners de projections, consistência/frescor, reconciliação e testes de qualidade do indicador.
- **Impactos:** produto: diretamente estratégico ao aprendizado; escala: bom uso de projections mas sem sizing/teste; segurança: risco de reidentificação de menores; manutenção: métricas sem dicionário/definição e formato ruim.
- **Classificação final:** **Reescrever parcialmente** antes de implementar consumers ou enviar telemetria externa.

### ADR-0010 — Frontend Architecture and UI Composition Strategy

- **Resumo/nota/maturidade:** feature-based UI, App Router/RSC, RHF/Zod, design system, a11y e performance; **5.7/10, Media**.
- **Fortes:** proíbe UI acessar banco/Prisma e regra de negócio, promove Server Components, progressive forms, WCAG 2.2 AA e metas de Web Vitals.
- **Fracos/inconsistencias:** permite “estado global para autenticação” via Zustand, inconsistente com 0004/0005; inclui `packages/ui` sem reconciliar `shared-ui`; diz ADR-0005 futuro e ADR-0006 Design System Governance futuro apesar de existir ADR-0006 de outro tema; Tremor/Recharts duplicam ferramentas sem prova/revisao de bundle.
- **Riscos/lacunas/ambiguidades:** “Server Actions como fluxo” precisa dizer action como adapter, não dono de caso de uso; autenticação/tema persistidos precisam distinguir sessão de preferência; sem planos de teste visual/a11y/tenant.
- **Melhorias/decisoes faltantes:** manter como ADR canônico de composição frontend após renomear/referenciar; integrar 0005 como estado único; escolher um package UI; provar charts/bundle/a11y em protótipo.
- **Impactos:** produto: composição adequada a dashboards e estudantes; escala: RSC reduz payload, 100K não depende só de UI; segurança: UI não deveria autorizar e não pode expor session; manutenção: feature-based bom, governança de UI incompleta.
- **Classificação final:** **Aprovar com ajustes** depois de consolidar estado e corrigir referências, status Proposed.

## Consistency Matrix

| ADR       | Conflita com           | Descricao do conflito                                                                                                                                                                                                                 | Gravidade                 |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 0001      | 0002, 0003, 0004       | `User.password`, `User.role` e `User.schoolId` contradizem User global, credencial isolada e memberships; grafo legado tem ciclos e acesso cross-module.                                                                              | CRITICO                   |
| 0001      | 0003                   | CUID e `deletedAt` padrao/reversible migrations no Documento Mestre divergem de UUID nativo, soft delete seletivo e migrations forward-only do 0003.                                                                                  | ALTO                      |
| 0001      | 0002/0009              | Afirma event-driven/microservices/escala como caminho pronto, mas ADRs recentes exigem ownership, outbox e gatilhos que ainda nao estao implementados.                                                                                | ALTO                      |
| 0001      | 0004                   | Auth depende de Users numa secao e Users depende de Auth noutra; `jsonwebtoken` separado conflita com estrategia Auth.js e JWT em provider oficial.                                                                                   | ALTO                      |
| 0001      | 0005, 0006–0008, 0010  | Recomenda Zustand + Context sem limite claro e memoria fixa escolha; novas propostas divergem quanto a server state e autenticacao client.                                                                                            | ALTO                      |
| 0002      | 0003, 0004, 0005, 0009 | Identificador escolar e ownership estao alinhados em `schoolId`; falta validar registry/contratos em tooling.                                                                                                                         | MEDIO                     |
| 0002      | 0003, 0004             | Auth/Authorization possui membership e grants; Users possui identidade/perfil; Classes possui enrollment/teaching assignment. Resta validar constraints e testes.                                                                     | MEDIO                     |
| 0002      | 0009                   | Event catalog de 0002 e eventos consumidos de 0009 divergem em nomes/produtores (`UserRegistered` vs `UserCreated`/`UserActivated`; `ChampionshipCreated` consumido como fato de Analytics; `QuestionAnswered` vs `AnswerEvaluated`). | ALTO                      |
| 0002      | 0003, 0009             | Analytics, Rankings, Question Engine e QuestionStatistics nao tem ownership/nome/eventos completamente unicos; 0003 corrige question stats em parte, 0009 cria `RankingMetrics` em Analytics.                                         | ALTO                      |
| 0003      | 0004                   | Data Map e ADR-0004 estao alinhados em Auth/Authorization para memberships, grants e invites; schema fisico/adapter continuam pendentes.                                                                                              | MEDIO                     |
| 0003      | 0009                   | `question_metrics`/`question_statistics`, telemetry store, PostgreSQL analitico e projections sem definicao comum de schema/deploy/retencao.                                                                                          | MEDIO/ALTO                |
| 0004      | 0003                   | `SchoolMembership` possui roles, mas classes/enrollments tambem podem conter role contextual; a fronteira entre papel de acesso e matricula/atribuicao docente precisa constraint/owner explicito.                                    | ALTO                      |
| 0004      | 0009                   | Eventos de login podem chegar em analytics externo segundo 0009, enquanto 0004 permite apenas projecao minima e restringe PII; sem contrato de consentimento/retencao aprovado.                                                       | ALTO                      |
| 0005      | 0006–0008              | Conflitos historicos preservados, mas os tres documentos estao marcados Superseded.                                                                                                                                                   | RESOLVIDO DOCUMENTALMENTE |
| 0005      | 0010                   | ADR-0010 agora restringe-se a composicao visual; auth, estado e BFF seguem ADR-0005.                                                                                                                                                  | RESOLVIDO DOCUMENTALMENTE |
| 0006–0008 | 0005/0010              | Lifecycle explicito como Superseded no indice e nos headers.                                                                                                                                                                          | RESOLVIDO DOCUMENTALMENTE |
| 0007      | 0002/0003/0004         | Risco de cache client e permissao stale permanece apenas como historico; nao e guidance vigente.                                                                                                                                      | RESOLVIDO DOCUMENTALMENTE |
| 0008      | 0002                   | “Server Actions como BFF” podem acessar varios contratos/domínios, enquanto 0002 proibe UI/API orquestrar multiplos repositorios; falta definir action-adapter versus coordenador de caso de uso.                                     | ALTO                      |
| 0010      | 0005–0008              | Reabre frontend/estado depois de existir 0005 e ADRs duplicados; referencias cruzadas rotuladas como “futuro” apesar de presentes.                                                                                                    | ALTO                      |
| 0010      | 0004/0005              | Estado global de autenticacao via Zustand e tema persistido nao esclarecem que sessao e server-owned nem tratamento de troca/logout.                                                                                                  | ALTO                      |
| 0009      | 0002/0003              | `RankingMetrics` dentro de Analytics pode parecer propriedade de ranking; Analytics nao pode ser fonte canonica nem duplicar ownership.                                                                                               | MEDIO                     |

## Nomenclature Review

| Area             | Inconsistencia                                                                                                                                      | Correcao recomendada                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tenancy          | `schoolId` nos ADRs ativos; `tenantId` somente em diagnostico historico                                                                             | Manter `schoolId` no dominio e envelopes escolares. Para escopo global, usar `scopeType/scopeId`, sem alias implicito.                                                               |
| ADR names        | `ADR-0006 - ...`, `ADR-0007 - ...`, `ADR-0008-.md`, `ADR-0009 ...` sem extensao, `ADR-0010 - ...`                                                   | `ADR-XXXX-lower-kebab-case.md`; extrair 0001 para arquivo dedicado.                                                                                                                  |
| Frontend modules | `modules`, `features`, `packages/modules`, `packages/ui`, `shared-ui` usados sem uma unica localizacao                                              | Separar bounded contexts backend em `packages/modules/*`, feature UI em `apps/web/src/features/*`, shared UI em um unico `packages/ui`; documentar dependencia unidirecional.        |
| User identity    | `UserRole`, `User.role`, `schoolId`, `SchoolMembership`, membership role e class role                                                               | `User` global; `GlobalRoleAssignment`; `SchoolMembership`; `MembershipRoleAssignment`; `ClassTeachingAssignment`/Enrollment distintos.                                               |
| Topic taxonomy   | Tema/Subtema, Topic, Competency, Skill, `Question.competency` string/tag                                                                            | IDs e referencias N:N versionadas; vocabulário oficial mapeado a fontes/edições; não misturar competence/skill com tags livres.                                                      |
| Events           | `UserRegistered`, `UserCreated`, `UserProfileCreated`, `UserActivated`; `QuestionAnswered` e `AnswerEvaluated`; `ChampionshipFinished` vs Completed | Um nome de fato em passado, um produtor autoritativo, consumidor documentado, envelope versionado e identificador de tenant uniforme. Commands nao devem ser confundidos com events. |
| Event fields     | `occurredAt`, `occurreuEm`, `tenantId`, `schoolId`, event `version`/`schemaVersion`                                                                 | Envelope unico com camelCase e UTC; schemaVersion, correlationId, causationId; `schoolId` quando escopo escolar.                                                                     |
| Aggregate/entity | `Question + Answers + Topics` como agregado em 0001 conflita com versionamento e ownership Topics em 0003; `Ranking` ora domínio ora projection     | Agregado pequeno por consistencia; Topics referenciado por ID; ranking sempre projection/read model ou explicitar agregado de definicao separado.                                    |
| Analytics        | `RankingMetrics`, `RankingEntry`, `question_statistics`, `question_metrics`, `Telemetry Store`                                                      | Separar analytics telemetry tecnica, analytics educacional e dominio Rankings; nomes e owner claros.                                                                                 |
| Plural/idioma    | Arquivos/conteudo misturam ingles, portugues, PascalCase, snake_case e camelCase sem regra por tipo                                                 | Documentar: modelos/tabelas convention do ADR-0003; eventos em ingles passado; texto ADR consistente em pt-BR; filenames lowercase kebab-case.                                       |

## Security and Database Findings

### Seguranca e LGPD

| Severidade | Achado                                                                                                                                                                           | Exposicao/acao                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| CRITICO    | Nenhuma implementacao de Auth, RBAC, middleware/action guard, hash ou rate limiter existe no workspace; especificacao so documental.                                             | Bloqueia login publico e operacoes com dados de aluno ate threat model, testes e controles reais.      |
| CRITICO    | Modelo legado persiste password/role/schoolId em User e Auth.js e `jsonwebtoken` sao listados lado a lado sem contrato.                                                          | Remover exemplo legado e reconciliar com 0003/0004; secret e hash nao podem migrar para client/events. |
| ALTO       | 0004 exige MFA privilegiada antes de producao, mas 0003/0004 apenas listam `mfa_factors` futuro; administradores globais sem MFA implementada nao podem ser habilitados.         | Gate de release: MFA, recuperacao, step-up, break-glass e dupla aprovacao testados.                    |
| ALTO       | LGPD/menores aparece como “revisao futura” em vez de requisito fechado (consentimento, base legal, controlador, retencao, direitos, operadores, incidentes).                     | Revisao juridica/DPO antes de coletar dados reais de menores e antes de telemetria externa.            |
| ALTO       | 0009 inclui eventos de usuario/login em Analytics e apresenta PostHog/telemetry; retencao, consentimento, pseudonimizacao, opt-out e destino dos dados nao fechados.             | Desabilitar tracking de identidade externa ate politica aprovada e payload revisado.                   |
| ALTO       | `GLOBAL_ADMIN` pode ter acesso break-glass a PII/dados academicos, mas 0004 nao define completamente aprovacao fora de banda, alerta em tempo real, revisao e expiracao tecnica. | Definir processo just-in-time de privilegio e auditoria independente.                                  |
| MEDIO      | Politica de senha/session em 0004 contem valores concretos (15 chars, 8h/30min) sem threat model, calibracao de usabilidade/menores ou teste operacional.                        | Validar por security review e telemetria protegida antes de fixar em producao.                         |
| MEDIO      | Audit logs e security logs recebem PII/origem de rede com prazos distintos; 0003 sugere prazos baseline sujeitos a juridico, 0004 nao fecha retencao detalhada.                  | Inventariar dado, finalidade, acesso, expurgo e backups em politica unica.                             |

### Banco/tenancy

| Severidade | Achado                                                                                                                                                           | Evidencia/impacto                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| CRITICO    | `schoolId`/`tenantId` sem nome canônico atraves do sistema.                                                                                                      | Cache, query, evento, membership e analytics podem falhar open em tenant isolation.                 |
| ALTO       | Ownership divergente em memberships entre 0003 Auth/Security, 0004 Auth/Authorization e 0002 Classes/Schools.                                                    | Definir owner de cada tabela, FK, comando e evento; membership de acesso nao pode virar enrollment. |
| ALTO       | 0003 recomenda cross-module FK como excecao e tambem diz consumers por ID/evento; nao lista criterio de excepcao nem como Prisma valida tenant composto.         | Definir politica para FK cross-context/compound tenant constraints, sem cascades cross-module.      |
| ALTO       | Particionamento temporal de tabelas com unicidade/PK, UUID, migrations especiais e Prisma sem prototipo.                                                         | Nao declarar partition strategy implementavel ate prova de compatibilidade e benchmark.             |
| ALTO       | `auth_sessions` JWT revocation registry depende de lookup/cache em toda request; no volume, indisponibilidade de DB causa fail-closed e custo de round-trip.     | Medir QPS/latencia, estrategia de cache revogavel e comportamento de failover antes de producao.    |
| MEDIO      | Catalogos de tabela variam: `class_memberships`/`enrollments`; `question_metrics`/`question_statistics`; `profiles`/`user_profiles`; `sessions`/`auth_sessions`. | Canonizar modelo logico antes do schema e evitar criar duplicatas fisicas.                          |
| MEDIO      | Analytics e Ranking fazem projecoes/materializacoes; 0009 propoe `RankingMetrics`, 0003 reserva ownership ao Rankings.                                           | Separar ranking domain projection e metricas analiticas sobre ranking.                              |

### Eventos e event-driven

| Severidade | Achado                                                                                                                                                                                   | Correcao exigida                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ALTO       | Ownership e nomes dos eventos de User, Question e Championship mudam entre ADRs; um evento pode ser emitido duas vezes por producer diferente.                                           | Event registry unico: event type, owner/produtor, schemaVersion, consumidores, PII class e semantica.                                  |
| ALTO       | 0002 define ao menos uma vez/idempotencia/outbox; 0003 retention/archive/inbox; 0009 outbox como mitigacao, sem SLO, replay procedure e compatibilidade de payload operacional fechados. | Definir envelope, delivery, dedupe key, retry/backoff, DLQ, replay, schema compatibility e on-call antes de consumer critico.          |
| ALTO       | `schoolId`/`tenantId` no envelope conflitam e alguns payloads misturam referencias, dados e `resultadoRef`.                                                                              | Tenant explicito e payload minimizado; referencia nao pode depender de lookup sem autorizacao; nunca transmitir answer/gabarito/token. |
| MEDIO      | Event sourcing e CQRS sao descritos de forma ampla, mas modelo e estado relacional/outbox, sem declarar limites de consistencia por caso de uso.                                         | Rotular explicitamente “event-driven integration + read projections”, nao event sourcing; definir owner dos read models.               |
| MEDIO      | Sem contrato de replay/retencao coordenado com exclusao/anonymizacao LGPD, analytics e backups.                                                                                          | Planejar expurgo/anonimizacao end-to-end incluindo outbox, DLQ, snapshots, telemetry e replicas.                                       |

## Executive Scorecard

| ADR  | Nota (0-100) | Status                             | Risco                              | Prioridade                 |
| ---- | -----------: | ---------------------------------- | ---------------------------------- | -------------------------- |
| 0001 |           34 | Accepted textual / review pendente | Alto                               | P0                         |
| 0002 |           76 | Proposed                           | Alto                               | P1: registry e enforcement |
| 0003 |           78 | Proposed                           | Alto                               | P1: schema e constraints   |
| 0004 |           75 | Proposed                           | Critico para go-live               | P0: security/legal/runtime |
| 0005 |           82 | Proposed                           | Alto ate sign-off e vertical slice | P1                         |
| 0006 |           43 | Superseded                         | Historico                          | Encerrado documentalmente  |
| 0007 |           40 | Superseded                         | Historico                          | Encerrado documentalmente  |
| 0008 |           45 | Superseded                         | Historico                          | Encerrado documentalmente  |
| 0009 |           54 | Proposed, formato/editorial pobre  | Alto                               | P1                         |
| 0010 |           57 | Proposed, sobreposta               | Alto                               | P1                         |

## Recommended Corrections

### P0 — Bloqueia baseline de implementacao

1. **Ratificar fontes canonicas:** usar `INDEX.md` como registro; ADR-0005 e a proposta canonica de frontend/estado/BFF; ADR-0006–0008 estao Superseded; ADR-0010 permanece restrito a composicao visual.
2. **Preservar tenant naming:** manter `schoolId` em modelo escolar, eventos e exemplos; escopo global deve ser explicito por `scopeType/scopeId`. O conflito ativo foi corrigido; faltam testes e constraints.
3. **Resolver lifecycle de ADR-0001:** manter a decisao embutida, conforme regra atual, e reconciliar `Accepted` com stakeholder review pendente no indice antes de tratar como aprovada.
4. **Manter modelo de User reconciliado:** User global sem password/role/schoolId; Auth.js Credentials/JWT registry, roles/membership e UUID/migrations seguem 0003/0004.
5. **Validar ownership em runtime:** Users/UserProfile; Auth/Authorization credentials/sessions/memberships/role grants; Schools school; Classes enrollment/teaching assignment; Rankings projections; Analytics metrics. A documentação está alinhada; schema e testes ainda faltam.
6. **Bloquear producao com dado real** ate threat model, MFA para privilegiados, rate limiting, reset/email, LGPD/menores, retencao, incident response, isolamento tenant e testes negativos terem dono e evidencia.
7. **Nao afirmar suporte 100K** ate existir app, esquema, carga multi-tenant/skew/picos, SLOs aprovados, observabilidade e relatorio reproducivel.

### P1 — Alta prioridade

1. Consolidar catalogo de eventos e definir produtor unico, nomes/versionamento, envelope, schoolId, payload/PII, outbox/inbox, idempotencia, retries, DLQ, replay e retention.
2. Reparar event/analytics ownership: remover ambiguidades `question_statistics`, `RankingMetrics`, `Telemetry Store`; separar analytics pedagogico de telemetry operacional.
3. Padronizar template aplicado, headers bilinguais, tabelas e links; ADRs 0006–0010 precisam de estrutura legivel e status/referencias validos ou devem ser supersedidos.
4. Atualizar snapshots de memoria/README para apontar ao inventario consolidado do ADR-0002, sem apagar historico.
5. Mapear ADR-0001 e todos os links cruzados em memoria/README; marcar como historico o estado stale (0005 pendente, 0006 error handling, 0007 realtime).
6. Resolver design de server Actions/BFF: action como adapter para um contrato/use case; nao virar coordenador que acessa repositorios de varios bounded contexts.
7. Criar acceptance gates executaveis: architecture tests de imports/ciclos, tenant tests, event contract tests, schema/migration drift, threat model review e load tests.

### P2 — Antes de primeira fase relevante

1. Especificar taxonomia e question snapshots/versionamento editorial com fonte/licenca/proveniencia.
2. Definir politica oficial para soft delete, anonimização, retencao e direitos do titular nas copias analytics/event/cache/backups.
3. Definir requisitos e benchmarks para partitions/UUID/Prisma native DDL/read replicas/Redis/OLAP; sem antecipar implementacao.
4. Definir SLOs e metricas operacionais com ownership, alertas e runbooks; corrigir contradicoes entre metas 200ms, 500ms, 99.5–99.99% e concurrencia.
5. Validar packages previstos contra estrutura real: `packages/ui`, `packages/shared-ui`, `apps/web/src/features`, `packages/modules` e BFF.

### P3 — Qualidade continua

1. Criar lint/CI para nomenclatura de ADR e headings/template; impedir arquivo ADR sem extensao/slug.
2. Revisar referencias externas por URL/versao e atualizar Next.js/Auth.js/OWASP conforme dependencias finalmente aprovadas.
3. Reavaliar notas de maturidade apos primeiro vertical slice, incident drills e teste de carga; evidencias substituem estimativas.

## ADRs Tematicamente Faltantes

Nao ha lacuna numerica entre 0001 e 0010 se 0001 for extraido, mas faltam decisoes de dominio e operacao que o conjunto atual nao fecha. Criar numeros somente apos aprovar o indice e resolver duplicatas, sem reservar prematuramente sequencias concorrentes.

| Prioridade | Decisao faltante                                               | Escopo minimo                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0         | Governanca/índice e lifecycle de ADRs                          | Fonte normativa, owner, status, aprovacao, supersession, links, naming, revisão e como Documento Mestre/memoria são reconciliados. Pode ser processo/INDEX em vez de ADR separado.                         |
| P0         | Event Contract and Delivery Governance                         | Registry de eventos/commands, produtor, consumer, schema compatibility, schoolId, idempotencia, outbox/inbox, DLQ, replay, retention, SLO e PII. 0002/0003/0009 descrevem partes incompatíveis.            |
| P0         | Privacy, LGPD and Child Data Governance                        | Controlador/operadores, finalidade/base legal, consentimento/representante, minimizacao, retencao, direitos, anonimização, subprocessadores e incident response; gate antes de dados reais.                |
| P1         | Product Domain Model: Pedagogical/Adaptive/Competition Engines | Regras de adaptatividade, evidência/feedback, scoring, desempate, elegibilidade, tentativas e simulado; fonte de verdade e invariantes dos diferenciais do produto, em colaboração com domínio pedagógico. |
| P1         | Architecture Fitness, Testing and Dependency Enforcement       | Testes de fronteira/ciclos, contract/event tests, tenant isolation, migrations, security, load/perf budgets, ownership de suites e gates de CI.                                                            |
| P1         | Runtime, Deployment, Reliability and Disaster Recovery         | Topologia real, conexões/pool, secrets, backup/PITR, RPO/RTO, filas, observabilidade, SLO/SLI, runbooks, incidentes e rollout/rollback.                                                                    |
| P2         | API/BFF and Integration Boundaries                             | Quando Server Action, Route Handler, webhook, background job/event; autenticação/autorização, idempotência, versionamento e prevenção de Actions virarem use cases multi-módulo.                           |
| P2         | Content Provenance, Licensing and Editorial Governance         | Proveniência OBMEP, licença/direitos, edição/fase, autoria/revisão, versionamento e correção/retirada de questão.                                                                                          |
| P2         | AI Safety, Data Governance and Evaluation                      | Dados autorizados, fornecedor/retencao, minimizacao, qualidade pedagógica, segurança, custos, fallback, avaliação de impacto e supervisão humana.                                                          |

O ADR-0009 cobre observabilidade e analytics conceitualmente, mas não substitui políticas distintas de telemetria de plataforma, privacidade educacional ou SLO operacional. O ADR-0010 cobre apresentação visual, não a governança do design system que ele cita como futura.

## Roadmap de Documentação Arquitetural

1. **Ratificar e manter o registro:** usar `INDEX.md`, reconhecer ADR-0005, ADR-0006–0008 como Superseded e ADR-0010 como composição visual; reconciliar a aprovação pendente do ADR-0001.
2. **Fechar contratos transversais:** manter `schoolId` e ownership unificados; transformar envelope/registry/outbox/retencao e fonte canonica de analytics em contratos testáveis.
3. **Fechar gates de privacidade/seguranca:** threat model, política para menores/LGPD, MFA admin, retencao e contratos de telemetry/IA antes de dados reais.
4. **Modelar os diferenciais:** documentar agregados, invariantes, fluxos e decisões de produto dos motores pedagógico, adaptativo e competitivo; validar com product/domain experts.
5. **Definir fitness e operação:** ADR/politicas de CI, boundaries, testes, deployment, SLO, disaster recovery, observabilidade e API/BFF.
6. **Provar antes de afirmar:** vertical slice representativo e testes de isolamento, segurança, contrato, migration, carga e recuperação; ajustar decisões com evidência e registrar ADRs superseding quando necessário.

Sequência recomendada para revisão: **ratificar 0001 → aprovar 0002 ↔ 0003 ↔ 0004 → validar 0005/0010 → 0009 → decisões P0 faltantes → decisões de domínio P1**. Em caso de conflito futuro, não combinar silenciosamente: registrar decisão substituta e marcar predecessora Superseded.

## Final Verdict

**A arquitetura está pronta para iniciar implementação? NÃO, para implementação de produto com dados reais ou definição de schema definitivo.**

É possível iniciar trabalho preparatório isolado (repo scaffold, spike Auth.js e teste de cache) se marcado como exploratório e sem tratar decisões Proposed como normativas. Antes de features de negócio, schema Prisma, ingestão de dados de estudantes ou habilitação de administradores, é obrigatório: obter aprovação formal, fechar privacidade/segurança, transformar ownership/`schoolId` em constraints e testes, e produzir critérios de aceitação executáveis. A harmonização documental, o índice e o lifecycle dos ADRs frontend estão concluídos; a arquitetura ainda não é enterprise validada. Nenhuma conclusão deste relatório atesta conformidade OWASP/LGPD ou capacidade operacional.
