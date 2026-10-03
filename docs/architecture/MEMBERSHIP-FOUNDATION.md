# MEMBERSHIP FOUNDATION

## Escopo e evidência

Esta fundação cobre somente `SchoolMembership`, `Role`, `Permission` e `Grant` (a concessão escolar de papel), e suas relações com `User` e `School`. Não define banco, persistência física, APIs ou novas entidades. `Class`, `Enrollment` e demais domínios estão fora do escopo.

**Convenções de evidência**

- **Explícito:** conceito, owner, regra ou evento nomeado diretamente nas fontes.
- **Implícito:** consequência necessária da estrutura já documentada, sem decisão adicional de implementação.
- **Inferido:** interpretação operacional mínima para descrever um fluxo; não é decisão normativa.
- **Ambíguo:** as fontes não sustentam uma interpretação única ou divergem.
- Os ADRs 0002–0004 permanecem `Proposed`; este documento não os ratifica. Referir uma regra como documentada não significa que haja implementação ou comprovação em runtime.

## Decisões Congeladas

| Decisão                                                                                                                                                                                    | Fonte                                                                                                                                   | Impacto no domínio Membership                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. SchoolMembership é a única fonte de autorização escolar.** Roles/grants associados fornecem elegibilidade de permissões, mas não dispensam a validação de contexto, recurso e escopo. | ADR-0004 §2.1, §2.2 e §2.4; MVP-DOMAIN-MODEL, Partes 7 e 9; Documento Mestre, limites Auth/Authorization.                               | Membership é o vínculo autoritativo User–School para acesso escolar; papel no User, sessão ou cliente não substitui esse vínculo.                                                   |
| **2. Login não concede acesso escolar.**                                                                                                                                                   | AUTH V1 congelado em AUTH-FOUNDATION; ADR-0004 §2.1 e §2.6; MVP-DOMAIN-MODEL, A-01/A-02.                                                | Login estabelece User/sessão; não cria SchoolMembership, seleciona School nem atribui Role/Grant.                                                                                   |
| **3. Toda autorização escolar exige User + SchoolMembership + School.**                                                                                                                    | ADR-0004 §2.4; MVP-DOMAIN-MODEL, A-02, Parte 7 e Membership Scope; ADR-0002 §2.2 e §2.3.                                                | A decisão é feita para o User autenticado, exige Membership vigente para a School e confirma que a School/recurso pertence ao mesmo `schoolId`.                                     |
| **4. Fail Closed.**                                                                                                                                                                        | AUTH-FOUNDATION; ADR-0004 §2.4 e §2.5; MVP-DOMAIN-MODEL, invariantes e tenancy.                                                         | Se não for possível validar User, Membership, permissão, School, `schoolId` ou estado do recurso, a autorização é negada; indisponibilidade não é tratada como concessão.           |
| **5. Contexto escolar é resolvido no servidor.**                                                                                                                                           | ADR-0004 §2.4 e §2.6; ADR-0002 §2.2 regras de identidade/tenant; MVP-DOMAIN-MODEL A-02/Parte 9; Documento Mestre, seção de autorização. | `schoolId` fornecido pelo cliente é apenas uma solicitação; Auth/Authorization valida sessão, Membership, Grant/Permission e School/recurso no servidor antes de resolver contexto. |

Essas decisões não alteram os limites do Auth V1. Membership e concessões são do owner Auth / Authorization; User e School permanecem sob seus próprios owners.

## Conceitos

### SchoolMembership

- **Responsabilidade:** vínculo institucional de acesso entre uma identidade global `User` e uma `School`, com ciclo de vida e referência ao escopo escolar.
- **Owner:** Auth / Authorization. **Evidência: Explícito** em ADR-0002 §2.3, ADR-0003 §2.2, ADR-0004 §2.1 e MVP-DOMAIN-MODEL.
- **Limites:** não é `User`, `School` nem matrícula `Enrollment`; não possui perfil nem dados institucionais; não concede autorização isoladamente sem Role/Permission aplicável e validação de recurso/escopo. **Evidência: Explícito.**
- **Relacionamentos:** associada a exatamente um `User` e uma `School`; pode ter papéis escolares concedidos; possui `membershipId` e escopo `schoolId` conceitualmente distintos. **Evidência: Explícito.** Um único vínculo ativo por par User–School é regra descrita no ADR-0004. **Evidência: Explícito no ADR proposto.**
- **Ciclo de vida:** ativa/inativa ou encerrada é necessário ao vocabulário de autorização; eventos documentados são `MembershipCreated` e `MembershipRemoved`. Se remoção equivale a inativação, se membership pode ser reativada e seus estados exatos são **Ambíguos**; não assumir nomes ou transições persistidas.

