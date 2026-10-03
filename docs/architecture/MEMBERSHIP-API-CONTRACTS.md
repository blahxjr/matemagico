# MEMBERSHIP API CONTRACTS

## Escopo e convenções

Este documento define contratos funcionais de Membership V1 exclusivamente para `CreateMembership`, `ActivateMembership`, `DeactivateMembership`, `GrantRole`, `RevokeRole` e `ResolveSchoolContext`. Não define HTTP, OpenAPI, REST, GraphQL, formato tecnológico ou código.

As regras de domínio e persistência são as congeladas em [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md), [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md) e [MEMBERSHIP-PERSISTENCE-DESIGN.md](./MEMBERSHIP-PERSISTENCE-DESIGN.md). Este documento não as altera.

**Contexto autenticado** é o User e a Session já autenticados e validados pelo Auth; não é um campo de identidade confiado ao chamador. **Contexto de autorização** é a validação server-side de que o ator possui Membership `ACTIVE`, Role/Permission aplicável e escopo escolar autorizado para a operação. Referências a User e School são resolvidas com seus owners pelos contratos conceituais `ResolveUser`, `ResolveSchool` e `ValidateSchool`.

## Operações

### CreateMembership

#### Objetivo

Criar vínculo de acesso User–School em estado `PENDING`. A criação não ativa a Membership, não concede Role e não emite `MembershipCreated`.

#### Entrada

| Campo                | Obrigatório | Significado                                                                                                 |
| -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `userId`             | Sim         | Identidade global a vincular.                                                                               |
| `schoolId`           | Sim         | School alvo do vínculo.                                                                                     |
| Contexto autenticado | Sim         | Identifica o ator; deriva da Session validada, não de um `actorId` fornecido como autoridade pelo chamador. |

O ator deve ser `SCHOOL_ADMIN` com Membership `ACTIVE` e Permission aplicável na School alvo.

#### Saída

Em sucesso: `membershipId`, `userId`, `schoolId` e estado `PENDING`. Não é criada Role/Grant. Não se retorna perfil de User nem dados internos de School.

#### Erros possíveis

- `MEM-002` — User inexistente ou não ativo, ou falha ao confirmar seu estado.
- `MEM-003` — School inexistente, não habilitada ou não validável.
- `MEM-005` — ator sem autorização para administrar a School alvo ou falha em validar a autorização.

### ActivateMembership

#### Objetivo

Transicionar uma Membership `PENDING` para `ACTIVE`, após validar User e School. A operação não concede Role automaticamente.

#### Entrada

| Campo                | Obrigatório | Significado                                |
| -------------------- | ----------- | ------------------------------------------ |
| `membershipId`       | Sim         | Membership a ativar.                       |
| Contexto autenticado | Sim         | Ator autorizado pela School da Membership. |

O ator deve ser `SCHOOL_ADMIN` ativo na mesma School.

#### Saída

Em sucesso: `membershipId`, `userId`, `schoolId`, estado `ACTIVE` e instante de ativação. A transição efetiva emite o evento documentado `MembershipCreated`.

#### Erros possíveis

- `MEM-001` — Membership inexistente ou não está em estado `PENDING`.
- `MEM-002` — User inexistente/não ativo ou falha ao validar User.
- `MEM-003` — School inexistente/não habilitada ou falha ao validá-la.
- `MEM-005` — ator sem autorização na School da Membership ou falha na validação dessa autorização.

### DeactivateMembership

#### Objetivo

Revogar terminalmente uma Membership `PENDING` ou `ACTIVE`. A revogação impede autorização e torna inefetivos seus Grants sem apagar o histórico conceitual.

#### Entrada

| Campo                | Obrigatório | Significado                                |
| -------------------- | ----------- | ------------------------------------------ |
| `membershipId`       | Sim         | Membership a revogar.                      |
| Motivo categorizado  | Opcional    | Motivo da revogação, quando aplicável.     |
| Contexto autenticado | Sim         | Ator autorizado pela School da Membership. |

O ator deve ser `SCHOOL_ADMIN` ativo na mesma School.

#### Saída

Em sucesso: `membershipId`, `userId`, `schoolId`, estado `REVOKED` e instante de revogação. A transição efetiva emite `MembershipRemoved`.

#### Erros possíveis

- `MEM-001` — Membership inexistente ou já `REVOKED`/não está em estado que permita revogação.
- `MEM-003` — School da Membership não pode ser validada como existente e habilitada para a operação.
- `MEM-005` — ator sem autorização na School da Membership ou falha na validação dessa autorização.

### GrantRole

#### Objetivo

Conceder uma Role escolar a uma Membership `ACTIVE`, restrita ao `schoolId` dessa Membership, durante um intervalo definido. Permissions derivam da Role; não há concessão direta de Permission.

#### Entrada

