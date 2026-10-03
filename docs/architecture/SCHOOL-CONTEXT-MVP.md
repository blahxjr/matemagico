# SCHOOL CONTEXT MVP

## Escopo e fontes

Este documento consolida, em um único artefato do Sprint 1, a foundation, as decisões operacionais, os contratos funcionais, os serviços de aplicação, os testes e as code tasks do School Context.

Fontes:

- [Documento Mestre — ARCHITECTURE.md](../../ARCHITECTURE.md)
- [ADR-0002 — Module Boundaries](./ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](./ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](./ADRs/ADR-0004-authentication-authorization.md)
- [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md)
- [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md)
- [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md)
- [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md)
- [MEMBERSHIP-PERSISTENCE-DESIGN.md](./MEMBERSHIP-PERSISTENCE-DESIGN.md)
- [MEMBERSHIP-APPLICATION-SERVICES.md](./MEMBERSHIP-APPLICATION-SERVICES.md)

**Status:** decisões operacionais restritas ao MVP/Sprint 1. ADRs não são alterados nem promovidos por este documento. School Context é uma capacidade de aplicação de Auth / Authorization, não um módulo, bounded context, agregado ou autorização persistente novos. O resultado de contexto é transitório e válido somente para a operação/recurso verificados.

**Convenções:** “Fonte” identifica regra já documentada; “Decisão MVP” fecha o comportamento necessário ao fluxo pedido; “Derivado” indica consequência operacional mínima. O documento não define APIs tecnológicas, banco, schema, migrações ou frontend.

## Foundation

### School Context

- **Responsabilidade:** resolver, no servidor, a School solicitada para a operação corrente e confirmar que o User autenticado tem uma Membership válida nesse escopo.
- **Owner:** Auth / Authorization é owner da decisão de autorização e da SchoolMembership. Schools é owner da entidade School e de seu estado. O módulo dono do recurso é owner do estado e do `schoolId` desse recurso.
- **Invariantes:**
  - O contexto é resolvido por operação; selecionar ou indicar uma School não concede acesso por si só.
  - A identidade vem da Session/User autenticados, não de identidade fornecida pelo cliente como autoridade.
  - O `schoolId` solicitado precisa ser validado pelo servidor e corresponder à School, Membership e recurso quando houver recurso.
  - Contexto resolvido não é autorização geral, persistente, nem reutilizável para outra operação ou recurso.
- **Fonte:** ADR-0004 §§2.1, 2.4 e 2.6; `ResolveSchoolContext` em Membership.
- **Decisão MVP:** não há “escola atual” persistida na Session para fins de autorização; cada operação protegida solicita e valida seu próprio `schoolId`.

### Tenant Context

- **Responsabilidade:** identificar o limite institucional da operação por `schoolId`. “Tenant” é o conceito; `schoolId` é a referência canônica, não um campo chamado `tenant`.
- **Owner:** Schools possui o identificador/registro da School; cada módulo possui e valida o escopo de seus próprios recursos. Auth / Authorization verifica a correspondência ao autorizar.
- **Invariantes:**
  - Dados institucionais e recursos são avaliados no `schoolId` explícito aplicável.
  - Um identificador enviado pelo cliente é apenas solicitação; não comprova que o ator pertença ou tenha acesso à School.
  - Não se combinam referências, Memberships ou permissões de escolas diferentes.
- **Fonte:** ADR-0002 §2.2 (regras estruturais de identidade e tenant); ADR-0003 §2; ADR-0004 §§2.1 e 2.4.
- **Derivado:** todo caso protegido precisa carregar ou resolver o `schoolId` do recurso antes de permitir a ação.

### Membership Scope

- **Responsabilidade:** representar o vínculo de acesso entre exatamente um User e uma School; fornecer a evidência escolar obrigatória para autorização.
- **Owner:** Auth / Authorization. User permanece sob Users; School permanece sob Schools.
- **Invariantes:**
  - A Membership usada para autorizar deve pertencer ao User autenticado e ao `schoolId` solicitado.
  - Somente estado `ACTIVE` é elegível; `PENDING` e `REVOKED` não autorizam.
  - Há no máximo uma Membership ativa por par User–School. Um User pode ter Memberships em várias escolas.
  - Membership não é Enrollment e não concede acesso sozinha: Grant/Role/Permission e validação do recurso/escopo continuam necessários.
- **Fonte:** MEMBERSHIP-MVP-DECISIONS; MEMBERSHIP-PERSISTENCE-DESIGN MRI-003–MRI-006; ADR-0004 §§2.1–2.4.

