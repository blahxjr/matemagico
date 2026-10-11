# Baseline arquitetural V1

**Revisao**: 2026-10-09  
**Status**: Proposta consolidada; aguarda ratificacao dos deciders  
**Escopo**: Consolidacao dos ADRs-0001 a 0005, 0009 e 0010 para orientar a arquitetura V1

> Este documento e a sintese da baseline proposta, nao um novo ADR nem evidência de aprovacao. “Ativo” significa referencia corrente para a V1; nao transforma status `Proposed` em `Accepted`. A aprovacao de cada decisao continua pendente ate haver sign-off registrado.

## 1. Resultado da consolidacao

A V1 segue um **Modular Monolith** com DDD e Clean Architecture, organizado por bounded contexts com ownership exclusivo de dados. A aplicacao usa PostgreSQL e Prisma em banco/schema compartilhado, com isolamento logico por `schoolId`. Auth.js fornece autenticacao; autorizacao e avaliada no servidor. No frontend, Server Components sao o caminho padrao de leitura e Server Actions sao adaptadores BFF de mutacao, sempre delegando regras aos casos de uso do modulo owner.

Os limites de escopo abaixo resolvem a sobreposicao entre os documentos: ADR-0002 define fronteiras e comunicacao; ADR-0003 define persistencia e ownership conceitual; ADR-0004 define identidade e autorizacao; o ADR-0005 canonico e a unica fonte para estado frontend, leitura/mutacao, cache e BFF; ADR-0010 fica restrito a composicao visual e design system. ADR-0006, ADR-0007 e ADR-0008 permanecem apenas como historico superseded.

## 2. Inventario de decisoes correntes

| Area                     | Baseline V1                                                                                                                                                            | Fonte canonica                                                                              | Status registrado                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Arquitetura base         | Modular Monolith, DDD e Clean Architecture; evolucao para servicos somente com evidencia operacional                                                                   | [ADR-0001](ADR-0001-base-architecture.md)                                                   | Proposed; aceite formal pendente                        |
| Fronteiras e comunicacao | Ownership exclusivo por modulo; chamadas sincronas por contratos publicos de aplicacao; eventos para efeitos secundarios; sem ciclos nem acesso direto a dados alheios | [ADR-0002](ADR-0002-module-boundaries.md)                                                   | Proposed                                                |
| Persistencia e tenancy   | PostgreSQL + Prisma; banco/schema compartilhado; dados escolares tenant-owned usam `schoolId`; analytics e projecoes nao sao fonte transacional                        | [ADR-0003](ADR-0003-database-strategy.md)                                                   | Proposed                                                |
| Identidade e acesso      | User global; memberships e grants separados; Auth.js Credentials (email/senha) com sessao JWT e registro server-side revogavel; autorizacao contextual no servidor     | [ADR-0004](ADR-0004-authentication-authorization.md)                                        | Proposed                                                |
| Frontend, estado e BFF   | RSC por padrao para leitura; Server Actions como adapters; estado de dominio permanece server-owned; Zustand e TanStack Query apenas opt-in e limitados                | [ADR-0005 canonico](ADR-0005-frontend-architecture-state-management-bff.md)                 | Proposed; unica proposta corrente para esse escopo      |
| Analytics e telemetria   | Projecoes/read models e telemetria sujeitos a isolamento, minimizacao e governanca de dados                                                                            | [ADR-0009](ADR-0009%20-%20Analytics,%20Telemetry%20and%20Educational%20Insights%20Strategy) | Proposed; fora da consolidacao detalhada nesta baseline |
| Composicao visual        | Organizacao visual por features, design system, acessibilidade, responsividade e composicao de UI                                                                      | [ADR-0010](ADR-0010%20-%20Frontend%20Architecture%20and%20UI%20Composition%20Strategy.md)   | Proposed; escopo limitado a composicao                  |

`ARCHITECTURE.md` permanece como documento de contexto. A secao historica que reproduz ADR-0001 nao e uma decisao concorrente: a referencia atomica canonica e o arquivo ADR-0001 listado acima.

## 3. Decisoes harmonizadas

### 3.1 Modulos, dados e eventos

