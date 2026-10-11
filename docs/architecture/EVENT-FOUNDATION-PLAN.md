# Plano executável da Event Foundation — MateMágico Champions

**Fontes oficiais do estado:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md), [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md) e [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md).  
**Referências de decisão:** [ADR-0002](ADRs/ADR-0002-module-boundaries.md), [ADR-0003](ADRs/ADR-0003-database-strategy.md), [ADR-0004](ADRs/ADR-0004-authentication-authorization.md) e [ADR-0009](ADRs/ADR-0009%20-%20Analytics,%20Telemetry%20and%20Educational%20Insights%20Strategy).  
**Escopo:** plano documental da fundação de contratos de evento nos módulos existentes Auth, Membership e School Context. Não reexecuta auditoria, não altera ADRs, não define módulos futuros e não inclui código, schemas de implementação, broker, consumer, outbox ou migrations.

> Os ADRs citados permanecem `Proposed`, conforme os documentos oficiais; são usados aqui como baseline selecionada, não como evidência de ratificação formal.

## 1. Estado Atual

Os documentos oficiais registram:

- `packages/events` existe como namespace de fundação, mas exporta somente `EventFoundationMetadata`; `correlationId` e `causationId` são opcionais.
- O pacote ainda não oferece contrato/envelope versionado completo, validação em runtime nem testes próprios de contrato.
- O módulo Membership possui eventos nomeados `MembershipCreated` e `RoleGranted` nos contratos/documentação existentes.
- O publisher provisório da composição descarta esses eventos. Assim, os nomes/contratos estão registrados, mas não há publicação operacional comprovada.
- Não há consumidor implementado de `@matemagico/events` nem consumidor Analytics ativo nos documentos de estado.
- O ADR-0002 exige comunicação assíncrona por eventos para efeitos secundários; consumidores devem tolerar duplicidade e ordenação não garantida e ser idempotentes.
- O plano de Sprint 1 pede envelope versionado, metadata obrigatória, testes de contrato e adaptação somente dos eventos Membership já existentes; exclui broker, consumers e outbox/inbox.
- O ADR-0003 prevê outbox/inbox e trilha operacional como mecanismo futuro de confiabilidade, não event sourcing.
- O ADR-0009 define Analytics como projeções assíncronas derivadas de eventos; Analytics não é fonte transacional e não participa de transações críticas.
- Auth e Membership são os módulos implementados no recorte existente. School Context é resolvido/validado por serviços de Membership; as operações documentadas são consultas/resoluções, não fatos de alteração de estado.

O estado atual, portanto, é de **contratos parciais e eventos Membership documentados**, não de um event bus operacional nem de uma integração Analytics.

## 2. Divergências Confirmadas

Esta lista se limita às lacunas identificadas em `FOUNDATION-AUDIT.md` e `STRUCTURE-REPORT.md`; P0/P1/P2 preservam as classificações desses documentos.

### P0

**Nenhuma lacuna de eventos foi classificada como P0** nas fontes oficiais.

### P1

| ID  | Lacuna confirmada                                                                                                                       | Efeito                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| E1  | `packages/events` não oferece envelope versionado e validado; `correlationId` e `causationId` ainda são opcionais.                      | Produtores e futuros consumidores não têm contrato comum verificável nem compatibilidade de schema garantida. |
| E2  | O publisher provisório de Membership descarta `MembershipCreated` e `RoleGranted`; não há consumidor de `@matemagico/events` observado. | Os eventos nomeados não são entregues operacionalmente; nenhum efeito secundário é comprovado.                |
| E3  | Não há testes de contrato próprios do pacote Events ou prova automatizada de compatibilidade dos eventos Membership.                    | Alterações nos metadados/payloads podem quebrar produtores/consumidores sem gate de CI.                       |

### P2

| ID  | Lacuna confirmada                                                                                                                                       | Limite                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| E4  | Não existem consumers/projeções Analytics nem telemetry store; os eventos de aprendizagem, competição e identidade do ADR-0009 são catálogo conceitual. | Não é escopo da Sprint 1/Event Foundation; nenhum consumer ou capacidade analítica deve ser criado por este plano.                                 |
| E5  | Não há outbox/inbox nem trilha operacional de entrega documentada como implementada.                                                                    | A confiabilidade de publicação/consumo é trabalho posterior previsto no ADR-0003; não se deve simular garantia de entrega nesta etapa de contrato. |