### Role

- **Responsabilidade:** conjunto nomeado de responsabilidades e permissões potenciais sob determinado escopo; uma Role escolar só se aplica dentro do `schoolId` da concessão.
- **Owner:** Auth / Authorization. **Evidência: Explícito** em ADR-0002 §2.3 e ADR-0004 §2.1–§2.3.
- **Limites:** catálogo controlado; a presença de Role não autoriza por si só. A decisão final ainda verifica Membership ativa, Permission, escopo, recurso e estado. Roles globais existem nas fontes, mas atribuições globais ficam fora desta fundação de Membership escolar.
- **Relacionamentos:** Role pode ser concedida a uma SchoolMembership por `MembershipRoleAssignment` (nome da relação documental) e associa-se a Permissions via `RolePermission`. A inclusão dessa atribuição como entidade interna da SchoolMembership é **Ambígua**.
- **Evidência:** existência, escopo escolar, concessão e relação Role–Permission são **Explícitos**; forma de agregado/composição não é definida.

### Permission

- **Responsabilidade:** representar uma ação atômica sobre recurso, identificada conceitualmente por recurso/ação, que deve ser avaliada junto do escopo e recurso.
- **Owner:** Auth / Authorization. **Evidência: Explícito** em ADR-0002 §2.3 e ADR-0004 §2.1–§2.4.
- **Limites:** catálogo controlado; ausência de permissão aplicável é negação. Permission não é concessão, membership ou autorização autocontida.
- **Relacionamentos:** Role associa-se a Permission através de `RolePermission`; grants à SchoolMembership habilitam as Permissions da Role, sujeitas ao contexto. Permission não é documentada como concedida diretamente à Membership.
- **Evidência:** Permission como ação atômica e sua avaliação contextual são **Explícitas**; cardinalidades e conteúdo do catálogo escolar de MVP são **Ambíguos**.

### Grant

- **Responsabilidade:** **interpretação operacional mínima:** concessão de uma Role escolar a uma SchoolMembership, correspondente ao conceito documentado `MembershipRoleAssignment`.
- **Owner:** Auth / Authorization. **Evidência: Explícito** para ownership de grants; identificar Grant diretamente com `MembershipRoleAssignment` é **Inferido** porque “Grant” não é formalizado como entidade independente.
- **Limites:** escopado à Membership e ao `schoolId`; não pode ampliar o papel para outra escola. Campos documentados para `MembershipRoleAssignment` incluem `schoolId`, membership, role, `grantedBy`, `validFrom/Until` e estado. Não se cria entidade separada `Grant` nem se decide se a atribuição é interna ou independente.
- **Relacionamentos:** cada concessão associa uma Role a uma SchoolMembership; essa Role fornece Permissions por `RolePermission`. **Evidência: Explícito** para concessões de papel e Role–Permission; correspondência terminológica de Grant com a atribuição é **Inferida**.

## Relacionamentos

### Mapa conceitual

```text
User
  1
  ↓
  N SchoolMembership N
                   ↓
                   1 School

SchoolMembership
  N
  ↓
  N Role
  (via Grant / MembershipRoleAssignment)

Role
  N
  ↓
  N Permission
  (via RolePermission)

Permission
  ⋯
  Grant
```

### Cardinalidade conceitual e responsabilidade