| Campo                | Obrigatório | Significado                                                                                                              |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `membershipId`       | Sim         | Membership beneficiada.                                                                                                  |
| `roleId`             | Sim         | Role escolar do catálogo aprovado a conceder.                                                                            |
| `validFrom`          | Sim         | Início inclusivo da validade.                                                                                            |
| `validUntil`         | Não         | Fim exclusivo; ausência significa que não há expiração programada.                                                       |
| Contexto autenticado | Sim         | Ator autorizado pela School da Membership.                                                                               |
| Aprovação adicional  | Condicional | Evidência de segunda aprovação quando a Role concedida é `SCHOOL_ADMIN`; a operação não é de concessor único nesse caso. |

O ator deve ser `SCHOOL_ADMIN` ativo na mesma School, e a Role deve estar na allowlist concedível por esse ator. Não se permite autoelevação nem Role global.

#### Saída

Em sucesso: `grantId`, `membershipId`, `roleId`, `schoolId`, `grantedBy`, `validFrom` e `validUntil`, se fornecido. A concessão efetiva emite `RoleGranted`.

#### Erros possíveis

- `MEM-001` — Membership inexistente ou não está `ACTIVE`.
- `MEM-003` — School da Membership não existe/não está habilitada ou não pode ser validada.
- `MEM-004` — Role não existe no catálogo escolar aprovado, está fora da allowlist do ator, Grant vigente já existe para Membership–Role, validade temporal inválida ou aprovação adicional requerida ausente/inválida.
- `MEM-005` — ator sem autorização na School, tentativa de autoelevação ou falha ao validar autorização.

### RevokeRole

#### Objetivo

Revogar um Grant escolar vigente para uma Role, encerrando imediatamente sua eficácia sem remover a Membership.

#### Entrada

| Campo                | Obrigatório | Significado                                                             |
| -------------------- | ----------- | ----------------------------------------------------------------------- |
| `grantId`            | Sim         | Concessão/ciclo a revogar.                                              |
| Motivo categorizado  | Opcional    | Motivo da revogação, quando aplicável.                                  |
| Contexto autenticado | Sim         | Ator autorizado pela School do Grant.                                   |
| Aprovação adicional  | Condicional | Evidência de segunda aprovação quando a Role do Grant é `SCHOOL_ADMIN`. |

O ator deve ser `SCHOOL_ADMIN` ativo na mesma School; não pode revogar Grants de outra School.

#### Saída

Em sucesso: `grantId`, `membershipId`, `roleId`, `schoolId` e instante de revogação. A concessão efetiva emite `RoleRevoked`; a Membership permanece inalterada.

#### Erros possíveis

- `MEM-001` — Grant/Membership alvo inexistente ou Membership não está `ACTIVE`.
- `MEM-003` — School do Grant não existe/não está habilitada ou não pode ser validada.
- `MEM-004` — Grant desconhecido, já revogado, fora de validade ou aprovação adicional requerida ausente/inválida.
- `MEM-005` — ator sem autorização na School, tentativa de ação fora de escopo ou falha ao validar autorização.

### ResolveSchoolContext

#### Objetivo

Validar no servidor o contexto escolar solicitado para uma operação protegida. A seleção de uma School não concede autorização permanente; cada operação protegida precisa validar seu contexto e Permission.

#### Entrada

| Campo                 | Obrigatório | Significado                                                                                                                     |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contexto autenticado  | Sim         | User e Session atuais, já validados pelo Auth.                                                                                  |
| `schoolId`            | Sim         | School solicitada como contexto. É uma solicitação, não prova de acesso.                                                        |
| Permission solicitada | Sim         | Ação `resource:action` cuja autorização será verificada.                                                                        |
| Contexto do recurso   | Sim         | Referência/escopo necessário para confirmar que o recurso pertence ao mesmo `schoolId` e está no estado que permite a operação. |

#### Saída

Em sucesso: resultado `VALIDATED`, `userId`, `membershipId`, `schoolId` canônico e Permission validada para a operação solicitada. Não retorna credenciais nem torna a autorização válida para outras operações ou recursos.

#### Erros possíveis

- `MEM-001` — Membership correspondente ausente, não `ACTIVE` ou não pertencente ao User/contexto solicitado.
- `MEM-002` — User ausente/inativo ou estado do User não validável.
- `MEM-003` — School ausente, não habilitada, não correspondente ao `schoolId` solicitado/recurso ou indisponível para validação.
- `MEM-004` — não existe Grant vigente para Role com Permission aplicável, ou a Role/Permission não corresponde à ação/escopo.
- `MEM-005` — Session/contexto autenticado inválido, ator sem autorização, validação obrigatória indisponível ou qualquer falha não classificável com segurança; negar sem fallback.

## Erros

Catálogo único e fechado para as seis operações deste documento:

| Código    | Significado funcional                                                                                                                                                                                                        | Operações                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `MEM-001` | Membership/Grant não encontrado, estado incompatível com a operação ou Membership não vigente.                                                                                                                               | ActivateMembership, DeactivateMembership, GrantRole, RevokeRole, ResolveSchoolContext |
| `MEM-002` | User inexistente/inativo ou não foi possível validar sua existência/estado pelo contrato de Users.                                                                                                                           | CreateMembership, ActivateMembership, ResolveSchoolContext                            |
| `MEM-003` | School inexistente, não habilitada, incompatível com o escopo solicitado ou não foi possível validá-la pelo contrato de Schools.                                                                                             | Todas as operações conforme aplicável                                                 |
| `MEM-004` | Role/Permission/Grant não elegível: Role desconhecida/não escolar/fora da allowlist, Permission inaplicável, concessão duplicada ou expirada/revogada, validade inválida ou aprovação privilegiada exigida ausente/inválida. | GrantRole, RevokeRole, ResolveSchoolContext                                           |
| `MEM-005` | Ator/contexto não autorizado ou validação obrigatória indisponível; acesso negado por fail closed.                                                                                                                           | Todas as operações conforme aplicável                                                 |

Falhas de estado de Membership e de concessão devem revelar somente o necessário ao chamador autorizado para corrigir a operação; `ResolveSchoolContext` não deve expor se outra Membership ou Role existe para um User/escola diferente do contexto solicitado.

## Segurança

- **Fail closed:** se Auth/Authorization não conseguir verificar Session/User, Membership, Grant, Role, Permission, School, `schoolId` ou recurso necessários, a operação é negada. Dependência indisponível nunca equivale a autorização.
- **Membership obrigatória:** acesso escolar exige User ativo e SchoolMembership `ACTIVE` que vincule esse User à School solicitada. `PENDING` e `REVOKED` não concedem acesso.
- **Validação de School Context:** `schoolId` fornecido pelo chamador é apenas solicitado. ResolveSchool/ValidateSchool confirma School existente e habilitada; servidor exige correspondência entre School, Membership e recurso. Não há escolha ou fallback automático para outra School.
- **Validação de Role:** Grant deve estar vigente (`validFrom` inclusivo, `validUntil` exclusivo quando presente), não revogado e associado à Membership `ACTIVE`; Role deve ser escolar, permitida e concedida no mesmo `schoolId`; Permission deriva de RolePermission. Role, Grant ou Permission isoladamente não autorizam.
- **Atores de mutação:** operações de Membership/Role exigem `SCHOOL_ADMIN` ativo da mesma School e Permission aplicável. Grants de `SCHOOL_ADMIN` exigem dupla aprovação; não se permite autoelevação. Não se confia em `actorId`, `roleId`, `membershipId` ou `schoolId` informado pelo cliente sem verificação server-side.
- **Separação de ownership:** User e School são resolvidos por seus owners; Auth/Authorization não consulta nem altera seus dados internos. Nenhuma operação cria User ou School.

## Testes

| ID        | Cenário                                | Critério de contrato                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MCT-001` | CreateMembership válida                | Com chamador autorizado `SCHOOL_ADMIN`, User `ACTIVE` e School habilitada, CreateMembership retorna Membership `PENDING` com referências canônicas; não cria Grant nem emite `MembershipCreated`.                                                                                                                                                                                           |
| `MCT-002` | ActivateMembership                     | ActivateMembership aceita somente `PENDING` com User ativo e School habilitada, retorna `ACTIVE` e emite `MembershipCreated`; uma Membership `REVOKED` não pode ser ativada.                                                                                                                                                                                                                |
| `MCT-003` | DeactivateMembership                   | DeactivateMembership aceita `PENDING`/`ACTIVE`, retorna `REVOKED` e emite `MembershipRemoved`; a Membership revogada não autoriza e não pode ser reativada.                                                                                                                                                                                                                                 |
| `MCT-004` | GrantRole autorizado                   | Com Membership `ACTIVE`, Role escolar concedível, ator autorizado, validade correta e aprovações necessárias, GrantRole retorna concessão no mesmo `schoolId` e emite `RoleGranted`; não concede Permission diretamente.                                                                                                                                                                    |
| `MCT-005` | RevokeRole                             | Para Grant vigente sob ator autorizado, RevokeRole retorna confirmação e emite `RoleRevoked`; Grant deixa de autorizar checagens subsequentes e Membership permanece inalterada.                                                                                                                                                                                                            |
| `MCT-006` | ResolveSchoolContext válido e inválido | Com Session/User válidos, School habilitada, Membership `ACTIVE`, Grant dentro da validade e Permission derivada aplicável ao recurso, ResolveSchoolContext retorna `VALIDATED` com referências correspondentes. Com escopo divergente, Membership inativa/ausente, Grant expirado/revogado, Permission inaplicável ou dependência indisponível, nega sem fallback nem contexto autorizado. |

## READY FOR API IMPLEMENTATION

### Existe informação suficiente para implementar os contratos?

**SIM**, para os seis contratos funcionais deste escopo. Entradas, saídas, atores, transições, validade, ownership, erros e requisitos de segurança estão definidos pelas decisões e pelo desenho de persistência V1.

Este GO cobre somente o contrato funcional. Não autoriza OpenAPI, Swagger, REST, GraphQL, código, banco, frontend, novas operações, novos eventos ou alteração das decisões do MVP.