## 3. Inventário de Eventos

### 3.1 Eventos existentes registrados

“Existente” nesta tabela significa nome/contrato registrado nos documentos oficiais; não significa que o evento esteja sendo publicado com sucesso. Os documentos confirmam publisher provisório que descarta as publicações e nenhum consumidor conhecido implementado.

| Evento              | Owner                                                                                                                         | Aggregate                                                                    | Produtor registrado                                                                                                                   | Consumidores conhecidos                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MembershipCreated` | Membership, no recorte implementado; responsabilidade de acesso institucional no domínio Auth/Authorization conforme data map | `SchoolMembership` (referência do agregado owner; não serializar a entidade) | Contrato de publicação do módulo Membership associado ao fluxo de criação de Membership; o publisher padrão atual descarta a chamada. | Nenhum implementado. ADR-0004 cita uso autorizado para auditoria/dashboards; Analytics é consumidor conceitual, condicionado à minimização e governança. |
| `RoleGranted`       | Membership, no recorte implementado; concessão pertence a Auth/Authorization no modelo conceitual                             | `Grant`                                                                      | Contrato de publicação do módulo Membership associado ao fluxo de concessão de role; o publisher padrão atual descarta a chamada.     | Nenhum implementado. ADR-0004 cita auditoria/dashboards administrativos; Analytics é consumidor conceitual, condicionado à minimização e governança.     |

Não há evento de School Context registrado como evento publicado: `ResolveSchoolContext`, `ResolvePermissions` e `ValidateSchoolContext` são resoluções/validações de consulta no estado documentado. Não devem ser transformados em eventos apenas para preencher catálogo.

### 3.2 Nomes em catálogo de ADR — não são eventos implementados

Os itens a seguir aparecem como expectativas conceituais em ADR-0004/ADR-0009 e não como produtores publicados no estado dos três documentos oficiais. Não devem ser apresentados como eventos existentes:

| Nome/tema                                                                                                                                                                                                  | Owner/aggregate esperado, conforme as decisões                                                 | Produtor/consumidor conhecido                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginSucceeded` / `LoginFailed`                                                                                                                                                                           | Auth; fato de autenticação associado à identidade/sessão, sem incluir credencial               | ADR-0004 os lista para métricas de acesso; nenhum produtor de eventos ou consumer implementado confirmado.                                                                                         |
| `Logout` / `SessionRevoked`                                                                                                                                                                                | Auth; sessão                                                                                   | ADR-0004 cita logout/revogação para analytics restrito; nenhum produtor ou consumer implementado confirmado.                                                                                       |
| `PasswordResetCompleted`                                                                                                                                                                                   | Auth; fluxo de credencial/reset                                                                | ADR-0004 o cita como dimensão/evento de acesso; o estado auditado não confirma fluxo produtor nem publicação.                                                                                      |
| `UserRegistered` / `UserLoggedIn`                                                                                                                                                                          | Auth identity conforme a distinção do ADR-0004; não confundir com lifecycle de Users           | ADR-0009 lista ambos para Analytics; nenhum producer/consumer implementado. ADR-0004 pede distinguir `UserRegistered` de `UserCreated`/`UserActivated`, que pertencem a Users.                     |
| `UserActivated`                                                                                                                                                                                            | Users, não Auth; lifecycle de User                                                             | Citado por ADR-0004/0009; módulo Users e produtor não existem no estado auditado. Excluído do catálogo executável desta etapa.                                                                     |
| `MembershipRemoved`, `RoleRevoked`                                                                                                                                                                         | Auth/Authorization ou Membership conforme ownership do fluxo; Membership/Grant                 | Citados como dados administrativos/auditoria em ADR-0004; não constam entre os dois contratos Membership existentes confirmados. Não adicionar nesta Foundation sem contrato e produtor aprovados. |
| Eventos de aprendizagem/competição, como `AttemptCompleted`, `QuestionAnswered`, `StudyPathStarted`, `MockExamCompleted`, `ChampionshipFinished`, `RankingUpdated`, `BadgeEarned` e `CertificateGenerated` | Módulos owners de Attempts, Study Paths, Exams, Championships, Rankings, Badges e Certificates | Constam no catálogo de Analytics do ADR-0009, mas esses módulos/produtores não estão presentes no estado auditado. Não fazem parte deste plano.                                                    |

