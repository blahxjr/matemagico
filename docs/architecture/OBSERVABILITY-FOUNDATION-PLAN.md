# Plano de execução da Observability Foundation — MateMágico Champions

**Fontes oficiais:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md), [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md), [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md), [EVENT-FOUNDATION-PLAN.md](EVENT-FOUNDATION-PLAN.md), [SECURITY-FOUNDATION-PLAN.md](SECURITY-FOUNDATION-PLAN.md) e [CI-FOUNDATION-PLAN.md](CI-FOUNDATION-PLAN.md).  
**Referências existentes:** ADR-0002, ADR-0004, ADR-0009 e o baseline comum de observabilidade referenciado pelo ADR-0004.  
**Escopo:** plano documental para a fundação de observabilidade da Onda 1. Não reexecuta auditorias, não altera ADRs e não inclui código, dashboards, configuração, provider ou pipeline.

> Esta fundação define correlação, logging redigido, eventos e métricas operacionais mínimos. Os documentos oficiais registram os ADRs como `Proposed`; este plano trata-os como baseline selecionada, não como prova de ratificação ou implementação.

## 1. Estado Atual

Somente fatos registrados nos documentos oficiais:

- A dívida técnica `Observabilidade` é descrita como **sem logs estruturados, métricas ou tracing nos serviços**.
- Existe `packages/logger`, mas as fontes oficiais não registram integração desse package com todos os serviços nem instrumentação operacional uniforme.
- O ADR-0004 referencia baseline comum com OpenTelemetry, Correlation ID, structured logging redigido, error tracking, metrics e tracing.
- Auth/Membership tem serviços, testes e APIs, mas o fluxo real Auth.js/adapters operacionais não está integrado; a composição padrão usa portas fail-closed.
- O CI não provisiona PostgreSQL, não aplica migrations e não executa as 48 suítes DB puladas. Isso impede obter evidência operacional confiável dos fluxos de persistência no pipeline.
- A fundação de eventos não tem envelope completo/validado. Os únicos eventos Membership nomeados no estado auditado são `MembershipCreated` e `RoleGranted`, mas o publisher provisório os descarta e não há consumers conhecidos implementados.
- O contrato proposto para eventos exige `eventId`, `eventName`, `aggregateId`, `aggregateType`, `occurredAt`, `schemaVersion`, `correlationId` e `causationId`; `schoolId` é condicional ao escopo escolar.
- Auth tem políticas conceituais para sessões revogáveis, decisões server-side deny-by-default, eventos de auditoria e métricas de login/segurança; não há evidência de observabilidade instrumentada dessas políticas.
- ADR-0009 define Analytics assíncrono por projeções derivadas de eventos, não como fonte transacional; não existe Analytics/consumer ativo no estado auditado.
- A auditoria não foi pentest, revisão jurídica, teste de carga nem certificação de produção; observabilidade não substitui essas avaliações.

## 2. Inventário de Telemetria

| Sinal                      | O que existe/documentado                                                                                                                                                                | O que não existe ou não está comprovado                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logs**                   | Package `packages/logger`; ADR-0004 define necessidade de logs estruturados/redigidos e audit trail append-only separado.                                                               | Não há evidência de logging estruturado consistente nos serviços, campos de correlação aplicados, redaction verificada ou integração operacional do logger. TECH-DEBT registra explicitamente ausência de structured logs nos serviços. |
| **Métricas**               | ADR-0004 enumera medidas de Auth/segurança; ADR-0009 prevê métricas operacionais e pedagógicas provenientes de eventos.                                                                 | Nenhuma métrica operacional instrumentada ou coletor/exportador está confirmada. Não há dashboards, alerting ou série temporal operacional documentada.                                                                                 |
| **Eventos**                | Contratos Membership `MembershipCreated` e `RoleGranted` são registrados; `@matemagico/events` tem metadata-base parcial.                                                               | Publisher padrão descarta eventos; envelope não está versionado/validado; não há consumer implementado ou pipeline de entrega observado.                                                                                                |
| **Tracing**                | Baseline comum referenciada no ADR-0004 aponta OpenTelemetry/tracing; ADRs requerem correlation ID.                                                                                     | Tracing distribuído, spans, propagação de contexto, exportação e sampling não estão comprovados.                                                                                                                                        |
| **Auditoria de segurança** | ADR-0004 especifica `audit_logs` append-only conceitual e campos de ator/tempo/escopo/ação/resultado/correlação. TECH-DEBT registra lacunas de trilha de ativação, grants e revogações. | Não há evidência de trilha operacional completa para esses atos, sua retenção ou consulta restrita. Não confundir auditoria conceitual com log existente.                                                                               |

