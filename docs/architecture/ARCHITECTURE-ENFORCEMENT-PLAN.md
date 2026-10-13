# Plano de enforcement arquitetural — MateMágico Champions

**Fontes oficiais de estado:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md), [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md), [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md), [EVENT-FOUNDATION-PLAN.md](EVENT-FOUNDATION-PLAN.md), [SECURITY-FOUNDATION-PLAN.md](SECURITY-FOUNDATION-PLAN.md), [CI-FOUNDATION-PLAN.md](CI-FOUNDATION-PLAN.md) e [OBSERVABILITY-FOUNDATION-PLAN.md](OBSERVABILITY-FOUNDATION-PLAN.md).  
**ADRs governados:** ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0009 e ADR-0010.  
**Escopo:** plano de aplicação e monitoramento da baseline selecionada. Não reexecuta auditorias, não altera ADRs, não propõe arquitetura nova e não inclui código ou configuração.

> Os documentos oficiais registram os ADRs selecionados como `Proposed`, não `Accepted`. Este plano separa a ratificação formal da aplicação técnica: os ADRs selecionados são referências de trabalho; stakeholders precisam registrar aprovação conforme o processo de governança existente antes de declará-los formalmente mandatórios. Nenhum conteúdo de ADR é alterado por este plano.

## 1. Estado Atual

Somente fatos registrados nos documentos oficiais:

- O sistema é um monorepo npm/Turborepo com 2 apps (`api`, `web`) e 8 packages; os módulos de domínio implementados no recorte auditado são Auth e Membership/School Context.
- `test:architecture` existe e passa no grafo atual, porém as regras observadas se concentram parcialmente em módulos futuros e não há fixtures negativas demonstrando que violações de Auth/Membership falham o gate.
- ADR-0002 estabelece ownership exclusivo por módulo, contratos públicos para chamadas síncronas, eventos para efeitos secundários, ausência de ciclos e proibição de acesso cruzado a repositories/tabelas.
- PostgreSQL + Prisma e uma migration foundation existem; `db:validate` passou localmente. A migration contém índice parcial que `db push` não garante.
- CI não provisiona PostgreSQL, não aplica migrations nem executa `test:db`; 48 testes dependentes de DB foram pulados. Não há comando de deploy repetível de migrations versionadas.
- Auth.js não está integrado; o composition root usa adapters fail-closed para user lookup, senha, autorização e escola. Auth/Membership não operam com esses defaults.
- `apps/web` é uma página Foundation sem jornada/Server Actions; o processo API Node existe, e sua relação com BFF conforme ADR-0005 não está explicitada.
- `@matemagico/events` expõe metadata parcial, sem envelope versionado/validado ou contract tests. `MembershipCreated` e `RoleGranted` estão registrados, mas publisher provisório os descarta; não há consumidor conhecido implementado.
- Analytics, Users e Schools não existem como packages no estado auditado; outbox/inbox, consumers e projeções também não estão implementados.
- Não há logs estruturados, métricas ou tracing operacionais demonstrados nos serviços; `packages/logger` existe, sem integração uniforme comprovada.
- Os planos de Database, Event, Security, CI e Observability Foundation definem os gaps e critérios esperados, mas são planos, não evidência de conclusão.
- A auditoria atribui notas qualitativas de prontidão; não é pentest, teste de carga, avaliação jurídica ou certificação de produção.

## 2. ADRs Governados

Todos os ADRs abaixo exigem validação contínua por PR e revisão periódica de aderência. “Validação contínua” não significa implementar módulos futuros antes de sua entrada no backlog.

