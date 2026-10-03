# Auditoria Arquitetural do MateMágico Champions

**Data da auditoria:** 2026-10-01  
**Fontes com última revisão indicada:** 2026-09-29  
**Escopo:** Documento Mestre, ADRs solicitados, documentos frontend correlatos, índice/template de ADR e memória de projeto disponível.  
**Natureza:** auditoria documental e de evidências do workspace. Este relatório não altera nem ratifica decisões e não é um ADR.

## Convenções de evidência

- **Fato documentado:** afirmação expressa nas fontes examinadas.
- **Fato observado:** estado diretamente visível nos arquivos do workspace examinados.
- **Hipótese:** interpretação que precisa de validação por stakeholders ou evidência adicional.
- **Conflito:** fontes diferentes sustentam afirmações incompatíveis ou com autoridade ambígua.
- **Recomendação:** encaminhamento documental/de governança; não é decisão aprovada nem proposta de implementação.

As notas de maturidade medem clareza, coerência e evidência documental disponível; não certificam software, controles em produção ou resultados de negócio.

## 1. Inventário arquitetural

O inventário inclui o ADR-0005 canônico, o `INDEX.md` e o template como documentos de controle necessários para interpretar o conjunto solicitado. A inclusão não muda o escopo nem o status dos documentos originais.

| Documento                                                                                                                                             | Objetivo                                                                 | Status identificado                                                                                                                         | Dependências                                                                          | Principais decisões                                                                                                                          | Principais riscos                                                                                                                                                                                       | Possíveis conflitos                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](../../ARCHITECTURE.md), Documento Mestre                                                                                            | Visão do produto, estrutura, stack, módulos, padrões e ADR-0001 embutido | Documento fundacional v1.0; ADR-0001 marcado Accepted no cabeçalho, mas aprovação de stakeholders permanece pendente na memória e no índice | Visão de produto e restrições de stack; base para ADR-0002 a 0010                     | Modular Monolith, DDD, Clean Architecture, Next.js, PostgreSQL/Prisma, meta de crescimento e módulos                                         | Documento longo mistura visão, decisão, exemplos e históricos; metas de escala sem comprovação; conteúdo legado conserva propostas não normativas                                                       | Exemplos antigos divergem de ADRs posteriores em ownership, tenancy, acesso entre módulos, migrations, IDs e stack              |
| [ADR-0002-module-boundaries.md](ADRs/ADR-0002-module-boundaries.md)                                                                                   | Definir bounded contexts, ownership, dependências, contratos e eventos   | Proposed; aguarda revisão/aprovação                                                                                                         | ADR-0001; predecessora conceitual de 0003, 0004, 0005 e 0009                          | Ownership por módulo, `schoolId`, chamadas por contratos públicos, eventos para efeitos secundários, sem ciclos                              | Registro de eventos/enforcement ainda conceitual; deciders a confirmar                                                                                                                                  | Divergência de produtores/nomenclatura de eventos em 0009; ambiguidade residual de membership e analytics                       |
| [ADR-0003-database-strategy.md](ADRs/ADR-0003-database-strategy.md)                                                                                   | Definir estratégia de dados, tenancy lógica e ownership conceitual       | Proposed; não é schema aprovado                                                                                                             | ADR-0001 e 0002; predecessor de 0004 e dependência de 0009                            | PostgreSQL + Prisma; banco/schema compartilhado; `schoolId`; migrations forward-only; outbox/inbox, não event sourcing                       | Modelo, constraints, migrations, retenção, particionamento e operação não comprovados; `schema.prisma` atual é apenas fundação                                                                          | Ownership memberships exige coerência com 0002/0004; projeções e métricas cruzam Analytics/Rankings                             |
| [ADR-0004-authentication-authorization.md](ADRs/ADR-0004-authentication-authorization.md)                                                             | Definir identidade, sessões, RBAC/ABAC e controles de acesso             | Proposed; aprovação de Segurança/Produto pendente                                                                                           | ADR-0002 e 0003                                                                       | User global; memberships e papéis contextualizados; Auth.js Credentials/JWT com registro revogável; autorização server-side, deny-by-default | Controles descritos não equivalem a controles implantados; riscos de menores, MFA, recuperação, rate limit e ameaça sem evidência                                                                       | Ownership de memberships e eventos de usuário; requisitos LGPD e detalhes da sessão ainda sem ratificação                       |
| [ADR-0005-frontend-architecture-state-management-bff.md](ADRs/ADR-0005-frontend-architecture-state-management-bff.md), controle correlato             | Consolidar frontend, estado, cache e BFF                                 | Proposed; índice o identifica como proposta canônica de frontend/estado/BFF                                                                 | ADR-0002, 0003 e 0004                                                                 | RSC por padrão; Actions como adaptadores; Zustand apenas UI efêmera; TanStack Query opt-in; domínio e autorização server-owned               | Cache/hydration/isolamento não validados num fluxo real; status proposto                                                                                                                                | 0006–0008 superseded no índice; 0010 deve ficar restrito à composição e design system                                           |
| [ADR-0006 - Frontend Architecture and UI State Management.md](ADRs/ADR-0006%20-%20Frontend%20Architecture%20and%20UI%20State%20Management.md)         | Proposta histórica de frontend e estado                                  | Superseded, conforme cabeçalho e índice                                                                                                     | ADR-0001 a 0004 como contexto histórico; substituído por 0005 e escopo visual de 0010 | Server-first; proposta antiga de TanStack Query, Zustand e design system                                                                     | Pode ser lido por engano como norma por permanecer no diretório                                                                                                                                         | Estado remoto e design system sobrepõem ADR-0005/0010                                                                           |
| [ADR-0007 - Frontend State Management Strategy.md](ADRs/ADR-0007%20-%20Frontend%20State%20Management%20Strategy.md)                                   | Proposta histórica de gestão de estado                                   | Superseded, conforme cabeçalho e índice                                                                                                     | ADR-0002 a 0004 como contexto histórico; substituído por 0005                         | RSC, Query, Zustand e URL; texto antigo chama Query Cache de armazenamento de domínio                                                        | Formulação histórica favorece cache cliente como estado operacional e não deve orientar trabalho atual                                                                                                  | Conflita com política server-owned do ADR-0005; conflito documental está encerrado pelo status Superseded                       |
| [ADR-0008 - Frontend Architecture, UI State and BFF Strategy.md](ADRs/ADR-0008%20-%20Frontend%20Architecture,%20UI%20State%20and%20BFF%20Strategy.md) | Proposta histórica de frontend/BFF                                       | Superseded, conforme cabeçalho e índice                                                                                                     | ADR-0002 a 0004 como contexto histórico; substituído por 0005                         | Actions/BFF, RSC e cache cliente em proposta anterior                                                                                        | Markdown e nome de arquivo dificultam descoberta; risco de leitura como guidance                                                                                                                        | Sobreposição com 0005 e fronteira de orquestração de 0002                                                                       |
| [ADR-0010 - Frontend Architecture and UI Composition Strategy.md](ADRs/ADR-0010%20-%20Frontend%20Architecture%20and%20UI%20Composition%20Strategy.md) | Composição de UI, features, componentes, acessibilidade e design system  | Proposed; `INDEX.md` limita seu escopo à composição visual                                                                                  | ADR-0005 e requisitos de produto/UI                                                   | Feature-based frontend, RSC-first, UI compartilhada, metas de acessibilidade/performance                                                     | Texto ainda contém temas de estado/auth e referências futuras/inconsistentes                                                                                                                            | Corpo menciona estado de autenticação em Zustand e `packages/ui` enquanto outros documentos usam outra fronteira/package        |
| [ADR-DIAGNOSTIC-REPORT.md](ADRs/ADR-DIAGNOSTIC-REPORT.md)                                                                                             | Diagnosticar coerência e prioridades de correção                         | Relatório datado de 2026-09-29; não é ADR nem decisão normativa                                                                             | Documento Mestre, ADRs, índice e memórias                                             | Registra baseline de `schoolId`, 0005 canônico e status Superseded                                                                           | Afirma que não há aplicação/schema/testes executáveis, afirmação que não corresponde integralmente ao workspace observado em 2026-10-01; contém também achados conflitantes com suas próprias correções | Classifica frontend superseded como conflito ativo em trecho e descreve arquitetura documental com escopo/runtime desatualizado |
| [INDEX.md](ADRs/INDEX.md) e [ADR-TEMPLATE.md](ADRs/ADR-TEMPLATE.md)                                                                                   | Indexar decisões e padronizar conteúdo de ADR                            | Índice existente; template requerido para novos ADRs                                                                                        | Conjunto de decisões e governança do projeto                                          | Registra status, dependências, canonicalidade e histórico Superseded                                                                         | Aprovação e lifecycle não possuem critérios suficientemente fechados; ADR-0001 não é artefato independente                                                                                              | Documentos de memória e Documento Mestre mantêm snapshots mais antigos; falta regra clara de precedência/reconciliação          |

