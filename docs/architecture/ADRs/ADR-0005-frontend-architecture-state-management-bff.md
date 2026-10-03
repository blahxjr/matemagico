# ADR-0005 - Frontend Architecture, State Management and BFF Strategy

**Date**: 2026-09-29  
**Status**: Proposed (aguardando revisao e aprovacao)  
**Deciders**: Principal Software Architect, Frontend Lead, Tech Lead, Security Lead e Product (a confirmar)  
**Affects**: `apps/web`, `packages/modules/*`, `packages/ui`, Server Components, Client Components, Server Actions, Auth.js, cache, formularios e telemetria frontend

---

## 1. Context

O MateMágico Champions precisa de uma estrategia frontend coerente com Next.js 15 App Router, React, TypeScript, Tailwind, Shadcn UI, Auth.js, PostgreSQL e Prisma. A UI atende estudantes OBMEP Mirim e Niveis 1–3, professores, coordenadores, administradores e operadores editoriais. As jornadas incluem banco de questoes, treino adaptativo, simulados, campeonatos, rankings, gamificacao, certificados e analytics pedagogico.

Os ADRs-0002/0003/0004 definem limites entre modulos, ownership de dados, multi-tenancy por escola e autorizacao no servidor. O Documento Mestre, o ADR-0005 anterior e propostas ADR-0006 a ADR-0010 contem orientacoes concorrentes: algumas recomendam Server Components primeiro; outras tratam TanStack Query como estrategia padrao de estado remoto ou permitem estado global de autenticacao. O desacordo pode criar cache duplicado, estado de dominio no browser, vazamento entre escolas e Server Actions acopladas a varios repositorios.

### Constraints

- Manter Modular Monolith, DDD, Clean Architecture e ownership por bounded context.
- Priorizar Server Components para leitura e renderizacao; usar Client Components somente onde browser/interacao exigirem.
- Server Actions sao adaptadores de entrada (BFF) para mutacoes first-party, nao camada de dominio nem repositorio.
- A UI nao importa Prisma, repositories, entidades internas ou implementacoes de outro modulo.
- Estado canonico de negocio pertence ao modulo owner e ao PostgreSQL/projecao definida; estado global mutavel de negocio e proibido.
- O isolamento escolar e `schoolId` conforme ADR-0003; valor vindo de URL, form, store ou query key nunca autoriza acesso.
- Auth.js/sessao seguem ADR-0004; tokens, credenciais, roles e permissao nao sao armazenados como fonte de verdade no client.
- O ambiente do projeto e documental; nao ha bundle, routes ou cache operacional medidos.

### Requirements

- Definir organizacao `apps/web/src/{app,components,features,hooks,providers,lib}` e sua relacao com `packages/modules/*`.
- Definir leitura, mutacao, state local/remoto, cache, invalidacao, formularios e UX de carregamento/erro.
- Decidir responsabilidades e limites de React State, Context, Zustand, TanStack Query, Server Components e Server Actions.
- Proibir comunicacao UI->Prisma/repository/database e regra de negocio em componentes/actions.
- Cobrir performance, testes, observabilidade, tenant isolation e crescimento para 100 mil alunos como objetivo a validar.
- Consolidar a estrategia de frontend/estado e resolver conflitos com ADR-0006, ADR-0007, ADR-0008 e ADR-0010 sem apagar historico sem aprovacao.

---

## 2. Decision

**DECISION STATEMENT**: O frontend adota arquitetura feature-based sobre o Next.js App Router, com Server Components como padrao de leitura e renderizacao, e Server Actions como adaptadores BFF para mutacoes first-party. A UI chama contratos da camada Application do modulo owner; Application orquestra casos de uso, Domain implementa invariantes e Infrastructure persiste/consulta por ports. React State e Form State permanecem locais; URL guarda estado de navegacao; Zustand e opt-in apenas para estado efemero de UI compartilhado dentro de uma feature; TanStack Query e opt-in para sincronizacao client-side que RSC/Actions nao atendam. Nenhum estado client e fonte canonica de dominio, sessao, tenant ou autorizacao.

### 2.1 Organizacao frontend e ownership

Estrutura-alvo de `apps/web/src`:

```text
app/
  (public)/
  (auth)/
  (student)/
  (teacher)/
  (admin)/
components/
  ui/
  layouts/
  charts/
  forms/
  feedback/
features/
  auth/
  schools/
  classes/
  questions/
  study-paths/
  attempts/
  mock-exams/
  championships/
  rankings/
  analytics/
hooks/
providers/
lib/
  auth/
  validation/
  observability/
styles/
```

