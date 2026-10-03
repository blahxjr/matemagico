# MEMBERSHIP APPLICATION SERVICES

## Escopo e convenções

Este documento mapeia os serviços de aplicação de Membership V1 conforme [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md), [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md), [MEMBERSHIP-PERSISTENCE-DESIGN.md](./MEMBERSHIP-PERSISTENCE-DESIGN.md) e [MEMBERSHIP-API-CONTRACTS.md](./MEMBERSHIP-API-CONTRACTS.md). O escopo contém somente `CreateMembership`, `ActivateMembership`, `DeactivateMembership`, `GrantRole`, `RevokeRole` e `ResolveSchoolContext`.

As regras arquiteturais estão congeladas para o MVP e não são reavaliadas aqui. As dependências externas descritas são responsabilidades conceituais, não novas operações de aplicação nem escolhas tecnológicas.

## Serviços

### CreateMembership

- **Objetivo:** criar uma SchoolMembership em estado `PENDING` para um User ativo e uma School habilitada, sem ativar o vínculo nem conceder Role.
- **Entradas:** `userId`, `schoolId` e contexto autenticado do ator.
- **Saídas:** `membershipId`, `userId`, `schoolId` e estado `PENDING`.
- **Dependências:**
  - Contexto autenticado e autorização server-side do ator como `SCHOOL_ADMIN` ativo, com Permission aplicável na School alvo.
  - Contrato público de Users para confirmar que o User existe e está ativo.
  - Contrato público de Schools para resolver a School e confirmar que está habilitada.
  - `SchoolMembershipRepository` para registrar a Membership sob ownership Auth / Authorization.
  - Registro/auditoria da criação, sem emitir `MembershipCreated` nesta transição.

### ActivateMembership

- **Objetivo:** transicionar uma Membership `PENDING` para `ACTIVE`; não concede Role automaticamente.
- **Entradas:** `membershipId` e contexto autenticado do ator.
- **Saídas:** `membershipId`, `userId`, `schoolId`, estado `ACTIVE` e instante de ativação.
- **Dependências:**
  - `SchoolMembershipRepository` para localizar a Membership e persistir a transição permitida.
  - Contexto autenticado e autorização server-side de `SCHOOL_ADMIN` ativo na mesma School.
  - Contrato público de Users para confirmar User existente e ativo.
  - Contrato público de Schools para resolver e confirmar School habilitada.
  - Auditoria e emissão de `MembershipCreated` após a transição efetiva.

### DeactivateMembership

- **Objetivo:** transicionar uma Membership `PENDING` ou `ACTIVE` para `REVOKED`, estado terminal que deixa a Membership e seus Grants sem eficácia de autorização.
- **Entradas:** `membershipId`, motivo categorizado opcional e contexto autenticado do ator.
- **Saídas:** `membershipId`, `userId`, `schoolId`, estado `REVOKED` e instante de revogação.
- **Dependências:**
  - `SchoolMembershipRepository` para localizar a Membership e persistir a revogação.
  - Contexto autenticado e autorização server-side de `SCHOOL_ADMIN` ativo na mesma School.
  - Contrato público de Schools para validar a School vinculada, conforme o contrato funcional.
  - Auditoria da mutação e emissão de `MembershipRemoved` após a transição efetiva.
  - A resolução de permissões deve tratar os Grants da Membership `REVOKED` como inefetivos, preservando seu histórico.

### GrantRole

- **Objetivo:** conceder uma Role escolar permitida a uma Membership `ACTIVE`, com validade e escopo iguais ao da School da Membership.
- **Entradas:** `membershipId`, `roleId`, `validFrom`, `validUntil` opcional, contexto autenticado do ator e aprovação adicional quando exigida para Role `SCHOOL_ADMIN`.
- **Saídas:** `grantId`, `membershipId`, `roleId`, `schoolId`, `grantedBy`, `validFrom` e `validUntil` quando presente.
- **Dependências:**
  - `SchoolMembershipRepository` para resolver a Membership e seu estado/escola.
  - `RoleRepository` para validar Role escolar aprovada e permissão de concessão pelo ator.
  - `GrantRepository` para verificar concessão vigente e registrar o novo ciclo sem duplicar Grant vigente para Membership–Role.
  - Contexto autenticado e autorização server-side de `SCHOOL_ADMIN` ativo na mesma School; validação de ausência de autoelevação e de dupla aprovação para `SCHOOL_ADMIN`.
  - Contrato público de Schools para confirmar a School habilitada quando necessário à operação.
  - Auditoria e emissão de `RoleGranted` após a concessão efetiva.