### Estado material verificado

- **Fato observado:** existe `apps/web` com uma página de fundação e testes Vitest/Playwright; isso comprova bootstrap, não produto implementado.
- **Fato observado:** existe `packages/database/prisma/schema.prisma`, contendo generator/datasource PostgreSQL e sem modelos de domínio. Não há schema de domínio pronto.
- **Fato observado:** `packages/modules/auth` contém README; a listagem de módulos não mostra módulos de domínio implementados. O monorepo inclui infraestrutura e comandos de teste/arquitetura.
- **Fato observado:** o `package.json` usa npm workspaces e Turbo; versões e scripts observados não correspondem integralmente às referências legadas de pnpm/Jest na documentação.
- **Conclusão:** o relatório diagnóstico está correto ao dizer que decisões de domínio, segurança e escala não têm validação executável suficiente; está impreciso ao afirmar inexistência de aplicação, schema Prisma ou testes sem qualificar “fundação sem domínio”.

## 2. Mapa de dependências

### 2.1 Matriz de dependência

| Decisão                         | Classificação               | Depende de                                                     | Dependentes / derivadas                            | Estado documental                                   |
| ------------------------------- | --------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| ADR-0001 — arquitetura base     | Fundacional                 | Objetivos do produto e restrições de stack                     | 0002, 0003, 0004 e decisões subsequentes           | Embutido; Accepted no cabeçalho, aprovação pendente |
| ADR-0002 — fronteiras           | Fundacional de domínio      | 0001                                                           | 0003, 0004, 0005 e 0009                            | Proposed                                            |
| ADR-0003 — dados                | Fundacional de persistência | 0001, 0002                                                     | 0004, 0005 e 0009                                  | Proposed                                            |
| ADR-0004 — identidade e acesso  | Fundacional de segurança    | 0002, 0003                                                     | 0005 e 0009                                        | Proposed                                            |
| ADR-0005 — frontend/estado/BFF  | Derivada                    | 0002, 0003, 0004                                               | ADR-0010 para composição                           | Proposed; proposta canônica                         |
| ADR-0006 — frontend/estado      | Histórica                   | 0001–0004, no contexto original                                | Substituída por 0005 e composição residual de 0010 | Superseded                                          |
| ADR-0007 — estado               | Histórica                   | 0002–0004, no contexto original                                | Substituída por 0005                               | Superseded                                          |
| ADR-0008 — frontend/BFF         | Histórica                   | 0002–0004, no contexto original                                | Substituída por 0005                               | Superseded                                          |
| ADR-0009 — analytics/telemetria | Derivada transversal        | 0002, 0003, 0004 e catálogo de eventos comum ainda não fechado | Domínios produtores e consumidores de analytics    | Proposed                                            |
| ADR-0010 — composição UI        | Derivada                    | 0005 e requisitos de UI/produto                                | `apps/web`, UI compartilhada e features            | Proposed; escopo normativo limitado no índice       |