### School Scope

- **Responsabilidade:** confirmar que a School referenciada existe e está habilitada, e que o recurso protegido pertence ao mesmo `schoolId`.
- **Owner:** Schools é owner da School e de seu estado. O owner de cada recurso é responsável por fornecer/validar seu escopo institucional.
- **Invariantes:**
  - Auth / Authorization resolve/valida School por seu contrato público; não lê nem altera internals de Schools.
  - Membership, School canônica e recurso devem coincidir no mesmo `schoolId`.
  - Recurso ausente, inativo quando isso impede a ação, ou sem escopo verificável não é autorizado.
- **Fonte:** ADR-0002 §§2.2–2.3; ADR-0004 §2.4; MEMBERSHIP-FOUNDATION RA-001–RA-003.

### Fail Closed

- **Responsabilidade:** impedir acesso quando algum fato obrigatório de autenticação, identidade, Membership, School, Grant, Role, Permission, escopo ou recurso não pode ser confirmado.
- **Owner:** cada serviço protegido é responsável por negar no seu limite; Auth / Authorization responde pela validação de Session/Membership/Grant/Role/Permission, Schools pela validação da School, e o owner do recurso pelo estado/escopo do recurso. Nenhum owner delega sua decisão a dados de cliente ou a um evento.
- **Invariantes:**
  - Erro, resultado inconclusivo ou indisponibilidade em dependência de validação necessária resulta em negação.
  - Ausência de Role/Permission aplicável resulta em negação.
  - Não há fallback para outra School, outro Membership ou permissão mais ampla.
- **Fonte:** AUTH-FOUNDATION; ADR-0004 §§2.4–2.5; MEMBERSHIP-PERSISTENCE-DESIGN MRI-010.

## Decisions

| Tema                          | Decisão                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resolução do contexto escolar | O serviço resolve a School pedida no servidor via contrato público de Schools, valida que está habilitada e localiza a Membership do User autenticado para aquele `schoolId`. Só devolve contexto se os identificadores canônicos coincidirem.                                             |
| Escolha de contexto ativo     | Não existe seleção implícita nem `schoolId` padrão para autorização. Cada operação protegida deve solicitar um `schoolId`; ele é uma intenção, não uma credencial. O servidor resolve/valida o contexto novamente para essa operação.                                                      |
| Ausência de Membership        | Negar apenas a resolução/autorização escolar, sem invalidar ou converter em falha o Login. Não criar Membership ou Grant automaticamente.                                                                                                                                                  |
| School inválida               | Se inexistente, desabilitada, inconsistente com o `schoolId` solicitado, ou impossível de validar, negar. Não escolher outra School.                                                                                                                                                       |
| Múltiplas Memberships         | Um User pode pertencer a várias escolas. A operação usa somente a Membership `ACTIVE` que corresponde ao `schoolId` solicitado; não combina permissões entre escolas. A regra de unicidade permite no máximo uma Membership ativa para cada par User–School; violação/inconsistência nega. |
| Troca de contexto             | A troca consiste em solicitar outro `schoolId` em uma nova operação e resolver/validar tudo novamente. Não altera a Session, não transporta permissões da School anterior e não estabelece autorização subsequente.                                                                        |
| Natureza do contexto          | Resultado efêmero para uma única operação/recurso; não é agregado, módulo ou bounded context novo, nem é estado confiável persistido no cliente ou na Session.                                                                                                                             |
| Dependência indisponível      | Fail closed: User/Session, Membership, School, Grant, catálogo/Permission ou escopo do recurso não verificável resulta em negação.                                                                                                                                                         |

Decisões coerentes com o fluxo de Auth: Login estabelece User/Session e não seleciona School nem concede autorização escolar. A seleção por User de uma escola entre suas Memberships ativas é descrita no ADR-0004 §2.6; para este documento, a escolha aplica-se à operação corrente e não substitui as verificações de cada operação subsequente.

## Contracts

Contratos funcionais conceituais, sem transporte ou formato tecnológico. Referências de User e School são resolvidas pelos contratos públicos dos respectivos owners. Contexto autenticado não é aceito como identidade/autorização autoafirmada pelo chamador.

### ResolveSchoolContext

