# ADR-0001 - Base Architecture

**Date**: 2026-10-01 (decisao originalmente registrada em 2026-09-29)  
**Status recomendado**: Proposed, ate que a aprovacao formal e o status do texto embutido sejam reconciliados  
**Deciders**: Architecture Team (conforme Documento Mestre; nomes individuais nao registrados)  
**Revisores**: Product Manager, Tech Lead, CTO/VP Engineering e equipe estao listados para stakeholder review em `memory/next-steps.md`; revisao concluida e sign-off nao estao comprovados  
**Dependencias**: Visao do produto e restricoes de stack  
**ADRs derivados**: ADR-0002, ADR-0003, ADR-0004; ADR-0005 deriva dos ADRs 0002-0004. ADR-0009 deriva de 0002-0004 e ADR-0010 depende de 0005 e dos requisitos de UI do produto, conforme `INDEX.md`.

> Este documento formaliza apenas a decisao arquitetural ja registrada no Documento Mestre. O status Proposed recomendado preserva a ressalva de aprovacao pendente no `INDEX.md`; nao significa que a decisao tenha sido rejeitada nem ratificada.

## 1. Contexto

O MateMágico Champions e descrito como uma plataforma SaaS educacional para treino de estudantes das Olimpiadas Brasileiras de Matematica (OBMEP), incluindo OBMEP Mirim e Niveis 1, 2 e 3. O produto pretende atender alunos, professores, escolas e outros papeis institucionais, combinando dominios como questoes, simulados, competicoes e rankings.

O Documento Mestre registra uma equipe inicial pequena, multiplos dominios e escolas, necessidade de deploy rapido e evolucao do produto. A arquitetura precisa organizar esses dominios sem assumir microservices desde o inicio. A meta de crescimento de 10 mil a 100 mil alunos e uma meta documental: o proprio ADR-0001 ressalva que concorrencia e capacidade precisam ser validadas por testes representativos. O requisito de latencia de menos de 200 ms para 90% das consultas tambem aparece como objetivo, nao como resultado medido.

### Restricoes documentadas

- Stack indicada como definida nas fontes fundacionais: Next.js, TypeScript, PostgreSQL, Prisma e Auth.js.
- Equipe inicial estimada no Documento Mestre em aproximadamente 3 a 5 desenvolvedores.
- Necessidade de deploy rapido, com Vercel citada como alvo.
- Existencia de varios dominios de produto e necessidade de suportar multiplas escolas e professores.
- Integracao futura com IA educacional, sem fazer desta capacidade uma premissa de implementacao atual.
- Metas de escala e desempenho nao sao evidencia de capacidade operacional.

## 2. Decisao

**DECLARACAO DA DECISAO**: A arquitetura base registrada para o MateMágico Champions e um **Modular Monolith**, organizado com **Domain-Driven Design (DDD)** e **Clean Architecture**.

A aplicacao inicial e descrita como uma aplicacao Next.js com modulos de limites claros e dependencias entre modulos minimizadas. O Documento Mestre indica contratos como meio de preservar esses limites.

### Stack registrada

- **Frontend/aplicacao:** Next.js e TypeScript.
- **Persistencia:** PostgreSQL.
- **ORM:** Prisma.
- **Autenticacao:** Auth.js.

Esta lista registra as tecnologias ja indicadas pelas fontes fundacionais. Nao fixa versoes, fornecedores de hospedagem/armazenamento nem detalhes de configuracao que nao pertencam a esta decisao.

### Estrategias fundacionais e limites de escopo

- **Contratos:** a arquitetura modular usa fronteiras/contratos entre modulos; contratos publicos, dependencias permitidas e proibidas sao detalhados no ADR-0002.
- **Ownership:** ownership exclusivo por bounded context e estabelecido nos ADRs derivados, especialmente ADR-0002 e ADR-0003; esta decisao base nao duplica o data map.
- **Eventos:** a comunicacao por eventos e detalhada no ADR-0002 e a persistencia/outbox-inbox no ADR-0003. Este ADR nao define catalogo, envelope, entrega ou operacao de eventos.
- **Multi-escola:** atender multiplas escolas e uma restricao do produto. A estrategia logica por escola e o identificador `schoolId` sao detalhados no ADR-0003; esta decisao base nao define o modelo de tenancy.