### 2.2 Diagrama textual

```text
Visão de produto + restrições de stack
                 |
                 v
       ADR-0001 (fundação)
                 |
                 v
       ADR-0002 (ownership/fronteiras)
                 |
                 v
       ADR-0003 (dados/tenancy) -----> ADR-0004 (identidade/acesso)
                 |                              |
                 +---------------+--------------+
                                 v
                  ADR-0005 (frontend/estado/BFF)
                       |                    |
                       v                    v
         ADR-0010 (composição UI)   ADR-0009 (analytics)

ADR-0006, ADR-0007 e ADR-0008: histórico Superseded -> não normativos
ADR-0005 state-only antigo: histórico Superseded -> ADR-0005 canônico
ARCHITECTURE.md: contém visão e ADR-0001, além de snapshots/exemplos legados
INDEX.md: registro atual de status e dependências, ainda sujeito a governança
```

### 2.3 Pontos de acoplamento

1. **Identidade/escola/turma:** User global, `SchoolMembership` de acesso e enrollment/atribuição docente de Classes precisam permanecer conceitos distintos; Auth, Schools e Classes participam do mesmo fluxo sem compartilhar ownership.
2. **`schoolId`:** campo de escopo transversal em contratos, dados, cache, eventos, relatórios e autorização. Sua presença não é prova de autorização; contexto global também precisa ser explícito.
3. **Eventos:** ADR-0002 define produtores e fatos; ADR-0003 define persistência/outbox; ADR-0009 consome eventos para projeções e telemetria. Sem registry comum, os três acoplam nomes, payloads, retenção e semântica de entrega.
4. **Rankings e Analytics:** Ranking é projeção de domínio competitivo; Analytics agrega métricas e relatórios. `RankingMetrics`/`RankingEntry` e `question_metrics`/`question_statistics` tornam a fronteira sensível.
5. **BFF e módulos:** Server Components/Actions são adaptadores de entrada; coordenação de casos de uso entre contextos deve ter owner definido e não contornar fachadas/repositórios.
6. **Frontend compartilhado:** `packages/ui`, `shared-ui`, `components/ui` e `features` aparecem em diferentes documentos sem um único mapa canônico aprovado.
7. **Privacidade:** dados de menores atravessam Auth, produto, eventos, Analytics, telemetria, IA futura, backups e fornecedores, exigindo política coerente de finalidade, minimização e retenção.

## 3. Identificação de conflitos

Criticidade descreve risco arquitetural/documental. **Crítico** indica bloqueio para dados reais/produção ou risco severo; não afirma incidente em runtime.