- **Objetivo:** resolver a School solicitada e a Membership do User autenticado para estabelecer contexto escolar candidato à operação.
- **Entrada:** User/Session autenticados; `schoolId` solicitado; referência da operação e do recurso quando já disponível.
- **Saída:** contexto resolvido com `userId`, `membershipId`, `schoolId` canônico e estado de validação da School/Membership. A saída não concede Permission nem autoriza acesso por si só.
- **Erros:**
  - `SC-001` — Session/User ausentes, inválidos ou não verificáveis.
  - `SC-002` — Membership correspondente ausente, não `ACTIVE`, ou relação User–School inconsistente.
  - `SC-003` — School ausente, desabilitada, inconsistente ou não verificável.
  - `SC-005` — dependência/contexto obrigatório indisponível ou não validável; negar por fail closed.

### ValidateSchoolContext

- **Objetivo:** validar que o contexto resolvido é aplicável à operação/recurso corrente, incluindo consistência do escopo e estado do recurso.
- **Entrada:** contexto autenticado; contexto escolar candidato (`userId`, `membershipId`, `schoolId`); referência do recurso/escopo; ação solicitada.
- **Saída:** `VALID` para a operação/recurso exatos ou negação. Resultado `VALID` não é transferível a outro recurso, ação ou operação.
- **Erros:**
  - `SC-001` — Session/User inválidos, ausentes ou não verificáveis.
  - `SC-002` — Membership inexistente/inativa ou não vinculada ao User/contexto solicitado.
  - `SC-003` — School inválida ou divergência entre `schoolId` canônico, Membership e recurso.
  - `SC-004` — ação não é permitida para o recurso/escopo ou Permission requerida não está presente.
  - `SC-005` — não foi possível validar contexto, dependência ou estado necessário do recurso; negar sem fallback.

### ResolvePermissions

- **Objetivo:** derivar as Permissions aplicáveis ao User para uma ação no contexto escolar validado, usando somente Grants vigentes, Roles escolares e RolePermission.
- **Entrada:** contexto validado (`userId`, `membershipId`, `schoolId`); ação `resource:action`; contexto/escopo do recurso.
- **Saída:** conjunto de Permissions derivadas aplicáveis ao contexto e resultado de autorização para a ação. Conjunto vazio significa negar.
- **Erros:**
  - `SC-001` — Session/User inválidos ou não verificáveis.
  - `SC-002` — Membership ausente ou não `ACTIVE`.
  - `SC-003` — School/contexto/escopo inconsistentes ou inválidos.
  - `SC-004` — não há Grant vigente, Role elegível ou Permission derivada aplicável à ação.
  - `SC-005` — catálogo, relação, persistência ou dependência necessária não pode ser verificada; negar por fail closed.

### Catálogo de erros