### RevokeRole

- **Objetivo:** revogar um Grant vigente de Role escolar, encerrando sua eficácia imediatamente sem remover a Membership.
- **Entradas:** `grantId`, motivo categorizado opcional, contexto autenticado do ator e aprovação adicional quando exigida para Role `SCHOOL_ADMIN`.
- **Saídas:** `grantId`, `membershipId`, `roleId`, `schoolId` e instante de revogação.
- **Dependências:**
  - `GrantRepository` para resolver o Grant e persistir sua revogação sem apagar o histórico.
  - `SchoolMembershipRepository` para validar a Membership associada e seu estado.
  - `RoleRepository` para validar a Role do Grant e determinar se a aprovação adicional se aplica.
  - Contexto autenticado e autorização server-side de `SCHOOL_ADMIN` ativo na mesma School.
  - Contrato público de Schools para validar a School vinculada, conforme o contrato funcional.
  - Auditoria e emissão de `RoleRevoked` após a revogação efetiva.

### ResolveSchoolContext

- **Objetivo:** validar no servidor o contexto escolar e a Permission necessária para uma operação protegida; a validação não concede autorização permanente nem se aplica automaticamente a outros recursos/operações.
- **Entradas:** contexto autenticado, `schoolId` solicitado, Permission `resource:action` e contexto/referência do recurso a verificar.
- **Saídas:** resultado `VALIDATED`, `userId`, `membershipId`, `schoolId` canônico e Permission validada para a operação solicitada; na falha, negação sem contexto autorizado.
- **Dependências:**
  - Contexto Auth para validar Session e User.
  - `SchoolMembershipRepository` para resolver a Membership do User para a School e confirmar estado `ACTIVE`.
  - Contrato público de Schools para resolver e validar que a School existe e está habilitada.
  - `GrantRepository` para resolver Grants não revogados e dentro da validade.
  - `RoleRepository` para resolver Roles escolares associadas aos Grants.
  - `PermissionRepository` para verificar Permission derivada da relação Role–Permission e sua aplicabilidade à ação/escopo.
  - Contexto do recurso para confirmar existência, estado permitido e igualdade de `schoolId` com Membership e School.

## Fluxos

### CreateMembership

1. Validar Session e identidade do ator pelo contexto autenticado.
2. Validar server-side que o ator é `SCHOOL_ADMIN` com Membership `ACTIVE` e Permission aplicável na School solicitada.
3. Resolver `userId` por Users e confirmar que User existe e está ativo.
4. Resolver `schoolId` por Schools e confirmar que School existe e está habilitada.
5. Criar e persistir a SchoolMembership em estado `PENDING`, vinculando os identificadores canônicos de User e School.
6. Registrar a auditoria de criação. Não criar Role/Grant e não emitir `MembershipCreated`.
7. Retornar `membershipId`, `userId`, `schoolId` e estado `PENDING`.

### ActivateMembership

1. Validar Session e identidade do ator pelo contexto autenticado.
2. Carregar a Membership por `membershipId`; negar se não existir ou não estiver `PENDING`.
3. Validar que o ator é `SCHOOL_ADMIN` ativo na mesma School.
4. Resolver e revalidar o User associado; exigir User existente e ativo.
5. Resolver e revalidar a School associada; exigir School existente e habilitada.
6. Transicionar `PENDING` para `ACTIVE` e registrar instante/ator.
7. Registrar auditoria e emitir `MembershipCreated` após a transição efetiva.
8. Retornar a Membership ativa; não criar Grant automaticamente.

### DeactivateMembership

1. Validar Session e identidade do ator pelo contexto autenticado.
2. Carregar a Membership por `membershipId`; negar se não existir ou já estiver `REVOKED`.
3. Validar que o ator é `SCHOOL_ADMIN` ativo na mesma School.
4. Validar a School associada conforme o contrato funcional; falha ou indisponibilidade nega a operação.
5. Transicionar `PENDING` ou `ACTIVE` para `REVOKED`, registrando instante, ator e motivo categorizado quando fornecido.
6. Registrar auditoria e emitir `MembershipRemoved` após a transição efetiva.
7. Retornar a Membership revogada. Os Grants associados tornam-se inefetivos devido ao estado da Membership; seu histórico é preservado.