Os pontos acima registram como as decisoes posteriores se apoiam na fundacao, sem transferir seus detalhes para este ADR.

## 3. Alternativas consideradas

As alternativas e justificativas abaixo sao as registradas na secao ADR-0001 do Documento Mestre. Nenhuma justificativa adicional foi introduzida.

| Alternativa                        | Motivo de rejeicao registrado                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monolito tradicional sem modulos   | O Documento Mestre aponta ausencia de separacao de responsabilidades, acoplamento crescente e dificuldade de extensao/extracao futura.            |
| Microservices desde o primeiro dia | Complexidade prematura, overhead de orquestracao/DevOps e inadequacao ao MVP/equipe inicial; problemas de distribuicao tambem sao citados.        |
| Serverless Functions               | Vendor lock-in, cold starts, dificuldade com tarefas de longa duracao e monitoramento complexo.                                                   |
| GraphQL Monolith                   | Curva de aprendizagem, excesso para relatorios/analytics, desempenho de cadeias de resolvers e permanencia dos problemas de monolito sao citados. |

## 4. Consequencias

### Positivas registradas

1. Crescimento planejado de 10 mil a 100 mil alunos sem reescrita arquitetural completa; e uma meta, nao capacidade validada.
2. Simplicidade inicial e onboarding mais facil.
3. Possibilidade de evolucao gradual para microservices se houver justificativa futura.
4. Compartilhamento de componentes, tipos e utilitarios.
5. Um pipeline de build/deploy para a aplicacao inicial.
6. Menor overhead inicial de orquestracao e infraestrutura.

### Negativas registradas

1. Disciplina de fronteiras necessaria para impedir que os modulos se acoplem.
2. Risco de estado compartilhado criar acoplamento acidental.
3. Alteracoes em modulos compartilham a granularidade de deploy da aplicacao.
4. Uma migration defeituosa pode afetar o sistema compartilhado.

### Trade-offs registrados

| Trade-off                                                  | Razao registrada                                                    | Consequencia a acompanhar                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Monolito modular em vez de microservices desde o inicio    | Simplicidade para o estagio inicial, mantendo separacao por modulos | Disciplina de fronteiras e eventual granularidade de deploy       |
| Deploy unico                                               | Pipeline e operacao iniciais mais simples                           | Uma mudanca de modulo nao tem deploy independente                 |
| Persistencia compartilhada                                 | Base inicial comum para a aplicacao                                 | Risco/impacto transversal de migrations, detalhado no ADR-0003    |
| Crescimento planejado sem adocao imediata de microservices | Evitar complexidade prematura                                       | Capacidade e necessidade de extracao dependem de evidencia futura |

## 5. Riscos conhecidos

Os riscos abaixo sao transcritos do ADR-0001 embutido no Documento Mestre. Severidade, probabilidade e mitigacoes sao as ali registradas; este ADR nao acrescenta novos riscos.

| ID  | Risco                                                                   | Severidade | Probabilidade | Mitigacao registrada                                            |
| --- | ----------------------------------------------------------------------- | ---------- | ------------- | --------------------------------------------------------------- |
| R1  | Complexidade eventual do monolito por perda de disciplina entre modulos | Alta       | Media         | Code reviews, dependency analyzer e ADRs de fronteira           |
| R2  | Gargalo ou indisponibilidade por erro de migration compartilhada        | Alta       | Baixa         | Testes de migration, staging, backups e migrations compativeis  |
| R3  | Degradacao de performance/cold start conforme o monolito cresce         | Media      | Media         | Code splitting, lazy loading e edge functions                   |
| R4  | Aumento de custo/tempo dos testes integrados com mais modulos           | Media      | Media         | Unit tests isolados, fixtures reutilizaveis e execucao paralela |