## 3. Correlação

### Identificadores mínimos

| Campo           | Regra de uso                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestId`     | Identifica uma requisição de entrada. Deve ser gerado/validado na fronteira confiável e permanecer estável em seus logs/spans. Um valor fornecido por cliente não é confiável por si só; deve ser validado ou substituído.                                                                                          |
| `correlationId` | Identifica uma jornada/fluxo que pode atravessar requests, módulos ou o ciclo de vida de eventos. Obrigatório no envelope dos eventos segundo EVENT-FOUNDATION-PLAN.md. Em um fluxo de request única pode ser igual ao `requestId`; quando o fluxo é mais amplo, mantém identidade própria e associação rastreável. |
| `causationId`   | Identifica o comando ou evento imediatamente anterior que causou o fato atual. Obrigatório em evento publicado; em logs de request pode ficar ausente quando não houver causalidade anterior identificável. Nunca contém token ou segredo.                                                                          |
| `userId`        | Registrar apenas após autenticação e quando necessário para diagnóstico/auditoria autorizada. Usar referência estável interna com acesso restrito; não substituir por email. Em login falho/anônimo, não inventar um user ID nem registrar email bruto.                                                             |
| `schoolId`      | Incluir somente quando o recurso/fato for escolar e o escopo tiver sido validado server-side. Nunca inferir da URL, IP, email ou dado não confiável do cliente. Global/pessoal sem escola não recebe valor artificial.                                                                                              |
| `module`        | Nome estável do bounded context/componente responsável, por exemplo `auth`, `membership`, `api`, `database` ou `web`, conforme owner da operação. Evitar campo livre com valores variáveis.                                                                                                                         |

### Propagação

1. Na entrada HTTP, estabelecer `requestId`; correlacionar os logs estruturados e spans daquele request.
2. Dentro de uma jornada, preservar `correlationId` através das chamadas aos casos de uso/ports sem transportar credenciais ou claims de autorização.
3. No evento, preencher `correlationId` da jornada e `causationId` da causa direta; `eventId` permanece identificador distinto da ocorrência.
4. Nos eventos futuros consumidos assincronamente, preservar esses identificadores em logs e spans do consumer; retries/reentregas preservam `eventId` para deduplicação e correlation.
5. Incluir `userId`/`schoolId` apenas conforme contexto autorizado e minimização; `module` deve permitir atribuição do local técnico do erro.
6. Se não houver identidade ou escola confiável, omitir esses campos; nunca fabricar contexto para completar telemetria.

Esses identificadores são para diagnóstico/correlação, não autorizam acesso. Claims de JWT, `schoolId` recebido do cliente ou correlation IDs não substituem autenticação/autorização.

## 4. Logging

### Logs obrigatórios

- Início/fim e resultado de requests relevantes, usando `requestId`, `correlationId`, `module`, operação normalizada, status/resultado e duração.
- Erros de aplicação/infraestrutura com classe/código estável, resultado (`success`, `denied`, `failure`), severidade apropriada, correlation IDs e stack/contexto técnico somente em destino restrito e redigido.
- Falhas de dependência (incluindo DB unavailable/timeout), readiness não pronta e erros de migration/teste nos respectivos ambientes, sem connection strings.
- Decisões de autenticação/autorização relevantes como resultado/categoria, sem registrar credenciais; negados devem ter categoria suficiente para investigação sem revelar existência de email, escola, membership ou role ao usuário.
- Atos de segurança/auditoria definidos pelo ADR-0004: ator/sistema, instante UTC, scope e `schoolId`/`membershipId` quando aplicáveis, recurso, ação, resultado, motivo/código e correlation/request ID.
- Mudança de estado de sessão e ações administrativas privilegiadas quando o fluxo correspondente existir: login success/failure agregado, logout/revogação, reset/troca, grants/revogações, step-up/break-glass/MFA quando implementados.
- Falhas/versões inválidas de contratos de evento e emissão/consumo quando houver publisher/consumer operacional. No estado atual, publisher discard deve ser registrado como estado de composição/teste se diagnosticamente útil, nunca como entrega bem-sucedida.

### Logs proibidos

- Senha, hash Argon2id, token, cookie, JWT, `AUTH_SECRET`, segredo MFA, URL de reset/convite/verificação ou qualquer credential.
- Connection strings completas (`DATABASE_URL`, `TEST_DATABASE_URL`) ou credenciais de SMTP/provider.
- Email bruto, PII de estudante, payload privado de resposta ou identificadores de dispositivo persistentes sem finalidade aprovada.
- Claims de role/permission/school tratados como autorização válida sem reconsulta server-side.
- Payload completo de agregado/evento quando o contrato só precisa de referências mínimas.
- Valores sensíveis em audit diff; stack trace ou request body enviado ao cliente.

### PII, pseudonimização e retenção

- Coletar apenas o necessário à finalidade operacional/auditável. Identificadores `userId` e `schoolId` também são dados sensíveis de contexto e devem ter acesso/retention compatíveis com o uso.
- Em métricas e analytics, preferir contagem/agregação ou ID pseudônimo rotativo. Não enviar email bruto, senha, token ou MFA secret para Analytics externo.
- `schoolId` pode ser usado em métrica institucional somente quando autorizado e com controles de células pequenas; incluí-lo em logs de diagnóstico apenas quando o request está validado no escopo daquela escola.
- `audit_logs` detalhados permanecem first-party, append-only, tenant-scoped e com acesso auditado. Logs operacionais não substituem essa trilha.
- Definir política de retenção, anonimização, consentimento e base legal antes de ligar eventos de identidade a serviço externo, especialmente considerando menores.
- Erros ao usuário devem ser genéricos, acompanhados de correlation ID; detalhes técnicos permanecem em observabilidade redigida.

## 5. Eventos

Usar apenas o catálogo/contrato descritos no EVENT-FOUNDATION-PLAN.md:

- `MembershipCreated` e `RoleGranted` são os únicos eventos de domínio nomeados como existentes nos documentos de estado. Atualmente o publisher provisório os descarta e não existe consumer implementado comprovado.
- O envelope futuro exige `eventId`, `eventName`, `aggregateId`, `aggregateType`, `occurredAt`, `schemaVersion`, `correlationId` e `causationId`; `schoolId` acompanha fatos escolares após validação.
- Até existir publisher efetivo, não registrar ou afirmar “evento entregue”. Diferenciar resultado de chamada ao port, publicação real, falha e descarte/default, conforme o que o componente consegue observar.
- Quando emissão real for implementada, observar sucesso/falha, nome e versão do evento, `eventId`, owner/module, aggregate type/id em forma minimizada, `correlationId`, `causationId`, `schoolId` autorizado quando aplicável e duração da operação.
- Para eventos inválidos, registrar nome/versão/código de validação e IDs de correlação; não copiar payload inteiro para logs. A ocorrência de evento publicado é após commit conforme ADR-0002.
- Distinguir `eventId` de `causationId`; preservar o mesmo `eventId` em reentrega. Consumidores futuros serão idempotentes e tolerarão duplicidade/ordem não garantida.
- Não criar broker, consumer, outbox/inbox, replay, event store ou evento de School Context nesta fundação. `ResolveSchoolContext`, `ResolvePermissions` e `ValidateSchoolContext` são operações de leitura/validação e não justificam evento.
- Eventos Auth listados em ADRs continuam conceituais até o owner os selecionar e implementar; não observar como se fossem publicados.

## 6. Integração com Analytics

Aplicar somente as regras dos ADR-0002, ADR-0004 e ADR-0009:

- Analytics é consumidor assíncrono de eventos e proprietário apenas de projeções, agregações, métricas, relatórios e indicadores; não é owner dos fatos transacionais.
- Dashboards/projeções são derivados de eventos; não consultar diretamente tabelas transacionais de alta frequência nem participar de transações críticas.
- Analytics recebe somente os eventos/dimensões necessários para métricas de acesso, engajamento/retention e segurança operacional autorizada, com payload minimizado e eventualmente consistente.
- Contagens de sucesso/falha de login, logout, membership/roles e atividade podem ser agregadas; sem senha, hash, token, email bruto ou fingerprint persistente.
- Para agregados escolares, preservar `schoolId` somente em contexto autorizado e aplicar controle de pequenas células; não inferir escola.
- A trilha detalhada de auditoria permanece distinta de projeção Analytics. Eventos de Auth são stream restrito; ferramentas externas recebem, no máximo, coortes/contagens aprovadas.
- Não criar Analytics, consumidores, dashboards, projeções, telemetria externa ou retenção nova como parte desta fundação. Antes de integração externa de identidade, definir consentimento, retenção, anonimização e base legal.

## 7. Métricas Operacionais

Métricas mínimas para Foundation Done, limitadas à baseline comum de observabilidade e às medições de Auth/segurança descritas no ADR-0004:

| Métrica                                                                 | Dimensões seguras                                                 | Utilidade/limite                                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contagem de requests e resultados por módulo/operação/status            | `module`, operação normalizada, classe de status/resultado        | Identifica erros e volume; sem URL com IDs livres, email ou payload.                                                                                    |
| Duração/latência de requests e casos de uso selecionados                | `module`, operação normalizada, resultado                         | Apoia diagnóstico e decisão operacional; objetivos de latência dos ADRs não são considerados medidos sem amostragem/evidência apropriada.               |
| Erros de aplicação/dependência e falhas de DB                           | módulo, código/categoria, dependency name normalizado, ambiente   | Permite identificar falhas sem expor connection strings ou IDs de alta cardinalidade.                                                                   |
| Estado de health/readiness de dependências                              | componente/módulo, estado                                         | Distingue processo vivo de serviço capaz de atender requests; não inclui secrets.                                                                       |
| Login success/failure agregado                                          | resultado/categoria e período; sem email bruto/user ID como label | Alinha a ADR-0004; prevenir enumeração e cardinalidade excessiva.                                                                                       |
| Rate-limit, bloqueio temporário e denies por categoria                  | ação/categoria, módulo, resultado                                 | Identifica abuso e falhas de autorização sem expor contador sensível ou identidade em séries temporais.                                                 |
| Revogação/estado de sessão e duração de decisão de autorização          | resultado/categoria, módulo                                       | Medições citadas pelo ADR-0004; não armazenar token nem role/permission como label de alta cardinalidade.                                               |
| Resultado de validação/dispatch de evento, quando houver publisher real | `eventName`, `schemaVersion`, owner/module, resultado/categoria   | Distinguir invalid/accepted/failed; não afirmar entrega quando há apenas publisher discard. Não exige broker/consumer nesta fundação.                   |
| Pipeline test/DB/contract gate                                          | job/gate, resultado, contagens de execução/skips                  | Observabilidade da própria Foundation: demonstrar que suites executaram e alertar visualmente por falha; jamais transformar skip em métrica de sucesso. |

### Regras de cardinalidade e privacidade

- Não usar `userId`, `schoolId`, requestId, correlationId, eventId, email, IP bruto, membershipId ou aggregateId como labels de métricas.
- Esses IDs pertencem a logs/traces restritos quando necessários; agregação por escola só em consumer autorizado e conforme regras do ADR-0004/0009.
- Não definir SLO/SLA numérico ou metas de disponibilidade/performance novas neste plano. A auditoria ressalta que metas documentais não são resultados medidos.
- Métricas operacionais não substituem logs auditáveis, traces ou teste de carga.

## 8. Critérios de Aceite

- [ ] Estado documentado continua distinguindo packages existentes de sinais realmente instrumentados; existência de `packages/logger` não é apresentada como logging operacional completo.
- [ ] Cada request diagnosticável carrega `requestId` e `module`; correlation de jornada propaga `correlationId` quando aplicável.
- [ ] Eventos publicados incluem `correlationId` e `causationId` obrigatórios conforme envelope; chamadas descartadas não são reportadas como delivery success.
- [ ] `userId` é omitido para requests anônimos e não substituído por email; `schoolId` aparece apenas após resolução/validação server-side.
- [ ] Logs têm schema estruturado, timestamp, severidade, módulo, resultado/código e duração apropriados aos casos observados.
- [ ] Testes/revisões verificam redaction de senha, hash, token, cookie/JWT, `AUTH_SECRET`, MFA secret, URLs de conexão e PII não aprovada.
- [ ] Erros externos são genéricos e contêm correlation ID; detalhe interno é restrito/redigido.
- [ ] Audit trail é append-only, tenant-scoped e diferenciado de log operacional e projeção Analytics.
- [ ] Métricas mínimas de request, erro/dependência, readiness e Auth/segurança definidas acima são coletáveis por dimensão de baixa cardinalidade.
- [ ] IDs pessoais/técnicos não são labels métricas; `schoolId` não é inferido do cliente e métricas por escola respeitam autorização/pequenas células.
- [ ] Eventos observados preservam owner, aggregate references, version, scope e minimização; não se adicionam eventos de School Context para operações de leitura.
- [ ] Trace/log/metric não transmitem credentials, secrets ou payload privado a sistemas externos.
- [ ] Critérios de retenção/consentimento/base legal para telemetria externa de identidade são decididos antes de qualquer integração Analytics externa.
- [ ] Health/readiness, métricas e logs não são apresentados como prova de carga, segurança, DR ou prontidão de produção.

## 9. Definition of Done — Observability Foundation

- [ ] Propagação e formato de `requestId`, `correlationId`, `causationId`, `userId`, `schoolId` e `module` estão documentados e aplicados nos fluxos operacionais existentes.
- [ ] Logs estruturados/redigidos cobrem requests, falhas de aplicação/infra, dependências, decisões Auth relevantes e eventos efetivamente publicados.
- [ ] Segredos e PII proibida não aparecem em logs, traces, events, metrics labels, artifacts ou mensagens de erro externas.
- [ ] Correlação de erro vai da fronteira da request ao módulo/caso de uso e, quando evento é publicado, ao evento causal.
- [ ] `MembershipCreated`/`RoleGranted` são observáveis sem alegar entrega enquanto publisher for descartável; versões e IDs de evento seguem a Event Foundation.
- [ ] Métricas mínimas de requests, latência, erros/dependências, readiness e Auth/segurança são verificáveis sem labels de alta cardinalidade.
- [ ] Audit trail de segurança é diferenciado e protegido conforme ADR-0004; lacunas de ativação/Grant/revogação são tratadas no escopo próprio de auditoria.
- [ ] Analytics permanece assíncrono, minimizado, autorizado e não transacional; nenhuma capacidade de dashboard/consumer é criada como parte deste trabalho.
- [ ] Testes/review automatizado ou checklist verificável valida redaction e propagação de IDs.
- [ ] Os sinais suportam diagnóstico local e CI sem usar secrets de produção; retenção e acesso dos dados de observabilidade são definidos para cada ambiente.
- [ ] Não foram adicionados dashboards, metas SLO/SLA não aprovadas, novos eventos de domínio ou arquitetura de observabilidade diferente da baseline.
- [ ] A conclusão é reportada como Foundation técnica; não equivale a certificação, pentest, aprovação legal ou prova de capacidade de carga.

## 10. Resumo Executivo

1. **O que falta hoje?** Não há logs estruturados, métricas nem tracing demonstrados nos serviços; o logger existe sem cobertura operacional comprovada. Eventos são parciais, publisher Membership os descarta e não há consumers.
2. **Como rastrear requests?** Estabelecer `requestId` na entrada, propagar `correlationId` ao longo da jornada e registrar `module`, operação, resultado e duração; não confiar em ID fornecido pelo cliente sem validação.
3. **Como rastrear eventos?** Usar o envelope canônico com `eventId`, nome/versão, aggregate refs, `occurredAt`, `correlationId` e `causationId`; observar validação/publicação/falha sem declarar entrega quando o publisher descarta.
4. **Como rastrear erros?** Logs estruturados e redigidos com código/categoria, severidade, resultado, module e IDs de correlação; erro externo genérico com correlation ID e detalhes restritos nos sinais internos.
5. **Como saber em qual escola ocorreu um problema?** Registrar `schoolId` somente quando o recurso é escolar e o contexto foi validado no servidor; nunca inferir do cliente, usar como label de alta cardinalidade ou expor em agregados Analytics não autorizados.