### GrantRole

1. Validar Session e identidade do ator pelo contexto autenticado.
2. Carregar a Membership; exigir estado `ACTIVE`.
3. Validar que o ator é `SCHOOL_ADMIN` ativo na mesma School e pode conceder a Role solicitada.
4. Confirmar que a Role existe no catálogo aprovado, é escolar e está na allowlist aplicável; negar Role global, autoelevação ou concessão fora da School.
5. Quando a Role alvo for `SCHOOL_ADMIN`, confirmar a aprovação adicional exigida.
6. Validar `validFrom` obrigatório e `validUntil` opcional, com limite final exclusivo; confirmar que o Grant respeita o escopo da Membership.
7. Verificar que não existe Grant vigente para o mesmo par Membership–Role.
8. Registrar a concessão e sua auditoria, emitindo `RoleGranted` após a alteração efetiva.
9. Retornar o ciclo de Grant criado; Permissions permanecem derivadas da Role.

### RevokeRole

1. Validar Session e identidade do ator pelo contexto autenticado.
2. Resolver o Grant por `grantId` e a Membership associada; exigir Grant ainda vigente e Membership `ACTIVE`.
3. Validar que o ator é `SCHOOL_ADMIN` ativo na mesma School do Grant.
4. Validar a Role associada; se for `SCHOOL_ADMIN`, confirmar a aprovação adicional exigida.
5. Registrar revogação imediata, instante, ator e motivo categorizado quando fornecido, preservando o histórico.
6. Registrar auditoria e emitir `RoleRevoked` após a alteração efetiva.
7. Retornar a confirmação do Grant revogado; não alterar o estado da Membership.

### ResolveSchoolContext

1. Validar Session e User ativo pelo contexto Auth.
2. Resolver o `schoolId` solicitado por Schools e confirmar que a School existe e está habilitada.
3. Localizar a SchoolMembership correspondente ao User autenticado e à School; exigir estado `ACTIVE`.
4. Resolver Grants ligados à Membership; considerar somente os não revogados, dentro da validade e com escopo igual ao da School/Membership.
5. Resolver as Roles dos Grants elegíveis e as Permissions derivadas de `RolePermission`; exigir Permission para `resource:action`.
6. Validar o contexto do recurso: existência, estado permitido e correspondência de `schoolId` com a School canônica e a Membership.
7. Se todos os checks forem verdadeiros, retornar `VALIDATED` com referências canônicas e Permission verificada. Se qualquer validação falhar ou estiver indisponível, negar sem fallback para outra School.

## Repositórios

Somente os repositórios abaixo fazem parte do desenho de Membership. User e School são resolvidos por contratos públicos de seus owners, não por repositórios de Membership.

### SchoolMembershipRepository

- Localizar SchoolMembership pelo `membershipId`.
- Resolver Membership correspondente aos identificadores de User e School para consultas de autorização.
- Registrar criação em `PENDING` e transições permitidas para `ACTIVE` ou `REVOKED`.
- Expor estado e referências canônicas mínimos para validar vínculo, lifecycle e escopo.
- Preservar a regra de no máximo uma Membership `ACTIVE` por par User–School.
- Não criar nem alterar User ou School.

### RoleRepository

- Localizar Roles do catálogo controlado e aprovado.
- Determinar se uma Role é escolar e está disponível para concessão.
- Fornecer as associações Role–Permission necessárias à resolução de autorização.
- Apoiar a validação da allowlist concedível pelo ator e identificar Roles privilegiadas que exigem dupla aprovação.
- Não conceder Role a Membership por si só; a atribuição é registrada como Grant.

### PermissionRepository

- Resolver Permissions do catálogo por recurso/ação e escopo aplicável.
- Consultar a relação Role–Permission vigente para derivar as Permissions candidatas.
- Permitir verificar se a ação solicitada corresponde a Permission aplicável.
- Não armazenar concessões diretas a User ou Membership nem decidir isoladamente a autorização contextual.

### GrantRepository