## 6. Relacao com ADRs derivados

Os relacionamentos e dependencias abaixo seguem o `INDEX.md` e os cabeçalhos dos ADRs. As decisoes derivadas mantem seus proprios detalhes e status.

| ADR                                                        | Relacao com ADR-0001                                                                                                                                   | Estado atual no indice                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| ADR-0002 — Module Boundaries and Domain Communication      | Detalha a organizacao modular e as fronteiras/contratos pressupostos pela arquitetura base; estabelece ownership e comunicacao entre bounded contexts. | Proposed                                           |
| ADR-0003 — Database Strategy and Domain Data Model         | Deriva da arquitetura base e do ADR-0002 para especificar PostgreSQL/Prisma, ownership conceitual e tenancy multi-escola.                              | Proposed                                           |
| ADR-0004 — Authentication and Authorization                | Deriva dos limites de dominio e da estrategia de dados dos ADRs 0002/0003 para especificar identidade e autorizacao.                                   | Proposed                                           |
| ADR-0005 — Frontend Architecture, State Management and BFF | Deriva de 0002/0003/0004 para definir como o frontend respeita limites de dominio, dados e autenticacao.                                               | Proposed; proposta canonica de frontend/estado/BFF |
| ADR-0009 — Analytics, Telemetry and Educational Insights   | Decisao transversal derivada de 0002/0003/0004, para projecoes, metricas e telemetria.                                                                 | Proposed                                           |
| ADR-0010 — Frontend Architecture and UI Composition        | Decisao derivada de 0005 e requisitos de UI do produto, limitada a composicao/design system pelo indice.                                               | Proposed                                           |

O arquivo state-only anterior chamado ADR-0005 e Superseded; nao e o ADR-0005 canonico descrito acima.

## 7. Status e governanca

### Evidencias encontradas

- O Documento Mestre, secao 6, declara **Status: Accepted** e **Deciders: Architecture Team**.
- O `INDEX.md` aponta para o ADR-0001 embutido, mas explicita que stakeholder approval esta pendente e precisa ser reconciliada.
- `memory/project-state.md` tambem registra stakeholder approval pendente; os proximos passos documentam uma revisao/sign-off ainda por realizar.
- Nao foram encontradas checklists preenchidas ou nomes individuais de aprovadores para comprovar o aceite.
- ADR-0002, ADR-0003 e ADR-0004, que derivam desta fundacao, permanecem Proposed.

### Status recomendado

**Proposed**, ate que os responsaveis confirmem e registrem formalmente se a declaracao Accepted do texto embutido foi aprovada. Esta recomendacao e de governanca baseada na ausencia de evidência de sign-off; nao altera retroativamente o status escrito no Documento Mestre.

Nao ha evidência suficiente nas fontes examinadas para declarar **Accepted** sem ressalva. A decisao de aceite pertence aos deciders/stakeholders, nao a este documento. Ate a reconciliacao, esta formalizacao deve ser tratada como proposta de registro e nao como aprovacao nova.

## 8. Revisao de consistencia

### Alinhamento com INDEX.md

- **Alinhamento:** titulo/numero e dependencia de produto/stack seguem a entrada ADR-0001 do indice; os ADRs derivados e suas dependencias foram preservados.
- **Divergencia aberta:** o indice ainda aponta `ARCHITECTURE.md`, secao 6, como documento canonico e declara Accepted no cabecalho com aprovacao pendente. Este arquivo novo nao esta registrado no indice.
- **Consequencia:** criar este arquivo nao o torna automaticamente fonte canonica nem atualiza o indice. A referencia canonica e o status precisam ser reconciliados pelos responsaveis.

### Alinhamento com ARCHITECTURE-GOVERNANCE-BASELINE-2026-10-01.md

