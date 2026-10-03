# MEMBERSHIP PERSISTENCE DESIGN

## Escopo e convenções

Este documento descreve o desenho conceitual de persistência para SchoolMembership V1, conforme [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md), [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md) e ADR-0002, ADR-0003 e ADR-0004. Não define tipos tecnológicos, banco, schema, API ou implementação física.

O escopo inclui SchoolMembership, Role, Permission e Grant, além da relação Role–Permission. `User` e `School` são referências conceituais cujos dados pertencem a Users e Schools, respectivamente. Class, Enrollment, Question, Attempt e Ranking estão fora do escopo.

- **Fato documentado:** conceito, owner, campo ou regra citado pelas fontes.
- **Decisão MVP:** política operacional congelada em MEMBERSHIP-MVP-DECISIONS.
- **Derivado:** representação semântica necessária para persistir e verificar a decisão.
- O status `Proposed` dos ADRs não é alterado por este desenho.

## Entidades

### SchoolMembership

- **Responsabilidade:** representar o vínculo de acesso entre um User e uma School e proteger seu ciclo de vida e concessões escolares.
- **Owner:** Auth / Authorization.
- **Aggregate Root:** sim, conforme decisão operacional MVP.
- **Lifecycle:** `PENDING` → `ACTIVE` → `REVOKED`; `PENDING` também pode ir a `REVOKED`; `REVOKED` é terminal. `PENDING` e `REVOKED` não autorizam. Não há estado `SUSPENDED` para Membership.
- **Origem documental:** ADR-0002 §2.3; ADR-0003 §2.2; ADR-0004 §2.1–§2.4; MEMBERSHIP-FOUNDATION; MEMBERSHIP-MVP-DECISIONS.
- **Escopo:** referencia exatamente um `userId` e um `schoolId`; não incorpora nem persiste User ou School. É distinta de Enrollment.

### Role

- **Responsabilidade:** catálogo controlado de papéis nomeados, com escopo e conjunto de Permissions potenciais.
- **Owner:** Auth / Authorization.
- **Lifecycle:** catálogo aprovado/controlado pelo owner; estados adicionais ou remoção física não fazem parte das decisões do MVP. Roles escolares não abrangem roles globais neste escopo.
- **Origem documental:** ADR-0004 §2.1–§2.3; ADR-0002 §2.3; MEMBERSHIP-FOUNDATION; MEMBERSHIP-MVP-DECISIONS.

### Permission

- **Responsabilidade:** ação atômica sobre um recurso, conceitualmente identificada por recurso e ação, aplicada junto do escopo/contexto.
- **Owner:** Auth / Authorization.
- **Lifecycle:** catálogo controlado. Permission não tem concessão direta a User ou Membership; sua elegibilidade para uma operação deriva da relação Role–Permission e Grant vigente. Alterações de Role–Permission são versionadas/auditadas conforme ADR-0004.
- **Origem documental:** ADR-0004 §2.1–§2.4; ADR-0002 §2.3; MEMBERSHIP-FOUNDATION; MEMBERSHIP-MVP-DECISIONS.

### Grant (`MembershipRoleAssignment`)

- **Responsabilidade:** relação lógica com atributos que concede uma Role escolar a uma SchoolMembership.
- **Owner:** Auth / Authorization.
- **Natureza:** relação persistente com atributos, não entidade de domínio independente, projeção ou Aggregate Root. Integra as invariantes protegidas por SchoolMembership.
- **Lifecycle:** vigente quando dentro de sua validade, não revogada e associada a Membership `ACTIVE`. Revogação torna a concessão imediatamente inefetiva; mantém-se o histórico conceitual. Uma nova concessão pode iniciar novo ciclo.
- **Origem documental:** ADR-0004 §2.1–§2.4; ADR-0003 §2.2; MEMBERSHIP-FOUNDATION; MEMBERSHIP-MVP-DECISIONS.

### RolePermission