| ADR                                                            | Escopo canônico para enforcement                                                                                                                                                                                                       | Validação contínua                                                                                                                                | Evidência esperada                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-0002 — Module Boundaries and Domain Communication**      | Ownership por bounded context; fronteiras Application/public contracts; sem imports internos cruzados, acesso a tabelas/repositories alheios ou ciclos; eventos para efeitos secundários após commit; tenant scope explícito.          | Em todo PR que altere packages, imports, contratos, schema, eventos ou composição; revisão periódica do grafo de dependências.                    | Architecture fitness sobre apps/packages/modules existentes; fixtures negativas; revisão de contratos/imports; contract tests de eventos quando aplicável.                 |
| **ADR-0003 — Database Strategy and Domain Data Model**         | PostgreSQL + Prisma como persistência transacional; ownership dos dados por módulo; isolamento lógico escolar com `schoolId`; analytics separado do OLTP; migrations versionadas expand/contract e forward-only.                       | Em toda mudança de schema, query, repository, migration, evento/projeção ou rotina de deploy; antes de release que aplique migration.             | `db:validate`; migration deploy em DB limpo; `test:db`; testes de isolamento/constraints; revisão de ownership e compatibilidade; registro de evidência de apply.          |
| **ADR-0004 — Authentication and Authorization**                | Auth.js Credentials/JWT V1 com registro server-side revogável; User global e memberships; autorização server-side deny-by-default e contextual; secrets/PII minimizados; audit trail e MFA para roles privilegiadas antes de produção. | Em qualquer mudança de Auth, sessão, credenciais, RBAC, permission, membership, logs/events de identidade ou liberação de papel privilegiado.     | Tests negativos de sessão/revogação, role, permission e cross-tenant; testes DB; revisão de segredo/PII; audit evidence; gate de release para MFA privilegiado.            |
| **ADR-0005 — Frontend Architecture, State Management and BFF** | Server Components por padrão para leitura; Server Actions como adapters de mutação; UI via contratos públicos; estado canônico server-owned; client sem Prisma/repositories/secrets/autoridade sobre sessão ou tenant.                 | Em PR que altere `apps/web`, rotas/actions, client bundle, cache, providers ou estado de UI.                                                      | Revisão de fronteira app→contracts; testes de ação/validação/autorização; verificação de imports/client bundle; critérios de cache/state documentados.                     |
| **ADR-0009 — Analytics, Telemetry and Educational Insights**   | Analytics assíncrono, derivado de eventos, eventualmente consistente, minimizado, school-scoped e nunca fonte transacional; reconstruibilidade e privacidade.                                                                          | Em mudanças em eventos que possam alimentar Analytics, projeções, relatórios, telemetry ou coleta externa; antes de habilitar fornecedor externo. | Contract/privacy tests; ownership da projeção; validação de `schoolId`; minimização, retenção/consentimento e autorização documentadas; ausência de leitura OLTP indevida. |
| **ADR-0010 — Frontend Architecture and UI Composition**        | Composição visual feature-based, design system, acessibilidade e responsividade; regras de comportamento/state/BFF permanecem sob ADR-0005.                                                                                            | Em mudança de UI compartilhada, primitives, tokens, layout, acessibilidade ou feature presentation.                                               | Testes visuais/funcionais adequados ao componente; checklist acessibilidade/responsividade; confirmação de que UI não contém regra de domínio.                             |

### Governança do status

- Manter a diferença entre `Proposed` e `Accepted`: presença no baseline selecionado não é prova de sign-off.
- Registrar os deciders/aprovadores, data e escopo ratificado no mecanismo de governança existente. Este plano não altera status ou conteúdo dos ADRs.
- Se implementação e ADR divergirem, abrir issue/decisão para análise e escalonamento; não criar exceção informal nem tratar código existente como precedente automático.
- Se uma decisão aprovada precisar mudar, seguir o processo de ADR vigente, registrando a decisão correspondente e sua relação/supersession sem editar silenciosamente a baseline existente.

## 3. Fronteiras de Módulos

Validação deve comprovar as regras conceituais abaixo sem prescrever sintaxe ou regras específicas de ferramenta.

### Ownership

- Todo agregado, tabela, repository, migration e fato de domínio tem owner explícito.
- Só o owner pode criar/alterar o estado autoritativo; outro módulo usa contrato público ou evento, não acesso direto a implementação/tabela.
- Package compartilhado contém somente tipos primitivos/contratos estáveis e metadados técnicos; não se torna owner de regra ou entidade de domínio.
- Eventos não transferem ownership nem concedem autorização; consumidor revalida permissões e escopo no próprio caso de uso.
- Para os módulos futuros, aplicar essa revisão quando entrarem no backlog, não criar packages só para satisfazer o mapa conceitual.

### Imports

- `apps/web` e `apps/api` são adapters de entrada; dependem de contratos públicos/casos de uso, não de repositories, entidades internas, Prisma ou tabelas.
- `domain` permanece independente de framework, banco, Auth.js ou UI.
- `application` orquestra casos de uso sobre domínio e ports; `infrastructure` implementa ports do owner.
- Imports entre módulos devem apontar à superfície pública de Application/contracts; imports de internals, barrels de conveniência ou repositories de outro owner são rejeitados.
- Client bundle não pode carregar Prisma, secrets, repositories, módulos server-only ou autoridade de sessão/tenant.

### Dependências e acoplamento