| Area                 | Ownership e regra                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`               | Rotas, layouts, loading/error boundaries, composition e adapters de entrada. Pode chamar query contracts em Server Components e mutation adapters; nao implementa regra de negocio nem coordena repositories.               |
| `features/`          | Composicao visual por jornada de usuario; depende de contratos/public DTOs, nunca de implementacao interna de `packages/modules/*`. Interacao client permanece co-localizada.                                               |
| `components/`        | Componentes reutilizaveis/presentacionais e composicao. `components/ui` contem primitives/design system; nao acessa sessao, banco, tenant nem modulos.                                                                      |
| `hooks/`             | Hooks React client reutilizaveis, sem acesso a Prisma e sem agregacao de estado de dominio entre contextos. Hooks de uma feature devem ficar junto dela quando nao forem realmente compartilhados.                          |
| `providers/`         | Providers React narrowly scoped: tema/locale, React Query provider quando aprovado, ou providers UI. Nao instalar providers mutaveis de negocio em toda a arvore.                                                           |
| `lib/`               | Adaptadores tecnicos server-only (Auth.js, validation, logging, cache tags). Nao e service locator para importar repositories ou regra de negocio.                                                                          |
| `packages/modules/*` | Cada bounded context possui `domain`, `application`, `ports`, `infrastructure` e, quando apropriado, contratos/DTO publicos. UI web pode existir dentro de `features`, mas package module continua owner de regras e dados. |
| `packages/ui`        | Shadcn/Radix e primitives visuais, tokens e componentes sem ownership de dominio. Unificar com o legado `shared-ui` antes do scaffold.                                                                                      |

Dependencias permitidas: `app/features -> public application contracts/DTOs`; `application -> domain + ports`; `infrastructure -> ports/domain`; `domain -> tipos puros`. Client bundle nao pode importar `packages/database`, Prisma, `server-only`, secrets, repositories ou implementacoes internas. Um pacote UI compartilhado nao importa `packages/modules/*`.

### 2.2 BFF, leitura e mutacao

Fluxos normativos:

```text
Leitura:
Browser -> Route/Page (Server Component)
        -> Query/Application Contract do modulo owner
        -> Port -> Infrastructure/Prisma -> PostgreSQL
        -> DTO autorizado e minimizado -> RSC render

Mutacao:
Browser/Form -> Server Action (BFF adapter)
             -> autenticar + autorizar + validar input/tenant
             -> Application Use Case do modulo owner
             -> Domain invariants -> output port/repository
             -> commit -> evento/outbox quando aplicavel
             -> revalidar cache/rota do owner -> resultado UI
```

**Permitido:** Server Component chama diretamente um contrato de leitura/application facade de um modulo e entrega DTO serializavel. Server Action valida payload nao confiavel, consulta Auth.js, resolve `actorId`/membership/`schoolId`, confirma permissao e estado do recurso, delega um caso de uso a um modulo e devolve resultado tipado/redigido. Cada action deve funcionar como uma fronteira publica invocavel diretamente, nao apenas como handler escondido da UI.

**Proibido:**

- UI -> Prisma, database client, repository, entidade interna ou tabela.
- Client Component -> acesso direto a Route Handler privado para contornar contrato do modulo.
- Componente, hook ou Server Action contendo regras pedagogicas, scoring, elegibilidade, RBAC ou invariantes de dominio.
- Uma Server Action compor acesso a varios repositories/modulos para implementar workflow de negocio. Se uma jornada exigir coordenacao entre contextos, criar use case/coordenador de aplicacao com owner explicito e dependencias contratuais/eventos conforme ADR-0002.
- Usar `schoolId`, `membershipId`, role ou permission enviado pelo browser como prova de autorizacao.

**Distincao importante:** Server Action e Interface Adapter/BFF, nao Application Layer. Pode autenticar e adaptar input, mas regra e transacao permanecem no use case. Route Handler e apropriado para webhooks, APIs externas, protocolo publico, streaming/polling dedicado ou cliente nao-browser; tambem delega a Application e repete autorizacao.

### 2.3 Server Components e Client Components

- Todo page/layout/componente nasce Server Component. `'use client'` e uma fronteira de bundle e deve permanecer no menor subtree que precisa de estado local, DOM/browser API, eventos, canvas, editor, drag-and-drop ou interacao rica.
- Dashboards, listagens, detalhes, conteudo editorial publicado e dados iniciais renderizam server-side, com selecao e autorizacao no modulo owner.
- Dados enviados a Client Component sao DTOs minimos, serializaveis, sem Prisma model, segredo, token, resposta correta antes de autorizacao ou PII desnecessaria.
- A presenca de um Client Component nao converte sua feature em fonte de verdade; mutations retornam resultado do servidor.
- Prefetch/parallel reads sao coordenados no server para evitar waterfalls; leituras independentes devem iniciar em paralelo. React `cache` serve memoizacao/deduplicacao de render request-scoped e nao cache global entre usuarios.
- Loading e error boundaries ficam proximos da rota/segmento que pode esperar/falhar; proteger a arvore sensivel e evitar layout compartilhado que bloqueie streaming sem necessidade.

### 2.4 Estrategia de estado

| Tipo                 | Fonte canonica                               | Tecnologia/padrao                                                                    | Limite                                                                                                                     |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Estado local de UI   | Componente/DOM                               | React `useState` / `useReducer`                                                      | Modal, tab, menu, selecao, foco, accordion; vida limitada ao fluxo.                                                        |
| Estado de formulario | Form em edicao ate aceitar comando           | React Hook Form + Zod; `useActionState`/`useFormStatus` para pending quando adequado | Client validation melhora UX, mas servidor valida novamente. Limpar/descartar ao trocar entidade/tenant conforme politica. |
| Server/domain state  | Bounded context owner e PostgreSQL           | Server Components para leitura; Application contracts/Server Actions para mutacoes   | Nunca duplicar como store global. Client DTO/cache e snapshot descartavel.                                                 |
| Auth/session         | Auth.js e session registry conforme ADR-0004 | Validacao server-side; UI recebe apenas snapshot de apresentacao                     | Sem JWT, credential, role ou permission autoritativa em Zustand/localStorage.                                              |
| Navegacao/consulta   | URL                                          | pathname, search params, route segments                                              | Filtros/pagina/ordenacao compartilhaveis; validar no server. Nunca segredo ou autorizacao.                                 |
| UI global efemera    | Feature/subtree                              | Zustand opt-in, factory/provider isolado por instancia                               | Somente estado client-only de interface compartilhado; sem persistencia por padrao.                                        |
| Remote query cache   | Servidor permanece canonico                  | TanStack Query opt-in por feature                                                    | Polling/refetch/focus/reconnect/infinite scroll/optimistic reversivel. Query cache nao e banco nem permission store.       |
| Context API          | Provider subtree                             | React Context                                                                        | Tema, locale, dependency/config estavel; nao store de alta frequencia ou dominio.                                          |

**React Query/TanStack Query:** o nome canonico da biblioteca e TanStack Query (React Query). Usar apenas quando a interacao exige cache/refetch no cliente ou ciclo de vida de query/mutation que nao se encaixa no caminho server-first. Se Server Component fornecer initial data, definir estrategia explicita de hydration/staleness; nao manter dois snapshots concorrentes sem sincronizacao. Query key para recurso escolar inclui `schoolId` e outras dimensoes de escopo; a key nao autoriza acesso. Limpar queries em logout, troca de escola, membership/role revogada e suspensao. A permissao e revalidada no server em cada leitura/mutacao.

### 2.5 Zustand e Context

Zustand fica aprovado apenas como ferramenta opt-in para estado efemero compartilhado de UI dentro de uma feature: wizard, command palette, canvas selection ou controls complexos. Stores sao modulares, client-only, scoped a provider/factory de feature e nao exportadas como contrato de dominio. Nao criar singleton mutavel server-side; resetar no fim do fluxo, logout e mudanca de escola quando aplicavel.

E proibido armazenar em Zustand/Context global: Users/School/Class, memberships, roles/permissions, schoolId como autoridade, questoes canonicas/gabaritos, respostas submetidas, Attempts, progresso de Study Paths, sessoes de Mock Exams, championships, rankings, badges, certificates, analytics, tokens, credentials ou dados pessoais sensiveis. Dados de servidor pertencem ao modulo; Zustand nao e banco/cache remoto.

Context serve a valores estaveis e subtree limitada. Dividir providers por responsabilidade; nao passar objetos mutaveis grandes/frequentes num provider global. Prop drilling deve ser resolvido primeiro por composition/children e pelo ancestral comum mais proximo; Context nao e justificativa para centralizar dominio.

### 2.6 Formularios e validacao

- Padrao de formulario: React Hook Form + Zod conforme Documento Mestre; formularios pequenos podem usar FormData nativo e progressive enhancement sem carregar RHF por default.
- Zod no client e UX; schemas e regras relevantes sao validados novamente na Server Action/Application. Nunca confiar em input hidden, button disabled, client role ou valores de tenant.
- Resposta da action diferencia field validation, business rule, unauthorized/forbidden e erro inesperado sem revelar existencia de recurso privado.
- Erros de dominio sao apresentados por campo/resumo; erro inesperado usa correlation id e boundary/log server-side com redacao.
- Loading usa `useFormStatus`/`useActionState` ou React transition conforme interacao. Evitar estado de submit duplicado e aplicar idempotency key em comandos repetiveis/críticos.
- Drafts de tentativa/simulado nao persistem em localStorage/analytics por default; qualquer autosave deve ser decisao de produto/dominio com consentimento, tenant, retencao, criptografia e recovery definidos.

### 2.7 Cache, revalidacao e invalidacao

| Camada                            | Uso                                                       | Politica                                                                                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request memoization / React cache | Deduplicar chamadas repetidas no mesmo render do server   | Request-scoped; nunca compartilhar dados de usuarios entre requests.                                                                                                                                                                     |
| Next.js Data/route cache          | Conteudo publicado e dados explicitamente cacheaveis      | Configuracao opt-in por recurso e verificada na versao exata do Next.js 15; chave/tag contem owner, versao e escopo tenant quando aplicavel. Dados privados/sensíveis usam politica dinamica/no-store se nao houver isolacao comprovada. |
| Router/browser cache              | Navegacao e snapshots de UI                               | UX, nao autoridade; logout/troca de escola limpa dados privados.                                                                                                                                                                         |
| TanStack Query                    | Remote cache client opt-in                                | Fonte e dono permanecem no servidor; query keys tenant-aware, staleness/GC definidos, invalidacao apos resultado autoritativo.                                                                                                           |
| Zustand                           | Estado em memoria de UI                                   | Sem cache de server state, sem persistencia de dominio; limpeza de ciclo de vida definida.                                                                                                                                               |
| Redis/distribuido futuro          | Dados derivados de alta leitura medidos (ex. leaderboard) | ADR-0003/0009; namespace/keys tenant-aware, TTL, invalidacao distribuida, metricas de lag. Nao fonte canonica.                                                                                                                           |

**Fluxo de invalidacao:** o use case valida e comita dados no modulo owner; apos commit, o adaptador revalida tags/paths do owner e retorna resultado canonico; evento/outbox atualiza projecoes de Analytics/Rankings e caches assincronos; TanStack Query e atualizado/invalida somente no client feature que usa a query. Cache invalidation nao desfaz commit; falha deve gerar retry/observabilidade e estado de frescor explicito. Nao existe TTL universal.

Chaves privadas incluem `schoolId`, `classId`, `userId`, versao e filtros que alterem visibilidade; autorizacao e revalidada antes de servir um hit privado. Troca de tenant, logout, role/membership revogada e suspensao invalidam estado client relevante. Conteudo publicado pode ser cacheado por versao; resposta em exame e sessao ativa nao usam dados stale que alterem scoring, deadline ou gabarito.

### 2.8 BFF e comunicacao com `packages/modules/*`

| Chamada                                                  | Permitida?      | Regra                                                                                                                                                       |
| -------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RSC -> contrato publico Query/Application do owner       | Sim             | Read DTO; authz e tenant verificados no server; nenhuma importacao de repository interno.                                                                   |
| Form/Client -> Server Action de feature                  | Sim             | Action valida input, autentica, autoriza e delega um use case; nao possui regra de dominio.                                                                 |
| Application Use Case -> Domain e output ports            | Sim             | Regra de negocio e invariantes aqui; Infrastructure implementa ports.                                                                                       |
| UI -> Prisma/Repository/Database                         | Nao             | Viola Clean Architecture, expõe armazenamento e contorna tenant/policies.                                                                                   |
| UI module A -> store/domain interno de B                 | Nao             | Cross-module somente fachada/DTO/evento conforme ADR-0002.                                                                                                  |
| Server Action -> repositories de varios bounded contexts | Nao             | Se workflow real cruzar contexts, definir application coordinator owner com contratos/eventos; Action continua adapter.                                     |
| Client -> endpoint para contornar Server Action          | Nao por default | Route Handler somente para API externa, webhook, protocolo especifico, streaming/polling ou consumidor nao-browser; mesma validacao e Application boundary. |

Server Actions sao superficies invocaveis diretamente via POST; cada uma verifica sessao/Auth.js, permissoes atuais, ownership do recurso, `schoolId`, validacao do command, rate limit quando necessario e idempotencia. Middleware/layout podem otimizar navegacao, mas nao sao a unica barreira de seguranca.

### 2.9 Performance, acessibilidade e composicao

- **Streaming/Suspense:** dividir pagina por blocos independentes (cabecalho/resumo/lista/chart) e usar loading skeleton dimensionado; evitar suspender toda pagina por widget lento. Errors sao isolados por route/segment boundary.
- **Lazy loading/code splitting:** carregar editor matematico, charts pesados, import wizard e interacoes raras dinamicamente no client boundary; nao lazy-load componente simples por reflexo. Medir bundles por rota e evitar trazer provider/client library para landing/public routes.
- **Server-first:** transferir somente DTO exibido; paginar roster, attempts, ranking e metricas no server; virtualizar lista grande quando client interativo for inevitavel.
- **Acessibilidade:** keyboard/focus, labels, status para assistive tech e prefers-reduced-motion; charts precisam de resumo/tabela acessivel, em alinhamento com meta WCAG 2.2 AA do ADR frontend existente.
- **Optimistic updates:** somente acao local reversivel (favorito/preferencia) com rollback; nunca resultado de tentativa, nota, inscricao elegivel, certificado, badge oficial, role ou membership. UI mostra pending ate confirmacao do servidor.
- **Re-renderizacao:** state no menor owner; seletores de Zustand; Context estavel; nao adicionar memoization manual sem medicao/profiling; evitar guardar derivados duplicados.

### 2.10 Estrategia de testes

Esta estrategia implementa a matriz comum de `ADR-TEMPLATE.md`; os cinco niveis abaixo sao os mesmos para todos os ADRs.

| Nivel                 | Cobertura requerida                                                                                         | Exemplos criticos                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                  | Domain/application e schemas puros; reducers/selectors de UI quando houver logica nao trivial.              | Validacao de command, mapping de erros, selectors sem side effects.                                                                                 |
| Integration           | Server Action/Route adapter -> application contract -> repository fake/test DB; cache invalidation e Authz. | Rejeitar `schoolId` adulterado; garantir action nao chama repo alheio; invalidar tags corretas apos commit; falha de invalidacao nao desfaz commit. |
| Contract/architecture | Imports permitidos, ausencia de cycles, public API e DTO serializavel.                                      | UI nao importa Prisma/domain internals; feature nao importa store de outro modulo; client bundle nao contem server-only.                            |
| E2E                   | Jornadas browser e comportamento real App Router com browser/mobile viewport.                               | Login/troca de escola/logout; formulario invalid/valid; tentativa submit double click; loading/error; refresh e back/forward; foco/acessibilidade.  |
| Load Tests            | Budgets de bundle, RSC, interacao e concorrencia por jornada, apos SLO aprovado.                            | Dashboard em escola grande, roster paginado, prova concorrente e invalidacao multi-instancia.                                                       |

Testes de autorizacao e tenant negativos sao obrigatorios e nao podem ser substituidos por snapshot visual. Em SSR, testes devem provar ausencia de state leakage entre requests/users.

### 2.11 Observabilidade frontend e BFF

Adota o baseline OpenTelemetry de `ADR-TEMPLATE.md` e o detalhamento de logs/tracing do ADR-0009. OpenTelemetry e o padrao de instrumentacao e propagacao; Error Tracking usa somente Sentry, ja listado no Documento Mestre, com redaction e revisao de exportacao/retencao. Nenhum vendor adicional e introduzido por este ADR.

- **Logs:** estruturados no server com request/correlation ID, action/use case, modulo, resultado e duracao; redigir email, PII, resposta, token, cookie, session secret e payload de formulario. Nao logar objeto Prisma inteiro.
- **Metricas:** latencia e taxa de erro por route/action/use case, pending duration, cache hit/miss/invalidacao/lag, query count, client bundle e Web Vitals (LCP, INP, CLS). Agregar por route/versao e tenant sem criar telemetria identificavel indevida.
- **Tracing:** OpenTelemetry propaga trace/correlation entre request -> Server Action -> Application -> repository/event consumer; incluir `schoolId` somente em atributos protegidos/permitidos e cardinalidade controlada, nao como label indiscriminado de metrica.
- **Erros:** Error Boundaries capturam falha de render client; logs/tracing server correlacionam causa; mensagem UI e generica para auth/tenant e segura contra enumeracao.
- Eventos de UI/analytics seguem ADR-0004/0009 e politicas LGPD; nao capturar answers de aluno, credenciais, tokens ou PII sem finalidade/base aprovada.

### 2.12 Estrategia de escalabilidade

| Faixa           | Decisao operacional                                                                                                                                                                | Evidencia antes de avancar                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0–10 mil alunos | RSC/Server Actions; React local; sem query/cache global client; cache Next explicito para conteudo seguro; paginação e queries tenant-aware.                                       | Baseline de Web Vitals, request latency, bundle por rota, consultas DB e testes multi-escola.                  |
| 10–50 mil       | TanStack Query apenas para interacoes demonstradas (polling/ranking/infinite scroll); invalidacao por owner; Redis/read models segundo ADR-0003/0009 se workload medido.           | Teste de cache stale/tenant, pool DB, cache hit, queue/projection lag e simultaneidade por escola.             |
| 50–100 mil      | Roteamento/read models, streaming, paginação e caches distribuidos tenant-aware; reduzir dashboards OLTP; escalar consumidores analiticos sem passar a fonte de verdade ao client. | Load test com tenant hot-spot, pico de exame, role revocation, cache invalidation distribuida e SLO observado. |

100 mil alunos cadastrados nao definem concorrencia nem carga. Nenhum estado global client ou cache in-memory de processo substitui PostgreSQL/ownership/projections, e nenhum claim de capacidade e aceito antes de teste reprodutivel.

### 2.13 Criterios de qualidade e checklist

**Obrigatorio**

- [ ] Pages/layouts iniciam como Server Components; cada `'use client'` tem motivo documentado e subtree minimizado.
- [ ] RSC le por contrato do modulo owner; Action/Route autentica, autoriza, valida e delega use case.
- [ ] UI nao importa Prisma, repository, dominio interno ou store de outro modulo.
- [ ] `schoolId` e resolvido/validado no server; queries/cache privados incluem scope, e troca de escola limpa estado client.
- [ ] Nenhum token, password, permission autoritativa, dado de dominio ou resposta privada em Zustand/localStorage.
- [ ] Mutacao critica usa resultado server-side, idempotencia/concurrency quando necessario e invalidacao do owner apos commit.
- [ ] Form schemas validam client e server; erros e logs nao vazam existencia/PII/segredos.
- [ ] Testes cobrem authorization negativa, cross-tenant, duplicate submit, logout/cache clear e action failure.
- [ ] Dados RSC -> Client sao DTOs minimos, serializaveis e sem dados secretos.

**Recomendado**

- [ ] Estado navegavel vai para URL; composicao de Server Components substitui prop drilling antes de Context.
- [ ] Suspense/loading boundary esta proxima da leitura lenta e possui fallback acessivel.
- [ ] TanStack Query/Zustand sao opt-in com ADR/nota local de owner, cache key, ciclo de vida e invalidacao.
- [ ] Perf/bundle e Web Vitals sao acompanhados por rota; optimizations adicionais apoiadas por profiling.
- [ ] UI de charts tem alternativa tabular/acessivel e error state local.

**Anti-patterns proibidos**

- [ ] UI -> Prisma/database/repository.
- [ ] Zustand/Redux/Context global como banco de dominio, cache autoritativo ou store de permissao.
- [ ] TanStack Query universal em paralelo ao cache RSC sem ownership/hydration/invalidation.
- [ ] Server Action com regra de negocio ou coordenacao ad hoc de varios repositories/modulos.
- [ ] Autorizar por botao escondido, middleware isolado, query key, role do browser ou `schoolId` de form.
- [ ] Optimistic success para score, tentativa, elegibilidade, certificado, membership/role ou resultado oficial.
- [ ] Persistir token, credencial, gabarito ou resposta de menor em browser storage/telemetria sem decisao e protecao especificas.

### Why This Choice

O App Router oferece renderizacao server-first e composicao por segmentos, o que se adequa a dashboards/listas educacionais e reduz payload client. Separar Adapter/Server Action de Application e Domain preserva Clean Architecture e evita que o BFF seja novo monolito de regra. Estado local atende interacoes; TanStack Query e Zustand permanecem ferramentas condicionais, evitando adotar cache/store universal antes de existir fluxo que os justifique. A fronteira tenant e verificada no servidor e aplicada tambem ao cache.

| Option                                                    | Pros                                                                                      | Cons                                                                                                       | Why Chosen?                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **RSC + Application contracts + Server Actions adapters** | Leitura server-side, menos client JS, regra/authorization nos owners e progressive forms. | Disciplina de boundaries, teste de cache/streaming e round trip para mutacao.                              | ✅ Selecionada como padrao.                                       |
| **TanStack Query global para todos os dados**             | Refetch, retry e mutation APIs uniformes.                                                 | Duplicacao de cache RSC, hydration/invalidation abrangente e risco de tenant key incompleta.               | ❌ Rejeitada globalmente; uso opt-in por feature.                 |
| **Zustand/Redux como store canonica**                     | Acesso client central e tooling/state transitions.                                        | Espelha dominio, stale authorization e state leakage SSR/tenant; viola ownership.                          | ❌ Rejeitada.                                                     |
| **SPA client-first + API/BFF uniforme**                   | Alta interatividade e modelo de fetch client consistente.                                 | Bundle/SEO/cache ownership e round trips maiores; desnecessario para jornada predominante server-rendered. | ❌ Rejeitada como padrao; cliente pesado pode ser excecao medida. |

### Rationale

A fonte de verdade permanece no modulo owner. A UI e composition/adapter, nao camada de dominio. Server Components e Actions atendem a maioria das leituras/mutacoes first-party; para excecoes client-heavy, cache de query e store visual sao locais e descartaveis. Assim evitamos conflito com ADR-0002/0003/0004, preservando extracao futura sem converter frontend em repositorio global.

---

## 3. Consequences

### ✅ Positive Consequences

1. Dados de dominio, tenant e autorizacao nao se tornam estado client compartilhado.
2. Reduz JavaScript inicial e evita instalar cache client em todas as rotas.
3. Fronteiras entre routes, adapters, Application, Domain e Infrastructure ficam verificaveis e testaveis.
4. Formulários de pratica/exame podem dar feedback rapido sem declarar resultado oficial antes da resposta autoritativa.
5. Escala pode ser avaliada em torno de workload real, projection lag e query/bundle budgets.

### ⚠️ Negative Consequences

1. Interacoes client-heavy ainda dependem de rede/server e precisam de pending/retry acessiveis.
2. Misturar Router/Data/Query caches sem disciplina pode gerar dados stale; a equipe precisara testar a versao exata Next.js 15 e deployment adapter.
3. Server Actions exigem testes de seguranca porque sao invocaveis diretamente e podem ser expostas como fronteiras de rede.
4. Queries RSC e projetos TanStack opt-in criam dois padroes deliberados; ownership e excecoes precisam ser revisados.

### 🔧 Trade-offs Accepted

| Trade-off                              | Accept Because                                                  | Monitor                                                           |
| -------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| Server round trip para mutacao critica | Resultado oficial, authorization e idempotencia ficam no server | Pending duration, erros de rede e abandono de fluxo               |
| Estado global minimizado               | Previne acoplamento, stale permissions e tenant leakage         | Prop drilling real, provider breadth e crescimento de stores      |
| TanStack Query opt-in                  | Tira custo de cache client das telas que nao precisam           | Cache duplication, key correctness, memory/GC e staleTime         |
| BFF estrito por contrato de modulo     | Preserva ownership e extracao futura                            | Actions gordas, fan-out de dependencias e duplicacao de use cases |

---

## 4. Risks

### Risk Assessment

| ID  | Risk                                                                    | Severity | Likelihood | Mitigation                                                                                                                                 |
| --- | ----------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Server Action chamada diretamente sem authorization/tenant validation   | Critical | Medium     | AuthN/AuthZ, validation, ownership, schoolId e state check dentro de cada action/use case; integration tests negativos.                    |
| R2  | Cache/store mistura escolas ou usuarios                                 | Critical | Medium     | Tenant-aware keys, server reauthorization, clear ao logout/troca membership; testes A/B entre escolas e multi-instance invalidation.       |
| R3  | Action vira business service que consulta varios repositories           | High     | Medium     | Action so adapter; use case owner ou coordinator definido em Application e regra de import automatizada.                                   |
| R4  | TanStack Query diverge do RSC payload/Next cache                        | High     | Medium     | Uma fonte canonica, estrategia de hydration e staleTime/invalidation documentada por feature; sem parallel cache por default.              |
| R5  | SSR Zustand singleton causa state leakage                               | Critical | Low/Medium | Store criada no client/subtree e factory scoped; nunca compartilhar estado request-specific em module singleton server; teste concorrente. |
| R6  | RSC DTO inclui PII/gabarito/entity Prisma                               | High     | Medium     | DTO allowlist e minimization; security review e testes do payload.                                                                         |
| R7  | Mutation optimista aparenta sucesso oficial apesar de rejeicao/conflito | High     | Medium     | Proibir para scoring/attempts/certificates/access; optimistic concurrency e retorno autoritativo.                                          |
| R8  | Cache Next diverge com minor/config de Next 15                          | Medium   | Medium     | Fixar versao/config, testes de revalidation e reavaliar em upgrades.                                                                       |
| R9  | Tracking frontend envia dados de menores/answers a terceiros            | Critical | Medium     | Consent/legal review, event allowlist, redaction e analytics first-party/aggregado.                                                        |

### Monitoring & Alerting

- p95/p99 por rota/action/use case e thresholds acordados por journey antes do go-live.
- Taxa de falhas, duracao pending, query count/DB latency, Web Vitals (LCP/INP/CLS) e bundle JS por rota.
- Cache invalidation failure/lag, projection `asOf`, TanStack cache size/GC e erro de query por feature.
- Alertar eventos de action forbidden/cross-tenant e falha de authz; sucesso cross-school e incidente critico.
- Executar load test multi-tenant com skew, prova concorrente, ranking live e perda/retry de eventos antes de alegar 100 mil alunos.

---

## 5. Alternatives Considered

### TanStack Query universal como fonte operacional client

**Description**: Todo server data seria buscado/mutado no client e mantido em Query Cache.

**Pros**:

- Refetch/focus/retry/pagination e mutation state consistentes.
- Conveniente para experiencias muito interativas.

**Cons**:

- Repete Data/Router Cache e dados enviados por RSC; aumenta payload, memory e politica de invalidacao.
- Query keys e cache podem omitir `schoolId`/roles; query cache nao autoriza acesso.
- Incentiva que read models sejam tratados como estado canonico do produto.

**Why not chosen**: App Router server-first atende a maioria dos fluxos; a biblioteca fica opt-in apenas para necessidades client-side demonstradas.

### Store global Redux/Zustand para dominio

**Description**: Normalizar User, School, Question, Attempts e rankings em uma store de browser.

**Pros**:

- Acesso compartilhado a dados e DevTools/seletores.
- Boa ergonomia em SPA client-only grande.

**Cons**:

- Segunda fonte de verdade, stale state apos revogacao, risco de SSR leakage e cross-tenant.
- Viola ADR-0002, ownership DDD e a politica de sessao do ADR-0004.

**Why not chosen**: Apenas UI state compartilhado e permitido em Zustand; estado canonico permanece no server/module owner.

### SPA/BFF com Server Actions orquestrando todos os domínios

**Description**: Client application concentra query/mutation e Server Actions implementam fluxos integrando repositorios de varios modulos.

**Pros**:

- Fronteira de rede uniforme para a UI.
- Facilita interacoes cliente em uma SPA.

**Cons**:

- Action vira application/domain service paralelo, quebra boundaries e dificulta extracao/teste.
- Mais round trips, JavaScript e cache client; risco de regra duplicada.

**Why not chosen**: BFF limita-se a adapters; use case/orquestrador pertence a Application com owner explicito.

---

## 6. Implementation

### Timeline

1. **Antes de implementar features:** ratificar este ADR e declarar o tratamento de ADR-0005 anterior e ADR-0006/0007/0008/0010 (supersession, consolidacao ou escopo residual).
2. **Foundation:** criar rotas/feature composition, regras de import server/client, DTO policy e Server Action adapter pattern; definir formulários RHF/Zod e error contracts.
3. **Vertical slice:** implementar uma leitura RSC e mutation com Auth.js/`schoolId`, application use case, repository port, revalidation e testes unit/integration/E2E.
4. **Interacao client especial:** adotar Zustand ou TanStack Query apenas com requisito registrado, query key/scope, invalidation, lifecycle, métricas e teste multi-tenant.
5. **Production readiness:** observar Web Vitals, cache, latência, event lag e acessibilidade; executar carga e security tests antes de declarar escala.

### Affected Components

- `apps/web/src/app`: routes, layouts, RSC composition, loading/error boundaries e adapters.
- `apps/web/src/features`: composition visual por modulo/jornada.
- `apps/web/src/components` e `packages/ui`: primitives e componentes presentacionais, sem domínio.
- `apps/web/src/hooks`, `providers`, `lib`: comportamento de UI scoped e adapters técnicos server-only.
- `packages/modules/*`: contratos Application, DTOs, invariants e ports; sem importar stores de UI.
- Auth.js, Prisma/database, event consumers e Analytics: interacao apenas por contratos e invalidation/event policies definidas.

### Migration Plan (if applicable)

Nao ha migracao de codigo neste ADR. O arquivo antigo `ADR-0005-state-management-strategy.md` esta marcado como **Superseded** por este ADR, mantendo link historico. ADR-0006/0007/0008 estao **Superseded**; ADR-0010 permanece **Proposed** somente para frontend composition/design-system. Nenhum desses documentos substitui a regra de estado/BFF deste ADR.

Se ja existir implementacao futura: inventariar cada state/cache por owner e tenant; migrar primeiro leituras canonicas a Server Components; mover mutation para actions adapters + use cases; remover stores/cache de dominio; manter somente UI state local; testar equivalencia, invalidacao e isolamento antes de desligar caminho antigo.

Rollback: reverter por feature e voltar a leitura server-first/estado local. Nunca reativar uma store como fonte canonica nem revalidar uma sessao revogada. Cache antigo pode ser limpo e reconstruido; commits de dominio nao sao desfeitos pela invalidacao.

### Effort Estimation

Fora do escopo ate inventario de rotas/codigo. O workspace atual contem documentacao, nao implementacao frontend para estimar.

---

## 7. Related ADRs

- ADR-0001 — Arquitetura Base (em `ARCHITECTURE.md`; extracao para arquivo atomico recomendada).
- ADR-0002 — Module Boundaries and Domain Communication (ownership e contratos).
- ADR-0003 — Database Strategy and Domain Data Model (`schoolId`, analytics/read models e persistencia).
- ADR-0004 — Authentication and Authorization (Auth.js, sessao e RBAC server-side).
- ADR-0006–ADR-0010 — propostas frontend/analytics existentes; revisar e marcar supersession/escopo antes da aprovacao final deste ADR.

---

## 8. References & Research

- Next.js 15 App Router documentation — Server/Client Components, data fetching, Server Actions, caching, streaming e invalidation; confirmar comportamento contra a versao instalada/configurada.
- React documentation — Server Components, `use`, transitions, Suspense e state/context.
- TanStack Query documentation — query cache, invalidation e hydration; uso restrito aos casos opt-in.
- Zustand documentation — store scoping, selectors e SSR guidance; nao usar estado server/domain global.
- React Hook Form e Zod documentation — estado de formulario e validacao client/server.
- Auth.js e ADR-0004 — sessao server-owned; sem credenciais/tokens em client store.
- OWASP Cheat Sheets — Authentication, Authorization, Session Management, XSS e CSRF.
- ADR-0002, ADR-0003, ADR-0004, ADR-DIAGNOSTIC-REPORT e `ARCHITECTURE.md`.

---

## 9. Sign-Off

Decision approved by:

- [ ] Principal Software Architect
- [ ] Frontend Lead
- [ ] Tech Lead
- [ ] Security Lead
- [ ] Product Manager
- [ ] CTO / patrocinador do produto

Status permanece **Proposed** ate aprovacao formal. Nomes, data de aceite e owner de supersession dos ADRs duplicados devem ser registrados no indice central.

---

## 10. Future Reconsideration

This decision should be revisited if:

- a maioria das jornadas passar a ser client-heavy/offline-first e RSC/Actions nao atenderem a requisitos medidos;
- TanStack Query global for proposto: exigir evidencias de necessidade, plano de coexistencia com Next cache, tenant-safety e custo de bundle/memoria;
- houver necessidade real de Redux/Jotai baseada em complexidade de transicoes client e equipe/tooling, nao preferencia individual;
- mudanca de major/minor/config Next.js 15 alterar cache, Router Cache, Server Actions, RSC ou comportamento de streaming;
- teste multi-instancia revelar invalidation/cache lag ou session/tenant leakage;
- novos clientes (mobile/offline) exigirem API versionada ou estrategia BFF diferente;
- métricas excederem budgets aprovados de LCP, INP, CLS, JS bundle, p95/p99 ou memoria por sessao.

**Review Date**: Antes da primeira feature frontend com dados escolares e novamente antes do go-live com alunos reais.

---

**Template Version**: 1.0  
**Based on**: Nygard ADR Format