- **Responsabilidade:** associar Role às Permissions que ela habilita potencialmente.
- **Owner:** Auth / Authorization.
- **Lifecycle:** associação controlada, versionada e auditada. Não é uma concessão individual a Membership.
- **Origem documental:** ADR-0004 §2.1–§2.3; MEMBERSHIP-MVP-DECISIONS.

## Atributos

“Obrigatório” indica requisito semântico de persistência segundo fontes/decisões; não define nulabilidade física.

### SchoolMembership

| Campo                 | Obrigatório | Descrição                                                                                               |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `membershipId`        | Sim         | Identificador estável e distinto do User e da School.                                                   |
| `userId`              | Sim         | Referência à identidade global sob ownership de Users.                                                  |
| `schoolId`            | Sim         | Referência à School e escopo escolar canônico sob ownership de Schools.                                 |
| Estado                | Sim         | Um dos estados MVP: `PENDING`, `ACTIVE` ou `REVOKED`.                                                   |
| Instante de criação   | Sim         | Registra a criação do vínculo; nome semântico derivado para ciclo de vida/auditoria.                    |
| Instante de ativação  | Condicional | Instante em que a Membership passa a `ACTIVE`; necessário para registrar o ciclo de ativação.           |
| Instante de revogação | Condicional | Instante em que a Membership passa a `REVOKED`.                                                         |
| Ator da mutação       | Condicional | Identifica o ator de operações de ativação/revogação conforme auditoria; sem autoridade própria.        |
| Motivo categorizado   | Condicional | Evidência de auditoria para revogação quando aplicável; ADR-0004 cita motivo categorizado para remoção. |

Membership não possui janela temporal própria de validade no MVP. Sua eficácia deriva de estado `ACTIVE`, User ativo, School habilitada e demais predicados de autorização.

### Role

| Campo               | Obrigatório         | Descrição                                                                                                                            |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `roleId`            | Sim                 | Identificador estável e único da Role.                                                                                               |
| Nome/código da Role | Sim                 | Identifica a Role controlada no catálogo e permite referenciá-la por seus consumidores autorizados.                                  |
| Escopo              | Sim                 | Delimita a aplicabilidade; neste desenho somente Role escolar.                                                                       |
| Estado de catálogo  | Sim conceitualmente | Indica que a Role está aprovada/disponível para concessão segundo catálogo controlado; estados físicos além disso não são definidos. |

### Permission

| Campo                          | Obrigatório         | Descrição                                                                                   |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------- |
| `permissionId`                 | Sim                 | Identificador estável e único da Permission.                                                |
| Recurso                        | Sim                 | Recurso sobre o qual a ação atômica se aplica.                                              |
| Ação                           | Sim                 | Ação atômica sobre o recurso.                                                               |
| Nome estável `resource:action` | Sim                 | Representação semântica documentada da Permission; exemplo fonte: `class.create`.           |
| Escopo aplicável               | Sim conceitualmente | Escopo/contexto sob o qual a Permission pode ser avaliada; não concede acesso isoladamente. |

### Grant / MembershipRoleAssignment

| Campo                                           | Obrigatório | Descrição                                                                                                                 |
| ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Identificador do ciclo de concessão (`grantId`) | Sim         | Identifica univocamente uma ocorrência/ciclo da relação lógica; não transforma Grant em entidade de domínio independente. |
| `membershipId`                                  | Sim         | Referência à SchoolMembership beneficiada.                                                                                |
| `roleId`                                        | Sim         | Referência à Role escolar concedida.                                                                                      |
| `schoolId`                                      | Sim         | Escopo escolar da concessão; deve coincidir com o `schoolId` da Membership.                                               |
| `grantedBy`                                     | Sim         | Ator que concedeu a Role.                                                                                                 |
| `validFrom`                                     | Sim         | Início inclusivo da validade.                                                                                             |
| `validUntil`                                    | Não         | Limite exclusivo opcional; ausência significa sem expiração programada.                                                   |
| Estado da concessão                             | Sim         | Distingue concessão vigente de concessão revogada; validade temporal também participa da eficácia.                        |
| Instante de revogação                           | Condicional | Instante de encerramento imediato da concessão por revogação.                                                             |
| Ator da revogação                               | Condicional | Ator que revogou, para auditoria.                                                                                         |
| Motivo categorizado                             | Condicional | Motivo de revogação, quando fornecido, conforme trilha de auditoria.                                                      |