| Categoria / conflito                                               | Origem                                                                                                                                                                | Impacto                                                                                                                                | Criticidade | Recomendação                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Autoridade do ADR-0001 ambígua                                     | `ARCHITECTURE.md` o marca Accepted; `INDEX.md` e `memory/project-state.md` registram stakeholder approval pendente                                                    | A fundação não possui aprovação demonstrável; decisões derivadas podem ser tratadas como normativa sem autoridade                      | ALTO        | Reconciliar status, decisores, aprovação e fonte canônica antes de usar a baseline como aprovada                                              |
| Exemplos legados contradizem os ADRs                               | Documento Mestre e `memory/architecture-memory.md` mantêm `User` com role/schoolId, CUID, soft delete amplo, migrations reversíveis e exemplos de import cross-module | Pode levar leitores a modelagem, ownership ou dependências incompatíveis com 0002–0004                                                 | ALTO        | Rotular os exemplos como históricos/não normativos ou reconciliar o conteúdo na revisão documental; conservar histórico rastreável            |
| Privacidade e segurança de menores sem aprovação/evidência         | ADR-0003/0004/0009 e relatório diagnóstico                                                                                                                            | Coleta/processamento de dados sem finalidade, base, consentimento, retenção, controle de acesso e resposta a incidentes acordados      | CRÍTICO     | Manter como gate explícito para dados reais; obter revisão competente e critérios de evidência antes de declarar prontidão                    |
| Ownership de membership e atribuições                              | 0002/0003/0004; `SchoolMembership` de Auth versus enrollment/teaching assignment de Classes                                                                           | Duplicação ou erro entre concessão de acesso escolar e vínculo pedagógico; possível fuga de escopo                                     | ALTO        | Aprovar owner, comandos, referências e semânticas de ciclo de vida por tipo de vínculo; manter acesso e enrollment separados                  |
| Catálogo e semântica de eventos não unificados                     | ADR-0002, 0003 e 0009                                                                                                                                                 | Produtores diferentes para fatos semelhantes, consumers inconsistentes, duplicação, replay/retention e tratamento de PII indefinidos   | ALTO        | Consolidar nomes, produtor único, versão, payload mínimo, consumidores, política de compatibilidade, entrega e retenção em registro governado |
| Analytics versus Rankings e métricas de conteúdo                   | ADR-0003 e 0009; referências a `RankingMetrics`, `RankingEntry`, `question_metrics` e `question_statistics`                                                           | Projeção analítica pode parecer autoridade de ranking ou duplicar dados/métricas sob owners distintos                                  | ALTO        | Declarar owner do fato, owner da projeção e finalidade; separar telemetria operacional, analytics educacional e ranking                       |
| Frontend ainda proposto, apesar de conflitos históricos encerrados | 0005/0006–0008/0010 e `INDEX.md`                                                                                                                                      | A decisão atual está documentalmente encaminhada, mas não aprovada; leitores podem seguir texto histórico ou conteúdo residual do 0010 | MÉDIO       | Preservar status Superseded; formalizar aprovação de 0005 e restringir/reconciliar 0010 com o escopo do índice                                |
| Estado de autenticação em Zustand no texto de 0010                 | ADR-0010 versus 0004/0005                                                                                                                                             | Pode sugerir sessão/permissão no client ou estado global autoritativo, em desacordo com autorização server-side                        | ALTO        | Distinguir apresentação client de sessão/autorização e alinhar o corpo de 0010 ao escopo definido no índice e 0005                            |
| Ownership e pacote visual sem nome canônico                        | Documento Mestre, ADR-0005, ADR-0010, README/memórias: `packages/ui`, `shared-ui`, componentes locais                                                                 | Duplica fronteiras e dificulta atribuir shared primitives versus features                                                              | MÉDIO       | Fixar uma nomenclatura/localização documental antes de considerar a organização aprovada                                                      |
| Stack e status de bootstrap divergentes                            | Documentos citam PNPM/Jest e dependências planejadas; workspace usa npm, Vitest, Next 15.5, Prisma 6.7 e bootstrap mínimo                                             | Onboarding e estimativas de capacidade podem se apoiar em tooling que não existe ou em versões diferentes                              | MÉDIO       | Atualizar os documentos de contexto para diferenciar stack desejada, instalada e ainda pendente de decisão                                    |
| Alegações de escala sem workload ou evidência                      | Documento Mestre, memória e roadmaps mencionam 10k/50k/100k, concorrência, metas de latência e evolução                                                               | A meta pode ser confundida com capacidade certificada; sizing e arquitetura operacional não estão demonstrados                         | ALTO        | Tratar valores como metas; definir workload, SLOs e critério de evidência antes de afirmar capacidade                                         |
| Diagnóstico desatualizado e auto-inconsistente                     | ADR-DIAGNOSTIC-REPORT afirma ausência de app/schema/testes e também reconhece harmonização/índice; workspace contém bootstrap                                         | Prioridades e avaliação executiva podem dirigir trabalho com uma fotografia antiga ou classificação contraditória                      | MÉDIO       | Corrigir por nova revisão datada, explicitando evidência do workspace e separando fundação de domínio executável                              |
| Roadmap e memória com snapshots incompatíveis                      | `README.md`, `memory/decisions.md`, `memory/project-state.md`, `memory/next-steps.md`                                                                                 | Documentos ainda tratam ADRs 0002–0005, setup, Jest/pnpm e schema como pendentes em graus diferentes                                   | MÉDIO       | Definir uma fonte de estado atual e marcar conteúdo de exemplo/histórico nas demais memórias                                                  |

### Classificação por tema

- **Arquiteturais:** modular monolith é a escolha registrada; microservices aparecem como possibilidade/roadmap, mas algumas fontes afirmam escalabilidade sem evidência. Há ainda exemplos legados em contradição com ownership e Clean Architecture atuais.
- **Ownership:** principal tensão é membership de acesso versus enrollment/atribuição docente; secundariamente Analytics versus Rankings e estatísticas de questões.
- **Tenancy:** os ADRs ativos e o índice convergem para `schoolId`; a questão atual é menos o nome do campo e mais a prova de isolamento, a cobertura de dados/projeções/cache/eventos e o escopo global. A divergência anterior com `tenantId` está registrada como histórica, não como conflito atual dos ADRs ativos.
- **Frontend:** ADR-0005 é a proposta canônica e 0006–0008 são Superseded. Resta aprovação; 0010 ainda contém texto sobre Zustand/auth, layout de pacote e referências que atravessam escopo.
- **Nomenclatura:** eventos com múltiplos nomes/produtores; arquivos ADR com convenções diferentes; módulos e UI packages com diferentes nomes; ferramenta/pacote de workspace variam entre documentos e estado observado.
- **Responsabilidade:** adapter/BFF versus caso de uso coordenador; Auth versus Users/Schools/Classes; Analytics/telemetria versus Rankings; decisões de domínio pedagógico e competitivo ainda não formalizadas em nível suficiente.

## 4. Lacunas de governança