| Relação                         | Cardinalidade conceitual                                                                                                                           | Responsabilidade e evidência                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User → SchoolMembership         | Um User pode ter zero ou várias memberships; cada membership referencia exatamente um User.                                                        | Suporta identidade global participante de várias escolas. **Explícito** em ADR-0004 §2.1 e ADR-0003 §1.                                                                                          |
| School → SchoolMembership       | Uma School pode ter zero ou várias memberships; cada membership referencia exatamente uma School.                                                  | School é owner da instituição; Auth / Authorization é owner do vínculo de acesso. **Explícito.**                                                                                                 |
| User ↔ School — vínculos ativos | No máximo uma SchoolMembership ativa por par User–School; histórico adicional não é determinado.                                                   | Regra documentada no ADR-0004 §2.1. Cardinalidade histórica e recriação após encerramento são **Ambíguas**.                                                                                      |
| SchoolMembership ↔ Role         | Muitos-para-muitos conceitualmente, materializado no vocabulário por concessões `MembershipRoleAssignment`; uma membership pode ter vários papéis. | Papéis podem ser múltiplos e independentes dentro do vínculo. Cada concessão liga a membership a uma Role. **Explícito.** Cardinalidade máxima e lifecycle exatos da concessão são **Ambíguos**. |
| Role ↔ Permission               | Muitos-para-muitos conceitualmente via `RolePermission`.                                                                                           | Papel agrupa permissões potenciais; ausência na matriz é negação. **Explícito.** Cardinalidade e mutabilidade operacional do catálogo não ficam fechadas neste recorte.                          |
| Permission ↔ Grant              | Não há relação direta documentada. A relação efetiva é Permission → RolePermission → Role → Grant/MembershipRoleAssignment → SchoolMembership.     | Grant concede papel; não concede Permission diretamente. Tratar Grant como atribuição de Permission seria **Inferido sem suporte** e não deve ser feito.                                         |

As cardinalidades acima descrevem o domínio conceitual, não tabelas, chaves estrangeiras ou composição de agregados.

## Invariantes

| ID         | Invariante necessária                                                                                                                                                              | Evidência                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **MI-001** | SchoolMembership referencia uma identidade global User existente, validada pelo owner Users por contrato público quando necessário. Auth / Authorization não cria nem altera User. | Relação User–Membership e ownership separados são **Explícitos**; exigência de resolver a referência canônica é **Inferida**.         |
| **MI-002** | SchoolMembership referencia uma School existente, validada pelo owner Schools por contrato público quando necessário. Auth / Authorization não cria nem altera School.             | Relação User–School e ownership separados são **Explícitos**; resolução da referência é **Inferida**.                                 |
| **MI-003** | Membership inativa/encerrada não concede autorização.                                                                                                                              | Membership/atribuição vigente é condição explícita em ADR-0004 §2.4; equivalência entre “inativa” e “removida” permanece **Ambígua**. |
| **MI-004** | Uma Role escolar concedida e suas permissões não podem ultrapassar o `schoolId` da SchoolMembership nem do recurso solicitado.                                                     | Escopo da Membership/role e correspondência com recurso são **Explícitos**.                                                           |
| **MI-005** | Existe no máximo um vínculo ativo para o mesmo par User–School.                                                                                                                    | **Explícito no ADR-0004 proposto**; não determina cardinalidade histórica.                                                            |
| **MI-006** | Grant/Role isoladamente não autorizam: a Permission precisa estar associada à Role e todos os predicados de autorização do caso precisam ser verdadeiros.                          | **Explícito** em ADR-0004 §2.2–§2.4.                                                                                                  |
| **MI-007** | Contexto e `schoolId` são verificados no servidor; entrada do cliente não prova autorização.                                                                                       | **Explícito** em ADR-0004 §2.4 e MVP-DOMAIN-MODEL.                                                                                    |
| **MI-008** | Falha ou indisponibilidade ao verificar qualquer requisito de autorização resulta em negação.                                                                                      | Fail closed e deny-by-default são **Explícitos** em ADR-0004 §2.4–§2.5.                                                               |
| **MI-009** | SchoolMembership é diferente de Enrollment; membership não representa matrícula de aluno em turma.                                                                                 | **Explícito** em ADR-0002/0003/0004 e MVP-DOMAIN-MODEL.                                                                               |

Não se fixa aqui requisito para User estar ativo como pré-condição de **criação** da Membership; estado `ACTIVE` é condição documentada para autorização. A política de elegibilidade de criação não está estabelecida pelas fontes e não deve ser inferida.

## Casos de Uso

**Nota:** entradas marcadas **Inferidas** são os dados mínimos para expressar a operação, não um contrato de API. As fontes não definem atores autorizados completos nem todos os retornos.

### CreateMembership