O MVP limita a no máximo uma concessão vigente para o par `membershipId`–`roleId`. Após revogação, uma concessão nova representa outro ciclo e não apaga o histórico anterior.

### RolePermission

| Campo                               | Obrigatório         | Descrição                                                                   |
| ----------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `roleId`                            | Sim                 | Role do catálogo.                                                           |
| `permissionId`                      | Sim                 | Permission do catálogo associada à Role.                                    |
| Versão da associação                | Sim conceitualmente | Permite versionar a associação Role–Permission conforme ADR-0004.           |
| Evidência de auditoria da alteração | Sim conceitualmente | Registra a alteração controlada da relação; detalhes físicos não definidos. |

## Identificadores

| Conceito            | Identificador principal                                        | Identificadores alternativos                                                             | Unicidade                                                                                                                                              |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SchoolMembership    | `membershipId`                                                 | Nenhum outro identificador substitui o principal. `userId` e `schoolId` são referências. | `membershipId` identifica uma Membership. No máximo uma Membership `ACTIVE` por par (`userId`, `schoolId`); após revogação pode haver novo ciclo.      |
| Role                | `roleId`                                                       | Nome/código estável do catálogo.                                                         | `roleId` único; nome/código estável não pode identificar duas Roles distintas no catálogo vigente.                                                     |
| Permission          | `permissionId`                                                 | Nome estável `resource:action`.                                                          | `permissionId` e nome `resource:action` identificam uma Permission cada um sem duplicidade no catálogo vigente.                                        |
| Grant               | `grantId`, identificador do ciclo da relação lógica.           | (`membershipId`, `roleId`, `grantId`) identifica a relação e seus participantes/ciclo.   | `grantId` identifica um ciclo; no máximo uma concessão vigente por (`membershipId`, `roleId`). Ciclos revogados permanecem distinguíveis no histórico. |
| RolePermission      | Chave lógica (`roleId`, `permissionId`, versão da associação). | Nenhum.                                                                                  | Uma associação por Role–Permission em cada versão; alterações são versionadas/auditadas.                                                               |
| User (referência)   | `userId`, definido pelo owner Users.                           | Nenhum neste desenho.                                                                    | Auth / Authorization não define unicidade nem persiste identidade User.                                                                                |
| School (referência) | `schoolId`, definido pelo owner Schools.                       | Nenhum neste desenho.                                                                    | Auth / Authorization não define unicidade nem persiste identidade School.                                                                              |

## Relacionamentos

```text
User (owner: Users)
  1
  ↓
  0..N SchoolMembership (owner: Auth / Authorization)
  N
  ↓
  1 School (owner: Schools)

SchoolMembership
  1
  ↓
  0..N Grant / MembershipRoleAssignment
  N
  ↓
  1 Role

Role
  0..N RolePermission
  ↕
  0..N Permission
```

| Relação                       | Cardinalidade                                                                                                                          | Responsabilidade                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| User → SchoolMembership       | Um User pode referenciar zero ou várias Memberships; cada Membership referencia exatamente um User.                                    | Permitir identidade global em várias escolas sem tornar Users owner do vínculo.                                                                   |
| School → SchoolMembership     | Uma School pode referenciar zero ou várias Memberships; cada Membership referencia exatamente uma School.                              | Delimitar o tenant escolar; Auth / Authorization possui a associação, Schools possui School.                                                      |
| User ↔ School, via Membership | No máximo uma Membership `ACTIVE` por par; Memberships `REVOKED` podem permanecer como ciclos históricos distintos.                    | Evitar duplicidade de vínculo vigente sem apagar histórico conceitual.                                                                            |
| SchoolMembership → Grant      | Uma Membership pode ter zero ou várias concessões, conforme Roles distintas e ciclos; cada Grant pertence a exatamente uma Membership. | A raiz protege consistência de concessões locais; Grant não é raiz independente.                                                                  |
| Role → Grant                  | Uma Role escolar pode estar concedida por Grants distintos; cada Grant refere exatamente uma Role.                                     | Atribuir papéis a memberships sem copiar a Role para dentro da Membership.                                                                        |
| Role ↔ Permission             | Muitos-para-muitos conceitualmente via RolePermission versionado.                                                                      | Derivar Permissions permitidas para uma Role; ausência de Permission aplicável nega acesso.                                                       |
| Permission → Grant            | Não existe relação direta.                                                                                                             | A Permission só se torna candidata a autorização pelo caminho Permission → RolePermission → Role → Grant → Membership e pelos checks contextuais. |
| SchoolMembership → School     | School é referenciada por `schoolId`; não é propriedade nem parte persistida da raiz Auth.                                             | Resolver estado institucional pelo contrato público do owner Schools.                                                                             |

