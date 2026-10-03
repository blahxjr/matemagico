# MEMBERSHIP MVP DECISIONS

## Status e aplicabilidade

Este documento fecha decisões operacionais para o design da persistência SchoolMembership no MVP. Aplica-se somente ao MVP, complementa [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md) e não altera nem promove ADR-0002, ADR-0003 ou ADR-0004. Os ADRs mantêm seus status atuais.

O recorte é SchoolMembership, Role, Permission e concessões escolares (Grant), com referências a User e School. Não inclui Class, Enrollment, convites, roles globais, outros módulos, protocolos ou interfaces tecnológicas. Uma regra explicitamente indicada como escolha operacional MVP resolve o escopo desta versão; não constitui baseline arquitetural definitiva.

## 1. SchoolMembership

**SchoolMembership é Aggregate Root e entidade do domínio Membership.** É a raiz do vínculo User–School que governa acesso escolar. Seu owner é Auth / Authorization; User e School permanecem sob ownership de Users e Schools, respectivamente, e são referenciados por seus identificadores, não incorporados como entidades próprias à Membership.

A raiz protege as invariantes do vínculo e das concessões escolares associadas: um único User e uma única School por Membership, um único vínculo ativo por par User–School, escopo escolar consistente e concessões limitadas àquela Membership/School. Role e Permission permanecem catálogos de Auth / Authorization, não entidades internas da SchoolMembership. A atribuição Grant será mantida como relação lógica associada à Membership.

Esta classificação é uma decisão operacional para o MVP. Resolve a lacuna de composição documentada em MEMBERSHIP-FOUNDATION sem alterar o status das Aggregate Roots nos ADRs.

## 2. Lifecycle da Membership

Estados fechados para o MVP:

- **PENDING:** vínculo criado, ainda sem autorização.
- **ACTIVE:** vínculo vigente, elegível para participar de uma decisão de autorização; não concede acesso sem Grant/Role/Permission e validação contextual.
- **REVOKED:** vínculo encerrado de forma terminal; não concede autorização e não pode ser reativado.

Transições permitidas:

| Estado atual | Operação                                  | Estado resultante    |
| ------------ | ----------------------------------------- | -------------------- |
| —            | CreateMembership                          | PENDING              |
| PENDING      | ActivateMembership                        | ACTIVE               |
| PENDING      | DeactivateMembership                      | REVOKED              |
| ACTIVE       | DeactivateMembership                      | REVOKED              |
| REVOKED      | Qualquer operação de ativação/desativação | Sem transição; negar |

Não há estado `SUSPENDED` para SchoolMembership no MVP. Suspensão global de User é estado de Users e, independentemente do estado da Membership, impede autorização enquanto persistir. Para um par User–School pode existir no máximo uma Membership `ACTIVE`; após revogação, um novo vínculo pode ser criado como novo ciclo, preservando a distinção conceitual entre Membership revogada e novo vínculo.

`MembershipCreated` é emitido quando a Membership se torna `ACTIVE`; a criação em `PENDING` não emite evento. `MembershipRemoved` é emitido na transição para `REVOKED`. São eventos já nomeados nas fontes; esta definição operacional não cria nomes de eventos.

## 3. Role

**Uma Membership pode possuir múltiplas Roles**, desde que cada Role seja concedida por Grant separado e cada concessão permaneça restrita ao `schoolId` da Membership. Uma Role escolar pode, conceitualmente, estar concedida a memberships distintas dentro de seus respectivos escopos escolares.

O catálogo de Roles é controlado por Auth / Authorization. Para o MVP, somente Roles escolares existentes no catálogo aprovado podem ser concedidas; roles globais não são concedidas por este fluxo. O desenho persistente representa Grant/MembershipRoleAssignment ligado à Membership e à Role, sem transferir ownership de Role à Membership.

## 4. Permission

**Permissions são derivadas de Roles.** Para o MVP, não há concessão direta de Permission a User ou SchoolMembership. A autorização obtém as Permissions do catálogo Role–Permission (`RolePermission`) para cada Role concedida e aplica os checks vigentes de User, Membership, School, recurso e escopo.

Role sem Permission aplicável não autoriza. Mudança em Role–Permission é controlada pelo owner Auth / Authorization, versionada e auditada conforme ADR-0004; não é uma atribuição individual de Membership.

## 5. Grant

**Grant é uma relação lógica com atributos, não uma entidade de domínio independente nem uma projeção.** No modelo de persistência conceitual do MVP, corresponde a `MembershipRoleAssignment`, nome já utilizado nas fontes, vinculando uma SchoolMembership a uma Role e carregando `schoolId`, `grantedBy`, validade e estado/revogação aplicáveis.