- **Alinhamento:** o status recomendado Proposed reflete a conclusao de que nao ha baseline aprovada comprovavel; a arquitetura e stack foram limitadas ao que esta documentado.
- **Alinhamento:** contratos/eventos/ownership/multi-escola foram registrados sem duplicar os detalhes pertencentes aos ADRs derivados.
- **Divergencia deliberadamente preservada:** o baseline de governanca informa que ADR-0001 esta embutido e que a sua autonomia/rastreabilidade esta pendente. Este arquivo atende a solicitacao de formalizacao, mas ainda depende de reconciliacao no indice.

### Alinhamento com ARCHITECTURE-AUDIT-2026-10-01.md

- **Alinhamento:** o status da fundacao e tratado como ambiguo e sem sign-off comprovado; a meta de 100 mil alunos nao e apresentada como capacidade demonstrada.
- **Limite da fonte:** a auditoria e analise, nao aprovacao. Suas observacoes nao mudam o status registrado no `INDEX.md` nem no Documento Mestre.
- **Divergencia aberta:** a auditoria recomenda reconciliar o ADR-0001, enquanto o Documento Mestre ainda exibe Accepted. Este ADR registra a mesma divergencia e nao escolhe aceite em nome dos stakeholders.

### Alinhamento com ADR-0002, ADR-0003 e ADR-0004

- **Alinhamento:** esses documentos tratam Modular Monolith/DDD/Clean Architecture e a stack PostgreSQL/Prisma/Auth.js como fundacao existente; suas regras detalhadas seguem nesses ADRs.
- **Limite:** como os ADRs derivados estao Proposed, sua existencia nao serve como evidência de aprovacao formal da fundacao nem deste arquivo.

## 9. MEMÓRIA PARA PROMPT 04

### Fatos fundacionais confirmados

- O Documento Mestre registra uma arquitetura base para o MateMágico Champions e data o ADR-0001 original em 2026-09-29.
- O texto fundacional declara Modular Monolith com DDD e Clean Architecture.
- A stack documentada inclui Next.js, TypeScript, PostgreSQL, Prisma e Auth.js.
- O Documento Mestre registra fronteiras modulares apoiadas por contratos; ADR-0002 detalha contratos, eventos e ownership.
- Multiplas escolas sao requisito do produto; a tenancy logica e detalhada no ADR-0003.
- O alvo de 100 mil alunos e meta, nao capacidade comprovada.

### Decisoes fundacionais

- Modular Monolith como arquitetura inicial registrada.
- DDD e Clean Architecture como padroes da arquitetura.
- Next.js, TypeScript, PostgreSQL, Prisma e Auth.js como stack documentada.
- Fronteiras modulares e contratos como principio; detalhes de ownership, eventos e multi-escola permanecem nos ADRs 0002/0003/0004.

### Decisoes ainda pendentes

- Status final do ADR-0001: o cabeçalho embutido declara Accepted, enquanto indice e memoria indicam sign-off pendente.
- Se esta formalizacao em arquivo autonomo substituira o texto embutido como referencia canonica.
- Aprovacao dos ADRs derivados, todos Proposed no indice.

### Pontos que exigem aprovacao formal

- Confirmacao do aceite ou manutencao como Proposed da arquitetura base.
- Registro de deciders/revisores e evidência de sign-off.
- Atualizacao do `INDEX.md` para refletir o destino canonico e status decididos; nao foi feita nesta tarefa.

### Proximos artefatos recomendados

- Atualizar o `INDEX.md` somente apos a decisao formal de status/canonicalidade.
- Manter ADR-0002, ADR-0003 e ADR-0004 como fontes especializadas para limites de modulo, dados/tenancy e autenticacao.
- Nao duplicar neste ADR detalhes de contratos, eventos, ownership, tenancy ou autenticacao que pertencem aos ADRs derivados.

---

**Nota:** Este ADR formaliza a arquitetura ja documentada. Nao aprova a decisao, nao cria requisitos adicionais e nao autoriza implementacao, schema Prisma ou APIs.