| Item solicitado        | Situação encontrada                                                                                                                                                                    | Impacto                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-INDEX              | Não existe arquivo com esse nome; **existe `docs/architecture/ADRs/INDEX.md`**, que funciona como índice normativo atual                                                               | Não é uma ausência funcional total. O nome divergente pode quebrar expectativas, mas o problema principal é manter esse registro como única fonte e atualizar snapshots concorrentes |
| ADR-0001 formal        | Não existe arquivo ADR-0001 autônomo; a decisão está embutida na seção 6 de `ARCHITECTURE.md`, apesar de a árvore documentada listar um arquivo inexistente                            | Dificulta revisão isolada, versionamento, sign-off e links; status Accepted versus aprovação pendente fica ambíguo                                                                   |
| Glossário              | Não foi localizado arquivo `glossary.md` no workspace; o Documento Mestre o lista como estrutura planejada                                                                             | Termos como tenant, schoolId, membership, enrollment, tentativa, evento, projeção e mastery podem divergir entre Produto, Domínio e Engenharia                                       |
| Lifecycle de ADR       | Parcial: template define status Proposed/Accepted/Deprecated/Superseded; índice lista histórico e dependências                                                                         | Não define fluxo completo de criação, revisão, decisão, publicação, manutenção, owner, revisão periódica nem precedência de fontes                                                   |
| Critérios de aprovação | Parcial: há deciders/checklists no template e critério stakeholder 80% em `memory/next-steps.md`, mas não há critério uniforme de quorum, autoridade, evidência ou registro de decisão | Aprovação não é reprodutível; “Accepted” pode não significar aceite verificável, como ocorre com ADR-0001                                                                            |
| Regras de supersession | Parcial: o índice e alguns cabeçalhos marcam ADRs superseded e apontam substitutos                                                                                                     | Falta regra geral para indicar escopo substituído, manter links, tratar números/versões, encerrar impactos e atualizar memórias/documento mestre                                     |

## 5. Avaliação de maturidade

Escala de 0 a 100. As notas são avaliação desta auditoria sobre **maturidade documental e força da evidência observável**, não uma certificação do produto. Não são comparáveis diretamente à média 65/100 do diagnóstico, calculada como scorecard de conteúdo dos ADRs.

| Dimensão       | Nota | Justificativa                                                                                                                                                                                          |
| -------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produto        |   38 | Visão, público OBMEP e catálogo amplo de jornadas estão documentados; outcomes de aprendizagem, prioridades, critérios de sucesso e validação com usuários não estão demonstrados neste conjunto       |
| Arquitetura    |   62 | Há arquitetura alvo detalhada, boundaries e contratos conceituais; ADR-0001 carece de artefato/sign-off inequívoco e decisões subsequentes seguem Proposed, com exemplos legados concorrentes          |
| Dados          |   56 | Estratégia PostgreSQL/Prisma, ownership lógico, tenancy e projeções são extensos; não há modelos de domínio no schema atual, constraints, migrações nem evidência de integridade cross-school          |
| Segurança      |   34 | ADR-0004 tem controles conceituais fortes; autenticação/autorização, threat model, MFA, privacidade de menores, retenção e evidência operacional permanecem pendentes                                  |
| Frontend       |   64 | ADR-0005 apresenta limites RSC/BFF/estado coerentes e o índice encerra duplicações históricas; proposta ainda não aprovada e sem jornada real que prove cache/SSR/isolamento                           |
| Governança     |   49 | Há `INDEX.md`, template, status e links de supersession parciais; ADR-0001 autônomo, critérios de aprovação, lifecycle, glosário e consistência das memórias faltam                                    |
| Escalabilidade |   23 | Há metas e fases de crescimento documentadas, mas workload, SLO acordado, teste de carga, hotspot multi-tenant, capacidade e operação não estão evidenciados                                           |
| Analytics      |   41 | Projeções derivadas e distinção de fonte de verdade são reconhecidas; contratos/event registry, dicionário de métricas, privacidade/retention e separação operacional/pedagógica carecem de fechamento |

## 6. Resumo executivo para CTO

### Forças

- A direção arquitetural é reconhecível: monólito modular, DDD/Clean Architecture, ownership por contexto e fronteiras públicas.
- ADR-0002–0005 cobrem limites de domínio, dados, acesso e frontend com nível de detalhe útil para revisão.
- Tenancy lógica por escola e identidade global com memberships contextualizadas estão convergindo nos ADRs ativos.
- O índice já identifica proposta canônica de frontend e histórico Superseded; não é necessário tratar toda duplicação histórica como decisão ativa.
- O workspace tem fundação técnica e verificações iniciais, ainda que sem domínio implementado.

### Fraquezas e maiores riscos

- O status de ADR-0001 não tem sign-off comprovado; os ADRs derivados também permanecem Proposed.
- Segurança e privacidade de menores estão especificadas em texto, mas não aprovadas nem comprovadas; este é o maior bloqueador para dados reais.
- Ownership de vínculo escolar, contratos de eventos e limite Analytics/Rankings requerem fechamento conjunto.
- Documento Mestre, memórias e diagnóstico mantêm snapshots antigos e afirmações contraditórias; a autoridade de cada fonte pode ser mal interpretada.
- Alvos de 100 mil alunos, latência e disponibilidade são objetivos documentais, não capacidade validada.

### Bloqueadores atuais