| Código   | Significado                                                                                    | Tratamento                                                                             |
| -------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SC-001` | Contexto de autenticação/User ausente, inválido ou não verificável.                            | Negar operação escolar; não alterar o resultado de Login já concluído.                 |
| `SC-002` | Membership ausente, inativa ou inconsistente com User/School.                                  | Negar; não provisionar vínculo automaticamente.                                        |
| `SC-003` | School inexistente, desabilitada, divergente ou não validável.                                 | Negar; não usar outra School como fallback.                                            |
| `SC-004` | Grant, Role ou Permission ausente, inválido, expirado/revogado ou inaplicável ao recurso/ação. | Negar; não ampliar privilégios nem combinar escopos.                                   |
| `SC-005` | Dependência/verificação obrigatória indisponível ou resultado inconclusivo.                    | Negar por fail closed e preservar o erro funcional; nunca retornar sucesso permissivo. |

## Services

Serviços de aplicação do fluxo School Context. São operações dentro das fronteiras existentes, não novos módulos ou APIs.

### ResolveSchoolContextService

- **Objetivo:** resolver a School solicitada e confirmar a Membership correspondente do User autenticado.
- **Entradas:** contexto Auth (Session/User); `schoolId` solicitado; referência de operação/recurso quando disponível.
- **Saídas:** candidato de contexto com `userId`, `membershipId`, `schoolId` canônico e resultado de resolução; não inclui Permission concedida.
- **Dependências:**
  - Auth para validar Session e User ativo.
  - Contrato público de Schools para resolver e validar School existente/habilitada.
  - `SchoolMembershipRepository` para localizar vínculo User–School e confirmar `ACTIVE`.
  - Fail closed para qualquer falha de resolução/verificação.

### ValidateSchoolContextService

- **Objetivo:** verificar que o contexto resolvido corresponde ao recurso e à operação atuais.
- **Entradas:** contexto Auth; contexto escolar candidato; referência do recurso, seu `schoolId` e estado; ação solicitada.
- **Saídas:** validação `VALID` para aquele recurso/ação ou negação funcional.
- **Dependências:**
  - `ResolveSchoolContextService` ou seu resultado verificado.
  - `SchoolMembershipRepository` para confirmar vínculo/estado atual quando necessário.
  - Contrato público de Schools para confirmar estado habilitado quando necessário.
  - Owner do recurso para existência, estado e `schoolId` canônico.
  - Fail closed; não reutilizar validação para outro recurso.

### ResolvePermissionsService

- **Objetivo:** resolver Permissions candidatas e decidir se a Permission solicitada é derivada de uma Role concedida e aplicável ao contexto.
- **Entradas:** contexto escolar validado; ação `resource:action`; escopo/referência do recurso.
- **Saídas:** Permissions aplicáveis e resultado permitido/negado para aquela ação e recurso.
- **Dependências:**
  - `SchoolMembershipRepository` para confirmar estado atual da Membership e correspondência de escopo.
  - Responsabilidade já definida de Auth / Authorization para resolver Grants associados à Membership, verificar validade/revogação e obter os `roleId` elegíveis.
  - `RoleRepository` para validar cada Role referenciada no catálogo escolar.
  - `PermissionRepository` para resolver a Permission e sua associação Role–Permission aplicável.
  - Contexto do recurso e `ValidateSchoolContextService`.
  - Fail closed; ausência de Permission aplicável ou dados não verificáveis resulta em negação.

## Repositórios necessários

Somente os repositórios listados abaixo integram este recorte. User, Session, School e recurso são resolvidos/validados por seus owners através das fronteiras públicas; não são acrescentados repositórios de outros módulos neste desenho.

### SchoolMembershipRepository

- Resolver Membership pelo User autenticado e `schoolId` canônico.
- Retornar `membershipId`, referências `userId`/`schoolId` e estado necessário à decisão.
- Confirmar `ACTIVE`; negar `PENDING`, `REVOKED`, ausência, inconsistência ou duplicidade ativa.
- Não criar ou alterar User/School e não tratar Enrollment como Membership.

### RoleRepository

- Resolver Roles por seus identificadores no catálogo escolar e validar aprovação e escopo.
- Expor somente dados necessários para derivar autorização no `schoolId` corrente.
- Não autorizar isoladamente; concessão e validade de Grant são verificadas pela responsabilidade existente de Grants no owner Auth / Authorization, não pelo catálogo de Roles.

### PermissionRepository

- Resolver Permissions pelo recurso/ação solicitados e associação vigente Role–Permission.
- Retornar Permissions candidatas ao contexto e escopo validados.
- Ausência de associação aplicável resulta em conjunto vazio/negação; não concede Permission diretamente a User ou Membership.

O Grant continua sendo a relação lógica Membership–Role decidida em MEMBERSHIP-MVP-DECISIONS. Este documento reutiliza as responsabilidades de leitura de concessões do owner Auth / Authorization sem criar um novo módulo, agregado ou contrato tecnológico; a implementação deve respeitar o desenho de persistência Membership V1.

## Tests

| ID        | Cenário             | Critério verificável                                                                                                                                                                                                          |
| --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SCT-001` | Membership válida   | Com Session/User válidos, School habilitada e exatamente uma Membership `ACTIVE` para o par User–School solicitado, `ResolveSchoolContext` retorna os IDs canônicos correspondentes.                                          |
| `SCT-002` | Membership inválida | Membership ausente, `PENDING`, `REVOKED`, pertencente a outro User/School ou relação inconsistente resulta em negação; Login não é invalidado nem é criada Membership automaticamente.                                        |
| `SCT-003` | School válida       | Contrato público de Schools resolve a School solicitada como existente/habilitada; contexto canônico usa o mesmo `schoolId` validado.                                                                                         |
| `SCT-004` | School inválida     | School inexistente/desabilitada, `schoolId` divergente ou falha de validação resulta em negação sem fallback para outra School.                                                                                               |
| `SCT-005` | Permissões válidas  | Com Membership ativa, Grant vigente/não revogado, Role escolar e RolePermission aplicáveis ao recurso/ação no mesmo escopo, `ResolvePermissions` retorna a Permission e decisão permitida somente para essa operação/recurso. |
| `SCT-006` | Fail Closed         | Falha/indisponibilidade em Session/User, Membership, School, Grant, Role, Permission ou recurso nega o acesso; não há contexto ou permissão permissiva de fallback.                                                           |

## Code Tasks

### SCI-001 — Fixar contratos funcionais internos de School Context