**Resolução de nomenclatura a aplicar ao registry antes de qualquer evento Auth:** ADR-0009 usa `UserLoggedIn`, enquanto ADR-0004 usa `LoginSucceeded`/`LoginFailed` e exige distinguir identidade Auth de lifecycle de Users. O registry deve escolher o nome canônico por fato e registrar aliases históricos, se aplicável; não publicar os dois nomes para o mesmo fato nem inferir que já existe consumidor. Essa reconciliação não altera ADRs.

## 4. Envelope Canônico

Todo evento de domínio/integração publicado sob a Event Foundation deve cumprir o seguinte contrato. As definições são conceituais; payloads e schemas de implementação ficam fora deste documento.

| Campo obrigatório | Regra contratual                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventId`         | Identificador único e estável desta ocorrência. Reentrega da mesma ocorrência conserva o mesmo ID; não é ID do agregado.                                          |
| `eventName`       | Nome canônico estável, em inglês e no passado, pertencente ao catálogo do módulo produtor. Um fato não recebe dois nomes equivalentes publicados simultaneamente. |
| `aggregateId`     | Identificador do agregado owner sobre o qual ocorreu o fato. Referência mínima; não serializar a entidade inteira.                                                |
| `aggregateType`   | Tipo estável e não ambíguo do agregado owner, coerente com o catálogo do evento.                                                                                  |
| `occurredAt`      | Instante em UTC, serializado em RFC 3339/ISO 8601; representa quando o fato ocorreu, não quando foi consumido.                                                    |
| `schemaVersion`   | Inteiro positivo da versão do payload/contrato daquele evento. Mudança incompatível requer nova versão.                                                           |
| `correlationId`   | Obrigatório; correlaciona o evento com a request/jornada que o originou.                                                                                          |
| `causationId`     | Obrigatório; identifica o comando/evento imediatamente causador. Não contém token ou segredo.                                                                     |

### Metadados adicionais condicionais

- `schoolId` é obrigatório quando o fato pertence a uma escola; pode ser omitido somente para fato explicitamente global. Nunca inferir o escopo por IP, email ou contexto implícito.
- `actorRef` pode identificar minimamente ator/sistema quando necessário, sem claims que concedam autorização.
- `payload` é obrigatório, específico do evento e minimizado. Deve validar conforme a versão; nunca inclui senha, hash, token, segredo MFA ou PII não aprovada.
- Campos de transporte/observabilidade não substituem os oito campos obrigatórios nem transferem ownership do fato.

### Propriedade e semântica

- O módulo produtor é a autoridade do significado, agregado e payload; `packages/events` fornece somente contrato técnico comum e validação.
- Evento registra fato após commit. Consumidores não usam sua presença para conceder autorização sem revalidar as regras aplicáveis.
- Consumidores toleram duplicidade e ordenação não garantida; processamento deve ser idempotente.
- Eventos e metadados devem preservar escopo escolar e minimização de dados.

## 5. Estratégia de Versionamento

### Compatibilidade

- `schemaVersion` é versionado por evento, não uma versão global do event bus.
- Consumidores devem aceitar a versão publicada explicitamente e tolerar adição de campos opcionais que não alterem semântica.
- Remover/renomear campo, tornar opcional um campo obrigatório, alterar tipo/formato, alterar significado ou mudar a semântica do evento é incompatível.
- A mesma versão não pode representar dois contratos semânticos diferentes.
- Mudanças do envelope comum são avaliadas separadamente dos payloads de domínio; não devem forçar ownership dos payloads para `packages/events`.

### Evolução

1. O owner propõe a alteração, seus campos minimizados, impacto de tenant e compatibilidade.
2. Contract tests validam produtor e consumidores conhecidos para a versão em vigor.
3. Mudança aditiva compatível pode permanecer na mesma versão somente quando consumidores antigos a ignorarem sem mudança de comportamento.
4. Mudança incompatível cria nova versão positiva do schema do evento; produtor e consumidor fazem transição explícita com janela de coexistência quando necessário.
5. O registry registra owner, agregado, produtor, consumidores conhecidos, finalidade, versão atual, versão deprecada e status de publicação.
6. A Foundation inicial não cria consumidores, mecanismo de replay, outbox ou migração de payload persistido.

### Depreciação

- Marcar versão/evento como deprecated no registry com motivo, owner responsável e consumidores conhecidos.
- Manter leitura/compatibilidade enquanto consumidores suportados ainda dependam da versão anterior.
- Remover publicação/validação de versão antiga somente após confirmar ausência de consumidores ativos e atualizar testes/contratos.
- Nunca reutilizar nome/versão depreciados com outro significado.

### Rollback

- Eventos já publicados representam fatos imutáveis: não editar, apagar nem reescrever seu payload para simular rollback.
- Se uma publicação ou schema de aplicação estiver defeituoso, reverter código compatível quando seguro e corrigir por uma nova versão/ação compensatória aprovada; preservar os IDs e o histórico do fato original.
- Não assumir transação de outbox, replay ou garantia exactly-once: tais mecanismos não estão implementados no estado atual e ficam fora desta Foundation.
- Para consumers futuros, deduplicação/idempotência e tolerância à ordem são requisitos do ADR-0002; a política de recuperação operacional será definida quando houver consumer/outbox.

## 6. Catálogo Inicial

O catálogo abaixo delimita nomes/fatos para o trabalho de Event Foundation sem declarar que estão implementados. Inclui os dois eventos Membership já registrados e um conjunto mínimo de fatos Auth derivados dos fluxos existentes e dos nomes explicitamente citados nos ADRs. Todo nome Auth deve ser confirmado no registry/contract tests antes de publicação; isso resolve a nomenclatura em vez de duplicar eventos.

### Auth

| Evento canônico planejado | Estado                                                                        | Aggregate                                                                       | Produtor previsto                                               | Observação                                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginSucceeded`          | Catálogo conceitual ADR-0004; não confirmado publicado                        | Auth session ou identidade Auth, conforme decisão do contrato e do fato         | Fluxo Auth de autenticação, após sucesso                        | Não levar email bruto, credencial ou token. Usar como nome canônico para fato de sucesso; documentar relação com `UserLoggedIn` listado no ADR-0009 antes de habilitar Analytics.           |
| `LoginFailed`             | Catálogo conceitual ADR-0004; não confirmado publicado                        | Auth identity/account, minimizado; evitar criar identidade enumerável no evento | Fluxo Auth de autenticação, após falha classificável            | Categoria de falha apenas; nunca credencial, hash ou email bruto.                                                                                                                           |
| `Logout`                  | Fluxo Auth existente; evento conceitual em ADR-0004, não confirmado publicado | Auth session                                                                    | Logout/revogação de sessão                                      | Registrar apenas o fato necessário; ADR-0004 também menciona `SessionRevoked`; o registry deve decidir se revogação é tipo próprio ou dimensão de `Logout` segundo semântica, sem duplicar. |
| `SessionRevoked`          | Revogação de sessão existe como operação; evento não confirmado publicado     | Auth session                                                                    | Revoke session, se for mantido como evento distinto de `Logout` | Fato administrativo/segurança; não incluir token. Necessidade e distinção de `Logout` devem ficar explícitas nos testes de contrato.                                                        |