A relação integra o limite de consistência da SchoolMembership para impor que o User, Membership, Role e `schoolId` pertençam à mesma concessão escolar. Role e Permission continuam referências ao catálogo Auth / Authorization. Não se cria um Aggregate Root Grant.

Para o mesmo par Membership–Role, pode haver no máximo uma concessão vigente. Após revogação, uma nova concessão da mesma Role pode ser registrada como novo ciclo, mantendo o histórico da concessão revogada. Concessão repetida enquanto já houver uma vigente não cria duplicata nem amplia o escopo.

Um Grant autoriza somente quando seu `validFrom`/`validUntil` permite, não foi revogado e sua SchoolMembership está `ACTIVE`. Revogar a Membership torna seus Grants inefetivos sem reescrever o histórico de cada concessão; Grant não é transferido para outro ciclo de Membership.

## 6. Validade das concessões

**Concessões possuem validade? SIM.**

- Cada Grant tem `validFrom`, inclusivo, obrigatório.
- `validUntil`, exclusivo, é opcional; quando ausente, a concessão não tem expiração programada.
- A concessão é vigente quando `validFrom <= instante atual`, `validUntil` está ausente ou o instante atual é anterior a `validUntil`, e a concessão não foi revogada.
- Revogar encerra a concessão imediatamente para verificações subsequentes; validade temporal já iniciada não impede revogação.
- `MembershipRoleAssignment` e seus campos de validade são conceitos documentados no ADR-0004; inclusão do comportamento exato acima é decisão operacional do MVP.

## 7. Atores autorizados

Todas as operações exigem sessão válida, User ativo e autorização server-side no `schoolId` alvo. O ator de gestão escolar no MVP é um **SCHOOL_ADMIN com Membership ativa na mesma School** e permissão aplicável. O ator não pode operar sobre outra escola usando IDs fornecidos pelo cliente.

| Operação                 | Ator autorizado no MVP                | Limites                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CreateMembership**     | `SCHOOL_ADMIN` ativo da School alvo.  | Cria somente Membership PENDING para User `ACTIVE` e School habilitada, confirmados por contrato público; não cria User nem concede Role automaticamente.                                                                                                                                 |
| **ActivateMembership**   | `SCHOOL_ADMIN` ativo da mesma School. | Ativa somente Membership PENDING após confirmação server-side de User `ACTIVE` e School habilitada; não concede Role por si só.                                                                                                                                                           |
| **DeactivateMembership** | `SCHOOL_ADMIN` ativo da mesma School. | Revoga a Membership terminalmente e encerra suas concessões efetivas; não altera User nem School.                                                                                                                                                                                         |
| **GrantRole**            | `SCHOOL_ADMIN` ativo da mesma School. | Concede somente Roles escolares da allowlist autorizada para o ator e para o alvo. Não permite concessão de Role global, autoelevação nem ampliação além do escopo da School. Concessões de `SCHOOL_ADMIN` exigem dupla aprovação conforme ADR-0004; não são operação de concessor único. |
| **RevokeRole**           | `SCHOOL_ADMIN` ativo da mesma School. | Revoga somente Grant escolar dentro da própria School; não remove Membership. Revogação de Role `SCHOOL_ADMIN` exige dupla aprovação conforme ADR-0004.                                                                                                                                   |

`COORDINATOR` não recebe estas operações de concessão/gestão no MVP, apesar de sua capacidade documentada limitada de administrar Membership; restringir as mutações a `SCHOOL_ADMIN` é a decisão operacional mínima para o Sprint. `GLOBAL_ADMIN` não participa do fluxo comum de gestão escolar deste recorte. A exigência de dupla aprovação para concessões/revogações privilegiadas permanece aplicável e não é substituída por esta tabela.

## 8. Contratos externos mínimos

Os contratos abaixo são responsabilidades conceituais síncronas entre owners; não definem API, transporte, implementação ou formato de dados.

### ResolveUser

- **Owner:** Users.
- **Responsabilidade:** localizar a identidade canônica pelo `userId` solicitado e retornar somente identidade e estado global necessários a Membership/Authorization.
- **Uso por Auth / Authorization:** confirmar que o User existe e está ativo antes de ativar Membership ou autorizar uma operação escolar.
- **Limite:** não cria nem altera User, não retorna credenciais/perfil desnecessário e não concede autorização.

### ResolveSchool

- **Owner:** Schools.
- **Responsabilidade:** localizar a School pelo `schoolId` canônico e retornar sua identidade e estado institucional necessários ao contexto.
- **Uso por Auth / Authorization:** resolver a School alvo sem consultar persistência interna de Schools.
- **Limite:** não cria nem altera School e não interpreta estado de Membership/Role.

### ValidateSchool