- Grafo síncrono é acíclico; dependências dirigem-se a contracts/facades autorizados e preservam os limites do ADR-0002.
- UI não compõe múltiplos repositories para fluxo de domínio. Coordenação pertence a caso de uso com owner explícito; efeitos secundários seguem eventos.
- Mudança de contrato público exige análise de consumidores, compatibilidade e testes; não alterar shared types como atalho para comunicação direta de domínio.
- PR deve explicar qualquer nova dependência entre packages/modules e demonstrar por que ela é permitida; dependência circular ou de implementação interna bloqueia merge.

### Como validar continuamente

- Executar fitness checks no grafo real dos apps/packages/modules que existem na branch.
- Manter testes negativos representativos: ciclo; import interno de outro módulo; acesso de UI a database/repository; shared package dependente de infraestrutura; dependência proibida entre módulos presentes.
- O teste negativo verifica que a validação rejeita a fixture; a fixture não permanece no grafo normal.
- Revisores confirmam o owner do dado/contrato, direção da dependência e se o comportamento deveria ser síncrono ou evento.
- Resultado verde sem testes negativos não é evidência suficiente de enforcement; até D3 ser resolvida, o gate atual é reconhecidamente incompleto.

## 4. Banco

### Ownership de dados

- `packages/database` fornece conexão/cliente e mecanismo comum de persistência; não define ownership de negócio.
- Schema, repositories, migrations e escrita permanecem atribuídos ao módulo owner.
- Relação física/FK entre owners é exceção justificada e não permite acesso direto nem cascata de negócio através da fronteira.
- Revisar no PR cada model/tabela/repository alterado: owner, chamadas permitidas, contrato público e efeito de tenant.

### Isolamento `schoolId`

- Todo dado escolar/tenant-owned tem `schoolId` explícito e não nulo conforme ADR-0003; global é escopo explicitamente global, não `schoolId` nulo ambíguo.
- Consultas, mutations, constraints, eventos, cache, logs e projeções preservam o escopo da escola.
- Valor da URL/form/store/token não prova autorização. O servidor resolve contexto e valida membership, recurso e permission para cada operação.
- Critérios de merge incluem testes negativos cross-tenant e de mismatched school/membership nos fluxos pertinentes.

### Migrations e forward-only

- Schema declarativo e migrations versionadas devem permanecer coerentes; SQL específico, como índice parcial, precisa continuar aplicado e coberto por teste.
- CI aplica migrations existentes em PostgreSQL 16 limpo por comando deploy não interativo; `db push` não é substituto.
- Produção é forward-only: sem rollback presumido de DDL/dados; defeitos são tratados por migration compensatória, restauração planejada ou versão anterior quando compatível.
- PR de migration inclui justificativa de ownership, compatibilidade expand/contract, impacto de dados, teste em banco limpo e plano operacional/backup apropriado antes de release.
- A sequência CI obrigatória inclui `db:validate`, deploy das migrations e `test:db`, com DB efêmero e zero skips por ausência de URL.

## 5. Eventos

- Cada evento tem owner/aggregate/produtor e consumidor conhecido catalogados; nome apenas conceitual em ADR não é implementação.
- Evento é publicado após commit, com payload mínimo e sem secrets/PII não aprovada.
- Envelope exige `eventId`, `eventName`, `aggregateId`, `aggregateType`, `occurredAt`, `schemaVersion`, `correlationId` e `causationId`; `schoolId` é requerido para fato escolar.
- `schemaVersion` é por evento. Mudança semântica ou estrutural incompatível exige nova versão e transição compatível explícita; não reescrever fatos publicados.
- Contract tests validam campos, tipos/formatos, payload, tenant scope, minimização e compatibilidade com versões/consumidores conhecidos.
- Consumidores são idempotentes e toleram duplicidade/ordem não garantida; isto é critério para consumers futuros, não alegação de consumer existente.
- CI bloqueia contrato inválido ou breaking change sem versão/testes atualizados.
- No estado atual, `MembershipCreated` e `RoleGranted` são contratos nomeados, mas publisher padrão descarta eventos. Não afirmar entrega até um publisher operacional estar integrado/testado.
- Event Foundation não exige broker, outbox/inbox, consumer ou Analytics, todos fora do escopo registrado da Sprint 1.

## 6. Segurança

### RBAC e permissões

- Autenticação estabelece identidade; autorização ocorre server-side a cada caso de uso com deny-by-default.
- `User` global não carrega role/school como fonte de autorização. Membership e grants têm escopo explícito; permissões derivam de grants/roles vigentes.
- A decisão considera sessão válida/não revogada, user ativo, permission atômica, escopo vigente, resource ownership/state e school/class/user context conforme operação.
- Não confiar em claims client/JWT antigos, `schoolId` recebido do cliente ou role escolhida na UI.
- Mudança de role/grant deve ter auditoria e tornar-se efetiva conforme regra de invalidação/frescura do ADR-0004; permissões privilegiadas não podem usar cache stale permissivo.
- Antes de declarar fluxo operacional, integrar Auth.js/adapters reais e executar testes DB/integração. Defaults fail-closed preservam negação, mas não demonstram operação pronta.