- Cada bounded context e a unica autoridade de escrita sobre os dados que possui. O banco fisico compartilhado nao autoriza acesso direto a repositories, tabelas ou implementacoes de outro modulo.
- Chamadas sincronas entre modulos usam contratos/fachadas publicas da camada Application. Notificacoes, analytics, rankings e outros efeitos secundarios usam eventos apos o commit.
- Consumidores de eventos toleram entrega pelo menos uma vez, duplicidade e ordenacao nao garantida; devem ser idempotentes. Outbox/inbox e o mecanismo de confiabilidade operacional, nao event sourcing integral.
- O banco transacional inicial e PostgreSQL com Prisma. Analytics comeca como projecoes/read models logicamente separados do OLTP; nao pode bloquear ou tornar-se fonte de verdade dos fluxos de escrita.
- `schoolId` e o identificador canonico do escopo escolar. Valores fornecidos pelo cliente nao provam autorizacao. Consultas, constraints, eventos e caches devem preservar o escopo conforme o ownership do recurso.
- `100 mil alunos` e meta a validar com carga representativa; nao e garantia de capacidade nem justificativa isolada para microservices.

### 3.2 Identidade e autorizacao

- `User` e identidade global; perfil pertence a Users. Credenciais, sessoes, memberships e atribuicoes de papel pertencem a Auth/Authorization; Schools possui a instituicao e Classes possui matriculas/atribuicoes de turma.
- V1 usa Auth.js Credentials para email e senha. A sessao JWT permanece protegida pelo framework; um registro server-side permite revogacao. O token nao e fonte autoritativa de role, permission ou `schoolId`.
- Cada operacao protegida autentica e autoriza no servidor com deny-by-default, permissao atomica, escopo vigente e propriedade/estado do recurso. Roles globais e escolares nao se herdam automaticamente.
- Controles de credencial, rate limit, sessao, MFA para papeis privilegiados, minimizacao de dados de menores e revisao legal permanecem pre-condicoes de producao conforme ADR-0004; esta baseline nao certifica sua implementacao.

### 3.3 Frontend e composicao

- Server Components e o padrao de renderizacao/leitura. Client Components ficam restritos a interacoes que precisam de estado/browser; DTOs enviados ao client sao minimos e serializaveis.
- Server Actions adaptam e validam input nao confiavel, autenticam/autorizam e delegam a um caso de uso. Nao sao camada de dominio nem podem coordenar repositories de varios modulos.
- Estado local e de formulario fica proximo da feature; navegacao/consulta compartilhavel fica na URL. Zustand serve, quando justificado, apenas para estado efemero de UI; TanStack Query e opt-in para sincronizacao client-side nao atendida por RSC/Actions. Ambos sao descartaveis e nunca fonte de verdade de dominio, sessao ou autorizacao.
- ADR-0010 complementa essa estrategia apenas em composicao visual, design system, acessibilidade, responsividade e apresentacao. Em comportamento de renderizacao, formularios, estado, cache, autenticacao ou comunicacao backend, ADR-0005 e a referencia unica.

## 4. Conflitos e duplicacoes resolvidos