- **Objetivo:** registrar vínculo de acesso entre User e School.
- **Entrada:** `userId`, `schoolId` e ator/contexto de autorização da operação (**Inferidos** como referências mínimas).
- **Saída:** referência/resultado da SchoolMembership criada (**Inferido**).
- **Pré-condições:** User e School existem, confirmados com seus owners; operação é autorizada no contexto aplicável (**Inferido** para existência/validação, pois fluxo completo de provisionamento/ator não está fechado); não há outro vínculo ativo para o par User–School (**Explícito**, ADR-0004).
- **Pós-condições:** SchoolMembership criada sob ownership Auth / Authorization; não cria User/School nem Enrollment. `MembershipCreated` é o evento listado para o fato (**Explícito** no catálogo; emissão transacional e payload não definidos).

### ActivateMembership

- **Objetivo:** tornar uma SchoolMembership vigente para avaliação de acesso.
- **Entrada:** referência à Membership e contexto da operação (**Inferidos**).
- **Saída:** Membership ativa ou falha (**Inferida**).
- **Pré-condições:** Membership e suas referências User/School são válidas (**Inferido**); ator autorizado e transições permitidas são **Ambíguos**.
- **Pós-condições:** membership passa a ser elegível à validação de autorização; não existe evento `MembershipActivated` documentado. Se a ativação deve emitir `MembershipCreated` ou outro evento é **Ambíguo**; nenhum evento novo é proposto aqui.

### DeactivateMembership

- **Objetivo:** cessar a elegibilidade de acesso escolar da Membership.
- **Entrada:** referência à Membership e contexto da operação (**Inferidos**).
- **Saída:** confirmação de inativação/encerramento ou falha (**Inferida**).
- **Pré-condições:** Membership válida; ator e condições de transição são **Ambíguos**.
- **Pós-condições:** membership deixa de conceder autorização (**Explícito** como regra de membership vigente); relação entre desativação, remoção e retenção histórica é **Ambígua**. `MembershipRemoved` é o evento de remoção documentado; não se assume que toda desativação seja sua semântica.

### GrantRole

- **Objetivo:** conceder Role escolar a uma SchoolMembership dentro do escopo de sua School.
- **Entrada:** `membershipId`, `roleId`, `schoolId` e ator concessor (**Inferidos** como referências mínimas; `grantedBy` e `schoolId` são campos mencionados para MembershipRoleAssignment).
- **Saída:** resultado/referência da concessão (**Inferida**).
- **Pré-condições:** Membership ativa; Role válida para escopo escolar; `schoolId` coincide com Membership; concessor tem permissão aplicável (**Membership/escopo explícitos; identidade e regra completa do concessor são ambíguas**).
- **Pós-condições:** a Role concedida habilita somente as Permissions relacionadas via RolePermission e sujeitas a checks contextuais; `RoleGranted` é o evento listado (**Explícito**). Cardinalidade repetida/idempotência não é especificada.

### RevokeRole

- **Objetivo:** revogar Grant/atribuição de Role escolar vigente.
- **Entrada:** referência da Membership e Role/atribuição a revogar, `schoolId` e ator (**Inferidos**).
- **Saída:** confirmação de revogação ou falha (**Inferida**).
- **Pré-condições:** concessão corresponde à Membership e ao mesmo `schoolId`; ator autorizado (**escopo explícito; regra/ator exatos ambíguos**).
- **Pós-condições:** a Role deixa de fornecer suas Permissions em checks subsequentes; `RoleRevoked` é o evento listado (**Explícito**). A membership permanece existente; remoção do papel não apaga a membership (**Explícito**).

### ResolveSchoolContext

- **Objetivo:** resolver no servidor a School solicitada como contexto de uma operação para o User autenticado, sem tratar a seleção por si só como autorização permanente.
- **Entrada:** User/sessão autenticados, `schoolId` solicitado e contexto da operação/resource/Permission (**IDs explícitos no modelo; combinação como entrada é Inferida**).
- **Saída:** contexto escolar validado para o caso ou decisão de negar (**Inferida a forma do resultado; permitir/negar é explícito**).
- **Pré-condições:** sessão válida; User ativo; School existe e está apta para a operação; Membership ativa para User/School; Role/Grant vigente contém Permission aplicável; recurso existe e coincide com `schoolId`/estado permitido. As condições são **Explícitas** em ADR-0004 §2.4; resolução via referências dos owners é por contrato.
- **Pós-condições:** contexto só é considerado resolvido após todos os checks server-side; qualquer falha nega; mera consulta/seleção não cria evento. **Explícito** no caso A-02 do MVP-DOMAIN-MODEL que não há evento para mera seleção/validação.