`UserRegistered`, `PasswordResetCompleted` e lifecycle `UserActivated` não são parte do mínimo executável dos módulos/fatos confirmados: registro/reset completos e o módulo Users não estão confirmados como produtores no estado auditado. Permanecem referências conceituais dos ADRs, sem implementação nesta etapa.

### Membership

| Evento canônico planejado | Estado                                                          | Aggregate          | Produtor previsto                     | Observação                                                                                             |
| ------------------------- | --------------------------------------------------------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `MembershipCreated`       | Evento já nomeado/contrato existente; publisher padrão descarta | `SchoolMembership` | Fluxo Membership de criação           | Preservar nome, semântica e payload owner; garantir `schoolId` quando escopo escolar.                  |
| `RoleGranted`             | Evento já nomeado/contrato existente; publisher padrão descarta | `Grant`            | Fluxo Membership de concessão de role | Preservar nome, semântica e payload owner; não incluir dados que façam o evento autorização por si só. |

`MembershipActivated`, `MembershipRemoved` e `RoleRevoked` não são adicionados como novos contratos nesta Foundation, pois os documentos oficiais de estado só confirmam os dois nomes acima como eventos Membership existentes. Se forem requeridos pelo ciclo de vida, deverão ser propostos pelo owner e aprovados com produtor, momento de emissão e consumidor/uso definidos, em trabalho próprio.

