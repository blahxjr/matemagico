# SPRINT1 EXECUTION PLAN

## Escopo e convenções

Este plano organiza apenas as capacidades **Auth, Session, Membership e School Context** já descritas nas fontes. Não prescreve implementação, persistência física, schema, API, frontend ou novo contrato externo.

- **Fato documentado** — definido em uma das fontes autorizadas.
- **Inferência** — dependência necessária para ordenar a validação, sem adicionar regra de domínio.
- **Recomendação** — gate ou sequência sugerida para execução segura.

**Limite documental:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`; a composição formal de algumas Aggregate Roots e a nomenclatura de eventos de login têm ressalvas. Este plano não ratifica ADRs nem decide essas ambiguidades por conta própria.

### Fontes

- [SPRINT1-BACKLOG.md](./SPRINT1-BACKLOG.md)
- [MVP-IMPLEMENTATION-BLUEPRINT.md](./MVP-IMPLEMENTATION-BLUEPRINT.md)
- [MVP-DOMAIN-MODEL.md](./MVP-DOMAIN-MODEL.md)
- [ADR-0002 — Module Boundaries](./ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](./ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](./ADRs/ADR-0004-authentication-authorization.md)

---

# EXECUTION PLAN

### Pré-condições transversais

Antes da execução técnica:

1. **Ratificar decisões bloqueadoras** de Auth/ownership e registrar o status dos ADRs; não inferir aprovação a partir deste plano.
2. **Confirmar o piloto**: escola e identidades/credenciais de teste existentes e aprovadas. Provisionamento operacional não concede membership ou papel automaticamente.
3. **Fixar os cenários de aceite** de login, sessão, membership e escopo escolar, incluindo negações. As durações de sessão propostas pelo ADR-0004 (8 horas absolutas, 30 minutos de inatividade) só são baseline de aceite se ratificadas.
4. **Reconciliar nomes de eventos** pertinentes ao Sprint. Não emitir aliases ou eventos novos; eventos não devem ser condição para autorizar uma operação.

### Passo 1 — Auth

**Objetivo:** autenticar uma identidade global por email/senha V1, sem transformar autenticação em autorização escolar.

**Fato documentado:** Auth possui credenciais e autenticação; Users é owner do perfil/identidade de produto. ADR-0004 propõe Auth.js Credentials Provider, credenciais verificadas no servidor, respostas genéricas e proteção contra enumeração.

**Artefatos necessários**

- Decisão ratificada sobre método V1 e elegibilidade de User/email para autenticação.
- Identidade, credencial e escola piloto provisionadas para testes.
- Cenários aprovados de sucesso, credencial inválida e conta inelegível.
- Critérios de não exposição de credenciais e respostas genéricas.

**Decisões necessárias**

- Confirmar a adoção das decisões de Auth constantes do ADR-0004.
- Confirmar em quais estados de User e verificação de email a autenticação é permitida.
- Confirmar requisitos aplicáveis de rate limiting e tratamento de falhas, sem inventar limites.
- Resolver nomenclatura canônica para fatos de autenticação, se forem publicados: catálogo principal documenta `UserLoggedIn` e `AuthenticationFailed`; aliases do ADR-0004 não estão confirmados como canônicos.

**Bloqueadores**

- ADR-0004 sem ratificação suficiente para adotar decisões de identidade/autenticação.
- Ausência de User/credencial de teste ou de regra de elegibilidade aprovada.
- Respostas ou logs que revelem existência da conta, senha ou segredo.

**Validação para avançar**

- Todos os cenários aprovados de credencial válida autenticam; credencial inválida ou conta inelegível não cria sessão.
- Falhas não permitem enumerar contas e não expõem segredos em logs/eventos.
- Login não cria SchoolMembership, não seleciona School e não atribui papel.
- O boundary é mantido: Auth não lê nem grava estado interno de Users ou Schools.

**Dependência para o passo seguinte:** Session só pode ser estabelecida a partir do resultado de autenticação válido. Esta sequência não significa que Auth possua uma Aggregate Root chamada `Login`.

### Passo 2 — Session

**Objetivo:** manter, validar, terminar e revogar a sessão conforme a estratégia V1 ratificada.

**Fato documentado:** ADR-0004 propõe Auth.js com JWT e registro server-side de sessão para revogação; sessão identifica o sujeito, não autorização permanente. Validação de sessão/usuário em operação protegida falha fechada quando necessária.

**Artefatos necessários**

- Fluxos de autenticação aprovados no CP1.
- Critérios de duração, inatividade, logout, revogação e validação fail-closed.
- Cenários de sessão válida, expirada, revogada e associada a User cujo estado não permite acesso.

**Decisões necessárias**

- Ratificar a estratégia de sessão V1 proposta pelo ADR-0004 e seus limites temporais.
- Definir quais verificações de estado são síncronas em operações protegidas, conforme ADR-0004.
- Confirmar escopo do Sprint: logout/revogação da sessão corrente, sem incluir “logout de todos”, recuperação de senha ou MFA, a menos que uma decisão de escopo o altere formalmente.

**Bloqueadores**

- Método ou validade de sessão não ratificados.
- Incapacidade de identificar uma sessão revogada/expirada, ou comportamento permissivo quando a verificação obrigatória falha.
- Dependência de claims antigas para papel, permissão, `schoolId` ou `membershipId`.

**Validação para avançar**

- Uma sessão válida identifica o User autenticado e não transporta autoridade escolar como fonte de verdade.
- Sessões expiradas/revogadas e estado inválido não autorizam operação protegida.
- Logout invalida a sessão corrente.
- Durações ratificadas são testáveis; segredo de sessão não é persistido/exposto em claro.

**Dependência para o passo seguinte:** Membership depende de um sujeito autenticado e de uma sessão validada para a operação. Sessão válida, isoladamente, não prova acesso a escola.

### Passo 3 — Membership

**Objetivo:** validar e gerir o vínculo User–School e os grants escolares autorizados dentro do owner Auth/Authorization.

**Fato documentado:** SchoolMembership concede vínculo de acesso User–School; grants e papéis escolares são limitados a `schoolId`. Membership não é Enrollment e sua composição como raiz formal tem divergência documental.

**Artefatos necessários**

- CP2 concluído.
- User e School existentes/resolvíveis pelos owners correspondentes.
- Permission matrix e ator autorizado definidos para cada operação de gestão no escopo.
- Cenários de membership ativa/inativa/ausente, papel/grant, escopo compatível/incompatível e usuário com múltiplas escolas.

**Decisões necessárias**

- Ratificar a autoridade e boundary de SchoolMembership, sem declarar uma raiz Auth adicional.
- Confirmar a regra proposta de no máximo um vínculo ativo por User/escola antes de tratá-la como regra de execução.
- Confirmar quais mudanças de membership/grant serão entregues no Sprint e quais apenas serão consultadas para autorização.
- Harmonizar uso/publicação dos eventos já documentados (`MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`), se o fluxo realmente os publicar.

**Bloqueadores**

- Ator, ação ou permissão não definidos na permission matrix ratificada.
- Referência a User/School sem validação pelo owner/contrato correspondente.
- Status de membership/grant ou regra de escopo não resolvidos.
- Confusão entre vínculo escolar e matrícula pedagógica; qualquer inclusão de Enrollment ultrapassa este plano.

**Validação para avançar**

- Operação só é permitida a ator autenticado com permissão e escopo autorizados.
- Membership/grant incompatível com `schoolId` é negado.
- Criar/encerrar membership não cria/encerra User, School ou Enrollment.
- Papéis não são inferidos de sessão/token antigo, do cliente ou de outra escola.
- Eventos, se publicados, representam fatos do owner e não concedem autorização aos consumidores.

**Dependência para o passo seguinte:** School Context combina a sessão validada com membership vigente, permissão e validação da School/`schoolId`. Não é uma continuação automática do login.

### Passo 4 — School Context

**Objetivo:** resolver no servidor a escola em cujo escopo o ator pode atuar, com base em membership e permissão aplicáveis.

**Fato documentado:** School é owner separado; `schoolId` identifica o escopo institucional. O contexto enviado pelo cliente não comprova autorização. Cada caso de uso valida permissão, membership e recurso no servidor.

**Artefatos necessários**

- CP3 concluído.
- Escola piloto registrada e identificável via Schools.
- Casos de teste para uma membership, múltiplas memberships, ausência/inatividade e tentativa de usar outra escola.
- Critérios de isolamento aprovados para resolução do contexto.

**Decisões necessárias**

- Confirmar como o consumer valida a existência/estado da School: contrato síncrono ou evidência existente aprovada. Não criar dependência de acesso a dados internos de Schools.
- Confirmar o comportamento se seleção/contexto não corresponder a membership autorizada: negar, sem fallback silencioso para outra escola.
- Ratificar como o escopo autorizado é passado entre casos de uso, usando identificadores/contexto explícitos já documentados.

**Bloqueadores**

- School piloto inexistente ou estado não consultável pelo owner autorizado.
- Membership válida, permissão ou correspondência de `schoolId` não verificável.
- Dependência de leitura direta de dados internos de Schools ou confiança em `schoolId` do cliente.
- Testes negativos cross-school ausentes ou falhando.

**Validação de conclusão**

- Usuário sem membership ativa/permissão não obtém contexto escolar.
- Usuário com membership em múltiplas escolas só resolve cada escola autorizada.
- Usar `schoolId` ou membership de outra escola é negado.
- Resolver contexto não altera School, membership, grants ou sessão.
- Nenhuma história, tarefa ou dependência dos domínios excluídos foi introduzida.

---

## Contratos necessários

Os itens seguintes são **interfaces conceituais internas e pontos de integração documentados**, não definições de payload, assinatura, endpoint, API externa ou mecanismo de implementação.

| Contrato / interface conceitual                    | Fornecedor (owner)   | Consumidor                                                                | Dados/garantias que precisam ser acordados                                                                                           | Limite                                                                                        |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Autenticação por credencial V1                     | Auth / Authorization | Caso de uso que inicia login                                              | Resultado de autenticação e identidade global; falha genérica; ausência de segredo em saída/logs.                                    | Email/senha é o método V1 proposto; não criar protocolo próprio.                              |
| Validação de sessão e encerramento/revogação       | Auth / Authorization | Casos de uso protegidos                                                   | Sujeito, validade, expiração, revogação e estado de User necessários à decisão; fail-closed.                                         | Sessão identifica o sujeito, não role/escola/membership confiáveis.                           |
| Resolução de User/estado de identidade             | Users                | Auth / Authorization                                                      | Identificador de User e estado necessário para autenticar/autorizar.                                                                 | Auth não lê repositórios ou dados internos de Users.                                          |
| Validação de School e contexto institucional       | Schools              | Auth / Authorization ou operação autorizada que precise resolver o escopo | Referência de School/`schoolId` e estado mínimo necessário, por fachada pública ou evidência/evento já documentado quando aplicável. | Schools não administra memberships; sem escrita cruzada.                                      |
| Gestão/consulta de SchoolMembership e grants       | Auth / Authorization | Operadores/casos de uso autorizados e resolução de contexto               | Vínculo User–School, status e grants com escopo; permission matrix e ator autorizador.                                               | Não equivale a Enrollment; owner de membership permanece Auth.                                |
| Resolução de autorização contextual                | Auth / Authorization | Cada operação protegida do Sprint                                         | Ator, permissão, escopo explícito e correspondência do recurso/`schoolId`; negar por padrão.                                         | Consumers validam acesso no servidor; evento não concede permissão.                           |
| Eventos Auth/membership já nomeados, se publicados | Auth / Authorization | Consumers existentes/documentados                                         | Nome canônico, owner, modo de transporte e dados minimizados; efeitos são após o fato.                                               | Não adicionar evento, consumer de Analytics ou dependência assíncrona para resposta síncrona. |

**Regra de boundary — fato documentado:** comunicação síncrona entre módulos passa por contratos públicos de aplicação; acesso direto a repositórios/dados de outro módulo e dependências circulares são proibidos. Eventos servem efeitos secundários após commit; consumidores são idempotentes.

## Validações entre passos

| Gate                | Evidências necessárias para avançar                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CP1 → CP2**       | Auth aprovada para cenários válidos/inválidos e conta inelegível; falhas genéricas; sem vazamento de credenciais; sem criação automática de SchoolMembership; decisões de identidade/eligibilidade registradas.       |
| **CP2 → CP3**       | Sessão válida, expirada, inativa e revogada distinguida corretamente; logout encerra sessão; validação obrigatória falha fechada; papéis/escola/membership não vêm de claims antigas.                                 |
| **CP3 → CP4**       | Permission matrix aplicada; membership/grants limitados ao `schoolId`; estado e correspondência de membership testados; criação/remoção não altera User/School/Enrollment; eventos existentes harmonizados se usados. |
| **CP4 → conclusão** | Contexto obtido só com sessão, membership, permissão e School correspondentes; negações cross-school comprovadas com pelo menos dois contextos escolares de teste; nenhum acesso interno cruzado entre módulos.       |

**Recomendação de validação:** cada gate requer evidência observável dos cenários de aceite correspondentes, decisão documental registrada e ausência de bloqueador crítico/alto aberto no passo. Não avançar por mock de sucesso que ignore autorização ou falha de dependência.

## Riscos que podem bloquear a execução

| Risco bloqueador                                                                                      | Severidade | Gate afetado |
| ----------------------------------------------------------------------------------------------------- | ---------- | ------------ |
| ADRs `Proposed` ou divergência sobre autoridade/composição de SchoolMembership sem decisão dos owners | **ALTO**   | CP1, CP3     |
| User/credencial/escola piloto de teste indisponíveis ou regra de elegibilidade não ratificada         | **ALTO**   | CP1          |
| Estratégia de sessão/revogação e comportamento fail-closed não aprovados ou não verificáveis          | **ALTO**   | CP2          |
| Permission matrix/ator autorizado para gestão de membership não definido                              | **ALTO**   | CP3          |
| Validação de School/`schoolId` depende de acesso interno cruzado ou não pode provar escopo            | **ALTO**   | CP4          |
| Testes negativos de isolamento cross-school falham ou não são executáveis                             | **ALTO**   | CP4          |
| Nomes/semântica dos eventos Auth em conflito, quando a entrega depender de sua publicação             | **MÉDIO**  | CP1, CP3     |

---

# CHECKPOINTS

### CP1 — Auth concluído

- [ ] Decisões de autenticação e elegibilidade foram aprovadas.
- [ ] Identidade/credencial de teste existe e está provisionada por fluxo autorizado.
- [ ] Credencial válida autentica; credencial inválida/conta inelegível não autentica.
- [ ] Mensagem de falha não permite enumerar contas; segredos não aparecem em logs/eventos.
- [ ] Login não cria membership, papel ou contexto escolar.
- [ ] Boundary Auth/Users respeitado; nenhum acesso interno cruzado.
- [ ] Bloqueadores altos de Auth resolvidos.

### CP2 — Session concluída

- [ ] Estratégia V1 e limites temporais foram ratificados.
- [ ] Sessão autenticada identifica User, sem claims de autorização confiáveis.
- [ ] Expiração, inatividade, logout e revogação foram verificados.
- [ ] Estado/revogação inválidos ou indisponibilidade da validação obrigatória falham fechados.
- [ ] Nenhum segredo de sessão é exposto ou persistido em claro.
- [ ] Bloqueadores altos de sessão resolvidos.

### CP3 — Membership concluída

- [ ] Boundary/ownership de SchoolMembership e grants foi ratificado sem criar agregado novo.
- [ ] Permissões e atores autorizados foram confirmados.
- [ ] Membership/grants respeitam `schoolId`; estado incompatível é negado.
- [ ] User e School são validados por seus owners/contratos.
- [ ] Membership não é confundida com Enrollment; login não cria vínculo.
- [ ] Eventos existentes, quando usados, têm nomes reconciliados e não são fonte de autorização.
- [ ] Bloqueadores altos de Membership resolvidos.

### CP4 — School Context concluído

- [ ] Contexto só é resolvido com sessão válida, membership ativa, permissão e School correspondentes.
- [ ] `schoolId` escolhido/enviado pelo cliente não concede acesso sozinho.
- [ ] Casos sem membership/permissão e casos de troca entre escolas são negados.
- [ ] Testes negativos cross-school passam para usuários com uma e múltiplas memberships.
- [ ] Resolução não cria/altera School, membership, grant ou sessão.
- [ ] Nenhuma dependência dos domínios fora do Sprint foi introduzida.
- [ ] Todos os bloqueadores altos estão resolvidos e o aceite integrado do Sprint foi registrado.

### Resultado

O Sprint 1 está concluído somente quando CP1, CP2, CP3 e CP4 forem aprovados em sequência, com as validações entre gates registradas. Um checkpoint incompleto mantém o passo dependente bloqueado; a aprovação de um CP não ratifica decisões fora de seu escopo nem os ADRs completos.