## Regras de Autorização

### RA-001 — Cálculo de autorização

Permitir somente se **todos** forem verdadeiros:

1. Sessão Auth válida, não expirada e não revogada.
2. User está ativo.
3. Existe SchoolMembership vigente do User para a School solicitada.
4. Existe Role/Grant vigente com Permission `resource:action` aplicável ao escopo.
5. Contexto `schoolId` é resolvido no servidor e corresponde à Membership e ao recurso.
6. Recurso existe e seu estado permite a operação.

Para classe, as fontes ainda exigem atribuição pertinente de professor e igualdade entre `class.schoolId` e `membership.schoolId`; classe não integra este escopo de modelagem. **Classificação: Explícito** em ADR-0004 §2.4 e MVP-DOMAIN-MODEL A-02/Parte 7.

### RA-002 — Negação

Negar se faltar qualquer predicado de RA-001, se a Session/User/Membership/Grant/Role/Permission/School/recurso estiver inválido ou se qualquer validação obrigatória falhar/estiver indisponível. Não usar roles, `schoolId`, `membershipId` ou permissions antigas fornecidas pelo cliente/token como autoridade. **Classificação: Explícito** (deny-by-default/fail closed).

### RA-003 — Contexto escolar inválido

O contexto é inválido quando a School solicitada não é validada pelo owner Schools, não corresponde ao `schoolId` da Membership ou do recurso, Membership não é vigente, Permission/Grant não se aplica, ou não é possível verificar qualquer desses fatos. Negar a operação; não escolher outra escola automaticamente. **Classificação: Explícito** para correspondência e server validation; não haver fallback é **Inferência operacional mínima** de deny-by-default.

### RA-004 — Múltiplas memberships

Um User pode pertencer a várias escolas e ter papéis diferentes em cada uma. Portanto, a solicitação precisa indicar o `schoolId` de contexto e o servidor valida uma Membership correspondente; não existe uma única escola global padrão inferida do User. No máximo uma Membership ativa é permitida para cada par User–School; memberships de escolas distintas permanecem distintas. **Classificação: Explícito**. Comportamento de ordenação/listagem, escolha de escola padrão e coexistência de memberships históricas para a mesma escola são **Ambíguos** e não são definidos aqui.

## Eventos

Os nomes abaixo são os únicos eventos pertinentes documentados nas fontes. “Confirmado” significa confirmado como nome listado no catálogo/documentos, não aprovado formalmente pelo ciclo de ADR nem implementado.