1. Aprovação formal e reconciliação do status de ADR-0001.
2. Revisão de segurança/privacidade/LGPD para menores antes de coleta ou uso de dados reais.
3. Fechamento de ownership e contratos entre Auth, Users, Schools e Classes.
4. Catálogo de eventos e separação formal de domínio, projeções, analytics educacional e telemetria.
5. Critérios de aceitação e evidência de isolamento, segurança, integridade de dados e escala antes de declarar prontidão.

### Recomendações prioritárias

1. Tratar `INDEX.md` como registro de status durante a revisão e reconciliar o ADR-0001 sem presumir que Accepted no cabeçalho equivale a aprovação.
2. Atribuir decisão/owner a cada conflito cross-context e manter explicitamente `schoolId`, membership de acesso e enrollment como conceitos distintos.
3. Resolver política de privacidade/menores, threat model, privilégios e retenção como gates documentais antes de qualquer uso de dados reais.
4. Atualizar Documento Mestre, README e memórias para refletir a diferença entre visão desejada, fundação existente e capacidades ainda não implementadas.
5. Separar meta de escala de resultado comprovado; não declarar suporte a 100 mil até workload, SLO e evidência serem acordados.

## 7. CONTEXTO MESTRE DO PROJETO

Este contexto é uma síntese para análises futuras. “Confirmado” significa documentado/observado, não aprovado por stakeholders, salvo indicação expressa.

### 7.1 Visão do produto

- **Fato documentado:** MateMágico Champions é descrito como SaaS educacional para treino de estudantes das Olimpíadas Brasileiras de Matemática: OBMEP Mirim e Níveis 1, 2 e 3.
- **Fato documentado:** o escopo de produto agrega banco de questões, prática adaptativa, simulados, campeonatos, gamificação, rankings, certificados, gestão escolar e analytics pedagógico.
- **Fato incerto:** não há, nas fontes desta auditoria, priorização de MVP validada, métricas de aprendizagem aprovadas ou evidência de pesquisa com usuários que ordene essas jornadas.

### 7.2 Objetivos estratégicos e diferenciais

- **Fato documentado:** simplicidade inicial, manutenibilidade, modularidade e crescimento sem reescrita são princípios declarados.
- **Fato documentado:** treino adaptativo, orientação pedagógica e conteúdo alinhado a OBMEP são diferenciais pretendidos; competição e gamificação são mecanismos de engajamento/reconhecimento.
- **Fato documentado:** IA educacional é capacidade futura opcional, substituível e não autoritativa para resultados acadêmicos.
- **Fato incerto:** as fontes não demonstram diferenciação competitiva validada contra produtos existentes, nem impacto quantitativo dos recursos pedagógicos.

### 7.3 Arquitetura escolhida

- **Direção documentada:** Modular Monolith com DDD e Clean Architecture, inicialmente uma aplicação/unidade de deploy, fronteiras de domínio e propriedade exclusiva dos dados por módulo.
- **Comunicação proposta:** chamadas síncronas por contratos públicos de aplicação; eventos para efeitos secundários/projeções, com outbox/inbox, entrega pelo menos uma vez e consumers idempotentes. O desenho não escolhe event sourcing.
- **Status:** arquitetura base está embutida em `ARCHITECTURE.md`; ADR-0001 é Accepted no cabeçalho, mas aprovação é pendente. ADR-0002–0010 ativos também não têm aprovação formal registrada.
- **Não assumir:** extração em microservices, event bus distribuído ou capacidade horizontal já existem; são opções/metas sujeitas a justificativa e validação.

### 7.4 Stack tecnológica

- **Documentada como direção:** Next.js 15 App Router, React 19, TypeScript, Tailwind, Shadcn/Radix, PostgreSQL, Prisma e Auth.js.
- **Observada no workspace:** npm workspaces, Turborepo, Next.js 15.5, React 19, Prisma 6.7, Vitest e Playwright; schema Prisma contém apenas datasource/generator.
- **Planejada/documentada:** Supabase Storage; Vercel para aplicação e Railway/Neon para PostgreSQL aparecem como destinos possíveis, não como topologia confirmada.
- **Inconsistências documentais:** PNPM e Jest ainda aparecem em memórias/README; ADR-0004 e ADRs relacionados são propostas, não confirmação de autenticação configurada.

### 7.5 Bounded Contexts

**Fato documentado em ADR-0002:** 16 contextos/modulos conceituais: Auth/Authorization, Users, Schools, Classes, Topics, Questions, Question Engine, Study Paths, Attempts, Mock Exams, Championships, Rankings, Badges, Certificates e Analytics. AI é capacidade futura opcional.

**Classificação documentada:** aprendizagem e avaliação como core; conteúdo, institucional e competição como supporting; Auth/Users como genéricos; Analytics transversal/read model; AI futura.

**Fato observado:** o workspace ainda não contém implementação desses 16 contextos. O caminho `packages/modules/auth` tem README; a fundação web e database não equivalem às features descritas.

### 7.6 Módulos existentes e planejados

- **Existente como fundação:** app Next.js com home de fundação e testes; pacotes/workspaces de database, events, logger, shared-types e testing aparecem na estrutura.
- **Parcial/estrutural:** `packages/modules/auth` está presente como diretório com README; não há evidência de fluxos de identidade/RBAC completos.
- **Planejados como bounded contexts:** todos os contextos do ADR-0002; `apps/api` e AI são futuro/opcional em documentos.
- **Fato observado:** schema Prisma sem modelos de domínio e sem migrations de domínio. Não se deve afirmar que schema ou módulos de produto estejam implementados.