| Tema                                    | Ambiguidade encontrada                                                                                                                                                | Resolucao para V1                                                                                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query                          | ADR-0006 favorecia cache remoto; ADR-0007 tratava Query Cache como estrategia geral de estado server; ADR-0008 repetia state/BFF; ADR-0010 abordava estado novamente. | ADR-0005 canonico e fonte unica: TanStack Query opt-in por feature, sem substituir RSC nem o owner server-side. 0006–0008 sao historicos superseded; a secao de estado de 0010 apenas aponta para ADR-0005. |
| Zustand e estado global                 | Propostas anteriores permitiam interpretacoes mais amplas de store compartilhada, incluindo estado de autenticacao.                                                   | Somente estado efemero de UI, limitado a feature; sem dados de dominio, credenciais, token, roles, permissions ou autoridade sobre tenant.                                                                  |
| Leitura e mutacao no BFF                | A formulacao generica “Page -> Server Action” poderia sugerir que leitura tambem atravessa Actions e que Actions contem orquestracao de dominio.                      | Leitura por Server Component via contrato de leitura do modulo owner; Action e adapter de mutacao. Use cases/Application orquestram regras.                                                                 |
| Frontend e composicao                   | ADR-0005 e ADR-0010 repetiam organizacao, RSC, formularios e estado.                                                                                                  | ADR-0005 detem estado, BFF, leitura/mutacao, cache e formularios; ADR-0010 conserva apenas decisoes de composicao visual e design system.                                                                   |
| Auth, Users e Schools                   | Uma identidade, papel e escola em User confundiria cadastro, acesso e pertencimento institucional.                                                                    | User global; Auth/Authorization owns credenciais/memberships/grants; Users owns perfil; Schools owns instituicao; Classes owns vinculacoes de turma.                                                        |
| Banco compartilhado e limites modulares | Banco/schema unico poderia ser confundido com ownership compartilhado.                                                                                                | PostgreSQL/schema compartilhado e escolha fisica; ownership permanece exclusivo e logico por modulo. `schoolId` nao substitui ownership nem autorizacao.                                                    |
| Escala e microservices                  | A meta de 100 mil alunos poderia ser interpretada como capacidade provada ou gatilho automatico de distribuicao.                                                      | Escala e microservices dependem de testes e gargalos medidos; o numero de alunos, sozinho, nao aprova capacidade nem extracao.                                                                              |

## 5. Status: ativo, superseded e fora de escopo

### Mantidos como referencias correntes para a V1

- **ADR-0001**: arquitetura base; status `Proposed` ate resolver sign-off.
- **ADR-0002, ADR-0003 e ADR-0004**: decisoes especializadas de modulos, dados e acesso; status `Proposed`.
- **ADR-0005 canonico** (`ADR-0005-frontend-architecture-state-management-bff.md`): proposta corrente de frontend/estado/BFF; status `Proposed`.
- **ADR-0009**: proposta corrente para analytics e telemetria; nao reavaliada em profundidade neste trabalho.
- **ADR-0010**: proposta corrente somente para composicao visual/design system; status `Proposed`.

“Corrente”/“ativo” identifica o documento a consultar na baseline proposta e nao equivale a `Accepted`. Nenhum status foi promovido a `Accepted`, pois nao ha evidencias de aprovacoes concluidas.

### Mantidos somente como historico superseded

- **ADR-0005 state-only** (`ADR-0005-state-management-strategy.md`): superseded pelo ADR-0005 canonico.
- **ADR-0006**: superseded por ADR-0005 para estado/BFF e ADR-0010 para o escopo residual de composicao.
- **ADR-0007**: superseded por ADR-0005.
- **ADR-0008**: superseded por ADR-0005.

Esses documentos permanecem no repositorio para rastreabilidade e nao sao fontes normativas para novos trabalhos.

## 6. Pendencias antes de declarar a baseline aceita ou pronta para producao

1. Ratificar os ADRs correntes com deciders nomeados e registrar sign-off; a politica ADR-GOVERNANCE tambem esta Proposed e ainda nao prova aprovacao do processo.
2. Finalizar schema, constraints tenant-aware, migrations e mapping do adapter Auth.js antes de persistir dados reais.
3. Aprovar governanca de eventos, replay, retencao, contratos/versionamento e controles de privacidade.
4. Obter revisao juridica/privacidade para dados de menores, consentimento, retencao, exportacao e exclusao.
5. Implementar e testar autenticacao, autorizacao, revogacao, MFA privilegiada e isolamento entre escolas; os ADRs descrevem requisitos, nao evidencias de runtime.
6. Medir SLOs e capacidade em carga representativa; metas de escala e latencia nao devem ser publicadas como garantias sem evidencias.
7. Harmonizar nomes fisicos restantes durante a revisao de schema, incluindo as alternativas de nomenclatura ainda conceituais em ADR-0003/0004.

## 7. Regra de manutencao

`INDEX.md` e o registro central de inventario, status, escopo, canon e supersession. Este documento resume a baseline, mas nao substitui o texto detalhado dos ADRs. Mudanca material de decisao exige revisao dos ADRs afetados e atualizacao do indice; documentos historicos nao voltam a ser normativos por estarem presentes no repositorio.