- Localizar Grant por `grantId` e listar/resolver Grants associados à Membership.
- Registrar concessão de Role com `schoolId`, ator concessor e validade.
- Verificar estado de revogação e validade inclusiva/exclusiva, e impor no máximo um Grant vigente por par Membership–Role.
- Revogar Grant vigente imediatamente, registrando instante/ator e preservando seu histórico.
- Não atuar como Aggregate Root independente nem transformar Grant em entidade de domínio autônoma.

## Validações

| Situação                      | Validação e resultado                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Membership inexistente**    | Ao carregar por `membershipId` ou resolver User–School, não há vínculo correspondente. Negar a mutação/autorização e reportar a falha funcional prevista no contrato, sem procurar vínculo de outra School.                                                                                            |
| **Membership inativa**        | `PENDING` não pode ser usada para autorização nem receber Grant; `REVOKED` é terminal, não pode ser reativada e não autoriza. Só `PENDING` pode ser ativada; `PENDING` ou `ACTIVE` pode ser revogada.                                                                                                  |
| **Role inválida**             | Role ausente do catálogo aprovado, global, não permitida ao ator, fora do escopo escolar ou tentativa de autoelevação não pode ser concedida. Role sem Permission aplicável não autoriza.                                                                                                              |
| **Role removida**             | Grant revogado deixa de ser efetivo imediatamente, ainda que seu intervalo de validade não tenha terminado. A Membership permanece inalterada e o histórico do Grant é preservado.                                                                                                                     |
| **School inválida**           | School deve ser resolvida e validada por seu owner como existente e habilitada; indisponibilidade da validação também nega.                                                                                                                                                                            |
| **Contexto escolar inválido** | Negar se Session/User, Membership, Grant, Role/Permission, School ou recurso não validar; se Membership/Grant não estiver vigente; ou se `schoolId` canônico da School, Membership e recurso divergir. Não selecionar outra School nem usar dados de contexto fornecidos pelo cliente como autoridade. |

## Testes

Cada teste de aplicação abaixo corresponde ao teste contratual indicado em [MEMBERSHIP-API-CONTRACTS.md](./MEMBERSHIP-API-CONTRACTS.md). O contrato permanece a fonte da expectativa funcional.

| ID        | Mapeia para | Serviço(s)           | Critério objetivo                                                                                                                                                                             |
| --------- | ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAT-001` | `MCT-001`   | CreateMembership     | Com `SCHOOL_ADMIN` autorizado, User ativo e School habilitada, cria e retorna Membership `PENDING`; não cria Grant e não emite `MembershipCreated`.                                           |
| `MAT-002` | `MCT-002`   | ActivateMembership   | Ativa somente Membership `PENDING` após validar User e School; retorna `ACTIVE` e emite `MembershipCreated`; Membership `REVOKED` é negada.                                                   |
| `MAT-003` | `MCT-003`   | DeactivateMembership | Revoga Membership `PENDING` ou `ACTIVE`, retorna `REVOKED` e emite `MembershipRemoved`; Membership revogada não autoriza nem pode ser reativada.                                              |
| `MAT-004` | `MCT-004`   | GrantRole            | Com Membership `ACTIVE`, ator autorizado, Role escolar permitida e validade correta, registra Grant no mesmo `schoolId` e emite `RoleGranted`; não concede Permission diretamente.            |
| `MAT-005` | `MCT-005`   | RevokeRole           | Revoga Grant vigente, emite `RoleRevoked`, torna-o imediatamente inefetivo e mantém o estado da Membership.                                                                                   |
| `MAT-006` | `MCT-006`   | ResolveSchoolContext | Retorna contexto validado somente quando Session/User, School, Membership ativa, Grant vigente, Permission e escopo/recurso correspondem; em qualquer falha ou divergência nega sem fallback. |

## READY FOR CODING

### Existe informação suficiente para implementar os serviços?

**SIM**, para os seis serviços de aplicação do Membership V1. As responsabilidades, entradas, saídas, dependências conceituais, fluxos, validações e cenários contratuais estão definidos pelas fontes congeladas.

O GO limita-se ao desenho dos serviços. Não autoriza gerar código, tecnologia, Prisma, SQL, API, frontend, novos serviços, novas regras ou alterações de domínio, persistência e contratos.