### 7.7 Modelo de tenancy

- Multi-escola lógico em banco/schema compartilhado; banco ou schema por escola são explicitamente rejeitados no ADR-0003.
- `schoolId` é identificador canônico de escopo escolar nos ADRs ativos; `tenant` é conceito, não alias de campo.
- `User` é identidade global; membership é acesso User-escola; enrollment/teaching assignment é vínculo de turma e pertence a Classes.
- Catálogos globais precisam ser explicitamente globais; dados escolares carregam escopo escolar quando aplicável.
- **Pendente:** constraints, joins seguros, verificação negativa cross-school, cache, eventos e relatórios não foram demonstrados em runtime.

### 7.8 Modelo de autenticação

- **Proposta ADR-0004:** Auth.js Credentials para email/senha V1, JWT session com registry server-side de revogação; User global, credenciais/sessões/memberships/grants em Auth/Authorization; perfil em Users.
- Papéis são contextualizados por escopo e autorização é reavaliada no servidor; JWT/client não são autoridade de roles, permissions ou `schoolId`.
- MFA privilegiada, rate limiting, reset/verificação de email, proteção de sessão, auditoria e controles de menores são requisitos propostos e gates pendentes.
- **Fato observado:** não há evidência de fluxo completo de autenticação/RBAC implementado; a documentação não prova conformidade OWASP ou LGPD.

### 7.9 Estratégia de frontend

- **Proposta canônica ADR-0005:** feature-based no Next App Router; Server Components por padrão; Server Actions como adaptadores BFF; casos de uso e domínio ficam nos módulos; UI não acessa Prisma/repositórios internos.
- React state/forms para UI transitória; Zustand opcional apenas para UI efêmera; TanStack Query opt-in; server/module owner permanece fonte de verdade. URL abriga estado navegável.
- ADR-0006, 0007 e 0008 são históricos Superseded. ADR-0010 permanece proposta de composição/UI, não decisão de estado/autenticação.
- **Pendente:** aprovação, localização/nome do pacote UI e validação de RSC/cache/hydration/isolamento numa jornada real.

### 7.10 Estratégia de dados

- PostgreSQL como armazenamento transacional; Prisma como adaptador; ownership de dados pertence aos módulos mesmo com banco físico compartilhado.
- Modelo conceitual relacional, versionamento de questões/conteúdo, projecções de Analytics/Rankings e outbox/inbox. Analytics e cache não são fonte de verdade transacional.
- Migrations propostas são incrementais/expand-contract e forward-only; crescimento deve começar por medição.
- **Pendente:** modelo físico, constraints, migrations, retenção, backups/restore, compatibilidade Prisma e testes de carga.

### 7.11 Estratégia de eventos