| Evento                                             | Classificação                          | Owner/fato                                                                   | Limite                                                                                                                                                      |
| -------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MembershipCreated`                                | **Confirmado**                         | Auth / Authorization; SchoolMembership criada.                               | Consumer indicado: Audit e invalidação de autorização/cache. Payload, instante transacional e semântica de provisão/ativação não estão definidos.           |
| `MembershipRemoved`                                | **Confirmado**                         | Auth / Authorization; remoção de SchoolMembership.                           | Consumer indicado: Audit e invalidação de autorização/cache. Equivalência com inativação e retenção histórica são **Ambíguas**.                             |
| `RoleGranted`                                      | **Confirmado**                         | Auth / Authorization; concessão de Role, ligada a Membership quando escolar. | Consumer indicado: Audit e invalidação de autorização/cache. Detalhes de payload e idempotência não estão definidos.                                        |
| `RoleRevoked`                                      | **Confirmado**                         | Auth / Authorization; revogação de Role.                                     | Consumer indicado: Audit e invalidação de autorização/cache. Detalhes de payload e idempotência não estão definidos.                                        |
| Evento de ativação/desativação da SchoolMembership | **Ambíguo / não nomeado**              | Nenhum nome correspondente consta no catálogo.                               | Não criar `MembershipActivated` ou `MembershipDeactivated`; a relação com `MembershipCreated`/`MembershipRemoved` precisa de definição normativa posterior. |
| Evento de `ResolveSchoolContext`                   | **Não aplicável ao fluxo documentado** | Nenhum evento para mera seleção/validação de contexto.                       | A-02 documenta ausência de evento para mera seleção/validação; não inventar evento de leitura/autorização.                                                  |

## Testes

Os testes verificam comportamento funcional e escopo; não assumem implementação ou esquema.

| ID         | Cenário                 | Critério objetivo                                                                                                                                                                                                                 |
| ---------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MT-001** | Membership válida       | Dado User ativo, Membership vigente para a School e contexto/recurso com o mesmo `schoolId`, a autorização prossegue somente quando também há Permission aplicável e todos os checks restantes passam.                            |
| **MT-002** | Membership inativa      | Dada Membership inativa/encerrada ou removida, a autorização é negada; nenhuma Role/Permission previamente associada restaura acesso.                                                                                             |
| **MT-003** | Role válida             | Dada Membership vigente e Grant de Role vigente para a mesma School, uma ação permitida pela Permission relacionada pode prosseguir quando recurso e contexto coincidem; ação sem Permission aplicável é negada.                  |
| **MT-004** | Role removida           | Após revogar o Grant/Role, a Permission anteriormente derivada deixa de autorizar checks subsequentes; a Membership não é removida por isso.                                                                                      |
| **MT-005** | School Context válido   | Com sessão e User válidos, School existente, Membership vigente, Permission/Grant aplicáveis e recurso pertencente ao `schoolId` solicitado, o servidor resolve o contexto para a operação.                                       |
| **MT-006** | School Context inválido | Se o `schoolId` solicitado divergir da Membership/recurso, se a Membership/School não for válida ou qualquer validação necessária falhar/estiver indisponível, a operação é negada (fail closed), sem fallback para outra School. |

## Riscos

| Área                  | Severidade | Risco                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ownership             | **ALTO**   | Diagnóstico encontrou divergência histórica entre documentos sobre ownership de memberships; ADR-0002/0003/0004 e MVP-DOMAIN-MODEL atualmente mapeiam Auth / Authorization como owner, mas ADRs estão `Proposed` e não há prova executável. Usar sempre o owner do boundary e não transferir a escrita para Users/Schools. |
| Autorização           | **ALTO**   | Papel isolado pode ser confundido com permissão efetiva; matriz de permissões e avaliação contextual são críticas. Um check incompleto ou baseado em claims antigas pode conceder acesso indevido.                                                                                                                         |
| Contexto escolar      | **ALTO**   | `schoolId` é chave canônica de isolamento; documentação conceitual não demonstra constraints nem testes cross-school em runtime. Erros de correspondência devem negar acesso.                                                                                                                                              |
| Múltiplas memberships | **MÉDIO**  | User pode atuar em várias escolas; escolha/default e tratamento de múltiplas memberships históricas para a mesma escola não estão determinados além de no máximo uma ativa por par. Não inferir escola ou combinar papéis de escolas diferentes.                                                                           |
| Lifecycle e grants    | **ALTO**   | MembershipRoleAssignment não tem agregado pai/lifecycle completamente definido; sem isso, escrita, remoção, auditoria e invalidação podem divergir.                                                                                                                                                                        |

## READY FOR DESIGN

### Existe informação suficiente para modelar persistência do Membership?

**NÃO.** As fontes permitem estabelecer o vocabulário conceitual, ownership indicado, relações lógicas, regra de autorização e o requisito de no máximo uma Membership ativa por par User–School. Não definem de forma suficiente, sem decisões adicionais:

1. se a Aggregate Root é formalmente `SchoolMembership` e se Grant/MembershipRoleAssignment é entidade interna ou relação independente;
2. o ciclo de vida canônico da Membership e a semântica exata de `MembershipCreated` versus `MembershipRemoved` para ativar, desativar, reativar e preservar histórico;
3. cardinalidade/histórico de Grants, regras de duplicidade, intervalo `validFrom/Until` e forma de revogação/reativação;
4. catálogo e versão de Roles/Permissions aplicáveis ao recorte de Sprint 1 e quais atores podem criar/remover Memberships ou conceder/revogar Roles;
5. contrato público e consistência necessários para validar User e School, e como validar o estado operacional da School para o contexto;
6. governança de eventos (payload, commit, idempotência e invalidação), indicada como lacuna no ADR-DIAGNOSTIC-REPORT.

O NO para persistência **não bloqueia** usar esta fundação para implementar leitura conceitual de autorização/contexto conforme regras documentadas, desde que não se inventem estruturas de persistência ou permissões. Para definir a persistência de Membership sem novas suposições, essas lacunas precisam ser decididas pelos owners competentes.