- **Owner:** Schools.
- **Responsabilidade:** confirmar que o `schoolId` resolvido corresponde a uma School existente e habilitada para a operação solicitada.
- **Uso por Auth / Authorization:** validar estado institucional antes de ativar Membership, conceder contexto ou permitir autorização escolar.
- **Limite:** retorna somente o resultado de validação e a referência canônica necessária; falha ou indisponibilidade resulta em negação. Não autoriza User/Membership nem substitui a avaliação de Auth / Authorization.

## 9. Matriz final

| Tema                         | Decisão                                                                                                                                                                                           | Justificativa                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| SchoolMembership             | Aggregate Root e entidade do owner Auth / Authorization.                                                                                                                                          | Limite de consistência do vínculo User–School e das invariantes das concessões locais.                    |
| Referências de Membership    | Exatamente um `userId` e um `schoolId`; User e School permanecem sob seus owners.                                                                                                                 | Preserva boundaries e tenancy por `schoolId`.                                                             |
| Lifecycle                    | `PENDING` → `ACTIVE` → `REVOKED`; `PENDING` também pode ir a `REVOKED`; REVOKED é terminal.                                                                                                       | `PENDING` não autoriza; ativação é explícita; revogação encerra acesso sem apagar o histórico conceitual. |
| Suspensão de Membership      | Não existe estado `SUSPENDED` de Membership no MVP.                                                                                                                                               | Evita duplicar suspensão global de User; User suspenso sempre falha na autorização.                       |
| Unicidade ativa User–School  | No máximo uma Membership ativa por par; novo ciclo pode ser criado após revogação anterior.                                                                                                       | Mantém o limite do ADR-0004 sem impedir histórico de ciclos distintos.                                    |
| Roles por Membership         | Múltiplas Roles via Grants separados.                                                                                                                                                             | ADR-0004 permite múltiplos papéis independentes na mesma Membership.                                      |
| Permissions                  | Derivadas exclusivamente de Role–Permission; sem concessão direta.                                                                                                                                | Alinha catálogo RBAC documentado e impede autoridade implícita.                                           |
| Grant                        | Relação lógica com atributos, correspondente a `MembershipRoleAssignment`; sem entidade/raiz própria e sem projeção. Efetivo somente durante Membership ACTIVE; sua revogação preserva histórico. | Reutiliza o conceito documentado e mantém consistência dentro da Membership.                              |
| Duplicidade de Grant vigente | No máximo uma concessão vigente por Membership–Role; pode haver novo ciclo após revogação.                                                                                                        | Evita Grants concorrentes/duplicados para a mesma Role no mesmo vínculo.                                  |
| Validade de Grant            | SIM: `validFrom` obrigatório/inclusivo, `validUntil` opcional/exclusivo; revogação encerra imediatamente.                                                                                         | Os campos de validade constam no ADR-0004; semântica de avaliação é fechada para o MVP.                   |
| Gestão escolar               | `SCHOOL_ADMIN` ativo da School alvo, com permissão aplicável, executa operações de Membership/Role dentro daquela School.                                                                         | Usa ator e escopo nomeados na permission matrix; restringe mutações do Sprint a um caminho operacional.   |
| Roles privilegiadas          | Concessão/revogação de `SCHOOL_ADMIN` exige dupla aprovação; sem autoelevação.                                                                                                                    | Preserva a exigência documentada para ações privilegiadas.                                                |
| ResolveUser                  | Users resolve identidade/estado mínimo por `userId`.                                                                                                                                              | Respeita ownership e permite validar User sem acesso a internals.                                         |
| ResolveSchool                | Schools resolve identidade/estado por `schoolId`.                                                                                                                                                 | Respeita ownership e fornece referência canônica da School.                                               |
| ValidateSchool               | Schools confirma existência e habilitação operacional para a operação.                                                                                                                            | Contexto escolar exige validação server-side da School; falha nega acesso.                                |
| Eventos                      | Usar somente `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`; MembershipCreated no início da vigência, MembershipRemoved na revogação terminal.                            | Os quatro nomes e owners são documentados; nenhuma transição exige evento novo.                           |
| Aplicabilidade               | Decisões operacionais restritas ao MVP; ADRs não alterados nem promovidos.                                                                                                                        | Destrava o design sem alterar baseline definitiva.                                                        |

## 10. GO / NO GO

### É possível modelar a persistência?

**SIM.** O desenho conceitual necessário à persistência de Membership está fechado para o MVP: Aggregate Root e ownership, referências a User/School, estados/transições, multiplicidade de Roles, natureza e cardinalidade operacional de Grants, validade, atores e consultas externas por contrato. Isso permite produzir um design de persistência sem novas decisões arquiteturais.

O GO autoriza modelar a persistência conforme este documento; não autoriza criar schema, banco, API, código, eventos novos ou expandir o escopo. Não altera nem promove os ADRs existentes.