### School Context

**Catálogo de eventos: nenhum.** `ResolveSchoolContext`, `ResolvePermissions` e `ValidateSchoolContext` são operações de leitura/validação e não produzem um fato de domínio que justifique evento. O contexto é derivado de sessão, membership e escola vigente; emitir evento em cada resolução criaria telemetria de leitura, não evento de lifecycle. Não introduzir `SchoolContextResolved` ou `SchoolContextValidated` nesta fundação.

## 7. Testes de Contrato

### Escopo

- `packages/events`: validação do envelope comum e das invariantes dos oito campos obrigatórios.
- `packages/modules/membership`: contratos de `MembershipCreated` e `RoleGranted`, com payloads mantidos no owner.
- Auth: contract tests somente para eventos Auth selecionados e publicados em uma etapa aprovada; eventos conceituais ainda sem produtor não podem contar como teste de produtor.
- School Context: teste de que suas operações de resolução/validação não introduzem publicação de evento sem fato de lifecycle; não exige contrato de evento.
- Consumidores Analytics não são escopo porque nenhum está implementado e não se deve criar capacidade nova nesta fundação.

### Critérios

- Envelope válido e payload válido aceitos pela versão declarada.
- Ausência ou valor inválido de qualquer campo obrigatório rejeitado: ID, nome, aggregate ID/type, timestamp, versão, correlation e causation.
- `occurredAt` aceito somente em formato UTC acordado; `schemaVersion` é inteiro positivo.
- `schoolId` presente nos eventos tenant-scoped e ausente apenas quando o contrato classifica o fato explicitamente como global.
- Payloads de Membership mantêm ownership e não serializam agregado/repository; payload inválido ou não minimizado é rejeitado.
- Nenhum payload inclui senha, hash, token, segredo MFA ou PII não aprovada; metadados não contêm claims que autorizem operação.
- Alteração incompatível falha no contract test até versão nova aprovada; mudanças aditivas opcionais não quebram consumidor de referência.
- Um mesmo fato não publica dois aliases/names concorrentes.
- Para produtores Membership, testes provam que a chamada de publicação recebe o evento/contrato esperado; a configuração provisória que descarta publicações não pode ser tomada como evidência de entrega.

### Validações e evidência

- Executar unit/contract tests do pacote Events e do owner Membership como parte dos quality gates de CI.
- Incluir casos positivos e negativos para envelope e payload.
- Registrar tabela/registry versionado com owner, aggregate type, nome, versão, producer, consumidores conhecidos e classificação tenant/global.
- Não exigir persistência de eventos, reentrega/replay, broker, consumer ou performance nesta etapa; não estão implementados nem fazem parte do escopo de contrato.

## 8. Integração com Analytics

Somente capacidades já permitidas por ADR-0002, ADR-0004 e ADR-0009:

- Analytics consome eventos de forma assíncrona para construir projeções/read models; não participa da transação crítica e não é fonte de verdade.
- Dashboards não consultam diretamente tabelas OLTP de alta frequência; métricas derivadas precisam ser reconstruíveis a partir dos fatos.
- Cada consumer futuro deve ser idempotente e tolerar duplicidade e ordem não garantida; a projeção deve preservar `schoolId` onde o fato é escolar.
- Para Auth, ADR-0004 permite métricas agregadas de login success/failure, logout, revogação, reset e concessões/memberships administrativas, com stream de autenticação restrito. `audit_logs` é evidência detalhada; Analytics recebe apenas projeção mínima e eventualmente consistente.
- É proibido enviar senha, hash, token, email bruto ou segredo MFA para Analytics/telemetria externa. Usar referência pseudonimizada ou agregação conforme finalidade; `schoolId` somente para métrica institucional autorizada.
- Consentimento, retenção, anonimização e base legal devem ser definidos antes de encaminhar eventos de identidade, sobretudo de menores, a PostHog/serviço externo.
- `MembershipCreated` e `RoleGranted` são somente eventos potencialmente relevantes ao uso administrativo descrito em ADR-0004; nenhum consumidor Analytics está implementado ou habilitado no estado auditado.
- Não criar Analytics, telemetria, telemetry store, projeções, dashboards, consumers, outbox, broker ou nova retenção como parte da Event Foundation.

## 9. Critérios de Aceite