## Integridade

### MRI-001 — User referenciado

Cada SchoolMembership referencia exatamente um `userId` canônico existente. A existência/estado é confirmada pelo contrato público de Users; Auth / Authorization não cria, altera ou persiste User.

### MRI-002 — School referenciada

Cada SchoolMembership referencia exatamente um `schoolId` canônico existente. A existência e condição habilitada da School são confirmadas por Schools; Auth / Authorization não cria, altera ou persiste School.

### MRI-003 — Ciclo de Membership válido

Somente as transições definidas no MVP são permitidas: criação em `PENDING`, ativação `PENDING` → `ACTIVE`, revogação de `PENDING` ou `ACTIVE` → `REVOKED`. `REVOKED` é terminal. Estados distintos não são persistidos neste recorte.

### MRI-004 — Unicidade do vínculo ativo

Existe no máximo uma Membership `ACTIVE` para cada par (`userId`, `schoolId`). Um ciclo novo só pode ser criado depois que o anterior deixou de estar `ACTIVE`.

### MRI-005 — Acesso depende do estado vigente

`PENDING` e `REVOKED` nunca concedem autorização. Membership `ACTIVE` é necessária, mas insuficiente: User deve estar ativo, School habilitada, Grant vigente, Permission aplicável e contexto/recurso consistentes.

### MRI-006 — Escopo de Grant

Todo Grant refere uma Membership e uma Role escolar e seu `schoolId` coincide com o `schoolId` da Membership. Grant não pode ser transferido para outra Membership/School.

### MRI-007 — Validade e unicidade vigente de Grant

Um Grant é vigente se `validFrom <= instante atual`, `validUntil` está ausente ou o instante atual é anterior a `validUntil`, não foi revogado e a Membership está `ACTIVE`. Existe no máximo um Grant vigente por par (`membershipId`, `roleId`).

### MRI-008 — Revogação preserva o vínculo

Revogar Grant encerra somente a concessão daquela Role e não remove a SchoolMembership. Revogar Membership torna todos os Grants associados inefetivos, sem reescrever seus históricos nem transferi-los para outro ciclo.

### MRI-009 — Permission derivada

Não existe concessão direta de Permission a User ou Membership. Permission é derivada de RolePermission para Role(s) com Grant vigente e validada com escopo/recurso; ausência de permissão significa negação.

### MRI-010 — Falha fechada e ownership

Falha ou indisponibilidade na validação de User, School, Membership, Grant, Role, Permission, `schoolId` ou recurso resulta em negação. Consultas a User/School ocorrem por contratos públicos; eventos não concedem autorização.

## Consultas

### MCQ-001 — ResolveMembership

- **Objetivo:** localizar Membership pelo `membershipId` e confirmar que corresponde ao `userId` autenticado e ao `schoolId` solicitado.
- **Dados retornados conceitualmente:** identificadores `membershipId`, `userId`, `schoolId` e estado necessário à decisão.
- **Validações:** User ativo por contrato de Users; Membership `ACTIVE`; identidade User e escopo iguais ao contexto solicitado. Membership ausente ou não vigente não autoriza.

### MCQ-002 — ResolvePermissions

