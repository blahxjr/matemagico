# Sprint 1 Backlog

## Escopo e convenções

Este backlog cobre exclusivamente **Auth, Session, Membership e School Context**. Trata-se de planejamento executável; não constitui implementação. Não autoriza criar código, schema, banco, migrations, APIs, contratos OpenAPI, componentes frontend, eventos ou agregados.

**Fatos documentados:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`; User é identidade global; Auth possui credenciais, sessões, SchoolMembership e grants; School é um contexto/owner separado; acesso escolar requer autorização server-side.

**Inferência:** a execução do Sprint pressupõe que exista uma escola piloto e identidades de teste com credenciais provisionadas. Provisioná-las operacionalmente não deve criar automaticamente memberships ou conceder papéis.

**Recomendação:** ratificar as decisões de Auth aplicáveis antes de comprometer implementação. Bloqueios documentais não devem ser resolvidos por suposição no trabalho técnico.

### Fora do escopo

Classes, Questions, Attempts, Rankings, Analytics, Badges, Certificates, criação/configuração funcional de Schools, cadastro/autoprovisionamento amplo de usuários, recuperação de senha, MFA e qualquer papel, agregado, evento ou fluxo novo. School Context significa resolver e validar o escopo escolar já existente, não administrar a escola.

## Parte 1 — User Stories

### US-001 — Autenticar usuário

**Como** usuário com identidade e credencial provisionadas,  
**quero** autenticar usando email e senha,  
**para** acessar a plataforma com minha identidade global.

**Critérios de aceite**

1. Credenciais válidas de User autorizado resultam em autenticação bem-sucedida.
2. A elegibilidade da conta, incluindo estado e verificação de email quando exigida, é validada conforme a política ratificada.
3. Credenciais inválidas ou conta não elegível não resultam em sessão autenticada.
4. Respostas de falha não revelam se a identidade existe ou se a senha estava incorreta.
5. A validação ocorre no servidor; rate limiting segue limites aprovados e credenciais/senhas não são registradas em logs nem eventos.
6. Login não cria SchoolMembership nem infere escola ou papel.
7. O fluxo usa o método V1 documentado no ADR-0004; não introduz protocolo próprio de autenticação.

### US-002 — Manter e encerrar sessão

**Como** usuário autenticado,  
**quero** que minha sessão permaneça válida somente dentro dos limites definidos e possa ser encerrada/revogada,  
**para** impedir o uso de uma sessão expirada ou revogada.

**Critérios de aceite**

1. A sessão identifica o sujeito autenticado e não é tratada como fonte atual de papéis, permissões, `schoolId` ou `membershipId`.
2. Sessão expirada, revogada ou cuja validação server-side falha não permite uma operação protegida (**fail-closed**).
3. Logout encerra a sessão atual e invalida seu uso futuro.
4. São verificáveis os limites V1 documentados: expiração absoluta de 8 horas e inatividade máxima de 30 minutos, sem ultrapassar o limite absoluto.
5. Revogação de sessão ou mudança de estado de User invalida acesso conforme a regra documentada.
6. Nenhum token/cookie secreto é persistido ou exposto em logs; metadados são minimizados.

### US-003 — Gerenciar acesso escolar

**Como** administrador escolar ou ator autorizado,  
**quero** criar, alterar ou encerrar uma SchoolMembership e seus papéis escolares permitidos,  
**para** conceder ou remover acesso do usuário à escola dentro do escopo autorizado.

**Critérios de aceite**

1. Apenas ator com permissão documentada consegue gerir a membership no escopo permitido.
2. User e School referenciados são existentes/validados pelo contrato do respectivo owner; Auth não assume ownership de User/Profile ou School.
3. O `schoolId` da membership e do contexto autorizado deve corresponder; divergência é negada.
4. Papéis escolares permanecem limitados à membership e ao `schoolId`; não decorrem de papel global, claims antigas ou seleção do cliente.
5. Criar/remover membership não cria/remover Enrollment nem identidade User.
6. O limite documentado de no máximo um vínculo ativo por User/escola é aplicado, sujeito à ratificação do ADR-0004.
7. Quando o ciclo de vida produzir fatos publicados, usa somente nomes já documentados: `MembershipCreated`, `MembershipRemoved`, `RoleGranted` e `RoleRevoked`. Não é requisito aguardar consumers para confirmar a operação síncrona.

### US-004 — Resolver contexto escolar autorizado

**Como** usuário autenticado com acesso a uma ou mais escolas,  
**quero** resolver o contexto de uma escola entre minhas memberships ativas,  
**para** executar operações futuras somente dentro de um escopo autorizado.

**Critérios de aceite**

1. Só é resolvido contexto para uma School associada a SchoolMembership ativa e permissão aplicável.
2. `schoolId` é resolvido/validado no servidor; um identificador enviado pelo cliente, isoladamente, não concede acesso.
3. Identidade global sem membership ativa válida não obtém contexto escolar.
4. Tentar usar membership ou `schoolId` de outra escola é negado, inclusive para usuário que pertença a mais de uma escola.
5. O contexto não cria ou altera School, membership, papel ou sessão.
6. A decisão de contexto permanece separada do login; login bem-sucedido não implica autorização escolar.

## Parte 2 — Task Breakdown

As tarefas abaixo descrevem trabalho futuro. Seus critérios são verificáveis sem prescrever schema, endpoint ou implementação física.

| ID        | História    | Descrição                                                                                                                                                                                                                         | Dependências                      | Critério de conclusão                                                                                                                                                                                                                                                                                |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T-001** | Transversal | Ratificar as decisões aplicáveis de ADR-0002/0003/0004 e reconciliar somente as ambiguidades que bloqueiam Auth, Session, Membership e School Context. Registrar claramente o que foi aprovado e o que continua fora de escopo.   | —                                 | Responsáveis de Product, Architecture e Security aprovam as decisões necessárias; ADRs não são tratados como aceitos por inferência.                                                                                                                                                                 |
| **T-002** | Transversal | Confirmar o provisionamento operacional da escola piloto e das identidades/credenciais de teste. Distinguir User, credencial, SchoolMembership e papéis; não conceder associação automaticamente.                                 | T-001                             | Existe procedimento aprovado e conjunto de identidades/escola de teste apto aos critérios das US-001–US-004, sem cadastro amplo ou entidade nova.                                                                                                                                                    |
| **T-003** | US-001      | Definir e entregar o fluxo V1 de autenticação email/senha conforme ADR-0004 e a estratégia Auth.js Credentials Provider documentada.                                                                                              | T-001, T-002                      | Cenários de credencial válida, inválida e conta não elegível satisfazem os critérios 1–6 de US-001.                                                                                                                                                                                                  |
| **T-004** | US-001      | Verificar regras de validação server-side, estado/verificação de email quando exigidos, rate limiting aprovado, erros genéricos, proteção contra enumeração e tratamento de credenciais/logs, dentro das diretrizes documentadas. | T-003                             | Testes/verificações demonstram que falhas não criam sessão, respostas não distinguem usuário inexistente de senha inválida, rate limiting aprovado é aplicado e nenhum segredo aparece em logs/eventos.                                                                                              |
| **T-005** | US-002      | Definir e entregar o ciclo de sessão V1 conforme ADR-0004: JWT do Auth.js, registro server-side para revogação, expiração, inatividade e conteúdo mínimo confiável.                                                               | T-001, T-003                      | Sessão respeita 8 horas absolutas, 30 minutos de inatividade, não confia em role/escola/membership como autorização permanente e falha fechada se a validação necessária falhar.                                                                                                                     |
| **T-006** | US-002      | Verificar logout da sessão atual e revogação; cobrir invalidação por sessão revogada e estado de User, sem ampliar para recuperação de senha ou MFA.                                                                              | T-005                             | Testes demonstram que a sessão encerrada/revogada não autoriza nova operação protegida e que logout encerra a sessão corrente.                                                                                                                                                                       |
| **T-007** | US-003      | Definir e entregar operações mínimas de gestão de SchoolMembership e papéis documentados por atores autorizados.                                                                                                                  | T-001, T-002, T-005               | Ator permitido consegue gerir vínculo/grant no escopo autorizado; ator sem permissão é negado; nenhuma operação altera User/Profile, School ou Enrollment.                                                                                                                                           |
| **T-008** | US-003      | Verificar invariantes de membership e propagação dos fatos documentados, sem criar nomes de eventos nem depender de Analytics.                                                                                                    | T-007                             | Testes cobrem `schoolId` incompatível, membership duplicada ativa conforme regra ratificada, remoção e grant/revogação; se eventos forem publicados, somente os nomes documentados são usados e consumers não concedem autorização.                                                                  |
| **T-009** | US-004      | Definir e entregar a resolução server-side do contexto escolar usando identidade autenticada, SchoolMembership ativa, permissão e `schoolId` validado por contrato.                                                               | T-005, T-007                      | Para memberships válidas o contexto correspondente é resolvido; sem membership, com membership inativa ou com escopo divergente o acesso é negado.                                                                                                                                                   |
| **T-010** | US-004      | Verificar isolamento entre pelo menos duas escolas e ausência de confiança em contexto escolhido pelo cliente.                                                                                                                    | T-009                             | Testes negativos demonstram que alternar `schoolId`/membership para outra escola não permite resolver o contexto alheio; usuário multi-escola só acessa escolas autorizadas.                                                                                                                         |
| **T-011** | Transversal | Harmonizar o vocabulário de eventos Auth relevante ao Sprint e registrar a decisão de transporte/publicação sem criar eventos ou bus consumer fora do escopo.                                                                     | T-001                             | `UserLoggedIn`, `AuthenticationFailed`, `UserLoggedOut`, `SessionRevoked`, `MembershipCreated`, `MembershipRemoved`, `RoleGranted` e `RoleRevoked` são usados conforme decisão ratificada; aliases `LoginSucceeded`/`LoginFailed`/`Logout` não são assumidos como canônicos sem resolução explícita. |
| **T-012** | Transversal | Executar verificação integrada de regressão dos critérios obrigatórios US-001–US-004 e registrar bloqueios remanescentes.                                                                                                         | T-004, T-006, T-008, T-010, T-011 | Todos os critérios de aceite obrigatórios passam; falhas e gaps são explícitos, sem estado de sucesso falso.                                                                                                                                                                                         |

## Parte 3 — Dependências

| Tarefa | Depende de                        |
| ------ | --------------------------------- |
| T-001  | —                                 |
| T-002  | T-001                             |
| T-003  | T-001, T-002                      |
| T-004  | T-003                             |
| T-005  | T-001, T-003                      |
| T-006  | T-005                             |
| T-007  | T-001, T-002, T-005               |
| T-008  | T-007                             |
| T-009  | T-005, T-007                      |
| T-010  | T-009                             |
| T-011  | T-001                             |
| T-012  | T-004, T-006, T-008, T-010, T-011 |

**Explicação:** decisões e provisionamento são pré-condições para validar uma identidade realista e seu escopo. A sessão depende do fluxo Auth. Membership e contexto escolar dependem da identidade/sessão; contexto também exige membership vigente. Verificações integradas aguardam todas as quatro capacidades e a reconciliação de eventos.

## Parte 4 — Ordem de execução

1. **T-001 — Ratificar decisões bloqueadoras.** ADRs ainda estão `Proposed`; não tomar ambiguidades por fatos implementáveis.
2. **T-002 — Preparar piloto/identidades de teste.** Login pressupõe User e credencial disponíveis; escola pode ser provisionada operacionalmente.
3. **T-003 — Entregar autenticação.** Estabelece o sujeito global sem misturar papel ou escola ao login.
4. **T-004 — Verificar o fluxo Auth.** Detecta falhas de credencial, enumeração e vazamento antes de apoiar sessão/acesso.
5. **T-005 — Entregar validação e duração da sessão.** Sessão válida é pré-condição para operações protegidas.
6. **T-006 — Entregar logout/revogação.** Fecha o ciclo de vida da sessão antes de confiar nela em operações escolares.
7. **T-007 — Entregar gestão de Membership.** Vínculo de acesso escolar é próprio de Auth e distinto da identidade e da matrícula pedagógica.
8. **T-008 — Verificar invariantes/eventos de Membership.** Garante escopo de concessão/revogação sem acoplamento a consumers fora do Sprint.
9. **T-009 — Entregar School Context.** Compõe sessão, membership, permissão e escola validada no servidor.
10. **T-010 — Verificar isolamento cross-school.** Gate obrigatório de tenancy para demonstrar negação de contexto indevido.
11. **T-011 — Fechar nomenclatura/uso de eventos documentados.** Não inventar aliases nem tornar Analytics dependência de login.
12. **T-012 — Executar aceite integrado.** Conclui o Sprint somente após todas as histórias passarem.

**Observação:** itens independentes após T-001 podem ser paralelizados pela equipe, mas a ordem acima é a sequência de integração e aceite.

## Parte 5 — Critérios de aceite por User Story

| História                               | Critérios objetivos e verificáveis                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-001 — Autenticar usuário**        | 1. 100% dos casos de credencial de teste válida e elegível autenticam. 2. 100% dos casos de credencial inválida/conta não elegível não criam sessão. 3. Estado da conta, email verificado quando exigido e rate limiting aprovado são verificados. 4. Mensagem de falha é indistinguível quanto à existência da conta. 5. Não há segredo em logs/eventos. 6. Login não cria SchoolMembership nem define contexto escolar. |
| **US-002 — Manter e encerrar sessão**  | 1. Sessão com mais de 8h é rejeitada. 2. Sessão após mais de 30min de inatividade é rejeitada, respeitado o limite absoluto. 3. Sessão revogada ou estado necessário indisponível falha fechado. 4. Logout invalida a sessão atual. 5. Claims de papel/escola/membership não autorizam acesso sem checagem atual.                                                                                                         |
| **US-003 — Gerenciar acesso escolar**  | 1. Operação permitida por permission matrix conclui apenas no `schoolId` autorizado. 2. Ator não autorizado e escopo divergente são negados. 3. Criar/remover membership não cria/remove User, School ou Enrollment. 4. Restrição de um vínculo ativo por User/escola é testada se ratificada. 5. Eventos publicados usam somente nomes existentes e não são fonte de autorização.                                        |
| **US-004 — Resolver contexto escolar** | 1. Membership ativa e permissão correspondentes resolvem apenas a escola associada. 2. Membership inativa/ausente, permission ausente ou `schoolId` divergente resulta em negação. 3. Usuário com duas escolas só obtém contexto para membership autorizada em cada uma. 4. Login sozinho nunca resolve acesso escolar.                                                                                                   |

Os percentuais referem-se ao conjunto de cenários de aceite aprovado antes da execução; a meta é passar todos os cenários, sem tolerância a bypass de autorização.

## Parte 6 — Definição de Pronto

### Sprint 1 concluído quando

- [ ] As decisões necessárias ao escopo foram ratificadas, ou os itens pendentes foram identificados e removidos explicitamente do caminho de execução.
- [ ] Escola piloto e identidades/credenciais de teste estão disponíveis por processo aprovado.
- [ ] US-001 passa todos os critérios de login, incluindo falha genérica e ausência de vazamento.
- [ ] US-002 passa expiração, inatividade, logout, revogação e comportamento fail-closed.
- [ ] US-003 passa autorização, isolamento por `schoolId`, criação/remoção de vínculo e grants permitidos.
- [ ] US-004 passa resolução de contexto autorizada e testes negativos cross-school.
- [ ] Membership e Enrollment são mantidos distintos; login não cria membership; seleção de school não concede autorização.
- [ ] Eventos, quando aplicáveis, usam apenas nomes documentados e não criam dependência de Analytics.
- [ ] Não há dependência ou entrega de Classes, Questions, Attempts, Rankings, Analytics, Badges ou Certificates.
- [ ] T-012 conclui com todos os cenários de aceite aprovados e sem falha crítica/alta aberta de autorização ou tenancy.

## Parte 7 — Riscos

| Risco                                                                                                                                      | Classificação | Justificativa / resposta                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADRs de ownership/Auth permanecem `Proposed` e há divergência documental sobre raiz/composição de SchoolMembership                         | **ALTO**      | Pode congelar uma fronteira incorreta. Gatear T-003/T-007 em T-001; não presumir raiz Auth adicional.                                              |
| Usuário autenticado usar `schoolId` ou membership de outra escola                                                                          | **ALTO**      | A documentação exige checagem server-side e correspondência entre membership e recurso; demonstrar testes negativos em T-010.                      |
| Sessão JWT permanecer utilizável após logout/revogação ou mudança de estado de User                                                        | **ALTO**      | ADR-0004 exige registro server-side, validação de estado e fail-closed; cobrir em T-005/T-006.                                                     |
| Credenciais não disponíveis para a escola piloto                                                                                           | **MÉDIO**     | O fluxo de login pressupõe identidade/credencial provisionada; resolver em T-002 sem ampliar para registro público.                                |
| Membership ser confundida com Enrollment ou criada automaticamente após login                                                              | **MÉDIO**     | São conceitos/owners distintos; critérios das US-001 e US-003 proíbem essa associação implícita.                                                   |
| Aliases de eventos de login divergirem (`UserLoggedIn`/`AuthenticationFailed`/`UserLoggedOut` vs. `LoginSucceeded`/`LoginFailed`/`Logout`) | **MÉDIO**     | Nomenclatura alternativa não confirmada como canônica; resolver em T-011 sem adicionar evento.                                                     |
| Nome/status formal das Aggregate Roots ser tratado como decisão final                                                                      | **BAIXO**     | O Sprint precisa dos contratos/owners, mas não de inventar ou ratificar um agregado `Login`/`Auth`; registrar limites e seguir decisão dos owners. |

## Parte 8 — BACKLOG PRIORIZADO

Prioridade expressa por sequência de risco/dependência: **P1** bloqueia o núcleo de identidade e segurança; **P2** completa autorização e escopo escolar; **P3** valida integração e consistência.

### P1 — Identidade e sessão

1. **T-001** — Ratificar decisões bloqueadoras de Auth/ownership.
2. **T-002** — Confirmar escola piloto e provisionamento de identidades/credenciais.
3. **T-003** — Entregar autenticação email/senha V1.
4. **T-004** — Verificar comportamento seguro de Auth.
5. **T-005** — Entregar ciclo de validação/duração de sessão.
6. **T-006** — Entregar logout e revogação.

### P2 — Membership e School Context

7. **T-007** — Entregar gestão autorizada de SchoolMembership/grants.
8. **T-008** — Verificar invariantes e eventos documentados de Membership.
9. **T-009** — Entregar resolução server-side do School Context.

### P3 — Gates de consistência

10. **T-010** — Verificar isolamento cross-school do contexto.
11. **T-011** — Ratificar nomenclatura e uso dos eventos existentes no Sprint.
12. **T-012** — Executar aceite integrado das quatro histórias.

## Parte 9 — DEPENDÊNCIAS

```text
Auth
  ↓
Session
  ↓
Membership
  ↓
School Context
```

- **Auth → Session:** uma sessão válida identifica um User autenticado; o sujeito/session não declara autorização permanente.
- **Session → Membership:** para operar em escola, além de sessão válida, é necessária membership ativa com permissão aplicável.
- **Membership → School Context:** o contexto só é resolvido quando membership, permissão e `schoolId` do recurso correspondem e foram validados no servidor.
- **Limite:** as setas exprimem dependência de acesso, não ownership agregado nem criação automática. Escola e usuário devem existir por seus owners; Auth não cria School nem torna login equivalente a Membership.