- **Objetivo:** representar ResolveSchoolContext, ValidateSchoolContext, ResolvePermissions e `SC-001`–`SC-005` nos limites internos de Auth / Authorization.
- **Dependências:** nenhuma.
- **Critério de conclusão:** entradas, saídas, erros e semântica de contexto transitório correspondem a este documento; não há protocolo, API ou formato tecnológico.

### SCI-002 — Implementar resolução de identidade, Session e School

- **Objetivo:** validar Session/User autenticados e resolver a School solicitada por fronteiras públicas.
- **Dependências:** SCI-001; contratos públicos existentes de Auth, Users e Schools disponíveis.
- **Critério de conclusão:** User ativo e School existente/habilitada são confirmados server-side; ID do cliente é tratado como solicitação; erro ou indisponibilidade nega; internals de Users/Schools não são acessados.

### SCI-003 — Implementar resolução de Membership e escopo

- **Objetivo:** resolver Membership do User para o `schoolId` canônico e validar seu ciclo de vida e correspondência de escopo.
- **Dependências:** SCI-001, SCI-002; `SchoolMembershipRepository` conforme desenho Membership.
- **Critério de conclusão:** apenas Membership `ACTIVE` única para o par User–School pode compor contexto; ausente, `PENDING`, `REVOKED`, duplicada ou divergente é negada, sem misturar escolas.

### SCI-004 — Implementar validação do contexto para recurso/operação

- **Objetivo:** comparar contexto escolar resolvido com recurso, estado e ação corrente.
- **Dependências:** SCI-001–SCI-003; contrato público/responsabilidade do owner do recurso.
- **Critério de conclusão:** `schoolId` do recurso coincide com School/Membership canônicas e estado do recurso permite prosseguir; contexto válido limita-se à operação/recurso; qualquer falha nega.

### SCI-005 — Implementar resolução de Roles e Permissions

- **Objetivo:** derivar Permissions para o contexto validado usando Grants vigentes e associações Role–Permission.
- **Dependências:** SCI-001–SCI-004; `RoleRepository`; `PermissionRepository`; responsabilidades existentes de Auth / Authorization para Grants.
- **Critério de conclusão:** somente Grants não revogados e dentro de validade para Membership `ACTIVE`, Role escolar no escopo e Permission associada são elegíveis; ausência/inconsistência/indisponibilidade nega; sem permissões diretas ou combinação cross-school.

### SCI-006 — Executar testes de School Context

- **Objetivo:** comprovar os seis cenários comportamentais deste documento.
- **Dependências:** SCI-002–SCI-005.
- **Critério de conclusão:** SCT-001–SCT-006 passam, incluindo cenário positivo completo e negações fail closed; sem fallback nem mudança de regras congeladas.

## MVP Path

1. **Login:** Auth valida credencial e cria Session válida. Isso estabelece identidade autenticada, não autorização escolar.
2. **Membership:** encontrar Membership `ACTIVE` que vincule o User autenticado à School solicitada. Se ausente/inativa, negar a operação escolar sem converter em falha de Login.
3. **ResolveSchoolContext:** validar pelo owner Schools que a School está habilitada; cruzar Session/User, Membership e `schoolId` canônico; validar o escopo do recurso quando aplicável.
4. **ResolvePermissions:** resolver Grants vigentes da Membership e derivar Permissions das Roles/RolePermission para a ação solicitada.
5. **Acesso autorizado:** permitir somente se Session/User, School, Membership, Grant, Role, Permission, recurso e escopos forem todos válidos. Caso contrário, negar fail closed.

```text
Login
  ↓
Membership ACTIVE correspondente ao schoolId solicitado
  ↓
ResolveSchoolContext (School + Membership + recurso/escopo válidos)
  ↓
ResolvePermissions (Grant vigente + RolePermission aplicável)
  ↓
Acesso autorizado somente à ação/recurso verificados
```

Não há escola padrão inferida, contexto autorizado por Login, seleção persistente ou troca que evite revalidação. A solicitação de outra School inicia nova resolução completa.

## READY FOR DEVELOPMENT

### Existe alguma dependência arquitetural restante?

**NÃO.** O owner do contexto e dos dados, as invariantes, a seleção por operação, o comportamento para múltiplas escolas, as regras de negação, os contratos funcionais, os serviços, os repositórios requeridos, os testes e a sequência mínima de implementação estão definidos para o MVP.

Integrações com Auth, Users, Schools e owners dos recursos, assim como a disponibilidade dos repositórios definidos no domínio Membership, são dependências de implementação/entrega por contratos públicos existentes. Não justificam criar módulos ou reabrir decisões. Este documento encerra somente o recorte School Context do Sprint 1 e não amplia o escopo funcional.