- **Objetivo:** obter Permissions aplicáveis à ação para as Roles concedidas à Membership.
- **Dados relacionados conceitualmente:** Grants da Membership, estado/validade/revogação, Roles escolares e associação RolePermission vigente.
- **Validações:** Grant dentro de validade e não revogado; Membership `ACTIVE`; `schoolId` consistente; Permission corresponde à ação/recurso/escopo. A operação usa deny-by-default quando não houver Permission aplicável.

### MCQ-003 — ResolveSchoolContext

- **Objetivo:** resolver e validar no servidor o contexto escolar solicitado para uma operação protegida.
- **Dados relacionados conceitualmente:** User autenticado, Membership correspondente, School resolvida/validada por Schools, `schoolId`, Grant/Role/Permission e referência/escopo do recurso do caso de uso.
- **Validações:** sessão/User válidos; School existente e habilitada; Membership `ACTIVE`; Permission derivada de Grant válido; `schoolId` da School, Membership e recurso correspondentes. Falha de consulta/validação nega a operação.

## Escritas

Todas as mutações são de responsabilidade exclusiva de Auth / Authorization sobre SchoolMembership e Grants. Atores, limites de escopo e validações são os fixados em MEMBERSHIP-MVP-DECISIONS.

### MCMD-001 — CreateMembership

- Cria SchoolMembership em estado `PENDING` para `userId` existente/ativo e School existente/habilitada, confirmados por ResolveUser/ResolveSchool/ValidateSchool.
- Impõe no máximo uma Membership ativa por User–School (Membership nova fica pendente).
- Não cria User, School, Grant ou Role.
- Não emite `MembershipCreated` na criação pendente; evento documentado ocorre na ativação.

### MCMD-002 — ActivateMembership

- Transiciona somente Membership `PENDING` para `ACTIVE`.
- Revalida User ativo e School existente/habilitada por contratos públicos; falha/indisponibilidade nega a operação.
- Não ativa novamente Membership `REVOKED` e não concede Role automaticamente.
- Emite o evento já documentado `MembershipCreated` quando a Membership se torna `ACTIVE`.

### MCMD-003 — DeactivateMembership

- Transiciona Membership `PENDING` ou `ACTIVE` para `REVOKED`; estado terminal.
- Revoga o acesso imediatamente e torna Grants associados inefetivos, preservando seu histórico.
- Não altera User nem School.
- Emite `MembershipRemoved`, evento existente no catálogo.

### MCMD-004 — GrantRole

- Registra relação lógica Grant/MembershipRoleAssignment entre Membership `ACTIVE` e Role escolar permitida.
- Confirma ator autorizado, mesmo `schoolId`, User/School conforme necessidade e dupla aprovação quando o alvo for `SCHOOL_ADMIN`.
- Exige `validFrom`; aceita `validUntil` opcional, sem concessão direta de Permission.
- Não duplica Grant vigente para Membership–Role; emite `RoleGranted` após a alteração efetiva.

### MCMD-005 — RevokeRole

- Revoga Grant vigente da Role correspondente à Membership e `schoolId` atuais.
- Confirma ator autorizado e dupla aprovação para revogação de `SCHOOL_ADMIN`.
- Encerra somente o Grant; Membership permanece inalterada.
- Registra instante/ator da revogação, torna a concessão imediatamente inefetiva e emite `RoleRevoked` após a alteração efetiva.

**Eventos:** os únicos nomes utilizados por estas escritas são `MembershipCreated`, `MembershipRemoved`, `RoleGranted` e `RoleRevoked`, todos já documentados. Este desenho não define envelope, payload nem tecnologia de entrega; ADR-0002 determina que eventos de efeitos secundários ocorram após commit, mas o catálogo/entrega executável permanece fora deste desenho.

## Validade