- Fatos em passado, envelope versionado, `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `correlationId`/`causationId` e `schoolId` quando escolar são convenções propostas em 0002.
- Outbox/inbox, idempotência e consumidores assíncronos sustentam projeções; payload não deve carregar segredos nem PII desnecessária.
- **Pendente:** catálogo unificado, nomes/produtores autoritativos, compatibilidade, retry/DLQ/replay, retenção, SLO e política de privacidade.

### 7.12 Roadmap identificado

- **Fato documentado:** bootstrap técnico concluído em 2026-09-29; aprovação de arquitetura segue pendente; schema de domínio e trabalho de identidade estavam planejados para depois de aprovação.
- **Fato observado:** app e ferramentas básicas existem, domínio não foi implementado; a memória registra bloqueio local de banco por Docker/credenciais.
- **Planos documentados, não compromissos confirmados:** fases 10k/50k/100k; cache/assíncrono/read models conforme medição; analytics, recursos adaptativos e AI futura.
- **Conflito:** README e memórias têm timelines/status de etapas anteriores, incluindo setup, ADRs, schema e tooling, que não refletem de modo consistente a fundação observada.

### 7.13 Principais riscos

1. Privacidade, segurança e governança de dados de menores sem aprovação/evidência.
2. Sign-off ambíguo da arquitetura fundacional e decisões derivadas ainda Proposed.
3. Confusão de ownership entre identidade, membership escolar, turma, Rankings e Analytics.
4. Catálogo de eventos, métricas, retenção e telemetria ainda sem contrato único.
5. Metas de escala confundidas com capacidade testada.
6. Fonte normativa diluída entre Documento Mestre, ADRs, índice, README, memórias e relatório diagnóstico.

### 7.14 Decisões já registradas e pendentes

**Registradas documentalmente (não presumir aprovadas):** Modular Monolith; DDD/Clean Architecture; PostgreSQL/Prisma; tenancy lógica por `schoolId`; User global/membership; ownership por módulo; outbox/inbox sem event sourcing; proposta RSC-first/BFF; analytics como projeção; AI opcional.

**Pendentes:** aprovação inequívoca do ADR-0001 e demais propostas; privacidade/LGPD para menores; owner/semântica de memberships e eventos; políticas de telemetria, retenção, backup/DR e SLO; critérios de escala; métricas de produto/pedagogia; fechamento de UI package e harmonização de fontes.

## 8. MEMÓRIA PARA PROMPT 02

Este bloco foi escrito para servir como entrada independente ao próximo prompt. Não trata recomendações como decisões tomadas.

### Fatos consolidados

- O projeto é descrito como plataforma SaaS de treino para OBMEP Mirim e Níveis 1–3, com questões, treino adaptativo, simulados, campeonatos, gamificação, rankings, gestão escolar e analytics pedagógico.
- A direção arquitetural é Modular Monolith + DDD + Clean Architecture; a aprovação formal do ADR-0001 permanece pendente apesar do cabeçalho “Accepted”.
- `docs/architecture/ADRs/INDEX.md` existe e registra ADRs ativos/históricos; ADR-0006–0008 e ADR-0005 state-only estão marcados Superseded. ADR-0005 frontend/BFF é a proposta canônica; ADR-0010 é limitado no índice à composição visual.
- ADRs ativos usam `schoolId` para tenancy lógica; User é global, membership de acesso não é enrollment de turma.
- PostgreSQL/Prisma, Auth.js, ownership de módulos, eventos/outbox e projeções de analytics estão documentados como estratégia/conceitos; não equivalem a implementação validada.
- O workspace tem bootstrap Next.js/React, teste de página e e2e, npm workspaces/Turbo, Vitest/Playwright, schema Prisma sem modelos e módulos de domínio ainda não implementados.
- O diagnóstico de 2026-09-29 tem trechos desatualizados sobre ausência de aplicação/schema/testes e classifica de forma inconsistente alguns conflitos frontend já marcados Superseded.
- Não foi localizado glossário nem ADR-0001 autônomo; o nome `ADR-INDEX.md` não existe, mas `INDEX.md` atende à função de índice.

### Fatos ainda incertos

- Se stakeholders aprovaram formalmente a arquitetura fora do que está registrado no workspace.
- Se os 16 bounded contexts e os diferenciais pedagógicos refletem escopo de MVP aprovado ou visão aspiracional.
- Quais metas de resultado de aprendizagem, produto, confiabilidade e carga serão aceitas.
- Como serão aprovados base legal/consentimento, retenção, acesso e direitos de dados de menores.
- Quais são topologia, provedores, SLOs, RPO/RTO, envelope/retenção de eventos e política operacional definitiva.
- Se a stack legada mencionada em memórias (PNPM/Jest/PostHog etc.) continua desejada ou é apenas snapshot antigo.

### Conflitos que precisam ser resolvidos

- Status/sign-off de ADR-0001; status normativo e precedência entre `ARCHITECTURE.md`, `INDEX.md`, ADRs e memórias.
- Ownership de `SchoolMembership`, enrollment, atribuições docentes e eventos correlatos.
- Canonicalização de eventos, métricas, produtores, consumidores, Analytics versus Rankings e telemetria técnica versus educacional.
- Texto do ADR-0010 sobre Zustand/auth e package UI frente a ADR-0005/0004 e ao escopo declarado no índice.
- Exemplos históricos do Documento Mestre/memória que divergem dos ADRs recentes.
- Diagnóstico documental e estado de produto descrito em README/memórias versus o bootstrap real.

### Documentos que devem ser criados ou atualizados

- **Criar:** ADR-0001 autônomo ou decisão explícita de mantê-lo embutido com governança equivalente; glossário de termos e owners.
- **Formalizar:** lifecycle/approval/supersession e precedência das fontes, seja no índice/template ou documento de governança.
- **Atualizar:** `INDEX.md` com status/aprovação/owners consistentes; `ARCHITECTURE.md`, README e `memory/*` para separar estado atual, visão e conteúdo histórico.
- **Revisar:** ADR-DIAGNOSTIC-REPORT para refletir evidência atual, escopo de bootstrap e estado real das supersessions.
- **Decidir antes de numerar novos ADRs:** governança de contratos de evento, privacidade/LGPD e menores, SLO/DR, arquitetura fitness e domínio pedagógico/competitivo. A necessidade e sequência devem ser ratificadas pelos responsáveis.

### Recomendações para criação/revisão do ADR-INDEX

- Reutilizar `docs/architecture/ADRs/INDEX.md` como ponto único durante a revisão; não criar segundo índice concorrente sem motivo explícito.
- Para cada número, registrar título canônico, caminho existente, status, owner/deciders, data, decisão substituída/substituta, dependências, dependentes, sign-off e próximo gatilho de revisão.
- Distinguir decisão Accepted, proposta, histórica Superseded e decisão retirada; nunca inferir aprovação pelo fato de haver texto detalhado.
- Tornar ADR-0001 localizável como documento dedicado ou registrar claramente seu endereço embutido e aprovação pendente.
- Manter ADR-0005 canônico e ADR-0006–0008/0005 antigo somente como histórico; declarar o escopo residual de 0010 e revisar seu corpo para que não reabra decisões de estado/auth.
- Corrigir caminhos/nomenclatura somente junto da atualização de links; não renumerar decisões históricas para resolver duplicação.
- Definir atualização obrigatória do índice e das referências quando uma decisão for aceita, superseded ou reaberta; marcar conteúdo de memória/Documento Mestre que seja snapshot não normativo.
- Registrar as decisões em aberto sem atribuir números novos até que sequência, owner e escopo sejam aprovados.

---

**Conclusão:** existe uma base documental arquitetural relevante e um bootstrap técnico, mas não uma baseline enterprise aprovada e validada. O próximo passo de governança é reconciliar a autoridade das fontes, aprovar decisões explicitamente e fechar segurança/privacidade e contratos transversais; este relatório não autoriza schema, API ou implementação de domínio.