### Auditoria e dados sensíveis

- Ações relevantes registram ator/sistema, timestamp UTC, scope, school/membership quando pertinente, recurso, ação, resultado, motivo/código, correlation ID e aprovação/justificativa para break-glass quando aplicável.
- Audit trail é append-only, tenant-scoped e seu acesso também é auditado; não se confunde com logs operacionais ou projeções Analytics.
- Senha, hash, token, cookie/JWT, secret Auth.js, MFA secret, connection strings e PII não aprovada não entram em log/event/payload/traces/artifacts.
- Error response externa é genérica e correlacionável; detalhe técnico é redigido e restrito.
- Dependências e secrets têm gates CI; thresholds de `npm audit`/dependency review e processo de exceção devem ser registrados antes de bloquear merge.
- MFA é pré-condição de produção para roles globais/privilegiadas conforme ADR-0004; até sua implementação e validação, a liberação desses roles fica bloqueada.

## 7. Quality Gates

### Bloqueadores de merge

| Gate                                                | O que deve ser provado                                                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format:check`, lint, build e type checking coberto | Formato, qualidade e compilação passam nos workspaces aplicáveis. Type checking atualmente é embutido em lint/build conforme os documentos; não declarar passo independente já existente. |
| Unit tests                                          | Testes unitários/in-memory passam; skips DB permanecem visíveis e não contam como DB coverage.                                                                                            |
| `db:validate` + migrations                          | Schema válido e migrations versionadas aplicadas em PostgreSQL limpo com deploy forward-only, preservando constraints/indexes não expressos no Prisma.                                    |
| `test:db`                                           | PostgreSQL 16 descartável, variáveis corretas, Auth/Membership/API suites executadas, contagem > 0, nenhum skip por falta de configuração e sem cache de resultado DB.                    |
| Architecture fitness                                | Grafo real válido passa; fixtures negativas comprovam reprovação de fronteiras proibidas nos apps/packages/modules atuais.                                                                |
| Event contract tests                                | Envelope e contratos owner-owned válidos; breaking change sem nova versão/compatibilidade bloqueia.                                                                                       |
| Dependency review                                   | Dependências de PR analisadas; vulnerabilidades acima do threshold documentado bloqueiam, exceção exige owner, mitigação e expiração.                                                     |
| `npm audit`                                         | Executado contra lockfile do PR, conforme severidade acordada; erro/indisponibilidade não vira sucesso silencioso.                                                                        |
| Secret scanning                                     | Secret plausível no diff/repositório bloqueia; alerta mascara valor e exige revogação/rotação se exposto.                                                                                 |
| Smoke E2E                                           | Incluir como bloqueador quando o smoke Web está estável e configurado no workflow; só pode reivindicar a cobertura realmente exercitada. E2E API DB é coberto por `test:db`.              |

### Política de exceção

- Não permitir bypass verbal, branch protection verde por etapa ignorada ou `passWithNoTests` como aprovação de um gate obrigatório.
- Uma exceção requer escopo preciso, evidência, risco, mitigação alternativa, owner responsável e prazo de expiração; aprovações seguem o processo de governance existente.
- Exceções não alteram ADR nem convertem requisito em conformidade permanente. Ao expirar, o gate volta a bloquear até correção ou nova decisão formal.
- Se ferramenta/gate falhar, merge é bloqueado até restabelecimento ou exceção formal temporária; não desativar scanner/check para obter verde.

## 8. Critérios de Aceite

- [ ] ADR-0002, 0003, 0004, 0005, 0009 e 0010 têm para cada requisito aplicável uma evidência verificável, gate, owner e cadência definidos.
- [ ] Aprovação formal dos ADRs selecionados foi obtida ou o status Proposed permanece explicitamente comunicado; nenhum documento é apresentado como Accepted sem sign-off.
- [ ] Para cada PR, mudanças a módulos/dados/eventos/UI/Auth/Analytics identificam ADRs impactados na revisão e demonstram os gates correspondentes.
- [ ] Boundaries atuais de apps/packages/modules são exercitados por checks e fixtures negativas; ciclos/imports proibidos fazem a validação reprovar.
- [ ] Ownership de dados/tabelas/migrations tem owner declarado; escrita cruzada e Prisma/repository access além da fronteira são rejeitados.
- [ ] Operações tenant-aware validam `schoolId` no servidor; testes negativos cross-tenant e de ID substituído cobrem fluxos pertinentes.
- [ ] PostgreSQL 16 efêmero, migration deploy, `db:validate` e `test:db` passam no CI sem os 48 skips por ausência de configuração.
- [ ] Migrations de produção são versionadas/forward-only; migrations SQL específicas (incluindo índice parcial) são aplicadas/testadas; nenhum uso de `db push` substitui deploy.
- [ ] Envelope de evento completo, `schemaVersion` e contracts são validados; eventos existentes preservam ownership e semântica; não se declara consumer ou delivery inexistente.
- [ ] Alterações de Auth/RBAC preservam deny-by-default, sessão revogável, decisão server-side e trilha/audit requerida; cenários de autorização negativa são bloqueantes.
- [ ] Client UI não importa Prisma, repositories, internals ou secrets; leitura/mutação respeita ADR-0005 e composição visual ADR-0010.
- [ ] Analytics, se futuramente alterado, é assíncrono, derivado de eventos, minimizado, school-scoped e nunca usado como fonte transacional.
- [ ] `dependency review`, `npm audit` e secret scanning executam com política definida; nenhum secret aparece nos logs/artifacts.
- [ ] Exceções são registradas com owner, mitigação e expiração, e não permanecem silenciosas após prazo.
- [ ] Revisão periódica registra desvios, ADRs afetados, riscos, owner e data para correção; status de conformidade se baseia em evidência, não declaração.

## 9. Definition of Done — Architecture Enforcement

- [ ] Processo de ratificação/status dos seis ADRs é explícito; `Proposed` não é tratado como aprovação tácita.
- [ ] Matriz ADR→requisito→evidência→gate→owner está mantida no processo de governança do projeto e revisada em cada mudança relevante.
- [ ] Gates de arquitetura, banco, eventos, Auth, frontend, Analytics e segurança definidos neste plano são executados em PR/CI conforme escopo.
- [ ] Testes negativos demonstram que violações arquiteturais representativas são bloqueadas; gate verde não depende apenas de grafo sem fixtures.
- [ ] Todas as alterações de persistência têm ownership, tenant scope e migration forward-only aprovados/testados.
- [ ] Todas as alterações a contratos de evento têm owner, schemaVersion, minimização, compatibilidade e testes registrados.
- [ ] Toda operação protegida validada no escopo implementado verifica sessão/autorização/tenant no servidor e emite audit evidence pertinente.
- [ ] Superfícies web seguem contracts e separação de responsabilidade dos ADRs 0005/0010, sem regra de domínio ou acesso direto a dados no client.
- [ ] Analytics não lê OLTP como fonte de dashboard/fato nem recebe dados sensíveis sem finalidade/governança aprovada.
- [ ] Quality gates bloqueantes passam; banco/eventos/secrets não produzem falso verde por skips, cache, falha de ferramenta ou output vazio.
- [ ] Exceções têm proprietário, mitigação, aprovações e expiração, e são reavaliadas no ciclo de governança.
- [ ] Revisão periódica de aderência é registrada com evidências e ações corretivas; não substitui PR-level checks.
- [ ] Nenhuma arquitetura alternativa ou novo requisito de produto foi introduzido por este plano.

## 10. Resumo Executivo

1. **Como impedir violações do ADR-0002?** Definir owner por módulo, restringir consumo a contratos públicos, bloquear imports internos/ciclos por fitness checks e fixtures negativas, e validar ownership/event contracts em cada PR.
2. **Como impedir violações do ADR-0003?** Revisar owner e `schoolId` de cada dado/consulta, exigir testes cross-tenant, migration deploy em DB limpo e política forward-only; impedir `db push` de substituir migration.
3. **Como impedir violações do ADR-0004?** Exigir Auth.js/sessão revogável e autorização server-side deny-by-default, testar RBAC/scope/tenant negatives, auditar ações e segredos, e bloquear roles privilegiadas em produção sem MFA.
4. **Quais gates devem bloquear merge?** Format/lint/build/type checking coberto, unit tests, architecture fixtures, `db:validate` + deploy + `test:db`, event contract tests, dependency review, `npm audit`, secret scanning e smoke E2E quando incluído/estável.
5. **O que falta para Governance Done?** Ratificar formalmente a baseline sem alterar silenciosamente ADRs; implementar os gates faltantes (atualmente DB/events/boundaries/security), definir owners/thresholds/exceções, obter evidência por PR e manter revisão periódica de aderência.