| Conceito             | Validade no MVP                                                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SchoolMembership** | Não há validade temporal própria definida. A Membership concede elegibilidade somente em estado `ACTIVE`; `PENDING` e `REVOKED` não autorizam. A elegibilidade efetiva também exige User ativo, School habilitada, Grant/Role/Permission aplicáveis e contexto validado.                            |
| **Grant**            | Tem `validFrom` obrigatório/inclusivo e `validUntil` opcional/exclusivo. Grant é efetivo somente durante esse intervalo, enquanto não revogado e enquanto a Membership estiver `ACTIVE`. Revogação encerra imediatamente a eficácia.                                                                |
| **Permission**       | Não possui validade temporal própria nem concessão direta no MVP. É efetiva para uma ação somente se associada à Role no RolePermission vigente e existir Grant efetivo para Membership `ACTIVE`, além dos checks de User, School, escopo e recurso. Mudança Role–Permission é versionada/auditada. |

## Auditoria

Auditoria mínima para as mutações escolares, alinhada aos campos e eventos de ADR-0004:

- **CreateMembership:** registrar fato de criação pendente para trilha interna; não emitir evento de domínio nesta transição.
- **ActivateMembership:** registrar ator, instante, `userId`, `membershipId` e `schoolId`; emitir `MembershipCreated`.
- **DeactivateMembership:** registrar ator, instante, `userId`, `membershipId`, `schoolId` e motivo categorizado quando fornecido; emitir `MembershipRemoved`.
- **GrantRole:** registrar ator (`grantedBy`), alvo User/Membership, Role, escopo/`schoolId`, intervalo de validade e referência de dupla aprovação quando aplicável; emitir `RoleGranted`.
- **RevokeRole:** registrar ator, alvo User/Membership, Role, escopo/`schoolId`, instante e motivo categorizado quando fornecido; emitir `RoleRevoked`.
- **RolePermission:** versionar e auditar cada alteração da associação Role–Permission.

Dados de auditoria pertencem ao owner Auth / Authorization. O evento não substitui a trilha detalhada, não concede autorização e não deve conter credenciais; este documento não fixa política de retenção nem formato físico.

## Testes

| ID          | Cenário                 | Critério objetivo                                                                                                                                                                                                                  |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MPT-001** | Membership válida       | Com User ativo, School habilitada, Membership `ACTIVE`, Grant válido e Permission correspondente, `ResolveMembership`/`ResolvePermissions` reconhecem os fatos e o contexto correspondente pode prosseguir.                        |
| **MPT-002** | Membership inativa      | Para Membership `PENDING` ou `REVOKED`, autorização é negada mesmo quando há Grant/Role previamente associado; estado de User/School não é alterado.                                                                               |
| **MPT-003** | Role válida             | Com Membership `ACTIVE` e Grant não revogado dentro de `validFrom`/`validUntil`, Permissions derivadas da Role permitem somente ação correspondente, escopo e recurso válidos.                                                     |
| **MPT-004** | Role removida           | Após `RevokeRole`, `ResolvePermissions` não considera o Grant efetivo; Membership permanece no estado anterior; verificações posteriores negam a ação antes autorizada por essa Role.                                              |
| **MPT-005** | School Context válido   | Com sessão/User válidos, School habilitada, Membership `ACTIVE`, Grant vigente, Permission aplicável e `schoolId` idêntico entre School, Membership e recurso, `ResolveSchoolContext` retorna contexto validado.                   |
| **MPT-006** | School Context inválido | Se `schoolId` solicitado divergir, Membership/Grant estiver inativo/fora de validade/revogado, School não estiver habilitada, Permission não se aplicar ou qualquer dependência não puder validar, contexto é negado sem fallback. |

## READY FOR IMPLEMENTATION

### Existe informação suficiente para implementar a persistência?

**SIM, para o modelo conceitual e operações de persistência de Membership V1**: entidades/conceitos, owners, identificadores, cardinalidades, ciclo de vida, validade, relações, invariantes, consultas, escritas, auditoria mínima e testes estão definidos pelas decisões operacionais do MVP.

Este GO não equivale a schema físico nem autoriza escolher tecnologias, definir contratos além das responsabilidades descritas, alterar ADRs, criar novos eventos/módulos/agregados ou incluir Class/Enrollment. User e School continuam referências externas; sua resolução depende dos contratos públicos de Users e Schools definidos nas decisões MVP.