- [ ] O inventário diferencia sem ambiguidade contratos existentes, eventos apenas conceituais dos ADRs e capacidades futuras sem produtor.
- [ ] Registry inicial registra `MembershipCreated` e `RoleGranted`, owners, aggregates, produtores, versão e “nenhum consumidor implementado”, sem afirmar entrega operacional atual.
- [ ] A divergência `UserLoggedIn` versus `LoginSucceeded` está registrada como decisão de nomenclatura a resolver antes de publicação; não há evento duplicado para o mesmo fato.
- [ ] O contrato comum requer os oito campos: `eventId`, `eventName`, `aggregateId`, `aggregateType`, `occurredAt`, `schemaVersion`, `correlationId` e `causationId`.
- [ ] `schoolId`, `actorRef` e `payload` seguem as condições de escopo e minimização documentadas.
- [ ] Eventos Membership permanecem sob ownership de Membership/Auth-Authorization; `packages/events` não vira owner de payload de domínio.
- [ ] Testes de contrato cobrem aceitação/rejeição do envelope e payload, integridade de versões e minimização de dados.
- [ ] A adaptação não altera silenciosamente o nome ou a semântica de `MembershipCreated`/`RoleGranted`.
- [ ] Não são introduzidos eventos de School Context para operações de leitura/validação.
- [ ] Nenhum módulo futuro, consumidor Analytics, broker, outbox/inbox, event store, migration ou feature de produto é implementado pela etapa de contrato.
- [ ] Quality gates executam testes de contrato dos owners; um contrato inválido ou breaking change sem bump/compatibilidade faz CI falhar.

## 10. Definition of Done — Event Foundation

- [ ] Envelope comum com os oito campos obrigatórios e validação de runtime está publicado pela superfície de `@matemagico/events`.
- [ ] Owner, aggregate, producer, consumidores conhecidos, versão e semântica de cada evento do catálogo inicial estão registrados.
- [ ] `MembershipCreated` e `RoleGranted` têm contratos de produtor compatíveis e tests; publisher operacional não é confundido com o publisher provisório que descarta.
- [ ] Nenhum consumer é declarado existente sem evidência; consumers potenciais de Analytics permanecem identificados como conceituais.
- [ ] Política de evolução, depreciação e rollback imutável/forward-corrective é documentada e coberta pelos testes aplicáveis.
- [ ] Contratos proíbem segredos e payloads não minimizados e preservam `schoolId` para fatos escolares.
- [ ] Nomenclatura Auth está resolvida no registry antes de qualquer publicação Auth; não há duplicidade entre `UserLoggedIn` e `LoginSucceeded`.
- [ ] School Context permanece sem eventos enquanto suas operações forem consultas/validações, sem fato de estado correspondente.
- [ ] Nenhum schema de implementação, banco de eventos, migration, broker, consumer, Analytics ou outbox foi incluído nesta entrega.
- [ ] Testes de contrato passam no CI e regressões incompatíveis bloqueiam o merge.

## 11. Resumo Executivo

1. **Quais eventos existem hoje?** Os documentos registram `MembershipCreated` e `RoleGranted`; o publisher padrão os descarta e não há consumidores implementados. Os eventos do ADR-0009 são conceituais, não publicados.
2. **Quais eventos faltam?** Falta envelope validado/versionado e testes. Auth tem fatos conceituais (`LoginSucceeded`, `LoginFailed`, `Logout`/`SessionRevoked`) sem publicação confirmada; o nome `UserLoggedIn` precisa ser reconciliado. School Context não precisa de eventos para resolução/validação.
3. **Qual será o envelope padrão?** `eventId`, `eventName`, `aggregateId`, `aggregateType`, `occurredAt`, `schemaVersion`, `correlationId` e `causationId`; `schoolId` condicional e payload mínimo owner-owned.
4. **Como versionar eventos?** Versão inteira positiva por evento; adições opcionais compatíveis podem manter a versão, mudanças de semântica/forma incompatíveis exigem nova versão, transição explícita e depreciação registrada. Eventos publicados não são reescritos; correções são forward/compensatórias.
5. **Como validar contratos?** Contract tests positivos e negativos verificam envelope, versão, payload, scope/`schoolId`, privacidade e compatibilidade; os testes do owner Membership devem confirmar `MembershipCreated` e `RoleGranted` sem alegar consumidor/entrega inexistentes.
